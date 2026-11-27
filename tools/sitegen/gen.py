# -*- coding: utf-8 -*-
import os, re, json, sys, io
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from spec import SERIES

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = r"E:\Study"
INV = json.load(open(os.path.join(HERE, "inventory.json"), encoding="utf-8"))

AUTHOR = "Dr. Dezeming"
YEAR = "2026"

# ---------- helpers ----------

def read(p):
    with open(p, encoding="utf-8") as f:
        return f.read()

def write(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8", newline="\n") as f:
        f.write(s)

def pages_for(series_path, d):
    key = os.path.relpath(series_path, ROOT).replace("/", "\\")
    info = INV.get(key) or INV.get(series_path)
    if info:
        for b in info["books"]:
            if b["dir"] == d:
                return b["pages"]
    return None

def chapter_files(bookdir):
    ch = os.path.join(bookdir, "chapters")
    if not os.path.isdir(ch):
        return []
    fs = [f for f in os.listdir(ch) if re.match(r"ch\d+\.md$", f)]
    return sorted(fs, key=lambda x: int(re.findall(r"\d+", x)[0]))

def heading_title(path):
    try:
        lines = read(path).splitlines()
    except Exception:
        return ""
    for line in lines[:40]:
        m = re.match(r"^\s*#{1,2}\s+(.+?)\s*$", line)
        if m:
            return m.group(1).strip()
    return ""

def clean_chapter_title(t):
    t = re.sub(r"^第\s*[0-9一二三四五六七八九十百零〇]+\s*章[\s　、．.：:·—-]*", "", t)
    return t.strip()

def appendix_files(bookdir):
    ap = os.path.join(bookdir, "appendix")
    if not os.path.isdir(ap):
        return []
    out = []
    for f in sorted(os.listdir(ap)):
        if f.endswith(".md"):
            t = heading_title(os.path.join(ap, f))
            out.append((f, t or f[:-3]))
    return out

def extract_intro(old_path):
    if not os.path.exists(old_path):
        return ""
    lines = read(old_path).splitlines()
    # skip until after first H1
    i = 0
    while i < len(lines) and not re.match(r"^#\s+", lines[i]):
        i += 1
    i += 1
    buf, blocks, cur = [], [], []
    for line in lines[i:]:
        if re.match(r"^##\s+", line):
            if "目录" in line:
                break
            # heading inside intro area: flush and continue reading its body
            if cur:
                blocks.append(" ".join(cur).strip()); cur = []
            continue
        if line.strip() == "":
            if cur:
                blocks.append(" ".join(cur).strip()); cur = []
            continue
        cur.append(line.strip())
    if cur:
        blocks.append(" ".join(cur).strip())
    good = []
    for b in blocks:
        if len(b) < 30:
            continue
        if re.match(r"^[#>\-*|<\[]", b):
            continue
        if re.search(r"(作者|在线阅读|下载|PDF|页数|ISBN|版权)", b) and len(b) < 80:
            continue
        if not re.search(r"[\u4e00-\u9fff]", b):
            continue
        # drop blocks that are mostly link markup
        if b.count("](") >= 3:
            continue
        good.append(b)
    return "\n\n".join(good[:2]).strip()


def extract_extra_sections(old_path):
    if not os.path.exists(old_path):
        return []
    lines = read(old_path).splitlines()
    keep_titles = ("这一册讲什么", "这本书想讲清楚的一件事", "怎么读", "阅读建议", "怎么选")
    out, cur, buf = [], None, []
    def flush():
        nonlocal cur, buf
        if cur is not None:
            body = "\n".join(buf).strip()
            if body:
                out.append((cur, body))
        cur, buf = None, []
    for line in lines:
        m = re.match(r"^(##)\s+(.+?)\s*$", line)
        if m:
            flush()
            if any(k in m.group(2) for k in keep_titles):
                cur = m.group(2)
            continue
        if cur is not None:
            buf.append(line)
    flush()
    return out

def book_info(s, d):
    bookdir = os.path.join(s["path"], "books", d) if not s.get("single") else os.path.join(s["path"], s["single"]["dir"])
    bj = {}
    p = os.path.join(bookdir, "book.json")
    if os.path.exists(p):
        try:
            bj = json.load(open(p, encoding="utf-8"))
        except Exception:
            bj = {}
    title = s.get("titles", {}).get(d) or bj.get("title") or d
    one = s.get("ones", {}).get(d) or bj.get("subtitle") or ""
    pdf = s.get("pdf_override", {}).get(d) or bj.get("pdf")
    if not pdf and s.get("single"):
        pdf = s["single"]["pdf"]
    def _newest(files):
        files = [f for f in files if f.lower().endswith(".pdf")]
        if not files:
            return None
        return max(files, key=lambda f: os.path.getmtime(os.path.join(s["path"], "output", f)))

    if pdf and not os.path.exists(os.path.join(s["path"], "output", pdf)):
        out = os.path.join(s["path"], "output")
        stem = os.path.splitext(pdf)[0]
        cand = [f for f in os.listdir(out) if os.path.splitext(f)[0] == stem] if os.path.isdir(out) else []
        pick = cand[0] if cand else None
        if not pick and os.path.isdir(out):
            # book.json 里的文件名可能已过期：按册目录名 + 取最新
            pick = _newest([f for f in os.listdir(out) if d in os.path.basename(f)])
        if pick:
            pdf = pick
    pages = s.get("pages_override", {}).get(d)
    # 页数以 output 里的 PDF 为准：重新编译后无需手工同步 inventory.json
    if pages is None and pdf:
        pp = os.path.join(s["path"], "output", pdf)
        if os.path.exists(pp):
            try:
                import pymupdf
                with pymupdf.open(pp) as doc:
                    pages = doc.page_count
            except Exception:
                pass
    if pages is None:
        pages = pages_for(s["path"], d)
    if s.get("single"):
        title = s["name"]
        one = s["subtitle"]
    chs = chapter_files(bookdir)
    return dict(dir=d, bookdir=bookdir, title=title, one=one, pdf=pdf, pages=pages, chapters=chs, bj=bj)

# ---------- index.html ----------

INDEX = r'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>__NAME__ · __AUTHOR__</title>
  <meta name="description" content="__DESC__">
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/docsify@4.13.1/themes/vue.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
  <style>
    :root { --theme-color: __THEME__; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif; }
    .sidebar { border-right: 1px solid #eee; }
    .sidebar ul li a { font-size: 14px; }
    .markdown-section { max-width: 860px; padding: 28px 36px 80px; line-height: 1.82; }
    .markdown-section img { max-width: 100%; height: auto; display: block; margin: 1.2em auto; }
    .markdown-section figcaption { text-align: center; color: #777; font-size: 13px; margin-top: -.4em; }
    .markdown-section table { display: table; width: 100%; font-size: .95rem; }
    .markdown-section blockquote { color: #4a5568; border-left: 3px solid var(--theme-color); background: #f7fafc; padding: .4em 1em; }
    .app-nav { display: none; }
    section.cover { background: radial-gradient(circle at 20% 18%, #23384c 0, #0b1119 48%, #05080d 100%) !important; }
    section.cover .mask { background: rgba(0, 0, 0, .18) !important; }
    section.cover .cover-main { max-width: 860px; margin-left: auto !important; margin-right: auto !important; text-align: center; }
    section.cover .cover-main p { text-align: center; }
    section.cover .cover-main h1,
    section.cover .cover-main h1 a,
    section.cover .cover-main h1 a span { font-size: clamp(2.2rem, 7vw, 4.2rem); letter-spacing: .08em; color: #fff !important; text-decoration: none; }
    section.cover .cover-main blockquote { border-left: none; background: none; }
    section.cover .cover-main blockquote p { color: #d7e0ea !important; font-size: 1.05rem; }
    section.cover .cover-main p { color: #b9c6d4 !important; }
    section.cover .cover-main p strong { color: #eef4fa !important; }
    section.cover .cover-main > p:last-child a { color: #fff !important; border: 1px solid rgba(255,255,255,.7) !important; background: transparent !important; }
    section.cover .cover-main > p:last-child a:first-child { background: var(--theme-color) !important; border-color: var(--theme-color) !important; }
    section.cover .cover-main > p:last-child a:hover { background: rgba(255,255,255,.14) !important; }
    @media (max-width: 768px) {
      .markdown-section { padding: 20px 18px 60px; }
    }
  </style>
</head>
<body>
  <div id="app">加载中……</div>
  <script>
    window.$docsify = {
      name: '__NAME__',
      repo: '__REPO__',
      homepage: 'README.md',
      loadSidebar: true,
      coverpage: true,
      relativePath: true,
      subMaxLevel: 2,
      maxLevel: 3,
      auto2top: true,
      noCompileLinks: ['output/', '\\.pdf$'],
      search: {
        placeholder: '搜索全书',
        noData: '没有找到内容。',
        paths: 'auto',
        depth: 3
      },
      pagination: {
        previousText: '上一章',
        nextText: '下一章',
        crossChapter: true,
        firstText: '回到开头',
        lastText: '去往结尾'
      },
      copyCode: {
        buttonText: '复制',
        errorText: '复制失败',
        successText: '已复制'
      },
      mermaid: { theme: 'default' },
      plugins: [
        function (hook) {
          hook.doneEach(function () {
            var route = decodeURI(location.hash.replace(/^#\/?/, '').split('?')[0]);
            if (!route || /\/$/.test(route)) { route += 'README.md'; }
            var dir = route.replace(/[^\/]*$/, '');
            function normalize(p) {
              var stack = dir.split('/').filter(Boolean);
              p.split('/').forEach(function (seg) {
                if (seg === '..') { stack.pop(); }
                else if (seg !== '.' && seg !== '') { stack.push(seg); }
              });
              return '/' + stack.join('/');
            }
            document.querySelectorAll('.markdown-section img').forEach(function (img) {
              var src = img.getAttribute('src') || '';
              if (src && !/^(https?:|\/|data:)/.test(src)) {
                img.setAttribute('src', normalize(src));
              }
            });
            if (window.renderMathInElement) {
              window.renderMathInElement(document.querySelector('.markdown-section'), {
                delimiters: [
                  { left: '$$', right: '$$', display: true },
                  { left: '\\[', right: '\\]', display: true },
                  { left: '\\(', right: '\\)', display: false },
                  { left: '$', right: '$', display: false }
                ],
                throwOnError: false,
                ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
              });
            }
          });
        }
      ]
    };
  </script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.5/dist/mermaid.min.js"></script>
  <script>if (window.mermaid) { mermaid.initialize({ startOnLoad: false, theme: 'neutral' }); }</script>
  <script src="https://cdn.jsdelivr.net/npm/docsify@4.13.1/lib/docsify.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/docsify@4.13.1/lib/plugins/search.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/docsify-pagination@2.10.1/dist/docsify-pagination.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/docsify-copy-code@3.0.2/dist/docsify-copy-code.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/docsify-mermaid@2.0.1/dist/docsify-mermaid.js"></script>
</body>
</html>
'''

def make_index(s):
    return (INDEX.replace("__NAME__", s["name"])
                 .replace("__AUTHOR__", AUTHOR)
                 .replace("__DESC__", s["subtitle"].replace('"', "'"))
                 .replace("__THEME__", s["theme"])
                 .replace("__REPO__", s.get("repo") or ""))

# ---------- generators ----------

def make_readme(s):
    L = [f"# {s['name']}", "", f"> {s['subtitle']}", ""]
    for p in s["intro"]:
        L += [p, ""]
    L += [f"作者：{AUTHOR}　·　{YEAR}", ""]
    site = s.get("site") or ""
    repo = s.get("repo") or ""
    if site:
        line = f"**在线阅读**：[在线阅读站]({site})"
        if repo:
            line += f"　·　**仓库**：[GitHub 仓库]({repo})"
    elif repo:
        line = f"**仓库**：[GitHub]({repo})"
    else:
        line = "**在线阅读**：尚未发布（可本地打开根目录的 `index.html`）"
    L += [line, ""]

    if s.get("single"):
        bi = book_info(s, "book")
        L += ["## 本册", "",
              f"**{bi['title']}**，共 {len(bi['chapters'])} 章、{bi['pages'] or '—'} 页。",
              f"在线阅读：[从第 1 章开始](book/chapters/ch01.md)　·　"
              f'<a href="output/{bi["pdf"]}" target="_blank" rel="noopener" data-router-ignore>下载 PDF</a>',
              ""]
        L += ["## 目录", ""]
        for f in bi["chapters"]:
            n = int(re.findall(r"\d+", f)[0])
            t = clean_chapter_title(heading_title(os.path.join(bi["bookdir"], "chapters", f)))
            L.append(f"- [第 {n} 章　{t}](book/chapters/{f})")
        aps = appendix_files(bi["bookdir"])
        if aps:
            L += ["", "### 附录", ""]
            for f, t in aps:
                L.append(f"- [{t}](book/appendix/{f})")
        L += ["", "## 怎么读", ""] + [f"- {x}" for x in s["read"]]
    else:
        L += ["## 分册", "",
              "| 册 | 书名 | 一句话 | 页数 | 在线阅读 | PDF |",
              "| --- | --- | --- | ---: | --- | --- |"]
        for i, d in enumerate(s["order"], 1):
            bi = book_info(s, d)
            pages = bi["pages"] if bi["pages"] else "—"
            read = f"[阅读](books/{d}/README.md)"
            pdf = (f'<a href="output/{bi["pdf"]}" target="_blank" rel="noopener" data-router-ignore>下载</a>'
                   if bi["pdf"] else "—")
            L.append(f"| {i:02d} | [{bi['title']}](books/{d}/README.md) | {bi['one']} | {pages} | {read} | {pdf} |")
        L += ["", "## 怎么读", ""] + [f"- {x}" for x in s["read"]]

    L += [
        "",
        "## 许可",
        "",
        "本系列文字与插图采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 许可发布，"
        "转载请注明作者与出处。书中引用的论文、数据集与模型归各自作者所有。",
        "",
        "---",
        "",
        f"作者：{AUTHOR}　·　{YEAR}",
        "",
    ]
    return "\n".join(L)

def make_cover(s):
    L = [f"# {s['name']}", "", f"> {s['subtitle']}", "", s["intro"][0], "", f"**{AUTHOR}**　·　{YEAR}", ""]
    if s.get("single"):
        bi = book_info(s, "book")
        L += ['<p class="cover-links">',
              '<a href="#/book/chapters/ch01">开始阅读</a>',
              f'<a href="/output/{bi["pdf"]}" target="_blank" rel="noopener" data-router-ignore>下载 PDF</a>',
              '</p>', ""]
    else:
        first = s["order"][0]
        L += ['<p class="cover-links">',
              f'<a href="#/books/{first}/README">开始阅读</a>',
              '<a href="#/README">书目与下载</a>',
              '</p>', ""]
    return "\n".join(L)

def make_root_sidebar(s):
    if s.get("single"):
        bi = book_info(s, "book")
        L = ["- [系列首页](/README.md)", ""]
        pre = os.path.join(bi["bookdir"], "front", "preface.md")
        if os.path.exists(pre):
            L.append("- [前言](/book/front/preface.md)")
        for f in bi["chapters"]:
            n = int(re.findall(r"\d+", f)[0])
            t = clean_chapter_title(heading_title(os.path.join(bi["bookdir"], "chapters", f)))
            L.append(f"- [第 {n} 章　{t}](/book/chapters/{f})")
        aps = appendix_files(bi["bookdir"])
        if aps:
            L += ["", "- **附录**"]
            for f, t in aps:
                L.append(f"  - [{t}](/book/appendix/{f})")
        L += ["", f'- <a href="/output/{bi["pdf"]}" target="_blank" rel="noopener" data-router-ignore>下载 PDF</a>', ""]
        return "\n".join(L)

    L = ["- [系列首页](/README.md)", ""]
    for i, d in enumerate(s["order"], 1):
        bi = book_info(s, d)
        L += [f"- **{i:02d}　{bi['title']}**",
              f"  - [本册首页](/books/{d}/README.md)"]
        if bi["pdf"]:
            L.append(f'  - <a href="/output/{bi["pdf"]}" target="_blank" rel="noopener" data-router-ignore>下载 PDF</a>')
        L.append("")
    return "\n".join(L)

def make_book_sidebar(s, bi):
    d = bi["dir"]
    L = ["- [系列首页](/README.md)", f"- [本册首页](/books/{d}/README.md)", ""]
    pre = os.path.join(bi["bookdir"], "front", "preface.md")
    if os.path.exists(pre):
        L += ["- [前言](/books/%s/front/preface.md)" % d, ""]
    for f in bi["chapters"]:
        n = int(re.findall(r"\d+", f)[0])
        t = clean_chapter_title(heading_title(os.path.join(bi["bookdir"], "chapters", f)))
        L.append(f"- [第 {n} 章　{t}](/books/{d}/chapters/{f})")
    aps = appendix_files(bi["bookdir"])
    if aps:
        L += ["", "- **附录**"]
        for f, t in aps:
            L.append(f"  - [{t}](/books/{d}/appendix/{f})")
    if bi["pdf"]:
        L += ["", f'- <a href="/output/{bi["pdf"]}" target="_blank" rel="noopener" data-router-ignore>下载 PDF</a>']
    L.append("")
    return "\n".join(L)

def make_book_readme(s, bi):
    d = bi["dir"]
    old = os.path.join(bi["bookdir"], "README.md")
    intro = extract_intro(old)
    if not intro:
        intro = f"本册讲{bi['one']}。" if bi["one"] else ""
    L = [f"# {bi['title']}", ""]
    if bi["one"]:
        L += [f"> {bi['one']}", ""]
    L += [intro, "", f"共 {len(bi['chapters'])} 章 · {bi['pages'] or '—'} 页", ""]
    nav = "[从第 1 章开始](chapters/ch01.md)"
    if bi["pdf"]:
        nav += (f'　·　<a href="../../output/{bi["pdf"]}" target="_blank" rel="noopener" '
                f'data-router-ignore>下载本册 PDF</a>')
    L += [nav, ""]
    for h, body in extract_extra_sections(old):
        if body[:20] and body[:20] in intro:
            continue
        L += ["## " + h, "", body.strip(), ""]
    L += ["## 目录", ""]
    pre = os.path.join(bi["bookdir"], "front", "preface.md")
    if os.path.exists(pre):
        L.append("- [前言](front/preface.md)")
    for f in bi["chapters"]:
        n = int(re.findall(r"\d+", f)[0])
        t = clean_chapter_title(heading_title(os.path.join(bi["bookdir"], "chapters", f)))
        L.append(f"- [第 {n} 章　{t}](chapters/{f})")
    aps = appendix_files(bi["bookdir"])
    if aps:
        L += ["", "### 附录", ""]
        for f, t in aps:
            L.append(f"- [{t}](appendix/{f})")
    L += ["", "---", "", "[返回系列首页](../../README.md)", ""]
    return "\n".join(L)

# ---------- run ----------

def run(only=None):
    changed = []
    for s in SERIES:
        if only and s["name"] not in only:
            continue
        base = s["path"]
        files = {
            "README.md": make_readme(s),
            "_coverpage.md": make_cover(s),
            "_sidebar.md": make_root_sidebar(s),
            "index.html": make_index(s),
        }
        if not s.get("single"):
            for d in s["order"]:
                bi = book_info(s, d)
                files[f"books/{d}/README.md"] = make_book_readme(s, bi)
                files[f"books/{d}/_sidebar.md"] = make_book_sidebar(s, bi)
        for rel, content in files.items():
            p = os.path.join(base, rel.replace("/", os.sep))
            old = read(p) if os.path.exists(p) else None
            if old != content:
                write(p, content)
                changed.append(p)
        print("done:", s["name"])
    print("changed files:", len(changed))
    for c in changed:
        print("  ", c)

if __name__ == "__main__":
    run(sys.argv[1:] or None)
