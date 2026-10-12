(() => {
    const canvas = document.getElementById("matrix");
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZアカサタナハマヤラワ";
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

        // Wider spacing = real rain columns instead of solid green bars.
        size = Math.max(15, Math.min(21, Math.round(w / 72)));
        cols = Math.ceil(w / size);

        streams = Array.from({length: cols}, (_, i) => ({
            x: i * size + size / 2,
            y: Math.random() * h - h,
            speed: 1.45 + Math.random() * 2.55,
            length: 9 + Math.floor(Math.random() * 24),
            active: Math.random() > .13,
            alpha: .22 + Math.random() * .35
        }));

        ctx.font = `500 ${size}px "JetBrains Mono", monospace`;
    }

    function frame(t) {
        const dt = Math.min(40, t - last || 16);
        last = t;

        // Fade only the canvas, so the photograph remains untouched.
        ctx.clearRect(0, 0, w, h);
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.font = `500 ${size}px "JetBrains Mono", monospace`;

        for (const s of streams) {
            if (!s.active) {
                if (Math.random() < .004) s.active = true;
                continue;
            }

            const headY = s.y;

            for (let j = 0; j < s.length; j++) {
                const y = headY - j * size;
                if (y < -size || y > h + size) continue;

                // Bright head, then progressively darker characters.
                const fade = 1 - j / s.length;
                const flicker = .72 + Math.random() * .28;
                const a = Math.max(.025, fade * s.alpha * flicker);

                const ch = chars[(Math.random() * chars.length) | 0];

                if (j === 0) {
                    ctx.fillStyle = `rgba(225,255,235,${Math.min(.95, a + .32)})`;
                    ctx.shadowColor = "rgba(0,255,100,.9)";
                    ctx.shadowBlur = 9;
                } else {
                    ctx.fillStyle = `rgba(0,255,92,${a})`;
                    ctx.shadowColor = "rgba(0,255,92,.35)";
                    ctx.shadowBlur = 3;
                }

                ctx.fillText(ch, s.x, y);
            }

            ctx.shadowBlur = 0;

            s.y += s.speed * (dt / 16.67);

            if (s.y - s.length * size > h) {
                s.y = -Math.random() * h * .65;
                s.speed = 1.45 + Math.random() * 2.55;
                s.length = 9 + Math.floor(Math.random() * 24);
                s.alpha = .22 + Math.random() * .35;
            }
        }

        requestAnimationFrame(frame);
    }

    addEventListener("resize", setup, {passive:true});
    setup();
    requestAnimationFrame(frame);
})();
