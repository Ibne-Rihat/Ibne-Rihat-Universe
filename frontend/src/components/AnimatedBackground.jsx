import { useEffect, useRef } from "react";

export default function AnimatedBackground() {
  const containerRef = useRef(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !containerRef.current) return;
    const el = containerRef.current;
    const count = 26;
    const nodes = [];
    for (let i = 0; i < count; i++) {
      const p = document.createElement("span");
      p.className = "particle";
      const size = Math.random() * 3 + 1;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.left = `${Math.random() * 100}%`;
      p.style.bottom = `-10px`;
      p.style.animationDuration = `${Math.random() * 18 + 12}s`;
      p.style.animationDelay = `${Math.random() * 12}s`;
      p.style.opacity = `${Math.random() * 0.5 + 0.2}`;
      el.appendChild(p);
      nodes.push(p);
    }
    return () => nodes.forEach((n) => n.remove());
  }, []);

  return (
    <div className="bg-root" aria-hidden="true">
      <div className="mesh mesh-1" />
      <div className="mesh mesh-2" />
      <div className="mesh mesh-3" />
      <div className="grain" />
      <div className="absolute inset-0 grid-overlay opacity-40" />
      <div ref={containerRef} className="absolute inset-0" />
    </div>
  );
}
