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
import type { BookmarkLink, LinkApiItem } from '@/utils/links';
import { getFaviconUrl, mapLink } from '@/utils/links';
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
const expandedChildCategoryId = ref<number | null>(null);
const message = useMessage();
const categoryLinks = reactive<Record<number, BookmarkLink[]>>({});
const childCategoryLinks = reactive<Record<number, BookmarkLink[]>>({});
const loadingCategoryLinks = reactive<Record<number, boolean>>({});
const loadingChildCategoryLinks = reactive<Record<number, boolean>>({});
const categoryLinkErrors = reactive<Record<number, string>>({});
const childCategoryLinkErrors = reactive<Record<number, string>>({});
const selectedLinkIds = ref<number[]>([]);

const selectedLinkIdSet = computed(() => new Set(selectedLinkIds.value));
const selectedLinks = computed(() => {
  const allLinks = [
    ...Object.values(categoryLinks).flat(),
    ...Object.values(childCategoryLinks).flat(),
  ];

  return allLinks.filter(link => selectedLinkIdSet.value.has(link.id));
});

function isExpanded(categoryId: number) {
  return expandedCategoryId.value === categoryId;
}

function isChildExpanded(childCategoryId: number) {
  return expandedChildCategoryId.value === childCategoryId;
}

function hasLinkData(cache: Record<number, BookmarkLink[]>, categoryId: number) {
  return Object.hasOwn(cache, categoryId);
}

function getCategoryLinks(categoryId: number) {
  return categoryLinks[categoryId] ?? [];
}

function getChildCategoryLinks(categoryId: number) {
  return childCategoryLinks[categoryId] ?? [];
}

function isCategoryLinksLoading(categoryId: number) {
  return Boolean(loadingCategoryLinks[categoryId]);
}

function isChildCategoryLinksLoading(categoryId: number) {
  return Boolean(loadingChildCategoryLinks[categoryId]);
}

function getCategoryLinkError(categoryId: number) {
  return categoryLinkErrors[categoryId] ?? '';
}

function getChildCategoryLinkError(categoryId: number) {
  return childCategoryLinkErrors[categoryId] ?? '';
}

function isLinkSelected(linkId: number) {
  return selectedLinkIdSet.value.has(linkId);
}

