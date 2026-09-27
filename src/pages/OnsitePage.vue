<script setup lang="ts">
import { computed, ref } from 'vue'
import ModalShell from '../components/ModalShell.vue'
import {
  CATEGORY_EMOJI,
  ENTRY_SLOTS,
  STALLS,
} from '../constants'
import { EXCEPTION_DESC, EXCEPTION_LABEL, RESOLUTION_LABEL, roleText } from '../labels'
import { useDataStore } from '../stores/data'
import { useSessionStore } from '../stores/session'
import { useUiStore } from '../stores/ui'
import type { ExceptionResolution, ExceptionType, Item } from '../types'

const data = useDataStore()
const session = useSessionStore()
const ui = useUiStore()

const operator = computed(() =>
  ['staff', 'volunteer'].includes(session.user?.role ?? '') ? session.user : null,
)
const isCharity = computed(() => session.user?.role === 'charity')

// ================= 扫码到场 =================
const codeInput = ref('')
const scanMsg = ref<{ ok: boolean; text: string } | null>(null)

function scan(code?: string) {
  if (!operator.value) return
  const value = (code ?? codeInput.value).trim()
  if (!value) return
  const item = data.scanArrive(value, operator.value)
  if (!item) {
    scanMsg.value = { ok: false, text: `未找到核销码「${value}」，请核对后重试` }
  } else if (item.status === 'arrived') {
    scanMsg.value = { ok: true, text: `✅ 已确认到场：${item.ownerName}家「${item.title}」` }
  } else {
    scanMsg.value = { ok: false, text: `「${item.title}」当前状态不支持签到（需已预约或在自由交换区）` }
  }
  codeInput.value = ''
}

const waitingArrival = computed(() => data.items.filter((i) => i.status === 'scheduled' || i.status === 'free'))
const arrivedItems = computed(() => data.items.filter((i) => i.status === 'arrived'))
const exceptionItems = computed(() => data.items.filter((i) => i.status === 'exception'))
const checkedItems = computed(() => data.items.filter((i) => i.status === 'checked'))
const unexchangedItems = computed(() => data.items.filter((i) => i.status === 'unexchanged'))

function stallName(id?: string) {
  return id ? STALLS.find((s) => s.id === id)?.name ?? '—' : '—'
}
function slotLabel(id?: string) {
  return id ? ENTRY_SLOTS.find((s) => s.id === id)?.label ?? '' : ''
}

// ================= 核销三项核验 =================
const checking = ref<Item | null>(null)
const ck = ref({ photoMatch: true, hasDamage: false, sanitizedConfirmed: true })

function openCheck(item: Item) {
  checking.value = item
  ck.value = {
    photoMatch: true,
    hasDamage: false,
    sanitizedConfirmed: item.sanitized,
  }
}

function submitCheck() {
  if (!checking.value || !operator.value) return
  data.completeCheck(checking.value.id, { ...ck.value }, operator.value)
  checking.value = null
}

const ckPass = computed(() => ck.value.photoMatch && !ck.value.hasDamage && ck.value.sanitizedConfirmed)

// ================= 现场结局 =================
const exchangeTarget = ref<Record<string, string>>({})

function completeExchange(item: Item) {
  if (!operator.value) return
  const partner =
    item.partnerItemId
      ? `${data.byId(item.partnerItemId)?.ownerName}家`
      : (exchangeTarget.value[item.id]?.trim() || '自由交换区的另一家庭')
  data.markExchanged(item.id, operator.value, partner, item.partnerItemId ? '撮合双方现场确认交换' : '自由交换区现场配对成功')
}

function markNoTaker(item: Item) {
  if (!operator.value) return
  data.markUnexchanged(item.id, operator.value)
}

// ================= 异常 =================
const exItem = ref<Item | null>(null)
const exResolution = ref<ExceptionResolution>('to_free')
const exCharity = ref(data.charities[0]?.id ?? '')
const exSummary = ref('')

