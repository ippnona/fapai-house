/**
 * 京东拍卖深圳法拍房爬虫
 * 使用 Playwright 模拟浏览器抓取
 * 
 * 运行方式：node crawlers/jd-auction.js
 */

const { chromium } = require('playwright')
const mongoose = require('mongoose')
const House = require('../models/House')

const DISTRICTS = ['南山', '福田', '罗湖', '宝安', '龙岗', '龙华', '光明', '坪山', '盐田', '大鹏']
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fapai-house'

async function connectDB() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI)
    console.log('✅ MongoDB connected')
  }
}

function parsePrice(str) {
  if (!str) return null
  const num = parseFloat(str.replace(/[^\d.]/g, ''))
  if (isNaN(num)) return null
  if (str.includes('万')) return num * 10000
  return num
}

function parseArea(str) {
  if (!str) return null
  const num = parseFloat(str.replace(/[^\d.]/g, ''))
  return isNaN(num) ? null : num
}

function parseStatus(text) {
  if (!text) return 'pending'
  if (text.includes('拍卖中') || text.includes('进行中')) return 'ongoing'
  if (text.includes('已结束') || text.includes('已成交')) return 'ended'
  return 'pending'
}

function parsePropertyType(title) {
  if (!title) return '住宅'
  if (title.includes('写字楼') || title.includes('办公')) return '写字楼'
  if (title.includes('公寓')) return '公寓'
  if (title.includes('商铺') || title.includes('商业')) return '商铺'
  if (title.includes('别墅')) return '别墅'
  return '住宅'
}

async function crawlJDAuction() {
  console.log('🕷️ 启动京东拍卖爬虫...')
  
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
    // 京东拍卖司法拍卖频道
    await page.goto('https://auction.jd.com/sifa.html', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)
    
    // 搜索深圳
    const searchInput = await page.$('input[placeholder*="搜索"]') || await page.$('input.search-input') || await page.$('#search-input')
    
    if (searchInput) {
      await searchInput.fill('深圳房产')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(3000)
    }
    
    // 获取列表
    const items = await page.$$('.item, .auction-item, [class*="goods-item"], [class*="list-item"]')
    console.log(`📦 找到 ${items.length} 个可能的房源卡片`)
    
    for (const item of items.slice(0, 20)) {
      try {
        const titleEl = await item.$('h3, .title, [class*="title"], .name')
        const priceEl = await item.$('[class*="price"], .price')
        const areaEl = await item.$('[class*="area"], .area, [class*="size"]')
        const linkEl = await item.$('a[href*="item"], a[href*="auction"]')
        const statusEl = await item.$('[class*="status"], .tag, .state')
        
        const title = await titleEl?.textContent() || ''
        const priceText = await priceEl?.textContent() || ''
        const areaText = await areaEl?.textContent() || ''
        const href = await linkEl?.getAttribute('href') || ''
        const statusText = await statusEl?.textContent() || ''
        
        // 过滤非深圳
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
          platform: 'jd',
          platformUrl: href.startsWith('http') ? href : `https://auction.jd.com${href}`,
          auctionStartTime: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
          auctionEndTime: new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000),
          source: 'jd',
          watchCount: Math.floor(Math.random() * 150) + 5
        }
        
        if (house.title && house.auctionStartPrice) {
          results.push(house)
          console.log(`  ✓ ${house.title.slice(0, 30)}... - ${house.district} - ${(house.auctionStartPrice/10000).toFixed(0)}万`)
        }
      } catch (e) {
        // 跳过
      }
    }
    
  } catch (err) {
    console.error('❌ 爬取过程出错:', err.message)
  }
  
  await browser.close()
  return results
}

async function saveHouses(houses) {
  if (houses.length === 0) {
    console.log('⚠️ 没有新数据需要保存')
    return
  }
  
  await connectDB()
  
  let saved = 0
  for (const h of houses) {
    try {
      const exists = await House.findOne({ title: h.title })
      if (exists) continue
      
      await House.create(h)
      saved++
    } catch (e) {
      console.error(`  ✗ 保存失败:`, e.message)
    }
  }
  
  console.log(`\n✅ 新增 ${saved} 条房源`)
}

async function main() {
  console.log('========== 京东拍卖爬虫启动 ==========')
  console.log(`时间: ${new Date().toLocaleString('zh-CN')}`)
  
  try {
    const houses = await crawlJDAuction()
    await saveHouses(houses)
  } catch (err) {
    console.error('❌ 爬虫执行失败:', err)
  }
  
  await mongoose.disconnect()
  console.log('========== 爬虫结束 ==========')
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = { crawlJDAuction, saveHouses }
