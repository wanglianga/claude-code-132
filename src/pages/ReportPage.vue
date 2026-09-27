<script setup lang="ts">
import { computed } from 'vue'
import {
  CATEGORIES,
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
} from '../constants'
import { EXCEPTION_LABEL, RESOLUTION_LABEL, ROLE_LABEL } from '../labels'
import { useDataStore } from '../stores/data'
import { useUiStore } from '../stores/ui'
import type { Category } from '../types'

const data = useDataStore()
const ui = useUiStore()

const s = computed(() => data.stats)

// 各终态数量（用于去向构成）
const outcome = computed(() => [
  { key: 'exchanged', label: '交换成功', tone: 'green', count: data.items.filter((i) => i.status === 'exchanged').length },
  { key: 'donated', label: '公益转捐', tone: 'emerald', count: data.items.filter((i) => i.status === 'donated').length },
  { key: 'brought_back', label: '家长带回', tone: 'gray', count: data.items.filter((i) => i.status === 'brought_back').length },
  { key: 'no_show', label: '未到场', tone: 'rose', count: data.items.filter((i) => i.status === 'no_show').length },
])
const outcomeTotal = computed(() => outcome.value.reduce((sum, x) => sum + x.count, 0) || 1)

// 未到场名单
const noShowList = computed(() => data.items.filter((i) => i.status === 'no_show'))
// 核销到场但未完成交换（自由区未成功的除外：只统计确定结局）
const pendingEnding = computed(() =>
  data.items.filter((i) => ['arrived', 'checked', 'exception', 'unexchanged', 'scheduled', 'free'].includes(i.status)),
)

// 捐赠去向
const donations = computed(() =>
  data.charities.map((c) => ({
    charity: c,
    items: data.items.filter((i) => i.status === 'donated' && i.charityId === c.id),
    remaining: c.capacity - data.charityUsed(c.id),
  })),
)

// 争议/异常处理
const exceptionLog = computed(() =>
  data.items
    .filter((i) => i.exception)
    .map((i) => ({ item: i, ex: i.exception! }))
    .sort((a, b) => b.ex.openedAt - a.ex.openedAt),
)

// 品类缺口
const gaps = computed(() => data.categoryGaps)
const maxGap = computed(() => Math.max(1, ...gaps.value.map((g) => g.gap)))

function gapAdvice(cat: Category): string {
  const g = gaps.value.find((x) => x.category === cat)
  if (!g) return '本场需求较少，下一场维持常规征集即可'
  if (!g.supplied) return `有家庭想换但本场无人供给，下一场重点征集该品类`
  return '供需两旺，建议保持征集并多备该类摊位'
}

const categorySupplyRows = computed(() =>
  CATEGORIES.map((c) => ({
    category: c,
    supply: data.items.filter((i) => i.category === c && !['rejected'].includes(i.status)).length,
    demand: data.items.reduce((n, i) => n + (i.expectCategories.includes(c) ? 1 : 0), 0),
  })),
)
</script>

