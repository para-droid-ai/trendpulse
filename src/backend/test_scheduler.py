import os
import sys
import time
from dotenv import load_dotenv
from pathlib import Path
from sqlalchemy.orm import Session
from models import User, TopicStream, UpdateFrequency, DetailLevel, ModelType, Summary
from scheduler import TopicStreamScheduler
from database import SessionLocal, engine

# Add the src directory to Python path
src_path = str(Path(__file__).parent.parent)
if src_path not in sys.path:
    sys.path.append(src_path)

# Load environment variables
load_dotenv()

def create_test_user_and_stream(db: Session):
    """Create a test user and topic stream for testing"""
    # Check if test user exists
    test_user = db.query(User).filter(User.email == "test@example.com").first()
    
    if not test_user:
        # Create test user
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        hashed_password = pwd_context.hash("test123")
        
        test_user = User(email="test@example.com", hashed_password=hashed_password)
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        print("Created test user")
    else:
        print("Using existing test user")
    
    # Check if test stream exists
    test_stream = db.query(TopicStream).filter(
        TopicStream.user_id == test_user.id,
        TopicStream.query == "Latest developments in AI technology"
    ).first()
    
    if not test_stream:
        # Create test topic stream
        test_stream = TopicStream(
            user_id=test_user.id,
            query="Latest developments in AI technology",
            update_frequency=UpdateFrequency.HOURLY,
            detail_level=DetailLevel.SHORT,
            model_type=ModelType.SONAR,
            recency_filter="week"
        )
        db.add(test_stream)
        db.commit()
        db.refresh(test_stream)
        print("Created test topic stream")
    else:
        print("Using existing test topic stream")
    
    return test_stream

def main():
    print("\n=== TESTING SCHEDULER ===\n")
    
    # Check if PERPLEXITY_API_KEY is set
    if not os.getenv("PERPLEXITY_API_KEY"):
        print("ERROR: PERPLEXITY_API_KEY environment variable not set")
        sys.exit(1)
    else:
        print(f"Using API key: {os.getenv('PERPLEXITY_API_KEY')[:5]}...")
    
    # Create database session
    db = SessionLocal()
    print("Database session created")
    
    try:
        # Create test user and stream
        print("\n--- Setting up test data ---")
        test_stream = create_test_user_and_stream(db)
        print(f"Test stream: id={test_stream.id}, query='{test_stream.query}', model={test_stream.model_type.value}")
        
        # Initialize scheduler
        print("\n--- Initializing scheduler ---")
        scheduler = TopicStreamScheduler(db)
        print("Scheduler initialized")
        
        # Schedule topic stream update
        print("\n--- Scheduling topic stream update ---")
        print(f"Scheduling stream: {test_stream.query}")
        scheduler.schedule_topic_stream(test_stream)
        
        # Wait for update to complete
        print("\n--- Waiting for update to complete ---")
        print("This may take a few seconds...")
        time.sleep(15)  # Give more time for the API call to complete
        
        # Check for summaries
        print("\n--- Checking summaries ---")
        summaries = db.query(Summary).filter(Summary.topic_stream_id == test_stream.id).all()
        print(f"Found {len(summaries)} summaries for topic stream")
        
        if summaries:
            latest_summary = summaries[-1]
            print(f"Latest summary created at: {latest_summary.created_at}")
            print(f"Summary content (first 150 chars): {latest_summary.content[:150]}...")
            print(f"Sources: {latest_summary.sources}")
        else:
            print("WARNING: No summaries found. The API call may have failed.")
            # Check if the topic stream was updated at all
            db.refresh(test_stream)
            print(f"Topic stream last_updated: {test_stream.last_updated}")
        
        # Test cleanup function
        print("\n--- Testing cleanup function ---")
        scheduler.cleanup_old_summaries(max_summaries_per_stream=3)
        
        # Check summaries after cleanup
        remaining_summaries = db.query(Summary).filter(Summary.topic_stream_id == test_stream.id).all()
        print(f"After cleanup: {len(remaining_summaries)} summaries remaining")
        
        # Shutdown scheduler
        print("\n--- Shutting down scheduler ---")
        scheduler.shutdown()
        
        print("\n=== TEST COMPLETED SUCCESSFULLY ===")
        
    except Exception as e:
        print(f"\nERROR: {str(e)}")
        import traceback
        print(traceback.format_exc())
    finally:
        db.close()
        print("Database session closed")

if __name__ == "__main__":
    main() 