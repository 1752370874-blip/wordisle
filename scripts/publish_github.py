#!/usr/bin/env python3
"""把词屿仓库 / 官网 / 安装包发布到 GitHub。

三种用法：

    python scripts/publish_github.py --all
        建仓库（如果不存在）→ 推送 main 分支 → 建 Release 并上传安装包 → 开启 GitHub Pages

    python scripts/publish_github.py --site-only
        只把 site/ 目录推到 gh-pages 分支（官网更新用这个）

    python scripts/publish_github.py --release-only
        只建 Release 并上传安装包

凭据优先级：
  1. 环境变量 GH_TOKEN / GITHUB_TOKEN
  2. Windows 凭据管理器里 GitHub Desktop / Git Credential Manager 保存的登录凭据
     （用 `git push` 时弹过浏览器登录的话一般就有）

不依赖 requests，只用标准库。所有写操作都走 GitHub REST API，
因为某些环境下 `git push` 会因为子进程管道/凭据助手不可用而失败。
"""

from __future__ import annotations

import base64
import ctypes
import ctypes.wintypes as wt
import hashlib
import http.client
import json
import os
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

# ---------------------------------------------------------------- 仓库配置

OWNER = "1752370874-blip"
REPO = "wordisle"
DESCRIPTION = "词屿 Word Isle · 离线可用的英语学习桌面应用（九本词库 + 65k 词典 + 外刊阅读 + 文章词汇地图）"
HOMEPAGE = f"https://{OWNER.lower()}.github.io/{REPO}/"
SITE_URL = HOMEPAGE

VERSION = "3.9.3"
TAG = f"v{VERSION}"
ASSET_NAME = f"WordIsle-Enhanced-Setup-{VERSION}.exe"
# 安装包不进 Git 历史，默认从桌面或 outputs 目读取，可用 --asset 覆盖
DEFAULT_ASSET_CANDIDATES = [
    Path.home() / "Desktop" / ASSET_NAME,
    Path(r"C:\Users\17523\Documents\Codex\2026-11-03\ka\outputs") / ASSET_NAME,
]

REPO_ROOT = Path(__file__).resolve().parents[1]
SITE_DIR = REPO_ROOT / "site"

SKIP_DIRS = {"node_modules", "__pycache__", ".pytest_cache", ".git", ".idea", "dist", "win-unpacked"}
SKIP_SUFFIX = {".exe", ".dmg", ".zip", ".7z", ".msi", ".log", ".asar", ".pfx", ".p12", ".pyc"}
SKIP_FILES = {".DS_Store", "Thumbs.db"}

API = "https://api.github.com"
UPLOAD_HOST = "uploads.github.com"

# ---------------------------------------------------------------- 凭据


class _CREDENTIAL(ctypes.Structure):
    _fields_ = [
        ("Flags", wt.DWORD), ("Type", wt.DWORD), ("TargetName", wt.LPWSTR),
        ("Comment", wt.LPWSTR), ("LastWritten", wt.FILETIME), ("CredentialBlobSize", wt.DWORD),
        ("CredentialBlob", ctypes.POINTER(ctypes.c_ubyte)), ("Persist", wt.DWORD),
        ("AttributeCount", wt.DWORD), ("Attributes", ctypes.c_void_p),
        ("TargetAlias", wt.LPWSTR), ("UserName", wt.LPWSTR),
    ]


class _BLOB(ctypes.Structure):
    _fields_ = [("cbData", wt.DWORD), ("pbData", ctypes.POINTER(ctypes.c_char))]


def _from_windows_credman() -> str | None:
    if os.name != "nt":
        return None
    advapi = ctypes.windll.advapi32
    crypt32 = ctypes.windll.crypt32
    advapi.CredEnumerateW.restype = ctypes.c_bool
    count = wt.DWORD()
    ptr = ctypes.POINTER(ctypes.POINTER(_CREDENTIAL))()
    if not advapi.CredEnumerateW(None, 0, ctypes.byref(count), ctypes.byref(ptr)):
        return None
    for i in range(count.value):
        cred = ptr[i].contents
        target = cred.TargetName or ""
        if "github" not in target.lower():
            continue
        blob = ctypes.string_at(cred.CredentialBlob, cred.CredentialBlobSize)
        secret = None
        try:
            buf = ctypes.create_string_buffer(blob, len(blob))
            src = _BLOB(len(blob), ctypes.cast(buf, ctypes.POINTER(ctypes.c_char)))
            dst = _BLOB()
            if crypt32.CryptUnprotectData(ctypes.byref(src), None, None, None, None, 0, ctypes.byref(dst)):
                secret = ctypes.string_at(dst.pbData, dst.cbData).decode("utf-16-le", "ignore")
                advapi.LocalFree(dst.pbData)
        except Exception:
            secret = None
        if not secret:
            try:
                secret = blob.decode("utf-16-le")
            except UnicodeDecodeError:
                continue
        secret = secret.strip()
        if secret.startswith(("gh", "github_pat_")):
            if target.lower() == "git:https://github.com":
                return secret
    return None


