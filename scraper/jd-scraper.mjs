/**
 * 京东法拍数据采集脚本
 * 目标: https://sifa.jd.com 司法拍卖 - 深圳 住宅/商业
 * 
 * 策略:
 * 1. 先尝试直接 API (fetch)，无验证码但需要 cookie
 * 2. 回退 Playwright 渲染模式 (headed 模式可手动过验证码)
 * 
 * 输出: 按 House 模型格式输出到 ../data/jd_YYYY-MM-DD.json
 */

import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initBrowser, waitForCaptcha, parsePrice, parseArea, normalizeStatus } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../data');

// JD 城市代码: 深圳 = 440300
const JD_CITY_CODE = '440300';

// 房源类别
const CATEGORY_MAP = {
  residential: '1', // 住宅用房
  commercial: '3',  // 商业用房
};

// JD 拍卖状态
const JD_STATUS_MAP = {
  '正在进行': 'ongoing',
  '即将开始': 'upcoming',
  '已结束': 'ended',
  '已成交': 'sold',
  '中止': 'suspended',
  '撤回': 'withdrawn',
};

/**
 * 尝试直接 API 获取 (推荐, 无需渲染)
 * JD 拍卖列表 API (推测端点)
 */
async function fetchViaAPI(page) {
  console.log('  [JD] 尝试直接 API 模式...');
  const results = [];
  
  // JD 司法拍卖 API 端点 (需要测试实际可用端点)
  const apiUrls = [
    // 司法拍卖列表 API
    `https://sifa.jd.com/auction/search?cityCode=${JD_CITY_CODE}&category=1&pageSize=20&pageIndex=1`,
    `https://paimai.jd.com/json//querySfItems.htm?cityCode=${JD_CITY_CODE}&page=1&pageSize=20`,
    // 京东拍卖通用列表
    `https://paimai.jd.com/queryItems?cityCode=${JD_CITY_CODE}&categoryId=1&pageIndex=1&pageSize=20`,
  ];

  for (const apiUrl of apiUrls) {
    try {
      const response = await page.request.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://sifa.jd.com/',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
        timeout: 15000,
      });

      const ct = response.headers()['content-type'] || '';
      const body = await response.text();

      if (response.status() === 200 && (ct.includes('json') || body.startsWith('{'))) {
        console.log(`  [JD] API 可用: ${apiUrl}`);
        console.log(`  [JD] 响应预览: ${body.substring(0, 300)}`);
        
        // 解析 JSON
        let data;
        try {
          data = JSON.parse(body);
        } catch {
          // 可能是 JSONP
          const jsonMatch = body.match(/\{[\s\S]*\}/);
          if (jsonMatch) data = JSON.parse(jsonMatch[0]);
        }

        if (data && (data.data || data.result || data.list || data.items)) {
          const items = data.data || data.result?.data || data.result?.list || data.list || data.items || [];
          console.log(`  [JD] 解析到 ${Array.isArray(items) ? items.length : '?'} 条数据`);
          return { url: apiUrl, data };
        }
      }
    } catch (e) {
      console.log(`  [JD] API 失败 ${apiUrl}: ${e.message.substring(0, 80)}`);
    }
  }
  
  return null;
}

/**
 * Playwright 渲染模式获取列表页
 */
