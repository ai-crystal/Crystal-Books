# -*- coding: utf-8 -*-
"""盘点磁盘上的书稿与 spec / inventory 的差异。"""
import os, json, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from spec import SERIES

INV = json.load(open(os.path.join(HERE, "inventory.json"), encoding="utf-8"))
STUDY = r"E:\Study"


def key_for(path):
    rel = os.path.relpath(path, STUDY)
    return rel.replace("/", "\\")


def inv_pages(path, d):
    info = INV.get(key_for(path)) or INV.get(path) or INV.get(os.path.basename(path))
    if info:
        for b in info["books"]:
            if b["dir"] == d:
                return b.get("pages")
    return None


def book_dirs(s):
    if s.get("single"):
        bd = s["single"]["dir"]
        return [bd] if os.path.isdir(os.path.join(s["path"], bd)) else []
    bdir = os.path.join(s["path"], "books")
    if not os.path.isdir(bdir):
        return []
    return sorted([d for d in os.listdir(bdir) if os.path.isdir(os.path.join(bdir, d))])


for s in SERIES:
    spec_books = [s["single"]["dir"]] if s.get("single") else s.get("order", [])
    on_disk = book_dirs(s)
    missing = [b for b in spec_books if b not in on_disk]
    extra = [b for b in on_disk if b not in spec_books]
    if missing or extra:
        print("SERIES", s["name"], "missing", missing, "extra", extra)

print("--- inventory keys ---")
for k in sorted(INV):
    print(" ", k)

print("--- page counts ---")
for s in SERIES:
    for d in ([s["single"]["dir"]] if s.get("single") else s.get("order", [])):
        p = inv_pages(s["path"], d)
        print("%-24s %-28s %s" % (s["name"][:20], d, p))
