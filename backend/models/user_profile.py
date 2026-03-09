from enum import Enum
from sqlalchemy import Column, Integer, String, Enum as SQLEnum, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.sql.schema import ForeignKey
from sqlalchemy.sql import func
from database.database import Base
import enum

class GradeEnum(str, enum.Enum):
    大一 = '大一'
    大二 = '大二'
    大三 = '大三'
    大四 = '大四'
    已毕业 = '已毕业'

class UserProfile(Base):
    __tablename__ = 'user_profile'

    user_id = Column(Integer, primary_key=True, comment='用户ID（与登录表user_id完全一致）')
    username = Column(String(50), ForeignKey('user_login.username', ondelete='CASCADE'), nullable=False, unique=True, comment='用户名（与登录表一致）')
    avatar = Column(String(500), comment='头像文件路径/URL')
    grade = Column(SQLEnum(GradeEnum), comment='年级')
    postgraduate_session = Column(String(20), comment='考研届数（如2026届）')
    school = Column(String(100), comment='就读学校')
    major = Column(String(100), comment='就读专业')
    target_school = Column(String(100), comment='预期考研学校')
    target_major = Column(String(100), comment='预期考研专业')
    target_score = Column(Float, comment='预期考研分数')
    signature = Column(String(200), comment='个性签名')
    is_profile_public = Column(Boolean, default=True, nullable=False, comment='是否公开个人信息')

    __table_args__ = {
        'comment': '学习助手-考研个人信息表',
        'extend_existing': True
    }

class UserFollow(Base):
    __tablename__ = 'user_follows'
    
    follow_id = Column(Integer, primary_key=True, autoincrement=True, comment='关注记录ID')
    follower_id = Column(Integer, ForeignKey('user_login.user_id', ondelete='CASCADE'), nullable=False, comment='关注者ID')
    following_id = Column(Integer, ForeignKey('user_login.user_id', ondelete='CASCADE'), nullable=False, comment='被关注者ID')
    create_time = Column(DateTime, default=func.now(), nullable=False, comment='关注时间')
    
    __table_args__ = {
        'comment': '用户关注关系表',
        'extend_existing': True
    }

class UserMessage(Base):
    __tablename__ = 'user_messages'
    
    message_id = Column(Integer, primary_key=True, autoincrement=True, comment='消息ID')
    sender_id = Column(Integer, ForeignKey('user_login.user_id', ondelete='CASCADE'), nullable=False, comment='发送者ID')
    receiver_id = Column(Integer, ForeignKey('user_login.user_id', ondelete='CASCADE'), nullable=False, comment='接收者ID')
    content = Column(String(1000), nullable=False, comment='消息内容')
    is_read = Column(Boolean, default=False, nullable=False, comment='是否已读')
    create_time = Column(DateTime, default=func.now(), nullable=False, comment='发送时间')
    
    __table_args__ = {
        'comment': '用户私信消息表',
        'extend_existing': True
    }