from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, desc, SQLModel
from datetime import datetime
from typing import List

from database import get_db, engine, Base
from models import Product, PriceHistory
from scraper import scrape_site

app = FastAPI()

# CORSの設定を追加
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 開発中は一旦すべて許可。本番はURLを指定
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 起動時にテーブルを作成（簡易的なマイグレーション）
@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        # SQLModelのメタデータを使用してテーブルを作成
        await conn.run_sync(SQLModel.metadata.create_all)

@app.post("/track")
async def track_product(url: str, db: AsyncSession = Depends(get_db)):
    # 1. スクレイピング実行
    result = await scrape_site(url)
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])

    # item_id を URL から抽出（またはスクレイパー側で取得した物を使用）
    # ここでは簡易的にURLをID代わりに使うか、スクレイパーの結果に含める
    item_id = url.split('/')[-1] 

    # 2. 商品の存在確認
    statement = select(Product).where(Product.item_id == item_id)
    db_result = await db.execute(statement)
    product = db_result.scalar_one_or_none()

    if not product:
        # 新規登録
        product = Product(
            item_id=item_id,
            name=result["name"],
            url=url,
            image_url=result["image_url"]
        )
        db.add(product)
        await db.flush() # IDを確定させる
    else:
        # 既存更新
        product.name = result["name"]
        product.image_url = result["image_url"]

    # 3. 価格履歴の保存
    new_history = PriceHistory(
        product_id=product.id,
        price=result["price"],
        scraped_at=datetime.now()
    )
    db.add(new_history)
    
    await db.commit()
    await db.refresh(product)
    
    return {"message": "Success", "product": result}

# 追跡リストを取得するエンドポイント
@app.get("/products", response_model=List[Product])
async def get_products(db: AsyncSession = Depends(get_db)):
    statement = select(Product).order_by(desc(Product.created_at))
    results = await db.execute(statement)
    products = results.scalars().all()
    return products
