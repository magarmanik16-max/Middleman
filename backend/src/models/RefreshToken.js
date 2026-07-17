import mongoose from 'mongoose';
import crypto from 'crypto';

const refreshTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tokenHash: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// TTL index: MongoDB automatically deletes expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/** Hash a refresh token value so we never store the raw token in the DB. */
refreshTokenSchema.statics.hashToken = function (rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};

/** Store a new refresh token for a user. Returns the saved doc (without hash). */
refreshTokenSchema.statics.storeToken = async function (userId, rawToken, expiresInMs) {
  const tokenHash = this.hashToken(rawToken);
  const expiresAt = new Date(Date.now() + expiresInMs);

  // Delete any existing tokens for this user (single-session)
  await this.deleteMany({ userId });

  return this.create({ userId, tokenHash, expiresAt });
};

/** Verify a raw refresh token against the DB. Returns the token doc or null. */
refreshTokenSchema.statics.verifyToken = async function (userId, rawToken) {
  const tokenHash = this.hashToken(rawToken);
  return this.findOne({
    userId,
    tokenHash,
    expiresAt: { $gt: new Date() }
  });
};

/** Delete all refresh tokens for a user (used on logout). */
refreshTokenSchema.statics.revokeAll = async function (userId) {
  return this.deleteMany({ userId });
};

export default mongoose.model('RefreshToken', refreshTokenSchema);
