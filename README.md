# 🏠 深圳法拍房信息平台 — 项目说明

## 📌 项目简介
聚合阿里拍卖 + 京东拍卖的深圳地区法拍房源信息，首版简洁版。

参考：印山资产  
定位：C端用户查询 + B端中介/投资客获客

---

## 🎯 功能规划

### MVP（当前版本）
- [ ] 首页房源列表（筛选：区域、价格区间、拍卖状态）
- [ ] 房源详情页（市场价、拍卖价、当前状态、保证金）
- [ ] 用户注册 / 登录（手机号 + 验证码）
- [ ] 会员权限控制（注册后权限 PENDING，需管理员开通）
- [ ] 管理后台（用户管理 + 房源管理 + 权限开通）

### V2
- [ ] 地图找房（腾讯/高德地图）
- [ ] 企业微信二维码咨询
- [ ] 收藏功能

### V3
- [ ] 数据自动同步（阿里/京东API or 爬虫）
- [ ] 推送提醒

---

## 🗂️ 目录结构

```
fapai-house/
├── miniprogram/          # 微信小程序前端
│   ├── pages/
│   │   ├── home/         # 首页列表
│   │   ├── detail/       # 房源详情
│   │   ├── map/          # 地图找房
│   │   ├── my/           # 个人中心
│   │   ├── login/        # 登录
│   │   ├── register/     # 注册
│   │   └── admin/        # 管理后台
│   ├── components/       # 公共组件
│   └── utils/            # 工具函数
│
└── server/               # Node.js 后端
    ├── routes/           # 路由
    ├── models/           # 数据模型
    ├── middleware/       # 中间件
    └── utils/            # 工具函数
```

---

## 🔧 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | 微信小程序原生 |
| 后端 | Node.js + Express |
| 数据库 | MongoDB |
| 地图 | 腾讯位置服务 |
| 托管 | 微信云开发 or 轻量服务器 |

---

## 🚀 本地开发

### 后端
```bash
cd server
npm init -y
npm install express mongoose jsonwebtoken bcryptjs
node app.js
```

### 前端
在微信开发者工具中导入 `miniprogram/` 目录

---

## 📡 API 列表

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/auth/register | 注册 | 公开 |
| POST | /api/auth/login | 登录 | 公开 |
| GET | /api/houses | 房源列表（脱敏） | 公开 |
| GET | /api/houses/:id | 房源详情 | 需会员 |
| GET | /api/houses/map | 地图找房坐标 | 需会员 |
| GET | /api/admin/users | 用户列表 | 管理员 |
| PUT | /api/admin/users/:id | 开通用户权限 | 管理员 |
| POST | /api/contact | 提交咨询 | 需登录 |
