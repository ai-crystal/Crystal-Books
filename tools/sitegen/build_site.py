# -*- coding: utf-8 -*-
"""生成 Crystal Books 首页：读取各系列 spec，输出单页站点。"""
import sys, os, json, html
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gen
from site_copy import INTROS, SUBTITLES, ONES

OUT = os.environ.get("CB_OUT", r"E:\Study\全部书籍内容整理")

CHIPS = {
    "从语言模型到智能体": "智能体",
    "AI 推理部署与量化技术": "推理部署",
    "HDR 技术系列": "HDR",
    "状态空间模型": "状态空间",
    "专业级渲染技术": "渲染",
    "世界模型技术": "世界模型",
    "同一张世界的地图": "JEPA",
    "具身智能技术": "具身智能",
    "远程之门": "远程之门",
    "图像生成与编辑技术": "图像生成",
    "大型软件开发技术": "大型软件",
    "大规模 GPU 集群训练技术": "GPU 集群",
    "大模型技术全景": "大模型",
    "强化学习系列": "强化学习",
    "物理模拟技术": "物理模拟",
    "量子技术": "量子",
    "黑客技术与安全原理": "黑客",
    "人体参数化技术": "人体参数化",
    "光的语言": "摄影",
}

CATEGORIES = [
    {
        "id": "ai",
        "name": "人工智能系列",
        "desc": "模型怎么训练、怎么部署，以及怎么读懂它内部在做什么。",
        "color": "#2b5f8a",
        "series": [
            "大模型技术全景",
            "从语言模型到智能体",
            "图像生成与编辑技术",
            "强化学习系列",
            "AI 推理部署与量化技术",
            "具身智能技术",
            "世界模型技术",
            "黑箱之内",
            "状态空间模型",
            "同一张世界的地图",
            "测试时训练技术",
            "人体参数化技术",
            "大规模 GPU 集群训练技术",
        ],
    },
    {
        "id": "software",
        "name": "算法软件技术系列",
        "desc": "渲染、系统、安全，都是要落到代码上的问题。",
        "color": "#8a5a2b",
        "series": [
            "专业级渲染技术",
            "HDR 技术系列",
            "物理模拟技术",
            "大型软件开发技术",
            "远程之门",
            "黑客技术与安全原理",
        ],
    },
    {
        "id": "frontier",
        "name": "前沿科技系列",
        "desc": "量子计算、全脑仿真，以及还在成形的研究方向。",
        "color": "#1f6b63",
        "series": ["量子技术", "全脑仿真"],
    },
    {
        "id": "culture",
        "name": "文娱系列",
        "desc": "摄影与影像，偏动手，也偏审美。",
        "color": "#8a4a5a",
        "series": ["光的语言"],
    },
]

UNAVAILABLE = {"光的语言"}

BG_DIR = os.path.join(OUT, "assets", "bg")


def bg_lum(idx):
    """背景图平均亮度（0~1），用于逐图决定遮罩强度。"""
    try:
        from PIL import Image, ImageStat
        f = os.path.join(BG_DIR, "%02d.jpg" % idx)
        im = Image.open(f).convert("L").resize((64, 40))
        return ImageStat.Stat(im).mean[0] / 255.0
    except Exception:
        return 0.55


def wash_for(lum, base=0.66, k=0.58, lo=0.18, hi=0.60):
    v = base - k * lum
    return round(max(lo, min(hi, v)), 2)


def build_data():
    series = []
    total_books = 0
    total_pages = 0
    by_name = {s["name"]: s for s in gen.SERIES}
    used = set()
    gi = 0

    for cat in CATEGORIES:
        for name in cat["series"]:
            s = by_name.get(name)
            if not s:
                print("WARN: missing series", name)
                continue
            used.add(name)
            available = s["name"] not in UNAVAILABLE and bool(s.get("site"))
            site = s.get("site") or ""
            books = []
            if s.get("single"):
                bi = gen.book_info(s, "book")
                url = site + "#/book/chapters/ch01" if available else ""
                books.append(dict(title=bi["title"], one=bi["one"], pages=bi["pages"] or 0,
                                  chapters=len(bi["chapters"]), url=url, available=available))
                pages = bi["pages"] or 0
            else:
                pages = 0
                for d in s["order"]:
                    bi = gen.book_info(s, d)
                    url = (site + "#/books/" + d + "/README") if available else ""
                    books.append(dict(title=bi["title"], one=ONES.get((name, d), bi["one"]), pages=bi["pages"] or 0,
                                      chapters=len(bi["chapters"]), url=url, available=available))
                    pages += bi["pages"] or 0
            total_books += len(books)
            total_pages += pages
            series.append(dict(
                name=s["name"], chip=CHIPS.get(s["name"], s["name"]), subtitle=SUBTITLES.get(s["name"], s["subtitle"]),
                intro=INTROS.get(s["name"], s["intro"]), theme=s["theme"], site=site, repo=s.get("repo") or "",
                available=available, pages=pages, books=books,
                cat=cat["id"], cat_name=cat["name"],
                bg="assets/bg/%02d.jpg" % ((gi % 31) + 1),
                wash=wash_for(bg_lum((gi % 31) + 1)),
            ))
            gi += 1

    for name in by_name:
        if name not in used:
            print("WARN: uncategorized series", name)
    return series, total_books, total_pages


