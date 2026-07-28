import React, { useEffect, useState } from 'react';
import API from '../services/api';
import { RefreshCcw, Sparkles, Wrench, Brush, X, Building2, Hotel, CheckCircle2 } from 'lucide-react';

interface Room {
  id: number;
  room_number: string;
  room_type: string;
  status: string;
  capacity: number;
}

const Rooms: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Floor Map States
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [roomFilter, setRoomFilter] = useState<'all' | 'maintenance' | 'occupied' | 'vacant'>('maintenance');
  const [roomPage, setRoomPage] = useState<number>(0);
  const [floorTransitioning, setFloorTransitioning] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
  } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await API.get('rooms/');
      setRooms(response.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch rooms queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getRoomFloor = (roomNumber: string): number => {
    const num = parseInt(roomNumber);
    if (!isNaN(num)) {
      return Math.floor(num / 100);
    }
    return 1;
  };

  const handleFloorClick = (floorNum: number) => {
    setFloorTransitioning(true);
    setSelectedFloor(floorNum);
    setRoomPage(0);
    setTimeout(() => {
      setFloorTransitioning(false);
    }, 250);
  };

  const handleBackToBuilding = () => {
    setSelectedFloor(null);
  };

  const handleCleanRoom = async (roomId: number, roomNumber: string) => {
    try {
      setError(null);
      await API.patch(`rooms/${roomId}/`, { status: 'AVAILABLE' });
      setSuccess(`Room ${roomNumber} has been cleaned and marked AVAILABLE.`);

      // Update local state
      setRooms(prev => prev.map(r => r.id === roomId ? { ...r, status: 'AVAILABLE' } : r));

      setTimeout(() => {
        setSuccess(null);
      }, 4000);
    } catch (err: any) {
      setError(`Failed to clean room ${roomNumber}: ` + (err.response?.data?.detail || err.message));
    }
  };

  // Helper variables
  const uniqueFloors = Array.from(new Set(rooms.map(r => getRoomFloor(r.room_number)))).sort((a, b) => a - b);

  // Overall statistics
  const totalDirtyRooms = rooms.filter(r => r.status === 'MAINTENANCE').length;

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 animate-fade-in pb-12">

      <style>{`
        @keyframes buildingEntrance {
          from { opacity: 0; transform: perspective(1000px) rotateX(20deg) translateY(40px) scale(0.92); }
          to   { opacity: 1; transform: perspective(1000px) rotateX(0deg) translateY(0px) scale(1); }
        }
        @keyframes lobbySlideIn {
          from { opacity: 0; transform: translateY(32px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0px) scale(1); }
        }
        .hotel-building-3d {
          perspective: 1200px;
          perspective-origin: 50% 40%;
        }
        .building-body {
          transform-style: preserve-3d;
          animation: buildingEntrance 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .building-floor-group {
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .building-floor-group:hover {
          transform: translate(-10px, -5px);
        }
        .lobby-view {
          animation: lobbySlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        
        /* 3D Lobby Corridor Styles */
        .lobby-corridor-container {
          perspective: 1200px;
          perspective-origin: 50% 25%;
          display: flex;
          justify-content: space-between;
          align-items: stretch;
          min-height: 480px;
          max-height: 520px;
          background: radial-gradient(circle at 50% 15%, #0d1222 0%, #010307 100%);
          overflow-y: auto;
          overflow-x: hidden;
          position: relative;
          border-radius: 1.25rem;
          padding: 2.5rem 1.25rem;
          box-shadow: inset 0 0 60px rgba(0,0,0,0.9);
          border: 1px solid rgba(255,255,255,0.03);
          transform-style: preserve-3d;
        }
        .lobby-corridor-container::-webkit-scrollbar {
          width: 5px;
        }
        .lobby-corridor-container::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.01);
        }
        .lobby-corridor-container::-webkit-scrollbar-thumb {
          background: rgba(236,72,153,0.25);
          border-radius: 9px;
        }
        .lobby-corridor-container::-webkit-scrollbar-thumb:hover {
          background: rgba(236,72,153,0.4);
        }
        .corridor-floor {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%) rotateX(75deg);
          transform-origin: top center;
          width: 140px;
          background: linear-gradient(180deg, rgba(236,72,153,0.04) 0%, rgba(236,72,153,0.15) 100%);
          border-left: 2px dashed rgba(236,72,153,0.25);
          border-right: 2px dashed rgba(236,72,153,0.25);
          box-shadow: 0 0 40px rgba(236,72,153,0.08);
          pointer-events: none;
          z-index: 0;
        }
        .corridor-floor-lines {
          position: absolute;
          inset: 0;
          background: linear-gradient(0deg, transparent 29px, rgba(236,72,153,0.04) 30px);
          background-size: 100% 30px;
        }
        .corridor-wall-left {
          width: 44%;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          transform: rotateY(24deg) translateZ(10px);
          transform-origin: left center;
          transform-style: preserve-3d;
          z-index: 10;
        }
        .corridor-wall-right {
          width: 44%;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          transform: rotateY(-24deg) translateZ(10px);
          transform-origin: right center;
          transform-style: preserve-3d;
          z-index: 10;
        }
        .room-cabinet-3d {
          position: relative;
          transform-style: preserve-3d;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          height: 110px;
          flex-shrink: 0;
        }
        .corridor-wall-left .room-cabinet-3d:hover {
          transform: translateZ(30px) translateX(10px);
        }
        .corridor-wall-right .room-cabinet-3d:hover {
          transform: translateZ(30px) translateX(-10px);
        }
        .room-cabinet-front {
          position: absolute;
          inset: 0;
          border-radius: 16px;
          padding: 0.75rem;
          box-shadow: 0 10px 24px rgba(0,0,0,0.6);
          z-index: 2;
          transform-style: preserve-3d;
          transition: all 0.35s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .room-cabinet-side {
          position: absolute;
          top: 6px;
          bottom: 6px;
          width: 14px;
          z-index: 1;
          box-shadow: inset -2px 0 10px rgba(0,0,0,0.8);
          transition: all 0.35s ease;
        }
        .corridor-wall-left .room-cabinet-side {
          right: -12px;
          transform: rotateY(90deg);
          transform-origin: left center;
        }
        .corridor-wall-right .room-cabinet-side {
          left: -12px;
          transform: rotateY(-90deg);
          transform-origin: right center;
        }
      `}</style>

      {/* Header Panel */}
      <div className="glass-panel p-4 sm:p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-pink-500/10 rounded-2xl border border-pink-500/20 text-pink-400 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
            <Brush className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">Janitorial Dispatch Map</h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-0.5 sm:mt-1">3D structure mapping, live floor cleaning dispatch, and room maintenance status.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-[10px] sm:text-xs font-bold text-pink-400">
            <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-pink-400 animate-pulse" />
            LIVE LINK ACTIVE
          </div>
          <button
            onClick={fetchData}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-900 border border-white/5 text-gray-400 hover:bg-slate-800 transition cursor-pointer"
            title="Refresh list"
          >
            <RefreshCcw className={`w-4 h-4 sm:w-5 sm:h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-amber-500/20 bg-amber-500/[0.02] flex items-center justify-between col-span-1">
          <div className="space-y-1">
            <p className="text-[10px] sm:text-xs font-bold text-amber-500 uppercase tracking-widest">Total Pending Cleans</p>
            <p className="text-2xl sm:text-3xl font-black text-white">{totalDirtyRooms}</p>
            <p className="text-[10px] text-gray-500">Requires Sweeping & Sanitizing</p>
          </div>
          <div className="p-2.5 sm:p-3 bg-amber-500/10 rounded-xl text-amber-400">
            <Wrench className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
        </div>

        <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-pink-500/20 bg-pink-500/[0.02] flex items-center justify-between col-span-1">
          <div className="space-y-1">
            <p className="text-[10px] sm:text-xs font-bold text-pink-400 uppercase tracking-widest">Clean & Available Rooms</p>
            <p className="text-2xl sm:text-3xl font-black text-white">{rooms.filter(r => r.status === 'AVAILABLE').length}</p>
            <p className="text-[10px] text-gray-500">Ready for Guest Check-in</p>
          </div>
          <div className="p-2.5 sm:p-3 bg-pink-500/10 rounded-xl text-pink-400">
            <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7 text-pink-400" />
          </div>
        </div>

        <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.02] flex items-center justify-between col-span-1 sm:col-span-2 lg:col-span-1">
          <div className="space-y-1">
            <p className="text-[10px] sm:text-xs font-bold text-indigo-400 uppercase tracking-widest">Guest Occupied Rooms</p>
            <p className="text-2xl sm:text-3xl font-black text-white">{rooms.filter(r => r.status === 'OCCUPIED').length}</p>
            <p className="text-[10px] text-gray-500">Guests In Stay</p>
          </div>
          <div className="p-2.5 sm:p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
            <Hotel className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-400" />
          </div>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-sm font-semibold flex items-center gap-2 animate-fade-in shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm font-semibold">
          {error}
        </div>
      )}

      {/* ═══ 3D DISPATCH PANEL: Building Left | Map Right ═══ */}
      <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
        <div className="flex min-h-[520px]">

          {/* ═══ LEFT PANEL: Isometric Building & Level List ═══ */}
          <div className="hidden lg:flex flex-col items-center w-[350px] shrink-0 border-r border-white/5 p-5 bg-[#03050d] relative overflow-hidden">
            {/* Background grid */}
            <div className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(circle at 50% 30%, rgba(192,132,252,0.05) 0%, transparent 60%),
                  linear-gradient(rgba(192,132,252,0.015) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(192,132,252,0.015) 1px, transparent 1px)`,
                backgroundSize: '100% 100%, 24px 24px, 24px 24px'
              }}
            />

            <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 text-center relative z-10">
              BUILDING STRUCTURE
            </div>

            {/* SVG Isometric Skyscraper — Exact Mockup Replica */}
            <div className="flex items-start gap-4 relative z-10 w-full justify-between">
              {/* Building SVG */}
              <div className="relative w-[240px] h-[440px] shrink-0 flex items-end">
                <svg viewBox="0 0 240 440" className="w-full h-full" style={{ overflow: 'visible' }} xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <filter id="iso-glow">
                      <feGaussianBlur stdDeviation="3.5" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="iso-glow-soft">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="iso-glow-hard">
                      <feGaussianBlur stdDeviation="1.5" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <linearGradient id="iso-lf" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#1e293b" />
                      <stop offset="100%" stopColor="#0f172a" />
                    </linearGradient>
                    <linearGradient id="iso-rf" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#0f172a" />
                      <stop offset="100%" stopColor="#020617" />
                    </linearGradient>
                    <linearGradient id="iso-tf" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#334155" />
                      <stop offset="100%" stopColor="#1e293b" />
                    </linearGradient>
                    <linearGradient id="glass-refl" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
                      <stop offset="35%" stopColor="#ffffff" stopOpacity="0" />
                      <stop offset="65%" stopColor="#ffffff" stopOpacity="0" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0.08" />
                    </linearGradient>
                  </defs>

                  {(() => {
                    const sorted = [...uniqueFloors].sort((a, b) => a - b).slice(0, 6);
                    const h = 58;
                    const w = 78;
                    const d = 58;
                    const cx = 135;
                    const baseCy = 390;

                    const mapIso = (u: number, v: number, z: number) => ({
                      x: cx - u + v,
                      y: baseCy - u / 2 - v / 2 - z
                    });
                    const ptStr = (...pts: Array<{x: number, y: number}>) => pts.map(p => `${p.x},${p.y}`).join(' ');
                    const p = (u: number, v: number, z: number) => mapIso(u, v, z);

                    // ─── GROUND PLATFORM ───
                    const groundColor = sorted.length > 0 ? (selectedFloor === sorted[0] ? '#c084fc' : '#c084fc77') : '#c084fc77';
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
                            <polygon points={ptStr(p(u, -8, 0), p(u + 4, -8, 0), p(u + 4, -4, 0), p(u, -4, 0))} fill="#334155" />
                            <polygon points={ptStr(p(u, -8, 0), p(u + 4, -8, 0), p(u + 4, -8, 6), p(u, -8, 6))} fill="#1e293b" />
                            <polygon points={ptStr(p(u, -8, 6), p(u + 4, -8, 6), p(u + 4, -4, 6), p(u, -4, 6))} fill="#475569" />
                            {/* Bollard Light */}
                            <polygon points={ptStr(p(u + 1, -7, 4), p(u + 3, -7, 4), p(u + 3, -7, 5), p(u + 1, -7, 5))} fill="#d4af37" filter="url(#iso-glow-soft)" />
                          </g>
                        ))}
                        {[35, 50, 65].map(v => (
                          <g key={`bollard-v-${v}`}>
                            <polygon points={ptStr(p(-8, v, 0), p(-4, v, 0), p(-4, v + 4, 0), p(-8, v + 4, 0))} fill="#334155" />
                            <polygon points={ptStr(p(-8, v, 0), p(-8, v + 4, 0), p(-8, v + 4, 6), p(-8, v, 6))} fill="#1e293b" />
                            <polygon points={ptStr(p(-8, v, 6), p(-4, v, 6), p(-4, v + 4, 6), p(-8, v + 4, 6))} fill="#475569" />
                            {/* Bollard Light */}
                            <polygon points={ptStr(p(-7, v + 1, 4), p(-7, v + 3, 4), p(-7, v + 3, 5), p(-7, v + 1, 5))} fill="#d4af37" filter="url(#iso-glow-soft)" />
                          </g>
                        ))}
                      </g>
                    );

                    // ─── HELPER FOR INTERIOR DEPTH ───
                    const drawInterior = (u1: number, u2: number, v1: number, v2: number, zBot: number, zTop: number, isLeftFace: boolean) => {
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

                      const floorRooms = rooms.filter(r => getRoomFloor(r.room_number) === floorNum);
                      const dirtyCount = floorRooms.filter(r => r.status === 'MAINTENANCE').length;
                      const hasIssue = dirtyCount > 0;
                      const neon = isSelected ? '#c084fc' : hasIssue ? '#fbbf24' : '#a78bfa';

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
                      const lWin1 = ptStr(p(40, 0, z1 + 16), p(52, 0, z1 + 16), p(52, 0, z2 - 14), p(40, 0, z2 - 14));
                      const lWin2 = ptStr(p(60, 0, z1 + 16), p(72, 0, z1 + 16), p(72, 0, z2 - 14), p(60, 0, z2 - 14));
                      const rWin1 = ptStr(p(0, 40, z1 + 16), p(0, 52, z1 + 16), p(0, 52, z2 - 14), p(0, 40, z2 - 14));

                      // Window Mullions (Frames)
                      const frameColor = "#0f172a";
                      const vMullions = (
                        <>
                          <line x1={p(16, 0, z1 + 14).x} y1={p(16, 0, z1 + 14).y} x2={p(16, 0, z2 - 12).x} y2={p(16, 0, z2 - 12).y} stroke={frameColor} strokeWidth="1.5" />
                          <line x1={p(0, 0, z1 + 14).x} y1={p(0, 0, z1 + 14).y} x2={p(0, 0, z2 - 12).x} y2={p(0, 0, z2 - 12).y} stroke={frameColor} strokeWidth="2.5" />
                          <line x1={p(0, 16, z1 + 14).x} y1={p(0, 16, z1 + 14).y} x2={p(0, 16, z2 - 12).x} y2={p(0, 16, z2 - 12).y} stroke={frameColor} strokeWidth="1.5" />
                          {/* Horizontal transoms */}
                          <polyline points={ptStr(p(32, 0, z1 + 30), p(0, 0, z1 + 30), p(0, 32, z1 + 30))} fill="none" stroke={frameColor} strokeWidth="1" />
                        </>
                      );

                      // Vertical 3D Louvers / Ribs
                      const louvers = [34, 36, 38, 54, 56, 58].map(u => (
                        <g key={`louver-${u}`}>
                          <polygon points={ptStr(p(u, -1.5, z1), p(u + 1, -1.5, z1), p(u + 1, -1.5, z2), p(u, -1.5, z2))} fill="#334155" />
                          <polygon points={ptStr(p(u + 1, 0, z1), p(u + 1, -1.5, z1), p(u + 1, -1.5, z2), p(u + 1, 0, z2))} fill="#0f172a" />
                          <polygon points={ptStr(p(u, 0, z1), p(u, -1.5, z1), p(u, -1.5, z2), p(u, 0, z2))} fill="#1e293b" />
                        </g>
                      ));
                      const louversRight = [34, 36, 38, 54, 56].map(v => (
                        <g key={`louver-r-${v}`}>
                          <polygon points={ptStr(p(-1.5, v, z1), p(-1.5, v + 1, z1), p(-1.5, v + 1, z2), p(-1.5, v, z2))} fill="#334155" />
                          <polygon points={ptStr(p(0, v + 1, z1), p(-1.5, v + 1, z1), p(-1.5, v + 1, z2), p(0, v + 1, z2))} fill="#1e293b" />
                          <polygon points={ptStr(p(0, v, z1), p(-1.5, v, z1), p(-1.5, v, z2), p(0, v, z2))} fill="#0f172a" />
                        </g>
                      ));

                      // Interior Room Depth
                      const cornerInterior = (
                        <g>
                          <polygon points={ptStr(p(2, 2, z1 + 14), p(30, 2, z1 + 14), p(30, 30, z1 + 14), p(2, 30, z1 + 14))} fill="#0f172a" />
                          <polygon points={ptStr(p(2, 2, z2 - 12), p(30, 2, z2 - 12), p(30, 30, z2 - 12), p(2, 30, z2 - 12))} fill="#020617" />
                          <polygon points={ptStr(p(2, 30, z1 + 14), p(30, 30, z1 + 14), p(30, 30, z2 - 12), p(2, 30, z2 - 12))} fill="#1e293b" />
                          <polygon points={ptStr(p(30, 2, z1 + 14), p(30, 30, z1 + 14), p(30, 30, z2 - 12), p(30, 2, z2 - 12))} fill="#172033" />
                          {/* Inner glowing lamp/accent */}
                          <line x1={p(15, 28, z1 + 14).x} y1={p(15, 28, z1 + 14).y} x2={p(15, 28, z2 - 12).x} y2={p(15, 28, z2 - 12).y} stroke={neon} strokeWidth="2" opacity="0.1" filter="url(#iso-glow-soft)" />
                        </g>
                      );

                      // Ground Floor Entrance Canopy Override
                      const entranceCanopy = isGroundLobby ? (
                        <g>
                          {/* Grand Canopy Roof */}
                          <polygon points={ptStr(p(-12, -12, z1 + 38), p(40, -12, z1 + 38), p(40, 40, z1 + 38), p(-12, 40, z1 + 38))} fill="#334155" stroke="#475569" strokeWidth="0.5" />
                          <polygon points={ptStr(p(-12, -12, z1 + 34), p(40, -12, z1 + 34), p(40, -12, z1 + 38), p(-12, -12, z1 + 38))} fill="#1e293b" />
                          <polygon points={ptStr(p(-12, -12, z1 + 34), p(-12, 40, z1 + 34), p(-12, 40, z1 + 38), p(-12, -12, z1 + 38))} fill="#0f172a" />
                          {/* Canopy Edge */}
                          <polyline points={ptStr(p(40, -12, z1 + 38), p(-12, -12, z1 + 38), p(-12, 40, z1 + 38))} fill="none" stroke={neon} strokeWidth="1.5" opacity="0.6" />

                          {/* Glass Entrance Doors */}
                          <polygon points={ptStr(p(0, 0, z1), p(24, 0, z1), p(24, 0, z1 + 34), p(0, 0, z1 + 34))} fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
                          <polygon points={ptStr(p(0, 0, z1), p(0, 24, z1), p(0, 24, z1 + 34), p(0, 0, z1 + 34))} fill="#0f172a" stroke="#334155" strokeWidth="0.5" />
                          <polygon points={ptStr(p(0, 0, z1), p(24, 0, z1), p(24, 0, z1 + 34), p(0, 0, z1 + 34))} fill="url(#glass-refl)" />
                          <polygon points={ptStr(p(0, 0, z1), p(0, 24, z1), p(0, 24, z1 + 34), p(0, 0, z1 + 34))} fill="url(#glass-refl)" />

                          {/* Door frames */}
                          <line x1={p(12, 0, z1).x} y1={p(12, 0, z1).y} x2={p(12, 0, z1 + 34).x} y2={p(12, 0, z1 + 34).y} stroke="#0f172a" strokeWidth="1.5" />
                          <line x1={p(0, 12, z1).x} y1={p(0, 12, z1).y} x2={p(0, 12, z1 + 34).x} y2={p(0, 12, z1 + 34).y} stroke="#0f172a" strokeWidth="1.5" />

                          {/* Entrance Inner Glow */}
                          <polygon points={ptStr(p(0, 0, z1 + 2), p(24, 0, z1 + 2), p(24, 0, z1 + 30), p(0, 0, z1 + 30))} fill={neon} opacity="0.1" />
                          <polygon points={ptStr(p(0, 0, z1 + 2), p(0, 24, z1 + 2), p(0, 24, z1 + 30), p(0, 0, z1 + 30))} fill={neon} opacity="0.05" />
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
                          <line x1={p(0, 0, z1 + 10).x} y1={p(0, 0, z1 + 10).y} x2={p(w, 0, z1 + 10).x} y2={p(w, 0, z1 + 10).y} stroke="#cbd5e1" strokeWidth="0.5" opacity="0.1" />
                          <line x1={p(0, 0, z2 - 10).x} y1={p(0, 0, z2 - 10).y} x2={p(w, 0, z2 - 10).x} y2={p(w, 0, z2 - 10).y} stroke="#cbd5e1" strokeWidth="0.5" opacity="0.1" />
                          <line x1={p(0, 0, z1 + 10).x} y1={p(0, 0, z1 + 10).y} x2={p(0, d, z1 + 10).x} y2={p(0, d, z1 + 10).y} stroke="#cbd5e1" strokeWidth="0.5" opacity="0.1" />
                          <line x1={p(0, 0, z2 - 10).x} y1={p(0, 0, z2 - 10).y} x2={p(0, d, z2 - 10).x} y2={p(0, d, z2 - 10).y} stroke="#cbd5e1" strokeWidth="0.5" opacity="0.1" />

                          {/* Physical Louvers (External details) */}
                          {louvers}
                          {louversRight}

                          {/* Interior Depths (Behind Glass) */}
                          {!isSelected && !isGroundLobby && cornerInterior}
                          {!isSelected && drawInterior(40, 52, 0, 0, z1 + 16, z2 - 14, true)}
                          {!isSelected && drawInterior(60, 72, 0, 0, z1 + 16, z2 - 14, true)}
                          {!isSelected && drawInterior(0, 0, 40, 52, z1 + 16, z2 - 14, false)}

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
                          <line x1={p(46, 0, z1 + 16).x} y1={p(46, 0, z1 + 16).y} x2={p(46, 0, z2 - 14).x} y2={p(46, 0, z2 - 14).y} stroke="#0f172a" strokeWidth="1" />
                          <line x1={p(66, 0, z1 + 16).x} y1={p(66, 0, z1 + 16).y} x2={p(66, 0, z2 - 14).x} y2={p(66, 0, z2 - 14).y} stroke="#0f172a" strokeWidth="1" />
                          <line x1={p(0, 46, z1 + 16).x} y1={p(0, 46, z1 + 16).y} x2={p(0, 46, z2 - 14).x} y2={p(0, 46, z2 - 14).y} stroke="#0f172a" strokeWidth="1" />

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

                          <text x={p(w + 20, 0, z1 + h / 2 - 2).x} y={p(w + 20, 0, z1 + h / 2 - 2).y} fill={isSelected ? neon : '#64748b'} fontSize="9" fontWeight="900" fontFamily="monospace" textAnchor="end">L{floorNum}</text>
                          <text x={p(w + 20, 0, z1 + h / 2 + 7).x} y={p(w + 20, 0, z1 + h / 2 + 7).y} fill={hasIssue ? '#fbbf24' : '#8b5cf6'} fontSize="6.5" fontWeight="800" fontFamily="monospace" textAnchor="end" opacity={0.9}>{hasIssue ? `${dirtyCount} DIRTY` : 'CLEAN'}</text>


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

                    const defColor = sorted.length > 0 ? ('#c084fc') : '#d4af37';

                    const penthouse = (
                      <g key="penthouse">
                        {/* Base Penthouse */}
                        <polygon points={pt1_top} fill="url(#iso-tf)" stroke="#334155" strokeWidth="0.5" />
                        <polygon points={pt1_left} fill="url(#iso-lf)" stroke="#1e293b" strokeWidth="0.5" />
                        <polygon points={pt1_right} fill="url(#iso-rf)" stroke="#0f172a" strokeWidth="0.5" />

                        {/* Base Penthouse Windows */}
                        <polygon points={ptStr(p(14, 8, pt1_z1 + 8), p(w - 14, 8, pt1_z1 + 8), p(w - 14, 8, pt1_z2 - 6), p(14, 8, pt1_z2 - 6))} fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
                        <polygon points={ptStr(p(14, 8, pt1_z1 + 8), p(w - 14, 8, pt1_z1 + 8), p(w - 14, 8, pt1_z2 - 6), p(14, 8, pt1_z2 - 6))} fill="url(#glass-refl)" />
                        <line x1={p(30, 8, pt1_z1 + 8).x} y1={p(30, 8, pt1_z1 + 8).y} x2={p(30, 8, pt1_z2 - 6).x} y2={p(30, 8, pt1_z2 - 6).y} stroke="#0f172a" strokeWidth="1" />
                        <line x1={p(50, 8, pt1_z1 + 8).x} y1={p(50, 8, pt1_z1 + 8).y} x2={p(50, 8, pt1_z2 - 6).x} y2={p(50, 8, pt1_z2 - 6).y} stroke="#0f172a" strokeWidth="1" />

                        {/* Top Penthouse */}
                        <polygon points={pt2_top} fill="url(#iso-tf)" stroke="#334155" strokeWidth="0.5" />
                        <polygon points={pt2_left} fill="url(#iso-lf)" stroke="#1e293b" strokeWidth="0.5" />
                        <polygon points={pt2_right} fill="url(#iso-rf)" stroke="#0f172a" strokeWidth="0.5" />

                        {/* Industrial AC / Vent Unit on Roof */}
                        <g className="roof-ac-unit">
                          <polygon points={ptStr(p(40, 24, pt2_z2 + 8), p(52, 24, pt2_z2 + 8), p(52, 32, pt2_z2 + 8), p(40, 32, pt2_z2 + 8))} fill="#475569" stroke="#64748b" strokeWidth="0.5" />
                          <polygon points={ptStr(p(40, 24, pt2_z2), p(52, 24, pt2_z2), p(52, 24, pt2_z2 + 8), p(40, 24, pt2_z2 + 8))} fill="#334155" stroke="#64748b" strokeWidth="0.5" />
                          <polygon points={ptStr(p(40, 24, pt2_z2), p(40, 32, pt2_z2), p(40, 32, pt2_z2 + 8), p(40, 24, pt2_z2 + 8))} fill="#1e293b" stroke="#64748b" strokeWidth="0.5" />
                          <circle cx={p(46, 28, pt2_z2 + 8).x} cy={p(46, 28, pt2_z2 + 8).y} r="2.5" fill="#0f172a" />
                          <line x1={p(43, 28, pt2_z2 + 8).x} y1={p(43, 28, pt2_z2 + 8).y} x2={p(49, 28, pt2_z2 + 8).x} y2={p(49, 28, pt2_z2 + 8).y} stroke="#64748b" strokeWidth="0.5" />
                          <line x1={p(46, 25, pt2_z2 + 8).x} y1={p(46, 25, pt2_z2 + 8).y} x2={p(46, 31, pt2_z2 + 8).x} y2={p(46, 31, pt2_z2 + 8).y} stroke="#64748b" strokeWidth="0.5" />
                        </g>

                        {/* Satellite Dish */}
                        <g className="satellite-dish">
                          <line x1={p(30, 32, pt2_z1).x} y1={p(30, 32, pt2_z1).y} x2={p(30, 32, pt2_z1 + 6).x} y2={p(30, 32, pt2_z1 + 6).y} stroke="#94a3b8" strokeWidth="1" />
                          <ellipse cx={p(30, 32, pt2_z1 + 6).x} cy={p(30, 32, pt2_z1 + 6).y} rx="4" ry="2" fill="#e2e8f0" transform={`rotate(-15 ${p(30, 32, pt2_z1 + 6).x} ${p(30, 32, pt2_z1 + 6).y})`} />
                          <circle cx={p(30, 32, pt2_z1 + 6).x} cy={p(30, 32, pt2_z1 + 6).y} r="0.5" fill="#ef4444" />
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
              </div>

              {/* ── Floor Selector Pill Buttons ── */}
              <div className="flex flex-col gap-2 py-1 w-[80px] shrink-0">
                {[...uniqueFloors].sort((a, b) => b - a).map(floorNum => {
                  const isSelected = selectedFloor === floorNum;
                  const dirtyCount = rooms.filter(r => r.status === 'MAINTENANCE' && getRoomFloor(r.room_number) === floorNum).length;
                  const hasIssue = dirtyCount > 0;
                  return (
                    <button key={floorNum} onClick={() => handleFloorClick(floorNum)}
                      className={`w-full rounded-lg text-center px-2 py-2.5 transition-all duration-300 cursor-pointer border relative overflow-hidden flex flex-col items-center gap-1 ${isSelected
                          ? 'bg-purple-500/15 border-purple-400/70 text-purple-200 shadow-[0_0_16px_rgba(192,132,252,0.4)]'
                          : 'bg-white/[0.02] border-white/8 text-gray-500 hover:text-purple-300 hover:border-purple-500/40'
                        }`}
                    >
                      {isSelected && <div className="absolute inset-0 bg-gradient-to-b from-purple-400/10 to-transparent" />}
                      <span className="text-[11px] font-black relative z-10">L{floorNum}</span>
                      <span className={`w-1.5 h-1.5 rounded-full relative z-10 ${hasIssue
                          ? 'bg-amber-400 animate-pulse shadow-[0_0_5px_rgba(251,191,36,0.9)]'
                          : 'bg-purple-400 shadow-[0_0_5px_rgba(192,132,252,0.8)]'
                        }`} />
                      <span className={`text-[7px] font-bold uppercase tracking-wide relative z-10 ${hasIssue ? 'text-amber-400' : 'text-purple-400/70'
                        }`}>
                        {hasIssue ? `${dirtyCount}D` : 'OK'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ═══ RIGHT PANEL: Isometric Hallway Corridor Map ═══ */}
          <div className="flex-1 flex flex-col bg-[#03050d] relative overflow-hidden p-3.5 sm:p-5">
            {/* Background Grid */}
            <div className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(circle at 60% 20%, rgba(236,72,153,0.03) 0%, transparent 60%),
                  linear-gradient(rgba(236,72,153,0.02) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(236,72,153,0.02) 1px, transparent 1px)`,
                backgroundSize: '100% 100%, 32px 32px, 32px 32px'
              }}
            />

            {selectedFloor === null ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10 relative z-10">
                <Building2 className="w-16 h-16 text-pink-500/25 mb-4 animate-pulse" />
                <h3 className="text-xl font-black text-white mb-2">Select a Level</h3>
                <p className="text-xs text-gray-500 max-w-sm">
                  Click on any floor structure level on the left block to open the floor's 3D sanitation map.
                </p>
                {/* Mobile selector */}
                <div className="flex lg:hidden flex-wrap gap-2 justify-center mt-6">
                  {uniqueFloors.sort((a, b) => b - a).map(floorNum => (
                    <button
                      key={floorNum}
                      onClick={() => handleFloorClick(floorNum)}
                      className="px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-gray-400 hover:text-pink-400 hover:border-pink-500/30 transition text-xs font-bold"
                    >
                      Floor {floorNum}
                    </button>
                  ))}
                </div>
              </div>
            ) : floorTransitioning ? (
              <div className="flex-1 flex items-center justify-center relative z-10">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full border-2 border-pink-500/30 border-t-pink-400 animate-spin mx-auto mb-3" />
                  <div className="text-[10px] font-black text-pink-400 uppercase tracking-widest">
                    Dispatched to Level {selectedFloor}...
                  </div>
                </div>
              </div>
            ) : (() => {

              const floorRooms = rooms
                .filter(r => getRoomFloor(r.room_number) === selectedFloor)
                .sort((a, b) => a.room_number.localeCompare(b.room_number));

              const dirty = floorRooms.filter(r => r.status === 'MAINTENANCE').length;
              const vacant = floorRooms.filter(r => r.status === 'AVAILABLE').length;
              const occupied = floorRooms.filter(r => r.status === 'OCCUPIED').length;

              const filteredFloorRooms = floorRooms.filter(r => {
                if (roomFilter === 'all') return true;
                if (roomFilter === 'maintenance') return r.status === 'MAINTENANCE';
                if (roomFilter === 'occupied') return r.status === 'OCCUPIED';
                if (roomFilter === 'vacant') return r.status === 'AVAILABLE';
                return true;
              });

              // Split pagination
              const paginatedRooms = filteredFloorRooms.slice(roomPage * 10, (roomPage + 1) * 10);
              const leftRooms = paginatedRooms.filter((_, idx) => idx % 2 === 0);
              const rightRooms = paginatedRooms.filter((_, idx) => idx % 2 === 1);

              return (
                <div className="flex-1 flex flex-col relative z-10 lobby-view">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-white/5 pb-4 mb-4">
                    <div>
                      <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                        Selected Floor: <span className="text-white">Level L{selectedFloor}</span>
                      </h2>
                    </div>
                    <button onClick={handleBackToBuilding} className="text-gray-400 hover:text-white text-xs font-bold flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> Back to Structure
                    </button>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {([
                      { label: 'All Rooms', value: 'all' as const, count: floorRooms.length },
                      { label: 'Needs Cleaning', value: 'maintenance' as const, count: dirty },
                      { label: 'Clean & Vacant', value: 'vacant' as const, count: vacant },
                      { label: 'Occupied', value: 'occupied' as const, count: occupied }
                    ] as const).map(f => (
                      <button
                        key={f.value}
                        onClick={() => { setRoomFilter(f.value); setRoomPage(0); }}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold border transition ${roomFilter === f.value
                            ? f.value === 'maintenance'
                              ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                              : 'bg-pink-500/10 border-pink-500/40 text-pink-300'
                            : 'bg-white/[0.02] border-white/5 text-gray-500 hover:text-white'
                          }`}
                      >
                        {f.label} <span className="ml-1 opacity-60">{f.count}</span>
                      </button>
                    ))}
                  </div>

                  {/* 3D Corridor */}
                  <div className="flex-1 relative flex flex-col justify-center min-h-[380px]">
                    {filteredFloorRooms.length === 0 ? (
                      <div className="flex items-center justify-center h-40 text-gray-500 text-xs">
                        No rooms match the selected filter.
                      </div>
                    ) : (
                      <>
                        <div className="lobby-corridor-container flex-grow overflow-y-auto">
                          <div className="corridor-floor">
                            <div className="corridor-floor-lines" />
                          </div>

                          {/* Left Wall Rooms */}
                          <div className="corridor-wall-left">
                            {leftRooms.map(room => {
                              const isVacant = room.status === 'AVAILABLE';
                              const isOccupied = room.status === 'OCCUPIED';
                              const isMaint = room.status === 'MAINTENANCE';

                              let themeColor = 'rgba(16, 185, 129, 0.2)';
                              let themeBg = 'linear-gradient(135deg, rgba(6, 78, 59, 0.25) 0%, rgba(3, 7, 18, 0.98) 100%)';
                              let sideBg = '#047857';
                              let glowDot = 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]';

                              if (isOccupied) {
                                themeColor = 'rgba(168, 85, 247, 0.2)';
                                themeBg = 'linear-gradient(135deg, rgba(88, 28, 135, 0.25) 0%, rgba(3, 7, 18, 0.98) 100%)';
                                sideBg = '#701a75';
                                glowDot = 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]';
                              } else if (isMaint) {
                                themeColor = 'rgba(245, 158, 11, 0.2)';
                                themeBg = 'linear-gradient(135deg, rgba(120, 53, 15, 0.25) 0%, rgba(3, 7, 18, 0.98) 100%)';
                                sideBg = '#b45309';
                                glowDot = 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]';
                              }

                              const handleRoomClick = () => {
                                if (!isMaint) return;
                                setConfirmDialog({
                                  isOpen: true,
                                  title: 'Sanitize Room',
                                  message: `Room ${room.room_number} requires cleaning and sanitation. Mark cleaning completed?`,
                                  confirmText: 'Mark Cleaned',
                                  cancelText: 'Cancel',
                                  onConfirm: () => handleCleanRoom(room.id, room.room_number)
                                });
                              };

                              return (
                                <div
                                  key={room.id}
                                  onClick={handleRoomClick}
                                  className={`room-cabinet-3d ${!isMaint ? 'cursor-default' : 'cursor-pointer'}`}
                                >
                                  <div className="room-cabinet-side" style={{ background: sideBg }} />
                                  <div className="room-cabinet-front" style={{ background: themeBg, borderColor: themeColor }}>
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <span className="text-base font-black text-white block">Room {room.room_number}</span>
                                        <span className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5 block">
                                          {room.room_type}
                                        </span>
                                      </div>
                                      <div className={`w-1.5 h-1.5 rounded-full mt-1 ${glowDot}`} />
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                      <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${isMaint
                                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.1)]'
                                          : isOccupied
                                            ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                                            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                        }`}>
                                        {isVacant ? 'CLEAN' : room.status}
                                      </span>
                                      {isMaint && (
                                        <span className="text-[8.5px] text-amber-400 font-bold uppercase hover:text-amber-300">
                                          🧹 Clean
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Right Wall Rooms */}
                          <div className="corridor-wall-right">
                            {rightRooms.map(room => {
                              const isVacant = room.status === 'AVAILABLE';
                              const isOccupied = room.status === 'OCCUPIED';
                              const isMaint = room.status === 'MAINTENANCE';

                              let themeColor = 'rgba(16, 185, 129, 0.2)';
                              let themeBg = 'linear-gradient(135deg, rgba(6, 78, 59, 0.25) 0%, rgba(3, 7, 18, 0.98) 100%)';
                              let sideBg = '#047857';
                              let glowDot = 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]';

                              if (isOccupied) {
                                themeColor = 'rgba(168, 85, 247, 0.2)';
                                themeBg = 'linear-gradient(135deg, rgba(88, 28, 135, 0.25) 0%, rgba(3, 7, 18, 0.98) 100%)';
                                sideBg = '#701a75';
                                glowDot = 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]';
                              } else if (isMaint) {
                                themeColor = 'rgba(245, 158, 11, 0.2)';
                                themeBg = 'linear-gradient(135deg, rgba(120, 53, 15, 0.25) 0%, rgba(3, 7, 18, 0.98) 100%)';
                                sideBg = '#b45309';
                                glowDot = 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]';
                              }

                              const handleRoomClick = () => {
                                if (!isMaint) return;
                                setConfirmDialog({
                                  isOpen: true,
                                  title: 'Sanitize Room',
                                  message: `Room ${room.room_number} requires cleaning and sanitation. Mark cleaning completed?`,
                                  confirmText: 'Mark Cleaned',
                                  cancelText: 'Cancel',
                                  onConfirm: () => handleCleanRoom(room.id, room.room_number)
                                });
                              };

                              return (
                                <div
                                  key={room.id}
                                  onClick={handleRoomClick}
                                  className={`room-cabinet-3d ${!isMaint ? 'cursor-default' : 'cursor-pointer'}`}
                                >
                                  <div className="room-cabinet-side" style={{ background: sideBg }} />
                                  <div className="room-cabinet-front" style={{ background: themeBg, borderColor: themeColor }}>
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <span className="text-base font-black text-white block">Room {room.room_number}</span>
                                        <span className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5 block">
                                          {room.room_type}
                                        </span>
                                      </div>
                                      <div className={`w-1.5 h-1.5 rounded-full mt-1 ${glowDot}`} />
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                      <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${isMaint
                                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.1)]'
                                          : isOccupied
                                            ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                                            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                        }`}>
                                        {isVacant ? 'CLEAN' : room.status}
                                      </span>
                                      {isMaint && (
                                        <span className="text-[8.5px] text-amber-400 font-bold uppercase hover:text-amber-300">
                                          🧹 Clean
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Pagination */}
                        {filteredFloorRooms.length > 10 && (
                          <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-4">
                            <button
                              disabled={roomPage === 0}
                              onClick={() => setRoomPage(p => p - 1)}
                              className="px-3.5 py-1.5 rounded bg-slate-900 border border-white/5 text-gray-400 hover:text-white text-xs font-bold disabled:opacity-40 transition cursor-pointer"
                            >
                              ← Prev Segment
                            </button>
                            <span className="text-xs text-gray-500">
                              Segment {roomPage + 1} of {Math.ceil(filteredFloorRooms.length / 10)}
                            </span>
                            <button
                              disabled={(roomPage + 1) * 10 >= filteredFloorRooms.length}
                              onClick={() => setRoomPage(p => p + 1)}
                              className="px-3.5 py-1.5 rounded bg-slate-900 border border-white/5 text-gray-400 hover:text-white text-xs font-bold disabled:opacity-40 transition cursor-pointer"
                            >
                              Next Segment →
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

        </div>
      </div>

      {/* Confirm Dialog Modal */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel max-w-sm w-full p-6 rounded-2xl border border-white/5 space-y-6 shadow-2xl">
            <h3 className="text-lg font-black text-white">{confirmDialog.title}</h3>
            <p className="text-xs text-gray-400 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 bg-slate-900 border border-white/5 text-gray-400 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {confirmDialog.cancelText || 'Cancel'}
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-lg"
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Rooms;
