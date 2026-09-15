import { useEffect, useRef } from "react";
// @ts-ignore - vendor JS
import mountScrollWorld from "../vendor/scrubEngine.js";
import type { HeroScene } from "../content";

const BASE = import.meta.env.BASE_URL;
const S = `${BASE}scroll/`;
const FONT = "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// Разворачиваем короткие имена файлов из content.ts в пути public/
function buildSection(scene: HeroScene) {
  return {
    id: scene.id,
    label: scene.label,
    still: `${S}${scene.still}`,
    clip: `${S}vid/${scene.clip}`,
    clipMobile: scene.clipMobile ? `${S}vid/${scene.clipMobile}` : undefined,
    accent: scene.accent,
    eyebrow: scene.eyebrow,
    title: scene.title,
    body: scene.body,
    tags: scene.tags,
    scroll: scene.scroll,
    cta: scene.cta,
  };
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
const pad = (n: number) => String(n).padStart(2, "0");

// Движок собирает DOM один раз. При смене языка переписываем только тексты
// сцен, чтобы не перемонтировать видео и не терять позицию скролла.
function patchCopy(root: HTMLElement, scenes: HeroScene[], hint: string) {
  const copies = root.querySelectorAll<HTMLElement>(".sw-copy");
  scenes.forEach((s, i) => {
    const c = copies[i];
    if (!c) return;
    const cta = s.cta
      ? `<div class="sw-copy__cta">` +
        (s.cta.primary ? `<a class="sw-btn sw-btn--primary" href="${esc(s.cta.primary.href)}">${esc(s.cta.primary.label)}</a>` : "") +
        (s.cta.secondary ? `<a class="sw-btn sw-btn--ghost" href="${esc(s.cta.secondary.href)}">${esc(s.cta.secondary.label)}</a>` : "") +
        `</div>`
      : "";
    c.innerHTML =
      `<span class="sw-copy__num">${pad(i + 1)} / ${pad(scenes.length)}</span>` +
      (s.eyebrow ? `<span class="sw-copy__eyebrow">${esc(s.eyebrow)}</span>` : "") +
      `<h2 class="sw-copy__title">${esc(s.title)}</h2>` +
      `<p class="sw-copy__body">${esc(s.body)}</p>` +
      (s.tags?.length ? `<ul class="sw-copy__tags">${s.tags.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : "") +
      cta;
  });
  root.querySelectorAll<HTMLElement>(".sw-route__label").forEach((l, i) => {
    if (scenes[i]) l.textContent = scenes[i].label;
  });
  const h = root.querySelector<HTMLElement>(".sw-hint span");
  if (h) h.textContent = hint;
}

export default function ScrollWorldHero({
  onBook,
  scenes,
  hint,
}: {
  onBook: () => void;
  scenes: HeroScene[];
  hint: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (mounted.current) {
      patchCopy(el, scenes, hint);
      return;
    }
    mounted.current = true;
    mountScrollWorld(el, {
      brand: null,
      hint,
      diveScroll: 1.0,
      nav: false,
      // розовый градиент и летающие точки движка чужие белому сайту
      atmosphere: false,
      sections: scenes.map(buildSection),
      connectors: scenes.slice(1).map(() => null),
    });
  }, [scenes, hint]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let top = 0;
    let height = 0;
    const measure = () => {
      const r = el.getBoundingClientRect();
      top = r.top + window.scrollY;
      height = el.offsetHeight;
    };
    measure();

    let last = -1;
    let ticking = false;
    const apply = () => {
      ticking = false;
      const left = top + height - window.scrollY - window.innerHeight;
      const tail = window.innerHeight * 0.4;
      const p = left > 0 ? 0 : Math.min(1, -left / tail);
      if (Math.abs(p - last) < 0.01) return;
      last = p;
      el.style.opacity = p ? String(1 - p) : "";
      el.style.visibility = p >= 1 ? "hidden" : "visible";
      el.style.pointerEvents = p > 0.5 ? "none" : "";
      document.body.classList.toggle("hero-flight", p < 1);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    };
    const onResize = () => {
      measure();
      last = -1;
      onScroll();
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest?.('a[href="#book"]');
      if (a) {
        e.preventDefault();
        onBook();
      }
    };

    document.body.classList.add("hero-flight");
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    el.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      el.removeEventListener("click", onClick);
      document.body.classList.remove("hero-flight");
    };
  }, [onBook]);

  return (
    <>
      <style>{`
        .sw-root .sw-btn--primary {
          background:linear-gradient(180deg,#3d3d3d 0%,#171717 55%,#090909 100%); color:#FFFFFF; font-weight:600;
          border-radius:9999px;
          padding:12px 12px 12px 22px;
          display:inline-flex; align-items:center; gap:14px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.28), inset 0 -2px 0 rgba(0,0,0,.65), 0 6px 14px rgba(0,0,0,.28), 0 2px 4px rgba(0,0,0,.18);
          transition:transform .18s ease, box-shadow .18s ease, filter .18s ease;
        }
        .sw-root .sw-btn--primary:hover { filter:brightness(1.1); transform:translateY(-2px); box-shadow: inset 0 1px 0 rgba(255,255,255,.35), inset 0 -2px 0 rgba(0,0,0,.65), 0 12px 24px rgba(0,0,0,.32), 0 3px 6px rgba(0,0,0,.18); }
        .sw-root .sw-btn--primary:active { transform:translateY(1px); box-shadow: inset 0 3px 8px rgba(0,0,0,.7); }
        .sw-root .sw-btn--primary::after {
          content:""; display:inline-block;
          width:34px; height:34px; border-radius:9999px;
          background:rgba(255,255,255,.14);
          background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M5 12h14'/><path d='M13 6l6 6-6 6'/></svg>");
          background-repeat:no-repeat; background-position:center;
        }
        .sw-root .sw-btn--ghost { color:#111111; font-weight:600; }
        .sw-root .sw-copy { width:min(88vw,780px); max-width:780px; }
        @media (min-width: 768px) { .sw-root .sw-copy { width:min(62vw,780px); } }
        .sw-root .sw-copy__title {
          font-family:${FONT}; font-weight:700; color:#111111;
          letter-spacing:-0.025em; line-height:0.95; text-transform:none;
          font-size:clamp(2.2rem,5vw,4.4rem); max-width:none;
          margin:18px 0 18px;
        }
        .sw-root .sw-copy__eyebrow {
          font-family:${FONT}; font-weight:600; font-size:.78rem;
          letter-spacing:normal; text-transform:none; color:#111111;
          display:inline-block; background:rgba(255,255,255,.72);
          backdrop-filter:blur(6px); border-radius:9999px; padding:6px 14px;
        }
        .sw-root .sw-copy__body {
          font-family:${FONT}; font-weight:500; font-size:.95rem;
          color:rgba(17,17,17,.72); max-width:28rem;
          margin-bottom:22px;
        }
        .sw-root .sw-copy__tags { margin-top:8px; }
        .sw-root .sw-copy__tags li {
          font-family:${FONT}; font-weight:600; color:#111111;
          background:rgba(255,255,255,.72); border-radius:9999px;
        }
        .sw-root .sw-scene video,
        .sw-root .sw-scene img {
          width:100%; height:100%; max-width:none; object-fit:cover; display:block;
        }
        .sw-root .sw-particles { display:none; }
        .sw-root .sw-copy { padding-bottom:120px; }
        @media (min-width: 768px) { .sw-root .sw-copy { padding-bottom:88px; } }
        .sw-root .sw-copy__num,
        .sw-root .sw-route__label,
        .sw-root .sw-hint { font-family:${FONT}; }

        /* Движок создаёт пустой .sw-topbar (nav:false), он z-index:50 и
           перекрывает наш header, на телефоне ловит тапы по бургеру. Гасим. */
        .sw-root .sw-topbar { display: none !important; }

        body.hero-flight header {
          background:transparent !important; backdrop-filter:none !important;
          transition:background .25s ease, backdrop-filter .25s ease;
        }
        body.hero-flight header::before {
          content:""; position:absolute; inset:0; z-index:-1; pointer-events:none;
          background:linear-gradient(to bottom, rgba(255,255,255,.92) 0%, rgba(255,255,255,.75) 55%, rgba(255,255,255,0) 100%);
        }
        body.hero-flight header:hover {
          background:rgba(255,255,255,.94) !important; backdrop-filter:blur(8px) !important;
        }
        body.hero-flight header:hover::before { opacity:0; }
        header a, header nav a { white-space:nowrap; }
      `}</style>
      <div
        ref={ref}
        className="sw-root"
        style={
          {
            position: "relative",
            zIndex: 40,
            background: "#FFFFFF",
            marginBottom: "-60vh",
            "--sw-bg": "#FFFFFF",
            "--sw-ink": "#111111",
            "--sw-ink-soft": "#5b5b5b",
            "--sw-accent": "#2F7D4F",
            "--sw-font-display": FONT,
            "--sw-font-body": FONT,
          } as React.CSSProperties
        }
      />
    </>
  );
}
