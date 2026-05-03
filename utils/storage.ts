import { storage } from '#imports';
import type { CategoryNode } from '@/utils/categories';

export const baseUrlStorage = storage.defineItem<string>('local:BASE_URL', {
  fallback: '',
});

export const tokenStorage = storage.defineItem<string>('local:TOKEN', {
  fallback: '',
});

export const categoryTreeStorage = storage.defineItem<CategoryNode[]>('local:CATEGORY_TREE', {
  fallback: [],
});
