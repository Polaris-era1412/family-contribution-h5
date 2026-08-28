<template>
  <div class="app">
    <router-view v-slot="{ Component, route: r }">
      <!-- 底部 tab 页面用 keep-alive 缓存，切换不重新加载 -->
      <keep-alive :include="cachedPages">
        <component :is="Component" :key="r.path" />
      </keep-alive>
    </router-view>

    <!-- 底部导航 -->
    <nav class="tab-bar" v-if="showTabBar">
      <router-link to="/home" class="tab-item" active-class="active">
        <span class="icon">&#x1F3E0;</span>
        <span class="label">首页</span>
      </router-link>
      <router-link to="/submit" class="tab-item" active-class="active">
        <span class="icon">&#x1F4DD;</span>
        <span class="label">申报</span>
      </router-link>
      <router-link to="/vote" class="tab-item" active-class="active">
        <span class="icon">&#x1F5F3;&#xFE0F;</span>
        <span class="label">表决</span>
      </router-link>
      <router-link to="/mine" class="tab-item" active-class="active">
        <span class="icon">&#x1F464;</span>
        <span class="label">我</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// 缓存底部 tab 页面，切换时不重新请求数据
const cachedPages = ['Home', 'Submit', 'Vote', 'Mine']

// 判断是否显示底部导航
const showTabBar = computed(() => {
  const hiddenPages = ['/login', '/join', '/admin', '/history']
  return !hiddenPages.some(page => route.path.startsWith(page))
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #f5f5f5;
  color: #333;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  min-height: 100vh;
  padding-bottom: 60px;
}

/* 底部导航 */
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: #fff;
  display: flex;
  border-top: 1px solid #e0e0e0;
  z-index: 100;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: #999;
  transition: color 0.2s;
}

.tab-item.active {
  color: #c62828;
}

.tab-item .icon {
  font-size: 24px;
  margin-bottom: 2px;
}

.tab-item .label {
  font-size: 12px;
}

/* 通用按钮样式 */
.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #c62828;
  color: #fff;
}

.btn-primary:active {
  background: #a52020;
}

.btn-secondary {
  background: #e0e0e0;
  color: #333;
}

.btn-secondary:active {
  background: #d0d0d0;
}

/* 卡片样式 */
.card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

/* 输入框样式 */
.input {
  width: 100%;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s;
}

.input:focus {
  border-color: #c62828;
}
</style>