function openException(item: Item, type: ExceptionType) {
  if (!operator.value) return
  exItem.value = item
  exResolution.value = 'to_free'
  exSummary.value = ''
  data.openException(item.id, type, operator.value)
}

function openExisting(item: Item) {
  exItem.value = item
  exResolution.value = 'to_free'
  exSummary.value = ''
  exCharity.value = data.charities[0]?.id ?? ''
}

function applyResolution() {
  if (!exItem.value || !session.user) return
  data.resolveException(
    exItem.value.id,
    exResolution.value,
    session.user,
    { charityId: exCharity.value, summary: exSummary.value.trim() || undefined },
  )
  exItem.value = null
}

/** 缺席登记（已过预约时间未到） */
function markNoShow(item: Item) {
  openException(item, 'no_show')
  exResolution.value = 'no_show'
  exSummary.value = '预约时段已过仍未到场，电话联系未果，按缺席登记。'
}

// ================= 捐赠 / 带回 =================
const donateCharity = ref<Record<string, string>>({})
const donateMsg = ref('')

function charityRemaining(id: string) {
  const c = data.charities.find((x) => x.id === id)
  if (!c) return 0
  return c.capacity - data.charityUsed(id)
}

function doDonate(item: Item) {
  if (!session.user) return
  const cid = donateCharity.value[item.id] ?? data.charities[0]?.id
  if (!cid) return
  if (charityRemaining(cid) <= 0) {
    // 公益接收能力不足：围绕物品开异常单继续协同
    data.openException(item.id, 'charity_full', session.user, '意向公益机构本场接收名额已满，请协调其他机构或由家长带回。')
    donateMsg.value = `${data.charities.find((c) => c.id === cid)?.name} 接收能力已满，已为「${item.title}」开异常单协同处理`
    return
  }
  data.donate(item.id, cid, session.user, '家长/各方确认转捐，公益机构现场接收并登记回执。')
  donateMsg.value = `「${item.title}」已完成转捐`
}

function doBringBack(item: Item) {
  if (!session.user) return
  data.bringBack(item.id, session.user, '活动结束时家长选择带回。')
}
</script>

