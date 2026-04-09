/**
 * 数据导入 MongoDB 脚本
 * 将采集结果/演示数据导入数据库
 * 
 * 用法:
 *   node import-to-db.mjs                        # 导入最新 demo 数据
 *   node import-to-db.mjs data/merged_2026-04-09.json  # 导入指定文件
 *   node import-to-db.mjs --dry                  # 预览模式 (不写入数据库)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// 读取采集的数据文件
const args = process.argv.slice(2);
const isDry = args.includes('--dry');
const dataFile = args.find(a => a.endsWith('.json') && !a.startsWith('--')) 
  || path.join(__dirname, '../data', `merged_${new Date().toISOString().split('T')[0]}.json`);

console.log('\n========================================');
console.log('  法拍房源数据导入 MongoDB');
console.log('========================================');
console.log(`  数据文件: ${dataFile}`);
console.log(`  模式: ${isDry ? '🔍 预览 (dry-run, 不写入数据库)' : '✅ 正式导入'}`);
console.log('');

// 检查文件
if (!fs.existsSync(dataFile)) {
  console.log(`  ❌ 文件不存在: ${dataFile}`);
  console.log('\n  可用数据文件:');
  const dataDir = path.join(__dirname, '../data');
  if (fs.existsSync(dataDir)) {
    fs.readdirSync(dataDir).forEach(f => console.log(`    - ${f}`));
  } else {
    console.log('    (data 目录为空, 请先运行采集或 demo 数据生成)');
  }
  process.exit(1);
}

// 加载数据
const rawData = fs.readFileSync(dataFile, 'utf8');
let items;
try {
  items = JSON.parse(rawData);
} catch (e) {
  console.log(`  ❌ JSON 解析失败: ${e.message}`);
  process.exit(1);
}

if (!Array.isArray(items) || items.length === 0) {
  console.log('  ❌ 数据为空或格式错误');
  process.exit(1);
}

console.log(`  待导入: ${items.length} 条数据`);
console.log('');

// 连接 MongoDB
let House, mongoose;
try {
  mongoose = require('mongoose');
  
  // 动态读取 House 模型
  const modelsDir = path.join(__dirname, '../server/models');
  House = require(path.join(modelsDir, 'House.js'));
} catch (e) {
  console.log(`  ⚠️  无法连接 MongoDB: ${e.message}`);
  console.log('  (可能 mongoose 未安装或 MongoDB 未启动)');
  console.log('  尝试以 demo 模式预览数据...\n');
  printPreview(items);
  process.exit(1);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/fapai_db';

async function importData() {
  let connection;
  
  try {
    console.log(`  连接 MongoDB: ${MONGO_URI}`);
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    connection = mongoose.connection;
    console.log('  ✅ MongoDB 连接成功\n');
    
    let imported = 0;
    let skipped = 0;
    let updated = 0;
    
    // 批量导入 (每批 50 条)
    const BATCH_SIZE = 50;
    
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      
      for (const item of batch) {
        try {
          // 按 platformId 查找是否存在
          const existing = await House.findOne({ platform: item.platform, platformId: item.platformId });
          
          if (existing) {
            // 更新
          const updates = {
              ...item,
              updatedAt: new Date(),
            };
            delete updates._id;
            
            await House.updateOne(
              { platform: item.platform, platformId: item.platformId },
              { $set: updates }
            );
            updated++;
          } else {
            // 新增
            if (!isDry) {
              const house = new House(item);
              await house.save();
            }
            imported++;
          }
        } catch (e) {
          console.log(`  ⚠️  导入失败 ${item.title}: ${e.message.substring(0, 60)}`);
          skipped++;
        }
      }
      
      // 进度
      const progress = Math.min(i + BATCH_SIZE, items.length);
      console.log(`  进度: ${progress}/${items.length} (新增 ${imported}, 更新 ${updated}, 跳过 ${skipped})`);
    }
    
    console.log('');
    console.log('  ========================================');
    console.log(`  ✅ 导入完成!`);
    console.log(`     新增: ${imported} 条`);
    console.log(`     更新: ${updated} 条`);
    console.log(`     跳过: ${skipped} 条`);
    console.log('  ========================================');
    
  } catch (e) {
    console.log(`\n  ❌ MongoDB 错误: ${e.message}`);
    if (e.message.includes('ECONNREFUSED')) {
      console.log('  请确保 MongoDB 已启动:');
      console.log('    mongod --dbpath /usr/local/var/mongodb');
      console.log('  或使用 Docker:');
      console.log('    docker run -d -p 27017:27017 mongo');
    }
    printPreview(items);
  } finally {
    if (connection) await mongoose.disconnect();
  }
}

function printPreview(items) {
  console.log('  数据预览 (前5条):\n');
  items.slice(0, 5).forEach((item, i) => {
    console.log(`  [${i+1}] ${item.title || item._id}`);
    console.log(`       平台: ${item.platform} | 区域: ${item.district} | 分类: ${item.category} | 状态: ${item.status}`);
    console.log(`       评估价: ${item.marketPrice}万 | 起拍价: ${item.price}万 | 面积: ${item.area}㎡`);
    if (item.auctionStartTime) {
      console.log(`       开拍时间: ${new Date(item.auctionStartTime).toLocaleString('zh-CN')}`);
    }
    console.log('');
  });
  
  const stats = {
    byPlatform: {},
    byCategory: {},
    byStatus: {},
  };
  
  for (const item of items) {
    stats.byPlatform[item.platform] = (stats.byPlatform[item.platform] || 0) + 1;
    stats.byCategory[item.category] = (stats.byCategory[item.category] || 0) + 1;
    stats.byStatus[item.status] = (stats.byStatus[item.status] || 0) + 1;
  }
  
  console.log('  统计:');
  console.log(`    平台: 阿里 ${stats.byPlatform.ali || 0}条, 京东 ${stats.byPlatform.jd || 0}条`);
  console.log(`    分类: 住宅 ${stats.byCategory.residential || 0}套, 商业 ${stats.byCategory.commercial || 0}套`);
  console.log(`    状态: ${Object.entries(stats.byStatus).map(([k,v]) => `${k} ${v}条`).join(', ')}`);
  console.log(`    合计: ${items.length} 条`);
}

// 启动
if (isDry) {
  printPreview(items);
  process.exit(0);
}

importData().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
