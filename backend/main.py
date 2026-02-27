from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, SQLModel
from sqlalchemy import text, delete, select, and_
from datetime import datetime
from typing import List
import re
import httpx
import os

from database import get_db, engine
from models import Product, PriceHistory
from scraper import scrape_site, search_items

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
    # デバッグログを追加（これがあればコンテナのログで何が起きているか100%分かります）
    print(f"DEBUG: Received URL: {url}")

    # 1. メルカリ通常商品 (item/m123...)
    # URLの中に 'item/m...' が含まれているかをより柔軟に探す
    item_match = re.search(r'item/(m\d+)', url)
    
    # 2. メルカリShops (shops/product/英数字)
    # ShopsのIDは英数字が混ざるため、[a-zA-Z0-9]+ で取得
    shop_match = re.search(r'shops/product/([a-zA-Z0-9]+)', url)

    if item_match:
        item_id = item_match.group(1)
        clean_url = f"https://jp.mercari.com/item/{item_id}"
        print(f"DEBUG: Matched Standard Item ID: {item_id}")
    elif shop_match:
        item_id = shop_match.group(1)
        clean_url = f"https://jp.mercari.com/shops/product/{item_id}"
        print(f"DEBUG: Matched Shops Product ID: {item_id}")
    else:
        # マッチしなかった理由を詳細に返してフロントで確認できるようにする
        print(f"DEBUG: URL Match Failed. Input was: {url}")
        raise HTTPException(
            status_code=400, 
            detail=f"URL形式が正しくありません。'item/m...' または 'shops/product/...' を含むURLを入力してください。受け取った値: {url}"
        )

    # スクレイピング実行
    result = await scrape_site(clean_url)
    # --- 修正2: スクレイピングがエラーの場合、その理由を返す ---
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=f"解析失敗: {result.get('message')}")

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
        # 価格履歴の取得
        history_stmt = (
            select(PriceHistory)
            .where(PriceHistory.product_id == p.id)
            .order_by(text("scraped_at DESC"))
            .limit(1)
        )
        h_result = await db.execute(history_stmt)
        latest_history = h_result.scalar_one_or_none()
        
        # --- ここを修正：手動で辞書を作る ---
        product_data = {
            "id": p.id,
            "item_id": p.item_id,
            "name": p.name,
            "url": p.url,
            "image_url": p.image_url,
            "current_price": latest_history.price if latest_history else None
        }
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
    
    checked_count = 0   # ← 【追加】チェックした総数
    updated_count = 0   # 価格が変わった（履歴を追加した）数
    deleted_count = 0   # 売り切れで削除した数

    for p in products:
        checked_count += 1  # ループの最初でカウントアップ
        try:
            result = await scrape_site(p.url)
            if result["status"] == "error":
                print(f"一時的なエラーのためスキップ: {p.name}")
                continue

            # 売り切れ時の削除処理
            if result.get("sold_out") is True:
                # ... (中略: 削除ロジック) ...
                deleted_count += 1
                continue

            # 価格更新処理
            new_price = result["price"]
            history_stmt = select(PriceHistory).where(PriceHistory.product_id == p.id).order_by(text("scraped_at DESC")).limit(1)
            h_result = await db.execute(history_stmt)
            latest_history = h_result.scalar_one_or_none()
            
            old_price = latest_history.price if latest_history else None
            
            # 価格が変わった場合のみ履歴を追加
            if old_price is None or new_price != old_price:
                new_history = PriceHistory(
                    product_id=p.id,
                    price=new_price,
                    scraped_at=datetime.now()
                )
                db.add(new_history)
                if old_price and new_price < old_price:
                    await send_discord_notification(p.name, old_price, new_price, p.url)
                await db.commit()
                updated_count += 1
            else:
                # 価格が変わらなくても、最終チェック時刻を記録したい場合はここで処理（任意）
                print(f"価格変更なし: {p.name} (¥{new_price})")

        except Exception as e:
            print(f"商品 {p.name} の処理中にエラーが発生: {e}")
            await db.rollback()
            continue

    return {
        "message": f"全{checked_count}件をチェック：{updated_count}件の価格変更を確認、{deleted_count}件を削除しました"
    }

