// src/api/playlists/index.js
const PlaylistsHandler = require('./handler');
const routes = require('./routes');

module.exports = {
  name: 'playlists',
  version: '1.0.0',
  register: async (server, { service, validator, producerService }) => {
    const playlistsHandler = new PlaylistsHandler(service, validator, producerService);
    server.route(routes(playlistsHandler));
  },
};