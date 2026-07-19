export type VillagePlaceId = 'study' | 'workshop' | 'mountain';

export const villageCopy = {
  gateway: {
    eyebrow: 'WANG XUANMO · SOFTWARE ENGINEERING',
    title: '王选默 · 云村',
    lead: '一名软件工程本科生的个人数字村落，记录机器学习、自然语言处理与编程实践，也收纳持续学习中的笔记与作品。',
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
      eyebrow: 'ABOUT WANG XUANMO',
      name: '关于王选默',
      action: '查看个人履历',
      description: '软件工程本科大二学生，绩点 3.8659、排名约前 15%，关注 Python、机器学习与自然语言处理。',
    },
  },
} as const;

