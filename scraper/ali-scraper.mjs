/**
 * 阿里法拍数据采集脚本
 * 目标: https://sf.taobao.com - 深圳 (城市代码 440300) 住宅/商业
 * 
 * ⚠️  已知问题:
 *   - sf.taobao.com 有阿里云盾滑块验证码 (AWSC/ET 数字滑动验证码)
 *   - 老 API 端点 (spc/sf-search-item!searchItem.action) 已失效
 *   - 新站为 SPA, 数据通过 XHR 加载
 * 
 * 策略:
 * 1. Playwright headed 模式 → 可手动滑动验证码
 * 2. 如遇验证暂停, 等待用户手动过验后继续
 * 3. 数据提取后按 House 模型保存
 */

import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initBrowser, waitForCaptcha, parsePrice, parseArea, normalizeStatus, randomDelay } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../data');

// 深圳城市代码
const CITY_CODE = '440300';
const CITY_NAME = '深圳';

// 阿里分类: category=2 住宅, category=12 商业
const CATEGORY_MAP = {
  residential: { id: '2', label: '住宅用房' },
  commercial:   { id: '12', label: '商业用房' },
};

// 阿里拍卖状态映射
const STATUS_MAP = {
  '即将开始': 'upcoming',
  '正在进行': 'ongoing',
  '已结束': 'ended',
  '已成交': 'sold',
  '一拍': 'ongoing',
  '二拍': 'ongoing',
  '变卖': 'ongoing',
  '中止': 'suspended',
  '撤回': 'withdrawn',
  '暂缓': 'suspended',
};

/**
 * 查找可用的 API 端点 (通过 Playwright 网络拦截)
 */
async function findAliAPI(page, url) {
  const apiCalls = [];

  page.on('request', req => {
    const url = req.url();
    if (url.includes('sf.taobao') && (url.includes('.json') || url.includes('api') || url.includes('query') || url.includes('search'))) {
      apiCalls.push(req.url());
    }
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  return apiCalls;
}

/**
 * 尝试直接 API 请求 (fetch)
 * 测试多个可能的端点
 */
async function tryDirectAPI(page) {
  console.log('  [Ali] 测试直接 API 端点...');
  
  const endpoints = [
    // 司法拍卖搜索 API
    'https://sf.taobao.com/spc/sf-search-item!searchItem.action',
    'https://sf.taobao.com/json/querySfItems.htm',
    // 新版 API (sf.taobao.com 改版后)
    `https://sf.taobao.com/api/search?city=${CITY_CODE}&category=2&page=1&pageSize=20`,
    `https://sf.taobao.com/cities/${CITY_CODE}/api/items.json?category=2&page=1`,
    // 阿里拍卖移动端 API
    `https://m.sf.taobao.com/search?city=${CITY_CODE}&category=2`,
    // 备用
    'https://sf.taobao.com/spc/sf-search-item!searchItem.action?current_page=1&province=%E5%B9%BF%E4%B8%9C&city=%E6%B7%B1%E5%9C%B3&category=2&st=1&sorder=2',
  ];

  for (const endpoint of endpoints) {
    try {
      const resp = await page.request.get(endpoint, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': `https://sf.taobao.com/cities/${CITY_CODE}`,
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'zh-CN,zh;q=0.9',
        },
        timeout: 10000,
      });

      const body = await resp.text();
      const ct = resp.headers()['content-type'] || '';
      
      if (resp.status() === 200) {
        // 检查是否是有效的 JSON 响应
        if (body.trim().startsWith('{') || body.trim().startsWith('[')) {
          console.log(`  ✅ API 有效: ${endpoint.substring(0, 80)}`);
          return { endpoint, body, status: resp.status() };
        } else if (body.includes('captcha') || body.includes('verify')) {
          console.log(`  ⚠️  需验证: ${endpoint.substring(0, 60)}`);
        } else {
          console.log(`  ❌ 非 JSON: ${endpoint.substring(0, 60)} (${body.substring(0, 50)})`);
        }
      } else {
        console.log(`  ❌ HTTP ${resp.status()}: ${endpoint.substring(0, 60)}`);
      }
    } catch (e) {
      console.log(`  ❌ 请求失败: ${e.message.substring(0, 60)}`);
    }
  }

  return null;
}

