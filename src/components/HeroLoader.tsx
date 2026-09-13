import { useEffect, useState } from "react";
import { clinic } from "../content";

// Полноэкранный оверлей, который скрывается по `loadeddata` первого клипа
// скролл-героя. На мобиле закрывает пустоту между постером и первым кадром
// видео. Внутри — логотип клиники (две строки) и тонкая пульсирующая полоса.
//
// Как ловим готовность:
//   - polling каждые 100 мс, пока не появится <video> внутри `.sw-scene`
//   - на него подписываемся `loadeddata` + `canplay` (что первое сработает)
// Safety: даже если ничего не пришло, скрываем через `MAX_MS`, чтобы не блокировать UX.
// Min-visible: держим лоадер ≥ MIN_MS чтобы не было флэшей "мелькнуло и пропало".

const FONT = "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const MIN_MS = 400;
const MAX_MS = 4000;

export default function HeroLoader() {
  const [hidden, setHidden] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    const mountedAt = performance.now();
    let done = false;
    let iv = 0;
    let safety = 0;

    const finish = () => {
      if (done) return;
      done = true;
      window.clearInterval(iv);
      window.clearTimeout(safety);
      const elapsed = performance.now() - mountedAt;
      const wait = Math.max(0, MIN_MS - elapsed);
      window.setTimeout(() => setHidden(true), wait);
    };

    let listening = false;
    const check = () => {
      // Постер первой сцены уже на экране - пустоты нет, лоадер можно убирать,
      // видео доедет следом и плавно заменит кадр. Иначе ждём первый кадр клипа.
      const img = document.querySelector<HTMLImageElement>(".sw-scene img");
      if (img && img.complete && img.naturalWidth > 0) {
        finish();
        return;
      }
      const v = document.querySelector<HTMLVideoElement>(".sw-scene video");
      if (!v) return;
      // readyState ≥ 2 = HAVE_CURRENT_DATA (первый кадр уже декодирован)
      if (v.readyState >= 2) {
        finish();
        return;
      }
      if (!listening) {
        listening = true;
        v.addEventListener("loadeddata", finish, { once: true });
        v.addEventListener("canplay", finish, { once: true });
      }
    };

    iv = window.setInterval(check, 100);
    safety = window.setTimeout(finish, MAX_MS);
    check();

    return () => {
      window.clearInterval(iv);
      window.clearTimeout(safety);
    };
  }, []);

  useEffect(() => {
    if (!hidden) return;
    // Полностью убираем из DOM после fade-out, чтобы не ловить клики.
    const t = window.setTimeout(() => setRemoved(true), 600);
    return () => window.clearTimeout(t);
  }, [hidden]);

  if (removed) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: hidden ? "none" : "auto",
        opacity: hidden ? 0 : 1,
        transition: "opacity 500ms ease",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 0.95,
            color: "#111",
            textAlign: "center",
            textTransform: "uppercase",
          }}
        >
          {clinic.logoTop}
          <br />
          {clinic.logoBottom}
        </div>
        <div
          style={{
            width: 56,
            height: 2,
            background: "#111",
            borderRadius: 9999,
            transformOrigin: "left center",
            animation: "sw-loader-bar 1.2s cubic-bezier(0.4,0,0.2,1) infinite",
          }}
        />
      </div>
      <style>{`
        @keyframes sw-loader-bar {
          0%   { transform: scaleX(0.15); opacity: 0.35; }
          50%  { transform: scaleX(1);    opacity: 1;    }
          100% { transform: scaleX(0.15); opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}
