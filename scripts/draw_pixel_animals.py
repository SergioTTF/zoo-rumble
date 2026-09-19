"""Original Zoo Rumble pixel art. Pillow is needed only to rebuild assets.

32px canvases, integer coordinates, no antialiasing or source image tracing.
Frames 0–3: idle; 4–7: walk; 8–11: attack. Facing right.
"""
from pathlib import Path
from PIL import Image, ImageDraw
from draw_pixel_trio import build as build_trio

OUT = Path(__file__).resolve().parents[1] / 'public/assets/animals'
INK = '#302b38'
CREAM = '#f3e5bc'
PALE = '#fff5db'
PALETTES = {
    'bear': ('#805346', '#ac7755', '#d6a76c'),
    'rabbit': ('#bbaaa0', '#eadcc2', '#fff1d4'),
    'wolf': ('#5f6479', '#9097a4', '#bec5c6'),
    'dog': ('#ad7547', '#dca95e', '#f3d28c'),
    'fox': ('#ad4d38', '#e88445', '#f3b765'),
    'hyena': ('#78604c', '#b49363', '#dac18b'),
    'chicken': ('#bdaaa0', '#e7ddbf', '#fff1d4'),
    'penguin': ('#3c4053', '#575b70', '#7c8293'),
    'eagle': ('#655049', '#9c7855', '#caa16c'),
    'monkey': ('#775148', '#ae7952', '#d3a16c'),
    'baboon': ('#685653', '#9a7d65', '#c3a582'),
    'gorilla': ('#3f3e51', '#646074', '#8b8293'),
    'jackal': ('#8d684a', '#c19a63', '#e6c38a'),
    'parrot': ('#a34348', '#dd6355', '#f89969'),
    'owl': ('#7f6253', '#b39769', '#dcc291'),
    'chimpanzee': ('#46424c', '#75615b', '#9e8070'),
}

