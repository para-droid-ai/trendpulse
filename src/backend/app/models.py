from sqlalchemy import Column, Integer, DateTime, Text, JSON
from sqlalchemy.orm import relationship, ForeignKey
from datetime import datetime

class Summary(Base):
    __tablename__ = "summaries"

    id = Column(Integer, primary_key=True, index=True)
    topic_stream_id = Column(Integer, ForeignKey("topic_streams.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    content = Column(Text, nullable=False)
    sources = Column(JSON)
    # New fields for token and character counts
    prompt_tokens = Column(Integer, nullable=True)
    completion_tokens = Column(Integer, nullable=True)
    total_tokens = Column(Integer, nullable=True)
    character_count = Column(Integer, nullable=True)

    topic_stream = relationship("TopicStream", back_populates="summaries") 