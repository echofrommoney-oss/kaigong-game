# 組出遊戲用的 data/questions.json 與 data/topics.json。
# 步驟（在 tools/data 底下）：
#   1. python3 parse_pdf.py 12600.pdf 12600 work/12600.json （四科共同科目各跑一次，代碼 90006…90009）
#   2. python3 crop_figures.py 12600.pdf 12600 work/12600.json ../../img/q （有附圖的科目都跑）
#   3. python3 build_data.py stage1 work/12600.json work/90006.json … > 先產生 work/bank.json
#   4. python3 extract_notes.py work/bank.json 12600重點筆記.md 共同科目筆記.md work/notes.json
#   5. python3 build_data.py stage2 work/bank.json work/notes.json   → 寫入 ../../data/
# 標「(本題刪題)」的題目不收。每一題都要在筆記裡找到工法，否則會列出來並停止。
import json, sys, os
HERE = os.path.dirname(os.path.abspath(__file__)); DATA = os.path.join(HERE, '..', '..', 'data')
if sys.argv[1] == 'stage1':
    out = []
    for f in sys.argv[2:]:
        d = json.load(open(f)); code = os.path.basename(f).split('.')[0]
        for q in d['qs']:
            if '刪題' in q['text']: continue
            qid = f"{q['item']}-{q['n']}" if code == '12600' else f"{code}-{q['n']}"
            x = {'id': qid, 'c': q['item'] if code == '12600' else code, 's': q['stem'], 'o': [q['opts'][k] for k in '1234'], 'a': q['ans']}
            if q.get('img'): x['img'] = q['img']
            out.append(x)
    json.dump(out, sys.stdout, ensure_ascii=False)
elif sys.argv[1] == 'stage2':
    bank = json.load(open(sys.argv[2])); N = json.load(open(sys.argv[3]))
    miss = [q['id'] for q in bank if q['id'] not in N['expl']]
    if miss: sys.exit('這些題目在筆記裡找不到工法：' + ' '.join(miss))
    for q in bank:
        q['t'], q['x'] = N['expl'][q['id']]
        if q['id'] in N['flags']: q['f'] = N['flags'][q['id']]
    json.dump(bank, open(os.path.join(DATA, 'questions.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    topics = {k: {'code': v['code'], 'name': v['name'], 'rules': v['bullets']} for k, v in N['topics'].items()}
    json.dump(topics, open(os.path.join(DATA, 'topics.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    print(len(bank), 'questions,', len(topics), 'topics')
