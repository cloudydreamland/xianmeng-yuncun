import { useEffect, useMemo, useRef, useState } from 'react';

export type TimeMode = 'auto' | 'dawn' | 'day' | 'dusk' | 'night';
type ResolvedTimeMode = Exclude<TimeMode, 'auto'>;

export interface JourneyLocation {
  href: string;
  kind: 'study' | 'workshop' | 'mountain';
  eyebrow: string;
  title: string;
  description: string;
}

export interface AmbienceSource {
  mp3?: string;
  ogg?: string;
}

interface Props {
  imageSrc?: string;
  imageAlt?: string;
  locations?: JourneyLocation[];
  ambienceSrc?: AmbienceSource;
}

const STORAGE_KEY = 'yuncun-time-mode';

const DEFAULT_LOCATIONS: JourneyLocation[] = [
  {
    href: '/notes',
    kind: 'study',
    eyebrow: '山窗书屋',
    title: '翻阅云笺',
    description: '生活札记、学习笔记，以及值得反复推敲的问题。',
  },
  {
    href: '/projects',
    kind: 'workshop',
    eyebrow: '百工阁',
    title: '查看造物',
    description: '项目经历、技术选择与仍在生长的构想。',
  },
  {
    href: '/about',
    kind: 'mountain',
    eyebrow: '三山观',
    title: '登山远望',
    description: '来路、此刻，以及想要前往的方向。',
  },
];

