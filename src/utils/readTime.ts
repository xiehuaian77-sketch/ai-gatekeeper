/**
 * 计算中英文混合文章的预计阅读时长（分钟）
 * 中文字符按 ~350 字/分钟，英文单词按 ~160 词/分钟估算
 */
export function getReadingTime(content: string): { minutes: number; text: string; words: number } {
  if (!content) {
    return { minutes: 1, text: '1 分钟阅读', words: 0 };
  }

  // 移除 markdown 格式字符和 html 标签
  const cleanContent = content
    .replace(/```[\s\S]*?```/g, '') // 代码块粗略过滤或计入
    .replace(/<[^>]+>/g, '')
    .replace(/[#*`~>-]/g, '');

  // 匹配中文字符
  const chineseChars = cleanContent.match(/[\u4e00-\u9fa5]/g) || [];
  const chineseCount = chineseChars.length;

  // 匹配英文单词
  const nonChinese = cleanContent.replace(/[\u4e00-\u9fa5]/g, ' ');
  const englishWords = nonChinese.trim().split(/\s+/).filter(Boolean);
  const englishCount = englishWords.length;

  const totalWords = chineseCount + englishCount;
  // 综合计算时间
  const readTimeMinutes = Math.max(1, Math.ceil(chineseCount / 350 + englishCount / 160));

  return {
    minutes: readTimeMinutes,
    text: `${readTimeMinutes} 分钟阅读`,
    words: totalWords,
  };
}
