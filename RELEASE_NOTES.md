## 词屿 3.9.35-preview · 竞赛体验版

Windows x64 便携版，解压即用。相比 v3.9.3 Enhanced，这一版把「读、查、背、复习」和本地 AI 都放进了软件里。

### 下载

| 文件 | 大小 | 说明 |
| --- | --- | --- |
| `WordIsle-3.9.35-preview-win-x64.zip` | 293 MB | **主包**：程序 + 42 本词书 + 65k 查词词典 + 150 篇全文 + 断句 / 语音小模型 |
| `WordIsle-3.9.35-models-qwen3-1.7b.zip` | 1.22 GB | 可选：本地 AI 伴学、讲解、听译解析（Qwen3-1.7B Q4_K_M） |
| `WordIsle-3.9.35-models-hy-mt2.zip` | 1.08 GB | 可选：本地离线翻译（Hy-MT2-1.8B Q4_K_M） |

GitHub 单个发布文件上限 2 GB，所以本地模型拆成两个资产。全部下载约 2.6 GB，解压后合计约 7 GB。

**安装**：解压主包 → 双击 `WordIsle.exe` → 注册本机账号。
**装本地 AI**：把模型包解压出的 `resources/app/app/models/` 合并进主包同名目录即可；不装也能正常背词、查词、阅读。

### 本次更新

- **站内阅读全文**：ScienceDaily、NPR、Smithsonian、Science News Explores 等来源的文章点「阅读全文」直接在词屿自己的窗口打开官方完整页面，支持返回书架、后退 / 前进、重新加载、原版页面与文字缩放。
- **150 篇内置全文 + 16 个来源**：正文从原网页正文区域提取到最后一段，支持点词查义、段落笔记、收藏与离线阅读；未取得全文的入口明确标注。
- **文章来源栏目修复**：修复 Windows 端「全文阅读」选中 NPR 显示 0 篇；默认书架改为「全部文章」，另有「站内全文」「原站全文」标签。
- **本地 AI**：随包 Qwen3-1.7B（伴学 / 讲解 / 听译解析）与 Hy-MT2-1.8B（离线翻译），Windows x64 CPU 推理，不需要 Ollama / Python / CUDA；也可以改用在线 API 模式。
- **本机加密账号**：注册即得 `WI-` 开头的本机 ID，学习进度、笔记与资料按账号加密保存；支持记住密码 / 自动登录、锁定、恢复密钥与 `.wiaccount` 加密备份。
- **42 本词书**：小学到 GRE 分册，74,278 条收录、16,521 个去重词形；每日 1—300 词目标、SM-2 间隔复习、五词闯关与薄弱项补练。
- **学习流程重构**：首页「开始学习」按当前词书出题，每组最多 10 词、复习优先，支持「继续本轮」与暂存离开；四步新手引导。
- **朗读高亮修复**：高亮边线与文字之间固定留白，播放、暂停、拖动不再改变段落宽度。
- **统一新图标**：程序文件、窗口、任务栏、启动页、登录页与侧栏统一为书页 + 小岛弧线 + 星光。

完整说明见仓库 [docs/使用说明-3.9.35.md](https://github.com/1752370874-blip/wordisle/blob/main/docs/使用说明-3.9.35.md)，逐项验证记录在 [docs/验证数据/](https://github.com/1752370874-blip/wordisle/tree/main/docs/验证数据)。

### 校验（SHA256）

```
f3e23e95ecd04dc85cc2d8dea120fbb48ec4983c2eb38154c3e11e485ae50095  WordIsle-3.9.35-preview-win-x64.zip  (307432218 bytes)
6f99f9d2b299a31c48b1e6beb76b2250ae1abbbbfa5987d550c66b028a862304  WordIsle-3.9.35-models-qwen3-1.7b.zip  (1282452441 bytes)
ccc4c773a1aff85da5c30a9f522cf78ee7a2df755f40f6accfbf4a23292c3638  WordIsle-3.9.35-models-hy-mt2.zip  (1133109755 bytes)
```

同样保存在仓库根 [SHA256SUMS.txt](https://github.com/1752370874-blip/wordisle/blob/main/SHA256SUMS.txt)。

### 须知

- 竞赛体验版使用独立数据目录 `%APPDATA%\WordIsle-Contest-Preview`，默认不与旧的 3.9.x 安装版共用记录；需要迁移时在注册时勾选迁入，或先在旧版导出 JSON。
- 可执行文件没有购买 CA 代码签名证书，SmartScreen 可能提示「未知发布者」：点「更多信息 → 仍要运行」。
- 本地模型（Qwen3-1.7B、Hy-MT2-1.8B）为 Apache-2.0 许可的公开权重，程序只做本地推理，不微调权重；模型可能产生误译与遗漏，请结合原文核查。
- 官网：<https://1752370874-blip.github.io/wordisle/>
