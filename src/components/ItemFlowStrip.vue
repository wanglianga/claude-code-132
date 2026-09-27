<script setup lang="ts">
import { computed } from 'vue'
import type { Item } from '../types'

const props = defineProps<{ item: Item }>()

const NODES = ['报名提交', '审核通过', '预约/自由区', '物品到场', '现场核销', '交换完成']

/** 当前状态在主链上的位置；-1 表示驳回 */
const rankMap: Partial<Record<Item['status'], number>> = {
  submitted: 0,
  approved: 1,
  scheduled: 2,
  free: 2,
  arrived: 3,
  checked: 4,
  exchanged: 5,
  unexchanged: 4,
  donated: 4,
  brought_back: 4,
  no_show: 2,
  exception: -10, // 由异常前状态决定，见 currentRank
}

const terminal = computed(() => {
  switch (props.item.status) {
    case 'rejected': return { text: '已驳回', cls: 'red' }
    case 'unexchanged': return { text: '无人交换', cls: 'yellow' }
    case 'donated': return { text: '已转捐', cls: 'emerald' }
    case 'brought_back': return { text: '已带回', cls: 'gray' }
    case 'no_show': return { text: '未到场', cls: 'rose' }
    default: null
  }
})

const isException = computed(() => props.item.status === 'exception')

const currentRank = computed(() => {
  if (isException.value) return props.item.check?.arrivedAt ? 3 : 2
  if (props.item.status === 'rejected') return -1
  return rankMap[props.item.status] ?? 0
})

function nodeState(idx: number): 'done' | 'current' | '' {
  if (idx < currentRank.value) return 'done'
  if (idx === currentRank.value) {
    if (props.item.status === 'exchanged') return 'done'
    return 'current'
  }
  return ''
}

function displayLabel(defaultText: string, idx: number): string {
  if (idx === 2 && props.item.status === 'free') return '自由交换区'
  return defaultText
}
</script>

<template>
  <div class="flow-strip">
    <template v-for="(nodeText, idx) in NODES" :key="idx">
      <div class="flow-node" :class="nodeState(idx)">
        <div class="circle">{{ idx < currentRank || (idx === currentRank && item.status === 'exchanged') ? '✓' : idx + 1 }}</div>
        <div class="lbl">{{ displayLabel(nodeText, idx) }}</div>
      </div>
      <span v-if="idx < NODES.length - 1" class="flow-arrow">→</span>
    </template>
    <span v-if="isException" class="badge orange" style="margin-left: 10px; align-self: flex-start">⚠ 异常处理中</span>
    <span v-else-if="terminal" class="badge" :class="terminal.cls" style="margin-left: 10px; align-self: flex-start">
      {{ terminal.text }}
    </span>
  </div>
</template>
