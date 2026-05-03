<script lang="ts" setup>
import { CloudDoneOutline, RefreshOutline, SwapHorizontalOutline, TimeOutline } from '@vicons/ionicons5';
import BottomNav from '@/components/BottomNav.vue';
import PageTitle from '@/components/title.vue';

const logs = [
  { time: '今天 09:42', text: '从 ZMark 拉取 18 条新链接' },
  { time: '昨天 21:10', text: '浏览器新增 4 条链接已推送到云端' },
  { time: '昨天 20:58', text: '检测到 1 条同名链接，已按云端版本覆盖' },
];
</script>

<template>
  <div class="flex h-[600px] w-[380px] flex-col overflow-hidden bg-slate-50 text-slate-900">
    <PageTitle title="同步数据" />

    <main class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
      <div class="space-y-3">
        <section class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <n-icon :component="CloudDoneOutline" size="20" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-semibold text-slate-900">连接状态正常</div>
              <div class="mt-1 text-xs text-slate-500">API 已连通，最近一次同步成功完成。</div>
              <div class="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div class="rounded-xl bg-slate-50 px-3 py-2">
                  <div>云端链接</div>
                  <div class="mt-1 text-sm font-semibold text-slate-800">128</div>
                </div>
                <div class="rounded-xl bg-slate-50 px-3 py-2">
                  <div>本地链接</div>
                  <div class="mt-1 text-sm font-semibold text-slate-800">124</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <div class="mb-3 text-sm font-semibold text-slate-900">同步方向</div>
          <div class="grid grid-cols-1 gap-2">
            <button type="button" class="flex cursor-pointer items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-left text-sm text-emerald-700">
              <n-icon :component="SwapHorizontalOutline" size="18" />
              <span>双向同步</span>
            </button>
            <button type="button" class="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-sm text-slate-600">
              <n-icon :component="RefreshOutline" size="18" />
              <span>浏览器推送到 ZMark</span>
            </button>
            <button type="button" class="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-sm text-slate-600">
              <n-icon :component="CloudDoneOutline" size="18" />
              <span>ZMark 拉取到浏览器</span>
            </button>
          </div>
          <n-button class="mt-4" type="primary" block>立即同步</n-button>
        </section>

        <section class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <div class="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <n-icon :component="TimeOutline" size="16" class="text-slate-400" />
            <span>同步记录</span>
          </div>
          <div class="space-y-2">
            <div v-for="log in logs" :key="log.time + log.text" class="rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
              <div class="text-xs text-slate-400">{{ log.time }}</div>
              <div class="mt-1 text-slate-700">{{ log.text }}</div>
            </div>
          </div>
        </section>
      </div>
    </main>

    <BottomNav class="shrink-0" />
  </div>
</template>
