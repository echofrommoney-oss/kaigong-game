# 把有附圖的題目裁成圖片：從題號右邊開始裁（不露出答案），題號與答案括號塗白。
# 用法：python3 crop_figures.py 題庫.pdf 代碼 parse_pdf輸出.json 圖片資料夾
import pdfplumber, json, sys, re
from PIL import Image, ImageDraw
src, code, qj, outdir = sys.argv[1:5]
d = json.load(open(qj)); qs = d['qs']; pdf = pdfplumber.open(src)
starts = {}
for q in qs:
    for s in q['spans']: starts.setdefault(s[0], []).append(s[1])
for v in starts.values(): v.sort()
n = 0
for q in qs:
    if not q['imgs']: continue
    pages = sorted(set([s[0] for s in q['spans']] + [im[0] for im in q['imgs']])); tiles = []
    for pi in pages:
        p = pdf.pages[pi]; sp = [s for s in q['spans'] if s[0] == pi]
        top = sp[0][1] - 3 if sp else 40
        here = [im for im in q['imgs'] if im[0] == pi]
        nxt = [t for t in starts.get(pi, []) if t > top + 5]
        bottom = nxt[0] - 3 if nxt else p.height - 45
        if here: bottom = max(bottom, max(im[2] for im in here) + 3)
        if pi not in [s[0] for s in q['spans']] and not here: continue
        bb = (100, max(0, top), p.width - 30, min(p.height, bottom))
        im = p.crop(bb).to_image(resolution=130).original.convert('RGB'); dr = ImageDraw.Draw(im); k = 130 / 72
        for w in [w for w in p.extract_words() if w['x1'] > bb[0] and w['top'] < bb[3] and w['bottom'] > bb[1]]:
            if re.match(r'^\(\d+\)$', w['text']) or re.match(r'^\d+\.$', w['text']):
                dr.rectangle([(w['x0'] - bb[0] - 1) * k, (w['top'] - bb[1] - 1) * k, (w['x1'] - bb[0] + 1) * k, (w['bottom'] - bb[1] + 1) * k], fill='white')
        tiles.append(im)
    W = max(t.width for t in tiles); H = sum(t.height for t in tiles)
    canvas = Image.new('RGB', (W, H), 'white'); y = 0
    for t in tiles: canvas.paste(t, (0, y)); y += t.height
    qid = f"{q['item']}-{q['n']}" if code == '12600' else f"{code}-{q['n']}"
    canvas.save(f'{outdir}/{qid}.png', optimize=True); q['img'] = f'img/q/{qid}.png'; n += 1
json.dump(d, open(qj, 'w'), ensure_ascii=False, indent=0)
print(code, n, 'figures')
