import { defineConfig } from 'wxt';
// import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import tailwindcss from '@tailwindcss/vite'

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    permissions: ['clipboardRead', 'storage', 'tabs'],
    host_permissions: ['http://*/*', 'https://*/*'],
  },
  vite: () => ({
    plugins: [
      //vue(),
      tailwindcss(),
      AutoImport({
        imports: [
          'vue',
          {
            'naive-ui': [
              'useDialog',
              'useMessage',
              'useNotification',
              'useLoadingBar'
            ]
          }
        ]
      }),
      Components({
        resolvers: [NaiveUiResolver()]
      })
    ],
  }),
  modules: ['@wxt-dev/module-vue'],
});
