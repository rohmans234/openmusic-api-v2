const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');

class AlbumLikesService {
  constructor(pool, cacheService) {
    this._pool = pool;
    this._cacheService = cacheService;
  }

  async addAlbumLike(albumId, userId) {
    // 1. Pastikan album ada
    const queryCheckAlbum = {
      text: 'SELECT id FROM albums WHERE id = $1',
      values: [albumId],
    };
    const resultAlbum = await this._pool.query(queryCheckAlbum);
    if (!resultAlbum.rows.length) throw new NotFoundError('Album tidak ditemukan');

    // 2. Cek apakah sudah pernah like (Database UNIQUE constraint juga akan menjaga ini)
    const queryCheckLike = {
      text: 'SELECT id FROM user_album_likes WHERE user_id = $1 AND album_id = $2',
      values: [userId, albumId],
    };
    const resultLike = await this._pool.query(queryCheckLike);
    if (resultLike.rows.length) throw new InvariantError('Anda sudah menyukai album ini');

    const id = `like-${nanoid(16)}`;
    const query = {
      text: 'INSERT INTO user_album_likes VALUES($1, $2, $3) RETURNING id',
      values: [id, userId, albumId],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) throw new InvariantError('Gagal menyukai album');

    // 3. Hapus cache (Kriteria 4)
    await this._cacheService.delete(`likes:${albumId}`);
    return result.rows[0].id;
  }

  async deleteAlbumLike(albumId, userId) {
    const query = {
      text: 'DELETE FROM user_album_likes WHERE user_id = $1 AND album_id = $2 RETURNING id',
      values: [userId, albumId],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) throw new NotFoundError('Gagal batal menyukai. Like tidak ditemukan');

    // Hapus cache (Kriteria 4)
    await this._cacheService.delete(`likes:${albumId}`);
  }

  async getAlbumLikes(albumId) {
    try {
      // 1. Coba ambil dari cache
      const result = await this._cacheService.get(`likes:${albumId}`);
      return {
        likes: parseInt(result, 10),
        source: 'cache', // Untuk menandai sumber data (Kriteria 4)
      };
    } catch (error) {
      // 2. Jika gagal/tidak ada, ambil dari database
      const query = {
        text: 'SELECT COUNT(id) FROM user_album_likes WHERE album_id = $1',
        values: [albumId],
      };

      const result = await this._pool.query(query);
      const likesCount = parseInt(result.rows[0].count, 10);

      // 3. Simpan ke cache untuk permintaan berikutnya
      await this._cacheService.set(`likes:${albumId}`, likesCount);

      return {
        likes: likesCount,
        source: 'database',
      };
    }
  }
}

module.exports = AlbumLikesService;