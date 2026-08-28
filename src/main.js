import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

// 路由配置
const routes = [
  { path: '/', redirect: '/home' },
  { path: '/home', component: () => import('./pages/Home.vue') },
  { path: '/submit', component: () => import('./pages/Submit.vue') },
  { path: '/vote', component: () => import('./pages/Vote.vue') },
  { path: '/mine', component: () => import('./pages/Mine.vue') },
  { path: '/join', component: () => import('./pages/Join.vue') },
  { path: '/admin', component: () => import('./pages/Admin.vue') },
  { path: '/history', component: () => import('./pages/History.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const app = createApp(App)
app.use(router)
app.mount('#app')
