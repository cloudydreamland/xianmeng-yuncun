import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type {
  RegionId,
  RegionStatus,
  ResponsiveWorldImage,
  ResolvedTimeMode,
  TimeMode,
} from '../data/worldMap';
import { TRAIL_STORAGE_KEY } from '../data/cloudJourneys';

export interface WorldMapRegion {
  id: RegionId;
  href: string;
  realm: string;
  title: string;
  summary: string;
  quote: string;
  functionTitle: string;
  functionDescription: string;
  functionLabel: string;
  status: RegionStatus;
  x: number;
  y: number;
  labelSide: 'left' | 'right' | 'center';
}

interface Props {
  backgrounds: Record<ResolvedTimeMode, ResponsiveWorldImage>;
  regions: WorldMapRegion[];
  timeCopy: Record<ResolvedTimeMode, string>;
  imageAlt: string;
}

const STORAGE_KEY = 'yuncun-time-mode';
const TIME_OPTIONS: Array<{ value: TimeMode; label: string; glyph: string }> = [
  { value: 'auto', label: '随天光', glyph: '◌' },
  { value: 'dawn', label: '清晨', glyph: '◔' },
  { value: 'day', label: '白昼', glyph: '☀' },
  { value: 'dusk', label: '黄昏', glyph: '◕' },
  { value: 'night', label: '夜晚', glyph: '✦' },
];

