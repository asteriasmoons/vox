declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
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

export {};
