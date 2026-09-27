// ============ 角色 ============
export type Role = 'parent' | 'staff' | 'volunteer' | 'charity'

// ============ 物品分类 ============
/** 允许现场交换的五大类 */
export type Category = 'toy' | 'book' | 'clothing' | 'stationery' | 'baby'
/** 必须驳回的四类禁品 */
export type ForbiddenKind = 'hazard' | 'food' | 'medicine' | 'privacy'

export type AgeBandKey = '0-2' | '3-5' | '6-8' | '9-12'

export type Condition = 'like_new' | 'ninety' | 'eighty' | 'worn'

/** 价值区间 1=20元以下 2=20-50元 3=50元以上 */
export type ValueBand = 1 | 2 | 3

// ============ 物品全生命周期状态 ============
export type ItemStatus =
  | 'submitted' // 已提交，等待社区审核
  | 'rejected' // 审核驳回（家长可修改后重新提交）
  | 'approved' // 审核通过，等待撮合
  | 'scheduled' // 双方接受撮合，已预约入场时段与摊位
  | 'free' // 未匹配，进入自由交换区
  | 'arrived' // 已带到现场（扫码确认到场）
  | 'checked' // 现场核销通过
  | 'exception' // 异常处理中（缺席/不符/反悔/争议/公益接收力不足）
  | 'exchanged' // 终态：交换成功
  | 'unexchanged' // 终态（本场）：无人交换，待家长决定转捐或带回
  | 'donated' // 终态：已转公益捐赠
  | 'brought_back' // 终态：家长带回
  | 'no_show' // 终态：临时缺席、未到场

// ============ 异常 ============
export type ExceptionType =
  | 'no_show' // 家长临时缺席
  | 'photo_mismatch' // 物品与照片不符 / 现场发现破损
  | 'child_refusal' // 孩子现场反悔
  | 'value_dispute' // 双方价值争议
  | 'charity_full' // 公益组织接收能力不足

export type ExceptionResolution =
  | 'continue_exchange' // 解决争议后继续交换
  | 'to_free' // 转入自由交换区
  | 'donate' // 转捐
  | 'bring_back' // 带回
  | 'no_show' // 确认缺席
  | 'waiting' // 暂挂，继续协商

// ============ 核销记录 ============
export interface CheckRecord {
  arrivedAt: number
  checkedAt?: number
  volunteerName: string
  photoMatch?: boolean // 照片与实物一致
  hasDamage?: boolean // 是否有破损
  sanitizedConfirmed?: boolean // 是否已完成消毒
  pass?: boolean
}

// ============ 异常单 ============
export interface ExceptionCase {
  type: ExceptionType
  openedAt: number
  openedBy: Role
  openedByName: string
  resolvedAt?: number
  resolution?: ExceptionResolution
  summary?: string
}

// ============ 协作留言（社区/志愿者/家长/公益围绕同一物品） ============
export interface ItemNote {
  id: string
  at: number
  role: Role
  author: string
  content: string
}

// ============ 时间线 ============
export interface TimelineEvent {
  at: number
  text: string
  byRole: Role
  byName: string
}

// ============ 物品 ============
export interface Item {
  id: string
  /** 现场核销码 */
  code: string
  // —— 报名信息 ——
  ownerName: string
  phone: string
  childName: string
  childAge: number
  ageBand: AgeBandKey
  category: Category
  title: string
  desc: string
  condition: Condition
  photoLabel: string
  photoDataUrl?: string
  sanitized: boolean
  expectCategories: Category[]
  price: number
  valueBand: ValueBand
  availableSlotIds: string[]
  acceptDonation: boolean
  submittedAt: number
  // —— 流程状态 ——
  status: ItemStatus
  rejectKind?: ForbiddenKind
  rejectReason?: string
  // —— 撮合 / 预约 ——
  proposalId?: string
  partnerItemId?: string
  stallId?: string
  entrySlotId?: string
  // —— 现场 ——
  check?: CheckRecord
  exception?: ExceptionCase
  // —— 结局 ——
  charityId?: string
  outcomeNote?: string
  freeExchangeWith?: string // 自由交换对方家庭姓名
  // —— 协同 ——
  timeline: TimelineEvent[]
  notes: ItemNote[]
}

// ============ 撮合邀约 ============
export type ProposalStatus = 'pending' | 'accepted' | 'declined' | 'superseded'

export interface MatchProposal {
  id: string
  itemAId: string
  itemBId: string
  score: number
  reasons: string[]
  status: ProposalStatus
  acceptA: boolean
  acceptB: boolean
  stallId: string
  entrySlotId: string
  createdAt: number
  decidedAt?: number
}

// ============ 入场时段 / 摊位 / 公益机构 ============
export interface EntrySlot {
  id: string
  label: string
  time: string
}

export interface Stall {
  id: string
  name: string
  category: Category | null // null = 自由交换区
  /** 每个入场时段可承接的预约配对数 */
  capacityPerSlot: number
}

export interface Charity {
  id: string
  name: string
  contact: string
  /** 本场接收能力（件） */
  capacity: number
}

// ============ 推荐组合（实时计算结果） ============
export interface Recommendation {
  itemAId: string
  itemBId: string
  score: number
  reasons: string[]
  stallId: string
  entrySlotId: string
}
