FROM node:20-alpine

WORKDIR /app

# Bağımlılıkları kopyala ve yükle
COPY package*.json ./
RUN npm install

# Uygulama dosyalarını kopyala
COPY . .

# TypeScript derle
RUN npm run build

# Uygulama portunu belirt
EXPOSE 3001

# Uygulamayı başlat - dist klasöründen çalıştır
CMD ["node", "dist/server.js"] 