# 从 WordNet 数据里为单词挑一句英文例句（无中文翻译，仅作例句补充）。
# 用法：python scripts\build-wordnet.py
# 依赖：WordNet 数据已在 %TEMP%\wm-assets\wordnet\ 下（wordnet-db 3.1.14 的 dict 目录）
import json
import os
import re

TMP = os.path.join(os.environ.get('TEMP', '.'), 'wm-assets')
WN = os.path.join(TMP, 'wordnet')
OUT = os.path.join(TMP, 'wordnet.json')
BOOKS = ['CET4_T', 'CET6_T', 'KaoYan_3_T', 'IELTS_3_T', 'TOEFL_3_T', 'GRE_3_T']


def load_vocab():
    vocab = set()
    for b in BOOKS:
        path = os.path.join(TMP, b + '.json')
        if not os.path.exists(path):
            continue
        with open(path, encoding='utf-8') as f:
            for entry in json.load(f):
                w = str(entry.get('name', '')).strip().lower()
                if w and re.fullmatch(r"[a-z][a-z'\-]*", w):
                    vocab.add(w)
    return vocab


def parse_data(path, best):
    """data.* 每行一个 synset；取 | 后面的引号例句。"""
    with open(path, encoding='utf-8', errors='replace') as f:
        for line in f:
            if not line or not line[0].isdigit() or len(line) < 40:
                continue
            head, sep, gloss = line.partition('|')
            if not sep:
                continue
            tokens = head.split()
            if len(tokens) < 5:
                continue
            try:
                offset = int(tokens[0])
                w_cnt = int(tokens[3])
            except ValueError:
                continue
            lemmas = []
            for raw in tokens[4:4 + w_cnt]:
                lemma = raw.split('%')[0].replace('_', ' ').lower()
                if lemma and ' ' not in lemma:
                    lemmas.append(lemma)
            examples = re.findall(r'"([^"]{10,180})"', gloss)
            if not examples:
                continue
            examples.sort(key=lambda s: len(s.split()))
            for lemma in lemmas:
                cur = best.get(lemma)
                if cur is None:
                    best[lemma] = (offset, examples[0])
            if offset is None:
                continue


def main():
    vocab = load_vocab()
    best = {}
    for f in ('data.noun', 'data.verb', 'data.adj', 'data.adv'):
        path = os.path.join(WN, f)
        if os.path.exists(path):
            parse_data(path, best)
    out = {}
    for w in vocab:
        hit = best.get(w)
        if not hit:
            continue
        offset, example = hit
        words = re.findall(r"[A-Za-z][A-Za-z'-]*", example)
        if not (4 <= len(words) <= 18):
            continue
        if not (example[0].isupper() and example[-1] in '.!?'):
            example = example.strip(' ;') + '.'
        out[w] = {'e': example}
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    print('wordnet_examples=%d / vocab=%d (%.1f%%) -> %s' % (len(out), len(vocab), len(out) * 100.0 / max(1, len(vocab)), OUT))


if __name__ == '__main__':
    main()
