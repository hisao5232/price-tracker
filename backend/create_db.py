import asyncio
from database import engine, Base
import models  # これをインポートすることでBaseにモデルが登録されます

async def init_db():
    async with engine.begin() as conn:
        # すべてのテーブル（products, price_histories）を作成
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created successfully!")

if __name__ == "__main__":
    asyncio.run(init_db())

