require('dotenv').config();

const Hapi = require('@hapi/hapi');
const Jwt = require('@hapi/jwt');

// 1. Import Plugin API
const playlists = require('./api/playlists');
const users = require('./api/users');
const authentications = require('./api/authentications');

// 2. Import Services
const PlaylistsService = require('./services/postgres/PlaylistsService');
const UsersService = require('./services/postgres/UsersService');
const AuthenticationsService = require('./services/postgres/AuthenticationsService');
const CollaborationsService = require('./services/postgres/CollaborationsService');

// 3. Import Validators
const PlaylistsValidator = require('./validator/playlists');
const UsersValidator = require('./validator/users');
const AuthenticationsValidator = require('./validator/authentications');

// 4. Import Utils & Exceptions
const TokenManager = require('./tokenize/TokenManager');
const ClientError = require('./exceptions/ClientError');

const init = async () => {
  // --- URUTAN INISIALISASI SERVICE ---
  const collaborationsService = new CollaborationsService();
  // PlaylistsService membutuhkan collaborationsService di constructornya
  const playlistsService = new PlaylistsService(collaborationsService);
  const usersService = new UsersService();
  const authenticationsService = new AuthenticationsService();

  const server = Hapi.server({
    port: process.env.PORT || 5000,
    host: process.env.HOST || 'localhost',
    routes: {
      cors: {
        origin: ['*'],
      },
    },
  });

  // Registrasi Plugin Eksternal (JWT)
  await server.register([
    {
      plugin: Jwt,
    },
  ]);

  // Mendefinisikan strategi autentikasi JWT
  server.auth.strategy('openmusicapp_jwt', 'jwt', {
    keys: process.env.ACCESS_TOKEN_KEY,
    verify: {
      aud: false,
      iss: false,
      sub: false,
      maxAgeSec: process.env.ACCESS_TOKEN_AGE,
    },
    validate: (artifacts) => ({
      isValid: true,
      credentials: {
        id: artifacts.decoded.payload.userId,
      },
    }),
  });

  // Registrasi Plugin Internal API
  await server.register([
    {
      plugin: users,
      options: {
        service: usersService,
        validator: UsersValidator,
      },
    },
    {
      plugin: authentications,
      options: {
        authenticationsService,
        usersService,
        tokenManager: TokenManager,
        validator: AuthenticationsValidator,
      },
    },
    {
      plugin: playlists,
      options: {
        service: playlistsService,
        validator: PlaylistsValidator,
      },
    },
  ]);

  // Penanganan Error (onPreResponse) sesuai kriteria
  server.ext('onPreResponse', (request, h) => {
    const { response } = request;

    if (response instanceof Error) {
      // Penanganan Client Error secara internal (400, 401, 403, 404)
      if (response instanceof ClientError) {
        const newResponse = h.response({
          status: 'fail',
          message: response.message,
        });
        newResponse.code(response.statusCode);
        return newResponse;
      }

      // Mempertahankan penanganan client error oleh hapi secara native (misal 404 route)
      if (!response.isServer) {
        return h.continue;
      }

      // Penanganan server error sesuai kebutuhan (500)
      const newResponse = h.response({
        status: 'error',
        message: 'Maaf, terjadi kegagalan pada server kami.',
      });
      newResponse.code(500);
      console.error(response); // Membantu debugging di terminal
      return newResponse;
    }

    // Jika bukan error, lanjutkan dengan response sebelumnya
    return h.continue;
  });

  await server.start();
  console.log(`Server berjalan pada ${server.info.uri}`);
};

init();