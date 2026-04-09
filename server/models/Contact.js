const mongoose = require('mongoose')

const contactSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  houseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'House'
  },
  content: {
    type: String,
    required: true,
    maxlength: 500
  },
  phone: {
    type: String,
    required: true
  },
  // 处理状态
  status: {
    type: String,
    enum: ['new', 'replied', 'closed'],
    default: 'new'
  },
  reply: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

module.exports = mongoose.model('Contact', contactSchema)
