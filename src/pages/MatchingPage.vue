<script setup lang="ts">
import { computed } from 'vue'
import {
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  CONDITION_LABEL,
  ENTRY_SLOTS,
  STALLS,
  VALUE_LABEL,
} from '../constants'
import { useDataStore } from '../stores/data'
import { useSessionStore } from '../stores/session'
import { useUiStore } from '../stores/ui'
import { roleText } from '../labels'
import type { Item, MatchProposal, Recommendation } from '../types'

const data = useDataStore()
const session = useSessionStore()
const ui = useUiStore()

const isStaff = computed(() => session.user?.role === 'staff')
const roleLabel = computed(() => roleText(session.user?.role))

function itemOf(id: string): Item {
  return data.byId(id)!
}
function stallName(id: string) {
  return STALLS.find((s) => s.id === id)?.name ?? ''
}
function slotLabel(id: string) {
  return ENTRY_SLOTS.find((s) => s.id === id)?.label ?? ''
}
function slotTime(id: string) {
  return ENTRY_SLOTS.find((s) => s.id === id)?.time ?? ''
}

// —— 推荐组合（实时按年龄/品类/价值/期望/时间/摊位容量计算） ——
const recs = computed(() => data.recommendations)

// —— 邀约 ——
const pendingProposals = computed(() => data.proposals.filter((p) => p.status === 'pending'))
const acceptedProposals = computed(() => data.proposals.filter((p) => p.status === 'accepted'))
const declinedProposals = computed(() => data.proposals.filter((p) => p.status === 'declined'))

function issue(rec: Recommendation) {
  if (!session.user) return
  data.createProposal(rec)
}

function respond(p: MatchProposal, side: 'A' | 'B', accept: boolean) {
  const who = session.user
  if (!who) return
  data.respondProposal(p.id, side, accept, who)
}

// —— 撮合池与容量 ——
const pool = computed(() => data.items.filter((i) => i.status === 'approved'))
const freeItems = computed(() => data.items.filter((i) => i.status === 'free'))

/** 该物品是否已出现在推荐或邀约中 */
function covered(id: string) {
  if (recs.value.some((r) => r.itemAId === id || r.itemBId === id)) return true
  return pendingProposals.value.some((p) => p.itemAId === id || p.itemBId === id)
}
const unmatched = computed(() => pool.value.filter((i) => !covered(i.id)))

function toFree(id: string) {
  const who = session.user
  if (!who) return
  data.moveToFree(id, who)
}
function batchToFree() {
  const who = session.user
  if (!who) return
  unmatched.value.forEach((i) => data.moveToFree(i.id, who, '本轮撮合未匹配，统一转入自由交换区'))
}

// 摊位容量占用
const capacityRows = computed(() => {
  const rows: { stall: string; slot: string; used: number; cap: number }[] = []
  for (const stall of STALLS) {
    for (const slot of ENTRY_SLOTS) {
      const used =
        stall.id === 'free'
          ? data.items.filter((i) => i.status === 'free' && i.entrySlotId === slot.id).length
          : acceptedProposals.value.filter((p) => p.stallId === stall.id && p.entrySlotId === slot.id).length
      rows.push({ stall: stall.name, slot: `${slot.label} ${slot.time}`, used, cap: stall.capacityPerSlot })
    }
  }
  return rows
})
</script>

