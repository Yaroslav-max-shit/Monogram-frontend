/// <reference types="vite/client" />

declare module 'canvas-confetti' {
  function confetti(options?: {
    particleCount?: number;
    spread?: number;
    origin?: { x?: number; y?: number };
    colors?: string[];
    [key: string]: any;
  }): void;
  export default confetti;
}