async function scrapeViaBrowser(page, category, categoryName) {
  console.log(`\n  [JD-Browser] 抓取 ${categoryName}...`);
  
  // JD 司法拍卖搜索 URL
  // category=1 住宅, category=3 商业
  const searchUrl = `https://sifa.jd.com/search?keyword=%E6%B7%B1%E5%9C%B3&category=${CATEGORY_MAP[category]}&city=${JD_CITY_CODE}`;
  
  console.log(`  URL: ${searchUrl}`);
  
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(8000); // 等待 JS 渲染

  const pageTitle = await page.title();
  console.log(`  页面标题: ${pageTitle}`);

  // 提取房源数据
  const items = await page.evaluate(() => {
    const results = [];
    
    // JD 拍卖列表 item 选择器 (需要根据实际页面调整)
    const selectors = [
      '.search-result .item',
      '.auction-item',
      '.paimai-item',
      '[class*="item"]',
      '.goods-item',
      'li[class*="item"]',
      '.list-item',
      'div[class*="auction"]',
    ];

    let itemEls = [];
    for (const sel of selectors) {
      itemEls = document.querySelectorAll(sel);
      if (itemEls.length > 0) {
        console.log(`Found ${itemEls.length} items with selector: ${sel}`);
        break;
      }
    }

    itemEls.forEach(el => {
      // 提取字段 (根据 JD 实际页面结构调整)
      const titleEl = el.querySelector('[class*="title"], [class*="name"], [class*="item-title"]');
      const priceEl = el.querySelector('[class*="price"], [class*="current-price"], .current-price');
      const areaEl = el.querySelector('[class*="area"], [class*="size"]');
      const statusEl = el.querySelector('[class*="status"], [class*="tag"]');
      const linkEl = el.querySelector('a[href*="paimai"]');

      if (titleEl) {
        results.push({
          title: titleEl.textContent.trim(),
          priceText: priceEl?.textContent.trim(),
          areaText: areaEl?.textContent.trim(),
          statusText: statusEl?.textContent.trim(),
          url: linkEl?.href || '',
        });
      }
    });

    return results;
  });

  console.log(`  提取到 ${items.length} 个房源元素`);
  if (items.length > 0) {
    console.log('  示例:', JSON.stringify(items[0]));
  }

  // 翻页获取更多
  const allItems = [...items];
  for (let pageNum = 2; pageNum <= 5; pageNum++) {
    try {
      const nextBtn = await page.$('[class*="next"], [class*="page-next"], .pagination-next, .btn-next');
      if (nextBtn) {
        await nextBtn.click();
        await page.waitForTimeout(5000);
        
        const moreItems = await page.evaluate(() => {
          const results = [];
          const selectors = ['.search-result .item', '[class*="item"]', 'li[class*="item"]', '.list-item'];
          let itemEls = [];
          for (const sel of selectors) {
            itemEls = document.querySelectorAll(sel);
            if (itemEls.length > 0) break;
          }
          itemEls.forEach(el => {
            const titleEl = el.querySelector('[class*="title"], [class*="name"]');
            const priceEl = el.querySelector('[class*="price"]');
            const linkEl = el.querySelector('a[href*="paimai"]');
            if (titleEl) results.push({
              title: titleEl.textContent.trim(),
              priceText: priceEl?.textContent.trim(),
              url: linkEl?.href || '',
            });
          });
          return results;
        });
        
        if (moreItems.length === 0) break;
        allItems.push(...moreItems);
        console.log(`  第 ${pageNum} 页: +${moreItems.length} 条`);
      } else {
        break;
      }
    } catch (e) {
      console.log(`  翻页 ${pageNum} 失败: ${e.message.substring(0, 60)}`);
      break;
    }
  }

  return allItems;
}

/**
 * 抓取单个房源详情
 */
async function scrapeDetail(page, detailUrl) {
  try {
    await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);

    const detail = await page.evaluate(() => {
      const getText = (sel) => {
        const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
        return el?.textContent?.trim() || '';
      };

      // 提取详情页字段 (需按实际页面调整)
      const fields = {};
      
      // 常见字段名模式
      const labelSelectors = '[class*="label"], dt, .field-label';
      const valueSelectors = '[class*="value"], dd, .field-value, [class*="content"]';
      
      document.querySelectorAll('dl, tr, .field-row').forEach(row => {
        const label = row.querySelector(labelSelectors)?.textContent?.trim();
        const value = row.querySelector(valueSelectors)?.textContent?.trim();
        if (label && value) {
          fields[label.replace(/[:：]/g, '')] = value;
        }
      });

      return {
        title: getText('h1, [class*="title"], .item-title') || document.title,
        price: getText('[class*="price"], .current-price, .auction-price'),
        marketPrice: getText('[class*="market"], .original-price, .ref-price'),
        area: getText('[class*="area"], .house-area'),
        address: getText('[class*="address"], .location, .house-address'),
        status: getText('[class*="status"], .auction-status'),
        startTime: getText('[class*="start"], .start-time'),
        endTime: getText('[class*="end"], .end-time'),
        auctionCount: getText('[class*="count"], .bid-count'),
        extraFields: fields,
      };
    });

    return detail;
  } catch (e) {
    console.log(`  详情页加载失败: ${detailUrl} - ${e.message.substring(0, 60)}`);
    return null;
  }
}

/**
 * 详情页 URL 列表获取
 */
async function getDetailUrls(page, maxItems = 10) {
  const urls = await page.evaluate(() => {
    const links = [];
    document.querySelectorAll('a[href*="paimai.jd.com/item"], a[href*="sifa.jd.com/item"]').forEach(a => {
      const href = a.href;
      if (href && !href.includes('#') && links.length < 50) {
        links.push(href);
      }
    });
    return [...new Set(links)];
  });
  return urls.slice(0, maxItems);
}

/**
 * 将 JD 数据映射到 House 模型
 */
