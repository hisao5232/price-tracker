from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, SQLModel
from sqlalchemy import text
from datetime import datetime
from typing import List
import re

from database import get_db, engine
from models import Product, PriceHistory
from scraper import scrape_site

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        # 更地から作り直す際に、この命令でテーブルが正しく作成されます
        await conn.run_sync(SQLModel.metadata.create_all)

@app.post("/track")
async def track_product(url: str, db: AsyncSession = Depends(get_db)):
    # 1. URLクレンジング
    match = re.search(r'(m\d{11})', url)
    if not match:
        raise HTTPException(status_code=400, detail="有効なURLが見つかりませんでした")
    
    item_id = match.group(1)
    clean_url = f"https://jp.mercari.com/item/{item_id}"

    # 2. スクレイピング
    result = await scrape_site(clean_url)
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])

    # 3. 商品の存在確認
    statement = select(Product).where(Product.item_id == item_id)
    db_result = await db.execute(statement)
    product = db_result.scalar_one_or_none()

    if not product:
        product = Product(
            item_id=item_id,
            name=result["name"],
            url=clean_url,
            image_url=result["image_url"],
            created_at=datetime.now()
        )
        db.add(product)
        await db.flush()
    else:
        product.name = result["name"]
        product.image_url = result["image_url"]

    # 4. 価格履歴保存
    new_history = PriceHistory(
        product_id=product.id,
        price=result["price"],
        scraped_at=datetime.now()
    )
    db.add(new_history)
    await db.commit()
    await db.refresh(product)
    
    return {"message": "Success", "product": result}

@app.get("/products")
async def get_products(db: AsyncSession = Depends(get_db)):
    # text() を使うことで、カラム存在チェックの厳格さを回避しつつ確実にソート
    statement = select(Product).order_by(text("created_at DESC"))
    results = await db.execute(statement)
    products_db = results.scalars().all()
    
    response_data = []
    for p in products_db:
        history_stmt = (
            select(PriceHistory)
            .where(PriceHistory.product_id == p.id)
            .order_by(text("scraped_at DESC"))
            .limit(1)
        )
        h_result = await db.execute(history_stmt)
        latest_history = h_result.scalar_one_or_none()
        
        product_data = p.model_dump()
        product_data["current_price"] = latest_history.price if latest_history else None
        response_data.append(product_data)
            
    return response_data

@app.get("/products/{product_id}/history")
async def get_product_history(product_id: int, db: AsyncSession = Depends(get_db)):
    statement = (
        select(PriceHistory)
        .where(PriceHistory.product_id == product_id)
        .order_by(text("scraped_at ASC"))
    )
    results = await db.execute(statement)
    histories = results.scalars().all()
    return histories
