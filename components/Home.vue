<script lang="ts" setup>
import {
  AddOutline,
  OpenOutline,
  TrashOutline,
  ChevronDownOutline,
  ChevronForwardOutline,
  RefreshOutline,
  FolderOpenOutline,
} from '@vicons/ionicons5';
import BottomNav from '@/components/BottomNav.vue';
import { request } from '@/utils/request';
import type { CategoryApiItem, CategoryNode } from '@/utils/categories';
import { mapCategory } from '@/utils/categories';
import { baseUrlStorage, categoryTreeStorage, tokenStorage } from '@/utils/storage';

const toolbarActions = [
  { key: 'add', label: '添加', icon: AddOutline },
  { key: 'open', label: '打开', icon: OpenOutline },
  { key: 'delete', label: '删除', icon: TrashOutline },
];

const categories = ref<CategoryNode[]>([]);
const isLoading = ref(false);
const errorMessage = ref('');
const expandedCategoryId = ref<number | null>(null);

function isExpanded(categoryId: number) {
  return expandedCategoryId.value === categoryId;
}

function toggleCategory(categoryId: number) {
  expandedCategoryId.value = expandedCategoryId.value === categoryId ? null : categoryId;
}

async function loadCategories() {
  isLoading.value = true;
  errorMessage.value = '';

  try {
    const cachedCategories = await categoryTreeStorage.getValue();

    if (cachedCategories.length) {
      categories.value = cachedCategories;
      expandedCategoryId.value = null;
      return;
    }

    const [baseUrl, token] = await Promise.all([
      baseUrlStorage.getValue(),
      tokenStorage.getValue(),
    ]);

    if (!baseUrl.trim() || !token.trim()) {
      categories.value = [];
      expandedCategoryId.value = null;
      errorMessage.value = '请先在设置页填写 API 地址和 Token';
      return;
    }

    const result = await request<CategoryApiItem[]>('/api/v1/categories');
    const mappedCategories = result
      .slice()
      .sort((left, right) => left.sort_order - right.sort_order)
      .map(item => mapCategory(item));

    categories.value = mappedCategories;
    await categoryTreeStorage.setValue(mappedCategories);
    expandedCategoryId.value = null;
  } catch (error) {
    categories.value = [];
    expandedCategoryId.value = null;
    errorMessage.value = error instanceof Error ? error.message : '分类加载失败';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  void loadCategories();
});
</script>

<template>
  <div class="flex h-[600px] w-[380px] flex-col overflow-hidden bg-slate-50 text-slate-900">
    <header class="shrink-0 border-b border-slate-200 bg-white/95 px-4 pb-3 pt-4 backdrop-blur">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-lg font-semibold tracking-[0.2em] text-slate-900">ZMark</div>
        </div>
        <div class="flex items-center gap-2">
          <n-button
            v-for="action in toolbarActions"
            :key="action.key"
            quaternary
            circle
            type="default"
            :title="action.label"
          >
            <template #icon>
              <n-icon :component="action.icon" size="18" />
            </template>
          </n-button>
        </div>
      </div>
      <div class="mt-3">
        <n-input
          clearable
          placeholder="搜索链接、分类、站点"
          round
          size="large"
        />
      </div>
    </header>

    <main class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
      <section class="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80">
        <div class="mb-3 flex items-center justify-between px-1">
          <div>
            <h1 class="text-sm font-semibold text-slate-900">全部分类</h1>
          </div>
        </div>

        <div v-if="isLoading" class="flex min-h-56 items-center justify-center">
          <n-spin size="small">
            <template #description>
              <span class="text-xs text-slate-500">正在加载分类...</span>
            </template>
          </n-spin>
        </div>

        <div v-else-if="errorMessage" class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
          <div class="text-sm font-medium text-slate-700">分类暂时无法展示</div>
          <p class="mt-1 text-xs leading-5 text-slate-500">{{ errorMessage }}</p>
          <n-button class="mt-4" secondary type="primary" @click="loadCategories">
            <template #icon>
              <n-icon :component="RefreshOutline" />
            </template>
            重新加载
          </n-button>
        </div>

        <div v-else-if="!categories.length" class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
          <div class="text-sm font-medium text-slate-700">还没有分类</div>
          <p class="mt-1 text-xs leading-5 text-slate-500">分类创建后会优先显示在这里。</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="category in categories"
            :key="category.id"
            class="overflow-hidden rounded-2xl border transition-colors"
            :class="isExpanded(category.id) ? 'border-emerald-200 bg-emerald-50/70 shadow-sm' : 'border-slate-200 bg-slate-50/80'"
          >
            <button
              type="button"
              class="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left"
              @click="toggleCategory(category.id)"
            >
              <n-icon
                :component="isExpanded(category.id) ? ChevronDownOutline : ChevronForwardOutline"
                size="16"
                class="shrink-0 text-slate-400"
              />
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-amber-500 ring-1 ring-slate-200/80">
                <n-icon :component="FolderOpenOutline" size="16" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-medium text-slate-800">{{ category.name }}</div>
              </div>
            </button>

            <div v-if="isExpanded(category.id)" class="border-t border-white/80 bg-white/75 px-3 py-3">
              <div v-if="category.children.length" class="space-y-2">
                <div
                  v-for="child in category.children"
                  :key="child.id"
                  class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                >
                  <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-500">
                    <n-icon :component="FolderOpenOutline" size="14" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-sm font-medium text-slate-700">{{ child.name }}</div>
                    <div class="mt-0.5 text-xs text-slate-500">二级分类</div>
                  </div>
                </div>
              </div>

              <div v-else class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                该分类下暂无内容
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <BottomNav class="shrink-0" />
  </div>
</template>
