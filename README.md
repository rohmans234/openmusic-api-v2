# OpenMusic API v3

Ini adalah versi 3 dari OpenMusic API yang mengimplementasikan fitur-fitur baru termasuk:
- Server-side caching untuk album likes menggunakan Redis
- Upload sampul album ke File System atau S3
- Ekspor daftar lagu playlist via email menggunakan RabbitMQ

## Prerequisites

- Node.js v22 (LTS)
- PostgreSQL 12+
- Redis
- RabbitMQ
- npm atau yarn

## Setup

### 1. Environment Variables

Salin file `.env.example` menjadi `.env` dan sesuaikan konfigurasi Anda:

```bash
cp .env.example .env
```

Edit `.env` dengan nilai-nilai yang sesuai:
- Database connection string
- JWT secret keys
- RabbitMQ server URL
- Redis server host
- SMTP credentials untuk email
- AWS S3 credentials (jika menggunakan S3)

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

Jalankan migrations untuk membuat tabel database:

```bash
npm run migrate up
```

### 4. Menjalankan Server

Untuk development:
```bash
npm run dev
```

Untuk production:
```bash
npm start
```

Server akan berjalan di `http://localhost:5000`

### 5. Menjalankan Consumer

Di terminal lain, jalankan consumer untuk memproses ekspor playlist:

```bash
npm run consumer:dev
```

Atau untuk production:
```bash
npm run consumer
```

## API Endpoints

### Albums

#### Tambah Album
```http
POST /albums
Content-Type: application/json

{
  "name": "Viva la Vida",
  "year": 2008
}
```

#### Get Album by ID
```http
GET /albums/{id}
```

Response akan include `coverUrl` jika album sudah memiliki sampul.

#### Update Album
```http
PUT /albums/{id}
Content-Type: application/json

{
  "name": "Updated Album Name",
  "year": 2024
}
```

#### Delete Album
```http
DELETE /albums/{id}
```

#### Upload Album Cover (Kriteria 2)
```http
POST /albums/{id}/covers
Content-Type: multipart/form-data

Form data:
- cover: [image file, max 512KB, JPEG/PNG/GIF/WebP]
```

### Songs

#### Tambah Song
```http
POST /songs
Content-Type: application/json

{
  "title": "Life in Technicolor",
  "year": 2002,
  "performer": "Coldplay",
  "genre": "Rock",
  "duration": 243,
  "albumId": "album-Mk8AnmCp210PwT6B"
}
```

#### Get Songs (GET /songs)

#### Update Song
```http
PUT /songs/{id}
```

#### Delete Song
```http
DELETE /songs/{id}
```

### Users

#### Registrasi
```http
POST /users
Content-Type: application/json

{
  "username": "johndoe",
  "password": "secret",
  "fullname": "John Doe"
}
```

#### Login
```http
POST /authentications
Content-Type: application/json

{
  "username": "johndoe",
  "password": "secret"
}
```

### Playlists

#### Buat Playlist (Auth required)
```http
POST /playlists
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "My Favorite Songs"
}
```

#### Get Playlists (Auth required)
```http
GET /playlists
Authorization: Bearer {access_token}
```

#### Tambah Lagu ke Playlist (Auth required)
```http
POST /playlists/{playlistId}/songs
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "songId": "song-Qbax5Oy7L8WKf74l"
}
```

#### Get Lagu dalam Playlist (Auth required)
```http
GET /playlists/{playlistId}/songs
Authorization: Bearer {access_token}
```

#### Hapus Lagu dari Playlist (Auth required)
```http
DELETE /playlists/{playlistId}/songs
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "songId": "song-Qbax5Oy7L8WKf74l"
}
```

#### Get Aktivitas Playlist (Auth required)
```http
GET /playlists/{playlistId}/activities
Authorization: Bearer {access_token}
```

#### Ekspor Playlist (Kriteria 1 - Auth required)
```http
POST /export/playlists/{playlistId}
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "targetEmail": "user@example.com"
}
```

