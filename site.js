(function () {
  var cfg = window.SITE_CONFIG || {};

  // 年份
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  // 下载按钮
  var tip = document.getElementById('downloadTip');
  function showTip(msg) {
    if (!tip) return;
    tip.textContent = msg;
    tip.hidden = false;
  }
  function urlFor(key) {
    if (key === 'win') return cfg.winDownload || '';
    if (key === 'mac') return cfg.macDownload || '';
    if (key === 'repo') return cfg.github || '';
    return '';
  }
  document.querySelectorAll('[data-download]').forEach(function (el) {
    var url = urlFor(el.getAttribute('data-download'));
    if (url) {
      el.setAttribute('href', url);
      el.removeAttribute('aria-disabled');
      el.setAttribute('rel', 'noopener');
    } else {
      el.setAttribute('href', cfg.winDownloadFallback || '#download');
      el.setAttribute('aria-disabled', 'true');
    }
  });
  document.querySelectorAll('[data-download]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      var key = el.getAttribute('data-download');
      var url = urlFor(key);
      if (url) {
        // 直链走 GitHub Releases：点击后告诉用户正在下载什么
        if (key === 'win') showTip('正在从 GitHub Releases 下载安装包（约 127 MB）…');
        return;
      }
      e.preventDefault();
      if (key === 'mac') {
        showTip('macOS 安装包需要在 Mac 上构建，请查看「常见问题 → 有 macOS 版吗」。');
      } else {
        showTip('安装包直链暂不可用，正在打开 GitHub Releases 页面…');
        if (cfg.winDownloadFallback) window.open(cfg.winDownloadFallback, '_blank', 'noopener');
      }
    });
  });

  // 联系邮箱
  var mail = document.getElementById('mailLink');
  if (mail && cfg.email) {
    mail.href = 'mailto:' + cfg.email;
    mail.textContent = cfg.email;
    mail.hidden = false;
  }

  // 备案号
  var icpWrap = document.getElementById('icpWrap');
  var icp = document.getElementById('icp');
  if (icpWrap && icp && cfg.icp) {
    icp.textContent = cfg.icp;
    icpWrap.hidden = false;
  }

  // GitHub 仓库链接（页脚）
  var gh = document.getElementById('ghLink');
  if (gh && cfg.github) {
    gh.href = cfg.github;
    gh.hidden = false;
  }
})();
