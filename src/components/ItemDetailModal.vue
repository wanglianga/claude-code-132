<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  CONDITION_LABEL,
  ENTRY_SLOTS,
  FORBIDDEN_LABEL,
  STALLS,
  VALUE_LABEL,
} from '../constants'
import { ROLE_LABEL, EXCEPTION_LABEL, roleText } from '../labels'
import { useDataStore } from '../stores/data'
import { useSessionStore } from '../stores/session'
import type { Item } from '../types'
import ModalShell from './ModalShell.vue'
import StatusBadge from './StatusBadge.vue'
import ItemFlowStrip from './ItemFlowStrip.vue'

const props = defineProps<{ item: Item | null }>()
const emit = defineEmits<{ close: []; changed: [] }>()

const data = useDataStore()
const session = useSessionStore()

const item = computed(() => props.item)

function fmtTime(ts: number) {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`
}

const stallName = computed(() =>
  item.value?.stallId ? STALLS.find((s) => s.id === item.value!.stallId)?.name : '',
)
const slotLabel = computed(() =>
  item.value?.entrySlotId
    ? ENTRY_SLOTS.find((s) => s.id === item.value!.entrySlotId)?.label
    : '',
)
const partner = computed(() =>
  item.value?.partnerItemId ? data.byId(item.value.partnerItemId) : undefined,
)
const charityName = computed(() =>
  item.value?.charityId ? data.charities.find((c) => c.id === item.value!.charityId)?.name : '',
)

const draft = ref('')

function sendNote() {
  if (!item.value || !draft.value.trim() || !session.user) return
  data.addNote(item.value.id, draft.value, { role: session.user.role, name: session.user.name })
  draft.value = ''
  emit('changed')
}

const canLeaveNote = computed(() => !!session.user && !!item.value)
</script>

<template>
  <ModalShell
    v-if="item"
    :title="`${CATEGORY_EMOJI[item.category]} ${item.title}`"
    :subtitle="`核销码 ${item.code} · ${item.ownerName}家 · 孩子：${item.childName}（${item.childAge} 岁）`"
    width="820px"
    @close="emit('close')"
  >
    <div class="modal-body">
      <ItemFlowStrip :item="item" class="card-pad card" style="margin-bottom: 14px" />

      <div class="grid cols-2" style="gap: 14px">
        <!-- 左：物品信息 -->
        <div class="card card-pad stack">
          <div class="photo-thumb">
            <template v-if="item.photoDataUrl">
              <img :src="item.photoDataUrl" alt="成色照片" />
            </template>
            <template v-else>
              <span class="ph-emoji">{{ CATEGORY_EMOJI[item.category] }}</span>
              <span>{{ item.photoLabel }}</span>
              <span class="hint">（演示环境为照片占位，可在报名时上传）</span>
            </template>
          </div>
          <div class="row wrap">
            <StatusBadge :status="item.status" />
            <span class="badge slate">{{ CATEGORY_LABEL[item.category] }}</span>
            <span class="badge gray">{{ CONDITION_LABEL[item.condition] }}</span>
            <span class="badge blue">{{ VALUE_LABEL[item.valueBand] }} · 估值约 ¥{{ item.price }}</span>
          </div>
          <p class="small muted" style="margin: 0">{{ item.desc }}</p>
          <table class="table small">
            <tbody>
            <tr>
              <td class="muted" style="width: 96px">已消毒</td>
              <td>{{ item.sanitized ? '是，家长已自行消毒' : '否' }}</td>
            </tr>
            <tr>
              <td class="muted">期望换取</td>
              <td>
                <span v-if="item.expectCategories.length" class="tag-list">
                  <span v-for="c in item.expectCategories" :key="c" class="badge teal">
                    {{ CATEGORY_EMOJI[c] }} {{ CATEGORY_LABEL[c] }}
                  </span>
                </span>
                <span v-else class="muted">不限类型</span>
              </td>
            </tr>
            <tr>
              <td class="muted">可到场时间</td>
              <td>
                {{ item.availableSlotIds.map((id) => ENTRY_SLOTS.find((s) => s.id === id)?.label).join('、') }}
              </td>
            </tr>
            <tr>
              <td class="muted">接受公益捐赠</td>
              <td>{{ item.acceptDonation ? '愿意' : '暂不考虑' }}</td>
            </tr>
            <tr v-if="stallName">
              <td class="muted">预约摊位</td>
              <td>{{ stallName }} <span v-if="slotLabel">· {{ slotLabel }}</span></td>
            </tr>
            <tr v-if="partner">
              <td class="muted">撮合对象</td>
              <td>{{ partner.ownerName }}家的「{{ partner.title }}」</td>
            </tr>
            </tbody>
          </table>

          <div v-if="item.status === 'rejected'" class="note" style="background: var(--red-soft); border-color: #f0c4c4">
            <div class="n-head">
              <span class="badge red">{{ FORBIDDEN_LABEL[item.rejectKind!] }} · 驳回</span>
            </div>
            <div class="small">{{ item.rejectReason }}</div>
          </div>

          <div v-if="item.check" class="note">
            <div class="n-head"><strong class="small">现场核销记录</strong></div>
            <div class="small muted" style="margin-bottom: 4px">
              到场：{{ fmtTime(item.check.arrivedAt) }} · {{ item.check.volunteerName }}
            </div>
            <div v-if="item.check.checkedAt" class="tag-list">
              <span class="badge" :class="item.check.photoMatch ? 'green' : 'red'">
                {{ item.check.photoMatch ? '✓' : '✕' }} 照片与实物一致
              </span>
              <span class="badge" :class="item.check.hasDamage ? 'red' : 'green'">
                {{ item.check.hasDamage ? '✕' : '✓' }} 无破损
              </span>
              <span class="badge" :class="item.check.sanitizedConfirmed ? 'green' : 'red'">
                {{ item.check.sanitizedConfirmed ? '✓' : '✕' }} 已完成消毒
              </span>
            </div>
          </div>

          <div v-if="item.exception" class="note" style="border-color: #f0cfa9; background: var(--orange-soft)">
            <div class="n-head">
              <span class="badge orange">⚠ {{ EXCEPTION_LABEL[item.exception.type] }}</span>
              <span class="hint">{{ fmtTime(item.exception.openedAt) }} · {{ item.exception.openedByName }}开单</span>
            </div>
            <div v-if="item.exception.summary" class="small">{{ item.exception.summary }}</div>
            <div v-else class="small muted">各方正在围绕这件物品协同处理……</div>
          </div>

          <div v-if="item.outcomeNote" class="note">
            <div class="small">📝 {{ item.outcomeNote }}</div>
          </div>
          <div v-if="charityName" class="small muted">捐赠去向：{{ charityName }}</div>

          <!-- 页面注入的操作区 -->
          <slot name="actions" :item="item" />
        </div>

        <!-- 右：时间线 + 留言 -->
        <div class="stack">
          <div class="card card-pad">
            <div class="section-title">🧭 全流程追踪</div>
            <ul class="timeline">
              <li v-for="(t, idx) in item.timeline" :key="idx">
                <div class="t-time">{{ fmtTime(t.at) }} · {{ t.byName }}（{{ ROLE_LABEL[t.byRole] }}）</div>
                <div class="t-text">{{ t.text }}</div>
              </li>
            </ul>
          </div>

          <div class="card card-pad">
            <div class="section-title">💬 多方协同留言</div>
            <p class="hint" style="margin: -6px 0 10px">
              社区工作人员、现场志愿者、家长与公益机构围绕同一件物品沟通，处理记录全程留痕。
            </p>
            <div class="stack" style="margin-bottom: 12px">
              <div v-for="n in item.notes" :key="n.id" class="note">
                <div class="n-head">
                  <span class="badge slate">{{ ROLE_LABEL[n.role] }}</span>
                  <strong>{{ n.author }}</strong>
                  <span class="hint">{{ fmtTime(n.at) }}</span>
                </div>
                <div class="small">{{ n.content }}</div>
              </div>
              <div v-if="!item.notes.length" class="hint">暂无留言</div>
            </div>
            <div v-if="canLeaveNote" class="row" style="align-items: flex-start">
              <textarea
                v-model="draft"
                class="textarea"
                rows="2"
                :placeholder="`以「${session.user?.name}（${roleText(session.user?.role)}）」身份补充处理意见…`"
              />
              <button class="btn primary" style="margin-top: 2px" @click="sendNote">发送</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ModalShell>
</template>
