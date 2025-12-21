const Joi = require('joi');

const PlaylistPayloadSchema = Joi.object({
  name: Joi.string().required(),
});

const PlaylistSongPayloadSchema = Joi.object({
  songId: Joi.string().required(),
});

const ExportPlaylistPayloadSchema = Joi.object({
  targetEmail: Joi.string().email().required(),
});

module.exports = { PlaylistPayloadSchema, PlaylistSongPayloadSchema, ExportPlaylistPayloadSchema };