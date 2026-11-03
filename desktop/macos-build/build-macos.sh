#!/bin/bash
# 词屿 · macOS 打包（必须在 macOS 上运行）
# 用法：在「终端」里执行  bash build-macos.sh
# 产物：dist-mac/词屿-<版本>-arm64.dmg 与 x64.dmg（以及对应 zip）
set -e
cd "$(dirname "$0")"

echo "== 1/4 同步前端、数据与运行时依赖"
(cd ../installer && node sync.mjs)

echo "== 2/4 组装 macOS app 目录"
rm -rf app
mkdir -p app
cp -R ../installer/app/. app/

echo "== 3/4 安装构建依赖（首次会下载 Electron macOS 二进制）"
if [ ! -d node_modules ]; then
  npm install --no-audit --no-fund
fi

echo "== 4/4 打包 DMG / ZIP（arm64 + x64）"
npx electron-builder --mac --x64 --arm64

echo
echo "完成："
ls -lh dist-mac/*.dmg dist-mac/*.zip 2>/dev/null || true
echo
echo "如果你想用自己的 Apple Developer ID 签名并公证，请先设置："
echo "  export CSC_LINK=/path/to/DeveloperID.p12"
echo "  export CSC_KEY_PASSWORD=你的p12密码"
echo "  export APPLE_ID=你的AppleID邮箱"
echo "  export APPLE_APP_SPECIFIC_PASSWORD=App专用密码"
echo "  export APPLE_TEAM_ID=你的TeamID"
echo "然后重新执行本脚本；未签名时用户需右键「打开」或在终端执行 xattr -dr com.apple.quarantine /Applications/词屿.app"
