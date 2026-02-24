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

class PriceHistory(SQLModel, table=True):
    __tablename__ = "price_histories"
    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="products.id")
    price: int
    scraped_at: datetime = Field(default_factory=datetime.now)
