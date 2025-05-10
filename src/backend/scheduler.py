from datetime import datetime, timedelta
import logging
import time
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session
from models import TopicStream, UpdateFrequency, Summary, DetailLevel, ModelType
from perplexity_api import PerplexityAPI, APIError, APIClientError, APIServerError, APINetworkError
from database import SessionLocal
import schedule
import sys
from pathlib import Path
import threading
import json

logger = logging.getLogger(__name__)

class TopicStreamScheduler:
    MAX_RETRIES = 3
    RETRY_DELAY_SECONDS = 5 # Simple delay, could use backoff
    
    def __init__(self, db: Session):
        self.perplexity_api = PerplexityAPI()
        self.db = db
        self.scheduler = schedule.Scheduler()
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.load_and_schedule_existing_streams()
        self.thread.start()
        
    def load_and_schedule_existing_streams(self):
        logger.info("Loading and scheduling existing topic streams...")
        try:
            streams = self.db.query(TopicStream).all()
            for stream in streams:
                self.schedule_topic_stream(stream)
            logger.info(f"Scheduled {len(streams)} existing streams.")
        except Exception as e:
            logger.error(f"Error loading existing streams: {e}", exc_info=True)
            # If DB connection fails here, scheduler might not start properly

    def get_db(self):
        db = SessionLocal()
        try:
            return db
        finally:
            db.close()
    
    def get_latest_summary(self, db: Session, topic_stream_id: int) -> str:
        """Get the latest summary content for a topic stream"""
        latest_summary = db.query(Summary).filter(
            Summary.topic_stream_id == topic_stream_id
        ).order_by(Summary.created_at.desc()).first()
        
        return latest_summary.content if latest_summary else None

    def update_topic_stream(self, stream_id: int, db: Session):
        topic_stream = db.query(TopicStream).filter(TopicStream.id == stream_id).first()
        if not topic_stream:
            logger.warning(f"Topic stream {stream_id} not found for update.")
            # Optionally remove the job if the stream is deleted
            # self.remove_topic_stream(stream_id)
            return
            
        logger.info(f"Updating topic stream {topic_stream.id}: {topic_stream.query}")
        retries = 0
        
        while retries < self.MAX_RETRIES:
            try:
                # Use the new search_perplexity method
                search_result = self.perplexity_api.search_perplexity(
                    query=topic_stream.query,
                    model=topic_stream.model_type.value,
                    recency_filter=topic_stream.recency_filter,
                    search_focus="internet" # Or make this configurable?
                )
                
                summary_content = search_result.get("answer", "")
                # search_result["sources"] is already a JSON string here
                sources_json = search_result.get("sources", json.dumps([]))
                
                if summary_content:
                    new_summary = Summary(
                        topic_stream_id=topic_stream.id,
                        content=summary_content,
                        sources=sources_json
                    )
                    db.add(new_summary)
                    topic_stream.last_updated = datetime.utcnow()
                    db.commit()
                    logger.info(f"Successfully updated topic stream {topic_stream.id}")
                    return # Exit retry loop on success
                else:
                    logger.warning(f"No summary content received for topic stream {topic_stream.id}")
                    # Decide if this counts as a failure or just no update needed
                    return # Exit loop if no content
                    
            except APIError as e:
                logger.warning(f"API error for topic stream {topic_stream.id}, retry {retries + 1}/{self.MAX_RETRIES}: {e}")
                retries += 1
                if retries < self.MAX_RETRIES:
                    time.sleep(self.RETRY_DELAY_SECONDS)
                else:
                    logger.error(f"Maximum retries reached for topic stream {topic_stream.id}: {e}")
                    break # Exit loop after max retries
            except Exception as e:
                 logger.error(f"Unexpected error updating topic stream {topic_stream.id}: {e}", exc_info=True)
                 break # Exit loop on unexpected errors
                 
        # If loop finished due to errors
        if retries >= self.MAX_RETRIES:
             logger.error(f"Failed to update topic stream {topic_stream.id} after {self.MAX_RETRIES} retries.")

    def get_max_tokens(self, detail_level: DetailLevel) -> int:
        """Get the maximum tokens based on detail level"""
        if detail_level == DetailLevel.BRIEF:
            return 150
        elif detail_level == DetailLevel.DETAILED:
            return 500
        elif detail_level == DetailLevel.COMPREHENSIVE:
            return 1000
        else:
            return 500

    def schedule_topic_stream(self, topic_stream: TopicStream):
        interval_seconds = self._get_interval(topic_stream.update_frequency)
        job_id = str(topic_stream.id)
        logger.info(f"Scheduling topic stream {topic_stream.id} with interval {interval_seconds} seconds")
        
        # Remove existing job if it exists to prevent duplicates
        self.scheduler.cancel_job(job_id)
        
        # Schedule the job
        self.scheduler.every(interval_seconds).seconds.do(
            self._run_with_session, self.update_topic_stream, topic_stream.id
        ).tag(job_id)
        
        # Run immediately upon scheduling for new streams
        # Use a separate thread to avoid blocking the main scheduling logic
        threading.Thread(target=self._run_with_session, args=(self.update_topic_stream, topic_stream.id)).start()

    def remove_topic_stream(self, stream_id: int):
        job_id = str(stream_id)
        logger.info(f"Removing scheduled job for topic stream {stream_id}")
        self.scheduler.clear(job_id)

    def _get_interval(self, frequency: UpdateFrequency) -> int:
        if frequency == UpdateFrequency.HOURLY:
            return 3600
        elif frequency == UpdateFrequency.DAILY:
            return 86400
        elif frequency == UpdateFrequency.WEEKLY:
            return 604800
        else:
            return 86400 # Default to daily
            
    def _run_with_session(self, func, *args):
        """Creates a new DB session for a scheduled job."""
        db = SessionLocal()
        try:
            func(*args, db=db)
        except Exception as e:
            logger.error(f"Error in scheduled job {func.__name__} with args {args}: {e}", exc_info=True)
        finally:
            db.close()

    def _run_scheduler(self):
        logger.info("Scheduler thread started.")
        while not self.stop_event.is_set():
            self.scheduler.run_pending()
            time.sleep(1)
        logger.info("Scheduler thread stopped.")

    def shutdown(self):
        logger.info("Shutting down scheduler...")
        self.stop_event.set()
        self.thread.join()
        logger.info("Scheduler shut down.")

    def cleanup_old_summaries(self, max_summaries_per_stream: int = 10):
        """
        Remove old summaries to prevent database bloat.
        Keeps only the most recent `max_summaries_per_stream` summaries per topic stream.
        """
        try:
            db = self.get_db()
            
            # Get all topic streams
            topic_streams = db.query(TopicStream).all()
            
            for stream in topic_streams:
                # Count summaries for this stream
                count = db.query(Summary).filter(Summary.topic_stream_id == stream.id).count()
                
                if count > max_summaries_per_stream:
                    # Find IDs of summaries to keep (most recent ones)
                    keep_ids = db.query(Summary.id).filter(
                        Summary.topic_stream_id == stream.id
                    ).order_by(Summary.created_at.desc()).limit(max_summaries_per_stream).all()
                    keep_ids = [id[0] for id in keep_ids]
                    
                    # Delete older summaries
                    db.query(Summary).filter(
                        Summary.topic_stream_id == stream.id,
                        ~Summary.id.in_(keep_ids)
                    ).delete(synchronize_session=False)
                    
                    db.commit()
                    logger.info(f"Cleaned up old summaries for topic stream {stream.id}")
            
        except Exception as e:
            logger.error(f"Error cleaning up old summaries: {str(e)}")
            if db:
                db.rollback()
        finally:
            if db:
                db.close()
