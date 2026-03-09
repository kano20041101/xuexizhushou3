import sys
from pathlib import Path

backend_dir = Path(__file__).parent / 'backend'
sys.path.insert(0, str(backend_dir))

from database.database import SessionLocal
from models.user_login import UserLogin
from models.user_level import UserLevel

def init_user_levels():
    db = SessionLocal()
    try:
        print("开始为现有用户初始化等级记录...")
        
        users = db.query(UserLogin).all()
        print(f"找到 {len(users)} 个用户")
        
        init_count = 0
        skip_count = 0
        
        for user in users:
            existing = db.query(UserLevel).filter(UserLevel.user_id == user.user_id).first()
            
            if not existing:
                user_level = UserLevel(
                    user_id=user.user_id,
                    current_level=1,
                    current_exp=0,
                    total_exp=0
                )
                db.add(user_level)
                init_count += 1
                print(f"为用户 {user.user_id} 初始化等级记录")
            else:
                skip_count += 1
                print(f"用户 {user.user_id} 已有等级记录，跳过")
        
        db.commit()
        print(f"\n初始化完成！")
        print(f"新初始化用户: {init_count}")
        print(f"跳过用户: {skip_count}")
        
    except Exception as e:
        print(f"初始化失败: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_user_levels()
