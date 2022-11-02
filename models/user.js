const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
const bcrypt = require('bcrypt'); // Password hashing
const Schema = mongoose.Schema;

const userSchema = new Schema({
  id: Number,
  provider: String,
  token: String,
  username: String,
  profile: {
    fullname: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null }
  }
}, {
  collection: 'fccbooktc-users'
});

// Generates a hash - https://www.npmjs.com/package/bcrypt-nodejs
userSchema.methods.generateHash = function(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(), null);
};

// Returns a bool if the passwords match
userSchema.methods.validPassword = function(password) {
  return bcrypt.compareSync(password, this.local.password);
};

module.exports = mongoose.model('User', userSchema);