def draw_animal(name, frame):
    im = Image.new('RGBA', (32, 32))
    d = ImageDraw.Draw(im)
    dark, mid, light = PALETTES[name]
    attack = frame >= 8
    phase = frame % 4
    walking = 4 <= frame < 8
    # Different authored poses, not scaled or rotated copies of a bitmap.
    lean = (0, -1, 1, 0)[phase] if attack else 0
    bob = -1 if (walking and phase in (1, 3)) else 0
    if not walking and not attack and phase == 2:
        bob = -1
    def poly(points, color, outline=INK):
        pts = [(x + lean, y + bob) for x, y in points]
        d.polygon(pts, fill=color)
        if outline:
            d.line(pts + [pts[0]], fill=outline, width=1)
    def box(x0, y0, x1, y1, color):
        d.rectangle((x0 + lean, y0 + bob, x1 + lean, y1 + bob), fill=color)
    def eye(x, y):
        if frame == 3:
            box(x, y + 1, x + 2, y + 1, INK)
        else:
            box(x, y, x + 1, y + 2, INK)
            box(x, y, x, y, PALE)

    if name in ('bear', 'wolf', 'dog', 'fox', 'hyena', 'jackal', 'rabbit'):
        rabbit = name == 'rabbit'
        if name == 'fox':
            poly([(9, 22), (3, 22), (1, 17), (2, 12), (5, 14), (5, 18), (10, 18)], mid)
            poly([(1, 17), (2, 12), (5, 14), (5, 16), (3, 18)], CREAM)
        elif name in ('wolf', 'jackal', 'dog', 'hyena'):
            poly([(9, 22), (4, 20), (2, 15), (4, 14), (6, 18), (11, 19)], dark)
        elif rabbit:
            poly([(6, 23), (3, 21), (3, 18), (6, 17), (9, 19)], CREAM)
        # Feet alternate fore/aft on walk and crouch before striking.
        stride = (0, 2, 0, -2)[phase] if walking else 0
        poly([(9, 22), (13, 22), (13 + stride, 28), (8 + stride, 28)], dark)
        poly([(19, 22), (23, 22), (24 - stride, 28), (19 - stride, 28)], dark)
        poly([(7, 16), (11, 12), (20, 13), (24, 18), (23, 25), (8, 25), (6, 22)], mid)
        box(9, 15, 17, 17, light)
        box(9 + stride, 26, 12 + stride, 27, mid)
        box(20 - stride, 26, 23 - stride, 27, mid)
        if rabbit:
            poly([(16, 13), (13, 7), (13, 1), (16, 1), (19, 12)], mid)
            poly([(21, 12), (21, 2), (24, 1), (25, 4), (24, 14)], light)
            box(14, 3, 15, 7, '#d99b9c')
            box(22, 3, 23, 8, '#d99b9c')
            poly([(16, 11), (24, 10), (28, 14), (27, 20), (23, 23), (16, 22), (13, 18)], mid)
            box(18, 12, 23, 13, light)
        else:
            poly([(15, 8), (18, 6), (25, 7), (28, 11), (27, 18), (22, 21), (15, 19), (13, 14)], mid)
            if name in ('wolf', 'fox', 'jackal'):
                poly([(14, 11), (14, 3), (18, 5), (20, 10)], dark)
                poly([(22, 9), (25, 3), (27, 5), (27, 12)], dark)
                box(15, 6, 16, 8, '#ca9290')
                box(25, 6, 25, 8, '#ca9290')
            elif name == 'dog':
                poly([(14, 8), (17, 9), (17, 17), (13, 16), (12, 11)], dark)
            else:
                poly([(14, 10), (13, 6), (15, 4), (18, 5), (19, 10)], dark)
                poly([(23, 9), (24, 5), (27, 5), (28, 7), (27, 11)], dark)
            box(19, 9, 23, 10, light)
        # Cream chin and long canine muzzle, brown bear snout.
        muzzle = light if name == 'bear' else CREAM
        poly([(23, 15), (28, 15), (30, 17), (29, 20), (24, 21), (21, 19)], muzzle)
        eye(24, 12 if not rabbit else 14)
        box(28, 16, 29, 17, INK)
        box(25, 19, 27, 19, INK)
        if attack and phase == 2:
            box(25, 19, 29, 21, INK)
            box(26, 19, 28, 19, PALE)
            box(26, 21, 28, 21, '#d98489')
        if name == 'hyena':
            for x, y in [(9, 18), (13, 21), (17, 18), (20, 23)]:
                box(x, y, x + 1, y + 1, dark)
            poly([(10, 15), (11, 10), (13, 13), (15, 9), (17, 13)], dark)
    elif name in ('monkey', 'baboon', 'gorilla', 'chimpanzee'):
        big = name == 'gorilla'
        if name == 'monkey':
            poly([(9, 23), (4, 23), (2, 20), (2, 15), (4, 12), (7, 12), (8, 15), (7, 17), (5, 17), (5, 15), (4, 16), (4, 20), (9, 20)], mid)
        stride = (0, 1, 0, -1)[phase] if walking else 0
        poly([(10, 20), (16, 21), (15 + stride, 28), (9 + stride, 28)], dark)
        poly([(20, 21), (24, 21), (26 - stride, 28), (20 - stride, 28)], dark)
        poly([(9 if big else 12, 13), (22, 13), (26, 19), (24, 25), (11, 25), (7 if big else 10, 20)], mid)
        box(13, 16, 21, 21, dark)
        poly([(12, 15), (9, 17), (7, 24), (10, 26), (13, 22), (15, 17)], dark)
        reach = 3 if attack and phase == 2 else 0
        poly([(22, 15), (26, 17), (27 + reach, 23 - reach), (24 + reach, 25 - reach), (21, 20)], mid)
        box(24 + reach, 22 - reach, 26 + reach, 24 - reach, light)
        poly([(13, 6), (17, 3), (24, 4), (28, 8), (27, 15), (23, 18), (15, 16), (12, 12)], mid)
        poly([(16, 8), (19, 7), (21, 9), (24, 7), (27, 9), (26, 15), (21, 17), (16, 14)], light if not big else '#a8a0a0')
        box(13, 8, 14, 11, dark)
        eye(24, 9)
        box(22, 13, 25, 13, INK)
        if name == 'baboon':
            box(21, 12, 27, 15, '#6091ac')
            box(24, 11, 25, 16, '#d75d63')
            box(22, 16, 27, 16, INK)
        if big:
            box(17, 7, 26, 8, dark)
        if attack and phase == 2:
            box(22, 14, 26, 16, INK)
            box(23, 14, 25, 14, PALE)
    else:
        # Birds: authored wing silhouettes and species-specific face/chest.
        stride = (0, 1, 0, -1)[phase] if walking else 0
        for x in (12, 21):
            box(x + stride, 25, x + stride + 1, 28, '#d99a50')
            box(x + stride - 1, 28, x + stride + 3, 28, INK)
            stride = -stride
        poly([(8, 15), (11, 11), (21, 10), (26, 16), (25, 23), (21, 27), (12, 26), (8, 22)], mid)
        if name in ('penguin', 'owl'):
            poly([(14, 16), (22, 15), (24, 21), (21, 25), (14, 25), (12, 21)], CREAM)
        wing_up = (walking and phase in (1, 3)) or (attack and phase in (1, 2))
        wing = '#59926c' if name == 'parrot' else dark
        if wing_up:
            poly([(12, 17), (5, 10), (2, 11), (4, 15), (8, 21), (13, 22)], wing)
        else:
            poly([(11, 16), (15, 18), (14, 24), (9, 23), (7, 19)], wing)
            box(10, 18, 11, 21, light if name != 'parrot' else '#91bf79')
        head = CREAM if name == 'eagle' else mid
        poly([(15, 6), (20, 4), (25, 6), (28, 10), (26, 17), (20, 19), (15, 15), (13, 10)], head)
        if name == 'owl':
            poly([(14, 9), (13, 3), (17, 6), (22, 6), (26, 3), (27, 10)], mid)
            poly([(16, 9), (20, 8), (22, 10), (24, 8), (27, 10), (25, 15), (20, 17), (16, 14)], CREAM)
            eye(18, 10)
        elif name == 'chicken':
            poly([(17, 6), (17, 2), (19, 2), (20, 4), (22, 1), (24, 2), (25, 7)], '#cc5359')
            box(26, 16, 27, 19, '#cc5359')
            poly([(10, 22), (5, 21), (4, 14), (7, 16), (9, 14), (12, 19)], CREAM)
        elif name == 'penguin':
            poly([(21, 8), (25, 8), (27, 11), (26, 16), (22, 17), (20, 13)], CREAM)
        elif name == 'parrot':
            box(22, 8, 26, 13, CREAM)
            poly([(11, 24), (9, 29), (12, 30), (15, 24)], '#5c8dab')
        eye(24, 10)
        poly([(27, 12), (30, 13), (29, 15), (26, 15)], '#e5ad58')
        if name == 'eagle':
            box(22, 8, 26, 9, INK)
        if attack and phase == 2:
            box(28, 15, 30, 16, INK)
    return im

OUT.mkdir(parents=True, exist_ok=True)
preview = Image.new('RGBA', (32 * 4, 40 * 4), '#23382f')
for index, name in enumerate(PALETTES):
    sheet = Image.new('RGBA', (32 * 12, 32))
    for frame in range(12):
        sheet.paste(draw_animal(name, frame), (frame * 32, 0))
    sheet.save(OUT / f'{name}-sheet.png')
    draw_animal(name, 0).save(OUT / f'{name}.png')
    preview.paste(draw_animal(name, 0), ((index % 4) * 32, (index // 4) * 40), draw_animal(name, 0))
preview.resize((512, 640), Image.Resampling.NEAREST).save(OUT.parent / 'pixel-roster-preview.png')
print('Wrote 16 original portraits and 12-frame sprite sheets.')
build_trio()
