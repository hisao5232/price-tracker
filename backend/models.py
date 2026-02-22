# backend/models.py
from sqlalchemy import ForeignKey, BigInteger, String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from database import Base

class Product(Base):
    __tablename__ = "products"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    item_id: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    url: Mapped[str] = mapped_column(String)
    image_url: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.now)
    
    # 履歴とのリレーション
    histories: Mapped[list["PriceHistory"]] = relationship(back_populates="product")

class PriceHistory(Base):
    __tablename__ = "price_histories"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    price: Mapped[int] = mapped_column(BigInteger)
    scraped_at: Mapped[datetime] = mapped_column(default=datetime.now)
    
    product: Mapped["Product"] = relationship(back_populates="histories")
    