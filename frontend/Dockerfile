# 軽量なNode.jsイメージを使用
FROM node:20-slim

WORKDIR /app

# パッケージ管理ファイルをコピー
COPY package.json package-lock.json* ./

# 依存関係をインストール
RUN npm install

# アプリケーションコードをコピー
COPY . .

# Next.js のデフォルトポート
EXPOSE 3000

# 開発モードで起動（docker-composeのvolumesでコード変更が即反映されます）
CMD ["npm", "run", "dev"]
