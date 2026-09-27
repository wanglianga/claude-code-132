<script setup lang="ts">
import { computed, ref } from 'vue'
import LoginPage from './pages/LoginPage.vue'
import OverviewPage from './pages/OverviewPage.vue'
import EnrollPage from './pages/EnrollPage.vue'
import ReviewPage from './pages/ReviewPage.vue'
import MatchingPage from './pages/MatchingPage.vue'
import OnsitePage from './pages/OnsitePage.vue'
import ReportPage from './pages/ReportPage.vue'
import ItemDetailModal from './components/ItemDetailModal.vue'
import { useSessionStore } from './stores/session'
import { useDataStore } from './stores/data'
import { useUiStore } from './stores/ui'
import { roleText } from './labels'

const session = useSessionStore()
const data = useDataStore()
const ui = useUiStore()

const tabs = [
  { key: 'overview', icon: '🏘️', label: '活动总览' },
  { key: 'enroll', icon: '📝', label: '家长报名 / 我的物品' },
  { key: 'review', icon: '🔍', label: '审核台' },
  { key: 'matching', icon: '🤝', label: '撮合台' },
  { key: 'onsite', icon: '📱', label: '现场核销' },
  { key: 'report', icon: '📊', label: '活动复盘' },
] as const

type TabKey = (typeof tabs)[number]['key']
const active = ref<TabKey>('overview')

const current = computed(() => tabs.find((t) => t.key === active.value)!)

const selectedItem = computed(() =>
  ui.selectedItemId ? data.byId(ui.selectedItemId) ?? null : null,
)

function resetDemo() {
  if (confirm('确定重置为演示数据？当前所有操作将被清除。')) {
    data.resetDemo()
    ui.closeItem()
  }
}
</script>

<template>
  <LoginPage v-if="!session.user" />

  <div v-else class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        🌱 邻里童物交换日
        <small>报名 · 审核 · 撮合 · 核销 · 复盘</small>
      </div>
      <button
        v-for="t in tabs"
        :key="t.key"
        class="nav-item"
        :class="{ active: active === t.key }"
        @click="active = t.key"
      >
        <span class="ico">{{ t.icon }}</span>
        <span>{{ t.label }}</span>
      </button>
      <div class="grow" />
      <div class="small" style="color: #7fa08d; padding: 10px 12px; line-height: 1.7">
        一件物品从提交到结局<br />全流程可追踪、可协同
      </div>
    </aside>

    <main class="main">
      <header class="topbar">
        <div>
          <div class="page-title">{{ current.icon }} {{ current.label }}</div>
        </div>
        <div class="row">
          <button class="btn sm" @click="resetDemo">↺ 重置演示数据</button>
          <span class="badge green">{{ roleText(session.user?.role) }}</span>
          <strong class="small">{{ session.user.name }}</strong>
          <button class="btn sm" @click="session.logout()">退出</button>
        </div>
      </header>

      <div class="content">
        <OverviewPage v-if="active === 'overview'" />
        <EnrollPage v-else-if="active === 'enroll'" />
        <ReviewPage v-else-if="active === 'review'" />
        <MatchingPage v-else-if="active === 'matching'" />
        <OnsitePage v-else-if="active === 'onsite'" />
        <ReportPage v-else-if="active === 'report'" />
      </div>
    </main>

    <ItemDetailModal
      :item="selectedItem"
      @close="ui.closeItem()"
      @changed="() => {}"
    />
  </div>
</template>
