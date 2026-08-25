import { getCollection, type CollectionEntry } from 'astro:content';

export async function getPublishedBlogPosts(): Promise<CollectionEntry<'blog'>[]> {
  const posts = await getCollection('blog', ({ data }) => {
    return !data.draft;
  });

  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export async function getFeaturedBlogPosts(): Promise<CollectionEntry<'blog'>[]> {
  const posts = await getPublishedBlogPosts();
  return posts.filter(post => post.data.featured);
}

export async function getAllBlogTags(): Promise<{ tag: string; count: number }[]> {
  const posts = await getPublishedBlogPosts();
  const tagCounts: Record<string, number> = {};

  posts.forEach(post => {
    post.data.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getAllProjects(): Promise<CollectionEntry<'portfolio'>[]> {
  const projects = await getCollection('portfolio');
  return projects.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export async function getFeaturedProjects(): Promise<CollectionEntry<'portfolio'>[]> {
  const projects = await getAllProjects();
  return projects.filter(p => p.data.featured);
}
