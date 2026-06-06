"use client";

import { useEffect, useRef, useState } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  animation?: "fade-up" | "fade-in" | "fade-left" | "fade-right" | "scale-up";
  threshold?: number;
  style?: React.CSSProperties;
}

export default function ScrollReveal({
  children,
  className = "",
  delay = 0,
  animation = "fade-up",
  threshold = 0.1,
  style = {},
}: ScrollRevealProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold }
    );
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, [threshold]);

  const animationStyles = {
    "fade-up": visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
    "fade-in": visible ? "opacity-100" : "opacity-0",
    "fade-left": visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8",
    "fade-right": visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8",
    "scale-up": visible ? "opacity-100 scale-100" : "opacity-0 scale-95",
  };

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out transform ${animationStyles[animation]} ${className}`}
      style={{ ...style, transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
