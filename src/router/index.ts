import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: '/discover' },
      { path: 'discover', component: () => import('../pages/DiscoverPage.vue') },
      { path: 'search', component: () => import('../pages/SearchPage.vue') },
      { path: 'playlist/:id', component: () => import('../pages/PlaylistPage.vue') },
      { path: 'favorites', component: () => import('../pages/FavoritesPage.vue') },
      { path: 'history', component: () => import('../pages/HistoryPage.vue') },
    ],
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
