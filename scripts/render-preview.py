"""Approximate recorded Zepp widgets using the actual bundled fonts, at 2x."""
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent.parent
artifacts = root / 'artifacts'
version = json.loads((root / 'app.json').read_text(encoding='utf-8'))['app']['version']['name']
scenes = json.loads((artifacts / 'watch-layouts.json').read_text(encoding='utf-8'))
tokens = json.loads((artifacts / 'preview-colors.json').read_text(encoding='utf-8'))
SCALE = 2


def color(value):
    return f'#{value:06x}'


def font(path, size):
    return ImageFont.truetype(str(root / 'assets/trex3' / path), round(size * SCALE))


def render(commands, width=480, height=480, round_screen=True):
    image = Image.new('RGB', (width * SCALE, height * SCALE), color(tokens['background']))
    pen = ImageDraw.Draw(image)
    for item in commands:
        x, y, w, h = (item[k] * SCALE for k in ['x', 'y', 'w', 'h'])
        fill = color(item.get('color', 0))
        if item['type'] == 'ARC':
            pen.arc((x, y, x + w, y + h), item['start_angle'], item['end_angle'], fill=fill, width=SCALE)
            continue
        if item['type'] in ['FILL_RECT', 'BUTTON']:
            pen.rounded_rectangle((x, y, x + w, y + h), item.get('radius', 0) * SCALE,
                                  fill=color(item['normal_color']) if item['type'] == 'BUTTON' else fill)
            if item['type'] == 'FILL_RECT':
                continue
        if not item.get('text'):
            continue
        face = font(item['font'], item['text_size'])
        lines = []
        for paragraph in item['text'].split('\n'):
            current = ''
            for word in paragraph.split():
                candidate = f'{current} {word}'.strip()
                if pen.textlength(candidate, font=face) > w and current:
                    lines.append(current)
                    current = word
                else:
                    current = candidate
            lines.append(current)
        line_height = item['text_size'] * SCALE * 1.12
        ink_height = max((pen.textbbox((0, 0), line, font=face)[3] - pen.textbbox((0, 0), line, font=face)[1] for line in lines), default=0)
        if (len(lines) - 1) * line_height + ink_height > h:
            raise ValueError(f"Text clips: {item['text']!r}")
        top = y + (h - len(lines) * line_height) / 2
        for line in lines:
            length = pen.textlength(line, font=face)
            if length > w + SCALE:
                raise ValueError(f'Text too wide: {line!r}')
            left = x if item.get('align_h') == 'LEFT' else x + (w - length) / 2
            # Place the ink at the center of each line box. Zepp's font metrics
            # may differ; this render validates content/geometry, not firmware.
            bounds = pen.textbbox((0, 0), line, font=face)
            ink_top = top + (line_height - (bounds[3] - bounds[1])) / 2
            if round_screen:
                for px in (left, left + length):
                    for py in (ink_top, ink_top + bounds[3] - bounds[1]):
                        if math.hypot(px / SCALE - 240, py / SCALE - 240) > 240:
                            raise ValueError(f'Text outside round screen: {line!r}')
            pen.text((left, ink_top - bounds[1]), line, font=face, fill=fill)
            top += line_height
    return image.resize((width, height), Image.Resampling.LANCZOS)


caption = font('fonts/MeitarSans.ttf', 10)
canvas = tuple(round(((tokens['background'] >> shift) & 255) * 0.55) for shift in (16, 8, 0))
sheet = Image.new('RGB', (4 * 520, math.ceil(len(scenes) / 4) * 555), canvas)
pen = ImageDraw.Draw(sheet)
images = []
mask = Image.new('L', (480, 480))
ImageDraw.Draw(mask).ellipse((0, 0, 479, 479), fill=255)
for index, scene in enumerate(scenes):
    try:
        image = render(scene['commands'])
    except ValueError as error:
        raise ValueError(f"{scene['title']}: {error}") from error
    images.append(image)
    x, y = index % 4 * 520 + 20, index // 4 * 555 + 16
    sheet.paste(image, (x, y), mask)
    pen.text((x + 10, y + 492), scene['title'], font=caption, fill=color(tokens['muted']))
sheet.save(artifacts / f'watch-states-{version}.png')

hero = Image.new('RGB', (1600, 650), canvas)
pen = ImageDraw.Draw(hero)
pen.text((60, 35), 'MEITAR  /  440', font=font('fonts/MeitarSans.ttf', 14), fill=color(tokens['primary']))
pen.text((60, 80), 'Your next journey, at a glance.', font=font('fonts/MeitarSans.ttf', 18), fill=color(tokens['text']))
for index, scene_index in enumerate([0, 1, 4]):
    hero.paste(images[scene_index], (40 + index * 520, 150), mask)
hero.save(artifacts / f'design-preview-{version}.png')
card = render(json.loads((artifacts / 'card-layout.json').read_text(encoding='utf-8')), 440, 200, False)
card.save(artifacts / f'card-preview-{version}.png')

# Original vector-like icon, rendered with the same runtime palette.
icon = Image.new('RGB', (248, 248), color(tokens['background']))
pen = ImageDraw.Draw(icon)
pen.rounded_rectangle((60, 40, 188, 196), 32, fill=color(tokens['primary']))
pen.rounded_rectangle((72, 94, 176, 144), 12, fill=color(tokens['ink']))
pen.rounded_rectangle((72, 185, 90, 211), 6, fill=color(tokens['primary']))
pen.rounded_rectangle((158, 185, 176, 211), 6, fill=color(tokens['primary']))
pen.ellipse((77, 162, 95, 180), fill=color(tokens['ink']))
pen.ellipse((153, 162, 171, 180), fill=color(tokens['ink']))
pen.text((124, 67), '440', font=font('fonts/MeitarSans.ttf', 19), anchor='mm', fill=color(tokens['ink']))
icon.resize((124, 124), Image.Resampling.LANCZOS).save(root / 'assets/trex3/icon.png')
print(f'Rendered {len(scenes)} states and shortcut card with bundled fonts; text bounds passed.')
