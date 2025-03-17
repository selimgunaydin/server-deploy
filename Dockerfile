FROM node:20-alpine

WORKDIR /app

# Bağımlılıkları kopyala ve yükle
COPY package*.json ./
RUN npm install

# Uygulama dosyalarını kopyala
COPY . .

# Uygulama portunu belirt
EXPOSE 3001

# Uygulamayı başlat
CMD ["npm", "start"] 