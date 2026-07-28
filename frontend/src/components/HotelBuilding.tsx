import React from 'react';

interface FloorData {
  floorNum: number;
  label: string;
  statusCount: number;
  statusLabel: string;
  statusColor: 'green' | 'purple' | 'amber' | 'rose';
}

interface HotelBuildingProps {
  floors: FloorData[];
  selectedFloor: number | null;
  onFloorClick: (floorNum: number) => void;
  accentColor?: 'green' | 'purple'; // green for reception, purple for rooms
}

const NEON_GREEN = '#00ff88';
const NEON_PURPLE = '#c084fc';
const NEON_AMBER = '#fbbf24';
const NEON_ROSE = '#f43f5e';

function getNeonColor(color: 'green' | 'purple' | 'amber' | 'rose') {
  if (color === 'green') return NEON_GREEN;
  if (color === 'purple') return NEON_PURPLE;
  if (color === 'amber') return NEON_AMBER;
  return NEON_ROSE;
}

const HotelBuilding: React.FC<HotelBuildingProps> = ({
  floors,
  selectedFloor,
  onFloorClick,
  accentColor = 'green',
}) => {
  const accent = accentColor === 'green' ? NEON_GREEN : NEON_PURPLE;

  // Sort floors top-to-bottom for rendering (highest floor first)
  const sorted = [...floors].sort((a, b) => b.floorNum - a.floorNum);
  const maxFloors = Math.min(sorted.length, 6);
  const floorsToRender = sorted.slice(0, maxFloors);

  // Each floor block height (in SVG units)
  const BLOCK_H = 54;
  const BLOCK_W_HALF = 78;
  const SKEW = 14; // vertical skew amount for isometric look
  // Building starts at y=60 (top of first/topmost floor face)
  const BASE_Y = 64;

  // For each floor idx (0=top), compute the polygon vertices
  // isometric box: left-face, right-face, top-face
  function getFloorCoords(idx: number) {
    const top = BASE_Y + idx * BLOCK_H;
    const mid = 110; // horizontal center x

    // top-face: diamond at top of the box
    const topLeft = { x: mid - BLOCK_W_HALF, y: top + SKEW };
    const topMid = { x: mid, y: top };
    const topRight = { x: mid + BLOCK_W_HALF, y: top + SKEW };
    const topBack = { x: mid, y: top + SKEW * 2 };

    // left face bottom
    const botLeft = { x: mid - BLOCK_W_HALF, y: top + SKEW + BLOCK_H };
    const botMid = { x: mid, y: top + BLOCK_H };

    // right face bottom
    const botRight = { x: mid + BLOCK_W_HALF, y: top + SKEW + BLOCK_H };

    return { topLeft, topMid, topRight, topBack, botLeft, botMid, botRight, top, mid };
  }

  function pts(...points: { x: number; y: number }[]) {
    return points.map(p => `${p.x},${p.y}`).join(' ');
  }

  // SVG total height needed
  const svgH = BASE_Y + maxFloors * BLOCK_H + SKEW + 40;

  return (
    <svg
      viewBox={`0 0 220 ${svgH}`}
      className="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Neon glow filter — accent */}
        <filter id="hb-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="hb-glow-strong" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Left face gradients */}
        <linearGradient id="hb-lf-base" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c2333" />
          <stop offset="100%" stopColor="#0b0f1a" />
        </linearGradient>
        <linearGradient id="hb-lf-sel-green" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#042a1a" />
          <stop offset="100%" stopColor="#011510" />
        </linearGradient>
        <linearGradient id="hb-lf-sel-purple" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e0845" />
          <stop offset="100%" stopColor="#0c0420" />
        </linearGradient>

        {/* Right face gradients */}
        <linearGradient id="hb-rf-base" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d1220" />
          <stop offset="100%" stopColor="#060914" />
        </linearGradient>
        <linearGradient id="hb-rf-sel-green" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#021c12" />
          <stop offset="100%" stopColor="#010c08" />
        </linearGradient>
        <linearGradient id="hb-rf-sel-purple" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#11042e" />
          <stop offset="100%" stopColor="#070214" />
        </linearGradient>

        {/* Top face gradient */}
        <linearGradient id="hb-tf-base" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#273344" />
          <stop offset="100%" stopColor="#19253a" />
        </linearGradient>
        <linearGradient id="hb-tf-sel-green" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#053d26" />
          <stop offset="100%" stopColor="#02201a" />
        </linearGradient>
        <linearGradient id="hb-tf-sel-purple" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2e0a6a" />
          <stop offset="100%" stopColor="#160538" />
        </linearGradient>
      </defs>

      {/* ─── PENTHOUSE / ROOFTOP CAP ─── */}
      {floorsToRender.length > 0 && (() => {
        const { topLeft, topMid, topRight, topBack } = getFloorCoords(0);
        const capH = 22;
        // Smaller box on top = penthouse
        const ph = 0.55;
        const pTopLeft = { x: topMid.x - BLOCK_W_HALF * ph, y: topLeft.y - capH + SKEW * ph };
        const pTopMid = { x: topMid.x, y: topLeft.y - capH };
        const pTopRight = { x: topMid.x + BLOCK_W_HALF * ph, y: topLeft.y - capH + SKEW * ph };
        const pTopBack = { x: topMid.x, y: topLeft.y - capH + SKEW * ph * 2 };

        return (
          <g>
            {/* Penthouse left face */}
            <polygon
              points={pts(pTopLeft, topLeft, topBack, pTopBack)}
              fill="#141c2c"
              stroke="#263347"
              strokeWidth="0.8"
            />
            {/* Penthouse right face */}
            <polygon
              points={pts(pTopBack, topRight, topBack, pTopBack)}
              fill="#0a1120"
              stroke="#1e293b"
              strokeWidth="0.8"
            />
            {/* Wait — simplified: just a smaller box */}
            {/* Penthouse top face */}
            <polygon
              points={pts(pTopLeft, pTopMid, pTopRight, pTopBack)}
              fill="#1e2d42"
              stroke="#2d4060"
              strokeWidth="0.8"
            />
            {/* Penthouse neon edge outline */}
            <polyline
              points={pts(pTopLeft, pTopMid, pTopRight)}
              fill="none"
              stroke={accent}
              strokeWidth="1"
              opacity="0.6"
              filter="url(#hb-glow)"
            />
            {/* Antenna/spire */}
            <line
              x1={topMid.x} y1={topLeft.y - capH}
              x2={topMid.x} y2={topLeft.y - capH - 18}
              stroke="#4a5568"
              strokeWidth="1.2"
            />
            <circle
              cx={topMid.x} cy={topLeft.y - capH - 18}
              r="3"
              fill={accent}
              filter="url(#hb-glow-strong)"
            />
            {/* Small box on penthouse top */}
            <rect
              x={topMid.x - 8} y={topLeft.y - capH - 6}
              width="16" height="6"
              rx="1"
              fill="#1a2438"
              stroke="#334155"
              strokeWidth="0.6"
            />
          </g>
        );
      })()}

      {/* ─── FLOOR BLOCKS ─── */}
      {floorsToRender.map((fd, idx) => {
        const { topLeft, topMid, topRight, topBack, botLeft, botMid, botRight } = getFloorCoords(idx);
        const isSelected = selectedFloor === fd.floorNum;
        const neon = isSelected ? accent : getNeonColor(fd.statusColor);
        const neonOpacity = isSelected ? 1 : 0.55;

        const lfGrad = isSelected
          ? (accentColor === 'green' ? 'url(#hb-lf-sel-green)' : 'url(#hb-lf-sel-purple)')
          : 'url(#hb-lf-base)';
        const rfGrad = isSelected
          ? (accentColor === 'green' ? 'url(#hb-rf-sel-green)' : 'url(#hb-rf-sel-purple)')
          : 'url(#hb-rf-base)';
        const tfGrad = isSelected
          ? (accentColor === 'green' ? 'url(#hb-tf-sel-green)' : 'url(#hb-tf-sel-purple)')
          : 'url(#hb-tf-base)';

        // Neon chevron V-shape positions on left face (like in mockup)
        // Each floor has 2 V-chevron rows
        const leftMidY = (topLeft.y + botLeft.y) / 2;
        // Chevron points on left face: V-shape going from left to center
        const chev1L = { x: topLeft.x + 6, y: leftMidY - 8 };
        const chev1M = { x: topLeft.x + 26, y: leftMidY };
        const chev1R = { x: topLeft.x + 6, y: leftMidY + 8 };

        // Window positions on left face
        const winLY = (topLeft.y + botLeft.y) / 2 - 4;
        const win1 = { x: topLeft.x + 10, y: winLY };
        const win2 = { x: topLeft.x + 26, y: winLY - 2.5 };

        // Window positions on right face
        const winRY = (topRight.y + botRight.y) / 2 - 4;
        const win3 = { x: topRight.x - 28, y: winRY - 2.5 };
        const win4 = { x: topRight.x - 12, y: winRY - 5 };

        const winFill = isSelected
          ? `${neon}55`
          : `${neon}28`;
        const winStroke = neon;

        return (
          <g
            key={fd.floorNum}
            className="cursor-pointer"
            onClick={() => onFloorClick(fd.floorNum)}
            style={{
              transform: isSelected ? 'translate(-6px, -4px)' : 'translate(0,0)',
              transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            {/* Left face */}
            <polygon
              points={pts(topLeft, botLeft, botMid, topBack)}
              fill={lfGrad}
              stroke={isSelected ? neon : '#1e293b'}
              strokeWidth={isSelected ? '1' : '0.7'}
            />
            {/* Right face */}
            <polygon
              points={pts(topBack, topRight, botRight, botMid)}
              fill={rfGrad}
              stroke={isSelected ? neon : '#131c30'}
              strokeWidth={isSelected ? '1' : '0.7'}
            />
            {/* Top face */}
            <polygon
              points={pts(topLeft, topMid, topRight, topBack)}
              fill={tfGrad}
              stroke={isSelected ? neon : '#1e293b'}
              strokeWidth={isSelected ? '1.2' : '0.7'}
            />

            {/* ── Neon chevron V on left face ── */}
            <polyline
              points={`${chev1L.x},${chev1L.y} ${chev1M.x},${chev1M.y} ${chev1L.x},${chev1R.y}`}
              fill="none"
              stroke={neon}
              strokeWidth={isSelected ? '1.8' : '1'}
              opacity={neonOpacity}
              filter={isSelected ? 'url(#hb-glow)' : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* ── Windows left face ── */}
            <polygon
              points={`${win1.x},${win1.y + 8} ${win1.x + 13},${win1.y + 6} ${win1.x + 13},${win1.y} ${win1.x},${win1.y + 2}`}
              fill={winFill}
              stroke={winStroke}
              strokeWidth="0.5"
              opacity="0.9"
            />
            <polygon
              points={`${win2.x},${win2.y + 8} ${win2.x + 13},${win2.y + 5.5} ${win2.x + 13},${win2.y - 0.5} ${win2.x},${win2.y + 2}`}
              fill={winFill}
              stroke={winStroke}
              strokeWidth="0.5"
              opacity="0.9"
            />

            {/* ── Windows right face ── */}
            <polygon
              points={`${win3.x},${win3.y + 2} ${win3.x + 13},${win3.y} ${win3.x + 13},${win3.y + 7} ${win3.x},${win3.y + 9}`}
              fill={winFill}
              stroke={winStroke}
              strokeWidth="0.5"
              opacity="0.8"
            />
            <polygon
              points={`${win4.x},${win4.y + 2} ${win4.x + 13},${win4.y} ${win4.x + 13},${win4.y + 8} ${win4.x},${win4.y + 10}`}
              fill={winFill}
              stroke={winStroke}
              strokeWidth="0.5"
              opacity="0.8"
            />

            {/* ── Neon top-edge highlight when selected ── */}
            {isSelected && (
              <>
                <polyline
                  points={pts(topLeft, topMid, topRight)}
                  fill="none"
                  stroke={neon}
                  strokeWidth="2"
                  filter="url(#hb-glow-strong)"
                  opacity="0.95"
                />
                <line
                  x1={topMid.x} y1={topMid.y}
                  x2={topMid.x} y2={botMid.y}
                  stroke={neon}
                  strokeWidth="1.5"
                  filter="url(#hb-glow)"
                  opacity="0.8"
                />
                {/* Bottom neon edge */}
                <polyline
                  points={pts(botLeft, botMid, botRight)}
                  fill="none"
                  stroke={neon}
                  strokeWidth="1.2"
                  filter="url(#hb-glow)"
                  opacity="0.6"
                />
              </>
            )}

            {/* ── Non-selected neon edge (subtle) ── */}
            {!isSelected && (
              <polyline
                points={pts(topLeft, topMid, topRight)}
                fill="none"
                stroke={neon}
                strokeWidth="0.8"
                opacity="0.3"
              />
            )}

            {/* ── Floor label pointer ── */}
            <line
              x1={topLeft.x}
              y1={(topLeft.y + botLeft.y) / 2}
              x2={topLeft.x - 14}
              y2={(topLeft.y + botLeft.y) / 2}
              stroke={isSelected ? neon : '#2d3a4f'}
              strokeWidth="0.8"
              strokeDasharray="2,2"
            />
            <text
              x={topLeft.x - 16}
              y={(topLeft.y + botLeft.y) / 2 - 3}
              fill={isSelected ? neon : '#64748b'}
              fontSize="7.5"
              fontWeight="800"
              fontFamily="monospace"
              textAnchor="end"
            >
              {fd.label}
            </text>
            <text
              x={topLeft.x - 16}
              y={(topLeft.y + botLeft.y) / 2 + 7}
              fill={isSelected ? neon : getNeonColor(fd.statusColor)}
              fontSize="6.5"
              fontWeight="700"
              fontFamily="monospace"
              textAnchor="end"
              opacity={isSelected ? 1 : 0.75}
            >
              {fd.statusLabel}
            </text>
          </g>
        );
      })}

      {/* ─── GROUND PLATFORM / BASE ─── */}
      {floorsToRender.length > 0 && (() => {
        const last = floorsToRender.length - 1;
        const { botLeft, botMid, botRight } = getFloorCoords(last);
        const padY = 8;
        return (
          <g>
            {/* ground shadow diamond */}
            <ellipse
              cx={botMid.x}
              cy={botMid.y + padY + 4}
              rx={BLOCK_W_HALF + 10}
              ry={SKEW + 4}
              fill={accent}
              opacity="0.06"
              filter="url(#hb-glow)"
            />
            {/* ground neon line */}
            <polyline
              points={pts(
                { x: botLeft.x - 8, y: botLeft.y + padY + SKEW },
                { x: botMid.x, y: botMid.y + padY },
                { x: botRight.x + 8, y: botRight.y + padY + SKEW }
              )}
              fill="none"
              stroke={accent}
              strokeWidth="1.5"
              opacity="0.35"
              filter="url(#hb-glow)"
            />
          </g>
        );
      })()}
    </svg>
  );
};

export default HotelBuilding;
