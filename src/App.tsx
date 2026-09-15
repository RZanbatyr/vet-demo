import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { CONTENT, type Content, type Lang, type ServicePage } from "./content";
import ScrollWorldHero from "./components/ScrollWorldHero";
import HeroLoader from "./components/HeroLoader";

const BASE = import.meta.env.BASE_URL;
const HERO_IMAGE = `${BASE}img/hero.webp`;
const SECTION2_IMAGE = `${BASE}img/section2.webp`;
const SECTION3_IMG1 = `${BASE}img/s3img1.webp`;
const SECTION3_IMG2 = `${BASE}img/s3img2.webp`;
const SECTION3_BG = `${BASE}img/s3bg.webp`;
const WA_3D = `${BASE}img/wa-3d.webp`;

// ------------------------------------------------------------------ hooks

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 767px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const on = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return mobile;
}

type MaskPos = { x: number; y: number; sw: number; sh: number };

function useMaskPositions(sectionRef: RefObject<HTMLElement>, cardsRef: RefObject<(HTMLElement | null)[]>) {
  const [positions, setPositions] = useState<MaskPos[]>([]);
  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const compute = () => {
      const sr = section.getBoundingClientRect();
      const next = (cardsRef.current || []).map((card) => {
        if (!card) return { x: 0, y: 0, sw: sr.width, sh: sr.height };
        const cr = card.getBoundingClientRect();
        return { x: cr.left - sr.left, y: cr.top - sr.top, sw: sr.width, sh: sr.height };
      });
      setPositions(next);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(section);
    return () => ro.disconnect();
  }, [sectionRef, cardsRef]);
  return positions;
}

function useImageWidth(src: string, sectionRef: RefObject<HTMLElement>) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const img = new Image();
    const calc = () => {
      const sh = sectionRef.current?.getBoundingClientRect().height || window.innerHeight;
      if (img.naturalHeight) setWidth(img.naturalWidth * (sh / img.naturalHeight));
    };
    img.onload = calc;
    img.src = src;
    const ro = sectionRef.current ? new ResizeObserver(calc) : null;
    if (ro && sectionRef.current) ro.observe(sectionRef.current);
    return () => ro?.disconnect();
  }, [src, sectionRef]);
  return width;
}

