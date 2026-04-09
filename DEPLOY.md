# 深圳法拍房源小程序 - 部署指南

## 一、账号凭证

| 项目 | 值 |
|------|-----|
| AppID | `wx1b250ad4e69950e8` |
| AppSecret | `1b2b39ba50e045a1b90bd6a460c7ca20` |
| Token 有效期 | 7200 秒（2小时） |

> ⚠️ AppSecret 已验证有效，请妥善保管，**不要提交到 GitHub**！

---

## 二、本地开发

```bash
# 1. 进入后端目录
cd server

# 2. 安装依赖
npm install

# 3. 启动 MongoDB（macOS）
brew services start mongodb-community

# 4. 启动后端
npm run dev
# → http://localhost:3000

# 5. 微信开发者工具
# 打开 miniprogram 目录，选择 AppID: wx1b250ad4e69950e8
```

---

## 三、生产部署（推荐 Render 免费版）

### 3.1 注册 Render
1. 访问 https://render.com 注册（可用 GitHub 登录）
2. 免费版配额：750 小时/月，休眠后首次请求需 30 秒唤醒

### 3.2 部署步骤

#### 方式 A：Git 自动部署（推荐）

1. **推送代码到 GitHub**
   ```bash
   # 在 fapai-house 目录
   git init
   git add .
   git commit -m "init"
   # 创建 GitHub 仓库后
   git remote add origin https://github.com/YOUR_USERNAME/fapai-house.git
   git push -u origin main
   ```

2. **在 Render 创建服务**
   - Dashboard → New → Web Service
   - Connect GitHub 仓库 `fapai-house`
   - 配置：
     - Name: `fapai-house-server`
     - Region: `Hong Kong`（延迟最低）
     - Branch: `main`
     - Build Command: `npm install`
     - Start Command: `node app.js`
   - Environment Variables 添加：
     ```
     NODE_ENV = production
     PORT = 10000
     JWT_SECRET = <随机字符串>
     WECHAT_APPID = wx1b250ad4e69950e8
     WECHAT_SECRET = 1b2b39ba50e045a1b90bd6a460c7ca20
     MONGO_URI = <MongoDB 连接串>
     ```

3. **创建 MongoDB**
   - Dashboard → New → MongoDB
   - Region: `Hong Kong`
   - 免费版：512MB 存储

#### 方式 B：Docker 部署

```bash
cd server
docker-compose up -d
# 访问 http://localhost:3000
```

---

## 四、生产环境配置

### 4.1 更新小程序 API 地址

修改 `miniprogram/app.js`:

```javascript
const BASE_URL = 'https://YOUR_RENDER_DOMAIN.onrender.com/api'
// 例如：https://fapai-house-server.onrender.com/api
```

### 4.2 配置 HTTPS

Render 免费版已自带 HTTPS 证书（*.onrender.com）。

### 4.3 域名备案（ICP 备案）

详见下方 **第六节**。

---

## 五、验证部署

```bash
# 健康检查
curl https://YOUR_DOMAIN.onrender.com/api/health
# 返回: {"code":0,"msg":"ok","time":"..."}

# 测试获取房源
curl https://YOUR_DOMAIN.onrender.com/api/houses?district=福田区&limit=5
```

---

## 六、微信小程序备案（ICP 备案）

### 6.1 备案前提

| 条件 | 说明 |
|------|------|
| 已认证小程序 | 需完成微信认证（300元/年） |
| 已绑定服务器 | 域名已完成 ICP 备案 |
| 域名要求 | 必须使用已备案域名，HTTPS 必需 |

### 6.2 国内服务器 + 域名备案流程

#### 第一步：购买域名和服务器

| 推荐 | 规格 |
|------|------|
| 域名 | 阿里云 / 腾讯云（.com/.cn，50-80元/年） |
| 服务器 | 轻量应用服务器 2C2G（深圳节点，约30元/月） |

#### 第二步：域名备案

**阿里云备案流程：**
1. 登录阿里云备案系统
2. 选择「小程序备案」
3. 填写信息：
   - 主办单位：个人 / 企业
   - 网站名称：深圳法拍房
   - 域名：fapai-xxx.com
   - 服务器：深圳节点的轻量服务器
4. 上传证件：
   - 个人：身份证正反面 + 备案幕布照
   - 企业：营业执照 + 法人身份证 + 授权书
5. 微信小程序平台验证备案号

**腾讯云备案流程：**
1. 登录腾讯云备案控制台
2. 备案类型选择「小程序备案」
3. 流程类似阿里云

#### 第三步：配置 HTTPS

1. 申请免费 SSL 证书（Let's Encrypt 或各大云厂商提供）
2. 配置域名解析到服务器 IP
3. Nginx 配置示例：

```nginx
server {
    listen 443 ssl http2;
    server_name fapai-yourname.com;

    ssl_certificate /etc/letsencrypt/live/fapai-yourname.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fapai-yourname.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 第四步：在微信公众平台提交备案

1. 登录 https://mp.weixin.qq.com
2. 设置 → 基本信息 → 小程序备案
3. 填写备案信息：
   - 备案号：粤ICP备XXXXXXXX号
   - 域名：fapai-yourname.com
4. 提交审核（7-20个工作日）

---

## 七、常见问题

| 问题 | 解决方案 |
|------|----------|
| access_token 过期 | 后端已实现自动刷新，无需手动处理 |
| 小程序无法请求本地后端 | 微信开发者工具 → 详情 → 本地设置 → 勾选「不校验合法域名」 |
| 登录失败 403 | 检查 JWT_SECRET 是否一致，清理缓存重试 |
| MongoDB 连接失败 | 确认连接串格式，检查服务器安全组端口 27017 |
| 备案被驳回 | 检查网站名称是否符合规范（不能含「深圳」「法拍」等特定词汇） |

---

## 八、下一步

1. ✅ 部署后端到 Render
2. ⬜ 配置域名和 HTTPS
3. ⬜ 完成 ICP 备案
4. ⬜ 提交小程序审核
5. ⬜ 上线运营
