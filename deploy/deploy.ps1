param(
  [string]$LauncherDir = '',
  [string]$AppDir = '',
  [string]$PartsDir = '',
  [switch]$NoLaunch,
  [switch]$Force,
  [switch]$Headless
)

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}

Add-Type -AssemblyName System.Windows.Forms | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem | Out-Null

$TITLE = '词屿一键部署'
$BASE = 'https://github.com/1752370874-blip/wordisle/releases/latest/download/'
$PARTS = @(
  @{ Name = 'WordIsle-3.9.56-enhance-models.zip.001'; Sha256 = 'db6c957590e26bceb4d4d4954681c1c4f73608fe33d93769357aab495c51a139'; Size = 1572864000 },
  @{ Name = 'WordIsle-3.9.56-enhance-models.zip.002'; Sha256 = '9c68428d8be6bfb0407d0e5006eeb5f0c64d8de2d6414330adcf59632114f3cc'; Size = 1572864000 },
  @{ Name = 'WordIsle-3.9.56-enhance-models.zip.003'; Sha256 = 'd1edeb3a9a9e1473062d0fd8a0ee9ed4e2bf66a3b319176d9b5170e3522d21b5'; Size = 855507768 }
)
$SETUP = @{ Name = 'WordIsle-3.9.56-preview-Setup-x64.exe'; Sha256 = '14d0c0cb9991c4a8b45c43e9ca99cfb1eff6f78a7ce8ab0086c9e65c59934d64'; Size = 515758205 }

function Info($text) { Write-Host "  $text" -ForegroundColor Cyan }
function Ok($text) { Write-Host "  $text" -ForegroundColor Green }
function Warn($text) { Write-Host "  $text" -ForegroundColor Yellow }
function Box($text, $buttons = 'OK', $icon = 'Information') {
  if ($Headless) {
    Write-Host $text
    if ($buttons -eq 'YesNo' -or $buttons -eq 'YesNoCancel') { return 'Yes' }
    return 'OK'
  }
  [Windows.Forms.MessageBox]::Show($text, $TITLE, $buttons, $icon)
}
function Fail($text) {
  Write-Host "  $text" -ForegroundColor Red
  Box "$text`n`n可以关闭这个窗口，重新运行脚本再试一次。" 'OK' 'Error' | Out-Null
  exit 1
}
function FreeGB($path) {
  try {
    $full = [IO.Path]::GetFullPath($path)
    $root = [IO.Path]::GetPathRoot($full)
    if (-not $root) { return 0 }
    return (New-Object IO.DriveInfo $root).AvailableFreeSpace / 1GB
  } catch { return 0 }
}

function Get-File($url, $path, $sha, $size) {
  $name = Split-Path $path -Leaf
  if ((Test-Path -LiteralPath $path) -and ((Get-Item -LiteralPath $path).Length -eq $size)) {
    $hash = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLower()
    if ($hash -eq $sha) { Ok "$name 已下载并通过校验"; return }
  }
  if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue }
  $curl = Join-Path $env:SystemRoot 'System32\curl.exe'
  if (-not (Test-Path $curl)) { $curl = 'curl.exe' }
  for ($attempt = 1; $attempt -le 3; $attempt++) {
    Info "下载 $name（第 $attempt 次，支持断点续传）..."
    & $curl -L --fail --retry 5 --retry-delay 5 --connect-timeout 30 -C - -# -o "$path" "$url"
    if ($LASTEXITCODE -eq 0 -and (Test-Path -LiteralPath $path) -and ((Get-Item -LiteralPath $path).Length -eq $size)) {
      $hash = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLower()
      if ($hash -eq $sha) { Ok "$name 下载完成，校验通过"; return }
      Warn "$name 校验不通过，重新下载"
      Remove-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
    } else {
      Warn "$name 下载中断，稍后重试"
      Start-Sleep -Seconds 3
    }
  }
  Fail "下载 $name 失败。请检查网络后重新运行；已经下载好的部分不会重复下载。"
}

