// Global type declarations for React Native environment

// Extend Window interface for web compatibility
declare global {
  interface Window {
    alert: (message: string) => void;
    confirm: (message: string) => boolean;
    prompt: (message: string, defaultValue?: string) => string | null;
    google: any;
  }
  
  const window: Window;
  const alert: (message: string) => void;
  const confirm: (message: string) => boolean;

  // Navigator extensions
  interface Navigator {
    product?: string;
    geolocation?: {
      getCurrentPosition: (
        success: (position: any) => void,
        error?: (error: any) => void,
        options?: any
      ) => void;
    };
  }
}

export {};