const TIME_OPTIONS: Array<{ value: TimeMode; label: string; hint: string }> = [
  { value: 'auto', label: '随天光', hint: '自动' },
  { value: 'dawn', label: '山窗初曙', hint: '清晨' },
  { value: 'day', label: '春水晴昼', hint: '白昼' },
  { value: 'dusk', label: '暮云叆叇', hint: '黄昏' },
  { value: 'night', label: '星河入梦', hint: '夜晚' },
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

export default function VillageJourney({
  imageSrc = '/images/yuncun-cloudwall.webp',
  imageAlt = '一位旅人乘着小舟穿过风雨与厚重云墙，望见晨光中宁静的青山、春水与茅屋',
  locations = DEFAULT_LOCATIONS,
  ambienceSrc,
}: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timeControlRef = useRef<HTMLDetailsElement>(null);
  const frameRef = useRef<number | null>(null);
  const [enhanced, setEnhanced] = useState(false);
  const [compact, setCompact] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [activeScene, setActiveScene] = useState(0);
  const [timeMode, setTimeMode] = useState<TimeMode>('auto');
  const [resolvedTime, setResolvedTime] = useState<ResolvedTimeMode>('day');
  const [audioPlaying, setAudioPlaying] = useState(false);

  const hasAmbience = Boolean(ambienceSrc?.mp3 || ambienceSrc?.ogg);
  const hideInactiveScenes = enhanced && !compact && !reducedMotion;
  const activeTimeLabel = useMemo(
    () => TIME_OPTIONS.find((option) => option.value === timeMode)?.hint ?? '自动',
    [timeMode],
  );

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compactQuery = window.matchMedia('(max-width: 900px)');
    let storedMode: string | null = null;
    try {
      storedMode = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      storedMode = null;
    }
    const initialMode = isTimeMode(storedMode) ? storedMode : 'auto';

    setTimeMode(initialMode);
    setResolvedTime(resolveTimeMode(initialMode));
    setReducedMotion(motionQuery.matches);
    setCompact(compactQuery.matches);
    setEnhanced(true);

    const handleMotionChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    const handleCompactChange = (event: MediaQueryListEvent) => setCompact(event.matches);
    motionQuery.addEventListener('change', handleMotionChange);
    compactQuery.addEventListener('change', handleCompactChange);

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange);
      compactQuery.removeEventListener('change', handleCompactChange);
    };
  }, []);

  useEffect(() => {
    if (timeMode !== 'auto') {
      setResolvedTime(timeMode);
      return;
    }

    const syncWithClock = () => setResolvedTime(resolveTimeMode('auto'));
    syncWithClock();
    const timer = window.setInterval(syncWithClock, 60_000);
    return () => window.clearInterval(timer);
  }, [timeMode]);

  useEffect(() => {
    document.body.dataset.homeTime = resolvedTime;
    return () => {
      delete document.body.dataset.homeTime;
    };
  }, [resolvedTime]);

  useEffect(() => {
    const root = rootRef.current;
    if (!enhanced) return;
    if (!root || compact || reducedMotion) {
      root?.style.setProperty('--journey-progress', '0.72');
      root?.style.setProperty('--journey-scale', '1.12');
      root?.style.setProperty('--journey-shift-x', '-2%');
      root?.style.setProperty('--journey-shift-y', '0%');
      root?.style.setProperty('--journey-cloud-near-shift', '0px');
      root?.style.setProperty('--journey-near-opacity', '.16');
      setActiveScene(2);
      return;
    }

    const updateProgress = () => {
      frameRef.current = null;
      if (document.hidden) return;

      const rect = root.getBoundingClientRect();
      const range = Math.max(root.offsetHeight - window.innerHeight, 1);
      const progress = Math.min(1, Math.max(0, -rect.top / range));
      const nextScene = progress < 0.23 ? 0 : progress < 0.5 ? 1 : progress < 0.79 ? 2 : 3;

      root.style.setProperty('--journey-progress', progress.toFixed(4));
      root.style.setProperty('--journey-scale', (1.06 + progress * 0.12).toFixed(4));
      root.style.setProperty('--journey-shift-x', `${(-3.2 * progress).toFixed(2)}%`);
      root.style.setProperty('--journey-shift-y', `${(1.8 * progress).toFixed(2)}%`);
      root.style.setProperty('--journey-cloud-shift', `${(-110 * progress).toFixed(1)}px`);
      root.style.setProperty('--journey-cloud-near-shift', `${(110 * progress).toFixed(1)}px`);
      root.style.setProperty('--journey-near-opacity', Math.max(0, 0.46 - progress * 0.62).toFixed(3));
      setActiveScene((current) => (current === nextScene ? current : nextScene));
    };

    const requestUpdate = () => {
      if (frameRef.current === null) frameRef.current = window.requestAnimationFrame(updateProgress);
    };

    const handleVisibility = () => {
      if (!document.hidden) requestUpdate();
    };

    updateProgress();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, [compact, enhanced, reducedMotion]);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.hidden && audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setAudioPlaying(false);
      }
    };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden);
  }, []);

  const selectTimeMode = (mode: TimeMode) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // The visual state still works when storage is unavailable.
    }
    setTimeMode(mode);
    setResolvedTime(resolveTimeMode(mode));
    timeControlRef.current?.removeAttribute('open');
  };

  const toggleAmbience = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.volume = 0.35;
      try {
        await audio.play();
        setAudioPlaying(true);
      } catch {
        setAudioPlaying(false);
      }
    } else {
      audio.pause();
      setAudioPlaying(false);
    }
  };

  return (
    <section
      ref={rootRef}
      className={`village-journey ${enhanced ? 'is-enhanced' : ''} ${compact ? 'is-compact' : ''} ${reducedMotion ? 'is-static' : ''}`}
      data-scene={activeScene}
      data-time={resolvedTime}
      data-time-mode={timeMode}
      aria-label="入村漫游"
    >
      <div className="journey-sticky">
        <div className="journey-picture" aria-hidden="true">
          <img src={imageSrc} alt="" width={1824} height={864} fetchPriority="high" />
        </div>
        <div className="journey-color" aria-hidden="true" />
        <div className="journey-stars" aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => <span key={index} />)}
        </div>
        <div className="journey-fireflies" aria-hidden="true">
          {Array.from({ length: 9 }, (_, index) => <span key={index} />)}
        </div>
        <div className="journey-clouds journey-clouds--far" aria-hidden="true"><i /><i /><i /></div>
        <div className="journey-water" aria-hidden="true"><i /><i /><i /></div>
        <div className="journey-boat" aria-hidden="true"><i /><span /></div>
        <div className="journey-petals" aria-hidden="true">
          {Array.from({ length: 7 }, (_, index) => <span key={index} />)}
        </div>
        <div className="journey-clouds journey-clouds--near" aria-hidden="true"><i /><i /><i /><i /></div>

        <div className="journey-toolbar">
          <details ref={timeControlRef} className="time-control">
            <summary aria-label={`环境光色：${activeTimeLabel}`}>
              <span className="time-control__orb" aria-hidden="true" />
              <span>{activeTimeLabel}</span>
            </summary>
            <div className="time-control__menu" role="group" aria-label="选择云村时刻">
              {TIME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={timeMode === option.value ? 'active' : ''}
                  aria-pressed={timeMode === option.value}
                  onClick={() => selectTimeMode(option.value)}
                >
                  <span>{option.label}</span><small>{option.hint}</small>
                </button>
              ))}
            </div>
          </details>
          {hasAmbience && (
            <button className="ambience-control" type="button" onClick={toggleAmbience} aria-pressed={audioPlaying}>
              {audioPlaying ? '静听水声' : '开启水声'}
            </button>
          )}
        </div>

        <div className="journey-scenes">
          <article className="journey-scene journey-scene--gateway" aria-hidden={hideInactiveScenes && activeScene !== 0}>
            <p className="eyebrow">A QUIET VILLAGE ABOVE THE CLOUDS</p>
            <h1><span>闲梦</span><strong>云村</strong></h1>
            <p className="journey-lead">穿过喧嚣与风雨，在云深处，为思想留一间书屋，为创造留一座工坊。</p>
            <span className="journey-scroll-cue"><i />沿溪入村</span>
          </article>

          <article className="journey-scene journey-scene--stream" aria-hidden={hideInactiveScenes && activeScene !== 1}>
            <p className="eyebrow">SAILING BEYOND THE CLOUD WALL</p>
            <h2>层层云絮，<br />托起一江暖水。</h2>
            <p>薄雾下的三山似半落青天。小舟循着水声，驶向云墙尽头，也驶向闲梦的发端。</p>
          </article>

          <article className="journey-scene journey-scene--village" aria-hidden={hideInactiveScenes && activeScene !== 2}>
            <div className="journey-village-copy">
              <p className="eyebrow">THREE PLACES, ONE VILLAGE</p>
              <h2>云村三处</h2>
              <p>云墙挡住了风雨。循着檀香、锤音与山风，选择此刻想去的地方。</p>
            </div>
            <nav className="journey-hotspots" aria-label="云村地点">
              {locations.map((location) => (
                <a key={location.href} className={`journey-hotspot journey-hotspot--${location.kind}`} href={location.href}>
                  <span className="journey-hotspot__pin" aria-hidden="true"><i /></span>
                  <span className="journey-hotspot__card">
                    <small>{location.eyebrow}</small>
                    <strong>{location.title}</strong>
                    <span>{location.description}</span>
                    <em>前往此处 →</em>
                  </span>
                </a>
              ))}
            </nav>
          </article>

          <article className="journey-scene journey-scene--arrival" aria-hidden={hideInactiveScenes && activeScene !== 3}>
            <p className="eyebrow">WELCOME HOME</p>
            <h2>人在，村在，梦在。</h2>
            <p>时间在这里慢下来。新寄到的云笺与工坊近作，正在前方等候。</p>
            <a className="button button--primary" href="#village-content">走入村中</a>
          </article>
        </div>

        <div className="journey-progress" aria-hidden="true"><span /></div>
        <img className="journey-accessible-image" src={imageSrc} width={1824} height={864} alt={imageAlt} />
        {hasAmbience && (
          <audio ref={audioRef} loop preload="none">
            {ambienceSrc?.ogg && <source src={ambienceSrc.ogg} type="audio/ogg" />}
            {ambienceSrc?.mp3 && <source src={ambienceSrc.mp3} type="audio/mpeg" />}
          </audio>
        )}
      </div>
    </section>
  );
}
