from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from database.database import Base


class KnowledgeRelation(Base):
    __tablename__ = 'knowledge_relation'
    
    relation_id = Column(Integer, primary_key=True, autoincrement=True, comment='关联ID（自增）')
    user_id = Column(Integer, ForeignKey('user_login.user_id', ondelete='CASCADE'), nullable=False, comment='用户ID')
    source_kp_id = Column(Integer, ForeignKey('knowledge_point.kp_id', ondelete='CASCADE'), nullable=False, comment='源知识点ID')
    target_kp_id = Column(Integer, ForeignKey('knowledge_point.kp_id', ondelete='CASCADE'), nullable=False, comment='目标知识点ID')
    relation_type = Column(String(50), nullable=False, comment='关联类型（如：前置知识、相关概念、应用场景等）')
    strength = Column(Integer, nullable=False, default=1, comment='关联强度（1-5）')
    description = Column(Text, nullable=True, comment='关联描述')
    create_time = Column(DateTime, nullable=False, default=func.current_timestamp(), comment='创建时间')
    update_time = Column(DateTime, nullable=False, default=func.current_timestamp(), onupdate=func.current_timestamp(), comment='更新时间')
    
    __table_args__ = (
        Index('source_kp_id', 'source_kp_id'),
        Index('target_kp_id', 'target_kp_id'),
        Index('user_id', 'user_id'),
    )