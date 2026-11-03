# 词屿 · macOS 打包说明

> **重要**：macOS 安装包（`.dmg` / `.app`）**必须在 macOS 上构建**。Windows 上的 electron-builder 会直接拒绝（`Build for macOS is supported only on macOS`），因为 Apple 的 `codesign`、`hdiutil`、公证服务只有 macOS 才有。这不是配置问题。

## 方案一：借一台 Mac（推荐，10 分钟）

需要：macOS 12+、已安装 Xcode Command Line Tools（终端执行 `xcode-select --install`）、Node.js 20+。

1. 把整个 `word-master` 文件夹拷到 Mac 上。
2. 打开「终端」，执行：

```bash
cd word-master/desktop/macos-build
bash build-macos.sh
```

3. 产物在 `desktop/macos-build/dist-mac/`：
   - `词屿-3.9.2-arm64.dmg`（Apple Silicon）
   - `词屿-3.9.2-x64.dmg`（Intel）
   - 同名 `.zip`（可直接解压运行）

## 方案二：没有 Mac，用 GitHub Actions（免费 macOS 机器）

项目里已带工作流 `.github/workflows/build-macos.yml`：

1. 把 `word-master` 推到自己的 GitHub 仓库。
2. 打开仓库 **Actions → build-macos → Run workflow**。
3. 等 10 分钟左右，在运行结果里下载 `wordislemac-dmg` 产物（就是 `.dmg`）。

不需要本地 Mac，GitHub 提供 `macos-14` 运行器。

## 签名与公证（可选，但建议）

不签名的 app 首次打开会被 Gatekeeper 拦（「无法验证开发者」）。用户可以：

- 右键点 app →「打开」→ 再点「打开」，或
- 终端执行：`xattr -dr com.apple.quarantine /Applications/词屿.app`

若要彻底消除提示，需要 **Apple Developer Program（99 美元/年）** 的 Developer ID：

```bash
export CSC_LINK=/path/to/DeveloperID.p12
export CSC_KEY_PASSWORD=你的p12密码
export APPLE_ID=你的AppleID邮箱
export APPLE_APP_SPECIFIC_PASSWORD=App专用密码
export APPLE_TEAM_ID=你的TeamID
bash build-macos.sh
```

electron-builder 会自动签名并公证（需要联网）。**不要把 p12 和密码放进项目目录或告诉任何人。**

## 为什么不做「未签名 app 的 Windows 交叉构建」

- Windows 上解压官方 macOS Electron 需要创建 275 个符号链接，普通权限做不到；`@electron/packager` 也直接拒绝 `darwin` 平台。
- Apple Silicon 要求所有代码至少有 ad-hoc 签名，Windows 上修改 app 包后无法用 `codesign` 重签，做出来的包在 Mac 上会被系统杀掉。
- 所以「在这台 Windows 上直接生成可安装的 mac 包」不可行；上面的方案是唯一可靠路径。

## 数据位置

macOS 上用户数据在 `~/Library/Application Support/词屿`（Electron 用户目录），与 Windows 的 `%APPDATA%\词屿` 独立；换平台可用「设置 → 导出备份 / 导入备份」迁移。