def get_token() -> str:
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if not token:
        token = _from_windows_credman()
    if not token:
        raise SystemExit(
            "找不到 GitHub 凭据。请任选一种方式后重试：\n"
            "  1) 设置环境变量：set GH_TOKEN=ghp_xxx（或 PowerShell: $env:GH_TOKEN='ghp_xxx'）\n"
            "  2) 安装 GitHub Desktop 并登录一次，或用 git push 触发一次浏览器登录，凭据会存进 Windows 凭据管理器\n"
            "  3) 在 https://github.com/settings/tokens 新建 classic PAT，勾选 repo 与 workflow"
        )
    return token


# ---------------------------------------------------------------- HTTP


def api(method: str, path_or_url: str, payload=None, *, raw: bytes | None = None,
        content_type: str = "application/json", absolute: bool = False, ok_errors=(),
        timeout: int = 180, attempts: int = 4) -> dict:
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "wordisle-publisher",
    }
    data = None
    if raw is not None:
        data = raw
        headers["Content-Type"] = content_type
    elif payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    url = path_or_url if absolute else API + path_or_url

    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        attempt_headers = dict(headers)
        attempt_headers["Authorization"] = f"Bearer {get_token()}"
        req = urllib.request.Request(url, data=data, method=method, headers=attempt_headers)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                body = resp.read()
                return json.loads(body) if body else {}
        except urllib.error.HTTPError as err:
            body = err.read().decode("utf-8", "replace")
            if err.code in ok_errors:
                return {"_status": err.code, "_body": body}
            # GitHub 偶尔会在短时间高频写入时返回 401 Bad credentials / 5xx，重试即可
            if err.code in (401, 429, 500, 502, 503, 504) and attempt < attempts:
                last_error = err
                print(f"  {method} {url.rsplit('/', 1)[-1]} -> {err.code}，第 {attempt} 次重试…")
                time.sleep(2 * attempt)
                continue
            raise SystemExit(f"{method} {url} -> {err.code}\n{body[:800]}") from err
        except urllib.error.URLError as err:
            last_error = err
            if attempt < attempts:
                print(f"  连接失败（{err.reason}），第 {attempt} 次重试…")
                time.sleep(2 * attempt)
                continue
            raise SystemExit(f"{method} {url} 连接失败：{err.reason}") from err
    raise SystemExit(f"{method} {url} 多次失败：{last_error}")


def upload_asset(release_id: int, path: Path) -> dict:
    token = get_token()
    size = path.stat().st_size
    name = urllib.parse.quote(path.name)
    target = f"/repos/{OWNER}/{REPO}/releases/{release_id}/assets?name={name}"
    conn = http.client.HTTPSConnection(UPLOAD_HOST, timeout=1800, context=ssl.create_default_context())
    conn.putrequest("POST", target)
    conn.putheader("Authorization", f"Bearer {token}")
    conn.putheader("Accept", "application/vnd.github+json")
    conn.putheader("X-GitHub-Api-Version", "2022-11-28")
    conn.putheader("User-Agent", "wordisle-publisher")
    conn.putheader("Content-Type", "application/octet-stream")
    conn.putheader("Content-Length", str(size))
    conn.endheaders()
    print(f"  上传 {path.name}（{size / 1048576:.1f} MiB）…")
    sent = 0
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(1 << 20)
            if not chunk:
                break
            conn.send(chunk)
            sent += len(chunk)
            if sent % (32 << 20) < (1 << 20):
                print(f"    {sent / 1048576:.0f} MiB", flush=True)
    resp = conn.getresponse()
    body = resp.read().decode("utf-8", "replace")
    conn.close()
    if resp.status >= 300:
        raise SystemExit(f"上传失败 -> {resp.status}\n{body[:800]}")
    return json.loads(body)


# ---------------------------------------------------------------- 文件树


