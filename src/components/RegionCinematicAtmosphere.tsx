import { useEffect, useRef } from 'react';
import {
  Application,
  Assets,
  ColorMatrixFilter,
  Container,
  Filter,
  Sprite,
  Texture,
} from 'pixi.js';
import { AdvancedBloomFilter } from 'pixi-filters/advanced-bloom';
import { GodrayFilter } from 'pixi-filters/godray';
import { createRegionPointerMagic } from '../utils/regionPointerMagic';

export type RegionTheme = 'village' | 'wind' | 'star' | 'moon' | 'rain' | 'snow' | 'lantern';

interface Props {
  theme: RegionTheme;
  image: string;
}

type ParticleKind = 'fog' | 'rain' | 'star' | 'leaf' | 'snow' | 'ember' | 'mote';

interface SceneConfig {
  brightness: number;
  saturation: number;
  focusX: number;
  focusY: number;
  parallax: number;
  particles: Array<{ kind: ParticleKind; count: number }>;
  bloom?: { threshold: number; scale: number; brightness: number; blur: number };
  rays?: { angle: number; gain: number; alpha: number; lacunarity: number };
}

interface MovingParticle {
  sprite: Sprite;
  kind: ParticleKind;
  vx: number;
  vy: number;
  phase: number;
  spin: number;
  baseAlpha: number;
}

const SCENES: Record<RegionTheme, SceneConfig> = {
  village: {
    brightness: 0.56,
    saturation: 0.9,
    focusX: 0.56,
    focusY: 0.48,
    parallax: 9,
    particles: [{ kind: 'fog', count: 8 }, { kind: 'mote', count: 22 }],
    rays: { angle: 18, gain: 0.38, alpha: 0.24, lacunarity: 2.1 },
  },
  rain: {
    brightness: 0.48,
    saturation: 0.78,
    focusX: 0.55,
    focusY: 0.5,
    parallax: 7,
    particles: [{ kind: 'rain', count: 115 }, { kind: 'fog', count: 5 }],
    rays: { angle: -16, gain: 0.2, alpha: 0.12, lacunarity: 3.2 },
  },
  star: {
    brightness: 0.44,
    saturation: 1.12,
    focusX: 0.62,
    focusY: 0.46,
    parallax: 12,
    particles: [{ kind: 'star', count: 70 }, { kind: 'fog', count: 4 }],
    bloom: { threshold: 0.48, scale: 0.86, brightness: 0.94, blur: 6 },
  },
  wind: {
    brightness: 0.5,
    saturation: 0.98,
    focusX: 0.6,
    focusY: 0.48,
    parallax: 15,
    particles: [{ kind: 'leaf', count: 34 }, { kind: 'mote', count: 18 }],
    rays: { angle: 62, gain: 0.46, alpha: 0.2, lacunarity: 2.7 },
  },
  moon: {
    brightness: 0.5,
    saturation: 0.92,
    focusX: 0.6,
    focusY: 0.45,
    parallax: 8,
    particles: [{ kind: 'fog', count: 6 }, { kind: 'star', count: 32 }],
    bloom: { threshold: 0.58, scale: 0.74, brightness: 0.96, blur: 7 },
    rays: { angle: 8, gain: 0.3, alpha: 0.14, lacunarity: 2.4 },
  },
  snow: {
    brightness: 0.5,
    saturation: 0.74,
    focusX: 0.58,
    focusY: 0.45,
    parallax: 6,
    particles: [{ kind: 'snow', count: 95 }, { kind: 'fog', count: 4 }],
    bloom: { threshold: 0.7, scale: 0.38, brightness: 0.96, blur: 5 },
  },
  lantern: {
    brightness: 0.5,
    saturation: 1.08,
    focusX: 0.63,
    focusY: 0.46,
    parallax: 11,
    particles: [{ kind: 'ember', count: 62 }, { kind: 'mote', count: 24 }],
    bloom: { threshold: 0.5, scale: 1.02, brightness: 0.96, blur: 8 },
    rays: { angle: -10, gain: 0.26, alpha: 0.13, lacunarity: 2.2 },
  },
};

