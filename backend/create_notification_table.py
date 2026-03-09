import sys
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from database.database import engine
from sqlalchemy import text

# 创建 notifications 表
with engine.connect() as connection:
    try:
        # 检查表是否已存在
        result = connection.execute(text("SHOW TABLES LIKE 'notifications'"))
        if result.fetchone():
            print("表 notifications 已存在")
        else:
            # 创建表
            connection.execute(text("""
                CREATE TABLE notifications (
                    notification_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '通知ID',
                    user_id INT NOT NULL COMMENT '接收通知的用户ID',
                    type VARCHAR(20) NOT NULL COMMENT '通知类型：follow, message, like, comment',
                    title VARCHAR(100) NOT NULL COMMENT '通知标题',
                    content VARCHAR(500) NOT NULL COMMENT '通知内容',
                    related_user_id INT COMMENT '相关用户ID（如关注者、消息发送者）',
                    related_id INT COMMENT '相关ID（如帖子ID、评论ID）',
                    is_read BOOLEAN DEFAULT FALSE NOT NULL COMMENT '是否已读',
                    create_time DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL COMMENT '创建时间',
                    FOREIGN KEY (user_id) REFERENCES user_login(user_id) ON DELETE CASCADE,
                    FOREIGN KEY (related_user_id) REFERENCES user_login(user_id) ON DELETE SET NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户通知表'
            """))
            connection.commit()
            print("成功创建表 notifications")
    except Exception as e:
        print(f"错误: {e}")
