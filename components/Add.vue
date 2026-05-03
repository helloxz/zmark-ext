<script lang="ts" setup>
import BottomNav from '@/components/BottomNav.vue';
import PageTitle from '@/components/title.vue';

const categoryOptions = [
  { label: '开发 / Vue', value: 'dev-vue' },
  { label: '设计 / 灵感', value: 'design' },
  { label: '效率 / AI 工具', value: 'productivity-ai' },
];
</script>

<template>
  <div class="flex h-[600px] w-[380px] flex-col overflow-hidden bg-slate-50 text-slate-900">
    <PageTitle title="添加链接" />

    <main class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
      <div class="space-y-3">
        <section class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <div class="mb-4">
            <h2 class="text-sm font-semibold text-slate-900">基础信息</h2>
            <p class="mt-1 text-xs text-slate-500">先用表单布局模拟添加书签的操作路径。</p>
          </div>

          <div class="space-y-3">
            <div>
              <div class="mb-1.5 text-xs font-medium text-slate-600">标题</div>
              <n-input placeholder="例如：Vue 3 官方文档" />
            </div>

            <div>
              <div class="mb-1.5 text-xs font-medium text-slate-600">链接地址</div>
              <n-input placeholder="https://example.com" />
            </div>

            <div>
              <div class="mb-1.5 text-xs font-medium text-slate-600">所属分类</div>
              <n-select :options="categoryOptions" placeholder="选择一个分类" />
            </div>

            <div>
              <div class="mb-1.5 text-xs font-medium text-slate-600">备注</div>
              <n-input type="textarea" :autosize="{ minRows: 3, maxRows: 5 }" placeholder="记录这条链接的用途、关键词或稍后要处理的事项" />
            </div>
          </div>
        </section>

        <section class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-sm font-semibold text-slate-900">附加选项</h2>
            <n-tag size="small" round type="info" :bordered="false">模拟数据</n-tag>
          </div>

          <div class="space-y-3 text-sm text-slate-600">
            <div class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <span>保存后立即同步到 ZMark</span>
              <n-switch :default-value="true" />
            </div>
            <div class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <span>添加后在新标签页预览</span>
              <n-switch />
            </div>
            <div class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <span>标记为稍后阅读</span>
              <n-switch />
            </div>
          </div>
        </section>

        <section class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <div class="mb-3 text-sm font-semibold text-slate-900">推荐信息</div>
          <div class="space-y-2 text-xs text-slate-500">
            <div class="rounded-xl border border-dashed border-slate-200 px-3 py-2.5">建议自动提取网页标题，减少手动录入成本。</div>
            <div class="rounded-xl border border-dashed border-slate-200 px-3 py-2.5">后续可以支持从当前标签页一键带入 URL 和标题。</div>
          </div>
          <n-button class="mt-4" type="primary" block>保存链接</n-button>
        </section>
      </div>
    </main>

    <BottomNav class="shrink-0" />
  </div>
</template>
