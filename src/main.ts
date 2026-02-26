import { createApp } from 'vue'
import { Quasar, Notify, LocalStorage, Dialog } from 'quasar'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

import '@quasar/extras/material-icons/material-icons.css'
import '@quasar/extras/mdi-v7/mdi-v7.css'
import 'quasar/src/css/index.sass'
import './css/app.scss'

const app = createApp(App)

app.use(Quasar, {
  plugins: { Notify, LocalStorage, Dialog },
  config: {
    dark: true,
    brand: {
      primary: '#fb7299',
      secondary: '#23ade5',
    },
    notify: { position: 'top' },
  },
})

app.use(createPinia())
app.use(router)
app.mount('#q-app')
