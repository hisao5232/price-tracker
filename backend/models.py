from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional

class Product(SQLModel, table=True):
    __tablename__ = "products"
    id: Optional[int] = Field(default=None, primary_key=True)
    item_id: str = Field(unique=True, index=True)
    name: str
    url: str
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)

class PriceHistory(Base):
    __tablename__ = "price_histories"
    
    id = Column(Integer, primary_key=True, index=True)
    # ↓ ondelete="CASCADE" を追加
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"))
    price = Column(Integer)
    scraped_at = Column(DateTime, default=datetime.now)
    
