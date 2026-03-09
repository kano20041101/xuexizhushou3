from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from datetime import datetime
from database.database import Base


class Post(Base):
    __tablename__ = 'posts'
    
    post_id = Column(Integer, primary_key=True, autoincrement=True, comment='帖子ID')
    user_id = Column(Integer, ForeignKey('user_login.user_id', ondelete='CASCADE'), nullable=False, comment='作者ID')
    title = Column(String(255), nullable=False, comment='帖子标题')
    content = Column(Text, nullable=False, comment='帖子内容')
    category = Column(String(50), nullable=False, comment='帖子分类')
    view_count = Column(Integer, default=0, nullable=False, comment='浏览量')
    like_count = Column(Integer, default=0, nullable=False, comment='点赞数')
    comment_count = Column(Integer, default=0, nullable=False, comment='评论数')
    is_deleted = Column(Boolean, default=False, nullable=False, comment='是否删除')
    create_time = Column(DateTime, default=func.now(), nullable=False, comment='创建时间')
    update_time = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False, comment='更新时间')
    
    # 关联关系
    comments = relationship('Comment', back_populates='post', cascade='all, delete-orphan', lazy=True)
    files = relationship('PostFile', back_populates='post', cascade='all, delete-orphan', lazy=True)


class Comment(Base):
    __tablename__ = 'comments'
    
    comment_id = Column(Integer, primary_key=True, autoincrement=True, comment='评论ID')
    post_id = Column(Integer, ForeignKey('posts.post_id', ondelete='CASCADE'), nullable=False, comment='帖子ID')
    user_id = Column(Integer, ForeignKey('user_login.user_id', ondelete='CASCADE'), nullable=False, comment='评论者ID')
    parent_comment_id = Column(Integer, ForeignKey('comments.comment_id', ondelete='CASCADE'), nullable=True, comment='父评论ID')
    content = Column(Text, nullable=False, comment='评论内容')
    like_count = Column(Integer, default=0, nullable=False, comment='点赞数')
    is_deleted = Column(Boolean, default=False, nullable=False, comment='是否删除')
    create_time = Column(DateTime, default=func.now(), nullable=False, comment='创建时间')
    
    # 关联关系
    post = relationship('Post', back_populates='comments')
    # 移除author关系，在API层面手动查询作者信息
    # 自引用关系 - 父评论
    parent = relationship('Comment', remote_side=[comment_id], backref='replies', lazy=True)


class PostFile(Base):
    __tablename__ = 'post_files'
    
    post_file_id = Column(Integer, primary_key=True, autoincrement=True, comment='帖子文件ID')
    post_id = Column(Integer, ForeignKey('posts.post_id', ondelete='CASCADE'), nullable=False, comment='帖子ID')
    file_name = Column(String(255), nullable=False, comment='原始文件名')
    file_path = Column(String(500), nullable=False, comment='文件存储路径')
    file_type = Column(String(50), nullable=False, comment='文件类型')
    file_size = Column(Integer, nullable=False, comment='文件大小（字节）')
    
    # 关联关系
    post = relationship('Post', back_populates='files')


class PostLike(Base):
    __tablename__ = 'post_likes'
    
    like_id = Column(Integer, primary_key=True, autoincrement=True, comment='点赞ID')
    post_id = Column(Integer, ForeignKey('posts.post_id', ondelete='CASCADE'), nullable=False, comment='帖子ID')
    user_id = Column(Integer, ForeignKey('user_login.user_id', ondelete='CASCADE'), nullable=False, comment='点赞用户ID')
    create_time = Column(DateTime, default=func.now(), nullable=False, comment='点赞时间')
    
    # 关联关系
    post = relationship('Post', backref='likes')


class PostFavorite(Base):
    __tablename__ = 'post_favorites'
    
    favorite_id = Column(Integer, primary_key=True, autoincrement=True, comment='收藏ID')
    post_id = Column(Integer, ForeignKey('posts.post_id', ondelete='CASCADE'), nullable=False, comment='帖子ID')
    user_id = Column(Integer, ForeignKey('user_login.user_id', ondelete='CASCADE'), nullable=False, comment='收藏用户ID')
    create_time = Column(DateTime, default=func.now(), nullable=False, comment='收藏时间')
    
    # 关联关系
    post = relationship('Post', backref='favorites')
