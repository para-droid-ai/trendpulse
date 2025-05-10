import os
import sys
import time
from dotenv import load_dotenv
from pathlib import Path
from sqlalchemy.orm import Session
from models import User, TopicStream, UpdateFrequency, DetailLevel, ModelType, Summary
from scheduler import TopicStreamScheduler
from database import SessionLocal, engine
from models import Base

# Add the src directory to Python path
src_path = str(Path(__file__).parent.parent)
if src_path not in sys.path:
    sys.path.append(src_path)

# Configure logging to file
LOG_FILE = "debug_scheduler.log"
def log(message):
    with open(LOG_FILE, "a") as f:
        f.write(f"{message}\n")

# Load environment variables
load_dotenv()

def main():
    # Clear previous log
    with open(LOG_FILE, "w") as f:
        f.write("=== SCHEDULER DEBUG LOG ===\n\n")
    
    # Create database tables if they don't exist
    log("Creating database schema...")
    Base.metadata.create_all(bind=engine)
    
    # Check API key
    api_key = os.getenv("PERPLEXITY_API_KEY")
    if not api_key:
        log("ERROR: PERPLEXITY_API_KEY not set!")
        return
    
    log(f"API Key found: {api_key[:5]}...")
    
    # Create database session
    db = SessionLocal()
    log("Database session created")
    
    try:
        # Create test user if it doesn't exist
        test_user = db.query(User).filter(User.email == "test@example.com").first()
        if not test_user:
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            test_user = User(
                email="test@example.com",
                hashed_password=pwd_context.hash("test123")
            )
            db.add(test_user)
            db.commit()
            db.refresh(test_user)
            log("Created test user")
        else:
            log("Using existing test user")
        
        # Create test topic stream if it doesn't exist
        test_stream = db.query(TopicStream).filter(
            TopicStream.user_id == test_user.id,
            TopicStream.query == "Latest AI developments"
        ).first()
        
        if not test_stream:
            test_stream = TopicStream(
                user_id=test_user.id,
                query="Latest AI developments",
                update_frequency=UpdateFrequency.HOURLY,
                detail_level=DetailLevel.BRIEF,
                model_type=ModelType.SONAR,
                recency_filter="week"
            )
            db.add(test_stream)
            db.commit()
            db.refresh(test_stream)
            log("Created test topic stream")
        else:
            log("Using existing test topic stream")
        
        log(f"Topic stream details: id={test_stream.id}, query={test_stream.query}, model={test_stream.model_type.value}")
        
        # Initialize scheduler
        log("Initializing scheduler...")
        scheduler = TopicStreamScheduler(db)
        
        # Schedule the topic stream
        log("Scheduling topic stream for updates...")
        scheduler.schedule_topic_stream(test_stream)
        
        # Wait for update
        log("Waiting for update to complete (15 seconds)...")
        time.sleep(15)
        
        # Check for summaries
        summaries = db.query(Summary).filter(Summary.topic_stream_id == test_stream.id).all()
        log(f"Found {len(summaries)} summaries")
        
        # Log latest summary details if available
        if summaries:
            latest = summaries[-1]
            log(f"Latest summary created at: {latest.created_at}")
            log(f"Content preview: {latest.content[:150]}...")
            log(f"Sources: {latest.sources}")
        
        # Shutdown the scheduler
        log("Shutting down scheduler...")
        scheduler.shutdown()
        
        log("Test completed successfully!")
        
    except Exception as e:
        import traceback
        log(f"ERROR: {str(e)}")
        log(traceback.format_exc())
    finally:
        db.close()
        log("Database session closed")

if __name__ == "__main__":
    main() 