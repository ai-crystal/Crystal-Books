# Crystal Books

Dr. Dezeming 的技术书稿合集，涵盖人工智能、图形渲染、系统工程、物理模拟与量子技术。

在线访问：<https://ai-crystal.github.io/Crystal-Books/>

## 维护

书目数据由各书仓库自动汇总，改完书以后跑：

```bash
python tools/sync.py --dry-run   # 先看差异
python tools/sync.py             # 写回 index.html
```

页数以 `output/*.pdf` 的实际页数为准，章数取 `books/<slug>/structure.json`，
站点是否可读会自动探测。提交并推送后 GitHub Pages 会自动发布。
