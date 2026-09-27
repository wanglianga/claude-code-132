import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { CHARITIES, ageBandOf, valueBandOf } from '../constants'
import { recommend } from '../matching'
import { buildSeed } from '../seed'
import type {
  Category,
  Condition,
  ExceptionResolution,
  ExceptionType,
  ForbiddenKind,
  Item,
  ItemNote,
  MatchProposal,
  Role,
} from '../types'

const STORAGE_KEY = 'swap:data:v1'

export interface ItemForm {
  ownerName: string
  phone: string
  childName: string
  childAge: number
  category: Category
  title: string
  desc: string
  condition: Condition
  photoLabel: string
  photoDataUrl?: string
  sanitized: boolean
  expectCategories: Category[]
  price: number
  availableSlotIds: string[]
  acceptDonation: boolean
}

interface PersistShape {
  items: Item[]
  proposals: MatchProposal[]
}

function load(): PersistShape {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      return JSON.parse(raw) as PersistShape
    } catch {
      // 数据损坏时回落到种子数据
    }
  }
  return buildSeed()
}

let uid = 0
const nextId = (p: string) => `${p}-${Date.now().toString(36)}-${++uid}`

export const useDataStore = defineStore('data', () => {
  const initial = load()
  const items = ref<Item[]>(initial.items)
  const proposals = ref<MatchProposal[]>(initial.proposals)

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: items.value, proposals: proposals.value }))
  }

  function byId(id: string): Item | undefined {
    return items.value.find((i) => i.id === id)
  }

  function log(item: Item, text: string, role: Role, name: string) {
    item.timeline.push({ at: Date.now(), text, byRole: role, byName: name })
  }

  function patchStatus(item: Item, status: Item['status'], text: string, role: Role, name: string) {
    item.status = status
    log(item, text, role, name)
    persist()
  }

  // ================= 家长报名 =================
  function submit(form: ItemForm, who: { role: Role; name: string }): Item {
    const now = Date.now()
    const item: Item = {
      id: nextId('i'),
      code: `SWAP-2026-${String(100 + items.value.length + 1).padStart(3, '0')}`,
      ...form,
      childAge: Number(form.childAge),
      ageBand: ageBandOf(Number(form.childAge)),
      valueBand: valueBandOf(Number(form.price)),
      submittedAt: now,
      status: 'submitted',
      timeline: [{ at: now, text: '提交报名信息，等待社区审核', byRole: who.role, byName: who.name }],
      notes: [],
    }
    items.value.unshift(item)
    persist()
    return item
  }

  /** 驳回后家长修改重新提交 */
  function resubmit(
    id: string,
    patch: Partial<Pick<ItemForm, 'category' | 'title' | 'desc' | 'photoLabel' | 'condition' | 'sanitized'>>,
    who: { role: Role; name: string },
  ) {
    const item = byId(id)
    if (!item || item.status !== 'rejected') return
    Object.assign(item, patch)
    item.rejectKind = undefined
    item.rejectReason = undefined
    patchStatus(item, 'submitted', '家长修改后重新提交，等待再次审核', who.role, who.name)
  }

  // ================= 社区审核 =================
  function approve(id: string, who: { role: Role; name: string }) {
    const item = byId(id)
    if (!item || item.status !== 'submitted') return
    patchStatus(item, 'approved', '审核通过，品类适合现场交换，进入撮合池', who.role, who.name)
  }

  function reject(
    id: string,
    kind: ForbiddenKind,
    reason: string,
    who: { role: Role; name: string },
  ) {
    const item = byId(id)
    if (!item || item.status !== 'submitted') return
    item.rejectKind = kind
    item.rejectReason = reason
    patchStatus(item, 'rejected', `审核驳回：${reason}`, who.role, who.name)
  }

  // ================= 撮合 =================
  const recommendations = computed(() => recommend(items.value, proposals.value))

  function createProposal(rec: {
    itemAId: string
    itemBId: string
    score: number
    reasons: string[]
    stallId: string
    entrySlotId: string
  }) {
    // 防止重复建单
    const dup = proposals.value.find(
      (p) =>
        p.status === 'pending' &&
        ((p.itemAId === rec.itemAId && p.itemBId === rec.itemBId) ||
          (p.itemAId === rec.itemBId && p.itemBId === rec.itemAId)),
    )
    if (dup) return dup
    const proposal: MatchProposal = {
      id: nextId('p'),
      itemAId: rec.itemAId,
      itemBId: rec.itemBId,
      score: rec.score,
      reasons: rec.reasons,
      status: 'pending',
      acceptA: false,
      acceptB: false,
      stallId: rec.stallId,
      entrySlotId: rec.entrySlotId,
      createdAt: Date.now(),
    }
    proposals.value.unshift(proposal)
    const a = byId(rec.itemAId)
    const b = byId(rec.itemBId)
    if (a) log(a, '社区发起撮合邀约，等待双方家长确认', 'staff', '王社工')
    if (b) log(b, '社区发起撮合邀约，等待双方家长确认', 'staff', '王社工')
    persist()
    return proposal
  }

  function respondProposal(
    proposalId: string,
    side: 'A' | 'B',
    accept: boolean,
    who: { role: Role; name: string },
  ) {
    const p = proposals.value.find((x) => x.id === proposalId)
    if (!p || p.status !== 'pending') return
    if (side === 'A') p.acceptA = accept
    else p.acceptB = accept

    const self = byId(side === 'A' ? p.itemAId : p.itemBId)
    if (self) log(self, accept ? '家长接受撮合邀约' : '家长婉拒撮合邀约', who.role, who.name)

    if (!accept) {
      p.status = 'declined'
      p.decidedAt = Date.now()
      const other = byId(side === 'A' ? p.itemBId : p.itemAId)
      if (other) log(other, '对方未接受撮合，物品继续留在撮合池', 'staff', '王社工')
    } else if (p.acceptA && p.acceptB) {
      p.status = 'accepted'
      p.decidedAt = Date.now()
      const a = byId(p.itemAId)
      const b = byId(p.itemBId)
      if (a && b) {
        a.proposalId = p.id
        a.partnerItemId = b.id
        a.stallId = p.stallId
        a.entrySlotId = p.entrySlotId
        b.proposalId = p.id
        b.partnerItemId = a.id
        b.stallId = p.stallId
        b.entrySlotId = p.entrySlotId
        patchStatus(a, 'scheduled', `双方接受撮合，预约成功`, 'staff', '王社工')
        patchStatus(b, 'scheduled', `双方接受撮合，预约成功`, 'staff', '王社工')
      }
    }
    persist()
  }

  /** 未匹配物品进入自由交换区 */
  function moveToFree(id: string, who: { role: Role; name: string }, reason?: string) {
    const item = byId(id)
    if (!item) return
    if (!['approved', 'scheduled'].includes(item.status) && !(item.status === 'exception')) return
    item.stallId = 'free'
    item.entrySlotId = item.entrySlotId ?? item.availableSlotIds[0]
    item.partnerItemId = undefined
    item.proposalId = undefined
    patchStatus(
      item,
      'free',
      reason ?? '未匹配到合适组合，转入自由交换区现场自由撮合',
      who.role,
      who.name,
    )
  }

  // ================= 现场核销 =================
  /** 志愿者扫码（或按核销码搜索）确认到场 */
  function scanArrive(codeOrId: string, who: { role: Role; name: string }): Item | null {
    const item =
      items.value.find((i) => i.code === codeOrId.trim()) ??
      items.value.find((i) => i.id === codeOrId.trim())
    if (!item) return null
    if (!['scheduled', 'free'].includes(item.status)) return item
    item.check = { arrivedAt: Date.now(), volunteerName: who.name, photoMatch: false, hasDamage: false, sanitizedConfirmed: false, pass: false }
    patchStatus(item, 'arrived', `志愿者扫码确认物品到场（核销码 ${item.code}）`, who.role, who.name)
    return item
  }

  /** 核销三项核验：照片一致、无破损、已消毒 */
  function completeCheck(
    id: string,
    result: { photoMatch: boolean; hasDamage: boolean; sanitizedConfirmed: boolean },
    who: { role: Role; name: string },
  ): boolean {
    const item = byId(id)
    if (!item || item.status !== 'arrived' || !item.check) return false
    const pass = result.photoMatch && !result.hasDamage && result.sanitizedConfirmed
    Object.assign(item.check, result, { checkedAt: Date.now(), pass })
    if (pass) {
      patchStatus(item, 'checked', '现场核销通过：照片一致、无破损、已确认消毒', who.role, who.name)
    } else {
      const problems: string[] = []
      if (!result.photoMatch) problems.push('物品与照片不符')
      if (result.hasDamage) problems.push('实物存在破损')
      if (!result.sanitizedConfirmed) problems.push('未完成消毒')
      item.exception = {
        type: 'photo_mismatch',
        openedAt: Date.now(),
        openedBy: who.role,
        openedByName: who.name,
      }
      patchStatus(item, 'exception', `核销未通过（${problems.join('、')}），转异常协同处理`, who.role, who.name)
    }
    return pass
  }

  // ================= 异常协同 =================
  function openException(id: string, type: ExceptionType, who: { role: Role; name: string }, content?: string) {
    const item = byId(id)
    if (!item) return
    item.exception = { type, openedAt: Date.now(), openedBy: who.role, openedByName: who.name }
    const label: Record<ExceptionType, string> = {
      no_show: '家长临时缺席',
      photo_mismatch: '物品与照片不符 / 现场破损',
      child_refusal: '孩子现场反悔',
      value_dispute: '双方对物品价值有争议',
      charity_full: '公益组织接收能力不足',
    }
    patchStatus(item, 'exception', `异常开单：${label[type]}`, who.role, who.name)
    if (content) addNote(id, content, who)
  }

  function resolveException(
    id: string,
    resolution: ExceptionResolution,
    who: { role: Role; name: string },
    payload?: { charityId?: string; summary?: string },
  ) {
    const item = byId(id)
    if (!item || !item.exception || item.exception.resolvedAt) return
    item.exception.resolution = resolution
    item.exception.resolvedAt = Date.now()
    item.exception.summary = payload?.summary

    const text = (payload?.summary ? payload.summary + '；' : '') + '异常关闭'
    switch (resolution) {
      case 'continue_exchange':
        patchStatus(item, 'checked', text + '，核验补齐后继续现场交换', who.role, who.name)
        break
      case 'to_free':
        item.stallId = 'free'
        patchStatus(item, 'free', text + '，转入自由交换区', who.role, who.name)
        break
      case 'donate':
        item.charityId = payload?.charityId
        patchStatus(item, 'donated', text + '，完成公益转捐', who.role, who.name)
        break
      case 'bring_back':
        patchStatus(item, 'brought_back', text + '，物品由家长带回', who.role, who.name)
        break
      case 'no_show':
        patchStatus(item, 'no_show', text + '，按缺席处理', who.role, who.name)
        break
      case 'waiting':
        // 保持异常中，仅记录协商进展
        log(item, '各方继续协商，异常单暂挂', who.role, who.name)
        persist()
        break
    }
    item.outcomeNote = payload?.summary ?? item.outcomeNote
  }

  // ================= 现场结局 =================
  function markExchanged(id: string, who: { role: Role; name: string }, withWhom?: string, note?: string) {
    const item = byId(id)
    if (!item || !['checked', 'free'].includes(item.status)) return
    item.freeExchangeWith = withWhom
    item.outcomeNote = note
    patchStatus(
      item,
      'exchanged',
      withWhom ? `与${withWhom}完成交换` : '撮合配对交换成功' + (note ? `：${note}` : ''),
      who.role,
      who.name,
    )
  }

  function markUnexchanged(id: string, who: { role: Role; name: string }) {
    const item = byId(id)
    if (!item || !['checked', 'free'].includes(item.status)) return
    patchStatus(item, 'unexchanged', '本场无人交换，等待家长选择转捐或带回', who.role, who.name)
  }

  function donate(id: string, charityId: string, who: { role: Role; name: string }, note?: string) {
    const item = byId(id)
    if (!item) return
    item.charityId = charityId
    item.outcomeNote = note ?? item.outcomeNote
    patchStatus(item, 'donated', `由公益机构接收转捐`, who.role, who.name)
  }

  function bringBack(id: string, who: { role: Role; name: string }, note?: string) {
    const item = byId(id)
    if (!item) return
    item.outcomeNote = note ?? item.outcomeNote
    patchStatus(item, 'brought_back', '家长选择带回物品', who.role, who.name)
  }

  // ================= 协作留言 =================
  function addNote(id: string, content: string, who: { role: Role; name: string }) {
    const item = byId(id)
    if (!item || !content.trim()) return
    const note: ItemNote = { id: nextId('n'), at: Date.now(), role: who.role, author: who.name, content: content.trim() }
    item.notes.push(note)
    persist()
  }

  function resetDemo() {
    const seed = buildSeed()
    items.value = seed.items
    proposals.value = seed.proposals
    persist()
  }

  // ================= 复盘统计 =================
  const stats = computed(() => {
    const list = items.value
    const total = list.length
    const arrived = list.filter((i) => i.check?.arrivedAt).length
    const exchanged = list.filter((i) => i.status === 'exchanged').length
    const donated = list.filter((i) => i.status === 'donated')
    const noShow = list.filter((i) => i.status === 'no_show')
    const disputes = list.filter(
      (i) => i.exception && ['photo_mismatch', 'value_dispute', 'child_refusal'].includes(i.exception.type),
    )
    /** 交换成功率 = 交换成功 / 已到场物品 */
    const successRate = arrived ? Math.round((exchanged / arrived) * 100) : 0
    return { total, arrived, exchanged, donated, noShow, disputes, successRate }
  })

  /** 下一场品类缺口：撮合池中"期望得到但无人供给"的品类 */
  const categoryGaps = computed(() => {
    const demand = new Map<Category, number>()
    const supply = new Set<Category>()
    for (const i of items.value) {
      if (['donated', 'brought_back', 'rejected'].includes(i.status)) continue
      supply.add(i.category)
      for (const c of i.expectCategories) demand.set(c, (demand.get(c) ?? 0) + 1)
    }
    return [...demand.entries()]
      .map(([category, count]) => ({
        category,
        demand: count,
        supplied: supply.has(category),
        /** 缺口指数 = 需求件数 ×（本场该类未被供给 ? 2 : 1） */
        gap: count * (supply.has(category) ? 1 : 2),
      }))
      .sort((a, b) => b.gap - a.gap)
  })

  function charityUsed(charityId: string) {
    return items.value.filter((i) => i.status === 'donated' && i.charityId === charityId).length
  }

  const charities = CHARITIES

  return {
    items,
    proposals,
    recommendations,
    stats,
    categoryGaps,
    charities,
    byId,
    charityUsed,
    submit,
    resubmit,
    approve,
    reject,
    createProposal,
    respondProposal,
    moveToFree,
    scanArrive,
    completeCheck,
    openException,
    resolveException,
    markExchanged,
    markUnexchanged,
    donate,
    bringBack,
    addNote,
    resetDemo,
  }
})
