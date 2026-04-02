import { useEffect, useRef } from "react";

export default function HomeBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let width = 0;
    let height = 0;
    let fish = [];
    let crabs = [];
    let animationFrameId;

    function createFish() {
      const sandHeight = height * 0.03;
      const waterBottom = height - sandHeight;

      return {
        x: Math.random() * width,
        y: Math.random() * (waterBottom - 80) + 30,
        speed: 0.4 + Math.random() * 1.2,
        size: 10 + Math.random() * 10,
        direction: Math.random() > 0.5 ? 1 : -1,
        bobOffset: Math.random() * Math.PI * 2,
      };
    }

    function createCrab() {
      const sandHeight = height * 0.03;
      const sandTop = height - sandHeight;

      return {
        x: Math.random() * width,
        y: sandTop + sandHeight * 0.5,
        speed: 0.3 + Math.random() * 0.5,
        size: 12 + Math.random() * 8,
        direction: Math.random() > 0.5 ? 1 : -1,
        legOffset: Math.random() * Math.PI * 2,
      };
    }

    function populateCreatures() {
      fish = Array.from({ length: 8 }, createFish);
      crabs = Array.from({ length: 5 }, createCrab);
    }

    function drawFish(f, time) {
      const bob = Math.sin(time * 0.003 + f.bobOffset) * 2;
      const x = f.x;
      const y = f.y + bob;
      const s = f.size;

      ctx.save();
      ctx.translate(x, y);

      if (f.direction === -1) {
        ctx.scale(-1, 1);
      }

      ctx.fillStyle = "#ff9966";
      ctx.fillRect(-s, -s / 2, s * 1.6, s);
      ctx.fillRect(s * 0.6, -s / 4, s / 2, s / 2);

      ctx.fillStyle = "#ffcc88";
      ctx.fillRect(-s * 1.4, -s / 4, s / 2, s / 2);

      ctx.fillStyle = "#111";
      ctx.fillRect(s * 0.3, -s / 4, 2, 2);

      ctx.restore();
    }

    function drawCrab(c, time) {
      const legWiggle = Math.sin(time * 0.01 + c.legOffset) * 1.5;
      const x = c.x;
      const y = c.y;
      const s = c.size * 0.5;

      ctx.save();
      ctx.translate(x, y);

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

    function updateCreatures() {
      const sandHeight = height * 0.03;
      const waterBottom = height - sandHeight;
      const sandTop = height - sandHeight;

      for (const f of fish) {
        f.x += f.speed * f.direction;

        if (f.direction === 1 && f.x > width + 30) {
          f.x = -30;
          f.y = Math.random() * (waterBottom - 80) + 30;
        } else if (f.direction === -1 && f.x < -30) {
          f.x = width + 30;
          f.y = Math.random() * (waterBottom - 80) + 30;
        }
      }

      for (const c of crabs) {
        c.x += c.speed * c.direction;
        c.y = sandTop + sandHeight * 0.5;

        if (c.direction === 1 && c.x > width + 20) {
          c.x = -20;
        } else if (c.direction === -1 && c.x < -20) {
          c.x = width + 20;
        }
      }
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;

      populateCreatures();
    }

    function draw(time = 0) {
      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = "#8ed6ff";
      ctx.fillRect(0, 0, width, height);

      const sandHeight = height * 0.03;
      ctx.fillStyle = "#e6c27a";
      ctx.fillRect(0, height - sandHeight, width, sandHeight);

      updateCreatures();
      fish.forEach((f) => drawFish(f, time));
      crabs.forEach((c) => drawCrab(c, time));

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

  return <canvas ref={canvasRef} className="bg-canvas" />;
}