<template>
  <div class="stack" style="gap: 18px">
    <!-- 核心指标 -->
    <section class="grid cols-4">
      <div class="card stat-card">
        <span class="cap">报名 / 到场</span>
        <span class="num">{{ s.total }} <span class="muted" style="font-size: 15px">/ {{ s.arrived }}</span></span>
      </div>
      <div class="card stat-card">
        <span class="cap">交换成功率</span>
        <span class="num" style="color: var(--green)">{{ s.successRate }}%</span>
        <span class="cap">{{ s.exchanged }} 件成功 / {{ s.arrived }} 件到场</span>
      </div>
      <div class="card stat-card">
        <span class="cap">公益转捐</span>
        <span class="num" style="color: var(--emerald)">{{ s.donated.length }}</span>
        <span class="cap">件，已有明确公益去向</span>
      </div>
      <div class="card stat-card">
        <span class="cap">异常 / 争议单</span>
        <span class="num" style="color: var(--orange)">{{ s.disputes.length }}</span>
        <span class="cap">含不符、反悔、价值争议</span>
      </div>
    </section>

    <section class="grid cols-2" style="align-items: start">
      <!-- 物品去向构成 -->
      <div class="card card-pad">
        <div class="section-title">🧭 已结案物品去向</div>
        <div class="bar-track" style="display: flex; height: 22px; overflow: hidden; border-radius: 8px">
          <div
            v-for="o in outcome"
            :key="o.key"
            :title="o.label"
            :style="{
              width: `${(o.count / outcomeTotal) * 100}%`,
              background:
                o.tone === 'green' ? 'var(--green)'
                : o.tone === 'emerald' ? 'var(--emerald)'
                : o.tone === 'gray' ? 'var(--gray)'
                : 'var(--rose)',
            }"
          />
        </div>
        <div class="tag-list" style="margin-top: 12px">
          <span v-for="o in outcome" :key="o.key" class="badge" :class="o.tone">{{ o.label }} {{ o.count }}</span>
        </div>
        <div v-if="pendingEnding.length" class="note" style="margin-top: 12px">
          <span class="small muted">
            另有 {{ pendingEnding.length }} 件物品尚在到场/核销/异常/无人交换等待处置环节，结案后数据将更新。
          </span>
        </div>
      </div>

      <!-- 未到场名单 -->
      <div class="card card-pad">
        <div class="section-title">📕 未到场名单（{{ noShowList.length }}）</div>
        <div v-if="noShowList.length" class="stack">
          <div v-for="i in noShowList" :key="i.id" class="absent-row" @click="ui.openItem(i.id)">
            <div>
              <strong class="small">{{ CATEGORY_EMOJI[i.category] }} {{ i.title }}</strong>
              <div class="hint small">{{ i.ownerName }}家 · {{ i.phone }} · 原预约 {{ i.entrySlotId === 's1' ? '上午场' : '下午场' }}</div>
            </div>
            <div class="small muted" style="max-width: 250px; text-align: right">
              {{ i.exception?.summary ?? '已按缺席登记' }}
            </div>
          </div>
        </div>
        <div v-else class="empty" style="padding: 22px"><div class="big">🎉</div>本场全员到场</div>
      </div>
    </section>

    <!-- 捐赠去向 -->
    <section class="card card-pad">
      <div class="section-title">💚 捐赠去向</div>
      <div class="grid cols-2">
        <div v-for="d in donations" :key="d.charity.id" class="donation-box">
          <div class="row spread">
            <strong>{{ d.charity.name }}</strong>
            <span class="badge" :class="d.remaining > 0 ? 'emerald' : 'red'">
              已接收 {{ d.items.length }} / 容量 {{ d.charity.capacity }}
            </span>
          </div>
          <div class="hint small" style="margin: 4px 0 8px">{{ d.charity.contact }}</div>
          <div v-if="d.items.length" class="tag-list">
            <span v-for="i in d.items" :key="i.id" class="badge emerald" style="cursor: pointer" @click="ui.openItem(i.id)">
              {{ CATEGORY_EMOJI[i.category] }} {{ i.title }}（{{ i.ownerName }}家）
            </span>
          </div>
          <div v-else class="hint small">本场暂无物品转入该机构</div>
        </div>
      </div>
    </section>

    <!-- 争议处理 -->
    <section class="card card-pad">
      <div class="section-title">⚖️ 争议 / 异常处理记录（{{ exceptionLog.length }}）</div>
      <div v-if="exceptionLog.length" class="stack">
        <div v-for="row in exceptionLog" :key="row.item.id" class="dispute-row" @click="ui.openItem(row.item.id)">
          <div class="row spread wrap" style="gap: 8px">
            <div class="row" style="gap: 9px">
              <span class="badge orange">{{ EXCEPTION_LABEL[row.ex.type] }}</span>
              <strong class="small">
                {{ CATEGORY_EMOJI[row.item.category] }} {{ row.item.title }}
              </strong>
              <span class="hint small">{{ row.item.ownerName }}家 · 开单：{{ row.ex.openedByName }}（{{ ROLE_LABEL[row.ex.openedBy] }}）</span>
            </div>
            <span v-if="row.ex.resolution" class="badge teal">
              已处理：{{ RESOLUTION_LABEL[row.ex.resolution] }}
            </span>
            <span v-else class="badge amber">处理中</span>
          </div>
          <div v-if="row.ex.summary" class="small muted" style="margin-top: 5px">{{ row.ex.summary }}</div>
          <div v-if="row.item.notes.length" class="hint small" style="margin-top: 4px">
            协同留言 {{ row.item.notes.length }} 条，最新：{{ row.item.notes[row.item.notes.length - 1].content }}
          </div>
        </div>
      </div>
      <div v-else class="empty" style="padding: 24px"><div class="big">🕊️</div>本场没有争议或异常记录</div>
    </section>

    <!-- 下一场品类缺口 -->
    <section class="card card-pad">
      <div class="row spread" style="margin-bottom: 12px">
        <h2 style="font-size: 15px">🧩 下一场活动品类缺口与征集建议</h2>
        <span class="hint">依据本场家长"期望换取"的需求与实际供给计算</span>
      </div>

      <div class="grid cols-2" style="gap: 18px; margin-bottom: 16px">
        <div>
          <div class="hint small" style="margin-bottom: 8px; font-weight: 600">需求热度（期望换取该品类的报名数）</div>
          <div v-for="g in gaps" :key="g.category" class="gap-row">
            <div class="row spread small">
              <span>{{ CATEGORY_EMOJI[g.category] }} {{ CATEGORY_LABEL[g.category] }}</span>
              <span :style="{ color: g.supplied ? 'var(--ink-2)' : 'var(--red)', fontWeight: 600 }">
                需求 {{ g.demand }} 件{{ g.supplied ? '' : ' · 本场无供给' }}
              </span>
            </div>
            <div class="bar-track" style="margin-top: 4px">
              <div
                class="bar-fill"
                :style="{
                  width: `${(g.gap / maxGap) * 100}%`,
                  background: g.supplied ? 'var(--brand)' : 'var(--accent)',
                }"
              />
            </div>
          </div>
          <div v-if="!gaps.length" class="hint">本场暂无家长填写期望类型，无法计算缺口</div>
        </div>

        <div>
          <div class="hint small" style="margin-bottom: 8px; font-weight: 600">供需对照与征集建议</div>
          <table class="table small">
            <thead>
              <tr>
                <th>品类</th>
                <th>供给</th>
                <th>需求</th>
                <th>下一场建议</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in categorySupplyRows" :key="r.category">
                <td>{{ CATEGORY_EMOJI[r.category] }} {{ CATEGORY_LABEL[r.category] }}</td>
                <td>{{ r.supply }}</td>
                <td>
                  <span :style="{ color: r.demand > r.supply ? 'var(--red)' : undefined, fontWeight: 600 }">{{ r.demand }}</span>
                </td>
                <td class="muted">{{ gapAdvice(r.category) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="note" style="background: var(--brand-soft)">
        <div class="small">
          <strong>📣 下一场预告建议：</strong>
          <template v-if="gaps.length">
            重点面向社区征集
            <strong>{{ gaps.filter((g) => !g.supplied).map((g) => CATEGORY_LABEL[g.category]).join('、') || gaps.slice(0, 2).map((g) => CATEGORY_LABEL[g.category]).join('、') }}</strong>
            类闲置物品；对"家长带回"的物品可定向推送下一场报名提醒。
          </template>
          <template v-else>
            鼓励家长报名时填写期望换取类型，以便生成更精准的缺口建议。
          </template>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.absent-row,
.dispute-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  background: var(--surface-2);
  cursor: pointer;
}
.absent-row:hover,
.dispute-row:hover {
  border-color: var(--brand);
}
.donation-box {
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 13px 15px;
  background: var(--surface-2);
}
.gap-row {
  margin-bottom: 11px;
}
</style>
