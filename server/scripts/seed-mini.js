/**
 * 深圳法拍房精简版种子数据（25条）
 * 体积小，可直接复制粘贴到服务器运行
 */
const mongoose = require('mongoose')
const House = require('../models/House')
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fapai-house'

const houses = [
  { title:'南山区后海大道中海油大厦A座18层1801室',city:'深圳',district:'南山',area:186.5,roomLayout:'4室2厅',propertyType:'写字楼',marketPrice:15800000,auctionStartPrice:11060000,deposit:1500000,platform:'ali',status:'pending',latitude:22.5044,longitude:113.9321,watchCount:156 },
  { title:'南山区科技园深圳湾科技生态园10栋B座1203',city:'深圳',district:'南山',area:245.8,roomLayout:'5室2厅',propertyType:'住宅',marketPrice:28500000,auctionStartPrice:19950000,deposit:2800000,platform:'ali',status:'ongoing',latitude:22.5228,longitude:113.9456,watchCount:328 },
  { title:'南山区蛇口街道半岛城邦三期6栋3202',city:'深圳',district:'南山',area:168.2,roomLayout:'4室2厅',propertyType:'住宅',marketPrice:32000000,auctionStartPrice:22400000,deposit:3200000,platform:'jd',status:'pending',latitude:22.4765,longitude:113.9234,watchCount:89 },
  { title:'南山区华侨城香山美庐园3栋1单元702',city:'深圳',district:'南山',area:142.5,roomLayout:'3室2厅',propertyType:'住宅',marketPrice:16500000,auctionStartPrice:11550000,deposit:1650000,platform:'ali',status:'ongoing',latitude:22.5512,longitude:113.9876,watchCount:203 },
  { title:'南山区科技园公寓B栋1603',city:'深圳',district:'南山',area:68.5,roomLayout:'1室1厅',propertyType:'公寓',marketPrice:4800000,auctionStartPrice:3360000,deposit:480000,platform:'ali',status:'ongoing',latitude:22.5228,longitude:113.9456,watchCount:156 },
  { title:'福田区香蜜湖街道香蜜湖一号5栋8A',city:'深圳',district:'福田',area:256.8,roomLayout:'5室3厅',propertyType:'住宅',marketPrice:45000000,auctionStartPrice:31500000,deposit:4500000,platform:'ali',status:'pending',latitude:22.5589,longitude:114.0234,watchCount:412 },
  { title:'福田区福华路大中华国际交易广场写字楼',city:'深圳',district:'福田',area:520.0,roomLayout:'办公',propertyType:'写字楼',marketPrice:20800000,auctionStartPrice:14560000,deposit:2100000,platform:'jd',status:'pending',latitude:22.5367,longitude:114.0543,watchCount:67 },
  { title:'福田区益田路港丽豪园1栋15B',city:'深圳',district:'福田',area:128.6,roomLayout:'3室2厅',propertyType:'住宅',marketPrice:12800000,auctionStartPrice:8960000,deposit:1280000,platform:'ali',status:'ongoing',latitude:22.5432,longitude:114.0678,watchCount:178 },
  { title:'福田区农园路翠海花园12栋601',city:'深圳',district:'福田',area:89.5,roomLayout:'2室1厅',propertyType:'住宅',marketPrice:8500000,auctionStartPrice:5950000,deposit:850000,platform:'ali',status:'ongoing',latitude:22.5678,longitude:114.0345,watchCount:234 },
  { title:'福田区福田中心城公寓C栋2506',city:'深圳',district:'福田',area:52.8,roomLayout:'1室0厅',propertyType:'公寓',marketPrice:3200000,auctionStartPrice:2240000,deposit:320000,platform:'jd',status:'pending',latitude:22.5432,longitude:114.0567,watchCount:98 },
  { title:'罗湖区宝安南路幸福里7栋25E',city:'深圳',district:'罗湖',area:156.3,roomLayout:'4室2厅',propertyType:'住宅',marketPrice:12500000,auctionStartPrice:8750000,deposit:1250000,platform:'ali',status:'pending',latitude:22.5456,longitude:114.1123,watchCount:145 },
  { title:'罗湖区东门中路鸿昌广场写字楼1201',city:'深圳',district:'罗湖',area:380.0,roomLayout:'办公',propertyType:'写字楼',marketPrice:9800000,auctionStartPrice:6860000,deposit:980000,platform:'jd',status:'pending',latitude:22.5489,longitude:114.1234,watchCount:56 },
  { title:'罗湖区莲塘街道鹏兴花园六期18栋3单元702',city:'深圳',district:'罗湖',area:112.8,roomLayout:'3室2厅',propertyType:'住宅',marketPrice:7200000,auctionStartPrice:5040000,deposit:720000,platform:'ali',status:'ongoing',latitude:22.5234,longitude:114.1567,watchCount:89 },
  { title:'宝安区新安街道壹方中心玖誉6栋A座3802',city:'深圳',district:'宝安',area:198.6,roomLayout:'4室2厅',propertyType:'住宅',marketPrice:16800000,auctionStartPrice:11760000,deposit:1680000,platform:'ali',status:'pending',latitude:22.5789,longitude:113.8765,watchCount:267 },
  { title:'宝安区西乡街道润科华府1栋B座1503',city:'深圳',district:'宝安',area:135.2,roomLayout:'3室2厅',propertyType:'住宅',marketPrice:9500000,auctionStartPrice:6650000,deposit:950000,platform:'jd',status:'ongoing',latitude:22.5876,longitude:113.8654,watchCount:134 },
  { title:'宝安区沙井街道万科星城名城2栋405',city:'深圳',district:'宝安',area:98.5,roomLayout:'3室1厅',propertyType:'住宅',marketPrice:5800000,auctionStartPrice:4060000,deposit:580000,platform:'ali',status:'pending',latitude:22.7234,longitude:113.8456,watchCount:198 },
  { title:'宝安区新安街道中洲华府8栋28A',city:'深圳',district:'宝安',area:178.9,roomLayout:'4室2厅',propertyType:'住宅',marketPrice:13500000,auctionStartPrice:9450000,deposit:1350000,platform:'ali',status:'pending',latitude:22.5823,longitude:113.8897,watchCount:156 },
  { title:'龙岗区坂田街道佳兆业城市广场三期5栋2302',city:'深圳',district:'龙岗',area:145.8,roomLayout:'4室2厅',propertyType:'住宅',marketPrice:7800000,auctionStartPrice:5460000,deposit:780000,platform:'ali',status:'pending',latitude:22.6345,longitude:114.0456,watchCount:178 },
  { title:'龙岗区大运街道星河时代花园8栋15C',city:'深圳',district:'龙岗',area:125.6,roomLayout:'3室2厅',propertyType:'住宅',marketPrice:6200000,auctionStartPrice:4340000,deposit:620000,platform:'jd',status:'ongoing',latitude:22.6789,longitude:114.1234,watchCount:145 },
  { title:'龙岗区龙城街道紫薇花园三期6栋602',city:'深圳',district:'龙岗',area:108.5,roomLayout:'3室2厅',propertyType:'住宅',marketPrice:4200000,auctionStartPrice:2940000,deposit:420000,platform:'ali',status:'pending',latitude:22.7234,longitude:114.2345,watchCount:67 },
  { title:'龙岗区布吉街道信义荔山公馆9栋1801',city:'深圳',district:'龙岗',area:132.8,roomLayout:'4室2厅',propertyType:'住宅',marketPrice:6800000,auctionStartPrice:4760000,deposit:680000,platform:'ali',status:'pending',latitude:22.6012,longitude:114.1234,watchCount:123 },
  { title:'龙华区民治街道莱蒙水榭春天6栋A座3805',city:'深圳',district:'龙华',area:158.6,roomLayout:'4室2厅',propertyType:'住宅',marketPrice:9800000,auctionStartPrice:6860000,deposit:980000,platform:'ali',status:'pending',latitude:22.6789,longitude:114.0345,watchCount:189 },
  { title:'龙华区大浪街道潜龙曼海宁花园南区2栋1502',city:'深圳',district:'龙华',area:118.5,roomLayout:'3室2厅',propertyType:'住宅',marketPrice:6500000,auctionStartPrice:4550000,deposit:650000,platform:'jd',status:'ongoing',latitude:22.6567,longitude:114.0234,watchCount:134 },
  { title:'光明区公明街道宏发上城3栋2003',city:'深圳',district:'光明',area:98.5,roomLayout:'3室1厅',propertyType:'住宅',marketPrice:4200000,auctionStartPrice:2940000,deposit:420000,platform:'ali',status:'pending',latitude:22.7890,longitude:113.9456,watchCount:78 },
  { title:'盐田区沙头角街道壹海城一区5栋28B',city:'深圳',district:'盐田',area:142.6,roomLayout:'4室2厅',propertyType:'住宅',marketPrice:7500000,auctionStartPrice:5250000,deposit:750000,platform:'ali',status:'pending',latitude:22.5678,longitude:114.2456,watchCount:89 },
]

