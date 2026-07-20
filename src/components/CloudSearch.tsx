import { useEffect, useRef, useState } from 'react';

type SearchType = 'all' | '笔记' | '项目' | '世界' | '作品' | '关于';

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
  { value: '笔记', label: '笔记' },
  { value: '项目', label: '项目' },
  { value: '世界', label: '世界' },
  { value: '作品', label: '作品' },
  { value: '关于', label: '关于' },
];

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
  description = '投下一枚词语，散落七境的笔墨便会显影。',
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const lastOpenerRef = useRef<HTMLElement | null>(null);
  const requestIdRef = useRef(0);
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState<SearchType>('all');
  const [handles, setHandles] = useState<PagefindHandle[]>([]);
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
      setHandles([]);
      setResults([]);
      setStatus(description);
      return;
    }

    setStatus('正在云海中寻访……');
    const timer = window.setTimeout(async () => {
      try {
        const api = await loadPagefind();
        const options = activeType === 'all' ? undefined : { filters: { contentType: activeType } };
        const search = await api.search(term, options);
        if (currentRequest !== requestIdRef.current) return;
        setHandles(search.results);
        const first = await Promise.all(search.results.slice(0, 8).map((result) => result.data()));
        if (currentRequest !== requestIdRef.current) return;
        setResults(first);
        setStatus(first.length ? `找到 ${search.results.length} 处相关内容` : '这片云中暂时没有找到对应的文字。');
      } catch {
        if (currentRequest !== requestIdRef.current) return;
        setHandles([]);
        setResults([]);
        setStatus(window.location.hostname === 'localhost'
          ? '开发模式还没有生成搜索索引，请使用生产预览验证。'
          : '云海暂时起雾，搜索索引加载失败，请稍后再试。');
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [activeType, description, query]);

  const showMore = async () => {
    const nextCount = visibleCount + 8;
    const currentRequest = requestIdRef.current;
    const nextResults = await Promise.all(handles.slice(0, nextCount).map((result) => result.data()));
    if (currentRequest !== requestIdRef.current) return;
    setVisibleCount(nextCount);
    setResults(nextResults);
  };

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
        <div><p className="pixel-kicker">THE CLOUD MIRROR</p><h2>{heading}</h2></div>
        {variant === 'dialog' && <button className="cloud-search__close" type="button" aria-label="关闭搜索" onClick={() => dialogRef.current?.close()}>×</button>}
      </header>
      <label className="search-field">
        <span aria-hidden="true">⌕</span>
        <input ref={inputRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleInputKeyDown} placeholder="让云镜照见一段文字……" autoComplete="off" spellCheck={false} />
        <kbd>⌘ K</kbd>
      </label>
      <div className="search-filters" aria-label="筛选搜索结果">
        {FILTERS.map((filter) => (
          <button key={filter.value} type="button" className={activeType === filter.value ? 'active' : ''} aria-pressed={activeType === filter.value} onClick={() => setActiveType(filter.value)}>{filter.label}</button>
        ))}
      </div>
      <p className="search-status" aria-live="polite">{status}</p>
      <div ref={resultsRef} className="search-results" onKeyDown={handleResultsKeyDown}>
        {results.map((result) => (
          <a className="search-result" href={result.url} key={result.url}>
            <span className="search-result__type">{result.meta?.contentType || '云笺'}</span>
            <strong>{result.meta?.title || '未题名云笺'}</strong>
            <p dangerouslySetInnerHTML={{ __html: result.excerpt || result.meta?.description || '' }} />
          </a>
        ))}
      </div>
      {visibleCount < handles.length && <button className="search-load-more" type="button" onClick={showMore}>再展开八枚云笺</button>}
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
