const stripMarkdown = (source: string) => source
  .replace(/^---[\s\S]*?---/m, ' ')
  .replace(/```[\s\S]*?```/g, ' ')
  .replace(/`[^`]*`/g, ' ')
  .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/<[^>]+>/g, ' ')
  .replace(/[#>*_~|=-]/g, ' ');

export function getReadingStats(source: string) {
  const text = stripMarkdown(source);
  const cjkCharacters = text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu)?.length ?? 0;
  const latinWords = text
    .replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu, ' ')
    .match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0;

  return {
    wordCount: cjkCharacters + latinWords,
    readingMinutes: Math.max(1, Math.ceil(cjkCharacters / 300 + latinWords / 200)),
  };
}
