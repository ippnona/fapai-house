/**
 * 并发运行两个平台采集脚本
 * 先启动阿里, 再启动京东, 合并结果后导入数据库
 */

import { scrapeAli } from './ali-scraper.mjs';
import { scrapeJD } from './jd-scraper.mjs';
import { deduplicateByPlatformId, printStats } from './utils.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../data');
const MERGED_FILE = path.join(OUT_DIR, 'merged.json');

// CLI 参数
const args = process.argv.slice(2);
const options = {
  ali:  !args.includes('--jd-only'),
  jd:   !args.includes('--ali-only'),
  import: args.includes('--import'),
  headed: args.includes('--headed'),
};

console.log('\n========================================');
console.log('  深圳法拍房源 - 双平台并发采集');
console.log('========================================');
console.log(`  阿里: ${options.ali ? '✅' : '⏭️'}`);
console.log(`  京东: ${options.jd ? '✅' : '⏭️'}`);
console.log(`  导入数据库: ${options.import ? '✅' : '⏭️'}`);
console.log(`  有头模式: ${options.headed ? '✅ (可手动过验证码)' : '❌ (无头)'}`);
console.log('');

// 确保输出目录存在
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const allResults = [];
const errors = [];

async function main() {
  // 并发运行两个平台 (Promise.allSettled)
  const tasks = [];
  
  if (options.ali) {
    console.log('\n[1/2] 启动阿里法拍采集...');
    tasks.push(
      scrapeAli({ headless: !options.headed, category: 'all', outputDir: OUT_DIR })
        .then(data => ({ platform: 'ali', data }))
        .catch(e => ({ platform: 'ali', error: e.message }))
    );
  }
  
  if (options.jd) {
    console.log('\n[2/2] 启动京东法拍采集...');
    tasks.push(
      scrapeJD({ headless: !options.headed, category: 'all', outputDir: OUT_DIR })
        .then(data => ({ platform: 'jd', data }))
        .catch(e => ({ platform: 'jd', error: e.message }))
    );
  }
  
  const settled = await Promise.allSettled(tasks);
  
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      const { platform, data, error } = result.value;
      if (error) {
        console.log(`  ⚠️  ${platform} 采集失败: ${error}`);
        errors.push({ platform, error });
      } else {
        console.log(`  ✅ ${platform} 完成: ${data.length} 条`);
        allResults.push(...(data || []));
      }
    } else {
      console.log(`  ❌ 任务异常: ${result.reason}`);
      errors.push({ error: result.reason });
    }
  }
  
  // 去重
  const deduped = deduplicateByPlatformId(allResults);
  console.log(`\n  去重后: ${deduped.length} 条 (原始 ${allResults.length} 条)`);
  
  if (deduped.length > 0) {
    printStats(deduped);
    
    // 保存合并结果
    const today = new Date().toISOString().split('T')[0];
    const mergedFile = path.join(OUT_DIR, `merged_${today}.json`);
    fs.writeFileSync(mergedFile, JSON.stringify(deduped, null, 2), 'utf8');
    console.log(`\n  💾 合并结果: ${mergedFile}`);
    
    // 导入数据库
    if (options.import) {
      console.log('\n  开始导入数据库...');
      await importToDb(mergedFile);
    }
  } else {
    console.log('\n  ⚠️  两个平台均未获取到数据');
    console.log('  ');
    console.log('  建议运行演示数据:');
    console.log('    node demo-data.mjs');
    console.log('    node import-to-db.mjs');
  }
  
  console.log('\n========================================');
  console.log(`  完成! 采集 ${deduped.length} 条, 失败 ${errors.length} 个平台`);
  console.log('========================================\n');
  
  process.exit(errors.length > 0 ? 1 : 0);
}

async function importToDb(filePath) {
  try {
    const { execSync } = await import('child_process');
    console.log(`  执行: node import-to-db.mjs ${filePath}`);
    execSync(`cd ${__dirname} && node import-to-db.mjs "${filePath}"`, {
      stdio: 'inherit',
    });
  } catch (e) {
    console.log(`  导入失败: ${e.message}`);
  }
}

main();
