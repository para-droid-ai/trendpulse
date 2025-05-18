from fastapi import FastAPI, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text
from datetime import datetime, timedelta
from typing import List, Optional
from enum import Enum
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
from utils.tokenizer_utils import count_tokens, truncate_text_by_tokens
from models import Base, User, TopicStream, Summary, UpdateFrequency, DetailLevel, ModelType, ContextHistoryLevel
from scheduler import TopicStreamScheduler
from perplexity_api import PerplexityAPI
from database import SessionLocal, engine
import models  # Add missing models import
from contextlib import asynccontextmanager

# Create tables
Base.metadata.create_all(bind=engine)

# Security
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # Increase to 24 hours for better user experience

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Initialize logger
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, stream=sys.stdout)

# Global scheduler variable - uncomment
scheduler: TopicStreamScheduler | None = None

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# get_scheduler function - uncomment
def get_scheduler() -> TopicStreamScheduler | None:
    # This helper is less crucial now with lifespan managing initialization,
    # but kept for potential direct access if needed elsewhere.
    # The global scheduler variable should be set by lifespan.
    return scheduler

# Define a context manager for the application lifespan (Keep this defined before app uses it)
@asynccontextmanager
async def lifespan(app: FastAPI):
    global scheduler # Ensure you're using the global scheduler variable
    # db_for_startup = SessionLocal() # No longer pass db here, scheduler will manage its own sessions per job
    try:
        logger.info("Application startup: Initializing TopicStreamScheduler...")
        # Pass the SessionLocal factory and the async function perform_search_and_create_summary
        # Make sure perform_search_and_create_summary is defined in this file
        scheduler = TopicStreamScheduler(SessionLocal, perform_search_and_create_summary) 
        logger.info("TopicStreamScheduler initialized and its thread started.")
    except Exception as e:
        logger.error(f"Failed to initialize scheduler during startup: {e}", exc_info=True)
    # finally:
        # db_for_startup.close() # No session to close here anymore
    
    yield # Application runs here
    
    # Shutdown event
    logger.info("Application shutdown: Shutting down TopicStreamScheduler...")
    if scheduler:
        scheduler.shutdown()
        logger.info("TopicStreamScheduler shut down successfully.")
    else:
        logger.warning("Scheduler was not initialized, nothing to shut down.")

# Move the FastAPI app initialization BEFORE middleware and routes
app = FastAPI(title="TrendPulse Dashboard API", lifespan=lifespan) # Ensure lifespan is used here

# Configure CORS - Move this down below app initialization
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
    update_frequency: str
    detail_level: str
    model_type: str
    recency_filter: str
    system_prompt: Optional[str] = None
    temperature: float = 0.7
    context_history_level: Optional[str] = ContextHistoryLevel.LAST_ONE.value

class TopicStreamResponse(BaseModel):
    id: int
    query: str
    update_frequency: str
    detail_level: str
    model_type: str
    recency_filter: str
    last_updated: Optional[datetime]
    system_prompt: Optional[str] = None
    temperature: float
    context_history_level: str
    total_stored_est_tokens: int = 0 # Add field for total estimated tokens of stored summaries
    
    class Config:
        orm_mode = True
        from_attributes = True
        
        @classmethod
        def schema_extra(cls, schema, model):
            for prop in schema.get('properties', {}).values():
                if prop.get('type') == 'string' and prop.get('format') == 'date-time':
                    prop['format'] = 'date-time'
                    
        json_encoders = {
            Enum: lambda v: v.value if isinstance(v, Enum) else v
        }

class SummaryResponse(BaseModel):
    id: int
    content: str
    sources: List[str]
    created_at: datetime
    model: str = ""
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    estimated_content_tokens: Optional[int] = None

class SummaryCreate(BaseModel):
    content: str

class DeepDiveRequest(BaseModel):
    topic_stream_id: int
    summary_id: int
    question: str
    model: Optional[str] = None

class DeepDiveResponse(BaseModel):
    answer: str
    sources: List[str]
    model: str

class UpdateNowOptions(BaseModel):
    ignore_all_previous_summaries_override: Optional[bool] = False

