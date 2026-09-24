const auth = require('./auth');

module.exports = {
  verifyAdminToken: auth.verifyAdminToken,
  verifyDAFToken: auth.verifyDAFToken,
  verifyAnyUser: auth.verifyAnyUser
};