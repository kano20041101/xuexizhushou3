from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from database.database import Base

class LevelDefinition(Base):
    __tablename__ = 'level_definition'

    level_id = Column(Integer, primary_key=True, autoincrement=True, comment='等级ID')
    level_number = Column(Integer, nullable=False, unique=True, comment='等级序号')
    required_exp = Column(Integer, nullable=False, comment='升级所需经验值')

    __table_args__ = (
        {'comment': '等级定义表（定义每个等级的经验阈值）'}
    )
