import sys
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from database.database import engine
from sqlalchemy import text

# 创建 user_messages 表
with engine.connect() as connection:
    try:
        # 检查表是否已存在
        result = connection.execute(text("SHOW TABLES LIKE 'user_messages'"))
        if result.fetchone():
            print("表 user_messages 已存在")
        else:
            # 创建表
            connection.execute(text("""
                CREATE TABLE user_messages (
                    message_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '消息ID',
                    sender_id INT NOT NULL COMMENT '发送者ID',
                    receiver_id INT NOT NULL COMMENT '接收者ID',
                    content VARCHAR(1000) NOT NULL COMMENT '消息内容',
                    is_read BOOLEAN DEFAULT FALSE NOT NULL COMMENT '是否已读',
                    create_time DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL COMMENT '发送时间',
                    FOREIGN KEY (sender_id) REFERENCES user_login(user_id) ON DELETE CASCADE,
                    FOREIGN KEY (receiver_id) REFERENCES user_login(user_id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户私信消息表'
            """))
            connection.commit()
            print("成功创建表 user_messages")
    except Exception as e:
        print(f"错误: {e}")