@app.delete("/products/{product_id}")
async def delete_product(product_id: int, db: AsyncSession = Depends(get_db)):
    # 商品の存在確認
    statement = select(Product).where(Product.id == product_id)
    result = await db.execute(statement)
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="商品が見つかりません")

    # 関連する履歴を先に削除
    await db.execute(
        delete(PriceHistory).where(PriceHistory.product_id == product_id)
    )
    
    # 商品本体を削除
    await db.delete(product)
    await db.commit()
    
    return {"message": f"商品 ID:{product_id} を削除しました"}

@app.get("/search")
async def search(keyword: str):
    """
    キーワードを受け取り、Playwrightを使って商品を検索して返す
    """
    if not keyword:
        return []
    
    # scraper.py の search_items を実行
    results = await search_items(keyword)
    
    # フロントエンドが期待する SearchResult 形式で返却
    return results

@app.post("/track-keyword")
async def track_keyword(keyword: str, db: AsyncSession = Depends(get_db)):
    if not keyword:
        return {"error": "Keyword is empty"}
    
    special_url = f"search://{keyword}"
    
    # 1. 親となる「検索条件カード」の登録/確認
    stmt = select(Product).where(Product.url == special_url)
    result = await db.execute(stmt)
    parent_card = result.scalar_one_or_none()
    
    if not parent_card:
        parent_card = Product(
            name=keyword,
            url=special_url,
            image_url="https://cdn-icons-png.flaticon.com/512/622/622669.png",
            item_id=f"kw-{int(datetime.now().timestamp())}"
        )
        db.add(parent_card)
        # 後で商品と紐付けたい場合はここで flush() してIDを確定させますが、
        # 今回はシンプルに「全商品保存」を優先します。

    # 2. スクレイピング実行（Playwright起動）
    print(f"Starting background scrape for: {keyword}")
    scraped_items = await search_items(keyword)
    
    # 3. 取得した全アイテムをDBに保存（一括処理）
    for item in scraped_items:
        # すでにDBにあるか確認（URLを一意のキーとする）
        item_stmt = select(Product).where(Product.url == item["url"])
        item_result = await db.execute(item_stmt)
        existing_item = item_result.scalar_one_or_none()
        
        if existing_item:
            # すでに存在すれば価格履歴だけ追加
            new_history = PriceHistory(
                product_id=existing_item.id,
                price=item["price"]
            )
            db.add(new_history)
        else:
            # 新規商品ならProductとPriceHistoryを両方作成
            new_product = Product(
                name=item["name"],
                url=item["url"],
                image_url=item["image_url"],
                item_id=item["id"]
            )
            db.add(new_product)
            await db.flush() # IDを確定させる
            
            new_history = PriceHistory(
                product_id=new_product.id,
                price=item["price"]
            )
            db.add(new_history)

    await db.commit()
    return {
        "status": "success", 
        "keyword": keyword, 
        "items_count": len(scraped_items)
    }

# --- 追加: 保存済み商品の中からキーワードでDB検索する ---
@app.get("/products/search-results")
async def get_search_results(keyword: str, db: AsyncSession = Depends(get_db)):
    """
    スクレイピングはせず、DB内の商品名からキーワード一致するものを返す
    """
    if not keyword:
        return []

    # 1. 商品名にキーワードが含まれるものを検索
    # 2. 'search://' (親カード) は除外する
    statement = (
        select(Product)
        .where(
            and_(
                Product.name.icontains(keyword),
                ~Product.url.startswith("search://")
            )
        )
        .order_by(text("created_at DESC"))
    )
    
    results = await db.execute(statement)
    products_db = results.scalars().all()
    
    response_data = []
    for p in products_db:
        # 最新価格を取得
        history_stmt = (
            select(PriceHistory)
            .where(PriceHistory.product_id == p.id)
            .order_by(text("scraped_at DESC"))
            .limit(1)
        )
        h_result = await db.execute(history_stmt)
        latest_history = h_result.scalar_one_or_none()
        
        response_data.append({
            "id": p.id,
            "name": p.name,
            "url": p.url,
            "image_url": p.image_url,
            "price": latest_history.price if latest_history else 0,
            "created_at": p.created_at
        })
            
    return response_data
    