function Find-App {
  $cands = New-Object System.Collections.Generic.List[string]
  if ($LauncherDir) { $cands.Add($LauncherDir); $cands.Add((Split-Path -Path $LauncherDir -Parent)) }
  $cands.Add((Join-Path $env:LOCALAPPDATA 'Programs\WordIsle'))
  $cands.Add((Join-Path $env:ProgramFiles 'WordIsle'))
  $cands.Add((Join-Path ${env:ProgramFiles(x86)} 'WordIsle'))
  $cands.Add((Join-Path $env:USERPROFILE 'Desktop\词屿体验版'))
  foreach ($dir in $cands) {
    if ($dir -and (Test-Path -LiteralPath (Join-Path $dir 'WordIsle.exe'))) { return $dir }
  }
  $lnks = @(
    (Join-Path $env:USERPROFILE 'Desktop\词屿.lnk'),
    (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\词屿\词屿.lnk')
  )
  foreach ($lnk in $lnks) {
    if (Test-Path -LiteralPath $lnk) {
      try {
        $sh = New-Object -ComObject WScript.Shell
        $target = $sh.CreateShortcut($lnk).TargetPath
        if ($target -and (Test-Path -LiteralPath $target)) { return (Split-Path -Path $target -Parent) }
      } catch {}
    }
  }
  return $null
}

function Pick-AppFolder {
  $dlg = New-Object Windows.Forms.FolderBrowserDialog
  $dlg.Description = '请选择词屿程序文件夹（里面有 WordIsle.exe）'
  $dlg.ShowNewFolderButton = $false
  if ($dlg.ShowDialog() -ne 'OK') { exit 0 }
  if (-not (Test-Path -LiteralPath (Join-Path $dlg.SelectedPath 'WordIsle.exe'))) {
    Fail '这个文件夹里没有 WordIsle.exe。请选择解压后的「词屿体验版」文件夹，或安装版所在的 WordIsle 文件夹。'
  }
  return $dlg.SelectedPath
}

Write-Host ''
Write-Host '  词屿 3.9.56 · 一键部署离线增强包' -ForegroundColor White
Write-Host '  适用 Windows 10 / 11 x64' -ForegroundColor DarkGray
Write-Host ''

if (-not $Force) {
  $go = Box "将自动完成：`n`n1. 检查词屿是否已安装（没装会自动安装）`n2. 下载 3 个离线增强包分卷（共 3.73 GB）`n3. 校验、合并、解压`n4. 把「词屿离线增强包」放到正确位置`n`n需要约 10 GB 空闲磁盘，下载时间取决于网速。`n现在开始吗？" 'YesNo' 'Question'
  if ($go -ne 'Yes') { exit 0 }
}

# ---------- 1. 找到（或安装）词屿 ----------
$app = $null
if ($AppDir) {
  if (Test-Path -LiteralPath (Join-Path $AppDir 'WordIsle.exe')) { $app = $AppDir }
  else { Fail "指定的目录里没有 WordIsle.exe：$AppDir" }
} else {
  $app = Find-App
}

if (-not $app) {
  Info '没有自动找到词屿。'
  $choice = Box "没有自动找到已经安装的词屿。`n`n是：我自己选择词屿文件夹`n否：帮我自动安装（推荐）`n`n取消：退出" 'YesNoCancel' 'Question'
  if ($choice -eq 'Cancel') { exit 0 }
  if ($choice -eq 'Yes') {
    $app = Pick-AppFolder
  } else {
    $work = Join-Path $env:LOCALAPPDATA 'WordIsle-Deploy'
    New-Item -ItemType Directory -Force -Path $work | Out-Null
    $setupPath = Join-Path $work $SETUP.Name
    Get-File ($BASE + $SETUP.Name) $setupPath $SETUP.Sha256 $SETUP.Size
    Info '正在安装词屿（约需 1-3 分钟，会保留已有的本机账号和学习记录）...'
    $proc = Start-Process -FilePath $setupPath -ArgumentList '/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART' -Wait -PassThru
    $app = Join-Path $env:LOCALAPPDATA 'Programs\WordIsle'
    if (-not (Test-Path -LiteralPath (Join-Path $app 'WordIsle.exe'))) {
      Fail '词屿安装没有完成（可能被安全软件拦截）。请手动运行安装包后再运行本脚本。'
    }
    Ok '词屿安装完成'
    Remove-Item -LiteralPath $setupPath -Force -ErrorAction SilentlyContinue
  }
}

Ok "词屿位置：$app"
$parent = Split-Path -Path $app -Parent
if (-not $parent) { $parent = (Get-Item -LiteralPath $app).Parent.FullName }
$packDir = Join-Path $parent '词屿离线增强包'

# ---------- 2. 准备临时目录与空间 ----------
$work = Join-Path $env:LOCALAPPDATA 'WordIsle-Deploy'
if ((FreeGB $parent) -gt (FreeGB $env:LOCALAPPDATA)) {
  $work = Join-Path $parent '.wordisle-deploy'
}
New-Item -ItemType Directory -Force -Path $work | Out-Null
$free = [math]::Round((FreeGB $work), 1)
if ($free -lt 9.5) {
  Fail "磁盘空间不足：$work 所在磁盘只剩 $free GB，部署需要约 10 GB。请清理磁盘后重试。"
}
Info "临时目录：$work（剩余 $free GB）"

# ---------- 3. 下载并校验三个分卷 ----------
foreach ($part in $PARTS) {
  $path = Join-Path $work $part.Name
  if ($PartsDir) { $path = Join-Path $PartsDir $part.Name }
  Get-File ($BASE + $part.Name) $path $part.Sha256 $part.Size
}

# ---------- 4. 合并与解压 ----------
$joined = Join-Path $work 'WordIsle-3.9.56-enhance-models.zip'
$totalSize = ($PARTS | ForEach-Object { [int64]$_.Size } | Measure-Object -Sum).Sum
if (-not ((Test-Path -LiteralPath $joined) -and ((Get-Item -LiteralPath $joined).Length -eq $totalSize))) {
  if (Test-Path -LiteralPath $joined) { Remove-Item -LiteralPath $joined -Force }
  Info '正在合并 3 个分卷...'
  $out = [IO.File]::Create($joined)
  try {
    foreach ($part in $PARTS) {
      $p = Join-Path $work $part.Name
      if ($PartsDir) { $p = Join-Path $PartsDir $part.Name }
      $in = [IO.File]::OpenRead($p)
      try { $in.CopyTo($out) } finally { $in.Dispose() }
    }
  } finally { $out.Dispose() }
}
Ok '分卷合并完成'

$stage = Join-Path $work 'stage'
if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
Info '正在解压（约 4.4 GB，需要几分钟，请耐心等待）...'
try {
  [IO.Compression.ZipFile]::ExtractToDirectory($joined, $stage)
} catch {
  Fail "解压失败：$($_.Exception.Message)。请确认磁盘空间充足后重试。"
}

$gguf = Get-ChildItem -LiteralPath $stage -Recurse -Filter 'Qwen3-4B-Instruct-2507-Q4_K_M.gguf' -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $gguf) { Fail '解压结果不完整（没有找到 Qwen3-4B 模型）。请重新运行脚本。' }

