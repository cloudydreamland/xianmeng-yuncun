import { useEffect, useMemo, useRef, useState } from 'react';

export type TimeMode = 'auto' | 'dawn' | 'day' | 'dusk' | 'night';
export type ResolvedTimeMode = Exclude<TimeMode, 'auto'>;
export type VillagePlaceId = 'study' | 'workshop' | 'mountain';

export interface ResponsiveVillageImage {
  avif: string;
  webp: string;
  mobileAvif: string;
  mobileWebp: string;
}

export interface VillageMapItem {
  href: string;
  label: string;
  meta?: string;
}

export interface VillageMapLocation {
  id: VillagePlaceId;
  href: string;
  eyebrow: string;
  name: string;
  action: string;
  description: string;
  items: VillageMapItem[];
}

interface Props {
  backgrounds: Record<ResolvedTimeMode, ResponsiveVillageImage>;
  locations: VillageMapLocation[];
  title: string;
  eyebrow: string;
  lead: string;
  timeCopy: Record<ResolvedTimeMode, string>;
  imageAlt: string;
}

const STORAGE_KEY = 'yuncun-time-mode';
const PLACE_IDS = new Set<VillagePlaceId>(['study', 'workshop', 'mountain']);
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

function placeFromHash(): VillagePlaceId | null {
  const value = window.location.hash.slice(1);
  return PLACE_IDS.has(value as VillagePlaceId) ? value as VillagePlaceId : null;
}

