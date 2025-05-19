from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum, Text, Float, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import text as sa_text # Import for server_default raw SQL
from datetime import datetime
from enum import Enum as PyEnum # Use an alias to avoid conflict with SQLEnum
from database import Base

class UpdateFrequency(str, PyEnum):
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"

class DetailLevel(str, PyEnum):
    BRIEF = "brief"
    DETAILED = "detailed"
    COMPREHENSIVE = "comprehensive"

class ModelType(str, PyEnum):
    SONAR = "sonar"
    SONAR_PRO = "sonar-pro"
    SONAR_REASONING = "sonar-reasoning"
    SONAR_REASONING_PRO = "sonar-reasoning-pro"
    SONAR_DEEP_RESEARCH = "sonar-deep-research"
    R1_1776 = "r1-1776"

class ContextHistoryLevel(str, PyEnum):
    NONE = "none"
    LAST_ONE = "last_1"
    LAST_THREE = "last_3"
    LAST_FIVE = "last_5"
    ALL_SMART_LIMIT = "all_smart_limit"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False) # Emails should be non-nullable
    hashed_password = Column(String, nullable=False) # Passwords should be non-nullable
    
    topic_streams = relationship("TopicStream", back_populates="user", cascade="all, delete-orphan")
    deep_dive_messages = relationship("DeepDiveMessage", back_populates="user", cascade="all, delete-orphan")

class TopicStream(Base):
    __tablename__ = "topic_streams"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    query = Column(String, nullable=False)
    
    update_frequency = Column(SQLEnum(UpdateFrequency, name="updatefrequency_enum", native_enum=False), nullable=False, default=UpdateFrequency.DAILY, server_default=UpdateFrequency.DAILY.value)
    detail_level = Column(SQLEnum(DetailLevel, name="detaillevel_enum", native_enum=False), nullable=False, default=DetailLevel.DETAILED, server_default=DetailLevel.DETAILED.value)
    model_type = Column(SQLEnum(ModelType, name="modeltype_enum", native_enum=False), nullable=False, default=ModelType.SONAR_REASONING, server_default=ModelType.SONAR_REASONING.value)
    
    recency_filter = Column(String, nullable=False, default="1d", server_default="1d") # Added nullable=False and defaults
    last_updated = Column(DateTime, nullable=True, default=None)
    system_prompt = Column(Text, nullable=True)
    
    temperature = Column(Float, 
                         default=0.7, 
                         server_default=sa_text('0.7'), 
                         nullable=False)
                         
    context_history_level = Column(SQLEnum(ContextHistoryLevel, name="contexthistorylevel_enum", native_enum=False), 
                                   default=ContextHistoryLevel.LAST_ONE, 
                                   server_default=ContextHistoryLevel.LAST_ONE.value, 
                                   nullable=False)
    
    # Add auto_update_enabled column
    auto_update_enabled = Column(Boolean, 
                                 default=True, 
                                 server_default=sa_text('1'), 
                                 nullable=False)

    user = relationship("User", back_populates="topic_streams")
    summaries = relationship("Summary", back_populates="topic_stream", cascade="all, delete-orphan")

class Summary(Base):
    __tablename__ = "summaries"

    id = Column(Integer, primary_key=True, index=True)
    topic_stream_id = Column(Integer, ForeignKey("topic_streams.id"), nullable=False)
    content = Column(Text, nullable=False) # Changed String to Text for potentially longer summaries
    sources = Column(Text, nullable=True)  # Changed String to Text, can be JSON string
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    model = Column(String, nullable=True)
    
    # Token tracking fields
    prompt_tokens = Column(Integer, nullable=True)
    completion_tokens = Column(Integer, nullable=True)
    total_tokens = Column(Integer, nullable=True)
    estimated_content_tokens = Column(Integer, nullable=True)

    topic_stream = relationship("TopicStream", back_populates="summaries")

class DeepDiveMessage(Base):
    __tablename__ = "deep_dive_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    topic_stream_id = Column(Integer, ForeignKey("topic_streams.id"), nullable=False)
    summary_id = Column(Integer, ForeignKey("summaries.id"), nullable=True) 
    message = Column(Text, nullable=False)
    response = Column(Text, nullable=True) # AI response can be initially null
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    model = Column(String, nullable=True)

    user = relationship("User", back_populates="deep_dive_messages")