# Define this constant near the top of app.py or in a config file
MAX_PREV_CONTEXT_TOKENS_SMART_LIMIT = 20000 # Example: Approx 20k tokens for history

# Helper function to convert model objects to dict with proper enum handling
def model_to_dict(obj):
    if hasattr(obj, "__table__"):
        result = {}
        for key in obj.__table__.columns.keys():
            value = getattr(obj, key)
            if isinstance(value, Enum):
                result[key] = value.value
            else:
                result[key] = value
        return result
    return obj

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
async def perform_search_and_create_summary(
    db: Session,
    topic_stream: models.TopicStream,
    ignore_all_previous_summaries_override: bool = False
):
    try:
        logger.info(f"Performing search for stream ID: {topic_stream.id}. Override ignore all: {ignore_all_previous_summaries_override}")
        perplexity_api = PerplexityAPI()

        prev_summaries_concatenated_content = None
        num_summaries_to_fetch = 0 # Renamed for clarity

        if ignore_all_previous_summaries_override:
            logger.info(f"Stream {topic_stream.id}: Manual override ON. Ignoring all previous summaries for this update.")
            # num_summaries_to_fetch remains 0
        else:
            history_level_setting = topic_stream.context_history_level
            if history_level_setting == ContextHistoryLevel.NONE:
                num_summaries_to_fetch = 0
            elif history_level_setting == ContextHistoryLevel.LAST_ONE:
                num_summaries_to_fetch = 1
            elif history_level_setting == ContextHistoryLevel.LAST_THREE:
                num_summaries_to_fetch = 3
            elif history_level_setting == ContextHistoryLevel.LAST_FIVE:
                num_summaries_to_fetch = 5
            elif history_level_setting == ContextHistoryLevel.ALL_SMART_LIMIT:
                num_summaries_to_fetch = 15 # Max to fetch before token-based truncation

            logger.info(f"Stream {topic_stream.id}: Configured to include up to {num_summaries_to_fetch} (level: {history_level_setting.value}) previous summaries.")

        if num_summaries_to_fetch > 0:
            # Fetch summaries (content and creation date), newest first
            recent_summaries_from_db = db.query(models.Summary.content, models.Summary.created_at).filter(
                models.Summary.topic_stream_id == topic_stream.id
            ).order_by(models.Summary.created_at.desc()).limit(num_summaries_to_fetch).all()

            if recent_summaries_from_db:
                # Reverse to process oldest first for concatenation to build chronological context
                summaries_content_chronological = [data.content for data in reversed(recent_summaries_from_db)]

                concatenated_parts = []
                current_total_tokens_for_history = 0
                separator = "\n\n---\n[End of Previous Update]\n---\n\n"
                separator_tokens = count_tokens(separator)

                for i, content_item in enumerate(summaries_content_chronological):
                    item_tokens = count_tokens(content_item)
                    effective_separator_tokens = separator_tokens if concatenated_parts else 0

                    if current_total_tokens_for_history + item_tokens + effective_separator_tokens <= MAX_PREV_CONTEXT_TOKENS_SMART_LIMIT:
                        if concatenated_parts: # Add separator if not the first part
                            concatenated_parts.append(separator)
                        concatenated_parts.append(content_item)
                        current_total_tokens_for_history += item_tokens + effective_separator_tokens
                    else:
                        remaining_token_budget = MAX_PREV_CONTEXT_TOKENS_SMART_LIMIT - (current_total_tokens_for_history + effective_separator_tokens)
                        if remaining_token_budget > 50: # Only add if a meaningful chunk can be added
                            if concatenated_parts:
                                concatenated_parts.append(separator)
                            truncated_item_content = truncate_text_by_tokens(content_item, remaining_token_budget)
                            concatenated_parts.append(truncated_item_content)
                            # No need to update current_total_tokens_for_history further as we break
                            logger.info(f"Stream {topic_stream.id}: Truncated content of summary part {i+1} to fit token limit.")
                        else:
                            logger.info(f"Stream {topic_stream.id}: Could not fit summary part {i+1} or a meaningful portion into context due to token limit.")
                        break

                if concatenated_parts:
                    prev_summaries_concatenated_content = "".join(concatenated_parts)
                    final_history_tokens = count_tokens(prev_summaries_concatenated_content) # Recalculate final token count precisely
                    logger.info(f"Stream {topic_stream.id}: Using {len(recent_summaries_from_db)} fetched, effectively {len(concatenated_parts) // 2 + (1 if len(concatenated_parts) % 2 != 0 else 0) if separator_tokens > 0 else len(concatenated_parts)} summaries in concatenated context. Total est. tokens for history: {final_history_tokens}.")
                else:
                    logger.info(f"Stream {topic_stream.id}: No previous summaries fit within token limit for context.")
            else:
                logger.info(f"Stream {topic_stream.id}: No previous summaries found in DB to include in context.")
        else:
             logger.info(f"Stream {topic_stream.id}: Not including any previous summaries (num_summaries_to_fetch is 0 or overridden).")

        model = topic_stream.model_type.value
        base_query = topic_stream.query

        if prev_summaries_concatenated_content:
            full_query = f"Provide ONLY NEW information about {base_query} that wasn't in the previous updates. Focus on recent developments, news, and updates."
        else:
            full_query = base_query

        full_query += ". Format your response using markdown for better readability."

        if prev_summaries_concatenated_content:
            full_query += " DO NOT repeat information that was already covered in the previous updates."

        recency_filter_for_api = topic_stream.recency_filter # e.g. '1d', '1w'
        stream_custom_system_prompt = topic_stream.system_prompt

        logger.debug(f"For stream {topic_stream.id} - Final User Query for API: {full_query[:200]}...")
        if stream_custom_system_prompt:
            logger.debug(f"For stream {topic_stream.id} - Using Custom System Prompt: '{stream_custom_system_prompt[:100]}...'")
        else:
            logger.debug(f"For stream {topic_stream.id} - No custom system prompt, PerplexityAPI will use default.")

        result = await perplexity_api.search_perplexity(
            query=full_query,
            model=model,
            recency_filter=recency_filter_for_api,
            previous_summary=prev_summaries_concatenated_content,
            temperature=topic_stream.temperature,
            detail_level=topic_stream.detail_level.value,
            custom_system_prompt=stream_custom_system_prompt
        )

        content = result.get("answer", "No content available")
        if not content or content == "No content available" or ("no new information" in content.lower() and len(content) < 100) :
            if prev_summaries_concatenated_content: # Only say "no new info" if there was context
                content = "No new information is available since the last update."
            logger.warning(f"Received empty or 'no new info' content from API for stream {topic_stream.id}")

        sources_list = result.get("sources", [])
        sources_json = json.dumps(sources_list)
        summary_model_used = result.get("model", model)

        usage_stats = result.get("usage", {})
        content_tokens_est = count_tokens(content)

        summary = models.Summary(
            topic_stream_id=topic_stream.id,
            content=content,
            sources=sources_json,
            created_at=datetime.utcnow(),
            model=summary_model_used,
            prompt_tokens=usage_stats.get("prompt_tokens"),
            completion_tokens=usage_stats.get("completion_tokens"),
            total_tokens=usage_stats.get("total_tokens"),
            estimated_content_tokens=content_tokens_est
        )

        topic_stream.last_updated = datetime.utcnow()
        db.add(summary)
        db.commit()
        db.refresh(summary)
        db.refresh(topic_stream)
        logger.debug(f"Created summary ID {summary.id} for topic stream {topic_stream.id}")
        return summary

    except Exception as e:
        logger.error(f"Error in perform_search_and_create_summary for stream ID {topic_stream.id if topic_stream else 'Unknown'}: {str(e)}", exc_info=True)
        # It's important to re-raise or handle appropriately so the caller knows about the failure.
        # The endpoint calling this will wrap it in an HTTPException.
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
        model_val = ModelType.R1_1776 if topic_stream.model_type == "r1-1776" else ModelType(topic_stream.model_type)

        context_level_value = topic_stream.context_history_level if topic_stream.context_history_level else ContextHistoryLevel.LAST_ONE.value
        context_hist_level_enum = ContextHistoryLevel(context_level_value)

        logger.debug(f"Converted enums - freq: {update_freq}, detail: {detail_lvl}, model: {model_val}, context: {context_hist_level_enum})")

        db_topic_stream = models.TopicStream(
            user_id=current_user.id,
            query=topic_stream.query,
            update_frequency=update_freq,
            detail_level=detail_lvl,
            model_type=model_val,
            recency_filter=topic_stream.recency_filter,
            system_prompt=topic_stream.system_prompt,
            temperature=topic_stream.temperature,
            context_history_level=context_hist_level_enum
        )

        db.add(db_topic_stream)
        db.commit()
        db.refresh(db_topic_stream)

        # Re-enable scheduler interaction - uncomment
        scheduler_instance = get_scheduler() 
        if scheduler_instance: # Add a check to ensure it's initialized
            # The scheduler's schedule_topic_stream method includes logic to run immediately for new streams
            scheduler_instance.schedule_topic_stream(db_topic_stream)
            logger.debug(f"Scheduled topic stream updates for new stream ID: {db_topic_stream.id}")
        else:
            logger.error("Scheduler not available, cannot schedule new stream.")

        await perform_search_and_create_summary(db, db_topic_stream) # Initial summary
        db.refresh(db_topic_stream) # Refresh again for last_updated

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

