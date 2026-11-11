(function () {
  // Compare calendar dates in Korea; browser timezone and DST do not affect the countdown.
  function daysRemaining(expiresOn, now) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresOn || '')) return null;
    var parts = expiresOn.split('-').map(Number);
    var expiry = Date.UTC(parts[0], parts[1] - 1, parts[2]);
    if (new Date(expiry).toISOString().slice(0, 10) !== expiresOn) return null;
    var koreanDate = new Date(now.getTime() + 9 * 3600000);
    var today = Date.UTC(koreanDate.getUTCFullYear(), koreanDate.getUTCMonth(), koreanDate.getUTCDate());
    return (expiry - today) / 86400000;
  }
  function update(now) {
    var config = window.SITE;
    var days = daysRemaining(config.expiresOn, now || new Date());
    var threshold = Number(config.renewalNoticeDays);
    var active = days !== null && Number.isFinite(threshold) && threshold >= 0 && days <= threshold;
    document.querySelector('#renewal-badge').hidden = !active;
    document.querySelector('#renewal-notice').hidden = !active;
    document.querySelector('#start').setAttribute('aria-label', active ? 'Start — 사용 기간 연장 알림' : 'Start');
    if (!active) return;
    document.querySelector('#renewal-timing').textContent = days < 0 ? '사용 기간이 만료되었어요.' : days === 0 ? '오늘 사용 기간이 끝나요.' : '사용 기간이 ' + days + '일 남았어요.';
    document.querySelector('#renewal-link').href = config.renewalUrl || 'https://urluv.shop/';
  }
  window.RenewalNotice = { update: update, daysRemaining: daysRemaining };
})();
