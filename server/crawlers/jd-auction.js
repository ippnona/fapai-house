/**
 * 京东拍卖爬虫 - 深圳法拍房
 * 
 * 使用方法:
 *   node crawlers/jd-auction.js           # 默认抓取深圳法拍房
 *   node crawlers/jd-auction.js --limit 50  # 限制条数
 *   node crawlers/jd-auction.js --dry-run   # 只打印不写入
 */

const mongoose = require('mongoose')
const House = require('../models/House')

const BASE_URL = 'https://paimai.jd.com'

// 京东拍卖搜索接口
const SEARCH_URL = 'https://api.m.jd.com/client.action'

async function fetchJdList(page = 1, pageSize = 20) {
  const params = new URLSearchParams({
    functionId: 'searchAssetList',
    client: 'pc',
    clientVersion: '1.0.0',
    body: JSON.stringify({
      category: '1625',  // 房产类目
      province: '广东省',
      city: '深圳市',
      page: page,
      pageSize: pageSize,
      sortField: 0
    })
  })
  
  const res = await fetch(SEARCH_URL + '?' + params.toString(), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Referer': 'https://paimai.jd.com/',
      'Accept': 'application/json'
    }
  })
  
  const data = await res.json()
  return data
}

async function fetchJdDetail(productId) {
  const url = `https://paimai.jd.com/json/current/englishproduct/detail?productId=${productId}`
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Referer': `https://paimai.jd.com/${productId}`
    }
  })
  
  const data = await res.json()
  return data
}

function parsePrice(str) {
  if (!str) return null
  // 处理 "123.45万" 格式
  if (str.includes('万')) {
    return Math.round(parseFloat(str.replace('万', '')) * 10000)
  }
  // 处理 "1.23亿" 格式
  if (str.includes('亿')) {
    return Math.round(parseFloat(str.replace('亿', '')) * 100000000)
  }
  // 纯数字（元）
  const num = parseFloat(str.replace(/[^0-9.]/g, ''))
  return isNaN(num) ? null : Math.round(num)
}

function parseArea(str) {
  if (!str) return null
  const match = str.match(/([\d.]+)/)
  return match ? parseFloat(match[1]) : null
}

function parseDistrict(title) {
  const districts = ['福田', '南山', '罗湖', '宝安', '龙岗', '龙华', '盐田', '光明', '坪山', '大鹏']
  for (const d of districts) {
    if (title.includes(d)) return d
  }
  return '深圳'
}

function parsePropertyType(title, tags = []) {
  if (title.includes('商铺') || title.includes('商业')) return '商铺'
  if (title.includes('办公') || title.includes('写字楼')) return '办公'
  if (title.includes('公寓')) return '公寓'
  if (title.includes('别墅')) return '别墅'
  if (tags.some(t => t.includes('住宅'))) return '住宅'
  return '住宅'
}

function parseAuctionTime(startTime, endTime) {
  const parseDate = (str) => {
    if (!str) return null
    // 京东时间格式: "2024-04-20 10:00:00"
    return new Date(str.replace(/-/g, '/'))
  }
  return {
    start: parseDate(startTime),
    end: parseDate(endTime)
  }
}

function mapStatus(status) {
  const map = {
    'wait': 'pending',
    'going': 'ongoing',
    'end': 'ended',
    'success': 'sold',
    'fail': 'ended'
  }
  return map[status] || 'pending'
}

