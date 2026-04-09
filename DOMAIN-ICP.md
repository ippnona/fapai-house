# 域名购买 + ICP 备案完整指南

## 一、购买域名（推荐阿里云）

### 1.1 注册阿里云账号
- 访问 https://www.aliyun.com
- 完成实名认证（个人：身份证；企业：营业执照）

### 1.2 搜索并购买域名
```
推荐域名：
- fapai-sz.com    （法拍-深圳）
- szfapai.com     （深圳法拍）
- fangpai.wang    （房拍网）
- fapai.app       （法拍应用）

价格参考：
- .com: 55-80元/年
- .cn:  29-39元/年
- .app: 15-25元/年
```

### 1.3 域名实名认证
购买后必须完成实名认证才能解析：
- 个人：上传身份证正反面
- 企业：上传营业执照 + 法人身份证
- 审核时间：1-3 工作日

---

## 二、购买服务器（轻量应用服务器）

### 2.1 推荐配置
```
阿里云轻量应用服务器：
- 地域：华南 1（深圳）← 必须选深圳，备案要求
- 配置：2核 2G 5M带宽
- 系统：Ubuntu 22.04 LTS
- 价格：约 30-50元/月（新用户首年 99元）
- 时长：至少 3 个月（备案要求）
```

### 2.2 购买链接
- 阿里云：https://www.aliyun.com/product/swas
- 腾讯云：https://cloud.tencent.com/product/lighthouse

> ⚠️ **重要**：服务器必须购买 **3个月以上** 才能用于备案！

---

## 三、域名备案（ICP备案）

### 3.1 备案前准备

| 材料 | 个人 | 企业 |
|------|------|------|
| 身份证 | ✅ 正反面照片 | ✅ 法人身份证 |
| 营业执照 | ❌ | ✅ 彩色扫描件 |
| 手机号 | ✅ 本人实名 | ✅ 法人或管理员 |
| 邮箱 | ✅ 常用邮箱 | ✅ 企业邮箱 |
| 幕布照 | ✅ 阿里云邮寄 | ✅ 阿里云邮寄 |
| 承诺书 | ✅ 在线签署 | ✅ 盖章扫描 |

### 3.2 备案流程（阿里云）

#### Step 1: 进入备案系统
1. 登录阿里云控制台
2. 搜索「ICP备案」→ 进入备案系统
3. 点击「开始备案」

#### Step 2: 填写主体信息
```
备案类型：个人 / 企业
证件类型：身份证 / 营业执照
证件号码：你的身份证号
主体名称：个人姓名 / 企业全称
主体地址：身份证地址 / 营业执照地址
手机号：本人实名手机号
应急手机号：备用联系人（不同手机号）
邮箱：常用邮箱
```

#### Step 3: 填写网站信息
```
网站名称：深圳法拍房源信息平台
（注意：不能含「中国」「国家」「深圳」等敏感词）

网站域名：fapai-sz.com
网站首页：http://fapai-sz.com
网站类型：非交互式
网站语言：中文简体

网站负责人：
- 姓名：你的姓名
- 身份证号：你的身份证号
- 手机号：你的手机号
- 应急手机号：备用号码
- 邮箱：你的邮箱
```

#### Step 4: 上传资料
- 身份证正反面（清晰，四角完整）
- 手持身份证照片（阿里云 APP 拍摄）
- 网站备案信息真实性核验单（在线生成，签名）

#### Step 5: 阿里云初审
- 时间：1-2 工作日
- 阿里云客服会打电话核实信息
- 保持手机畅通！

#### Step 6: 工信部短信核验
- 初审通过后，会收到工信部短信
- 访问 https://beian.miit.gov.cn 核验
- 输入短信中的验证码

#### Step 7: 管局审核
- 时间：7-20 工作日（各省不同）
- 期间保持手机畅通
- 管局可能会打电话核实

#### Step 8: 备案成功
- 收到备案号：粤ICP备XXXXXXXX号
- 在网站底部添加备案号并链接到工信部

---

## 四、服务器配置

### 4.1 连接服务器
```bash
ssh root@YOUR_SERVER_IP
```

### 4.2 安装 Node.js + MongoDB
```bash
# 更新系统
apt update && apt upgrade -y

# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 安装 MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org

# 启动 MongoDB
systemctl start mongod
systemctl enable mongod
```

### 4.3 部署后端代码
```bash
# 安装 git
apt install -y git

# 克隆代码
git clone https://github.com/YOUR_USERNAME/fapai-house.git
cd fapai-house/server

# 安装依赖
npm install

# 创建环境变量文件
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
MONGO_URI=mongodb://localhost:27017/fapai_db
JWT_SECRET=$(openssl rand -base64 32)
WECHAT_APPID=wx1b250ad4e69950e8
WECHAT_SECRET=1b2b39ba50e045a1b90bd6a460c7ca20
EOF

# 使用 PM2 启动
npm install -g pm2
pm2 start app.js --name "fapai-server"
pm2 startup
pm2 save
```

### 4.4 配置 Nginx + HTTPS
```bash
# 安装 Nginx 和 Certbot
apt install -y nginx certbot python3-certbot-nginx

# 配置 Nginx
cat > /etc/nginx/sites-available/fapai << 'EOF'
server {
    listen 80;
    server_name fapai-sz.com www.fapai-sz.com;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -s /etc/nginx/sites-available/fapai /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# 申请 SSL 证书
certbot --nginx -d fapai-sz.com -d www.fapai-sz.com

# 自动续期测试
certbot renew --dry-run
```

---

## 五、更新小程序配置

### 5.1 修改小程序后端地址
编辑 `miniprogram/app.js`：
```javascript
const BASE_URL = 'https://fapai-sz.com/api'  // 你的域名
```

### 5.2 微信公众平台配置
1. 登录 https://mp.weixin.qq.com
2. 开发 → 开发管理 → 开发设置
3. 服务器域名：
   - request 合法域名：`https://fapai-sz.com`
   - uploadFile 合法域名：`https://fapai-sz.com`
   - downloadFile 合法域名：`https://fapai-sz.com`

### 5.3 小程序备案
1. 设置 → 基本信息 → 小程序备案
2. 填写备案号：粤ICP备XXXXXXXX号
3. 提交审核

---

## 六、费用汇总

| 项目 | 费用 | 周期 |
|------|------|------|
| 域名 (.com) | ~60元 | 1年 |
| 服务器 (2C2G) | ~360元 | 1年（新用户99元） |
| SSL 证书 | 免费 | Let's Encrypt |
| 备案 | 免费 | - |
| **总计** | **~420元/年** | - |

---

## 七、时间线

```
Day 1: 购买域名 + 服务器
Day 2-3: 域名实名认证
Day 4: 提交备案申请
Day 5-6: 阿里云初审
Day 7: 工信部短信核验
Day 8-20: 管局审核（等待期）
Day 21: 备案成功，部署上线
```

---

## 八、常见问题

**Q: 备案期间网站能访问吗？**
A: 不能。备案期间必须关闭网站或显示「网站建设中」。

**Q: 个人可以备案吗？**
A: 可以，但网站内容不能涉及经营性质。

**Q: 备案被驳回怎么办？**
A: 根据驳回原因修改，常见原因：
- 网站名称不合规（含敏感词）
- 身份证照片不清晰
- 联系方式无法接通

**Q: 可以用香港服务器免备案吗？**
A: 可以，但小程序线上版本 **必须** 使用已备案域名，香港服务器无法满足此要求。
