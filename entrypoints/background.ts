import type { CategoryNode } from '@/utils/categories';
import { request } from '@/utils/request';
import { categoryTreeStorage } from '@/utils/storage';

type CategoryType = 'l1' | 'l2';

const ROOT_MENU_ID = 'zmark:add';
const MENU_ID_PREFIX = 'zmark:category';
const MENU_CONTEXTS: ['page', 'link'] = ['page', 'link'];

function getCategoryMenuId(categoryType: CategoryType, categoryId: number) {
  return `${MENU_ID_PREFIX}:${categoryType}:${categoryId}`;
}

function parseCategoryMenuId(menuItemId: string): { categoryType: CategoryType; categoryId: number } | null {
  const [prefix, categoryType, categoryId] = menuItemId.split(':').slice(1);

  if (prefix !== 'category' || (categoryType !== 'l1' && categoryType !== 'l2')) {
    return null;
  }

  const parsedCategoryId = Number(categoryId);

  if (!Number.isInteger(parsedCategoryId)) {
    return null;
  }

  return {
    categoryType,
    categoryId: parsedCategoryId,
  };
}

async function showNotification(title: string, message: string) {
  await browser.notifications.create({
    type: 'basic',
    iconUrl: browser.runtime.getURL('/icon/128.png'),
    title,
    message,
  });
}

async function rebuildContextMenus(categories: CategoryNode[]) {
  await browser.contextMenus.removeAll();

  if (!categories.length) {
    return;
  }

  await browser.contextMenus.create({
    id: ROOT_MENU_ID,
    title: '添加到 ZMark',
    contexts: MENU_CONTEXTS,
  });

  for (const category of categories) {
    const parentMenuId = getCategoryMenuId('l1', category.id);

    await browser.contextMenus.create({
      id: parentMenuId,
      parentId: ROOT_MENU_ID,
      title: category.name,
      contexts: MENU_CONTEXTS,
    });

    for (const child of category.children) {
      await browser.contextMenus.create({
        id: getCategoryMenuId('l2', child.id),
        parentId: parentMenuId,
        title: child.name,
        contexts: MENU_CONTEXTS,
      });
    }
  }
}

async function getActiveTabForWindow(windowId?: number) {
  const tabs = await browser.tabs.query({
    active: true,
    windowId,
  });

  return tabs[0] ?? null;
}

async function addCurrentPageToCategory(categoryType: CategoryType, categoryId: number, windowId?: number) {
  const activeTab = await getActiveTabForWindow(windowId);
  const url = activeTab?.url?.trim() ?? '';
  const title = activeTab?.title?.trim() ?? '';

  if (!url) {
    throw new Error('读取当前页面地址失败');
  }

  await request('/api/v1/add_link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      url,
      description: '',
      category_type: categoryType,
      category_id: categoryId,
    }),
  });

  return title || url;
}

export default defineBackground(() => {
  console.log('Background ready', { id: browser.runtime.id });

  void categoryTreeStorage.getValue().then(rebuildContextMenus);

  categoryTreeStorage.watch((categories) => {
    void rebuildContextMenus(categories);
  });

  browser.runtime.onInstalled.addListener(() => {
    void categoryTreeStorage.getValue().then(rebuildContextMenus);
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (typeof info.menuItemId !== 'string') {
      return;
    }

    const target = parseCategoryMenuId(info.menuItemId);

    if (!target) {
      return;
    }

    void addCurrentPageToCategory(target.categoryType, target.categoryId, tab?.windowId)
      .then((pageTitle) => showNotification('ZMark', `添加成功：${pageTitle}`))
      .catch((error) => showNotification('ZMark', error instanceof Error ? `添加失败：${error.message}` : '添加失败'));
  });
});
