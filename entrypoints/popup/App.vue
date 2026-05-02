<script lang="ts" setup>
const checked = ref(true);
const inputValue = ref('Tailwind + Naive UI');

const progress = computed(() => (checked.value ? 88 : 42));
const statusText = computed(() =>
  checked.value ? '组件交互正常' : '可以继续切换测试',
);
</script>

<template>
  <div
    class="min-w-[360px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4 text-left text-slate-100"
  >
    <div class="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur">
      <p class="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
        UI Smoke Test
      </p>
      <h1 class="mt-2 text-2xl font-bold text-white">Popup 组件样式验证</h1>
      <p class="mt-2 text-sm leading-6 text-slate-300">
        这块区域用了 Tailwind 的渐变、圆角、阴影、边框和文字样式；下面的卡片和表单组件用于测试 Naive UI 是否正常渲染。
      </p>
    </div>

    <n-space vertical size="large">
      <n-card title="Naive UI 组件测试" size="small" :bordered="false" class="rounded-2xl">
        <n-space vertical>
          <n-alert type="success" :bordered="false">
            当前状态：{{ statusText }}
          </n-alert>

          <n-input v-model:value="inputValue" placeholder="输入点内容试试看" />

          <div class="flex items-center justify-between rounded-xl bg-slate-100/80 px-3 py-2 text-slate-800">
            <span class="text-sm font-medium">开关测试</span>
            <n-switch v-model:value="checked" />
          </div>

          <n-progress type="line" :percentage="progress" :indicator-placement="'inside'" processing />

          <div class="flex flex-wrap gap-2">
            <n-tag type="info" round>Naive UI</n-tag>
            <n-tag type="warning" round>TailwindCSS</n-tag>
            <span class="rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-semibold text-cyan-200">
              {{ inputValue || '等待输入内容' }}
            </span>
          </div>

          <n-space>
            <n-button type="primary">主按钮</n-button>
            <n-button secondary type="default">次按钮</n-button>
          </n-space>
        </n-space>
      </n-card>
    </n-space>
  </div>
</template>
