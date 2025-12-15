const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Hash password
exports.hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
  return await bcrypt.hash(password, salt);
};

// Compare password
exports.comparePassword = async (enteredPassword, hashedPassword) => {
  return await bcrypt.compare(enteredPassword, hashedPassword);
};

// Generate random token
exports.generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Hash token (for email verification, password reset)
exports.hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
