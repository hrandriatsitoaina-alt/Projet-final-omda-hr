// server/utils/password.js
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

/**
 * Hash un mot de passe en clair
 * @param {string} plainPassword - Mot de passe en clair
 * @returns {Promise<string>} - Hash bcrypt
 */
async function hashPassword(plainPassword) {
  if (!plainPassword) throw new Error('Mot de passe vide');
  return await bcrypt.hash(String(plainPassword), SALT_ROUNDS);
}

/**
 * Vérifie si un mot de passe en clair correspond à un hash
 * Supporte les 2 cas :
 *   - Hash bcrypt ($2a$ / $2b$)
 *   - Mot de passe en clair (pour migration progressive)
 * @param {string} plainPassword - Mot de passe saisi
 * @param {string} storedPassword - Valeur stockée en base
 * @returns {Promise<boolean>}
 */
async function verifyPassword(plainPassword, storedPassword) {
  if (!plainPassword || !storedPassword) return false;

  // Si la valeur stockée ressemble à un hash bcrypt → on compare avec bcrypt
  if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$')) {
    return await bcrypt.compare(String(plainPassword), storedPassword);
  }

  // Sinon : comparaison en clair (ancien mode, migration progressive)
  return String(plainPassword) === String(storedPassword);
}

/**
 * Détecte si une valeur est déjà un hash bcrypt
 */
function isHashed(value) {
  return typeof value === 'string' && (value.startsWith('$2a$') || value.startsWith('$2b$'));
}

module.exports = {
  hashPassword,
  verifyPassword,
  isHashed,
  SALT_ROUNDS,
};