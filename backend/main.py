import os
from fastapi import FastAPI, BackgroundTasks, HTTPException
from sqlmodel import SQLModel, create_engine, Session, select
from typing import List, Optional
from datetime import datetime

# 自作のスクレイパーをインポート
# scraper.py に提示されたスクレイピングコードがある前提
from scraper import scrape_site, search_items

app = FastAPI(title="Price Tracker API")

# DB設定 (docker-compose.ymlの環境変数を使用)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:pass@tracker-db:5432/db")
# SQLModel用 (asyncpgを使う場合は少し工夫が必要ですが、まずは導通確認用に同期的な書き方も併記)
# 実際には engine_async を作りますが、起動確認用にシンプルにします

@app.on_event("startup")
async def on_startup():
    # ここでテーブル作成などの初期化処理を行う
    print("API starting up...")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Price Tracker API is running"}

@app.get("/search")
async def search(keyword: str):
    """キーワードで商品を検索する"""
    results = await search_items(keyword)
    if not results:
        raise HTTPException(status_code=404, detail="No items found")
    return {"keyword": keyword, "count": len(results), "items": results}

@app.post("/track")
async def track_url(url: str):
    """特定のURLの商品情報を取得する"""
    result = await scrape_site(url)
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    
    # 本来はここでDBに保存処理を入れる
    return result

# サーバー起動用 (ローカルテスト時)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
    