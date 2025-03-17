# İlan Paylaşım Platformu - Server

Bu proje, İlan Paylaşım Platformu'nun socket.io tabanlı mesajlaşma sunucusudur.

## Kurulum

1. Gerekli paketleri yükleyin:

```bash
npm install
```

2. `.env.example` dosyasını `.env` olarak kopyalayın ve gerekli ortam değişkenlerini ayarlayın.

```bash
cp .env.example .env
```

## Çalıştırma

Geliştirme modunda çalıştırmak için:

```bash
npm run dev
```

Prodüksiyon modunda çalıştırmak için:

```bash
npm start
```

## Özellikler

- Socket.io ile gerçek zamanlı mesajlaşma
- Kullanıcılar arası özel mesajlaşma
- Mesaj okundu bildirimleri
- Uygunsuz içerik filtresi
- Zamanlanmış görevler (örn. süresi dolan ilanları işaretleme)

## Ortam Değişkenleri

| Değişken | Açıklama |
|----------|----------|
| DATABASE_URL | PostgreSQL veritabanı bağlantı URL'si |
| NEXTAUTH_SECRET | JWT token imzalama anahtarı |
| NEXT_PUBLIC_APP_URL | Client uygulamasının URL'si (CORS için) |
| PORT | Sunucunun çalışacağı port (default: 3001) |
| NODE_ENV | Çalışma ortamı (development veya production) |

## Docker ile Deployment

```bash
# Docker imajı oluşturma
docker build -t ilan-paylasim-server .

# Docker container'ı çalıştırma
docker run -p 3001:3001 --env-file .env ilan-paylasim-server
``` 