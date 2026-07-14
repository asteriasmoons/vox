export function initTelegramMiniApp(): void {
  const boot = (attempt = 0) => {
    const webApp = window.Telegram?.WebApp;

    if (!webApp) {
      if (attempt < 20) {
        window.setTimeout(() => boot(attempt + 1), 100);
      }

      return;
    }

    const applyTelegramLayout = () => {
      const root = document.documentElement;
      const safeArea = webApp.safeAreaInset ?? {};
      const contentSafeArea = webApp.contentSafeAreaInset ?? {};
      const topInset = Math.max(contentSafeArea.top ?? 0, safeArea.top ?? 0);
      const isSmallViewport = window.innerWidth <= 600;
      const chromeTopReserve = isSmallViewport && !webApp.isFullscreen ? 156 : 0;
      const shellTopOffset = Math.max(14, topInset + 14, chromeTopReserve);

      root.classList.add('telegram-miniapp');
      root.style.setProperty('--vox-tg-safe-top', `${topInset}px`);
      root.style.setProperty('--vox-tg-safe-right', `${Math.max(contentSafeArea.right ?? 0, safeArea.right ?? 0)}px`);
      root.style.setProperty('--vox-tg-safe-bottom', `${Math.max(contentSafeArea.bottom ?? 0, safeArea.bottom ?? 0)}px`);
      root.style.setProperty('--vox-tg-safe-left', `${Math.max(contentSafeArea.left ?? 0, safeArea.left ?? 0)}px`);
      root.style.setProperty('--vox-tg-viewport-height', `${webApp.viewportStableHeight || webApp.viewportHeight || window.innerHeight}px`);
      root.style.setProperty('--vox-shell-top-offset', `${shellTopOffset}px`);

      // Keep this value visible in devtools for launch-mode debugging.
      root.style.setProperty('--vox-tg-chrome-top-fallback', `${chromeTopReserve}px`);
    };

    applyTelegramLayout();
    webApp.ready();
    webApp.expand();

    webApp.onEvent?.('viewportChanged', applyTelegramLayout);
    webApp.onEvent?.('safeAreaChanged', applyTelegramLayout);
    webApp.onEvent?.('contentSafeAreaChanged', applyTelegramLayout);
    webApp.onEvent?.('fullscreenChanged', applyTelegramLayout);
    window.addEventListener('resize', applyTelegramLayout);
  };

  boot();
}
