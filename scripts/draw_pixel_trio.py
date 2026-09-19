"""Second art study: three independently drawn animals, elevated side view.

Original integer-coordinate drawings, not traced or imported reference pixels.
48px transparent frames; 4 idle, 4 movement, 4 attack; feet baseline 44.
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / 'public/assets/animals'
INK = '#282c32'

def animal(name, frame):
    im = Image.new('RGBA', (48, 48))
    d = ImageDraw.Draw(im)
    phase = frame % 4
    walk = 4 <= frame < 8
    attack = frame >= 8
    blink = frame == 3
    lift = (0, -2, -3, -1)[phase] if walk and name == 'rabbit' else 0
    lean = (0, -1, 2, 1)[phase] if attack else 0
    crouch = 1 if attack and phase == 1 else 0
    def p(points, color, edge=INK):
        pts = [(x + lean, y + lift + crouch) for x, y in points]
        d.polygon(pts, fill=color)
        if edge:
            d.line(pts + [pts[0]], fill=edge, width=1)
    def r(x, y, w, h, color):
        d.rectangle((x + lean, y + lift + crouch, x + lean + w - 1, y + lift + crouch + h - 1), fill=color)
    def line(points, color):
        d.line([(x + lean, y + lift + crouch) for x, y in points], fill=color, width=1)
    def eye(x, y):
        r(x, y, 2, 1 if blink else 2, INK)
        if not blink:
            r(x, y, 1, 1, '#f0e9d2')

    if name == 'bear':
        shadow, base, warm, light = '#574139', '#805541', '#a5734c', '#be935e'
        # Far legs are partially obscured by the barrel-shaped torso.
        stride = (0, 2, 0, -2)[phase] if walk else 0
        p([(17, 31), (22, 31), (22 + stride, 42), (16 + stride, 42), (15, 39)], shadow)
        p([(32, 30), (36, 30), (36 - stride, 41), (31 - stride, 41)], shadow)
        p([(8, 27), (9, 22), (12, 18), (17, 16), (23, 16), (28, 18), (32, 22), (34, 28), (32, 35), (27, 39), (15, 39), (10, 36), (8, 32)], base)
        p([(10, 23), (13, 19), (18, 18), (23, 18), (27, 21), (24, 23), (19, 22), (15, 24)], warm, None)
        r(15, 19, 6, 1, light)
        r(12, 22, 3, 1, light)
        p([(8, 30), (11, 31), (12, 35), (18, 37), (27, 36), (30, 32), (33, 29), (32, 35), (27, 39), (15, 39), (10, 36)], shadow, None)
        # Small tail and thick near hind leg, articulated at hip and ankle.
        p([(8, 28), (6, 28), (5, 30), (6, 32), (9, 32)], shadow)
        p([(12, 32), (18, 32), (19, 37), (18 + stride, 42), (18 + stride, 44), (11 + stride, 44), (10 + stride, 42), (12, 38)], base)
        r(12 + stride, 42, 5, 1, warm)
        line([(12 + stride, 44), (13 + stride, 43)], '#b6a084')
        line([(15 + stride, 44), (16 + stride, 43)], '#b6a084')
        # Broad shoulder and round ears; head smaller than body.
        p([(25, 22), (25, 19), (28, 17), (32, 17), (35, 19), (38, 22), (38, 29), (35, 33), (30, 34), (26, 32), (23, 29)], warm)
        p([(25, 20), (24, 17), (25, 15), (28, 15), (30, 17), (29, 20)], base)
        r(26, 17, 2, 2, shadow)
        p([(34, 19), (35, 16), (38, 16), (39, 18), (38, 21)], base)
        r(36, 18, 2, 2, shadow)
        p([(28, 21), (31, 20), (35, 21), (36, 23), (32, 24), (28, 23)], light, None)
        p([(25, 25), (28, 27), (30, 32), (33, 33), (30, 34), (26, 32), (23, 29)], base, None)
        eye(30, 25)
        eye(36, 25)
        p([(33, 27), (37, 27), (40, 29), (40, 31), (37, 33), (33, 32), (31, 30)], '#c1a074')
        r(37, 28, 3, 2, INK)
        line([(36, 30), (36, 31), (38, 31)], shadow)
        # Paw swipe: shoulder winds back, wrist extends, then recovers.
        if attack and phase in (1, 2):
            endx, endy = (30, 28) if phase == 1 else (40, 33)
            p([(27, 29), (31, 28), (endx, endy - 2), (endx + 2, endy), (endx + 1, endy + 3), (endx - 3, endy + 3), (27, 34)], base)
            r(endx - 1, endy, 3, 2, warm)
            r(endx + 1, endy, 1, 1, '#dac2a0')
            r(endx, endy + 2, 1, 1, '#dac2a0')
        else:
            p([(26, 30), (31, 31), (33, 36), (32 - stride, 41), (34 - stride, 43), (33 - stride, 44), (27 - stride, 44), (25 - stride, 41), (27, 37)], base)
            r(27 - stride, 42, 5, 1, warm)
        # Curated fur clusters follow curvature rather than random noise.
        for x, y in [(11, 26), (15, 25), (20, 26), (18, 32), (22, 30), (28, 23)]:
            line([(x, y), (x + 1, y + 1), (x + 2, y)], warm)
        if frame == 2:
            r(23, 24, 2, 2, light)
    elif name == 'rabbit':
        shadow, base, white = '#9b9eaa', '#d3d4cf', '#f3eee0'
        # Hind quarters are larger than the head; tiny feet and tucked forepaws.
        p([(15, 36), (12, 35), (10, 36), (10, 39), (12, 41), (15, 40)], white)
        p([(15, 29), (18, 26), (23, 26), (27, 29), (29, 34), (28, 39), (24, 42), (17, 42), (14, 39), (13, 34)], base)
        p([(16, 29), (19, 27), (23, 27), (26, 30), (22, 31), (17, 33), (15, 33)], white, None)
        p([(14, 35), (17, 37), (22, 37), (27, 34), (28, 39), (24, 42), (17, 42), (14, 39)], shadow, None)
        # Curled haunch, elongated foot extends on the airborne hop pose.
        p([(18, 35), (22, 34), (25, 36), (25, 40), (22, 42), (18, 41), (16, 39)], base)
        extension = 3 if walk and phase == 2 else 0
        p([(19, 40), (25, 40), (27 + extension, 42), (27 + extension, 44), (18, 44), (17, 43)], white)
        r(20, 42, 5, 1, base)
        # Ears tilt separately; no rectangular antenna ears.
        bend = 2 if (walk and phase in (1, 2)) or (attack and phase == 1) else 0
        p([(24, 30), (21, 23), (20 - bend, 16), (21 - bend, 13), (23 - bend, 13), (25, 18), (27, 28)], base)
        p([(23, 24), (22 - bend, 18), (22 - bend, 15), (23 - bend, 17), (25, 25)], '#c4949c', None)
        p([(28, 28), (28, 21), (30 + bend, 15), (32 + bend, 15), (33 + bend, 17), (31, 25), (31, 31)], white)
        line([(31 + bend, 17), (30 + bend, 20), (30, 25)], '#d7a8ac')
        hx = 1 if attack and phase == 2 else 0
        p([(24 + hx, 28), (29 + hx, 27), (33 + hx, 29), (35 + hx, 33), (34 + hx, 37), (30 + hx, 39), (25 + hx, 38), (22 + hx, 35), (22 + hx, 31)], base)
        p([(25 + hx, 29), (29 + hx, 28), (32 + hx, 30), (30 + hx, 31), (25 + hx, 31)], white, None)
        p([(29 + hx, 34), (33 + hx, 33), (36 + hx, 35), (35 + hx, 37), (31 + hx, 38), (28 + hx, 37)], white, None)
        eye(30 + hx, 32)
        r(35 + hx, 34, 1, 1, '#ba798b')
        line([(34 + hx, 36), (35 + hx, 36)], '#75717f')
        r(28 + hx, 35, 1, 1, '#c6a8a6')
        # Two forepaws reach forward during the little jab.
        reach = 4 if attack and phase == 2 else (1 if walk and phase == 2 else 0)
        p([(27, 38), (29, 38), (31 + reach, 41), (31 + reach, 43), (28, 43), (26, 41)], base)
        p([(25, 38), (27, 38), (28 + reach, 41), (30 + reach, 42), (30 + reach, 44), (26 + reach, 44), (24, 41)], white)
        r(27 + reach, 42, 2, 1, base)
    elif name == 'wolf':
        shadow, base, light, cream = '#454c60', '#6e8190', '#a2b2b8', '#cbd1c8'
        stride = (0, 3, 0, -3)[phase] if walk else 0
        # Low tapered tail; four distinct legs, narrow belly, high withers.
        p([(12, 30), (8, 32), (5, 34), (3, 34), (4, 31), (7, 28), (12, 26)], base)
        p([(3, 34), (4, 31), (6, 30), (6, 33)], shadow, None)
        p([(16, 32), (20, 33), (18 + stride, 40), (20 + stride, 42), (19 + stride, 43), (15 + stride, 43), (14 + stride, 40)], shadow)
        p([(29, 30), (32, 30), (34 - stride, 41), (36 - stride, 42), (36 - stride, 43), (31 - stride, 43)], shadow)
        p([(10, 28), (12, 24), (17, 22), (24, 22), (28, 20), (31, 21), (33, 25), (33, 30), (30, 34), (25, 36), (19, 35), (15, 36), (11, 33)], base)
        p([(12, 25), (17, 23), (24, 23), (27, 22), (28, 24), (23, 26), (17, 25)], light, None)
        p([(11, 30), (16, 31), (20, 33), (26, 32), (31, 29), (30, 34), (25, 36), (19, 35), (15, 36), (11, 33)], shadow, None)
        p([(12, 31), (17, 31), (18, 36), (15 + stride, 40), (14 + stride, 42), (17 + stride, 43), (16 + stride, 44), (11 + stride, 44), (10 + stride, 41), (12, 37)], base)
        r(12 + stride, 42, 3, 1, light)
        p([(29, 29), (33, 29), (34, 35), (33 - stride, 41), (36 - stride, 42), (36 - stride, 44), (31 - stride, 44), (30 - stride, 42)], base)
        r(32 - stride, 42, 3, 1, cream)
        # Chest ruff overlaps shoulder; head looks down toward the ground plane.
        p([(29, 23), (32, 22), (35, 27), (33, 33), (31, 31), (30, 34), (28, 30), (27, 31), (27, 26)], cream)
        hy = 2 if attack and phase == 2 else (1 if attack and phase == 1 else 0)
        def head(points, color, edge=INK):
            p([(x, y + hy) for x, y in points], color, edge)
        head([(28, 23), (27, 18), (29, 15), (33, 14), (37, 16), (38, 20), (37, 25), (34, 28), (29, 27)], base)
        head([(28, 19), (27, 12), (28, 10), (31, 14), (32, 19)], shadow)
        head([(34, 17), (35, 11), (37, 13), (38, 18), (37, 21)], base)
        r(28, 13 + hy, 1, 3, '#a08c91')
        r(36, 14 + hy, 1, 2, '#a08c91')
        head([(30, 18), (32, 16), (35, 17), (35, 19), (32, 20)], light, None)
        head([(32, 22), (36, 21), (39, 23), (42, 24), (42, 26), (39, 28), (35, 28), (32, 26)], cream)
        eye(35, 20 + hy)
        r(41, 24 + hy, 2, 2, INK)
        line([(37, 26 + hy), (40, 26 + hy)], shadow)
        if attack and phase == 2:
            r(37, 27 + hy, 5, 2, INK)
            r(38, 27 + hy, 3, 1, '#f0e9d2')
            r(38, 28 + hy, 2, 1, '#b98089')
        for x, y in [(14, 27), (20, 27), (26, 25), (24, 30)]:
            line([(x, y), (x + 1, y + 1), (x + 2, y)], light)
        if frame == 2:
            r(28, 25, 1, 2, light)
    return im

def build():
    OUT.mkdir(parents=True, exist_ok=True)
    study = Image.new('RGBA', (48 * 5, 48 * 3), '#314535')
    animated = []
    for row, name in enumerate(('bear', 'rabbit', 'wolf')):
        sheet = Image.new('RGBA', (48 * 12, 48))
        for frame in range(12):
            sprite = animal(name, frame)
            assert sprite.getbbox() is not None
            # A transparent border guards against clipping during anticipation.
            bounds = sprite.getbbox()
            assert bounds[0] > 0 and bounds[1] > 0 and bounds[2] < 48 and bounds[3] < 48, (name, frame, bounds)
            sheet.paste(sprite, (frame * 48, 0))
        sheet.save(OUT / f'{name}-v2-sheet.png')
        animal(name, 0).save(OUT / f'{name}-v2.png')
        for column, frame in enumerate((0, 5, 6, 9, 10)):
            sprite = animal(name, frame)
            study.paste(sprite, (column * 48, row * 48), sprite)
    study.resize((960, 576), Image.Resampling.NEAREST).save(OUT.parent / 'pixel-trio-v2-preview.png')
    # Preview animation keeps each animal fixed to the same ground baseline.
    for frame in range(12):
        canvas = Image.new('RGBA', (48 * 3, 48), '#314535')
        for column, name in enumerate(('bear', 'rabbit', 'wolf')):
            sprite = animal(name, frame)
            canvas.paste(sprite, (column * 48, 0), sprite)
        animated.append(canvas.resize((576, 192), Image.Resampling.NEAREST).convert('RGB'))
    animated[0].save(OUT.parent / 'pixel-trio-v2-motion.gif', save_all=True, append_images=animated[1:], duration=[250] * 4 + [120] * 4 + [120] * 4, loop=0)
    print('Wrote Bear/Rabbit/Wolf v2 assets and review previews.')

if __name__ == '__main__':
    build()
