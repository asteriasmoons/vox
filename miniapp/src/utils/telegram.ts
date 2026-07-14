export function initTelegramMiniApp(): void {
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return;

  const applyTelegramLayout = () => {
    const root = document.documentElement;
    const safeArea = webApp.safeAreaInset ?? {};
    const contentSafeArea = webApp.contentSafeAreaInset ?? {};
    const platform = webApp.platform ?? '';
    const isMobileTelegram = platform === 'ios' || platform === 'android';
    const topInset = Math.max(contentSafeArea.top ?? 0, safeArea.top ?? 0);

    root.classList.add('telegram-miniapp');
    root.style.setProperty('--vox-tg-safe-top', `${topInset}px`);
    root.style.setProperty('--vox-tg-safe-right', `${Math.max(contentSafeArea.right ?? 0, safeArea.right ?? 0)}px`);
    root.style.setProperty('--vox-tg-safe-bottom', `${Math.max(contentSafeArea.bottom ?? 0, safeArea.bottom ?? 0)}px`);
    root.style.setProperty('--vox-tg-safe-left', `${Math.max(contentSafeArea.left ?? 0, safeArea.left ?? 0)}px`);
    root.style.setProperty('--vox-tg-viewport-height', `${webApp.viewportStableHeight || webApp.viewportHeight || window.innerHeight}px`);

    // Telegram can report a partial top inset while still drawing the floating
    // Close/menu chrome over channel-list launches. Reserve the full chrome zone
    // whenever mobile Telegram is not in fullscreen.
    root.style.setProperty('--vox-tg-chrome-top-fallback', isMobileTelegram && !webApp.isFullscreen ? '124px' : '0px');
  };

  applyTelegramLayout();
  webApp.ready();
  webApp.expand();

  webApp.onEvent?.('viewportChanged', applyTelegramLayout);
  webApp.onEvent?.('safeAreaChanged', applyTelegramLayout);
  webApp.onEvent?.('contentSafeAreaChanged', applyTelegramLayout);
  webApp.onEvent?.('fullscreenChanged', applyTelegramLayout);
}
