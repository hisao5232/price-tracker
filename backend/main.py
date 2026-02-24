from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, SQLModel
from sqlalchemy import text
from datetime import datetime
from typing import List
import re
import httpx
import os

from database import get_db, engine
from models import Product, PriceHistory
from scraper import scrape_site

# .envから取得
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")

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
        await conn.run_sync(SQLModel.metadata.create_all)

@app.post("/track")
async def track_product(url: str, db: AsyncSession = Depends(get_db)):
    match = re.search(r'(m\d{11})', url)
    if not match:
        raise HTTPException(status_code=400, detail="有効なURLが見つかりませんでした")
    
    item_id = match.group(1)
    clean_url = f"https://jp.mercari.com/item/{item_id}"

    result = await scrape_site(clean_url)
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])

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

async def send_discord_notification(product_name, old_price, new_price, url):
    if not DISCORD_WEBHOOK_URL:
        return
    
    content = (
        f"📉 **値下げ通知！**\n"
        f"商品: {product_name}\n"
        f"価格: {old_price:,}円 -> **{new_price:,}円**\n"
        f"URL: {url}"
    )
    
    async with httpx.AsyncClient() as client:
        try:
            # タイムゾーンエラー回避のためtimeoutを長めに設定
            await client.post(DISCORD_WEBHOOK_URL, json={"content": content}, timeout=10.0)
        except Exception as e:
            print(f"Discord通知失敗: {e}")

@app.post("/products/check-all")
async def check_all_products(db: AsyncSession = Depends(get_db)):
    statement = select(Product)
    results = await db.execute(statement)
    products = results.scalars().all()
    
    updated_count = 0
    for p in products:
        history_stmt = select(PriceHistory).where(PriceHistory.product_id == p.id).order_by(text("scraped_at DESC")).limit(1)
        h_result = await db.execute(history_stmt)
        latest_history = h_result.scalar_one_or_none()
        old_price = latest_history.price if latest_history else None

        result = await scrape_site(p.url)
        if result["status"] == "error":
            continue
            
        new_price = result["price"]
        
        if old_price is None or new_price != old_price:
            new_history = PriceHistory(
                product_id=p.id,
                price=new_price,
                scraped_at=datetime.now()
            )
            db.add(new_history)
            
            if old_price and new_price < old_price:
                await send_discord_notification(p.name, old_price, new_price, p.url)
            
            updated_count += 1
            
    await db.commit()
    return {"message": f"{updated_count}件の商品を更新しました"}
    