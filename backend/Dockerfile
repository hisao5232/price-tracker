FROM python:3.11-slim

# システムの依存関係（ncが必要）
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install --with-deps chromium

COPY . .

# 実行権限を付与
RUN chmod +x entrypoint.sh

# entrypointを指定
ENTRYPOINT ["./entrypoint.sh"]
