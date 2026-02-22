FROM python:3.11-slim

# システムの依存関係（Playwrightの実行に必要）をインストール
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Playwright ブラウザとシステム依存ライブラリのインストール
RUN playwright install --with-deps chromium

COPY . .

# 8000ポートで起動
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
