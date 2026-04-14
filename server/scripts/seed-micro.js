/**
 * 深圳法拍房超精简版种子数据
 * 适合直接复制粘贴到终端
 */
const mongoose = require('mongoose')
const House = require('../models/House')
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fapai-house'

const districts = ['南山','福田','罗湖','宝安','龙岗','龙华','光明','盐田']
const types = ['住宅','住宅','住宅','写字楼','公寓','商铺']
const streets = [
  '后海大道科技园','香蜜湖一号','宝安南路幸福里','新安街道壹方中心',
  '坂田佳兆业城市广场','民治莱蒙水榭春天','公明宏发上城','沙头角壹海城',
  '华侨城香山美庐','蛇口半岛城邦','大运星河时代','西乡润科华府',
  '沙井万科星城','龙城紫薇花园','莲塘鹏兴花园','布吉信义荔山公馆'
]
const now = Date.now()
const seed = streets.map((s,i) => ({
  title: '深圳市' + districts[i%districts.length] + s + (i%20+1) + '栋',
  city:'深圳', district: districts[i%districts.length], area: 80+i*5,
  roomLayout: (i%3+2)+'室'+(i%2+1)+'厅', propertyType: types[i%types.length],
  marketPrice: (300+i*50)*10000, auctionStartPrice: (200+i*35)*10000,
  deposit: (30+i*5)*10000, platform: i%2===0?'ali':'jd',
  latitude: 22.45+i*0.04, longitude: 113.85+i*0.05,
  watchCount: 50+i*7, status: i%3===0?'ongoing':'pending',
  floor: '中层/20层', orientation:'南', buildingAge:'2015年', decoration:'精装修',
  platformUrl: 'https://sf.taobao.com/item.htm?id='+(900000+i),
  auctionStartTime: new Date(now+i*86400000),
  auctionEndTime: new Date(now+i*86400000+14400000),
  source:'manual', riskLevel: ['low','medium','high'][i%3],
  userId: null, createdAt: new Date(), updatedAt: new Date(),
  address: '深圳市'+districts[i%districts.length]+s
}))

async function main() {
  await mongoose.connect(MONGO_URI)
  console.log('MongoDB connected')
  await House.deleteMany({})
  const r = await House.insertMany(seed)
  console.log('插入 '+r.length+' 条')
  const s={}
  r.forEach(h=>{s[h.district]=(s[h.district]||0)+1})
  Object.entries(s).forEach(([d,c])=>console.log(d+': '+c+'套'))
  await mongoose.disconnect()
}
main().catch(e=>{console.error(e.message);process.exit(1)})
