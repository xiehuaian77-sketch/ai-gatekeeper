import rss from '@astrojs/rss';
import { getPublishedBlogPosts } from '../utils/content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const blog = await getPublishedBlogPosts();
  return rss({
    title: '谢怀安 (Huaian.dev) - 技术博客 RSS 订阅',
    description: 'AI 智能体开发、Multi-Agent 协同架构与全栈技术探索。',
    site: context.site || 'https://xiehuaian.de5.net',
    items: blog.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/blog/${post.slug}/`,
    })),
    customData: `<language>zh-cn</language>`,
  });
}
