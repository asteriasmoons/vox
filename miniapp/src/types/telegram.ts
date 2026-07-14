declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        isFullscreen?: boolean;
        platform?: string;
        safeAreaInset?: TelegramSafeAreaInset;
        contentSafeAreaInset?: TelegramSafeAreaInset;
        viewportHeight?: number;
        viewportStableHeight?: number;
        onEvent?: (eventType: string, eventHandler: () => void) => void;
        offEvent?: (eventType: string, eventHandler: () => void) => void;
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (handler: () => void) => void;
          offClick: (handler: () => void) => void;
        };
      };
    };
  }
}

interface TelegramSafeAreaInset {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export {};