<template>
  <div class="stack" style="gap: 18px">
    <section class="card card-pad">
      <div class="row spread">
        <div>
          <h2 style="font-size: 16px">🤝 撮合台</h2>
          <p class="hint" style="margin: 4px 0 0">
            依据孩子年龄段、物品类型、价值区间、双方期望与共同到场时间推荐交换组合，
            并校验目标摊位的时段容量；双方家长接受后发放入场时间与摊位提示。
          </p>
        </div>
        <div class="row wrap">
          <span class="badge blue">撮合池 {{ pool.length }}</span>
          <span class="badge violet">待确认 {{ pendingProposals.length }}</span>
          <span class="badge green">已预约 {{ acceptedProposals.length }} 对</span>
          <span class="badge cyan">自由区 {{ freeItems.length }}</span>
        </div>
      </div>
      <div v-if="!isStaff" class="note" style="margin-top: 12px">
        <div class="small">👀 当前为「{{ roleLabel }}」视角。发起邀约、转入自由区由社区操作；家长可在下方对自家邀约确认接受或婉拒。</div>
      </div>
    </section>

    <!-- 摊位容量 -->
    <section class="card card-pad">
      <div class="section-title">🏪 现场摊位容量（按入场时段）</div>
      <div class="grid cols-4">
        <div v-for="(r, idx) in capacityRows" :key="idx" class="cap-box">
          <div class="small" style="font-weight: 650">{{ r.stall }}</div>
          <div class="hint" style="margin: 2px 0 7px">{{ r.slot }}</div>
          <div class="row spread small">
            <span :style="{ color: r.used >= r.cap ? 'var(--red)' : 'var(--ink-2)' }">
              已约 {{ r.used }} / {{ r.cap }} 对
            </span>
          </div>
          <div class="bar-track" style="margin-top: 5px">
            <div
              class="bar-fill"
              :style="{
                width: `${Math.min(100, (r.used / r.cap) * 100)}%`,
                background: r.used >= r.cap ? 'var(--red)' : undefined,
              }"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- 推荐组合 -->
    <section>
      <div class="section-title">✨ 智能推荐交换组合（{{ recs.length }}）</div>
      <div v-if="recs.length" class="stack">
        <div v-for="(r, idx) in recs" :key="idx" class="card card-pad rec-card">
          <div class="grid cols-3" style="gap: 16px; align-items: stretch">
            <!-- A -->
            <div class="mini-item" @click="ui.openItem(r.itemAId)">
              <div class="mi-head"><span>{{ CATEGORY_EMOJI[itemOf(r.itemAId).category] }}</span><strong>{{ itemOf(r.itemAId).title }}</strong></div>
              <div class="small muted">{{ itemOf(r.itemAId).ownerName }}家 · {{ itemOf(r.itemAId).childName }} {{ itemOf(r.itemAId).childAge }}岁</div>
              <div class="tag-list" style="margin-top: 6px">
                <span class="badge slate">{{ CATEGORY_LABEL[itemOf(r.itemAId).category] }}</span>
                <span class="badge gray">{{ CONDITION_LABEL[itemOf(r.itemAId).condition] }}</span>
                <span class="badge blue">{{ VALUE_LABEL[itemOf(r.itemAId).valueBand] }}</span>
              </div>
            </div>

            <!-- 中间评分与理由 -->
            <div class="rec-mid">
              <div class="score-ring">{{ r.score }}</div>
              <div class="small" style="font-weight: 650; text-align: center">匹配度</div>
              <ul class="reasons">
                <li v-for="(reason, i) in r.reasons" :key="i" class="small">{{ reason }}</li>
              </ul>
              <div class="hint small" style="text-align: center">
                建议：{{ stallName(r.stallId) }}<br />
                入场：{{ slotLabel(r.entrySlotId) }} {{ slotTime(r.entrySlotId) }}
              </div>
              <button class="btn primary" :disabled="!isStaff" style="justify-content: center" @click="issue(r)">
                发起撮合邀约
              </button>
              <span v-if="!isStaff" class="hint" style="text-align: center">社区工作人员可发起邀约</span>
            </div>

            <!-- B -->
            <div class="mini-item" @click="ui.openItem(r.itemBId)">
              <div class="mi-head"><span>{{ CATEGORY_EMOJI[itemOf(r.itemBId).category] }}</span><strong>{{ itemOf(r.itemBId).title }}</strong></div>
              <div class="small muted">{{ itemOf(r.itemBId).ownerName }}家 · {{ itemOf(r.itemBId).childName }} {{ itemOf(r.itemBId).childAge }}岁</div>
              <div class="tag-list" style="margin-top: 6px">
                <span class="badge slate">{{ CATEGORY_LABEL[itemOf(r.itemBId).category] }}</span>
                <span class="badge gray">{{ CONDITION_LABEL[itemOf(r.itemBId).condition] }}</span>
                <span class="badge blue">{{ VALUE_LABEL[itemOf(r.itemBId).valueBand] }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="card empty">
        <div class="big">🫖</div>
        暂无符合条件的推荐组合（需要两件审核通过、互符合期望且时间可重叠的物品）
      </div>
    </section>

    <!-- 待家长确认 -->
    <section v-if="pendingProposals.length">
      <div class="section-title">⏳ 待双方家长确认（{{ pendingProposals.length }}）</div>
      <div class="stack">
        <div v-for="p in pendingProposals" :key="p.id" class="card card-pad">
          <div class="row spread" style="align-items: flex-start">
            <div class="grow">
              <div class="row wrap" style="gap: 16px">
                <div class="party" :class="{ ok: p.acceptA }">
                  <span class="badge" :class="p.acceptA ? 'green' : 'amber'">{{ p.acceptA ? '已接受' : '待确认' }}</span>
                  <strong>{{ itemOf(p.itemAId).ownerName }}家</strong>
                  <span class="small muted">「{{ itemOf(p.itemAId).title }}」</span>
                </div>
                <span style="font-size: 18px">⇄</span>
                <div class="party" :class="{ ok: p.acceptB }">
                  <span class="badge" :class="p.acceptB ? 'green' : 'amber'">{{ p.acceptB ? '已接受' : '待确认' }}</span>
                  <strong>{{ itemOf(p.itemBId).ownerName }}家</strong>
                  <span class="small muted">「{{ itemOf(p.itemBId).title }}」</span>
                </div>
              </div>
              <div class="hint small" style="margin-top: 8px">
                双方接受后将预约至 {{ stallName(p.stallId) }} · {{ slotLabel(p.entrySlotId) }} {{ slotTime(p.entrySlotId) }}
              </div>
            </div>
          </div>
          <div class="row spread wrap" style="margin-top: 12px">
            <div class="row">
              <span class="hint small">A 方（{{ itemOf(p.itemAId).ownerName }}家）：</span>
              <button class="btn primary sm" :disabled="p.acceptA" @click="respond(p, 'A', true)">接受</button>
              <button class="btn danger sm" :disabled="p.acceptA" @click="respond(p, 'A', false)">婉拒</button>
            </div>
            <div class="row">
              <span class="hint small">B 方（{{ itemOf(p.itemBId).ownerName }}家）：</span>
              <button class="btn primary sm" :disabled="p.acceptB" @click="respond(p, 'B', true)">接受</button>
              <button class="btn danger sm" :disabled="p.acceptB" @click="respond(p, 'B', false)">婉拒</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 已预约 -->
    <section v-if="acceptedProposals.length">
      <div class="section-title">🎟️ 已生成预约（{{ acceptedProposals.length }}）</div>
      <div class="grid cols-2">
        <div v-for="p in acceptedProposals" :key="p.id" class="card card-pad ticket">
          <div class="row spread">
            <span class="badge green">预约成功</span>
            <span class="hint small">{{ slotLabel(p.entrySlotId) }} {{ slotTime(p.entrySlotId) }}</span>
          </div>
          <div style="margin: 10px 0; line-height: 1.9">
            <div><strong>{{ itemOf(p.itemAId).ownerName }}家</strong>「{{ itemOf(p.itemAId).title }}」</div>
            <div style="text-align: center; color: var(--brand)">⇅ 交换</div>
            <div><strong>{{ itemOf(p.itemBId).ownerName }}家</strong>「{{ itemOf(p.itemBId).title }}」</div>
          </div>
          <div class="note">
            <div class="small">📍 入场提示：请按 <strong>{{ slotTime(p.entrySlotId) }}</strong> 到
              <strong>{{ stallName(p.stallId) }}</strong> 签到，向志愿者出示物品核销码即可。
            </div>
          </div>
          <div class="row" style="margin-top: 10px">
            <button class="btn sm" @click="ui.openItem(p.itemAId)">追踪 A 物品</button>
            <button class="btn sm" @click="ui.openItem(p.itemBId)">追踪 B 物品</button>
          </div>
        </div>
      </div>
    </section>

    <!-- 未匹配 → 自由交换区 -->
    <section>
      <div class="row spread" style="margin-bottom: 10px">
        <div class="section-title" style="margin: 0">🆓 本轮未匹配（{{ unmatched.length }}）——可进入自由交换区</div>
        <button v-if="unmatched.length && isStaff" class="btn sm" @click="batchToFree">全部转入自由交换区</button>
      </div>
      <div v-if="unmatched.length" class="grid cols-3">
        <div v-for="i in unmatched" :key="i.id" class="card card-pad stack">
          <div class="row spread" @click="ui.openItem(i.id)" style="cursor: pointer">
            <strong class="small">{{ CATEGORY_EMOJI[i.category] }} {{ i.title }}</strong>
            <span class="hint small">{{ i.ownerName }}家</span>
          </div>
          <div class="hint small">
            想换 {{ i.expectCategories.length ? i.expectCategories.map((c) => CATEGORY_LABEL[c]).join('、') : '不限' }}，
            本场暂无精准组合
          </div>
          <button class="btn sm" :disabled="!isStaff" @click="toFree(i.id)">转入自由交换区</button>
        </div>
      </div>
      <div v-else class="card empty"><div class="big">🎉</div>撮合池中的物品均已匹配或进入自由区</div>

      <div v-if="freeItems.length" style="margin-top: 16px">
        <div class="section-title">D 区 · 自由交换区在库（{{ freeItems.length }}）</div>
        <div class="tag-list">
          <span v-for="i in freeItems" :key="i.id" class="badge cyan" style="cursor: pointer" @click="ui.openItem(i.id)">
            {{ CATEGORY_EMOJI[i.category] }} {{ i.title }}（{{ i.ownerName }}家）
          </span>
        </div>
      </div>
    </section>

    <section v-if="declinedProposals.length" class="card card-pad">
      <div class="section-title" style="margin-bottom: 8px">↩️ 已婉拒的邀约（{{ declinedProposals.length }}）</div>
      <div class="tag-list">
        <span v-for="p in declinedProposals" :key="p.id" class="badge gray">
          {{ itemOf(p.itemAId).title }} ⇄ {{ itemOf(p.itemBId).title }}（物品已回到撮合池等待新组合）
        </span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.cap-box {
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 11px 13px;
  background: var(--surface-2);
}
.rec-card {
  border-left: 4px solid var(--brand);
}
.mini-item {
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  background: var(--surface-2);
  cursor: pointer;
  display: flex;
  flex-direction: column;
}
.mini-item:hover {
  border-color: var(--brand);
}
.mi-head {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  margin-bottom: 3px;
}
.mi-head span { font-size: 18px; }
.rec-mid {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  justify-content: center;
  padding: 4px 6px;
  border-left: 1px dashed var(--line);
  border-right: 1px dashed var(--line);
}
.score-ring {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--brand-soft);
  color: var(--brand-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  font-weight: 700;
  border: 2.5px solid var(--brand);
}
.reasons {
  margin: 0;
  padding-left: 17px;
  line-height: 1.85;
  color: var(--ink-2);
}
.party {
  display: flex;
  align-items: center;
  gap: 7px;
}
.ticket {
  border-top: 3px solid var(--brand);
}
</style>
