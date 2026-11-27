# 站点生成器

`assets/site.css`、`assets/site.js`、`assets/fx.js` 与各页 HTML 由这里的脚本生成。
书目数据来自 `spec.py`（各系列目录结构）与 `inventory.json`（页数统计）。

```bash
# 在本机（需要 E:\Study 下的书稿目录）：
python tools/sitegen/build_site.py
# 输出目录可用环境变量覆盖：CB_OUT=... python build_site.py
```

- `spec.py`：系列与分册清单
- `inventory.json`：各册页数
- `site_copy.py`：站点文案（系列介绍、副标题、单册一句话）
- `template_new.html`：页面骨架
- `build_site.py`：数据组装 + 输出 `index.html` 与四个分类页
