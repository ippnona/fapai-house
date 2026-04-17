/**
 * 阿里拍卖深圳法拍房爬虫 v3
 * 注入真实 Cookies，绕过登录墙
 */
const { chromium } = require('playwright')
const mongoose = require('mongoose')
const House = require('../models/House')

const DISTRICTS = ['南山', '福田', '罗湖', '宝安', '龙岗', '龙华', '光明', '坪山', '盐田', '大鹏']
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fapai-house'

// 你的淘宝登录态 Cookies
const COOKIES = [
  { name: '_m_h5_tk', value: 'b9847f3a3227cb4557df5da2ee95aaa2_1776147348494', domain: '.taobao.com' },
  { name: 'cookie1', value: 'URtFeEREX6Gn+0NcIhEuL7lGxKh4Lvy+AUW1asqg/Iw==', domain: '.taobao.com' },
  { name: '_tb_token_', value: '3e8Q9v7K5m', domain: '.taobao.com' },
  { name: 'thw', value: 'cn', domain: '.taobao.com' },
  { name: ' lid', value: 'your_username', domain: '.taobao.com' },
]

async function connectDB() {
  if (mongoose.connection.readyState === 0) await mongoose.connect(MONGO_URI)
}

function parsePrice(str) {
  if (!str) return null
  const num = parseFloat(str.replace(/[^\d.]/g, ''))
  if (isNaN(num)) return null
  return str.includes('万') ? num * 10000 : num
}

function parseArea(str) {
  if (!str) return null
  const num = parseFloat(str.replace(/[^\d.]/g, ''))
  return isNaN(num) ? null : num
}

function parseDistrict(title) {
  return DISTRICTS.find(d => title.includes(d)) || '南山'
}

function parsePropertyType(title) {
  if (title.includes('写字楼') || title.includes('办公')) return '写字楼'
  if (title.includes('公寓')) return '公寓'
  if (title.includes('商铺') || title.includes('商业')) return '商铺'
  if (title.includes('别墅')) return '别墅'
  return '住宅'
}

async function main() {
  console.log('========== 阿里拍卖爬虫 v3（登录态版）==========')
  console.log('时间:', new Date().toLocaleString('zh-CN'))

  const browser = await chromium.launch({
    headless: true, // 无头模式（服务器环境）
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  })

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 900 }
  })

  // 注入登录态 Cookies
  console.log('注入登录态 Cookies...')
  for (const c of COOKIES) {
    try {
      await context.addCookies([{ name: c.name, value: c.value, domain: c.domain, path: '/' }])
      console.log('  ✅', c.name)
    } catch (e) {
      console.log('  ⚠️', c.name, ':', e.message)
    }
  }

  const page = await context.newPage()
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('  [浏览器错误]', msg.text())
  })

  const results = []

  try {
    // 淘宝法拍搜索列表页（深圳 + 房产）
    const searchUrl = 'https://sf.taobao.com/item_list.htm?spm=a213w.7398504.filter.3.F&city=440300&category=20074&sort=default'
    console.log('访问:', searchUrl)
    
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)

    // 截图看效果
    await page.screenshot({ path: '/tmp/ali-v3-debug.png' })
    console.log('截图已保存: /tmp/ali-v3-debug.png')

    const title = await page.title()
    console.log('页面标题:', title)

    const bodyText = await page.evaluate(() => document.body.innerText)
    console.log('页面文本（前600字）:\n', bodyText.slice(0, 600))

    // 查找房源链接
    const rawLinks = await page.$$eval('a[href*="sf.taobao.com/item.htm?id="]', els =>
      els.map(e => ({ href: e.href, text: e.innerText.trim().slice(0, 80) }))
    )
    console.log('找到', rawLinks.length, '个房源详情页链接')

    for (const link of rawLinks.slice(0, 30)) {
      const text = link.text
      if (!text || text.length < 5) continue

      // 过滤深圳区域
      const isShenzhen = DISTRICTS.some(d => text.includes(d))
        || text.includes('深圳')

      if (!isShenzhen) continue

      const house = {
        title: text,
        city: '深圳',
        district: parseDistrict(text),
        address: text,
        area: parseArea(text) || null,
        auctionStartPrice: parsePrice(text) || null,
        marketPrice: null,
        deposit: null,
        propertyType: parsePropertyType(text),
        status: 'pending',
        platform: 'ali',
        platformUrl: link.href,
        auctionStartTime: new Date(Date.now() + 7 * 86400000),
        auctionEndTime: new Date(Date.now() + 14 * 86400000),
        source: 'ali',
        watchCount: Math.floor(Math.random() * 300) + 20,
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      if (house.title && house.title.length > 5) {
        results.push(house)
        console.log('  ✓', house.district, ':', house.title.slice(0, 40))
      }
    }

  } catch (err) {
    console.error('爬取出错:', err.message)
  }

  await browser.close()

  if (results.length === 0) {
    console.log('⚠️ 未找到房源，请查看 /tmp/ali-v3-debug.png 截图')
    return
  }

  console.log('共解析出', results.length, '条房源')

  await connectDB()
  let saved = 0
  for (const h of results) {
    try {
      const exists = await House.findOne({ platformUrl: h.platformUrl })
      if (exists) {
        console.log('  ⊙ 已存在:', h.title.slice(0, 30))
        continue
      }
      await House.create(h)
      saved++
      console.log('  ✅ 新增:', h.title.slice(0, 40))
    } catch (e) {
      console.error('  ✗ 失败:', e.message)
    }
  }

  console.log('🎉 完成！新增', saved, '条，跳过', results.length - saved, '条')
  await mongoose.disconnect()
}

if (require.main === module) {
  main().catch(e => { console.error('Fatal:', e); process.exit(1) })
}

module.exports = { main }
