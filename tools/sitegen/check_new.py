# -*- coding: utf-8 -*-
"""报告磁盘上「有书稿但没进 spec」的系列和分册。

只认带有 book.json 或 chapters/ 的目录，build/code/common 这类工具目录不算。
新系列需要人工补 name/chip/subtitle/intro/theme/分类，所以这里只提示，不自动加。
"""
import os, sys, json

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from spec import SERIES

STUDY = r"E:\Study"


def looks_like_book(p):
    return os.path.exists(os.path.join(p, "book.json")) or os.path.isdir(os.path.join(p, "chapters"))


def main():
    known_paths = {os.path.normcase(os.path.abspath(s["path"])) for s in SERIES}
    problems = 0

    # 1. 新系列：E:\Study 下含 books/ 的目录，spec 里没有
    if os.path.isdir(STUDY):
        for name in sorted(os.listdir(STUDY)):
            p = os.path.join(STUDY, name)
            if not os.path.isdir(p) or not os.path.isdir(os.path.join(p, "books")):
                continue
            if os.path.normcase(os.path.abspath(p)) not in known_paths:
                print("[新系列] %s  —— 需要补 spec 条目与分类" % p)
                problems += 1

    # 2. 新分册 / 改名
    for s in SERIES:
        if s.get("single"):
            continue
        bdir = os.path.join(s["path"], "books")
        if not os.path.isdir(bdir):
            continue
        order = set(s.get("order") or [])
        extra = [d for d in sorted(os.listdir(bdir))
                 if os.path.isdir(os.path.join(bdir, d)) and d not in order
                 and looks_like_book(os.path.join(bdir, d))]
        missing = [d for d in (s.get("order") or []) if not os.path.isdir(os.path.join(bdir, d))]
        if extra:
            print("[新分册] %s：%s —— 需要补进 order/titles/ones" % (s["name"], ", ".join(extra)))
            problems += 1
        if missing:
            print("[目录缺失] %s：%s —— spec 里的目录在磁盘上不存在（可能改名）" % (s["name"], ", ".join(missing)))
            problems += 1

    return problems


if __name__ == "__main__":
    main()
    sys.exit(0)
