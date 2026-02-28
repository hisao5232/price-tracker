#!/bin/bash
set -e

# DB(tracker-db)の5432ポートが開くまで待機
echo "Waiting for PostgreSQL to be ready..."
until nc -z tracker-db 5432; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

echo "PostgreSQL is up - executing table creation"

# インラインでテーブル作成を実行
python -c "
import asyncio
from database import engine
from sqlmodel import SQLModel
import models

async def init():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

if __name__ == '__main__':
    asyncio.run(init())
"

echo "Tables created successfully"

# アプリケーション起動
echo "Starting FastAPI server..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
