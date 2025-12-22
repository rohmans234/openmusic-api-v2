const autoBind = require('auto-bind');

class AlbumLikesHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  async postAlbumLikeHandler(request, h) {
    const { id: albumId } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._service.addAlbumLike(albumId, credentialId);

    const response = h.response({
      status: 'success',
      message: 'Berhasil menyukai album',
    });
    response.code(201);
    return response;
  }

  async deleteAlbumLikeHandler(request) {
    const { id: albumId } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._service.deleteAlbumLike(albumId, credentialId);

    return {
      status: 'success',
      message: 'Batal menyukai album',
    };
  }

  async getAlbumLikesHandler(request, h) {
    const { id: albumId } = request.params;
    const { likes, source } = await this._service.getAlbumLikes(albumId);

    const response = h.response({
      status: 'success',
      data: {
        likes,
      },
    });

    // Kriteria 4: Custom header jika data dari cache
    if (source === 'cache') {
      response.header('X-Data-Source', 'cache');
    }

    return response;
  }
}

module.exports = AlbumLikesHandler;