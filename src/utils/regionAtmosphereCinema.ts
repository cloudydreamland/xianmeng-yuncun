type Theme = 'village' | 'wind' | 'star' | 'moon' | 'rain' | 'snow' | 'lantern';
type RGB = [number, number, number];

type ThemeConfig = {
  sky: [string, string, string];
  fog: RGB[];
  fogBlend: GlobalCompositeOperation;
  fogOpacity: number;
  fogLayers: number;
  drift: number;
  particle: 'dust' | 'rain' | 'stars' | 'snow' | 'embers' | 'seeds';
  particleCount: number;
  blooms: Array<{ x: number; y: number; radius: number; color: RGB; alpha: number }>;
};

type FogLayer = {
  texture: HTMLCanvasElement;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  sway: number;
  alpha: number;
  depth: number;
};

type Particle = {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
  phase: number;
  depth: number;
};

const mounted = new WeakSet<Element>();

const configs: Record<Theme, ThemeConfig> = {
  village: {
    sky: ['rgba(188,218,218,.3)', 'rgba(217,235,221,.2)', 'rgba(158,201,202,.29)'],
    fog: [[244, 250, 239], [211, 235, 225], [177, 217, 211]],
    fogBlend: 'screen', fogOpacity: .76, fogLayers: 17, drift: 4.5,
    particle: 'dust', particleCount: 76,
    blooms: [{ x: .16, y: .13, radius: .8, color: [255, 242, 197], alpha: .54 }],
  },
  rain: {
    sky: ['rgba(39,66,84,.38)', 'rgba(77,111,124,.25)', 'rgba(119,158,158,.22)'],
    fog: [[204, 226, 228], [143, 180, 191], [85, 126, 145]],
    fogBlend: 'screen', fogOpacity: .58, fogLayers: 14, drift: 7,
    particle: 'rain', particleCount: 230,
    blooms: [{ x: .76, y: .08, radius: .9, color: [206, 230, 236], alpha: .27 }],
  },
  star: {
    sky: ['rgba(3,9,30,.64)', 'rgba(12,22,55,.47)', 'rgba(24,37,67,.34)'],
    fog: [[97, 127, 212], [133, 91, 188], [58, 162, 184]],
    fogBlend: 'screen', fogOpacity: .64, fogLayers: 13, drift: 1.2,
    particle: 'stars', particleCount: 210,
    blooms: [{ x: .64, y: .27, radius: .82, color: [115, 118, 223], alpha: .32 }],
  },
  wind: {
    sky: ['rgba(77,134,113,.28)', 'rgba(151,196,163,.18)', 'rgba(83,139,122,.23)'],
    fog: [[221, 239, 211], [165, 210, 179], [104, 167, 145]],
    fogBlend: 'screen', fogOpacity: .56, fogLayers: 14, drift: 22,
    particle: 'seeds', particleCount: 72,
    blooms: [{ x: .1, y: .3, radius: .78, color: [222, 238, 202], alpha: .3 }],
  },
  moon: {
    sky: ['rgba(25,43,78,.48)', 'rgba(52,92,124,.31)', 'rgba(60,132,143,.26)'],
    fog: [[220, 233, 225], [154, 201, 202], [91, 144, 171]],
    fogBlend: 'screen', fogOpacity: .56, fogLayers: 13, drift: 2.2,
    particle: 'dust', particleCount: 52,
    blooms: [{ x: .79, y: .12, radius: .94, color: [242, 242, 211], alpha: .48 }],
  },
  snow: {
    sky: ['rgba(27,45,76,.5)', 'rgba(66,100,132,.32)', 'rgba(158,193,201,.27)'],
    fog: [[227, 239, 237], [166, 207, 211], [124, 158, 188]],
    fogBlend: 'screen', fogOpacity: .67, fogLayers: 15, drift: 9,
    particle: 'snow', particleCount: 220,
    blooms: [{ x: .48, y: .02, radius: 1.05, color: [173, 216, 213], alpha: .24 }],
  },
  lantern: {
    sky: ['rgba(20,19,48,.56)', 'rgba(56,34,61,.37)', 'rgba(90,52,48,.29)'],
    fog: [[123, 103, 151], [169, 92, 92], [218, 144, 93]],
    fogBlend: 'screen', fogOpacity: .45, fogLayers: 13, drift: 2.8,
    particle: 'embers', particleCount: 96,
    blooms: [
      { x: .15, y: .68, radius: .7, color: [244, 166, 85], alpha: .23 },
      { x: .82, y: .34, radius: .76, color: [234, 129, 79], alpha: .25 },
      { x: .53, y: .78, radius: .58, color: [255, 197, 111], alpha: .18 },
    ],
  },
};

