import sys
import os
import math
from pathlib import Path

# 添加 backend 目录到 Python 路径
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from fastapi import FastAPI, HTTPException, Depends, status, File, UploadFile, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, validator
from typing import Optional, List
import uuid
from datetime import datetime, timedelta
from sqlalchemy import text
from pydantic import BaseModel
from database.database import get_db, engine, Base
from models.user_login import UserLogin
from models.user_profile import UserProfile, GradeEnum, UserFollow, UserMessage
from models.notification import Notification
from models.knowledge_point import KnowledgePoint
from models.knowledge_relation import KnowledgeRelation
from models.file_reference import FileReference, KnowledgeFile
from models.learning_record import LearningRecord
from models.community import Post, Comment, PostFile, PostLike, PostFavorite
from models.check_in import CheckIn
from models.level_definition import LevelDefinition
from models.user_level import UserLevel
from models.exercise import Exercise
from sqlalchemy import func
from fastapi.staticfiles import StaticFiles
import dashscope
from dashscope import Generation
from dashscope import Application

# 设置阿里云百炼API Key
dashscope.api_key = "sk-469f5b0ca72a4bfdbaec573bf52cca82"

app = FastAPI()

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

class UserCreate(BaseModel):
    username: str
    password: str

class UserLoginRequest(BaseModel):
    username: str
    password: str

@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)

@app.get("/")
def read_root(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"message": "数据库连接成功", "status": "healthy"}
    except Exception as e:
        return {"message": f"数据库连接失败: {str(e)}", "status": "error"}

@app.get("/user-login/")
def read_user_login(db: Session = Depends(get_db)):
    users = db.query(UserLogin).all()
    return users

