(() => {
    const menu = document.querySelector('.link-list');
    if (!menu) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (prefersReduced.matches) return;

    let active = 0;
    const MAX_ACTIVE = 2;

    const rand = (min, max) => min + Math.random() * (max - min);

    function makePath(x1, y1, x2, y2, roughness = 12, points = 8) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const result = [`M ${x1.toFixed(1)} ${y1.toFixed(1)}`];

        for (let i = 1; i < points; i++) {
            const t = i / points;
            const baseX = x1 + dx * t;
            const baseY = y1 + dy * t;
            const offset = (Math.random() - 0.5) * roughness * (1 - Math.abs(t - .5) * .35);
            result.push(`L ${(baseX + nx * offset).toFixed(1)} ${(baseY + ny * offset).toFixed(1)}`);
        }

        result.push(`L ${x2.toFixed(1)} ${y2.toFixed(1)}`);
        return result.join(' ');
    }

    function spawnLightning() {
        if (active >= MAX_ACTIVE || menu.clientWidth < 80 || menu.clientHeight < 60) return;

        const w = menu.clientWidth;
        const h = menu.clientHeight;
        const vertical = Math.random() > .42;

        // Keep the bolt inside the menu, but let it cross several menu rows.
        const x = vertical ? rand(w * .08, w * .92) : rand(w * .12, w * .82);
        const y = vertical ? rand(h * .08, h * .55) : rand(h * .12, h * .82);
        const length = vertical ? rand(42, Math.min(130, h * .42)) : rand(70, Math.min(190, w * .42));
        const angle = vertical ? rand(-22, 22) : rand(-10, 10);
        const radians = angle * Math.PI / 180;
        const x2 = x + Math.sin(radians) * length;
        const y2 = y + Math.cos(radians) * length;

        const width = 34;
        const height = Math.max(70, length + 30);
        const bolt = document.createElement('span');
        bolt.className = 'menu-lightning';
        bolt.setAttribute('aria-hidden', 'true');
        bolt.style.left = `${x - width / 2}px`;
        bolt.style.top = `${y - 15}px`;
        bolt.style.width = `${width}px`;
        bolt.style.height = `${height}px`;
        bolt.style.setProperty('--rotation', `${angle}deg`);
        bolt.style.setProperty('--scale', `${rand(.72, 1.12).toFixed(2)}`);
        bolt.style.setProperty('--life', `${rand(.48, .78).toFixed(2)}s`);

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.classList.add('lightning-svg');

        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const glow = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        glow.setAttribute('id', `lg-${Date.now()}-${Math.random()}`);
        glow.setAttribute('x', '-100%'); glow.setAttribute('y', '-100%');
        glow.setAttribute('width', '300%'); glow.setAttribute('height', '300%');
        const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
        blur.setAttribute('stdDeviation', '2.8');
        glow.appendChild(blur); defs.appendChild(glow); svg.appendChild(defs);

        const originX = width / 2;
        const originY = 5;
        const endX = width / 2 + rand(-7, 7);
        const endY = height - 5;
        const pathData = makePath(originX, originY, endX, endY, rand(9, 17), Math.floor(rand(7, 11)));

        // Soft aura behind the core.
        const aura = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        aura.setAttribute('d', pathData);
        aura.setAttribute('class', 'lightning-aura');
        aura.setAttribute('filter', `url(#${glow.getAttribute('id')})`);
        svg.appendChild(aura);

        // Two slightly different cores make the discharge flicker naturally.
        const core = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        core.setAttribute('d', pathData);
        core.setAttribute('class', 'lightning-core');
        svg.appendChild(core);

        const hot = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hot.setAttribute('d', pathData);
        hot.setAttribute('class', 'lightning-hot');
        svg.appendChild(hot);

        // Small random side branches.
        const branchCount = Math.random() > .35 ? Math.floor(rand(1, 4)) : 1;
        for (let i = 0; i < branchCount; i++) {
            const by = rand(height * .18, height * .82);
            const side = Math.random() > .5 ? 1 : -1;
            const bx = width / 2 + rand(-5, 5);
            const branchLen = rand(9, 23);
            const branch = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            branch.setAttribute('d', makePath(bx, by, bx + side * branchLen, by + rand(-5, 8), 5, 4));
            branch.setAttribute('class', 'lightning-branch');
            svg.appendChild(branch);
        }

        bolt.appendChild(svg);
        active++;
        menu.appendChild(bolt);

        const remove = () => {
            bolt.remove();
            active = Math.max(0, active - 1);
        };
        bolt.addEventListener('animationend', remove, { once: true });
        window.setTimeout(remove, 1100);
    }

    function schedule() {
        window.setTimeout(() => {
            spawnLightning();
            // Bursts sometimes happen twice in quick succession.
            if (Math.random() > .68) window.setTimeout(spawnLightning, rand(90, 190));
            schedule();
        }, rand(900, 3000));
    }

    window.setTimeout(spawnLightning, 700);
    schedule();
})();
