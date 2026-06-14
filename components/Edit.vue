<script lang="ts" setup>
import BottomNav from '@/components/BottomNav.vue';
import PopupLayout from '@/components/PopupLayout.vue';
import PageTitle from '@/components/title.vue';
import { t } from '@/i18n';
import type { CategoryNode } from '@/utils/categories';
import type { LinkApiItem } from '@/utils/links';
import { mapLink } from '@/utils/links';
import { request } from '@/utils/request';
import { categoryTreeStorage } from '@/utils/storage';
import type { FormInst, FormRules } from 'naive-ui';
import { useRouter } from 'vue-router';

type CategoryType = 'l1' | 'l2';

type SelectOption = {
  label: string;
  value: number;
};

const router = useRouter();
const message = useMessage();
const formRef = ref<FormInst | null>(null);
const isLoading = ref(false);
const isSubmitting = ref(false);
const hasLoadedCategories = ref(false);
const categories = ref<CategoryNode[]>([]);
const linkId = ref<number>(0);
const hiddenFields = reactive({
  backupUrl: '',
  content: '',
  keywords: '',
  icon: '',
  sortOrder: 0,
});

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

function getErrorMessage(error: unknown, fallbackKey: string) {
  return error instanceof Error ? t(error.message) : t(fallbackKey);
}

function handleParentCategoryChange(value: number | null) {
  formValue.parentCategoryId = value;
  formValue.childCategoryId = null;
}

async function loadCachedCategories() {
  try {
    categories.value = await categoryTreeStorage.getValue();
  } catch {
    message.error('读取分类缓存失败');
  } finally {
    hasLoadedCategories.value = true;
  }
}

function initializeFormFromLink(link: LinkApiItem) {
  linkId.value = link.id;
  formValue.url = link.url;
  formValue.title = link.title;
  formValue.description = link.description;

  hiddenFields.backupUrl = link.backup_url;
  hiddenFields.content = link.content;
  hiddenFields.keywords = link.keywords;
  hiddenFields.icon = link.icon;
  hiddenFields.sortOrder = link.sort_order;

  if (link.category_type === 'l2') {
    const parentCategory = categories.value.find(cat =>
      cat.children.some(child => child.id === link.category_id)
    );

    if (parentCategory) {
      formValue.parentCategoryId = parentCategory.id;
      formValue.childCategoryId = link.category_id;
    }
  } else {
    formValue.parentCategoryId = link.category_id;
    formValue.childCategoryId = null;
  }
}

async function initializeForm() {
  const id = router.currentRoute.value.params.id;

  if (!id) {
    message.error('缺少链接 ID');
    router.back();
    return;
  }

  isLoading.value = true;

  try {
    const [link] = await Promise.all([
      request<LinkApiItem>(`/api/v1/get_link?id=${id}`),
      loadCachedCategories(),
    ]);

    initializeFormFromLink(link);
  } catch (error) {
    message.error(getErrorMessage(error, 'bookmark.links.load.failed'));
    router.back();
  } finally {
    isLoading.value = false;
  }
}

async function handleSubmit() {
  if (!linkId.value) {
    message.error('链接数据丢失');
    return;
  }

  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  const categoryType: CategoryType = formValue.childCategoryId === null ? 'l1' : 'l2';
  const categoryId = formValue.childCategoryId ?? formValue.parentCategoryId;

  if (categoryId === null) {
    message.error('请选择分类');
    return;
  }

  isSubmitting.value = true;

  try {
    await request('/api/v1/update_link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: linkId.value,
        title: formValue.title.trim(),
        url: formValue.url.trim(),
        description: formValue.description.trim(),
        category_type: categoryType,
        category_id: categoryId,
        backup_url: hiddenFields.backupUrl,
        content: hiddenFields.content,
        keywords: hiddenFields.keywords,
        icon: hiddenFields.icon,
        sort_order: hiddenFields.sortOrder,
      }),
    });

    message.success('更新链接成功');
    router.back();
  } catch (error) {
    message.error(getErrorMessage(error, 'bookmark.links.update.failed'));
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(() => {
  void initializeForm();
});
</script>

<template>
  <PopupLayout>
    <PageTitle title="编辑书签" />

    <main class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
      <div v-if="isLoading" class="flex min-h-56 items-center justify-center">
        <n-spin size="small">
          <template #description>
            <span class="text-xs text-slate-500">正在加载链接信息...</span>
          </template>
        </n-spin>
      </div>

      <div v-else class="space-y-3">
        <section class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
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
                <div v-if="hasLoadedCategories && !categories.length" class="mt-2 text-xs text-amber-600">
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
            <n-button block @click="router.back()">
              取消
            </n-button>
            <n-button block type="primary" :loading="isSubmitting" @click="handleSubmit">
              保存修改
            </n-button>
          </div>
        </section>
      </div>
    </main>

    <BottomNav class="shrink-0" />
  </PopupLayout>
</template>
