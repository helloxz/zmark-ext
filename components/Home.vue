<script lang="ts" setup>
import {
  AddOutline,
  OpenOutline,
  TrashOutline,
  ChevronDownOutline,
  ChevronForwardOutline,
  FolderOpenOutline,
  LinkOutline,
  Ellipse,
} from '@vicons/ionicons5';
import BottomNav from '@/components/BottomNav.vue';

type BookmarkItem = {
  title: string;
  url: string;
};

type BookmarkCategory = {
  name: string;
  expanded?: boolean;
  children?: BookmarkCategory[];
  links?: BookmarkItem[];
};

const toolbarActions = [
  { key: 'add', label: '添加', icon: AddOutline },
  { key: 'open', label: '打开', icon: OpenOutline },
  { key: 'delete', label: '删除', icon: TrashOutline },
];

const bookmarkTree: BookmarkCategory[] = [
  {
    name: '开发',
    expanded: true,
    children: [
      {
        name: 'Vue',
        expanded: true,
        links: [
          { title: 'Vue.js', url: 'https://vuejs.org/' },
          { title: 'Naive UI', url: 'https://www.naiveui.com/' },
          { title: 'WXT', url: 'https://wxt.dev/' },
        ],
      },
      {
        name: '工具链',
        links: [
          { title: 'Vite', url: 'https://vite.dev/' },
          { title: 'TypeScript', url: 'https://www.typescriptlang.org/' },
        ],
      },
    ],
  },
  {
    name: '设计',
    expanded: true,
    links: [
      { title: 'Dribbble', url: 'https://dribbble.com/' },
      { title: 'Mobbin', url: 'https://mobbin.com/' },
      { title: 'Pinterest', url: 'https://www.pinterest.com/' },
    ],
  },
  {
    name: '效率',
    children: [
      {
        name: 'AI 工具',
        expanded: true,
        links: [
          { title: 'ChatGPT', url: 'https://chat.openai.com/' },
          { title: 'Claude', url: 'https://claude.ai/' },
        ],
      },
      {
        name: '文档',
        links: [
          { title: 'Notion', url: 'https://www.notion.so/' },
          { title: '语雀', url: 'https://www.yuque.com/' },
        ],
      },
    ],
  },
];

function getHostname(url: string) {
  try {
    return new URL(url).hostname;
  }
  catch {
    return url;
  }
}
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
            <h1 class="text-sm font-semibold text-slate-900">全部书签</h1>
            <p class="mt-1 text-xs text-slate-500">先用模拟数据展示树形布局和滚动区域</p>
          </div>
          <n-tag size="small" round type="success" :bordered="false">
            24 条
          </n-tag>
        </div>

        <div class="space-y-2">
          <template v-for="category in bookmarkTree" :key="category.name">
            <div class="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5">
              <div class="flex items-center gap-2 text-sm font-medium text-slate-800">
                <n-icon :component="category.expanded ? ChevronDownOutline : ChevronForwardOutline" size="16" class="text-slate-400" />
                <n-icon :component="FolderOpenOutline" size="16" class="text-amber-500" />
                <span>{{ category.name }}</span>
              </div>

              <div class="mt-2 space-y-2 pl-5">
                <template v-for="child in category.children ?? []" :key="`${category.name}-${child.name}`">
                  <div class="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200/80">
                    <div class="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <n-icon :component="child.expanded ? ChevronDownOutline : ChevronForwardOutline" size="14" class="text-slate-400" />
                      <n-icon :component="FolderOpenOutline" size="14" class="text-sky-500" />
                      <span>{{ child.name }}</span>
                    </div>

                    <div v-if="child.links?.length" class="mt-2 space-y-2 pl-5">
                      <div
                        v-for="link in child.links"
                        :key="link.url"
                        class="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <n-icon :component="LinkOutline" size="14" class="mt-0.5 text-emerald-500" />
                        <div class="min-w-0 flex-1">
                          <div class="truncate text-sm font-medium text-slate-800">{{ link.title }}</div>
                          <div class="truncate text-xs text-slate-500">{{ getHostname(link.url) }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>

                <template v-if="category.links?.length">
                  <div
                    v-for="link in category.links"
                    :key="`${category.name}-${link.url}`"
                    class="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                  >
                    <n-icon :component="Ellipse" size="8" class="mt-1.5 text-slate-300" />
                    <n-icon :component="LinkOutline" size="14" class="mt-0.5 text-emerald-500" />
                    <div class="min-w-0 flex-1">
                      <div class="truncate text-sm font-medium text-slate-800">{{ link.title }}</div>
                      <div class="truncate text-xs text-slate-500">{{ getHostname(link.url) }}</div>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </template>
        </div>
      </section>
    </main>

    <BottomNav class="shrink-0" />
  </div>
</template>
