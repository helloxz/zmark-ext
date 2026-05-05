<script lang="ts" setup>
import { CloudDownloadOutline, CloudUploadOutline } from '@vicons/ionicons5';
import BottomNav from '@/components/BottomNav.vue';
import PopupLayout from '@/components/PopupLayout.vue';
import PageTitle from '@/components/title.vue';
import { t } from '@/i18n';
import { mapBrowserBookmarksToZMark } from '@/utils/browser-bookmarks';
import { syncZMarkToBrowser } from '@/utils/browser-sync';
import { request } from '@/utils/request';

const message = useMessage();
const isBrowserToZMarkSyncing = ref(false);
const isZMarkToBrowserSyncing = ref(false);

function countImportedLinks(payload: ReturnType<typeof mapBrowserBookmarksToZMark>) {
  return payload.categories.reduce((total, category) => {
    const childLinks = (category.children ?? []).reduce((childTotal, child) => childTotal + child.links.length, 0);
    return total + category.links.length + childLinks;
  }, 0);
}

async function handleBrowserToZMarkSync() {
  isBrowserToZMarkSyncing.value = true;

  try {
    const bookmarkTree = await browser.bookmarks.getTree();
    const payload = mapBrowserBookmarksToZMark(bookmarkTree);

    if (!payload.categories.length) {
      message.warning('未读取到可同步的浏览器书签');
      return;
    }

    const formData = new FormData();
    const file = new File([
      JSON.stringify(payload),
    ], 'bookmarks.json', {
      type: 'application/json',
    });

    formData.append('file', file);

    await request('/api/v1/import_json', {
      method: 'POST',
      body: formData,
    });

    message.success(`浏览器书签已同步到 ZMark，共导入 ${countImportedLinks(payload)} 条链接`);
  } catch (error) {
    message.error(error instanceof Error ? t(error.message) : '同步失败');
  } finally {
    isBrowserToZMarkSyncing.value = false;
  }
}

async function handleZMarkToBrowserSync() {
  isZMarkToBrowserSyncing.value = true;

  try {
    const result = await syncZMarkToBrowser();
    message.success(`ZMark 已同步到浏览器，共写入 ${result.categories} 个分类、${result.links} 条链接`);
  } catch (error) {
    message.error(error instanceof Error ? error.message : '同步失败');
  } finally {
    isZMarkToBrowserSyncing.value = false;
  }
}
</script>

<template>
  <PopupLayout>
    <PageTitle title="同步数据" />

    <main class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
      <div class="space-y-3">
        <section class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
          <div class="font-semibold">温馨提示</div>
          <p class="mt-1 leading-6">此功能目前处于测试阶段，可能存在 BUG 或不稳定。</p>
        </section>

        <section class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <div class="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 class="text-sm font-semibold text-slate-900">浏览器书签同步到 ZMark</h2>
              <p class="mt-1 text-xs leading-5 text-slate-500">
                自动读取浏览器书签树，并转换成 ZMark 兼容的一级、二级分类结构后导入云端。
              </p>
            </div>
          </div>

          <n-button type="primary" block :loading="isBrowserToZMarkSyncing" @click="handleBrowserToZMarkSync">
            <template #icon>
              <n-icon :component="CloudUploadOutline" />
            </template>
            开始同步
          </n-button>
        </section>

        <section class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <div class="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 class="text-sm font-semibold text-slate-900">ZMark 书签同步到浏览器</h2>
              <p class="mt-1 text-xs leading-5 text-slate-500">
                将在览器书签栏下创建【ZMark书签】，然后写入当前 ZMark 的一级分类、二级分类和链接。
              </p>
            </div>
          </div>

          <n-button secondary type="primary" block :loading="isZMarkToBrowserSyncing" @click="handleZMarkToBrowserSync">
            <template #icon>
              <n-icon :component="CloudDownloadOutline" />
            </template>
            开始同步
          </n-button>
        </section>
      </div>
    </main>

    <BottomNav class="shrink-0" />
  </PopupLayout>
</template>
