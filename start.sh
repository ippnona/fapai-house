#!/bin/bash
# 法拍房项目 - 完整部署启动器
# 用法: ./start.sh [command]

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║         深圳法拍房源小程序 - 部署启动器                   ║"
echo "║         AppID: wx1b250ad4e69950e8                        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

show_menu() {
    echo ""
    echo "请选择操作："
    echo ""
    echo "  ${GREEN}1${NC}) 本地开发启动"
    echo "  ${GREEN}2${NC}) 部署到 Render（海外，免备案）"
    echo "  ${GREEN}3${NC}) 购买域名 + ICP 备案（国内上线必需）"
    echo "  ${GREEN}4${NC}) 查看部署文档"
    echo "  ${GREEN}5${NC}) 检查项目状态"
    echo "  ${RED}0${NC}) 退出"
    echo ""
}

local_dev() {
    echo -e "${YELLOW}🚀 启动本地开发环境...${NC}"
    
    # 检查 MongoDB
    if ! pgrep -x "mongod" > /dev/null; then
        echo -e "${YELLOW}⚠️  MongoDB 未运行，尝试启动...${NC}"
        if command -v brew &> /dev/null; then
            brew services start mongodb-community 2>/dev/null || echo "请手动启动 MongoDB"
        else
            echo "请手动启动 MongoDB"
        fi
        sleep 2
    fi
    
    # 启动后端
    echo -e "${GREEN}✅ 启动后端服务...${NC}"
    cd "$PROJECT_DIR/server"
    npm install 2>/dev/null || true
    
    # 在新窗口启动后端（macOS）
    osascript -e "tell application \"Terminal\" to do script \"cd '$PROJECT_DIR/server' && npm run dev\"" 2>/dev/null || {
        echo "手动启动后端: cd server && npm run dev"
    }
    
    echo ""
    echo -e "${GREEN}✅ 后端已启动: http://localhost:3000${NC}"
    echo ""
    echo "下一步："
    echo "1. 打开微信开发者工具"
    echo "2. 导入项目: $PROJECT_DIR/miniprogram"
    echo "3. AppID: wx1b250ad4e69950e8"
    echo ""
}

deploy_render() {
    echo -e "${YELLOW}🚀 Render 部署向导${NC}"
    echo ""
    
    # 检查 GitHub 仓库
    if ! git -C "$PROJECT_DIR" remote -v > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  需要配置 GitHub 远程仓库${NC}"
        echo ""
        echo "请执行以下步骤："
        echo ""
        echo "1. 访问 https://github.com/new"
        echo "2. 创建仓库: fapai-house"
        echo "3. 执行以下命令："
        echo ""
        echo -e "${BLUE}   cd $PROJECT_DIR${NC}"
        echo -e "${BLUE}   git remote add origin https://github.com/YOUR_USERNAME/fapai-house.git${NC}"
        echo -e "${BLUE}   git push -u origin main${NC}"
        echo ""
        read -p "完成后按回车继续..."
    fi
    
    echo ""
    echo -e "${GREEN}📋 Render 部署步骤：${NC}"
    echo ""
    echo "1. 访问 https://dashboard.render.com"
    echo "2. 使用 GitHub 登录"
    echo "3. 点击 'New +' → 'Web Service'"
    echo "4. 选择 'Build and deploy from a Git repository'"
    echo "5. 连接你的 GitHub 账号，选择 'fapai-house' 仓库"
    echo "6. 填写配置："
    echo ""
    echo "   Name:           fapai-house-server"
    echo "   Region:         Singapore (新加坡，延迟最低)"
    echo "   Branch:         main"
    echo "   Build Command:  npm install"
    echo "   Start Command:  node app.js"
    echo ""
    echo "7. 点击 'Advanced' 添加环境变量："
    echo ""
    echo -e "   ${YELLOW}NODE_ENV${NC}      = production"
    echo -e "   ${YELLOW}WECHAT_APPID${NC}  = wx1b250ad4e69950e8"
    echo -e "   ${YELLOW}WECHAT_SECRET${NC} = 1b2b39ba50e045a1b90bd6a460c7ca20"
    echo -e "   ${YELLOW}JWT_SECRET${NC}    = $(openssl rand -base64 32)"
    echo ""
    echo "8. 点击 'Create Web Service'"
    echo ""
    echo -e "${GREEN}⏳ 等待部署完成（约 2-5 分钟）...${NC}"
    echo ""
    echo "部署成功后，你的 API 地址将是："
    echo -e "${BLUE}  https://fapai-house-server.onrender.com${NC}"
    echo ""
    echo "然后修改小程序配置："
    echo -e "${BLUE}  miniprogram/app.js${NC} 中的 BASE_URL"
    echo ""
}

domain_icp() {
    echo -e "${YELLOW}📖 域名购买 + ICP 备案指南${NC}"
    echo ""
    
    if [ -f "$PROJECT_DIR/DOMAIN-ICP.md" ]; then
        cat "$PROJECT_DIR/DOMAIN-ICP.md" | head -100
        echo ""
        echo -e "${GREEN}完整文档: DOMAIN-ICP.md${NC}"
    else
        echo "文档不存在"
    fi
    
    echo ""
    echo "🛒 快速购买链接："
    echo "  阿里云域名: https://wanwang.aliyun.com"
    echo "  阿里云服务器: https://www.aliyun.com/product/swas"
    echo ""
    echo "💰 预计费用："
    echo "  域名 (.com): ~60元/年"
    echo "  服务器: ~99元/年（新用户首年）"
    echo "  SSL 证书: 免费 (Let's Encrypt)"
    echo "  备案: 免费"
    echo "  ───────────────"
    echo "  总计: ~160元/年"
    echo ""
}

show_docs() {
    echo -e "${YELLOW}📚 项目文档${NC}"
    echo ""
    echo "  DEPLOY.md      - 部署指南"
    echo "  DOMAIN-ICP.md  - 域名购买 + ICP 备案"
    echo "  README.md      - 项目说明"
    echo "  server/        - 后端代码"
    echo "  miniprogram/   - 小程序代码"
    echo ""
}

check_status() {
    echo -e "${YELLOW}🔍 项目状态检查${NC}"
    echo ""
    
    echo "Git 仓库:"
    git -C "$PROJECT_DIR" remote -v 2>/dev/null || echo "  未配置远程仓库"
    
    echo ""
    echo "文件统计:"
    find "$PROJECT_DIR" -type f | wc -l | xargs echo "  总文件数:"
    
    echo ""
    echo "关键文件:"
    for file in "server/app.js" "miniprogram/app.js" "deploy.config.json" "project.config.json"; do
        if [ -f "$PROJECT_DIR/$file" ]; then
            echo -e "  ${GREEN}✓${NC} $file"
        else
            echo -e "  ${RED}✗${NC} $file (缺失)"
        fi
    done
    
    echo ""
    echo "AppID 配置:"
    grep -o 'wx1b250ad4e69950e8' "$PROJECT_DIR/project.config.json" > /dev/null && \
        echo -e "  ${GREEN}✓${NC} project.config.json" || echo -e "  ${RED}✗${NC} project.config.json"
}

# 主程序
if [ $# -eq 0 ]; then
    show_menu
    read -p "请输入选项 [0-5]: " choice
else
    choice=$1
fi

case $choice in
    1) local_dev ;;
    2) deploy_render ;;
    3) domain_icp ;;
    4) show_docs ;;
    5) check_status ;;
    0) echo "再见！"; exit 0 ;;
    *) echo "无效选项"; exit 1 ;;
esac
