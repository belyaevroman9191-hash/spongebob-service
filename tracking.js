(() => {
  const params = new URLSearchParams(location.search);
  const source = params.get('source') || params.get('utm_source') || '';
  const device = (() => {
    const ua = navigator.userAgent || '';
    if (/ipad|tablet|playbook|silk/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) return 'tablet';
    if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(ua)) return 'mobile';
    return ua ? 'desktop' : 'other';
  })();

  const baseData = () => ({
    source,
    device,
    pageUrl: location.href,
    path: location.pathname,
    title: document.title
  });

  const send = (payload) => {
    const body = JSON.stringify({ ...baseData(), ...payload });
    try {
      if (navigator.sendBeacon) {
        const sent = navigator.sendBeacon('/api/event', new Blob([body], { type: 'application/json' }));
        if (sent) return;
      }
    } catch {}
    fetch('/api/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true
    }).catch(() => {});
  };

  const tgUser = () => {
    try {
      const u = window.Telegram?.WebApp?.initDataUnsafe?.user;
      if (u) return {
        telegramUsername: u.username || null,
        telegramName: [u.first_name, u.last_name].filter(Boolean).join(' ') || null
      };
    } catch {}
    // This query parameter is only a supplied value, not verified Telegram identity.
    const p = new URLSearchParams(location.search);
    return p.get('tg_username') ? { telegramUsername: p.get('tg_username') } : {};
  };

  send({ type: 'page_view', ...tgUser() });

  document.addEventListener('click', (event) => {
    const a = event.target.closest?.('.link-item');
    if (!a) return;
    send({
      type: 'link_click',
      linkId: a.dataset.linkId || '',
      title: a.querySelector('strong')?.textContent?.trim() || '',
      href: a.href,
      ...tgUser()
    });
  }, { passive: true });
})();
