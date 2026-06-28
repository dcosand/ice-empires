import type { ReactElement } from "react";
import type { ProductionKind } from "../types/game";

// Inline-SVG art for each facility / unit. Vector so it stays crisp at any size
// and needs no image assets or licensing. Palette matches the ice/navy/gold
// world theme. Each scene draws in a 0 0 64 64 viewBox over a rounded tile.

type Scene = () => ReactElement;

const TILE = (
  <>
    <defs>
      <linearGradient id="iaBg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#143049" />
        <stop offset="1" stopColor="#0a1622" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="64" height="64" rx="10" fill="url(#iaBg)" />
    <ellipse cx="32" cy="8" rx="30" ry="12" fill="#7dd3fc" opacity="0.12" />
  </>
);

const FACILITY_SCENES: Record<string, Scene> = {
  "outdoor-rink": () => (
    <g>
      <ellipse cx="32" cy="38" rx="23" ry="14" fill="#bfe3f4" />
      <ellipse cx="32" cy="38" rx="23" ry="14" fill="none" stroke="#eef6fb" strokeWidth="2.5" />
      <line x1="32" y1="25" x2="32" y2="51" stroke="#ef6f6f" strokeWidth="2" />
      <circle cx="20" cy="38" r="2" fill="#3b6fa0" />
      <circle cx="44" cy="38" r="2" fill="#3b6fa0" />
      <rect x="26" y="20" width="12" height="6" rx="1" fill="none" stroke="#ef6f6f" strokeWidth="2" />
    </g>
  ),
  "equipment-shed": () => (
    <g>
      <polygon points="14,32 32,18 50,32" fill="#8a6a3c" />
      <rect x="18" y="32" width="28" height="22" fill="#b2904c" />
      <rect x="29" y="40" width="8" height="14" rx="1" fill="#5a4326" />
      <line x1="48" y1="50" x2="42" y2="26" stroke="#e6eef6" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="48" y1="50" x2="52" y2="50" stroke="#e6eef6" strokeWidth="2.4" strokeLinecap="round" />
    </g>
  ),
  clubhouse: () => (
    <g>
      <rect x="40" y="16" width="5" height="12" fill="#5a6b7d" />
      <circle cx="42" cy="13" r="2.4" fill="#cfe0ee" opacity="0.7" />
      <circle cx="45" cy="9" r="3" fill="#cfe0ee" opacity="0.5" />
      <polygon points="16,32 32,18 48,32" fill="#3a5a7d" />
      <rect x="19" y="32" width="26" height="22" fill="#18293b" />
      <rect x="29" y="42" width="8" height="12" fill="#0d1824" />
      <rect x="22" y="36" width="6" height="6" fill="#f2c14e" />
      <rect x="36" y="36" width="6" height="6" fill="#f2c14e" />
    </g>
  ),
  "volunteer-coaching-bench": () => (
    <g>
      <rect x="12" y="40" width="26" height="4" rx="1" fill="#7d6438" />
      <rect x="12" y="36" width="26" height="3" rx="1" fill="#9a7c45" />
      <line x1="15" y1="44" x2="15" y2="52" stroke="#5a4326" strokeWidth="3" />
      <line x1="35" y1="44" x2="35" y2="52" stroke="#5a4326" strokeWidth="3" />
      <rect x="40" y="24" width="14" height="18" rx="2" fill="#eae4d2" stroke="#4a4636" strokeWidth="1.5" />
      <rect x="45" y="22" width="4" height="3" rx="1" fill="#9aa0a6" />
      <line x1="43" y1="30" x2="51" y2="30" stroke="#9aa6b0" strokeWidth="1.5" />
      <line x1="43" y1="34" x2="51" y2="34" stroke="#9aa6b0" strokeWidth="1.5" />
    </g>
  ),
  "local-notice-board": () => (
    <g>
      <line x1="18" y1="30" x2="18" y2="54" stroke="#5a4326" strokeWidth="3" />
      <line x1="46" y1="30" x2="46" y2="54" stroke="#5a4326" strokeWidth="3" />
      <rect x="13" y="18" width="38" height="22" rx="2" fill="#8a6a3c" stroke="#5a4326" strokeWidth="2" />
      <rect x="18" y="22" width="10" height="8" fill="#eef6fb" transform="rotate(-4 23 26)" />
      <rect x="34" y="24" width="11" height="9" fill="#e6dfca" transform="rotate(5 39 28)" />
      <circle cx="23" cy="23" r="1.4" fill="#ef6f6f" />
      <circle cx="40" cy="25" r="1.4" fill="#38bdf8" />
    </g>
  ),
};

