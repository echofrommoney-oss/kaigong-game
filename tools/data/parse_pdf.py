# 把技能檢定中心的學科題庫 PDF 轉成 JSON（題號、答案、題幹、選項、附圖位置）。
# 用法：python3 parse_pdf.py 題庫.pdf 代碼 輸出.json
#   代碼：12600 或 90006、90007、90008、90009（用來辨認「工作項目」標題）
import pdfplumber, re, json, sys
src, code = sys.argv[1], sys.argv[2]
pdf = pdfplumber.open(src)
qre = re.compile(r'^(\d+)\.\s*\(([\d]+)\)\s*(.*)$')
wre = re.compile(r'工作項目\s*(\d+)\s*[：:]\s*(.+)$')
items=[]; cur=None; qs=[]; q=None
for pi,p in enumerate(pdf.pages):
    lines = p.extract_text_lines(layout=False, strip=True)
    starts=[]
    for ln in lines:
        t=ln['text'].strip()
        if re.match(r'^Page \d+ of \d+$',t): continue
        m=wre.search(t)
        if m and code in t:
            cur={'no':m.group(1),'name':m.group(2).strip()}; items.append(cur); continue
        m=qre.match(t)
        if m:
            q={'item':cur['no'] if cur else None,'n':int(m.group(1)),'ans':m.group(2),'text':m.group(3),'page':pi,'top':ln['top'],'imgs':[], 'spans':[[pi,ln['top'],None]]}
            qs.append(q); continue
        if q is None: continue
        if q['spans'][-1][0]!=pi:
            q['spans'][-1][2]=None
            q['spans'].append([pi,ln['top'],None])
        q['text']+=t
    # images
    for im in [x for x in p.images if not (x['width']>150 and x['height']>150)]:
        cy=(im['top']+im['bottom'])/2
        # find owning question: last q with span on this page and start top <= im bottom+2
        owner=None
        for qq in qs:
            for s in qq['spans']:
                if s[0]==pi and s[1]<=im['bottom']+2: owner=qq
        if owner is None:
            # belongs to last question of previous pages
            prev=[qq for qq in qs if qq['spans'][0][0]<pi]
            owner=prev[-1] if prev else None
        if owner: owner['imgs'].append([pi,im['top'],im['bottom']])
for q in qs:
    t=re.sub(r'\s+',' ',q['text']).strip()
    q['text']=t
    parts=re.split(r'([①②③④])',t)
    q['stem']=parts[0].strip()
    opts={}
    for i in range(1,len(parts)-1,2):
        opts[str('①②③④'.index(parts[i])+1)]=parts[i+1].strip()
    tail=''
    last=max(opts) if opts else None
    if last:
        v=opts[last]
        if ' ' in v:
            a,b=v.rsplit(' ',1)
            if b and b[-1] in '。？?．' : v, tail = a.strip(), b
        v=v.rstrip('。').strip(); opts[last]=v
    tail=tail.strip()
    if tail and tail not in ('。','？','?'):
        q['stem']=q['stem']+' ＿＿ '+tail
    q['opts']=opts
json.dump({'items':items,'qs':qs},open(sys.argv[3],'w'),ensure_ascii=False,indent=0)
from collections import Counter
print(len(qs), Counter(q['item'] for q in qs), 'with imgs', sum(1 for q in qs if q['imgs']), 'imgs', sum(len(q['imgs']) for q in qs))
bad=[q['n'] for q in qs if len(q['opts'])!=4]
print('bad opts', len(bad), bad[:30])
print('multi', sum(1 for q in qs if len(q['ans'])>1))
# numbering check
prev=None
for q in qs:
    if prev and q['item']==prev['item'] and q['n']!=prev['n']+1: print('gap', prev['item'], prev['n'], q['n'])
    prev=q
