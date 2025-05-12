from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum
from database import Base

class UpdateFrequency(str, Enum):
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"

class DetailLevel(str, Enum):
    BRIEF = "brief"
    DETAILED = "detailed"
    COMPREHENSIVE = "comprehensive"

class ModelType(str, Enum):
    SONAR = "sonar"
    SONAR_PRO = "sonar-pro"
    SONAR_REASONING = "sonar-reasoning"
    SONAR_REASONING_PRO = "sonar-reasoning-pro"
    SONAR_DEEP_RESEARCH = "sonar-deep-research"
    R1_1776 = "r1-1776"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    topic_streams = relationship("TopicStream", back_populates="user")

class TopicStream(Base):
    __tablename__ = "topic_streams"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    query = Column(String)
    update_frequency = Column(SQLEnum(UpdateFrequency))
    detail_level = Column(SQLEnum(DetailLevel))
    model_type = Column(SQLEnum(ModelType))
    recency_filter = Column(String)
    last_updated = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="topic_streams")
    summaries = relationship("Summary", back_populates="topic_stream")

class Summary(Base):
    __tablename__ = "summaries"

    id = Column(Integer, primary_key=True, index=True)
    topic_stream_id = Column(Integer, ForeignKey("topic_streams.id"))
    content = Column(String)
    sources = Column(String)  # Store as JSON string
    created_at = Column(DateTime, default=datetime.utcnow)
    model = Column(String, nullable=True)  # Store model used for this summary

    topic_stream = relationship("TopicStream", back_populates="summaries")
