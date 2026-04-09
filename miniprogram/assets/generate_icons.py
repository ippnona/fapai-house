#!/usr/bin/env python3
"""
生成小程序 tabBar 图标和占位图
使用 Pillow，无需安装 ImageMagick
"""
import os
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
os.makedirs(OUT_DIR, exist_ok=True)

# 配色
NAVY    = (26, 26, 46)     # #1a1a2e
RED     = (233, 69, 96)    # #e94560
GRAY    = (153, 153, 153)  # #999999
WHITE   = (255, 255, 255)
LIGHT   = (245, 245, 247)  # #f5f5f7

# tabBar 图标尺寸 (81px = @2x, 108px = @3x)
TAB_SIZE = 81

def draw_rounded_rect(draw, xy, radius, fill, outline=None, width=1):
    x1, y1, x2, y2 = xy
    r = radius
    draw.rectangle([x1+r, y1, x2-r, y2], fill=fill, outline=outline)
    draw.rectangle([x1, y1+r, x2, y2-r], fill=fill, outline=outline)
    draw.pieslice([x1, y1, x1+2*r, y1+2*r], 180, 270, fill=fill, outline=outline)
    draw.pieslice([x2-2*r, y1, x2, y1+2*r], 270, 360, fill=fill, outline=outline)
    draw.pieslice([x1, y2-2*r, x1+2*r, y2], 90, 180, fill=fill, outline=outline)
    draw.pieslice([x2-2*r, y2-2*r, x2, y2], 0, 90, fill=fill, outline=outline)

def make_transparent(size):
    img = Image.new('RGBA', size, (0, 0, 0, 0))
    return ImageDraw.Draw(img), img

# ─────────────────────────────────────────────
# 1. tab-house (普通)
# ─────────────────────────────────────────────
def gen_tab_house_normal():
    draw, img = make_transparent((TAB_SIZE, TAB_SIZE))
    c = GRAY
    # 屋顶 (三角形)
    roof = [(13, 40), (40.5, 13), (68, 40)]
    draw.polygon(roof, fill=c)
    # 墙体 (矩形)
    draw.rectangle([22, 38, 59, 63], fill=c)
    # 门
    draw.rectangle([35, 48, 46, 63], fill=(26, 26, 46, 255))
    return img

def gen_tab_house_active():
    draw, img = make_transparent((TAB_SIZE, TAB_SIZE))
    c = RED
    roof = [(13, 40), (40.5, 13), (68, 40)]
    draw.polygon(roof, fill=c)
    draw.rectangle([22, 38, 59, 63], fill=c)
    draw.rectangle([35, 48, 46, 63], fill=(233, 69, 96, 255))
    return img

# ─────────────────────────────────────────────
# 2. tab-map (普通)
# ─────────────────────────────────────────────
def gen_tab_map_normal():
    draw, img = make_transparent((TAB_SIZE, TAB_SIZE))
    c = GRAY
    # 地图标记大头针
    # 针尖
    draw.polygon([(40.5, 65), (30, 38), (51, 38)], fill=c)
    # 圆头
    draw.ellipse([24, 17, 57, 50], fill=c)
    draw.ellipse([32, 25, 49, 42], fill=LIGHT)
    return img

def gen_tab_map_active():
    draw, img = make_transparent((TAB_SIZE, TAB_SIZE))
    c = RED
    draw.polygon([(40.5, 65), (30, 38), (51, 38)], fill=c)
    draw.ellipse([24, 17, 57, 50], fill=c)
    draw.ellipse([32, 25, 49, 42], fill=WHITE)
    return img

# ─────────────────────────────────────────────
# 3. tab-user (普通)
# ─────────────────────────────────────────────
def gen_tab_user_normal():
    draw, img = make_transparent((TAB_SIZE, TAB_SIZE))
    c = GRAY
    # 头像圆形
    draw.ellipse([25, 12, 56, 43], fill=c)
    # 身体半圆
    draw.ellipse([16, 43, 65, 69], fill=c)
    return img

def gen_tab_user_active():
    draw, img = make_transparent((TAB_SIZE, TAB_SIZE))
    c = RED
    draw.ellipse([25, 12, 56, 43], fill=c)
    draw.ellipse([16, 43, 65, 69], fill=c)
    return img

# ─────────────────────────────────────────────
# 占位图生成
# ─────────────────────────────────────────────
PLACEHOLDER_W, PLACEHOLDER_H = 750, 400  # 标准列表图宽高比

def make_gradient_bg(w, h, color1, color2, direction='vertical'):
    img = Image.new('RGB', (w, h))
    pix = img.load()
    for y in range(h):
        for x in range(w):
            ratio = y / h if direction == 'vertical' else x / w
            r = int(color1[0] + (color2[0] - color1[0]) * ratio)
            g = int(color1[1] + (color2[1] - color1[1]) * ratio)
            b = int(color1[2] + (color2[2] - color1[2]) * ratio)
            pix[x, y] = (r, g, b)
    return img

def add_text(draw, text, pos, fill, size=28):
    try:
        font = ImageFont.truetype('/System/Library/Fonts/PingFang.ttc', size)
    except:
        try:
            font = ImageFont.truetype('/System/Library/Fonts/STHeiti Light.ttc', size)
        except:
            font = ImageFont.load_default()
    draw.text(pos, text, font=font, fill=fill)

