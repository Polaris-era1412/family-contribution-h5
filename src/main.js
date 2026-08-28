import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'
import { currentUser } from './utils/supabase.js'

// 路由配置
const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: () => import('./pages/Login.vue') },
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

// 路由守卫：需要登录的页面（/join 不需要，新用户要在这里创建家庭）
const protectedRoutes = ['/home', '/submit', '/vote', '/mine', '/admin', '/history']

router.beforeEach((to, from, next) => {
  if (protectedRoutes.includes(to.path)) {
    const user = currentUser.get()
    if (!user) {
      next('/login')
    } else {
      next()
    }
  } else {
    next()
  }
})

const app = createApp(App)
app.use(router)
app.mount('#app')
