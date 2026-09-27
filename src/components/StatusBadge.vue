<script setup lang="ts">
import { computed } from 'vue'
import { ITEM_STATUS_FLOW } from '../constants'
import type { ItemStatus } from '../types'

const props = defineProps<{ status: ItemStatus }>()

const meta = computed(() => ITEM_STATUS_FLOW.find((s) => s.key === props.status)!)
</script>

<template>
  <span class="badge" :class="meta.tone">
    <span class="dot" />{{ meta.label }}
  </span>
</template>
