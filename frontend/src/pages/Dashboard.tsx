import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Hotel, Utensils, DollarSign, ClipboardList, 
  TrendingUp, ArrowRight, Bed, Flame, Brush, Clock, CheckCircle2, AlertTriangle, Activity, Wrench, Sparkles
} from 'lucide-react';

interface Analytics {
  total_rooms: number;
  occupied_rooms: number;
  maintenance_rooms: number;
  total_tables: number;
  occupied_tables: number;
  cleaning_tables: number;
  daily_revenue: number;
  monthly_revenue: number;
  yearly_revenue: number;
  total_revenue: number;
  total_orders: number;
  total_bookings: number;
  occupancy_rate: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Analytics | null>(null);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  
  // Role-specific lists for detailed counts
  const [rooms, setRooms] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [tableReservations, setTableReservations] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const role = user?.role || 'GUEST';

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // 1. Fetch reports analytics
      const analyticsRes = await API.get(`reports/analytics/?year=${selectedYear}&month=${selectedMonth}`);
      setStats(analyticsRes.data);
      
      // 2. Fetch specific lists based on role to compute live counts
      if (role === 'ADMIN' || role === 'RECEPTION' || role === 'JANITOR') {
        const roomsRes = await API.get('rooms/');
        setRooms(roomsRes.data);
      }
      if (role === 'ADMIN' || role === 'WAITER') {
        const [tablesRes, reservationsRes] = await Promise.all([
          API.get('tables/'),
          API.get('table-reservations/')
        ]);
        setTables(tablesRes.data);
        setTableReservations(reservationsRes.data);
      }
      if (role === 'ADMIN' || role === 'WAITER' || role === 'KITCHEN') {
        const ordersRes = await API.get('orders/');
        setOrders(ordersRes.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [role, selectedYear, selectedMonth]);

  const handleSeatReservation = async (resId: number, name: string, tableId: number) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await API.patch(`table-reservations/${resId}/`, {
        status: 'COMPLETED'
      });
      await API.patch(`tables/${tableId}/`, {
        status: 'OCCUPIED'
      });
      setSuccess(`Table reservation for ${name} marked as completed.`);
      fetchDashboardData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to seat reservation');
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { 
      label: 'Book/Check-In Stays', 
      desc: 'Allocate rooms & dining tables', 
      path: '/reception', 
      icon: <Bed className="w-5 h-5 text-indigo-400" />,
      allowed: ['ADMIN', 'RECEPTION'] 
    },
    { 
      label: 'Room Cleaning Dispatch', 
      desc: 'Floor-by-floor sweep list', 
      path: '/rooms', 
      icon: <Brush className="w-5 h-5 text-pink-400" />,
      allowed: ['ADMIN', 'JANITOR'] 
    },
    { 
      label: 'Order Food', 
      desc: 'Table list and menu ordering', 
      path: '/restaurant', 
      icon: <Utensils className="w-5 h-5 text-emerald-400" />,
      allowed: ['ADMIN', 'WAITER', 'GUEST'] 
    },
    { 
      label: 'Kitchen Display (KDS)', 
      desc: 'Live food preparation queue', 
      path: '/kitchen', 
      icon: <Flame className="w-5 h-5 text-rose-400" />,
      allowed: ['ADMIN', 'KITCHEN'] 
    }
  ].filter(action => action.allowed.includes(role));

