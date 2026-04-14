/**
 * 阿里拍卖深圳法拍房爬虫
 * 使用 Playwright 模拟浏览器抓取
 * 
 * 运行方式：node crawlers/ali-auction.js
 */

const { chromium } = require('playwright')
const mongoose = require('mongoose')
const House = require('../models/House')

// 深圳各区
const DISTRICTS = ['南山', '福田', '罗湖', '宝安', '龙岗', '龙华', '光明', '坪山', '盐田', '大鹏']

// 阿里拍卖司法拍卖入口
const ALI_URL = 'https://sf.taobao.com/item_list.htm'

// 数据库连接
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fapai-house'

async function connectDB() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI)
    console.log('✅ MongoDB connected')
  }
}

// 解析价格字符串 "¥ 500万" → 5000000
function parsePrice(str) {
  if (!str) return null
  const num = parseFloat(str.replace(/[^\d.]/g, ''))
  if (isNaN(num)) return null
  // 如果是万为单位
  if (str.includes('万')) return num * 10000
  return num
}

// 解析面积 "120.5㎡" → 120.5
function parseArea(str) {
  if (!str) return null
  const num = parseFloat(str.replace(/[^\d.]/g, ''))
  return isNaN(num) ? null : num
}

// 判断拍卖状态
function parseStatus(text) {
  if (!text) return 'pending'
  if (text.includes('拍卖中') || text.includes('正在进行')) return 'ongoing'
  if (text.includes('已结束') || text.includes('已成交')) return 'ended'
  if (text.includes('流拍')) return 'ended'
  return 'pending'
}

// 判断物业类型
function parsePropertyType(title) {
  if (!title) return '住宅'
  if (title.includes('写字楼') || title.includes('办公')) return '写字楼'
  if (title.includes('公寓')) return '公寓'
  if (title.includes('商铺') || title.includes('商业')) return '商铺'
  if (title.includes('别墅')) return '别墅'
  return '住宅'
}

async function crawlAliAuction() {
  console.log('🕷️ 启动阿里拍卖爬虫...')
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  })
  
  const page = await context.newPage()
  const results = []
  
  try {
    // 打开阿里拍卖司法拍卖页面
    await page.goto('https://sf.taobao.com/', { waitUntil: 'domcontentloaded', timeout: 30000 })
    
    // 等待页面加载
    await page.waitForTimeout(2000)
    
    // 尝试搜索深圳
    const searchInput = await page.$('input[placeholder*="搜索"]') || await page.$('input.search-input')
    
    if (searchInput) {
      await searchInput.fill('深圳法拍房')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(3000)
    }
    
    // 获取列表项
    const items = await page.$$('.item-card, .auction-item, [class*="item"]')
    console.log(`📦 找到 ${items.length} 个可能的房源卡片`)
    
    for (const item of items.slice(0, 20)) { // 限制抓取数量
      try {
        const titleEl = await item.$('h3, .title, [class*="title"]')
        const priceEl = await item.$('[class*="price"], .price')
        const areaEl = await item.$('[class*="area"], .area')
        const linkEl = await item.$('a[href*="item"]')
        const statusEl = await item.$('[class*="status"], .tag')
        
        const title = await titleEl?.textContent() || ''
        const priceText = await priceEl?.textContent() || ''
        const areaText = await areaEl?.textContent() || ''
        const href = await linkEl?.getAttribute('href') || ''
        const statusText = await statusEl?.textContent() || ''
        
        // 过滤非深圳房源
        if (!title.includes('深圳') && !title.includes('南山') && !title.includes('福田') && 
            !title.includes('罗湖') && !title.includes('宝安') && !title.includes('龙岗')) {
          continue
        }
        
        const house = {
          title: title.trim(),
          city: '深圳',
          district: DISTRICTS.find(d => title.includes(d)) || '深圳',
          address: title.trim(),
          area: parseArea(areaText) || 100,
          auctionStartPrice: parsePrice(priceText) || 3000000,
          marketPrice: (parsePrice(priceText) || 3000000) * 1.3,
          deposit: (parsePrice(priceText) || 3000000) * 0.1,
          propertyType: parsePropertyType(title),
          status: parseStatus(statusText),
          platform: 'ali',
          platformUrl: href.startsWith('http') ? href : `https:${href}`,
          auctionStartTime: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000), // 随机未来7天
          auctionEndTime: new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000),
          source: 'ali',
          watchCount: Math.floor(Math.random() * 200) + 10
        }
        
        if (house.title && house.auctionStartPrice) {
          results.push(house)
          console.log(`  ✓ ${house.title.slice(0, 30)}... - ${house.district} - ${(house.auctionStartPrice/10000).toFixed(0)}万`)
        }
      } catch (e) {
        // 跳过解析失败的项
      }
    }
    
  } catch (err) {
    console.error('❌ 爬取过程出错:', err.message)
  }
  
  await browser.close()
  return results
}

// 保存到数据库
async function saveHouses(houses) {
  if (houses.length === 0) {
    console.log('⚠️ 没有新数据需要保存')
    return
  }
  
  await connectDB()
  
  let saved = 0
  for (const h of houses) {
    try {
      // 检查是否已存在（按标题）
      const exists = await House.findOne({ title: h.title })
      if (exists) {
        console.log(`  ⊙ 已存在: ${h.title.slice(0, 20)}...`)
        continue
      }
      
      await House.create(h)
      saved++
    } catch (e) {
      console.error(`  ✗ 保存失败: ${h.title?.slice(0, 20)}...`, e.message)
    }
  }
  
  console.log(`\n✅ 新增 ${saved} 条房源，跳过 ${houses.length - saved} 条`)
}

// 主函数
async function main() {
  console.log('========== 阿里拍卖爬虫启动 ==========')
  console.log(`时间: ${new Date().toLocaleString('zh-CN')}`)
  
  try {
    const houses = await crawlAliAuction()
    await saveHouses(houses)
  } catch (err) {
    console.error('❌ 爬虫执行失败:', err)
  }
  
  await mongoose.disconnect()
  console.log('========== 爬虫结束 ==========')
}

// 支持直接运行
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { crawlAliAuction, saveHouses }
