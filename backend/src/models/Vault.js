const mongoose = require('mongoose');

const VaultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  encryptedData: {
    type: String, // AES-256 encrypted JSON blob
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Vault', VaultSchema);
