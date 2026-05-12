<script lang="ts" setup>
import BottomNav from '@/components/BottomNav.vue';
import PopupLayout from '@/components/PopupLayout.vue';
import PageTitle from '@/components/title.vue';
import { baseUrlStorage, tokenStorage, categoryTreeStorage } from '@/utils/storage';

interface ApiResponse {
  code: number;
  msg: string;
  data: unknown;
}

const message = useMessage();
const baseUrl = ref('');
const token = ref('');
const isTesting = ref(false);
const isSaving = ref(false);
const isRemoving = ref(false);

function getInfoEndpoint(url: string) {
  return `${url.replace(/\/+$/, '')}/api/v1/info`;
}

async function loadSavedConfig() {
  try {
    const [savedBaseUrl, savedToken] = await Promise.all([
      baseUrlStorage.getValue(),
      tokenStorage.getValue(),
    ]);

    baseUrl.value = savedBaseUrl;
    token.value = savedToken;
  } catch {
    message.error('读取配置失败');
  }
}

async function handlePasteConfig() {
  try {
    const text = await navigator.clipboard.readText();
    const parts = text.split('|').map((item) => item.trim());

    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      message.error('格式不正确');
      return;
    }

    [baseUrl.value, token.value] = parts;
    message.success('已填充 API 信息');
  } catch {
    message.error('读取剪贴板失败');
  }
}

async function handleTestConnection() {
  if (!baseUrl.value.trim()) {
    message.error('请输入基础域名');
    return;
  }

  if (!token.value.trim()) {
    message.error('请输入 Token');
    return;
  }

  isTesting.value = true;

  try {
    const response = await fetch(getInfoEndpoint(baseUrl.value.trim()), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token.value.trim()}`,
      },
    });

    if (response.status !== 200) {
      const statusDetail = response.statusText ? ` ${response.statusText}` : '';
      message.error(`连接测试失败 (HTTP ${response.status}${statusDetail})`);
      return;
    }

    let result: ApiResponse | null = null;

    try {
      result = await response.json() as ApiResponse;
    } catch {
      message.error('响应格式不正确');
      return;
    }

    if (response.status === 200 && result.code === 200) {
      message.success('连接测试通过');
      return;
    }

    message.error(result.msg || '连接测试失败');
  } catch {
    message.error('请求失败，请检查地址或网络');
  } finally {
    isTesting.value = false;
  }
}

async function handleSaveConfig() {
  const trimmedBaseUrl = baseUrl.value.trim();
  const trimmedToken = token.value.trim();

  if (!trimmedBaseUrl) {
    message.error('请输入基础域名');
    return;
  }

  if (!trimmedToken) {
    message.error('请输入 Token');
    return;
  }

  isSaving.value = true;

  try {
    await Promise.all([
      baseUrlStorage.setValue(trimmedBaseUrl),
      tokenStorage.setValue(trimmedToken),
      categoryTreeStorage.setValue([]),
    ]);

    baseUrl.value = trimmedBaseUrl;
    token.value = trimmedToken;
    message.success('保存成功');
  } catch {
    message.error('保存失败');
  } finally {
    isSaving.value = false;
  }
}

async function handleRemoveConfig() {
  isRemoving.value = true;

  try {
    await Promise.all([
      baseUrlStorage.removeValue(),
      tokenStorage.removeValue(),
    ]);

    baseUrl.value = '';
    token.value = '';
    message.success('已移除配置');
  } catch {
    message.error('移除失败');
  } finally {
    isRemoving.value = false;
  }
}

onMounted(() => {
  void loadSavedConfig();
});
</script>

<template>
  <PopupLayout>
    <PageTitle title="API设置" />

    <main class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
      <div class="space-y-3">
        <section class="overflow-hidden rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 p-[1px] shadow-sm">
          <div class="rounded-[15px] bg-white/95 p-4 backdrop-blur">
            <div class="flex items-start gap-3">
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                <span class="text-base">i</span>
              </div>
              <div>
                <div class="text-sm font-semibold text-slate-900">如何获取 API 连接信息</div>
                <p class="mt-1 text-sm leading-6 text-slate-600">
                  您可以在【我的书签 - 点击右上角头像 - API Token下拉菜单】获取API连接信息。
                </p>
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <div class="mb-4">
            <h2 class="text-sm font-semibold text-slate-900">API信息</h2>
            <p class="mt-1 text-xs text-slate-500">先点测试，通过后再点保存。</p>
          </div>

          <div class="space-y-3">
            <div>
              <div class="mb-1.5 text-xs font-medium text-slate-600">基础域名</div>
              <n-input v-model:value="baseUrl" placeholder="https://cloud.zmark.app" />
            </div>
            <div>
              <div class="mb-1.5 text-xs font-medium text-slate-600">Token</div>
              <n-input v-model:value="token" type="password" show-password-on="click" placeholder="sk-xxx" />
            </div>
            <div class="flex gap-2">
              <n-button @click="handlePasteConfig">一键粘贴</n-button>
              <n-button :loading="isTesting" secondary type="primary" @click="handleTestConnection">测试</n-button>
              <n-button :loading="isSaving" type="primary" @click="handleSaveConfig">保存</n-button>
              <n-button :loading="isRemoving" secondary type="error" @click="handleRemoveConfig">移除</n-button>
            </div>
          </div>
        </section>
      </div>
    </main>

    <BottomNav class="shrink-0" />
  </PopupLayout>
</template>
