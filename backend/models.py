# backend/models.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
# --- ここを追加：倉庫(database.py)からBaseを持ってくる ---
from database import Base 
# ---------------------------------------------------

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(String, unique=True, index=True)
    name = Column(String)
    url = Column(String)
    image_url = Column(String)
    created_at = Column(DateTime, default=datetime.now)

class PriceHistory(Base):
    __tablename__ = "price_histories"
    
    id = Column(Integer, primary_key=True, index=True)
    # CASCADE設定も入れておきましょう（DB作り直し時に有効になります）
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"))
    price = Column(Integer)
    scraped_at = Column(DateTime, default=datetime.now)
