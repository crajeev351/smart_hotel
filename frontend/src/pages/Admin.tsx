import React, { useEffect, useState } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart3, Hotel, Utensils, Users, Settings, Mail, Trash, Edit, Save, 
  X, CreditCard, TrendingUp
} from 'lucide-react';

interface Room {
  id: number;
  room_number: string;
  room_type: string;
  price_per_night: string;
  capacity: number;
  status: string;
  floor: number;
}

interface Table {
  id: number;
  table_number: string;
  capacity: number;
  status: string;
}

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: string;
  category: number;
  is_veg: boolean;
  is_available: boolean;
}

interface MenuCategory {
  id: number;
  name: string;
  description: string;
  display_order: number;
}

interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
}

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
  users_by_role: { role: string; count: number }[];
}

const Admin: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'analytics' | 'rooms' | 'tables' | 'menu' | 'users' | 'marketing'>('analytics');
  
  // Data lists
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals / Editors
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);

  // New item forms
  const [newRoom, setNewRoom] = useState({ room_number: '', room_type: 'SINGLE', price_per_night: '', capacity: 2, floor: 1 });
  const [newTable, setNewTable] = useState({ table_number: '', capacity: 4 });
  const [newCategory, setNewCategory] = useState({ name: '', description: '', display_order: 1 });
  const [newMenuItem, setNewMenuItem] = useState({ name: '', description: '', price: '', category: '', is_veg: true });
  const [newUser, setNewUser] = useState({ username: '', email: '', name: '', phone: '', role: 'GUEST', password: 'TempPassword123!' });

  // Marketing form
  const [campaignSenderEmail, setCampaignSenderEmail] = useState('');
  const [campaignSenderPassword, setCampaignSenderPassword] = useState('');
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignBody, setCampaignBody] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [roomsRes, tablesRes, menuRes, catRes, usersRes, analyticsRes] = await Promise.all([
        API.get('rooms/'),
        API.get('tables/'),
        API.get('menu-items/'),
        API.get('categories/'),
        API.get('users/'),
        API.get(`reports/analytics/?year=${selectedYear}&month=${selectedMonth}`)
      ]);
      setRooms(roomsRes.data);
      setTables(tablesRes.data);
      setMenuItems(menuRes.data);
      setCategories(catRes.data);
      setUsers(usersRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err: any) {
      setError('Admin retrieval error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedMonth]);

  // CRUD Room
  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await API.post('rooms/', newRoom);
      setSuccess('Room added successfully');
      setNewRoom({ room_number: '', room_type: 'SINGLE', price_per_night: '', capacity: 2, floor: 1 });
      loadData();
    } catch (err: any) {
      setError(JSON.stringify(err.response?.data || 'Failed to add room'));
    }
  };

  const handleUpdateRoom = async (room: Room) => {
    try {
      await API.put(`rooms/${room.id}/`, room);
      setSuccess('Room updated successfully');
      setEditingRoom(null);
      loadData();
    } catch (err: any) {
      setError('Update failed: ' + err.message);
    }
  };

  const handleDeleteRoom = async (id: number) => {
    if (!window.confirm('Delete this room?')) return;
    try {
      await API.delete(`rooms/${id}/`);
      setSuccess('Room deleted');
      loadData();
    } catch (err: any) {
      setError('Delete failed: ' + err.message);
    }
  };

  // CRUD Table
  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await API.post('tables/', newTable);
      setSuccess('Table added successfully');
      setNewTable({ table_number: '', capacity: 4 });
      loadData();
    } catch (err: any) {
      setError('Failed to add table');
    }
  };

  const handleUpdateTable = async (table: Table) => {
    try {
      await API.put(`tables/${table.id}/`, table);
      setSuccess('Table updated successfully');
      setEditingTable(null);
      loadData();
    } catch (err: any) {
      setError('Update failed: ' + err.message);
    }
  };

  const handleDeleteTable = async (id: number) => {
    if (!window.confirm('Delete this table?')) return;
    try {
      await API.delete(`tables/${id}/`);
      setSuccess('Table deleted');
      loadData();
    } catch (err: any) {
      setError('Delete failed');
    }
  };

  // CRUD Category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await API.post('categories/', newCategory);
      setSuccess('Menu category added');
      setNewCategory({ name: '', description: '', display_order: 1 });
      loadData();
    } catch (err) {
      setError('Failed to add category');
    }
  };

  // CRUD Menu Item
  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await API.post('menu-items/', newMenuItem);
      setSuccess('Menu item added');
      setNewMenuItem({ name: '', description: '', price: '', category: '', is_veg: true });
      loadData();
    } catch (err) {
      setError('Failed to add menu item');
    }
  };

  const handleUpdateMenuItem = async (item: MenuItem) => {
    try {
      await API.put(`menu-items/${item.id}/`, item);
      setSuccess('Menu item updated');
      setEditingMenuItem(null);
      loadData();
    } catch (err) {
      setError('Update failed');
    }
  };

  const handleDeleteMenuItem = async (id: number) => {
    if (!window.confirm('Delete this menu item?')) return;
    try {
      await API.delete(`menu-items/${id}/`);
      setSuccess('Menu item deleted');
      loadData();
    } catch (err) {
      setError('Delete failed');
    }
  };

  // User Administration
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await API.post('users/', newUser);
      setSuccess('Staff/User account created successfully');
      setNewUser({ username: '', email: '', name: '', phone: '', role: 'GUEST', password: 'TempPassword123!' });
      loadData();
    } catch (err: any) {
      setError(JSON.stringify(err.response?.data || 'Failed to create user'));
    }
  };

  const handleDeactivateUser = async (id: string, active: boolean) => {
    try {
      if (active) {
        // PATCH call to toggle status (we implemented deactivate API, we can expand it)
        await API.patch(`users/${id}/deactivate/`);
        setSuccess('User deactivated successfully');
      } else {
        await API.patch(`users/${id}/`, { is_active: true });
        setSuccess('User activated successfully');
      }
      loadData();
    } catch (err) {
      setError('Status toggle failed');
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (currentUser && currentUser.id === id) {
      setError('You cannot delete your own account while logged in.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete user "${name || 'Unnamed'}"? This action is permanent and will cascade to all bookings and orders for this user.`)) return;
    try {
      await API.delete(`users/${id}/`);
      setSuccess('User account deleted successfully');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  };

  // Dispatch marketing email campaign
  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await API.post('users/marketing-campaign/', {
        title: campaignTitle,
        message: campaignBody,
        sender_email: campaignSenderEmail,
        sender_app_password: campaignSenderPassword
      });
      setSuccess(response.data.message);
      setCampaignTitle('');
      setCampaignBody('');
      setCampaignSenderEmail('');
      setCampaignSenderPassword('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      
      {/* Admin Panel Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 glass-panel p-4 sm:p-6 rounded-2xl">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2 sm:gap-3">
          <Settings className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-400 animate-spin-slow" />
          Administrative Control Center
        </h2>
        <button 
          onClick={loadData}
          className="bg-slate-900 border border-white/5 hover:bg-slate-800 text-gray-300 px-4 py-2.5 sm:py-2 rounded-xl transition cursor-pointer text-sm sm:text-base w-full sm:w-auto"
        >
          Reload Center Data
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-white/5 pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
        {(['analytics', 'rooms', 'tables', 'menu', 'users', 'marketing'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setError(null); setSuccess(null); }}
            className={`px-4 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold capitalize transition whitespace-nowrap flex-shrink-0 ${
              activeTab === tab 
                ? 'glowing-btn-indigo text-white shadow-sm' 
                : 'bg-[#0a0d16]/80 border border-white/5 text-gray-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab === 'menu' ? 'Menu & Dining' : tab}
          </button>
        ))}
      </div>

      {/* 📊 Analytics Dashboard */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            <div className="glass-panel p-4 sm:p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between h-[220px] group transition border hover:border-white/10 shadow-lg">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition duration-300">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
                    Finances
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-black/20 p-1 rounded-lg border border-white/5">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="bg-transparent text-gray-300 text-[10px] font-bold px-1 py-0.5 focus:outline-none cursor-pointer appearance-none text-center hover:text-white"
                  >
                    <option className="bg-[#0a0d16] text-white" value="1">Jan</option>
                    <option className="bg-[#0a0d16] text-white" value="2">Feb</option>
                    <option className="bg-[#0a0d16] text-white" value="3">Mar</option>
                    <option className="bg-[#0a0d16] text-white" value="4">Apr</option>
                    <option className="bg-[#0a0d16] text-white" value="5">May</option>
                    <option className="bg-[#0a0d16] text-white" value="6">Jun</option>
                    <option className="bg-[#0a0d16] text-white" value="7">Jul</option>
                    <option className="bg-[#0a0d16] text-white" value="8">Aug</option>
                    <option className="bg-[#0a0d16] text-white" value="9">Sep</option>
                    <option className="bg-[#0a0d16] text-white" value="10">Oct</option>
                    <option className="bg-[#0a0d16] text-white" value="11">Nov</option>
                    <option className="bg-[#0a0d16] text-white" value="12">Dec</option>
                  </select>
                  <span className="text-gray-600 text-[10px]">/</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="bg-transparent text-gray-300 text-[10px] font-bold px-1 py-0.5 focus:outline-none cursor-pointer appearance-none text-center hover:text-white"
                  >
                    {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map((yr) => (
                      <option className="bg-[#0a0d16] text-white" key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 my-auto w-full">
                <div className="flex flex-col bg-white/5 p-2 rounded-lg border border-white/5">
                  <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Daily</span>
                  <span className="text-sm font-extrabold text-white">
                    ₹{(analytics?.daily_revenue ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-col bg-white/5 p-2 rounded-lg border border-white/5">
                  <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Monthly</span>
                  <span className="text-sm font-extrabold text-white">
                    ₹{(analytics?.monthly_revenue ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-col bg-white/5 p-2 rounded-lg border border-white/5">
                  <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Yearly</span>
                  <span className="text-sm font-extrabold text-white">
                    ₹{(analytics?.yearly_revenue ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-col bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                  <span className="text-[9px] text-emerald-400 font-semibold uppercase tracking-wider mb-1">Total</span>
                  <span className="text-sm font-black text-emerald-300">
                    ₹{(analytics?.total_revenue ?? 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[9px] font-bold text-emerald-400/80 uppercase tracking-widest mt-3 pt-2 border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Live Revenue
                </div>
                <span className="text-[8px] text-gray-500 normal-case font-medium">
                  Filtered: {selectedMonth}/{selectedYear}
                </span>
              </div>
            </div>

            <div className="glass-panel p-4 sm:p-6 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-semibold">Occupancy Rate</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">{analytics.occupancy_rate}%</p>
              </div>
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/10 text-indigo-400 rounded-full text-indigo-400">
                <BarChart3 className="w-7 h-7" />
              </div>
            </div>

            <div className="glass-panel p-4 sm:p-6 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-semibold">Dining Orders</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">{analytics.total_orders}</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-full text-orange-600">
                <Utensils className="w-7 h-7" />
              </div>
            </div>

            <div className="glass-panel p-4 sm:p-6 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-semibold">Staff & User Accounts</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">{users.length}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-full text-purple-600">
                <Users className="w-7 h-7" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            {/* Occupancy stats */}
            <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Hotel className="w-5 h-5 text-blue-500" />
                Hotel Operations Status
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-lg">
                  <span className="text-2xl font-bold">{analytics.total_rooms}</span>
                  <p className="text-xs text-blue-400 font-medium mt-1">Total Rooms</p>
                </div>
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-lg">
                  <span className="text-2xl font-bold">{analytics.total_rooms - analytics.occupied_rooms - analytics.maintenance_rooms}</span>
                  <p className="text-xs text-emerald-400 font-medium mt-1">Vacant</p>
                </div>
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-lg">
                  <span className="text-2xl font-bold">{analytics.occupied_rooms}</span>
                  <p className="text-xs text-rose-400 font-medium mt-1">Occupied</p>
                </div>
              </div>
            </div>

            {/* Restaurant stats */}
            <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Utensils className="w-5 h-5 text-orange-500" />
                Restaurant Operations Status
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
                <div className="p-4 bg-orange-500/10 border border-orange-500/20 text-orange-300 rounded-lg">
                  <span className="text-2xl font-bold">{analytics.total_tables}</span>
                  <p className="text-xs text-orange-400 font-medium mt-1">Total Tables</p>
                </div>
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-lg">
                  <span className="text-2xl font-bold">{analytics.total_tables - analytics.occupied_tables - analytics.cleaning_tables}</span>
                  <p className="text-xs text-emerald-400 font-medium mt-1">Vacant</p>
                </div>
                <div className="p-4 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-lg">
                  <span className="text-2xl font-bold">{analytics.occupied_tables}</span>
                  <p className="text-xs text-purple-400 font-medium mt-1">Occupied</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🚪 Rooms Management CRUD */}
      {activeTab === 'rooms' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Add Room Form */}
          <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4 h-fit">
            <h3 className="text-lg font-bold text-white">Add New Room</h3>
            <form onSubmit={handleAddRoom} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Room Number</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. 101"
                  value={newRoom.room_number}
                  onChange={e => setNewRoom({...newRoom, room_number: e.target.value})}
                  className="w-full p-2 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
                  <select 
                    value={newRoom.room_type}
                    onChange={e => setNewRoom({...newRoom, room_type: e.target.value})}
                    className="w-full p-2 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
                  >
                    <option value="SINGLE">Single</option>
                    <option value="DOUBLE">Double</option>
                    <option value="DELUXE">Deluxe</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Floor</label>
                  <input 
                    type="number" 
                    value={newRoom.floor}
                    onChange={e => setNewRoom({...newRoom, floor: parseInt(e.target.value) || 1})}
                    className="w-full p-2 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Price / Night (₹)</label>
                  <input 
                    type="number" 
                    required
                    value={newRoom.price_per_night}
                    onChange={e => setNewRoom({...newRoom, price_per_night: e.target.value})}
                    className="w-full p-2 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Capacity</label>
                  <input 
                    type="number" 
                    value={newRoom.capacity}
                    onChange={e => setNewRoom({...newRoom, capacity: parseInt(e.target.value) || 2})}
                    className="w-full p-2 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
                  />
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full py-2.5 glowing-btn-indigo hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm"
              >
                Add Room Account
              </button>
            </form>
          </div>

          {/* Rooms Table */}
          <div className="lg:col-span-2 glass-panel p-3 sm:p-4 overflow-hidden border border-white/5 rounded-2xl">
            <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Hotel Room Inventory</h3>
            <div className="overflow-x-auto overflow-y-auto max-h-[400px]">
              <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-slate-950/40 border-b border-white/5 border-white/5 text-gray-400">
                    <th className="p-3">Room</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map(room => (
                    <tr key={room.id} className="border-b border-white/5 border-white/5 hover:bg-white/[0.01]">
                      {editingRoom?.id === room.id ? (
                        <>
                          <td className="p-2">
                            <input 
                              type="text" 
                              value={editingRoom.room_number} 
                              onChange={e => setEditingRoom({...editingRoom, room_number: e.target.value})}
                              className="w-16 p-1 border rounded"
                            />
                          </td>
                          <td className="p-2">
                            <select 
                              value={editingRoom.room_type} 
                              onChange={e => setEditingRoom({...editingRoom, room_type: e.target.value})}
                              className="p-1 border rounded"
                            >
                              <option value="SINGLE">Single</option>
                              <option value="DOUBLE">Double</option>
                              <option value="DELUXE">Deluxe</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <input 
                              type="number" 
                              value={editingRoom.price_per_night} 
                              onChange={e => setEditingRoom({...editingRoom, price_per_night: e.target.value})}
                              className="w-20 p-1 border rounded"
                            />
                          </td>
                          <td className="p-2">
                            <select 
                              value={editingRoom.status} 
                              onChange={e => setEditingRoom({...editingRoom, status: e.target.value})}
                              className="p-1 border rounded"
                            >
                              <option value="AVAILABLE">Available</option>
                              <option value="OCCUPIED">Occupied</option>
                              <option value="MAINTENANCE">Maintenance</option>
                            </select>
                          </td>
                          <td className="p-2 text-right space-x-1">
                            <button onClick={() => handleUpdateRoom(editingRoom)} className="p-1.5 sm:p-1 bg-green-500 text-white rounded"><Save className="w-4 h-4" /></button>
                            <button onClick={() => setEditingRoom(null)} className="p-1.5 sm:p-1 bg-gray-500 text-white rounded"><X className="w-4 h-4" /></button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-3 font-semibold text-white">Room {room.room_number} (Floor {room.floor})</td>
                          <td className="p-3 text-gray-400">{room.room_type} (Max: {room.capacity})</td>
                          <td className="p-3 font-bold">₹{parseFloat(room.price_per_night).toFixed(2)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              room.status === 'AVAILABLE' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' :
                              room.status === 'OCCUPIED' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {room.status}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-2">
                            <button onClick={() => setEditingRoom(room)} className="p-1.5 sm:p-1 text-indigo-400 hover:bg-indigo-500/10 border border-indigo-500/10 text-indigo-400 rounded"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteRoom(room.id)} className="p-1.5 sm:p-1 text-red-600 hover:bg-red-50 rounded"><Trash className="w-4 h-4" /></button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 🍽️ Tables Management CRUD */}
      {activeTab === 'tables' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4 h-fit">
            <h3 className="text-lg font-bold text-white">Add New Dining Table</h3>
            <form onSubmit={handleAddTable} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Table Number</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. 101"
                  value={newTable.table_number}
                  onChange={e => setNewTable({...newTable, table_number: e.target.value})}
                  className="w-full p-2 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Seating Capacity</label>
                <input 
                  type="number" 
                  value={newTable.capacity}
                  onChange={e => setNewTable({...newTable, capacity: parseInt(e.target.value) || 4})}
                  className="w-full p-2 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
                />
              </div>
              <button type="submit" className="w-full py-2.5 glowing-btn-indigo hover:bg-blue-700 text-white font-bold rounded-lg">
                Add Table Account
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 glass-panel p-3 sm:p-4 overflow-hidden border border-white/5 rounded-2xl">
            <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Dining Room Table Layout</h3>
            <div className="overflow-x-auto overflow-y-auto max-h-[400px]">
              <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[450px]">
                <thead>
                  <tr className="bg-slate-950/40 border-b border-white/5 border-white/5 text-gray-400">
                    <th className="p-3">Table Number</th>
                    <th className="p-3">Capacity</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tables.map(table => (
                    <tr key={table.id} className="border-b border-white/5 border-white/5 hover:bg-white/[0.01]">
                      {editingTable?.id === table.id ? (
                        <>
                          <td className="p-2">
                            <input 
                              type="text" 
                              value={editingTable.table_number}
                              onChange={e => setEditingTable({...editingTable, table_number: e.target.value})}
                              className="w-20 p-1 border rounded"
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              type="number" 
                              value={editingTable.capacity}
                              onChange={e => setEditingTable({...editingTable, capacity: parseInt(e.target.value) || 2})}
                              className="w-20 p-1 border rounded"
                            />
                          </td>
                          <td className="p-2">
                            <select 
                              value={editingTable.status}
                              onChange={e => setEditingTable({...editingTable, status: e.target.value})}
                              className="p-1 border rounded"
                            >
                              <option value="VACANT">Vacant</option>
                              <option value="OCCUPIED">Occupied</option>
                              <option value="UNDER_CLEANING">Under Cleaning</option>
                            </select>
                          </td>
                          <td className="p-2 text-right space-x-1">
                            <button onClick={() => handleUpdateTable(editingTable)} className="p-1.5 sm:p-1 bg-green-500 text-white rounded"><Save className="w-4 h-4" /></button>
                            <button onClick={() => setEditingTable(null)} className="p-1.5 sm:p-1 bg-gray-500 text-white rounded"><X className="w-4 h-4" /></button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-3 font-semibold text-white">Table {table.table_number}</td>
                          <td className="p-3 text-gray-400">{table.capacity} Seats</td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                              table.status === 'VACANT' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' :
                              table.status === 'OCCUPIED' ? 'bg-purple-100 text-purple-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {table.status}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-2">
                            <button onClick={() => setEditingTable(table)} className="p-1.5 sm:p-1 text-indigo-400 hover:bg-indigo-500/10 border border-indigo-500/10 text-indigo-400 rounded"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteTable(table.id)} className="p-1.5 sm:p-1 text-red-600 hover:bg-red-50 rounded"><Trash className="w-4 h-4" /></button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 🍔 Menu & Dining Management CRUD */}
      {activeTab === 'menu' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="space-y-6">
            {/* Category Form */}
            <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4">
              <h3 className="text-lg font-bold text-white">Add Menu Category</h3>
              <form onSubmit={handleAddCategory} className="space-y-3">
                <input 
                  type="text" 
                  required
                  placeholder="Category Name, e.g. Desserts"
                  value={newCategory.name}
                  onChange={e => setNewCategory({...newCategory, name: e.target.value})}
                  className="w-full p-2 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
                />
                <input 
                  type="text" 
                  placeholder="Short Description"
                  value={newCategory.description}
                  onChange={e => setNewCategory({...newCategory, description: e.target.value})}
                  className="w-full p-2 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
                />
                <input 
                  type="number" 
                  placeholder="Display Order, e.g. 1"
                  value={newCategory.display_order}
                  onChange={e => setNewCategory({...newCategory, display_order: parseInt(e.target.value) || 1})}
                  className="w-full p-2 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
                />
                <button type="submit" className="w-full py-2 glowing-btn-indigo text-white rounded-lg font-bold">
                  Create Category
                </button>
              </form>
            </div>

            {/* Menu Item Form */}
            <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4">
              <h3 className="text-lg font-bold text-white">Add New Dish</h3>
              <form onSubmit={handleAddMenuItem} className="space-y-3">
                <input 
                  type="text" 
                  required
                  placeholder="Dish Name, e.g. Veg Burger"
                  value={newMenuItem.name}
                  onChange={e => setNewMenuItem({...newMenuItem, name: e.target.value})}
                  className="w-full p-2 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
                />
                <input 
                  type="text" 
                  placeholder="Description/Ingredients"
                  value={newMenuItem.description}
                  onChange={e => setNewMenuItem({...newMenuItem, description: e.target.value})}
                  className="w-full p-2 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input 
                    type="number" 
                    required
                    placeholder="Price (₹)"
                    value={newMenuItem.price}
                    onChange={e => setNewMenuItem({...newMenuItem, price: e.target.value})}
                    className="w-full p-2 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
                  />
                  <select
                    required
                    value={newMenuItem.category}
                    onChange={e => setNewMenuItem({...newMenuItem, category: e.target.value})}
                    className="w-full p-2 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="veg-checkbox"
                    checked={newMenuItem.is_veg}
                    onChange={e => setNewMenuItem({...newMenuItem, is_veg: e.target.checked})}
                    className="w-4 h-4 text-indigo-400 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="veg-checkbox" className="text-sm font-semibold text-gray-300">Is Vegetarian Dish</label>
                </div>
                <button type="submit" className="w-full py-2 glowing-btn-indigo text-white rounded-lg font-bold">
                  Add Menu Item
                </button>
              </form>
            </div>
          </div>

          {/* Menu Items Table */}
          <div className="lg:col-span-2 glass-panel p-3 sm:p-4 overflow-hidden border border-white/5 rounded-2xl">
            <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Active Restaurant Menu</h3>
            <div className="overflow-x-auto overflow-y-auto max-h-[450px]">
              <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[550px]">
                <thead>
                  <tr className="bg-slate-950/40 border-b border-white/5 border-white/5 text-gray-400">
                    <th className="p-3">Dish</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.map(item => (
                    <tr key={item.id} className="border-b border-white/5 border-white/5 hover:bg-white/[0.01]">
                      {editingMenuItem?.id === item.id ? (
                        <>
                          <td className="p-2">
                            <input 
                              type="text" 
                              value={editingMenuItem.name}
                              onChange={e => setEditingMenuItem({...editingMenuItem, name: e.target.value})}
                              className="w-28 p-1 border rounded"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={editingMenuItem.category}
                              onChange={e => setEditingMenuItem({...editingMenuItem, category: parseInt(e.target.value) || 0})}
                              className="p-1 border rounded text-xs"
                            >
                              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </td>
                          <td className="p-2">
                            <input 
                              type="number" 
                              value={editingMenuItem.price}
                              onChange={e => setEditingMenuItem({...editingMenuItem, price: e.target.value})}
                              className="w-20 p-1 border rounded"
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              type="checkbox" 
                              checked={editingMenuItem.is_veg}
                              onChange={e => setEditingMenuItem({...editingMenuItem, is_veg: e.target.checked})}
                            /> Veg
                          </td>
                          <td className="p-2 text-right space-x-1">
                            <button onClick={() => handleUpdateMenuItem(editingMenuItem)} className="p-1.5 sm:p-1 bg-green-500 text-white rounded"><Save className="w-4 h-4" /></button>
                            <button onClick={() => setEditingMenuItem(null)} className="p-1.5 sm:p-1 bg-gray-500 text-white rounded"><X className="w-4 h-4" /></button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-3 font-semibold text-white">
                            {item.name}
                            <p className="text-xs text-gray-500 font-normal">{item.description}</p>
                          </td>
                          <td className="p-3 text-gray-400 text-xs">
                            {categories.find(c => c.id === item.category)?.name || 'Uncategorized'}
                          </td>
                          <td className="p-3 font-bold">₹{parseFloat(item.price).toFixed(2)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${
                              item.is_veg ? 'bg-green-600' : 'bg-red-600'
                            }`}>
                              {item.is_veg ? 'VEG' : 'NON-VEG'}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-2">
                            <button onClick={() => setEditingMenuItem(item)} className="p-1.5 sm:p-1 text-indigo-400 hover:bg-indigo-500/10 border border-indigo-500/10 text-indigo-400 rounded"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteMenuItem(item.id)} className="p-1.5 sm:p-1 text-red-600 hover:bg-red-50 rounded"><Trash className="w-4 h-4" /></button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 👥 User Directory Management */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Add user form */}
          <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4 h-fit">
            <h3 className="text-lg font-bold text-white">Create Staff / User Account</h3>
            <form onSubmit={handleAddUser} className="space-y-3">
              <input 
                type="text" 
                required
                placeholder="Username (unique)"
                value={newUser.username}
                onChange={e => setNewUser({...newUser, username: e.target.value})}
                className="w-full p-2 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
              />
              <input 
                type="text" 
                required
                placeholder="Full Name"
                value={newUser.name}
                onChange={e => setNewUser({...newUser, name: e.target.value})}
                className="w-full p-2 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
              />
              <input 
                type="email" 
                required
                placeholder="Email Address"
                value={newUser.email}
                onChange={e => setNewUser({...newUser, email: e.target.value})}
                className="w-full p-2 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
              />
              <input 
                type="tel" 
                required
                placeholder="Phone / Contact Number"
                value={newUser.phone}
                onChange={e => setNewUser({...newUser, phone: e.target.value})}
                className="w-full p-2 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value})}
                  className="w-full p-2 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
                >
                  <option value="GUEST">Guest</option>
                  <option value="WAITER">Waiter</option>
                  <option value="KITCHEN">Kitchen Staff</option>
                  <option value="RECEPTION">Receptionist</option>
                  <option value="ADMIN">System Admin</option>
                </select>
                <input 
                  type="password" 
                  required
                  placeholder="Password"
                  value={newUser.password}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                  className="w-full p-2 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
                />
              </div>
              <button type="submit" className="w-full py-2 glowing-btn-indigo text-white rounded-lg font-bold">
                Register User
              </button>
            </form>
          </div>

          {/* Users List */}
          <div className="lg:col-span-2 glass-panel p-3 sm:p-4 overflow-hidden border border-white/5 rounded-2xl">
            <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Smart Hotel Accounts Registry</h3>
            <div className="overflow-x-auto overflow-y-auto max-h-[400px]">
              <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-950/40 border-b border-white/5 border-white/5 text-gray-400">
                    <th className="p-3">User</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Account Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b border-white/5 border-white/5 hover:bg-white/[0.01]">
                      <td className="p-3 font-semibold text-white">
                        {user.name || 'Unnamed'}
                        <p className="text-xs text-gray-500 font-normal">@{user.username}</p>
                      </td>
                      <td className="p-3 text-gray-400">{user.email || 'None'}</td>
                      <td className="p-3 text-xs font-bold text-indigo-400">{user.role || 'GUEST'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          user.is_active ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                        }`}>
                          {user.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {user.is_active ? (
                          <button 
                            onClick={() => handleDeactivateUser(user.id, true)} 
                            className="text-red-600 hover:bg-red-50 text-xs px-3 py-1.5 sm:px-2 sm:py-1 border border-red-200 rounded font-semibold transition"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleDeactivateUser(user.id, false)} 
                            className="text-green-600 hover:bg-green-50 text-xs px-3 py-1.5 sm:px-2 sm:py-1 border border-green-200 rounded font-semibold transition"
                          >
                            Activate
                          </button>
                        )}
                        {currentUser?.role === 'ADMIN' && (
                          <button 
                            onClick={() => handleDeleteUser(user.id, user.name)} 
                            className="ml-2 text-red-600 hover:bg-red-50 hover:text-red-700 text-xs px-3 py-1.5 sm:px-2 sm:py-1 border border-red-200 rounded font-semibold transition inline-flex items-center gap-1"
                            title="Delete User Account"
                          >
                            <Trash className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ✉️ Marketing Campaign Dispatcher */}
      {activeTab === 'marketing' && (
        <div className="glass-panel p-4 sm:p-6 max-w-3xl mx-auto space-y-4 sm:space-y-6 rounded-2xl">
          <div className="flex items-center gap-3 pb-3 border-b border-white/5">
            <Mail className="w-8 h-8 text-indigo-400" />
            <div>
              <h3 className="text-xl font-bold text-white">Bulk Email Campaign Dispatcher</h3>
              <p className="text-sm text-gray-500">Send promotional emails, seasonal offers, and menu updates to all registered customers simultaneously.</p>
            </div>
          </div>

          <form onSubmit={handleSendCampaign} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">Sender Gmail Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="e.g. marketing@gmail.com"
                  value={campaignSenderEmail}
                  onChange={e => setCampaignSenderEmail(e.target.value)}
                  className="w-full p-3 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent rounded-lg outline-none transition text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">Gmail App Password</label>
                <input 
                  type="password" 
                  required
                  placeholder="e.g. abcd efgh ijkl mnop"
                  value={campaignSenderPassword}
                  onChange={e => setCampaignSenderPassword(e.target.value)}
                  className="w-full p-3 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent rounded-lg outline-none transition text-base"
                />
              </div>
            </div>
            <p className="text-[11px] text-gray-500 -mt-1">Each sender must use their own Gmail App Password. Generate one at: Google Account → Security → 2-Step Verification → App Passwords.</p>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">Campaign Subject / Title</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Exclusive 20% Discount on Luxury Deluxe Suite Stays!"
                value={campaignTitle}
                onChange={e => setCampaignTitle(e.target.value)}
                className="w-full p-3 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent rounded-lg outline-none transition text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">Campaign Email Body</label>
              <textarea 
                required
                rows={6}
                placeholder="Type your message here. All active guests with genuine Gmail addresses will receive this message."
                value={campaignBody}
                onChange={e => setCampaignBody(e.target.value)}
                className="w-full p-3 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent rounded-lg outline-none transition text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !campaignSenderEmail || !campaignSenderPassword || !campaignTitle || !campaignBody}
              className="w-full py-3.5 glowing-btn-indigo hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition disabled:opacity-50 text-base"
            >
              {loading ? 'Dispatching Campaign Emails...' : 'Send Campaign to All Registered Guests'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Admin;
