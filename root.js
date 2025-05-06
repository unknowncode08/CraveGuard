let deferredPrompt;
const btn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;            // save the event
    btn.style.display = 'inline-block';
});

btn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            btn.textContent = 'Installed ✔';
        } else {
            // user dismissed prompt – open in browser instead
            window.location.href = 'mobile/';
        }
        deferredPrompt = null;
    } else {
        // iOS / already‑installed fallback
        window.location.href = 'mobile/';
    }
});
