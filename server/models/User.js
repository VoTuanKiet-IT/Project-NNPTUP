const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: false,
  },
  email: {
    type: String,
    required: false,
    unique: true
  },
  role: {
    type: String,
    enum: ['admin', 'user'], // Định nghĩa các vai trò có thể có: admin và user
    default: 'user' // Mặc định, người dùng mới sẽ có vai trò là 'user'
  }
});

module.exports = mongoose.model('User', UserSchema);
