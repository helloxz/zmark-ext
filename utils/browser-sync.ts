import type { CategoryApiItem, CategoryNode } from '@/utils/categories';
import { ZMARK_BOOKMARKS_FOLDER_TITLE } from '@/utils/bookmark-sync-constants';
import { mapCategory } from '@/utils/categories';
import type { BookmarkLink, LinkApiItem } from '@/utils/links';
import { mapLink } from '@/utils/links';
import { request } from '@/utils/request';

type BookmarkTreeNode = {
  id: string;
  title: string;
  url?: string;
  children?: BookmarkTreeNode[];
  parentId?: string;
};

type SyncStats = {
  categories: number;
  links: number;
};

function getBookmarkBarNode(tree: BookmarkTreeNode[]): BookmarkTreeNode | null {
  const rootNode = tree[0];

  if (!rootNode?.children?.length) {
    return null;
  }

  return rootNode.children[0] ?? null;
}

function findChildFolderByTitle(parent: BookmarkTreeNode, title: string): BookmarkTreeNode | null {
  return parent.children?.find(child => !child.url && child.title === title) ?? null;
}

async function clearBookmarkFolder(folderId: string) {
  const children = await browser.bookmarks.getChildren(folderId);

  for (const child of children) {
    if (child.url) {
      await browser.bookmarks.remove(child.id);
      continue;
    }

    await browser.bookmarks.removeTree(child.id);
  }
}

async function getOrCreateZMarkRootFolder(): Promise<string> {
  const tree = await browser.bookmarks.getTree();
  const bookmarkBarNode = getBookmarkBarNode(tree as BookmarkTreeNode[]);

  if (!bookmarkBarNode) {
    throw new Error('未找到浏览器书签栏');
  }

  const existingFolder = findChildFolderByTitle(bookmarkBarNode, ZMARK_BOOKMARKS_FOLDER_TITLE);

  if (existingFolder) {
    await clearBookmarkFolder(existingFolder.id);
    return existingFolder.id;
  }

  const folder = await browser.bookmarks.create({
    parentId: bookmarkBarNode.id,
    title: ZMARK_BOOKMARKS_FOLDER_TITLE,
  });

  return folder.id;
}

async function fetchCategories() {
  const result = await request<CategoryApiItem[]>('/api/v1/categories');

  return result
    .slice()
    .sort((left, right) => left.sort_order - right.sort_order)
    .map(item => mapCategory(item));
}

async function fetchCategoryLinks(categoryType: 'l1' | 'l2', categoryId: number): Promise<BookmarkLink[]> {
  const result = await request<LinkApiItem[]>(`/api/v1/category_links?category_type=${categoryType}&category_id=${categoryId}`);

  return result
    .slice()
    .sort((left, right) => left.sort_order - right.sort_order)
    .map(item => mapLink(item));
}

async function createLinks(parentId: string, links: BookmarkLink[]) {
  for (const link of links) {
    await browser.bookmarks.create({
      parentId,
      title: link.title,
      url: link.url,
    });
  }
}

async function createCategoryFolder(parentId: string, categoryName: string) {
  const folder = await browser.bookmarks.create({
    parentId,
    title: categoryName,
  });

  return folder.id;
}

export async function syncZMarkToBrowser(): Promise<SyncStats> {
  const categories = await fetchCategories();

  if (!categories.length) {
    throw new Error('当前没有可同步的 ZMark 分类');
  }

  const zmarkRootFolderId = await getOrCreateZMarkRootFolder();
  let createdCategoryCount = 0;
  let createdLinkCount = 0;

  for (const category of categories) {
    const categoryLinks = await fetchCategoryLinks('l1', category.id);
    const childCategoryLinks = await Promise.all(
      category.children.map(async child => ({
        child,
        links: await fetchCategoryLinks('l2', child.id),
      })),
    );

    const hasChildLinks = childCategoryLinks.some(item => item.links.length > 0);

    if (!categoryLinks.length && !hasChildLinks) {
      continue;
    }

    const categoryFolderId = await createCategoryFolder(zmarkRootFolderId, category.name);
    createdCategoryCount += 1;

    if (categoryLinks.length) {
      await createLinks(categoryFolderId, categoryLinks);
      createdLinkCount += categoryLinks.length;
    }

    for (const item of childCategoryLinks) {
      if (!item.links.length) {
        continue;
      }

      const childFolderId = await createCategoryFolder(categoryFolderId, item.child.name);
      createdCategoryCount += 1;
      await createLinks(childFolderId, item.links);
      createdLinkCount += item.links.length;
    }
  }

  return {
    categories: createdCategoryCount,
    links: createdLinkCount,
  };
}
