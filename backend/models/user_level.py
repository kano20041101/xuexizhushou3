from sqlalchemy import Column, Integer, DateTime
from sqlalchemy.orm import relationship
from database.database import Base

class UserLevel(Base):
    __tablename__ = 'user_level'

    user_id = Column(Integer, primary_key=True, comment='用户ID')
    current_level = Column(Integer, nullable=False, default=1, comment='当前等级ID')
    current_exp = Column(Integer, nullable=False, default=0, comment='当前等级经验值')
    total_exp = Column(Integer, nullable=False, default=0, comment='总累计经验值')
    last_level_up_time = Column(DateTime, nullable=True, comment='最后升级时间')
    daily_post_exp = Column(Integer, nullable=False, default=0, comment='今日发帖获得经验值')
    daily_like_exp = Column(Integer, nullable=False, default=0, comment='今日点赞获得经验值')
    last_exp_update_date = Column(DateTime, nullable=True, comment='最后经验值更新日期')

    __table_args__ = (
        {'comment': '用户等级表（记录用户的等级和经验值）'}
    )
