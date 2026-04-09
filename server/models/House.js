const mongoose = require('mongoose')

const houseSchema = new mongoose.Schema({
  // 基础信息
  title: { type: String, required: true },
  city: { type: String, default: '深圳' },
  district: { type: String, required: true }, // 区域：南山、福田、罗湖等
  address: { type: String, required: true },
  
  // 房屋信息
  area: { type: Number, required: true },       // 面积 m²
  roomLayout: { type: String, default: '' },     // 户型：3室2厅
  floor: { type: String, default: '' },           // 楼层
  buildingAge: { type: String, default: '' },    // 建成年代
  orientation: { type: String, default: '' },    // 朝向
  decoration: { type: String, default: '' },     // 装修情况
  
  // 价格信息
  marketPrice: { type: Number, required: true }, // 市场价（元）
  auctionStartPrice: { type: Number, required: true }, // 起拍价
  currentPrice: { type: Number },                 // 当前价
  deposit: { type: Number, required: true },      // 保证金
  pricePerSq: { type: Number },                    // 单价（元/m²）
  
  // 拍卖信息
  platform: { 
    type: String, 
    enum: ['ali', 'jd'],
    required: true 
  }, // 来源平台
  platformUrl: { type: String, required: true },  // 原始链接
  auctionStartTime: { type: Date, required: true }, // 开拍时间
  auctionEndTime: { type: Date, required: true },   // 结束时间
  status: { 
    type: String,
    enum: ['pending', 'ongoing', 'ended', 'sold', 'withdrawn'],
    default: 'pending'
  }, // 拍卖状态
  
  // 地图坐标（手动录入或批量导入）
  latitude: { type: Number },
  longitude: { type: Number },
  
  // 图片（最多5张）
  images: [{ type: String }],
  
  // 备注
  remark: { type: String, default: '' },
  
  // 数据来源：ali / jd / manual
  source: {
    type: String,
    enum: ['ali', 'jd', 'manual'],
    default: 'manual'
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

// 保存前计算单价
houseSchema.pre('save', function(next) {
  if (this.marketPrice && this.area) {
    this.pricePerSq = Math.round(this.marketPrice / this.area)
  }
  this.updatedAt = new Date()
  next()
})

module.exports = mongoose.model('House', houseSchema)
