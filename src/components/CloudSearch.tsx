import { useEffect, useMemo, useRef, useState } from 'react';

type SearchType = 'all' | '文章' | '学习' | '项目' | '其他';

interface PagefindResultData {
  url: string;
  excerpt?: string;
  meta?: Record<string, string>;
}

interface PagefindHandle {
  data: () => Promise<PagefindResultData>;
}

interface PagefindApi {
  init: () => Promise<void> | void;
  search: (term: string, options?: { filters?: Record<string, string> }) => Promise<{ results: PagefindHandle[] }>;
}

interface Props {
  variant?: 'dialog' | 'embedded';
  heading?: string;
  description?: string;
}

const FILTERS: Array<{ value: SearchType; label: string }> = [
  { value: 'all', label: '全部' },
  { value: '文章', label: '文章' },
  { value: '学习', label: '学习' },
  { value: '项目', label: '项目' },
  { value: '其他', label: '其他' },
];

const GROUP_TYPES: Record<Exclude<SearchType, 'all'>, string[]> = {
  文章: ['笔记', '作品'],
  学习: ['教程', '面经'],
  项目: ['项目', '推进'],
  其他: ['世界', '关于'],
};

const HUB_PATHS = new Set(['/notes/', '/projects/', '/learn/', '/learn/llm/', '/learn/pytorch/', '/interview/', '/interview/llm/']);
const normalizePath = (url: string) => new URL(url, 'https://example.invalid').pathname.replace(/\/index\.html$/, '/');
const resultGroup = (url: string) => {
  const path = normalizePath(url);
  if (path.startsWith('/learn/llm/')) return '大模型学习路线';
  if (path.startsWith('/learn/pytorch/')) return 'PyTorch 实践教程';
  if (path.startsWith('/interview/llm/')) return '大模型面试训练';
  return '其他结果';
};

let pagefindPromise: Promise<PagefindApi> | null = null;

function loadPagefind() {
  if (!pagefindPromise) {
    const bundlePath = '/pagefind/pagefind.js';
    pagefindPromise = import(/* @vite-ignore */ bundlePath)
      .then(async (module) => {
        const api = module as unknown as PagefindApi;
        await api.init();
        return api;
      })
      .catch((error) => {
        pagefindPromise = null;
        throw error;
      });
  }
  return pagefindPromise;
}

