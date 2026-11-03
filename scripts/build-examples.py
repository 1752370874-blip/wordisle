# 从 Tatoeba 英文/中文句子与配对链接里，为词库里的每个词挑一句例句 + 中文翻译。
# 用法（Windows PowerShell）：python scripts\build-examples.py
# 依赖：Tatoeba 数据已解压到 %TEMP%\wm-assets\tatoeba\
import json
import os
import re
import sys
import zipfile

TMP = os.path.join(os.environ.get('TEMP', '.'), 'wm-assets')
TAT = os.path.join(TMP, 'tatoeba')
BOOKS = ['CET4_T', 'CET6_T', 'KaoYan_3_T', 'IELTS_3_T', 'TOEFL_3_T', 'GRE_3_T']

SUFFIXES = ['ing', 'ed', 'ies', 'es', 'er', 'est', 'ly', 's', 'd']


def load_vocab():
    vocab = set()
    for b in BOOKS:
        path = os.path.join(TMP, b + '.json')
        if not os.path.exists(path):
            continue
        with open(path, encoding='utf-8') as f:
            for entry in json.load(f):
                w = str(entry.get('name', '')).strip().lower()
                if w and re.fullmatch(r"[a-z][a-z' \-]*", w):
                    vocab.add(w)
    return vocab


def match_word(tok, vocab):
    if tok in vocab:
        return tok
    if tok.endswith('ies') and len(tok) > 4:
        cand = tok[:-3] + 'y'
        if cand in vocab:
            return cand
    for suf in ('ing', 'ed', 'es', 'er', 'est', 'ly', 's', 'd'):
        if tok.endswith(suf):
            stem = tok[:-len(suf)]
            if len(stem) >= 2 and stem in vocab:
                return stem
            if suf in ('ing', 'ed') and stem + 'e' in vocab:
                return stem + 'e'
            if suf in ('ing', 'ed') and len(stem) > 1 and stem[-1] == stem[-2] and stem[:-1] in vocab:
                return stem[:-1]
    return None


def good_sentence(text):
    if not text or len(text) > 170:
        return None
    if re.search(r'\d|https?:|www\.|\||\{|\[', text):
        return None
    if not (text[0].isupper() and text[-1] in '.!?'):
        return None
    words = re.findall(r"[A-Za-z][A-Za-z'-]*", text)
    if not (5 <= len(words) <= 16):
        return None
    return words


def hits_of(words, vocab):
    found = {}
    for w in words:
        low = w.lower()
        if len(low) < 3:
            continue
        m = match_word(low, vocab)
        if m and m not in found:
            found[m] = (0 if low == m else 1)
    return found


def main():
    vocab = load_vocab()
    print('vocab=%d' % len(vocab))

    cmn = {}
    with open(os.path.join(TAT, 'cmn_sentences.tsv'), encoding='utf-8') as f:
        for line in f:
            parts = line.rstrip('\n').split('\t', 2)
            if len(parts) < 3:
                continue
            sid, lang, text = parts
            if lang != 'cmn':
                continue
            try:
                sid = int(sid)
            except ValueError:
                continue
            if 2 <= len(text) <= 150:
                cmn[sid] = text
    print('cn_sentences=%d' % len(cmn))

    # 英文句子：每个词最多保留 3 个最佳候选
    cand = {}
    n_lines = 0
    with open(os.path.join(TAT, 'eng_sentences.tsv'), encoding='utf-8') as f:
        for line in f:
            n_lines += 1
            parts = line.rstrip('\n').split('\t', 2)
            if len(parts) < 3 or parts[1] != 'eng':
                continue
            try:
                sid = int(parts[0])
            except ValueError:
                continue
            text = parts[2]
            words = good_sentence(text)
            if not words:
                continue
            hits = hits_of(words, vocab)
            if not hits:
                continue
            n = len(words)
            for w, penalty in hits.items():
                score = (penalty, n)
                bucket = cand.setdefault(w, [])
                if len(bucket) < 3:
                    bucket.append((score, sid, text))
                    bucket.sort(key=lambda x: x[0])
                elif score < bucket[-1][0]:
                    bucket[-1] = (score, sid, text)
                    bucket.sort(key=lambda x: x[0])
    print('eng_lines=%d words_with_candidates=%d' % (n_lines, len(cand)))

    # 配对：eng id -> cmn id
    links_path = os.path.join(TAT, 'links.tsv')
    if not os.path.exists(links_path):
        links_path = os.path.join(TAT, 'eng-cmn_links.tsv')
    eng2cn = {}
    with open(links_path, encoding='utf-8') as f:
        for line in f:
            parts = line.rstrip('\n').split('\t')
            if len(parts) != 2:
                continue
            try:
                a, b = int(parts[0]), int(parts[1])
            except ValueError:
                continue
            a_cn, b_cn = a in cmn, b in cmn
            if a_cn and not b_cn:
                eng2cn[b] = a
            elif b_cn and not a_cn:
                eng2cn[a] = b

    out = {}
    eng_only = {}
    for w, bucket in cand.items():
        # 英文例句兜底：即使没有中文配对也保留
        if bucket:
            eng_only[w] = {'e': bucket[0][2], 'n': len(re.findall(r"[A-Za-z][A-Za-z'-]*", bucket[0][2]))}
        for score, sid, text in bucket:
            cn_id = eng2cn.get(sid)
            if cn_id and cn_id in cmn:
                out[w] = {'e': text, 't': cmn[cn_id], 'n': len(re.findall(r"[A-Za-z][A-Za-z'-]*", text))}
                break
    print('tatoeba_pairs_resolved=%d english_only=%d' % (len(out), len(eng_only)))

    # manythings 的 Tatoeba 衍生句对（已人工对齐，优先保留更短的）
    combined = dict(out)
    zip_path = os.path.join(TMP, 'cmn-eng.zip')
    if os.path.exists(zip_path):
        try:
            with zipfile.ZipFile(zip_path) as z:
                names = [n for n in z.namelist() if n.endswith('.txt')]
                if names:
                    added = 0
                    with z.open(names[0]) as fh:
                        for raw in fh:
                            try:
                                line = raw.decode('utf-8')
                            except UnicodeDecodeError:
                                continue
                            parts = line.rstrip('\n').split('\t')
                            if len(parts) < 2:
                                continue
                            eng, cn = parts[0].strip(), parts[1].strip()
                            if not eng or not cn or len(cn) > 150:
                                continue
                            words = good_sentence(eng)
                            if not words:
                                continue
                            n = len(words)
                            hits = hits_of(words, vocab)
                            for w in hits:
                                cur = combined.get(w)
                                if cur is None or n < cur['n']:
                                    combined[w] = {'e': eng, 't': cn, 'n': n}
                                    added += 1
                    print('manythings_added=%d' % added)
        except zipfile.BadZipFile:
            print('manythings zip 损坏，跳过', file=sys.stderr)

    out_path = os.path.join(TMP, 'examples.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(combined, f, ensure_ascii=False, separators=(',', ':'))
    eng_path = os.path.join(TMP, 'english-examples.json')
    with open(eng_path, 'w', encoding='utf-8') as f:
        json.dump(eng_only, f, ensure_ascii=False, separators=(',', ':'))
    covered = len(combined)
    print('bilingual=%d / vocab=%d (%.1f%%) -> %s' % (covered, len(vocab), covered * 100.0 / max(1, len(vocab)), out_path))
    print('english_only=%d / vocab=%d (%.1f%%) -> %s' % (len(eng_only), len(vocab), len(eng_only) * 100.0 / max(1, len(vocab)), eng_path))


if __name__ == '__main__':
    main()
