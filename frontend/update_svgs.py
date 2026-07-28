import os

def build_svg(page_type):
    neon_logic = ""
    labels = ""
    if page_type == 'reception':
        # Royal Theme Colors: Gold for vacant/selected, Deep Burgundy for full, Amethyst for heavy.
        neon_logic = """
                          const floorRooms = rooms.filter(r => getRoomFloor(r.room_number) === floorNum);
                          const vacantCount = floorRooms.filter(r => r.status === 'AVAILABLE').length;
                          const occupiedCount = floorRooms.filter(r => r.status === 'OCCUPIED').length;
                          const isFull = vacantCount === 0 && floorRooms.length > 0;
                          const isHeavy = occupiedCount > floorRooms.length * 0.7;
                          const neon = isSelected ? '#d4af37' : isFull ? '#722f37' : isHeavy ? '#8b7355' : '#d4af37';
                          const defaultColor = '#d4af37';
"""
        labels = """
                              <text x={p(w + 20, 0, z1 + h/2 - 2).x} y={p(w + 20, 0, z1 + h/2 - 2).y} fill={isSelected ? neon : '#94a3b8'} fontSize="9" fontWeight="900" fontFamily="monospace" textAnchor="end">L{floorNum}</text>
                              <text x={p(w + 20, 0, z1 + h/2 + 7).x} y={p(w + 20, 0, z1 + h/2 + 7).y} fill={isFull ? '#722f37' : isHeavy ? '#8b7355' : '#b8860b'} fontSize="6.5" fontWeight="800" fontFamily="monospace" textAnchor="end" opacity={0.9}>{vacantCount > 0 ? `${vacantCount} VACANT` : 'FULL'}</text>
"""
    else:
        neon_logic = """
                          const floorRooms = rooms.filter(r => getRoomFloor(r.room_number) === floorNum);
                          const dirtyCount = floorRooms.filter(r => r.status === 'MAINTENANCE').length;
                          const hasIssue = dirtyCount > 0;
                          const neon = isSelected ? '#c084fc' : hasIssue ? '#fbbf24' : '#a78bfa';
                          const defaultColor = '#c084fc';
"""
        labels = """
                              <text x={p(w + 20, 0, z1 + h/2 - 2).x} y={p(w + 20, 0, z1 + h/2 - 2).y} fill={isSelected ? neon : '#64748b'} fontSize="9" fontWeight="900" fontFamily="monospace" textAnchor="end">L{floorNum}</text>
                              <text x={p(w + 20, 0, z1 + h/2 + 7).x} y={p(w + 20, 0, z1 + h/2 + 7).y} fill={hasIssue ? '#fbbf24' : '#8b5cf6'} fontSize="6.5" fontWeight="800" fontFamily="monospace" textAnchor="end" opacity={0.9}>{hasIssue ? `${dirtyCount} DIRTY` : 'CLEAN'}</text>
"""

    template = """                {/* SVG Isometric Skyscraper — Exact Mockup Replica */}
                <div className="flex items-start gap-4 relative z-10 w-full justify-between">
                  {/* Building SVG */}
                  <div className="relative w-[240px] h-[440px] shrink-0 flex items-end">
                    <svg viewBox="0 0 240 440" className="w-full h-full" style={{ overflow: 'visible' }} xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <filter id="iso-glow">
                          <feGaussianBlur stdDeviation="3.5" result="blur" />
                          <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                        <filter id="iso-glow-soft">
                          <feGaussianBlur stdDeviation="2" result="blur" />
                          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                        <filter id="iso-glow-hard">
                          <feGaussianBlur stdDeviation="1.5" result="blur" />
                          <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                        <linearGradient id="iso-lf" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#1e293b"/>
                          <stop offset="100%" stopColor="#0f172a"/>
                        </linearGradient>
                        <linearGradient id="iso-rf" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#0f172a"/>
                          <stop offset="100%" stopColor="#020617"/>
                        </linearGradient>
                        <linearGradient id="iso-tf" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#334155"/>
                          <stop offset="100%" stopColor="#1e293b"/>
                        </linearGradient>
                        <linearGradient id="glass-refl" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15"/>
                          <stop offset="35%" stopColor="#ffffff" stopOpacity="0"/>
                          <stop offset="65%" stopColor="#ffffff" stopOpacity="0"/>
                          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.08"/>
                        </linearGradient>
                      </defs>

                      {(() => {
                        const sorted = [...uniqueFloors].sort((a, b) => a - b).slice(0, 6);
                        const h = 58;
                        const w = 78;
                        const d = 58;
                        const cx = 135;
                        const baseCy = 390;

                        const mapIso = (u, v, z) => ({
                          x: cx - u + v,
                          y: baseCy - u / 2 - v / 2 - z
                        });
                        const ptStr = (...pts) => pts.map(p => `${p.x},${p.y}`).join(' ');
                        const p = (u, v, z) => mapIso(u, v, z);

                        // ─── GROUND PLATFORM ───
                        const groundColor = sorted.length > 0 ? (selectedFloor === sorted[0] ? '<GROUND_COLOR>' : '<GROUND_COLOR>77') : '<GROUND_COLOR>77';
                        const ground = (
                          <g key="ground">
                            {/* Outer Sidewalk / Plinth */}
                            <polygon points={ptStr(p(-24, -24, -6), p(w + 24, -24, -6), p(w + 24, d + 24, -6), p(-24, d + 24, -6))} fill="#0b0e14" stroke="#1e293b" strokeWidth="1" />
                            <polygon points={ptStr(p(-18, -18, -3), p(w + 18, -18, -3), p(w + 18, d + 18, -3), p(-18, d + 18, -3))} fill="#0f172a" stroke="#334155" strokeWidth="0.5" />
                            <polygon points={ptStr(p(-16, -16, 0), p(w + 16, -16, 0), p(w + 16, d + 16, 0), p(-16, d + 16, 0))} fill="#1e293b" stroke="#475569" strokeWidth="1" />
                            
                            {/* Base aesthetic edge line */}
                            <polyline points={ptStr(p(w + 4, 0, 0), p(0, 0, 0), p(0, d + 4, 0))} fill="none" stroke={groundColor} strokeWidth="2" opacity="0.85" filter="url(#iso-glow-soft)" />
                            
                            {/* Ambient Light Spill on ground */}
                            <polygon points={ptStr(p(-16, -16, 0), p(30, -16, 0), p(30, 30, 0), p(-16, 30, 0))} fill={groundColor} opacity="0.05" />
                            <ellipse cx={cx} cy={baseCy} rx="75" ry="18" fill={groundColor} opacity="0.04" />
                            
                            {/* Ground Planters / Bollards */}
                            {[50, 65, 80].map(u => (
                              <g key={`bollard-${u}`}>
                                <polygon points={ptStr(p(u, -8, 0), p(u+4, -8, 0), p(u+4, -4, 0), p(u, -4, 0))} fill="#334155" />
                                <polygon points={ptStr(p(u, -8, 0), p(u+4, -8, 0), p(u+4, -8, 6), p(u, -8, 6))} fill="#1e293b" />
                                <polygon points={ptStr(p(u, -8, 6), p(u+4, -8, 6), p(u+4, -4, 6), p(u, -4, 6))} fill="#475569" />
                                {/* Bollard Light */}
                                <polygon points={ptStr(p(u+1, -7, 4), p(u+3, -7, 4), p(u+3, -7, 5), p(u+1, -7, 5))} fill="#d4af37" filter="url(#iso-glow-soft)" />
                              </g>
                            ))}
                            {[35, 50, 65].map(v => (
                              <g key={`bollard-v-${v}`}>
                                <polygon points={ptStr(p(-8, v, 0), p(-4, v, 0), p(-4, v+4, 0), p(-8, v+4, 0))} fill="#334155" />
                                <polygon points={ptStr(p(-8, v, 0), p(-8, v+4, 0), p(-8, v+4, 6), p(-8, v, 6))} fill="#1e293b" />
                                <polygon points={ptStr(p(-8, v, 6), p(-4, v, 6), p(-4, v+4, 6), p(-8, v+4, 6))} fill="#475569" />
                                {/* Bollard Light */}
                                <polygon points={ptStr(p(-7, v+1, 4), p(-7, v+3, 4), p(-7, v+3, 5), p(-7, v+1, 5))} fill="#d4af37" filter="url(#iso-glow-soft)" />
                              </g>
                            ))}
                          </g>
                        );

                        // ─── HELPER FOR INTERIOR DEPTH ───
                        const drawInterior = (u1, u2, v1, v2, zBot, zTop, isLeftFace) => {
                            const depth = 8;
                            if (isLeftFace) {
                                return (
                                    <g>
                                        <polygon points={ptStr(p(u1, 2, zBot), p(u2, 2, zBot), p(u2, depth, zBot), p(u1, depth, zBot))} fill="#0f172a" />
                                        <polygon points={ptStr(p(u1, 2, zTop), p(u2, 2, zTop), p(u2, depth, zTop), p(u1, depth, zTop))} fill="#020617" />
                                        <polygon points={ptStr(p(u1, depth, zBot), p(u2, depth, zBot), p(u2, depth, zTop), p(u1, depth, zTop))} fill="#1e293b" />
                                        <polygon points={ptStr(p(u2, 2, zBot), p(u2, depth, zBot), p(u2, depth, zTop), p(u2, 2, zTop))} fill="#0b1120" />
                                        <polygon points={ptStr(p(u1, 2, zBot), p(u1, depth, zBot), p(u1, depth, zTop), p(u1, 2, zTop))} fill="#172033" />
                                    </g>
                                );
                            } else {
                                return (
                                    <g>
                                        <polygon points={ptStr(p(2, v1, zBot), p(2, v2, zBot), p(depth, v2, zBot), p(depth, v1, zBot))} fill="#0f172a" />
                                        <polygon points={ptStr(p(2, v1, zTop), p(2, v2, zTop), p(depth, v2, zTop), p(depth, v1, zTop))} fill="#020617" />
                                        <polygon points={ptStr(p(depth, v1, zBot), p(depth, v2, zBot), p(depth, v2, zTop), p(depth, v1, zTop))} fill="#1e293b" />
                                        <polygon points={ptStr(p(2, v2, zBot), p(depth, v2, zBot), p(depth, v2, zTop), p(2, v2, zTop))} fill="#0b1120" />
                                        <polygon points={ptStr(p(2, v1, zBot), p(depth, v1, zBot), p(depth, v1, zTop), p(2, v1, zTop))} fill="#172033" />
                                    </g>
                                );
                            }
                        };

                        // ─── FLOORS ───
                        const floorBlocks = sorted.map((floorNum, fi) => {
                          const isSelected = selectedFloor === floorNum;
                          const isGroundLobby = fi === 0;
<NEON_LOGIC>
                          const z1 = fi * h;
                          const z2 = z1 + h;

                          const topFace = ptStr(p(0, 0, z2), p(w, 0, z2), p(w, d, z2), p(0, d, z2));
                          const leftFace = ptStr(p(0, 0, z1), p(w, 0, z1), p(w, 0, z2), p(0, 0, z2));
                          const rightFace = ptStr(p(0, 0, z1), p(0, d, z1), p(0, d, z2), p(0, 0, z2));

                          // Main Corner Bay Window
                          const vBandPoly = ptStr(p(0, 0, z1 + 14), p(32, 0, z1 + 14), p(32, 0, z2 - 12), p(0, 0, z2 - 12), p(0, 32, z2 - 12), p(0, 32, z1 + 14));
                          
                          // Ledge (Overhang) for the window
                          const vLedgeBot = ptStr(p(-2, -2, z1 + 12), p(34, -2, z1 + 12), p(34, 0, z1 + 12), p(0, 0, z1 + 12), p(0, 34, z1 + 12), p(-2, 34, z1 + 12));
                          const vLedgeTop = ptStr(p(-2, -2, z2 - 12), p(34, -2, z2 - 12), p(34, 0, z2 - 12), p(0, 0, z2 - 12), p(0, 34, z2 - 12), p(-2, 34, z2 - 12));

                          // Side Windows
                          const lWin1 = ptStr(p(40, 0, z1+16), p(52, 0, z1+16), p(52, 0, z2-14), p(40, 0, z2-14));
                          const lWin2 = ptStr(p(60, 0, z1+16), p(72, 0, z1+16), p(72, 0, z2-14), p(60, 0, z2-14));
                          const rWin1 = ptStr(p(0, 40, z1+16), p(0, 52, z1+16), p(0, 52, z2-14), p(0, 40, z2-14));

                          // Window Mullions (Frames)
                          const frameColor = "#0f172a";
                          const vMullions = (
                            <>
                              <line x1={p(16, 0, z1+14).x} y1={p(16, 0, z1+14).y} x2={p(16, 0, z2-12).x} y2={p(16, 0, z2-12).y} stroke={frameColor} strokeWidth="1.5" />
                              <line x1={p(0, 0, z1+14).x} y1={p(0, 0, z1+14).y} x2={p(0, 0, z2-12).x} y2={p(0, 0, z2-12).y} stroke={frameColor} strokeWidth="2.5" />
                              <line x1={p(0, 16, z1+14).x} y1={p(0, 16, z1+14).y} x2={p(0, 16, z2-12).x} y2={p(0, 16, z2-12).y} stroke={frameColor} strokeWidth="1.5" />
                              {/* Horizontal transoms */}
                              <polyline points={ptStr(p(32, 0, z1+30), p(0, 0, z1+30), p(0, 32, z1+30))} fill="none" stroke={frameColor} strokeWidth="1" />
                            </>
                          );

                          // Vertical 3D Louvers / Ribs
                          const louvers = [34, 36, 38, 54, 56, 58].map(u => (
                              <g key={`louver-${u}`}>
                                  <polygon points={ptStr(p(u, -1.5, z1), p(u+1, -1.5, z1), p(u+1, -1.5, z2), p(u, -1.5, z2))} fill="#334155" />
                                  <polygon points={ptStr(p(u+1, 0, z1), p(u+1, -1.5, z1), p(u+1, -1.5, z2), p(u+1, 0, z2))} fill="#0f172a" />
                                  <polygon points={ptStr(p(u, 0, z1), p(u, -1.5, z1), p(u, -1.5, z2), p(u, 0, z2))} fill="#1e293b" />
                              </g>
                          ));
                          const louversRight = [34, 36, 38, 54, 56].map(v => (
                              <g key={`louver-r-${v}`}>
                                  <polygon points={ptStr(p(-1.5, v, z1), p(-1.5, v+1, z1), p(-1.5, v+1, z2), p(-1.5, v, z2))} fill="#334155" />
                                  <polygon points={ptStr(p(0, v+1, z1), p(-1.5, v+1, z1), p(-1.5, v+1, z2), p(0, v+1, z2))} fill="#1e293b" />
                                  <polygon points={ptStr(p(0, v, z1), p(-1.5, v, z1), p(-1.5, v, z2), p(0, v, z2))} fill="#0f172a" />
                              </g>
                          ));

                          // Interior Room Depth
                          const cornerInterior = (
                              <g>
                                  <polygon points={ptStr(p(2, 2, z1+14), p(30, 2, z1+14), p(30, 30, z1+14), p(2, 30, z1+14))} fill="#0f172a" />
                                  <polygon points={ptStr(p(2, 2, z2-12), p(30, 2, z2-12), p(30, 30, z2-12), p(2, 30, z2-12))} fill="#020617" />
                                  <polygon points={ptStr(p(2, 30, z1+14), p(30, 30, z1+14), p(30, 30, z2-12), p(2, 30, z2-12))} fill="#1e293b" />
                                  <polygon points={ptStr(p(30, 2, z1+14), p(30, 30, z1+14), p(30, 30, z2-12), p(30, 2, z2-12))} fill="#172033" />
                                  {/* Inner glowing lamp/accent */}
                                  <line x1={p(15, 28, z1+14).x} y1={p(15, 28, z1+14).y} x2={p(15, 28, z2-12).x} y2={p(15, 28, z2-12).y} stroke={neon} strokeWidth="2" opacity="0.1" filter="url(#iso-glow-soft)" />
                              </g>
                          );

                          // Ground Floor Entrance Canopy Override
                          const entranceCanopy = isGroundLobby ? (
                              <g>
                                  {/* Grand Canopy Roof */}
                                  <polygon points={ptStr(p(-12, -12, z1+38), p(40, -12, z1+38), p(40, 40, z1+38), p(-12, 40, z1+38))} fill="#334155" stroke="#475569" strokeWidth="0.5" />
                                  <polygon points={ptStr(p(-12, -12, z1+34), p(40, -12, z1+34), p(40, -12, z1+38), p(-12, -12, z1+38))} fill="#1e293b" />
                                  <polygon points={ptStr(p(-12, -12, z1+34), p(-12, 40, z1+34), p(-12, 40, z1+38), p(-12, -12, z1+38))} fill="#0f172a" />
                                  {/* Canopy Edge */}
                                  <polyline points={ptStr(p(40, -12, z1+38), p(-12, -12, z1+38), p(-12, 40, z1+38))} fill="none" stroke={neon} strokeWidth="1.5" opacity="0.6" />
                                  
                                  {/* Glass Entrance Doors */}
                                  <polygon points={ptStr(p(0, 0, z1), p(24, 0, z1), p(24, 0, z1+34), p(0, 0, z1+34))} fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
                                  <polygon points={ptStr(p(0, 0, z1), p(0, 24, z1), p(0, 24, z1+34), p(0, 0, z1+34))} fill="#0f172a" stroke="#334155" strokeWidth="0.5" />
                                  <polygon points={ptStr(p(0, 0, z1), p(24, 0, z1), p(24, 0, z1+34), p(0, 0, z1+34))} fill="url(#glass-refl)" />
                                  <polygon points={ptStr(p(0, 0, z1), p(0, 24, z1), p(0, 24, z1+34), p(0, 0, z1+34))} fill="url(#glass-refl)" />
                                  
                                  {/* Door frames */}
                                  <line x1={p(12, 0, z1).x} y1={p(12, 0, z1).y} x2={p(12, 0, z1+34).x} y2={p(12, 0, z1+34).y} stroke="#0f172a" strokeWidth="1.5" />
                                  <line x1={p(0, 12, z1).x} y1={p(0, 12, z1).y} x2={p(0, 12, z1+34).x} y2={p(0, 12, z1+34).y} stroke="#0f172a" strokeWidth="1.5" />
                                  
                                  {/* Entrance Inner Glow */}
                                  <polygon points={ptStr(p(0, 0, z1+2), p(24, 0, z1+2), p(24, 0, z1+30), p(0, 0, z1+30))} fill={neon} opacity="0.1" />
                                  <polygon points={ptStr(p(0, 0, z1+2), p(0, 24, z1+2), p(0, 24, z1+30), p(0, 0, z1+30))} fill={neon} opacity="0.05" />
                              </g>
                          ) : null;

                          return (
                            <g key={floorNum} className="cursor-pointer" onClick={() => handleFloorClick(floorNum)}
                              style={{
                                transform: isSelected ? 'translate(0, -6px)' : 'translate(0,0)',
                                transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)'
                              }}
                            >
                              <polygon points={topFace} fill="url(#iso-tf)" stroke="#334155" strokeWidth="0.5" />
                              <polygon points={leftFace} fill="url(#iso-lf)" stroke="#1e293b" strokeWidth="0.5" />
                              <polygon points={rightFace} fill="url(#iso-rf)" stroke="#0f172a" strokeWidth="0.5" />

                              {/* Architectural Cladding Panel Lines */}
                              <line x1={p(0, 0, z1+10).x} y1={p(0, 0, z1+10).y} x2={p(w, 0, z1+10).x} y2={p(w, 0, z1+10).y} stroke="#cbd5e1" strokeWidth="0.5" opacity="0.1" />
                              <line x1={p(0, 0, z2-10).x} y1={p(0, 0, z2-10).y} x2={p(w, 0, z2-10).x} y2={p(w, 0, z2-10).y} stroke="#cbd5e1" strokeWidth="0.5" opacity="0.1" />
                              <line x1={p(0, 0, z1+10).x} y1={p(0, 0, z1+10).y} x2={p(0, d, z1+10).x} y2={p(0, d, z1+10).y} stroke="#cbd5e1" strokeWidth="0.5" opacity="0.1" />
                              <line x1={p(0, 0, z2-10).x} y1={p(0, 0, z2-10).y} x2={p(0, d, z2-10).x} y2={p(0, d, z2-10).y} stroke="#cbd5e1" strokeWidth="0.5" opacity="0.1" />

                              {/* Physical Louvers (External details) */}
                              {louvers}
                              {louversRight}

                              {/* Interior Depths (Behind Glass) */}
                              {!isSelected && !isGroundLobby && cornerInterior}
                              {!isSelected && drawInterior(40, 52, 0, 0, z1+16, z2-14, true)}
                              {!isSelected && drawInterior(60, 72, 0, 0, z1+16, z2-14, true)}
                              {!isSelected && drawInterior(0, 0, 40, 52, z1+16, z2-14, false)}

                              {/* Ground Floor overrides corner window */}
                              {isGroundLobby ? entranceCanopy : (
                                <>
                                  <polygon points={vLedgeBot} fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
                                  <polygon points={vLedgeTop} fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
                                </>
                              )}

                              {/* Windows Base Fills */}
                              {isSelected ? (
                                <>
                                  {!isGroundLobby && <polygon points={vBandPoly} fill={neon} opacity="0.8" />}
                                  <polygon points={lWin1} fill={neon} opacity="0.8" />
                                  <polygon points={lWin2} fill={neon} opacity="0.8" />
                                  <polygon points={rWin1} fill={neon} opacity="0.8" />
                                </>
                              ) : (
                                <>
                                  {!isGroundLobby && <polygon points={vBandPoly} fill={`${neon}22`} stroke={neon} strokeWidth="1.5" />}
                                  {!isGroundLobby && <polygon points={vBandPoly} fill="url(#glass-refl)" />}
                                  
                                  <polygon points={lWin1} fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
                                  <polygon points={lWin1} fill="url(#glass-refl)" />
                                  <polygon points={lWin2} fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
                                  <polygon points={lWin2} fill="url(#glass-refl)" />
                                  <polygon points={rWin1} fill="#0f172a" stroke="#334155" strokeWidth="0.5" />
                                  <polygon points={rWin1} fill="url(#glass-refl)" />
                                </>
                              )}

                              {/* Window Frames / Mullions */}
                              {!isGroundLobby && vMullions}
                              <line x1={p(46, 0, z1+16).x} y1={p(46, 0, z1+16).y} x2={p(46, 0, z2-14).x} y2={p(46, 0, z2-14).y} stroke="#0f172a" strokeWidth="1" />
                              <line x1={p(66, 0, z1+16).x} y1={p(66, 0, z1+16).y} x2={p(66, 0, z2-14).x} y2={p(66, 0, z2-14).y} stroke="#0f172a" strokeWidth="1" />
                              <line x1={p(0, 46, z1+16).x} y1={p(0, 46, z1+16).y} x2={p(0, 46, z2-14).x} y2={p(0, 46, z2-14).y} stroke="#0f172a" strokeWidth="1" />

                              {/* Glass Reflections OVER everything when selected for realism */}
                              {isSelected && (
                                <>
                                  {!isGroundLobby && <polygon points={vBandPoly} fill="url(#glass-refl)" />}
                                  <polygon points={lWin1} fill="url(#glass-refl)" />
                                  <polygon points={lWin2} fill="url(#glass-refl)" />
                                  <polygon points={rWin1} fill="url(#glass-refl)" />
                                </>
                              )}

                              {/* Floor Divider Line */}
                              {fi < sorted.length - 1 && (
                                <polyline points={ptStr(p(w, 0, z2), p(0, 0, z2), p(0, d, z2))} fill="none" stroke="#0f172a" strokeWidth="2" />
                              )}
                              
                              {/* Labels */}
<LABELS>
                              
                              {/* Edge Highlights */}
                              <polyline points={ptStr(p(w, 0, z2), p(0, 0, z2), p(0, d, z2))} fill="none" stroke={neon} strokeWidth={isSelected ? "1.5" : "0.5"} opacity={isSelected ? 0.9 : 0.3} />
                              <line x1={p(w, 0, z1).x} y1={p(w, 0, z1).y} x2={p(w, 0, z2).x} y2={p(w, 0, z2).y} stroke={neon} strokeWidth={isSelected ? "1.5" : "0.5"} opacity={isSelected ? 0.8 : 0.2} />
                              <line x1={p(0, d, z1).x} y1={p(0, d, z1).y} x2={p(0, d, z2).x} y2={p(0, d, z2).y} stroke={neon} strokeWidth={isSelected ? "1.5" : "0.5"} opacity={isSelected ? 0.8 : 0.2} />
                            </g>
                          );
                        });

                        // ─── PENTHOUSE ───
                        const maxZ = sorted.length * h;
                        
                        // Tier 1
                        const pt1_z1 = maxZ, pt1_z2 = maxZ + 26;
                        const pt1_top = ptStr(p(8, 8, pt1_z2), p(w - 8, 8, pt1_z2), p(w - 8, d - 8, pt1_z2), p(8, d - 8, pt1_z2));
                        const pt1_left = ptStr(p(8, 8, pt1_z1), p(w - 8, 8, pt1_z1), p(w - 8, 8, pt1_z2), p(8, 8, pt1_z2));
                        const pt1_right = ptStr(p(8, 8, pt1_z1), p(8, d - 8, pt1_z1), p(8, d - 8, pt1_z2), p(8, 8, pt1_z2));

                        // Tier 2
                        const pt2_z1 = pt1_z2, pt2_z2 = pt2_z1 + 16;
                        const pt2_top = ptStr(p(18, 18, pt2_z2), p(w - 24, 18, pt2_z2), p(w - 24, d - 20, pt2_z2), p(18, d - 20, pt2_z2));
                        const pt2_left = ptStr(p(18, 18, pt2_z1), p(w - 24, 18, pt2_z1), p(w - 24, 18, pt2_z2), p(18, 18, pt2_z2));
                        const pt2_right = ptStr(p(18, 18, pt2_z1), p(18, d - 20, pt2_z1), p(18, d - 20, pt2_z2), p(18, 18, pt2_z2));

                        const defColor = sorted.length > 0 ? ('<GROUND_COLOR>') : '#d4af37';

                        const penthouse = (
                          <g key="penthouse">
                            {/* Base Penthouse */}
                            <polygon points={pt1_top} fill="url(#iso-tf)" stroke="#334155" strokeWidth="0.5" />
                            <polygon points={pt1_left} fill="url(#iso-lf)" stroke="#1e293b" strokeWidth="0.5" />
                            <polygon points={pt1_right} fill="url(#iso-rf)" stroke="#0f172a" strokeWidth="0.5" />
                            
                            {/* Base Penthouse Windows */}
                            <polygon points={ptStr(p(14, 8, pt1_z1+8), p(w-14, 8, pt1_z1+8), p(w-14, 8, pt1_z2-6), p(14, 8, pt1_z2-6))} fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
                            <polygon points={ptStr(p(14, 8, pt1_z1+8), p(w-14, 8, pt1_z1+8), p(w-14, 8, pt1_z2-6), p(14, 8, pt1_z2-6))} fill="url(#glass-refl)" />
                            <line x1={p(30, 8, pt1_z1+8).x} y1={p(30, 8, pt1_z1+8).y} x2={p(30, 8, pt1_z2-6).x} y2={p(30, 8, pt1_z2-6).y} stroke="#0f172a" strokeWidth="1" />
                            <line x1={p(50, 8, pt1_z1+8).x} y1={p(50, 8, pt1_z1+8).y} x2={p(50, 8, pt1_z2-6).x} y2={p(50, 8, pt1_z2-6).y} stroke="#0f172a" strokeWidth="1" />

                            {/* Top Penthouse */}
                            <polygon points={pt2_top} fill="url(#iso-tf)" stroke="#334155" strokeWidth="0.5" />
                            <polygon points={pt2_left} fill="url(#iso-lf)" stroke="#1e293b" strokeWidth="0.5" />
                            <polygon points={pt2_right} fill="url(#iso-rf)" stroke="#0f172a" strokeWidth="0.5" />
                            
                            {/* Industrial AC / Vent Unit on Roof */}
                            <g className="roof-ac-unit">
                                <polygon points={ptStr(p(40, 24, pt2_z2+8), p(52, 24, pt2_z2+8), p(52, 32, pt2_z2+8), p(40, 32, pt2_z2+8))} fill="#475569" stroke="#64748b" strokeWidth="0.5" />
                                <polygon points={ptStr(p(40, 24, pt2_z2), p(52, 24, pt2_z2), p(52, 24, pt2_z2+8), p(40, 24, pt2_z2+8))} fill="#334155" stroke="#64748b" strokeWidth="0.5" />
                                <polygon points={ptStr(p(40, 24, pt2_z2), p(40, 32, pt2_z2), p(40, 32, pt2_z2+8), p(40, 24, pt2_z2+8))} fill="#1e293b" stroke="#64748b" strokeWidth="0.5" />
                                <circle cx={p(46, 28, pt2_z2+8).x} cy={p(46, 28, pt2_z2+8).y} r="2.5" fill="#0f172a" />
                                <line x1={p(43, 28, pt2_z2+8).x} y1={p(43, 28, pt2_z2+8).y} x2={p(49, 28, pt2_z2+8).x} y2={p(49, 28, pt2_z2+8).y} stroke="#64748b" strokeWidth="0.5" />
                                <line x1={p(46, 25, pt2_z2+8).x} y1={p(46, 25, pt2_z2+8).y} x2={p(46, 31, pt2_z2+8).x} y2={p(46, 31, pt2_z2+8).y} stroke="#64748b" strokeWidth="0.5" />
                            </g>
                            
                            {/* Satellite Dish */}
                            <g className="satellite-dish">
                                <line x1={p(30, 32, pt2_z1).x} y1={p(30, 32, pt2_z1).y} x2={p(30, 32, pt2_z1+6).x} y2={p(30, 32, pt2_z1+6).y} stroke="#94a3b8" strokeWidth="1" />
                                <ellipse cx={p(30, 32, pt2_z1+6).x} cy={p(30, 32, pt2_z1+6).y} rx="4" ry="2" fill="#e2e8f0" transform={`rotate(-15 ${p(30, 32, pt2_z1+6).x} ${p(30, 32, pt2_z1+6).y})`} />
                                <circle cx={p(30, 32, pt2_z1+6).x} cy={p(30, 32, pt2_z1+6).y} r="0.5" fill="#ef4444" />
                            </g>
                            
                            {/* Helipad / Landing Pad Markings */}
                            <circle cx={p(28, 26, pt2_z2).x} cy={p(28, 26, pt2_z2).y} r="10" fill="none" stroke={defColor} strokeWidth="0.5" opacity="0.5" transform={`scale(1, 0.5) translate(0, ${p(28, 26, pt2_z2).y})`} />
                            <text x={p(28, 26, pt2_z2).x} y={p(28, 26, pt2_z2).y + 2} fill={defColor} fontSize="4" fontWeight="bold" textAnchor="middle" opacity="0.8">H</text>
                            
                            {/* Antenna with Blinking Aviation Light */}
                            <line x1={p(24, 24, pt2_z2).x} y1={p(24, 24, pt2_z2).y} x2={p(24, 24, pt2_z2 + 30).x} y2={p(24, 24, pt2_z2 + 30).y} stroke="#94a3b8" strokeWidth="1.5" />
                            <line x1={p(24, 24, pt2_z2 + 20).x} y1={p(24, 24, pt2_z2 + 20).y} x2={p(28, 24, pt2_z2 + 20).x} y2={p(28, 24, pt2_z2 + 20).y} stroke="#94a3b8" strokeWidth="1" />
                            <circle cx={p(24, 24, pt2_z2 + 30).x} cy={p(24, 24, pt2_z2 + 30).y} r="2.5" fill="#ef4444">
                                <animate attributeName="opacity" values="1;0;1" dur="1.5s" repeatCount="indefinite" />
                            </circle>
                            <circle cx={p(24, 24, pt2_z2 + 30).x} cy={p(24, 24, pt2_z2 + 30).y} r="1" fill="#ffffff">
                                <animate attributeName="opacity" values="1;0;1" dur="1.5s" repeatCount="indefinite" />
                            </circle>
                            {/* Secondary Blinking Light on Penthouse Corner */}
                            <circle cx={p(18, 18, pt2_z2).x} cy={p(18, 18, pt2_z2).y} r="1.5" fill="#ef4444">
                                <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
                            </circle>
                            <circle cx={p(w - 24, 18, pt2_z2).x} cy={p(w - 24, 18, pt2_z2).y} r="1.5" fill="#ef4444">
                                <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
                            </circle>
                          </g>
                        );

                        return <>{ground}{floorBlocks}{penthouse}</>;
                      })()}
                    </svg>
                  </div>"""

    ground_col = '#d4af37' if page_type == 'reception' else '#c084fc'
    
    res = template.replace('<NEON_LOGIC>', neon_logic).replace('<LABELS>', labels).replace('<GROUND_COLOR>', ground_col)
    return res

def process_file(filepath, page_type):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    start_marker = "{/* SVG Isometric Skyscraper — Exact Mockup Replica */}"
    end_marker = "{/* ── Floor Selector Pill Buttons ── */}"
    
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)
    
    if start_idx == -1 or end_idx == -1:
        print(f"Markers not found in {filepath}!")
        return
        
    new_svg = build_svg(page_type)
    
    end_line_start = content.rfind('\n', 0, end_idx)
    
    new_content = content[:start_idx] + new_svg + "\n\n                  " + content[end_line_start + 1:]
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Updated {filepath}")

process_file('D:/smart_hotel/frontend/src/pages/Rooms.tsx', 'rooms')
process_file('D:/smart_hotel/frontend/src/pages/Reception.tsx', 'reception')
