from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from database.database import Base

class LearningRecord(Base):
    __tablename__ = 'learning_record'

    record_id = Column(Integer, primary_key=True, autoincrement=True, comment='学习记录ID')
    user_id = Column(Integer, ForeignKey('user_login.user_id', ondelete='CASCADE'), nullable=False, comment='用户ID')
    kp_id = Column(Integer, ForeignKey('knowledge_point.kp_id', ondelete='SET NULL'), nullable=True, comment='知识点ID')
    action_type = Column(String(20), nullable=False, comment='学习行为类型（view/learn/master/test）')
    start_time = Column(DateTime, nullable=False, comment='开始时间')
    end_time = Column(DateTime, nullable=False, comment='结束时间')
    duration = Column(Integer, nullable=False, comment='学习时长（秒）')
    score = Column(Float, nullable=True, comment='测试得分')
    result = Column(String(20), nullable=True, comment='测试结果（pass/fail）')
    notes = Column(Text, nullable=True, comment='学习笔记或备注')

    # 关系
    user = relationship("UserLogin", backref="learning_records")
    knowledge_point = relationship("KnowledgePoint", backref="learning_records")

    __table_args__ = {
        'comment': '学习助手-学习记录表（记录用户的学习行为）'
    }
