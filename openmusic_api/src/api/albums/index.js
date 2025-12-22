const AlbumsHandler = require('./handler');
const routes = require('./routes');

module.exports = {
  name: 'albums',
  version: '1.0.0',
  register: (server, { service, validator, coverService }) => {
    const handler = new AlbumsHandler(service, validator, coverService);
    server.route(routes(handler));
  },
};