function mapToHouseModel(jdItem, detail = {}) {
  const now = new Date();
  
  // 解析价格 (万)
  const price = parsePrice(detail.price || jdItem.priceText || '0');
  const marketPrice = parsePrice(detail.marketPrice || '');
  const discount = marketPrice > 0 ? (price / marketPrice).toFixed(2) : null;

  // 解析面积
  const area = parseArea(detail.area || jdItem.areaText || '');

  // 解析状态
  const status = normalizeStatus(detail.status || jdItem.statusText || '', JD_STATUS_MAP);

  return {
    title: detail.title || jdItem.title,
    platform: 'jd',
    platformId: extractJDId(jdItem.url),
    city: '深圳',
    district: extractDistrict(detail.address || jdItem.title),
    category: jdItem.category || 'residential',
    price: price,
    marketPrice: marketPrice,
    discount: discount ? parseFloat(discount) : null,
    area: area,
    unitPrice: area > 0 ? Math.round((price * 10000) / area) : null,
    address: detail.address || '',
    status: status,
    auctionStartTime: detail.startTime || null,
    auctionEndTime: detail.endTime || null,
    bidCount: parseInt(detail.auctionCount || '0') || 0,
    isHot: false,
    description: detail.extraFields ? JSON.stringify(detail.extraFields) : '',
    sourceUrl: jdItem.url || '',
    createdAt: now,
    updatedAt: now,
  };
}

function extractJDId(url) {
  if (!url) return '';
  const match = url.match(/(\d+)\.html|\/item\/(\d+)/);
  return match ? (match[1] || match[2]) : '';
}

function extractDistrict(address) {
  if (!address) return '';
  const districts = ['福田区', '罗湖区', '南山区', '宝安区', '龙岗区', '龙华区', '光明区', '坪山区', '盐田区', '大鹏新区'];
  for (const d of districts) {
    if (address.includes(d)) return d;
  }
  return '';
}

/**
 * 主采集函数
 */
async function scrapeJD(options = {}) {
  const { headless = true, category = 'all', maxPages = 5, outputDir = OUT_DIR } = options;
  
  console.log('\n========================================');
  console.log('  JD 拍卖数据采集 - 深圳法拍房源');
  console.log('========================================');
  console.log(`  模式: ${headless ? '无头' : '有头'} (有头模式可手动过验证码)`);
  console.log(`  分类: ${category === 'all' ? '全部' : category}`);
  console.log(`  最大页数: ${maxPages}`);
  
  // 初始化输出目录
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await initBrowser({ headless });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const allResults = [];
  const categories = category === 'all' 
    ? Object.keys(CATEGORY_MAP) 
    : [category];

  for (const cat of categories) {
    const catName = cat === 'residential' ? '住宅用房' : '商业用房';
    console.log(`\n>>> 抓取 ${catName} ...`);

    // 1. 尝试 API 模式
    const apiResult = await fetchViaAPI(page);
    
    // 2. 回退 Playwright 渲染
    if (!apiResult) {
      const items = await scrapeViaBrowser(page, cat, catName);
      allResults.push(...items.map(item => ({ ...item, category: cat })));
    }
  }

  console.log(`\n  总计提取: ${allResults.length} 条`);
  
  // 3. 获取详情 (最多取前 5 个)
  if (allResults.length > 0) {
    const urls = allResults.slice(0, 5).map(i => i.url).filter(Boolean);
    console.log(`  抓取详情页: ${urls.length} 个`);
    
    const detailedResults = [];
    for (const url of urls) {
      const detail = await scrapeDetail(page, url);
      if (detail) {
        const item = allResults.find(i => i.url === url) || allResults[0];
        detailedResults.push(mapToHouseModel(item, detail));
      }
      await page.waitForTimeout(1000);
    }
    
    if (detailedResults.length > 0) {
      const outFile = path.join(outputDir, `jd_${formatDate(new Date())}.json`);
      fs.writeFileSync(outFile, JSON.stringify(detailedResults, null, 2), 'utf8');
      console.log(`\n  ✅ 结果已保存: ${outFile}`);
      return detailedResults;
    }
  }

  await browser.close();
  
  // 如果没抓到真实数据, 返回空数组并提示
  console.log('\n  ⚠️  未获取到数据, 原因可能:');
  console.log('     1. JD 反爬机制触发 (需要验证码)');
  console.log('     2. 页面结构已变更');
  console.log('     3. 请尝试 headed 模式: node jd-scraper.mjs --headed');
  console.log('\n  💡 备选方案: 使用 demo 数据测试');
  console.log('     npm run demo');
  
  return [];
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// CLI
const args = process.argv.slice(2);
const headless = !args.includes('--headed');
const category = args.includes('--commercial') ? 'commercial' 
  : args.includes('--residential') ? 'residential' : 'all';

scrapeJD({ headless, category }).then(data => {
  console.log(`\n采集完成: ${data.length} 条数据`);
  process.exit(0);
}).catch(e => {
  console.error('采集失败:', e);
  process.exit(1);
});

export { scrapeJD, mapToHouseModel };
