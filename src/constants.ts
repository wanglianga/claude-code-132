import type {
  AgeBandKey,
  Category,
  Charity,
  Condition,
  EntrySlot,
  ForbiddenKind,
  Stall,
  ValueBand,
} from './types'

export const CATEGORY_LABEL: Record<Category, string> = {
  toy: '玩具',
  book: '绘本图书',
  clothing: '衣物',
  stationery: '学习用品',
  baby: '婴童用品',
}

export const CATEGORY_EMOJI: Record<Category, string> = {
  toy: '🧸',
  book: '📚',
  clothing: '👕',
  stationery: '✏️',
  baby: '🍼',
}

export const CATEGORIES: Category[] = ['toy', 'book', 'clothing', 'stationery', 'baby']

export const FORBIDDEN_LABEL: Record<ForbiddenKind, string> = {
  hazard: '危险品',
  food: '食品',
  medicine: '药品',
  privacy: '隐私物品',
}

export const FORBIDDEN_REASON_HINT: Record<ForbiddenKind, string> = {
  hazard: '含小零件易吞咽/尖锐边角/带电或易燃易爆，现场交换存在安全隐患',
  food: '食品涉及保质期与食品安全，不适合二手交换',
  medicine: '药品需遵医嘱使用，禁止流转给其他家庭',
  privacy: '涉及家庭住址、姓名等个人信息或私密用品，存在隐私泄露风险',
}

export const AGE_BANDS: { key: AgeBandKey; label: string; min: number; max: number }[] = [
  { key: '0-2', label: '0–2 岁', min: 0, max: 2 },
  { key: '3-5', label: '3–5 岁', min: 3, max: 5 },
  { key: '6-8', label: '6–8 岁', min: 6, max: 8 },
  { key: '9-12', label: '9–12 岁', min: 9, max: 12 },
]

export function ageBandOf(age: number): AgeBandKey {
  if (age <= 2) return '0-2'
  if (age <= 5) return '3-5'
  if (age <= 8) return '6-8'
  return '9-12'
}

export const CONDITION_LABEL: Record<Condition, string> = {
  like_new: '几乎全新',
  ninety: '九成新',
  eighty: '八成新',
  worn: '有使用痕迹',
}

export const VALUE_LABEL: Record<ValueBand, string> = {
  1: '20 元以下',
  2: '20–50 元',
  3: '50 元以上',
}

export function valueBandOf(price: number): ValueBand {
  if (price < 20) return 1
  if (price <= 50) return 2
  return 3
}

export const ENTRY_SLOTS: EntrySlot[] = [
  { id: 's1', label: '上午场', time: '09:00–10:30' },
  { id: 's2', label: '下午场', time: '14:00–15:30' },
]

export const STALLS: Stall[] = [
  { id: 't1', name: 'A 区 · 玩具绘本摊', category: 'toy', capacityPerSlot: 2 },
  { id: 't2', name: 'B 区 · 衣物用品摊', category: 'clothing', capacityPerSlot: 2 },
  { id: 't3', name: 'C 区 · 学习婴童摊', category: 'stationery', capacityPerSlot: 2 },
  { id: 'free', name: 'D 区 · 自由交换区', category: null, capacityPerSlot: 8 },
]

export const CHARITIES: Charity[] = [
  { id: 'c1', name: '阳光儿童之家', contact: '周老师 138-0000-1001', capacity: 6 },
  { id: 'c2', name: '春晖公益超市', contact: '李社工 138-0000-2002', capacity: 4 },
]

export const ITEM_STATUS_FLOW: { key: string; label: string; tone: string }[] = [
  { key: 'submitted', label: '已提交', tone: 'slate' },
  { key: 'rejected', label: '已驳回', tone: 'red' },
  { key: 'approved', label: '审核通过', tone: 'blue' },
  { key: 'scheduled', label: '已预约', tone: 'violet' },
  { key: 'free', label: '自由交换区', tone: 'cyan' },
  { key: 'arrived', label: '已到场', tone: 'amber' },
  { key: 'checked', label: '核销通过', tone: 'teal' },
  { key: 'exception', label: '异常处理中', tone: 'orange' },
  { key: 'exchanged', label: '交换成功', tone: 'green' },
  { key: 'unexchanged', label: '无人交换', tone: 'yellow' },
  { key: 'donated', label: '已转捐', tone: 'emerald' },
  { key: 'brought_back', label: '已带回', tone: 'gray' },
  { key: 'no_show', label: '未到场', tone: 'rose' },
]
