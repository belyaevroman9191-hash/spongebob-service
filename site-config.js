(async () => {
  try {
    const r = await fetch('/api/config', { cache: 'no-store' });
    if (!r.ok) return;
    const c = await r.json();

    if (c.siteName) {
      document.title = c.siteName;
      const brand = document.querySelector('.brand-name');
      if (brand) brand.innerHTML = String(c.siteName).replace(/\\b(SERVICE)\\b/i, '<b>$1</b>');
      document.querySelectorAll('.site-footer div').forEach(el => { el.textContent = c.siteName; });
    }

    const nav = document.querySelector('.link-list');
    const links = Array.isArray(c.links) ? c.links.filter(x => x && x.active !== false) : [];
    if (!nav) return;

    nav.innerHTML = links.map((l, index) => {
      const id = String(l.id || String(index + 1).padStart(2, '0'));
      const title = String(l.title || 'CHANNEL');
      const subtitle = String(l.subtitle || '');
      const icon = String(l.icon || '>');
      const href = String(l.url || '#');
      return `<a class="link-item" data-link-id="${escapeHtml(id)}" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">
        <div class="link-number">${String(index + 1).padStart(2, '0')}</div>
        <div class="link-icon">${escapeHtml(icon)}</div>
        <div class="link-copy"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(subtitle)}</span></div>
        <div class="link-arrow">↗</div>
      </a>`;
    }).join('') || '<div class="muted" style="padding:20px 0">КАНАЛЫ НЕ НАСТРОЕНЫ</div>';

    const counter = document.querySelector('.counter');
    if (counter) counter.innerHTML = String(links.length).padStart(2, '0') + '<small>CHANNELS</small>';

    // Tracking uses delegated clicks, so dynamically created links are tracked too.
    window.dispatchEvent(new CustomEvent('spongebob:config-loaded'));
  } catch (e) {
    console.error('Config load failed:', e);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  }
})();
