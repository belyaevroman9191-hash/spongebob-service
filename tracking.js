(() => {
  const send = (payload) => {
    try {
      navigator.sendBeacon('/api/event', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    } catch {
      fetch('/api/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true }).catch(() => {});
    }
  };

  const tgUser = () => {
    try {
      const u = window.Telegram?.WebApp?.initDataUnsafe?.user;
      if (u) return { telegramUsername: u.username || null, telegramName: [u.first_name, u.last_name].filter(Boolean).join(' ') || null };
    } catch {}
    const p = new URLSearchParams(location.search);
    return p.get('tg_username') ? { telegramUsername: p.get('tg_username') } : {};
  };

  send({ type: 'page_view', path: location.pathname, title: document.title, ...tgUser() });

  // Delegation makes this work for links generated later by the admin-controlled config.
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
