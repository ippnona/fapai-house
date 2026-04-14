/**
 * 统一爬虫入口
 * 运行方式：node crawlers/run-all.js
 */

const { crawlAliAuction, saveHouses: saveAli } = require('./ali-auction')
const { crawlJDAuction, saveHouses: saveJD } = require('./jd-auction')

async function main() {
  console.log('\n🚀 ====== 法拍房数据爬虫启动 ======')
  console.log(`📅 时间: ${new Date().toLocaleString('zh-CN')}\n`)
  
  let total = 0
  
  // 1. 阿里拍卖
  try {
    console.log('--- 1️⃣ 阿里拍卖 ---')
    const aliHouses = await crawlAliAuction()
    await saveAli(aliHouses)
    total += aliHouses.length
  } catch (e) {
    console.error('阿里拍卖爬取失败:', e.message)
  }
  
  console.log('')
  
  // 2. 京东拍卖
  try {
    console.log('--- 2️⃣ 京东拍卖 ---')
    const jdHouses = await crawlJDAuction()
    await saveJD(jdHouses)
    total += jdHouses.length
  } catch (e) {
    console.error('京东拍卖爬取失败:', e.message)
  }
  
  console.log(`\n🎉 ====== 爬取完成，共获取 ${total} 条房源 ======\n`)
  
  process.exit(0)
}

main().catch(e => {
  console.error('❌ 爬虫失败:', e)
  process.exit(1)
})