def collect_files(root: Path, prefix: str = "") -> dict[str, Path]:
    files: dict[str, Path] = {}
    for item in sorted(root.rglob("*")):
        if not item.is_file():
            continue
        rel_parts = item.relative_to(root).parts
        if any(part in SKIP_DIRS for part in rel_parts[:-1]):
            continue
        if item.suffix.lower() in SKIP_SUFFIX or item.name in SKIP_FILES:
            continue
        files[prefix + "/".join(rel_parts)] = item
    return files


def file_mode(path: Path) -> str:
    return "100755" if path.suffix.lower() in {".sh", ".bat", ".ps1", ".mjs"} else "100644"


def push_branch(branch: str, files: dict[str, Path], message: str, *, orphan: bool) -> str:
    """用 Git Data API 把文件集合整体推成一个提交。"""
    print(f"[{branch}] 上传 {len(files)} 个文件…")
    entries = []
    for path, src in files.items():
        content = src.read_bytes()
        blob = api("POST", f"/repos/{OWNER}/{REPO}/git/blobs", {
            "content": base64.b64encode(content).decode("ascii"),
            "encoding": "base64",
        })
        entries.append({"path": path, "mode": file_mode(src), "type": "blob", "sha": blob["sha"]})
    tree = api("POST", f"/repos/{OWNER}/{REPO}/git/trees",
               {"tree": entries} if not orphan else {"tree": entries})
    parents = []
    head = api("GET", f"/repos/{OWNER}/{REPO}/git/ref/heads/{branch}", ok_errors=(404, 409))
    if head.get("object") and not orphan:
        parents = [head["object"]["sha"]]
    commit = api("POST", f"/repos/{OWNER}/{REPO}/git/commits", {
        "message": message,
        "tree": tree["sha"],
        "parents": parents,
    })
    if head.get("object"):
        api("PATCH", f"/repos/{OWNER}/{REPO}/git/refs/heads/{branch}",
            {"sha": commit["sha"], "force": True})
    else:
        api("POST", f"/repos/{OWNER}/{REPO}/git/refs",
            {"ref": f"refs/heads/{branch}", "sha": commit["sha"]})
    print(f"[{branch}] commit {commit['sha'][:7]} ok")
    return commit["sha"]


# ---------------------------------------------------------------- 步骤


def ensure_repo() -> None:
    info = api("GET", f"/repos/{OWNER}/{REPO}", ok_errors=(404,))
    if info.get("_status") == 404:
        api("POST", "/user/repos", {
            "name": REPO,
            "description": DESCRIPTION,
            "homepage": HOMEPAGE,
            "private": False,
            "has_issues": True,
            "has_wiki": False,
            "has_projects": False,
            "has_discussions": False,
        })
        print(f"已创建仓库 {OWNER}/{REPO}")
    else:
        api("PATCH", f"/repos/{OWNER}/{REPO}", {
            "description": DESCRIPTION,
            "homepage": HOMEPAGE,
            "has_issues": True,
            "has_wiki": False,
            "has_projects": False,
        })
        print(f"仓库已存在：{OWNER}/{REPO}")


def bootstrap_empty_repo() -> None:
    """空仓库不允许创建 blob（409），先放一个占位提交，随后用正式提交强制覆盖 main。"""
    branches = api("GET", f"/repos/{OWNER}/{REPO}/branches")
    if branches:
        return
    api("PUT", f"/repos/{OWNER}/{REPO}/contents/README.md", {
        "message": "chore: bootstrap repository",
        "content": base64.b64encode(b"# wordisle\n").decode("ascii"),
        "branch": "main",
    })
    print("空仓库已用占位提交初始化")


def publish_site() -> None:
    if not SITE_DIR.is_dir():
        raise SystemExit(f"找不到站点目录：{SITE_DIR}")
    files = collect_files(SITE_DIR)
    files[".nojekyll"] = _nojekyll()
    push_branch("gh-pages", files, f"site: publish {SITE_URL}", orphan=False)
    enable_pages()


def _nojekyll() -> Path:
    path = SITE_DIR / ".nojekyll"
    path.write_text("", encoding="utf-8")
    return path


def enable_pages() -> None:
    body = {"source": {"branch": "gh-pages", "path": "/"}}
    result = api("POST", f"/repos/{OWNER}/{REPO}/pages", body, ok_errors=(409, 422))
    if result.get("_status") in (409, 422):
        api("PUT", f"/repos/{OWNER}/{REPO}/pages", body)
    print(f"GitHub Pages 已指向 gh-pages，地址：{SITE_URL}")
    request = api("POST", f"/repos/{OWNER}/{REPO}/pages/builds", {}, ok_errors=(201, 400, 422))
    _ = request