  // --- RENDERING ADMIN DASHBOARD ---
  const renderAdminDashboard = () => {
    const occupancyCircleRadius = 40;
    const occupancyCircumference = 2 * Math.PI * occupancyCircleRadius;
    const occupancyOffset = stats ? occupancyCircumference - (stats.occupancy_rate / 100) * occupancyCircumference : occupancyCircumference;

    return (
      <div className="space-y-4 sm:space-y-6 md:space-y-8 animate-fade-in">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Rooms */}
          <div className="glass-panel p-4 sm:p-5 md:p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between h-[220px] group transition border hover:border-white/10">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/10 group-hover:scale-110 transition duration-300">
                <Hotel className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-indigo-400 bg-indigo-500/5 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Rooms Log
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-4">
                {loading ? '...' : `${stats?.occupied_rooms} / ${stats?.total_rooms}`}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Active Rooms Occupied • {stats?.maintenance_rooms || 0} in Maintenance
              </p>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-1.5 mt-3 overflow-hidden border border-white/5">
              <div 
                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500" 
                style={{ width: stats && stats.total_rooms > 0 ? `${(stats.occupied_rooms / stats.total_rooms) * 100}%` : '0%' }}
              />
            </div>
          </div>

          {/* Tables */}
          <div className="glass-panel p-4 sm:p-5 md:p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between h-[220px] group transition border hover:border-white/10">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/10 group-hover:scale-110 transition duration-300">
                <Utensils className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/5 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Dining Status
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-4">
                {loading ? '...' : `${stats?.occupied_tables} / ${stats?.total_tables}`}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Tables Filled • {stats?.cleaning_tables || 0} Under Cleaning
              </p>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-1.5 mt-3 overflow-hidden border border-white/5">
              <div 
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                style={{ width: stats && stats.total_tables > 0 ? `${(stats.occupied_tables / stats.total_tables) * 100}%` : '0%' }}
              />
            </div>
          </div>

          {/* Revenue */}
          <div className="glass-panel p-4 sm:p-5 md:p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between h-[220px] group transition border hover:border-white/10 sm:col-span-2 lg:col-span-1">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/10 group-hover:scale-105 transition duration-300">
                  <DollarSign className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                  Finances
                </span>
              </div>
              <div className="flex items-center gap-1">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="bg-[#0a0d16]/95 border border-white/10 text-gray-300 text-[9px] font-bold rounded px-1 py-0.5 focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="1">Jan</option>
                  <option value="2">Feb</option>
                  <option value="3">Mar</option>
                  <option value="4">Apr</option>
                  <option value="5">May</option>
                  <option value="6">Jun</option>
                  <option value="7">Jul</option>
                  <option value="8">Aug</option>
                  <option value="9">Sep</option>
                  <option value="10">Oct</option>
                  <option value="11">Nov</option>
                  <option value="12">Dec</option>
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="bg-[#0a0d16]/95 border border-white/10 text-gray-300 text-[9px] font-bold rounded px-1 py-0.5 focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map((yr) => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 my-auto">
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">Daily</span>
                <span className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                  {loading ? '...' : `₹${(stats?.daily_revenue ?? 0).toFixed(2)}`}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">Monthly</span>
                <span className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                  {loading ? '...' : `₹${(stats?.monthly_revenue ?? 0).toFixed(2)}`}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">Yearly</span>
                <span className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                  {loading ? '...' : `₹${(stats?.yearly_revenue ?? 0).toFixed(2)}`}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-purple-400 font-semibold uppercase tracking-wider">Total</span>
                <span className="text-sm sm:text-base font-black text-purple-300 mt-0.5">
                  {loading ? '...' : `₹${(stats?.total_revenue ?? 0).toFixed(2)}`}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[9px] font-bold text-purple-400/80 uppercase tracking-widest mt-1">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Live Revenue
              </div>
              <span className="text-[8px] text-gray-500 normal-case font-normal">
                Filtered: {selectedMonth}/{selectedYear}
              </span>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 md:gap-8">
          <div className="lg:col-span-8 space-y-4 sm:space-y-6">
            <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-indigo-400" />
                Role Navigation Hub
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {quickActions.map((action) => (
                  <button
                    key={action.path}
                    onClick={() => navigate(action.path)}
                    className="flex items-center p-3.5 sm:p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.03] hover:border-indigo-500/20 text-left transition duration-200 group"
                  >
                    <div className="p-2.5 sm:p-3 bg-slate-900 rounded-xl mr-3 sm:mr-4 border border-white/5 group-hover:border-indigo-500/30 transition">
                      {action.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-white group-hover:text-indigo-300 transition">
                        {action.label}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 truncate">
                        {action.desc}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-500 ml-2 transform group-hover:translate-x-1 transition" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4 sm:space-y-6">
            <div className="glass-panel p-4 sm:p-6 rounded-2xl flex flex-col items-center justify-between text-center min-h-[260px] sm:min-h-[300px]">
              <h3 className="text-xs font-bold tracking-widest text-gray-400 uppercase">
                Hotel Occupancy Load
              </h3>
              <div className="relative flex items-center justify-center my-4 sm:my-6">
                <svg className="w-28 h-28 sm:w-36 sm:h-36 transform -rotate-90">
                  <circle cx="56" cy="56" r={occupancyCircleRadius} className="stroke-slate-900" strokeWidth="6" fill="transparent" />
                  <circle cx="56" cy="56" r={occupancyCircleRadius} className="stroke-indigo-500 transition-all duration-1000 ease-out" strokeWidth="6" fill="transparent" strokeDasharray={occupancyCircumference} strokeDashoffset={loading ? occupancyCircumference : occupancyOffset} strokeLinecap="round" />
                </svg>
                {/* Fallback support for original dimensions on larger screens if svg changes */}
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl sm:text-3xl font-black text-white">{loading ? '...' : `${stats?.occupancy_rate}%`}</span>
                  <span className="text-[9px] sm:text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5">Occupancy</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] sm:text-xs text-gray-400 font-semibold text-indigo-400">Live analytics streaming</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- RENDERING RECEPTION DASHBOARD ---
  const renderReceptionDashboard = () => {
    const vacantRooms = rooms.filter(r => r.status === 'AVAILABLE').length;
    const occupiedRooms = rooms.filter(r => r.status === 'OCCUPIED').length;
    const maintenanceRooms = rooms.filter(r => r.status === 'MAINTENANCE').length;
    const totalRooms = rooms.length;

    const vacantPercent = totalRooms > 0 ? Math.round((vacantRooms / totalRooms) * 100) : 0;

    return (
      <div className="space-y-4 sm:space-y-6 md:space-y-8 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="glass-panel p-4 sm:p-5 md:p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between h-[160px] border border-emerald-500/10 bg-emerald-500/[0.01]">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-wider">
                Ready For Stay
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">{loading ? '...' : vacantRooms}</p>
              <p className="text-xs text-gray-400 mt-1">Vacant rooms available for instant check-in</p>
            </div>
          </div>

          <div className="glass-panel p-4 sm:p-5 md:p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between h-[160px] border border-indigo-500/10 bg-indigo-500/[0.01]">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                <Bed className="w-6 h-6" />
              </div>
              <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded uppercase tracking-wider">
                In House
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">{loading ? '...' : occupiedRooms}</p>
              <p className="text-xs text-gray-400 mt-1">Checked-in lodging active sessions</p>
            </div>
          </div>

          <div className="glass-panel p-4 sm:p-5 md:p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between h-[160px] border border-amber-500/10 bg-amber-500/[0.01] sm:col-span-2 lg:col-span-1">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                <Wrench className="w-6 h-6" />
              </div>
              <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded uppercase tracking-wider">
                Cleaning Queue
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">{loading ? '...' : maintenanceRooms}</p>
              <p className="text-xs text-gray-400 mt-1">Rooms under turnaround / sanitize process</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 md:gap-8">
          <div className="lg:col-span-7 space-y-4 sm:space-y-6">
            <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-400" />
                Frontdesk Action Dispatch
              </h3>
              <p className="text-xs text-gray-400">Allocate guest stays, check room schedules, and dispatch cleanup coordinates.</p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => navigate('/reception')}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg transition"
                >
                  Go to Reception Panel
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4 sm:space-y-6">
            <div className="glass-panel p-4 sm:p-6 rounded-2xl flex flex-col items-center justify-between text-center min-h-[200px] sm:min-h-[220px]">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Available Lodging Capacity</h4>
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 my-4 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="56" cy="56" r="40" className="stroke-slate-900" strokeWidth="6" fill="transparent" />
                  <circle cx="56" cy="56" r="40" className="stroke-emerald-400" strokeWidth="6" fill="transparent" strokeDasharray={2 * Math.PI * 40} strokeDashoffset={2 * Math.PI * 40 - (vacantPercent / 100) * 2 * Math.PI * 40} strokeLinecap="round" />
                </svg>
                <span className="absolute text-xl sm:text-2xl font-black text-white">{loading ? '...' : `${vacantPercent}%`}</span>
              </div>
              <p className="text-[10px] text-gray-500">Percentage of rooms clean and ready for registration.</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- RENDERING WAITER DASHBOARD ---
  const renderWaiterDashboard = () => {
    const vacantTables = tables.filter(t => t.status === 'VACANT').length;
    const occupiedTables = tables.filter(t => t.status === 'OCCUPIED').length;
    const cleaningTables = tables.filter(t => t.status === 'UNDER_CLEANING').length;
    const activeOrders = orders.filter(o => o.status === 'PLACED' || o.status === 'COOKING').length;
    const totalGuests = tables.filter(t => t.status === 'OCCUPIED').reduce((acc, t) => acc + (t.capacity || 2), 0);

    return (
      <div className="space-y-4 sm:space-y-6 md:space-y-8 animate-fade-in">
        {/* Waiter KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="glass-panel p-4 sm:p-5 md:p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between h-[160px] border border-pink-500/10 bg-pink-500/[0.01]">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-pink-500/10 rounded-xl text-pink-400">
                <Utensils className="w-6 h-6" />
              </div>
              <span className="text-[9px] font-black text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded uppercase tracking-wider">
                Active Dine-in
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">{loading ? '...' : occupiedTables}</p>
              <p className="text-xs text-gray-400 mt-1">Tables currently seated & ordering</p>
            </div>
          </div>

          <div className="glass-panel p-4 sm:p-5 md:p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between h-[160px] border border-emerald-500/10 bg-emerald-500/[0.01]">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-wider">
                Open Tables
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">{loading ? '...' : vacantTables}</p>
              <p className="text-xs text-gray-400 mt-1">Tables vacant and ready for seating</p>
            </div>
          </div>

          <div className="glass-panel p-4 sm:p-5 md:p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between h-[160px] border border-amber-500/10 bg-amber-500/[0.01] sm:col-span-2 lg:col-span-1">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                <Clock className="w-6 h-6" />
              </div>
              <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded uppercase tracking-wider">
                Pending Food Prep
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">{loading ? '...' : activeOrders}</p>
              <p className="text-xs text-gray-400 mt-1">Active orders pending kitchen serve</p>
            </div>
          </div>
        </div>

        {/* Core Layout Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 md:gap-8">
          
          {/* Left Panel: The Lunar Garden Summary */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6">
            <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4 sm:space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
                <h3 className="font-extrabold text-white text-base tracking-wide">THE LUNAR GARDEN</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">TABLES OCCUPIED</span>
                  <span className="text-sm font-black text-indigo-300">
                    {occupiedTables} / {tables.length}
                  </span>
                </div>

                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">TOTAL GUESTS</span>
                  <span className="text-sm font-black text-emerald-300">{totalGuests}</span>
                </div>

                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                    <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">VACANT</span>
                  </div>
                  <span className="text-sm font-black text-emerald-400">{vacantTables}</span>
                </div>

                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]" />
                    <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">OCCUPIED</span>
                  </div>
                  <span className="text-sm font-black text-purple-400">{occupiedTables}</span>
                </div>

                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between sm:col-span-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
                    <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">CLEANING & TURNAWAY</span>
                  </div>
                  <span className="text-sm font-black text-amber-400">{cleaningTables}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => navigate('/restaurant')}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg transition flex items-center justify-center gap-2"
                >
                  <Utensils className="w-4 h-4" /> Open Interactive Floor Plan
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Upcoming Reservations */}
          <div className="lg:col-span-5 space-y-4 sm:space-y-6">
            <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">Upcoming Reservations</h4>
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {tableReservations.filter((tr: any) => tr.status === 'BOOKED').length > 0 ? (
                  tableReservations
                    .filter((tr: any) => tr.status === 'BOOKED')
                    .slice(0, 5)
                    .map((tr: any) => (
                      <div key={tr.id} className="flex justify-between items-center text-xs bg-white/[0.01] border border-white/5 rounded-xl p-3">
                        <div className="flex flex-col">
                          <span className="text-gray-200 font-extrabold">{tr.customer_name}</span>
                          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider font-mono">Table {tr.table_number}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="text-indigo-400 font-extrabold text-[10px] font-mono">
                            {new Date(tr.reservation_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={() => handleSeatReservation(tr.id, tr.customer_name, tr.table)}
                            disabled={loading}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-50 disabled:opacity-50 text-white rounded-lg text-[10px] font-bold cursor-pointer transition uppercase"
                          >
                            Seat
                          </button>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="py-8 text-center text-gray-500 text-xs">No upcoming reservations registered today.</div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  };

  // --- RENDERING KITCHEN DASHBOARD ---
  const renderKitchenDashboard = () => {
    const placedOrders = orders.filter(o => o.status === 'PLACED').length;
    const cookingOrders = orders.filter(o => o.status === 'COOKING').length;
    const completedOrdersToday = orders.filter(o => o.status === 'SERVED' || o.status === 'COMPLETED').length;

    return (
      <div className="space-y-4 sm:space-y-6 md:space-y-8 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="glass-panel p-4 sm:p-5 md:p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between h-[160px] border border-rose-500/10 bg-rose-500/[0.01]">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <span className="text-[9px] font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded uppercase tracking-wider">
                New Order Tickets
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">{loading ? '...' : placedOrders}</p>
              <p className="text-xs text-gray-400 mt-1">Pending order queues awaiting cooking</p>
            </div>
          </div>

          <div className="glass-panel p-4 sm:p-5 md:p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between h-[160px] border border-amber-500/10 bg-amber-500/[0.01]">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                <Flame className="w-6 h-6" />
              </div>
              <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded uppercase tracking-wider">
                In Preparation
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">{loading ? '...' : cookingOrders}</p>
              <p className="text-xs text-gray-400 mt-1">Orders currently cooking in kitchen</p>
            </div>
          </div>

          <div className="glass-panel p-4 sm:p-5 md:p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between h-[160px] border border-emerald-500/10 bg-emerald-500/[0.01] sm:col-span-2 lg:col-span-1">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-wider">
                Served Today
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">{loading ? '...' : completedOrdersToday}</p>
              <p className="text-xs text-gray-400 mt-1">Completed served orders in this session</p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4 max-w-2xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-rose-400" />
            Kitchen Display System (KDS)
          </h3>
          <p className="text-xs text-gray-400">
            View preparation status details, mark orders cooking, and notify waiters when plates are ready.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => navigate('/kitchen')}
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg transition"
            >
              Open Kitchen KDS Display
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- RENDERING JANITOR DASHBOARD ---
  const renderJanitorDashboard = () => {
    const dirtyRooms = rooms.filter(r => r.status === 'MAINTENANCE').length;
    const cleanRooms = rooms.filter(r => r.status === 'AVAILABLE').length;
    const occupiedRooms = rooms.filter(r => r.status === 'OCCUPIED').length;

    return (
      <div className="space-y-4 sm:space-y-6 md:space-y-8 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="glass-panel p-4 sm:p-5 md:p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between h-[160px] border border-amber-500/10 bg-amber-500/[0.01]">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                <Wrench className="w-6 h-6" />
              </div>
              <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded uppercase tracking-wider">
                Sweeping Required
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">{loading ? '...' : dirtyRooms}</p>
              <p className="text-xs text-gray-400 mt-1">Rooms needing sanitation turnaround</p>
            </div>
          </div>

          <div className="glass-panel p-4 sm:p-5 md:p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between h-[160px] border border-pink-500/10 bg-pink-500/[0.01]">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-pink-500/10 rounded-xl text-pink-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <span className="text-[9px] font-black text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded uppercase tracking-wider">
                Cleaned & Ready
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">{loading ? '...' : cleanRooms}</p>
              <p className="text-xs text-gray-400 mt-1">Rooms vacant and ready for new guests</p>
            </div>
          </div>

          <div className="glass-panel p-4 sm:p-5 md:p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between h-[160px] border border-indigo-500/10 bg-indigo-500/[0.01] sm:col-span-2 lg:col-span-1">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                <Hotel className="w-6 h-6" />
              </div>
              <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded uppercase tracking-wider">
                Guest Inside
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">{loading ? '...' : occupiedRooms}</p>
              <p className="text-xs text-gray-400 mt-1">Occupied rooms (do not disturb)</p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4 max-w-2xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Brush className="w-5 h-5 text-pink-400" />
            Janitor Sanitation Dispatch
          </h3>
          <p className="text-xs text-gray-400">
            Open the 3D floor layout map to find dirty rooms floor-by-floor and mark them clean.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => navigate('/rooms')}
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg transition"
            >
              Open Floor Cleaning Map
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- DYNAMIC RENDERING SELECTOR ---
  const renderDashboardByRole = () => {
    switch (role) {
      case 'ADMIN':
        return renderAdminDashboard();
      case 'RECEPTION':
        return renderReceptionDashboard();
      case 'WAITER':
        return renderWaiterDashboard();
      case 'KITCHEN':
        return renderKitchenDashboard();
      case 'JANITOR':
        return renderJanitorDashboard();
      default:
        return renderAdminDashboard(); // Fallback
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Welcome Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 w-[30%] h-[100%] bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Hotel Telemetry Center
          </h1>
          <p className="text-gray-400 text-sm sm:text-base mt-1.5 max-w-xl">
            Live overview of smart lodging, table reservations, kitchen display updates, and staff dispatch operations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/5 text-xs font-bold text-gray-400 capitalize">
            User: {user?.username}
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-300 uppercase">
            Role: {role}
          </span>
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

      {renderDashboardByRole()}

    </div>
  );
};

export default Dashboard;
