import { configure } from 'quasar/wrappers'

export default configure((/* ctx */) => {
  return {
    eslint: {
      fix: true,
      warn: true,
    },

    boot: ['axios'],

    css: ['app.scss'],

    extras: [
      'material-icons',
      'mdi-v7',
    ],

    build: {
      target: {
        browser: ['es2019', 'edge88', 'firefox78', 'chrome87', 'safari13.1'],
        node: 'node20',
      },
      vueRouterMode: 'hash',
      vitePlugins: [],
    },

    devServer: {
      open: true,
      proxy: {
        '/api': {
          target: 'https://api.bilibili.com',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api/, ''),
        },
        '/search-api': {
          target: 'https://api.bilibili.com',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/search-api/, ''),
        },
      },
    },

    framework: {
      config: {
        dark: true,
        brand: {
          primary: '#fb7299',
          secondary: '#23ade5',
          accent: '#9C27B0',
          dark: '#0d0d0d',
          'dark-page': '#0a0a0a',
          positive: '#21BA45',
          negative: '#C10015',
          info: '#31CCEC',
          warning: '#F2C037',
        },
        notify: {
          position: 'top',
        },
      },
      plugins: ['Notify', 'LocalStorage', 'Dialog'],
    },

    animations: 'all',

    electron: {
      preloadScripts: ['electron-preload'],
      inspectPort: 5858,
      bundler: 'packager',
      packager: {
        platform: 'win32',
        arch: 'x64',
      },
      builder: {
        appId: 'com.bilimusic.app',
        productName: 'BiliMusic',
        win: {
          target: 'nsis',
        },
        mac: {
          target: 'dmg',
        },
      },
    },
  }
})