const mulberry32 = (seed: number) => () => {
  let value = seed += 0x6D2B79F5;
  value = Math.imul(value ^ value >>> 15, value | 1);
  value ^= value + Math.imul(value ^ value >>> 7, value | 61);
  return ((value ^ value >>> 14) >>> 0) / 4294967296;
};

const fade = (value: number) => value * value * (3 - 2 * value);
const lerp = (a: number, b: number, amount: number) => a + (b - a) * amount;
const hash = (x: number, y: number, seed: number) => {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 91.3) * 43758.5453123;
  return value - Math.floor(value);
};
const noise = (x: number, y: number, seed: number) => {
  const ix = Math.floor(x), iy = Math.floor(y), fx = fade(x - ix), fy = fade(y - iy);
  return lerp(lerp(hash(ix, iy, seed), hash(ix + 1, iy, seed), fx), lerp(hash(ix, iy + 1, seed), hash(ix + 1, iy + 1, seed), fx), fy);
};
const fbm = (x: number, y: number, seed: number) => {
  let sum = 0, amplitude = .56, frequency = 1;
  for (let octave = 0; octave < 5; octave += 1) {
    sum += noise(x * frequency, y * frequency, seed + octave * 19) * amplitude;
    amplitude *= .5;
    frequency *= 2.04;
  }
  return sum;
};
const wrap = (value: number, max: number, padding = 0) => ((value + padding) % (max + padding * 2) + max + padding * 2) % (max + padding * 2) - padding;

const noiseTexture = (color: RGB, seed: number, threshold: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = 420;
  canvas.height = 220;
  const context = canvas.getContext('2d')!;
  const image = context.createImageData(canvas.width, canvas.height);
  const data = image.data;
  for (let y = 0; y < canvas.height; y += 1) {
    const vertical = Math.sin(Math.PI * y / (canvas.height - 1));
    for (let x = 0; x < canvas.width; x += 1) {
      const value = fbm(x / 78, y / 60, seed);
      const density = Math.max(0, (value - threshold) / (1 - threshold));
      const edge = Math.sin(Math.PI * x / (canvas.width - 1)) * vertical;
      const alpha = Math.pow(density, 1.55) * edge;
      const index = (y * canvas.width + x) * 4;
      data[index] = color[0]; data[index + 1] = color[1]; data[index + 2] = color[2]; data[index + 3] = Math.round(alpha * 255);
    }
  }
  context.putImageData(image, 0, 0);
  return canvas;
};

class CinematicAtmosphere {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  theme: Theme;
  config: ThemeConfig;
  random: () => number;
  width = 0;
  height = 0;
  dpr = 1;
  started = performance.now();
  frame = 0;
  hidden = false;
  reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  fog: FogLayer[] = [];
  particles: Particle[] = [];
  observer: ResizeObserver;

  constructor(root: HTMLElement) {
    this.root = root;
    this.canvas = root.querySelector('canvas')!;
    this.context = this.canvas.getContext('2d', { alpha: true })!;
    this.theme = root.dataset.regionCanvas as Theme;
    this.config = configs[this.theme];
    this.random = mulberry32([...this.theme].reduce((sum, char) => sum * 37 + char.charCodeAt(0), 731));
    this.createScene();
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(document.documentElement);
    this.resize();
    addEventListener('pointermove', this.onPointer, { passive: true });
    document.addEventListener('visibilitychange', this.onVisibility);
    this.draw(0);
    if (!this.reduced) this.frame = requestAnimationFrame(this.tick);
  }

