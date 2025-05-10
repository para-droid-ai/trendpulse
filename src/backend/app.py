from fastapi import FastAPI, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
from typing import List, Optional
import jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv
import os
import sys
from pathlib import Path
import logging
from fastapi.middleware.cors import CORSMiddleware
import json
import asyncio
import re

# Add the src directory to Python path
src_path = str(Path(__file__).parent.parent)
if src_path not in sys.path:
    sys.path.append(src_path)

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

from models import Base, User, TopicStream, Summary, UpdateFrequency, DetailLevel, ModelType
# Temporarily comment out the scheduler import to avoid the dependency error
# from scheduler import TopicStreamScheduler
from perplexity_api import PerplexityAPI
from database import SessionLocal, engine

# Create tables
Base.metadata.create_all(bind=engine)

# Security
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # Increase to 24 hours for better user experience

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI(title="TrendPulse Dashboard API")
# Temporarily disable scheduler
# scheduler = None

# Configure CORS
origins = [
    "http://localhost:3000",  # React frontend default port
    "http://127.0.0.1:3000",
    "*",  # Allow any origin during development
    # Add production URLs as needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow any origin during development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str

class TopicStreamCreate(BaseModel):
    query: str
    update_frequency: str  # Will be converted to UpdateFrequency
    detail_level: str     # Will be converted to DetailLevel
    model_type: str       # Will be converted to ModelType
    recency_filter: str

class TopicStreamResponse(BaseModel):
    id: int
    query: str
    update_frequency: str
    detail_level: str
    model_type: str
    recency_filter: str
    last_updated: Optional[datetime]

class SummaryResponse(BaseModel):
    id: int
    content: str
    sources: List[str]
    created_at: datetime

class SummaryCreate(BaseModel):
    content: str

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Security functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    logger.debug(f"Creating token with expiration: {expire.isoformat()}")
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        logger.debug(f"Decoding JWT token")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            logger.warning("Token payload does not contain 'sub' field")
            raise credentials_exception
        # Log successful token decode
        logger.debug(f"Token decoded successfully. Email from token: {email}")
    except jwt.ExpiredSignatureError:
        logger.warning("Token has expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {str(e)}")
        raise credentials_exception
    except Exception as e:
        logger.error(f"Unexpected error decoding token: {str(e)}", exc_info=True)
        raise credentials_exception
    
    # Get user from database
    try:
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            logger.warning(f"User not found for email: {email}")
            raise credentials_exception
        logger.debug(f"User found: ID={user.id}, Email={user.email}")
        return user
    except Exception as db_error:
        logger.error(f"Database error in get_current_user: {str(db_error)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving user information",
        )

# Helper function to perform a search and create a summary
async def perform_search_and_create_summary(db: Session, topic_stream: TopicStream):
    try:
        logger.debug(f"Performing search for topic stream: {topic_stream.query}")
        perplexity_api = PerplexityAPI()
        
        # Get the most recent summary for this topic stream, if any
        most_recent_summary = db.query(Summary).filter(
            Summary.topic_stream_id == topic_stream.id
        ).order_by(Summary.created_at.desc()).first()
        
        prev_summary_content = None
        if most_recent_summary:
            prev_summary_content = most_recent_summary.content
            logger.debug(f"Found previous summary (ID: {most_recent_summary.id}) with {len(prev_summary_content)} chars")
        
        # Use the model type from the topic stream
        model = topic_stream.model_type.value
        logger.debug(f"Using model from topic stream: {model}")
        
        # Modify query based on detail level and whether this is an update
        query_prefix = ""
        if topic_stream.detail_level == DetailLevel.BRIEF:
            query_prefix = "Give a brief summary of "
        elif topic_stream.detail_level == DetailLevel.DETAILED:
            query_prefix = "Give a detailed analysis of "
        
        full_query = f"{query_prefix}{topic_stream.query}"
        
        # If this is an update (not the first summary), specifically ask for new information
        if prev_summary_content:
            full_query = f"Provide ONLY NEW information about {topic_stream.query} that wasn't in the previous summary. Focus on recent developments, news, and updates."
        
        if topic_stream.recency_filter != "all_time":
            full_query += f" focusing on information from {topic_stream.recency_filter}"
        
        # Add instruction to format in markdown
        full_query += ". Format your response using markdown for better readability."
        
        # If this is an update, add instruction to avoid repeating information
        if prev_summary_content:
            full_query += " DO NOT repeat information that was already covered previously."
        
        logger.debug(f"Sending query to Perplexity API: {full_query}")
        
        # API call with detailed error handling
        try:
            result = await perplexity_api.search_perplexity(
                query=full_query,
                model=model,
                recency_filter=topic_stream.recency_filter,
                previous_summary=prev_summary_content,  # Pass the previous summary for context
                temperature=0.2,
                max_tokens=1000
            )
            logger.debug(f"API call successful, received response of {len(str(result))} characters")
        except Exception as api_error:
            logger.error(f"API call failed: {str(api_error)}", exc_info=True)
            # Re-raise with more context
            raise Exception(f"Error calling Perplexity API: {str(api_error)}")
        
        # Extract content from the result
        content = result.get("answer", "No content available")
        logger.debug(f"Extracted content of {len(content)} characters")
        
        # If no new information, provide a clear message
        if not content or content == "No content available" or "no new information" in content.lower():
            if prev_summary_content:
                content = "No new information is available since the last update."
            logger.warning("Received empty or default content from API")
        
        # Parse sources list from API result and encode as JSON string
        sources_list = result.get("sources", [])
        try:
            sources_json = json.dumps(sources_list)
        except Exception:
            logger.warning(f"Failed to encode sources list to JSON, defaulting to empty list. Sources list was: {sources_list}")
            sources_json = json.dumps([])
        logger.debug(f"Encoded {len(sources_list)} sources for storage: {sources_json[:100]}...")
        
        # Create summary
        try:
            summary = Summary(
                topic_stream_id=topic_stream.id,
                content=content,
                sources=sources_json,
                created_at=datetime.utcnow()
            )
            
            # Update topic stream's last_updated
            topic_stream.last_updated = datetime.utcnow()
            
            # Save to database
            db.add(summary)
            db.commit()
            db.refresh(summary)
            db.refresh(topic_stream)
            
            logger.debug(f"Created summary for topic stream {topic_stream.id}")
            return summary
        except Exception as db_error:
            logger.error(f"Database error: {str(db_error)}", exc_info=True)
            db.rollback()  # Roll back on error
            raise Exception(f"Error saving to database: {str(db_error)}")
            
    except Exception as e:
        logger.error(f"Error creating summary: {str(e)}", exc_info=True)
        raise

# Routes
@app.post("/users/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = get_password_hash(user.password)
    db_user = User(email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    logger.info(f"Login attempt for username: {form_data.username}")
    
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user:
        logger.warning(f"Login failed: User not found for email {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    logger.info(f"User found: {user.email} (ID: {user.id})")
    
    password_verified = verify_password(form_data.password, user.hashed_password)
    logger.info(f"Password verification result: {password_verified}")
    
    if not password_verified:
        logger.warning(f"Login failed: Incorrect password for user {user.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    try:
        access_token = create_access_token(data={"sub": user.email})
        logger.info(f"Access token created successfully for user {user.email}")
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        logger.error(f"Error creating access token for user {user.email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create access token",
        )

# Also update the startup and shutdown events
@app.on_event("startup")
async def startup_event():
    # Temporarily disable scheduler
    # get_scheduler()
    pass

@app.on_event("shutdown")
async def shutdown_event():
    # Temporarily disable scheduler
    # if scheduler:
    #     scheduler.shutdown()
    pass

# Comment out the get_scheduler function 
# def get_scheduler():
#     global scheduler
#     if scheduler is None:
#         db = SessionLocal()
#         scheduler = TopicStreamScheduler(db)
#     return scheduler

@app.post("/topic-streams/", response_model=TopicStreamResponse)
async def create_topic_stream(
    topic_stream: TopicStreamCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        logger.debug(f"Creating topic stream with data: {topic_stream}")
        
        update_freq = UpdateFrequency(topic_stream.update_frequency)
        detail_lvl = DetailLevel(topic_stream.detail_level)
        model = ModelType(topic_stream.model_type)
        
        logger.debug(f"Converted enums - freq: {update_freq}, detail: {detail_lvl}, model: {model}")
        
        db_topic_stream = TopicStream(
            user_id=current_user.id,
            query=topic_stream.query,
            update_frequency=update_freq,
            detail_level=detail_lvl,
            model_type=model,
            recency_filter=topic_stream.recency_filter
        )
        
        logger.debug("Created TopicStream object")
        db.add(db_topic_stream)
        db.commit()
        logger.debug("Committed to database")
        db.refresh(db_topic_stream)
        logger.debug("Refreshed object")
        
        # Schedule updates using the global scheduler
        # scheduler = get_scheduler()
        # scheduler.schedule_topic_stream(db_topic_stream)
        logger.debug("Scheduled topic stream updates")
        
        # Perform an immediate search and create the first summary
        await perform_search_and_create_summary(db, db_topic_stream)
        logger.debug("Initial search completed")
        
        # Refresh the object again to get the updated last_updated time
        db.refresh(db_topic_stream)
        
        return db_topic_stream
    except ValueError as e:
        logger.error(f"ValueError: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid enum value: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error creating topic stream: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error creating topic stream: {str(e)}"
        )

@app.get("/topic-streams/", response_model=List[TopicStreamResponse])
def get_topic_streams(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        logger.debug(f"Fetching topic streams for user ID: {current_user.id}, email: {current_user.email}")
        
        streams = db.query(TopicStream).filter(TopicStream.user_id == current_user.id).all()
        logger.debug(f"Found {len(streams)} topic streams for user {current_user.id}")
        
        # Log each stream for debugging
        for stream in streams:
            logger.debug(f"Stream: ID={stream.id}, Query={stream.query}, Model={stream.model_type}")
            
        return streams
    except Exception as e:
        logger.error(f"Error fetching topic streams for user {current_user.id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching topic streams: {str(e)}"
        )

@app.get("/topic-streams/{topic_stream_id}/summaries/", response_model=List[SummaryResponse])
def get_topic_stream_summaries(
    topic_stream_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        logger.debug(f"Fetching summaries for topic stream ID: {topic_stream_id}")
        topic_stream = db.query(TopicStream).filter(
            TopicStream.id == topic_stream_id,
            TopicStream.user_id == current_user.id
        ).first()
        
        if not topic_stream:
            logger.warning(f"Topic stream {topic_stream_id} not found for user {current_user.id}")
            raise HTTPException(status_code=404, detail="Topic stream not found")
        
        summaries_db = db.query(Summary).filter(Summary.topic_stream_id == topic_stream_id).order_by(Summary.created_at.desc()).all()
        logger.debug(f"Found {len(summaries_db)} summaries for topic stream {topic_stream_id}")
        
        # Manually construct the response list, parsing sources safely
        response_summaries = []
        for summary in summaries_db:
            parsed_sources = []
            if summary.sources: # Check if sources string is not None or empty
                try:
                    # First ensure it's a string - it might already be parsed in some cases
                    sources_str = summary.sources if isinstance(summary.sources, str) else json.dumps(summary.sources)
                    
                    # Now try to parse it
                    parsed_sources = json.loads(sources_str) 
                    
                    # Validate the parsed data is actually a list
                    if not isinstance(parsed_sources, list): 
                        logger.warning(f"Sources for summary {summary.id} is not a list, resetting to empty list")
                        parsed_sources = []
                        
                except json.JSONDecodeError:
                    logger.warning(f"Failed to decode sources JSON for summary {summary.id}: {summary.sources}")
                    parsed_sources = [] # Default to empty list on error
            
            logger.debug(f"Processed summary {summary.id} with {len(parsed_sources)} sources")
            response_summaries.append(
                SummaryResponse(
                    id=summary.id,
                    content=summary.content,
                    sources=parsed_sources, # Use the parsed list
                    created_at=summary.created_at
                )
            )
        
        return response_summaries # Return the manually constructed list
    except Exception as e:
        logger.error(f"Error fetching summaries: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching summaries: {str(e)}")

@app.delete("/topic-streams/{topic_stream_id}")
def delete_topic_stream(
    topic_stream_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        topic_stream = db.query(TopicStream).filter(
            TopicStream.id == topic_stream_id,
            TopicStream.user_id == current_user.id
        ).first()
        
        if not topic_stream:
            logger.warning(f"Attempt to delete non-existent or unauthorized topic stream ID: {topic_stream_id} by user ID: {current_user.id}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic stream not found or you do not have permission to delete it.")
        
        # Temporarily disable scheduler interaction
        # if scheduler:
        #     scheduler.remove_topic_stream(topic_stream_id)
        
        db.delete(topic_stream)
        db.commit()
        logger.info(f"Successfully deleted topic stream ID: {topic_stream_id} by user ID: {current_user.id}")
        return {"message": "Topic stream deleted successfully"}
    except HTTPException as http_exc: # Re-raise HTTPException to preserve status code and details
        raise http_exc
    except Exception as e:
        logger.error(f"Error deleting topic stream ID: {topic_stream_id} by user ID: {current_user.id}. Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred while deleting the topic stream: {str(e)}")

@app.post("/topic-streams/{topic_stream_id}/update-now", response_model=SummaryResponse)
async def update_topic_stream_now(
    topic_stream_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    topic_stream = db.query(TopicStream).filter(
        TopicStream.id == topic_stream_id,
        TopicStream.user_id == current_user.id
    ).first()
    
    if not topic_stream:
        raise HTTPException(status_code=404, detail="Topic stream not found")
    
    try:
        logger.debug(f"Manual update requested for topic stream: {topic_stream.query}")
        
        # Detailed debug logging
        logger.debug(f"Topic stream details: ID={topic_stream.id}, Query={topic_stream.query}, Model={topic_stream.model_type.value}, Recency={topic_stream.recency_filter}")
        
        try:
            # Use a longer timeout for this operation
            summary = await perform_search_and_create_summary(db, topic_stream)
            logger.debug(f"Summary created successfully: ID={summary.id}")
            
            # Convert sources to list for response
            parsed_sources = []
            if summary.sources:
                try:
                    parsed_sources = json.loads(summary.sources)
                    logger.debug(f"Parsed {len(parsed_sources)} sources from JSON")
                except json.JSONDecodeError:
                    logger.warning(f"Failed to decode sources JSON for summary {summary.id}")
                    parsed_sources = []
            
            return SummaryResponse(
                id=summary.id,
                content=summary.content,
                sources=parsed_sources,
                created_at=summary.created_at
            )
        except Exception as e:
            logger.error(f"Error during search and summary creation: {str(e)}", exc_info=True)
            raise
            
    except Exception as e:
        logger.error(f"Error updating topic stream: {str(e)}", exc_info=True)
        # Return more detailed error message
        raise HTTPException(
            status_code=500,
            detail=f"Error updating topic stream: {str(e)}"
        )

class DeepDiveRequest(BaseModel):
    topic_stream_id: int
    summary_id: int
    question: str

class DeepDiveResponse(BaseModel):
    answer: str
    sources: List[str]
    model: str  # Add model to the response

@app.post("/deep-dive/", response_model=DeepDiveResponse)
async def deep_dive(
    request: DeepDiveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify topic stream exists and belongs to current user
    topic_stream = db.query(TopicStream).filter(
        TopicStream.id == request.topic_stream_id,
        TopicStream.user_id == current_user.id
    ).first()
    if not topic_stream:
        raise HTTPException(status_code=404, detail="Topic stream not found")
    
    # Verify summary exists and belongs to the topic stream
    summary = db.query(Summary).filter(
        Summary.id == request.summary_id,
        Summary.topic_stream_id == request.topic_stream_id
    ).first()
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")
    
    try:
        # Initialize the Perplexity API
        perplexity_api = PerplexityAPI()
        
        # Use sonar-reasoning model for follow-up questions as it's best for this task
        model = "sonar-reasoning"
        
        # Get the answer and sources
        context = f"Based on the following summary about '{topic_stream.query}':\n\n{summary.content}"
        result = await perplexity_api.ask_follow_up_question(
            query=request.question,
            context=context,
            model=model
        )
        
        # Keep the original answer including <think> tags
        answer = result.get("answer", "No answer available")
        
        return {
            "answer": answer,
            "sources": result.get("sources", []),
            "model": model  # Return the model used
        }
    except Exception as e:
        logger.error(f"Error in deep dive: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing deep dive request: {str(e)}"
        )

@app.post("/topic-streams/{topic_stream_id}/summaries/", response_model=SummaryResponse)
def append_summary(
    topic_stream_id: int,
    summary_create: SummaryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    topic_stream = db.query(TopicStream).filter(
        TopicStream.id == topic_stream_id,
        TopicStream.user_id == current_user.id
    ).first()
    if not topic_stream:
        raise HTTPException(status_code=404, detail="Topic stream not found")
    import json
    new_summary = Summary(
        topic_stream_id=topic_stream_id,
        content=summary_create.content,
        sources=json.dumps([])
    )
    db.add(new_summary)
    db.commit()
    db.refresh(new_summary)
    # Parse sources JSON string
    parsed_sources = json.loads(new_summary.sources or '[]')
    return SummaryResponse(
        id=new_summary.id,
        content=new_summary.content,
        sources=parsed_sources,
        created_at=new_summary.created_at
    )

@app.delete("/topic-streams/{topic_stream_id}/summaries/{summary_id}")
def delete_summary(
    topic_stream_id: int,
    summary_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Debug print for troubleshooting
    print(f"DELETE SUMMARY CALLED - Stream ID: {topic_stream_id}, Summary ID: {summary_id}, User ID: {current_user.id}")
    logger.info(f"DELETE SUMMARY CALLED - Stream ID: {topic_stream_id}, Summary ID: {summary_id}, User ID: {current_user.id}")
    
    try:
        # Check if the topic stream exists
        topic_stream = db.query(TopicStream).get(topic_stream_id)
        
        if not topic_stream:
            print(f"ERROR: Topic stream {topic_stream_id} not found at all")
            raise HTTPException(status_code=404, detail=f"Topic stream {topic_stream_id} not found")
            
        # Check if the topic stream belongs to the current user
        if topic_stream.user_id != current_user.id:
            print(f"ERROR: Topic stream {topic_stream_id} doesn't belong to user {current_user.id}, it belongs to user {topic_stream.user_id}")
            raise HTTPException(status_code=403, detail="You don't have permission to access this topic stream")
        
        # Log that we found the topic stream
        print(f"Topic stream {topic_stream_id} found for user {current_user.id}")
        
        # Direct database query to check if summary exists at all
        raw_summary = db.query(Summary).get(summary_id)
        if not raw_summary:
            print(f"ERROR: Summary {summary_id} not found in database at all")
            raise HTTPException(status_code=404, detail=f"Summary {summary_id} not found in database")
        
        # Check if the summary belongs to the topic stream
        if raw_summary.topic_stream_id != topic_stream_id:
            print(f"ERROR: Summary {summary_id} found but doesn't belong to topic stream {topic_stream_id}. It belongs to topic stream {raw_summary.topic_stream_id}")
            raise HTTPException(status_code=404, detail=f"Summary {summary_id} not found in topic stream {topic_stream_id}")
        
        # Delete the summary directly
        print(f"Deleting summary {summary_id} from database")
        # Use SQLAlchemy's text() for raw SQL
        db.execute(text(f"DELETE FROM summaries WHERE id = :summary_id_param"), { "summary_id_param": summary_id })
        db.commit()
        print(f"Successfully deleted summary {summary_id}")
        return {"message": "Summary deleted successfully"}
    except HTTPException as http_ex:
        # Re-raise HTTP exceptions
        raise http_ex
    except Exception as e:
        # Handle all other errors
        print(f"ERROR deleting summary {summary_id}: {str(e)}")
        logger.error(f"Error deleting summary {summary_id}: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting summary: {str(e)}")

@app.get("/test-log")
async def test_log_endpoint():
    message = f"Test log endpoint hit at {datetime.utcnow().isoformat()}"
    print(f"PRINT: {message}")
    logger.info(f"LOGGER.INFO: {message}")
    return {"message": message}

@app.put("/topic-streams/{topic_stream_id}", response_model=TopicStreamResponse)
async def update_topic_stream(
    topic_stream_id: int,
    topic_stream: TopicStreamCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        logger.debug(f"Updating topic stream {topic_stream_id} with data: {topic_stream}")
        
        # Find the existing topic stream
        db_topic_stream = db.query(TopicStream).filter(
            TopicStream.id == topic_stream_id,
            TopicStream.user_id == current_user.id
        ).first()
        
        if not db_topic_stream:
            logger.warning(f"Topic stream {topic_stream_id} not found for user {current_user.id}")
            raise HTTPException(status_code=404, detail="Topic stream not found")
        
        # Convert enum values
        update_freq = UpdateFrequency(topic_stream.update_frequency)
        detail_lvl = DetailLevel(topic_stream.detail_level)
        model = ModelType(topic_stream.model_type)
        
        # Update the topic stream
        db_topic_stream.query = topic_stream.query
        db_topic_stream.update_frequency = update_freq
        db_topic_stream.detail_level = detail_lvl
        db_topic_stream.model_type = model
        db_topic_stream.recency_filter = topic_stream.recency_filter
        
        db.commit()
        db.refresh(db_topic_stream)
        
        logger.debug(f"Successfully updated topic stream {topic_stream_id}")
        return db_topic_stream
        
    except ValueError as e:
        logger.error(f"ValueError: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid enum value: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error updating topic stream: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error updating topic stream: {str(e)}"
        )