/**
 * 渲染模式: 等待用户手动处理验证码后提取数据
 */
async function scrapeWithManualVerification(page, category) {
  console.log('\n  [Ali-Browser] Playwright 渲染模式 (等待手动验证)...');
  
  const cat = CATEGORY_MAP[category] || CATEGORY_MAP.residential;
  
  // 阿里法拍深圳站 - 住宅
  const searchUrl = `https://sf.taobao.com/cities/${CITY_CODE}?category=${cat.id}&province=%E5%B9%BF%E4%B8%9C&sf_source=cities&st=1`;
  
  console.log(`  访问: ${searchUrl}`);
  
  // 访问页面
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  // 等待验证码出现
  const captchaSelector = '[class*="nc_wrapper"], [class*="captcha"], [id*="nc_1"], [class*="tcaptcha"]';
  let captchaAppeared = false;
  
  for (let i = 0; i < 20; i++) {
    const captcha = await page.$(captchaSelector);
    if (captcha) {
      captchaAppeared = true;
      console.log('\n  ╔══════════════════════════════════════╗');
      console.log('  ║  🚨 阿里安全验证已触发!              ║');
      console.log('  ║  请在浏览器中手动完成滑块验证       ║');
      console.log('  ║  验证通过后, 此脚本将自动继续...    ║');
      console.log('  ╚══════════════════════════════════════╝\n');
      
      // 等待验证码消失 (说明用户已通过)
      await waitForCaptcha(page, captchaSelector, timeoutMs = 120000);
      console.log('  ✅ 验证码已通过!');
      break;
    }
    await page.waitForTimeout(1000);
  }
  
  if (!captchaAppeared) {
    console.log('  ✅ 未触发验证码, 直接开始采集');
  }
  
  // 等待页面加载
  await page.waitForTimeout(5000);
  
  // 尝试提取房源数据
  return await extractAliListData(page, cat);
}

/**
 * 提取阿里拍卖列表数据
 */
