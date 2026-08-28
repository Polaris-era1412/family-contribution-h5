import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'
import { currentUser } from './utils/supabase.js'

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

// 路由守卫：已登录用户自动跳转首页，不再显示加入页
router.beforeEach((to, from, next) => {
  const user = currentUser.get()
  if (to.path === '/join' && user) {
    next('/home')
  } else if ((to.path === '/home' || to.path === '/submit' || to.path === '/vote' || to.path === '/mine') && !user) {
    next('/join')
  } else {
    next()
  }
})

const app = createApp(App)
app.use(router)
app.mount('#app')
