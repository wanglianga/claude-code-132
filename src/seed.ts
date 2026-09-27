import type { Category, Item, ItemStatus, MatchProposal, Role } from './types'

const T0 = new Date('2026-09-26T08:00:00').getTime()
const min = (n: number) => T0 + n * 60_000

let seq = 0
const code = () => `SWAP-2026-${String(++seq).padStart(3, '0')}`

interface SeedInput {
  owner: string
  child: string
  age: number
  band: Item['ageBand']
  category: Category
  title: string
  condition: Item['condition']
  photo: string
  sanitized: boolean
  wants: Category[]
  price: number
  slots: string[]
  donate: boolean
  status: ItemStatus
  offsetMin: number
  extra?: Partial<Item>
}

const ROLE_NAME: Record<Role, string> = {
  parent: '',
  staff: '王社工',
  volunteer: '李志愿者',
  charity: '周老师',
}

function makeItem(input: SeedInput): Item {
  const id = `i${++seq}`
  const statusText: Record<ItemStatus, string> = {
    submitted: '提交报名信息',
    rejected: '审核被驳回',
    approved: '审核通过，进入撮合池',
    scheduled: '双方接受撮合，已预约',
    free: '进入自由交换区',
    arrived: '物品带到现场，已扫码到场',
    checked: '现场核销通过',
    exception: '现场出现异常，进入协同处理',
    exchanged: '交换成功',
    unexchanged: '本场无人交换',
    donated: '已转公益机构',
    brought_back: '家长带回',
    no_show: '确认未到场',
  }
  return {
    id,
    code: code(),
    ownerName: input.owner,
    phone: '138****' + String(1000 + seq).slice(-4),
    childName: input.child,
    childAge: input.age,
    ageBand: input.band,
    category: input.category,
    title: input.title,
    desc: `${input.title}，孩子长大后闲置，希望换给有需要的小朋友。`,
    condition: input.condition,
    photoLabel: input.photo,
    sanitized: input.sanitized,
    expectCategories: input.wants,
    price: input.price,
    valueBand: input.price < 20 ? 1 : input.price <= 50 ? 2 : 3,
    availableSlotIds: input.slots,
    acceptDonation: input.donate,
    submittedAt: min(input.offsetMin),
    status: input.status,
    timeline: [
      {
        at: min(input.offsetMin),
        text: statusText[input.status],
        byRole: input.status === 'submitted' || input.status === 'rejected' ? 'parent' : 'staff',
        byName:
          input.status === 'submitted' || input.status === 'rejected'
            ? input.owner
            : ROLE_NAME.staff,
      },
    ],
    notes: [],
    ...input.extra,
  }
}