function openLink(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

async function openSelectedLinks() {
  if (!selectedLinks.value.length) {
    message.warning('请先选择要打开的链接');
    return;
  }

  for (const link of selectedLinks.value) {
    await browser.tabs.create({ url: link.url, active: false });
  }
}

async function handleToolbarAction(actionKey: string) {
  if (actionKey === 'open') {
    await openSelectedLinks();
  }
}

function toggleLinkSelection(linkId: number, checked: boolean) {
  const nextSelectedIds = new Set(selectedLinkIds.value);

  if (checked) {
    nextSelectedIds.add(linkId);
  } else {
    nextSelectedIds.delete(linkId);
  }

  selectedLinkIds.value = [...nextSelectedIds];
}

async function fetchCategoryLinks(categoryType: 'l1' | 'l2', categoryId: number) {
  const result = await request<LinkApiItem[]>(`/api/v1/category_links?category_type=${categoryType}&category_id=${categoryId}`);

  return result
    .slice()
    .sort((left, right) => left.sort_order - right.sort_order)
    .map(item => mapLink(item));
}

async function ensureCategoryLinks(categoryId: number) {
  if (hasLinkData(categoryLinks, categoryId) || loadingCategoryLinks[categoryId]) {
    return;
  }

  loadingCategoryLinks[categoryId] = true;
  categoryLinkErrors[categoryId] = '';

  try {
    categoryLinks[categoryId] = await fetchCategoryLinks('l1', categoryId);
  } catch (error) {
    categoryLinkErrors[categoryId] = error instanceof Error ? error.message : '链接加载失败';
    message.error(categoryLinkErrors[categoryId]);
  } finally {
    loadingCategoryLinks[categoryId] = false;
  }
}

async function ensureChildCategoryLinks(categoryId: number) {
  if (hasLinkData(childCategoryLinks, categoryId) || loadingChildCategoryLinks[categoryId]) {
    return;
  }

  loadingChildCategoryLinks[categoryId] = true;
  childCategoryLinkErrors[categoryId] = '';

  try {
    childCategoryLinks[categoryId] = await fetchCategoryLinks('l2', categoryId);
  } catch (error) {
    childCategoryLinkErrors[categoryId] = error instanceof Error ? error.message : '链接加载失败';
    message.error(childCategoryLinkErrors[categoryId]);
  } finally {
    loadingChildCategoryLinks[categoryId] = false;
  }
}

async function toggleCategory(categoryId: number) {
  if (expandedCategoryId.value === categoryId) {
    expandedCategoryId.value = null;
    expandedChildCategoryId.value = null;
    return;
  }

  expandedCategoryId.value = categoryId;
  expandedChildCategoryId.value = null;
  await ensureCategoryLinks(categoryId);
}

async function toggleChildCategory(categoryId: number) {
  if (expandedChildCategoryId.value === categoryId) {
    expandedChildCategoryId.value = null;
    return;
  }

  expandedChildCategoryId.value = categoryId;
  await ensureChildCategoryLinks(categoryId);
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
            :title="action.key === 'open' ? '打开选中' : action.label"
            @click="handleToolbarAction(action.key)"
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
      <section>
        <div class="mb-3 flex items-center justify-between px-1">
          <div>
            <h1 class="text-base font-semibold text-slate-900">书签分类</h1>
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
            class="overflow-hidden rounded-2xl border bg-white transition-colors"
            :class="isExpanded(category.id) ? 'border-emerald-200 bg-emerald-50/40 shadow-sm' : 'border-slate-200'"
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

            <div v-if="isExpanded(category.id)" class="border-t border-slate-100 bg-slate-50/40 px-3 py-3">
              <div class="space-y-3">
                <div v-if="category.children.length" class="space-y-2">
                  <button
                    v-for="child in category.children"
                    :key="child.id"
                    type="button"
                    class="w-full cursor-pointer rounded-xl border border-slate-200 bg-white text-left transition-colors"
                    @click="toggleChildCategory(child.id)"
                  >
                    <div class="flex items-center gap-3 px-3 py-2.5">
                      <n-icon
                        :component="isChildExpanded(child.id) ? ChevronDownOutline : ChevronForwardOutline"
                        size="14"
                        class="shrink-0 text-slate-400"
                      />
                      <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-500">
                        <n-icon :component="FolderOpenOutline" size="14" />
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="truncate text-sm font-medium text-slate-700">{{ child.name }}</div>
                      </div>
                    </div>

                    <div v-if="isChildExpanded(child.id)" class="border-t border-slate-100 px-3 py-3">
                      <div v-if="isChildCategoryLinksLoading(child.id)" class="flex items-center justify-center py-4">
                        <n-spin size="small" />
                      </div>

                      <div v-else-if="getChildCategoryLinkError(child.id)" class="rounded-xl border border-dashed border-rose-200 bg-rose-50 px-3 py-4 text-center text-xs text-rose-500">
                        {{ getChildCategoryLinkError(child.id) }}
                      </div>

                      <div v-else-if="getChildCategoryLinks(child.id).length" class="space-y-2">
                        <div
                          v-for="link in getChildCategoryLinks(child.id)"
                          :key="link.id"
                          class="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-emerald-50/60"
                          :class="isLinkSelected(link.id) ? 'bg-emerald-50/80' : 'bg-slate-50/80'"
                        >
                          <n-checkbox
                            :checked="isLinkSelected(link.id)"
                            class="shrink-0"
                            @update:checked="toggleLinkSelection(link.id, $event)"
                          />
                          <img :src="getFaviconUrl(link.url)" :alt="link.title" class="h-4 w-4 shrink-0 rounded-sm" loading="lazy">
                          <button
                            type="button"
                            class="min-w-0 flex-1 cursor-pointer truncate text-left text-sm font-medium text-slate-800 hover:text-emerald-600"
                            @click.stop="openLink(link.url)"
                          >
                            {{ link.title }}
                          </button>
                        </div>
                      </div>

                      <div v-else class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                        该分类下暂无内容
                      </div>
                    </div>
                  </button>
                </div>

                <div v-if="isCategoryLinksLoading(category.id)" class="flex items-center justify-center py-4">
                  <n-spin size="small" />
                </div>

                <div v-else-if="getCategoryLinkError(category.id)" class="rounded-xl border border-dashed border-rose-200 bg-rose-50 px-3 py-4 text-center text-xs text-rose-500">
                  {{ getCategoryLinkError(category.id) }}
                </div>

                <div v-else-if="getCategoryLinks(category.id).length" class="space-y-2">
                  <div
                    v-for="link in getCategoryLinks(category.id)"
                    :key="link.id"
                    class="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-emerald-50/60"
                    :class="isLinkSelected(link.id) ? 'bg-emerald-50/80' : 'bg-white'"
                  >
                    <n-checkbox
                      :checked="isLinkSelected(link.id)"
                      class="shrink-0"
                      @update:checked="toggleLinkSelection(link.id, $event)"
                    />
                    <img :src="getFaviconUrl(link.url)" :alt="link.title" class="h-4 w-4 shrink-0 rounded-sm" loading="lazy">
                    <button
                      type="button"
                      class="min-w-0 flex-1 cursor-pointer truncate text-left text-sm font-medium text-slate-800 hover:text-emerald-600"
                      @click.stop="openLink(link.url)"
                    >
                      {{ link.title }}
                    </button>
                  </div>
                </div>

                <div
                  v-else-if="!category.children.length"
                  class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500"
                >
                  该分类下暂无内容
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <BottomNav class="shrink-0" />
  </div>
</template>
