"""Normalize generated action poses without repainting; preserve all source files."""
from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/assets/art-studies/actions-v1'
OUT = ROOT / 'public/assets/animals/animated-v1'
FRAME, FOOT = 128, 120

def prepare():
    OUT.mkdir(parents=True, exist_ok=True)
    report = {}
    preview = Image.new('RGBA', (16*128, 16*140), '#223c32')
    labels = ImageDraw.Draw(preview)
    names = list(json.loads((ROOT/'src/game/animalArtMetadata.json').read_text(encoding='utf-8')))
    for index, name in enumerate(names):
        raw = Image.open(SOURCE/f'{name}-actions-v1.png').convert('RGBA')
        if abs(raw.height/raw.width - 3) > .05:
            raise ValueError(f'{name}: expected 4x12 cell layout, got {raw.size}')
        assert raw.getchannel('A').getextrema()[0] == 0, f'{name}: missing transparent alpha'
        walk = Image.open(ROOT/f'public/assets/animals/directional/{name}-sheet.png').convert('RGBA')
        # Generated rows have uneven spacing. Find the transparent gutters rather
        # than assuming the generator obeyed an exact vertical cell pitch.
        alpha = raw.getchannel('A')
        bands = []
        for y in range(raw.height):
            occupied = sum(value > 100 for value in alpha.crop((0,y,raw.width,y+1)).get_flattened_data()) > 25
            if occupied:
                if not bands or y-bands[-1][1] > 8: bands.append([y,y])
                else: bands[-1][1] = y
        expected = 11 if name in ('monkey', 'gorilla') else 12
        assert len(bands) == expected, (name, len(bands))
        edges = [0] + [(bands[i-1][1]+bands[i][0])//2 for i in range(1,len(bands))] + [raw.height]
        poses = []
        for row in range(12):
            for col in range(4):
                if row == len(bands):
                    poses.append(poses[(row-1)*4+col].copy())
                    continue
                cell = raw.crop((round(col*raw.width/4), edges[row], round((col+1)*raw.width/4), edges[row+1]))
                bounds = cell.getchannel('A').point(lambda a: 255 if a > 32 else 0).getbbox()
                if not bounds: raise ValueError(f'{name}: empty cell {row},{col}')
                image = cell.crop(bounds)
                # Normalize isolated reversed side poses in the generated originals.
                if (name == 'rabbit' and 4 <= row < 8 and col in (0, 3)) or (name in ('rabbit', 'chicken', 'monkey') and row < 4 and col == 3) or (name in ('eagle', 'owl') and row == 6 and col == 3):
                    image = image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
                poses.append(image)
        old = walk.crop((0, 0, FRAME, FRAME)).getbbox()
        initial = poses[0]
        scale = min((old[2]-old[0])/initial.width, (old[3]-old[1])/initial.height,
                    118/max(max(p.width,p.height) for p in poses))
        sheet = Image.new('RGBA',(FRAME*4,FRAME*16))
        sheet.paste(walk, (0,0))
        for action in range(3):
            for direction in range(4):
                for pose in range(4):
                    image = poses[(action*4+pose)*4+direction]
                    image = image.resize((max(1,round(image.width*scale)),max(1,round(image.height*scale))),Image.Resampling.NEAREST)
                    tile = Image.new('RGBA',(FRAME,FRAME))
                    tile.paste(image,((FRAME-image.width)//2,FOOT-image.height))
                    bounds = tile.getbbox()
                    assert bounds and bounds[0]>0 and bounds[1]>0 and bounds[2]<FRAME and bounds[3]==FOOT,(name,action,direction,pose,bounds)
                    sheet.paste(tile,(pose*FRAME,(4+action*4+direction)*FRAME))
        sheet.save(OUT/f'{name}-sheet.png',optimize=True)
        # Four poses per action, right facing, plus the four walking poses.
        for column, slot in enumerate([12,13,14,15,28,29,30,31,44,45,46,47,60,61,62,63]):
            tile = sheet.crop(((slot%4)*FRAME,(slot//4)*FRAME,(slot%4+1)*FRAME,(slot//4+1)*FRAME))
            preview.paste(tile,(column*FRAME,index*140),tile)
        labels.text((4,index*140+128),name.upper(),fill='#e8dbac')
        assert sheet.crop((0,0,512,512)).tobytes() == walk.tobytes(), f'{name}: walking frames changed'
        report[name] = {'sourceSize':raw.size,'sourceRows':len(bands),'frames':64,'scale':round(scale,5),'bytes':(OUT/f'{name}-sheet.png').stat().st_size}
    preview.save(SOURCE/'animation-review.png')
    (SOURCE/'preparation-report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(f'Prepared {len(report)} animals / {len(report)*64} frames.')

if __name__ == '__main__': prepare()
