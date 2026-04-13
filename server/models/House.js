const mongoose = require('mongoose')

const houseSchema = new mongoose.Schema({
  // 基础信息
  title: { type: String, required: true },
  city: { type: String, default: '深圳' },
  district: { type: String, required: true },
  address: { type: String, required: true },
  
  // 房屋信息
  area: { type: Number, required: true },
  roomLayout: { type: String, default: '' },
  floor: { type: String, default: '' },
  buildingAge: { type: String, default: '' },
  orientation: { type: String, default: '' },
  decoration: { type: String, default: '' },
  
  // 物业类型：住宅 / 写字楼 / 公寓 / 商铺
  propertyType: { type: String, default: '' },
  
  // 价格信息
  marketPrice: { type: Number, required: true },
  auctionStartPrice: { type: Number, required: true },
  currentPrice: { type: Number },
  deposit: { type: Number, required: true },
  pricePerSq: { type: Number },
  
  // 拍卖信息
  platform: { 
    type: String, 
    enum: ['ali', 'jd'],
    required: true 
  },
  platformUrl: { type: String, required: true },
  auctionStartTime: { type: Date, required: true },
  auctionEndTime: { type: Date, required: true },
  status: { 
    type: String,
    enum: ['pending', 'ongoing', 'ended', 'sold', 'withdrawn'],
    default: 'pending'
  },
  
  // 地图坐标
  latitude: { type: Number },
  longitude: { type: Number },
  
  // 图片
  images: [{ type: String }],
  
  // 阿里提醒人数（用于排序）
  watchCount: { type: Number, default: 0 },
  
  // 风险提示内容
  riskLevel: { type: String, default: '中' },  // 低/中/高
  
  // 备注
  remark: { type: String, default: '' },
  
  source: {
    type: String,
    enum: ['ali', 'jd', 'manual'],
    default: 'manual'
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

houseSchema.pre('save', function(next) {
  if (this.marketPrice && this.area) {
    this.pricePerSq = Math.round(this.marketPrice / this.area)
  }
  this.updatedAt = new Date()
  next()
})

module.exports = mongoose.model('House', houseSchema)