<template>
  <div class="stack" style="gap: 18px">
    <!-- 扫码 -->
    <section class="card card-pad">
      <div class="row spread wrap" style="gap: 14px">
        <div>
          <h2 style="font-size: 16px">📱 现场扫码核销</h2>
          <p class="hint" style="margin: 4px 0 0">
            家长到场后，志愿者扫描物品核销码确认到场，再核对<b>照片与实物一致、有无破损、是否已完成消毒</b>三项。
          </p>
        </div>
        <div class="row">
          <input
            v-model="codeInput"
            class="input"
            style="width: 240px"
            placeholder="输入/扫描核销码，如 SWAP-2026-011"
            @keyup.enter="scan()"
          />
          <button class="btn primary" :disabled="!operator" @click="scan()">📷 扫码签到</button>
        </div>
      </div>
      <div v-if="scanMsg" class="note" :style="scanMsg.ok
        ? 'background:var(--green-soft);border-color:#a7d8bd;margin-top:10px'
        : 'background:var(--red-soft);border-color:#f0c4c4;margin-top:10px'">
        <span class="small">{{ scanMsg.text }}</span>
      </div>
      <div v-if="donateMsg" class="note" style="background:var(--amber-soft);margin-top:10px">
        <span class="small">{{ donateMsg }}</span>
      </div>
      <div v-if="!operator && !isCharity" class="note" style="margin-top: 10px">
        <span class="small">👀 当前为「{{ roleText(session.user?.role) }}」视角，仅可查看；核销操作请用 volunteer / staff 账号。</span>
      </div>
      <div v-else-if="isCharity" class="note" style="margin-top: 10px">
        <span class="small">💚 公益机构视角：可在下方查看捐赠意向、机构剩余接收能力并接收物品。</span>
      </div>
    </section>

    <!-- 三列工作台 -->
    <section class="grid cols-3" style="align-items: start">
      <!-- 待签到 -->
      <div class="card lane">
        <div class="lane-head">
          <strong>🎟️ 待签到（{{ waitingArrival.length }}）</strong>
        </div>
        <div class="lane-body stack">
          <div v-for="i in waitingArrival" :key="i.id" class="lane-item">
            <div class="row spread" style="cursor: pointer" @click="ui.openItem(i.id)">
              <strong class="small">{{ CATEGORY_EMOJI[i.category] }} {{ i.title }}</strong>
              <span class="badge" :class="i.status === 'free' ? 'cyan' : 'violet'">
                {{ i.status === 'free' ? '自由区' : '已预约' }}
              </span>
            </div>
            <div class="hint small" style="margin: 4px 0">
              {{ i.ownerName }}家 · {{ stallName(i.stallId) }} · {{ slotLabel(i.entrySlotId) }}
            </div>
            <div class="row wrap">
              <button class="btn sm primary" :disabled="!operator" @click="scan(i.code)">扫码到场</button>
              <button class="btn sm danger" :disabled="!operator" @click="markNoShow(i)">登记缺席</button>
            </div>
          </div>
          <div v-if="!waitingArrival.length" class="hint" style="text-align: center; padding: 16px 0">暂无待签到物品</div>
        </div>
      </div>

      <!-- 待核销 -->
      <div class="card lane">
        <div class="lane-head"><strong>🔎 待核销（{{ arrivedItems.length }}）</strong></div>
        <div class="lane-body stack">
          <div v-for="i in arrivedItems" :key="i.id" class="lane-item">
            <div class="row spread" style="cursor: pointer" @click="ui.openItem(i.id)">
              <strong class="small">{{ CATEGORY_EMOJI[i.category] }} {{ i.title }}</strong>
              <span class="badge amber">已到场</span>
            </div>
            <div class="hint small" style="margin: 4px 0">
              {{ i.ownerName }}家 · 报名照片：{{ i.photoLabel }}
            </div>
            <div class="row wrap">
              <button class="btn sm primary" :disabled="!operator" @click="openCheck(i)">三项核验</button>
              <button class="btn sm" @click="ui.openItem(i.id)">详情</button>
            </div>
          </div>
          <div v-if="!arrivedItems.length" class="hint" style="text-align: center; padding: 16px 0">暂无待核销物品</div>
        </div>
      </div>

      <!-- 异常处理 -->
      <div class="card lane" style="border-color: #f0cfa9">
        <div class="lane-head" style="background: var(--orange-soft)">
          <strong>⚠ 异常协同处理（{{ exceptionItems.length }}）</strong>
        </div>
        <div class="lane-body stack">
          <div v-for="i in exceptionItems" :key="i.id" class="lane-item">
            <div class="row spread" style="cursor: pointer" @click="ui.openItem(i.id)">
              <strong class="small">{{ CATEGORY_EMOJI[i.category] }} {{ i.title }}</strong>
              <span class="badge orange">{{ EXCEPTION_LABEL[i.exception!.type] }}</span>
            </div>
            <div class="hint small" style="margin: 4px 0">{{ EXCEPTION_DESC[i.exception!.type] }}</div>
            <div class="row wrap">
              <button class="btn sm" style="border-color:var(--accent);color:var(--accent)" @click="openExisting(i)">
                协同处理
              </button>
              <button class="btn sm" @click="ui.openItem(i.id)">留言/追踪</button>
            </div>
          </div>
          <div v-if="!exceptionItems.length" class="hint" style="text-align: center; padding: 16px 0">暂无异常单</div>
        </div>
      </div>
    </section>

    <!-- 核销通过：现场交换 -->
    <section class="card card-pad">
      <div class="section-title">✅ 核销通过 · 现场交换确认（{{ checkedItems.length }}）</div>
      <div v-if="checkedItems.length" class="grid cols-2">
        <div v-for="i in checkedItems" :key="i.id" class="note" style="background: var(--surface)">
          <div class="row spread">
            <div style="cursor: pointer" @click="ui.openItem(i.id)">
              <strong class="small">{{ CATEGORY_EMOJI[i.category] }} {{ i.title }}</strong>
              <div class="hint small">
                {{ i.ownerName }}家
                <template v-if="i.partnerItemId">
                  · 撮合对象：{{ data.byId(i.partnerItemId)?.ownerName }}家
                </template>
                <template v-else> · 自由交换区</template>
              </div>
            </div>
            <span class="badge green">核销通过</span>
          </div>
          <div v-if="!i.partnerItemId" class="row" style="margin: 10px 0 8px">
            <input
              v-model="exchangeTarget[i.id]"
              class="input sm"
              placeholder="自由交换：对方家庭称呼（选填）"
            />
          </div>
          <div class="row wrap">
            <button class="btn primary sm" :disabled="!operator" @click="completeExchange(i)">
              🤝 交换成功
            </button>
            <button class="btn sm" :disabled="!operator" @click="markNoTaker(i)">无人交换</button>
            <button class="btn sm" :disabled="!operator" @click="openException(i, 'child_refusal')">
              孩子反悔
            </button>
            <button class="btn sm" :disabled="!operator" @click="openException(i, 'value_dispute')">
              价值争议
            </button>
          </div>
        </div>
      </div>
      <div v-else class="empty"><div class="big">🎫</div>核销通过的物品将出现在这里，等待现场确认交换结果</div>
    </section>

    <!-- 无人交换：转捐 / 带回 -->
    <section class="card card-pad">
      <div class="row spread" style="margin-bottom: 10px">
        <div class="section-title" style="margin: 0">🍂 无人交换 · 等待处置（{{ unexchangedItems.length }}）</div>
        <div class="row wrap">
          <span v-for="c in data.charities" :key="c.id" class="badge" :class="charityRemaining(c.id) > 0 ? 'emerald' : 'red'">
            {{ c.name }} 剩余接收 {{ charityRemaining(c.id) }}/{{ c.capacity }}
          </span>
        </div>
      </div>
      <div v-if="unexchangedItems.length" class="stack">
        <div v-for="i in unexchangedItems" :key="i.id" class="note" style="background: var(--surface)">
          <div class="row spread wrap" style="gap: 10px">
            <div style="cursor: pointer" @click="ui.openItem(i.id)">
              <strong class="small">{{ CATEGORY_EMOJI[i.category] }} {{ i.title }}</strong>
              <span class="badge" :class="i.acceptDonation ? 'emerald' : 'gray'" style="margin-left: 8px">
                {{ i.acceptDonation ? '家长愿意转捐' : '家长倾向带回' }}
              </span>
              <div class="hint small">{{ i.ownerName }}家 · {{ i.title }}</div>
            </div>
            <div class="row wrap">
              <select v-model="donateCharity[i.id]" class="select sm" style="width: 170px">
                <option v-for="c in data.charities" :key="c.id" :value="c.id">
                  {{ c.name }}（剩 {{ charityRemaining(c.id) }} 件）
                </option>
              </select>
              <button class="btn primary sm" @click="doDonate(i)">💚 转捐</button>
              <button class="btn sm" @click="doBringBack(i)">🏠 家长带回</button>
              <button class="btn sm" :disabled="!operator" @click="openException(i, 'charity_full')">
                公益接收力不足
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty"><div class="big">🍃</div>暂无无人交换的物品</div>
    </section>

    <!-- 核销弹窗 -->
    <ModalShell v-if="checking" title="现场核销 · 三项核验" :subtitle="`${checking.ownerName}家 · ${checking.title}（${checking.code}）`" @close="checking = null">
      <div class="modal-body stack">
        <div class="row" style="gap: 14px; align-items: center">
          <div class="photo-thumb" style="width: 190px; flex: none">
            <template v-if="checking.photoDataUrl"><img :src="checking.photoDataUrl" /></template>
            <template v-else>
              <span class="ph-emoji">{{ CATEGORY_EMOJI[checking.category] }}</span>
              <span>报名照片：{{ checking.photoLabel }}</span>
            </template>
          </div>
          <div class="grow hint small">
            请将实物与报名照片逐项比对：<br />
            · 品类、款式、数量是否一致<br />
            · 是否出现照片中没有的破损/缺件<br />
            · 家长申报消毒情况：<b>{{ checking.sanitized ? '已消毒' : '未消毒' }}</b>，需现场确认
          </div>
        </div>

        <label class="check-line">
          <input type="checkbox" v-model="ck.photoMatch" />
          <span>照片与实物<b>一致</b>（不一致请取消勾选，将转异常处理）</span>
        </label>
        <label class="check-line">
          <input type="checkbox" v-model="ck.hasDamage" />
          <span>现场发现<b>破损或缺件</b>（勾选表示存在问题）</span>
        </label>
        <label class="check-line">
          <input type="checkbox" v-model="ck.sanitizedConfirmed" />
          <span>已确认物品<b>完成消毒</b></span>
        </label>

        <div class="note" :style="ckPass ? 'background:var(--green-soft)' : 'background:var(--red-soft)'">
          <span class="small">
            {{ ckPass ? '✅ 三项核验全部通过，物品可进入现场交换。' : '⚠ 核验未通过，提交后将自动开立异常单，由社区、志愿者、家长及公益机构协同处理。' }}
          </span>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" @click="checking = null">取消</button>
        <button class="btn primary" @click="submitCheck">{{ ckPass ? '核销通过' : '提交并转异常处理' }}</button>
      </div>
    </ModalShell>

    <!-- 异常协同弹窗 -->
    <ModalShell
      v-if="exItem"
      title="⚠ 异常协同处理"
      :subtitle="`${exItem.ownerName}家 · ${exItem.title} · ${EXCEPTION_LABEL[exItem.exception!.type]}`"
      @close="exItem = null"
    >
      <div class="modal-body stack">
        <div class="note" style="background: var(--orange-soft)">
          <div class="small">{{ EXCEPTION_DESC[exItem.exception!.type] }}</div>
        </div>
        <p class="hint small" style="margin: 0">
          社区工作人员、志愿者、家长与公益机构可在「物品详情 · 多方协同留言」中围绕本物品沟通；
          这里登记各方协商后的最终处理方式，全程写入物品时间线。
        </p>
        <div class="field">
          <label>处理方式<span class="req">*</span></label>
          <div class="row wrap">
            <button
              v-for="(label, key) in RESOLUTION_LABEL"
              :key="key"
              type="button"
              class="check-pill"
              :class="{ active: exResolution === key }"
              @click="exResolution = key as ExceptionResolution"
            >
              {{ label }}
            </button>
          </div>
        </div>
        <div v-if="exResolution === 'donate'" class="field">
          <label>接收公益机构</label>
          <select v-model="exCharity" class="select">
            <option v-for="c in data.charities" :key="c.id" :value="c.id">
              {{ c.name }}（{{ c.contact }}，剩余接收 {{ charityRemaining(c.id) }} 件）
            </option>
          </select>
        </div>
        <div class="field">
          <label>处理说明 / 协商结论（记入时间线）</label>
          <textarea v-model="exSummary" class="textarea" rows="3" placeholder="如：已与家长电话沟通，同意转自由交换区继续尝试" />
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" @click="exItem = null">取消</button>
        <button class="btn primary" @click="applyResolution">确认处理并关闭异常单</button>
      </div>
    </ModalShell>
  </div>
</template>

<style scoped>
.lane {
  overflow: hidden;
}
.lane-head {
  padding: 11px 14px;
  border-bottom: 1px solid var(--line);
  background: var(--surface-2);
  font-size: 13.5px;
}
.lane-body {
  padding: 12px;
  max-height: 520px;
  overflow-y: auto;
}
.lane-item {
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  background: var(--surface);
}
.check-line {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13.5px;
}
.check-line input {
  width: 17px;
  height: 17px;
  accent-color: var(--brand);
}
.select.sm,
.input.sm {
  padding: 5px 9px;
  font-size: 12.5px;
}
</style>
