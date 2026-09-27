import type { ExceptionResolution, ExceptionType, Role } from './types'

export const ROLE_LABEL: Record<Role, string> = {
  parent: '家长',
  staff: '社区',
  volunteer: '志愿者',
  charity: '公益机构',
}

export function roleText(role?: Role | null): string {
  return role ? ROLE_LABEL[role] : ''
}

export const EXCEPTION_LABEL: Record<ExceptionType, string> = {
  no_show: '家长临时缺席',
  photo_mismatch: '物品与照片不符',
  child_refusal: '孩子现场反悔',
  value_dispute: '双方价值争议',
  charity_full: '公益接收能力不足',
}

export const EXCEPTION_DESC: Record<ExceptionType, string> = {
  no_show: '预约时段已过，家长未带物品到场',
  photo_mismatch: '现场实物与报名照片不一致，或发现新增破损',
  child_refusal: '孩子临场不愿意交出自己的物品',
  value_dispute: '双方对交换物品的价值是否对等产生分歧',
  charity_full: '意向公益机构本场接收名额已满',
}

export const RESOLUTION_LABEL: Record<ExceptionResolution, string> = {
  continue_exchange: '补齐核验后继续交换',
  to_free: '转入自由交换区',
  donate: '转为公益捐赠',
  bring_back: '家长带回',
  no_show: '确认缺席处理',
  waiting: '继续协商（暂挂）',
}
