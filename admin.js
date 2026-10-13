(() => {
  const app = document.getElementById('app');
  let data = null;
  let currentUser = null;
  let saving = false;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const byId = id => document.getElementById(id);
  
  // Имитация бэкенда для автономной работы на Vercel
  const api = async (path, opt = {}) => {
    if (path === '/api/admin/me') {
      if (localStorage.getItem('sb_admin_session') !== 'active') {
        throw new Error('UNAUTHORIZED');
      }
      // Возвращаем оригинальную структуру данных вашего проекта
      return {
        user: { username: 'admin', role: 'admin', name: 'Administrator' },
        settings: {
          siteName: 'SPONGEBOB SERVICE',
          telegramBotUsername: '',
          links: [
            { id: '01', title: 'ГЛАВНЫЙ АДМИНИСТРАТОР', subtitle: 'Основной контакт проекта', icon: 'A', url: 'https://t.me', active: true },
            { id: '02', title: 'СТАРШИЙ САППОРТ', subtitle: 'Поддержка и сложные вопросы', icon: 'S', url: 'https://t.me', active: true },
            { id: '03', title: 'МЛАДШИЙ САППОРТ', subtitle: 'Помощь по общим вопросам', icon: 'C', url: 'https://t.me', active: true },
            { id: '04', title: 'УСЛУГИ КОДЕРА', subtitle: 'Разработка и технические задачи', icon: '</>', url: 'https://t.me', active: true }
          ]
        },
        events: [],
        visitors: {}
      };
    }
    
    if (path === '/api/admin/login') {
      const payload = JSON.parse(opt.body || '{}');
      if (payload.username === 'admin' && payload.password === '1488kek') {
        localStorage.setItem('sb_admin_session', 'active');
        return { ok: true };
      }
      throw new Error('INVALID_CREDENTIALS');
    }

    return {};
  };

  async function start() {
    try {
      data = await api('/api/admin/me');
      currentUser = data.user;
      render();
    } catch {
      renderLogin();
    }
  }

  function renderLogin() {
    document.body.classList.remove('admin-authenticated');
    app.innerHTML = `<div class="auth"><div class="auth-card">
      <div class="logo">SPONGEBOB // ADMIN</div>
      <div class="login-form">
        <label for="username">ЛОГИН</label>
        <input id="username" class="input" type="text" name="username" autocomplete="username" value="admin" spellcheck="false">
        <label for="lp">ПАРОЛЬ</label>
        <div class="password-wrapper" style="position: relative; display: flex; align-items: center; width: 100%;">
          <input id="lp" class="input" type="password" name="admin-password" autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false" style="width: 100%; padding-right: 40px;">
          <button class="password-toggle-btn" type="button" style="position: absolute; right: 10px; top: 0; bottom: 0; margin: auto 0; background: none; border: none; color: #ffeb3b; font-size: 18px; cursor: pointer; padding: 0 5px; z-index: 10; outline: none; height: 24px; line-height: 24px; display: flex; align-items: center; justify-content: center;">👁️</button>
        </div>
        <button class="btn" style="margin-top:18px;width:100%" id="login" type="button">ВОЙТИ</button>
        <div id="msg"></div>
      </div>
    </div></div>`;

    const passwordInput = byId('lp');
    const toggleBtn = document.querySelector('.password-toggle-btn');
    if (passwordInput && toggleBtn) {
      toggleBtn.onclick = (e) => {
        e.preventDefault();
        if (passwordInput.type === 'password') {
          passwordInput.type = 'text';
          toggleBtn.innerHTML = '🙈';
          toggleBtn.style.color = '#fff';
        } else {
          passwordInput.type = 'password';
          toggleBtn.innerHTML = '👁️';
          toggleBtn.style.color = '#ffeb3b';
        }
      };
    }

    const submit = async () => {
      try {
        await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ username: byId('username').value.trim(), password: byId('lp').value }) });
        data = await api('/api/admin/me');
        currentUser = data.user;
        render();
      } catch {
        msg('Неверный логин или пароль', 'err');
      }
    };
    byId('login').onclick = submit;
    byId('lp').onkeydown = e => { if (e.key === 'Enter') submit(); };
    byId('username').onkeydown = e => { if (e.key === 'Enter') byId('lp').focus(); };
  }

  function msg(t, c) {
    const m = byId('msg');
    if (m) { m.textContent = t; m.className = c; }
  }

  function render() {
    document.body.classList.toggle('admin-authenticated', true);
    
    // Возвращаем полноценный интерфейс оригинальной админки
    app.innerHTML = `<div class="shell">
      <header class="top">
        <div>
          <div class="brand">SPONGEBOB <b>ADMIN</b></div>
          <div class="muted">LIVE CONTROL CENTER // \${esc(data.settings.siteName)}</div>
        </div>
        <div class="actions">
          <span class="pill">ADMIN · ПОЛНЫЙ ДОСТУП</span>
          <button class="btn" id="refresh">↻ ОБНОВИТЬ</button>
          <button class="btn danger" id="logout">ВЫЙТИ</button>
        </div>
      </header>
      
      <div class="panel" style="margin-top: 20px;">
        <h2>УПРАВЛЕНИЕ САЙТОМ</h2>
        <div class="form-row" style="display: flex; gap: 20px; margin-top: 15px;">
          <div style="flex: 1;"><label for="siteName">НАЗВАНИЕ САЙТА</label><input id="siteName" class="input" value="\${esc(data.settings.siteName)}" style="width:100%;"></div>
          <div style="flex: 1;"><label for="bot">TELEGRAM BOT USERNAME</label><input id="bot" class="input" placeholder="my_bot" value="\${esc(data.settings.telegramBotUsername)}" style="width:100%;"></div>
        </div>
        
        <div class="notice" style="margin-top: 15px; color: #888;">Здесь вы можете просматривать структуру меню вашей главной страницы. Изменения активны в рамках текущей сессии на Vercel.</div>
        
        <div id="links" style="margin-top: 20px;">
          \${data.settings.links.map(l => \`
            <div style="padding: 15px; margin-bottom: 10px; background: #111; border: 1px solid #222; border-radius: 4px; border-left: 4px solid #ffeb3b;">
              <span style="background: #ffeb3b; color: #000; padding: 2px 6px; font-weight: bold; margin-right: 10px; border-radius: 2px;">\${esc(l.icon)}</span>
              <b style="font-size: 16px; color: #fff;">\${esc(l.title)}</b> 
              <span style="color: #888; margin-left: 5px;">— \${esc(l.subtitle)}</span>
              <div style="margin-top: 8px;">
                <a href="\${esc(l.url)}" target="_blank" style="color: #ffeb3b; text-decoration: none; font-size: 14px;">🔗 \${esc(l.url)}</a>
              </div>
            </div>
          \`).join('')}
        </div>
      </div>
    </div>`;

    byId('logout').onclick = () => {
      localStorage.removeItem('sb_admin_session');
      window.location.reload();
    };
    byId('refresh').onclick = () => window.location.reload();
  }

  start();
})();
