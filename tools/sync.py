# -*- coding: utf-8 -*-
"""把各书仓库的最新书目同步进 Crystal-Books 首页（index.html 里的 window.BOOK_DATA）。

数据来源（每个系列仓库的根 README）：
    分册表 `| 册 | 书名 | 一句话 | 页数 | 在线阅读 | PDF |`
    → 书名 / 一句话 / 页数 / 章节目录 slug，页数合计重新累加。

章节数取自 `books/<slug>/structure.json` 的 chapter 条数，
没有 structure.json 时退化为数 `books/<slug>/chapters/*.md`。

用法：
    python tools/sync.py             # 同步并写回 index.html
    python tools/sync.py --dry-run   # 只打印差异
    python tools/sync.py --no-live   # 不检查线上站点（默认会探测 site 是否 200）

站点里新增系列（BOOK_DATA 里还没有的本地仓库）只报告，不自动加 —— 那些需要人工写
name/chip/subtitle/intro/theme。
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
STUDY = Path(r"E:\Study")

# 站点里的系列名 → (本地仓库相对 E:\Study 的路径, 站点地址, GitHub 仓库)
SERIES = {
    "从语言模型到智能体": ("AIAgent技术", "https://ai-crystal.github.io/AI-Agent-Learning/", "https://github.com/ai-crystal/AI-Agent-Learning"),
    "AI 推理部署与量化技术": ("AI量化与部署技术", "https://ai-crystal.github.io/AI-Quantification-Deployment/", "https://github.com/ai-crystal/AI-Quantification-Deployment"),
    "HDR 技术系列": ("HDR技术", "https://ai-crystal.github.io/HDR-Learning/", "https://github.com/ai-crystal/HDR-Learning"),
    "状态空间模型": ("Mamba技术", "https://ai-crystal.github.io/Mamba/", "https://github.com/ai-crystal/Mamba"),
    "专业级渲染技术": ("专业级渲染技术", "https://ai-crystal.github.io/Rendering-Technique/", "https://github.com/ai-crystal/Rendering-Technique"),
    "世界模型技术": ("世界模型技术/world-models", "https://ai-crystal.github.io/World-Models/", ""),
    "同一张世界的地图": ("世界知识模型JEPA", "https://ai-crystal.github.io/world-map-jepa/", "https://github.com/ai-crystal/world-map-jepa"),
    "具身智能技术": ("具身智能技术/Embodied-AI", "https://ai-crystal.github.io/Embodied-AI/", "https://github.com/ai-crystal/Embodied-AI"),
    "远程之门": ("后端服务器技术", "https://ai-crystal.github.io/Remote-operation-technology/", "https://github.com/ai-crystal/Remote-operation-technology"),
    "图像生成与编辑技术": ("图像生成与编辑技术", "https://ai-crystal.github.io/Image-Video-Generation-Editing/", "https://github.com/ai-crystal/Image-Video-Generation-Editing"),
    "大型软件开发技术": ("大型软件开发技术", "https://ai-crystal.github.io/Large-scale-software-Introduction/", "https://github.com/ai-crystal/Large-scale-software-Introduction"),
    "大规模 GPU 集群训练技术": ("大规模GPU集群训练技术", "https://ai-crystal.github.io/GPU-Cluster-Training/", "https://github.com/ai-crystal/GPU-Cluster-Training"),
    "大模型技术全景": ("大语言模型技术/llm-book", "https://ai-crystal.github.io/LLM/", "https://github.com/ai-crystal/LLM"),
    "强化学习系列": ("强化学习技术", "https://ai-crystal.github.io/Reinforcement-Learning/", "https://github.com/ai-crystal/Reinforcement-Learning"),
    "物理模拟技术": ("计算机物理模拟技术/physics-sim", "https://ai-crystal.github.io/Physics-Simulation/", "https://github.com/ai-crystal/Physics-Simulation"),
    "量子技术": ("量子学技术", "", ""),
    "黑客技术与安全原理": ("黑客技术", "https://ai-crystal.github.io/Hacker-Techniques/", "https://github.com/ai-crystal/Hacker-Techniques"),
    "人体参数化技术": ("人体参数化技术/人体参数化技术学习", "https://ai-crystal.github.io/Human-body-Param/", "https://github.com/ai-crystal/Human-body-Param"),
    "光的语言": ("摄影学技术", "https://dezeming.github.io/photography-book/", ""),
    "黑箱之内": ("深度学习的可解释性研究", "", ""),
    "测试时训练技术": ("深度学习的测试时训练技术", "https://dezeming.github.io/test-time-training/", "https://github.com/Dezeming/test-time-training"),
}

SEP_RE = re.compile(r"^[-:\s]+$")
LINK_RE = re.compile(r"\[([^\]]*)\]\(([^)]*)\)")
SLUG_RE = re.compile(r"books/([A-Za-z0-9._\-]+)/")
PAGES_RE = re.compile(r"(\d[\d,]*)\s*页?")


def parse_readme(readme: Path) -> list[dict]:
    """从系列 README 的分册表里抽 [册序号, 书名, 一句话, 页数, slug]。"""
    rows: list[dict] = []
    text = readme.read_text(encoding="utf-8", errors="replace")
    for line in text.splitlines():
        s = line.strip()
        if not s.startswith("|"):
            continue
        cells = [c.strip() for c in s.strip("|").split("|")]
        if len(cells) < 5:
            continue
        if SEP_RE.match(cells[0]) or cells[0] in ("册", "序号", "No.", "卷"):
            continue

        pages = None
        pages_col = -1
        for i in (3, 4):
            m = PAGES_RE.fullmatch(cells[i].replace(" ", ""))
            if m:
                pages = int(m.group(1).replace(",", ""))
                pages_col = i
                break
        if pages is None:
            continue

        title = LINK_RE.sub(r"\1", cells[1]).strip()
        one = cells[2].strip()
        slug = ""
        for c in cells[pages_col:]:
            m = SLUG_RE.search(c)
            if m:
                slug = m.group(1)
                break
        if not slug or not title:
            continue
        rows.append({"title": title, "one": one, "pages": pages, "slug": slug, "no": cells[0]})
    return rows


def pdf_pages(repo: Path, slug: str) -> int | None:
    """以构建出的 PDF 实际页数为准；README 里的数字是手写的，常落后。"""
    try:
        import pymupdf
    except Exception:
        return None
    out = repo / "output"
    bj = repo / "books" / slug / "book.json"
    name = ""
    if bj.exists():
        try:
            name = json.loads(bj.read_text(encoding="utf-8")).get("pdf", "") or ""
        except Exception:
            pass
    pdf = out / name if name else None
    if not pdf or not pdf.exists():
        if out.is_dir():
            key = slug.replace("-", "").lower()
            pdf = next((c for c in sorted(out.glob("*.pdf"))
                        if key in c.name.replace("-", "").lower()), None)
    if not pdf or not pdf.exists():
        return None
    try:
        return pymupdf.open(pdf).page_count
    except Exception:
        return None


def count_chapters(repo: Path, slug: str) -> int:
    st = repo / "books" / slug / "structure.json"
    if st.exists():
        try:
            data = json.loads(st.read_text(encoding="utf-8"))
            body = data.get("body") or []
            # 只看正文：structure.json 里后记/封底有时也被标成 chapter
            n = sum(1 for x in body
                    if isinstance(x, dict) and x.get("type") == "chapter"
                    and str(x.get("file", "")).startswith("chapters/"))
            if n:
                return n
        except Exception:
            pass
    ch = repo / "books" / slug / "chapters"
    if ch.is_dir():
        return len(list(ch.glob("*.md")))
    return 0


_LIVE_CACHE: dict[str, bool] = {}


def is_live(url: str, attempts: int = 3) -> bool:
    """探测线上站点是否 200。即使有一次失败也不要随便把系列改成“待发布”，重试几次。"""
    if not url:
        return False
    if url in _LIVE_CACHE:
        return _LIVE_CACHE[url]
    ok = False
    for i in range(attempts):
        try:
            req = urllib.request.Request(url, method="GET",
                                         headers={"User-Agent": "crystal-books-sync",
                                                  "Cache-Control": "no-cache"})
            with urllib.request.urlopen(req, timeout=20) as r:
                ok = r.status == 200
                if ok:
                    break
        except Exception:
            ok = False
        time.sleep(3)
    _LIVE_CACHE[url] = ok
    return ok


def load_book_data(html: str) -> tuple[list[dict], int, int]:
    key = "window.BOOK_DATA = "
    start = html.index(key) + len(key)
    data, end = json.JSONDecoder().raw_decode(html[start:])
    return data, start, start + end


def fmt_pages(n: int) -> str:
    return f"{n}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="只打印差异，不写文件")
    ap.add_argument("--no-live", action="store_true", help="不探测线上站点是否可访问")
    ap.add_argument("--no-pdf", action="store_true", help="不读 PDF 页数，只信 README 里的数字")
    ap.add_argument("--study", default=str(STUDY), help="书仓库根目录")
    args = ap.parse_args()
    study = Path(args.study)

    html = INDEX.read_text(encoding="utf-8")
    data, dstart, dend = load_book_data(html)

    known = set(SERIES)
    changes: list[str] = []
    warnings: list[str] = []

    for series in data:
        name = series.get("name", "")
        if name not in SERIES:
            warnings.append(f"[站点独有] {name}")
            continue
        rel, site, repo_url = SERIES[name]
        repo = study / rel
        readme = repo / "README.md"
        if not readme.exists():
            warnings.append(f"[缺仓库] {name} → {repo}")
            continue

        rows = parse_readme(readme)
        if not rows:
            warnings.append(f"[解析不到分册表] {name} → {readme}")
            continue

        available = series.get("available", False)
        if site and not args.no_live:
            live = is_live(site)
            if live != bool(available):
                changes.append(f"{name}: 可用性 {available} → {live}")
                available = live
        elif not site:
            available = False

        old_books = {b.get("url"): b for b in series.get("books", []) if b.get("url")}
        old_by_title = {b.get("title"): b for b in series.get("books", [])}
        old_titles = [b.get("title") for b in series.get("books", [])]
        new_titles = [r["title"] for r in rows]

        books = []
        for r in rows:
            url = f"{site}#/books/{r['slug']}/README" if available and site else ""
            prev = old_by_title.get(r["title"]) or (old_books.get(url) if url else None) or {}
            chapters = count_chapters(repo, r["slug"]) or prev.get("chapters", 0)
            real = None if args.no_pdf else pdf_pages(repo, r["slug"])
            if real and real != r["pages"]:
                warnings.append(f"[README 页数落后] {name} / {r['title']}: README={r['pages']} PDF={real}")
            books.append({
                "title": r["title"],
                # 已有册的“一句话”是站内编辑过的文案（对齐 book.json 的 subtitle），不拿 README 覆盖
                "one": prev.get("one") or r["one"],
                "pages": real or r["pages"],
                "chapters": chapters,
                "url": url,
                "available": available,
            })

        total = sum(b["pages"] for b in books)
        old_total = series.get("pages", 0)
        if total != old_total:
            changes.append(f"{name}: 总页数 {old_total} → {total}")
        if new_titles != old_titles:
            added = [t for t in new_titles if t not in old_titles]
            removed = [t for t in old_titles if t not in new_titles]
            if added:
                changes.append(f"{name}: 新增册 {added}")
            if removed:
                changes.append(f"{name}: 移除册 {removed}")
            if not added and not removed:
                changes.append(f"{name}: 分册顺序/名称调整")

        for ob, nb in zip(series.get("books", []), books):
            if ob.get("pages") != nb["pages"]:
                changes.append(f"  · {name} / {nb['title']}: 页数 {ob.get('pages')} → {nb['pages']}")
            if ob.get("chapters") != nb["chapters"]:
                changes.append(f"  · {name} / {nb['title']}: 章数 {ob.get('chapters')} → {nb['chapters']}")
            if ob.get("one") != nb["one"]:
                changes.append(f"  · {name} / {nb['title']}: 简介更新")
            if ob.get("available") != nb["available"]:
                changes.append(f"  · {name} / {nb['title']}: 可读 {ob.get('available')} → {nb['available']}")

        series["books"] = books
        series["pages"] = total
        series["available"] = available
        if site:
            series["site"] = site
        if repo_url:
            series["repo"] = repo_url

    # 本地有、站点没登记的系列（只报告）
    for name, (rel, _site, _repo) in SERIES.items():
        if not any(s.get("name") == name for s in data):
            warnings.append(f"[站点缺系列] {name} ({rel})")

    if changes:
        print("== 变更 ==")
        for c in changes:
            print(" ", c)
    else:
        print("== 无需变更 ==")
    if warnings:
        print("\n== 提示 ==")
        for w in warnings:
            print(" ", w)

    if args.dry_run or not changes:
        return 0

    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    INDEX.write_text(html[:dstart] + payload + html[dend:], encoding="utf-8")
    print(f"\n已写回 {INDEX}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
