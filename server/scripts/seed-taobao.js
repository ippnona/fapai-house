/**
 * 淘宝真实法拍数据 v2
 * 10条深圳真实房源（用户提供，含真实价格/时间/围观数）
 */
const mongoose = require('mongoose')
const House = require('../models/House')

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fapai-house'

const LISTINGS = [
  {
    title: '关于拍卖深圳市福田区红荔路园岭新村园岭新村83栋613房（现为109栋七单元613房）的51%产权份额',
    city: '深圳',
    district: '福田',
    address: '福田区红荔路园岭新村83栋613房（现为109栋七单元613房）',
    area: 80,
    auctionStartPrice: 1362839,       // ¥136.2839万
    marketPrice: 2129437,             // ¥212.9437万
    deposit: 272568,                  // 约20%保证金
    propertyType: '住宅',
    status: 'pending',
    platform: 'ali',
    auctionStartTime: new Date('2026-04-29T10:00:00'),
    auctionEndTime: new Date('2026-04-30T10:00:00'),
    watchCount: 505,
    riskLevel: 'medium',
    remark: '51%产权份额',
  },
  {
    title: '广东省深圳市罗湖区凤凰路3号海珑华苑海天阁1522房产',
    city: '深圳',
    district: '罗湖',
    address: '罗湖区凤凰路3号海珑华苑海天阁1522',
    area: 90,
    auctionStartPrice: 1621630,       // ¥162.163万
    marketPrice: 2027037,             // ¥202.7037万
    deposit: null, // 保证金信息未公开
    propertyType: '住宅',
    status: 'pending',
    platform: 'ali',
    auctionStartTime: new Date('2026-05-18T10:00:00'),
    auctionEndTime: new Date('2026-05-19T10:00:00'),
    watchCount: 255,
    riskLevel: 'medium',
  },
  {
    title: '关于拍卖广东省深圳市南山区荔湾路南、兴海路西月亮湾花园5栋506房产',
    city: '深圳',
    district: '南山',
    address: '南山区荔湾路南、兴海路西月亮湾花园5栋506',
    area: 90,
    auctionStartPrice: 3258626,       // ¥325.8626万
    marketPrice: 4073283,             // ¥407.3283万（评估价）
    deposit: null, // 保证金信息未公开
    propertyType: '住宅',
    status: 'pending',
    platform: 'ali',
    auctionStartTime: new Date('2026-04-22T10:00:00'),
    auctionEndTime: new Date('2026-04-23T10:00:00'),
    watchCount: 5730,
    riskLevel: 'high',
    remark: '5730次围观，热度高',
  },
  {
    title: '深圳市南山区南山大道华联花园1A栋204号不动产',
    city: '深圳',
    district: '南山',
    address: '南山区南山大道华联花园1A栋204号',
    area: 90,
    auctionStartPrice: 1120000,       // ¥112万
    marketPrice: 1595497,             // ¥159.5497万（评估价）
    deposit: null, // 保证金信息未公开
    propertyType: '住宅',
    status: 'pending',
    platform: 'ali',
    auctionStartTime: new Date('2026-05-08T10:00:00'),
    auctionEndTime: new Date('2026-05-09T10:00:00'),
    watchCount: 2643,
    riskLevel: 'medium',
  },
  {
    title: '被执行人伍俊、李思文名下位于深圳市罗湖区布吉路海关住宅7#楼805的房产所享有的剩余拆迁补偿权益',
    city: '深圳',
    district: '罗湖',
    address: '罗湖区布吉路海关住宅7#楼805',
    area: 90,
    auctionStartPrice: 3118656,       // ¥311.8656万
    marketPrice: 4872900,             // ¥487.29万（评估价）
    deposit: null, // 保证金信息未公开
    propertyType: '住宅',
    status: 'pending',
    platform: 'ali',
    auctionStartTime: new Date('2026-04-28T10:00:00'),
    auctionEndTime: new Date('2026-04-29T10:00:00'),
    watchCount: 1062,
    riskLevel: 'high',
    remark: '剩余拆迁补偿权益（不含装修补偿/搬迁费/临时安置费/奖励金）',
  },
  {
    title: '盐田区大梅沙片区湖心岛公寓5栋K-402',
    city: '深圳',
    district: '盐田',
    address: '盐田区大梅沙片区湖心岛公寓5栋K-402',
    area: 90,
    auctionStartPrice: 908031,        // ¥90.8031万
    marketPrice: 1297187,             // ¥129.7187万（评估价）
    deposit: null, // 保证金信息未公开
    propertyType: '公寓',
    status: 'pending',
    platform: 'ali',
    auctionStartTime: new Date('2026-05-25T10:00:00'),
    auctionEndTime: new Date('2026-05-26T10:00:00'),
    watchCount: 2712,
    riskLevel: 'low',
  },
  {
    title: '广东省深圳市罗湖区宝安北路单身宿舍春笋楼A503房产',
    city: '深圳',
    district: '罗湖',
    address: '罗湖区宝安北路单身宿舍春笋楼A503',
    area: 90,
    auctionStartPrice: 4141769,      // ¥414.1769万
    marketPrice: 5177211,             // ¥517.7211万（市场价）
    deposit: null, // 保证金信息未公开
    propertyType: '住宅',
    status: 'pending',
    platform: 'ali',
    auctionStartTime: new Date('2026-04-22T10:00:00'),
    auctionEndTime: new Date('2026-04-23T10:00:00'),
    watchCount: 2421,
    riskLevel: 'medium',
  },
  {
    title: '关于拍卖深圳市光明区光明办事处东周一街与光安路交汇处西南角星河天地花园一期E座3706房',
    city: '深圳',
    district: '光明',
    address: '光明区光明办事处东周一街与光安路交汇处西南角星河天地花园一期E座3706',
    area: 90,
    auctionStartPrice: 3025480,       // ¥302.548万
    marketPrice: 3781850,              // ¥378.185万（评估价）
    deposit: null, // 保证金信息未公开
    propertyType: '住宅',
    status: 'pending',
    platform: 'ali',
    auctionStartTime: new Date('2026-05-06T10:00:00'),
    auctionEndTime: new Date('2026-05-07T10:00:00'),
    watchCount: 2935,
    riskLevel: 'medium',
  },
  {
    title: '深圳市罗湖区银湖路国际会议中心13栋全栋',
    city: '深圳',
    district: '罗湖',
    address: '罗湖区银湖路国际会议中心13栋',
    area: 90,
    auctionStartPrice: 43630000,      // ¥4363万（总价）
    marketPrice: 43630000,            // 同评估价
    deposit: null, // 保证金信息未公开
    propertyType: '写字楼',
    status: 'pending',
    platform: 'ali',
    auctionStartTime: new Date('2026-04-29T10:00:00'),
    auctionEndTime: new Date('2026-04-30T10:00:00'),
    watchCount: 6327,
    riskLevel: 'high',
    remark: '全栋，整栋拍卖',
  },
  {
    title: '关于拍卖深圳市南山区填海五区9号地滨福世纪广场201房',
    city: '深圳',
    district: '南山',
    address: '南山区填海五区9号地滨福世纪广场201',
    area: 90,
    auctionStartPrice: 18804195,      // ¥1880.4195万
    marketPrice: 23505244,            // ¥2350.5244万（评估价）
    deposit: null, // 保证金信息未公开
    propertyType: '写字楼',
    status: 'pending',
    platform: 'ali',
    auctionStartTime: new Date('2026-05-07T10:00:00'),
    auctionEndTime: new Date('2026-05-08T10:00:00'),
    watchCount: 2327,
    riskLevel: 'medium',
  },
]

