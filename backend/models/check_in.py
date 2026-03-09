from sqlalchemy import Column, Integer, DateTime, String
from sqlalchemy.orm import relationship
from database.database import Base

class CheckIn(Base):
    __tablename__ = 'check_in'

    check_in_id = Column(Integer, primary_key=True, autoincrement=True, comment='签到记录ID')
    user_id = Column(Integer, nullable=False, comment='用户ID')
    check_in_date = Column(DateTime, nullable=False, comment='签到日期')
    check_in_time = Column(DateTime, nullable=False, comment='签到时间')
    consecutive_days = Column(Integer, nullable=False, default=1, comment='连续签到天数')
    exp_reward = Column(Integer, nullable=False, default=10, comment='经验值奖励')

    __table_args__ = (
        {'comment': '签到记录表（记录用户的每日签到）'}
    )
