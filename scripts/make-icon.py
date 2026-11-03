# 词屿 · 图标与封面素材（宣纸底 + 墨色「词」+ 朱红日点）
from PIL import Image, ImageDraw, ImageFont
import os

OUT = r'C:\Users\17523\Documents\deepseek-harness\default-workspace\word-master\desktop\installer\build-res'
os.makedirs(OUT, exist_ok=True)

CREAM = (246, 241, 230)
INK = (31, 59, 54)
VERMILION = (194, 65, 45)
LINE = (201, 190, 170)

S = 1024
img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# 宣纸圆角底
d.rounded_rectangle([0, 0, S - 1, S - 1], radius=210, fill=CREAM)
# 细边
d.rounded_rectangle([52, 52, S - 53, S - 53], radius=170, outline=LINE, width=4)
# 地平线
d.rectangle([180, 782, 844, 790], fill=INK)
# 朱红日点（亮点）
d.ellipse([690, 170, 812, 292], fill=VERMILION)

def font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()

f = font('C:/Windows/Fonts/simkai.ttf', 520)
text = '词'
bbox = d.textbbox((0, 0), text, font=f)
w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
d.text(((S - w) / 2 - bbox[0], (S - h) / 2 - bbox[1] - 40), text, font=f, fill=INK)

# 拼音/英文小字
f2 = font('C:/Windows/Fonts/georgia.ttf', 74)
sub = 'WORD ISLE'
b2 = d.textbbox((0, 0), sub, font=f2)
d.text(((S - (b2[2] - b2[0])) / 2 - b2[0], 860), sub, font=f2, fill=(120, 112, 98))

png = os.path.join(OUT, 'icon.png')
img.save(png)

sizes = [256, 128, 96, 64, 48, 32, 16]
imgs = [img.resize((s, s), Image.LANCZOS) for s in sizes]
ico = os.path.join(OUT, 'icon.ico')
imgs[0].save(ico, format='ICO', sizes=[(s, s) for s in sizes], append_images=imgs[1:])

# 启动封面（splash）用的方形 logo
splash = img.resize((360, 360), Image.LANCZOS)
splash.save(os.path.join(OUT, 'splash-logo.png'))

print('icon.png', os.path.getsize(png), 'icon.ico', os.path.getsize(ico))
