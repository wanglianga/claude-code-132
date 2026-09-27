<script setup lang="ts">
defineProps<{ title: string; width?: string; subtitle?: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div class="modal-mask" @mousedown.self="emit('close')">
      <div class="modal" :style="width ? { maxWidth: width } : undefined">
        <div class="modal-head">
          <div>
            <h3>{{ title }}</h3>
            <div v-if="subtitle" class="muted small" style="margin-top: 3px">{{ subtitle }}</div>
          </div>
          <button class="btn ghost" @click="emit('close')">✕</button>
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
