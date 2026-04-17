// 学员报喜 / 服务介绍 统一模型
const mongoose = require('mongoose')

const newsSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['success', 'service'],   // success=学员报喜, service=服务介绍
    required: true 
  },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },       // 副标题
  content: { type: String, default: '' },         // 文字内容
  
  // 图片（最多9张）
  images: [{ type: String }],
  
  // 视频
  videoUrl: { type: String, default: '' },
  videoCover: { type: String, default: '' },
  
  // 服务介绍专用字段
  serviceIcon: { type: String, default: '' },    // 图标
  serviceDesc: { type: String, default: '' },    // 简短描述
  serviceDetail: { type: String, default: '' },  // 详情页内容（富文本/HTML）
  consultEnabled: { type: Boolean, default: true }, // 是否显示咨询入口
  
  // 排序权重（数字越大越靠前）
  sort: { type: Number, default: 0 },
  
  // 上下线
  enabled: { type: Boolean, default: true },
  
  // 点击量
  viewCount: { type: Number, default: 0 },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

newsSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

module.exports = mongoose.model('News', newsSchema)
