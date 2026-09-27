<script setup lang="ts">
import { computed } from 'vue'
import {
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  CONDITION_LABEL,
  ENTRY_SLOTS,
  VALUE_LABEL,
} from '../constants'
import type { Item } from '../types'
import StatusBadge from './StatusBadge.vue'

const props = defineProps<{ item: Item }>()
const emit = defineEmits<{ open: [id: string] }>()

const slots = computed(() =>
  props.item.availableSlotIds
    .map((id) => ENTRY_SLOTS.find((s) => s.id === id)?.label)
    .join(' / '),
)
</script>

<template>
  <div class="card item-card" @click="emit('open', item.id)">
    <div class="ic-photo">
      <template v-if="item.photoDataUrl">
        <img :src="item.photoDataUrl" alt="成色照片" />
      </template>
      <template v-else>
        <span class="ph-emoji">{{ CATEGORY_EMOJI[item.category] }}</span>
        <span class="ph-label">{{ item.photoLabel }}</span>
      </template>
    </div>
    <div class="ic-body">
      <div class="row spread" style="align-items: flex-start; gap: 8px">
        <div class="grow">
          <div class="ic-title">{{ item.title }}</div>
          <div class="small muted">{{ item.ownerName }}家 · {{ item.childName }} {{ item.childAge }}岁</div>
        </div>
        <StatusBadge :status="item.status" />
      </div>
      <div class="tag-list" style="margin: 8px 0">
        <span class="badge slate">{{ CATEGORY_EMOJI[item.category] }} {{ CATEGORY_LABEL[item.category] }}</span>
        <span class="badge gray">{{ CONDITION_LABEL[item.condition] }}</span>
        <span class="badge blue">¥{{ item.price }} · {{ VALUE_LABEL[item.valueBand] }}</span>
        <span v-if="item.sanitized" class="badge teal">已消毒</span>
        <span v-if="item.acceptDonation" class="badge emerald">可转捐</span>
      </div>
      <div class="small muted">
        想换：
        <template v-if="item.expectCategories.length">
          {{ item.expectCategories.map((c) => CATEGORY_LABEL[c]).join('、') }}
        </template>
        <template v-else>不限</template>
        · 到场：{{ slots }}
      </div>
      <div class="small muted" style="margin-top: 3px">核销码：{{ item.code }}</div>
    </div>
  </div>
</template>

<style scoped>
.item-card {
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.12s, box-shadow 0.12s;
  display: flex;
  flex-direction: column;
}
.item-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}
.ic-photo {
  aspect-ratio: 16 / 9;
  background: linear-gradient(135deg, #eef4ef, #dfe9e2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--ink-2);
}
.ic-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ic-photo .ph-emoji {
  font-size: 30px;
}
.ph-label {
  font-size: 11.5px;
}
.ic-body {
  padding: 12px 14px 14px;
}
.ic-title {
  font-weight: 650;
  font-size: 14.5px;
  line-height: 1.4;
}
</style>