  createScene() {
    const textures = this.config.fog.map((color, index) => noiseTexture(color, 11 + index * 23, .35 + index * .025));
    this.fog = Array.from({ length: this.config.fogLayers }, (_, index) => ({
      texture: textures[index % textures.length],
      x: this.random(), y: .04 + this.random() * .9,
      width: 1.15 + this.random() * 1.45,
      height: .38 + this.random() * .48,
      speed: (.35 + this.random() * .8) * (index % 2 ? 1 : -1),
      sway: this.random() * Math.PI * 2,
      alpha: .34 + this.random() * .5,
      depth: .25 + this.random() * .8,
    }));
    this.particles = Array.from({ length: this.config.particleCount }, () => ({
      x: this.random(), y: this.random(), size: 1 + this.random() * 8.2,
      speed: .18 + this.random() * .85, alpha: .2 + this.random() * .72,
      phase: this.random() * Math.PI * 2, depth: .2 + this.random() * .9,
    }));
  }

  resize = () => {
    this.width = innerWidth; this.height = innerHeight; this.dpr = Math.min(devicePixelRatio || 1, 1.5);
    this.canvas.width = Math.round(this.width * this.dpr); this.canvas.height = Math.round(this.height * this.dpr);
    this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.reduced) this.draw(3.8);
  };
  onPointer = (event: PointerEvent) => {
    this.pointer.targetX = (event.clientX / Math.max(this.width, 1) - .5) * 2;
    this.pointer.targetY = (event.clientY / Math.max(this.height, 1) - .5) * 2;
  };
  onVisibility = () => {
    this.hidden = document.hidden;
    if (!this.hidden && !this.reduced && !this.frame) this.frame = requestAnimationFrame(this.tick);
  };
  tick = (now: number) => {
    this.frame = 0;
    if (this.hidden) return;
    this.pointer.x += (this.pointer.targetX - this.pointer.x) * .015;
    this.pointer.y += (this.pointer.targetY - this.pointer.y) * .015;
    this.draw((now - this.started) / 1000);
    this.frame = requestAnimationFrame(this.tick);
  };

  draw(time: number) {
    const context = this.context;
    context.clearRect(0, 0, this.width, this.height);
    const sky = context.createLinearGradient(0, 0, 0, this.height);
    sky.addColorStop(0, this.config.sky[0]); sky.addColorStop(.52, this.config.sky[1]); sky.addColorStop(1, this.config.sky[2]);
    context.fillStyle = sky; context.fillRect(0, 0, this.width, this.height);
    this.drawBlooms(time);
    this.drawMonumentalField(time);
    if (this.theme === 'village') this.drawLightShafts(time);
    this.drawFog(time);
    if (this.theme === 'moon') this.drawWaterLight(time);
    this.drawParticles(time);
    if (this.theme === 'rain') this.drawRainRipples(time);
    if (this.theme === 'star') this.drawMeteors(time);
  }

  drawBlooms(time: number) {
    const context = this.context;
    context.save(); context.globalCompositeOperation = 'screen';
    for (const bloom of this.config.blooms) {
      const x = this.width * bloom.x + this.pointer.x * 8;
      const y = this.height * bloom.y + this.pointer.y * 5;
      const radius = Math.max(this.width, this.height) * bloom.radius * (1 + Math.sin(time * .18 + bloom.x * 7) * .025);
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(${bloom.color.join(',')},${bloom.alpha})`);
      gradient.addColorStop(.28, `rgba(${bloom.color.join(',')},${bloom.alpha * .34})`);
      gradient.addColorStop(1, `rgba(${bloom.color.join(',')},0)`);
      context.fillStyle = gradient; context.fillRect(0, 0, this.width, this.height);
    }
    context.restore();
  }

  drawMonumentalField(time: number) {
    const context = this.context;
    const texture = this.fog[Math.floor(this.fog.length / 2)]?.texture;
    if (!texture) return;
    context.save();

    if (this.theme === 'village') {
      context.globalCompositeOperation = 'screen';
      const bankWidth = this.width * 2.35, bankHeight = this.height * .92;
      context.globalAlpha = .54 + Math.sin(time * .11) * .04;
      context.drawImage(texture, -this.width * .68 + Math.sin(time * .045) * 42, this.height * .31, bankWidth, bankHeight);
      const rift = context.createLinearGradient(this.width * .28, 0, this.width * .72, this.height);
      rift.addColorStop(0, 'rgba(255,250,219,.34)'); rift.addColorStop(.48, 'rgba(239,247,221,.12)'); rift.addColorStop(1, 'rgba(220,238,226,0)');
      context.fillStyle = rift; context.beginPath(); context.moveTo(this.width * .34, 0); context.lineTo(this.width * .63, 0); context.lineTo(this.width * .88, this.height); context.lineTo(this.width * .12, this.height); context.closePath(); context.fill();
    }

    if (this.theme === 'rain') {
      context.globalCompositeOperation = 'source-over';
      const storm = context.createRadialGradient(this.width * .78, -this.height * .08, 0, this.width * .78, 0, this.width * .95);
      storm.addColorStop(0, 'rgba(17,35,55,.56)'); storm.addColorStop(.48, 'rgba(36,65,83,.28)'); storm.addColorStop(1, 'rgba(48,79,90,0)');
      context.fillStyle = storm; context.fillRect(0, 0, this.width, this.height);
      const flashCycle = time % 11.8;
      const flash = flashCycle > 8.9 && flashCycle < 9.12 ? Math.sin((flashCycle - 8.9) / .22 * Math.PI) : 0;
      if (flash > 0) {
        context.globalCompositeOperation = 'screen'; context.globalAlpha = flash * .72;
        context.drawImage(texture, -this.width * .2, -this.height * .2, this.width * 1.55, this.height * 1.05);
      }
    }

    if (this.theme === 'star') {
      context.globalCompositeOperation = 'screen';
      context.translate(this.width * .55, this.height * .43); context.rotate(-.22 + Math.sin(time * .025) * .035);
      context.globalAlpha = .62;
      context.drawImage(texture, -this.width * 1.05, -this.height * .55, this.width * 2.1, this.height * 1.1);
      const core = context.createRadialGradient(0, 0, 0, 0, 0, this.width * .58);
      core.addColorStop(0, 'rgba(168,173,255,.32)'); core.addColorStop(.28, 'rgba(98,142,220,.17)'); core.addColorStop(1, 'rgba(61,76,171,0)');
      context.fillStyle = core; context.fillRect(-this.width, -this.height, this.width * 2, this.height * 2);
    }

    if (this.theme === 'wind') {
      context.globalCompositeOperation = 'screen';
      context.translate(this.width * .5, this.height * .48); context.rotate(-.08 + Math.sin(time * .07) * .025);
      context.globalAlpha = .56;
      const shift = wrap(time * 24, this.width * 1.4, this.width * .7) - this.width * .7;
      context.drawImage(texture, -this.width * 1.25 + shift, -this.height * .42, this.width * 2.5, this.height * .84);
      context.drawImage(texture, this.width * .7 + shift, -this.height * .28, this.width * 2.2, this.height * .66);
    }

    if (this.theme === 'moon') {
      context.globalCompositeOperation = 'screen';
      const center = this.width * .76 + Math.sin(time * .09) * 9;
      const fall = context.createLinearGradient(center, -this.height * .1, center, this.height);
      fall.addColorStop(0, 'rgba(248,246,218,.48)'); fall.addColorStop(.28, 'rgba(224,238,220,.27)'); fall.addColorStop(.72, 'rgba(167,209,209,.12)'); fall.addColorStop(1, 'rgba(132,185,191,0)');
      context.fillStyle = fall; context.beginPath(); context.moveTo(center - this.width * .16, 0); context.lineTo(center + this.width * .16, 0); context.lineTo(center + this.width * .34, this.height); context.lineTo(center - this.width * .34, this.height); context.closePath(); context.fill();
      context.globalAlpha = .32; context.drawImage(texture, center - this.width * .65, -this.height * .1, this.width * 1.3, this.height * 1.18);
    }

    if (this.theme === 'snow') {
      context.globalCompositeOperation = 'screen';
      const veilWidth = this.width * 1.85, veilHeight = this.height * 1.05;
      context.globalAlpha = .5;
      context.drawImage(texture, -this.width * .38 + Math.sin(time * .055) * 52, -this.height * .18, veilWidth, veilHeight);
      const spectral = context.createLinearGradient(0, 0, this.width, this.height * .68);
      spectral.addColorStop(0, 'rgba(116,185,181,0)'); spectral.addColorStop(.35, 'rgba(132,207,195,.13)'); spectral.addColorStop(.58, 'rgba(137,165,218,.16)'); spectral.addColorStop(.78, 'rgba(182,145,211,.1)'); spectral.addColorStop(1, 'rgba(182,145,211,0)');
      context.fillStyle = spectral; context.fillRect(0, 0, this.width, this.height * .72);
    }

    if (this.theme === 'lantern') {
      context.globalCompositeOperation = 'screen';
      context.translate(this.width * .5, this.height * .56); context.rotate(-.12 + Math.sin(time * .04) * .018);
      context.globalAlpha = .5;
      context.drawImage(texture, -this.width * 1.05, -this.height * .48, this.width * 2.1, this.height * .96);
      const tide = context.createLinearGradient(-this.width, 0, this.width, 0);
      tide.addColorStop(0, 'rgba(237,109,67,0)'); tide.addColorStop(.38, 'rgba(245,151,77,.18)'); tide.addColorStop(.58, 'rgba(255,203,112,.25)'); tide.addColorStop(1, 'rgba(237,109,67,0)');
      context.fillStyle = tide; context.fillRect(-this.width, -this.height * .42, this.width * 2, this.height * .84);
    }
    context.restore();
  }

  drawFog(time: number) {
    const context = this.context;
    context.save(); context.globalCompositeOperation = this.config.fogBlend;
    for (const layer of this.fog) {
      const width = this.width * layer.width;
      const height = this.height * layer.height;
      const travel = time * this.config.drift * layer.speed;
      const x = wrap(layer.x * this.width + travel + this.pointer.x * 13 * layer.depth, this.width, width);
      const y = layer.y * this.height + Math.sin(time * .09 + layer.sway) * 15 * layer.depth + this.pointer.y * 7 * layer.depth;
      context.globalAlpha = layer.alpha * this.config.fogOpacity * (.9 + Math.sin(time * .13 + layer.sway) * .1);
      context.drawImage(layer.texture, x - width / 2, y - height / 2, width, height);
      if (x < width * .2) context.drawImage(layer.texture, x - width / 2 + this.width + width, y - height / 2, width, height);
      if (x > this.width - width * .2) context.drawImage(layer.texture, x - width / 2 - this.width - width, y - height / 2, width, height);
    }
    context.restore();
  }

  drawLightShafts(time: number) {
    const context = this.context;
    context.save(); context.globalCompositeOperation = 'screen';
    context.translate(this.width * .14, this.height * .08); context.rotate(-.16 + Math.sin(time * .06) * .012);
    for (let index = 0; index < 5; index += 1) {
      const gradient = context.createLinearGradient(0, 0, this.width * .85, 0);
      gradient.addColorStop(0, 'rgba(255,246,206,.12)'); gradient.addColorStop(1, 'rgba(255,246,206,0)');
      context.fillStyle = gradient; context.beginPath(); context.moveTo(0, index * 16);
      context.lineTo(this.width * .9, 88 + index * 62); context.lineTo(this.width * .9, 150 + index * 71); context.closePath(); context.fill();
    }
    context.restore();
  }

  drawWaterLight(time: number) {
    const context = this.context;
    context.save(); context.globalCompositeOperation = 'screen';
    const center = this.width * .78;
    for (let index = 0; index < 48; index += 1) {
      const y = this.height * .43 + index * this.height * .013;
      const spread = 26 + index * 6.8;
      const shift = Math.sin(time * .55 + index * .73) * (4 + index * .28);
      const alpha = .085 * (1 - index / 62) * (.7 + Math.sin(time + index) * .22);
      const gradient = context.createRadialGradient(center + shift, y, 0, center + shift, y, spread);
      gradient.addColorStop(0, `rgba(245,241,207,${alpha})`); gradient.addColorStop(1, 'rgba(245,241,207,0)');
      context.fillStyle = gradient; context.fillRect(center - spread * 1.4 + shift, y - 7, spread * 2.8, 14);
    }
    context.restore();
  }

  drawParticles(time: number) {
    const context = this.context;
    if (this.config.particle === 'rain') {
      context.save(); context.lineCap = 'round';
      for (const particle of this.particles) {
        const speed = 330 + particle.speed * 950;
        const y = wrap(particle.y * this.height + time * speed, this.height, 70);
        const x = wrap(particle.x * this.width + time * speed * .16, this.width, 60);
        const length = 12 + particle.size * 7 * particle.depth;
        const gradient = context.createLinearGradient(x, y - length, x + length * .17, y);
        gradient.addColorStop(0, 'rgba(215,237,239,0)'); gradient.addColorStop(1, `rgba(215,237,239,${particle.alpha * .54})`);
        context.strokeStyle = gradient; context.lineWidth = .55 + particle.depth;
        context.beginPath(); context.moveTo(x, y - length); context.lineTo(x + length * .17, y); context.stroke();
      }
      context.restore(); return;
    }

    context.save(); context.globalCompositeOperation = 'screen';
    for (const particle of this.particles) {
      let x = particle.x * this.width, y = particle.y * this.height;
      if (this.config.particle === 'snow') {
        y = wrap(y + time * (24 + particle.speed * 110), this.height, 18);
        x += Math.sin(time * (.24 + particle.speed) + particle.phase) * (18 + particle.depth * 35);
      } else if (this.config.particle === 'embers') {
        y = wrap(y - time * (5 + particle.speed * 13), this.height, 22);
        x += Math.sin(time * .3 + particle.phase) * 20;
      } else if (this.config.particle === 'seeds') {
        x = wrap(x + time * (28 + particle.speed * 54), this.width, 24);
        y += Math.sin(time * .7 + particle.phase) * 24;
      } else {
        y = wrap(y - time * particle.speed * 3, this.height, 12);
        x += Math.sin(time * .18 + particle.phase) * 12;
      }

      const isStar = this.config.particle === 'stars';
      const radius = isStar ? .8 + particle.size * .34 : 1.1 + particle.size * .54;
      const pulse = isStar ? .45 + Math.sin(time * (1 + particle.speed * 2) + particle.phase) * .35 : .7 + Math.sin(time * .6 + particle.phase) * .2;
      const color = this.config.particle === 'embers' ? [255, 190, 103] : this.config.particle === 'snow' ? [244, 249, 246] : isStar ? [218, 232, 255] : [245, 239, 197];
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius * 3.2);
      gradient.addColorStop(0, `rgba(${color.join(',')},${particle.alpha * pulse})`); gradient.addColorStop(1, `rgba(${color.join(',')},0)`);
      context.fillStyle = gradient; context.fillRect(x - radius * 4, y - radius * 4, radius * 8, radius * 8);
    }
    context.restore();
  }

  drawRainRipples(time: number) {
    const context = this.context;
    for (let index = 0; index < 10; index += 1) {
      const cycle = (time * .34 + index * .193) % 1;
      const x = ((index * 83) % 101) / 100 * this.width;
      const y = this.height * (.72 + ((index * 17) % 22) / 100);
      context.strokeStyle = `rgba(198,226,226,${(1 - cycle) * .18})`; context.lineWidth = .8;
      context.beginPath(); context.ellipse(x, y, 10 + cycle * 48, 2.5 + cycle * 10, 0, 0, Math.PI * 2); context.stroke();
    }
  }

  drawMeteors(time: number) {
    const context = this.context;
    context.save(); context.globalCompositeOperation = 'screen';
    for (let index = 0; index < 2; index += 1) {
      const cycle = (time / (10.5 + index * 2.8) + index * .43) % 1;
      if (cycle > .16) continue;
      const progress = cycle / .16;
      const x = this.width * (1.08 - progress * .82), y = this.height * (.11 + index * .22 + progress * .33);
      const tail = Math.min(this.width * .18, 240);
      const gradient = context.createLinearGradient(x + tail, y - tail * .38, x, y);
      gradient.addColorStop(0, 'rgba(151,195,245,0)'); gradient.addColorStop(1, `rgba(234,242,255,${Math.sin(progress * Math.PI) * .65})`);
      context.strokeStyle = gradient; context.lineWidth = 1.1; context.beginPath(); context.moveTo(x + tail, y - tail * .38); context.lineTo(x, y); context.stroke();
    }
    context.restore();
  }
}

export const mountCinematicAtmospheres = () => {
  document.querySelectorAll<HTMLElement>('[data-region-canvas]').forEach((root) => {
    if (mounted.has(root)) return;
    mounted.add(root);
    new CinematicAtmosphere(root);
  });
};
