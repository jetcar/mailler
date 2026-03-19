const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getEncryptionKey() {
  const source = process.env.ENCRYPTION_KEY || 'development-encryption-key';
  return crypto.createHash('sha256').update(source).digest();
}

class EncryptionService {
  /**
   * Encrypt a string
   * @param {string} text - Text to encrypt
   * @returns {string} Encrypted text in format: iv:encryptedData
   */
  encrypt(text) {
    if (!text) return null;

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt a string
   * @param {string} text - Encrypted text in format: iv:encryptedData
   * @returns {string} Decrypted text
   */
  decrypt(text) {
    if (!text) return null;

    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = parts.join(':');

    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

module.exports = new EncryptionService();