async function main() {
  console.log('========== 淘宝真实数据写入 v2 ==========')
  console.log('时间:', new Date().toLocaleString('zh-CN'))
  console.log('共', LISTINGS.length, '条\n')

  await mongoose.connect(MONGO_URI)
  console.log('✅ MongoDB 连接成功')

  // 清空旧测试数据
  const delOld = await House.deleteMany({ platform: 'ali', source: 'manual' })
  console.log(`🗑️  清空旧数据: ${delOld.deletedCount} 条\n`)

  let saved = 0
  for (const item of LISTINGS) {
    const house = {
      ...item,
      source: 'manual',
      platformUrl: 'manual-entry',
      userId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    try {
      await House.create(house)
      saved++
      const price = (house.auctionStartPrice / 10000).toFixed(2)
      console.log(`  ✅ [${item.district}] ${price}万  ${item.title.slice(0, 30)}...`)
    } catch (e) {
      console.error(`  ✗ 失败: ${e.message}`)
    }
  }

  console.log(`\n🎉 完成！新增 ${saved} 条`)

  // 各区分布
  console.log('\n📊 各区分布:')
  const byDistrict = LISTINGS.reduce((acc, l) => {
    acc[l.district] = (acc[l.district] || 0) + 1
    return acc
  }, {})
  for (const [d, c] of Object.entries(byDistrict)) {
    const price = LISTINGS.filter(l => l.district === d)
      .reduce((s, l) => s + l.auctionStartPrice, 0)
    console.log(`  ${d}: ${c}套（总价约${(price / 10000).toFixed(0)}万）`)
  }

  // 热度排行
  console.log('\n🔥 热度TOP3:')
  const top3 = [...LISTINGS].sort((a, b) => b.watchCount - a.watchCount).slice(0, 3)
  top3.forEach((l, i) => {
    console.log(`  ${i + 1}. ${l.watchCount}次围观  ${l.district}  ${(l.auctionStartPrice / 10000).toFixed(0)}万`)
  })

  await mongoose.disconnect()
  console.log('\n👋 MongoDB 已断开')
}

if (require.main === module) {
  main().catch(e => { console.error('Fatal:', e); process.exit(1) })
}

module.exports = { main }
