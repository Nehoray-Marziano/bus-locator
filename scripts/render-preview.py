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
        if item.get('visible') is False:
            continue
        x, y, w, h = (item[k] * SCALE for k in ['x', 'y', 'w', 'h'])
        fill = color(item.get('color', 0))
        if item['type'] == 'CANVAS':
            for polygon in item.get('polygons', []):
                points = [(x + point['x'] * SCALE, y + point['y'] * SCALE) for point in polygon['data_array']]
                pen.polygon(points, fill=color(polygon['color']))
            continue
        if item['type'] == 'ARC':
            pen.arc((x, y, x + w, y + h), item['start_angle'], item['end_angle'], fill=fill, width=round(item.get('line_width', 1) * SCALE))
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
canvas = tuple(round(((tokens['surface'] >> shift) & 255) * 0.55) for shift in (16, 8, 0))
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
sheet.save(artifacts / f'watch-icons-states-{version}.png')

button_sheet = Image.new('RGB', (1200, 190), canvas)
button_pen = ImageDraw.Draw(button_sheet)
for index, state in enumerate(json.loads((artifacts / 'refresh-button-states.json').read_text(encoding='utf-8'))):
    button = render(state['commands']).crop((148, 398, 332, 456))
    button_sheet.paste(button.resize((368, 116), Image.Resampling.NEAREST), (index * 400 + 16, 52))
    button_pen.text((index * 400 + 16, 15), state['title'], font=caption, fill=color(tokens['text']))
button_sheet.save(artifacts / f'refresh-button-preview-{version}.png')

hero = Image.new('RGB', (1600, 650), canvas)
pen = ImageDraw.Draw(hero)
pen.text((60, 35), 'MEITAR  /  440', font=font('fonts/MeitarSans.ttf', 14), fill=color(tokens['primary']))
pen.text((60, 80), 'Your next journey, at a glance.', font=font('fonts/MeitarSans.ttf', 18), fill=color(tokens['text']))
for index, scene_index in enumerate([0, 14, 15]):
    hero.paste(images[scene_index], (40 + index * 520, 150), mask)
hero.save(artifacts / f'design-icons-preview-{version}.png')
card = render(json.loads((artifacts / 'card-layout.json').read_text(encoding='utf-8')), 480, 264, False)
card.save(artifacts / f'card-icons-preview-{version}.png')
before_path = artifacts / 'design-icons-preview-0.6.2.png'
before_card_path = artifacts / 'card-icons-preview-0.6.2.png'
if before_path.exists() and before_card_path.exists():
    comparison = Image.new('RGB', (1080, 920), canvas)
    comparison_pen = ImageDraw.Draw(comparison)
    before = Image.open(before_path).crop((40, 150, 520, 630))
    before_card = Image.open(before_card_path)
    for x, label, watch, shortcut in [
        (30, 'Previous', before, before_card),
        (570, 'Larger and simpler', images[0], card),
    ]:
        comparison_pen.text((x + 22, 26), label, font=font('fonts/MeitarSans.ttf', 14), fill=color(tokens['text']))
        comparison.paste(watch, (x, 90), mask)
        comparison.paste(shortcut, (x, 610))
    comparison.save(artifacts / f'ui-before-after-{version}.png')
cards = json.loads((artifacts / 'card-scenes.json').read_text(encoding='utf-8'))
card_sheet = Image.new('RGB', (4 * 500, math.ceil(len(cards) / 4) * 324), canvas)
card_pen = ImageDraw.Draw(card_sheet)
for index, scene in enumerate(cards):
    bounds = scene['bounds']
    try:
        card = render(scene['commands'], bounds['w'] + 2 * bounds['margin'], bounds['h'], False)
    except ValueError as error:
        raise ValueError(f"{scene['title']}: {error}") from error
    x, y = index % 4 * 500 + 10, index // 4 * 324 + 10
    card_sheet.paste(card, (x, y))
    card_pen.text((x + 10, y + bounds['h'] + 10), scene['title'], font=caption, fill=color(tokens['muted']))
card_sheet.save(artifacts / f'card-icons-states-{version}.png')

next_service = Image.new('RGB', (1080, 930), canvas)
next_pen = ImageDraw.Draw(next_service)
for x, title, watch_index, card_index in [(30, 'Tomorrow / synthetic timetable', 16, 14), (570, 'Next service day / synthetic timetable', 17, 15)]:
    next_pen.text((x + 12, 24), title, font=caption, fill=color(tokens['text']))
    next_service.paste(images[watch_index], (x, 80), mask)
    next_card = cards[card_index]
    bounds = next_card['bounds']
    next_service.paste(render(next_card['commands'], 480, bounds['h'], False), (x, 610))
next_service.save(artifacts / f'next-service-preview-{version}.png')

# Check actual-size raster connectivity, rather than only overlapping widget
# bounding boxes. A separated arrowhead must fail even if its boxes intersect.
icon_sheet = Image.new('RGB', (600, 310), canvas)
icon_pen = ImageDraw.Draw(icon_sheet)
for index, sample in enumerate(json.loads((artifacts / 'refresh-icons.json').read_text(encoding='utf-8'))):
    size = sample['size']
    tile = render([{'type': 'FILL_RECT', 'x': 0, 'y': 0, 'w': size, 'h': size, 'color': tokens['primary']}, *sample['commands']], size, size, False)
    remaining = {(x, y) for y in range(size) for x in range(size) if max(tile.getpixel((x, y))) < 100}
    components = 0
    while remaining:
        components += 1
        stack = [remaining.pop()]
        while stack:
            px, py = stack.pop()
            neighbors = {(px + dx, py + dy) for dx in [-1, 0, 1] for dy in [-1, 0, 1]} & remaining
            remaining.difference_update(neighbors)
            stack.extend(neighbors)
    assert components == 1, f'Refresh icon has {components} disconnected parts at {size}px'
    left = index * 300 + 30
    icon_pen.text((left, 18), f'{size}px / enlarged', font=font('fonts/MeitarSans.ttf', 10), fill=color(tokens['text']))
    icon_sheet.paste(tile.resize((176, 176), Image.Resampling.NEAREST), (left, 72))
    icon_sheet.paste(tile, (left + 208, 140))
icon_sheet.save(artifacts / f'refresh-icon-preview-{version}.png')

# Original vector-like icon, rendered with the same runtime palette.
icon = Image.new('RGBA', (248, 248), (0, 0, 0, 0))
pen = ImageDraw.Draw(icon)
pen.rounded_rectangle((60, 40, 188, 196), 32, fill=color(tokens['primary']))
pen.rounded_rectangle((72, 94, 176, 144), 12, fill=color(tokens['ink']))
pen.rounded_rectangle((72, 185, 90, 211), 6, fill=color(tokens['primary']))
pen.rounded_rectangle((158, 185, 176, 211), 6, fill=color(tokens['primary']))
pen.ellipse((77, 162, 95, 180), fill=color(tokens['ink']))
pen.ellipse((153, 162, 171, 180), fill=color(tokens['ink']))
pen.text((124, 67), '440', font=font('fonts/MeitarSans.ttf', 19), anchor='mm', fill=color(tokens['ink']))
icon = icon.resize((124, 124), Image.Resampling.LANCZOS)
assert icon.mode == 'RGBA'
assert all(icon.getpixel(point)[3] == 0 for point in [(0, 0), (123, 0), (0, 123), (123, 123)])
assert icon.getpixel((62, 62))[3] == 255
icon.save(root / 'assets/trex3/icon.png')
print(f'Rendered {len(scenes)} watch states and {len(cards)} cards with bundled fonts; text bounds passed.')
