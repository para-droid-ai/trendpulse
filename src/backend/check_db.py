from sqlalchemy.orm import Session
from models import Base, User, TopicStream, Summary
from database import SessionLocal, engine

def check_db():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"Users in database: {len(users)}")
        for user in users:
            print(f"User ID: {user.id}, Email: {user.email}")
        
        streams = db.query(TopicStream).all()
        print(f"\nTopic Streams in database: {len(streams)}")
        for stream in streams:
            print(f"Stream ID: {stream.id}, Query: {stream.query}, User ID: {stream.user_id}")
            
            summaries = db.query(Summary).filter(Summary.topic_stream_id == stream.id).all()
            print(f"  Summaries for this stream: {len(summaries)}")
    finally:
        db.close()

if __name__ == "__main__":
    check_db() 