// 给每条数据加上默认值
const now = Date.now()
const seedData = houses.map((h, i) => ({
  ...h,
  address: h.title,
  floor: '中层/20层',
  orientation: '南',
  buildingAge: '2015年',
  decoration: '精装修',
  platformUrl: `https://sf.taobao.com/item.htm?id=${1000000 + i}`,
  auctionStartTime: new Date(now + (i % 7) * 86400000),
  auctionEndTime: new Date(now + (i % 7) * 86400000 + 14400000),
  source: 'manual',
  riskLevel: ['low', 'medium', 'high'][i % 3],
  watchCount: h.watchCount,
  userId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}))

async function main() {
  await mongoose.connect(MONGO_URI)
  console.log('✅ MongoDB connected')
  
  await House.deleteMany({})
  console.log('🗑️ 旧数据已清空')
  
  const result = await House.insertMany(seedData)
  console.log(`✅ 成功插入 ${result.length} 条房源`)
  
  const stats = {}
  result.forEach(h => { stats[h.district] = (stats[h.district] || 0) + 1 })
  console.log('\n📊 各区房源:')
  Object.entries(stats).forEach(([d, c]) => console.log(`   ${d}: ${c}套`))
  
  await mongoose.disconnect()
  console.log('\n🎉 完成！可刷新小程序查看效果')
}

main().catch(e => { console.error('❌ 失败:', e.message); process.exit(1) })
