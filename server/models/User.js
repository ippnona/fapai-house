const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  // 微信 openid（微信登录时自动写入）
  openid: {
    type: String,
    sparse: true,
    index: true,
    unique: true
  },
  // 手机号（可选，用于账号密码登录）
  phone: {
    type: String,
    sparse: true,
    index: true,
    unique: true,
    match: /^1[3-9]\d{9}$/
  },
  // 密码（可选，微信登录用户无需设置）
  password: {
    type: String,
    select: false  // 查询时默认不返回 password
  },
  // 昵称
  nickname: {
    type: String,
    default: ''
  },
  // 头像
  avatar: {
    type: String,
    default: ''
  },
  // 会员状态：pending（待审核）/ active（已开通）/ rejected（已拒绝）
  membership: {
    type: String,
    enum: ['pending', 'active', 'rejected'],
    default: 'pending'
  },
  // 会员到期时间
  membershipExpire: {
    type: Date,
    default: null
  },
  // 角色：member / admin
  role: {
    type: String,
    enum: ['member', 'admin'],
    default: 'member'
  },
  // 收藏的房源ID列表
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'House'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
})

module.exports = mongoose.model('User', userSchema)
