"use client";

import { useEffect, useRef } from "react";

/** Hero background video. Respects prefers-reduced-motion (stays on the poster frame). */
export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (v && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      v.pause();
      v.removeAttribute("autoplay");
      v.style.display = "none";
    }
  }, []);
  return (
    <video ref={ref} className="absolute inset-0 -z-[3] h-full w-full object-cover" autoPlay muted loop playsInline preload="metadata" poster="/career/images/hero-poster.jpg" aria-hidden="true">
      <source src="/career/video/hero-drone.mp4" type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  );
}