Response:
```json
{
  "status": "success",
  "message": "Permintaan Anda sedang kami proses"
}
```

### Album Likes (Kriteria 3)

#### Like Album (Auth required)
```http
POST /albums/{id}/likes
Authorization: Bearer {access_token}
```

Response: 201 Created

#### Unlike Album (Auth required)
```http
DELETE /albums/{id}/likes
Authorization: Bearer {access_token}
```

#### Get Album Likes (Kriteria 4 - Cached)
```http
GET /albums/{id}/likes
```

Response:
```json
{
  "status": "success",
  "data": {
    "likes": 5
  }
}
```

**Note:** Jika data dari cache, response akan memiliki header `X-Data-Source: cache`. Cache berlaku selama 30 menit.

## Environment Variables Detail

| Variable | Description | Example |
|----------|-------------|---------|
| PORT | Port server | 5000 |
| HOST | Host server | localhost |
| DATABASE_URL | PostgreSQL connection string | postgres://user:pass@localhost:5432/openmusic |
| ACCESS_TOKEN_KEY | Secret key untuk JWT | your-secret-key |
| ACCESS_TOKEN_AGE | Token expiration time (seconds) | 1800 |
| RABBITMQ_SERVER | RabbitMQ connection URL | amqp://guest:guest@localhost:5672 |
| REDIS_SERVER | Redis server host | localhost |
| SMTP_HOST | SMTP server host | smtp.gmail.com |
| SMTP_PORT | SMTP server port | 587 |
| SMTP_USER | Email pengirim | your-email@gmail.com |
| SMTP_PASSWORD | Email password | your-app-password |
| STORAGE_TYPE | Tipe storage (local/s3) | local |
| AWS_ACCESS_KEY_ID | AWS access key (jika S3) | - |
| AWS_SECRET_ACCESS_KEY | AWS secret key (jika S3) | - |
| AWS_REGION | AWS region (jika S3) | ap-southeast-1 |
| AWS_BUCKET_NAME | S3 bucket name (jika S3) | - |

## Architecture

### Database Structure

- **albums**: Menyimpan data album dengan kolom `coverUrl` untuk URL sampul
- **songs**: Menyimpan data lagu dengan foreign key ke albums
- **users**: Menyimpan data pengguna
- **playlists**: Menyimpan data playlist dengan owner
- **playlist_songs**: Junction table untuk lagu dalam playlist
- **collaborations**: Kolaborator playlist
- **authentications**: Token refresh
- **user_album_likes**: Menyimpan like user terhadap album

### Services

- **AlbumService**: Manage album operations
- **AlbumCoverService**: Handle file uploads (local/S3)
- **SongsService**: Manage songs
- **PlaylistsService**: Manage playlists
- **AlbumLikesService**: Manage album likes dengan Redis caching
- **CacheService**: Redis caching operations
- **ProducerService**: Send messages to RabbitMQ queue
- **UsersService**: Manage users
- **AuthenticationsService**: Manage tokens

### Consumer

Standalone process yang:
1. Mendengarkan queue `export:playlist` di RabbitMQ
2. Mengambil data playlist dari database
3. Mengirim email dengan data playlist (JSON attachment)
4. Acknowledge message setelah sukses

## Error Handling

API menggunakan custom error handling dengan status codes:
- `200`: OK
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (auth required)
- `403`: Forbidden (insufficient permission)
- `404`: Not Found
- `500`: Internal Server Error

## Features

✅ Album Management (V1)
✅ Song Management (V1)
✅ User Authentication (V1)
✅ Playlist Management (V2)
✅ Playlist Collaborations (V2)
✅ Album Likes (V3)
✅ Album Likes Caching (V3)
✅ Album Cover Upload (V3)
✅ Playlist Export via Email (V3)

## Development

### Linting
```bash
npm run lint
```

### Database Migrations
```bash
# Create new migration
npm run migrate create -- <name>

# Run migrations
npm run migrate up

# Rollback migrations
npm run migrate down
```

## License

ISC
