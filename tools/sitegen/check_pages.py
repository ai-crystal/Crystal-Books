# -*- coding: utf-8 -*-
"""对比 build 里各册页数与 inventory 快照，找出不一致。"""
import os, json, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_site as b
import gen

series, tb, tp = b.build_data()
inv = json.load(open(os.path.join(HERE, "inventory.json"), encoding="utf-8"))

def inv_pages(path, d):
    key = os.path.relpath(path, r"E:\Study").replace("/", "\\")
    info = inv.get(key)
    if info:
        for x in info["books"]:
            if x["dir"] == d:
                return x.get("pages")
    return None

tot = 0
for s in gen.SERIES:
    for d in ([s["single"]["dir"]] if s.get("single") else s.get("order", [])):
        bi = gen.book_info(s, d)
        p = bi["pages"]
        i = inv_pages(s["path"], d)
        tot += p or 0
        if p != i:
            print("%-20s %-28s build=%-5s inv=%-5s pdf=%s" % (s["name"][:18], d, p, i, bi["pdf"]))
print("build total", tp, "sum", tot)
