<script lang="ts" setup>
import BottomNav from '@/components/BottomNav.vue';
import PageTitle from '@/components/title.vue';
import type { CategoryNode } from '@/utils/categories';
import { request } from '@/utils/request';
import { categoryTreeStorage } from '@/utils/storage';
import type { FormInst, FormRules } from 'naive-ui';

type CategoryType = 'l1' | 'l2';

type SelectOption = {
  label: string;
  value: number;
};

type LinkInfoResponse = {
  title: string;
  description: string;
};

const message = useMessage();
const formRef = ref<FormInst | null>(null);
const isSubmitting = ref(false);
const isInitializing = ref(false);
const isRecognizing = ref(false);
const categories = ref<CategoryNode[]>([]);
const formValue = reactive({
  url: '',
  title: '',
  description: '',
  parentCategoryId: null as number | null,
  childCategoryId: null as number | null,
});

const parentCategoryOptions = computed<SelectOption[]>(() => {
  return categories.value.map(category => ({
    label: category.name,
    value: category.id,
  }));
});

const selectedParentCategory = computed(() => {
  if (formValue.parentCategoryId === null) {
    return null;
  }

  return categories.value.find(category => category.id === formValue.parentCategoryId) ?? null;
});

const childCategoryOptions = computed<SelectOption[]>(() => {
  return (selectedParentCategory.value?.children ?? []).map(category => ({
    label: category.name,
    value: category.id,
  }));
});

const showChildCategorySelect = computed(() => childCategoryOptions.value.length > 0);

const rules: FormRules = {
  url: [
    {
      required: true,
      message: '请输入链接',
      trigger: ['input', 'blur'],
    },
  ],
  title: [
    {
      required: true,
      message: '请输入标题',
      trigger: ['input', 'blur'],
    },
  ],
  parentCategoryId: [
    {
      required: true,
      type: 'number',
      message: '请选择一级分类',
      trigger: ['change', 'blur'],
    },
  ],
};

function handleParentCategoryChange(value: number | null) {
  formValue.parentCategoryId = value;
  formValue.childCategoryId = null;
}

async function loadCurrentTab() {
  try {
    const [activeTab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    formValue.url = activeTab?.url ?? '';
    formValue.title = activeTab?.title ?? '';
  } catch {
    message.error('读取当前页面信息失败');
  }
}

async function loadCachedCategories() {
  try {
    categories.value = await categoryTreeStorage.getValue();

    if (!categories.value.length) {
      return;
    }

    const hasSelectedParent = categories.value.some(category => category.id === formValue.parentCategoryId);

    if (!hasSelectedParent) {
      formValue.parentCategoryId = categories.value[0].id;
      formValue.childCategoryId = null;
    }
  } catch {
    message.error('读取分类缓存失败');
  }
}

async function initializeForm() {
  isInitializing.value = true;

  try {
    await Promise.all([
      loadCurrentTab(),
      loadCachedCategories(),
    ]);
  } finally {
    isInitializing.value = false;
  }
}

async function handleSubmit() {
  if (!categories.value.length) {
    message.error('分类缓存为空，请先回首页加载分类');
    return;
  }

  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  const url = formValue.url.trim();
  const title = formValue.title.trim();
  const description = formValue.description.trim();

  const categoryType: CategoryType = formValue.childCategoryId === null ? 'l1' : 'l2';
  const categoryId = formValue.childCategoryId ?? formValue.parentCategoryId;

  isSubmitting.value = true;

  try {
    await request('/api/v1/add_link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        url,
        description,
        category_type: categoryType,
        category_id: categoryId,
      }),
    });

    message.success('添加链接成功');
  } catch (error) {
    message.error(error instanceof Error ? error.message : '添加链接失败');
  } finally {
    isSubmitting.value = false;
  }
}

async function handleRecognize() {
  const url = formValue.url.trim();

  if (!url) {
    return;
  }

  isRecognizing.value = true;

  try {
    const result = await request<LinkInfoResponse>('/api/v1/get_link_info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
      }),
    });

    if (!formValue.title.trim() && result.title) {
      formValue.title = result.title;
    }

    if (!formValue.description.trim() && result.description) {
      formValue.description = result.description;
    }
  } catch {
    // Ignore recognition failures and only restore button state.
  } finally {
    isRecognizing.value = false;
  }
}

onMounted(() => {
  void initializeForm();
});
</script>

<template>
  <div class="flex h-[600px] w-[380px] flex-col overflow-hidden bg-slate-50 text-slate-900">
    <PageTitle title="添加书签" />

    <main class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
      <div class="space-y-3">
        <section class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <div class="mb-4 flex items-center justify-end">
            <n-tag v-if="isInitializing" size="small" round type="info" :bordered="false">
              读取中
            </n-tag>
          </div>

          <n-form ref="formRef" :model="formValue" :rules="rules" label-placement="top" require-mark-placement="right-hanging">
            <n-form-item label="链接" path="url">
              <n-input v-model:value="formValue.url" placeholder="https://example.com" />
            </n-form-item>

            <n-form-item label="标题" path="title">
              <n-input v-model:value="formValue.title" placeholder="请输入标题" />
            </n-form-item>

            <n-form-item label="分类" path="parentCategoryId">
              <div class="w-full">
                <div class="grid grid-cols-2 gap-2">
                  <n-select
                    :value="formValue.parentCategoryId"
                    :options="parentCategoryOptions"
                    placeholder="选择一级分类"
                    @update:value="handleParentCategoryChange"
                  />
                  <n-select
                    v-if="showChildCategorySelect"
                    v-model:value="formValue.childCategoryId"
                    :options="childCategoryOptions"
                    placeholder="选择二级分类"
                    clearable
                  />
                </div>
                <div v-if="!categories.length" class="mt-2 text-xs text-amber-600">
                  分类缓存为空，请先回首页加载分类。
                </div>
              </div>
            </n-form-item>

            <n-form-item label="描述" class="mb-0">
                <n-input
                  v-model:value="formValue.description"
                  type="textarea"
                  :autosize="{ minRows: 3, maxRows: 3 }"
                  placeholder="选填"
                />
            </n-form-item>
          </n-form>

          <div class="grid grid-cols-2 gap-2">
            <n-button block :loading="isRecognizing" :disabled="!formValue.url.trim() || isSubmitting" @click="handleRecognize">
              自动识别
            </n-button>
            <n-button block type="primary" :loading="isSubmitting" :disabled="isRecognizing" @click="handleSubmit">
              添加链接
            </n-button>
          </div>
        </section>
      </div>
    </main>

    <BottomNav class="shrink-0" />
  </div>
</template>