export function buildSeed(): { items: Item[]; proposals: MatchProposal[] } {
  seq = 0
  const proposals: MatchProposal[] = []

  const items: Item[] = [
    // —— 待审核 ——
    makeItem({
      owner: '陈妈妈', child: '朵朵', age: 4, band: '3-5', category: 'toy',
      title: '费雪音乐叠叠乐', condition: 'ninety', photo: '叠叠乐·正面照',
      sanitized: true, wants: ['book'], price: 45, slots: ['s1', 's2'], donate: true,
      status: 'submitted', offsetMin: -320,
    }),
    makeItem({
      owner: '赵爸爸', child: '小豆', age: 7, band: '6-8', category: 'stationery',
      title: '闲置水彩笔套装（36 色）', condition: 'eighty', photo: '水彩笔·平铺照',
      sanitized: false, wants: ['toy', 'book'], price: 18, slots: ['s1'], donate: false,
      status: 'submitted', offsetMin: -300,
    }),
    // —— 待驳回示例：家长误报了禁品 ——
    makeItem({
      owner: '钱女士', child: '果果', age: 3, band: '3-5', category: 'baby',
      title: '剩余儿童感冒药（未拆封）', condition: 'like_new', photo: '药盒照',
      sanitized: false, wants: ['baby'], price: 30, slots: ['s2'], donate: false,
      status: 'submitted', offsetMin: -260,
    }),
    // —— 已驳回，待家长修改重提 ——
    makeItem({
      owner: '孙女士', child: '安安', age: 5, band: '3-5', category: 'toy',
      title: '激光射击玩具枪（带电池）', condition: 'eighty', photo: '玩具枪照',
      sanitized: true, wants: ['toy'], price: 60, slots: ['s1'], donate: false,
      status: 'rejected', offsetMin: -240,
      extra: {
        rejectKind: 'hazard',
        rejectReason: '带电发射类玩具存在击中眼部风险，属于危险品，不适合现场交换。',
      },
    }),
    // —— 审核通过，等待撮合（一对互配） ——
    makeItem({
      owner: '周妈妈', child: '米粒', age: 4, band: '3-5', category: 'book',
      title: '《好饿的毛毛虫》绘本套装', condition: 'ninety', photo: '绘本·封面照',
      sanitized: true, wants: ['toy'], price: 40, slots: ['s1', 's2'], donate: true,
      status: 'approved', offsetMin: -200,
    }),
    makeItem({
      owner: '吴爸爸', child: '欢欢', age: 5, band: '3-5', category: 'toy',
      title: '木质积木 100 粒桶装', condition: 'eighty', photo: '积木桶·整体照',
      sanitized: true, wants: ['book'], price: 48, slots: ['s1'], donate: false,
      status: 'approved', offsetMin: -190,
    }),
    // 另一对：衣物 / 学习用品
    makeItem({
      owner: '郑女士', child: '乐乐', age: 8, band: '6-8', category: 'clothing',
      title: '儿童冲锋衣 130 码（八成新）', condition: 'eighty', photo: '冲锋衣·悬挂照',
      sanitized: true, wants: ['stationery'], price: 55, slots: ['s2'], donate: true,
      status: 'approved', offsetMin: -180,
    }),
    makeItem({
      owner: '冯爸爸', child: '浩浩', age: 7, band: '6-8', category: 'stationery',
      title: '全新拼音学习机', condition: 'like_new', photo: '学习机·正面照',
      sanitized: true, wants: ['clothing'], price: 58, slots: ['s2'], donate: false,
      status: 'approved', offsetMin: -170,
    }),
    // 第三个 approved 无配对（期望不满足），用于演示自由交换区
    makeItem({
      owner: '许妈妈', child: '甜甜', age: 10, band: '9-12', category: 'book',
      title: '初中数学题典（无笔记）', condition: 'ninety', photo: '题典·书脊照',
      sanitized: true, wants: ['stationery'], price: 25, slots: ['s1', 's2'], donate: true,
      status: 'approved', offsetMin: -160,
    }),
    // —— 已预约 ——
    makeItem({
      owner: '何女士', child: '糖糖', age: 2, band: '0-2', category: 'baby',
      title: '学步推车（可调速）', condition: 'eighty', photo: '推车·侧面照',
      sanitized: true, wants: ['clothing', 'baby'], price: 65, slots: ['s1'], donate: false,
      status: 'scheduled', offsetMin: -150,
      extra: { stallId: 't3', entrySlotId: 's1' },
    }),
    makeItem({
      owner: '高爸爸', child: '麦麦', age: 2, band: '0-2', category: 'clothing',
      title: '婴幼儿连体棉衣 90 码', condition: 'like_new', photo: '棉衣·平铺照',
      sanitized: true, wants: ['baby'], price: 60, slots: ['s1'], donate: true,
      status: 'scheduled', offsetMin: -150,
      extra: { stallId: 't3', entrySlotId: 's1' },
    }),
    // —— 已到场待核销 ——
    makeItem({
      owner: '林妈妈', child: '球球', age: 6, band: '6-8', category: 'toy',
      title: '磁力片拼装套装 80 片', condition: 'ninety', photo: '磁力片·收纳箱照',
      sanitized: true, wants: ['book', 'stationery'], price: 50, slots: ['s1'], donate: true,
      status: 'arrived', offsetMin: -60,
      extra: {
        stallId: 't1', entrySlotId: 's1',
        check: { arrivedAt: min(-20), volunteerName: '李志愿者' },
      },
    }),
    // —— 核销通过，待交换完成 ——
    makeItem({
      owner: '黄女士', child: '布丁', age: 5, band: '3-5', category: 'book',
      title: '立体翻翻书 4 册', condition: 'like_new', photo: '翻翻书·内页照',
      sanitized: true, wants: ['toy'], price: 42, slots: ['s1'], donate: false,
      status: 'checked', offsetMin: -90,
      extra: {
        stallId: 't1', entrySlotId: 's1',
        check: {
          arrivedAt: min(-40), checkedAt: min(-30), volunteerName: '李志愿者',
          photoMatch: true, hasDamage: false, sanitizedConfirmed: true, pass: true,
        },
      },
    }),
    // —— 异常处理中：照片不符 ——
    makeItem({
      owner: '徐爸爸', child: '可可', age: 4, band: '3-5', category: 'toy',
      title: '遥控赛车（宣称九成新）', condition: 'ninety', photo: '赛车·宣传图',
      sanitized: false, wants: ['toy'], price: 70, slots: ['s1'], donate: false,
      status: 'exception', offsetMin: -120,
      extra: {
        stallId: 't1', entrySlotId: 's1',
        check: { arrivedAt: min(-25), volunteerName: '李志愿者' },
        exception: {
          type: 'photo_mismatch', openedAt: min(-15), openedBy: 'volunteer', openedByName: '李志愿者',
        },
        notes: [
          {
            id: 'n1', at: min(-15), role: 'volunteer', author: '李志愿者',
            content: '现场实物外壳有明显裂痕、天线缺失，与报名照片不一致，请家长确认处理方式。',
          },
        ],
      },
    }),
    // —— 已交换成功 ——
    makeItem({
      owner: '曹妈妈', child: '土豆', age: 7, band: '6-8', category: 'stationery',
      title: '儿童科学实验盒', condition: 'eighty', photo: '实验盒·开箱照',
      sanitized: true, wants: ['toy'], price: 52, slots: ['s2'], donate: false,
      status: 'exchanged', offsetMin: -400,
      extra: {
        stallId: 't2', entrySlotId: 's2',
        check: {
          arrivedAt: min(-100), checkedAt: min(-95), volunteerName: '李志愿者',
          photoMatch: true, hasDamage: false, sanitizedConfirmed: true, pass: true,
        },
        freeExchangeWith: '潘妈妈家',
        outcomeNote: '与潘妈妈家的滑板车完成交换，双方确认。',
      },
    }),
    // —— 无人交换 ——
    makeItem({
      owner: '谢女士', child: '芒果', age: 11, band: '9-12', category: 'clothing',
      title: '校服外套 150 码', condition: 'worn', photo: '校服·整体照',
      sanitized: true, wants: ['clothing'], price: 15, slots: ['s1', 's2'], donate: true,
      status: 'unexchanged', offsetMin: -350,
      extra: {
        stallId: 'free', entrySlotId: 's2',
        check: {
          arrivedAt: min(-80), checkedAt: min(-75), volunteerName: '李志愿者',
          photoMatch: true, hasDamage: true, sanitizedConfirmed: true, pass: true,
        },
        notes: [
          {
            id: 'n2', at: min(-30), role: 'staff', author: '王社工',
            content: '自由交换区无人问津，等待家长选择转捐或带回。',
          },
        ],
      },
    }),
    // —— 已转捐 ——
    makeItem({
      owner: '苏妈妈', child: '桃桃', age: 3, band: '3-5', category: 'baby',
      title: '安抚奶嘴收纳盒及摇铃一组', condition: 'ninety', photo: '摇铃组·合照',
      sanitized: true, wants: ['book'], price: 20, slots: ['s1'], donate: true,
      status: 'donated', offsetMin: -330,
      extra: {
        charityId: 'c1',
        check: {
          arrivedAt: min(-70), checkedAt: min(-65), volunteerName: '李志愿者',
          photoMatch: true, hasDamage: false, sanitizedConfirmed: true, pass: true,
        },
        outcomeNote: '阳光儿童之家现场接收，已开捐赠回执。',
      },
    }),
    // —— 已带回 ——
    makeItem({
      owner: '潘爸爸', child: '点点', age: 9, band: '9-12', category: 'book',
      title: '大英儿童百科全书（全 4 卷）', condition: 'eighty', photo: '百科·套装照',
      sanitized: true, wants: ['toy'], price: 80, slots: ['s2'], donate: false,
      status: 'brought_back', offsetMin: -310,
      extra: {
        check: {
          arrivedAt: min(-55), checkedAt: min(-50), volunteerName: '李志愿者',
          photoMatch: true, hasDamage: false, sanitizedConfirmed: true, pass: true,
        },
        outcomeNote: '家长考虑后选择带回，下一场再报名。',
      },
    }),
    // —— 未到场 ——
    makeItem({
      owner: '邓女士', child: '团团', age: 6, band: '6-8', category: 'clothing',
      title: '舞蹈练功服两套', condition: 'like_new', photo: '练功服·平铺照',
      sanitized: true, wants: ['book'], price: 35, slots: ['s1'], donate: true,
      status: 'no_show', offsetMin: -290,
      extra: {
        stallId: 't2', entrySlotId: 's1',
        exception: {
          type: 'no_show', openedAt: min(-10), openedBy: 'volunteer', openedByName: '李志愿者',
          resolvedAt: min(-2), resolution: 'no_show',
          summary: '开场 30 分钟未到场，电话未接通，按缺席处理，物品不计入本场核销。',
        },
      },
    }),
  ]

  // 已预约的一对互挂 proposalId / partnerItemId
  const scheduledProposal: MatchProposal = {
    id: 'p-seed-1',
    itemAId: items[9].id,
    itemBId: items[10].id,
    score: 60,
    reasons: ['同属 0–2 岁段', '婴童用品与棉衣互符合期望'],
    status: 'accepted',
    acceptA: true,
    acceptB: true,
    stallId: 't3',
    entrySlotId: 's1',
    createdAt: min(-150),
    decidedAt: min(-140),
  }
  proposals.push(scheduledProposal)
  items[9].proposalId = scheduledProposal.id
  items[9].partnerItemId = items[10].id
  items[10].proposalId = scheduledProposal.id
  items[10].partnerItemId = items[9].id

  return { items, proposals }
}
