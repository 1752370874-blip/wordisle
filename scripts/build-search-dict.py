# 构建本地查词词典：ECDICT 77 万条 → 高频 6.5 万条（含音标/词性/中文释义，复用词库例句）
import csv
import json
import os
import re

csv.field_size_limit(10 ** 9)
D = os.environ['WM_DICT']
OUT = os.environ['WM_OUT']
DECK = json.load(open(os.environ['WM_DECK'], encoding='utf-8'))

POS_MAP = {
    'n': 'n.', 'v': 'v.', 'adj': 'adj.', 'adv': 'adv.', 'prep': 'prep.', 'pron': 'pron.',
    'conj': 'conj.', 'det': 'det.', 'num': 'num.', 'int': 'int.', 'aux': 'aux.', 'art': 'art.',
    'vt': 'v.', 'vi': 'v.', 'a': 'adj.', 'ad': 'adv.', 'prep': 'prep.', 'abbr': 'abbr.'
}


def clean_trans(trans):
    if not trans:
        return ''
    lines = [x.strip() for x in trans.replace('\\n', '\n').split('\n')]
    out = []
    for x in lines:
        if not x:
            continue
        if x.startswith('[') or '网络' in x or 'www' in x.lower():
            continue
        if x in out:
            continue
        out.append(x)
    s = '；'.join(out)
    s = re.sub(r'\s+', ' ', s)
    return s[:150].strip('； ')


def clean_pos(pos):
    if not pos:
        return ''
    # ECDICT 的 pos 形如 "n:100/v:50" 或 "n"
    part = re.split(r'[:/]', pos.strip())[0].strip().lower()
    return POS_MAP.get(part, '')


def word_ok(w):
    if not (2 <= len(w) <= 32):
        return False
    if w != w.lower():
        return False
    if not re.fullmatch(r"[a-z][a-z' \-]*", w):
        return False
    if len(w.split()) > 2:
        return False
    return True


rows = []
seen = set()
with open(os.path.join(D, 'ecdict.csv'), encoding='utf-8') as f:
    for row in csv.DictReader(f):
        w = (row.get('word') or '').strip()
        if not word_ok(w):
            continue
        key = w.lower()
        if key in seen:
            continue
        m = clean_trans(row.get('translation'))
        if not m:
            continue
        seen.add(key)
        collins = int(row.get('collins') or 0)
        oxford = 1 if row.get('oxford') == '1' else 0
        bnc = int(row.get('bnc') or 0) or 10 ** 9
        frq = int(row.get('frq') or 0) or 10 ** 9
        rows.append((w, m, clean_pos(row.get('pos')), (row.get('phonetic') or '').strip(), collins, oxford, bnc, frq))

# 频率优先：柯林斯星级 → 牛津词表 → BNC → 词频 → 词长
rows.sort(key=lambda r: (-r[4], -r[5], r[6], r[7], len(r[0])))
TARGET = 65000
rows = rows[:TARGET]

data = []
for w, m, pos, ph, collins, oxford, bnc, frq in rows:
    info = DECK.get(w.lower()) or {}
    data.append({
        'w': w,
        'p': info.get('p', ''),
        'pos': pos,
        'm': m,
        'e': info.get('e', ''),
        't': info.get('t', ''),
        'ph': ph
    })

# 按字母序输出，便于浏览和二分查找
data.sort(key=lambda x: x['w'])
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))

print('rows', len(data), 'with_example', sum(1 for x in data if x['e']))
print('bytes', os.path.getsize(OUT))
