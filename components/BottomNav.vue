<script lang="ts" setup>
import { BookmarkOutline, AddCircleOutline, SyncOutline, SettingsOutline } from '@vicons/ionicons5';

type NavItem = {
  key: string;
  label: string;
  icon: Component;
  active?: boolean;
};

const items: NavItem[] = [
  { key: 'bookmarks', label: '书签', icon: BookmarkOutline, active: true },
  { key: 'add', label: '添加', icon: AddCircleOutline },
  { key: 'sync', label: '同步', icon: SyncOutline },
  { key: 'settings', label: '设置', icon: SettingsOutline },
];
</script>

<template>
  <nav class="border-t border-slate-200 bg-white px-2 py-1 shadow-[0_-4px_12px_rgba(15,23,42,0.04)]">
    <ul class="grid grid-cols-4 gap-1">
      <li v-for="item in items" :key="item.key">
        <button
          type="button"
          class="flex w-full flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs transition-colors"
          :class="item.active ? 'bg-emerald-50 text-emerald-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'"
        >
          <n-icon :component="item.icon" size="18" />
          <span>{{ item.label }}</span>
        </button>
      </li>
    </ul>
  </nav>
</template>
