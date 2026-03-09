import sys
from pathlib import Path

backend_dir = Path(__file__).parent / 'backend'
sys.path.insert(0, str(backend_dir))

from database.database import engine, Base, SessionLocal
from models.level_definition import LevelDefinition

def init_levels():
    db = SessionLocal()
    try:
        print("开始初始化等级定义...")
        
        levels = [
            LevelDefinition(level_number=1, required_exp=100),
            LevelDefinition(level_number=2, required_exp=150),
            LevelDefinition(level_number=3, required_exp=200),
            LevelDefinition(level_number=4, required_exp=250),
            LevelDefinition(level_number=5, required_exp=300),
            LevelDefinition(level_number=6, required_exp=350),
            LevelDefinition(level_number=7, required_exp=400),
        ]
        
        for level in levels:
            existing = db.query(LevelDefinition).filter(LevelDefinition.level_number == level.level_number).first()
            if not existing:
                db.add(level)
                print(f"添加等级 {level.level_number}，所需经验: {level.required_exp}")
            else:
                print(f"等级 {level.level_number} 已存在，跳过")
        
        db.commit()
        print("等级定义初始化完成！")
        
    except Exception as e:
        print(f"初始化失败: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_levels()
