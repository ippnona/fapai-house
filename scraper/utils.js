/**
 * 采集工具函数
 * 通用解析、反爬策略、浏览器初始化
 */

import { chromium } from 'playwright-core';

// ============================================================
// 浏览器初始化
// ============================================================

/**
 * 初始化 Playwright 浏览器
 * 自动查找 Chrome 路径
 */
export async function initBrowser({ headless = true } = {}) {
  // 常见 Chrome 路径
  const chromePaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    process.env.CHROME_PATH || '',
  ].filter(Boolean);

  let executablePath = chromePaths[0];
  
  // 检查文件是否存在
  const { existsSync } = await import('fs').then(m => m);
  const validPath = chromePaths.find(p => existsSync(p));
  if (validPath) executablePath = validPath;
  
  console.log(`  [Browser] Chrome 路径: ${executablePath}`);
  console.log(`  [Browser] 模式: ${headless ? '无头' : '有头'}`);

  const browser = await chromium.launch({
    executablePath,
    headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
    ],
  });

  return browser;
}

// ============================================================
// 验证码处理
// ============================================================

/**
 * 等待验证码消失 (用于手动处理场景)
 * @param {Page} page - Playwright Page 对象
 * @param {string} selector - 验证码选择器
 * @param {number} timeoutMs - 超时毫秒
 */
export async function waitForCaptcha(page, selector, timeoutMs = 120000) {
  const start = Date.now();
  
  while (Date.now() - start < timeoutMs) {
    const visible = await page.isVisible(selector);
    if (!visible) {
      return true; // 验证码已消失
    }
    await page.waitForTimeout(1000);
    
    // 每 15 秒提示一次
    if (Math.floor((Date.now() - start) / 15000) > Math.floor((Date.now() - start - 1000) / 15000)) {
      const elapsed = Math.round((Date.now() - start) / 1000);
      console.log(`  ⏳ 等待验证码通过... (已等待 ${elapsed}s)`);
    }
  }
  
  throw new Error(`验证码等待超时 (${timeoutMs / 1000}s)`);
}

/**
 * 检测页面是否有验证码
 */
export async function detectCaptcha(page) {
  const captchaSelectors = [
    '[class*="nc_wrapper"]',
    '[id*="tcaptcha"]',
    '[class*="captcha"]',
    '[id*="nc_1"]',
    '[class*="aliyun"]',
    '[class*="tmall"]',
    '[class*="slider"]',
    'iframe[src*="g.alicdn.com"]',
    'iframe[src*="t.alibaba"]',
  ];
  
  for (const sel of captchaSelectors) {
    const el = await page.$(sel);
    if (el && await el.isVisible()) {
      return { detected: true, selector: sel };
    }
  }
  
  return { detected: false };
}

// ============================================================
// 价格解析
// ============================================================

/**
 * 解析价格字符串为数字 (单位: 万)
 * 输入示例: "120万", "1,200,000", "120万元", "¥120万"
 * 输出: 120 (万)
 */
export function parsePrice(priceStr) {
  if (!priceStr || typeof priceStr !== 'string') return 0;
  
  let str = priceStr.trim()
    .replace(/[¥￥$元,，.。]/g, '')
    .replace(/万/g, '0000')
    .replace(/亿/g, '00000000')
    .replace(/千/g, '000')
    .replace(/百/g, '00')
    .replace(/\s/g, '');
  
  // 提取数字
  const match = str.match(/[\d.]+/);
  if (!match) return 0;
  
  let num = parseFloat(match[0]);
  if (isNaN(num)) return 0;
  
  // 智能判断单位
  if (priceStr.includes('亿')) {
    num *= 10000; // 亿 → 万
  } else if (!priceStr.includes('万') && !priceStr.includes('千') && num > 100000) {
    // 没有明确单位但数值很大, 假设是元, 转为万
    num = num / 10000;
  }
  
  return Math.round(num * 100) / 100;
}

// ============================================================
// 面积解析
// ============================================================

/**
 * 解析面积字符串 (单位: ㎡)
 * 输入: "89.5㎡", "89.5平米", "89.5平方米", "89.5m²"
 * 输出: 89.5
 */
export function parseArea(areaStr) {
  if (!areaStr || typeof areaStr !== 'string') return 0;
  
  const str = areaStr.trim()
    .replace(/㎡|平米|平方米|m²|m2/gi, '');
  
  const match = str.match(/[\d.]+/);
  if (!match) return 0;
  
  return Math.round(parseFloat(match[0]) * 100) / 100;
}

// ============================================================
// 状态映射
// ============================================================

/**
 * 将平台原始状态映射为标准状态
 * 标准状态: upcoming | ongoing | ended | sold | suspended | withdrawn
 */
