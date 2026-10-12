(() => {
    const audio = document.getElementById("siteMusic");
    const player = document.querySelector(".music-player");
    const playButton = document.getElementById("musicPlay");
    const stopButton = document.getElementById("musicStop");
    const volume = document.getElementById("musicVolume");
    const status = document.getElementById("musicStatus");

    if (!audio || !player || !playButton || !stopButton || !volume) return;

    audio.volume = Number(volume.value);

    function setPlaying(playing) {
        player.classList.toggle("is-playing", playing);
        playButton.textContent = playing ? "Ⅱ" : "▶";
        playButton.setAttribute(
            "aria-label",
            playing ? "Поставить музыку на паузу" : "Включить музыку"
        );
        status.textContent = playing ? "AUDIO ONLINE" : "AUDIO OFFLINE";
    }

    async function startMusic() {
        try {
            await audio.play();
            setPlaying(true);
            return true;
        } catch {
            setPlaying(false);
            status.textContent = "CLICK TO START";
            return false;
        }
    }

    playButton.addEventListener("click", async (event) => {
        event.stopPropagation();

        if (audio.paused) {
            await startMusic();
        } else {
            audio.pause();
            setPlaying(false);
        }
    });

    stopButton.addEventListener("click", (event) => {
        event.stopPropagation();
        audio.pause();
        audio.currentTime = 0;
        setPlaying(false);
    });

    volume.addEventListener("input", () => {
        audio.volume = Number(volume.value);
    });

    audio.addEventListener("play", () => setPlaying(true));
    audio.addEventListener("pause", () => setPlaying(false));

    // Try to start with sound immediately.
    // Chrome/Edge/Safari may block unmuted autoplay until the visitor interacts.
    startMusic();

    const unlock = () => {
        if (audio.paused) startMusic();
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("keydown", unlock);
        window.removeEventListener("touchstart", unlock);
    };

    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
})();
