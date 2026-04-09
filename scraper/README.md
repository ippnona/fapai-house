# 深圳法拍房源数据采集器

> 阿里法拍 + 京东法拍 → MongoDB 自动采集流程

## ⚠️ 反爬说明

两个平台均有强反爬机制：

| 平台 | 反爬措施 | 绕过方式 |
|------|---------|---------|
| **阿里法拍** | 阿里云盾滑块验证码 (AWSC/ET) | 有头模式下手动滑动 |
| **京东法拍** | JS 渲染 + IP 限流 | Playwright 渲染 / Proxy |

**预期结果：** 无头模式大概率返回空数据，**有头模式**效果最佳（可手动处理验证码）。

## 快速开始

### 1. 生成演示数据（无需网络）

```bash
cd scraper
node demo-data.mjs
```

生成 42 条模拟深圳法拍数据（阿里23条 + 京东19条），覆盖住宅/商业、10个区。

### 2. 真实采集（有头模式 ⭐）

```bash
# 阿里 + 京东同时采集（推荐）
node run-both.mjs --headed

# 仅阿里
node ali-scraper.mjs --headed

# 仅京东
node jd-scraper.mjs --headed

# 仅住宅/商业
node ali-scraper.mjs --headed --residential
node jd-scraper.mjs --headed --commercial
```

> 有头模式下，脚本会自动暂停等待你完成滑块验证，验证通过后继续自动采集。

### 3. 导入数据库

```bash
# 导入最新采集结果
node import-to-db.mjs

# 导入指定文件
node import-to-db.mjs ../data/merged_2026-04-09.json

# 预览模式（不写入）
node import-to-db.mjs --dry
```

## 文件说明

```
scraper/
├── package.json          # npm 依赖
├── utils.js              # 工具函数（价格/面积解析, 验证码检测等）
├── ali-scraper.mjs       # 阿里法拍采集脚本
├── jd-scraper.mjs        # 京东法拍采集脚本
├── run-both.mjs          # 并发运行两个平台
├── demo-data.mjs         # 生成演示/测试数据
└── import-to-db.mjs      # 导入 MongoDB
```

## 数据模型

输出直接匹配 `House` 模型：

```json
{
  "_id": "ali_SZ000001",
  "title": "福田区海德园 二拍 196㎡ 3室2厅",
  "platform": "ali",           // ali | jd
  "platformId": "ali9000001",
  "city": "深圳",
  "district": "福田区",
  "category": "residential",   // residential | commercial
  "price": 691.04,             // 起拍价（万）
  "marketPrice": 874.74,      // 评估价（万）
  "discount": 0.79,            // 折扣
  "area": 196.53,             // 面积（㎡）
  "unitPrice": 35342,          // 单价（元/㎡）
  "address": "广东省深圳市福田区深安路",
  "status": "ongoing",         // upcoming|ongoing|ended|sold|suspended|withdrawn
  "auctionStartTime": "2026-04-20T10:00:00.000Z",
  "auctionEndTime": "2026-04-21T10:00:00.000Z",
  "bidCount": 12,
  "isHot": false,
  "createdAt": "2026-04-09T...",
  "updatedAt": "2026-04-09T..."
}
```

## 定时采集（定时任务）

将以下命令配置为 cron job，实现每日自动采集：

```bash
# 每日早9点采集 + 导入
0 9 * * * cd /Users/zhaoqiuying/.qclaw/workspace/fapai-house/scraper && node run-both.mjs --headed --import >> ../logs/scraper.log 2>&1
```

或在 OpenClaw 中配置定时任务（参考 `qclaw-cron-skill`）。

## 常见问题

**Q: 阿里法拍一直提示验证？**
> 这是正常的反爬机制。有头模式下手动滑动一次即可，页面会记住 Cookie。

**Q: 无头模式能采集到数据吗？**
> 阿里基本不行（100% 触发验证），京东有一定成功率。建议日常用 `--headed` 模式。

**Q: 数据为空怎么办？**
> 1. 检查 Chrome 路径是否正确（`/Applications/Google Chrome.app`）
> 2. 先用 `node demo-data.mjs` 生成测试数据验证导入流程

**Q: 如何提高采集速度？**
> 使用 headed 模式 + 手动处理验证码后，脚本会记录 Cookie，下次无需重复验证。

**Q: 数据需要登录账号吗？**
> 不需要。列表页和基础详情页均可匿名访问。部分详情内容（如精确地址、联系方式）可能需要登录。
