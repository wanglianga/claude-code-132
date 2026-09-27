<script setup lang="ts">
import { computed } from 'vue'
import { CATEGORIES, CATEGORY_EMOJI, CATEGORY_LABEL, ITEM_STATUS_FLOW, STALLS } from '../constants'
import { useDataStore } from '../stores/data'
import { useUiStore } from '../stores/ui'
import type { ItemStatus } from '../types'

const data = useDataStore()
const ui = useUiStore()

/** 主链阶段（与物品流程条对应） */
const STAGES: { key: ItemStatus; icon: string }[] = [
  { key: 'submitted', icon: '📤' },
  { key: 'approved', icon: '🔍' },
  { key: 'scheduled', icon: '🎟️' },
  { key: 'free', icon: '🆓' },
  { key: 'arrived', icon: '🚪' },
  { key: 'checked', icon: '✅' },
  { key: 'exchanged', icon: '🤝' },
]

const grouped = computed(() => {
  const map = new Map<ItemStatus, typeof data.items>()
  for (const s of ITEM_STATUS_FLOW) map.set(s.key as ItemStatus, [])
  for (const i of data.items) map.get(i.status)?.push(i)
  return map
})

const total = computed(() => data.items.length)
const terminal = computed(() =>
  data.items.filter((i) =>
    ['exchanged', 'donated', 'brought_back', 'no_show'].includes(i.status),
  ).length,
)

/** 最近动态 */
const recent = computed(() =>
  data.items
    .flatMap((i) => i.timeline.map((t) => ({ ...t, item: i })))
    .sort((a, b) => b.at - a.at)
    .slice(0, 8),
)

function fmtTime(ts: number) {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function statusLabel(key: ItemStatus) {
  return ITEM_STATUS_FLOW.find((s) => s.key === key)?.label ?? key
}

/** 摊位概览 */
const stallRows = computed(() =>
  STALLS.map((s) => ({
    name: s.name,
    count: data.items.filter(
      (i) => (i.status === 'scheduled' || i.status === 'arrived' || i.status === 'checked') && i.stallId === s.id,
    ).length,
  })),
)
</script>

<template>
  <div class="stack" style="gap: 18px">
    <!-- 顶部 KPI -->
    <section class="grid cols-4">
      <div class="card stat-card">
        <span class="cap">报名物品总数</span>
        <span class="num">{{ total }}</span>
      </div>
      <div class="card stat-card">
        <span class="cap">已到场</span>
        <span class="num" style="color: var(--amber)">{{ data.stats.arrived }}</span>
      </div>
      <div class="card stat-card">
        <span class="cap">交换成功</span>
        <span class="num" style="color: var(--green)">{{ data.stats.exchanged }}</span>
      </div>
      <div class="card stat-card">
        <span class="cap">本场交换成功率</span>
        <span class="num" style="color: var(--brand)">{{ data.stats.successRate }}%</span>
        <span class="cap">交换成功 / 已到场</span>
      </div>
    </section>

    <!-- 全流程看板 -->
    <section class="card card-pad">
      <div class="row spread">
        <h2 style="font-size: 16px">🛤️ 物品全流程看板（不只是报名列表）</h2>
        <span class="hint">已结案 {{ terminal }} / {{ total }}：交换成功、转捐、带回、缺席均有去向</span>
      </div>
      <div class="board">
        <div v-for="stage in STAGES" :key="stage.key" class="board-col">
          <div class="bc-head">
            <span>{{ stage.icon }} {{ statusLabel(stage.key) }}</span>
            <span class="bc-count">{{ grouped.get(stage.key)?.length ?? 0 }}</span>
          </div>
          <div class="bc-body">
            <div
              v-for="i in grouped.get(stage.key)"
              :key="i.id"
              class="bc-chip"
              @click="ui.openItem(i.id)"
            >
              {{ CATEGORY_EMOJI[i.category] }} {{ i.title }}
            </div>
          </div>
        </div>
      </div>

      <!-- 分支与终态 -->
      <div class="grid cols-3" style="margin-top: 14px">
        <div class="branch-box" v-for="s in ITEM_STATUS_FLOW.filter((x) =>
            ['rejected', 'exception', 'unexchanged', 'donated', 'brought_back', 'no_show'].includes(x.key))"
          :key="s.key"
        >
          <div class="row spread">
            <span class="badge" :class="s.tone">{{ s.label }}</span>
            <strong>{{ grouped.get(s.key as ItemStatus)?.length ?? 0 }}</strong>
          </div>
          <div class="tag-list" style="margin-top: 8px">
            <span
              v-for="i in grouped.get(s.key as ItemStatus)"
              :key="i.id"
              class="bc-chip"
              @click="ui.openItem(i.id)"
            >
              {{ CATEGORY_EMOJI[i.category] }} {{ i.title }}
            </span>
            <span v-if="!(grouped.get(s.key as ItemStatus)?.length)" class="hint small">暂无</span>
          </div>
        </div>
      </div>
    </section>

    <section class="grid cols-2" style="align-items: start">
      <!-- 摊位 -->
      <div class="card card-pad">
        <div class="section-title">🏪 各摊位在场物品</div>
        <div v-for="r in stallRows" :key="r.name" class="row spread" style="padding: 7px 0; border-bottom: 1px dashed var(--line)">
          <span class="small">{{ r.name }}</span>
          <strong class="small">{{ r.count }} 件</strong>
        </div>
      </div>

      <!-- 最近动态 -->
      <div class="card card-pad">
        <div class="section-title">🕒 最近动态</div>
        <ul class="timeline">
          <li v-for="(e, idx) in recent" :key="idx" style="cursor: pointer" @click="ui.openItem(e.item.id)">
            <div class="t-time">{{ fmtTime(e.at) }} · {{ e.byName }}</div>
            <div class="t-text">{{ CATEGORY_EMOJI[e.item.category] }} {{ e.text }}</div>
          </li>
        </ul>
      </div>
    </section>

    <!-- 品类分布 -->
    <section class="card card-pad">
      <div class="section-title">📦 本场报名品类分布</div>
      <div class="grid cols-3">
        <div v-for="c in CATEGORIES" :key="c" class="row spread cap-row">
          <span class="small">{{ CATEGORY_EMOJI[c] }} {{ CATEGORY_LABEL[c] }}</span>
          <strong class="small">{{ data.items.filter((i) => i.category === c).length }} 件</strong>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.board {
  display: grid;
  grid-template-columns: repeat(7, minmax(130px, 1fr));
  gap: 10px;
  margin-top: 14px;
  overflow-x: auto;
}
.board-col {
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  min-height: 120px;
  display: flex;
  flex-direction: column;
}
.bc-head {
  padding: 8px 10px;
  font-size: 12.5px;
  font-weight: 650;
  border-bottom: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  align-items: center;
  white-space: nowrap;
}
.bc-count {
  background: var(--brand-soft);
  color: var(--brand-dark);
  border-radius: 999px;
  padding: 0 8px;
  font-size: 12px;
}
.bc-body {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.bc-chip {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 5px 8px;
  font-size: 12px;
  cursor: pointer;
  line-height: 1.4;
}
.bc-chip:hover {
  border-color: var(--brand);
  color: var(--brand-dark);
}
.branch-box {
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 11px 13px;
  background: var(--surface-2);
}
.cap-row {
  padding: 6px 2px;
}
</style>
