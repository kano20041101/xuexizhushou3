from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from database.database import Base

class Notification(Base):
    __tablename__ = 'notifications'
    
    notification_id = Column(Integer, primary_key=True, autoincrement=True, comment='通知ID')
    user_id = Column(Integer, ForeignKey('user_login.user_id', ondelete='CASCADE'), nullable=False, comment='接收通知的用户ID')
    type = Column(String(20), nullable=False, comment='通知类型：follow, message, like, comment')
    title = Column(String(100), nullable=False, comment='通知标题')
    content = Column(String(500), nullable=False, comment='通知内容')
    related_user_id = Column(Integer, ForeignKey('user_login.user_id', ondelete='SET NULL'), comment='相关用户ID（如关注者、消息发送者）')
    related_id = Column(Integer, comment='相关ID（如帖子ID、评论ID）')
    is_read = Column(Boolean, default=False, nullable=False, comment='是否已读')
    create_time = Column(DateTime, default=func.now(), nullable=False, comment='创建时间')
    
    __table_args__ = {
        'comment': '用户通知表',
        'extend_existing': True
    }
