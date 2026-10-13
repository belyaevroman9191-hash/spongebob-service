(() => {
    const canvas = document.getElementById("matrix");
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZアカサタナハマヤラワ<>/\\[]{}$#@%";
    let w, h, size, cols, streams, last = 0;

    function setup() {
        const dpr = Math.min(devicePixelRatio || 1, 2);
        w = innerWidth;
        h = innerHeight;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Denser columns so the Matrix reads clearly across the whole screen.
        size = Math.max(12, Math.min(18, Math.round(w / 92)));
        cols = Math.ceil(w / size);

        streams = Array.from({ length: cols }, (_, i) => ({
            x: i * size + size / 2,
            y: Math.random() * h - h,
            speed: 1.8 + Math.random() * 3.2,
            length: 12 + Math.floor(Math.random() * 30),
            active: Math.random() > .045,
            alpha: .30 + Math.random() * .38,
            phase: Math.random() * Math.PI * 2
        }));

        ctx.font = `500 ${size}px "JetBrains Mono", monospace`;
    }

    function frame(t) {
        const dt = Math.min(40, t - last || 16);
        last = t;

        ctx.clearRect(0, 0, w, h);
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.font = `500 ${size}px "JetBrains Mono", monospace`;

        for (const s of streams) {
            if (!s.active) {
                if (Math.random() < .012) s.active = true;
                continue;
            }

            const headY = s.y;
            const pulse = .88 + Math.sin(t * .004 + s.phase) * .12;

            for (let j = 0; j < s.length; j++) {
                const y = headY - j * size;
                if (y < -size || y > h + size) continue;

                const fade = Math.pow(1 - j / s.length, .72);
                const flicker = .72 + Math.random() * .28;
                const a = Math.max(.045, fade * s.alpha * flicker * pulse);
                const ch = chars[(Math.random() * chars.length) | 0];

                if (j === 0) {
                    ctx.fillStyle = `rgba(255,255,225,${Math.min(1, a + .35)})`;
                    ctx.shadowColor = "rgba(255,225,0,1)";
                    ctx.shadowBlur = 12;
                } else if (j < 3) {
                    ctx.fillStyle = `rgba(255,239,90,${Math.min(.9, a + .12)})`;
                    ctx.shadowColor = "rgba(255,225,0,.72)";
                    ctx.shadowBlur = 6;
                } else {
                    ctx.fillStyle = `rgba(255,220,0,${a})`;
                    ctx.shadowColor = "rgba(255,215,0,.38)";
                    ctx.shadowBlur = 3;
                }

                ctx.fillText(ch, s.x, y);
            }

            ctx.shadowBlur = 0;
            s.y += s.speed * (dt / 16.67);

            if (s.y - s.length * size > h) {
                s.y = -Math.random() * h * .8;
                s.speed = 1.8 + Math.random() * 3.2;
                s.length = 12 + Math.floor(Math.random() * 30);
                s.alpha = .30 + Math.random() * .38;
            }
        }

        requestAnimationFrame(frame);
    }

    addEventListener("resize", setup, { passive: true });
    setup();
    requestAnimationFrame(frame);
})();
