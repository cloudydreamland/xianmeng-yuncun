import { Container, Graphics } from 'pixi.js';

export type RegionPointerTheme = 'village' | 'wind' | 'star' | 'moon' | 'rain' | 'snow' | 'lantern';

type TrailPoint = {
  x: number;
  y: number;
  life: number;
};

type StarNode = {
  nx: number;
  ny: number;
  size: number;
  phase: number;
};

export interface RegionPointerMagic {
  pointerMove: (x: number, y: number, time?: number) => void;
  pointerLeave: () => void;
  resize: (width: number, height: number) => void;
  tick: (delta: number, deltaMS: number, elapsed: number) => void;
  destroy: () => void;
}

const THEME_COLORS: Record<RegionPointerTheme, { primary: number; glow: number }> = {
  village: { primary: 0xcaf2dc, glow: 0xf7efbd },
  rain: { primary: 0x91e5f2, glow: 0xd9f6ff },
  star: { primary: 0xc6adff, glow: 0xf0e8ff },
  wind: { primary: 0xa5efd4, glow: 0xe6ffd6 },
  moon: { primary: 0xb9e7f1, glow: 0xfff5c9 },
  snow: { primary: 0xdaf5ff, glow: 0xffffff },
  lantern: { primary: 0xffb65e, glow: 0xfff0a8 },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const distance = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

const seededRandom = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ result >>> 15, result | 1);
    result ^= result + Math.imul(result ^ result >>> 7, result | 61);
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
};

function drawCrystal(graphics: Graphics, x: number, y: number, radius: number, color: number, alpha: number, rotation = 0) {
  for (let arm = 0; arm < 6; arm += 1) {
    const angle = rotation + arm * Math.PI / 3;
    const endX = x + Math.cos(angle) * radius;
    const endY = y + Math.sin(angle) * radius;
    graphics.moveTo(x, y).lineTo(endX, endY);
    for (const ratio of [0.5, 0.72]) {
      const branchX = x + Math.cos(angle) * radius * ratio;
      const branchY = y + Math.sin(angle) * radius * ratio;
      const branchSize = radius * (1 - ratio) * 0.5;
      graphics
        .moveTo(branchX, branchY)
        .lineTo(branchX + Math.cos(angle - Math.PI / 4) * branchSize, branchY + Math.sin(angle - Math.PI / 4) * branchSize)
        .moveTo(branchX, branchY)
        .lineTo(branchX + Math.cos(angle + Math.PI / 4) * branchSize, branchY + Math.sin(angle + Math.PI / 4) * branchSize);
    }
  }
  graphics.stroke({ color, alpha, width: Math.max(0.7, radius / 18) });
}

