const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
const Schema = mongoose.Schema;

const tradeSchema = new Schema({
  dateAdded: { type: Date, default: Date.now },
  book: {
    id : Schema.Types.ObjectId,
    title: String
  },
  fromUser: [{
    userId: Number,
    userName: String,
    userProvider: String
  }],
  toUser: [{
    userId: Number,
    userName: String,
    userProvider: String
  }],
  isCompleted: Boolean
}, {
  collection: 'fccbooktc-trades'
});

module.exports = mongoose.model('Trade', tradeSchema);