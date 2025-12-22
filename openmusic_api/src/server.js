require('dotenv').config();

const Hapi = require('@hapi/hapi');
const Jwt = require('@hapi/jwt');
const Inert = require('@hapi/inert');

// 1. Import Plugin API
const albums = require('./api/albums');
const songs = require('./api/songs');
const playlists = require('./api/playlists');
const users = require('./api/users');
const authentications = require('./api/authentications');
const collaborations = require('./api/collaborations');
const albumLikes = require('./api/albumLikes'); // [FIXED]

// 2. Import Services
const AlbumsService = require('./services/AlbumService');
const AlbumCoverService = require('./services/AlbumCoverService');
const SongsService = require('./services/SongsServices');
const UsersService = require('./services/postgres/UsersService');
const AuthenticationsService = require('./services/postgres/AuthenticationsService');
const CollaborationsService = require('./services/postgres/CollaborationsService');
const PlaylistsService = require('./services/postgres/PlaylistsService');
const AlbumLikesService = require('./services/postgres/AlbumLikesService'); // [FIXED]
const CacheService = require('./services/redis/CacheService'); // [FIXED]

const ProducerService = require('./services/rabbitmq/ProducerService');

// 3. Import Validators
const AlbumsValidator = require('./validator/albums');
const SongsValidator = require('./validator/songs');
const PlaylistsValidator = require('./validator/playlists');
const UsersValidator = require('./validator/users');
const AuthenticationsValidator = require('./validator/authentications');
const CollaborationsValidator = require('./validator/collaborations');

// 4. Import Utils & Exceptions
const TokenManager = require('./tokenize/TokenManager');
const ClientError = require('./exceptions/ClientError');
const pool = require('./services/postgres/pool'); // Pastikan pool diimpor untuk service baru

const init = async () => {
  // Inisialisasi Service
  const cacheService = new CacheService(); // [FIXED] Kriteria 4
  const albumsService = new AlbumsService();
  const albumCoverService = new AlbumCoverService();
  const songsService = new SongsService();
  const usersService = new UsersService();
  const authenticationsService = new AuthenticationsService();
  const collaborationsService = new CollaborationsService();
  const playlistsService = new PlaylistsService(collaborationsService);
  const albumLikesService = new AlbumLikesService(pool, cacheService); // [FIXED] Kriteria 3 & 4
  const producerService = new ProducerService(); // [FIXED] Kriteria 1

  const server = Hapi.server({
    port: process.env.PORT || 5000,
    host: process.env.HOST || 'localhost',
    routes: { cors: { origin: ['*'] } },
  });

  await server.register([{ plugin: Jwt },{ plugin: Inert }]);

  server.auth.strategy('openmusicapp_jwt', 'jwt', {
    keys: process.env.ACCESS_TOKEN_KEY,
    verify: { aud: false, iss: false, sub: false, maxAgeSec: process.env.ACCESS_TOKEN_AGE },
    validate: (artifacts) => ({
      isValid: true,
      credentials: { id: artifacts.decoded.payload.userId },
    }),
  });

  await server.register([
    { plugin: albums, options: { service: albumsService, validator: AlbumsValidator, coverService: albumCoverService } },
    { plugin: songs, options: { service: songsService, validator: SongsValidator } },
    { plugin: users, options: { service: usersService, validator: UsersValidator } },
    { plugin: authentications, options: { authenticationsService, usersService, tokenManager: TokenManager, validator: AuthenticationsValidator } },
    { plugin: playlists, options: { service: playlistsService, validator: PlaylistsValidator, producerService } }, // [FIXED] Kriteria 1
    { plugin: collaborations, options: { collaborationsService, playlistsService, validator: CollaborationsValidator } },
    { plugin: albumLikes, options: { service: albumLikesService } }, // [FIXED] Registrasi plugin Likes
  ]);

  // Serve static files untuk local storage
 server.route({
  method: 'GET',
  path: '/uploads/images/{param*}',
  handler: {
    directory: {
      path: require('path').join(__dirname, 'uploads/file/images'),
    },
  },
});

  server.ext('onPreResponse', (request, h) => {
    const { response } = request;
    if (response instanceof Error) {
      if (response instanceof ClientError) {
        const newResponse = h.response({
          status: 'fail',
          message: response.message,
        });
        newResponse.code(response.statusCode);
        return newResponse;
      }
      if (!response.isServer) {
        return h.continue;
      }
      console.error('Server error:', response.stack || response.message);
      const newResponse = h.response({
        status: 'error',
        message: 'Maaf, terjadi kegagalan pada server kami.',
      });
      newResponse.code(500);
      return newResponse;
    }
    return h.continue;
  });

  await server.start();
  console.log(`Server berjalan pada ${server.info.uri}`);
};

(async () => {
  try {
    await init();
  } catch (err) {
    console.error('Failed to start server:', err.stack || err.message);
    process.exit(1);
  }
})();