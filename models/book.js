const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
const mongoosePaginate = require('mongoose-paginate');
const Schema = mongoose.Schema;

const bookOwnerSchema = new Schema({
  userProvider: String,
  userId: Number,
  userName: String
});

const bookSchema = new Schema({
  dateAdded: { type: Date, default: Date.now },
  bookOwner: [bookOwnerSchema],
  imgUrl: String,
  title: String,
  likes: Array,
  tradePending: Boolean
}, {
  collection: 'fccbooktc-books'
});

bookSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Book', bookSchema);