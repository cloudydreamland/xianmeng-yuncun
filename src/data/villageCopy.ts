export type VillagePlaceId = 'study' | 'workshop' | 'mountain';

export const villageCopy = {
  gateway: {
    eyebrow: 'A QUIET VILLAGE ABOVE THE CLOUDS',
    title: '闲梦 · 云村',
    lead: '云海无岸，山影在雾后轻轻浮起。风雨停在云墙之外，一叶小舟循着春水，泊向灯火未醒的村落。',
  },
  bulletin: {
    eyebrow: 'TODAY IN THE VILLAGE',
    title: '今日村志',
    lead: '村中今日有新笺抵岸，也有旧器添了一道新纹。',
  },
  times: {
    dawn: '薄雾醒山窗',
    day: '晴云照春水',
    dusk: '暮色染炊烟',
    night: '星河落村灯',
  },
  places: {
    study: {
      eyebrow: 'THE WINDOW-SIDE STUDY',
      name: '山窗书屋',
      action: '进入书屋',
      description: '檀香贴着窗棂缓缓散开，纸页收住一线天光。未说尽的念、未想透的问题，都在山风翻页之前暂栖于此。',
    },
    workshop: {
      eyebrow: 'THE VILLAGE WORKSHOP',
      name: '百工阁',
      action: '查看工坊档案',
      description: '木屑与星火落在青石上，未完成的器物仍带着手心的温度。每一道榫卯，都记着一次笨拙而诚实的抵达。',
    },
    mountain: {
      eyebrow: 'THE THREE MOUNTAINS',
      name: '三山观',
      action: '登上三山',
      description: '山路穿过松影，直到云与天不再分明。回望来处，旧日脚印已被清风连成一条温柔的线。',
    },
  },
} as const;

