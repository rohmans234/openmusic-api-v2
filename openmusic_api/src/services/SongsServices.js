const { nanoid } = require('nanoid');
const NotFoundError = require('../exceptions/NotFoundError'); 
const InvariantError = require('../exceptions/InvariantError');
const pool = require('./postgres/pool'); 

class SongsService {
  constructor() { 
    this._pool = pool;
  }

  async addSong({ title, year, genre, performer, duration, albumId }) {
    const id = `song-${nanoid(16)}`;
    const createdAt = new Date().toISOString();

    const query = {
      text: 'INSERT INTO songs(id, title, year, genre, performer, duration, album_id, created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
      values: [id, title, year, genre, performer, duration || null, albumId || null, createdAt],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new InvariantError('Lagu gagal ditambahkan');
    }

    return result.rows[0].id;
  }

  async getSongs({ title, performer }) { 
    let query = 'SELECT id, title, performer FROM songs';
    const values = [];
    const conditions = [];

    if (title) {
      conditions.push(`title ILIKE $${conditions.length + 1}`);
      values.push(`%${title}%`);
    }

    if (performer) {
      conditions.push(`performer ILIKE $${conditions.length + 1}`);
      values.push(`%${performer}%`);
    }

    if (conditions.length) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    const result = await this._pool.query(query, values);
    return result.rows;
  }

  async getSongById(id) {
    const query = {
      text: 'SELECT id, title, year, performer, genre, duration, album_id FROM songs WHERE id = $1',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Lagu tidak ditemukan');
    }
    
   
    const song = result.rows[0];
    
    return {
      id: song.id,
      title: song.title,
      year: song.year,
      performer: song.performer,
      genre: song.genre,
      duration: song.duration,
      albumId: song.album_id,
    };
  }

  async editSongById(id, { title, year, genre, performer, duration, albumId }) {
    
    const updateQuery = {
      text: 'UPDATE songs SET title=$1, year=$2, genre=$3, performer=$4, duration=$5, album_id=$6, updated_at=current_timestamp WHERE id=$7 RETURNING id',
      values: [title, year, genre, performer, duration || null, albumId || null, id],
    };

    const result = await this._pool.query(updateQuery);

    if (!result.rowCount) {
      throw new NotFoundError('Lagu gagal diperbarui. Id tidak ditemukan');
    }
  }

  async deleteSongById(id) {
    const query = {
      text: 'DELETE FROM songs WHERE id = $1 RETURNING id',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Lagu gagal dihapus. Id tidak ditemukan');
    }
  }
}

module.exports = SongsService;