async function extractAliListData(page, category) {
  const results = await page.evaluate((cat) => {
    const items = [];
    
    // 尝试多种列表选择器 (阿里法拍站点)
    const selectors = [
      '.item-box',
      '.sf-item',
      '[class*="item-wrap"]',
      '.auction-item',
      '.product-item',
      '[class*="list-item"]',
      'li[class*="item"]',
      '.lists .item',
      '.sf-list .item',
    ];

    let foundEls = [];
    for (const sel of selectors) {
      foundEls = document.querySelectorAll(sel);
      if (foundEls.length > 0) {
        console.log(`[Ali-Selector] Found ${foundEls.length} items with: ${sel}`);
        break;
      }
    }

    foundEls.forEach((el, idx) => {
      const getText = sel => {
        const node = el.querySelector(sel);
        return node?.textContent?.trim() || '';
      };
      const getAttr = (sel, attr) => el.querySelector(sel)?.getAttribute(attr) || '';

      const titleEl = el.querySelector('[class*="title"], .item-title, [class*="name"], h3, h4');
      const priceEl = el.querySelector('[class*="price"], .current-price, .auction-price');
      const statusEl = el.querySelector('[class*="status"], .tag, [class*="badge"]');
      const linkEl = el.querySelector('a[href*="sf.taobao"]');
      const imgEl = el.querySelector('img');

      if (titleEl) {
        items.push({
          idx,
          title: titleEl.textContent.trim(),
          priceText: priceEl?.textContent.trim(),
          statusText: statusEl?.textContent.trim(),
          url: linkEl?.href || '',
          img: imgEl?.src || '',
          rawHTML: el.innerHTML.substring(0, 300),
        });
      }
    });

    return { items, selector: selectors.find(s => document.querySelectorAll(s).length > 0) };
  }, category);

  console.log(`\n  提取到 ${results.items.length} 个房源`);
  if (results.items.length > 0) {
    console.log('  示例字段:', Object.keys(results.items[0]));
    console.log('  第一条:', JSON.stringify(results.items[0]).substring(0, 200));
  }

  // 尝试翻页
  const allItems = [...results.items];
  for (let p = 2; p <= 5; p++) {
    try {
      // 寻找翻页按钮
      const pageBtn = await page.$(`[class*="page"][class*="${p}"], .pagination a[href*="${p}"]`);
      if (pageBtn) {
        await pageBtn.click();
        await page.waitForTimeout(3000);
        
        const more = await page.evaluate(() => {
          const selectors = ['.item-box', '[class*="item-wrap"]', 'li[class*="item"]', '.lists .item'];
          for (const sel of selectors) {
            const els = document.querySelectorAll(sel);
            if (els.length > 0) {
              return Array.from(els).map(el => {
                const t = el.querySelector('[class*="title"], h3, h4');
                const pr = el.querySelector('[class*="price"]');
                const ln = el.querySelector('a[href*="sf.taobao"]');
                return { title: t?.textContent?.trim(), priceText: pr?.textContent?.trim(), url: ln?.href || '' };
              });
            }
          }
          return [];
        });
        
        if (more.length === 0) break;
        allItems.push(...more);
        console.log(`  第 ${p} 页: +${more.length} 条`);
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  return allItems;
}

/**
 * 抓取阿里详情页
 */
async function scrapeAliDetail(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);

    const detail = await page.evaluate(() => {
      const get = sel => document.querySelector(sel)?.textContent?.trim() || '';
      
      // 提取详细信息
      const fields = {};
      document.querySelectorAll('dl dt, .info-row .label, [class*="label"]').forEach(label => {
        const next = label.nextElementSibling || label.parentElement?.querySelector('[class*="value"]');
        const key = label.textContent.trim().replace(/[:：\s]/g, '');
        const val = next?.textContent?.trim() || '';
        if (key && val) fields[key] = val;
      });

      return {
        title: get('h1, [class*="title"]'),
        currentPrice: get('[class*="current-price"], .price-highlight'),
        marketPrice: get('[class*="market"], .original-price'),
        area: get('[class*="area"]'),
        address: get('[class*="address"], [class*="location"]'),
        status: get('[class*="status"], .auction-status'),
        startTime: get('[class*="start"]'),
        endTime: get('[class*="end"]'),
        bidCount: get('[class*="bid"]'),
        consultPhone: get('[class*="phone"], [class*="tel"]'),
        fields,
      };
    });

    return detail;
  } catch (e) {
    console.log(`  详情页失败: ${e.message.substring(0, 80)}`);
    return null;
  }
}

/**
 * 映射到 House 模型
 */
function mapToHouseModel(aliItem, detail = {}, category = 'residential') {
  const now = new Date();
  
  const price = parsePrice(detail.currentPrice || aliItem.priceText || '0');
  const marketPrice = parsePrice(detail.marketPrice || '');
  const discount = marketPrice > 0 ? (price / marketPrice).toFixed(2) : '0';
  const area = parseArea(detail.area || aliItem.title || '');
  const status = normalizeStatus(detail.status || aliItem.statusText || '', STATUS_MAP);
  
  return {
    title: detail.title || aliItem.title,
    platform: 'ali',
    platformId: extractAliId(aliItem.url),
    city: '深圳',
    district: extractDistrict(detail.address || aliItem.title),
    category,
    price,
    marketPrice,
    discount: parseFloat(discount) || null,
    area,
    unitPrice: area > 0 ? Math.round((price * 10000) / area) : null,
    address: detail.address || '',
    status,
    auctionStartTime: detail.startTime || null,
    auctionEndTime: detail.endTime || null,
    bidCount: parseInt(detail.bidCount || '0') || 0,
    consultPhone: detail.consultPhone || '',
    isHot: false,
    description: detail.fields ? JSON.stringify(detail.fields) : '',
    sourceUrl: aliItem.url || '',
    createdAt: now,
    updatedAt: now,
  };
}

function extractAliId(url) {
  if (!url) return '';
  const match = url.match(/\/item_(\d+)|\/(\d+)\.htm|id=(\d+)/);
  return match ? (match[1] || match[2] || match[3]) : '';
}

function extractDistrict(address) {
  if (!address) return '';
  const districts = ['福田区','罗湖区','南山区','宝安区','龙岗区','龙华区','光明区','坪山区','盐田区','大鹏新区'];
  for (const d of districts) {
    if (address.includes(d)) return d;
  }
  return '';
}

/**
 * 主采集函数
 */
async function scrapeAli(options = {}) {
  const { headless = false, category = 'all', maxPages = 5, outputDir = OUT_DIR } = options;
  
  console.log('\n========================================');
  console.log('  阿里法拍数据采集 - 深圳法拍房源');
  console.log('========================================');
  console.log(`  模式: ${headless ? '无头 (可能被验证码拦截)' : '有头 ⭐ (推荐: 可手动过验证码)'}`);
  console.log(`  分类: ${category === 'all' ? '全部 (住宅+商业)' : category}`);
  console.log('');
  console.log('  ⚠️  注意: 阿里法拍有滑块验证码, 推荐使用 --headed 模式');
  console.log('     无头模式遇验证码会自动跳过, 可能导致数据为空\n');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await initBrowser({ headless });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'zh-CN',
  });
  const page = await context.newPage();

  // 添加反检测脚本
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    window.navigator.chrome = { runtime: {} };
  });

  const allResults = [];
  const categories = category === 'all'
    ? Object.keys(CATEGORY_MAP)
    : [category];

  // 1. 尝试直接 API (无头模式专用)
  if (headless) {
    const apiResult = await tryDirectAPI(page);
    if (apiResult) {
      console.log('\n  ✅ 直接 API 成功! 解析数据...');
      // 解析返回的 JSON
      try {
        const data = JSON.parse(apiResult.body);
        console.log('  API 响应结构:', JSON.stringify(data).substring(0, 500));
      } catch {
        console.log('  无法解析响应为 JSON');
      }
    }
  }

  // 2. Playwright 渲染模式
  for (const cat of categories) {
    console.log(`\n>>> 抓取 ${CATEGORY_MAP[cat].label} ...`);
    const items = await scrapeWithManualVerification(page, cat);
    allResults.push(...items.map(item => ({ ...item, category: cat })));
  }

  console.log(`\n  总计提取: ${allResults.length} 条元素`);

  // 3. 详情页 (最多前 3 个)
  if (allResults.length > 0) {
    const urls = allResults.slice(0, 3).map(i => i.url).filter(Boolean);
    console.log(`  抓取详情页: ${urls.length} 个`);
    
    const detailed = [];
    for (const url of urls) {
      const detail = await scrapeAliDetail(page, url);
      if (detail) {
        const item = allResults.find(i => i.url === url) || allResults[0];
        detailed.push(mapToHouseModel(item, detail, item.category));
      }
      await randomDelay(1000, 2000);
    }

    if (detailed.length > 0) {
      const outFile = path.join(outputDir, `ali_${formatDate(new Date())}.json`);
      fs.writeFileSync(outFile, JSON.stringify(detailed, null, 2), 'utf8');
      console.log(`\n  ✅ 结果已保存: ${outFile}`);
    }
  }

  await browser.close();

  if (allResults.length === 0) {
    console.log('\n  ⚠️  未获取到数据. 建议:');
    console.log('     node ali-scraper.mjs --headed');
    console.log('     (有头模式可以手动滑动验证码)');
  }
  
  return allResults;
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// CLI
const args = process.argv.slice(2);
const headless = !args.includes('--headed');
const category = args.includes('--commercial') ? 'commercial'
  : args.includes('--residential') ? 'residential' : 'all';

scrapeAli({ headless, category }).then(data => {
  console.log(`\n采集完成: 共 ${data.length} 条原始记录`);
  process.exit(0);
}).catch(e => {
  console.error('采集失败:', e);
  process.exit(1);
});

export { scrapeAli, mapToHouseModel };
