import { createRouter, createWebHashHistory } from 'vue-router';
import Add from '@/components/Add.vue';
import AIChat from '@/components/AIChat.vue';
import Edit from '@/components/Edit.vue';
import Home from '@/components/Home.vue';
import Settings from '@/components/Settings.vue';
import Sync from '@/components/Sync.vue';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'bookmarks',
      component: Home,
    },
    {
      path: '/add',
      name: 'add',
      component: Add,
    },
    {
      path: '/ai',
      name: 'ai',
      component: AIChat,
    },
    {
      path: '/edit/:id',
      name: 'edit',
      component: Edit,
    },
    {
      path: '/sync',
      name: 'sync',
      component: Sync,
    },
    {
      path: '/settings',
      name: 'settings',
      component: Settings,
    },
  ],
});

export default router;
