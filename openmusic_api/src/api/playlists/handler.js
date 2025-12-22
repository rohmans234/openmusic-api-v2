const autoBind = require('auto-bind');

class PlaylistsHandler {
  constructor(service, validator, producerService) {
    this._service = service;
    this._validator = validator;
    this._producerService = producerService;
    autoBind(this); // Menggunakan auto-bind agar this tetap aman
  }

  async postPlaylistHandler(request, h) {
    this._validator.validatePlaylistPayload(request.payload);
    const { name } = request.payload;
    const { id: credentialId } = request.auth.credentials;
    const playlistId = await this._service.addPlaylist({ name, owner: credentialId });
    const response = h.response({ status: 'success', data: { playlistId } });
    response.code(201);
    return response;
  }

  async getPlaylistsHandler(request) {
    const { id: credentialId } = request.auth.credentials;
    const playlists = await this._service.getPlaylists(credentialId);
    return { status: 'success', data: { playlists } };
  }

  async deletePlaylistByIdHandler(request) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;
    await this._service.verifyPlaylistOwner(id, credentialId);
    await this._service.deletePlaylistById(id);
    return { status: 'success', message: 'Playlist berhasil dihapus' };
  }

  async postSongToPlaylistHandler(request, h) {
    this._validator.validatePlaylistSongPayload(request.payload);
    const { songId } = request.payload;
    const { id: playlistId } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._service.verifyPlaylistAccess(playlistId, credentialId);
    await this._service.addSongToPlaylist(playlistId, songId); // Kriteria 2
    await this._service.addPlaylistActivity(playlistId, songId, credentialId, 'add'); // Opsional 2

    const response = h.response({ status: 'success', message: 'Lagu berhasil ditambahkan ke playlist' });
    response.code(201);
    return response;
  }

  async getSongsFromPlaylistHandler(request) {
  const { id: playlistId } = request.params;
  const { id: credentialId } = request.auth.credentials;

  await this._service.verifyPlaylistAccess(playlistId, credentialId);
  const playlist = await this._service.getSongsFromPlaylist(playlistId);

  return {
    status: 'success',
    data: {
      playlist, // Postman mencari objek 'playlist'
    },
  };
}

  async deleteSongFromPlaylistHandler(request) {
    this._validator.validatePlaylistSongPayload(request.payload);
    const { songId } = request.payload;
    const { id: playlistId } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._service.verifyPlaylistAccess(playlistId, credentialId);
    await this._service.deleteSongFromPlaylist(playlistId, songId);
    await this._service.addPlaylistActivity(playlistId, songId, credentialId, 'delete'); // Opsional 2

    return { status: 'success', message: 'Lagu berhasil dihapus dari playlist' };
  }

  async getPlaylistActivitiesHandler(request) {
    const { id: playlistId } = request.params;
    const { id: credentialId } = request.auth.credentials;
    await this._service.verifyPlaylistAccess(playlistId, credentialId);
    const activities = await this._service.getPlaylistActivities(playlistId);
    return { status: 'success', data: { playlistId, activities } };
  }

  async postExportPlaylistHandler(request, h) {
    this._validator.validateExportPlaylistPayload(request.payload);
    const { playlistId } = request.params;
    const { targetEmail } = request.payload;
    const { id: credentialId } = request.auth.credentials;

    // Verifikasi bahwa user adalah owner playlist
    await this._service.verifyPlaylistOwner(playlistId, credentialId);

    // Kirim pesan ke RabbitMQ
    await this._producerService.sendPlaylistExportMessage({
      playlistId,
      targetEmail,
    });

    const response = h.response({
      status: 'success',
      message: 'Permintaan Anda sedang kami proses',
    });
    response.code(201);
    return response;
  }
}

module.exports = PlaylistsHandler;