export function createRegionPointerMagic(stage: Container, theme: RegionPointerTheme): RegionPointerMagic {
  const graphics = new Graphics();
  graphics.blendMode = 'screen';
  graphics.alpha = 0;
  stage.addChild(graphics);

  const colors = THEME_COLORS[theme];
  const random = seededRandom(9321 + theme.length * 113);
  const starNodes: StarNode[] = Array.from({ length: 28 }, () => ({
    nx: 0.04 + random() * 0.92,
    ny: 0.06 + random() * 0.88,
    size: 3.5 + random() * 6,
    phase: random() * Math.PI * 2,
  }));

  let width = 1;
  let height = 1;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let visible = false;
  let opacity = 0;
  let lastMove = 0;
  let lastTrailX = Number.NEGATIVE_INFINITY;
  let lastTrailY = Number.NEGATIVE_INFINITY;
  const trail: TrailPoint[] = [];

  const addTrailPoint = (x: number, y: number) => {
    if (distance(x, y, lastTrailX, lastTrailY) < 7) return;
    trail.unshift({ x, y, life: 1 });
    trail.splice(theme === 'wind' ? 28 : 20);
    lastTrailX = x;
    lastTrailY = y;
  };

  const drawVillage = (elapsed: number) => {
    trail.filter((_, index) => index % 3 === 0).forEach((point, index) => {
      const sway = Math.sin(elapsed * 1.5 + index * 1.7) * (8 + index * 1.05);
      const x = point.x + sway;
      const y = point.y - index * 1.6;
      const alpha = point.life * (0.34 - index * 0.025);
      graphics.moveTo(currentX, currentY).lineTo(x, y).stroke({ color: colors.primary, alpha, width: 0.8 });
      const size = 6.5 + (index % 3) * 3;
      graphics
        .rect(x - size, y - size * 0.58, size * 2, size * 1.16)
        .fill({ color: index % 2 ? colors.primary : colors.glow, alpha: alpha * 0.7 })
        .stroke({ color: colors.glow, alpha: alpha * 1.15, width: 0.7 });
    });
    graphics.circle(currentX, currentY, 8.5).stroke({ color: colors.glow, alpha: 0.72, width: 1.25 });
  };

  const drawRain = (elapsed: number) => {
    trail.filter((_, index) => index % 3 === 0).forEach((point, index) => {
      const life = point.life;
      const radius = 13 + (1 - life) * 55 + index * 1.8;
      graphics.ellipse(point.x, point.y + 7, radius, radius * 0.3).stroke({
        color: index % 2 ? colors.primary : colors.glow,
        alpha: life * 0.24,
        width: 0.8,
      });
    });
    for (let line = -2; line <= 2; line += 1) {
      const offset = line * 19;
      const sway = Math.sin(elapsed * 2.2 + line) * 4;
      graphics
        .moveTo(currentX + offset + 46, currentY - 110)
        .bezierCurveTo(currentX + offset + sway, currentY - 56, currentX + offset - sway, currentY - 3, currentX + offset - 30, currentY + 70)
        .stroke({ color: colors.primary, alpha: 0.12 + (2 - Math.abs(line)) * 0.055, width: 1 });
    }
    graphics.ellipse(currentX, currentY + 11, 32, 9).stroke({ color: colors.glow, alpha: 0.62, width: 1.35 });
  };

  const drawStar = (elapsed: number) => {
    const scale = Math.min(width / 1500, 1);
    const nodes = starNodes.slice(0, width < 720 ? 18 : 28).map((node) => ({
      ...node,
      x: node.nx * width + Math.sin(elapsed * 0.22 + node.phase) * (7 + 5 * scale),
      y: node.ny * height + Math.cos(elapsed * 0.18 + node.phase) * (6 + 4 * scale),
    }));
    const neighborRange = clamp(width * 0.105, 105, 165);
    type Segment = [number, number, number, number];
    const networkBuckets: Segment[][] = Array.from({ length: 4 }, () => []);
    const pointerBuckets: Segment[][] = Array.from({ length: 4 }, () => []);

    nodes.forEach((node, index) => {
      nodes.slice(index + 1).forEach((other) => {
        const gap = distance(node.x, node.y, other.x, other.y);
        if (gap > neighborRange) return;
        const strength = 1 - gap / neighborRange;
        networkBuckets[Math.min(3, Math.floor(strength * 4))].push([node.x, node.y, other.x, other.y]);
      });
      const pointerGap = distance(node.x, node.y, currentX, currentY);
      if (pointerGap < 320) {
        const strength = 1 - pointerGap / 320;
        pointerBuckets[Math.min(3, Math.floor(strength * 4))].push([currentX, currentY, node.x, node.y]);
      }
    });
    networkBuckets.forEach((segments, bucket) => {
      if (!segments.length) return;
      segments.forEach(([x1, y1, x2, y2]) => graphics.moveTo(x1, y1).lineTo(x2, y2));
      graphics.stroke({ color: colors.primary, alpha: ((bucket + 0.5) / 4) * 0.2, width: 0.65 });
    });
    pointerBuckets.forEach((segments, bucket) => {
      if (!segments.length) return;
      segments.forEach(([x1, y1, x2, y2]) => graphics.moveTo(x1, y1).lineTo(x2, y2));
      graphics.stroke({ color: colors.glow, alpha: ((bucket + 0.5) / 4) * 0.78, width: 1.05 });
    });
    nodes.forEach((node) => {
      const pointerGap = distance(node.x, node.y, currentX, currentY);
      graphics
        .rect(node.x - node.size / 2, node.y - node.size / 2, node.size, node.size)
        .fill({ color: pointerGap < 320 ? colors.glow : colors.primary, alpha: pointerGap < 320 ? 0.78 : 0.34 });
    });

    const satellites = Array.from({ length: 9 }, (_, index) => {
      const angle = elapsed * (index % 2 ? -0.09 : 0.12) + index * 2.24;
      const radius = 62 + (index % 3) * 52;
      return {
        x: currentX + Math.cos(angle) * radius,
        y: currentY + Math.sin(angle) * radius * 0.66,
        size: 6.5 + (index % 4) * 2.4,
      };
    });
    const satelliteSegments: [Segment[], Segment[]] = [[], []];
    satellites.forEach((node, index) => {
      const next = satellites[(index + 1) % satellites.length];
      satelliteSegments[index % 2].push([currentX, currentY, node.x, node.y], [node.x, node.y, next.x, next.y]);
    });
    satelliteSegments.forEach((segments, index) => {
      segments.forEach(([x1, y1, x2, y2]) => graphics.moveTo(x1, y1).lineTo(x2, y2));
      graphics.stroke({ color: index ? colors.primary : colors.glow, alpha: 0.26, width: 1 });
    });
    satellites.forEach((node, index) => {
      graphics
        .rect(node.x - node.size / 2, node.y - node.size / 2, node.size, node.size)
        .fill({ color: index % 3 === 0 ? colors.glow : colors.primary, alpha: 0.54 })
        .stroke({ color: colors.glow, alpha: 0.5, width: 0.65 });
    });
    graphics
      .rect(currentX - 7.5, currentY - 7.5, 15, 15)
      .stroke({ color: colors.glow, alpha: 0.86, width: 1.45 });
    graphics.circle(currentX, currentY, 24 + Math.sin(elapsed * 2) * 3).stroke({ color: colors.primary, alpha: 0.32, width: 1 });
  };

  const drawWind = (elapsed: number) => {
    for (let ribbon = -1; ribbon <= 1; ribbon += 1) {
      const offset = ribbon * 10;
      trail.forEach((point, index) => {
        if (index === trail.length - 1) return;
        const next = trail[index + 1];
        const wave = Math.sin(elapsed * 2.1 + index * 0.52 + ribbon) * (3 + index * 0.28);
        graphics
          .moveTo(point.x, point.y + offset + wave)
          .lineTo(next.x, next.y + offset + Math.sin(elapsed * 2.1 + (index + 1) * 0.52 + ribbon) * (3 + index * 0.28))
          .stroke({ color: ribbon === 0 ? colors.glow : colors.primary, alpha: point.life * (ribbon === 0 ? 0.46 : 0.22), width: ribbon === 0 ? 1.15 : 0.75 });
      });
    }
    trail.filter((_, index) => index % 5 === 0).forEach((point, index) => {
      const angle = elapsed * 0.8 + index * 1.9;
      const size = 6 + index * 0.38;
      graphics
        .moveTo(point.x + Math.cos(angle) * size, point.y + Math.sin(angle) * size)
        .lineTo(point.x - Math.sin(angle) * size * 0.7, point.y + Math.cos(angle) * size * 0.7)
        .lineTo(point.x - Math.cos(angle) * size, point.y - Math.sin(angle) * size)
        .closePath()
        .fill({ color: colors.primary, alpha: point.life * 0.38 });
    });
  };

  const drawMoon = (elapsed: number) => {
    trail.filter((_, index) => index % 4 === 0).forEach((point, index) => {
      const radius = 12 + index * 5.2;
      graphics.ellipse(point.x, point.y + 8, radius, radius * 0.28).stroke({ color: colors.primary, alpha: point.life * 0.22, width: 0.75 });
    });
    [32, 54, 78].forEach((radius, index) => {
      const speed = index % 2 ? -0.58 : 0.72;
      const angle = elapsed * speed + index * 2.1;
      graphics.circle(currentX, currentY, radius).stroke({ color: index === 1 ? colors.glow : colors.primary, alpha: 0.13 + index * 0.035, width: 0.7 });
      const x = currentX + Math.cos(angle) * radius;
      const y = currentY + Math.sin(angle) * radius * 0.52;
      graphics.circle(x, y, 3.5 + index * 1.4).fill({ color: index === 1 ? colors.glow : colors.primary, alpha: 0.66 });
    });
    graphics.circle(currentX, currentY, 11).fill({ color: colors.glow, alpha: 0.16 }).stroke({ color: colors.glow, alpha: 0.72, width: 1.25 });
  };

  const drawSnow = (elapsed: number) => {
    trail.filter((_, index) => index % 5 === 0).forEach((point, index) => {
      drawCrystal(graphics, point.x, point.y, 7.5 + index * 0.75, colors.primary, point.life * 0.24, elapsed * 0.08 + index);
    });
    drawCrystal(graphics, currentX, currentY, 36 + Math.sin(elapsed * 1.4) * 3, colors.glow, 0.66, elapsed * 0.08);
    graphics.circle(currentX, currentY, 6).fill({ color: colors.glow, alpha: 0.72 });
  };

  const drawLantern = (elapsed: number) => {
    trail.forEach((point, index) => {
      const jitter = Math.sin(elapsed * 4.1 + index * 2.4) * (1 + index * 0.24);
      const size = Math.max(3, 10.5 - index * 0.34);
      const alpha = point.life * clamp(0.72 - index * 0.025, 0.08, 0.72);
      if (index < trail.length - 1) {
        const next = trail[index + 1];
        graphics.moveTo(point.x + jitter, point.y).lineTo(next.x, next.y).stroke({ color: colors.primary, alpha: alpha * 0.24, width: 0.7 });
      }
      graphics
        .rect(point.x - size / 2 + jitter, point.y - size / 2, size, size)
        .fill({ color: index % 3 === 0 ? colors.glow : colors.primary, alpha });
    });
    const pulse = 15 + Math.sin(elapsed * 3.2) * 3;
    graphics.circle(currentX, currentY, pulse).fill({ color: colors.primary, alpha: 0.1 }).stroke({ color: colors.glow, alpha: 0.58, width: 1.25 });
  };

  const drawers: Record<RegionPointerTheme, (elapsed: number) => void> = {
    village: drawVillage,
    rain: drawRain,
    star: drawStar,
    wind: drawWind,
    moon: drawMoon,
    snow: drawSnow,
    lantern: drawLantern,
  };

  return {
    pointerMove(x, y, time = performance.now()) {
      targetX = clamp(x, 0, width);
      targetY = clamp(y, 0, height);
      if (!visible) {
        currentX = targetX;
        currentY = targetY;
      }
      visible = true;
      lastMove = time;
      addTrailPoint(targetX, targetY);
    },
    pointerLeave() {
      visible = false;
    },
    resize(nextWidth, nextHeight) {
      width = Math.max(1, nextWidth);
      height = Math.max(1, nextHeight);
    },
    tick(delta, deltaMS, elapsed) {
      const now = performance.now();
      const shouldShow = visible && now - lastMove < 1800;
      opacity += ((shouldShow ? 1 : 0) - opacity) * Math.min(1, 0.12 * delta);
      graphics.alpha = opacity;
      if (opacity < 0.008) {
        graphics.clear();
        return;
      }

      currentX += (targetX - currentX) * Math.min(1, 0.19 * delta);
      currentY += (targetY - currentY) * Math.min(1, 0.19 * delta);
      const decay = deltaMS * (theme === 'wind' ? 0.00034 : 0.00048);
      trail.forEach((point) => { point.life -= decay; });
      while (trail.length && trail[trail.length - 1].life <= 0) trail.pop();

      graphics.clear();
      drawers[theme](elapsed);
    },
    destroy() {
      graphics.destroy();
      trail.length = 0;
    },
  };
}
