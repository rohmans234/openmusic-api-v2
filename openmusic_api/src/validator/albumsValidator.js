const Joi = require('joi');

const albumPayloadSchema = Joi.object({
  name: Joi.string().required(),
  year: Joi.number().required(),
});

class AlbumsValidator {
  validateAlbumPayload(payload) {
    const validation = albumPayloadSchema.validate(payload);
    if (validation.error) {
      throw new Error(validation.error.message);
    }
  }
}

module.exports = AlbumsValidator;