@app.get("/topic-streams/")
async def get_topic_streams(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        logger.debug(f"Fetching topic streams for user ID: {current_user.id}, email: {current_user.email}")
        
        # Fetch topic streams and their associated summaries in one query for efficiency
        streams = db.query(TopicStream).options(joinedload(TopicStream.summaries)).filter(TopicStream.user_id == current_user.id).all()
        logger.debug(f"Found {len(streams)} topic streams for user {current_user.id}")
        
        # Manually construct the response to include the calculated total_stored_est_tokens
        result = []
        for stream in streams:
            # Calculate total estimated tokens for summaries
            total_est_tokens = 0
            for summary in stream.summaries:
                if summary.estimated_content_tokens is not None:
                    total_est_tokens += summary.estimated_content_tokens
            
            # Construct the dictionary for the response, mapping enum values and including the token count
            stream_response_data = {
                "id": stream.id,
                "query": stream.query,
                "update_frequency": stream.update_frequency.value if isinstance(stream.update_frequency, Enum) else stream.update_frequency,
                "detail_level": stream.detail_level.value if isinstance(stream.detail_level, Enum) else stream.detail_level,
                "model_type": stream.model_type.value if isinstance(stream.model_type, Enum) else stream.model_type,
                "recency_filter": stream.recency_filter,
                "last_updated": stream.last_updated.isoformat() if stream.last_updated else None,
                "system_prompt": stream.system_prompt,
                "temperature": stream.temperature,
                "context_history_level": stream.context_history_level.value if isinstance(stream.context_history_level, Enum) else stream.context_history_level,
                "total_stored_est_tokens": total_est_tokens # Include the calculated value
            }
            result.append(stream_response_data)
            
            logger.debug(f"Stream: ID={stream.id}, Query={stream.query}, Model={stream_response_data['model_type']}, Total Stored Tokens: {total_est_tokens}")
            
        return result
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
        
        # Log before querying for topic stream
        logger.debug(f"Querying for topic stream ID: {topic_stream_id} and user ID: {current_user.id}")
        topic_stream = db.query(TopicStream).filter(
            TopicStream.id == topic_stream_id,
            TopicStream.user_id == current_user.id
        ).first()
        
        if not topic_stream:
            logger.warning(f"Topic stream {topic_stream_id} not found for user {current_user.id}")
            raise HTTPException(status_code=404, detail="Topic stream not found")
        
        # Log before querying for summaries
        logger.debug(f"Querying for summaries for topic stream ID: {topic_stream_id}")
        summaries_db = db.query(Summary).filter(Summary.topic_stream_id == topic_stream_id).order_by(Summary.created_at.desc()).all()
        logger.debug(f"Found {len(summaries_db)} summaries for topic stream {topic_stream_id}")
        
        # Manually construct the response list, parsing sources safely
        response_summaries = []
        for summary in summaries_db:
            parsed_sources = []
            # Log before processing sources
            logger.debug(f"Processing sources for summary ID: {summary.id}")
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
                except Exception as source_parse_error:
                    # Catch any other errors during source parsing
                    logger.error(f"Unexpected error parsing sources for summary {summary.id}: {str(source_parse_error)}", exc_info=True)
                    parsed_sources = []

            # Log before appending summary to response
            logger.debug(f"Appending summary ID: {summary.id} to response")
            response_summaries.append(
                SummaryResponse(
                    id=summary.id,
                    content=summary.content,
                    sources=parsed_sources, # Use the parsed list
                    created_at=summary.created_at,
                    model=summary.model if summary.model is not None else "",
                    prompt_tokens=summary.prompt_tokens,
                    completion_tokens=summary.completion_tokens,
                    total_tokens=summary.total_tokens,
                    estimated_content_tokens=summary.estimated_content_tokens
                )
            )
        
        return response_summaries # Return the manually constructed list
    except HTTPException as http_exc: 
        # Re-raise HTTPException to preserve status code and details
        raise http_exc
    except Exception as e:
        logger.error(f"Error fetching summaries: {str(e)}", exc_info=True)
        # Re-raise as HTTPException to return to the frontend
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred while fetching summaries: {str(e)}")

@app.delete("/topic-streams/{topic_stream_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_topic_stream(
    topic_stream_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"Received request to delete topic stream ID: {topic_stream_id}")
    topic_stream = db.query(TopicStream).filter(
        TopicStream.id == topic_stream_id,
        TopicStream.user_id == current_user.id
    ).first()
    
    if not topic_stream:
        logger.warning(f"Topic stream ID: {topic_stream_id} not found for deletion.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic stream not found")

    # Temporarily disable scheduler interaction - uncomment
    if scheduler: # Check if the global scheduler is initialized
        scheduler.remove_topic_stream(topic_stream_id) # Use topic_stream.id
        logger.info(f"Removed topic stream ID: {topic_stream.id} from scheduler.")
    else:
        logger.warning(f"Scheduler not available, could not remove job for stream ID: {topic_stream.id}")

    db.delete(topic_stream)
    db.commit()
    logger.info(f"Deleted topic stream ID: {topic_stream_id}.")

    return {"detail": "Topic stream deleted successfully"}

@app.post("/topic-streams/{topic_stream_id}/update-now", response_model=SummaryResponse)
async def update_topic_stream_now(
    topic_stream_id: int,
    options: UpdateNowOptions, # Request body for options
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    topic_stream = db.query(models.TopicStream).filter(
        models.TopicStream.id == topic_stream_id,
        models.TopicStream.user_id == current_user.id
    ).first()

    if not topic_stream:
        raise HTTPException(status_code=404, detail="Topic stream not found")

    try:
        logger.debug(f"Manual update for stream {topic_stream.id}. Override ignore all previous: {options.ignore_all_previous_summaries_override}")

        summary = await perform_search_and_create_summary(
            db,
            topic_stream,
            ignore_all_previous_summaries_override=options.ignore_all_previous_summaries_override
        )

        parsed_sources = []
        if summary.sources:
            try:
                parsed_sources = json.loads(summary.sources)
            except json.JSONDecodeError:
                logger.warning(f"Failed to decode sources JSON for summary {summary.id}: {summary.sources}")
                parsed_sources = []

        return SummaryResponse(
            id=summary.id,
            content=summary.content,
            sources=parsed_sources,
            created_at=summary.created_at,
            model=summary.model if summary.model is not None else "",
            prompt_tokens=summary.prompt_tokens,
            completion_tokens=summary.completion_tokens,
            total_tokens=summary.total_tokens,
            estimated_content_tokens=summary.estimated_content_tokens
        )
    except Exception as e:
        logger.error(f"Error updating topic stream: {str(e)}", exc_info=True)
        # Return more detailed error message
        raise HTTPException(
            status_code=500,
            detail=f"Error updating topic stream: {str(e)}"
        )

@app.post("/deep-dive/", response_model=DeepDiveResponse)
async def deep_dive(
    request: DeepDiveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    topic_stream = db.query(TopicStream).filter(
        TopicStream.id == request.topic_stream_id,
        TopicStream.user_id == current_user.id
    ).first()
    if not topic_stream:
        raise HTTPException(status_code=404, detail="Topic stream not found or not owned by user")

    summary = db.query(Summary).filter(
        Summary.id == request.summary_id,
        Summary.topic_stream_id == request.topic_stream_id
    ).first()
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")

    perplexity_api = PerplexityAPI()
    
    messages_for_perplexity = []

    # Use the topic stream's custom system prompt if available, otherwise a default for chat
    deep_dive_system_content = topic_stream.system_prompt
    if not deep_dive_system_content:
        deep_dive_system_content = f"You are a helpful AI assistant. The user is exploring the topic: \'{topic_stream.query}\'. Answer their questions clearly and concisely. Format your response using markdown."

    messages_for_perplexity.append({
        "role": "system",
        "content": deep_dive_system_content
    })

    # Conditionally add initial stream summary context
    # This logic is adjusted to only add summary if include_stream_summary_context is true AND it's the first message (no chat_history)

    contextual_question = (
        f"Regarding the topic \"{topic_stream.query}\" and the following summary:\n\n"
        f"Summary: {summary.content}\n\n"
        f"User question: {request.question}"
    )

    model_to_use = request.model if request.model else "sonar-reasoning"
    logger.debug(f"Deep dive for topic '{topic_stream.query}', summary ID: {request.summary_id}. Question: '{request.question}'")
    logger.info(f"Deep Dive - Using model: {model_to_use}") # Changed to INFO for easier spotting

    try:
        result = await perplexity_api.search_perplexity(
            query=None, # messages_override is used
            model=model_to_use,
            recency_filter="all_time",
            messages_override=messages_for_perplexity, # Pass the fully constructed messages
            temperature=topic_stream.temperature,
            detail_level=topic_stream.detail_level.value # For max_tokens hint
        )
    except Exception as e:
        logger.error(f"Error during Perplexity API call in deep_dive: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error communicating with Perplexity API: {str(e)}")

    answer = result.get("answer", "Could not retrieve an answer.")
    sources_list = result.get("sources", [])
    
    return DeepDiveResponse(answer=answer, sources=sources_list, model=model_to_use)

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
    # Try to use the current model_type from the topic stream for the summary
    new_summary = Summary(
        topic_stream_id=topic_stream_id,
        content=summary_create.content,
        sources=json.dumps([]),
        model=str(topic_stream.model_type) if hasattr(topic_stream, 'model_type') and topic_stream.model_type else None
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
        created_at=new_summary.created_at,
        model=new_summary.model
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
    topic_stream_data: TopicStreamCreate, # Use TopicStreamCreate for payload
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        db_topic_stream = db.query(models.TopicStream).filter(
            models.TopicStream.id == topic_stream_id,
            models.TopicStream.user_id == current_user.id
        ).first()

        if not db_topic_stream:
            raise HTTPException(status_code=404, detail="Topic stream not found")

        logger.debug(f"Updating topic stream {topic_stream_id} with data: {topic_stream_data}")

        db_topic_stream.query = topic_stream_data.query
        db_topic_stream.update_frequency = UpdateFrequency(topic_stream_data.update_frequency)
        db_topic_stream.detail_level = DetailLevel(topic_stream_data.detail_level)
        if topic_stream_data.model_type == "r1-1776":
            db_topic_stream.model_type = ModelType.R1_1776
        else:
            db_topic_stream.model_type = ModelType(topic_stream_data.model_type)
        db_topic_stream.recency_filter = topic_stream_data.recency_filter
        db_topic_stream.system_prompt = topic_stream_data.system_prompt
        db_topic_stream.temperature = topic_stream_data.temperature

        if topic_stream_data.context_history_level: # Check if provided in payload
            db_topic_stream.context_history_level = ContextHistoryLevel(topic_stream_data.context_history_level)

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
