import { setActivePinia, createPinia } from 'pinia'
import { buildSeed } from '../src/seed'
import { recommend } from '../src/matching'
import { useDataStore } from '../src/stores/data'
import type { Item } from '../src/types'

// localStorage 桩
const mem = new Map<string, string>()
;(globalThis as any).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
}

let pass = 0
let fail = 0
function assert(cond: boolean, msg: string) {
  if (cond) { pass++; console.log('  ✓', msg) }
  else { fail++; console.error('  ✗', msg) }
}

// 1. 种子数据 + 推荐
const seed = buildSeed()
const recs = recommend(seed.items, seed.proposals)
console.log('推荐组合数:', recs.length)
assert(recs.length >= 2, `种子数据至少推荐出 2 对组合（实际 ${recs.length}）`)
const top = recs[0]
const a = seed.items.find((i) => i.id === top.itemAId)!
const b = seed.items.find((i) => i.id === top.itemBId)!
assert(
  (a.category === 'book' && b.category === 'toy') || (a.category === 'toy' && b.category === 'book'),
  '最高分推荐是 绘本《好饿的毛毛虫》⇄ 木质积木',
)

// 2. Store 全流程演练
setActivePinia(createPinia())
const data = useDataStore()

// 2a. 家长报名
const item = data.submit(
  {
    ownerName: '测试妈妈', phone: '13800001234', childName: '小宝', childAge: 4,
    category: 'toy', title: '测试小火车', desc: '', condition: 'ninety', photoLabel: '照片',
    sanitized: true, expectCategories: ['book'], price: 40, availableSlotIds: ['s1'], acceptDonation: true,
  },
  { role: 'parent', name: '测试妈妈' },
)
assert(item.status === 'submitted' && item.ageBand === '3-5' && item.valueBand === 2, '报名后状态 submitted，年龄段/价值档自动计算')

// 2b. 审核
data.approve(item.id, { role: 'staff', name: '王社工' })
assert(item.status === 'approved', '审核通过 -> approved')

// 2c. 药品驳回路径
const med = data.submit(
  {
    ownerName: '测试爸爸', phone: '13800009999', childName: '贝贝', childAge: 3,
    category: 'baby', title: '退烧药', desc: '', condition: 'like_new', photoLabel: '药',
    sanitized: false, expectCategories: [], price: 30, availableSlotIds: ['s2'], acceptDonation: false,
  },
  { role: 'parent', name: '测试爸爸' },
)
data.reject(med.id, 'medicine', '药品禁止流转', { role: 'staff', name: '王社工' })
assert(med.status === 'rejected' && med.rejectKind === 'medicine', '药品被驳回且记录禁品类别与原因')
data.resubmit(med.id, { category: 'book', title: '小熊绘本', photoLabel: '书' }, { role: 'parent', name: '测试爸爸' })
assert(med.status === 'submitted' && !med.rejectKind, '家长修改后可重新提交')

// 2d. 发起邀约 + 双方接受 -> 预约
const pool = data.items.filter((i) => i.status === 'approved')
const pair = recommend(data.items, data.proposals).find(
  (r) => r.itemAId === item.id || r.itemBId === item.id,
)
assert(!!pair, '新报名物品出现在推荐中')
if (pair) {
  const p = data.createProposal(pair)
  data.respondProposal(p.id, 'A', true, { role: 'parent', name: 'A家长' })
  data.respondProposal(p.id, 'B', true, { role: 'parent', name: 'B家长' })
  assert(item.status === 'scheduled' && !!item.stallId && !!item.entrySlotId, '双方接受 -> scheduled，获得摊位与入场时段')

  // 2e. 扫码到场 + 核销通过 + 交换成功
  const arrived = data.scanArrive(item.code, { role: 'volunteer', name: '李志愿者' })
  assert(arrived?.status === 'arrived', '核销码扫码 -> arrived')
  data.completeCheck(item.id, { photoMatch: true, hasDamage: false, sanitizedConfirmed: true }, { role: 'volunteer', name: '李志愿者' })
  assert(item.status === 'checked' && item.check?.pass === true, '三项核验通过 -> checked')
  data.markExchanged(item.id, { role: 'staff', name: '王社工' })
  assert(item.status === 'exchanged', '交换成功 -> exchanged')
}

// 2f. 核销不通过 -> 异常 -> 转捐
const free = data.items.find((i) => i.status === 'approved')!
data.moveToFree(free.id, { role: 'staff', name: '王社工' })
assert(free.status === 'free' && free.stallId === 'free', '未匹配物品 -> free 自由交换区')
data.scanArrive(free.code, { role: 'volunteer', name: '李志愿者' })
data.completeCheck(free.id, { photoMatch: false, hasDamage: true, sanitizedConfirmed: true }, { role: 'volunteer', name: '李志愿者' })
assert(free.status === 'exception' && free.exception?.type === 'photo_mismatch', '照片不符+破损 -> 异常单')
data.addNote(free.id, '家长同意转自由区', { role: 'parent', name: free.ownerName })
data.resolveException(free.id, 'donate', { role: 'staff', name: '王社工' }, { charityId: 'c1', summary: '协商后转捐' })
assert(free.status === 'donated' && free.charityId === 'c1' && free.notes.length === 1, '异常协商后转捐，留言留痕')

// 2g. 公益容量
const c1Used = data.charityUsed('c1')
assert(c1Used >= 1, '公益机构接收计数增加')

// 2h. 统计与缺口
const st = data.stats
assert(st.total > 0 && st.arrived > 0 && st.successRate > 0, `复盘统计可计算（成功率 ${st.successRate}%）`)
assert(data.categoryGaps.length > 0, '品类缺口可计算')
const tracked: Item['status'][] = data.items.map((i) => i.status)
console.log('终态分布:', JSON.stringify(tracked.reduce<Record<string, number>>((m, x) => (m[x] = (m[x] ?? 0) + 1, m), {})))

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILED'}: ${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
