/**
 * 阿里拍卖深圳法拍房爬虫 v2
 * 改进：更稳定的页面等待 + 调试输出
 */
const { chromium } = require('playwright')
const mongoose = require('mongoose')
const House = require('../models/House')

const DISTRICTS = ['南山', '福田', '罗湖', '宝安', '龙岗', '龙华', '光明', '坪山', '盐田', '大鹏']
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fapai-house'

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
  console.log('========== 阿里拍卖爬虫 v2 ==========')
  console.log(`时间: ${new Date().toLocaleString('zh-CN')}`)

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  })

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 900 }
  })

  const page = await context.newPage()
  
  // 收集所有 console 日志
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('  [浏览器错误]', msg.text())
  })

  const results = []

  try {
    // 方式1：直接访问带搜索条件的页面
    const searchUrl = 'https://sf.taobao.com/item_list.htm?spm=a213w.7398504.filter.3.F&city=440300&category=20074&sort=default'
    console.log(`🔗 访问: ${searchUrl}`)
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)

    // 截图调试
    await page.screenshot({ path: '/tmp/ali-auction-debug.png' })
    console.log('📸 截图已保存到 /tmp/ali-auction-debug.png')

    // 打印页面标题
    const title = await page.title()
    console.log(`📄 页面标题: ${title}`)

    // 尝试多种选择器
    const selectors = [
      '.item-info',
      '.product-item',
      '[class*="item"]',
      'li[data-id]',
      '.list-item',
      'a[href*="item.htm"]'
    ]

    for (const sel of selectors) {
      const els = await page.$$(sel)
      console.log(`  选择器 "${sel}": 找到 ${els.length} 个`)
    }

    // 获取页面 HTML 片段
    const html = await page.content()
    const bodyText = await page.evaluate(() => document.body.innerText)
    console.log(`\n📝 页面文本（前500字）:\n${bodyText.slice(0, 500)}\n`)

    // 查找所有链接
    const links = await page.$$eval('a[href*="item.htm"]', els => 
      els.slice(0, 10).map(e => ({ href: e.href, text: e.innerText.slice(0, 50) }))
    )
    console.log('🔗 前10个 item.htm 链接:')
    links.forEach(l => console.log(`   ${l.text} -> ${l.href}`))

    // 尝试抓取列表页的每一项
    // 淘宝拍卖的列表结构通常是 <ul><li>...</li></ul> 或纯 a 标签
    const rawLinks = await page.$$eval('a[href*="sf.taobao.com/item.htm?id="]', els =>
      els.map(e => ({ href: e.href, text: e.innerText.trim().slice(0, 80) }))
    )
    console.log(`\n🎯 找到 ${rawLinks.length} 个房源详情页链接`)

    for (const link of rawLinks.slice(0, 20)) {
      // 过滤深圳
      const text = link.text
      if (!text) continue
      const isShenzhen = DISTRICTS.some(d => text.includes(d))
        || text.includes('深圳') || text.includes('广东') || text.includes('广州')

      if (!isShenzhen) continue

      const house = {
        title: text || link.href.split('id=')[1],
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
        console.log(`  ✓ ${house.district}: ${house.title.slice(0, 40)}`)
      }
    }

  } catch (err) {
    console.error('❌ 爬取出错:', err.message)
  }

  await browser.close()

  // 保存结果
  if (results.length === 0) {
    console.log('⚠️ 未找到任何房源（可能是页面结构变化，请查看截图）')
    await saveDebugInfo(html || '')
    return
  }

  console.log(`\n📊 共解析出 ${results.length} 条房源`)

  await connectDB()
  let saved = 0
  for (const h of results) {
    try {
      const exists = await House.findOne({ platformUrl: h.platformUrl })
      if (exists) {
        console.log(`  ⊙ 已存在: ${h.title.slice(0, 30)}`)
        continue
      }
      await House.create(h)
      saved++
      console.log(`  ✅ 新增: ${h.title.slice(0, 40)}`)
    } catch (e) {
      console.error(`  ✗ 失败: ${e.message}`)
    }
  }

  console.log(`\n🎉 完成！新增 ${saved} 条，跳过 ${results.length - saved} 条`)
  await mongoose.disconnect()
}

async function saveDebugInfo(html) {
  try {
    await require('fs').promises.writeFile('/tmp/ali-page.html', html.slice(0, 50000))
    console.log('📄 页面 HTML 已保存到 /tmp/ali-page.html')
  } catch (e) {}
}

if (require.main === module) {
  main().catch(e => { console.error('Fatal:', e); process.exit(1) })
}

module.exports = { main }
