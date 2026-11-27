# -*- coding: utf-8 -*-
"""比较 spec/site_copy 的文案与各册 book.json 的标题、副标题。"""
import os, json, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from spec import SERIES
from site_copy import INTROS, SUBTITLES, ONES


def bookjson(s, d):
    bookdir = os.path.join(s["path"], d) if s.get("single") else os.path.join(s["path"], "books", d)
    p = os.path.join(bookdir, "book.json")
    if os.path.exists(p):
        try:
            return json.load(open(p, encoding="utf-8"))
        except Exception:
            return {}
    return {}


for s in SERIES:
    name = s["name"]
    if name in SUBTITLES and SUBTITLES[name] != s.get("subtitle"):
        print("[系列副标题] %s\n  spec: %s\n  copy: %s" % (name, s.get("subtitle"), SUBTITLES[name]))
    for d in (["single"] if s.get("single") else s.get("order", [])):
        if d == "single":
            continue
        bj = bookjson(s, d)
        if not bj:
            continue
        t_spec = (s.get("titles") or {}).get(d)
        t_bj = bj.get("title")
        if t_bj and t_spec and t_bj.split("（")[0] != t_spec:
            print("[书名] %s / %s   spec=%s  book.json=%s" % (name, d, t_spec, t_bj))
        o_spec = (s.get("ones") or {}).get(d)
        o_copy = ONES.get((name, d))
        o_bj = bj.get("subtitle")
        if o_bj and o_spec and o_bj != o_spec:
            print("[一句话] %s / %s\n  spec=%s\n  book=%s" % (name, d, o_spec, o_bj))
        if o_copy and o_bj and o_copy != o_bj:
            print("[一句话·copy] %s / %s\n  copy=%s\n  book=%s" % (name, d, o_copy, o_bj))