export default function VillageMap({ backgrounds, locations, title, eyebrow, lead, timeCopy, imageAlt }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lastTriggerRef = useRef<HTMLAnchorElement | null>(null);
  const [timeMode, setTimeMode] = useState<TimeMode>('auto');
  const [resolvedTime, setResolvedTime] = useState<ResolvedTimeMode | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<VillagePlaceId | null>(null);
  const [timeMenuOpen, setTimeMenuOpen] = useState(false);

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === selectedPlace) ?? null,
    [locations, selectedPlace],
  );

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }
    const initialMode = isTimeMode(stored) ? stored : 'auto';
    const initialTime = resolveTimeMode(initialMode);
    setTimeMode(initialMode);
    setResolvedTime(initialTime);
    document.documentElement.dataset.time = initialTime;
    document.documentElement.dataset.timeMode = initialMode;
    setSelectedPlace(placeFromHash());

    const syncHash = () => setSelectedPlace(placeFromHash());
    window.addEventListener('hashchange', syncHash);
    window.addEventListener('popstate', syncHash);
    return () => {
      window.removeEventListener('hashchange', syncHash);
      window.removeEventListener('popstate', syncHash);
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
    if (selectedLocation && !dialog.open) dialog.showModal();
    if (!selectedLocation && dialog.open) dialog.close();
  }, [selectedLocation]);

  useEffect(() => {
    if (!resolvedTime) return;
    const order: ResolvedTimeMode[] = ['dawn', 'day', 'dusk', 'night'];
    const current = order.indexOf(resolvedTime);
    const candidates = [order[(current + 1) % order.length], order[(current + order.length - 1) % order.length]];
    const preload = () => {
      const compact = window.matchMedia('(max-width: 760px)').matches;
      candidates.forEach((candidate) => {
        const image = new Image();
        image.src = compact ? backgrounds[candidate].mobileWebp : backgrounds[candidate].webp;
      });
    };
    const requestIdle = Reflect.get(window, 'requestIdleCallback') as ((callback: () => void) => number) | undefined;
    const cancelIdle = Reflect.get(window, 'cancelIdleCallback') as ((id: number) => void) | undefined;
    const id = requestIdle ? requestIdle(preload) : window.setTimeout(preload, 1800);
    return () => {
      if (requestIdle && cancelIdle) cancelIdle(id);
      else window.clearTimeout(id);
    };
  }, [backgrounds, resolvedTime]);

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
      // Time switching remains available when storage is blocked.
    }
  };

  const openPlace = (event: React.MouseEvent<HTMLAnchorElement>, place: VillagePlaceId) => {
    event.preventDefault();
    lastTriggerRef.current = event.currentTarget;
    window.history.pushState(null, '', `${window.location.pathname}${window.location.search}#${place}`);
    setSelectedPlace(place);
  };

  const closePlace = () => {
    const url = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, '', url);
    setSelectedPlace(null);
    window.setTimeout(() => lastTriggerRef.current?.focus(), 0);
  };

  const image = resolvedTime ? backgrounds[resolvedTime] : null;

  return (
    <section className="village-map" data-place={selectedPlace ?? undefined} aria-label="云村地图">
      <div className="village-map__canvas">
        {image && (
          <picture className="village-map__picture" key={resolvedTime}>
            <source media="(max-width: 760px)" type="image/avif" srcSet={image.mobileAvif} />
            <source media="(max-width: 760px)" type="image/webp" srcSet={image.mobileWebp} />
            <source type="image/avif" srcSet={image.avif} />
            <img src={image.webp} alt={imageAlt} width={1600} height={900} fetchPriority="high" />
          </picture>
        )}
        <noscript>
          <img className="village-map__noscript" src={backgrounds.day.webp} alt={imageAlt} width="1600" height="900" />
          <nav className="map-noscript-links" aria-label="云村地点">
            {locations.map((location) => <a href={location.href}>{location.name}</a>)}
          </nav>
        </noscript>
        <div className="village-map__wash" aria-hidden="true" />
        <div className="village-map__pixels" aria-hidden="true"><i /><i /><i /><i /><i /></div>

        <div className="village-map__intro pixel-frame">
          <p className="pixel-kicker">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{lead}</p>
          <span className="village-map__hint"><i aria-hidden="true" /> 轻触路标，择一处暂栖</span>
        </div>

        <div className="time-dial">
          <button className="time-dial__toggle" type="button" aria-expanded={timeMenuOpen} onClick={() => setTimeMenuOpen((open) => !open)}>
            <span aria-hidden="true">{TIME_OPTIONS.find((item) => item.value === timeMode)?.glyph}</span>
            <span>{resolvedTime ? timeCopy[resolvedTime] : '循时而行'}</span>
          </button>
          {timeMenuOpen && (
            <div className="time-dial__menu pixel-frame" role="group" aria-label="选择云村时刻">
              {TIME_OPTIONS.map((option) => (
                <button key={option.value} type="button" className={timeMode === option.value ? 'active' : ''} aria-pressed={timeMode === option.value} onClick={() => selectTime(option.value)}>
                  <span aria-hidden="true">{option.glyph}</span>{option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className="map-hotspots" aria-label="云村地点">
          {locations.map((location) => (
            <a
              key={location.id}
              href={`#${location.id}`}
              className={`map-hotspot map-hotspot--${location.id}`}
              aria-label={`查看${location.name}`}
              aria-expanded={selectedPlace === location.id}
              onClick={(event) => openPlace(event, location.id)}
            >
              <span className="map-hotspot__pin" aria-hidden="true"><i /></span>
              <span className="map-hotspot__label"><small>0{locations.indexOf(location) + 1}</small><strong>{location.name}</strong></span>
            </a>
          ))}
        </nav>
      </div>

      <dialog ref={dialogRef} className="location-dialog pixel-frame" onCancel={(event) => { event.preventDefault(); closePlace(); }} onClose={() => selectedPlace && closePlace()}>
        {selectedLocation && (
          <div className="location-window">
            <div className="spirit-sprite" aria-hidden="true"><i className="spirit-sprite__ear" /><i className="spirit-sprite__body" /><i className="spirit-sprite__eye spirit-sprite__eye--left" /><i className="spirit-sprite__eye spirit-sprite__eye--right" /></div>
            <button className="location-window__close" type="button" onClick={closePlace} aria-label="关闭地点介绍">×</button>
            <p className="pixel-kicker">{selectedLocation.eyebrow}</p>
            <h2>{selectedLocation.name}</h2>
            <p className="location-window__copy">{selectedLocation.description}</p>
            <ul className="location-window__list">
              {selectedLocation.items.map((item) => (
                <li key={item.href}>
                  <a href={item.href}><span>{item.label}</span>{item.meta && <span className="location-window__tag">{item.meta}</span>}</a>
                </li>
              ))}
            </ul>
            <a className="pixel-button pixel-button--primary" href={selectedLocation.href}>{selectedLocation.action}<span aria-hidden="true">→</span></a>
          </div>
        )}
      </dialog>
    </section>
  );
}
