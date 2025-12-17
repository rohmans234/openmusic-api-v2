const pool = require('./postgres/pool');
const { nanoid } = require('nanoid');
const NotFoundError = require('../exeptions/NotFoundError'); 
const InvariantError = require('../exeptions/InvariantError'); 

class AlbumsService {
  async addAlbum({ name, year }) {
    const id = `album-${nanoid(16)}`;
    const query = {
      text: 'INSERT INTO albums(id, name, year) VALUES($1, $2, $3) RETURNING id',
      values: [id, name, year],
    };

    const result = await pool.query(query);

    if (!result.rows.length) {
      throw new InvariantError('Album gagal ditambahkan');
    }

    return result.rows[0].id;
  }

  async getAlbumById(id) {
    const albumQuery = { 
      text: 'SELECT id, name, year FROM albums WHERE id=$1',
      values: [id],
    };

    const songsQuery = { 
      text: 'SELECT id, title, performer FROM songs WHERE album_id=$1',
      values: [id],
    };

    const albumResult = await pool.query(albumQuery);

    if (!albumResult.rows.length) {
      throw new NotFoundError('Album tidak ditemukan'); 
    }

    const songsResult = await pool.query(songsQuery);

    const album = albumResult.rows[0];
    album.songs = songsResult.rows; 

    return album;
  }

  async editAlbumById(id, { name, year }) {
    const query = {
      text: 'UPDATE albums SET name=$1, year=$2, updated_at=current_timestamp WHERE id=$3 RETURNING id',
      values: [name, year, id],
    };

    const result = await pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Gagal memperbarui album. Id tidak ditemukan'); 
    }
  }

  async deleteAlbumById(id) {
    const query = {
      text: 'DELETE FROM albums WHERE id=$1 RETURNING id',
      values: [id],
    };

    const result = await pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Album gagal dihapus. Id tidak ditemukan'); 
  }
}}

module.exports = AlbumsService;