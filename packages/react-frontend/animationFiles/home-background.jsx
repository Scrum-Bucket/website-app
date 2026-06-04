import { useEffect, useRef } from "react";
import bloodAngelImage from "./animationAssets/blood-angel.png";
import cuttlefishImage from "./animationAssets/cuttlefish.png";
import parrotImage from "./animationAssets/parrot.png";
import spottedImage from "./animationAssets/spotted.png";
import copperbandImage from "./animationAssets/copperband.png";
import swordfishImage from "./animationAssets/swordfish.png";
import clowntriggerImage from "./animationAssets/clown-trigger-unf.png";

const FISH_IMAGE_SOURCES = [
  bloodAngelImage,
  cuttlefishImage,
  parrotImage,
  spottedImage,
  copperbandImage,
  swordfishImage,
  clowntriggerImage,
];

const TAU = Math.PI * 2;

function mulberry32(seed) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledImages(images, rand) {
  return images
    .map((image) => ({ image, sort: rand() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ image }) => image);
}

export default function HomeBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let width = 0;
    let height = 0;
    let sandY = 0;
    let grains = [];
    let particles = [];
    let bubbles = [];
    let caustics = [];
    let fish = [];
    let crabs = [];
    let animationFrameId;
    let fishImages = [];
    let fishImageQueue = [];
    let shuffleRand = mulberry32(4217);
    let lastFrameTime = 0;
    let isActive = true;

    function pixelRect(x, y, w, h) {
      ctx.fillRect(
        Math.round(x),
        Math.round(y),
        Math.max(1, Math.round(w)),
        Math.max(1, Math.round(h))
      );
    }

    function floorLineY(x, time) {
      return Math.round(
        sandY + Math.sin(x * 0.02 + time * 0.06) * 3 + Math.sin(x * 0.045 + 2.1) * 2
      );
    }

    function buildScene() {
      const rand = mulberry32(8273);
      const area = Math.max(width * height, 1);

      grains = Array.from({ length: Math.max(180, Math.floor(area / 4200)) }, () => {
        const p = rand();
        return {
          x: rand() * width,
          y: sandY + Math.pow(p, 1.75) * (height - sandY),
          r: 0.6 + rand() * 1.8,
          a: 0.05 + rand() * 0.18,
        };
      });

      particles = Array.from({ length: Math.max(140, Math.floor(area / 9000)) }, () => ({
        x: rand() * width,
        y: rand() * height,
        r: 0.6 + rand() * 1.7,
        speed: 3 + rand() * 15,
        wobble: 5 + rand() * 18,
        phase: rand() * TAU,
        a: 0.08 + rand() * 0.22,
      }));

      const bubbleColumns = [0.13, 0.55, 0.92];
      bubbles = Array.from({ length: 90 }, () => {
        const column = bubbleColumns[Math.floor(rand() * bubbleColumns.length)];
        return {
          baseX: width * (column + (rand() - 0.5) * 0.055),
          y: rand() * height,
          r: 1 + rand() * 3.5,
          speed: 18 + rand() * 42,
          wobble: 7 + rand() * 16,
          phase: rand() * TAU,
          a: 0.16 + rand() * 0.35,
        };
      });

      caustics = Array.from({ length: 30 }, () => ({
        x: rand() * width,
        p: rand(),
        len: 44 + rand() * 140,
        amp: 2 + rand() * 6,
        phase: rand() * TAU,
        a: 0.04 + rand() * 0.1,
      }));
    }

    function loadFishImages() {
      FISH_IMAGE_SOURCES.forEach((src) => {
        const image = new Image();
        image.decoding = "async";
        image.onload = () => {
          if (!isActive) return;

          fishImages = [...fishImages, image];
          populateCreatures();
        };
        image.src = src;
      });
    }

    function nextFishImage() {
      if (!fishImages.length) return null;
      if (!fishImageQueue.length) {
        fishImageQueue = shuffledImages(fishImages, shuffleRand);
      }

      return fishImageQueue.pop();
    }

    function createFish() {
      const image = nextFishImage();
      const scale = 0.13 + Math.random() * 0.19;
      const drawWidth = 1000 * scale;
      const drawHeight = 1000 * scale;
      const swimTop = Math.max(42, height * 0.12);
      const swimBottom = Math.max(swimTop + 1, sandY - drawHeight * 0.6);

      return {
        x: Math.random() * width,
        y: swimTop + Math.random() * Math.max(swimBottom - swimTop, 1),
        speed: 0.35 + Math.random() * 1.15,
        image,
        width: drawWidth,
        height: drawHeight,
        direction: Math.random() > 0.5 ? 1 : -1,
        bobOffset: Math.random() * TAU,
      };
    }

    function createCrab(index = 0) {
      const emergesFromLeft = index % 2 === 0;
      const reefScale = Math.min(width, height) / 600;
      const leftRockEdge = 120 * reefScale;
      const rightRockEdge = width - 148 * reefScale;
      const size = 16 + Math.random() * 10;
      const direction = emergesFromLeft ? 1 : -1;
      const hiddenStart = emergesFromLeft
        ? leftRockEdge - Math.random() * 58
        : rightRockEdge + Math.random() * 58;

      return {
        x: hiddenStart,
        yOffset: Math.random() * 12,
        speed: 0.22 + Math.random() * 0.42,
        size,
        direction,
        legOffset: Math.random() * TAU,
      };
    }

    function populateCreatures() {
      const fishCount = fishImages.length ? Math.min(8, fishImages.length) : 8;

      fishImageQueue = shuffledImages(fishImages, shuffleRand);
      fish = Array.from({ length: fishCount }, createFish);
      crabs = Array.from({ length: 6 }, (_, index) => createCrab(index));
    }

    function drawBackground(time) {
      const g = ctx.createLinearGradient(0, 0, 0, height);
      g.addColorStop(0, "#22c4d0");
      g.addColorStop(0.18, "#0b8fb0");
      g.addColorStop(0.52, "#035c79");
      g.addColorStop(0.82, "#023b59");
      g.addColorStop(1, "#022f48");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);

      const haze = ctx.createLinearGradient(0, height * 0.22, 0, height);
      haze.addColorStop(0, "rgba(0, 38, 67, 0.00)");
      haze.addColorStop(0.72, "rgba(0, 21, 43, 0.28)");
      haze.addColorStop(1, "rgba(0, 11, 27, 0.44)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, width, height);

      drawSurfaceRipples(time);
    }

    function drawSurfaceRipples(time) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";

      const surfaceGlow = ctx.createRadialGradient(
        width * 0.5,
        0,
        0,
        width * 0.5,
        0,
        height * 0.46
      );
      surfaceGlow.addColorStop(0, "rgba(225, 255, 255, 0.62)");
      surfaceGlow.addColorStop(0.28, "rgba(125, 232, 244, 0.25)");
      surfaceGlow.addColorStop(1, "rgba(125, 232, 244, 0.00)");
      ctx.fillStyle = surfaceGlow;
      ctx.fillRect(0, 0, width, height * 0.62);

      for (let row = 0; row < 18; row += 1) {
        const y = 5 + row * 5.4;
        const amp = 2.2 + row * 0.08;
        ctx.beginPath();
        for (let x = -16; x <= width + 16; x += 10) {
          const yy =
            y +
            Math.sin(x * 0.02 + time * 1.6 + row * 0.55) * amp +
            Math.sin(x * 0.047 - time * 1.15 + row) * 0.9;
          if (x === -16) ctx.moveTo(x, yy);
          else ctx.lineTo(x, yy);
        }
        ctx.strokeStyle = `rgba(206, 255, 255, ${0.05 + row * 0.006})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      ctx.restore();
    }

    function drawSunRays(time) {
      const rays = [
        { x: 0.36, top: 0.012, bottom: 0.12, a: 0.075, phase: 0.3, drift: 0.012 },
        { x: 0.43, top: 0.018, bottom: 0.15, a: 0.105, phase: 1.8, drift: 0.014 },
        { x: 0.5, top: 0.025, bottom: 0.19, a: 0.145, phase: 0, drift: 0.01 },
        { x: 0.58, top: 0.018, bottom: 0.15, a: 0.1, phase: 2.7, drift: 0.013 },
        { x: 0.66, top: 0.012, bottom: 0.11, a: 0.07, phase: 4.1, drift: 0.011 },
      ];

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.imageSmoothingEnabled = false;

      for (const ray of rays) {
        const shimmer = 0.84 + Math.sin(time * 0.7 + ray.phase) * 0.16;
        const topX = width * (ray.x + Math.sin(time * 0.22 + ray.phase) * ray.drift);
        const bottomX = topX + width * Math.sin(time * 0.14 + ray.phase * 0.7) * 0.044;
        const topW = width * ray.top;
        const bottomW = width * ray.bottom;
        const limitY = Math.floor(sandY + height * 0.07);

        for (let y = 0; y <= limitY; y += 2) {
          const p = y / Math.max(1, limitY);
          const center =
            topX + (bottomX - topX) * p + Math.sin(time * 1.3 + y * 0.12 + ray.phase) * 1.2;
          let halfW = topW + (bottomW - topW) * p;
          halfW *= (y + Math.floor(ray.phase * 9)) % 12 === 0 ? 0.62 : 1;
          const alpha = ray.a * Math.pow(1 - p, 1.26) * shimmer;
          if (alpha <= 0.004) continue;

          ctx.fillStyle = `rgba(194, 255, 255, ${alpha})`;
          pixelRect(center - halfW, y, halfW * 2, 2);
        }
      }

      for (let i = 0; i < 18; i += 1) {
        const phase = i * 0.57;
        const x0 =
          width * 0.5 + (i - 9) * width * 0.02 + Math.sin(time * 0.35 + phase) * width * 0.018;
        const x1 = x0 + Math.sin(time * 0.18 + phase) * width * 0.05;
        const limitY = Math.floor(sandY + height * 0.05);
        ctx.fillStyle = `rgba(220, 255, 255, ${0.035 + (i % 3) * 0.014})`;
        for (let y = Math.floor(height * 0.03); y < limitY; y += 5) {
          const p = y / Math.max(1, limitY);
          const x = x0 + (x1 - x0) * p;
          pixelRect(x, y, 1 + (i % 2), 3);
        }
      }

      ctx.restore();
    }

    function drawParticles(time) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";

      for (const p of particles) {
        let y = p.y - ((time * p.speed) % (height + 40));
        if (y < -20) y += height + 40;
        const x = p.x + Math.sin(time * 0.55 + p.phase + y * 0.013) * p.wobble;
        ctx.fillStyle = `rgba(190, 255, 255, ${p.a})`;
        pixelRect(x, y, p.r, p.r);
      }

      ctx.restore();
    }

    function drawBubbleColumns(time) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";

      for (const b of bubbles) {
        let y = b.y - ((time * b.speed) % (height + 80));
        if (y < -40) y += height + 80;
        const x = b.baseX + Math.sin(time * 1.25 + b.phase + y * 0.015) * b.wobble;
        const r = b.r * (1 + Math.sin(time * 2 + b.phase) * 0.1);
        const px = Math.round(x);
        const py = Math.round(y);
        const pr = Math.max(1, Math.round(r));

        ctx.fillStyle = `rgba(209, 255, 255, ${b.a})`;
        pixelRect(px - pr, py, 1, 1);
        pixelRect(px + pr, py, 1, 1);
        pixelRect(px, py - pr, 1, 1);
        pixelRect(px, py + pr, 1, 1);
        if (pr > 1) {
          pixelRect(px - pr + 1, py - pr + 1, 1, 1);
          pixelRect(px + pr - 1, py - pr + 1, 1, 1);
          pixelRect(px - pr + 1, py + pr - 1, 1, 1);
          pixelRect(px + pr - 1, py + pr - 1, 1, 1);
        }
        ctx.fillStyle = `rgba(240, 255, 255, ${b.a * 0.42})`;
        pixelRect(
          px - Math.max(1, Math.floor(pr * 0.35)),
          py - Math.max(1, Math.floor(pr * 0.35)),
          1,
          1
        );
      }

      ctx.restore();
    }

    function drawSand(time) {
      ctx.save();

      const sand = ctx.createLinearGradient(0, sandY, 0, height);
      sand.addColorStop(0, "rgba(48, 132, 148, 0.78)");
      sand.addColorStop(0.33, "rgba(84, 151, 149, 0.88)");
      sand.addColorStop(0.72, "rgba(155, 166, 139, 0.94)");
      sand.addColorStop(1, "rgba(201, 184, 132, 1.00)");

      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, floorLineY(0, time));
      for (let x = 0; x <= width + 12; x += 12) {
        ctx.lineTo(x, floorLineY(x, time));
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = sand;
      ctx.fill();

      const wash = ctx.createLinearGradient(0, sandY, 0, height);
      wash.addColorStop(0, "rgba(0, 120, 153, 0.30)");
      wash.addColorStop(1, "rgba(0, 44, 71, 0.12)");
      ctx.fillStyle = wash;
      ctx.fillRect(0, sandY - 8, width, height - sandY + 8);

      for (let i = 0; i < 34; i += 1) {
        const p = i / 33;
        const y = sandY + Math.pow(p, 1.75) * (height - sandY + 20);
        const alpha = 0.025 + p * 0.095;
        const amp = 1.8 + p * 6;
        ctx.beginPath();
        for (let x = -20; x <= width + 20; x += 13) {
          const yy =
            y +
            Math.sin(x * 0.017 + p * 12 + time * 0.22) * amp +
            Math.sin(x * 0.006 - time * 0.16) * amp * 0.45;
          if (x === -20) ctx.moveTo(x, yy);
          else ctx.lineTo(x, yy);
        }
        ctx.strokeStyle = `rgba(226, 241, 217, ${alpha})`;
        ctx.lineWidth = 0.6 + p * 0.8;
        ctx.stroke();
      }

      for (const g of grains) {
        ctx.fillStyle = `rgba(21, 67, 75, ${g.a})`;
        pixelRect(g.x, g.y, g.r, g.r);
      }

      ctx.restore();
    }

    function drawSandCaustics(time) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.imageSmoothingEnabled = false;

      for (const c of caustics) {
        const p = c.p;
        const y = sandY + Math.pow(p, 1.65) * (height - sandY);
        const x = (c.x + Math.sin(time * 0.33 + c.phase) * 34 + width) % width;

        ctx.beginPath();
        for (let i = 0; i <= 10; i += 1) {
          const q = i / 10;
          const xx = x + (q - 0.5) * c.len;
          const yy = y + Math.sin(q * TAU * 1.2 + time * 1.6 + c.phase) * c.amp;
          if (i === 0) ctx.moveTo(xx, yy);
          else ctx.lineTo(xx, yy);
        }
        ctx.strokeStyle = `rgba(190, 255, 245, ${c.a * (0.45 + p)})`;
        ctx.lineWidth = 0.8 + p * 1.1;
        ctx.stroke();
      }

      ctx.restore();
    }

    function drawFish(f, time) {
      const bob = Math.sin(time * 3 + f.bobOffset) * 2;

      ctx.save();
      ctx.translate(f.x, f.y + bob);

      if (f.direction === 1) {
        ctx.scale(-1, 1);
      }

      if (f.image) {
        ctx.drawImage(f.image, -f.width / 2, -f.height / 2, f.width, f.height);
      } else {
        ctx.fillStyle = "#f7b244";
        ctx.fillRect(-f.width / 2, -f.height / 6, f.width * 0.7, f.height / 3);
        ctx.fillRect(f.width * 0.12, -f.height / 4, f.width * 0.25, f.height / 2);
        ctx.fillStyle = "#083047";
        ctx.fillRect(-f.width * 0.32, -2, 3, 3);
      }

      ctx.restore();
    }

    function drawCrab(c, time) {
      const legWiggle = Math.sin(time * 10 + c.legOffset) * 1.5;
      const y = floorLineY(c.x, time) + 10 + c.yOffset;
      const s = c.size * 0.5;

      ctx.save();
      ctx.translate(c.x, y);

      if (c.direction === -1) {
        ctx.scale(-1, 1);
      }

      ctx.fillStyle = "#d94b3d";
      ctx.fillRect(-s, -s / 2, s * 2, s);
      ctx.fillRect(-s * 1.6, -s * 0.7, s * 0.5, s * 0.3);
      ctx.fillRect(s * 1.1, -s * 0.7, s * 0.5, s * 0.3);
      ctx.fillRect(-s * 1.2, 0, s * 0.4, 2);
      ctx.fillRect(-s * 1.2, 4 + legWiggle, s * 0.4, 2);
      ctx.fillRect(s * 0.8, 0, s * 0.4, 2);
      ctx.fillRect(s * 0.8, 4 - legWiggle, s * 0.4, 2);

      ctx.fillStyle = "#111";
      ctx.fillRect(-s * 0.4, -s * 0.7, 2, 2);
      ctx.fillRect(s * 0.2, -s * 0.7, 2, 2);

      ctx.restore();
    }

    function updateCreatures(deltaScale) {
      for (const f of fish) {
        f.x += f.speed * f.direction * deltaScale;

        if (f.direction === 1 && f.x > width + f.width) {
          f.x = -f.width;
          f.y = height * 0.12 + Math.random() * Math.max(sandY - f.height * 0.6 - height * 0.12, 1);
        } else if (f.direction === -1 && f.x < -f.width) {
          f.x = width + f.width;
          f.y = height * 0.12 + Math.random() * Math.max(sandY - f.height * 0.6 - height * 0.12, 1);
        }
      }

      for (const c of crabs) {
        c.x += c.speed * c.direction * deltaScale;

        if (c.direction === 1 && c.x > width + 35) {
          Object.assign(c, createCrab(0));
        } else if (c.direction === -1 && c.x < -35) {
          Object.assign(c, createCrab(1));
        }
      }
    }

    function drawMound(x, y, w, h, color, highlight) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x, y - h * 0.5, w * 0.5, h * 0.5, 0, 0, TAU);
      ctx.fill();

      const grad = ctx.createRadialGradient(
        x - w * 0.18,
        y - h * 0.68,
        2,
        x,
        y - h * 0.5,
        w * 0.55
      );
      grad.addColorStop(0, highlight || "rgba(115, 168, 145, 0.55)");
      grad.addColorStop(1, "rgba(0, 21, 26, 0.12)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(x, y - h * 0.5, w * 0.5, h * 0.5, 0, 0, TAU);
      ctx.fill();
    }

    function drawBranchCoral(x, y, len, angle, depth, color, time, phase, lineWidth) {
      if (depth <= 0 || len < 3) return;

      const sway = Math.sin(time * 1.08 + phase + depth * 0.64) * 0.045 * depth;
      const a = angle + sway;
      const x2 = x + Math.cos(a) * len;
      const y2 = y + Math.sin(a) * len;

      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.1, lineWidth * (depth / 5));
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      if (depth === 1) {
        ctx.fillStyle = "rgba(255, 230, 205, 0.75)";
        ctx.beginPath();
        ctx.arc(x2, y2, 1.6, 0, TAU);
        ctx.fill();
        return;
      }

      drawBranchCoral(x2, y2, len * 0.72, a - 0.52, depth - 1, color, time, phase + 0.9, lineWidth);
      drawBranchCoral(x2, y2, len * 0.67, a + 0.48, depth - 1, color, time, phase + 2, lineWidth);
      if (depth % 2 === 0) {
        drawBranchCoral(
          x2,
          y2,
          len * 0.5,
          a + 0.08,
          depth - 1,
          color,
          time,
          phase + 3.1,
          lineWidth
        );
      }
    }

    function drawFanCoral(x, y, r, color, time, phase) {
      ctx.save();
      ctx.lineCap = "round";
      ctx.strokeStyle = color;

      for (let i = -10; i <= 10; i += 1) {
        const n = i / 10;
        const angle = -Math.PI / 2 + n * 0.95;
        const sway = Math.sin(time * 0.82 + phase + i * 0.21) * 0.075;
        const endR = r * (0.78 + 0.22 * Math.cos(n * Math.PI * 0.5));
        const ex = x + Math.cos(angle + sway) * endR;
        const ey = y + Math.sin(angle + sway) * endR;
        const cx = x + Math.cos(angle) * endR * 0.45 + Math.sin(time + i) * 4;
        const cy = y - endR * 0.55;

        ctx.lineWidth = 1 + (1 - Math.abs(n)) * 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(cx, cy, ex, ey);
        ctx.stroke();
      }

      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.72;
      ctx.beginPath();
      for (let i = -14; i <= 14; i += 1) {
        const n = i / 14;
        const angle = -Math.PI / 2 + n * 0.98 + Math.sin(time * 0.75 + phase) * 0.035;
        const endR = r * (0.83 + 0.17 * Math.cos(n * Math.PI * 0.5));
        const ex = x + Math.cos(angle) * endR;
        const ey = y + Math.sin(angle) * endR;
        if (i === -14) ctx.moveTo(ex, ey);
        else ctx.lineTo(ex, ey);
      }
      ctx.stroke();
      ctx.restore();
    }

    function drawSeaweed(x, y, h, count, color, time, phase) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineCap = "round";

      for (let i = 0; i < count; i += 1) {
        const baseX = x + (i - count / 2) * 5.8;
        const localH = h * (0.72 + (i % 5) * 0.07);
        const sway = Math.sin(time * 0.92 + phase + i * 0.55) * (8 + localH * 0.08);
        ctx.lineWidth = 1.5 + (i % 3) * 0.45;
        ctx.beginPath();
        ctx.moveTo(baseX, y);
        ctx.bezierCurveTo(
          baseX + sway * 0.22,
          y - localH * 0.33,
          baseX + sway * 0.7,
          y - localH * 0.69,
          baseX + sway,
          y - localH
        );
        ctx.stroke();
      }

      ctx.restore();
    }

    function drawTubeCoral(x, y, count, color, time, phase) {
      const rand = mulberry32(Math.floor(x * 17 + count * 89 + phase * 100));
      ctx.save();

      for (let i = 0; i < count; i += 1) {
        const w = 7 + rand() * 8;
        const h = 22 + rand() * 42;
        const bx = x + (i - count / 2) * 10 + rand() * 6;
        const sway = Math.sin(time * 0.68 + phase + i) * 2.4;
        const topX = bx + sway;
        const topY = y - h;
        const body = ctx.createLinearGradient(bx - w, y, bx + w, topY);

        body.addColorStop(0, color);
        body.addColorStop(1, "rgba(234, 226, 174, 0.88)");
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.moveTo(bx - w * 0.45, y);
        ctx.bezierCurveTo(
          bx - w * 0.7,
          y - h * 0.38,
          topX - w * 0.55,
          topY + h * 0.22,
          topX - w * 0.35,
          topY
        );
        ctx.bezierCurveTo(
          topX,
          topY - w * 0.4,
          topX + w * 0.35,
          topY - w * 0.1,
          topX + w * 0.36,
          topY
        );
        ctx.bezierCurveTo(
          topX + w * 0.55,
          topY + h * 0.22,
          bx + w * 0.65,
          y - h * 0.38,
          bx + w * 0.44,
          y
        );
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "rgba(55, 83, 84, 0.55)";
        ctx.beginPath();
        ctx.ellipse(topX, topY, w * 0.36, w * 0.22, 0, 0, TAU);
        ctx.fill();
      }

      ctx.restore();
    }

    function drawPolypMound(x, y, w, h, baseColor, dotColor) {
      drawMound(x, y, w, h, baseColor, "rgba(178, 205, 166, 0.34)");

      const rand = mulberry32(Math.floor(x * 31 + y * 17 + w));
      ctx.fillStyle = dotColor;
      for (let i = 0; i < 42; i += 1) {
        const a = rand() * TAU;
        const rr = Math.sqrt(rand());
        const px = x + Math.cos(a) * rr * w * 0.42;
        const py = y - h * 0.52 + Math.sin(a) * rr * h * 0.38;
        ctx.beginPath();
        ctx.arc(px, py, 1 + rand() * 1.6, 0, TAU);
        ctx.fill();
      }
    }

    function drawLeftReef(time, s) {
      ctx.save();
      ctx.translate(0, height - 12 * s);
      ctx.scale(s, s);

      const shadow = ctx.createRadialGradient(82, -5, 10, 82, -5, 125);
      shadow.addColorStop(0, "rgba(0, 18, 26, 0.45)");
      shadow.addColorStop(1, "rgba(0, 18, 26, 0.00)");
      ctx.fillStyle = shadow;
      ctx.beginPath();
      ctx.ellipse(92, -6, 145, 30, 0, 0, TAU);
      ctx.fill();

      drawMound(64, -4, 150, 58, "rgba(28, 87, 91, 0.97)", "rgba(111, 154, 137, 0.42)");
      drawMound(134, -8, 118, 46, "rgba(45, 100, 87, 0.95)", "rgba(139, 172, 126, 0.40)");
      drawMound(13, -2, 76, 34, "rgba(56, 74, 76, 0.95)", "rgba(121, 134, 116, 0.22)");
      drawSeaweed(38, -8, 72, 9, "rgba(99, 178, 91, 0.72)", time, 0.4);
      drawSeaweed(5, -5, 45, 7, "rgba(135, 188, 81, 0.62)", time, 1.7);
      drawFanCoral(128, -22, 62, "rgba(236, 127, 172, 0.64)", time, 0.8);
      drawBranchCoral(77, -25, 38, -1.62, 5, "rgba(239, 171, 133, 0.88)", time, 1.2, 6.8);
      drawBranchCoral(23, -22, 26, -1.22, 4, "rgba(247, 214, 142, 0.82)", time, 3.3, 5);
      drawTubeCoral(173, -15, 7, "rgba(132, 177, 142, 0.92)", time, 0.2);
      drawPolypMound(96, -7, 66, 35, "rgba(91, 128, 105, 0.96)", "rgba(246, 213, 139, 0.56)");
      drawPolypMound(147, -10, 58, 30, "rgba(91, 105, 125, 0.92)", "rgba(244, 180, 203, 0.56)");

      ctx.restore();
    }

    function drawRightReef(time, s) {
      ctx.save();
      ctx.translate(width - 250 * s, height - 10 * s);
      ctx.scale(s, s);

      const shadow = ctx.createRadialGradient(138, -5, 10, 138, -5, 140);
      shadow.addColorStop(0, "rgba(0, 18, 26, 0.47)");
      shadow.addColorStop(1, "rgba(0, 18, 26, 0.00)");
      ctx.fillStyle = shadow;
      ctx.beginPath();
      ctx.ellipse(136, -6, 155, 30, 0, 0, TAU);
      ctx.fill();

      drawMound(128, -7, 182, 62, "rgba(34, 94, 82, 0.98)", "rgba(116, 169, 126, 0.38)");
      drawMound(210, -2, 105, 44, "rgba(39, 78, 87, 0.98)", "rgba(103, 149, 143, 0.30)");
      drawMound(55, -3, 115, 42, "rgba(63, 94, 95, 0.94)", "rgba(136, 147, 119, 0.26)");
      drawSeaweed(197, -7, 70, 8, "rgba(104, 183, 91, 0.70)", time, 2.2);
      drawSeaweed(76, -5, 52, 7, "rgba(153, 193, 84, 0.64)", time, 0.9);
      drawBranchCoral(126, -24, 44, -1.55, 5, "rgba(224, 224, 198, 0.86)", time, 2.6, 7);
      drawBranchCoral(181, -20, 32, -1.7, 4, "rgba(243, 151, 121, 0.82)", time, 0.5, 5.8);
      drawFanCoral(63, -19, 46, "rgba(182, 144, 211, 0.54)", time, 2.8);
      drawTubeCoral(151, -12, 8, "rgba(121, 166, 153, 0.92)", time, 1.4);
      drawPolypMound(105, -8, 72, 34, "rgba(102, 126, 96, 0.95)", "rgba(255, 225, 151, 0.52)");
      drawPolypMound(197, -8, 76, 34, "rgba(79, 119, 122, 0.94)", "rgba(236, 204, 184, 0.50)");

      ctx.restore();
    }

    function drawReefs(time) {
      const s = Math.max(0.65, Math.min(width, height) / 600);
      drawLeftReef(time, s);
      drawRightReef(time, s);
    }

    function drawVignette() {
      ctx.save();
      const v = ctx.createRadialGradient(
        width * 0.5,
        height * 0.4,
        Math.min(width, height) * 0.14,
        width * 0.5,
        height * 0.46,
        Math.max(width, height) * 0.78
      );
      v.addColorStop(0, "rgba(0, 0, 0, 0.00)");
      v.addColorStop(0.62, "rgba(0, 18, 34, 0.10)");
      v.addColorStop(1, "rgba(0, 5, 19, 0.50)");
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      sandY = Math.floor(height * 0.72);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;

      buildScene();
      populateCreatures();
    }

    function draw(frameTime = 0) {
      const time = frameTime * 0.001;
      const deltaScale = lastFrameTime ? Math.min((frameTime - lastFrameTime) / 16.67, 3) : 1;
      lastFrameTime = frameTime;

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, width, height);

      drawBackground(time);
      drawSunRays(time);
      drawParticles(time);
      updateCreatures(deltaScale);
      fish.forEach((f) => drawFish(f, time));
      drawSand(time);
      drawSandCaustics(time);
      crabs.forEach((c) => drawCrab(c, time));
      drawReefs(time);
      drawBubbleColumns(time);
      drawVignette();

      animationFrameId = requestAnimationFrame(draw);
    }

    window.addEventListener("resize", resize, { passive: true });

    resize();
    animationFrameId = requestAnimationFrame(draw);
    loadFishImages();

    return () => {
      isActive = false;
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="bg-canvas" />;
}
