require('dotenv').config();

const Hapi = require('@hapi/hapi');
const Jwt = require('@hapi/jwt');

// 1. Import Plugin API
const albums = require('./api/albums');
const songs = require('./api/songs');
const playlists = require('./api/playlists');
const users = require('./api/users');
const authentications = require('./api/authentications');

// 2. Import Services (Sesuaikan dengan nama file fisik Anda)
const AlbumsService = require('./services/AlbumService'); 
const SongsService = require('./services/SongsServices'); 
const UsersService = require('./services/postgres/UsersService');
const AuthenticationsService = require('./services/postgres/AuthenticationsService');
const CollaborationsService = require('./services/postgres/CollaborationsService');
const PlaylistsService = require('./services/postgres/PlaylistsService');
const collaborations = require('./api/collaborations');
const CollaborationsValidator = require('./validator/collaborations');

// 3. Import Validators
const AlbumsValidator = require('./validator/albums');
const SongsValidator = require('./validator/songs');
const PlaylistsValidator = require('./validator/playlists');
const UsersValidator = require('./validator/users');
const AuthenticationsValidator = require('./validator/authentications');

// 4. Import Utils & Exceptions
const TokenManager = require('./tokenize/TokenManager');
const ClientError = require('./exceptions/ClientError');

const init = async () => {
  const albumsService = new AlbumsService();
  const songsService = new SongsService();
  const usersService = new UsersService();
  const authenticationsService = new AuthenticationsService();
  const collaborationsService = new CollaborationsService();
  const playlistsService = new PlaylistsService(collaborationsService);
  

  const server = Hapi.server({
    port: process.env.PORT || 5000,
    host: process.env.HOST || 'localhost',
    routes: { cors: { origin: ['*'] } },
  });

  await server.register([{ plugin: Jwt }]);

  server.auth.strategy('openmusicapp_jwt', 'jwt', {
    keys: process.env.ACCESS_TOKEN_KEY,
    verify: { aud: false, iss: false, sub: false, maxAgeSec: process.env.ACCESS_TOKEN_AGE },
    validate: (artifacts) => ({
      isValid: true,
      credentials: { id: artifacts.decoded.payload.userId },
    }),
  });

  await server.register([
    { plugin: albums, options: { service: albumsService, validator: AlbumsValidator } },
    { plugin: songs, options: { service: songsService, validator: SongsValidator } },
    { plugin: users, options: { service: usersService, validator: UsersValidator } },
    { plugin: authentications, options: { authenticationsService, usersService, tokenManager: TokenManager, validator: AuthenticationsValidator } },
    { plugin: playlists, options: { service: playlistsService, validator: PlaylistsValidator } },
    { plugin: collaborations,options: { collaborationsService, playlistsService, validator: CollaborationsValidator  } },
  ]);

  server.ext('onPreResponse', (request, h) => {
  const { response } = request;

  if (response instanceof Error) {
    // Penanganan client error secara internal (400, 401, 403, 404)
    if (response instanceof ClientError) {
      const newResponse = h.response({
        status: 'fail',
        message: response.message,
      });
      newResponse.code(response.statusCode);
      return newResponse;
    }

    // Mempertahankan penanganan error bawaan Hapi (seperti 401 dari auth strategy)
    if (!response.isServer) {
      return h.continue;
    }

    // Penanganan server error (500)
    const newResponse = h.response({
      status: 'error',
      message: 'Maaf, terjadi kegagalan pada server kami.',
    });
    newResponse.code(500);
    return newResponse;
  }

  return h.continue;
});

};

init();