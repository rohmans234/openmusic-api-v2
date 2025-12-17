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
      text: `SELECT playlists.id, playlists.name, users.username FROM playlists
      LEFT JOIN users ON users.id = playlists.owner
      LEFT JOIN collaborations ON collaborations.playlist_id = playlists.id
      WHERE playlists.owner = $1 OR collaborations.user_id = $1`,
      values: [owner],
    };
    const result = await this._pool.query(query);
    return result.rows;
  }

  // Kriteria 3: Menambahkan lagu ke playlist
  async addSongToPlaylist(playlistId, songId) {
    const id = `ps-${nanoid(16)}`;
    const query = {
      text: 'INSERT INTO playlist_songs VALUES($1, $2, $3) RETURNING id',
      values: [id, playlistId, songId],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) throw new InvariantError('Lagu gagal ditambahkan ke playlist');
  }

  // LOGIKA OTORISASI (TAHAP 4)
  async verifyPlaylistOwner(id, owner) {
    const query = {
      text: 'SELECT owner FROM playlists WHERE id = $1',
      values: [id],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) throw new NotFoundError('Playlist tidak ditemukan');
    if (result.rows[0].owner !== owner) throw new AuthorizationError('Anda bukan pemilik playlist ini');
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

  // Fungsi untuk mendapatkan riwayat aktivitas (Untuk GET /playlists/{id}/activities)
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
}
module.exports = PlaylistsService;