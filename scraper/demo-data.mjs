/**
 * 演示数据生成器
 * 当无法真实采集时, 生成模拟深圳法拍房源数据
 * 用于开发调试和测试导入流程
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../data');

// 深圳各区真实区名
const DISTRICTS = ['福田区', '罗湖区', '南山区', '宝安区', '龙岗区', '龙华区', '光明区', '坪山区', '盐田区', '大鹏新区'];

// 小区名称模板 (深圳真实小区参考)
const RESIDENTIAL_TEMPLATES = [
  '阳光棕榈园', '星海名城', '香珠花园', '金地梅陇镇', '碧海红树', '万科金色家园',
  '华润城润府', '深圳湾一号', '恒裕滨城', '招商双玺', '天鹅堡', '水榭春天',
  '星河盛世', '金亨利首府', '港铁天颂', '壹城中心', '龙光玖龙台', '勤诚达正大城',
  '卓越前海壹号', '华润前海中心', '深业上城', '东海国际公寓', '深铁懿府', '海德园',
];

const COMMERCIAL_TEMPLATES = [
  '华强北电子市场', '东门步行街商铺', '南山科技园写字楼', '福田CBD商业广场', '罗湖万象城写字楼',
  '宝安中心区商业', '龙岗大运中心商铺', '前海深港合作区写字楼', '深圳北站商业综合体', '福田中心区商铺',
];

// 房屋结构
const LAYOUTS = ['2室1厅', '3室2厅', '4室2厅', '5室2厅', '1室1厅', '复式', '大平层', '独栋'];
const FLOORS = ['低楼层', '中楼层', '高楼层', '顶楼', '地下室', '1F', '2F', '3F'];
const ORIENTATIONS = ['南北通透', '南向', '东向', '西向', '北向', '东南', '西南', '东北'];

// 拍卖阶段
const AUCTION_STAGES = ['一拍', '二拍', '变卖'];

// 标准状态
const STATUSES = ['upcoming', 'ongoing', 'ended', 'sold'];

// 生成随机日期
function randomDate(startDaysAgo = 30, endDaysLater = 90) {
  const now = Date.now();
  const start = now + startDaysAgo * 86400000;
  const end = now + endDaysLater * 86400000;
  return new Date(start + Math.random() * (end - start));
}

// 生成唯一ID
let idCounter = 1;
function genId(platform) {
  return `${platform}_SZ${String(idCounter++).padStart(6, '0')}`;
}

// 生成单个房源
function genHouse(platform, category, index) {
  const district = DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)];
  const templates = category === 'residential' ? RESIDENTIAL_TEMPLATES : COMMERCIAL_TEMPLATES;
  const name = templates[Math.floor(Math.random() * templates.length)];
  const area = category === 'residential'
    ? Math.round((70 + Math.random() * 180) * 100) / 100
    : Math.round((50 + Math.random() * 500) * 100) / 100;
  
  const marketPrice = category === 'residential'
    ? Math.round(area * (4 + Math.random() * 3) * 100) / 100  // 4-7万/㎡
    : Math.round(area * (3 + Math.random() * 5) * 100) / 100; // 3-8万/㎡
  
  const discount = category === 'residential'
    ? Math.round((0.6 + Math.random() * 0.2) * 100) / 100  // 6-8折
    : Math.round((0.5 + Math.random() * 0.25) * 100) / 100; // 5-7.5折
  
  const price = Math.round(marketPrice * discount * 100) / 100;
  const stage = AUCTION_STAGES[Math.floor(Math.random() * AUCTION_STAGES.length)];
  const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
  
  const startTime = randomDate(-10, 30);
  const endTime = new Date(startTime.getTime() + (2 + Math.floor(Math.random() * 3)) * 24 * 3600000);
  
  const addresses = {
    '福田区': ['福华路128号', '福中路100号', '莲花路3005号', '深南大道6006号', '华强北路2006号'],
    '罗湖区': ['深南东路5002号', '东门中路1234号', '人民南路3001号', '宝安南路2008号', '春风路500号'],
    '南山区': ['科技园南区高新南七道', '深圳湾畔海德三道', '南海大道1050号', '桃源路268号', '粤海大道268号'],
    '宝安区': ['宝安中心区罗田路', '新安六路100号', '西乡大道288号', '福永福海大道', '沙井中心路'],
    '龙岗区': ['龙城大道168号', '坂田华为基地', '布吉吉政路', '横岗六和路', '平湖守珍街'],
    '龙华区': ['人民路3688号', '梅龙大道1000号', '大浪华繁路', '观澜高尔夫大道', '民治大道'],
    '光明区': ['光明大道2288号', '凤凰城光源五路', '公明广场路', '玉塘长圳路', '新湖楼村'],
    '坪山区': ['坪山大道1000号', '比亚迪路300号', '坑梓人民路', '石井工业园', '龙田服务路'],
    '盐田区': ['盐田港后方陆域', '沙头角海涛路', '梅沙大鹏路', '盐田食街', '中英街'],
    '大鹏新区': ['大鹏迎宾路', '葵涌比亚迪', '南澳东山码头', '大鹏较场尾', '南澳水头沙'],
  };
  
  const street = (addresses[district] || addresses['福田区'])[Math.floor(Math.random() * 5)];
  
  const platformId = `${platform}${9000000 + index}`;
  
  return {
    _id: `${platform}_SZ${String(index).padStart(6, '0')}`,
    title: `${district}${name} ${stage} ${Math.round(area)}㎡ ${LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)]}`,
    platform,
    platformId,
    city: '深圳',
    district,
    category,
    price: Math.round(price * 100) / 100,
    marketPrice: Math.round(marketPrice * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    area,
    unitPrice: Math.round((price * 10000) / area),
    address: `广东省深圳市${district}${street}`,
    layout: LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)],
    floor: FLOORS[Math.floor(Math.random() * FLOORS.length)],
    orientation: ORIENTATIONS[Math.floor(Math.random() * ORIENTATIONS.length)],
    status,
    auctionStage: stage,
    auctionStartTime: startTime.toISOString(),
    auctionEndTime: endTime.toISOString(),
    bidCount: status === 'ongoing' || status === 'sold' ? Math.floor(Math.random() * 30) : 0,
    isHot: Math.random() > 0.8,
    consultPhone: `400-${String(Math.floor(Math.random() * 9000 + 1000)).padStart(4, '0')}-${String(Math.floor(Math.random() * 9000 + 1000)).padStart(4, '0')}`,
    description: JSON.stringify({
      建筑年代: `${2000 + Math.floor(Math.random() * 24)}年`,
      装修情况: ['毛坯', '简装', '精装'][Math.floor(Math.random() * 3)],
      朝向: ORIENTATIONS[Math.floor(Math.random() * ORIENTATIONS.length)],
      楼层: FLOORS[Math.floor(Math.random() * FLOORS.length)],
      性质: category === 'residential' ? '住宅' : '商业',
    }),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// 生成所有演示数据
function generateDemoData() {
  const items = [];
  
  // 阿里法拍 - 住宅 15条
  for (let i = 1; i <= 15; i++) {
    items.push(genHouse('ali', 'residential', i));
  }
  
  // 阿里法拍 - 商业 8条
  for (let i = 16; i <= 23; i++) {
    items.push(genHouse('ali', 'commercial', i));
  }
  
  // 京东法拍 - 住宅 12条
  for (let i = 24; i <= 35; i++) {
    items.push(genHouse('jd', 'residential', i));
  }
  
  // 京东法拍 - 商业 7条
  for (let i = 36; i <= 42; i++) {
    items.push(genHouse('jd', 'commercial', i));
  }
  
  return items;
}

// 统计
function printStats(items) {
  const byPlatform = { ali: 0, jd: 0 };
  const byCategory = { residential: 0, commercial: 0 };
  const byStatus = {};
  const byDistrict = {};
  
  for (const item of items) {
    byPlatform[item.platform]++;
    byCategory[item.category]++;
    byStatus[item.status] = (byStatus[item.status] || 0) + 1;
    byDistrict[item.district] = (byDistrict[item.district] || 0) + 1;
  }
  
  console.log('\n  数据统计:');
  console.log(`    平台:  阿里 ${byPlatform.ali}条,  京东 ${byPlatform.jd}条`);
  console.log(`    分类:  住宅 ${byCategory.residential}条,  商业 ${byCategory.commercial}条`);
  console.log(`    状态:  ${Object.entries(byStatus).map(([k,v]) => `${k} ${v}条`).join(', ')}`);
  console.log(`    各区:  ${Object.entries(byDistrict).map(([k,v]) => `${k}${v}套`).join(', ')}`);
  console.log(`    合计:  ${items.length} 条`);
}

// 主函数
function main() {
  console.log('\n========================================');
  console.log('  深圳法拍房源 - 演示数据生成');
  console.log('========================================');
  
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }
  
  const items = generateDemoData();
  printStats(items);
  
  // 保存
  const today = new Date().toISOString().split('T')[0];
  const outFile = path.join(OUT_DIR, `demo_${today}.json`);
  fs.writeFileSync(outFile, JSON.stringify(items, null, 2), 'utf8');
  
  console.log(`\n  ✅ 演示数据已生成: ${outFile}`);
  
  // 同时保存合并版本
  const mergedFile = path.join(OUT_DIR, `merged_${today}.json`);
  fs.writeFileSync(mergedFile, JSON.stringify(items, null, 2), 'utf8');
  console.log(`  ✅ 合并数据已生成: ${mergedFile}`);
  
  // 预览几条
  console.log('\n  数据预览 (前3条):');
  items.slice(0, 3).forEach((item, i) => {
    console.log(`\n  [${i+1}] ${item.title}`);
    console.log(`      平台: ${item.platform} | 分类: ${item.category} | 状态: ${item.status}`);
    console.log(`      评估价: ${item.marketPrice}万 | 起拍价: ${item.price}万 | 折扣: ${(item.discount * 10).toFixed(1)}折`);
    console.log(`      面积: ${item.area}㎡ | 单价: ${item.unitPrice}元/㎡`);
    console.log(`      地址: ${item.address}`);
  });
  
  console.log('\n========================================\n');
  console.log('  接下来可以运行:');
  console.log('    node import-to-db.mjs');
  console.log('  将数据导入 MongoDB 数据库\n');
  
  return items;
}

main();
