from datetime import datetime
from typing import List, Optional
from sqlmodel import SQLModel, Field, Relationship

class Product(SQLModel, table=True):
    __tablename__ = "products"
    id: Optional[int] = Field(default=None, primary_key=True)
    item_id: str = Field(index=True, unique=True)
    name: str
    url: str
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    
    histories: List["PriceHistory"] = Relationship(back_populates="product")

class PriceHistory(SQLModel, table=True):
    __tablename__ = "price_histories"
    id: Optional[int] = Field(default=None, primary_key=True)
    price: int
    scraped_at: datetime = Field(default_factory=datetime.now)
    
    product_id: int = Field(foreign_key="products.id")
    product: Product = Relationship(back_populates="histories")