export function normalizeStatus(statusStr, platformMap) {
  if (!statusStr || !platformMap) return 'unknown';
  
  const s = statusStr.trim();
  
  // 先查表
  if (platformMap[s]) return platformMap[s];
  
  // 模糊匹配
  const keywordMap = {
    upcoming: ['即将开始', '未开始', '马上开始', '马上开拍', '即将开拍', '报名中', '预告'],
    ongoing:  ['正在', '进行中', '开拍', '竞拍中', '竞价中', '热拍', '拍卖中', '竞买中'],
    ended:    ['已结束', '已流拍', '流拍', '结案', '已截'],
    sold:     ['已成交', '成交', '竞买成功', '得标'],
    suspended:['中止', '暂停', '暂缓', '暂停'],
    withdrawn:['撤回', '撤销', '取消', '撤拍'],
  };
  
  for (const [status, keywords] of Object.entries(keywordMap)) {
    if (keywords.some(kw => s.includes(kw))) {
      return status;
    }
  }
  
  return 'unknown';
}

// ============================================================
// 时间解析
// ============================================================

/**
 * 解析日期时间字符串
 * 输入: "2024-03-15 10:00:00", "2024/3/15", "3月15日10时"
 * 输出: Date 或 null
 */
export function parseDateTime(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  
  const str = dateStr.trim();
  
  // 尝试标准格式
  let d;
  
  // 格式1: YYYY-MM-DD HH:mm:ss
  const stdMatch = str.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})[日T]?\s*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?/);
  if (stdMatch) {
    const [, y, mo, d2, h = 0, mi = 0, s = 0] = stdMatch;
    d = new Date(parseInt(y), parseInt(mo) - 1, parseInt(d2), parseInt(h), parseInt(mi), parseInt(s));
  }
  
  // 格式2: 相对时间 "3月15日10时" → 今年
  const relMatch = str.match(/(\d{1,2})月(\d{1,2})日(\d{1,2})?时?/);
  if (relMatch && !d) {
    const now = new Date();
    const [, mo, day, h = 0] = relMatch;
    d = new Date(now.getFullYear(), parseInt(mo) - 1, parseInt(day), parseInt(h));
  }
  
  // 格式3: Unix 时间戳 (毫秒或秒)
  if (!d && /^\d{10,13}$/.test(str)) {
    const ts = parseInt(str);
    d = new Date(ts > 9999999999 ? ts : ts * 1000);
  }
  
  return d && !isNaN(d.getTime()) ? d : null;
}

// ============================================================
// 反爬策略
// ============================================================

/**
 * 随机延迟 (模拟人类行为)
 */
export function randomDelay(minMs = 1000, maxMs = 3000) {
  const delay = Math.floor(Math.random() * (maxMs - minMs)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * 随机滚动页面
 */
export async function randomScroll(page) {
  const scrollAmount = Math.floor(Math.random() * 300) + 100;
  await page.evaluate((y) => {
    window.scrollBy(0, y);
  }, scrollAmount);
  await randomDelay(300, 800);
}

/**
 * 模拟鼠标移动 (用于绕过鼠标轨迹检测)
 */
export async function humanMouseMove(page, from, to) {
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const x = from.x + (to.x - from.x) * (i / steps) + (Math.random() - 0.5) * 10;
    const y = from.y + (to.y - from.y) * (i / steps) + (Math.random() - 0.5) * 10;
    await page.mouse.move(x, y);
    await randomDelay(20, 50);
  }
}

/**
 * 随机 User-Agent
 */
export function randomUserAgent() {
  const agents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}

// ============================================================
// 数据去重 & 合并
// ============================================================

/**
 * 按 platformId 去重
 */
export function deduplicateByPlatformId(items) {
  const seen = new Set();
  return items.filter(item => {
    if (!item.platformId) return true; // 无 ID 保留
    if (seen.has(item.platformId)) return false;
    seen.add(item.platformId);
    return true;
  });
}

/**
 * 合并两个平台的采集结果
 */
export function mergeResults(aliItems, jdItems) {
  return [...aliItems, ...jdItems].map(item => {
    // 补全公共字段
    item._id = `${item.platform}_${item.platformId}`;
    item.createdAt = item.createdAt || new Date();
    item.updatedAt = new Date();
    return item;
  });
}

// ============================================================
// 输出 & 日志
// ============================================================

/**
 * 打印采集统计
 */
export function printStats(items) {
  const byPlatform = {};
  const byCategory = {};
  const byStatus = {};
  
  for (const item of items) {
    byPlatform[item.platform] = (byPlatform[item.platform] || 0) + 1;
    byCategory[item.category] = (byCategory[item.category] || 0) + 1;
    byStatus[item.status] = (byStatus[item.status] || 0) + 1;
  }
  
  console.log('\n  统计:');
  console.log(`    平台: ${Object.entries(byPlatform).map(([k,v]) => `${k} ${v}条`).join(', ')}`);
  console.log(`    分类: ${Object.entries(byCategory).map(([k,v]) => `${k} ${v}条`).join(', ')}`);
  console.log(`    状态: ${Object.entries(byStatus).map(([k,v]) => `${k} ${v}条`).join(', ')}`);
}
