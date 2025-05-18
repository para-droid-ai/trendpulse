from datetime import datetime, timedelta
import logging
import time
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session
from models import TopicStream, UpdateFrequency, Summary, DetailLevel, ModelType, ContextHistoryLevel
from perplexity_api import PerplexityAPI, APIError, APIClientError, APIServerError, APINetworkError
from database import SessionLocal
import schedule
import sys
from pathlib import Path
import threading
import json
import asyncio

logger = logging.getLogger(__name__)

class TopicStreamScheduler:
    def __init__(self, db_session_factory, update_function_coro):
        self.db_session_factory = db_session_factory
        self.update_function_coro = update_function_coro
        self.scheduler = schedule.Scheduler()
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self._run_scheduler, daemon=True)
        
        db_for_load = self.db_session_factory()
        try:
            self.load_and_schedule_existing_streams(db_for_load)
        finally:
            db_for_load.close()
            
        self.thread.start()

    def load_and_schedule_existing_streams(self, db):
        logger.info("Loading and scheduling existing topic streams...")
        try:
            streams = db.query(TopicStream).all()
            for stream in streams:
                self.schedule_topic_stream(stream)
            logger.info(f"Scheduled {len(streams)} existing streams.")
        except Exception as e:
            logger.error(f"Error loading existing streams: {e}", exc_info=True)

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
        
        self.scheduler.clear(job_id)
        logger.info(f"Scheduling stream {topic_stream.id} ({topic_stream.query}) every {interval_seconds}s. Job ID: {job_id}")
        
        self.scheduler.every(interval_seconds).seconds.do(
            self._scheduled_update_job, stream_id=topic_stream.id
        ).tag(job_id)

    def remove_topic_stream(self, stream_id: int):
        job_id = str(stream_id)
        self.scheduler.clear(job_id)
        logger.info(f"Removed job for stream ID: {job_id} from scheduler.")

    def _get_interval(self, frequency: UpdateFrequency) -> int:
        # Map UpdateFrequency enum to seconds
        if frequency == UpdateFrequency.HOURLY:
            # Reverted change: Set back to 3600 seconds (1 hour)
            return 3600 # 1 hour
        elif frequency == UpdateFrequency.DAILY:
            return 24 * 60 * 60
        elif frequency == UpdateFrequency.WEEKLY:
            return 7 * 24 * 60 * 60
        else:
            logger.warning(f"Unknown update frequency: {frequency}. Defaulting to Daily.")
            return 24 * 60 * 60

    def _scheduled_update_job(self, stream_id: int):
        db = self.db_session_factory()
        try:
            logger.info(f"Scheduler job starting for stream ID: {stream_id}")
            topic_stream = db.query(TopicStream).filter(TopicStream.id == stream_id).first()
            if not topic_stream:
                logger.warning(f"Topic stream {stream_id} not found for scheduled update. Removing job.")
                self.remove_topic_stream(stream_id)
                return

            asyncio.run(self.update_function_coro(db, topic_stream, ignore_all_previous_summaries_override=False))
            logger.info(f"Scheduled update processed for topic stream {topic_stream.id}: {topic_stream.query}")

        except Exception as e:
             logger.error(f"Error in _scheduled_update_job for stream ID {stream_id}: {e}", exc_info=True)
        finally:
            db.close()
            logger.debug(f"DB session closed for scheduled job of stream ID: {stream_id}")

    def _run_scheduler(self):
        logger.info("Scheduler thread started.")
        while not self.stop_event.is_set():
            self.scheduler.run_pending()
            sleep_duration = self.scheduler.idle_seconds
            if sleep_duration is not None and sleep_duration > 0:
                time.sleep(min(sleep_duration, 60))
            else:
                time.sleep(1)
        logger.info("Scheduler thread stopped.")

    def shutdown(self):
        logger.info("Shutting down scheduler thread.")
        self.stop_event.set()
        if self.thread.is_alive():
            self.thread.join()
        logger.info("Scheduler thread shut down.")

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
