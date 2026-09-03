export type LifeModuleId = 'today' | 'plan' | 'inbox' | 'habit' | 'focus-session' | 'checklist' | 'expiry' | 'expense' | 'inventory' | 'journal' | 'data';

export interface LifeModule {
  id: LifeModuleId;
  label: string;
  title: string;
  description: string;
  mark: string;
}

/**
 * 独立管理端可用视图的规范清单。公开站不导入、也不渲染这些入口。
 */
export const lifeModules: LifeModule[] = [
  { id: 'today', label: '今日', title: '今日概览', description: '私人计划、习惯与本月开销概览', mark: '今' },
  { id: 'plan', label: '计划', title: '私人计划', description: '日期、优先级与完成状态', mark: '策' },
  { id: 'inbox', label: '收集', title: '随手收集', description: '暂存想法和待整理事项', mark: '收' },
  { id: 'habit', label: '习惯', title: '习惯与打卡', description: '习惯和每日完成记录', mark: '养' },
  { id: 'focus-session', label: '专注', title: '专注记录', description: '已完成的专注时段', mark: '定' },
  { id: 'checklist', label: '清单', title: '私人清单', description: '成组的待办项目', mark: '单' },
  { id: 'expiry', label: '期限', title: '期限提醒', description: '证件、订阅与生活事项到期日', mark: '期' },
  { id: 'expense', label: '账目', title: '私人账目', description: '个人开销记录', mark: '账' },
  { id: 'inventory', label: '物品', title: '物品位置', description: '物品位置与购买信息', mark: '物' },
  { id: 'journal', label: '手记', title: '私人手记', description: '日记、心情与回忆', mark: '记' },
  { id: 'data', label: '数据', title: '数据与备份', description: '迁移、导出与回收站', mark: '云' },
];

export const lifeModuleById = Object.fromEntries(lifeModules.map((item) => [item.id, item])) as Record<LifeModuleId, LifeModule>;