async function crawlJdAuction(limit = 100, dryRun = false) {
  console.log('🕷️ 开始抓取京东拍卖 - 深圳法拍房...\n')
  
  const houses = []
  let page = 1
  let total = 0
  
  while (houses.length < limit) {
    console.log(`📄 正在获取第 ${page} 页...`)
    
    let data
    try {
      data = await fetchJdList(page, 20)
    } catch (err) {
      console.error('❌ 获取列表失败:', err.message)
      break
    }
    
    const list = data?.data?.list || data?.list || []
    if (!list.length) {
      console.log('✅ 没有更多数据')
      break
    }
    
    for (const item of list) {
      if (houses.length >= limit) break
      
      try {
        const productId = item.productId || item.id
        const title = item.title || item.productName || '未知房源'
        const startPrice = parsePrice(item.startPrice || item.currentPrice || item.price)
        const marketPrice = parsePrice(item.marketPrice || item.evalPrice)
        const deposit = parsePrice(item.bailPrice || item.deposit)
        
        // 获取详情
        let detail = null
        try {
          detail = await fetchJdDetail(productId)
          await new Promise(r => setTimeout(r, 500)) // 避免请求过快
        } catch (e) {
          console.log('  ⚠️ 获取详情失败:', productId)
        }
        
        const detailData = detail?.data || detail || {}
        const area = parseArea(detailData.area || detailData.houseArea || item.area)
        const time = parseAuctionTime(
          detailData.startTime || item.startTime,
          detailData.endTime || item.endTime
        )
        
        const houseData = {
          title: title.substring(0, 100),
          city: '深圳',
          district: parseDistrict(title),
          address: detailData.address || item.address || '',
          propertyType: parsePropertyType(title, item.tags || []),
          area: area,
          roomLayout: detailData.roomLayout || '',
          marketPrice: marketPrice,
          auctionStartPrice: startPrice,
          deposit: deposit,
          currentPrice: parsePrice(item.currentPrice),
          platform: 'jd',
          platformUrl: `https://paimai.jd.com/${productId}`,
          auctionStartTime: time.start || new Date(),
          auctionEndTime: time.end || new Date(Date.now() + 7 * 86400000),
          status: mapStatus(item.status || detailData.status),
          riskLevel: '中',
          images: detailData.images || item.images || [],
          source: 'jd'
        }
        
        // 只保留有效数据
        if (houseData.auctionStartPrice && houseData.auctionStartTime) {
          houses.push(houseData)
          console.log(`  ✅ [${houses.length}] ${houseData.district} | ${formatPrice(houseData.auctionStartPrice)} | ${title.substring(0, 30)}...`)
        }
      } catch (err) {
        console.log('  ⚠️ 解析失败:', err.message)
      }
    }
    
    page++
    await new Promise(r => setTimeout(r, 1000)) // 页间延迟
  }
  
  console.log(`\n📊 共获取 ${houses.length} 条房源数据`)
  
  if (dryRun) {
    console.log('\n🔍 [DRY-RUN] 数据预览:')
    houses.slice(0, 3).forEach((h, i) => {
      console.log(`\n[${i+1}] ${h.title}`)
      console.log(`   区域: ${h.district} | 类型: ${h.propertyType}`)
      console.log(`   起拍: ${formatPrice(h.auctionStartPrice)} | 保证金: ${formatPrice(h.deposit)}`)
      console.log(`   链接: ${h.platformUrl}`)
    })
    return houses
  }
  
  // 写入数据库
  console.log('\n💾 写入数据库...')
  
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/fapai-house'
  await mongoose.connect(MONGO_URI)
  console.log('✅ MongoDB 已连接')
  
  let inserted = 0
  let skipped = 0
  
  for (const h of houses) {
    // 检查是否已存在（按平台链接去重）
    const exists = await House.findOne({ platformUrl: h.platformUrl })
    if (exists) {
      skipped++
      continue
    }
    
    try {
      await House.create(h)
      inserted++
    } catch (err) {
      console.log('  ⚠️ 写入失败:', err.message)
    }
  }
  
  console.log(`\n✅ 完成！新增 ${inserted} 条，跳过重复 ${skipped} 条`)
  
  await mongoose.disconnect()
  return houses
}

function formatPrice(v) {
  if (!v) return '-'
  return v >= 100000000 ? (v/100000000).toFixed(1) + '亿' : (v/10000).toFixed(0) + '万'
}

// 命令行参数
const args = process.argv.slice(2)
const limitArg = args.find(a => a.startsWith('--limit'))
const limit = limitArg ? parseInt(limitArg.split('=')[1] || args[args.indexOf(limitArg) + 1]) : 100
const dryRun = args.includes('--dry-run')

// 执行
crawlJdAuction(limit, dryRun).catch(err => {
  console.error('❌ 爬虫执行失败:', err)
  process.exit(1)
})
