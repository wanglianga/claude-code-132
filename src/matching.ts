import {
  AGE_BANDS,
  CATEGORY_LABEL,
  ENTRY_SLOTS,
  STALLS,
  VALUE_LABEL,
} from './constants'
import type {
  Category,
  Item,
  MatchProposal,
  Recommendation,
} from './types'

/** 年龄段距离：同段 0，相邻段 1，以此类推 */
function bandDistance(a: Item['ageBand'], b: Item['ageBand']): number {
  const idx = (k: Item['ageBand']) => AGE_BANDS.findIndex((x) => x.key === k)
  return Math.abs(idx(a) - idx(b))
}

/** A 是否愿意接收 B 类型的物品（B 的品类 ∈ A 期望；A 无明确期望时默认接受全部） */
function wants(a: Item, b: Item): boolean {
  return a.expectCategories.length === 0 || a.expectCategories.includes(b.category)
}

function stallFor(cat: Category): string {
  const hit = STALLS.find((s) => s.category === cat)
  return hit ? hit.id : 'free'
}

/**
 * 推荐交换组合。
 * 规则：
 * 1. 双方都处于「审核通过」且无在途邀约；
 * 2. 品类互相满足期望；
 * 3. 年龄段越接近越好（同段满分，跨段递减），价值区间越接近越好；
 * 4. 到场时间有交集；
 * 5. 按该时段对应摊位剩余容量过滤。
 */
export function recommend(
  items: Item[],
  proposals: MatchProposal[],
): Recommendation[] {
  const busyItem = new Set<string>()
  for (const p of proposals) {
    if (p.status === 'pending' || p.status === 'accepted') {
      busyItem.add(p.itemAId)
      busyItem.add(p.itemBId)
    }
  }

  const pool = items.filter((i) => i.status === 'approved' && !busyItem.has(i.id))
  const results: Recommendation[] = []

  // 已占用容量：stall × slot -> 配对数
  const usedCap = new Map<string, number>()
  for (const p of proposals) {
    if (p.status === 'accepted') {
      const k = `${p.stallId}@${p.entrySlotId}`
      usedCap.set(k, (usedCap.get(k) ?? 0) + 1)
    }
  }

  for (let x = 0; x < pool.length; x++) {
    for (let y = x + 1; y < pool.length; y++) {
      const a = pool[x]
      const b = pool[y]
      if (!wants(a, b) || !wants(b, a)) continue

      const dAge = bandDistance(a.ageBand, b.ageBand)
      if (dAge > 2) continue
      const dVal = Math.abs(a.valueBand - b.valueBand)
      const commonSlots = a.availableSlotIds.filter((s) =>
        b.availableSlotIds.includes(s),
      )
      if (commonSlots.length === 0) continue

      // 先按 B 的品类定摊位；若容量满则尝试 A 的品类摊位
      let stallId = stallFor(b.category)
      let slotId = chooseSlot(stallId, commonSlots, usedCap)
      if (!slotId) {
        stallId = stallFor(a.category)
        slotId = chooseSlot(stallId, commonSlots, usedCap)
      }
      if (!slotId) continue

      const score = 60 - dAge * 18 - dVal * 14
      const reasons: string[] = []
      reasons.push(
        dAge === 0
          ? `孩子同属 ${a.ageBand} 岁段，年龄契合`
          : `年龄段相邻（${a.ageBand} ↔ ${b.ageBand} 岁），相差可接受`,
      )
      if (dVal === 0) reasons.push(`价值同档（${VALUE_LABEL[a.valueBand]}），公平对等`)
      else if (dVal === 1) reasons.push('价值仅差一档，差距较小')
      reasons.push(`${CATEGORY_LABEL[b.category]} ↔ ${CATEGORY_LABEL[a.category]}，双方期望互相满足`)
      reasons.push(
        `共同可到场：${ENTRY_SLOTS.find((s) => s.id === commonSlots[0])?.label ?? ''}`,
      )

      results.push({
        itemAId: a.id,
        itemBId: b.id,
        score,
        reasons,
        stallId,
        entrySlotId: slotId,
      })
    }
  }

  return results.sort((p, q) => q.score - p.score)
}

function chooseSlot(
  stallId: string,
  commonSlots: string[],
  usedCap: Map<string, number>,
): string | null {
  const stall = STALLS.find((s) => s.id === stallId)!
  for (const slotId of commonSlots) {
    const k = `${stallId}@${slotId}`
    if ((usedCap.get(k) ?? 0) < stall.capacityPerSlot) return slotId
  }
  return null
}

/** 接受撮合后占用容量，供后续推荐调用 */
export function occupyCapacity(
  usedCap: Map<string, number>,
  stallId: string,
  slotId: string,
) {
  const k = `${stallId}@${slotId}`
  usedCap.set(k, (usedCap.get(k) ?? 0) + 1)
}
