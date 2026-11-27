# 站点生成器

`assets/site.css`、`assets/site.js`、`assets/fx.js` 与各页 HTML 都由这里的脚本生成，
**不要手改 HTML**。

## 日常更新（最常用）

书稿改完、PDF 重编译之后，任选一种：

- 双击仓库根目录的 **`更新站点.bat`**；
- 或命令行：`python tools/sitegen/update_site.py`。

脚本依次做三件事：重建页数快照 → 生成 5 个页面 → 有变化就 `git commit` 并推送。
页数直接读各册 `output/*.pdf`，所以不用手工改数字；没变化时不会产生空提交。

其他开关：`--dry-run` 只看会改哪些文件，`--no-push` 只提交不推送。

## 自动执行

**每天定时（零成本，推荐）**

```powershell
powershell -ExecutionPolicy Bypass -File tools\sitegen\install_task.ps1 -Time "22:30"
```

注册一个 Windows 计划任务，每天静默跑一遍 `update_silent.bat`，日志写在
`tools/sitegen/update.log`。删除任务：`Unregister-ScheduledTask -TaskName "CrystalBooks 站点同步"`。

**让 Agent 顺带检查（内容结构有变化时更稳）**

在 Proma 里建一个定时任务，提示词直接用：
「运行 `python tools/sitegen/update_site.py`，若提示发现新系列/新分册，把它们补进
`tools/sitegen/spec.py` 后重跑并提交」。适合新增整本书、改书名这类要写文案的改动。

## 文件

- `spec.py`：系列与分册清单（名称、副标题、简介、主题色、站点地址、分册顺序与书名/一句话）
- `make_inventory.py`：扫描各册 `book.json` 与 PDF，写 `inventory.json` 快照
- `gen.py`：读取 spec / book.json / PDF，算出每册标题、页数、章数
- `site_copy.py`：站点文案（系列介绍、副标题、单册一句话）
- `template_new.html`：页面骨架
- `build_site.py`：数据组装 + 输出 `index.html` 与四个分类页
- `check_new.py`：报告磁盘上有、spec 里没有的系列/分册
- `check_copy.py` / `check_pages.py` / `scan_pages.py` / `diff_books.py`：核对用的辅助脚本
- `update_site.py`：一键更新（快照 → 生成 → 提交 → 推送）

## 注意

- 运行环境：`C:\Users\Administrator\AppData\Local\Programs\Python\Python312\python.exe`，
  依赖 `pymupdf`（读 PDF 页数）。
- 新增系列要人工确定分类（`build_site.py` 的 `CATEGORIES`）、主题色与站点地址；
  `check_new.py` 只会提示，不会自动收录。
- 输出目录可用环境变量覆盖：`CB_OUT=... python build_site.py`。
- 提交前会自动忽略 `__pycache__` 与 `update.log`。