export function resolveTimeMode(mode: TimeMode, hour = new Date().getHours()): ResolvedTimeMode {
  if (mode !== 'auto') return mode;
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

function isTimeMode(value: string | null): value is TimeMode {
  return value === 'auto' || value === 'dawn' || value === 'day' || value === 'dusk' || value === 'night';
}

export default function WorldMap({ backgrounds, regions, timeCopy, imageAlt }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const lastTriggerRef = useRef<HTMLAnchorElement | null>(null);
  const [timeMode, setTimeMode] = useState<TimeMode>('auto');
  // CSS selects the correct preloaded map before hydration; this state keeps
  // the control label and time switcher in sync once React is active.
  const [resolvedTime, setResolvedTime] = useState<ResolvedTimeMode>('day');
  const [selectedId, setSelectedId] = useState<RegionId | null>(null);
  const [timeMenuOpen, setTimeMenuOpen] = useState(false);
  const [visitedPaths, setVisitedPaths] = useState<Set<string>>(() => new Set());

  const regionIds = useMemo(() => new Set(regions.map(({ id }) => id)), [regions]);
  const selectedRegion = regions.find(({ id }) => id === selectedId) ?? null;

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }
    const initialMode = isTimeMode(stored) ? stored : 'auto';
    const initialTime = resolveTimeMode(initialMode);
    const hash = window.location.hash.slice(1) as RegionId;
    setTimeMode(initialMode);
    setResolvedTime(initialTime);
    setSelectedId(regionIds.has(hash) ? hash : null);
    document.documentElement.dataset.time = initialTime;
    document.documentElement.dataset.timeMode = initialMode;

    const syncLocation = () => {
      const next = window.location.hash.slice(1) as RegionId;
      setSelectedId(regionIds.has(next) ? next : null);
    };
    window.addEventListener('hashchange', syncLocation);
    window.addEventListener('popstate', syncLocation);

    const viewport = viewportRef.current;
    if (viewport && window.matchMedia('(max-width: 760px)').matches) {
      window.requestAnimationFrame(() => {
        viewport.scrollLeft = Math.max(0, (viewport.scrollWidth - viewport.clientWidth) / 2);
      });
    }

    return () => {
      window.removeEventListener('hashchange', syncLocation);
      window.removeEventListener('popstate', syncLocation);
    };
  }, [regionIds]);

  useEffect(() => {
    const syncTrail = () => {
      try {
        const parsed = JSON.parse(window.localStorage.getItem(TRAIL_STORAGE_KEY) || '[]');
        setVisitedPaths(new Set(Array.isArray(parsed) ? parsed.map((entry) => entry?.path).filter(Boolean) : []));
      } catch {
        setVisitedPaths(new Set());
      }
    };
    syncTrail();
    window.addEventListener('storage', syncTrail);
    window.addEventListener('yuncun:trail-update', syncTrail);
    return () => {
      window.removeEventListener('storage', syncTrail);
      window.removeEventListener('yuncun:trail-update', syncTrail);
    };
  }, []);

  useEffect(() => {
    if (timeMode !== 'auto') return;
    const timer = window.setInterval(() => {
      const next = resolveTimeMode('auto');
      setResolvedTime(next);
      document.documentElement.dataset.time = next;
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [timeMode]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selectedRegion && !dialog.open) dialog.showModal();
    if (!selectedRegion && dialog.open) {
      dialog.close();
      window.setTimeout(() => lastTriggerRef.current?.focus(), 0);
    }
  }, [selectedRegion]);

  const selectTime = (mode: TimeMode) => {
    const resolved = resolveTimeMode(mode);
    setTimeMode(mode);
    setResolvedTime(resolved);
    setTimeMenuOpen(false);
    document.documentElement.dataset.time = resolved;
    document.documentElement.dataset.timeMode = mode;
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Switching remains available even when browser storage is blocked.
    }
  };

  const openRegion = (event: React.MouseEvent<HTMLAnchorElement>, id: RegionId) => {
    event.preventDefault();
    lastTriggerRef.current = event.currentTarget;
    window.history.pushState({ region: id }, '', `${window.location.pathname}${window.location.search}#${id}`);
    setSelectedId(id);
  };

  const closeRegion = () => {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    setSelectedId(null);
    window.setTimeout(() => lastTriggerRef.current?.focus(), 0);
  };

  const mapBackgroundStyle = Object.fromEntries(
    Object.entries(backgrounds).flatMap(([time, image]) => [
      [`--world-map-${time}`, `url("${image.cssImage ?? image.fallback}")`],
      [`--world-map-${time}-large`, `url("${image.cssImageLarge ?? image.cssImage ?? image.fallback}")`],
      [`--world-map-${time}-ultra`, `url("${image.cssImageUltra ?? image.cssImageLarge ?? image.fallback}")`],
      [`--world-map-${time}-mobile`, `url("${image.cssImageMobile ?? image.cssImage ?? image.fallback}")`],
      [`--world-map-${time}-mobile-retina`, `url("${image.cssImageMobileRetina ?? image.cssImageMobile ?? image.cssImage ?? image.fallback}")`],
    ]),
  ) as CSSProperties;

  return (
    <section id="world-map-top" className="world-map" aria-label="雲梦世界全境地图" tabIndex={-1}>
      <div className="world-map__frame">
        <div className="world-map__viewport" ref={viewportRef} tabIndex={0} aria-label="可横向浏览的雲梦全境地图">
          <div className="world-map__canvas">
            <div className="world-map__picture" style={mapBackgroundStyle} role="img" aria-label={imageAlt} />
            <div className="world-map__vignette" aria-hidden="true" />

            <nav className="world-markers" aria-label="雲梦世界地点">
              {regions.map((region) => (
                <a
                  key={region.id}
                  href={`#${region.id}`}
                  className={`world-marker world-marker--${region.id} world-marker--label-${region.labelSide}${visitedPaths.has(region.href) ? ' world-marker--visited' : ''}`}
                  style={{ left: `${region.x}%`, top: `${region.y}%` }}
                  aria-label={`查看${region.title}，${region.functionLabel}${region.status === 'active' ? '' : '，门扉待启'}${visitedPaths.has(region.href) ? '，已经到访' : ''}`}
                  aria-expanded={selectedId === region.id}
                  onClick={(event) => openRegion(event, region.id)}
                >
                  <span className="world-marker__title">
                    <i aria-hidden="true" />
                    <span className="world-marker__copy">
                      <strong>{region.title}</strong>
                      <small>{region.functionLabel}</small>
                    </span>
                    <em aria-hidden="true">›</em>
                  </span>
                </a>
              ))}
            </nav>

            <noscript>
              <img className="world-map__noscript" src={backgrounds.day.fallback} alt={imageAlt} width="3840" height="2160" />
              <nav className="world-map__noscript-links" aria-label="雲梦世界地点">
                {regions.map((region) => <a href={region.href}>{region.title}</a>)}
              </nav>
            </noscript>
          </div>
        </div>

        <p className="world-map__swipe-hint"><span aria-hidden="true">↔</span> 左右滑动浏览地图 · 七境目录可查看全部</p>
        <details className="world-mobile-directory">
          <summary><span><strong>七境目录</strong><small>全部 7 处入口</small></span><em aria-hidden="true">＋</em></summary>
          <nav aria-label="七境完整目录">
            {regions.map((region) => (
              <a key={region.id} className={visitedPaths.has(region.href) ? 'visited' : ''} href={region.href}>
                <span>{region.title}</span><strong>{region.functionLabel}</strong><em aria-hidden="true">→</em>
              </a>
            ))}
          </nav>
        </details>

        <div className="world-time-dial">
          <button type="button" className="world-time-dial__toggle" aria-expanded={timeMenuOpen} onClick={() => setTimeMenuOpen((open) => !open)}>
            <span aria-hidden="true">{TIME_OPTIONS.find(({ value }) => value === timeMode)?.glyph}</span>
            <span>{resolvedTime ? timeCopy[resolvedTime] : '循时而行'}</span>
          </button>
          {timeMenuOpen && (
            <div className="world-time-dial__menu pixel-frame" role="group" aria-label="选择雲梦时刻">
              {TIME_OPTIONS.map((option) => (
                <button key={option.value} type="button" className={timeMode === option.value ? 'active' : ''} aria-pressed={timeMode === option.value} onClick={() => selectTime(option.value)}>
                  <span aria-hidden="true">{option.glyph}</span>{option.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <a className="scene-jump world-map__descent" href="#home-content" data-scene-jump aria-label="从全境地图进入云中书页">
          <span>云中书页</span><i aria-hidden="true">↓</i>
        </a>
      </div>

      <dialog ref={dialogRef} className="world-drawer pixel-frame" onCancel={(event) => { event.preventDefault(); closeRegion(); }}>
        {selectedRegion && (
          <article className={`world-drawer__inner world-drawer__inner--${selectedRegion.id}`}>
            <button className="world-drawer__close" type="button" onClick={closeRegion} aria-label="关闭地点卷轴">×</button>
            <div className="world-drawer__scroll">
              {selectedRegion.status !== 'active' && <div className="world-drawer__status"><span>{selectedRegion.realm}</span><strong>境中有景 · 门扉待启</strong></div>}
              <h2>{selectedRegion.title}</h2>
              <p className="world-drawer__summary">{selectedRegion.summary}</p>
              <blockquote>{selectedRegion.quote}</blockquote>
              <div className="world-drawer__function">
                <small>此境所司</small>
                <h3>{selectedRegion.functionTitle}</h3>
                <p>{selectedRegion.functionDescription}</p>
              </div>
            </div>
            <div className="world-drawer__action">
              <a className="pixel-button pixel-button--primary" href={selectedRegion.href}>
                {selectedRegion.status === 'active' ? `进入${selectedRegion.title}` : '查看此境设定'}<span aria-hidden="true">→</span>
              </a>
            </div>
          </article>
        )}
      </dialog>
    </section>
  );
}
