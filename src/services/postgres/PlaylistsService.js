const { nanoid } = require('nanoid');
const { Pool } = require('pg');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const AuthorizationError = require('../../exceptions/AuthorizationError');

class PlaylistsService {
  constructor(collaborationService) {
    this._pool = new Pool();
    this._collaborationService = collaborationService;
  }

  async addPlaylist({ name, owner }) {
    const id = `playlist-${nanoid(16)}`;
    const query = {
      text: 'INSERT INTO playlists VALUES($1, $2, $3) RETURNING id',
      values: [id, name, owner],
    };
    const result = await this._pool.query(query);
    return result.rows[0].id;
  }

  async getPlaylists(owner) {
    const query = {
      text: `SELECT DISTINCT playlists.id, playlists.name, users.username FROM playlists
      LEFT JOIN users ON users.id = playlists.owner
      LEFT JOIN collaborations ON collaborations.playlist_id = playlists.id
      WHERE playlists.owner = $1 OR collaborations.user_id = $1`,
      values: [owner],
    };
    const result = await this._pool.query(query);
    return result.rows;
  }

  

async addSongToPlaylist(playlistId, songId) {
  // Verifikasi apakah lagu ada di database (Wajib untuk 404)
  const songQuery = {
    text: 'SELECT id FROM songs WHERE id = $1',
    values: [songId],
  };
  const songResult = await this._pool.query(songQuery);
  if (!songResult.rows.length) {
    throw new NotFoundError('Lagu tidak ditemukan');
  }

  const id = `ps-${nanoid(16)}`;
  const query = {
    text: 'INSERT INTO playlist_songs VALUES($1, $2, $3) RETURNING id',
    values: [id, playlistId, songId],
  };
  const result = await this._pool.query(query);
  if (!result.rows.length) throw new InvariantError('Lagu gagal ditambahkan ke playlist');
}

async getSongsFromPlaylist(playlistId) {
  const queryPlaylist = {
    text: `SELECT playlists.id, playlists.name, users.username FROM playlists
           JOIN users ON users.id = playlists.owner
           WHERE playlists.id = $1`,
    values: [playlistId],
  };
  const resultPlaylist = await this._pool.query(queryPlaylist);
  if (!resultPlaylist.rows.length) throw new NotFoundError('Playlist tidak ditemukan');

  const querySongs = {
    text: `SELECT songs.id, songs.title, songs.performer FROM songs
           JOIN playlist_songs ON playlist_songs.song_id = songs.id
           WHERE playlist_songs.playlist_id = $1`,
    values: [playlistId],
  };
  const resultSongs = await this._pool.query(querySongs);

  return {
    ...resultPlaylist.rows[0],
    songs: resultSongs.rows,
  };
}

  async verifyPlaylistOwner(id, owner) {
  const query = {
    text: 'SELECT owner FROM playlists WHERE id = $1',
    values: [id],
  };
  const result = await this._pool.query(query);
  
  if (!result.rows.length) {
    throw new NotFoundError('Playlist tidak ditemukan'); // Harus 404
  }
  
  if (result.rows[0].owner !== owner) {
    throw new AuthorizationError('Anda tidak berhak mengakses resource ini'); // Harus 403
  }
}

  async verifyPlaylistAccess(playlistId, userId) {
    try {
      await this.verifyPlaylistOwner(playlistId, userId);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      try {
        // Cek apakah dia kolaborator (Kriteria Opsional 1)
        await this._collaborationService.verifyCollaborator(playlistId, userId);
      } catch {
        throw error; // Lempar AuthorizationError asli jika bukan kolaborator
      }
    }
  }

  // Fungsi untuk mencatat aktivitas (Internal)
  async addPlaylistActivity(playlistId, songId, userId, action) {
    const id = `activity-${nanoid(16)}`;
    const time = new Date().toISOString();
    const query = {
      text: 'INSERT INTO playlist_song_activities VALUES($1, $2, $3, $4, $5, $6)',
      values: [id, playlistId, songId, userId, action, time],
    };
    await this._pool.query(query);
  }

  async getPlaylistActivities(playlistId) {
    const query = {
      text: `SELECT users.username, songs.title, psa.action, psa.time
           FROM playlist_song_activities psa
           JOIN users ON users.id = psa.user_id
           JOIN songs ON songs.id = psa.song_id
           WHERE psa.playlist_id = $1
           ORDER BY psa.time ASC`,
      values: [playlistId],
    };
    const result = await this._pool.query(query);
    return result.rows;
  }
  async getSongsFromPlaylist(playlistId) {
  // 1. Ambil informasi playlist dan username pemiliknya
  const queryPlaylist = {
    text: `SELECT playlists.id, playlists.name, users.username 
           FROM playlists
           JOIN users ON users.id = playlists.owner
           WHERE playlists.id = $1`,
    values: [playlistId],
  };

  const resultPlaylist = await this._pool.query(queryPlaylist);
  if (!resultPlaylist.rows.length) {
    throw new NotFoundError('Playlist tidak ditemukan');
  }

  // 2. Ambil daftar lagu yang tergabung dalam playlist tersebut
  const querySongs = {
    text: `SELECT songs.id, songs.title, songs.performer 
           FROM songs
           JOIN playlist_songs ON playlist_songs.song_id = songs.id
           WHERE playlist_songs.playlist_id = $1`,
    values: [playlistId],
  };

  const resultSongs = await this._pool.query(querySongs);

  // 3. Gabungkan menjadi struktur objek bersarang sesuai ekspektasi Postman
  const playlist = resultPlaylist.rows[0];
  playlist.songs = resultSongs.rows;

  return playlist;
}

// Kriteria 2: Validasi songId wajib menghasilkan 404 jika ID tidak valid
async addSongToPlaylist(playlistId, songId) {
  // VALIDASI MANUAL: Cek keberadaan lagu sebelum insert
  const songQuery = {
    text: 'SELECT id FROM songs WHERE id = $1',
    values: [songId],
  };
  const songResult = await this._pool.query(songQuery);

  if (!songResult.rows.length) {
    throw new NotFoundError('Lagu tidak ditemukan. Gagal menambahkan ke playlist.');
  }

  const id = `ps-${nanoid(16)}`;
  const query = {
    text: 'INSERT INTO playlist_songs VALUES($1, $2, $3) RETURNING id',
    values: [id, playlistId, songId],
  };
  const result = await this._pool.query(query);

  if (!result.rows.length) {
    throw new InvariantError('Lagu gagal ditambahkan ke playlist');
  }
}
// Opsional 2: Mendapatkan aktivitas playlist dengan join tabel yang benar
async getPlaylistActivities(playlistId) {
  const query = {
    text: `SELECT users.username, songs.title, psa.action, psa.time
           FROM playlist_song_activities psa
           JOIN users ON users.id = psa.user_id
           JOIN songs ON songs.id = psa.song_id
           WHERE psa.playlist_id = $1
           ORDER BY psa.time ASC`,
    values: [playlistId],
  };
  const result = await this._pool.query(query);
  return result.rows;
}
  async deletePlaylistById(id) {
    const query = {
      text: 'DELETE FROM playlists WHERE id = $1 RETURNING id',
      values: [id],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError('Playlist gagal dihapus. Id tidak ditemukan');
    }
  }
  async deleteSongFromPlaylist(playlistId, songId) {
    const query = {
      text: 'DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2 RETURNING id',
      values: [playlistId, songId],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError('Lagu gagal dihapus dari playlist. Id tidak ditemukan');
    }
  }
}
module.exports = PlaylistsService;