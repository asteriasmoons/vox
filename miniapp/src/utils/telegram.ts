export function initTelegramMiniApp(): void {
  const webApp = window.Telegram?.WebApp;
  webApp?.ready();
  webApp?.expand();
}