def find_asset(cli_asset: str | None) -> Path:
    if cli_asset:
        path = Path(cli_asset)
        if not path.is_file():
            raise SystemExit(f"安装包不存在：{path}")
        return path
    for candidate in DEFAULT_ASSET_CANDIDATES:
        if candidate.is_file():
            return candidate
    raise SystemExit("找不到安装包，请用 --asset <路径> 指定：" + "、".join(str(p) for p in DEFAULT_ASSET_CANDIDATES))


def publish_release(asset: Path) -> None:
    digest = hashlib.sha256(asset.read_bytes()).hexdigest()
    size_mb = asset.stat().st_size / 1048576
    body = f"""## 词屿 3.9.3 Enhanced

在 3.9.2 基础上新增 **文章词汇地图**，其余功能不变。

- 粘贴英文文章 → 「生成词汇地图」：绿色 = 该词形有练习记录，橙色 = 没有记录，并给出练习记录覆盖率。
- 按原词形精确匹配，不推断词形变化；「练过」≠「已掌握」，「没记录」≠「不认识」。
- 文章只在内存中分析，关闭程序即丢弃；单次最多 20,000 字符。
- 其余：导航、样式与桌面主进程同步更新；`data/` 词库数据与 3.9.2 一致。

### 下载

- 安装包：`{ASSET_NAME}`（{size_mb:.1f} MiB）
- 官网下载入口：{SITE_URL}#download
- 源码与说明：https://github.com/{OWNER}/{REPO}

### 校验（SHA256）

```
{digest}
```

### 须知

- 本版本为重新打包的修改版，**未使用受信任的代码签名证书**；Windows SmartScreen 可能提示「未知发布者」，点「更多信息 → 仍要运行」。
- 沿用原程序的数据路径，可能读取/修改原有学习数据，升级前请先在原程序里导出备份。
- 独立安装包，不会自动替换桌面原有快捷方式。
"""
    existed = api("GET", f"/repos/{OWNER}/{REPO}/releases/tags/{TAG}", ok_errors=(404,))
    if existed.get("_status") != 404:
        release = existed
        print(f"Release {TAG} 已存在：{release['html_url']}")
    else:
        release = api("POST", f"/repos/{OWNER}/{REPO}/releases", {
            "tag_name": TAG,
            "target_commitish": "main",
            "name": f"词屿 {VERSION} Enhanced",
            "body": body,
            "draft": False,
            "prerelease": False,
        })
        print(f"已创建 Release {TAG}：{release['html_url']}")
    assets = api("GET", f"/repos/{OWNER}/{REPO}/releases/{release['id']}/assets")
    if any(a["name"] == ASSET_NAME for a in assets):
        print(f"  安装包已在 Release 里，跳过上传")
        return
    uploaded = upload_asset(release["id"], asset)
    print(f"  上传完成：{uploaded['browser_download_url']}")
    print(f"  SHA256 {digest}")


def main(argv: list[str]) -> None:
    mode = "all"
    asset_arg = None
    i = 0
    while i < len(argv):
        arg = argv[i]
        if arg in ("--all", "--site-only", "--release-only"):
            mode = arg[2:]
        elif arg == "--asset":
            i += 1
            asset_arg = argv[i]
        elif arg in ("-h", "--help"):
            print(__doc__)
            return
        else:
            raise SystemExit(f"未知参数：{arg}")
        i += 1

    who = api("GET", "/user")
    print(f"登录身份：{who['login'] or who.get('name')}")

    if mode in ("all", "release"):
        ensure_repo()
        if mode == "all":
            bootstrap_empty_repo()
            files = collect_files(REPO_ROOT)
            push_branch("main", files, f"release: 词屿 {VERSION} Enhanced", orphan=True)
        publish_release(find_asset(asset_arg))
    if mode in ("all", "site-only"):
        publish_site()

    info = api("GET", f"/repos/{OWNER}/{REPO}")
    print("\n完成：")
    print("  仓库：", info["html_url"])
    print("  官网：", SITE_URL)
    print("  下载：", f"https://github.com/{OWNER}/{REPO}/releases/latest/download/{ASSET_NAME}")


if __name__ == "__main__":
    main(sys.argv[1:])
