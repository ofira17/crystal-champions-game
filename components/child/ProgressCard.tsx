import Link from "next/link";

interface Rect {
  left: string;
  top: string;
  width: string;
  height: string;
}

interface ProgressCardProps {
  imageSrc: string;
  href: string;
  current: number;
  target: number;
  barRect: Rect;
  counterRect: Rect;
  barColor?: string;
  barGlow?: string;
  label?: string;
}

export default function ProgressCard({
  imageSrc,
  href,
  current,
  target,
  barRect,
  counterRect,
  barColor = "linear-gradient(90deg, #facc15, #f59e0b)",
  barGlow = "rgba(251,191,36,0.8)",
  label,
}: ProgressCardProps) {
  const fillPct = Math.min(100, target > 0 ? (current / target) * 100 : 0);

  return (
    <Link
      href={href}
      aria-label={label}
      style={{
        /* Outer container — same dimensions as the old .daily-goals-card */
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textDecoration: "none",
        background: "transparent",
        border: "none",
        boxShadow: "none",
        padding: 0,
        height: "100%",
        width: "100%",
        minWidth: 0,
        position: "relative",
        overflow: "visible",
        borderRadius: 0,
        alignSelf: "stretch",
        cursor: "pointer",
        transition: "transform 0.15s",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt={label ?? ""}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "center",
          display: "block",
          pointerEvents: "none",
          background: "transparent",
        }}
      />

      {/*
        Overlay anchor.
        Both card images are 2048×685 (ratio ≈ 2.99).
        alignSelf:stretch gives this div the container's full height.
        aspectRatio then sets width = height × 2.99, so this div is
        exactly the same size as the image's rendered area inside contain.
        maxWidth:100% clamps it when the container is narrower (letterboxed case).
        All overlay % coords are therefore image-relative — viewport-independent.
      */}
      <div
        style={{
          alignSelf: "stretch",
          aspectRatio: "2172 / 724",
          maxWidth: "100%",
          position: "relative",
          pointerEvents: "none",
          zIndex: 2,
          flexShrink: 0,
        }}
      >
        {/* Progress bar */}
        <div
          style={{
            position: "absolute",
            left: barRect.left,
            top: barRect.top,
            width: barRect.width,
            height: barRect.height,
            borderRadius: 99,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${fillPct}%`,
              background: barColor,
              borderRadius: 99,
              boxShadow: `0 0 6px ${barGlow}`,
              transition: "width 0.4s ease",
            }}
          />
        </div>

        {/* Counter */}
        <div
          style={{
            position: "absolute",
            left: counterRect.left,
            top: counterRect.top,
            width: counterRect.width,
            height: counterRect.height,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            dir="ltr"
            style={{
              fontSize: "clamp(7px, 0.87vw, 11px)",
              fontWeight: 900,
              color: "#ffffff",
              textShadow: "0 1px 4px rgba(0,0,0,0.95)",
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {current}/{target}
          </span>
        </div>
      </div>
    </Link>
  );
}
