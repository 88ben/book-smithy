import type { BookSmithyAPI } from '../preload/preload';

declare global {
  interface Window {
    bookSmithy: BookSmithyAPI;
  }
}