function useStaggeredReveal(count: number, threshold = 0.15) {
  const containerRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Fast-paint: секция уже во вьюпорте, показываем сразу (иначе скриншоты ловят opacity:0)
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold }
    );
    io.observe(el);
    const safety = window.setTimeout(() => setVisible(true), 1200);
    return () => {
      io.disconnect();
      window.clearTimeout(safety);
    };
  }, [threshold]);
  const getAnimStyle = (i: number): CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(24px)",
    transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 120}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 120}ms`,
  });
  void count;
  return { containerRef, getAnimStyle };
}

function MaskedCard({
  bgImage,
  position,
  imageWidth,
  focalX,
  className = "",
  children,
  cardRef,
  style,
  onClick,
}: {
  bgImage: string;
  position?: MaskPos;
  imageWidth: number;
  focalX: number;
  className?: string;
  children?: ReactNode;
  cardRef: (el: HTMLDivElement | null) => void;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  const p = position || { x: 0, y: 0, sw: 0, sh: 0 };
  const overflow = imageWidth > p.sw ? imageWidth - p.sw : 0;
  const focalOffset = overflow * focalX;
  return (
    <div
      ref={cardRef}
      onClick={onClick}
      className={className}
      style={{
        ...style,
        backgroundImage: `url(${bgImage})`,
        backgroundSize: `auto ${p.sh}px`,
        backgroundPosition: `-${p.x + focalOffset}px -${p.y}px`,
        backgroundRepeat: "no-repeat",
        backgroundColor: "#e7e5e4",
      }}
    >
      {children}
    </div>
  );
}

// ------------------------------------------------------------------ routing

type Route = { kind: "home" } | { kind: "page"; slug: string };

function parseRoute(): Route {
  const m = window.location.hash.match(/^#\/p\/([\w-]+)/);
  return m ? { kind: "page", slug: m[1] } : { kind: "home" };
}

function scrollToAnchor(hash: string) {
  const id = hash.replace(/^#/, "");
  if (!id) return;
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ------------------------------------------------------------------ icons

const ArrowIcon = ({ className = "" }: { className?: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={`rotate-[-45deg] ${className}`}>
    <path d="M1 7h12m0 0L8 2m5 5L8 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4 5.1 5.1 0 0 0 3.1.6 2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.2-.2-.2-.4-.3z" />
  </svg>
);

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M21.9 4.6 18.7 19.4c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.1-8.2c.4-.4-.1-.5-.6-.2L6.2 13.1 1.4 11.6c-1-.3-1-1 .2-1.5L20.5 3c.9-.3 1.6.2 1.4 1.6z" />
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

// ------------------------------------------------------------------ navbar

function Navbar({
  c,
  lang,
  onLang,
  onBook,
  route,
}: {
  c: Content;
  lang: Lang;
  onLang: () => void;
  onBook: () => void;
  route: Route;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    if (route.kind !== "home") {
      window.location.hash = "";
      window.setTimeout(() => scrollToAnchor(href), 60);
    } else {
      scrollToAnchor(href);
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 py-2 md:py-3 bg-white/80 backdrop-blur-md">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.location.hash = "";
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="flex flex-col"
        >
          <span className="text-xl md:text-2xl font-extrabold uppercase tracking-tight leading-none">{c.clinic.logoTop}</span>
          <span className="text-xl md:text-2xl font-extrabold uppercase tracking-tight leading-none -mt-0.5 md:-mt-1">{c.clinic.logoBottom}</span>
          <span className="text-[8px] md:text-[9px] font-medium leading-none mt-1.5 md:mt-2">{c.clinic.tagline}</span>
        </a>

        <nav className="hidden md:flex items-center gap-6">
          {c.ui.nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              onClick={(e) => {
                e.preventDefault();
                go(n.href);
              }}
              className="text-sm font-semibold text-black hover:text-neutral-500 transition-colors"
            >
              {n.label}
            </a>
          ))}
          <a href={c.clinic.phoneHref} className="text-sm font-semibold text-black">
            {c.clinic.phone}
          </a>
          <button
            onClick={onLang}
            className="px-3 py-2 rounded-full border border-black/20 text-xs font-bold tracking-wide hover:border-black transition-colors"
            aria-label="Switch language"
          >
            {c.ui.langSwitch}
          </button>
          <button
            onClick={onBook}
            className="px-6 py-3 btn3d btn3d-dark rounded-full text-white text-sm font-semibold"
          >
            {c.ui.book}
          </button>
        </nav>

        <div className="md:hidden flex items-center gap-2">
          <button onClick={onLang} className="px-3 py-2 rounded-full border border-black/20 text-xs font-bold" aria-label="Switch language">
            {c.ui.langSwitch}
          </button>
          <button
            onClick={() => setOpen((o) => !o)}
            className="w-10 h-10 flex items-center justify-center relative"
            aria-label={open ? c.ui.close : c.ui.menu}
          >
            <span
              className={`absolute h-0.5 w-6 bg-black rounded-full transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] ${
                open ? "rotate-45 translate-y-0" : "-translate-y-2"
              }`}
            />
            <span
              className={`absolute h-0.5 w-6 bg-black rounded-full transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] ${
                open ? "opacity-0 scale-x-0" : "opacity-100 scale-x-100"
              }`}
            />
            <span
              className={`absolute h-0.5 w-6 bg-black rounded-full transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] ${
                open ? "-rotate-45 translate-y-0" : "translate-y-2"
              }`}
            />
          </button>
        </div>
      </header>

      {/* Мобильное меню: z-50, иначе панель прячется за скролл-героем (z-40) */}
      <div className={`md:hidden fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}>
        <div
          className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-500 ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
        />
        <div
          className={`absolute top-0 right-0 h-full w-[85%] max-w-sm bg-white shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <button onClick={() => setOpen(false)} className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center" aria-label={c.ui.close}>
            <span className="absolute h-0.5 w-6 bg-black rounded-full rotate-45" />
            <span className="absolute h-0.5 w-6 bg-black rounded-full -rotate-45" />
          </button>
          <div className="flex flex-col justify-center h-full px-8 gap-1">
            {c.ui.nav.map((n, i) => (
              <a
                key={n.href}
                href={n.href}
                onClick={(e) => {
                  e.preventDefault();
                  go(n.href);
                }}
                className={`text-4xl font-bold text-black hover:text-neutral-500 transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
                  open ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
                }`}
                style={{ transitionDelay: open ? `${100 + i * 60}ms` : "0ms" }}
              >
                {n.label}
              </a>
            ))}
            <div
              className={`mt-8 pt-8 border-t border-neutral-200 transition-all duration-500 ${open ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"}`}
              style={{ transitionDelay: open ? "450ms" : "0ms" }}
            >
              <a href={c.clinic.phoneHref} className="block text-sm font-semibold text-black mb-4">
                {c.clinic.phone}
              </a>
              <button
                onClick={() => {
                  setOpen(false);
                  onBook();
                }}
                className="w-full px-6 py-4 btn3d btn3d-dark rounded-full text-white text-sm font-semibold"
              >
                {c.ui.bookFree}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ------------------------------------------------------------------ section 1: hero mosaic

function HeroMosaic({ c }: { c: Content }) {
  const isMobile = useIsMobile();
  const sectionRef = useRef<HTMLElement | null>(null);
  const cardsRef = useRef<(HTMLElement | null)[]>([]);
  const positions = useMaskPositions(sectionRef, cardsRef);
  const imageWidth = useImageWidth(HERO_IMAGE, sectionRef);
  const reveal = useStaggeredReveal(4);
  const focalX = isMobile ? 0.7 : 0.8;

  return (
    <section
      id="top"
      ref={(el) => {
        sectionRef.current = el;
        reveal.containerRef.current = el;
      }}
      className="h-screen w-full overflow-hidden flex flex-col pt-24 md:pt-24 px-3 md:px-5 pb-1.5 md:pb-2 gap-1.5 md:gap-2"
    >
      {c.featureBars.map((f, i) => (
        <MaskedCard
          key={f}
          bgImage={HERO_IMAGE}
          position={positions[i]}
          imageWidth={imageWidth}
          focalX={focalX}
          cardRef={(el) => (cardsRef.current[i] = el)}
          style={reveal.getAnimStyle(i)}
          className="w-full h-14 md:h-20 shrink-0 rounded-xl md:rounded-2xl overflow-hidden relative"
        >
          <span className="relative z-10 flex items-center justify-center h-full text-black text-lg md:text-3xl font-bold text-center px-3">{f}</span>
        </MaskedCard>
      ))}
      <MaskedCard
        bgImage={HERO_IMAGE}
        position={positions[3]}
        imageWidth={imageWidth}
        focalX={focalX}
        cardRef={(el) => (cardsRef.current[3] = el)}
        style={reveal.getAnimStyle(3)}
        className="w-full flex-1 min-h-0 rounded-xl md:rounded-2xl overflow-hidden relative"
      >
        <p className="absolute top-4 left-4 md:top-7 md:left-7 text-black text-xs md:text-sm font-semibold leading-4 md:leading-5 max-w-[200px] md:max-w-[300px] z-10">
          {c.hero.top}
          <br />
          {c.hero.top2}
        </p>
        <div className="absolute bottom-5 left-3 md:bottom-8 md:left-4 z-10">
          <span className="block text-black text-xs md:text-sm font-semibold mb-1 md:mb-2">{c.hero.label}</span>
          <h1 className="text-black text-[clamp(3rem,11vw,11rem)] font-bold leading-[0.86] tracking-tight">
            {c.hero.h1[0]}
            <br />
            {c.hero.h1[1]}
          </h1>
        </div>
        <span className="absolute bottom-6 right-4 md:bottom-10 md:right-24 text-white text-xs md:text-sm font-semibold z-10 drop-shadow">{c.hero.right}</span>
      </MaskedCard>
    </section>
  );
}

// ------------------------------------------------------------------ section 2: gallery mosaic

function GalleryMosaic({ c }: { c: Content }) {
  const isMobile = useIsMobile();
  const sectionRef = useRef<HTMLElement | null>(null);
  const cardsRef = useRef<(HTMLElement | null)[]>([]);
  const positions = useMaskPositions(sectionRef, cardsRef);
  const imageWidth = useImageWidth(SECTION2_IMAGE, sectionRef);
  const reveal = useStaggeredReveal(4);
  const focalX = isMobile ? 0.65 : 0.8;

  return (
    <section
      id="services"
      ref={(el) => {
        sectionRef.current = el;
        reveal.containerRef.current = el;
      }}
      className="min-h-screen md:h-screen w-full overflow-hidden flex flex-col pt-1.5 md:pt-2 px-3 md:px-5 pb-1.5 md:pb-2 gap-1.5 md:gap-2 scroll-mt-20"
    >
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 grid-rows-[auto_auto_auto_auto] md:grid-rows-[1fr_1fr_0.8fr] gap-1.5 md:gap-2">
        <MaskedCard
          bgImage={SECTION2_IMAGE}
          position={positions[0]}
          imageWidth={imageWidth}
          focalX={focalX}
          cardRef={(el) => (cardsRef.current[0] = el)}
          style={reveal.getAnimStyle(0)}
          className="rounded-xl md:rounded-2xl overflow-hidden relative min-h-[160px] md:min-h-0"
        >
          <h2 className="absolute top-4 left-5 md:top-6 md:left-7 text-white md:text-black text-2xl md:text-3xl font-bold z-10">{c.gallery.title}</h2>
          <p className="absolute bottom-4 left-5 md:bottom-6 md:left-7 text-white md:text-black text-xs md:text-sm font-semibold z-10">{c.gallery.sub}</p>
        </MaskedCard>

        <MaskedCard
          bgImage={SECTION2_IMAGE}
          position={positions[1]}
          imageWidth={imageWidth}
          focalX={focalX}
          cardRef={(el) => (cardsRef.current[1] = el)}
          style={reveal.getAnimStyle(1)}
          className="md:row-span-2 rounded-xl md:rounded-2xl overflow-hidden relative min-h-[200px] md:min-h-0"
        >
          <p className="absolute bottom-16 left-5 md:bottom-20 md:left-7 text-white text-xs md:text-sm font-semibold leading-4 md:leading-5 z-10 drop-shadow">
            {c.gallery.text}
            <br />
            {c.gallery.text2}
          </p>
          <a
            href={c.clinic.phoneHref}
            className="absolute bottom-4 right-4 md:bottom-6 md:right-6 px-5 py-3 md:px-8 md:py-5 btn3d btn3d-light rounded-full text-black text-base md:text-xl font-bold z-10"
          >
            {c.gallery.button}
          </a>
        </MaskedCard>

        <MaskedCard
          bgImage={SECTION2_IMAGE}
          position={positions[2]}
          imageWidth={imageWidth}
          focalX={focalX}
          cardRef={(el) => (cardsRef.current[2] = el)}
          style={reveal.getAnimStyle(2)}
          className="rounded-xl md:rounded-2xl overflow-hidden relative min-h-[160px] md:min-h-0"
        >
          <h2 className="absolute top-4 left-5 md:top-6 md:left-7 text-white md:text-black text-[clamp(3rem,7vw,6rem)] font-bold leading-[0.9] z-10">
            {c.gallery.big[0]}
            <br />
            {c.gallery.big[1]}
          </h2>
        </MaskedCard>

        <MaskedCard
          bgImage={SECTION2_IMAGE}
          position={positions[3]}
          imageWidth={imageWidth}
          focalX={focalX}
          cardRef={(el) => (cardsRef.current[3] = el)}
          style={reveal.getAnimStyle(3)}
          className="col-span-1 md:col-span-2 rounded-xl md:rounded-2xl overflow-hidden relative min-h-[200px] md:min-h-0"
        >
          <div className="absolute inset-0 z-10 flex flex-wrap md:flex-nowrap gap-1.5 md:gap-2 p-2 md:p-3">
            {c.gallery.services.map((svc, i) => {
              const active = i === 0;
              return (
                <a
                  key={svc.slug}
                  href={`#/p/${svc.slug}`}
                  className={`flex-1 min-w-[calc(50%-4px)] md:min-w-0 rounded-xl md:rounded-2xl p-3 md:p-5 flex flex-col justify-between transition-transform hover:-translate-y-0.5 ${
                    active ? "bg-white/90 backdrop-blur-md" : "bg-white/20 backdrop-blur-xl hover:bg-white/30"
                  }`}
                >
                  <h3 className={`text-xl md:text-4xl font-bold leading-[1.05] whitespace-pre-line ${active ? "text-black" : "text-white drop-shadow-md"}`}>{svc.name}</h3>
                  {svc.num ? (
                    <span
                      className={`self-end w-8 h-8 md:w-12 md:h-12 rounded-full border flex items-center justify-center text-xs md:text-sm font-semibold ${
                        active ? "border-black text-black" : "border-white text-white"
                      }`}
                    >
                      {svc.num}
                    </span>
                  ) : (
                    <span className="self-end w-8 h-8 md:w-12 md:h-12 rounded-full border border-white text-white flex items-center justify-center">
                      <ArrowIcon />
                    </span>
                  )}
                </a>
              );
            })}
          </div>
        </MaskedCard>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ section 3: implants

function ImplantSection({ c, onBook }: { c: Content; onBook: () => void }) {
  const reveal = useStaggeredReveal(4);
  const href = `#/p/${c.implant.slug}`;
  return (
    <section
      ref={(el) => {
        reveal.containerRef.current = el;
      }}
      className="min-h-screen md:h-screen w-full overflow-hidden flex flex-col pt-1.5 md:pt-2 px-3 md:px-5 pb-1.5 md:pb-2 gap-1.5 md:gap-2"
    >
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-1.5 md:gap-2">
        <div className="flex flex-col gap-1.5 md:gap-2">
          <a
            href={href}
            style={reveal.getAnimStyle(0)}
            className="rounded-xl md:rounded-2xl bg-stone-50 p-5 md:p-7 flex flex-col justify-between flex-[1.2] min-h-[180px] md:min-h-0 hover:bg-stone-100 transition-colors"
          >
            <h2 className="text-[clamp(3rem,7vw,6.5rem)] font-bold leading-[0.95] text-black">
              {c.implant.h2[0]}
              <br />
              {c.implant.h2[1]}
            </h2>
            <p className="text-xs md:text-sm font-semibold text-black">{c.implant.sub}</p>
          </a>
          <div style={reveal.getAnimStyle(1)} className="flex gap-1.5 md:gap-2 flex-1 min-h-[140px] md:min-h-0">
            <div className="flex-1 rounded-xl md:rounded-2xl overflow-hidden">
              <img src={SECTION3_IMG1} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="flex-1 rounded-xl md:rounded-2xl overflow-hidden">
              <img src={SECTION3_IMG2} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          </div>
          <div
            style={reveal.getAnimStyle(2)}
            className="rounded-xl md:rounded-2xl bg-zinc-200 p-5 md:p-7 flex items-end justify-between flex-[0.8] min-h-[160px] md:min-h-0 gap-3"
          >
            <div>
              <p className="text-xs md:text-sm font-semibold text-black mb-2 md:mb-3">{c.implant.label}</p>
              <h3 className="text-xl md:text-3xl font-bold text-black leading-6 md:leading-8">
                {c.implant.h3[0]}
                <br />
                {c.implant.h3[1]}
                <br />
                {c.implant.h3[2]}
              </h3>
            </div>
            <button
              onClick={onBook}
              className="px-5 py-3 md:px-8 md:py-5 btn3d btn3d-light rounded-full text-black text-base md:text-xl font-bold whitespace-nowrap"
            >
              {c.implant.button}
            </button>
          </div>
        </div>

        <div style={reveal.getAnimStyle(3)} className="rounded-xl md:rounded-2xl overflow-hidden relative min-h-[350px] md:min-h-0">
          <img src={SECTION3_BG} alt="" className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute bottom-3 left-3 right-3 md:bottom-5 md:left-5 md:right-5 flex gap-1.5 md:gap-2">
            <a href={href} className="flex-1 bg-white rounded-xl md:rounded-2xl p-3 md:p-5 flex flex-col justify-between h-36 md:h-52 hover:scale-[1.02] transition-transform">
              <h4 className="text-lg md:text-2xl font-bold text-black leading-5 md:leading-7">
                {c.implant.card1[0]}
                <br />
                {c.implant.card1[1]}
                <br />
                {c.implant.card1[2]}
              </h4>
              <span className="self-end w-9 h-9 md:w-12 md:h-12 rounded-full border border-black flex items-center justify-center">
                <ArrowIcon />
              </span>
            </a>
            <a
              href={href}
              className="flex-1 bg-white/20 backdrop-blur-xl rounded-xl md:rounded-2xl p-3 md:p-5 flex flex-col justify-between h-36 md:h-52 hover:scale-[1.02] transition-transform"
            >
              <h4 className="text-lg md:text-2xl font-bold text-white leading-5 md:leading-7">
                {c.implant.card2[0]}
                <br />
                {c.implant.card2[1]}
                <br />
                {c.implant.card2[2]}
              </h4>
              <span className="self-end w-9 h-9 md:w-12 md:h-12 rounded-full border border-white flex items-center justify-center text-white">
                <ArrowIcon className="text-white" />
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ photos

function PhotosSection({ c }: { c: Content }) {
  const reveal = useStaggeredReveal(6);
  return (
    <section
      id="photos"
      ref={(el) => {
        reveal.containerRef.current = el;
      }}
      className="w-full px-3 md:px-5 pt-6 md:pt-8 pb-1.5 md:pb-2 scroll-mt-20 md:scroll-mt-24"
    >
      <div className="flex items-end justify-between mb-3 md:mb-4 px-1">
        <h2 className="text-3xl md:text-5xl font-bold leading-none">{c.photos.title}</h2>
        <p className="hidden md:block text-sm font-semibold text-neutral-600">{c.photos.sub}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 md:gap-2">
        {c.photos.items.map((p, i) => (
          <figure
            key={p.src}
            style={reveal.getAnimStyle(i)}
            className="relative rounded-xl md:rounded-2xl overflow-hidden aspect-[4/3] bg-stone-100 group"
          >
            <img src={`${BASE}${p.src}`} alt={p.caption} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <figcaption className="absolute bottom-2 left-2 md:bottom-3 md:left-3 bg-white/85 backdrop-blur-md rounded-full px-3 py-1.5 text-xs md:text-sm font-semibold">
              {p.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ doctors

function DoctorsSection({ c }: { c: Content }) {
  const reveal = useStaggeredReveal(3);
  return (
    <section
      id="doctors"
      ref={(el) => {
        reveal.containerRef.current = el;
      }}
      className="w-full px-3 md:px-5 pt-6 md:pt-8 pb-1.5 md:pb-2 scroll-mt-20 md:scroll-mt-24"
    >
      <h2 className="text-3xl md:text-5xl font-bold leading-none mb-3 md:mb-4 px-1">{c.team.title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5 md:gap-2">
        {c.team.members.map((m, i) => (
          <div key={m.role} style={reveal.getAnimStyle(i)} className="rounded-xl md:rounded-2xl bg-stone-50 p-4 md:p-6 flex gap-4 md:flex-col md:gap-5">
            <div className="w-24 h-24 md:w-full md:h-64 shrink-0 rounded-xl md:rounded-2xl bg-zinc-200 flex items-center justify-center text-center text-[10px] md:text-xs font-semibold text-neutral-500 p-2">
              {c.team.photoHint}
            </div>
            <div className="flex flex-col justify-center">
              <h3 className="text-lg md:text-2xl font-bold leading-tight">{m.role}</h3>
              <p className="text-sm md:text-base text-neutral-700 mt-1">{m.spec}</p>
              <p className="text-xs md:text-sm font-semibold mt-2">{m.since}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-sm text-neutral-600 mt-3 px-1">{c.team.note}</p>
    </section>
  );
}

// ------------------------------------------------------------------ prices

function PricesSection({ c, onBook }: { c: Content; onBook: () => void }) {
  const reveal = useStaggeredReveal(2);
  return (
    <section
      id="prices"
      ref={(el) => {
        reveal.containerRef.current = el;
      }}
      className="w-full px-3 md:px-5 pt-6 md:pt-8 pb-1.5 md:pb-2 scroll-mt-20 md:scroll-mt-24"
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-1.5 md:gap-2">
        <div style={reveal.getAnimStyle(0)} className="rounded-xl md:rounded-2xl bg-black text-white p-5 md:p-8 flex flex-col justify-between min-h-[260px]">
          <div>
            <h2 className="text-[clamp(2.5rem,6vw,5rem)] font-bold leading-[0.95]">{c.prices.title}</h2>
            <p className="text-sm md:text-base text-white/75 mt-4 max-w-md">{c.prices.sub}</p>
          </div>
          <div className="mt-8">
            <button onClick={onBook} className="w-full md:w-auto px-6 py-4 btn3d btn3d-light rounded-full text-black text-sm md:text-base font-bold">
              {c.prices.cta}
            </button>
            <p className="text-xs text-white/60 mt-3">{c.prices.note}</p>
          </div>
        </div>
        <div style={reveal.getAnimStyle(1)} className="rounded-xl md:rounded-2xl bg-stone-50 p-4 md:p-8">
          <ul className="divide-y divide-black/10 md:pr-16">
            {c.prices.items.map((p) => (
              <li key={p.name} className="flex items-baseline justify-between gap-4 py-3 md:py-3.5">
                <span className="text-sm md:text-base font-semibold">{p.name}</span>
                <span className="text-sm md:text-base font-bold whitespace-nowrap tabular-nums">{p.price}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs md:text-sm text-neutral-600 mt-5 mb-2">{c.prices.more}</p>
          <div className="flex flex-wrap gap-2">
            {c.pages.map((p) => (
              <a
                key={p.slug}
                href={`#/p/${p.slug}`}
                className="px-4 py-2 rounded-full border border-black text-xs md:text-sm font-semibold hover:bg-black hover:text-white transition-colors"
              >
                {p.chip}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ footer

function Footer({ c }: { c: Content }) {
  return (
    <footer id="contacts" className="w-full px-3 md:px-5 pt-6 md:pt-8 pb-24 md:pb-28 scroll-mt-20 md:scroll-mt-24">
      <div className="rounded-xl md:rounded-2xl bg-stone-50 p-5 md:p-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight leading-none">
            {c.clinic.logoTop}
            <br />
            {c.clinic.logoBottom}
          </div>
          <p className="text-sm font-medium mt-3">{c.clinic.tagline}</p>
          <div className="flex gap-2 mt-5">
            {c.clinic.instagram && (
              <a href={c.clinic.instagram} target="_blank" rel="noreferrer" className="w-11 h-11 rounded-full border border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors" aria-label="Instagram">
                <InstagramIcon />
              </a>
            )}
            {c.clinic.telegram && (
              <a href={c.clinic.telegram} target="_blank" rel="noreferrer" className="w-11 h-11 rounded-full border border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors" aria-label="Telegram">
                <TelegramIcon />
              </a>
            )}
            <a href={c.clinic.whatsapp} target="_blank" rel="noreferrer" className="group block" aria-label="WhatsApp">
              <img src={WA_3D} alt="" className="w-20 h-20 drop-shadow-[0_10px_18px_rgba(37,211,102,0.35)] transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">{c.footer.contacts}</p>
          <a href={c.clinic.phoneHref} className="block text-xl md:text-2xl font-bold">
            {c.clinic.phone}
          </a>
          <p className="text-sm md:text-base mt-2">{c.clinic.address}</p>
          <p className="text-sm md:text-base mt-1">{c.clinic.hours}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">{c.footer.find}</p>
          <p className="text-sm md:text-base">{c.clinic.landmark}</p>
          <p className="text-sm md:text-base mt-4 font-semibold">{c.footer.guarantee}</p>
          <a href={c.clinic.phoneHref} className="inline-block mt-5 px-6 py-3 btn3d btn3d-dark rounded-full text-white text-sm font-semibold">
            {c.ui.call}
          </a>
        </div>
      </div>
      <div className="mt-1.5 md:mt-2 rounded-xl md:rounded-2xl border border-dashed border-black/25 px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs md:text-sm text-neutral-700">
        <span>{c.ui.demoNote}</span>
        <a href={c.ui.demoByHref} target="_blank" rel="noreferrer" className="font-semibold text-black underline underline-offset-4 whitespace-nowrap">
          {c.ui.demoBy}
        </a>
      </div>
      <div className="px-2 pt-3 text-xs text-neutral-500">
        <span>{c.footer.about}</span>
      </div>
    </footer>
  );
}

// ------------------------------------------------------------------ floating

function Floating({ c, onBook }: { c: Content; onBook: () => void }) {
  return (
    <>
      <div className="fixed right-3 md:right-5 bottom-20 md:bottom-6 z-40 flex flex-col gap-2">
        <a href={c.clinic.whatsapp} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="block w-14 h-14 md:w-[76px] md:h-[76px] transition-transform duration-300 hover:scale-110">
          <img src={WA_3D} alt="" className="w-full h-full drop-shadow-[0_12px_20px_rgba(37,211,102,0.4)]" />
        </a>
        {c.clinic.telegram && (
          <a href={c.clinic.telegram} target="_blank" rel="noreferrer" aria-label="Telegram" className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#2AABEE] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
            <TelegramIcon />
          </a>
        )}
        {c.clinic.instagram && (
          <a href={c.clinic.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#E1306C] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
            <InstagramIcon />
          </a>
        )}
      </div>
      <div className="m-cta md:hidden fixed left-3 right-3 bottom-3 z-40">
        <button onClick={onBook} className="w-full py-4 btn3d btn3d-dark rounded-full text-white text-sm font-bold">
          {c.ui.bookFree}
        </button>
      </div>
    </>
  );
}

// ------------------------------------------------------------------ booking modal

function BookingModal({ c, open, service, onClose }: { c: Content; open: boolean; service: string; onClose: () => void }) {
  const [sent, setSent] = useState(false);
  const [svc, setSvc] = useState(service);
  useEffect(() => {
    setSvc(service);
  }, [service, open]);
  useEffect(() => {
    if (!open) return;
    setSent(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-md bg-white rounded-t-2xl md:rounded-2xl p-6 md:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
        <button onClick={onClose} aria-label={c.ui.close} className="absolute top-4 right-4 w-9 h-9 rounded-full border border-black/15 flex items-center justify-center hover:bg-black hover:text-white transition-colors">
          <span className="text-xl leading-none">×</span>
        </button>
        {sent ? (
          <div className="py-8 text-center">
            <h3 className="text-3xl font-bold">{c.booking.thanksTitle}</h3>
            <p className="text-neutral-700 mt-3">{c.booking.thanks}</p>
            <a href={c.ui.demoByHref} target="_blank" rel="noreferrer" className="inline-block mt-4 text-sm font-semibold underline underline-offset-4">
              {c.ui.demoBy}
            </a>
            <button onClick={onClose} className="mt-6 px-6 py-3 btn3d btn3d-dark rounded-full text-white text-sm font-semibold">
              {c.ui.close}
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
            className="flex flex-col gap-3"
          >
            <h3 className="text-3xl font-bold leading-none">{c.booking.title}</h3>
            <p className="text-sm text-neutral-600 mb-2">{c.booking.sub}</p>
            <input required name="name" placeholder={c.booking.name} className="w-full px-4 py-3 rounded-xl border border-black/15 bg-stone-50 outline-none focus:border-black" />
            <input required name="phone" type="tel" placeholder={c.booking.phone} className="w-full px-4 py-3 rounded-xl border border-black/15 bg-stone-50 outline-none focus:border-black" />
            <select name="service" value={svc} onChange={(e) => setSvc(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-black/15 bg-stone-50 outline-none focus:border-black">
              <option value="">{c.booking.service}</option>
              {c.pages.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.chip}
                </option>
              ))}
            </select>
            <textarea name="comment" rows={2} placeholder={c.booking.comment} className="w-full px-4 py-3 rounded-xl border border-black/15 bg-stone-50 outline-none focus:border-black resize-none" />
            <button type="submit" className="w-full py-4 btn3d btn3d-dark rounded-full text-white text-sm font-bold mt-1">
              {c.booking.submit}
            </button>
            <p className="text-[11px] text-neutral-500 text-center">{c.booking.privacy}</p>
          </form>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ service page

function ServicePageView({ c, page, onBook }: { c: Content; page: ServicePage; onBook: (slug: string) => void }) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    setOpenFaq(0);
  }, [page.slug]);
  const others = c.pages.filter((p) => p.slug !== page.slug);
  return (
    <main className="w-full px-3 md:px-5 pt-24 md:pt-28 pb-24 md:pb-10">
      <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ""; }} className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-black mb-4">
        <span className="rotate-180 inline-block">→</span> {c.ui.back}
      </a>

      <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-1.5 md:gap-2">
        <div className="rounded-xl md:rounded-2xl bg-stone-50 p-5 md:p-10 flex flex-col justify-between min-h-[300px]">
          <h1 className="text-[clamp(2.5rem,7vw,6rem)] font-bold leading-[0.95]">{page.title}</h1>
          <p className="text-base md:text-lg text-neutral-700 mt-6 max-w-xl">{page.intro}</p>
          <div className="mt-8">
            <button onClick={() => onBook(page.slug)} className="px-6 py-4 btn3d btn3d-dark rounded-full text-white text-sm md:text-base font-bold">
              {c.ui.bookFree}
            </button>
          </div>
        </div>
        <div className="rounded-xl md:rounded-2xl bg-black text-white p-5 md:p-8">
          <p className="text-xs font-bold uppercase tracking-wider text-white/60 mb-4">{c.ui.pricesTitle}</p>
          <ul className="divide-y divide-white/15">
            {page.prices.map((p) => (
              <li key={p.name} className="flex items-baseline justify-between gap-4 py-3">
                <span className="text-sm md:text-base">{p.name}</span>
                <span className="text-sm md:text-base font-bold whitespace-nowrap tabular-nums">{p.price}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 md:gap-2 mt-1.5 md:mt-2">
        <div className="rounded-xl md:rounded-2xl bg-stone-50 p-5 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-5">{c.ui.stepsTitle}</h2>
          <ol className="flex flex-col gap-4">
            {page.steps.map((s, i) => (
              <li key={s.t} className="flex gap-4">
                <span className="w-9 h-9 shrink-0 rounded-full border border-black flex items-center justify-center text-sm font-bold">{i + 1}</span>
                <div>
                  <p className="font-bold">{s.t}</p>
                  <p className="text-sm text-neutral-700 mt-0.5">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-xl md:rounded-2xl bg-zinc-200 p-5 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-5">{c.ui.benefitsTitle}</h2>
          <ul className="flex flex-col gap-3">
            {page.benefits.map((b) => (
              <li key={b} className="flex gap-3 items-start">
                <span className="mt-1 w-5 h-5 shrink-0 rounded-full bg-black text-white flex items-center justify-center text-[10px]">✓</span>
                <span className="font-semibold">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {page.packages && (
        <div className="mt-1.5 md:mt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5 md:gap-2">
            {page.packages.map((p) => (
              <div key={p.name} className="rounded-xl md:rounded-2xl border border-black p-5 md:p-7 flex flex-col justify-between min-h-[180px]">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">{c.ui.packagesTitle}</p>
                  <h3 className="text-2xl md:text-3xl font-bold mt-2">{p.name}</h3>
                  <p className="text-sm text-neutral-700 mt-2">{p.includes}</p>
                </div>
                <p className="text-2xl md:text-3xl font-bold mt-5 tabular-nums">{p.price}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl md:rounded-2xl bg-stone-50 p-5 md:p-8 mt-1.5 md:mt-2">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">{c.ui.faqTitle}</h2>
        <div className="divide-y divide-black/10">
          {page.faq.map((f, i) => (
            <div key={f.q}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between gap-4 py-4 text-left font-bold">
                <span>{f.q}</span>
                <span className={`w-8 h-8 shrink-0 rounded-full border border-black flex items-center justify-center transition-transform ${openFaq === i ? "rotate-45" : ""}`}>+</span>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? "max-h-40 pb-4" : "max-h-0"}`}>
                <p className="text-sm md:text-base text-neutral-700">{f.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 md:mt-8 px-1">
        <p className="text-xs md:text-sm text-neutral-600 mb-2">{c.ui.otherServices}:</p>
        <div className="flex flex-wrap gap-2">
          {others.map((p) => (
            <a key={p.slug} href={`#/p/${p.slug}`} className="px-4 py-2 rounded-full border border-black text-xs md:text-sm font-semibold hover:bg-black hover:text-white transition-colors">
              {p.chip}
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}

// ------------------------------------------------------------------ app

function readLang(): Lang {
  try {
    const v = localStorage.getItem("lang");
    if (v === "ru" || v === "kz") return v;
  } catch {}
  return "ru";
}

export default function App() {
  const [lang, setLang] = useState<Lang>(readLang);
  const [route, setRoute] = useState<Route>(parseRoute);
  const [booking, setBooking] = useState<{ open: boolean; service: string }>({ open: false, service: "" });
  const c = CONTENT[lang];

  useEffect(() => {
    try {
      localStorage.setItem("lang", lang);
    } catch {}
    document.documentElement.lang = lang === "kz" ? "kk" : "ru";
    document.title = c.meta.title;
    const m = document.querySelector('meta[name="description"]');
    if (m) m.setAttribute("content", c.meta.description);
  }, [lang, c]);

  useEffect(() => {
    const onHash = () => {
      const r = parseRoute();
      setRoute(r);
      if (r.kind === "home" && window.location.hash && window.location.hash !== "#book") {
        window.setTimeout(() => scrollToAnchor(window.location.hash), 50);
      }
      if (window.location.hash === "#book") {
        setBooking({ open: true, service: "" });
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const openBook = useCallback((service = "") => setBooking({ open: true, service }), []);
  const closeBook = useCallback(() => setBooking((b) => ({ ...b, open: false })), []);
  const onBookVoid = useCallback(() => openBook(""), [openBook]);
  const toggleLang = () => setLang((l) => (l === "ru" ? "kz" : "ru"));

  const page = useMemo(() => (route.kind === "page" ? c.pages.find((p) => p.slug === route.slug) : undefined), [route, c]);

  return (
    <div className="bg-white">
      <Navbar c={c} lang={lang} onLang={toggleLang} onBook={onBookVoid} route={route} />

      {route.kind === "home" || !page ? (
        <>
          <HeroLoader />
          <ScrollWorldHero onBook={onBookVoid} scenes={c.heroScenes} hint={c.ui.hint} />
          <HeroMosaic c={c} />
          <GalleryMosaic c={c} />
          <ImplantSection c={c} onBook={onBookVoid} />
          <PhotosSection c={c} />
          <DoctorsSection c={c} />
          <PricesSection c={c} onBook={onBookVoid} />
        </>
      ) : (
        <ServicePageView c={c} page={page} onBook={openBook} />
      )}

      <Footer c={c} />
      <Floating c={c} onBook={onBookVoid} />
      <BookingModal c={c} open={booking.open} service={booking.service} onClose={closeBook} />
    </div>
  );
}
