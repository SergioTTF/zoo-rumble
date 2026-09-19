"""Prepare preserved source sheets for runtime without repainting the artwork.

Pillow authoring dependency only. Fixed per-animal scaling, nearest-neighbor,
transparent padding, centered feet baseline. Sources stay unchanged.
"""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / 'public/assets/art-studies'
OUT = ROOT / 'public/assets/animals/directional'
SIZES = {'bear':116, 'rabbit':80, 'wolf':108, 'dog':100, 'fox':100,
         'hyena':108, 'chicken':80, 'penguin':88, 'eagle':96, 'monkey':92,
         'baboon':104, 'gorilla':116, 'jackal':100, 'parrot':96,
         'owl':88, 'chimpanzee':104}
FRAME = 128
FOOT = 120

def prepare():
    OUT.mkdir(parents=True, exist_ok=True)
    gallery = Image.new('RGBA', (4*160, 4*152), '#223c32')
    label = ImageDraw.Draw(gallery)
    report = {}
    layouts = {}
    for index, (name, target) in enumerate(SIZES.items()):
        suffix = 'user' if name in ('bear', 'rabbit') else 'v1'
        source = Image.open(SOURCES / f'{name}-directional-{suffix}.png').convert('RGBA')
        frames = []
        for row in range(4):
            for col in range(4):
                cell = source.crop((round(col*source.width/4), round(row*source.height/4),
                                    round((col+1)*source.width/4), round((row+1)*source.height/4)))
                visible = cell.getchannel('A').point(lambda a: 255 if a > 32 else 0)
                bounds = visible.getbbox()
                if not bounds:
                    raise ValueError(f'Empty frame: {name} {row} {col}')
                frames.append(cell.crop(bounds))
        # User Bunny sheet's third left-facing slot contains a front view.
        # Mirror its third right-facing walk pose instead; leave source intact.
        if name == 'rabbit':
            frames[2] = ImageOps.mirror(frames[14])
        scale = target / max(max(f.width, f.height) for f in frames)
        sheet = Image.new('RGBA', (FRAME*4, FRAME*4))
        prepared = []
        for slot, raw in enumerate(frames):
            sprite = raw.resize((max(1,round(raw.width*scale)), max(1,round(raw.height*scale))), Image.Resampling.NEAREST)
            tile = Image.new('RGBA', (FRAME, FRAME))
            tile.paste(sprite, ((FRAME-sprite.width)//2, FOOT-sprite.height))
            bounds = tile.getbbox()
            assert bounds and bounds[0] > 0 and bounds[1] > 0 and bounds[2] < FRAME and bounds[3] == FOOT, (name,slot,bounds)
            sheet.paste(tile, ((slot%4)*FRAME, (slot//4)*FRAME))
            prepared.append(tile)
        sheet.save(OUT/f'{name}-sheet.png', optimize=True)
        prepared[12].save(OUT/f'{name}.png', optimize=True)
        star_ys = {}
        for row, facing in enumerate(('left', 'front', 'rear', 'right')):
            height = max(FOOT - f.getbbox()[1] for f in prepared[row*4:(row+1)*4])
            star_ys[facing] = -round(height * 96 / FRAME) - 10
        layouts[name] = {'frameSize':FRAME, 'foot':FOOT, 'starY':star_ys['right'], 'starYs':star_ys}
        gallery.paste(prepared[12], ((index%4)*160+16, (index//4)*152), prepared[12])
        label.text(((index%4)*160+16, (index//4)*152+130), name.upper(), fill='#e8dbac')
        report[name] = {'source': f'{name}-directional-{suffix}.png', 'frames':16, 'frameSize':FRAME, 'footOrigin':FOOT, 'targetPixels':target, 'scale':round(scale,5), 'runtimeBytes':(OUT/f'{name}-sheet.png').stat().st_size}
    gallery.save(SOURCES/'roster-runtime-preview.png')
    (SOURCES/'preparation-report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    (ROOT/'src/game/animalArtMetadata.json').write_text(json.dumps(layouts,indent=2)+'\n',encoding='utf-8')
    print(f'Prepared {len(report)} animals / {len(report)*16} frames; '+str(sum(r['runtimeBytes'] for r in report.values()))+' sheet bytes.')

if __name__ == '__main__':
    prepare()
