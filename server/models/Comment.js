const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// Định nghĩa schema cho Comment
const CommentSchema = new Schema({
  content: {
    type: String,
    required: true
  },
  postId: {
    type: Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Comment', CommentSchema);
