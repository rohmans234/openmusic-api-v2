const Jwt = require('@hapi/jwt');
const InvariantError = require('../exceptions/InvariantError');

const TokenManager = {
  // Membuat Access Token
  generateAccessToken: (payload) => Jwt.token.generate(payload, process.env.ACCESS_TOKEN_KEY),

  // Membuat Refresh Token
  generateRefreshToken: (payload) => Jwt.token.generate(payload, process.env.REFRESH_TOKEN_KEY),

  // Membedah dan Memverifikasi Refresh Token
  verifyRefreshToken: (refreshToken) => {
    try {
      // 1. Decode token menjadi bentuk artifacts
      const artifacts = Jwt.token.decode(refreshToken);
      
      // 2. Verifikasi signature menggunakan kunci rahasia khusus refresh token
      Jwt.token.verifySignature(artifacts, process.env.REFRESH_TOKEN_KEY);
      
      // 3. Jika lolos verifikasi, ambil payload-nya (userId)
      const { payload } = artifacts.decoded;
      return payload;
    } catch (error) {
      // Jika signature salah atau token rusak, lempar error 400
      throw new InvariantError('Refresh token tidak valid');
    }
  },
};

module.exports = TokenManager;