# -*- coding: utf-8 -*-
"""对照：spec 里的每册 → book.json / output PDF / 实际页数 vs inventory 页数。"""
import os, json, sys, glob

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from spec import SERIES
import pymupdf

INV = json.load(open(os.path.join(HERE, "inventory.json"), encoding="utf-8"))
STUDY = r"E:\Study"


def key_for(path):
    return os.path.relpath(path, STUDY).replace("/", "\\")


def inv_pages(path, d):
    info = INV.get(key_for(path)) or INV.get(path) or INV.get(os.path.basename(path))
    if info:
        for b in info["books"]:
            if b["dir"] == d:
                return b.get("pages")
    return None


def pdf_of(series_path, bj, d, s):
    pdf = s.get("pdf_override", {}).get(d) or bj.get("pdf")
    if not pdf and s.get("single"):
        pdf = s["single"].get("pdf")
    out = os.path.join(series_path, "output")
    if pdf:
        p = os.path.join(out, pdf)
        if os.path.exists(p):
            return p
        stem = os.path.splitext(pdf)[0]
        cand = glob.glob(os.path.join(out, stem + ".*"))
        if cand:
            return cand[0]
    # 兜底：output 里名字像这一册的
    for f in glob.glob(os.path.join(out, "*.pdf")):
        if d in os.path.basename(f):
            return f
    return None


for s in SERIES:
    path = s["path"]
    dirs = [s["single"]["dir"]] if s.get("single") else s.get("order", [])
    for d in dirs:
        bookdir = os.path.join(path, d) if s.get("single") else os.path.join(path, "books", d)
        bj = {}
        pj = os.path.join(bookdir, "book.json")
        if os.path.exists(pj):
            try:
                bj = json.load(open(pj, encoding="utf-8"))
            except Exception as e:
                print("BADJSON", pj, e)
        title = (s.get("titles") or {}).get(d) or bj.get("title") or d
        p = pdf_of(path, bj, d, s)
        pages = None
        if p:
            try:
                with pymupdf.open(p) as doc:
                    pages = doc.page_count
            except Exception as e:
                print("PDFERR", p, e)
        old = inv_pages(path, d)
        flag = ""
        if not os.path.isdir(bookdir):
            flag = " [目录缺失]"
        elif pages is None:
            flag = " [无PDF]"
        elif old is None:
            flag = " [新]"
        elif old != pages:
            flag = " [页数变化 %s→%s]" % (old, pages)
        print("%-12s %-30s %-4s %s%s" % (s["name"][:11], d, pages, os.path.basename(p or "-"), flag))
