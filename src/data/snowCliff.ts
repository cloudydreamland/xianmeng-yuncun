export interface FriendLink {
  name: string;
  href: string;
  description: string;
  tags: string[];
}

export const contactEmail = '';

export const friendLinks: FriendLink[] = [];

export const visitorNotes = [
  '这里欢迎友链、自我介绍、作品交换与温和的技术交流。',
  '首版只开放静态入口，不接入站内留言数据库，也不展示空白评论框。',
  '如果未来开放真实留言，会先补齐审核、隐私与反垃圾策略。',
];
