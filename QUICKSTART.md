# Quick Start Guide - OpenMusic API v3

## Prerequisites

Pastikan Anda sudah menginstall:
- Node.js v22 LTS
- PostgreSQL 12+
- Redis
- RabbitMQ

## Langkah-langkah Setup

### 1. Clone dan Install Dependencies

```bash
# Clone atau extract project
cd openmusic-api-v2

# Install dependencies
npm install
```

### 2. Setup Environment Variables

```bash
# Copy .env.example ke .env
cp .env.example .env

# Edit .env dengan text editor favorit Anda
```

Untuk testing cepat, Anda bisa menggunakan:

```env
# Server
PORT=5000
HOST=localhost

# Database - Sesuaikan dengan PostgreSQL Anda
DATABASE_URL=postgres://postgres:password@localhost:5432/openmusic_db

# JWT Secrets (generate dengan string random)
ACCESS_TOKEN_KEY=your-super-secret-access-key-min-32-chars
REFRESH_TOKEN_KEY=your-super-secret-refresh-key-min-32-chars
ACCESS_TOKEN_AGE=1800

# RabbitMQ (default)
RABBITMQ_SERVER=amqp://guest:guest@localhost:5672

# Redis (default)
REDIS_SERVER=localhost

# Email Setup (Gunakan Gmail App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password-from-google

# Storage
STORAGE_TYPE=local
```

### 3. Setup Database

```bash
# Create database baru (di PostgreSQL)
createdb openmusic_db

# Run migrations
npm run migrate up
```

### 4. Start Server

Di terminal pertama:
```bash
npm run dev
```

Output yang diharapkan:
```
Server berjalan pada http://localhost:5000
```

### 5. Start Consumer (di terminal terpisah)

```bash
npm run consumer:dev
```

Output yang diharapkan:
```
Consumer berhasil terhubung ke RabbitMQ
Consumer dimulai, menunggu pesan...
```

## Testing API

### Method 1: Menggunakan Postman

1. Import file `OpenMusic_API_v3.postman_collection.json` ke Postman
2. Setup environment variables:
   - `accessToken`: Token yang didapat dari login
   - `albumId`: Album ID untuk testing
   - `songId`: Song ID untuk testing
   - `playlistId`: Playlist ID untuk testing

3. Jalankan requests sesuai flow

### Method 2: Menggunakan cURL

#### Register User

```bash
curl -X POST http://localhost:5000/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "password": "password123",
    "fullname": "John Doe"
  }'
```

#### Login

```bash
curl -X POST http://localhost:5000/authentications \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "password": "password123"
  }'
```

Simpan `accessToken` dari response.

#### Create Album

```bash
curl -X POST http://localhost:5000/albums \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Viva la Vida",
    "year": 2008
  }'
```

#### Upload Album Cover

```bash
curl -X POST http://localhost:5000/albums/{albumId}/covers \
  -F "cover=@/path/to/image.jpg"
```

#### Like Album

```bash
curl -X POST http://localhost:5000/albums/{albumId}/likes \
  -H "Authorization: Bearer {accessToken}"
```

#### Get Album Likes (dengan Cache)

```bash
curl -X GET http://localhost:5000/albums/{albumId}/likes \
  -v
```

Perhatikan response headers untuk melihat `X-Data-Source: cache`.

#### Create Playlist

```bash
curl -X POST http://localhost:5000/playlists \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Favorite Songs"
  }'
```

#### Export Playlist

```bash
curl -X POST http://localhost:5000/export/playlists/{playlistId} \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "targetEmail": "user@example.com"
  }'
```

Pesan akan dikirim ke queue dan consumer akan memproses untuk mengirim email.

## Troubleshooting

### Issue: "Cannot connect to database"
- Pastikan PostgreSQL sudah running
- Verify DATABASE_URL di .env
- Check credentials database

### Issue: "RabbitMQ connection failed"
- Pastikan RabbitMQ sudah running
- Check RABBITMQ_SERVER URL di .env
- Default: `amqp://guest:guest@localhost:5672`

### Issue: "Redis connection failed"
- Pastikan Redis sudah running
- Check REDIS_SERVER di .env
- Default: `localhost`

### Issue: "Email tidak terkirim dari consumer"
- Verify SMTP credentials di .env
- Jika pakai Gmail, gunakan App Password (bukan password biasa)
- Check SMTP_HOST dan SMTP_PORT
- Monitor log di console consumer

### Issue: "File upload gagal"
- Pastikan folder `src/uploads/file/images/` ada
- Check permissions folder
- Verify file size < 512KB
- Pastikan MIME type adalah image (JPEG/PNG/GIF/WebP)

## Production Setup

Untuk production:

1. **Gunakan environment variables dari sistem**
   ```bash
   export PORT=5000
   export DATABASE_URL=...
   # etc
   ```

2. **Gunakan process manager seperti PM2**
   ```bash
   npm install -g pm2
   pm2 start src/server.js --name "openmusic-api"
   pm2 start consumer.js --name "openmusic-consumer"
   ```

3. **Setup reverse proxy (Nginx/Apache)**
   - Point ke localhost:5000

4. **Enable HTTPS**
   - Gunakan SSL certificate

5. **Setup database backup**
   - Regular PostgreSQL backups

6. **Monitor logs**
   - Setup centralized logging

## Development Tips

### Enable Linting

```bash
npm run lint
```

### Create New Migration

```bash
npm run migrate create -- add-column-to-table
```

### Rollback Last Migration

```bash
npm run migrate down
```

### Debug Mode

Tambahkan environment variable:
```bash
DEBUG=* npm run dev
```

## API Documentation

Lengkap API documentation tersedia di file `README.md`.

Key features yang diimplementasikan:

✅ **Kriteria 1**: Export Playlist via Email (RabbitMQ + Nodemailer)
- POST `/export/playlists/{playlistId}`
- Kirim JSON file ke email
- Consumer process standalone

✅ **Kriteria 2**: Upload Album Cover
- POST `/albums/{id}/covers`
- Support local storage atau AWS S3
- Max size 512KB
- MIME type validation

✅ **Kriteria 3**: Like/Unlike Album
- POST `/albums/{id}/likes` - Like
- DELETE `/albums/{id}/likes` - Unlike  
- GET `/albums/{id}/likes` - Get count
- Prevent duplicate likes

✅ **Kriteria 4**: Server-Side Cache
- GET `/albums/{id}/likes` dengan Redis caching
- Cache duration: 30 menit
- Custom header `X-Data-Source: cache`
- Auto-invalidate saat ada change

✅ **Kriteria 5**: Maintain V1 & V2 Features
- Semua fitur lama tetap berfungsi
- Album, Song, User, Auth, Playlist management

## Getting Help

Jika ada pertanyaan atau issue, cek:
1. Error messages di console
2. Database connection
3. Service availability (PostgreSQL, Redis, RabbitMQ)
4. Environment variables configuration