@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(UserLogin).filter(UserLogin.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    new_user = UserLogin(username=user.username, password=user.password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User registered successfully", "user_id": new_user.user_id}

@app.post("/login")
def login(user: UserLoginRequest, db: Session = Depends(get_db)):
    db_user = db.query(UserLogin).filter(func.lower(UserLogin.username) == func.lower(user.username)).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="用户名不存在")
    elif db_user.password != user.password:
        raise HTTPException(status_code=401, detail="密码错误")
    return {"message": "Login successful", "user_id": db_user.user_id}

@app.get("/check-username/{username}")
def check_username(username: str, db: Session = Depends(get_db)):
    """
    检查用户名是否已存在
    """
    db_user = db.query(UserLogin).filter(func.lower(UserLogin.username) == func.lower(username)).first()
    return {
        "exists": db_user is not None,
        "message": "用户名已存在" if db_user else "用户名可用"
    }

# 配置头像上传目录
AVATAR_UPLOAD_DIR = "uploads/avatars"
os.makedirs(AVATAR_UPLOAD_DIR, exist_ok=True)

@app.get("/profile/{user_id}")
def get_profile(user_id: int, db: Session = Depends(get_db)):
    # 查找用户是否存在
    user = db.query(UserLogin).filter(UserLogin.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 获取用户资料
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        # 如果用户资料不存在，创建一个新的
        profile = UserProfile(id=user_id, username=user.username)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    # 获取用户等级信息
    user_level = db.query(UserLevel).filter(UserLevel.user_id == user_id).first()
    if not user_level:
        # 如果用户等级不存在，创建一个新的
        user_level = UserLevel(
            user_id=user_id,
            current_level=1,
            current_exp=0,
            total_exp=0
        )
        db.add(user_level)
        db.commit()
        db.refresh(user_level)

    # 获取当前等级的定义
    level_def = db.query(LevelDefinition).filter(LevelDefinition.level_number == user_level.current_level).first()

    # 计算进度条百分比
    progress_percentage = 0
    if level_def and level_def.required_exp > 0:
        progress_percentage = (user_level.current_exp / level_def.required_exp) * 100

    # 获取关注数和粉丝数
    following_count = db.query(UserFollow).filter(UserFollow.follower_id == user_id).count()
    followers_count = db.query(UserFollow).filter(UserFollow.following_id == user_id).count()

    # 转换为字典并返回
    profile_dict = {
        "id": profile.user_id,
        "username": profile.username,
        "avatar": f"/{profile.avatar}" if profile.avatar else None,
        "grade": profile.grade.value if profile.grade else None,
        "postgraduate_session": profile.postgraduate_session,
        "school": profile.school,
        "major": profile.major,
        "target_school": profile.target_school,
        "target_major": profile.target_major,
        "target_score": profile.target_score,
        "signature": profile.signature,
        "is_profile_public": profile.is_profile_public if profile.is_profile_public is not None else True,
        "level": {
            "current_level": user_level.current_level,
            "current_exp": user_level.current_exp,
            "total_exp": user_level.total_exp,
            "required_exp": level_def.required_exp if level_def else 100,
            "progress_percentage": round(progress_percentage, 1)
        },
        "following_count": following_count,
        "followers_count": followers_count
    }
    return profile_dict

@app.put("/profile/{user_id}")
def update_profile(
    user_id: int,
    grade: Optional[str] = Form(None),
    postgraduate_session: Optional[str] = Form(None),
    school: Optional[str] = Form(None),
    major: Optional[str] = Form(None),
    target_school: Optional[str] = Form(None),
    target_major: Optional[str] = Form(None),
    target_score: Optional[float] = Form(None),
    signature: Optional[str] = Form(None),
    is_profile_public: Optional[bool] = Form(None),
    avatar: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    # 查找用户是否存在
    user = db.query(UserLogin).filter(UserLogin.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 获取用户资料
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        profile = UserProfile(user_id=user_id, username=user.username)
        db.add(profile)

    # 更新基本信息
    if grade:
        try:
            profile.grade = GradeEnum(grade)
        except ValueError:
            raise HTTPException(status_code=400, detail="无效的年级值")
    if postgraduate_session:
        profile.postgraduate_session = postgraduate_session
    if school:
        profile.school = school
    if major:
        profile.major = major
    if target_school:
        profile.target_school = target_school
    if target_major:
        profile.target_major = target_major
    if target_score:
        profile.target_score = target_score
    if signature:
        profile.signature = signature
    if is_profile_public is not None:
        profile.is_profile_public = is_profile_public

    # 处理头像上传
    if avatar:
        # 生成唯一文件名
        file_ext = os.path.splitext(avatar.filename)[1]
        filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(AVATAR_UPLOAD_DIR, filename)

        # 保存文件
        with open(file_path, "wb") as f:
            f.write(avatar.file.read())

        # 更新头像路径
        profile.avatar = file_path

    # 提交更改
    db.commit()
    db.refresh(profile)

    return {"message": "个人信息更新成功"}

# ==================== 知识点管理 API ====================

class KnowledgePointCreate(BaseModel):
    id: int
    subject: str
    point_name: str
    category: str
    importance: str = "中"
    difficulty: str = "中"
    exam_points: Optional[str] = None
    content: Optional[str] = None
    show_in_mindmap: bool = False
    node_type: str = "normal"

class KnowledgePointUpdate(BaseModel):
    subject: Optional[str] = None
    point_name: Optional[str] = None
    category: Optional[str] = None
    importance: Optional[str] = None
    difficulty: Optional[str] = None
    exam_points: Optional[str] = None
    content: Optional[str] = None
    show_in_mindmap: Optional[bool] = None

# 获取用户的所有知识点
@app.get("/knowledge-points/{user_id}")
def get_knowledge_points(user_id: int, subject: Optional[str] = None, db: Session = Depends(get_db)):
    # 验证用户是否存在
    user = db.query(UserLogin).filter(UserLogin.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    # 查询知识点
    query = db.query(KnowledgePoint).filter(KnowledgePoint.user_id == user_id)
    if subject:
        query = query.filter(KnowledgePoint.subject == subject)
    
    knowledge_points = query.order_by(KnowledgePoint.create_time.desc()).all()
    
    # 转换为字典列表
    result = []
    for kp in knowledge_points:
        # 获取关联的文件
        knowledge_files = db.query(KnowledgeFile).filter(
            KnowledgeFile.kp_id == kp.kp_id
        ).all()
        
        files_data = []
        for kf in knowledge_files:
            files_data.append({
                "file_id": kf.file_id,
                "file_name": kf.file.file_name,
                "file_type": kf.file.file_type,
                "file_size": kf.file.file_size,
                "upload_time": kf.file.upload_time.isoformat(),
                "reference_note": kf.reference_note
            })
        
        result.append({
            "kp_id": kp.kp_id,
            "id": kp.user_id,
            "subject": kp.subject,
            "point_name": kp.point_name,
            "category": kp.category,
            "importance": kp.importance,
            "difficulty": kp.difficulty,
            "exam_points": kp.exam_points,
            "content": kp.content,
            "show_in_mindmap": kp.show_in_mindmap,
            "node_type": kp.node_type,
            "create_time": kp.create_time.isoformat() if kp.create_time else None,
            "update_time": kp.update_time.isoformat() if kp.update_time else None,
            "files": files_data
        })
    
    return result

# 创建知识点
@app.post("/knowledge-points")
def create_knowledge_point(kp: KnowledgePointCreate, db: Session = Depends(get_db)):
    # 验证用户是否存在
    user = db.query(UserLogin).filter(UserLogin.user_id == kp.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    # 检查知识点是否已存在
    existing_kp = db.query(KnowledgePoint).filter(
        KnowledgePoint.user_id == kp.id,
        KnowledgePoint.point_name == kp.point_name
    ).first()
    
    if existing_kp:
        raise HTTPException(status_code=400, detail="该知识点已存在")
    
    # 创建新知识点
    new_kp = KnowledgePoint(
        user_id=kp.id,
        subject=kp.subject,
        point_name=kp.point_name,
        category=kp.category,
        importance=kp.importance,
        difficulty=kp.difficulty,
        exam_points=kp.exam_points,
        content=kp.content,
        show_in_mindmap=kp.show_in_mindmap,
        node_type=kp.node_type,
        create_time=datetime.now(),
        update_time=datetime.now()
    )
    
    db.add(new_kp)
    db.commit()
    db.refresh(new_kp)
    
    return {
        "message": "知识点创建成功",
        "kp_id": new_kp.kp_id
    }

# 更新知识点
@app.put("/knowledge-points/{kp_id}")
def update_knowledge_point(kp_id: int, kp_update: KnowledgePointUpdate, db: Session = Depends(get_db)):
    # 查找知识点
    kp = db.query(KnowledgePoint).filter(KnowledgePoint.kp_id == kp_id).first()
    if not kp:
        raise HTTPException(status_code=404, detail="知识点不存在")
    
    # 更新字段
    if kp_update.subject is not None:
        kp.subject = kp_update.subject
    if kp_update.point_name is not None:
        kp.point_name = kp_update.point_name
    if kp_update.category is not None:
        kp.category = kp_update.category
    if kp_update.importance is not None:
        kp.importance = kp_update.importance
    if kp_update.difficulty is not None:
        kp.difficulty = kp_update.difficulty
    if kp_update.exam_points is not None:
        kp.exam_points = kp_update.exam_points
    if kp_update.content is not None:
        kp.content = kp_update.content
    if kp_update.show_in_mindmap is not None:
        kp.show_in_mindmap = kp_update.show_in_mindmap
    
    kp.update_time = datetime.now()
    
    db.commit()
    db.refresh(kp)
    
    return {"message": "知识点更新成功"}

# 删除知识点
@app.delete("/knowledge-points/{kp_id}")
def delete_knowledge_point(kp_id: int, db: Session = Depends(get_db)):
    # 查找知识点
    kp = db.query(KnowledgePoint).filter(KnowledgePoint.kp_id == kp_id).first()
    if not kp:
        raise HTTPException(status_code=404, detail="知识点不存在")
    
    db.delete(kp)
    db.commit()
    
    return {"message": "知识点删除成功"}

class BatchUpdateMindmapRequest(BaseModel):
    kp_ids: List[int]
    show_in_mindmap: bool

class KnowledgeRelationRequest(BaseModel):
    source_kp_id: int
    target_kp_id: int
    relation_type: str
    strength: int = 3
    description: Optional[str] = None
    
    @validator('strength')
    def validate_strength(cls, v):
        if not 1 <= v <= 5:
            raise ValueError('strength必须在1到5之间')
        return v
    
    @validator('relation_type')
    def validate_relation_type(cls, v):
        valid_types = ['前置知识', '相关概念', '应用场景', '包含关系', '对比关系']
        if v not in valid_types:
            raise ValueError(f'relation_type必须是以下之一: {", ".join(valid_types)}')
        return v

class CreateIntermediateNodeRequest(BaseModel):
    source_kp_id: int
    target_kp_id: int
    intermediate_node_name: str
    relation_type: str = '相关概念'
    strength: int = 3
    description: Optional[str] = None
    
    @validator('strength')
    def validate_strength(cls, v):
        if not 1 <= v <= 5:
            raise ValueError('strength必须在1到5之间')
        return v
    
    @validator('relation_type')
    def validate_relation_type(cls, v):
        valid_types = ['前置知识', '相关概念', '应用场景', '包含关系', '对比关系']
        if v not in valid_types:
            raise ValueError(f'relation_type必须是以下之一: {", ".join(valid_types)}')
        return v

@app.post("/knowledge-points/batch-update-mindmap")
def batch_update_mindmap(request: BatchUpdateMindmapRequest, db: Session = Depends(get_db)):
    try:
        updated_count = db.query(KnowledgePoint).filter(
            KnowledgePoint.kp_id.in_(request.kp_ids)
        ).update({
            "show_in_mindmap": request.show_in_mindmap,
            "update_time": datetime.now()
        }, synchronize_session=False)
        
        db.commit()
        
        return {
            "message": "批量更新成功",
            "updated_count": updated_count
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"批量更新失败: {str(e)}")

# 获取单个知识点详情
@app.get("/knowledge-points/detail/{kp_id}")
def get_knowledge_point_detail(kp_id: int, db: Session = Depends(get_db)):
    kp = db.query(KnowledgePoint).filter(KnowledgePoint.kp_id == kp_id).first()
    if not kp:
        raise HTTPException(status_code=404, detail="知识点不存在")
    
    return {
        "kp_id": kp.kp_id,
        "id": kp.id,
        "subject": kp.subject,
        "point_name": kp.point_name,
        "category": kp.category,
        "importance": kp.importance,
        "difficulty": kp.difficulty,
        "exam_points": kp.exam_points,
        "content": kp.content,
        "show_in_mindmap": kp.show_in_mindmap,
        "node_type": kp.node_type,
        "create_time": kp.create_time.isoformat() if kp.create_time else None,
        "update_time": kp.update_time.isoformat() if kp.update_time else None
    }

# ==================== 知识点关系管理 API ====================

@app.post("/knowledge-relations")
def create_knowledge_relation(request: KnowledgeRelationRequest, db: Session = Depends(get_db)):
    source_kp = db.query(KnowledgePoint).filter(KnowledgePoint.kp_id == request.source_kp_id).first()
    if not source_kp:
        raise HTTPException(status_code=404, detail="源知识点不存在")
    
    target_kp = db.query(KnowledgePoint).filter(KnowledgePoint.kp_id == request.target_kp_id).first()
    if not target_kp:
        raise HTTPException(status_code=404, detail="目标知识点不存在")
    
    if source_kp.user_id != target_kp.user_id:
        raise HTTPException(status_code=400, detail="两个知识点必须属于同一用户")
    
    existing_relation = db.query(KnowledgeRelation).filter(
        KnowledgeRelation.source_kp_id == request.source_kp_id,
        KnowledgeRelation.target_kp_id == request.target_kp_id
    ).first()
    
    if existing_relation:
        raise HTTPException(status_code=400, detail="关系已存在")
    
    new_relation = KnowledgeRelation(
        user_id=source_kp.user_id,
        source_kp_id=request.source_kp_id,
        target_kp_id=request.target_kp_id,
        relation_type=request.relation_type,
        strength=request.strength,
        description=request.description
    )
    
    db.add(new_relation)
    db.commit()
    db.refresh(new_relation)
    
    return {
        "message": "关系创建成功",
        "relation_id": new_relation.relation_id
    }

@app.get("/knowledge-relations/{user_id}")
def get_knowledge_relations(user_id: int, source_kp_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(KnowledgeRelation).filter(KnowledgeRelation.user_id == user_id)
    
    if source_kp_id:
        query = query.filter(
            (KnowledgeRelation.source_kp_id == source_kp_id) | 
            (KnowledgeRelation.target_kp_id == source_kp_id)
        )
    
    relations = query.all()
    
    return [{
        "relation_id": r.relation_id,
        "user_id": r.user_id,
        "source_kp_id": r.source_kp_id,
        "target_kp_id": r.target_kp_id,
        "relation_type": r.relation_type,
        "strength": r.strength,
        "description": r.description,
        "create_time": r.create_time.isoformat() if r.create_time else None
    } for r in relations]

@app.delete("/knowledge-relations/{relation_id}")
def delete_knowledge_relation(relation_id: int, db: Session = Depends(get_db)):
    relation = db.query(KnowledgeRelation).filter(KnowledgeRelation.relation_id == relation_id).first()
    
    if not relation:
        raise HTTPException(status_code=404, detail="关系不存在")
    
    db.delete(relation)
    db.commit()
    
    return {"message": "关系删除成功"}

@app.post("/knowledge-points/create-intermediate-node")
def create_intermediate_node(request: CreateIntermediateNodeRequest, db: Session = Depends(get_db)):
    source_kp = db.query(KnowledgePoint).filter(KnowledgePoint.kp_id == request.source_kp_id).first()
    if not source_kp:
        raise HTTPException(status_code=404, detail="源知识点不存在")
    
    target_kp = db.query(KnowledgePoint).filter(KnowledgePoint.kp_id == request.target_kp_id).first()
    if not target_kp:
        raise HTTPException(status_code=404, detail="目标知识点不存在")
    
    if source_kp.user_id != target_kp.user_id:
        raise HTTPException(status_code=400, detail="两个知识点必须属于同一用户")
    
    intermediate_kp = KnowledgePoint(
        user_id=source_kp.user_id,
        subject=source_kp.subject,
        point_name=request.intermediate_node_name,
        category=source_kp.category,
        importance='中',
        difficulty='中',
        node_type='intermediate',
        show_in_mindmap=True,
        create_time=datetime.now(),
        update_time=datetime.now()
    )
    
    db.add(intermediate_kp)
    db.commit()
    db.refresh(intermediate_kp)
    
    relation1 = KnowledgeRelation(
        user_id=source_kp.user_id,
        source_kp_id=request.source_kp_id,
        target_kp_id=intermediate_kp.kp_id,
        relation_type=request.relation_type,
        strength=request.strength,
        description=request.description
    )
    
    relation2 = KnowledgeRelation(
        user_id=source_kp.user_id,
        source_kp_id=intermediate_kp.kp_id,
        target_kp_id=request.target_kp_id,
        relation_type=request.relation_type,
        strength=request.strength,
        description=request.description
    )
    
    db.add(relation1)
    db.add(relation2)
    db.commit()
    
    return {
        "message": "中间节点创建成功",
        "intermediate_node_id": intermediate_kp.kp_id,
        "relation1_id": relation1.relation_id,
        "relation2_id": relation2.relation_id
    }

# ==================== 学习统计 API ====================

def get_learning_statistics(user_id: int, db: Session):
    """
    获取用户学习统计数据
    """
    import random
    
    # 1. 计算总学习时长（小时）
    total_duration = db.query(func.sum(LearningRecord.duration)).filter(
        LearningRecord.user_id == user_id
    ).scalar() or 0
    total_duration_hours = round(total_duration / 3600, 2)
    
    # 2. 获取知识点掌握情况
    total_points = db.query(func.count(KnowledgePoint.kp_id)).filter(
        KnowledgePoint.user_id == user_id
    ).scalar() or 0
    
    # 3. 最近7天的学习记录
    from datetime import datetime, timedelta
    week_ago = datetime.now() - timedelta(days=7)
    
    weekly_records = db.query(LearningRecord).filter(
        LearningRecord.user_id == user_id,
        LearningRecord.start_time >= week_ago
    ).order_by(LearningRecord.start_time.desc()).all()
    
    # 4. 按知识点统计学习时长
    point_duration_stats = db.query(
        KnowledgePoint.point_name,
        func.sum(LearningRecord.duration).label('total_duration'),
        func.count(LearningRecord.record_id).label('study_count')
    ).join(
        LearningRecord, KnowledgePoint.kp_id == LearningRecord.kp_id
    ).filter(
        LearningRecord.user_id == user_id
    ).group_by(
        KnowledgePoint.point_name
    ).all()
    
    # 5. 按科目统计学习时长
    subject_duration_stats = db.query(
        KnowledgePoint.subject,
        func.sum(LearningRecord.duration).label('total_duration')
    ).join(
        LearningRecord, KnowledgePoint.kp_id == LearningRecord.kp_id
    ).filter(
        LearningRecord.user_id == user_id
    ).group_by(
        KnowledgePoint.subject
    ).all()
    
    # 生成最近7天的日期列表
    recent_dates = []
    for i in range(7):
        date = (datetime.now() - timedelta(days=6 - i)).date()
        recent_dates.append(date.strftime('%Y-%m-%d'))
    
    # 生成最近7天的每日学习时长（分钟），只返回真实数据
    daily_duration = []
    if weekly_records:
        # 按日期分组计算每日学习时长
        date_duration_map = {}
        for record in weekly_records:
            record_date = record.start_time.date().strftime('%Y-%m-%d')
            if record_date not in date_duration_map:
                date_duration_map[record_date] = 0
            date_duration_map[record_date] += record.duration // 60  # 转换为分钟
        
        # 填充最近7天的数据
        for date in recent_dates:
            daily_duration.append({
                "name": date,
                "value": date_duration_map.get(date, 0)
            })
    
    # 生成知识点掌握情况，只返回真实数据
    knowledge_mastery = []
    if point_duration_stats:
        # 基于学习时长和次数计算掌握率
        for stat in point_duration_stats:
            # 简单的掌握率计算：(学习时长 / 3600) * 10 + (学习次数 * 5)
            # 确保掌握率在0-100之间
            mastery_rate = min(100, round((stat.total_duration / 3600) * 10 + (stat.study_count * 5)))
            knowledge_mastery.append({
                "pointName": stat.point_name,
                "masteryRate": mastery_rate
            })
    
    # 生成学习时间分布热力图数据，基于真实学习记录计算
    time_distribution = []
    if weekly_records:
        # 数据格式：[x, y, value]，x是星期几(0=周一, 6=周日)，y是小时段(0=00:00, 1=03:00...)，value是学习时长
        for record in weekly_records:
            # 计算星期几 (0=周一, 6=周日)
            day_of_week = record.start_time.weekday()
            
            # 计算小时段 (0=00:00, 1=03:00, ..., 7=21:00)
            hour_segment = record.start_time.hour // 3
            
            # 添加到热力图数据中
            time_distribution.append([day_of_week, hour_segment, record.duration // 60])
    
    return {
        "user_id": user_id,
        "total_duration_hours": total_duration_hours,
        "total_knowledge_points": total_points,
        "weekly_study_days": len(set(record.start_time.date() for record in weekly_records)),
        "weekly_total_duration_hours": round(
            sum(record.duration for record in weekly_records) / 3600, 2
        ),
        "point_duration_stats": [
            {
                "point_name": stat.point_name,
                "total_duration_hours": round(stat.total_duration / 3600, 2),
                "study_count": stat.study_count
            }
            for stat in point_duration_stats
        ],
        "subject_duration_stats": [
            {
                "subject": stat.subject,
                "total_duration_hours": round(stat.total_duration / 3600, 2)
            }
            for stat in subject_duration_stats
        ],
        "daily_duration": daily_duration,
        "knowledge_mastery": knowledge_mastery,
        "time_distribution": time_distribution
    }

# ==================== AI 服务 API ====================

class AIRequest(BaseModel):
    subject: str
    point_name: str
    category: str
    difficulty: str = "中"
    importance: str = "中"
    referenceFiles: bool = False  # 是否参考关联文件
    kp_id: Optional[int] = None  # 知识点ID（用于查询关联文件）

class AIQnARequest(BaseModel):
    question: str
    user_id: int  # 用户ID，用于获取知识点信息
    context: Optional[str] = None  # 可选的上下文信息

class LearningAnalysisRequest(BaseModel):
    user_id: int  # 用户ID，用于获取学习数据
    include_profile: bool = False  # 是否包含用户个人信息

class PostSummaryRequest(BaseModel):
    post_title: str
    post_content: str
    post_category: str
    username: str

class ExerciseGenerationRequest(BaseModel):
    user_id: int
    kp_id: int
    question_type: str
    question_count: int = 3
    difficulty: str = "中等"
    custom_kp_name: str = ""

@app.post("/ai/generate-content")
def generate_knowledge_content(request: AIRequest, db: Session = Depends(get_db)):
    """
    使用阿里云百炼平台生成知识点详细内容
    根据重要度和难度动态调整内容详细程度
    支持参考关联文件内容
    """
    try:
        # 导入文件读取工具
        from utils.file_reader import read_multiple_files, format_file_content_for_ai
        
        # 查询关联文件（如果需要）
        file_content_text = ""
        referenced_files = []
        
        if request.referenceFiles and request.kp_id:
            # 查询该知识点关联的文件
            knowledge_files = db.query(KnowledgeFile).filter(
                KnowledgeFile.kp_id == request.kp_id
            ).all()
            
            if knowledge_files:
                # 获取文件信息
                file_info_list = []
                for kf in knowledge_files:
                    file_ref = db.query(FileReference).filter(
                        FileReference.file_id == kf.file_id
                    ).first()
                    if file_ref:
                        file_info_list.append({
                            'file_path': file_ref.file_path,
                            'file_type': file_ref.file_type,
                            'file_name': file_ref.file_name
                        })
                        referenced_files.append(file_ref.file_name)
                
                # 读取文件内容
                file_contents = read_multiple_files(file_info_list)
                
                # 格式化文件内容
                if file_contents:
                    file_content_text = format_file_content_for_ai(file_contents)
        
        # 根据重要度和难度确定内容详细程度
        importance_level = {
            '低': 1,
            '中': 2,
            '高': 3,
            '必考': 4
        }.get(request.importance, 2)
        
        difficulty_level = {
            '易': 1,
            '较易': 2,
            '中': 3,
            '较难': 4,
            '难': 5
        }.get(request.difficulty, 3)
        
        # 计算综合详细程度（1-8级）
        detail_level = importance_level + difficulty_level
        
        # 根据详细程度生成不同的提示词
        if detail_level <= 3:
            # 低重要度+低难度：简洁明了
            word_count = "150-250"
            content_requirements = """1. 知识点概述（简要介绍）
2. 核心概念和定义"""
            
        elif detail_level <= 5:
            # 中等重要度+中等难度：标准详细
            word_count = "300-500"
            content_requirements = """1. 知识点概述（简要介绍）
2. 核心概念和定义
3. 重要知识点详解
4. 常见考点和题型"""
            
        elif detail_level <= 7:
            # 高重要度+高难度：详细深入
            word_count = "500-800"
            content_requirements = """1. 知识点概述（简要介绍）
2. 核心概念和定义
3. 重要知识点详解（包含多个子知识点）
4. 常见考点和题型分析
5. 典型例题解析（2-3个）
6. 易错点和注意事项"""
            
        else:
            # 必考+最难：超详细全面
            word_count = "800-1000"
            content_requirements = """1. 知识点概述（简要介绍）
2. 核心概念和定义
3. 重要知识点详解（详细展开每个子知识点）
4. 常见考点和题型分析
5. 典型例题解析（3-5个）
6. 易错点和注意事项
7. 相关知识点关联
8. 高频考点总结"""

        # 构建提示词
        if file_content_text:
            # 有参考文件时的提示词
            prompt = f"""请根据以下关联资料，为考研知识点生成内容。

科目：{request.subject}
知识点名称：{request.point_name}

【关联资料】
{file_content_text}

**请严格按照以下格式回答（不要改变格式）：**

**关联资料里对于该考点的描述为：**

[直接使用资料中的原句，不要改写]

+AI补充内容：

[用简洁的语言补充解释、举例或扩展]

**要求：**
1. 必须以"**关联资料里对于该考点的描述为：**"开头
2. 原句部分必须直接使用资料原句，不要改写
3. 补充部分必须以"+AI补充内容："开头
4. 补充内容要简洁，不要超过原句长度
5. 只输出这两部分，不要添加其他内容"""
            
            # 有参考文件时，使用更严格的system消息
            system_message = "你是一个严格按照指定格式输出的助手。用户会给你一个格式模板，你必须完全按照模板的格式输出，不要添加任何其他内容，不要改变格式结构。"
        else:
            # 无参考文件时的提示词
            prompt = f"""请为以下考研知识点生成详细的学习内容：

科目：{request.subject}
知识点名称：{request.point_name}
分类：{request.category}
难度：{request.difficulty}
重要度：{request.importance}

请生成以下内容：
{content_requirements}

要求：
- 内容要准确、详细、易于理解
- 适合考研复习使用
- 突出重点和难点
- 字数在{word_count}字之间
- 使用markdown格式输出
- 根据重要度和难度调整讲解深度
"""
            
            # 无参考文件时，使用原来的system消息
            system_message = '你是一个专业的考研辅导老师，擅长为考研学生提供详细的知识点讲解。'
        
        response = Generation.call(
            model='qwen-max',
            messages=[
                {'role': 'system', 'content': system_message},
                {'role': 'user', 'content': prompt}
            ],
            result_format='message'
        )

        # 检查响应状态
        if response.status_code == 200:
            generated_content = response.output.choices[0].message['content']
            return {
                "success": True,
                "content": generated_content,
                "referenced_files": referenced_files if referenced_files else None
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"AI生成失败: {response.message}"
            )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI服务调用失败: {str(e)}"
        )

@app.post("/ai/generate-exercises")
def generate_exercises(request: ExerciseGenerationRequest, db: Session = Depends(get_db)):
    """
    使用阿里云百炼平台生成习题
    根据知识点、题目类型和难度生成相应题目
    """
    try:
        # 如果 kp_id > 0，查询知识点信息；否则直接生成习题
        knowledge_point = None
        if request.kp_id is not None and request.kp_id > 0:
            knowledge_point = db.query(KnowledgePoint).filter(
                KnowledgePoint.kp_id == request.kp_id,
                KnowledgePoint.user_id == request.user_id
            ).first()
            
            if not knowledge_point:
                raise HTTPException(status_code=404, detail="知识点不存在或无权限访问")
        
        # 去重检查：检查是否已存在相同知识点、题目类型和难度的题目
        # 只有当请求的题目数量小于等于已存在的题目数量时，才返回缓存
        existing_exercises = []
        if request.kp_id is not None and request.kp_id > 0:
            existing_exercises = db.query(Exercise).filter(
                Exercise.user_id == request.user_id,
                Exercise.kp_id == request.kp_id,
                Exercise.question_type == request.question_type,
                Exercise.difficulty == request.difficulty
            ).all()
        elif request.custom_kp_name:
            # 自定义知识点，检查题目内容是否相似
            existing_exercises = db.query(Exercise).filter(
                Exercise.user_id == request.user_id,
                Exercise.question_type == request.question_type,
                Exercise.difficulty == request.difficulty
            ).all()
        
        # 如果存在足够数量的缓存题目，直接返回
        if existing_exercises and len(existing_exercises) >= request.question_count:
            return {
                "success": True,
                "exercises": [
                    {
                        "id": i + 1,
                        "type": ex.question_type,
                        "knowledge": ex.knowledge_point.point_name if ex.knowledge_point else request.custom_kp_name,
                        "difficulty": ex.difficulty,
                        "question": ex.question,
                        "options": ex.options,
                        "answer": ex.answer,
                        "analysis": ex.analysis
                    }
                    for i, ex in enumerate(existing_exercises[:request.question_count])
                ],
                "total_count": len(existing_exercises),
                "from_cache": True,
                "message": f"已存在 {len(existing_exercises)} 道相同条件的题目，直接返回"
            }
        
        difficulty_map = {
            "简单": "易",
            "中等": "中",
            "困难": "难"
        }
        
        actual_difficulty = difficulty_map.get(request.difficulty, "中")
        
        question_type_prompts = {
            "选择题": """请生成一道选择题，格式如下：
题目：[题目内容]

选项：
A. [选项A]
B. [选项B]
C. [选项C]
D. [选项D]

参考答案：[正确答案，如 A]

解析：[详细解析]""",
            
            "填空题": """请生成一道填空题，格式如下：
题目：[题目内容，留有下划线填空位置]

参考答案：[完整答案]

解析：[详细解析]""",
            
            "简答题": """请生成一道简答题，格式如下：
题目：[题目内容]

参考答案：[完整答案，包含要点]

解析：[详细解析和评分要点]"""
        }
        
        question_type_prompt = question_type_prompts.get(request.question_type, question_type_prompts["选择题"])
        
        # 如果有知识点信息，使用知识点生成提示；否则直接使用题目类型
        if knowledge_point:
            prompt = f"""请为以下考研知识点生成{request.question_count}道{request.question_type}。

科目：{knowledge_point.subject}
知识点名称：{knowledge_point.point_name}
知识点分类：{knowledge_point.category}
难度等级：{actual_difficulty}
重要度：{knowledge_point.importance}

请严格按照以下格式生成每道题目：

{question_type_prompt}

要求：
1. 题目必须围绕该知识点
2. 难度符合要求
3. 题目和答案必须准确、专业
4. 解析要详细、易于理解
5. 生成{request.question_count}道题目，每道题目之间用分隔线隔开
"""
        elif request.custom_kp_name:
            prompt = f"""请为以下考研知识点生成{request.question_count}道{request.question_type}。

知识点名称：{request.custom_kp_name}
难度等级：{actual_difficulty}

请严格按照以下格式生成每道题目：

{question_type_prompt}

要求：
1. 题目必须围绕该知识点
2. 难度符合要求
3. 题目和答案必须准确、专业
4. 解析要详细、易于理解
5. 生成{request.question_count}道题目，每道题目之间用分隔线隔开
"""
        else:
            prompt = f"""请生成{request.question_count}道{request.question_type}。

难度等级：{actual_difficulty}

请严格按照以下格式生成每道题目：

{question_type_prompt}

要求：
1. 题目内容要准确、专业
2. 难度符合要求
3. 题目和答案必须准确、专业
4. 解析要详细、易于理解
5. 生成{request.question_count}道题目，每道题目之间用分隔线隔开
"""
        
        response = Generation.call(
            model='qwen-max',
            messages=[
                {'role': 'system', 'content': '你是一个专业的考研辅导老师，擅长为考研学生生成高质量的练习题。'},
                {'role': 'user', 'content': prompt}
            ],
            result_format='message'
        )
        
        if response.status_code == 200:
            generated_content = response.output.choices[0].message['content']
            
            exercises = []
            raw_questions = generated_content.split('---')
            
            for i, q_text in enumerate(raw_questions[:request.question_count], 1):
                exercise = {
                    "id": i,
                    "type": request.question_type,
                    "knowledge": knowledge_point.point_name if knowledge_point else "自定义知识点",
                    "difficulty": request.difficulty,
                    "question": "",
                    "options": None,
                    "answer": "",
                    "analysis": ""
                }
                
                if request.question_type == "选择题":
                    lines = q_text.strip().split('\n')
                    current_section = "question"
                    options = []
                    
                    for line in lines:
                        line = line.strip()
                        if line.startswith('题目：'):
                            exercise["question"] = line.replace('题目：', '').strip()
                            current_section = "question"
                        elif line.startswith('A.') or line.startswith('B.') or line.startswith('C.') or line.startswith('D.'):
                            options.append(line)
                            current_section = "options"
                        elif line.startswith('参考答案：'):
                            exercise["answer"] = line.replace('参考答案：', '').strip()
                            current_section = "answer"
                        elif line.startswith('解析：'):
                            exercise["analysis"] = line.replace('解析：', '').strip()
                            current_section = "analysis"
                        elif current_section == "question" and not line.startswith('题目：'):
                            exercise["question"] += '\n' + line
                        elif current_section == "options":
                            if not line.startswith(('A.', 'B.', 'C.', 'D.', '参考答案：', '解析：')):
                                options[-1] += ' ' + line if options else line
                    
                    exercise["options"] = options if options else None
                    
                elif request.question_type == "填空题":
                    lines = q_text.strip().split('\n')
                    for line in lines:
                        line = line.strip()
                        if line.startswith('题目：'):
                            exercise["question"] = line.replace('题目：', '').strip()
                        elif line.startswith('参考答案：'):
                            exercise["answer"] = line.replace('参考答案：', '').strip()
                        elif line.startswith('解析：'):
                            exercise["analysis"] = line.replace('解析：', '').strip()
                            
                elif request.question_type == "简答题":
                    lines = q_text.strip().split('\n')
                    for line in lines:
                        line = line.strip()
                        if line.startswith('题目：'):
                            exercise["question"] = line.replace('题目：', '').strip()
                        elif line.startswith('参考答案：'):
                            exercise["answer"] = line.replace('参考答案：', '').strip()
                        elif line.startswith('解析：'):
                            exercise["analysis"] = line.replace('解析：', '').strip()
                
                exercises.append(exercise)
            
            return {
                "success": True,
                "exercises": exercises,
                "total_count": len(exercises)
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"AI生成习题失败: {response.message}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI服务调用失败: {str(e)}"
        )

@app.post("/exercises")
def save_exercises(
    user_id: int = Body(...),
    kp_id: int = Body(...),
    exercises: List[dict] = Body(...),
    db: Session = Depends(get_db)
):
    """
    保存生成的习题到数据库
    """
    try:
        # 如果 kp_id > 0，验证知识点是否存在
        if kp_id is not None and kp_id > 0:
            knowledge_point = db.query(KnowledgePoint).filter(
                KnowledgePoint.kp_id == kp_id,
                KnowledgePoint.user_id == user_id
            ).first()
            
            if not knowledge_point:
                raise HTTPException(status_code=404, detail="知识点不存在或无权限访问")
        
        saved_count = 0
        for exercise_data in exercises:
            exercise = Exercise(
                user_id=user_id,
                kp_id=kp_id if kp_id > 0 else None,  # -1 转换为 None
                question_type=exercise_data.get('type', '选择题'),
                question=exercise_data.get('question', ''),
                options=exercise_data.get('options'),
                answer=exercise_data.get('answer', ''),
                analysis=exercise_data.get('analysis', ''),
                difficulty=exercise_data.get('difficulty', '中等'),
                create_time=datetime.now()
            )
            db.add(exercise)
            saved_count += 1
        
        db.commit()
        
        return {
            "success": True,
            "saved_count": saved_count,
            "message": f"成功保存 {saved_count} 道习题"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"保存习题失败: {str(e)}"
        )

@app.post("/exercises/submit-answer")
def submit_exercise_answer(
    user_id: int = Body(...),
    exercise_id: int = Body(...),
    user_answer: str = Body(...),
    is_correct: Optional[int] = Body(default=None),
    question_type: Optional[str] = Body(default=None),
    question: Optional[str] = Body(default=None),
    db: Session = Depends(get_db)
):
    """
    提交用户答案并记录是否正确
    支持通过exercise_id或题目内容查找习题
    """
    try:
        exercise = None
        
        # 优先通过exercise_id查找
        if exercise_id > 0:
            exercise = db.query(Exercise).filter(
                Exercise.exercise_id == exercise_id,
                Exercise.user_id == user_id
            ).first()
        
        # 如果通过exercise_id找不到，尝试通过题目内容查找
        if not exercise and question and question_type:
            exercise = db.query(Exercise).filter(
                Exercise.user_id == user_id,
                Exercise.question_type == question_type,
                Exercise.question == question
            ).first()
        
        if not exercise:
            raise HTTPException(status_code=404, detail="习题不存在或无权限访问")
        
        # 如果前端传了 is_correct，使用前端的；否则自动判断
        if is_correct is not None:
            exercise.user_answer = user_answer
            exercise.is_correct = is_correct
        else:
            is_correct = 1 if user_answer == exercise.answer else 0
            exercise.user_answer = user_answer
            exercise.is_correct = is_correct
        
        db.commit()
        
        return {
            "success": True,
            "is_correct": is_correct,
            "message": "答案已提交" if is_correct == 1 else "答案错误"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"提交答案失败: {str(e)}"
        )

@app.get("/exercises/{user_id}")
def get_user_exercises(
    user_id: int,
    kp_id: Optional[int] = None,
    page: int = 1,
    page_size: int = 5,
    db: Session = Depends(get_db)
):
    """
    获取用户保存的习题（分页）
    """
    try:
        query = db.query(Exercise).filter(Exercise.user_id == user_id)
        
        if kp_id:
            query = query.filter(Exercise.kp_id == kp_id)
        
        total = query.count()
        exercises = query.order_by(Exercise.create_time.desc()) \
            .offset((page - 1) * page_size) \
            .limit(page_size) \
            .all()
        
        return {
            "success": True,
            "exercises": [
                {
                    "exercise_id": e.exercise_id,
                    "user_id": e.user_id,
                    "kp_id": e.kp_id,
                    "question_type": e.question_type,
                    "question": e.question,
                    "options": e.options,
                    "answer": e.answer,
                    "analysis": e.analysis,
                    "difficulty": e.difficulty,
                    "create_time": e.create_time.isoformat(),
                    "user_answer": e.user_answer,
                    "is_correct": e.is_correct
                }
                for e in exercises
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": math.ceil(total / page_size)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取习题失败: {str(e)}"
        )

@app.delete("/exercises/{exercise_id}")
def delete_exercise(
    exercise_id: int,
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    删除指定习题
    """
    try:
        exercise = db.query(Exercise).filter(
            Exercise.exercise_id == exercise_id,
            Exercise.user_id == user_id
        ).first()
        
        if not exercise:
            raise HTTPException(status_code=404, detail="习题不存在或无权限访问")
        
        db.delete(exercise)
        db.commit()
        
        return {
            "success": True,
            "message": "习题已删除"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"删除习题失败: {str(e)}"
        )

@app.post("/ai/ask-question")
def ask_question(request: AIQnARequest, db: Session = Depends(get_db)):
    """
    使用阿里云百炼平台回答用户问题
    支持可选的上下文信息
    自动获取用户的知识点信息作为额外上下文
    """
    try:
        # 配置应用ID
        APP_ID = "07d3b6761a554325a831d883691f2550"
        
        # 构建完整上下文信息
        full_context = ""
        
        # 1. 获取用户的知识点信息
        knowledge_points = db.query(KnowledgePoint).filter(KnowledgePoint.user_id == request.user_id).all()
        if knowledge_points:
            # 格式化知识点信息
            knowledge_points_text = "【用户的知识点信息】\n"
            knowledge_points_text += "以下是用户正在学习的考研知识点：\n\n"
            for kp in knowledge_points:
                knowledge_points_text += f"- 科目：{kp.subject}\n"
                knowledge_points_text += f"  知识点：{kp.point_name}\n"
                knowledge_points_text += f"  分类：{kp.category}\n"
                knowledge_points_text += f"  重要度：{kp.importance}\n"
                knowledge_points_text += f"  难度：{kp.difficulty}\n"
                if kp.content:
                    content_summary = kp.content[:100] + "..." if len(kp.content) > 100 else kp.content
                    knowledge_points_text += f"  内容摘要：{content_summary}\n"
                knowledge_points_text += "\n"
            full_context += knowledge_points_text
        
        # 2. 添加用户提供的上下文
        if request.context:
            full_context += "【用户提供的上下文】\n"
            full_context += f"{request.context}\n\n"
        
        # 构建消息列表
        messages = []
        
        if full_context:
            # 有上下文时，添加上下文和问题
            messages.append({'role': 'user', 'content': f"{full_context}问题：{request.question}"})
        else:
            # 无上下文时，直接添加问题
            messages.append({'role': 'user', 'content': request.question})
        
        # 使用Application.call方法调用智能体应用
        response = Application.call(
            app_id=APP_ID,
            messages=messages,
            result_format='message'
        )

        # 检查响应状态
        if response.status_code == 200:
            # Application.call()方法的响应格式与Generation.call()不同
            # output中直接包含text属性，而不是通过choices[0].message['content']获取
            answer = response.output.get('text', '')
            return {
                "success": True,
                "answer": answer
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"AI问答失败: {response.message}"
            )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI服务调用失败: {str(e)}"
        )

@app.post("/ai/analyze-learning")
def analyze_learning_situation(request: LearningAnalysisRequest, db: Session = Depends(get_db)):
    """
    使用阿里云百炼平台的学情分析应用分析用户学习情况
    """
    try:
        # 配置学情分析专用的应用ID
        LEARNING_ANALYSIS_APP_ID = "996dee30e9cf4bb78c1a9323b7d68e23"
        
        # 1. 获取用户学习统计数据
        learning_stats = get_learning_statistics(request.user_id, db)
        
        # 2. 获取用户的知识点列表
        knowledge_points = db.query(KnowledgePoint).filter(
            KnowledgePoint.user_id == request.user_id
        ).all()
        
        # 3. 获取用户个人信息
        user_profile = None
        try:
            from models.user_profile import UserProfile
            user_profile = db.query(UserProfile).filter(UserProfile.user_id == request.user_id).first()
        except Exception as e:
            print(f"获取用户个人信息失败: {str(e)}")
        
        # 4. 格式化学习数据为自然语言描述
        data_prompt = "【用户学习数据分析请求】\n\n"
        
        # 4.1 添加用户个人信息（如果存在）
        if user_profile:
            data_prompt += f"1. 用户个人信息\n"
            data_prompt += f"   - 用户名: {user_profile.username}\n"
            if user_profile.grade:
                data_prompt += f"   - 年级: {user_profile.grade}\n"
            if user_profile.postgraduate_session:
                data_prompt += f"   - 考研届数: {user_profile.postgraduate_session}\n"
            if user_profile.school:
                data_prompt += f"   - 就读学校: {user_profile.school}\n"
            if user_profile.major:
                data_prompt += f"   - 就读专业: {user_profile.major}\n"
            if user_profile.target_school:
                data_prompt += f"   - 预期考研学校: {user_profile.target_school}\n"
            if user_profile.target_major:
                data_prompt += f"   - 预期考研专业: {user_profile.target_major}\n"
            if user_profile.target_score:
                data_prompt += f"   - 预期考研分数: {user_profile.target_score}\n"
            data_prompt += "\n"
        
        # 4.2 添加学习统计数据
        data_prompt += f"2. 基本学习统计\n"
        data_prompt += f"   - 用户ID: {learning_stats['user_id']}\n"
        data_prompt += f"   - 总学习时长: {learning_stats['total_duration_hours']}小时\n"
        data_prompt += f"   - 学习知识点总数: {learning_stats['total_knowledge_points']}个\n"
        data_prompt += f"   - 最近7天学习天数: {learning_stats['weekly_study_days']}天\n"
        data_prompt += f"   - 最近7天总学习时长: {learning_stats['weekly_total_duration_hours']}小时\n\n"
        
        data_prompt += f"3. 各知识点学习时长统计\n"
        if learning_stats['point_duration_stats']:
            for stat in learning_stats['point_duration_stats'][:10]:  # 只显示前10个
                data_prompt += f"   - {stat['point_name']}: {stat['total_duration_hours']}小时 ({stat['study_count']}次学习)\n"
        else:
            data_prompt += f"   - 暂无知识点学习记录\n"
        data_prompt += "\n"
        
        data_prompt += f"4. 各科目学习时长统计\n"
        if learning_stats['subject_duration_stats']:
            for stat in learning_stats['subject_duration_stats']:
                data_prompt += f"   - {stat['subject']}: {stat['total_duration_hours']}小时\n"
        else:
            data_prompt += f"   - 暂无科目学习记录\n"
        data_prompt += "\n"
        
        data_prompt += f"5. 用户的知识点列表\n"
        if knowledge_points:
            for kp in knowledge_points[:10]:  # 只显示前10个
                data_prompt += f"   - 科目: {kp.subject}, 知识点: {kp.point_name}, 重要度: {kp.importance}, 难度: {kp.difficulty}\n"
        else:
            data_prompt += f"   - 暂无知识点记录\n"
        data_prompt += "\n"
        
        data_prompt += "请基于以上数据，为用户提供详细的学情分析报告，包括：\n"
        data_prompt += "1. 学习情况总结\n"
        data_prompt += "2. 学习优势和不足\n"
        data_prompt += "3. 针对性的学习建议\n"
        data_prompt += "4. 学习计划优化建议\n"
        
        # 4. 使用学情分析专用应用调用Qwen模型
        messages = [
            {
                "role": "system", 
                "content": "你是一位专业的学习分析师，擅长根据学习数据提供个性化的学习建议。请基于以下用户的学习数据，提供详细的学情分析报告和改进建议。报告要结构清晰、语言通俗易懂，并且具有可操作性。"
            },
            {
                "role": "user", 
                "content": data_prompt
            }
        ]
        
        response = Application.call(
            app_id=LEARNING_ANALYSIS_APP_ID,
            messages=messages,
            result_format='message'
        )
        
        # 5. 处理响应
        if response.status_code == 200:
            analysis_result = response.output.get('text', '')
            return {
                "success": True,
                "analysis": analysis_result,
                "learning_stats": learning_stats
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"AI学情分析失败: {response.message}"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"学情分析服务调用失败: {str(e)}"
        )

@app.post("/ai/summarize-post")
def summarize_post(request: PostSummaryRequest):
    """
    使用阿里云百炼平台总结帖子内容
    """
    try:
        # 配置应用ID
        APP_ID = "05d3f4274844471ba881077dbea897eb"
        
        # 构建提示词
        prompt = f"""请为以下学习社区帖子生成一个简洁的总结：

【帖子信息】
- 标题：{request.post_title}
- 分类：{request.post_category}
- 作者：{request.username}
- 内容：{request.post_content}

【要求】
1. 总结帖子的主要内容和观点
2. 提取帖子的关键信息
3. 总结要简洁明了，不超过200字
4. 使用清晰的段落结构
5. 突出帖子的学习价值或实用性

请直接输出总结内容，不要包含其他说明。"""

        # 构建消息列表
        messages = [
            {
                'role': 'system', 
                'content': '你是一个专业的学习助手，擅长总结学习社区中的帖子内容，能够准确提取关键信息并生成简洁明了的总结。'
            },
            {
                'role': 'user', 
                'content': prompt
            }
        ]
        
        # 使用Application.call方法调用智能体应用
        response = Application.call(
            app_id=APP_ID,
            messages=messages,
            result_format='message'
        )

        # 检查响应状态
        if response.status_code == 200:
            # 获取AI生成的总结
            summary = response.output.get('text', '')
            return {
                "success": True,
                "summary": summary
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"AI总结失败: {response.message}"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI总结服务调用失败: {str(e)}"
        )

@app.get("/exam-countdown/{user_id}")
def get_exam_countdown(user_id: int, db: Session = Depends(get_db)):
    """
    根据用户的考研届数计算考研倒计时
    """
    try:
        # 获取用户资料
        profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        if not profile:
            raise HTTPException(status_code=404, detail="用户资料不存在")
        
        if not profile.postgraduate_session:
            return {
                "success": False,
                "message": "未设置考研届数",
                "exam_date": None,
                "countdown": None
            }
        
        # 解析考研届数（如2026届）
        session_year = int(profile.postgraduate_session.replace("届", ""))
        
        # 计算考研日期（通常在每年12月的最后一个周末）
        # 2026届考研在2025年12月
        exam_year = session_year - 1
        
        # 找到12月的最后一个周六
        from datetime import datetime, timedelta
        december_1 = datetime(exam_year, 12, 1)
        
        # 找到12月的最后一个周六
        last_day = datetime(exam_year, 12, 31)
        days_to_subtract = (last_day.weekday() - 5) % 7  # 5是周六
        exam_date = last_day - timedelta(days=days_to_subtract)
        
        # 计算倒计时
        now = datetime.now()
        diff = exam_date - now
        
        if diff.total_seconds() <= 0:
            return {
                "success": True,
                "message": "考研已结束",
                "exam_date": exam_date.strftime("%Y-%m-%d"),
                "countdown": {
                    "days": 0,
                    "hours": 0,
                    "minutes": 0,
                    "seconds": 0
                }
            }
        
        days = diff.days
        hours = diff.seconds // 3600
        minutes = (diff.seconds % 3600) // 60
        seconds = diff.seconds % 60
        
        return {
            "success": True,
            "message": "计算成功",
            "exam_date": exam_date.strftime("%Y-%m-%d"),
            "countdown": {
                "days": days,
                "hours": hours,
                "minutes": minutes,
                "seconds": seconds
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取考研倒计时失败: {str(e)}"
        )

# ==================== 文件管理 API ====================

# 配置文件上传目录
FILE_UPLOAD_DIR = "uploads/reference_files"
os.makedirs(FILE_UPLOAD_DIR, exist_ok=True)

@app.post("/upload-file")
async def upload_file(
    user_id: int = Form(...),
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    上传参考文件
    支持的文件类型：pdf, docx, txt, md
    """
    # 验证用户存在
    user = db.query(UserLogin).filter(UserLogin.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    # 验证文件类型
    allowed_extensions = {'.pdf', '.docx', '.txt', '.md'}
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型。支持的类型：{', '.join(allowed_extensions)}"
        )
    
    # 生成唯一文件名
    filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(FILE_UPLOAD_DIR, filename)
    
    # 保存文件
    try:
        with open(file_path, "wb") as f:
            f.write(await file.read())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件保存失败: {str(e)}")
    
    # 获取文件大小
    file_size = os.path.getsize(file_path)
    
    # 创建文件记录
    new_file = FileReference(
        id=user_id,
        file_name=file.filename,
        file_path=file_path,
        file_type=file_ext[1:],  # 去掉点号
        file_size=file_size,
        description=description
    )
    
    db.add(new_file)
    db.commit()
    db.refresh(new_file)
    
    return {
        "message": "文件上传成功",
        "file_id": new_file.file_id,
        "file_name": new_file.file_name,
        "file_type": new_file.file_type,
        "file_size": new_file.file_size,
        "upload_time": new_file.upload_time.isoformat()
    }

@app.get("/files/{user_id}")
def get_user_files(user_id: int, db: Session = Depends(get_db)):
    """
    获取用户上传的所有文件
    """
    # 验证用户存在
    user = db.query(UserLogin).filter(UserLogin.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    files = db.query(FileReference).filter(FileReference.user_id == user_id).all()
    
    return [
        {
            "file_id": f.file_id,
            "file_name": f.file_name,
            "file_type": f.file_type,
            "file_size": f.file_size,
            "upload_time": f.upload_time.isoformat(),
            "description": f.description
        }
        for f in files
    ]

@app.post("/knowledge-points/{kp_id}/files")
def attach_file_to_knowledge_point(
    kp_id: int,
    file_id: int = Form(...),
    reference_note: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    为知识点关联参考文件
    """
    # 验证知识点存在
    kp = db.query(KnowledgePoint).filter(KnowledgePoint.kp_id == kp_id).first()
    if not kp:
        raise HTTPException(status_code=404, detail="知识点不存在")
    
    # 验证文件存在
    file_ref = db.query(FileReference).filter(FileReference.file_id == file_id).first()
    if not file_ref:
        raise HTTPException(status_code=404, detail="文件不存在")
    
    # 检查是否已经关联
    existing = db.query(KnowledgeFile).filter(
        KnowledgeFile.kp_id == kp_id,
        KnowledgeFile.file_id == file_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="该文件已关联到此知识点")
    
    # 创建关联
    new_kf = KnowledgeFile(
        kp_id=kp_id,
        file_id=file_id,
        reference_note=reference_note
    )
    
    db.add(new_kf)
    db.commit()
    db.refresh(new_kf)
    
    return {
        "message": "文件关联成功",
        "kf_id": new_kf.kf_id
    }

@app.get("/knowledge-points/{kp_id}/files")
def get_knowledge_point_files(kp_id: int, db: Session = Depends(get_db)):
    """
    获取知识点关联的所有文件
    """
    # 验证知识点存在
    kp = db.query(KnowledgePoint).filter(KnowledgePoint.kp_id == kp_id).first()
    if not kp:
        raise HTTPException(status_code=404, detail="知识点不存在")
    
    # 获取关联的文件
    knowledge_files = db.query(KnowledgeFile).filter(
        KnowledgeFile.kp_id == kp_id
    ).all()
    
    return [
        {
            "kf_id": kf.kf_id,
            "file_id": kf.file_id,
            "file_name": kf.file.file_name,
            "file_type": kf.file.file_type,
            "file_size": kf.file.file_size,
            "upload_time": kf.file.upload_time.isoformat(),
            "reference_note": kf.reference_note,
            "create_time": kf.create_time.isoformat()
        }
        for kf in knowledge_files
    ]

@app.delete("/knowledge-points/{kp_id}/files/{file_id}")
def detach_file_from_knowledge_point(kp_id: int, file_id: int, db: Session = Depends(get_db)):
    """
    取消知识点与文件的关联
    """
    # 验证知识点存在
    kp = db.query(KnowledgePoint).filter(KnowledgePoint.kp_id == kp_id).first()
    if not kp:
        raise HTTPException(status_code=404, detail="知识点不存在")
    
    # 查找关联
    kf = db.query(KnowledgeFile).filter(
        KnowledgeFile.kp_id == kp_id,
        KnowledgeFile.file_id == file_id
    ).first()
    if not kf:
        raise HTTPException(status_code=404, detail="关联不存在")
    
    db.delete(kf)
    db.commit()
    
    return {"message": "文件关联已取消"}

@app.delete("/files/{file_id}")
def delete_file(file_id: int, db: Session = Depends(get_db)):
    """
    删除文件（同时取消所有关联）
    """
    # 验证文件存在
    file_ref = db.query(FileReference).filter(FileReference.file_id == file_id).first()
    if not file_ref:
        raise HTTPException(status_code=404, detail="文件不存在")
    
    # 删除物理文件
    try:
        if os.path.exists(file_ref.file_path):
            os.remove(file_ref.file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件删除失败: {str(e)}")
    
    # 删除数据库记录（级联删除关联）
    db.delete(file_ref)
    db.commit()
    
    return {"message": "文件删除成功"}

# ==================== 学习记录 API ====================

# 重新定义学习记录创建请求模型
class CreateLearningRecordRequest(BaseModel):
    user_id: int
    action_type: str
    duration: int
    kp_id: Optional[int] = None
    score: Optional[float] = None
    result: Optional[str] = None
    notes: Optional[str] = None


@app.post("/learning-records")
def create_learning_record(request: CreateLearningRecordRequest, db: Session = Depends(get_db)):
    """
    创建学习记录
    """
    try:
        from datetime import datetime, timedelta
        
        # 创建学习记录对象
        new_record = LearningRecord(
            user_id=request.user_id,
            kp_id=request.kp_id,
            action_type=request.action_type,
            start_time=datetime.now(),
            end_time=datetime.now() + timedelta(seconds=request.duration),
            duration=request.duration,
            score=request.score,
            result=request.result,
            notes=request.notes
        )

        # 保存到数据库
        db.add(new_record)
        db.commit()
        db.refresh(new_record)
        
        return {
            "message": "学习记录创建成功",
            "record_id": new_record.record_id,
            "created_at": new_record.start_time.isoformat()
        }
    except Exception as e:
        # 确保数据库会话被正确关闭
        db.rollback()
        raise HTTPException(status_code=500, detail=f"创建学习记录失败: {str(e)}")


@app.get("/learning-records/{user_id}")
def get_user_learning_records(user_id: int, db: Session = Depends(get_db)):
    """
    获取用户的学习记录
    """
    try:
        # 查询用户的所有学习记录，按时间倒序排序
        records = db.query(LearningRecord).filter(
            LearningRecord.user_id == user_id
        ).order_by(LearningRecord.start_time.desc()).all()
        
        # 格式化返回数据
        return [{
            "record_id": record.record_id,
            "user_id": record.user_id,
            "kp_id": record.kp_id,
            "action_type": record.action_type,
            "start_time": record.start_time.isoformat(),
            "end_time": record.end_time.isoformat(),
            "duration": record.duration,
            "score": record.score,
            "result": record.result,
            "notes": record.notes
        } for record in records]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取学习记录失败: {str(e)}")


# ==================== 社区 API ====================

from typing import List, Optional
from fastapi import Form, UploadFile, File
import os
import uuid

@app.post("/community/posts")
async def create_post(
    user_id: int = Form(...),
    title: str = Form(...),
    content: str = Form(...),
    category: str = Form(...),
    files: List[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """
    发布新帖子
    支持上传图片文件
    """
    try:
        print(f"收到发布帖子请求: user_id={user_id}, title={title}, category={category}")
        print(f"收到文件数量: {len(files) if files else 0}")
        
        # 验证用户是否存在
        print(f"验证用户 {user_id} 是否存在")
        user = db.query(UserLogin).filter(UserLogin.user_id == user_id).first()
        if not user:
            print(f"用户 {user_id} 不存在")
            raise HTTPException(status_code=404, detail="用户不存在")
        print(f"用户 {user_id} 存在")
        
        # 创建新帖子
        print(f"创建新帖子: {title}")
        new_post = Post(
            user_id=user_id,
            title=title,
            content=content,
            category=category
        )
        
        print(f"将新帖子添加到数据库")
        db.add(new_post)
        print(f"提交数据库事务")
        db.commit()
        print(f"刷新帖子对象")
        db.refresh(new_post)
        print(f"帖子发布成功: {new_post.post_id}")
        
        # 处理文件上传
        uploaded_files = []
        if files:
            # 验证图片数量限制
            if len(files) > 9:
                raise HTTPException(status_code=400, detail="最多只能上传9张图片")
            
            print(f"开始处理上传的文件")
            # 创建图片存储目录
            image_dir = os.path.join(FILE_UPLOAD_DIR, "post_images")
            os.makedirs(image_dir, exist_ok=True)
            
            allowed_image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
            
            for file in files:
                print(f"处理文件: {file.filename}")
                # 验证文件类型
                file_ext = os.path.splitext(file.filename)[1].lower()
                if file_ext not in allowed_image_extensions:
                    print(f"不支持的文件类型: {file_ext}")
                    continue
                
                # 生成唯一文件名
                filename = f"{uuid.uuid4()}{file_ext}"
                file_path = os.path.join(image_dir, filename)
                
                # 保存文件
                try:
                    with open(file_path, "wb") as f:
                        f.write(await file.read())
                    print(f"文件保存成功: {file_path}")
                    
                    # 获取文件大小
                    file_size = os.path.getsize(file_path)
                    
                    # 直接创建PostFile记录
                    new_file = PostFile(
                        post_id=new_post.post_id,
                        file_name=file.filename,
                        file_path=file_path,
                        file_type=file_ext[1:],  # 去掉点号
                        file_size=file_size
                    )
                    
                    db.add(new_file)
                    uploaded_files.append({
                        "file_id": new_file.post_file_id,
                        "file_name": new_file.file_name,
                        "file_type": new_file.file_type,
                        "file_size": new_file.file_size
                    })
                except Exception as e:
                    print(f"文件保存失败: {str(e)}")
                    continue
            
            if uploaded_files:
                db.commit()
                print(f"文件上传成功，共 {len(uploaded_files)} 个文件")
        
        # 增加发帖经验值
        success, exp_added = add_exp(user_id, 5, 'post', db)
        
        return {
            "message": "帖子发布成功",
            "post_id": new_post.post_id,
            "title": new_post.title,
            "create_time": new_post.create_time.isoformat(),
            "uploaded_files": uploaded_files,
            "exp_reward": exp_added,
            "exp_message": f"经验值+{exp_added}"
        }
    except Exception as e:
        print(f"发布帖子失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"发布帖子失败: {str(e)}")

@app.get("/community/posts")
def get_posts(category: Optional[str] = None, user_id: Optional[int] = None, current_user_id: Optional[int] = None, search: Optional[str] = None, db: Session = Depends(get_db)):
    """
    获取帖子列表
    """
    try:
        print("开始获取帖子列表")
        query = db.query(Post).filter(Post.is_deleted == False)
        
        # 先根据category进行过滤和排序
        if category == "热门":
            print("按热门排序")
            query = query.order_by(
                (Post.like_count + Post.comment_count + Post.view_count).desc()
            )
        elif category == "推荐" or category == "最新":
            print(f"按{category}排序")
            query = query.order_by(Post.create_time.desc())
        elif category:
            query = query.filter(Post.category == category)
            print(f"按分类过滤: {category}")
            query = query.order_by(Post.create_time.desc())
        else:
            print("按推荐排序")
            query = query.order_by(Post.create_time.desc())
        
        # 再应用搜索条件（在当前分类/排序范围内搜索）
        if search and search.strip():
            search_term = search.strip()
            print(f"搜索关键词: {search_term}")
            
            # 获取所有用户名包含搜索词的用户ID
            matching_users = db.query(UserProfile).filter(
                UserProfile.username.like(f'%{search_term}%')
            ).all()
            matching_user_ids = [user.user_id for user in matching_users]
            
            # 在当前查询基础上添加搜索条件
            query = query.filter(
                (Post.title.like(f'%{search_term}%')) |
                (Post.content.like(f'%{search_term}%')) |
                (Post.user_id.in_(matching_user_ids) if matching_user_ids else False)
            )
        
        # 最后应用用户ID过滤
        if user_id:
            query = query.filter(Post.user_id == user_id)
            print(f"按用户ID过滤: {user_id}")
        
        # 执行查询
        posts = query.all()
        print(f"获取到 {len(posts)} 个帖子")
        
        result = []
        for post in posts:
            print(f"处理帖子: {post.post_id}")
            # 获取作者信息
            author = db.query(UserProfile).filter(UserProfile.user_id == post.user_id).first()
            author_name = author.username if author else "未知用户"
            author_avatar = author.avatar if author and author.avatar else None
            print(f"作者信息: {author_name}")
            
            # 获取帖子图片
            post_files = db.query(PostFile).filter(PostFile.post_id == post.post_id).all()
            print(f"帖子 {post.post_id} 有 {len(post_files)} 个文件")
            images = []
            for post_file in post_files:
                print(f"处理文件: {post_file.post_file_id}")
                if post_file.file_path:
                    print(f"文件路径: {post_file.file_path}")
                    # 将绝对路径转换为相对路径
                    relative_path = post_file.file_path.replace('\\', '/').split('uploads/')[-1]
                    images.append(f"/uploads/{relative_path}")
            
            # 检查当前用户是否已点赞
            is_liked = False
            if current_user_id:
                existing_like = db.query(PostLike).filter(
                    PostLike.post_id == post.post_id,
                    PostLike.user_id == current_user_id
                ).first()
                is_liked = existing_like is not None
            
            # 检查当前用户是否已收藏
            is_favorited = False
            if current_user_id:
                existing_favorite = db.query(PostFavorite).filter(
                    PostFavorite.post_id == post.post_id,
                    PostFavorite.user_id == current_user_id
                ).first()
                is_favorited = existing_favorite is not None
            
            result.append({
                "post_id": post.post_id,
                "user_id": post.user_id,
                "username": author_name,
                "avatar": f"/{author_avatar}" if author_avatar else None,
                "title": post.title,
                "content": post.content,
                "category": post.category,
                "like_count": post.like_count,
                "comment_count": post.comment_count,
                "is_liked": is_liked,
                "is_favorited": is_favorited,
                "images": images,
                "create_time": post.create_time.isoformat(),
                "update_time": post.update_time.isoformat()
            })
        
        print(f"返回 {len(result)} 个帖子")
        return result
    except Exception as e:
        print(f"获取帖子列表失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"获取帖子列表失败: {str(e)}")

@app.get("/community/posts/{post_id}")
def get_post_detail(post_id: int, current_user_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    获取帖子详情
    """
    post = db.query(Post).filter(Post.post_id == post_id, Post.is_deleted == False).first()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")
    
    # 增加浏览量
    post.view_count += 1
    db.commit()
    
    # 获取作者信息
    author = db.query(UserProfile).filter(UserProfile.user_id == post.user_id).first()
    author_name = author.username if author else "未知用户"
    author_avatar = author.avatar if author else None
    
    # 获取帖子图片
    post_files = db.query(PostFile).filter(PostFile.post_id == post.post_id).all()
    images = []
    for post_file in post_files:
        if post_file.file_path:
            relative_path = post_file.file_path.replace('\\', '/').split('uploads/')[-1]
            images.append(f"/uploads/{relative_path}")
    
    # 检查当前用户是否已点赞
    is_liked = False
    if current_user_id:
        existing_like = db.query(PostLike).filter(
            PostLike.post_id == post.post_id,
            PostLike.user_id == current_user_id
        ).first()
        is_liked = existing_like is not None
    
    # 检查当前用户是否已收藏
    is_favorited = False
    if current_user_id:
        existing_favorite = db.query(PostFavorite).filter(
            PostFavorite.post_id == post.post_id,
            PostFavorite.user_id == current_user_id
        ).first()
        is_favorited = existing_favorite is not None
    
    return {
        "post_id": post.post_id,
        "user_id": post.user_id,
        "username": author_name,
        "avatar": f"/{author_avatar}" if author_avatar else None,
        "title": post.title,
        "content": post.content,
        "category": post.category,
        "view_count": post.view_count,
        "like_count": post.like_count,
        "comment_count": post.comment_count,
        "is_liked": is_liked,
        "is_favorited": is_favorited,
        "images": images,
        "create_time": post.create_time.isoformat(),
        "update_time": post.update_time.isoformat()
    }

# ==================== 删除帖子 API ====================

@app.delete("/community/posts/{post_id}")
def delete_post(post_id: int, user_id: int, db: Session = Depends(get_db)):
    """
    删除帖子（仅帖子作者可删除）
    """
    try:
        print(f"用户 {user_id} 尝试删除帖子 {post_id}")
        
        # 验证帖子是否存在
        post = db.query(Post).filter(Post.post_id == post_id, Post.is_deleted == False).first()
        if not post:
            raise HTTPException(status_code=404, detail="帖子不存在")
        
        # 验证是否是帖子作者
        if post.user_id != user_id:
            raise HTTPException(status_code=403, detail="无权删除此帖子")
        
        # 软删除帖子
        post.is_deleted = True
        db.commit()
        
        print(f"帖子 {post_id} 删除成功")
        return {"message": "帖子删除成功"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"删除帖子失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"删除帖子失败: {str(e)}")

# ==================== 点赞功能 API ====================

class LikeRequest(BaseModel):
    user_id: int
    post_id: int

@app.post("/community/posts/{post_id}/like")
def like_post(post_id: int, user_id: int, db: Session = Depends(get_db)):
    """
    点赞或取消点赞帖子
    """
    try:
        # 验证帖子是否存在
        post = db.query(Post).filter(Post.post_id == post_id, Post.is_deleted == False).first()
        if not post:
            raise HTTPException(status_code=404, detail="帖子不存在")
        
        # 验证用户是否存在
        user = db.query(UserLogin).filter(UserLogin.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 检查是否已经点赞
        existing_like = db.query(PostLike).filter(
            PostLike.post_id == post_id,
            PostLike.user_id == user_id
        ).first()
        
        if existing_like:
            # 已经点赞，执行取消点赞
            db.delete(existing_like)
            post.like_count = max(0, post.like_count - 1)
            db.commit()
            return {
                "message": "取消点赞成功",
                "liked": False,
                "like_count": post.like_count
            }
        else:
            # 未点赞，执行点赞
            new_like = PostLike(
                post_id=post_id,
                user_id=user_id
            )
            db.add(new_like)
            post.like_count += 1
            db.commit()
            
            # 增加点赞经验值
            success, exp_added = add_exp(user_id, 2, 'like', db)
            
            return {
                "message": "点赞成功",
                "liked": True,
                "like_count": post.like_count,
                "exp_reward": exp_added,
                "exp_message": f"经验值+{exp_added}"
            }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"操作失败: {str(e)}")

@app.delete("/community/posts/{post_id}/like")
def unlike_post(post_id: int, user_id: int, db: Session = Depends(get_db)):
    """
    取消点赞帖子
    """
    try:
        # 验证帖子是否存在
        post = db.query(Post).filter(Post.post_id == post_id, Post.is_deleted == False).first()
        if not post:
            raise HTTPException(status_code=404, detail="帖子不存在")
        
        # 验证用户是否存在
        user = db.query(UserLogin).filter(UserLogin.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 查找点赞记录
        like = db.query(PostLike).filter(
            PostLike.post_id == post_id,
            PostLike.user_id == user_id
        ).first()
        
        if not like:
            return {"message": "未点赞过", "liked": False}
        
        # 删除点赞记录
        db.delete(like)
        
        # 更新帖子的点赞数
        post.like_count = max(0, post.like_count - 1)
        
        db.commit()
        
        return {
            "message": "取消点赞成功",
            "liked": False,
            "like_count": post.like_count
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"取消点赞失败: {str(e)}")

# ==================== 评论功能 API ====================

class CommentRequest(BaseModel):
    user_id: int
    content: str
    parent_comment_id: Optional[int] = None

@app.get("/community/posts/{post_id}/comments")
def get_comments(post_id: int, db: Session = Depends(get_db)):
    """
    获取指定帖子的所有评论
    """
    try:
        print(f"获取帖子 {post_id} 的评论列表")
        
        # 验证帖子是否存在
        post = db.query(Post).filter(Post.post_id == post_id, Post.is_deleted == False).first()
        if not post:
            raise HTTPException(status_code=404, detail="帖子不存在")
        
        # 获取所有未删除的评论，按时间排序
        comments = db.query(Comment).filter(
            Comment.post_id == post_id,
            Comment.is_deleted == False
        ).order_by(Comment.create_time.asc()).all()
        
        print(f"获取到 {len(comments)} 条评论")
        
        result = []
        for comment in comments:
            print(f"处理评论: {comment.comment_id}")
            
            # 获取评论者信息
            commenter = db.query(UserProfile).filter(UserProfile.user_id == comment.user_id).first()
            commenter_name = commenter.username if commenter else "未知用户"
            commenter_avatar = commenter.avatar if commenter and commenter.avatar else None
            
            # 获取父评论信息（如果是回复）
            parent_info = None
            if comment.parent_comment_id:
                parent_comment = db.query(Comment).filter(
                    Comment.comment_id == comment.parent_comment_id
                ).first()
                if parent_comment:
                    parent_user = db.query(UserProfile).filter(
                        UserProfile.user_id == parent_comment.user_id
                    ).first()
                    parent_info = {
                        "comment_id": parent_comment.comment_id,
                        "username": parent_user.username if parent_user else "未知用户"
                    }
            
            result.append({
                "comment_id": comment.comment_id,
                "post_id": comment.post_id,
                "user_id": comment.user_id,
                "username": commenter_name,
                "avatar": f"/{commenter_avatar}" if commenter_avatar else None,
                "content": comment.content,
                "like_count": comment.like_count,
                "parent_comment": parent_info,
                "create_time": comment.create_time.isoformat()
            })
        
        print(f"返回 {len(result)} 条评论")
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"获取评论列表失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"获取评论列表失败: {str(e)}")

@app.post("/community/posts/{post_id}/comments")
def create_comment(post_id: int, comment_request: CommentRequest, db: Session = Depends(get_db)):
    """
    为指定帖子添加新评论
    """
    try:
        print(f"为帖子 {post_id} 创建评论")
        
        # 验证帖子是否存在
        post = db.query(Post).filter(Post.post_id == post_id, Post.is_deleted == False).first()
        if not post:
            raise HTTPException(status_code=404, detail="帖子不存在")
        
        # 验证用户是否存在
        user = db.query(UserLogin).filter(UserLogin.user_id == comment_request.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 如果是回复评论，验证父评论是否存在
        if comment_request.parent_comment_id:
            parent_comment = db.query(Comment).filter(
                Comment.comment_id == comment_request.parent_comment_id,
                Comment.is_deleted == False
            ).first()
            if not parent_comment:
                raise HTTPException(status_code=404, detail="父评论不存在")
            
            # 验证父评论是否属于同一个帖子
            if parent_comment.post_id != post_id:
                raise HTTPException(status_code=400, detail="父评论不属于该帖子")
        
        # 创建新评论
        new_comment = Comment(
            post_id=post_id,
            user_id=comment_request.user_id,
            content=comment_request.content,
            parent_comment_id=comment_request.parent_comment_id
        )
        db.add(new_comment)
        
        # 更新帖子的评论数
        post.comment_count += 1
        
        db.commit()
        db.refresh(new_comment)
        
        # 获取评论者信息
        commenter = db.query(UserProfile).filter(UserProfile.user_id == comment_request.user_id).first()
        commenter_name = commenter.username if commenter else "未知用户"
        commenter_avatar = commenter.avatar if commenter and commenter.avatar else None
        
        # 获取父评论信息（如果是回复）
        parent_info = None
        if new_comment.parent_comment_id:
            parent_comment = db.query(Comment).filter(
                Comment.comment_id == new_comment.parent_comment_id
            ).first()
            if parent_comment:
                parent_user = db.query(UserProfile).filter(
                    UserProfile.user_id == parent_comment.user_id
                ).first()
                parent_info = {
                    "comment_id": parent_comment.comment_id,
                    "username": parent_user.username if parent_user else "未知用户"
                }
        
        print(f"评论创建成功: {new_comment.comment_id}")
        return {
            "message": "评论发布成功",
            "comment": {
                "comment_id": new_comment.comment_id,
                "post_id": new_comment.post_id,
                "user_id": new_comment.user_id,
                "username": commenter_name,
                "avatar": f"/{commenter_avatar}" if commenter_avatar else None,
                "content": new_comment.content,
                "like_count": new_comment.like_count,
                "parent_comment": parent_info,
                "create_time": new_comment.create_time.isoformat()
            },
            "post_comment_count": post.comment_count
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"创建评论失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"创建评论失败: {str(e)}")

@app.delete("/community/comments/{comment_id}")
def delete_comment(comment_id: int, user_id: int, db: Session = Depends(get_db)):
    """
    删除指定评论（软删除）
    """
    try:
        print(f"删除评论 {comment_id}")
        
        # 验证评论是否存在
        comment = db.query(Comment).filter(
            Comment.comment_id == comment_id,
            Comment.is_deleted == False
        ).first()
        if not comment:
            raise HTTPException(status_code=404, detail="评论不存在")
        
        # 验证用户是否为评论作者
        if comment.user_id != user_id:
            raise HTTPException(status_code=403, detail="无权删除该评论")
        
        # 软删除评论
        comment.is_deleted = True
        
        # 更新帖子的评论数
        post = db.query(Post).filter(Post.post_id == comment.post_id).first()
        if post:
            post.comment_count = max(0, post.comment_count - 1)
        
        db.commit()
        
        print(f"评论删除成功: {comment_id}")
        return {
            "message": "评论删除成功",
            "post_comment_count": post.comment_count if post else 0
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"删除评论失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"删除评论失败: {str(e)}")

# ==================== 收藏功能 API ====================

@app.post("/community/posts/{post_id}/favorite")
def favorite_post(post_id: int, user_id: int, db: Session = Depends(get_db)):
    """
    收藏或取消收藏帖子
    """
    try:
        print(f"用户 {user_id} 尝试收藏帖子 {post_id}")
        
        # 验证帖子是否存在
        post = db.query(Post).filter(Post.post_id == post_id, Post.is_deleted == False).first()
        if not post:
            raise HTTPException(status_code=404, detail="帖子不存在")
        
        # 验证用户是否存在
        user = db.query(UserLogin).filter(UserLogin.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 检查是否已经收藏
        existing_favorite = db.query(PostFavorite).filter(
            PostFavorite.post_id == post_id,
            PostFavorite.user_id == user_id
        ).first()
        
        if existing_favorite:
            # 已经收藏，执行取消收藏
            db.delete(existing_favorite)
            db.commit()
            print(f"用户 {user_id} 取消收藏帖子 {post_id}")
            return {
                "message": "取消收藏成功",
                "favorited": False
            }
        else:
            # 未收藏，执行收藏
            new_favorite = PostFavorite(
                post_id=post_id,
                user_id=user_id
            )
            db.add(new_favorite)
            db.commit()
            print(f"用户 {user_id} 收藏帖子 {post_id}")
            return {
                "message": "收藏成功",
                "favorited": True
            }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"收藏操作失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"操作失败: {str(e)}")

@app.get("/community/favorites/{user_id}")
def get_user_favorites(user_id: int, search: Optional[str] = None, db: Session = Depends(get_db)):
    """
    获取指定用户的收藏帖子列表
    """
    try:
        print(f"获取用户 {user_id} 的收藏列表，搜索关键词: {search}")
        
        # 验证用户是否存在
        user = db.query(UserLogin).filter(UserLogin.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 获取用户的收藏记录
        favorites = db.query(PostFavorite).filter(
            PostFavorite.user_id == user_id
        ).order_by(PostFavorite.create_time.desc()).all()
        
        print(f"用户 {user_id} 有 {len(favorites)} 个收藏")
        
        result = []
        for favorite in favorites:
            post = db.query(Post).filter(
                Post.post_id == favorite.post_id,
                Post.is_deleted == False
            ).first()
            
            if not post:
                continue
            
            # 获取作者信息
            author = db.query(UserProfile).filter(UserProfile.user_id == post.user_id).first()
            author_name = author.username if author else "未知用户"
            author_avatar = author.avatar if author and author.avatar else None
            
            # 获取帖子图片
            post_files = db.query(PostFile).filter(PostFile.post_id == post.post_id).all()
            images = []
            for post_file in post_files:
                if post_file.file_path:
                    relative_path = post_file.file_path.replace('\\', '/').split('uploads/')[-1]
                    images.append(f"/uploads/{relative_path}")
            
            post_data = {
                "post_id": post.post_id,
                "user_id": post.user_id,
                "username": author_name,
                "avatar": f"/{author_avatar}" if author_avatar else None,
                "title": post.title,
                "content": post.content,
                "category": post.category,
                "like_count": post.like_count,
                "comment_count": post.comment_count,
                "is_favorited": True,
                "images": images,
                "create_time": post.create_time.isoformat(),
                "update_time": post.update_time.isoformat(),
                "favorite_time": favorite.create_time.isoformat()
            }
            
            # 如果有搜索关键词，进行过滤
            if search and search.strip():
                search_term = search.strip().lower()
                # 搜索标题、内容或用户名
                if (search_term in post.title.lower() or 
                    search_term in post.content.lower() or 
                    search_term in author_name.lower()):
                    result.append(post_data)
            else:
                result.append(post_data)
        
        print(f"返回 {len(result)} 个收藏帖子")
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"获取收藏列表失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"获取收藏列表失败: {str(e)}")

# ==================== 社区统计 API ====================

@app.get("/community/stats")
def get_community_stats(db: Session = Depends(get_db)):
    """
    获取社区统计数据
    """
    try:
        print("获取社区统计数据")
        
        from datetime import datetime, timedelta
        seven_days_ago = datetime.now() - timedelta(days=7)
        
        # 活跃用户数（最近7天有发帖或评论的用户）
        active_post_users = db.query(Post.user_id).filter(
            Post.is_deleted == False,
            Post.create_time >= seven_days_ago
        ).distinct().count()
        
        active_comment_users = db.query(Comment.user_id).filter(
            Comment.is_deleted == False,
            Comment.create_time >= seven_days_ago
        ).distinct().count()
        
        # 合并去重（使用集合）
        active_user_ids = set()
        post_users = db.query(Post.user_id).filter(
            Post.is_deleted == False,
            Post.create_time >= seven_days_ago
        ).distinct().all()
        active_user_ids.update([u[0] for u in post_users])
        
        comment_users = db.query(Comment.user_id).filter(
            Comment.is_deleted == False,
            Comment.create_time >= seven_days_ago
        ).distinct().all()
        active_user_ids.update([u[0] for u in comment_users])
        
        active_users = len(active_user_ids)
        
        # 帖子总数
        total_posts = db.query(Post).filter(Post.is_deleted == False).count()
        
        # 评论总数
        total_comments = db.query(Comment).filter(Comment.is_deleted == False).count()
        
        # 今日发帖数
        today = datetime.now().date()
        today_posts = db.query(Post).filter(
            Post.is_deleted == False,
            func.date(Post.create_time) == today
        ).count()
        
        # 热门分类（帖子数最多的分类）
        from sqlalchemy import func as sql_func, desc
        popular_categories = db.query(
            Post.category,
            sql_func.count(Post.post_id).label('post_count')
        ).filter(
            Post.is_deleted == False
        ).group_by(Post.category).order_by(
            desc(sql_func.count(Post.post_id))
        ).limit(5).all()
        
        print(f"统计数据: 活跃用户={active_users}, 帖子={total_posts}, 评论={total_comments}")
        
        return {
            "active_users": active_users,
            "total_posts": total_posts,
            "total_comments": total_comments,
            "today_posts": today_posts,
            "popular_categories": [
                {"category": cat[0], "count": cat[1]}
                for cat in popular_categories
            ]
        }
    except Exception as e:
        print(f"获取社区统计失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"获取社区统计失败: {str(e)}")

# ==================== 关注功能 API ====================

@app.post("/users/{user_id}/follow")
def follow_user(user_id: int, follower_id: int, db: Session = Depends(get_db)):
    """
    关注用户
    """
    try:
        print(f"用户 {follower_id} 尝试关注用户 {user_id}")
        
        # 验证被关注用户是否存在
        target_user = db.query(UserLogin).filter(UserLogin.user_id == user_id).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="被关注用户不存在")
        
        # 验证关注者是否存在
        follower = db.query(UserLogin).filter(UserLogin.user_id == follower_id).first()
        if not follower:
            raise HTTPException(status_code=404, detail="关注者不存在")
        
        # 不能关注自己
        if user_id == follower_id:
            raise HTTPException(status_code=400, detail="不能关注自己")
        
        # 检查是否已经关注
        existing_follow = db.query(UserFollow).filter(
            UserFollow.follower_id == follower_id,
            UserFollow.following_id == user_id
        ).first()
        
        if existing_follow:
            # 已经关注，执行取消关注
            db.delete(existing_follow)
            db.commit()
            print(f"用户 {follower_id} 取消关注用户 {user_id}")
            return {
                "message": "取消关注成功",
                "following": False
            }
        else:
            # 未关注，执行关注
            new_follow = UserFollow(
                follower_id=follower_id,
                following_id=user_id
            )
            db.add(new_follow)
            
            # 获取关注者信息
            follower_profile = db.query(UserProfile).filter(UserProfile.user_id == follower_id).first()
            follower_name = follower_profile.username if follower_profile else f"用户{follower_id}"
            
            # 创建关注通知
            notification_title = "新的关注"
            notification_content = f"{follower_name} 关注了你"
            create_notification(
                user_id=user_id,
                notification_type="follow",
                title=notification_title,
                content=notification_content,
                related_user_id=follower_id,
                db=db
            )
            
            db.commit()
            print(f"用户 {follower_id} 关注用户 {user_id} 成功")
            return {
                "message": "关注成功",
                "following": True
            }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"关注操作失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"操作失败: {str(e)}")

@app.get("/users/{user_id}/followers")
def get_user_followers(
    user_id: int,
    current_user_id: Optional[int] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db)
):
    """
    获取用户的关注者列表（支持分页）
    """
    try:
        print(f"获取用户 {user_id} 的关注者列表, 当前用户: {current_user_id}, 页码: {page}, 每页: {page_size}")

        # 验证用户是否存在
        user = db.query(UserLogin).filter(UserLogin.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")

        # 获取总数量
        total_count = db.query(UserFollow).filter(
            UserFollow.following_id == user_id
        ).count()

        # 获取分页的关注者列表
        followers = db.query(UserFollow).filter(
            UserFollow.following_id == user_id
        ).order_by(UserFollow.create_time.desc()).offset((page - 1) * page_size).limit(page_size).all()

        result = []
        for follow in followers:
            follower_profile = db.query(UserProfile).filter(
                UserProfile.user_id == follow.follower_id
            ).first()
            if follower_profile:
                # 检查当前用户是否关注了该粉丝
                is_following = False
                if current_user_id:
                    follow_status = db.query(UserFollow).filter(
                        UserFollow.follower_id == current_user_id,
                        UserFollow.following_id == follow.follower_id
                    ).first()
                    is_following = follow_status is not None

                result.append({
                    "user_id": follow.follower_id,
                    "username": follower_profile.username,
                    "avatar": f"/{follower_profile.avatar}" if follower_profile.avatar else None,
                    "follow_time": follow.create_time.isoformat(),
                    "is_following": is_following
                })

        print(f"用户 {user_id} 有 {total_count} 个关注者, 返回第 {page} 页 {len(result)} 条")
        return {
            "list": result,
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_count + page_size - 1) // page_size
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"获取关注者列表失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"获取关注者列表失败: {str(e)}")

@app.get("/users/{user_id}/following")
def get_user_following(
    user_id: int,
    current_user_id: Optional[int] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db)
):
    """
    获取用户关注的人列表（支持分页）
    """
    try:
        print(f"获取用户 {user_id} 关注的人列表, 当前用户: {current_user_id}, 页码: {page}, 每页: {page_size}")

        # 验证用户是否存在
        user = db.query(UserLogin).filter(UserLogin.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")

        # 获取总数量
        total_count = db.query(UserFollow).filter(
            UserFollow.follower_id == user_id
        ).count()

        # 获取分页的关注列表
        following = db.query(UserFollow).filter(
            UserFollow.follower_id == user_id
        ).order_by(UserFollow.create_time.desc()).offset((page - 1) * page_size).limit(page_size).all()

        result = []
        for follow in following:
            following_profile = db.query(UserProfile).filter(
                UserProfile.user_id == follow.following_id
            ).first()
            if following_profile:
                # 检查当前用户是否也关注了该用户
                is_following = False
                if current_user_id:
                    follow_status = db.query(UserFollow).filter(
                        UserFollow.follower_id == current_user_id,
                        UserFollow.following_id == follow.following_id
                    ).first()
                    is_following = follow_status is not None

                result.append({
                    "user_id": follow.following_id,
                    "username": following_profile.username,
                    "avatar": f"/{following_profile.avatar}" if following_profile.avatar else None,
                    "follow_time": follow.create_time.isoformat(),
                    "is_following": is_following
                })

        print(f"用户 {user_id} 关注了 {total_count} 个人, 返回第 {page} 页 {len(result)} 条")
        return {
            "list": result,
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_count + page_size - 1) // page_size
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"获取关注列表失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"获取关注列表失败: {str(e)}")

@app.get("/users/{user_id}/follow-status/{target_user_id}")
def check_follow_status(user_id: int, target_user_id: int, db: Session = Depends(get_db)):
    """
    检查用户是否关注了目标用户，以及是否互关
    """
    try:
        print(f"检查用户 {user_id} 是否关注了用户 {target_user_id}")
        
        # 验证用户是否存在
        user = db.query(UserLogin).filter(UserLogin.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 验证目标用户是否存在
        target_user = db.query(UserLogin).filter(UserLogin.user_id == target_user_id).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="目标用户不存在")
        
        # 检查用户是否关注了目标用户
        user_following_target = db.query(UserFollow).filter(
            UserFollow.follower_id == user_id,
            UserFollow.following_id == target_user_id
        ).first()
        
        # 检查目标用户是否关注了用户
        target_following_user = db.query(UserFollow).filter(
            UserFollow.follower_id == target_user_id,
            UserFollow.following_id == user_id
        ).first()
        
        is_following = user_following_target is not None
        is_mutual_follow = is_following and target_following_user is not None
        
        print(f"用户 {user_id} {'已关注' if is_following else '未关注'} 用户 {target_user_id}")
        print(f"互关状态: {'是' if is_mutual_follow else '否'}")
        
        return {
            "is_following": is_following,
            "is_mutual_follow": is_mutual_follow
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"检查关注状态失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"检查关注状态失败: {str(e)}")

# ==================== 通知管理函数 ====================

def create_notification(user_id: int, notification_type: str, title: str, content: str, related_user_id: int = None, related_id: int = None, db: Session = None):
    """
    创建通知
    
    Args:
        user_id: 接收通知的用户ID
        notification_type: 通知类型
        title: 通知标题
        content: 通知内容
        related_user_id: 相关用户ID
        related_id: 相关ID
        db: 数据库会话
    """
    try:
        if not db:
            return False
        
        new_notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            content=content,
            related_user_id=related_user_id,
            related_id=related_id
        )
        db.add(new_notification)
        db.commit()
        print(f"为用户 {user_id} 创建了 {notification_type} 类型的通知")
        return True
    except Exception as e:
        print(f"创建通知失败: {str(e)}")
        import traceback
        traceback.print_exc()
        if db:
            db.rollback()
        return False

# ==================== 经验值管理函数 ====================

def add_exp(user_id: int, exp: int, exp_type: str, db: Session):
    """
    为用户增加经验值并检查是否升级
    
    Args:
        user_id: 用户ID
        exp: 增加的经验值
        exp_type: 经验类型（check_in, post, like）
        db: 数据库会话
    """
    try:
        print(f"为用户 {user_id} 增加 {exp} 经验值，类型: {exp_type}")
        
        # 获取用户等级信息
        user_level = db.query(UserLevel).filter(UserLevel.user_id == user_id).first()
        if not user_level:
            # 如果用户等级不存在，创建一个新的
            user_level = UserLevel(
                user_id=user_id,
                current_level=1,
                current_exp=0,
                total_exp=0,
                daily_post_exp=0,
                daily_like_exp=0
            )
            db.add(user_level)
            db.flush()
        
        # 获取今天的日期
        today = datetime.now().date()
        today_start = datetime.combine(today, datetime.min.time())
        
        # 检查是否需要重置每日经验值计数
        if user_level.last_exp_update_date:
            last_update_date = user_level.last_exp_update_date.date()
            if last_update_date < today:
                # 新的一天，重置每日经验值计数
                user_level.daily_post_exp = 0
                user_level.daily_like_exp = 0
                user_level.last_exp_update_date = datetime.now()
        
        # 根据经验类型检查每日上限
        exp_to_add = 0
        
        if exp_type == 'check_in':
            # 签到：直接加10经验，没有每日上限
            exp_to_add = 10
            user_level.current_exp += exp_to_add
            user_level.total_exp += exp_to_add
            
        elif exp_type == 'post':
            # 发帖：每次5经验，每天最多15经验
            if user_level.daily_post_exp < 15:
                exp_to_add = min(5, 15 - user_level.daily_post_exp)
                user_level.current_exp += exp_to_add
                user_level.total_exp += exp_to_add
                user_level.daily_post_exp += exp_to_add
            else:
                print(f"用户 {user_id} 今日发帖经验已达上限")
                return False, 0
            
        elif exp_type == 'like':
            # 点赞：每次2经验，每天最多10经验
            if user_level.daily_like_exp < 10:
                exp_to_add = min(2, 10 - user_level.daily_like_exp)
                user_level.current_exp += exp_to_add
                user_level.total_exp += exp_to_add
                user_level.daily_like_exp += exp_to_add
            else:
                print(f"用户 {user_id} 今日点赞经验已达上限")
                return False, 0
        
        # 更新最后经验值更新日期
        user_level.last_exp_update_date = datetime.now()
        
        # 检查是否升级
        level_up_count = 0
        while True:
            level_def = db.query(LevelDefinition).filter(
                LevelDefinition.level_number == user_level.current_level
            ).first()
            
            if not level_def:
                break
            
            if user_level.current_exp >= level_def.required_exp:
                # 升级
                user_level.current_exp -= level_def.required_exp
                user_level.current_level += 1
                user_level.last_level_up_time = datetime.now()
                level_up_count += 1
                print(f"用户 {user_id} 升级到 {user_level.current_level} 级！")
            else:
                break
        
        db.commit()
        
        if level_up_count > 0:
            print(f"用户 {user_id} 连续升级 {level_up_count} 次")
        
        return True, exp_to_add
        
    except Exception as e:
        print(f"增加经验值失败: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False, 0

# ==================== 签到功能 API ====================

@app.post("/check-in/{user_id}")
def check_in(user_id: int, db: Session = Depends(get_db)):
    """
    用户签到
    """
    try:
        print(f"用户 {user_id} 尝试签到")
        
        # 验证用户是否存在
        user = db.query(UserLogin).filter(UserLogin.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 获取今天的日期（只取日期部分）
        today = datetime.now().date()
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())
        
        # 检查今天是否已经签到
        existing_check_in = db.query(CheckIn).filter(
            CheckIn.user_id == user_id,
            CheckIn.check_in_date >= today_start,
            CheckIn.check_in_date <= today_end
        ).first()
        
        if existing_check_in:
            return {
                "success": False,
                "message": "今天已经签到过了",
                "consecutive_days": existing_check_in.consecutive_days,
                "exp_reward": existing_check_in.exp_reward
            }
        
        # 查询昨天的签到记录
        yesterday = today - timedelta(days=1)
        yesterday_start = datetime.combine(yesterday, datetime.min.time())
        yesterday_end = datetime.combine(yesterday, datetime.max.time())
        
        yesterday_check_in = db.query(CheckIn).filter(
            CheckIn.user_id == user_id,
            CheckIn.check_in_date >= yesterday_start,
            CheckIn.check_in_date <= yesterday_end
        ).first()
        
        # 计算连续签到天数
        if yesterday_check_in:
            consecutive_days = yesterday_check_in.consecutive_days + 1
        else:
            consecutive_days = 1
        
        # 计算经验值奖励（连续签到奖励递增）
        base_exp = 10
        consecutive_bonus = min(consecutive_days - 1, 30) * 2  # 最多额外加60经验
        exp_reward = base_exp + consecutive_bonus
        
        # 创建签到记录
        now = datetime.now()
        new_check_in = CheckIn(
            user_id=user_id,
            check_in_date=now,
            check_in_time=now,
            consecutive_days=consecutive_days,
            exp_reward=exp_reward
        )
        
        db.add(new_check_in)
        db.commit()
        db.refresh(new_check_in)
        
        # 增加签到经验值
        success, exp_added = add_exp(user_id, 10, 'check_in', db)
        
        print(f"用户 {user_id} 签到成功，连续签到 {consecutive_days} 天，获得 {exp_added} 经验")
        
        return {
            "success": True,
            "message": "签到成功！",
            "consecutive_days": consecutive_days,
            "exp_reward": exp_added,
            "exp_message": f"经验值+{exp_added}"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"签到失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"签到失败: {str(e)}")

@app.get("/check-in/{user_id}/status")
def get_check_in_status(user_id: int, db: Session = Depends(get_db)):
    """
    获取用户今日签到状态
    """
    try:
        print(f"查询用户 {user_id} 的签到状态")
        
        # 验证用户是否存在
        user = db.query(UserLogin).filter(UserLogin.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 获取今天的日期
        today = datetime.now().date()
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())
        
        # 查询今天的签到记录
        today_check_in = db.query(CheckIn).filter(
            CheckIn.user_id == user_id,
            CheckIn.check_in_date >= today_start,
            CheckIn.check_in_date <= today_end
        ).first()
        
        # 获取连续签到天数
        if today_check_in:
            consecutive_days = today_check_in.consecutive_days
        else:
            # 查询昨天的签到记录
            yesterday = today - timedelta(days=1)
            yesterday_start = datetime.combine(yesterday, datetime.min.time())
            yesterday_end = datetime.combine(yesterday, datetime.max.time())
            
            yesterday_check_in = db.query(CheckIn).filter(
                CheckIn.user_id == user_id,
                CheckIn.check_in_date >= yesterday_start,
                CheckIn.check_in_date <= yesterday_end
            ).first()
            
            if yesterday_check_in:
                consecutive_days = yesterday_check_in.consecutive_days
            else:
                consecutive_days = 0
        
        return {
            "checked_in": today_check_in is not None,
            "consecutive_days": consecutive_days,
            "check_in_time": today_check_in.check_in_time.isoformat() if today_check_in else None
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"查询签到状态失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"查询签到状态失败: {str(e)}")

@app.get("/check-in/{user_id}/records")
def get_check_in_records(user_id: int, year: Optional[int] = None, month: Optional[int] = None, db: Session = Depends(get_db)):
    """
    获取用户签到记录（用于日历显示）
    """
    try:
        print(f"查询用户 {user_id} 的签到记录，年: {year}, 月: {month}")
        
        # 验证用户是否存在
        user = db.query(UserLogin).filter(UserLogin.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 构建查询条件
        query = db.query(CheckIn).filter(CheckIn.user_id == user_id)
        
        # 如果指定了年月，只查询该月的记录
        if year and month:
            month_start = datetime(year, month, 1)
            if month == 12:
                month_end = datetime(year + 1, 1, 1) - timedelta(days=1)
            else:
                month_end = datetime(year, month + 1, 1) - timedelta(days=1)
            
            query = query.filter(
                CheckIn.check_in_date >= month_start,
                CheckIn.check_in_date <= month_end
            )
        
        # 按签到日期倒序排列
        records = query.order_by(CheckIn.check_in_date.desc()).all()
        
        # 转换为日期列表
        check_in_dates = [
            {
                "date": record.check_in_date.strftime('%Y-%m-%d'),
                "consecutive_days": record.consecutive_days,
                "exp_reward": record.exp_reward
            }
            for record in records
        ]
        
        print(f"返回 {len(check_in_dates)} 条签到记录")
        
        return {
            "records": check_in_dates,
            "total_count": len(check_in_dates)
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"查询签到记录失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"查询签到记录失败: {str(e)}")

@app.get("/check-in/{user_id}/consecutive")
def get_consecutive_days(user_id: int, db: Session = Depends(get_db)):
    """
    获取用户连续签到天数
    """
    try:
        print(f"查询用户 {user_id} 的连续签到天数")
        
        # 验证用户是否存在
        user = db.query(UserLogin).filter(UserLogin.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 获取今天的日期
        today = datetime.now().date()
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())
        
        # 查询今天的签到记录
        today_check_in = db.query(CheckIn).filter(
            CheckIn.user_id == user_id,
            CheckIn.check_in_date >= today_start,
            CheckIn.check_in_date <= today_end
        ).first()
        
        if today_check_in:
            consecutive_days = today_check_in.consecutive_days
        else:
            # 查询昨天的签到记录
            yesterday = today - timedelta(days=1)
            yesterday_start = datetime.combine(yesterday, datetime.min.time())
            yesterday_end = datetime.combine(yesterday, datetime.max.time())
            
            yesterday_check_in = db.query(CheckIn).filter(
                CheckIn.user_id == user_id,
                CheckIn.check_in_date >= yesterday_start,
                CheckIn.check_in_date <= yesterday_end
            ).first()
            
            if yesterday_check_in:
                consecutive_days = yesterday_check_in.consecutive_days
            else:
                consecutive_days = 0
        
        return {
            "consecutive_days": consecutive_days
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"查询连续签到天数失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"查询连续签到天数失败: {str(e)}")

# ==================== 私信功能 API ====================

class MessageRequest(BaseModel):
    sender_id: int
    receiver_id: int
    content: str

@app.post("/messages")
def send_message(message: MessageRequest, db: Session = Depends(get_db)):
    """
    发送私信
    """
    try:
        print(f"用户 {message.sender_id} 发送消息给用户 {message.receiver_id}")
        
        # 验证发送者是否存在
        sender = db.query(UserLogin).filter(UserLogin.user_id == message.sender_id).first()
        if not sender:
            raise HTTPException(status_code=404, detail="发送者不存在")
        
        # 验证接收者是否存在
        receiver = db.query(UserLogin).filter(UserLogin.user_id == message.receiver_id).first()
        if not receiver:
            raise HTTPException(status_code=404, detail="接收者不存在")
        
        # 不能给自己发送消息
        if message.sender_id == message.receiver_id:
            raise HTTPException(status_code=400, detail="不能给自己发送消息")
        
        # 验证消息内容
        if not message.content or not message.content.strip():
            raise HTTPException(status_code=400, detail="消息内容不能为空")
        
        if len(message.content) > 1000:
            raise HTTPException(status_code=400, detail="消息内容不能超过1000字")
        
        # 创建新消息
        new_message = UserMessage(
            sender_id=message.sender_id,
            receiver_id=message.receiver_id,
            content=message.content.strip(),
            is_read=False
        )
        db.add(new_message)
        
        # 获取发送者信息
        sender_profile = db.query(UserProfile).filter(UserProfile.user_id == message.sender_id).first()
        sender_name = sender_profile.username if sender_profile else f"用户{message.sender_id}"
        
        # 创建私信通知
        notification_title = "新消息"
        # 截取消息内容作为通知内容，最多50字
        message_preview = message.content.strip()[:50] + ("..." if len(message.content.strip()) > 50 else "")
        notification_content = f"{sender_name} 给你发来私信: {message_preview}"
        create_notification(
            user_id=message.receiver_id,
            notification_type="message",
            title=notification_title,
            content=notification_content,
            related_user_id=message.sender_id,
            related_id=new_message.message_id,
            db=db
        )
        
        db.commit()
        db.refresh(new_message)
        
        print(f"消息发送成功，消息ID: {new_message.message_id}")
        
        return {
            "message": "消息发送成功",
            "message_id": new_message.message_id,
            "create_time": new_message.create_time.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"发送消息失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"发送消息失败: {str(e)}")

@app.get("/messages/{user_id}/chat/{target_user_id}")
def get_messages(user_id: int, target_user_id: int, db: Session = Depends(get_db)):
    """
    获取两个用户之间的聊天记录
    """
    try:
        print(f"获取用户 {user_id} 和用户 {target_user_id} 的聊天记录")
        
        # 验证用户是否存在
        user = db.query(UserLogin).filter(UserLogin.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 验证目标用户是否存在
        target_user = db.query(UserLogin).filter(UserLogin.user_id == target_user_id).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="目标用户不存在")
        
        # 获取两个用户之间的所有消息
        messages = db.query(UserMessage).filter(
            ((UserMessage.sender_id == user_id) & (UserMessage.receiver_id == target_user_id)) |
            ((UserMessage.sender_id == target_user_id) & (UserMessage.receiver_id == user_id))
        ).order_by(UserMessage.create_time.asc()).all()
        
        # 将接收到的消息标记为已读
        for msg in messages:
            if msg.receiver_id == user_id and not msg.is_read:
                msg.is_read = True
        db.commit()
        
        # 构建消息列表
        result = []
        for msg in messages:
            result.append({
                "message_id": msg.message_id,
                "sender_id": msg.sender_id,
                "receiver_id": msg.receiver_id,
                "content": msg.content,
                "is_read": msg.is_read,
                "create_time": msg.create_time.isoformat()
            })
        
        print(f"返回 {len(result)} 条消息")
        return {
            "messages": result,
            "total_count": len(result)
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"获取聊天记录失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"获取聊天记录失败: {str(e)}")

@app.get("/messages/{user_id}/unread/count")
def get_unread_messages(user_id: int, db: Session = Depends(get_db)):
    """
    获取用户的未读消息数量
    """
    try:
        print(f"获取用户 {user_id} 的未读消息")
        
        # 验证用户是否存在
        user = db.query(UserLogin).filter(UserLogin.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 统计未读消息数量
        unread_count = db.query(UserMessage).filter(
            UserMessage.receiver_id == user_id,
            UserMessage.is_read == False
        ).count()
        
        # 获取发送者列表
        senders = db.query(UserMessage.sender_id).filter(
            UserMessage.receiver_id == user_id,
            UserMessage.is_read == False
        ).distinct().all()
        
        sender_list = []
        for sender_id in senders:
            sender_profile = db.query(UserProfile).filter(
                UserProfile.user_id == sender_id[0]
            ).first()
            if sender_profile:
                sender_list.append({
                    "user_id": sender_id[0],
                    "username": sender_profile.username,
                    "avatar": f"/{sender_profile.avatar}" if sender_profile.avatar else None
                })
        
        print(f"用户 {user_id} 有 {unread_count} 条未读消息")
        return {
            "unread_count": unread_count,
            "senders": sender_list
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"获取未读消息失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"获取未读消息失败: {str(e)}")

# ==================== 通知功能 API ====================

@app.get("/notifications/{user_id}")
def get_notifications(user_id: int, db: Session = Depends(get_db)):
    """
    获取用户的通知列表
    """
    try:
        print(f"获取用户 {user_id} 的通知列表")
        
        # 验证用户是否存在
        user = db.query(UserLogin).filter(UserLogin.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 获取通知列表
        notifications = db.query(Notification).filter(
            Notification.user_id == user_id
        ).order_by(Notification.create_time.desc()).all()
        
        # 构建响应
        result = []
        for notification in notifications:
            # 获取相关用户信息
            related_user_info = None
            if notification.related_user_id:
                related_user = db.query(UserProfile).filter(
                    UserProfile.user_id == notification.related_user_id
                ).first()
                if related_user:
                    related_user_info = {
                        "user_id": related_user.user_id,
                        "username": related_user.username,
                        "avatar": f"/{related_user.avatar}" if related_user.avatar else None
                    }
            
            result.append({
                "notification_id": notification.notification_id,
                "type": notification.type,
                "title": notification.title,
                "content": notification.content,
                "related_user": related_user_info,
                "related_id": notification.related_id,
                "is_read": notification.is_read,
                "create_time": notification.create_time.isoformat()
            })
        
        print(f"返回 {len(result)} 条通知")
        return {
            "notifications": result,
            "total_count": len(result)
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"获取通知列表失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"获取通知列表失败: {str(e)}")

@app.put("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, user_id: int, db: Session = Depends(get_db)):
    """
    标记通知为已读
    """
    try:
        print(f"标记通知 {notification_id} 为已读")
        
        # 验证通知是否存在且属于该用户
        notification = db.query(Notification).filter(
            Notification.notification_id == notification_id,
            Notification.user_id == user_id
        ).first()
        
        if not notification:
            raise HTTPException(status_code=404, detail="通知不存在")
        
        # 标记为已读
        notification.is_read = True
        db.commit()
        
        print(f"通知 {notification_id} 已标记为已读")
        return {
            "message": "通知已标记为已读"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"标记通知已读失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"标记通知已读失败: {str(e)}")

@app.put("/notifications/{user_id}/read-all")
def mark_all_notifications_read(user_id: int, db: Session = Depends(get_db)):
    """
    标记所有通知为已读
    """
    try:
        print(f"标记用户 {user_id} 的所有通知为已读")
        
        # 验证用户是否存在
        user = db.query(UserLogin).filter(UserLogin.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 标记所有通知为已读
        db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({"is_read": True})
        db.commit()
        
        print(f"用户 {user_id} 的所有通知已标记为已读")
        return {
            "message": "所有通知已标记为已读"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"标记所有通知已读失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"标记所有通知已读失败: {str(e)}")

@app.get("/notifications/{user_id}/unread-count")
def get_unread_notifications_count(user_id: int, db: Session = Depends(get_db)):
    """
    获取用户的未读通知数量
    """
    try:
        print(f"获取用户 {user_id} 的未读通知数量")
        
        # 验证用户是否存在
        user = db.query(UserLogin).filter(UserLogin.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 统计未读通知数量
        unread_count = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).count()
        
        print(f"用户 {user_id} 有 {unread_count} 条未读通知")
        return {
            "unread_count": unread_count
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"获取未读通知数量失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"获取未读通知数量失败: {str(e)}")
