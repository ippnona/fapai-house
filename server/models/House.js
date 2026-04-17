const mongoose = require('mongoose')

const houseSchema = new mongoose.Schema({
  // 基础信息
  title: { type: String, required: true },
  city: { type: String, default: '深圳' },
  district: { type: String, required: true },
  address: { type: String },
  
  // 房屋信息
  area: { type: Number },       // 可选（之前 required: true）
  roomLayout: { type: String, default: '' },
  floor: { type: String, default: '' },
  buildingAge: { type: String, default: '' },
  orientation: { type: String, default: '' },
  decoration: { type: String, default: '' },
  
  // 物业类型
  propertyType: { type: String, default: '' },
  
  // 价格信息（单位：元）
  marketPrice: { type: Number, required: true },
  auctionStartPrice: { type: Number, required: true },
  currentPrice: { type: Number },
  deposit: { type: Number },   // 可选
  pricePerSq: { type: Number },
  
  // 拍卖信息
  platform: { 
    type: String, 
    enum: ['ali', 'jd'],
    default: 'ali'
  },
  platformUrl: { type: String },  // 可选
  auctionStartTime: { type: Date, required: true },
  auctionEndTime: { type: Date, required: true },
  status: { 
    type: String,
    enum: ['pending', 'ongoing', 'ended', 'sold', 'withdrawn'],
    default: 'pending'
  },
  
  // 法院公告信息
  courtInfo: {
    courtName: { type: String, default: '' },        // 法院名称
    caseNumber: { type: String, default: '' },        // 案号
    applicant: { type: String, default: '' },        // 申请执行人
    respondent: { type: String, default: '' },        // 被执行人
    debtAmount: { type: String, default: '' },       // 债务金额
    storagePeriod: { type: String, default: '' },     // 保管期限
    occupancyStatus: { type: String, default: '' },   // 占用情况
    mortgageHolder: { type: String, default: '' },    // 抵押权人
    leasingStatus: { type: String, default: '' },    // 租赁情况
    outstandingFees: { type: String, default: '' },  // 欠费（水电气物业）
    transferRestrictions: { type: String, default: '' }, // 过户限制
    taxBearPayer: { type: String, default: '买家' }, // 税费承担方：买家/卖家
    buyerBurdenNote: { type: String, default: '' },  // 买家承担说明
  },
  
  // 优缺点提炼
  prosCons: {
    pros: [{ type: String }],     // 优点列表
    cons: [{ type: String }],     // 缺点列表
    summary: { type: String, default: '' }  // 综合一句话
  },
  
  // 地理坐标
  latitude: { type: Number },
  longitude: { type: Number },
  
  // 图片
  images: [{ type: String }],
  
  // 热度
  watchCount: { type: Number, default: 0 },
  
  // 风险等级
  riskLevel: { type: String, default: '中' },  // 低/中/高
  
  // 备注
  remark: { type: String, default: '' },
  
  // 是否启用成本计算器（给公司员工用）
  enableCalculator: { type: Boolean, default: false },
  
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
