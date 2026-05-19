import { useEffect, useRef } from "react";

// Pixel art beach rave scene — renders at 320×180 then scales to fill parent.
// Use as a background by placing it as the first child of a position:relative container.

const VIEW = { width: 320, height: 180, horizon: 60, shore: 126 };

const LIGHTS = [
  { x: 56,  y: 88,  color: "#ff2fd6", phase: 0.0, size: 16 },
  { x: 104, y: 99,  color: "#16f7ff", phase: 1.2, size: 18 },
  { x: 152, y: 81,  color: "#c6ff2f", phase: 2.3, size: 15 },
  { x: 202, y: 102, color: "#8a4dff", phase: 3.4, size: 19 },
  { x: 248, y: 88,  color: "#ff7b2f", phase: 4.5, size: 16 },
  { x: 288, y: 108, color: "#27ff78", phase: 5.4, size: 15 },
];

const CLOUDS = [
  { x: 30,  y: 22, w: 50, speed: 0.004 },
  { x: 162, y: 17, w: 62, speed: 0.003 },
  { x: 252, y: 32, w: 44, speed: 0.005 },
];

export default function GameBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    function r(x, y, w, h, color) {
      ctx.fillStyle = color;
      ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
    }

    function resize() {
      // Always render at the fixed pixel-art resolution; CSS stretches it.
      canvas.width = VIEW.width;
      canvas.height = VIEW.height;
      ctx.imageSmoothingEnabled = false;
    }

    function drawSky(time) {
      r(0, 0,  VIEW.width, 22, "#6ecbff");
      r(0, 22, VIEW.width, 24, "#8edcff");
      r(0, 46, VIEW.width, 18, "#b9ecff");
      // Sun
      r(252, 15, 18, 18, "#ffe45e");
      r(248, 19, 26, 10, "#fff08d");
      r(256, 11, 10, 26, "#fff08d");
      r(257, 20,  8,  8, "#fff8bc");
      // Clouds
      for (const cloud of CLOUDS) {
        const drift = (cloud.x + time * cloud.speed) % (VIEW.width + 70) - 70;
        r(drift,          cloud.y + 7, cloud.w,            7,  "#ffffff");
        r(drift + 8,      cloud.y + 2, cloud.w * 0.42,     8,  "#ffffff");
        r(drift + 25,     cloud.y,     cloud.w * 0.34,     10, "#f2fbff");
        r(drift + 42,     cloud.y + 4, cloud.w * 0.32,     8,  "#ffffff");
        r(drift + 3,      cloud.y + 14, cloud.w * 0.7,     2,  "#d8f3ff");
      }
    }

    function drawOceanBase(time) {
      r(0, VIEW.horizon,      VIEW.width, VIEW.shore - VIEW.horizon, "#1d98c2");
      r(0, VIEW.horizon + 10, VIEW.width, 23, "#23acd1");
      r(0, VIEW.horizon + 32, VIEW.width, 22, "#128ab3");
      r(0, VIEW.horizon + 53, VIEW.width, 17, "#0f719d");

      const incoming = (Math.sin(time * 0.0024) + 1) / 2;
      const pullback = 1 - incoming;
      const wavePush = incoming * 18 - pullback * 7;

      for (let row = 0; row < 15; row++) {
        const depth = row / 14;
        const perspectivePush = wavePush * depth * depth;
        const y = VIEW.horizon + 4 + row * 4.8 + perspectivePush;
        const speed = 0.01 + row * 0.002;
        const horizontal = Math.sin(time * speed + row * 0.9) * (7 + row * 0.65);
        const color = row % 3 === 0 ? "#d6ffff" : row % 3 === 1 ? "#6fddeb" : "#168caf";
        const segmentWidth = 10 + row * 1.35 + incoming * row * 0.4;
        const gap = 23 + row;
        for (let x = -60; x < VIEW.width + 60; x += gap) {
          const wobble = Math.floor(Math.sin(time * 0.003 + row + x * 0.04) * 3);
          r(x + horizontal + wobble, y, segmentWidth, 2, color);
        }
      }
    }

    function drawWaveWash(time) {
      const incoming = (Math.sin(time * 0.0024) + 1) / 2;
      const pullback = 1 - incoming;
      const wavePush = incoming * 18 - pullback * 7;
      const foamY = VIEW.shore - 10 + wavePush;
      const foamThickness = 2 + incoming * 4;

      if (incoming > 0.25) {
        ctx.save();
        ctx.globalAlpha = (incoming - 0.25) * 0.48;
        r(0, foamY + 3, VIEW.width, 24 + incoming * 15, "#87e5ef");
        ctx.restore();
      }

      if (incoming > 0.38) {
        ctx.save();
        ctx.globalAlpha = (incoming - 0.38) * 0.75;
        for (let x = -20; x < VIEW.width + 20; x += 18) {
          const run = Math.sin(time * 0.004 + x * 0.11) * 7;
          r(x + run,     foamY + 14 + incoming * 10, 12 + incoming * 10, 1, "#d8ffff");
          r(x + run + 5, foamY + 21 + incoming * 13, 8  + incoming * 8,  1, "#ffffff");
        }
        ctx.restore();
      }

      r(0, foamY,                  VIEW.width, foamThickness, "#f2ffff");
      r(0, foamY + foamThickness,  VIEW.width, 2,             "#bff7ff");

      for (let x = -34; x < VIEW.width + 34; x += 27) {
        const roll = Math.sin(time * 0.004 + x * 0.08) * 6;
        r(x + roll,     foamY + 6  + incoming * 5, 19 + incoming * 5, 2, "#d8ffff");
        r(x + roll + 8, foamY + 11 + incoming * 7, 11,                1, "#ffffff");
      }
    }

    function drawRaveLights(time) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const light of LIGHTS) {
        const rawPulse = (Math.sin(time * 0.0065 + light.phase) + 1) / 2;
        const pulse = rawPulse < 0.42 ? 0 : Math.pow((rawPulse - 0.42) / 0.58, 1.7);
        if (pulse <= 0.01) continue;

        const waveDrift = Math.sin(time * 0.0014 + light.phase) * 7;
        const x = light.x + waveDrift;
        const y = light.y + Math.sin(time * 0.002 + light.phase) * 4;
        const size = light.size + pulse * 18;

        ctx.globalAlpha = 0.06 + pulse * 0.18;
        r(x - size,        y - size * 0.48, size * 2,    size * 0.95, light.color);
        ctx.globalAlpha = 0.12 + pulse * 0.28;
        r(x - size * 0.58, y - size * 0.28, size * 1.16, size * 0.56, light.color);
        ctx.globalAlpha = 0.45 + pulse * 0.45;
        r(x - 4, y - 4, 8, 8, light.color);
        r(x - 1, y - 10, 2, 20, "#ffffff");
        r(x - 10, y - 1, 20, 2, "#ffffff");

        for (let i = 0; i < 9; i++) {
          const ry = y + 8 + i * 5;
          const rw = Math.max(3, size * (1 - i * 0.095));
          const jitter = Math.sin(time * 0.006 + light.phase + i) * 8;
          ctx.globalAlpha = Math.max(0.02, 0.32 * pulse - i * 0.026);
          r(x - rw / 2 + jitter, ry, rw, 2, light.color);
        }
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    function drawBeach(time) {
      r(0, VIEW.shore,      VIEW.width, VIEW.height - VIEW.shore, "#e1b96e");
      r(0, VIEW.shore + 8,  VIEW.width, 14, "#f0cb82");
      r(0, VIEW.shore + 24, VIEW.width, 30, "#c88d48");

      const incoming = (Math.sin(time * 0.0024) + 1) / 2;
      const shimmerShift = incoming * 15 - 4;
      for (let x = 0; x < VIEW.width; x += 18) {
        const y = VIEW.shore + 3 + shimmerShift + Math.sin(time * 0.003 + x * 0.2) * 2;
        r(x, y, 10, 1, "#ffe09b");
      }

      for (let i = 0; i < 110; i++) {
        const x = (i * 29) % VIEW.width;
        const y = VIEW.shore + 10 + ((i * 17) % (VIEW.height - VIEW.shore - 10));
        const color = i % 3 === 0 ? "#986633" : i % 3 === 1 ? "#f4d18a" : "#b97c3f";
        r(x, y, 1, 1, color);
      }
    }

    function drawPalm(x, baseY, scale, flip, time) {
      const dir = flip ? -1 : 1;
      const sway = Math.sin(time * 0.0012 + x * 0.02) * 2 * scale;
      const trunkW = 5 * scale;
      const trunkH = 47 * scale;
      const trunkX = x;
      const trunkY = baseY - trunkH;
      const crownX = trunkX + dir * 2 * scale + sway;
      const crownY = trunkY;

      r(trunkX,                  trunkY, trunkW,          trunkH, "#3a211b");
      r(trunkX + trunkW * 0.75,  trunkY, trunkW * 0.45,   trunkH, "#22130f");

      ctx.fillStyle = "#07100d";
      const leaves = [
        [0, 0, -25, -8], [1, -2, -15, -18], [3, -3, 5, -20],
        [4, -1, 20, -13], [2, 1, 27, -1],   [-1, 1, -18, 8],
      ];
      for (const [lx, ly, dx, dy] of leaves) {
        const startX = crownX + lx * scale;
        const startY = crownY + ly * scale;
        const endX = startX + dx * scale * dir;
        const endY = startY + dy * scale;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.lineTo(startX + dx * 0.55 * scale * dir, startY + dy * 0.25 * scale + 5 * scale);
        ctx.closePath();
        ctx.fill();
      }
    }

    function drawPalmLayer(time) {
      drawPalm(22,  178, 1.45, false, time);
      drawPalm(288, 178, 1.35, true,  time);
      drawPalm(70,  155, 0.82, false, time);
    }

    function drawVignette() {
      ctx.save();
      ctx.globalAlpha = 0.12;
      r(0,                  VIEW.height - 7, VIEW.width, 7,          "#000000");
      r(0,                  0,               5,          VIEW.height, "#000000");
      r(VIEW.width - 5,     0,               5,          VIEW.height, "#000000");
      ctx.restore();
    }

    function draw(time = 0) {
      ctx.clearRect(0, 0, VIEW.width, VIEW.height);
      drawSky(time);
      drawOceanBase(time);
      drawRaveLights(time);
      drawBeach(time);
      drawWaveWash(time);
      drawPalmLayer(time);
      drawVignette();
      animationFrameId = requestAnimationFrame(draw);
    }

    window.addEventListener("resize", resize);
    resize();
    animationFrameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        imageRendering: "pixelated",
        pointerEvents: "none",
      }}
      aria-hidden="true"
    />
  );
}
