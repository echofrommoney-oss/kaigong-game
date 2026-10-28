import re,json,sys
# 從知識庫筆記抽出「工法」：每個重點小節是一個主題，每條重點（含表格列）是一條工法，後面的 [題號] 指到題庫。
# 用法：python3 extract_notes.py 題庫.json（build_data 的中間檔，只用來檢查題號） 12600重點筆記.md 共同科目筆記.md 輸出.json
import sys
QJ, IRM, CSQ, OUT = sys.argv[1:5]
Q = {q['id']: q for q in json.load(open(QJ))}
def ids_in(txt):
    out=[]
    for m in re.finditer(r'\[([^\]]*\d[^\]]*)\]',txt):
        pre=None
        for part in re.split(r'[、,，\s]+',m.group(1)):
            mm=re.match(r'^(\d\d|900\d\d)-(\d+)$',part)
            if mm: pre=mm.group(1); out.append(f'{pre}-{int(mm.group(2))}')
            elif re.match(r'^\d+$',part) and pre: out.append(f'{pre}-{int(part)}')
    return [i for i in out if i in Q]
def strip_ids(s): return re.sub(r'（\s+','（',re.sub(r'\s*\[[^\]]*\d[^\]]*\]','',s)).replace('**','').replace('`','').strip(' ；;')
def parse(md,start,end,isc,T,E):
    L=open(md).read().split('\n'); i0=next(i for i,l in enumerate(L) if l.startswith(start)); i1=next(i for i,l in enumerate(L) if l.startswith(end) and i>i0)
    item=None; key=None; hdr=None
    for l in L[i0:i1]:
        if l.startswith('### '): item=l[4:].strip(); key=None; continue
        if l.startswith('#### '):
            h=l[5:].strip(); hdr=None
            if '容易混淆' in h or '可能過時' in h: key=None; continue
            code=(re.match(r'(900\d\d)',item).group(1) if isc else re.search(r'工作項目 (\d\d)',item).group(1))
            name=re.sub(r'^[一二三四五六七]、','',h); key=code+'/'+name
            T[key]={'code':code,'name':name,'bullets':[]}; continue
        if not key: continue
        if re.match(r'^\s{2,}(\d+\.|-)\s',l) and T[key]['bullets']:
            sub=strip_ids(re.sub(r'^\s+(\d+\.|-)\s','',l)); b=T[key]['bullets'][-1]
            b[0]=b[0].rstrip('：:')+('：' if not b[0].endswith('→') and '：' not in b[0][-12:] and not getattr(parse,'_cont',False) else ' → ')+sub
            parse._cont=True
            for i in ids_in(l):
                if i not in b[1]: b[1].append(i)
            continue
        parse._cont=False
        if l.startswith('- '):
            ids=ids_in(l); txt=strip_ids(l[2:])
        elif l.startswith('|'):
            cells=[c.strip() for c in l.strip().strip('|').split('|')]
            if set(''.join(cells))<=set('-: '): continue
            if not ids_in(l): hdr=cells; continue
            ids=ids_in(l); vals=[strip_ids(c) for c in cells]
            pairs=[(hdr[k] if hdr and k<len(hdr) else '',v) for k,v in enumerate(vals) if v and not (hdr and k<len(hdr) and hdr[k] in('題號','題目'))]
            txt='；'.join((f'{a}：{b}' if a else b) for a,b in pairs)
        else: continue
        if not ids: continue
        T[key]['bullets'].append([txt,ids])
        for i in ids: E.setdefault(i,[key,txt])
T={};E={}
parse(IRM,'### 工作項目 01','## 怎麼用',False,T,E)
parse(CSQ,'### 90006 職業安全衛生','### 題庫：90006',True,T,E)
miss=[k for k in Q if k not in E]
print(len(T),len(E),'missing',len(miss),miss[:20])
fl={}
for md,s,e in [(IRM,'### 工作項目 01','## 怎麼用'),(CSQ,'### 90006 職業安全衛生','### 題庫：90006')]:
    L=open(md).read().split('\n'); i0=next(i for i,l in enumerate(L) if l.startswith(s)); i1=next(i for i,l in enumerate(L) if l.startswith(e) and i>i0); on=False
    for l in L[i0:i1]:
        if l.startswith('### '): on=False
        if l.startswith('#### '): on='可能過時' in l; continue
        if on and (l.startswith('- ') or l.startswith('|')):
            for i in ids_in(l): fl.setdefault(i,strip_ids(l.lstrip('- ').replace('|',' ')).strip())
for tk in T.values():
    for b in tk['bullets']:
        if '→' in b[0] and '：' not in b[0].split(' → ')[0]: b[0]=b[0].replace(' → ','：',1)
        b[1]=list(dict.fromkeys(b[1]))
E={}
for key,tk in T.items():
    for txt,ids in tk['bullets']:
        for i in ids: E.setdefault(i,[key,txt])
json.dump({'topics':T,'expl':E,'flags':fl},open(OUT,'w'),ensure_ascii=False)
print('topics',len(T),'flags',len(fl))