TEMPLATE = open(os.path.join(HERE, "template_new.html"), encoding="utf-8").read()


def main():
    series, total_books, total_pages = build_data()
    data = json.dumps(series, ensure_ascii=False, separators=(",", ":"))
    data = data.replace("</", "<\\/")

    cats_payload = []
    CAT_BG = [4, 27, 3, 18]
    for i, c in enumerate(CATEGORIES):
        cats_payload.append({
            "id": c["id"], "name": c["name"], "desc": c["desc"], "color": c["color"],
            "bg": "assets/bg/%02d.jpg" % CAT_BG[i],
            "wash": wash_for(bg_lum(CAT_BG[i]), base=0.70, k=0.55, lo=0.22, hi=0.62),
        })
    cats = json.dumps(cats_payload, ensure_ascii=False, separators=(",", ":"))
    cats = cats.replace("</", "<\\/")

    search_html = '''  <label class="search">
    <input id="q" type="search" placeholder="搜索书名或系列" autocomplete="off" aria-label="搜索">
    <kbd>/</kbd>
  </label>'''

    home_main = '''  <section class="hero">
    <div class="hero-media"><img src="assets/hero.jpg" alt="" fetchpriority="high"></div>
    <div class="hero-veil"></div>
    <div class="hero-inner wrap">
      <p class="eyebrow"><span>CRYSTAL BOOKS</span><i></i><span>DR. DEZEMING</span></p>
      <h1><span class="line">一座可以走进去的</span><span class="line big">技术<em>书库</em></span></h1>
      <p class="hero-lead">本系列丛书分为基础入门篇和若干专业深入篇。入门篇力求广博全面，从最基本概念一直讲到最新研究，不涉及复杂的数学与编程；专业篇从技术进阶讲到子专题的深入细节。</p>
      <div class="hero-actions">
        <a class="cta" href="#collection">从目录开始
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M13 6l6 6-6 6"/></svg>
        </a>
        <a class="ghost" href="#all-series">全部系列一览</a>
      </div>
      <dl class="hero-stats" id="hero-stats"></dl>
    </div>
    <div class="scroll-cue"><i></i><span>SCROLL</span></div>
  </section>

  <section class="sec wrap" id="collection">
    <header class="sec-head">
      <p class="sec-kicker">目录 · INDEX</p>
      <div class="sec-head-row">
        <h2>四类书目</h2>
        <p class="sec-note">每套书都从一个具体问题切入，沿着问题逐步展开。入门册讲清整体框架，专题册深入细节；既可按顺序读，也可以只挑关心的一册。</p>
      </div>
    </header>
    <div class="cat-rows" id="cat-rows"></div>
  </section>

  <section class="sec wrap" id="all-series">
    <header class="sec-head">
      <p class="sec-kicker">索引 · ALL SERIES</p>
      <div class="sec-head-row">
        <h2>全部系列</h2>
        <p class="sec-note" id="all-note"></p>
      </div>
    </header>
    <div class="all-list" id="all-series-list"></div>
  </section>'''

    category_main = '''  <section class="cat-hero" id="cat-hero"></section>
  <div class="cat-body wrap">
    <aside class="rail" id="rail" aria-label="系列目录"></aside>
    <div class="cat-main">
      <p class="search-note" id="search-note"></p>
      <div class="series-list" id="series-list"></div>
      <div class="empty" id="empty">没有找到匹配的书，换个关键词试试。</div>
    </div>
  </div>'''

    def page(mode, cat, title, desc, main_html, search):
        return (TEMPLATE
                .replace("__TITLE__", title)
                .replace("__DESC__", desc)
                .replace("__MODE__", mode)
                .replace("__CAT__", cat)
                .replace("__SEARCH__", search)
                .replace("__MAIN__", main_html)
                .replace("__CATS__", cats)
                .replace("__DATA__", data))

    with open(os.path.join(OUT, "index.html"), "w", encoding="utf-8", newline="\n") as f:
        f.write(page("home", "", "Crystal Books · Dr. Dezeming",
                     "Dr. Dezeming 的技术书库，分为人工智能、算法软件技术、前沿科技与文娱四类。",
                     home_main, ""))

    for c in CATEGORIES:
        with open(os.path.join(OUT, c["id"] + ".html"), "w", encoding="utf-8", newline="\n") as f:
            f.write(page("category", c["id"], c["name"] + " · Crystal Books", c["desc"],
                         category_main, search_html))

    with open(os.path.join(OUT, "README.md"), "w", encoding="utf-8", newline="\n") as f:
        f.write("# Crystal Books\n\n"
                "Dr. Dezeming 的技术书稿合集，分为人工智能、算法软件技术、前沿科技与文娱四类。\n\n"
                "在线访问：<https://ai-crystal.github.io/Crystal-Books/>\n")
    open(os.path.join(OUT, ".nojekyll"), "w").close()
    print("series", len(series), "books", total_books, "pages", total_pages)

if __name__ == "__main__":
    main()
