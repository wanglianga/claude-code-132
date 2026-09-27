import { defineStore } from 'pinia'
import { ref } from 'vue'

/** 跨页面共享的物品详情抽屉状态 */
export const useUiStore = defineStore('ui', () => {
  const selectedItemId = ref<string | null>(null)
  function openItem(id: string) {
    selectedItemId.value = id
  }
  function closeItem() {
    selectedItemId.value = null
  }
  return { selectedItemId, openItem, closeItem }
})
