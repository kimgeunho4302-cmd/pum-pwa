#!/usr/bin/env python3
"""품(PUM) 공식 앱 아이콘 생성기.

코랄(브랜드 #FF3B30 → #E12A1F) 그라데이션 위에 흰색 '품' 글자를 얹은
앱 아이콘을 만들어 assets/icons/ 에 저장합니다.

  python3 tools/make-pum-icons.py

산출물
  icon-192.png           192x192  라운드(투명 모서리) · manifest any / favicon
  icon-512.png           512x512  라운드(투명 모서리) · manifest any
  icon-512-maskable.png  512x512  풀블리드 · manifest maskable (안전영역 80%)
  apple-touch-icon.png   180x180  풀블리드 · iOS 는 투명 모서리를 검게 칠하므로 사각
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets', 'icons')
FONT_CANDIDATES = [
    '/workspace/.local/share/fonts/NotoSansKR-Bold.otf',
    '/usr/share/fonts/pickle-hwp/NotoSansCJKkr-Bold.otf',
    '/usr/share/fonts/truetype/noto/NotoSansKR-Bold.ttf',
    '/System/Library/Fonts/AppleSDGothicNeo.ttc',
]


def pick_font():
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            return path
    raise SystemExit('한글 굵은 글꼴을 찾지 못했습니다: ' + ', '.join(FONT_CANDIDATES))


FONT = pick_font()

BRAND_FROM = (255, 74, 60)    # #FF4A3C (위·왼쪽)
BRAND_TO = (225, 42, 31)      # #E12A1F (아래·오른쪽)
BOLD = (225, 42, 31)          # #E12A1F
GLYPH = '품'


def gradient(size):
    """대각선(↘) 그라데이션 이미지."""
    grad = Image.new('RGB', (size, size))
    px = grad.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2.0 * (size - 1))
            px[x, y] = tuple(
                int(round(BRAND_FROM[i] + (BRAND_TO[i] - BRAND_FROM[i]) * t)) for i in range(3)
            )
    return grad


def rounded_mask(size, radius):
    mask = Image.new('L', (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return mask


def glyph_image(size, glyph_ratio):
    """흰색 '품' 글자 — 글자 실제 경계를 기준으로 정중앙에 놓습니다."""
    # 넉넉한 캔버스에 그린 뒤 bbox 로 잘라 정확히 중앙 정렬
    canvas = size * 2
    font_size = int(canvas * glyph_ratio)
    font = ImageFont.truetype(FONT, font_size)
    layer = Image.new('L', (canvas, canvas), 0)
    d = ImageDraw.Draw(layer)
    d.text((canvas // 2, canvas // 2), GLYPH, font=font, fill=255, anchor='mm')
    bbox = layer.getbbox()
    if not bbox:
        raise SystemExit('glyph render failed')
    cropped = layer.crop(bbox)

    # 글자 높이를 목표 비율에 맞춰 스케일 (한글 '품'은 거의 정사각형)
    target = int(size * glyph_ratio)
    w, h = cropped.size
    scale = target / float(max(w, h))
    cropped = cropped.resize((max(1, int(round(w * scale))), max(1, int(round(h * scale)))), Image.LANCZOS)

    out = Image.new('L', (size, size), 0)
    out.paste(cropped, ((size - cropped.width) // 2, (size - cropped.height) // 2))
    return out


def make(size, glyph_ratio, radius_ratio=0.0, out='icon.png'):
    S = size * 4  # 슈퍼샘플링
    base = gradient(S)
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    img.paste(base, (0, 0), rounded_mask(S, int(S * radius_ratio)) if radius_ratio else None)

    white = Image.new('RGBA', (S, S), (255, 255, 255, 255))
    img.paste(white, (0, 0), glyph_image(S, glyph_ratio))

    img = img.resize((size, size), Image.LANCZOS)
    path = os.path.join(OUT, out)
    img.save(path, optimize=True)
    # 부드러운 모서리를 위해 512 는 팔레트 대신 RGBA 유지
    print('%-24s %dx%d  %6.1f KB' % (out, size, size, os.path.getsize(path) / 1024.0))


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    # 192/512: 홈 화면에서 OS 가 모서리를 다듬으므로 살짝 둥근 모양 유지
    make(512, 0.50, 0.225, 'icon-512.png')
    make(192, 0.50, 0.225, 'icon-192.png')
    # maskable: 안전영역(중앙 80% 원) 안에 글자가 들어오도록 여백 확보 + 풀블리드
    make(512, 0.42, 0.0, 'icon-512-maskable.png')
    # iOS: 투명 모서리가 검게 보이므로 풀블리드 사각
    make(180, 0.48, 0.0, 'apple-touch-icon.png')
