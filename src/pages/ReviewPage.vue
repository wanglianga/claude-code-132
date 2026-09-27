<script setup lang="ts">
import { computed, ref } from 'vue'
import ItemCard from '../components/ItemCard.vue'
import ModalShell from '../components/ModalShell.vue'
import {
  CATEGORY_LABEL,
  FORBIDDEN_LABEL,
  FORBIDDEN_REASON_HINT,
} from '../constants'
import { roleText } from '../labels'
import { useDataStore } from '../stores/data'
import { useSessionStore } from '../stores/session'
import { useUiStore } from '../stores/ui'
import type { Category, ForbiddenKind, Item } from '../types'

const data = useDataStore()
const session = useSessionStore()
const ui = useUiStore()

const isStaff = computed(() => session.user?.role === 'staff')

const pending = computed(() => data.items.filter((i) => i.status === 'submitted'))
const rejected = computed(() => data.items.filter((i) => i.status === 'rejected'))
const passed = computed(() => data.items.filter((i) => i.status !== 'submitted' && i.status !== 'rejected'))

// 分类审核提示（五大类是否适合现场交换）
const REVIEW_POINTS: Record<Category, string[]> = {
  toy: ['无尖锐边角、无易脱落小零件', '电动玩具电池仓完好', '已清洁消毒'],
  book: ['无明显涂鸦缺页', '无受潮发霉', '内容适龄'],
  clothing: ['洗净无明显污渍', '尺码与季节合适', '无破损脱线'],
  stationery: ['文具剩余量可用', '无尖锐危险文具（如管制刀具）', '无过期耗材'],
  baby: ['在安全使用期限内', '无召回批次风险', '入口类用品需全新或充分消毒'],
}

// ================= 驳回弹窗 =================
const rejecting = ref<Item | null>(null)
const rejectKind = ref<ForbiddenKind>('hazard')
const rejectReason = ref('')

function openReject(item: Item) {
  rejecting.value = item
  rejectKind.value = 'hazard'
  rejectReason.value = FORBIDDEN_REASON_HINT.hazard
}

function onKindChange() {
  rejectReason.value = FORBIDDEN_REASON_HINT[rejectKind.value]
}

function confirmReject() {
  if (!rejecting.value || !session.user || !rejectReason.value.trim()) return
  data.reject(rejecting.value.id, rejectKind.value, rejectReason.value.trim(), session.user)
  rejecting.value = null
}

function approve(item: Item) {
  if (!session.user) return
  data.approve(item.id, session.user)
}
</script>

<template>
  <div class="stack" style="gap: 18px">
    <section class="card card-pad">
      <div class="row spread">
        <div>
          <h2 style="font-size: 16px">🔍 社区审核台</h2>
          <p class="hint" style="margin: 4px 0 0">
            核验五大可交换品类（玩具、绘本图书、衣物、学习用品、婴童用品）是否适合现场交换；
            危险品、食品、药品、隐私物品必须驳回并写明原因。
          </p>
        </div>
        <div class="row wrap">
          <span class="badge amber">待审核 {{ pending.length }}</span>
          <span class="badge red">已驳回 {{ rejected.length }}</span>
          <span class="badge green">已通过 {{ passed.length }}</span>
        </div>
      </div>
      <div v-if="!isStaff" class="note" style="margin-top: 12px">
        <div class="small">
          👀 当前为「{{ roleText(session.user?.role) }}」视角，仅可查看。审核操作请使用社区工作人员账号
          <strong>staff / 123456</strong> 登录。
        </div>
      </div>
    </section>

    <!-- 审核标准速查 -->
    <section class="grid cols-3">
      <div v-for="(points, cat) in REVIEW_POINTS" :key="cat" class="card card-pad">
        <div class="small" style="font-weight: 650; margin-bottom: 6px">{{ CATEGORY_LABEL[cat] }}审核要点</div>
        <ul class="hint" style="margin: 0; padding-left: 18px; line-height: 1.9">
          <li v-for="p in points" :key="p">{{ p }}</li>
        </ul>
      </div>
    </section>

    <!-- 待审核 -->
    <section>
      <div class="section-title">📥 待审核（{{ pending.length }}）</div>
      <div v-if="pending.length" class="grid cols-3">
        <div v-for="i in pending" :key="i.id">
          <ItemCard :item="i" @open="ui.openItem(i.id)" />
          <div class="card" style="border-top: none; border-radius: 0 0 12px 12px; padding: 10px 12px; margin-top: -8px">
            <div class="row spread">
              <button class="btn sm" @click="ui.openItem(i.id)">查看详情</button>
              <div class="row">
                <button class="btn danger sm" :disabled="!isStaff" @click="openReject(i)">驳回</button>
                <button class="btn primary sm" :disabled="!isStaff" @click="approve(i)">适合交换 · 通过</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="card empty">
        <div class="big">✅</div>
        待审核队列已清空
      </div>
    </section>

    <!-- 已驳回 -->
    <section v-if="rejected.length">
      <div class="section-title">🚫 已驳回（{{ rejected.length }}）——家长修改后可重新提交</div>
      <div class="card">
        <table class="table">
          <thead>
            <tr>
              <th>物品</th>
              <th>报名家庭</th>
              <th>驳回类别</th>
              <th>驳回原因</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in rejected" :key="i.id" class="clickable" @click="ui.openItem(i.id)">
              <td>{{ i.title }}</td>
              <td>{{ i.ownerName }}家</td>
              <td><span class="badge red">{{ FORBIDDEN_LABEL[i.rejectKind!] }}</span></td>
              <td class="small muted" style="max-width: 360px">{{ i.rejectReason }}</td>
              <td><button class="btn sm" @click.stop="ui.openItem(i.id)">追踪</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 驳回弹窗 -->
    <ModalShell
      v-if="rejecting"
      title="驳回报名并说明原因"
      :subtitle="`${rejecting.ownerName}家 · ${rejecting.title}`"
      @close="rejecting = null"
    >
      <div class="modal-body stack">
        <div class="field">
          <label>禁品类别<span class="req">*</span></label>
          <div class="row wrap">
            <button
              v-for="(label, key) in FORBIDDEN_LABEL"
              :key="key"
              type="button"
              class="check-pill"
              :class="{ active: rejectKind === key }"
              @click="rejectKind = key as ForbiddenKind; onKindChange()"
            >
              {{ label }}
            </button>
          </div>
        </div>
        <div class="field">
          <label>驳回原因（将展示给家长，家长可据此修改后重新提交）<span class="req">*</span></label>
          <textarea v-model="rejectReason" class="textarea" rows="4" />
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" @click="rejecting = null">取消</button>
        <button class="btn danger" :disabled="!rejectReason.trim()" @click="confirmReject">确认驳回</button>
      </div>
    </ModalShell>
  </div>
</template>