function makeTexture(kind: ParticleKind): Texture {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return Texture.WHITE;

  if (kind === 'fog') {
    canvas.width = 512;
    canvas.height = 180;
    const gradient = ctx.createRadialGradient(256, 90, 8, 256, 90, 250);
    gradient.addColorStop(0, 'rgba(232,248,246,.42)');
    gradient.addColorStop(0.44, 'rgba(205,231,232,.19)');
    gradient.addColorStop(1, 'rgba(190,218,224,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 180);
  } else if (kind === 'rain') {
    canvas.width = 8;
    canvas.height = 128;
    const gradient = ctx.createLinearGradient(0, 0, 0, 128);
    gradient.addColorStop(0, 'rgba(210,239,255,0)');
    gradient.addColorStop(0.28, 'rgba(210,239,255,.25)');
    gradient.addColorStop(1, 'rgba(232,249,255,.9)');
    ctx.fillStyle = gradient;
    ctx.fillRect(2, 0, 3, 128);
  } else if (kind === 'leaf') {
    canvas.width = 48;
    canvas.height = 28;
    ctx.beginPath();
    ctx.moveTo(3, 14);
    ctx.bezierCurveTo(13, 1, 35, 2, 45, 13);
    ctx.bezierCurveTo(34, 25, 13, 27, 3, 14);
    ctx.fillStyle = 'rgba(190,226,172,.88)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(239,247,202,.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(5, 14);
    ctx.lineTo(42, 13);
    ctx.stroke();
  } else {
    const size = kind === 'star' ? 96 : 64;
    canvas.width = size;
    canvas.height = size;
    const center = size / 2;
    const palette = kind === 'ember'
      ? ['rgba(255,251,210,1)', 'rgba(255,181,76,.72)', 'rgba(242,91,40,0)']
      : kind === 'snow'
        ? ['rgba(255,255,255,.98)', 'rgba(220,242,255,.7)', 'rgba(210,235,255,0)']
        : ['rgba(248,255,244,.96)', 'rgba(183,232,226,.58)', 'rgba(150,210,215,0)'];
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
    gradient.addColorStop(0, palette[0]);
    gradient.addColorStop(0.2, palette[1]);
    gradient.addColorStop(1, palette[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    if (kind === 'star') {
      const beam = ctx.createLinearGradient(0, center, size, center);
      beam.addColorStop(0, 'rgba(255,255,255,0)');
      beam.addColorStop(0.5, 'rgba(231,241,255,.72)');
      beam.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = beam;
      ctx.fillRect(0, center - 1, size, 2);
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(Math.PI / 2);
      ctx.translate(-center, -center);
      ctx.fillRect(0, center - 1, size, 2);
      ctx.restore();
    }
  }

  return Texture.from(canvas);
}

function resetParticle(particle: MovingParticle, width: number, height: number, initial = false) {
  const { sprite, kind } = particle;
  particle.phase = Math.random() * Math.PI * 2;

  if (kind === 'fog') {
    sprite.width = width * (0.32 + Math.random() * 0.34);
    sprite.height = sprite.width * (0.2 + Math.random() * 0.08);
    sprite.x = initial ? Math.random() * width : -sprite.width * 0.7;
    sprite.y = height * (0.08 + Math.random() * 0.86);
    sprite.alpha = particle.baseAlpha = 0.06 + Math.random() * 0.1;
    particle.vx = 0.08 + Math.random() * 0.16;
    particle.vy = 0;
  } else if (kind === 'rain') {
    const scale = 0.38 + Math.random() * 0.85;
    sprite.width = 1.1 + scale;
    sprite.height = 45 + scale * 72;
    sprite.x = Math.random() * (width + 160);
    sprite.y = initial ? Math.random() * height : -sprite.height;
    sprite.rotation = -0.18;
    sprite.alpha = particle.baseAlpha = 0.16 + scale * 0.2;
    particle.vx = -2.2 - scale * 1.8;
    particle.vy = 10 + scale * 12;
  } else if (kind === 'leaf') {
    const scale = 0.32 + Math.random() * 0.68;
    sprite.width = 13 + scale * 20;
    sprite.height = sprite.width * 0.58;
    sprite.x = initial ? Math.random() * width : -40;
    sprite.y = Math.random() * height;
    sprite.alpha = particle.baseAlpha = 0.16 + scale * 0.28;
    sprite.rotation = Math.random() * Math.PI * 2;
    particle.vx = 0.8 + scale * 2.2;
    particle.vy = -0.18 + Math.random() * 0.38;
    particle.spin = (-0.014 + Math.random() * 0.028) * scale;
  } else if (kind === 'snow') {
    const scale = 0.25 + Math.random() * 0.8;
    sprite.width = sprite.height = 3 + scale * 10;
    sprite.x = Math.random() * width;
    sprite.y = initial ? Math.random() * height : -20;
    sprite.alpha = particle.baseAlpha = 0.25 + scale * 0.48;
    particle.vx = -0.12 + Math.random() * 0.24;
    particle.vy = 0.35 + scale * 1.55;
  } else if (kind === 'ember') {
    const scale = 0.3 + Math.random() * 0.9;
    sprite.width = sprite.height = 5 + scale * 16;
    sprite.x = Math.random() * width;
    sprite.y = initial ? Math.random() * height : height + 25;
    sprite.alpha = particle.baseAlpha = 0.24 + scale * 0.5;
    particle.vx = -0.18 + Math.random() * 0.36;
    particle.vy = -(0.25 + scale * 1.05);
  } else {
    const scale = 0.22 + Math.random() * 0.85;
    sprite.width = sprite.height = (kind === 'star' ? 4 : 5) + scale * (kind === 'star' ? 14 : 10);
    sprite.x = Math.random() * width;
    sprite.y = Math.random() * height;
    sprite.alpha = particle.baseAlpha = 0.16 + scale * 0.48;
    particle.vx = kind === 'star' ? 0 : -0.05 + Math.random() * 0.1;
    particle.vy = kind === 'star' ? 0 : -(0.06 + Math.random() * 0.18);
  }
}

export default function RegionCinematicAtmosphere({ theme, image }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const atmosphereRoot = host.closest<HTMLElement>('.region-canvas-atmosphere');

    let disposed = false;
    let app: Application | undefined;
    const config = SCENES[theme];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    void (async () => {
      app = new Application();
      await app.init({
        resizeTo: host,
        background: '#071318',
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 1.5),
        powerPreference: 'high-performance',
        preference: 'webgl',
      });
      if (disposed) {
        app.destroy(true);
        return;
      }

      app.canvas.className = 'region-cinematic-canvas';
      host.appendChild(app.canvas);

      const texture = await Assets.load<Texture>(image);
      if (disposed || !app) return;

      const scenicLayer = new Container();
      const art = new Sprite(texture);
      art.anchor.set(0.5);
      scenicLayer.addChild(art);
      app.stage.addChild(scenicLayer);

      window.requestAnimationFrame(() => {
        if (!disposed) atmosphereRoot?.setAttribute('data-cinematic-ready', 'true');
      });

      const colorGrade = new ColorMatrixFilter();
      colorGrade.brightness(config.brightness, false);
      colorGrade.saturate(config.saturation, true);
      const filters: Filter[] = [colorGrade];
      let rays: GodrayFilter | undefined;
      if (config.rays) {
        rays = new GodrayFilter({
          angle: config.rays.angle,
          gain: config.rays.gain,
          alpha: config.rays.alpha,
          lacunarity: config.rays.lacunarity,
          parallel: true,
        });
        filters.push(rays);
      }
      if (config.bloom) {
        filters.push(new AdvancedBloomFilter({
          threshold: config.bloom.threshold,
          bloomScale: config.bloom.scale,
          brightness: config.bloom.brightness,
          blur: config.bloom.blur,
          quality: 3,
        }));
      }
      scenicLayer.filters = filters;

      const particleLayer = new Container();
      app.stage.addChild(particleLayer);
      const particles: MovingParticle[] = [];
      const textures = new Map<ParticleKind, Texture>();
      for (const group of config.particles) {
        const particleTexture = textures.get(group.kind) ?? makeTexture(group.kind);
        textures.set(group.kind, particleTexture);
        for (let index = 0; index < group.count; index += 1) {
          const sprite = new Sprite(particleTexture);
          sprite.anchor.set(0.5);
          sprite.blendMode = group.kind === 'leaf' || group.kind === 'rain' ? 'normal' : 'screen';
          const particle: MovingParticle = {
            sprite,
            kind: group.kind,
            vx: 0,
            vy: 0,
            phase: 0,
            spin: 0,
            baseAlpha: 1,
          };
          resetParticle(particle, app.screen.width, app.screen.height, true);
          particles.push(particle);
          particleLayer.addChild(sprite);
        }
      }

      if (config.bloom) {
        particleLayer.filters = [new AdvancedBloomFilter({
          threshold: 0.28,
          bloomScale: theme === 'lantern' ? 1.35 : 0.82,
          brightness: 1,
          blur: theme === 'lantern' ? 7 : 4,
          quality: 2,
        })];
      }

      const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      const pointerMagic = !reduceMotion && finePointer
        ? createRegionPointerMagic(app.stage, theme)
        : undefined;
      if (pointerMagic) host.dataset.pointerReady = 'true';

      const fitArt = () => {
        if (!app) return;
        const width = app.screen.width;
        const height = app.screen.height;
        const scale = Math.max(width / texture.width, height / texture.height) * 1.08;
        art.scale.set(scale);
        art.position.set(
          width * config.focusX + (0.5 - config.focusX) * texture.width * scale,
          height * config.focusY + (0.5 - config.focusY) * texture.height * scale,
        );
        pointerMagic?.resize(width, height);
      };
      fitArt();
      const resizeObserver = new ResizeObserver(fitArt);
      resizeObserver.observe(host);

      const pointer = { x: 0, y: 0 };
      const onPointer = (event: PointerEvent) => {
        pointer.x = event.clientX / window.innerWidth - 0.5;
        pointer.y = event.clientY / window.innerHeight - 0.5;
        if (event.pointerType !== 'touch') pointerMagic?.pointerMove(event.clientX, event.clientY, event.timeStamp);
      };
      const onPointerLeave = () => pointerMagic?.pointerLeave();
      const onVisibilityChange = () => {
        if (!app) return;
        if (document.hidden) app.ticker.stop();
        else app.ticker.start();
      };
      window.addEventListener('pointermove', onPointer, { passive: true });
      document.documentElement.addEventListener('pointerleave', onPointerLeave);
      window.addEventListener('blur', onPointerLeave);
      document.addEventListener('visibilitychange', onVisibilityChange);
      onVisibilityChange();

      let elapsed = 0;
      app.ticker.add((ticker) => {
        if (!app || reduceMotion) return;
        const delta = Math.min(ticker.deltaTime, 2.2);
        elapsed += ticker.deltaMS * 0.001;
        if (rays) rays.time += ticker.deltaMS * 0.00012;
        scenicLayer.x += (pointer.x * config.parallax - scenicLayer.x) * 0.018 * delta;
        scenicLayer.y += (pointer.y * config.parallax - scenicLayer.y) * 0.018 * delta;
        pointerMagic?.tick(delta, ticker.deltaMS, elapsed);

        const width = app.screen.width;
        const height = app.screen.height;
        for (const particle of particles) {
          const { sprite, kind } = particle;
          sprite.x += particle.vx * delta;
          sprite.y += particle.vy * delta;
          particle.phase += 0.012 * delta;

          if (kind === 'fog') {
            sprite.y += Math.sin(particle.phase) * 0.035;
            sprite.alpha = particle.baseAlpha * (0.78 + Math.sin(particle.phase) * 0.22);
            if (sprite.x - sprite.width / 2 > width) resetParticle(particle, width, height);
          } else if (kind === 'rain') {
            if (sprite.y - sprite.height / 2 > height || sprite.x < -80) resetParticle(particle, width, height);
          } else if (kind === 'leaf') {
            sprite.rotation += particle.spin * delta;
            sprite.y += Math.sin(particle.phase * 1.8) * 0.32;
            if (sprite.x > width + 50) resetParticle(particle, width, height);
          } else if (kind === 'snow') {
            sprite.x += Math.sin(particle.phase) * 0.32;
            if (sprite.y > height + 20) resetParticle(particle, width, height);
          } else if (kind === 'ember') {
            sprite.x += Math.sin(particle.phase * 1.4) * 0.18;
            sprite.alpha = particle.baseAlpha * (0.72 + Math.sin(particle.phase * 2.1) * 0.28);
            if (sprite.y < -30) resetParticle(particle, width, height);
          } else {
            sprite.x += particle.vx * delta;
            sprite.y += particle.vy * delta;
            sprite.alpha = particle.baseAlpha * (0.58 + Math.sin(elapsed * 1.2 + particle.phase) * 0.42);
            if (sprite.y < -20) resetParticle(particle, width, height);
          }
        }
      });

      const cleanup = () => {
        resizeObserver.disconnect();
        window.removeEventListener('pointermove', onPointer);
        document.documentElement.removeEventListener('pointerleave', onPointerLeave);
        window.removeEventListener('blur', onPointerLeave);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        pointerMagic?.destroy();
        delete host.dataset.pointerReady;
        atmosphereRoot?.removeAttribute('data-cinematic-ready');
      };
      (host as HTMLDivElement & { __cleanup?: () => void }).__cleanup = cleanup;
    })();

    return () => {
      disposed = true;
      (host as HTMLDivElement & { __cleanup?: () => void }).__cleanup?.();
      app?.destroy(true, { children: true });
    };
  }, [theme, image]);

  return <div ref={hostRef} className={`region-cinematic-stage region-cinematic-stage--${theme}`} data-pointer-effect={theme} aria-hidden="true" />;
}
