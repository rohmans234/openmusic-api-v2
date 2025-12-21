const fs = require('fs').promises;
const path = require('path');
const pool = require('./postgres/pool');
const NotFoundError = require('../exceptions/NotFoundError');
const InvariantError = require('../exceptions/InvariantError');

class AlbumCoverService {
  constructor() {
    // Tentukan tipe penyimpanan: 'local' atau 's3'
    this._storageType = process.env.STORAGE_TYPE || 'local';
    this._uploadDir = path.join(__dirname, '../uploads/file/images');

    // Initialize S3 jika diperlukan
    if (this._storageType === 's3') {
      const AWS = require('aws-sdk');
      this._s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
      });
      this._bucketName = process.env.AWS_BUCKET_NAME;
    }
  }

  async uploadCover(albumId, file) {
    // 1. Validasi album exists
    const albumQuery = {
      text: 'SELECT id FROM albums WHERE id = $1',
      values: [albumId],
    };
    const albumResult = await pool.query(albumQuery);
    if (!albumResult.rows.length) {
      throw new NotFoundError('Album tidak ditemukan');
    }

    // 2. Validasi file MIME type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new InvariantError('Tipe file harus berupa gambar (JPEG, PNG, GIF, WebP)');
    }

    // 3. Validasi ukuran file (max 512KB)
    const maxSize = 512000; // 512KB
    if (file.size > maxSize) {
      throw new InvariantError(`Ukuran file tidak boleh melebihi 512KB. Ukuran file Anda: ${file.size} bytes`);
    }

    let coverUrl;

    if (this._storageType === 's3') {
      coverUrl = await this._uploadToS3(albumId, file);
    } else {
      coverUrl = await this._uploadToLocal(albumId, file);
    }

    // 4. Simpan coverUrl ke database
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
    // Buat direktori jika belum ada
    try {
      await fs.mkdir(this._uploadDir, { recursive: true });
    } catch (error) {
      // Direktori mungkin sudah ada
    }

    // Generate nama file yang unik
    const fileExtension = path.extname(file.filename);
    const fileName = `${albumId}-${Date.now()}${fileExtension}`;
    const filePath = path.join(this._uploadDir, fileName);

    // Simpan file
    await fs.writeFile(filePath, file.data);

    // Return relative URL untuk akses via HTTP
    const coverUrl = `/uploads/images/${fileName}`;
    return coverUrl;
  }

  async _uploadToS3(albumId, file) {
    const fileExtension = path.extname(file.filename);
    const fileName = `album-covers/${albumId}-${Date.now()}${fileExtension}`;

    const params = {
      Bucket: this._bucketName,
      Key: fileName,
      Body: file.data,
      ContentType: file.mimetype,
      ACL: 'public-read',
    };

    try {
      const result = await this._s3.upload(params).promise();
      return result.Location; // URL publik dari S3
    } catch (error) {
      throw new InvariantError(`Gagal upload ke S3: ${error.message}`);
    }
  }
}

module.exports = AlbumCoverService;
