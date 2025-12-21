const fs = require('fs'); // Gunakan fs standar untuk streaming
const path = require('path');
const pool = require('./postgres/pool');
const NotFoundError = require('../exceptions/NotFoundError');
const InvariantError = require('../exceptions/InvariantError');

class AlbumCoverService {
  constructor() {
    this._uploadDir = path.join(__dirname, '../uploads/file/images');
    if (!fs.existsSync(this._uploadDir)) {
      fs.mkdirSync(this._uploadDir, { recursive: true }); // Pastikan folder ada
    }
  }

  async uploadCover(albumId, file) {
    // 1. Validasi album ada
    const albumQuery = {
      text: 'SELECT id FROM albums WHERE id = $1',
      values: [albumId],
    };
    const albumResult = await pool.query(albumQuery);
    if (!albumResult.rows.length) {
      throw new NotFoundError('Album tidak ditemukan');
    }

    // 2. Validasi tipe MIME dari objek stream hapi
    const contentType = file.hapi.headers['content-type'];
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(contentType)) {
      throw new InvariantError('Tipe file tidak valid');
    }

    // 3. Simpan file secara lokal menggunakan stream
    const coverUrl = await this._uploadToLocal(albumId, file);

    // 4. Update kolom coverUrl di database
    const updateQuery = {
      text: 'UPDATE albums SET "coverUrl" = $1 WHERE id = $2 RETURNING id',
      values: [coverUrl, albumId],
    };

    const result = await pool.query(updateQuery);
    if (!result.rows.length) {
      throw new InvariantError('Gagal menyimpan cover album');
    }

    return coverUrl;
  }

  async _uploadToLocal(albumId, file) {
    const filename = file.hapi.filename;
    const extension = path.extname(filename);
    const newFileName = `${albumId}-${Date.now()}${extension}`;
    const filePath = path.join(this._uploadDir, newFileName);

    const fileStream = fs.createWriteStream(filePath);

    return new Promise((resolve, reject) => {
      fileStream.on('error', (error) => reject(error));
      file.pipe(fileStream); // Mengalirkan stream ke sistem file
      file.on('end', () => {
        // Mengembalikan URL lengkap agar lulus test Postman
        const port = process.env.PORT || 5000;
        const host = process.env.HOST || 'localhost';
        resolve(`http://${host}:${port}/uploads/images/${newFileName}`);
      });
    });
  }
}

module.exports = AlbumCoverService;