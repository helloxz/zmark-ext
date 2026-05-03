<script lang="ts" setup>
import BottomNav from '@/components/BottomNav.vue';
import PageTitle from '@/components/title.vue';
</script>

<template>
  <div class="flex h-[600px] w-[380px] flex-col overflow-hidden bg-slate-50 text-slate-900">
    <PageTitle title="API设置" />

    <main class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
      <div class="space-y-3">
        <section class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <div class="mb-4">
            <h2 class="text-sm font-semibold text-slate-900">ZMark 接入</h2>
            <p class="mt-1 text-xs text-slate-500">先填充设置页结构，后续再接真实保存逻辑。</p>
          </div>

          <div class="space-y-3">
            <div>
              <div class="mb-1.5 text-xs font-medium text-slate-600">API 地址</div>
              <n-input placeholder="https://zmark.example.com/api" />
            </div>
            <div>
              <div class="mb-1.5 text-xs font-medium text-slate-600">访问 Token</div>
              <n-input type="password" show-password-on="click" placeholder="输入访问令牌" />
            </div>
            <div class="flex gap-2">
              <n-button secondary type="primary">测试连接</n-button>
              <n-button type="primary">保存配置</n-button>
            </div>
          </div>
        </section>

        <section class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <div class="mb-3 text-sm font-semibold text-slate-900">同步偏好</div>
          <div class="space-y-3 text-sm text-slate-600">
            <div class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <span>打开插件时自动拉取最新数据</span>
              <n-switch :default-value="true" />
            </div>
            <div class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <span>新增书签后自动同步</span>
              <n-switch :default-value="true" />
            </div>
            <div class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <span>冲突时优先使用云端数据</span>
              <n-switch />
            </div>
          </div>
        </section>

        <section class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <div class="mb-3 text-sm font-semibold text-slate-900">本地状态</div>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="rounded-xl bg-slate-50 px-3 py-3">
              <div class="text-xs text-slate-400">缓存分类</div>
              <div class="mt-1 font-semibold text-slate-800">12 个</div>
            </div>
            <div class="rounded-xl bg-slate-50 px-3 py-3">
              <div class="text-xs text-slate-400">缓存链接</div>
              <div class="mt-1 font-semibold text-slate-800">124 条</div>
            </div>
          </div>
        </section>
      </div>
    </main>

    <BottomNav class="shrink-0" />
  </div>
</template>
