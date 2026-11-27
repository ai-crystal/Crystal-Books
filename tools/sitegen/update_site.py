# -*- coding: utf-8 -*-
"""一键更新 Crystal Books：重建页数快照 → 生成页面 → 有变化就提交并推送。

用法：
    python tools/sitegen/update_site.py             # 更新 + 提交 + 推送
    python tools/sitegen/update_site.py --dry-run   # 只报告会改哪些文件
    python tools/sitegen/update_site.py --no-push   # 只提交，不推送

页面由 build_site.py 生成；页数现场读各册 output/*.pdf，重新编译后无需手工改数字。
如果发现新的系列或分册，脚本会提示需要补 spec（分类、简介、主题色这些要人工定）。
"""
import os
import re
import subprocess
import sys
import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
PY = sys.executable


def run(args, check=False):
    r = subprocess.run(args, cwd=ROOT, capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    if check and r.returncode != 0:
        raise SystemExit("命令失败：%s\n%s" % (" ".join(args), (r.stdout or "") + (r.stderr or "")))
    return r


def git(*args):
    return run(["git", "-C", ROOT] + list(args))


def main(argv):
    dry = "--dry-run" in argv
    push = "--no-push" not in argv

    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

    print("== 1/3 扫描书稿页数")
    r = run([PY, os.path.join(HERE, "make_inventory.py")])
    print((r.stdout or r.stderr).strip())
    if r.returncode != 0:
        return 1

    print("== 2/3 生成页面")
    r = run([PY, os.path.join(HERE, "build_site.py")])
    out = ((r.stdout or "") + (r.stderr or "")).strip()
    print(out)
    if r.returncode != 0:
        return 1
    m = re.search(r"series (\d+) books (\d+) pages (\d+)", out)
    books = pages = None
    if m:
        books, pages = int(m.group(2)), int(m.group(3))

    print("== 3/3 检查新增 / 改名")
    r = run([PY, os.path.join(HERE, "check_new.py")])
    warn = (r.stdout or "").strip()
    if warn:
        print(warn)
        print("（以上需要人工补 spec；本次仍按现有条目生成）")
    else:
        print("没有发现未收录的系列或分册")

    st = git("status", "--porcelain")
    if st.returncode != 0:
        print("不是 git 仓库或 git 不可用，页面已生成但未提交。")
        return 1
    changed = [l for l in (st.stdout or "").splitlines() if l.strip()]
    if not changed:
        print("没有变化，站点已是最新。")
        return 0

    print("改动 %d 个文件：" % len(changed))
    for line in changed[:20]:
        print("  " + line)
    if len(changed) > 20:
        print("  …")

    if dry:
        print("--dry-run：不提交。")
        return 0

    git("add", "-A")
    stamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    stat = ("%d 册 / %s 页" % (books, format(pages, ","))) if books else "页面更新"
    msg = "自动同步书稿：%s（%s）" % (stamp, stat)
    r = git("commit", "-m", msg)
    if r.returncode != 0:
        print((r.stdout or "") + (r.stderr or ""))
        return 1
    print("已提交：" + msg)

    if not push:
        print("--no-push：未推送。")
        return 0

    r = git("push", "origin", "HEAD")
    if r.returncode != 0:
        print("推送失败，稍后重试或检查网络 / SSH key：")
        print((r.stdout or "") + (r.stderr or ""))
        return 1
    print("已推送到 GitHub Pages，约 1 分钟后生效。")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
