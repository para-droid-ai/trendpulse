from scheduler import TopicStreamScheduler
from perplexity_api import PerplexityAPI
from database import SessionLocal, engine
import models  # Add missing models import
from fastapi import FastAPI, Depends, HTTPException, status, Request, BackgroundTasks
from contextlib import asynccontextmanager

# Create tables
Base.metadata.create_all(bind=engine)

# Security
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # Increase to 24 hours for better user experience

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Temporarily disable scheduler
scheduler = None

# Define a context manager for the application lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup event
    logger.debug("Attempting to run startup event via lifespan context manager")
    global scheduler
    db = SessionLocal()
    try:
        scheduler = TopicStreamScheduler(db)
        logger.info("TopicStreamScheduler initialized and started.")
    except Exception as e:
         logger.error(f"Failed to initialize scheduler: {e}", exc_info=True)
    finally:
        db.close()
    yield
    # Shutdown event
    logger.info("Running shutdown event via lifespan context manager")
    global scheduler
    if scheduler:
        scheduler.shutdown()
        logger.info("TopicStreamScheduler shut down.")


app = FastAPI(title="TrendPulse Dashboard API", lifespan=lifespan)

# Configure CORS
origins = [
    # ... existing code ...
]

def get_scheduler():
    global scheduler
    if scheduler is None:
        db = SessionLocal()
        scheduler = TopicStreamScheduler(db)
    return scheduler

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
            recency_filter=topic_stream.recency_filter,
            system_prompt=topic_stream.system_prompt,
            temperature=topic_stream.temperature
        )

        logger.debug("Created TopicStream object")
        db.add(db_topic_stream)
        db.commit()
        logger.debug("Committed to database")
        db.refresh(db_topic_stream)
        logger.debug("Refreshed object")

        # Schedule updates using the global scheduler
        scheduler_instance = get_scheduler() # Use a different variable name
        scheduler_instance.schedule_topic_stream(db_topic_stream)
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
        # Check if scheduler is initialized before using it
        if scheduler:
             scheduler.remove_topic_stream(topic_stream_id)

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
                created_at=summary.created_at,
                model=summary.model if summary.model is not None else ""
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

@app.put("/topic-streams/{topic_stream_id}", response_model=TopicStreamResponse)
async def update_topic_stream(
    topic_stream_id: int,
    topic_stream: TopicStreamCreate, # Assuming TopicStreamCreate is the correct type hint based on previous context
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

        # Convert enum values safely
        try:
            update_freq = UpdateFrequency(topic_stream.update_frequency)
            detail_lvl = DetailLevel(topic_stream.detail_level)

            # Special handling for model_type to ensure r1-1776 works
            if topic_stream.model_type == "r1-1776":
                model = ModelType.R1_1776
            else:
                model = ModelType(topic_stream.model_type)

        except ValueError as e:
            logger.error(f"Invalid enum value: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid enum value: {str(e)}"
            )

        # Update the topic stream
        db_topic_stream.query = topic_stream.query
        db_topic_stream.update_frequency = update_freq
        db_topic_stream.detail_level = detail_lvl
        db_topic_stream.model_type = model
        db_topic_stream.recency_filter = topic_stream.recency_filter
        db_topic_stream.system_prompt = topic_stream.system_prompt
        db_topic_stream.temperature = topic_stream.temperature

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