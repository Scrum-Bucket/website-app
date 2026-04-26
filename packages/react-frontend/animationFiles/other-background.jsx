import { useEffect, useRef } from "react";
import bubbleImage from "./animationAssets/bubble.png";

export default function OtherBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let width = 0;
    let height = 0;
    let bubbles = [];
    let animationFrameId;
    let imgEl = null;

    function loadBubbleImage() {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.src = bubbleImage;
        image.onload = () => resolve(image);
        image.onerror = reject;
      });
    }

    function createBubble() {
      const size = 20 + Math.random() * 50;
      return {
        x: Math.random() * width,
        y: height + size,
        size,
        speed: 0.4 + Math.random() * 1.2,
        drift: (Math.random() - 0.5) * 0.4,
        opacity: 0.4 + Math.random() * 0.5,
        wobbleOffset: Math.random() * Math.PI * 2,
      };
    }

    function populateBubbles() {
      bubbles = Array.from({ length: 20 }, () => {
        const b = createBubble();
        // scatter initial y positions so they don't all start at the bottom
        b.y = Math.random() * (height + b.size * 2) - b.size;
        return b;
      });
    }

    function updateBubbles(time) {
      for (const b of bubbles) {
        b.y -= b.speed;
        b.x += b.drift + Math.sin(time * 0.001 + b.wobbleOffset) * 0.3;

        // reset when fully off the top
        if (b.y < -b.size * 2) {
          b.x = Math.random() * width;
          b.y = height + b.size;
          b.size = 20 + Math.random() * 50;
          b.speed = 0.4 + Math.random() * 1.2;
          b.opacity = 0.4 + Math.random() * 0.5;
        }
      }
    }

    function drawBubbles() {
      for (const b of bubbles) {
        ctx.save();
        ctx.globalAlpha = b.opacity;
        ctx.drawImage(imgEl, b.x - b.size / 2, b.y - b.size / 2, b.size, b.size);
        ctx.restore();
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

      populateBubbles();
    }

    function draw(time = 0) {
      ctx.clearRect(0, 0, width, height);

      // deep ocean background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#0a2a4a");
      gradient.addColorStop(1, "#1a6b8a");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      updateBubbles(time);
      drawBubbles();

      animationFrameId = requestAnimationFrame(draw);
    }

    window.addEventListener("resize", resize);

    loadBubbleImage().then((image) => {
      imgEl = image;
      resize();
      animationFrameId = requestAnimationFrame(draw);
    });

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="bg-canvas" />;
}