export default function CloudSearch({
  variant = 'dialog',
  heading = '云镜检索',
  description = '搜索全站的笔记、教程、面经、项目与作品。',
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const lastOpenerRef = useRef<HTMLElement | null>(null);
  const requestIdRef = useRef(0);
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState<SearchType>('all');
  const [matches, setMatches] = useState<PagefindResultData[]>([]);
  const [results, setResults] = useState<PagefindResultData[]>([]);
  const [visibleCount, setVisibleCount] = useState(8);
  const [status, setStatus] = useState(description);

  useEffect(() => {
    if (variant !== 'dialog') return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const open = (opener?: HTMLElement | null) => {
      lastOpenerRef.current = opener || document.activeElement as HTMLElement;
      if (!dialog.open) dialog.showModal();
      window.setTimeout(() => inputRef.current?.focus(), 0);
      loadPagefind().catch(() => undefined);
    };
    const openButtons = [...document.querySelectorAll<HTMLElement>('[data-search-open]')];
    const listeners = openButtons.map((button) => {
      const listener = () => open(button);
      button.addEventListener('click', listener);
      return { button, listener };
    });
    const keydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        open();
      }
    };
    const restoreFocus = () => lastOpenerRef.current?.focus();
    document.addEventListener('keydown', keydown);
    dialog.addEventListener('close', restoreFocus);
    return () => {
      listeners.forEach(({ button, listener }) => button.removeEventListener('click', listener));
      document.removeEventListener('keydown', keydown);
      dialog.removeEventListener('close', restoreFocus);
    };
  }, [variant]);

  useEffect(() => {
    const term = query.trim();
    const currentRequest = ++requestIdRef.current;
    setVisibleCount(8);
    if (!term) {
      setMatches([]);
      setResults([]);
      setStatus(description);
      return;
    }

    setStatus('正在云海中寻访……');
    setMatches([]);
    setResults([]);
    const timer = window.setTimeout(async () => {
      try {
        const api = await loadPagefind();
        const search = await api.search(term);
        if (currentRequest !== requestIdRef.current) return;
        const loaded = await Promise.all(search.results.map((result) => result.data()));
        const acceptedTypes = activeType === 'all' ? null : GROUP_TYPES[activeType];
        const filtered = loaded
          .filter((result) => !acceptedTypes || acceptedTypes.includes(result.meta?.contentType || ''))
          .map((result, index) => ({ result, index }))
          .sort((left, right) => Number(HUB_PATHS.has(normalizePath(left.result.url))) - Number(HUB_PATHS.has(normalizePath(right.result.url))) || left.index - right.index)
          .map(({ result }) => result);
        if (currentRequest !== requestIdRef.current) return;
        setMatches(filtered);
        setResults(filtered.slice(0, 8));
        setStatus(filtered.length ? `找到 ${filtered.length} 处相关内容，课程章节已归入同组` : '这片云中暂时没有找到对应的文字。');
      } catch {
        if (currentRequest !== requestIdRef.current) return;
        setMatches([]);
        setResults([]);
        setStatus(import.meta.env.DEV
          ? '开发模式还没有生成搜索索引，请使用生产预览验证。'
          : '云海暂时起雾，搜索索引加载失败，请稍后再试。');
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [activeType, description, query]);

  const showMore = () => {
    const nextCount = visibleCount + 8;
    setVisibleCount(nextCount);
    setResults(matches.slice(0, nextCount));
  };

  const groupedResults = useMemo(() => {
    const groups = new Map<string, PagefindResultData[]>();
    results.forEach((result) => {
      const group = resultGroup(result.url);
      groups.set(group, [...(groups.get(group) || []), result]);
    });
    return [...groups.entries()];
  }, [results]);

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      const first = resultsRef.current?.querySelector<HTMLAnchorElement>('a');
      if (first) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  const handleResultsKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const links = [...(resultsRef.current?.querySelectorAll<HTMLAnchorElement>('a') ?? [])];
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    const nextIndex = event.key === 'ArrowDown' ? Math.min(index + 1, links.length - 1) : index - 1;
    event.preventDefault();
    if (nextIndex < 0) inputRef.current?.focus();
    else links[nextIndex]?.focus();
  };

  const content = (
    <div className={`cloud-search cloud-search--${variant}`}>
      <header className="cloud-search__header">
        <div><p className="pixel-kicker">云镜索引</p><h2>{heading}</h2></div>
        {variant === 'dialog' && <button className="cloud-search__close" type="button" aria-label="关闭搜索" onClick={() => dialogRef.current?.close()}>×</button>}
      </header>
      <label className="search-field">
        <span aria-hidden="true">⌕</span>
        <input ref={inputRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleInputKeyDown} placeholder="搜索标题、正文或标签" aria-label="搜索雲梦世界内容" autoComplete="off" spellCheck={false} />
        <kbd>⌘ K</kbd>
      </label>
      <div className="search-filters" aria-label="筛选搜索结果">
        {FILTERS.map((filter) => (
          <button key={filter.value} type="button" className={activeType === filter.value ? 'active' : ''} aria-pressed={activeType === filter.value} onClick={() => setActiveType(filter.value)}>{filter.label}</button>
        ))}
      </div>
      <p className="search-status" aria-live="polite">{status}</p>
      <div ref={resultsRef} className="search-results" onKeyDown={handleResultsKeyDown}>
        {groupedResults.map(([group, items]) => (
          <section className="search-result-group" key={group} aria-label={group}>
            {group !== '其他结果' && <h3><span>{group}</span><small>{items.length} 条</small></h3>}
            {items.map((result) => (
              <a className="search-result" href={result.url} key={result.url}>
                <span className="search-result__type">{result.meta?.contentType || '云笺'}</span>
                <strong>{result.meta?.title || '未题名云笺'}</strong>
                <p dangerouslySetInnerHTML={{ __html: result.excerpt || result.meta?.description || '' }} />
              </a>
            ))}
          </section>
        ))}
      </div>
      {visibleCount < matches.length && <button className="search-load-more" type="button" onClick={showMore}>再展开八枚云笺</button>}
    </div>
  );

  if (variant === 'embedded') return content;
  return (
    <dialog ref={dialogRef} className="search-dialog" aria-label="云镜检索" onClick={(event) => { if (event.currentTarget === event.target) dialogRef.current?.close(); }}>
      <div className="search-dialog__cloud" aria-hidden="true" />
      {content}
    </dialog>
  );
}