# 列表卡片占位图
def gen_placeholder_list(idx=0):
    colors = [
        ((26, 26, 46), (58, 58, 128)),
        ((46, 26, 46), (128, 58, 88)),
        ((26, 46, 38), (58, 128, 88)),
        ((46, 38, 26), (128, 108, 58)),
        ((30, 26, 46), (80, 58, 128)),
    ]
    c1, c2 = colors[idx % len(colors)]
    img = make_gradient_bg(PLACEHOLDER_W, PLACEHOLDER_H, c1, c2)
    draw = ImageDraw.Draw(img)

    # 房屋图标
    cx, cy = PLACEHOLDER_W // 2, PLACEHOLDER_H // 2 - 20
    scale = 1.8
    roof = [(cx - 60*scale, cy + 10*scale), (cx, cy - 70*scale), (cx + 60*scale, cy + 10*scale)]
    draw.polygon(roof, fill=(255,255,255,80))
    draw.rectangle([cx - 45*scale, cy + 8*scale, cx + 45*scale, cy + 55*scale],
                   fill=(255,255,255,60))
    draw.rectangle([cx - 12*scale, cy + 25*scale, cx + 12*scale, cy + 55*scale],
                   fill=(26,26,46,200))

    # 底部文字
    add_text(draw, f'房源图片 {idx+1}', (PLACEHOLDER_W//2 - 60, PLACEHOLDER_H - 50),
             (255, 255, 255, 200), 24)
    return img

# 详情页大图占位
def gen_placeholder_detail():
    w, h = 750, 500
    img = make_gradient_bg(w, h, (26, 26, 46), (80, 58, 128))
    draw = ImageDraw.Draw(img)

    cx, cy = w // 2, h // 2
    # 房屋
    roof = [(cx - 80, cy - 40), (cx, cy - 130), (cx + 80, cy - 40)]
    draw.polygon(roof, fill=(255,255,255,80))
    draw.rectangle([cx - 65, cy - 42, cx + 65, cy + 60], fill=(255,255,255,60))
    draw.rectangle([cx - 15, cy - 10, cx + 15, cy + 60], fill=(26,26,46,200))

    add_text(draw, '房源实景图', (cx - 70, cy + 80), (255,255,255,180), 28)
    return img

# 地图标记图标
def gen_map_marker(size=44):
    img = Image.new('RGBA', (size, size + 12), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    c = RED
    # 大头针形状
    draw.ellipse([4, 4, size - 4, size - 4], fill=c)
    draw.ellipse([size//2 - 6, size//2 - 6, size//2 + 6, size//2 + 6], fill=WHITE)
    draw.polygon([(size//2, size), (size//2 - 8, size - 8), (size//2 + 8, size - 8)], fill=c)
    return img

# 用户头像占位
def gen_avatar_placeholder(size=200):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse([0, 0, size-1, size-1], fill=NAVY)
    # 简单人物
    head_r = size // 4
    cx = size // 2
    draw.ellipse([cx - head_r, size//6 - head_r, cx + head_r, size//6 + head_r], fill=GRAY)
    draw.ellipse([cx - size//3, size//3, cx + size//3, size - 4], fill=GRAY)
    return img

# ─────────────────────────────────────────────
# 主函数
# ─────────────────────────────────────────────
def main():
    print("生成 tabBar 图标...")

    # TabBar 图标
    icons = [
        ('tab-house.png',      gen_tab_house_normal()),
        ('tab-house-active.png', gen_tab_house_active()),
        ('tab-map.png',        gen_tab_map_normal()),
        ('tab-map-active.png', gen_tab_map_active()),
        ('tab-user.png',       gen_tab_user_normal()),
        ('tab-user-active.png', gen_tab_user_active()),
    ]
    for name, img in icons:
        out = os.path.join(OUT_DIR, name)
        img.save(out, 'PNG')
        print(f"  ✅ {name} ({TAB_SIZE}x{TAB_SIZE})")

    # 列表占位图
    print("\n生成列表占位图...")
    for i in range(6):
        img = gen_placeholder_list(i)
        out = os.path.join(OUT_DIR, f'placeholder_{i+1}.png')
        img.save(out, 'PNG', quality=85)
        print(f"  ✅ placeholder_{i+1}.png ({PLACEHOLDER_W}x{PLACEHOLDER_H})")

    # 详情页大图
    detail = gen_placeholder_detail()
    detail.save(os.path.join(OUT_DIR, 'placeholder_detail.png'), 'PNG', quality=85)
    print("  ✅ placeholder_detail.png")

    # 地图标记
    marker = gen_map_marker(44)
    marker.save(os.path.join(OUT_DIR, 'map_marker.png'), 'PNG')
    print("  ✅ map_marker.png")

    # 用户头像
    avatar = gen_avatar_placeholder(200)
    avatar.save(os.path.join(OUT_DIR, 'avatar_placeholder.png'), 'PNG')
    print("  ✅ avatar_placeholder.png")

    print(f"\n全部完成! 输出目录: {OUT_DIR}")

if __name__ == '__main__':
    main()
