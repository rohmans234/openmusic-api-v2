// src/api/playlists/handler.js
async function postPlaylistHandler(request, h) {
  this._validator.validatePlaylistPayload(request.payload);
  const { name } = request.payload;
  
  // Ambil ID user dari kredensial JWT
  const { id: credentialId } = request.auth.credentials;

  const playlistId = await this._service.addPlaylist({ name, owner: credentialId });

  const response = h.response({
    status: 'success',
    data: { playlistId },
  });
  response.code(201);
  return response;
}
async function getPlaylistsHandler(request) {
  // Ambil ID user dari kredensial JWT
  const { id: credentialId } = request.auth.credentials;
    const playlists = await this._service.getPlaylists(credentialId);
    return {
      status: 'success',
      data: { playlists },
    };
}