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
      const deviceTop = safeArea.top ?? 0;
      const contentTop = contentSafeArea.top ?? 0;

      // safeAreaInset.top  = device chrome (status bar / notch)
      // contentSafeAreaInset.top = Telegram's header BELOW the device chrome
      // They must be summed, not maxed, to clear both layers.
      const topInset = deviceTop + contentTop;
      const shellTopOffset = topInset + 14;

      root.classList.add('telegram-miniapp');
      root.style.setProperty('--vox-tg-safe-top', `${topInset}px`);
      root.style.setProperty('--vox-tg-safe-right', `${Math.max(contentSafeArea.right ?? 0, safeArea.right ?? 0)}px`);
      root.style.setProperty('--vox-tg-safe-bottom', `${Math.max(contentSafeArea.bottom ?? 0, safeArea.bottom ?? 0)}px`);
      root.style.setProperty('--vox-tg-safe-left', `${Math.max(contentSafeArea.left ?? 0, safeArea.left ?? 0)}px`);
      root.style.setProperty('--vox-tg-viewport-height', `${webApp.viewportStableHeight || webApp.viewportHeight || window.innerHeight}px`);
      root.style.setProperty('--vox-shell-top-offset', `${shellTopOffset}px`);
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
