<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import ItemCard from '../components/ItemCard.vue'
import ModalShell from '../components/ModalShell.vue'
import {
  CATEGORIES,
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  CONDITION_LABEL,
  ENTRY_SLOTS,
  FORBIDDEN_LABEL,
  FORBIDDEN_REASON_HINT,
} from '../constants'
import { useDataStore, type ItemForm } from '../stores/data'
import { useSessionStore } from '../stores/session'
import { useUiStore } from '../stores/ui'
import type { Category, Condition, Item } from '../types'

const data = useDataStore()
const session = useSessionStore()
const ui = useUiStore()

// ================= 报名表单 =================
const emptyForm = (): ItemForm => ({
  ownerName: session.user?.name ?? '',
  phone: '',
  childName: '',
  childAge: 4,
  category: 'toy',
  title: '',
  desc: '',
  condition: 'ninety',
  photoLabel: '',
  sanitized: false,
  expectCategories: [],
  price: 30,
  availableSlotIds: ['s1'],
  acceptDonation: false,
})

const form = reactive<ItemForm>(emptyForm())
const errors = reactive<Record<string, string>>({})
const submittedOk = ref<Item | null>(null)

function toggleExpect(c: Category) {
  const idx = form.expectCategories.indexOf(c)
  if (idx >= 0) form.expectCategories.splice(idx, 1)
  else form.expectCategories.push(c)
}

function toggleSlot(id: string) {
  const idx = form.availableSlotIds.indexOf(id)
  if (idx >= 0) form.availableSlotIds.splice(idx, 1)
  else form.availableSlotIds.push(id)
}

function onPhoto(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    form.photoDataUrl = reader.result as string
    form.photoLabel = file.name
  }
  reader.readAsDataURL(file)
}

function validate(): boolean {
  Object.keys(errors).forEach((k) => delete errors[k])
  if (!form.ownerName.trim()) errors.ownerName = '请填写家长称呼'
  if (!/^1\d{10}$/.test(form.phone.trim())) errors.phone = '请填写 11 位手机号（现场联系用）'
  if (!form.childName.trim()) errors.childName = '请填写孩子小名'
  if (form.childAge < 0 || form.childAge > 12) errors.childAge = '年龄需在 0–12 岁之间'
  if (!form.title.trim()) errors.title = '请填写物品名称'
  if (!form.photoLabel.trim() && !form.photoDataUrl) errors.photoLabel = '请上传一张成色照片，或填写照片说明'
  if (form.price < 0) errors.price = '估值不能为负'
  if (form.availableSlotIds.length === 0) errors.slots = '至少选择一个可到场时段'
  return Object.keys(errors).length === 0
}

function submit() {
  if (!validate() || !session.user) return
  const item = data.submit({ ...form, expectCategories: [...form.expectCategories] }, session.user)
  submittedOk.value = item
  Object.assign(form, emptyForm())
}

// ================= 我的物品 =================
const myItems = computed(() =>
  data.items.filter(
    (i) =>
      session.user &&
      (i.ownerName.includes(session.user.familyName ?? '___nomatch___') ||
        i.ownerName === session.user.name),
  ),
)

// ================= 驳回后修改重提 =================
const editing = ref<Item | null>(null)
const editForm = reactive({ category: 'toy' as Category, title: '', desc: '', photoLabel: '', condition: 'ninety' as Condition, sanitized: false })

function openEdit(item: Item) {
  editing.value = item
  Object.assign(editForm, {
    category: item.category,
    title: item.title,
    desc: item.desc,
    photoLabel: item.photoLabel,
    condition: item.condition,
    sanitized: item.sanitized,
  })
}

function saveEdit() {
  if (!editing.value || !session.user) return
  data.resubmit(
    editing.value.id,
    {
      category: editForm.category,
      title: editForm.title,
      desc: editForm.desc,
      photoLabel: editForm.photoLabel,
      condition: editForm.condition,
      sanitized: editForm.sanitized,
    },
    session.user,
  )
  editing.value = null
}
</script>

