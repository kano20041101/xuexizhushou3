from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database.database import Base

class Exercise(Base):
    __tablename__ = 'exercise'

    exercise_id = Column(Integer, primary_key=True, autoincrement=True, comment='习题ID')
    user_id = Column(Integer, ForeignKey('user_login.user_id', ondelete='CASCADE'), nullable=False, comment='用户ID')
    kp_id = Column(Integer, ForeignKey('knowledge_point.kp_id', ondelete='SET NULL'), nullable=True, comment='知识点ID')
    question_type = Column(String(20), nullable=False, comment='题目类型（选择题/填空题/简答题）')
    question = Column(Text, nullable=False, comment='题目内容')
    options = Column(JSON, nullable=True, comment='选项（JSON格式，仅选择题）')
    answer = Column(Text, nullable=False, comment='参考答案')
    analysis = Column(Text, nullable=True, comment='解析')
    difficulty = Column(String(20), nullable=True, comment='难度等级')
    create_time = Column(DateTime, nullable=False, comment='创建时间')
    user_answer = Column(String(10), nullable=True, comment='用户答案（选择题）')
    is_correct = Column(Integer, nullable=True, comment='是否答对（0:否, 1:是）')

    # 关系
    user = relationship("UserLogin", backref="exercises")
    knowledge_point = relationship("KnowledgePoint", backref="exercises")

    __table_args__ = {
        'comment': '学习助手-习题表（存储用户生成的习题）'
    }
