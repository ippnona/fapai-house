#!/bin/bash
# Render 部署辅助脚本
# 用法: ./deploy-render.sh

set -e

echo "🚀 深圳法拍房后端部署脚本"
echo ""

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查 GitHub 仓库
if ! git remote -v > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  未配置 GitHub 远程仓库${NC}"
    echo ""
    echo "请先在 GitHub 创建仓库，然后执行："
    echo "  git remote add origin https://github.com/YOUR_USERNAME/fapai-house.git"
    echo ""
    read -p "输入你的 GitHub 用户名: " GITHUB_USER
    
    if [ -n "$GITHUB_USER" ]; then
        git remote add origin "https://github.com/$GITHUB_USER/fapai-house.git"
        echo -e "${GREEN}✅ 已添加远程仓库${NC}"
    else
        echo -e "${RED}❌ 需要 GitHub 用户名才能继续${NC}"
        exit 1
    fi
fi

# 推送代码
echo ""
echo "📤 推送代码到 GitHub..."
git push -u origin main || git push -u origin master

echo ""
echo -e "${GREEN}✅ 代码已推送到 GitHub${NC}"
echo ""
echo "下一步："
echo "1. 访问 https://dashboard.render.com"
echo "2. 点击 'New +' → 'Web Service'"
echo "3. 连接 GitHub 仓库 'fapai-house'"
echo "4. 配置："
echo "   - Name: fapai-house-server"
echo "   - Region: Singapore (离中国最近)"
echo "   - Branch: main"
echo "   - Build Command: npm install"
echo "   - Start Command: node app.js"
echo ""
echo "5. 添加环境变量："
echo "   NODE_ENV=production"
echo "   WECHAT_APPID=wx1b250ad4e69950e8"
echo "   WECHAT_SECRET=1b2b39ba50e045a1b90bd6a460c7ca20"
echo "   JWT_SECRET=$(openssl rand -base64 32)"
echo ""
echo "6. 点击 'Create Web Service'"
echo ""
echo "部署完成后，你的 API 地址将是："
echo "  https://fapai-house-server.onrender.com"
