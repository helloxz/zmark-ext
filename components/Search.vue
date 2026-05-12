<script lang="ts" setup>
import { SearchOutline } from '@vicons/ionicons5';
import type { BookmarkLink, LinkApiItem } from '@/utils/links';
import { getFaviconUrl, mapLink } from '@/utils/links';
import { request } from '@/utils/request';

const SEARCH_DELAY_MS = 300;
const SEARCH_MIN_KEYWORD_LENGTH = 2;
const SEARCH_MAX_RESULTS = 10;

const keyword = ref('');
const results = ref<BookmarkLink[]>([]);
const isSearching = ref(false);
const errorMessage = ref('');
const hasSearched = ref(false);

let searchTimer: ReturnType<typeof setTimeout> | null = null;
let activeController: AbortController | null = null;
const inputRef = ref<HTMLInputElement | null>(null);
const rootRef = ref<HTMLElement | null>(null);

function focus() {
  nextTick(() => {
    inputRef.value?.focus();
  });
}

defineExpose({ focus });

const trimmedKeyword = computed(() => keyword.value.trim());
const isPanelVisible = ref(false);
const shouldShowDropdown = computed(() => isPanelVisible.value && Boolean(trimmedKeyword.value));
const isKeywordLongEnough = computed(() => trimmedKeyword.value.length >= SEARCH_MIN_KEYWORD_LENGTH);

function openLink(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function resetResults() {
  results.value = [];
  errorMessage.value = '';
  hasSearched.value = false;
  isSearching.value = false;
}

function clearPendingSearch() {
  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }

  if (activeController) {
    activeController.abort();
    activeController = null;
  }
}

function clearSearch() {
  keyword.value = '';
  clearPendingSearch();
  resetResults();
  isPanelVisible.value = false;
}

function handleClickOutside(event: MouseEvent) {
  if (!rootRef.value) {
    return;
  }

  const target = event.target;

  if (target instanceof Node && !rootRef.value.contains(target)) {
    isPanelVisible.value = false;
  }
}

async function performSearch(searchKeyword: string) {
  activeController?.abort();

  const controller = new AbortController();
  activeController = controller;
  isSearching.value = true;
  errorMessage.value = '';

  try {
    const data = await request<LinkApiItem[]>('/api/v1/search_links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ keyword: searchKeyword }),
      signal: controller.signal,
    });

    if (trimmedKeyword.value !== searchKeyword) {
      return;
    }

    results.value = data.slice(0, SEARCH_MAX_RESULTS).map(item => mapLink(item));
    hasSearched.value = true;
  } catch (error) {
    if (controller.signal.aborted) {
      return;
    }

    results.value = [];
    errorMessage.value = error instanceof Error ? error.message : '搜索失败';
    hasSearched.value = true;
  } finally {
    if (activeController === controller) {
      activeController = null;
      isSearching.value = false;
    }
  }
}

watch(trimmedKeyword, (value) => {
  clearPendingSearch();

  if (!value) {
    resetResults();
    isPanelVisible.value = false;
    return;
  }

  isPanelVisible.value = true;

  if (value.length < SEARCH_MIN_KEYWORD_LENGTH) {
    resetResults();
    return;
  }

  searchTimer = setTimeout(() => {
    searchTimer = null;
    void performSearch(value);
  }, SEARCH_DELAY_MS);
});

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
});

onBeforeUnmount(() => {
  clearPendingSearch();
  document.removeEventListener('mousedown', handleClickOutside);
});
</script>

<template>
  <div ref="rootRef" class="relative z-50 isolate">
    <n-input
      ref="inputRef"
      v-model:value="keyword"
      clearable
      placeholder="输入书签关键词进行搜索"
      round
      size="large"
      @clear="clearSearch"
      @focus="trimmedKeyword && (isPanelVisible = true)"
    >
      <template #prefix>
        <n-icon :component="SearchOutline" class="text-slate-400" />
      </template>
    </n-input>

    <div
      v-if="shouldShowDropdown"
      class="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[999] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-300/30"
    >
      <div v-if="!isKeywordLongEnough" class="px-4 py-3 text-xs text-slate-500">
        至少输入 3 个字符后开始搜索
      </div>

      <div v-else-if="isSearching" class="flex items-center justify-center px-4 py-6">
        <n-spin size="small">
          <template #description>
            <span class="text-xs text-slate-500">正在搜索...</span>
          </template>
        </n-spin>
      </div>

      <div v-else-if="errorMessage" class="px-4 py-3 text-xs text-rose-500">
        {{ errorMessage }}
      </div>

      <div v-else-if="results.length" class="max-h-72 overflow-y-auto px-2 py-2">
        <button
          v-for="link in results"
          :key="link.id"
          type="button"
          class="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-sky-50/70"
          @click="openLink(link.url)"
        >
          <img :src="getFaviconUrl(link.url)" :alt="link.title" class="h-4 w-4 shrink-0 rounded-sm" loading="lazy">
          <span class="truncate text-sm font-medium text-slate-800">{{ link.title }}</span>
        </button>
      </div>

      <div v-else-if="hasSearched" class="px-4 py-3 text-xs text-slate-500">
        没有找到相关结果
      </div>
    </div>
  </div>
</template>
