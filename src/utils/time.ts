import { createBackoff } from 'teslabot';

export const backoff = createBackoff({ onError: (e, f) => f > 3 && console.warn(e) });