#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库迁移脚本：为 user_profile 表添加 signature 字段
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

# 添加项目根目录到 Python 路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.database import DATABASE_URL

def add_signature_column():
    """为 user_profile 表添加 signature 字段"""
    try:
        # 创建数据库引擎
        engine = create_engine(DATABASE_URL)
        
        # 连接数据库
        with engine.connect() as connection:
            # 检查字段是否已存在
            result = connection.execute(text("""
                SHOW COLUMNS FROM user_profile LIKE 'signature'
            """))
            
            if not result.fetchone():
                # 添加 signature 字段
                connection.execute(text("""
                    ALTER TABLE user_profile
                    ADD COLUMN signature VARCHAR(200) COMMENT '个性签名'
                """))
                print("✓ 成功为 user_profile 表添加 signature 字段")
            else:
                print("ℹ signature 字段已存在，跳过添加")
                
            # 提交更改
            connection.commit()
            
    except SQLAlchemyError as e:
        print(f"✗ 数据库操作失败: {e}")
        return False
    except Exception as e:
        print(f"✗ 发生错误: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("开始执行数据库迁移...")
    success = add_signature_column()
    
    if success:
        print("\n✅ 数据库迁移完成！")
    else:
        print("\n❌ 数据库迁移失败，请检查错误信息。")
        sys.exit(1)