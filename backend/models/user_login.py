from sqlalchemy import Column, Integer, String
from database.database import Base

class UserLogin(Base):
    __tablename__ = "user_login"

    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), index=True)
    password = Column(String(50), index=True)