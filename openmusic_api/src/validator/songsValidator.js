const Joi = require('joi');
const InvariantError = require('../exceptions/InvariantError');

const SongsPayloadSchema = Joi.object({
  title: Joi.string().required(),
  year: Joi.number().required(),
  genre: Joi.string().required(),
  performer: Joi.string().required(),
  duration: Joi.number().optional(),
  albumId: Joi.string().optional(),
});

const SongsValidator = {
  validateSongPayload: (payload) => {
    const { error } = SongsPayloadSchema.validate(payload);
    if (error) {
      throw new InvariantError(error.message);
    }
  },
};

module.exports = SongsValidator;
