import sys
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from database.database import engine, Base
from models.user_profile import UserProfile, UserFollow
from models.knowledge_point import KnowledgePoint
from models.knowledge_relation import KnowledgeRelation

Base.metadata.create_all(bind=engine)
print('数据库表已更新')