# ---------- 5. 放到正确位置 ----------
if (Test-Path -LiteralPath $packDir) {
  if (-not $Force) {
    $replace = Box "已存在「词屿离线增强包」：`n$packDir`n`n用新下载的版本替换它吗？" 'YesNo' 'Question'
    if ($replace -ne 'Yes') { exit 0 }
  }
  Info '正在替换旧的增强包...'
  Remove-Item -LiteralPath $packDir -Recurse -Force
}
Move-Item -LiteralPath $stage -Destination $packDir
Ok "增强包已放到：$packDir"

# ---------- 6. 清理 ----------
Remove-Item -LiteralPath $joined -Force -ErrorAction SilentlyContinue
if (-not $PartsDir) {
  foreach ($part in $PARTS) { Remove-Item -LiteralPath (Join-Path $work $part.Name) -Force -ErrorAction SilentlyContinue }
}
try { Remove-Item -LiteralPath $work -Force -ErrorAction SilentlyContinue } catch {}

Write-Host ''
Ok '全部完成。重新打开词屿后，设置里的本地 AI 伴学 / 自由对话 / 离线翻译就可以用了。'
if (-not $NoLaunch) {
  $open = Box "部署完成！`n`n增强包位置：`n$packDir`n`n现在打开词屿吗？" 'YesNo' 'Question'
  if ($open -eq 'Yes') {
    Start-Process -FilePath (Join-Path $app 'WordIsle.exe')
    Write-Host '  已启动词屿。' -ForegroundColor Green
  }
}
Write-Host ''