<template>
  <div class="stack" style="gap: 18px">
    <!-- 报名表单 -->
    <section class="card card-pad">
      <div class="row spread" style="margin-bottom: 4px">
        <h2 style="font-size: 16px">📝 家长报名：登记要交换的旧物</h2>
        <span class="hint">提交后进入社区审核，禁品类会被驳回并告知原因</span>
      </div>

      <div class="grid cols-2" style="gap: 14px 22px; margin-top: 14px">
        <div class="field">
          <label>家长称呼<span class="req">*</span></label>
          <input v-model="form.ownerName" class="input" placeholder="如：周妈妈" />
          <span v-if="errors.ownerName" class="error-text">{{ errors.ownerName }}</span>
        </div>
        <div class="field">
          <label>联系手机<span class="req">*</span></label>
          <input v-model="form.phone" class="input" maxlength="11" placeholder="11 位手机号，用于现场联系" />
          <span v-if="errors.phone" class="error-text">{{ errors.phone }}</span>
        </div>
        <div class="field">
          <label>孩子小名<span class="req">*</span></label>
          <input v-model="form.childName" class="input" placeholder="如：米粒" />
          <span v-if="errors.childName" class="error-text">{{ errors.childName }}</span>
        </div>
        <div class="field">
          <label>孩子年龄（岁）<span class="req">*</span></label>
          <input v-model.number="form.childAge" type="number" min="0" max="12" class="input" />
          <span class="hint">用于按年龄段撮合（0–2 / 3–5 / 6–8 / 9–12）</span>
          <span v-if="errors.childAge" class="error-text">{{ errors.childAge }}</span>
        </div>

        <div class="field">
          <label>物品类型<span class="req">*</span></label>
          <select v-model="form.category" class="select">
            <option v-for="c in CATEGORIES" :key="c" :value="c">
              {{ CATEGORY_EMOJI[c] }} {{ CATEGORY_LABEL[c] }}
            </option>
          </select>
          <span class="hint">仅限玩具 / 绘本图书 / 衣物 / 学习用品 / 婴童用品</span>
        </div>
        <div class="field">
          <label>物品名称<span class="req">*</span></label>
          <input v-model="form.title" class="input" placeholder="如：《好饿的毛毛虫》绘本套装" />
          <span v-if="errors.title" class="error-text">{{ errors.title }}</span>
        </div>

        <div class="field" style="grid-column: 1 / -1">
          <label>物品描述</label>
          <textarea v-model="form.desc" class="textarea" placeholder="品牌、使用情况、配件是否齐全等"></textarea>
        </div>

        <div class="field">
          <label>成色照片<span class="req">*</span></label>
          <div class="photo-thumb" style="max-width: 240px">
            <template v-if="form.photoDataUrl">
              <img :src="form.photoDataUrl" alt="成色照片" />
            </template>
            <template v-else>
              <span class="ph-emoji">📷</span>
              <span>上传一张能看清成色的照片</span>
            </template>
          </div>
          <div class="row wrap" style="margin-top: 8px">
            <label class="btn sm" style="cursor: pointer">
              选择照片
              <input type="file" accept="image/*" style="display: none" @change="onPhoto" />
            </label>
            <input
              v-model="form.photoLabel"
              class="input"
              style="max-width: 240px"
              placeholder="或填写照片说明（演示环境）"
            />
          </div>
          <span v-if="errors.photoLabel" class="error-text">{{ errors.photoLabel }}</span>
        </div>

        <div class="field">
          <label>成色</label>
          <select v-model="form.condition" class="select">
            <option v-for="(label, key) in CONDITION_LABEL" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>

        <div class="field">
          <label>是否已消毒</label>
          <div class="row">
            <button type="button" class="check-pill" :class="{ active: form.sanitized }" @click="form.sanitized = !form.sanitized">
              {{ form.sanitized ? '✅ 已消毒并密封' : '⬜ 尚未消毒（到场前补做）' }}
            </button>
          </div>
        </div>

        <div class="field">
          <label>估值（元，用于价值区间撮合）</label>
          <input v-model.number="form.price" type="number" min="0" class="input" style="max-width: 200px" />
          <span v-if="errors.price" class="error-text">{{ errors.price }}</span>
        </div>

        <div class="field" style="grid-column: 1 / -1">
          <label>期望换取类型（不选表示不限）</label>
          <div class="row wrap">
            <button
              v-for="c in CATEGORIES"
              :key="c"
              type="button"
              class="check-pill"
              :class="{ active: form.expectCategories.includes(c) }"
              @click="toggleExpect(c)"
            >
              {{ CATEGORY_EMOJI[c] }} {{ CATEGORY_LABEL[c] }}
            </button>
          </div>
        </div>

        <div class="field">
          <label>可到场时间（多选）<span class="req">*</span></label>
          <div class="row wrap">
            <button
              v-for="s in ENTRY_SLOTS"
              :key="s.id"
              type="button"
              class="check-pill"
              :class="{ active: form.availableSlotIds.includes(s.id) }"
              @click="toggleSlot(s.id)"
            >
              {{ s.label }} {{ s.time }}
            </button>
          </div>
          <span v-if="errors.slots" class="error-text">{{ errors.slots }}</span>
        </div>

        <div class="field">
          <label>若本场无人交换，是否接受公益捐赠</label>
          <div class="row" style="gap: 12px">
            <button type="button" class="check-pill" :class="{ active: form.acceptDonation }" @click="form.acceptDonation = true">
              💚 愿意转捐
            </button>
            <button type="button" class="check-pill" :class="{ active: !form.acceptDonation }" @click="form.acceptDonation = false">
              🏠 选择带回
            </button>
          </div>
        </div>
      </div>

      <div class="row spread" style="margin-top: 18px">
        <span class="hint">
          ⚠ 危险品、食品、药品、隐私物品不接受报名，社区审核时将驳回并说明原因。
        </span>
        <button class="btn primary" @click="submit">提交报名</button>
      </div>
    </section>

    <!-- 提交成功提示 -->
    <section v-if="submittedOk" class="card card-pad" style="border-color: #a7d8bd; background: var(--green-soft)">
      <div class="row spread">
        <div>
          <strong>✅ 报名已提交！</strong>
          <span class="small" style="margin-left: 8px">
            「{{ submittedOk.title }}」核销码 <strong>{{ submittedOk.code }}</strong>，审核结果与撮合进展可在下方"我的物品"查看。
          </span>
        </div>
        <div class="row">
          <button class="btn sm" @click="ui.openItem(submittedOk.id)">查看追踪</button>
          <button class="btn sm ghost" @click="submittedOk = null">收起</button>
        </div>
      </div>
    </section>

    <!-- 我的物品 -->
    <section>
      <div class="row spread" style="margin-bottom: 12px">
        <h2 style="font-size: 16px">🎒 我的物品（{{ myItems.length }}）</h2>
        <span class="hint">点击卡片查看审核意见、撮合预约、核销记录与处理进展</span>
      </div>
      <div v-if="myItems.length" class="grid cols-3">
        <div v-for="i in myItems" :key="i.id" style="position: relative">
          <ItemCard :item="i" @open="ui.openItem(i.id)" />
          <button
            v-if="i.status === 'rejected'"
            class="btn danger sm"
            style="position: absolute; right: 10px; bottom: 10px"
            @click.stop="openEdit(i)"
          >
            修改后重新提交
          </button>
        </div>
      </div>
      <div v-else class="card empty">
        <div class="big">🪺</div>
        还没有报名物品，先在上方填写一件吧
      </div>
    </section>

    <!-- 驳回修改弹窗 -->
    <ModalShell
      v-if="editing"
      title="修改报名信息并重新提交"
      :subtitle="`驳回原因：${FORBIDDEN_LABEL[editing.rejectKind!]} —— ${editing.rejectReason}`"
      @close="editing = null"
    >
      <div class="modal-body stack">
        <div class="note" style="background: var(--red-soft); border-color: #f0c4c4">
          <div class="small">
            <strong>社区提示：</strong>{{ FORBIDDEN_REASON_HINT[editing.rejectKind!] }}
            请更换为允许交换的物品（玩具 / 绘本 / 衣物 / 学习用品 / 婴童用品）后重新提交。
          </div>
        </div>
        <div class="field">
          <label>更换后的物品类型</label>
          <select v-model="editForm.category" class="select">
            <option v-for="c in CATEGORIES" :key="c" :value="c">{{ CATEGORY_EMOJI[c] }} {{ CATEGORY_LABEL[c] }}</option>
          </select>
        </div>
        <div class="field">
          <label>物品名称</label>
          <input v-model="editForm.title" class="input" />
        </div>
        <div class="field">
          <label>物品描述</label>
          <textarea v-model="editForm.desc" class="textarea" />
        </div>
        <div class="field">
          <label>成色照片说明</label>
          <input v-model="editForm.photoLabel" class="input" placeholder="重新上传可在提交后联系社工补录（演示）" />
        </div>
        <div class="grid cols-2">
          <div class="field">
            <label>成色</label>
            <select v-model="editForm.condition" class="select">
              <option v-for="(label, key) in CONDITION_LABEL" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
          <div class="field">
            <label>是否已消毒</label>
            <button type="button" class="check-pill" :class="{ active: editForm.sanitized }" @click="editForm.sanitized = !editForm.sanitized">
              {{ editForm.sanitized ? '✅ 已消毒' : '⬜ 未消毒' }}
            </button>
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" @click="editing = null">取消</button>
        <button class="btn primary" :disabled="!editForm.title.trim()" @click="saveEdit">重新提交审核</button>
      </div>
    </ModalShell>
  </div>
</template>
