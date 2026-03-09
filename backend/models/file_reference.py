from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database.database import Base
import datetime

class FileReference(Base):
    """文件管理表 - 存储所有上传的参考文件"""
    __tablename__ = 'file_reference'

    file_id = Column(Integer, primary_key=True, autoincrement=True, comment='文件ID（自增，文件唯一标识）')
    user_id = Column(Integer, ForeignKey('user_login.user_id', ondelete='CASCADE'), nullable=False, comment='用户ID（关联user_login.user_id，归属哪个用户的文件）')
    file_name = Column(String(255), nullable=False, comment='原始文件名')
    file_path = Column(String(500), nullable=False, comment='文件存储路径')
    file_type = Column(String(50), nullable=False, comment='文件类型（如：pdf, docx, txt, md）')
    file_size = Column(Integer, nullable=False, comment='文件大小（字节）')
    upload_time = Column(DateTime, nullable=False, default=datetime.datetime.now, comment='上传时间')
    description = Column(Text, nullable=True, comment='文件描述')

    # 关系
    user = relationship("UserLogin", backref="uploaded_files")
    knowledge_files = relationship("KnowledgeFile", back_populates="file", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<FileReference(file_id={self.file_id}, file_name='{self.file_name}', user_id={self.user_id})>"


class KnowledgeFile(Base):
    """知识点-文件关联表 - 实现知识点和文件的多对多关系"""
    __tablename__ = 'knowledge_file'

    kf_id = Column(Integer, primary_key=True, autoincrement=True, comment='关联ID（自增）')
    kp_id = Column(Integer, ForeignKey('knowledge_point.kp_id', ondelete='CASCADE'), nullable=False, comment='知识点ID（关联knowledge_point.kp_id）')
    file_id = Column(Integer, ForeignKey('file_reference.file_id', ondelete='CASCADE'), nullable=False, comment='文件ID（关联file_reference.file_id）')
    reference_note = Column(Text, nullable=True, comment='引用说明（如：重点参考第3章）')
    create_time = Column(DateTime, nullable=False, default=datetime.datetime.now, comment='关联时间')

    # 关系
    knowledge_point = relationship("KnowledgePoint", backref="file_references")
    file = relationship("FileReference", back_populates="knowledge_files")

    def __repr__(self):
        return f"<KnowledgeFile(kf_id={self.kf_id}, kp_id={self.kp_id}, file_id={self.file_id})>"