const UNIT_SCENES: Record<string, Scene> = {
  "pond-scout": () => (
    <g>
      <circle cx="24" cy="34" r="9" fill="#18293b" stroke="#38bdf8" strokeWidth="2.5" />
      <circle cx="40" cy="34" r="9" fill="#18293b" stroke="#38bdf8" strokeWidth="2.5" />
      <rect x="30" y="31" width="4" height="6" fill="#38bdf8" />
      <circle cx="24" cy="34" r="4" fill="#7fc7e3" />
      <circle cx="40" cy="34" r="4" fill="#7fc7e3" />
      <path d="M14 50 l4 -2 M22 52 l4 -2 M30 50 l4 -2" stroke="#cfe8f5" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </g>
  ),
  "rink-evangelist": () => (
    <g>
      <polygon points="16,30 34,24 34,42 16,36" fill="#f2c14e" stroke="#b8923a" strokeWidth="1.5" />
      <rect x="12" y="31" width="6" height="4" fill="#b8923a" />
      <path d="M40 26 a10 10 0 0 1 0 14 M44 22 a16 16 0 0 1 0 22" fill="none" stroke="#7dd3fc" strokeWidth="2.4" strokeLinecap="round" />
    </g>
  ),
  "basic-scout": () => (
    <g>
      <rect x="16" y="16" width="24" height="30" rx="2" fill="#eae4d2" stroke="#4a4636" strokeWidth="1.5" />
      <line x1="20" y1="23" x2="36" y2="23" stroke="#9aa6b0" strokeWidth="2" />
      <line x1="20" y1="29" x2="36" y2="29" stroke="#9aa6b0" strokeWidth="2" />
      <line x1="20" y1="35" x2="30" y2="35" stroke="#9aa6b0" strokeWidth="2" />
      <circle cx="40" cy="40" r="9" fill="#7fc7e3" opacity="0.35" stroke="#38bdf8" strokeWidth="2.5" />
      <line x1="46" y1="46" x2="52" y2="52" stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" />
    </g>
  ),
  "local-coach": () => (
    <g>
      <polygon points="34,24 44,52 24,52" fill="#f2864e" />
      <polygon points="34,24 39,38 29,38" fill="#ffb27a" opacity="0.6" />
      <circle cx="20" cy="26" r="8" fill="#cfd8e0" stroke="#7d8c98" strokeWidth="2" />
      <rect x="26" y="23" width="6" height="6" rx="1" fill="#cfd8e0" stroke="#7d8c98" strokeWidth="2" />
      <circle cx="20" cy="26" r="2.5" fill="#3a4654" />
    </g>
  ),
  recruiter: () => (
    <g>
      <rect x="14" y="30" width="18" height="9" rx="4.5" fill="#e7b48b" transform="rotate(-12 23 34)" />
      <rect x="32" y="30" width="18" height="9" rx="4.5" fill="#c8946a" transform="rotate(12 41 34)" />
      <circle cx="32" cy="34" r="5" fill="#f2c14e" />
      <path d="M44 18 l4 4 l8 -9" fill="none" stroke="#5fd08a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  "regional-scout": () => (
    <g>
      <polygon points="12,24 26,20 40,24 52,20 52,46 40,50 26,46 12,50" fill="#cdb98a" stroke="#8a6a3c" strokeWidth="1.5" />
      <line x1="26" y1="20" x2="26" y2="46" stroke="#8a6a3c" strokeWidth="1.5" />
      <line x1="40" y1="24" x2="40" y2="50" stroke="#8a6a3c" strokeWidth="1.5" />
      <path d="M36 26 a6 6 0 1 1 -0.01 0 z" fill="#ef6f6f" />
      <path d="M36 44 c-5 -8 -6 -10 -6 -14 a6 6 0 0 1 12 0 c0 4 -1 6 -6 14 z" fill="#ef6f6f" />
      <circle cx="36" cy="30" r="2.4" fill="#fff" />
    </g>
  ),
  "development-envoy": () => (
    <g>
      <path d="M16 48 L30 34 L38 42 L52 26" fill="none" stroke="#5fd08a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points="52,26 52,36 44,28" fill="#5fd08a" />
      <rect x="22" y="38" width="22" height="15" rx="2" fill="#3a5a7d" stroke="#22384f" strokeWidth="1.5" />
      <rect x="29" y="34" width="8" height="5" rx="2" fill="none" stroke="#22384f" strokeWidth="2" />
      <line x1="22" y1="45" x2="44" y2="45" stroke="#22384f" strokeWidth="1.5" />
    </g>
  ),
};

const FALLBACK: Scene = () => (
  <g>
    <circle cx="32" cy="34" r="13" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
    <text x="32" y="40" textAnchor="middle" fontSize="16" fill="#7dd3fc" fontWeight="700">
      ?
    </text>
  </g>
);

export function ItemArt({
  kind,
  id,
  className,
}: {
  kind: ProductionKind;
  id: string;
  className?: string;
}) {
  const scene =
    (kind === "facility" ? FACILITY_SCENES[id] : UNIT_SCENES[id]) ?? FALLBACK;
  return (
    <svg
      className={className ? `item-art ${className}` : "item-art"}
      viewBox="0 0 64 64"
      role="img"
      aria-hidden="true"
    >
      {TILE}
      {scene()}
    </svg>
  );
}
