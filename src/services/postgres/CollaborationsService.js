const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');

class CollaborationsService {
  constructor() {
    this._pool = new Pool();
  }

  async addCollaboration(playlistId, userId) {
    const id = `collab-${nanoid(16)}`;
    const query = {
      text: 'INSERT INTO collaborations VALUES($1, $2, $3) RETURNING id',
      values: [id, playlistId, userId],
    };
    try {
      const result = await this._pool.query(query);
      if (!result.rows.length) throw new InvariantError('Kolaborasi gagal ditambahkan');
      return result.rows[0].id;
    } catch (err) {
      // translate FK violation to NotFound so handler returns 404 instead of 500
      if (err && err.code === '23503') {
        throw new NotFoundError('Pengguna tidak ditemukan');
      }
      throw err;
    }
  }

  async verifyCollaborator(playlistId, userId) {
    const query = {
      text: 'SELECT * FROM collaborations WHERE playlist_id = $1 AND user_id = $2',
      values: [playlistId, userId],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) throw new InvariantError('Kolaborasi gagal diverifikasi');
  }
  async deleteCollaboration(playlistId, userId) {
    const query = {
      text: 'DELETE FROM collaborations WHERE playlist_id = $1 AND user_id = $2 RETURNING id',
      values: [playlistId, userId],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) throw new InvariantError('Kolaborasi gagal dihapus');
  }
}
module.exports = CollaborationsService;