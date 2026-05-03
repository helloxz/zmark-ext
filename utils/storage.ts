import { storage } from '#imports';

export const baseUrlStorage = storage.defineItem<string>('local:BASE_URL', {
  fallback: '',
});

export const tokenStorage = storage.defineItem<string>('local:TOKEN', {
  fallback: '',
});
