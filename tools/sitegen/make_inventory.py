# -*- coding: utf-8 -*-
"""扫描各系列书稿，重建 inventory.json（页数、章数、book.json 快照）。

页数来自 output/ 下已编译的 PDF；仅作为离线快照与兜底，
build_site.py 现场优先读 PDF，因此重编译后不必先跑这一步。
"""
import os, json, sys, glob

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from spec import SERIES

STUDY = r"E:\Study"
OUT = os.path.join(HERE, "inventory.json")


def chapter_files(bookdir):
    ch = os.path.join(bookdir, "chapters")
    if not os.path.isdir(ch):
        return []
    return [f for f in os.listdir(ch) if f.startswith("ch") and f.endswith(".md")]


def resolve_pdf(series_path, bj, d, s):
    pdf = (s.get("pdf_override") or {}).get(d) or bj.get("pdf")
    if not pdf and s.get("single"):
        pdf = s["single"].get("pdf")
    out = os.path.join(series_path, "output")
    def newest(files):
        files = [f for f in files if f.lower().endswith(".pdf")]
        return max(files, key=lambda f: os.path.getmtime(os.path.join(out, f))) if files else None

    if pdf:
        p = os.path.join(out, pdf)
        if os.path.exists(p):
            return pdf
        stem = os.path.splitext(pdf)[0]
        cand = glob.glob(os.path.join(out, stem + ".*"))
        if cand:
            return os.path.basename(cand[0])
    pick = newest([f for f in os.listdir(out) if d in os.path.basename(f)]) if os.path.isdir(out) else None
    return pick or pdf


def main():
    inv = {}
    for s in SERIES:
        path = s["path"]
        key = os.path.relpath(path, STUDY).replace("/", "\\")
        dirs = [s["single"]["dir"]] if s.get("single") else s.get("order", [])
        books = []
        for d in dirs:
            bookdir = os.path.join(path, d) if s.get("single") else os.path.join(path, "books", d)
            bj = {}
            pj = os.path.join(bookdir, "book.json")
            if os.path.exists(pj):
                try:
                    bj = json.load(open(pj, encoding="utf-8"))
                except Exception:
                    bj = {}
            pdf = resolve_pdf(path, bj, d, s)
            pages = None
            if pdf:
                pp = os.path.join(path, "output", pdf)
                if os.path.exists(pp):
                    try:
                        import pymupdf
                        with pymupdf.open(pp) as doc:
                            pages = doc.page_count
                    except Exception:
                        pages = None
            books.append({
                "dir": d,
                "bookjson": bj,
                "pdf": pdf,
                "pages": pages,
                "chapters": len(chapter_files(bookdir)),
                "has_readme": os.path.exists(os.path.join(bookdir, "README.md")),
            })
        inv[key] = {"path": path, "books": books}
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        json.dump(inv, f, ensure_ascii=False, indent=1)
    total = sum(b["pages"] or 0 for v in inv.values() for b in v["books"])
    print("inventory: %d 系列 / %d 册 / %d 页" % (
        len(inv), sum(len(v["books"]) for v in inv.values()), total))


if __name__ == "__main__":
    main()
