import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart3, Hotel, Utensils, Users, Settings, Mail, Trash, Edit, Save, 
  X, CreditCard, TrendingUp, Key
} from 'lucide-react';
import { getMenuItemImage } from './Restaurant';

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
  image?: string;
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
  phone?: string;
  role: string;
  is_active: boolean;
}

interface EditUserCredentials {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  newPassword?: string;
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
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Modals / Editors
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [editingUserCredentials, setEditingUserCredentials] = useState<EditUserCredentials | null>(null);

  const [newMenuItemImage, setNewMenuItemImage] = useState<File | null>(null);
  const [editingMenuItemImage, setEditingMenuItemImage] = useState<File | null>(null);

  // New item forms
  const [newRoom, setNewRoom] = useState({ room_number: '', room_type: 'SINGLE', price_per_night: '', capacity: 2, floor: 1 });
  const [newTable, setNewTable] = useState({ table_number: '', capacity: 4 });
  const [newCategory, setNewCategory] = useState({ name: '', description: '', display_order: 1 });
  const [newMenuItem, setNewMenuItem] = useState({ name: '', description: '', price: '', category: '', is_veg: true });
  const [newUser, setNewUser] = useState({ username: '', email: '', name: '', phone: '', role: 'GUEST', password: 'TempPassword123!' });
  const [newFloorNum, setNewFloorNum] = useState('');

  // Marketing form
  const [campaignSenderEmail, setCampaignSenderEmail] = useState('');
  const [campaignSenderPassword, setCampaignSenderPassword] = useState('');
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignBody, setCampaignBody] = useState('');

  useWebSocket((data) => {
    console.log('WebSocket update received:', data);
    loadData(true);
  });

  const loadData = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
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
      if (!silent) {
        setError('Admin retrieval error: ' + err.message);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
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
    const room = rooms.find(r => r.id === id);
    const roomNum = room ? room.room_number : 'this room';
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Room',
      message: `Are you sure you want to delete Room "${roomNum}"? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
          await API.delete(`rooms/${id}/`);
          setSuccess('Room deleted');
          loadData();
        } catch (err: any) {
          setError('Delete failed: ' + (err.message || 'Unknown error'));
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Helper to extract floor number
  const getRoomFloor = (roomNumber: string): number => {
    const num = parseInt(roomNumber);
    if (!isNaN(num)) {
      return Math.floor(num / 100);
    }
    return 1;
  };

  const handleAddFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    const floorVal = parseInt(newFloorNum);
    if (isNaN(floorVal) || floorVal < 1) {
      setError('Please enter a valid floor number.');
      return;
    }
    
    const exists = rooms.some(r => getRoomFloor(r.room_number) === floorVal);
    if (exists) {
      setError(`Floor ${floorVal} already exists in the building.`);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const defaultRoom = {
        room_number: `${floorVal}01`,
        room_type: 'SINGLE',
        price_per_night: '100.00',
        capacity: 2,
        floor: floorVal,
        status: 'AVAILABLE'
      };
      await API.post('rooms/', defaultRoom);
      setSuccess(`Floor L${floorVal} added successfully with default Room ${defaultRoom.room_number}.`);
      setNewFloorNum('');
      loadData();
    } catch (err: any) {
      console.error(err);
      setError(JSON.stringify(err.response?.data || 'Failed to add floor.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFloor = (floorNum: number, floorRooms: Room[]) => {
    const confirmMessage = `Are you sure you want to delete Floor L${floorNum}? This will permanently delete all ${floorRooms.length} rooms on this floor.`;
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Floor',
      message: confirmMessage,
      onConfirm: async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        setConfirmDialog(null);
        try {
          await API.delete(`rooms/delete-floor/${floorNum}/`);
          setSuccess(`Floor L${floorNum} and all its rooms were deleted successfully.`);
          loadData();
        } catch (err: any) {
          console.error(err);
          setError('Failed to delete floor rooms: ' + err.message);
        } finally {
          setLoading(false);
        }
      }
    });
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
      setError(err.response?.data?.error || JSON.stringify(err.response?.data) || 'Failed to add table: ' + err.message);
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
    const table = tables.find(t => t.id === id);
    const tableNum = table ? table.table_number : 'this table';
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Table',
      message: `Are you sure you want to delete Table "${tableNum}"? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
          await API.delete(`tables/${id}/`);
          setSuccess('Table deleted');
          loadData();
        } catch (err: any) {
          setError('Delete failed: ' + (err.message || 'Unknown error'));
        } finally {
          setLoading(false);
        }
      }
    });
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
      const formData = new FormData();
      formData.append('name', newMenuItem.name);
      formData.append('description', newMenuItem.description);
      formData.append('price', newMenuItem.price);
      formData.append('category', newMenuItem.category);
      formData.append('is_veg', String(newMenuItem.is_veg));
      formData.append('is_available', 'true');
      if (newMenuItemImage) {
        formData.append('image', newMenuItemImage);
      }

      await API.post('menu-items/', formData);

      setSuccess('Menu item added');
      setNewMenuItem({ name: '', description: '', price: '', category: '', is_veg: true });
      setNewMenuItemImage(null);
      const fileInput = document.getElementById('new-menu-item-image') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      await loadData();
    } catch (err: any) {
      const detail = err.response?.data;
      if (detail && typeof detail === 'object') {
        const messages = Object.entries(detail)
          .map(([field, msgs]: [string, any]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join(' | ');
        setError('Failed to add menu item — ' + messages);
      } else {
        setError('Failed to add menu item: ' + (err.message || 'Unknown error'));
      }
    }
  };


  const handleUpdateMenuItem = async (item: MenuItem) => {
    try {
      const formData = new FormData();
      formData.append('name', item.name);
      formData.append('description', item.description || '');
      formData.append('price', item.price);
      formData.append('category', String(item.category));
      formData.append('is_veg', String(item.is_veg));
      if (editingMenuItemImage) {
        formData.append('image', editingMenuItemImage);
      }

      await API.patch(`menu-items/${item.id}/`, formData);

      setSuccess('Menu item updated');
      setEditingMenuItem(null);
      setEditingMenuItemImage(null);
      await loadData();
    } catch (err: any) {
      const detail = err.response?.data;
      if (detail && typeof detail === 'object') {
        const messages = Object.entries(detail)
          .map(([field, msgs]: [string, any]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join(' | ');
        setError('Update failed — ' + messages);
      } else {
        setError('Update failed: ' + (err.message || 'Unknown error'));
      }
    }
  };


  const handleDeleteMenuItem = async (id: number) => {
    const item = menuItems.find(m => m.id === id);
    const itemName = item ? item.name : 'this menu item';
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Menu Item',
      message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
          await API.delete(`menu-items/${id}/`);
          setSuccess('Menu item deleted');
          loadData();
        } catch (err: any) {
          setError('Delete failed: ' + (err.message || 'Unknown error'));
        } finally {
          setLoading(false);
        }
      }
    });
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
    setConfirmDialog({
      isOpen: true,
      title: 'Delete User Account',
      message: `Are you sure you want to delete user "${name || 'Unnamed'}"? This action is permanent and will cascade to all bookings and orders for this user.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
          await API.delete(`users/${id}/`);
          setSuccess('User account deleted successfully');
          loadData();
        } catch (err: any) {
          setError(err.response?.data?.error || 'Failed to delete user: ' + (err.message || 'Unknown error'));
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleUpdateUserCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserCredentials) return;

    try {
      const payload: any = {
        username: editingUserCredentials.username,
        name: editingUserCredentials.name,
        email: editingUserCredentials.email,
        phone: editingUserCredentials.phone,
        role: editingUserCredentials.role,
      };

      if (editingUserCredentials.newPassword && editingUserCredentials.newPassword.trim() !== '') {
        payload.password = editingUserCredentials.newPassword.trim();
      }

      await API.patch(`users/${editingUserCredentials.id}/`, payload);
      setSuccess(`Account credentials updated successfully for @${editingUserCredentials.username}`);
      setEditingUserCredentials(null);
      loadData();
    } catch (err: any) {
      const errMsg = err.response?.data ? JSON.stringify(err.response.data) : 'Failed to update user credentials';
      setError(errMsg);
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
        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#171717] flex items-center gap-2 sm:gap-3">
          <Settings className="w-6 h-6 sm:w-8 sm:h-8 text-[#C49A32] animate-spin-slow" />
          Administrative Control Center
        </h2>
        <button 
          onClick={() => loadData()}
          className="bg-[#F8F6F1] border border-black/5 hover:bg-[#F8F6F1] text-[#171717]/80 px-4 py-2.5 sm:py-2 rounded-xl transition cursor-pointer text-sm sm:text-base w-full sm:w-auto"
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
      <div className="flex overflow-x-auto gap-2 border-b border-black/5 pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
        {(['analytics', 'rooms', 'tables', 'menu', 'users', 'marketing'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setError(null); setSuccess(null); }}
            className={`px-4 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold capitalize transition whitespace-nowrap flex-shrink-0 ${
              activeTab === tab 
                ? 'glowing-btn-indigo text-white shadow-sm' 
                : 'bg-white/80 border border-black/5 text-[#6E6A63] hover:text-[#171717] hover:bg-[#F8F6F1]'
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
            <div className="glass-panel p-4 sm:p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between h-[220px] group transition border hover:border-black/10 shadow-lg">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition duration-300">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
                    Finances
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-black/20 p-1 rounded-lg border border-black/5">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="bg-transparent text-[#171717]/80 text-[10px] font-bold px-1 py-0.5 focus:outline-none cursor-pointer appearance-none text-center hover:text-[#171717]"
                  >
                    <option className="bg-white text-[#171717]" value="1">Jan</option>
                    <option className="bg-white text-[#171717]" value="2">Feb</option>
                    <option className="bg-white text-[#171717]" value="3">Mar</option>
                    <option className="bg-white text-[#171717]" value="4">Apr</option>
                    <option className="bg-white text-[#171717]" value="5">May</option>
                    <option className="bg-white text-[#171717]" value="6">Jun</option>
                    <option className="bg-white text-[#171717]" value="7">Jul</option>
                    <option className="bg-white text-[#171717]" value="8">Aug</option>
                    <option className="bg-white text-[#171717]" value="9">Sep</option>
                    <option className="bg-white text-[#171717]" value="10">Oct</option>
                    <option className="bg-white text-[#171717]" value="11">Nov</option>
                    <option className="bg-white text-[#171717]" value="12">Dec</option>
                  </select>
                  <span className="text-gray-600 text-[10px]">/</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="bg-transparent text-[#171717]/80 text-[10px] font-bold px-1 py-0.5 focus:outline-none cursor-pointer appearance-none text-center hover:text-[#171717]"
                  >
                    {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map((yr) => (
                      <option className="bg-white text-[#171717]" key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 my-auto w-full">
                <div className="flex flex-col bg-black/3 p-2 rounded-lg border border-black/5">
                  <span className="text-[9px] text-[#6E6A63] font-semibold uppercase tracking-wider mb-1">Daily</span>
                  <span className="text-sm font-extrabold text-[#171717]">
                    ₹{(analytics?.daily_revenue ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-col bg-black/3 p-2 rounded-lg border border-black/5">
                  <span className="text-[9px] text-[#6E6A63] font-semibold uppercase tracking-wider mb-1">Monthly</span>
                  <span className="text-sm font-extrabold text-[#171717]">
                    ₹{(analytics?.monthly_revenue ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-col bg-black/3 p-2 rounded-lg border border-black/5">
                  <span className="text-[9px] text-[#6E6A63] font-semibold uppercase tracking-wider mb-1">Yearly</span>
                  <span className="text-sm font-extrabold text-[#171717]">
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

              <div className="flex items-center justify-between text-[9px] font-bold text-emerald-400/80 uppercase tracking-widest mt-3 pt-2 border-t border-black/5">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Live Revenue
                </div>
                <span className="text-[8px] text-[#6E6A63]/80 normal-case font-medium">
                  Filtered: {selectedMonth}/{selectedYear}
                </span>
              </div>
            </div>

            <div className="glass-panel p-4 sm:p-6 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6E6A63]/80 font-semibold">Occupancy Rate</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-[#171717] mt-2">{analytics.occupancy_rate}%</p>
              </div>
              <div className="p-4 bg-[#C49A32]/10 border border-[#C49A32]/10 text-[#C49A32] rounded-full text-[#C49A32]">
                <BarChart3 className="w-7 h-7" />
              </div>
            </div>

            <div className="glass-panel p-4 sm:p-6 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6E6A63]/80 font-semibold">Dining Orders</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-[#171717] mt-2">{analytics.total_orders}</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-full text-orange-600">
                <Utensils className="w-7 h-7" />
              </div>
            </div>

            <div className="glass-panel p-4 sm:p-6 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6E6A63]/80 font-semibold">Staff & User Accounts</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-[#171717] mt-2">{users.length}</p>
              </div>
              <div className="p-4 bg-[#C49A32]/10 rounded-full text-[#b08a2d]">
                <Users className="w-7 h-7" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            {/* Occupancy stats */}
            <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4">
              <h3 className="text-lg font-bold text-[#171717] flex items-center gap-2">
                <Hotel className="w-5 h-5 text-[#C49A32]" />
                Hotel Operations Status
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
                <div className="p-4 bg-[#C49A32]/10 border border-[#C49A32]/20 text-blue-300 rounded-lg">
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
              <h3 className="text-lg font-bold text-[#171717] flex items-center gap-2">
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
                <div className="p-4 bg-[#C49A32]/10 border border-[#C49A32]/20 text-[#C49A32] rounded-lg">
                  <span className="text-2xl font-bold">{analytics.occupied_tables}</span>
                  <p className="text-xs text-[#C49A32] font-medium mt-1">Occupied</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🚪 Rooms Management CRUD */}
      {activeTab === 'rooms' && (() => {
        const uniqueFloors = Array.from(new Set(rooms.map(r => getRoomFloor(r.room_number)))).sort((a, b) => b - a);
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Left Column: forms */}
            <div className="space-y-4 sm:space-y-6">
              {/* Add Room Form */}
              <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4 h-fit">
                <h3 className="text-lg font-bold text-[#171717]">Add New Room</h3>
                <form onSubmit={handleAddRoom} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#6E6A63]/80 mb-1">Room Number</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. 101"
                      value={newRoom.room_number}
                      onChange={e => setNewRoom({...newRoom, room_number: e.target.value})}
                      className="w-full p-2 bg-[#F8F6F1]/60 border border-black/5 text-[#171717]/90 focus:ring-2 focus:ring-[#C49A32] focus:border-transparent rounded-lg outline-none transition cursor-pointer"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#6E6A63]/80 mb-1">Type</label>
                      <select 
                        value={newRoom.room_type}
                        onChange={e => setNewRoom({...newRoom, room_type: e.target.value})}
                        className="w-full p-2 bg-[#F8F6F1]/60 border border-black/5 text-[#171717]/90 focus:ring-2 focus:ring-[#C49A32] focus:border-transparent rounded-lg outline-none transition cursor-pointer"
                      >
                        <option value="SINGLE">Single</option>
                        <option value="DOUBLE">Double</option>
                        <option value="DELUXE">Deluxe</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#6E6A63]/80 mb-1">Floor</label>
                      <input 
                        type="number" 
                        value={newRoom.floor}
                        onChange={e => setNewRoom({...newRoom, floor: parseInt(e.target.value) || 1})}
                        className="w-full p-2 bg-[#F8F6F1]/60 border border-black/5 text-[#171717]/90 focus:ring-2 focus:ring-[#C49A32] focus:border-transparent rounded-lg outline-none transition cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#6E6A63]/80 mb-1">Price / Night (₹)</label>
                      <input 
                        type="number" 
                        required
                        value={newRoom.price_per_night}
                        onChange={e => setNewRoom({...newRoom, price_per_night: e.target.value})}
                        className="w-full p-2 bg-[#F8F6F1]/60 border border-black/5 text-[#171717]/90 focus:ring-2 focus:ring-[#C49A32] focus:border-transparent rounded-lg outline-none transition cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#6E6A63]/80 mb-1">Capacity</label>
                      <input 
                        type="number" 
                        value={newRoom.capacity}
                        onChange={e => setNewRoom({...newRoom, capacity: parseInt(e.target.value) || 2})}
                        className="w-full p-2 bg-[#F8F6F1]/60 border border-black/5 text-[#171717]/90 focus:ring-2 focus:ring-[#C49A32] focus:border-transparent rounded-lg outline-none transition cursor-pointer"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    className="w-full py-2.5 glowing-btn-indigo hover:bg-[#b08a2d] text-[#171717] font-bold rounded-lg shadow-sm cursor-pointer"
                  >
                    Add Room Account
                  </button>
                </form>
              </div>

              {/* Floor Structure Management */}
              <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-[#C49A32]">
                  <Hotel className="w-5 h-5 text-[#C49A32]" />
                  <h3 className="text-lg font-bold text-[#171717]">Manage Building Floors</h3>
                </div>
                <p className="text-xs text-[#6E6A63]">
                  Add or delete floors from the 3D SVG building structure.
                </p>

                {/* Add Floor Form */}
                <form onSubmit={handleAddFloor} className="space-y-2 pt-2 border-t border-black/5">
                  <label className="block text-xs font-semibold text-[#6E6A63]/80 mb-1">Add Floor Number</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      max="99"
                      required
                      placeholder="e.g. 5"
                      value={newFloorNum}
                      onChange={e => setNewFloorNum(e.target.value)}
                      className="w-full p-2 bg-[#F8F6F1]/60 border border-black/5 text-[#171717]/90 focus:ring-2 focus:ring-[#C49A32] focus:border-transparent rounded-lg outline-none transition cursor-pointer text-xs"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 glowing-btn-indigo hover:bg-[#b08a2d] text-[#171717] font-bold rounded-lg text-xs shrink-0 cursor-pointer"
                    >
                      Add Floor
                    </button>
                  </div>
                </form>

                {/* Current Floors List */}
                <div className="space-y-2 pt-2 border-t border-black/5">
                  <label className="block text-xs font-semibold text-[#6E6A63]/80">Current Building Floors</label>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                    {uniqueFloors.map(floorNum => {
                      const floorRooms = rooms.filter(r => getRoomFloor(r.room_number) === floorNum);
                      return (
                        <div key={floorNum} className="flex items-center justify-between p-2 bg-[#F8F6F1]/80 rounded-lg border border-black/5">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-[#171717]">Level L{floorNum}</span>
                            <span className="text-[10px] text-[#6E6A63]/80">{floorRooms.length} rooms configured</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteFloor(floorNum, floorRooms)}
                            disabled={loading}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition cursor-pointer"
                            title={`Delete Floor L${floorNum} and all its rooms`}
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Rooms Table */}
            <div className="lg:col-span-2 glass-panel p-3 sm:p-4 overflow-hidden border border-black/5 rounded-2xl">
              <h3 className="text-base sm:text-lg font-bold text-[#171717] mb-3 sm:mb-4">Hotel Room Inventory</h3>
              <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
                <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-[#F8F6F1]/60 border-b border-black/5 border-black/5 text-[#6E6A63]">
                      <th className="p-3">Room</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map(room => (
                      <tr key={room.id} className="border-b border-black/5 border-black/5 hover:bg-white/[0.01]">
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
                              <button onClick={() => handleUpdateRoom(editingRoom)} className="p-1.5 sm:p-1 bg-green-500 text-[#171717] rounded"><Save className="w-4 h-4" /></button>
                              <button onClick={() => setEditingRoom(null)} className="p-1.5 sm:p-1 bg-gray-500 text-[#171717] rounded"><X className="w-4 h-4" /></button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-3 font-semibold text-[#171717]">Room {room.room_number} (Floor {room.floor})</td>
                            <td className="p-3 text-[#6E6A63]">{room.room_type} (Max: {room.capacity})</td>
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
                              <button onClick={() => setEditingRoom(room)} className="p-1.5 sm:p-1 text-[#C49A32] hover:bg-[#C49A32]/10 border border-[#C49A32]/10 text-[#C49A32] rounded"><Edit className="w-4 h-4" /></button>
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
        );
      })()}

      {/* 🍽️ Tables Management CRUD */}
      {activeTab === 'tables' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4 h-fit">
            <h3 className="text-lg font-bold text-[#171717]">Add New Dining Table</h3>
            <form onSubmit={handleAddTable} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#6E6A63]/80 mb-1">Table Number</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. 101"
                  value={newTable.table_number}
                  onChange={e => setNewTable({...newTable, table_number: e.target.value})}
                  className="w-full p-2 bg-[#F8F6F1]/60 border border-black/5 text-[#171717]/90 focus:ring-2 focus:ring-[#C49A32] focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6E6A63]/80 mb-1">Seating Capacity</label>
                <input 
                  type="number" 
                  value={newTable.capacity}
                  onChange={e => setNewTable({...newTable, capacity: parseInt(e.target.value) || 4})}
                  className="w-full p-2 bg-[#F8F6F1]/60 border border-black/5 text-[#171717]/90 focus:ring-2 focus:ring-[#C49A32] focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
                />
              </div>
              <button type="submit" className="w-full py-2.5 glowing-btn-indigo hover:bg-[#b08a2d] text-[#171717] font-bold rounded-lg">
                Add Table Account
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 glass-panel p-3 sm:p-4 overflow-hidden border border-black/5 rounded-2xl">
            <h3 className="text-base sm:text-lg font-bold text-[#171717] mb-3 sm:mb-4">Dining Room Table Layout</h3>
            <div className="overflow-x-auto overflow-y-auto max-h-[400px]">
              <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[450px]">
                <thead>
                  <tr className="bg-[#F8F6F1]/60 border-b border-black/5 border-black/5 text-[#6E6A63]">
                    <th className="p-3">Table Number</th>
                    <th className="p-3">Capacity</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(new Set(tables.map(t => t.capacity)))
                    .sort((a, b) => a - b)
                    .map(capacity => (
                      <React.Fragment key={capacity}>
                        {/* Capacity Group Header */}
                        <tr className="bg-[#F8F6F1] border-y border-black/10">
                          <td colSpan={4} className="p-3 text-xs font-black uppercase text-[#C49A32] tracking-widest bg-[#C49A32]/5">
                            {capacity} Seater Tables
                          </td>
                        </tr>
                        {/* Tables in this group */}
                        {tables.filter(t => t.capacity === capacity).sort((a, b) => a.table_number.localeCompare(b.table_number)).map(table => (
                          <tr key={table.id} className="border-b border-black/5 border-black/5 hover:bg-white/[0.01]">
                            {editingTable?.id === table.id ? (
                              <>
                                <td className="p-2">
                                  <input 
                                    type="text" 
                                    value={editingTable.table_number}
                                    onChange={e => setEditingTable({...editingTable, table_number: e.target.value})}
                                    className="w-20 p-1 bg-[#F8F6F1] border border-black/10 text-[#171717] rounded outline-none focus:ring-1 focus:ring-[#C49A32]"
                                  />
                                </td>
                                <td className="p-2">
                                  <input 
                                    type="number" 
                                    value={editingTable.capacity}
                                    onChange={e => setEditingTable({...editingTable, capacity: parseInt(e.target.value) || 2})}
                                    className="w-20 p-1 bg-[#F8F6F1] border border-black/10 text-[#171717] rounded outline-none focus:ring-1 focus:ring-[#C49A32]"
                                  />
                                </td>
                                <td className="p-2">
                                  <select 
                                    value={editingTable.status}
                                    onChange={e => setEditingTable({...editingTable, status: e.target.value})}
                                    className="p-1 bg-[#F8F6F1] border border-black/10 text-[#171717] rounded outline-none focus:ring-1 focus:ring-[#C49A32] text-xs"
                                  >
                                    <option value="VACANT">Vacant</option>
                                    <option value="OCCUPIED">Occupied</option>
                                    <option value="UNDER_CLEANING">Under Cleaning</option>
                                  </select>
                                </td>
                                <td className="p-2 text-right space-x-1">
                                  <button onClick={() => handleUpdateTable(editingTable)} className="p-1.5 sm:p-1 bg-green-500 hover:bg-green-600 transition text-[#171717] rounded"><Save className="w-4 h-4" /></button>
                                  <button onClick={() => setEditingTable(null)} className="p-1.5 sm:p-1 bg-slate-600 hover:bg-slate-500 transition text-[#171717] rounded"><X className="w-4 h-4" /></button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="p-3 font-semibold text-[#171717]">Table {table.table_number}</td>
                                <td className="p-3 text-[#6E6A63]">{table.capacity} Seats</td>
                                <td className="p-3">
                                  <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                                    table.status === 'VACANT' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' :
                                    table.status === 'OCCUPIED' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                                  }`}>
                                    {table.status}
                                  </span>
                                </td>
                                <td className="p-3 text-right space-x-2">
                                  <button onClick={() => setEditingTable(table)} className="p-1.5 sm:p-1 hover:bg-[#C49A32]/20 border border-[#C49A32]/20 text-[#C49A32] transition rounded"><Edit className="w-4 h-4" /></button>
                                  <button onClick={() => handleDeleteTable(table.id)} className="p-1.5 sm:p-1 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20 transition rounded"><Trash className="w-4 h-4" /></button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </React.Fragment>
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
              <h3 className="text-lg font-bold text-[#171717]">Add Menu Category</h3>
              <form onSubmit={handleAddCategory} className="space-y-3">
                <input 
                  type="text" 
                  required
                  placeholder="Category Name, e.g. Desserts"
                  value={newCategory.name}
                  onChange={e => setNewCategory({...newCategory, name: e.target.value})}
                  className="w-full p-2 bg-[#F8F6F1]/60 border border-black/5 text-[#171717]/90 focus:ring-2 focus:ring-[#C49A32] focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
                />
                <input 
                  type="text" 
                  placeholder="Short Description"
                  value={newCategory.description}
                  onChange={e => setNewCategory({...newCategory, description: e.target.value})}
                  className="w-full p-2 bg-[#F8F6F1]/60 border border-black/5 text-[#171717]/90 focus:ring-2 focus:ring-[#C49A32] focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
                />
                <input 
                  type="number" 
                  placeholder="Display Order, e.g. 1"
                  value={newCategory.display_order}
                  onChange={e => setNewCategory({...newCategory, display_order: parseInt(e.target.value) || 1})}
                  className="w-full p-2 bg-[#F8F6F1]/60 border border-black/5 text-[#171717]/90 focus:ring-2 focus:ring-[#C49A32] focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
                />
                <button type="submit" className="w-full py-2 glowing-btn-indigo text-white rounded-lg font-bold">
                  Create Category
                </button>
              </form>
            </div>

            {/* Menu Item Form */}
            <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4">
              <h3 className="text-lg font-bold text-[#171717]">Add New Dish</h3>
              <form onSubmit={handleAddMenuItem} className="space-y-3">
                <input 
                  type="text" 
                  required
                  placeholder="Dish Name, e.g. Veg Burger"
                  value={newMenuItem.name}
                  onChange={e => setNewMenuItem({...newMenuItem, name: e.target.value})}
                  className="w-full p-2 bg-[#F8F6F1]/60 border border-black/5 text-[#171717]/90 focus:ring-2 focus:ring-[#C49A32] focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
                />
                <input 
                  type="text" 
                  placeholder="Description/Ingredients"
                  value={newMenuItem.description}
                  onChange={e => setNewMenuItem({...newMenuItem, description: e.target.value})}
                  className="w-full p-2 bg-[#F8F6F1]/60 border border-black/5 text-[#171717]/90 focus:ring-2 focus:ring-[#C49A32] focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input 
                    type="number" 
                    required
                    placeholder="Price (₹)"
                    value={newMenuItem.price}
                    onChange={e => setNewMenuItem({...newMenuItem, price: e.target.value})}
                    className="w-full p-2 bg-[#F8F6F1]/60 border border-black/5 text-[#171717]/90 focus:ring-2 focus:ring-[#C49A32] focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
                  />
                  <select
                    required
                    value={newMenuItem.category}
                    onChange={e => setNewMenuItem({...newMenuItem, category: e.target.value})}
                    className="w-full p-2 bg-[#F8F6F1]/60 border border-black/5 text-[#171717]/90 focus:ring-2 focus:ring-[#C49A32] focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
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
                    className="w-4 h-4 text-[#C49A32] focus:ring-[#C49A32] border-gray-300 rounded"
                  />
                  <label htmlFor="veg-checkbox" className="text-sm font-semibold text-[#171717]/80">Is Vegetarian Dish</label>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6E6A63] mb-1">Dish Image (Optional)</label>
                  <input 
                    type="file" 
                    id="new-menu-item-image"
                    accept="image/*"
                    onChange={e => setNewMenuItemImage(e.target.files?.[0] || null)}
                    className="w-full p-2 bg-[#F8F6F1]/60 border border-black/5 text-[#6E6A63] focus:ring-2 focus:ring-[#C49A32] rounded-lg outline-none transition cursor-pointer text-xs"
                  />
                </div>
                <button type="submit" className="w-full py-2 glowing-btn-indigo text-white rounded-lg font-bold">
                  Add Menu Item
                </button>
              </form>
            </div>
          </div>

          {/* Menu Items Table */}
          <div className="lg:col-span-2 glass-panel p-3 sm:p-4 overflow-hidden border border-black/5 rounded-2xl">
            <h3 className="text-base sm:text-lg font-bold text-[#171717] mb-3 sm:mb-4">Active Restaurant Menu</h3>
            <div className="overflow-x-auto overflow-y-auto max-h-[450px]">
              <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[550px]">
                <thead>
                  <tr className="bg-[#F8F6F1]/60 border-b border-black/5 border-black/5 text-[#6E6A63]">
                    <th className="p-3">Dish</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.map(item => (
                    <tr key={item.id} className="border-b border-black/5 border-black/5 hover:bg-white/[0.01]">
                      {editingMenuItem?.id === item.id ? (
                        <>
                          <td className="p-2">
                            <div className="flex flex-col gap-1 min-w-[120px]">
                              <input 
                                type="text" 
                                value={editingMenuItem.name}
                                onChange={e => setEditingMenuItem({...editingMenuItem, name: e.target.value})}
                                className="w-full p-1 border rounded text-xs bg-[#F8F6F1] text-[#171717] border-black/10"
                              />
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={e => setEditingMenuItemImage(e.target.files?.[0] || null)}
                                className="text-[10px] text-[#6E6A63] mt-1 cursor-pointer w-full"
                              />
                            </div>
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
                            <button onClick={() => handleUpdateMenuItem(editingMenuItem)} className="p-1.5 sm:p-1 bg-green-500 text-[#171717] rounded"><Save className="w-4 h-4" /></button>
                            <button onClick={() => setEditingMenuItem(null)} className="p-1.5 sm:p-1 bg-gray-500 text-[#171717] rounded"><X className="w-4 h-4" /></button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-3 font-semibold text-[#171717] flex items-center gap-3">
                            <img 
                              src={getMenuItemImage(item)} 
                              alt={item.name}
                              className="w-10 h-10 object-cover rounded-lg border border-black/10 shadow-sm"
                              onError={(e: any) => {
                                e.target.onerror = null;
                                e.target.src = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=100&auto=format&fit=crop';
                              }}
                            />
                            <div>
                              {item.name}
                              <p className="text-xs text-[#6E6A63]/80 font-normal">{item.description}</p>
                            </div>
                          </td>
                          <td className="p-3 text-[#6E6A63] text-xs">
                            {categories.find(c => c.id === item.category)?.name || 'Uncategorized'}
                          </td>
                          <td className="p-3 font-bold">₹{parseFloat(item.price).toFixed(2)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-[#171717] ${
                              item.is_veg ? 'bg-green-600' : 'bg-red-600'
                            }`}>
                              {item.is_veg ? 'VEG' : 'NON-VEG'}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-2">
                            <button onClick={() => setEditingMenuItem(item)} className="p-1.5 sm:p-1 text-[#C49A32] hover:bg-[#C49A32]/10 border border-[#C49A32]/10 text-[#C49A32] rounded"><Edit className="w-4 h-4" /></button>
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
            <h3 className="text-lg font-bold text-[#171717]">Create Staff / User Account</h3>
            <form onSubmit={handleAddUser} className="space-y-3">
              <input 
                type="text" 
                required
                placeholder="Username (unique)"
                value={newUser.username}
                onChange={e => setNewUser({...newUser, username: e.target.value})}
                className="w-full p-2 bg-[#F8F6F1]/60 border border-black/5 text-[#171717]/90 focus:ring-2 focus:ring-[#C49A32] focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
              />
              <input 
                type="text" 
                required
                placeholder="Full Name"
                value={newUser.name}
                onChange={e => setNewUser({...newUser, name: e.target.value})}
                className="w-full p-2 bg-[#F8F6F1]/60 border border-black/5 text-[#171717]/90 focus:ring-2 focus:ring-[#C49A32] focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
              />
              <input 
                type="email" 
                required
                placeholder="Email Address"
                value={newUser.email}
                onChange={e => setNewUser({...newUser, email: e.target.value})}
                className="w-full p-2 bg-[#F8F6F1]/60 border border-black/5 text-[#171717]/90 focus:ring-2 focus:ring-[#C49A32] focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
              />
              <input 
                type="tel" 
                required
                placeholder="Phone / Contact Number"
                value={newUser.phone}
                onChange={e => setNewUser({...newUser, phone: e.target.value})}
                className="w-full p-2 bg-[#F8F6F1]/60 border border-black/5 text-[#171717]/90 focus:ring-2 focus:ring-[#C49A32] focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value})}
                  className="w-full p-2 bg-[#F8F6F1]/60 border border-black/5 text-[#171717]/90 focus:ring-2 focus:ring-[#C49A32] focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
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
                  className="w-full p-2 bg-[#F8F6F1]/60 border border-black/5 text-[#171717]/90 focus:ring-2 focus:ring-[#C49A32] focus:border-t border-white/[0.04]ransparent rounded-lg outline-none transition cursor-pointer"
                />
              </div>
              <button type="submit" className="w-full py-2 glowing-btn-indigo text-white rounded-lg font-bold">
                Register User
              </button>
            </form>
          </div>

          {/* Users List */}
          <div className="lg:col-span-2 glass-panel p-3 sm:p-4 overflow-hidden border border-black/5 rounded-2xl">
            <h3 className="text-base sm:text-lg font-bold text-[#171717] mb-3 sm:mb-4">Imperium Hotel Accounts Registry</h3>
            <div className="overflow-x-auto overflow-y-auto max-h-[400px]">
              <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-[#F8F6F1]/60 border-b border-black/5 border-black/5 text-[#6E6A63]">
                    <th className="p-3">User</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Account Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b border-black/5 border-black/5 hover:bg-white/[0.01]">
                      <td className="p-3 font-semibold text-[#171717]">
                        {user.name || 'Unnamed'}
                        <p className="text-xs text-[#6E6A63]/80 font-normal">@{user.username}</p>
                      </td>
                      <td className="p-3 text-[#6E6A63]">{user.email || 'None'}</td>
                      <td className="p-3 text-xs font-bold text-[#C49A32]">{user.role || 'GUEST'}</td>
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
                          <>
                            <button 
                              onClick={() => setEditingUserCredentials({
                                id: user.id,
                                username: user.username,
                                name: user.name || '',
                                email: user.email || '',
                                phone: user.phone || '',
                                role: user.role || 'GUEST',
                                newPassword: ''
                              })}
                              className="ml-2 text-[#C49A32] hover:bg-[#C49A32]/10 border border-[#C49A32]/20 text-xs px-2.5 py-1 rounded font-semibold transition inline-flex items-center gap-1 cursor-pointer"
                              title="Edit Credentials (Username & Password)"
                            >
                              <Key className="w-3.5 h-3.5" />
                              Edit Credentials
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(user.id, user.name)} 
                              className="ml-2 text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 text-xs px-2.5 py-1 rounded font-semibold transition inline-flex items-center gap-1 cursor-pointer"
                              title="Delete User Account"
                            >
                              <Trash className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </>
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
          <div className="flex items-center gap-3 pb-3 border-b border-black/5">
            <Mail className="w-8 h-8 text-[#C49A32]" />
            <div>
              <h3 className="text-xl font-bold text-[#171717]">Bulk Email Campaign Dispatcher</h3>
              <p className="text-sm text-[#6E6A63]/80">Send promotional emails, seasonal offers, and menu updates to all registered customers simultaneously.</p>
            </div>
          </div>

          <form onSubmit={handleSendCampaign} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#171717]/80 mb-1">Sender Gmail Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="e.g. marketing@gmail.com"
                  value={campaignSenderEmail}
                  onChange={e => setCampaignSenderEmail(e.target.value)}
                  className="w-full p-3 bg-[#F8F6F1]/60 border border-black/5 text-[#171717]/90 focus:ring-2 focus:ring-[#C49A32] focus:border-transparent rounded-lg outline-none transition text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#171717]/80 mb-1">Gmail App Password</label>
                <input 
                  type="password" 
                  required
                  placeholder="e.g. abcd efgh ijkl mnop"
                  value={campaignSenderPassword}
                  onChange={e => setCampaignSenderPassword(e.target.value)}
                  className="w-full p-3 bg-[#F8F6F1]/60 border border-black/5 text-[#171717]/90 focus:ring-2 focus:ring-[#C49A32] focus:border-transparent rounded-lg outline-none transition text-base"
                />
              </div>
            </div>
            <p className="text-[11px] text-[#6E6A63]/80 -mt-1">Each sender must use their own Gmail App Password. Generate one at: Google Account → Security → 2-Step Verification → App Passwords.</p>
            <div>
              <label className="block text-sm font-semibold text-[#171717]/80 mb-1">Campaign Subject / Title</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Exclusive 20% Discount on Luxury Deluxe Suite Stays!"
                value={campaignTitle}
                onChange={e => setCampaignTitle(e.target.value)}
                className="w-full p-3 bg-[#F8F6F1]/60 border border-black/5 text-[#171717]/90 focus:ring-2 focus:ring-[#C49A32] focus:border-transparent rounded-lg outline-none transition text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#171717]/80 mb-1">Campaign Email Body</label>
              <textarea 
                required
                rows={6}
                placeholder="Type your message here. All active guests with genuine Gmail addresses will receive this message."
                value={campaignBody}
                onChange={e => setCampaignBody(e.target.value)}
                className="w-full p-3 bg-[#F8F6F1]/60 border border-black/5 text-[#171717]/90 focus:ring-2 focus:ring-[#C49A32] focus:border-transparent rounded-lg outline-none transition text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !campaignSenderEmail || !campaignSenderPassword || !campaignTitle || !campaignBody}
              className="w-full py-3.5 glowing-btn-indigo hover:bg-[#b08a2d] text-[#171717] font-bold rounded-lg shadow-md transition disabled:opacity-50 text-base"
            >
              {loading ? 'Dispatching Campaign Emails...' : 'Send Campaign to All Registered Guests'}
            </button>
          </form>
        </div>
      )}

      {/* 🔐 Admin Edit User Credentials Modal */}
      {editingUserCredentials && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel p-6 rounded-2xl max-w-md w-full border border-black/10 space-y-4 shadow-2xl relative">
            <div className="flex justify-between items-center pb-3 border-b border-black/10">
              <h3 className="text-lg font-bold text-[#171717] flex items-center gap-2">
                <Key className="w-5 h-5 text-[#C49A32]" />
                Edit User Credentials
              </h3>
              <button 
                onClick={() => setEditingUserCredentials(null)}
                className="text-[#6E6A63] hover:text-[#171717] p-1 rounded-lg hover:bg-black/3 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUserCredentials} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#6E6A63] mb-1">Username</label>
                <input 
                  type="text" 
                  required
                  value={editingUserCredentials.username}
                  onChange={e => setEditingUserCredentials({...editingUserCredentials, username: e.target.value})}
                  className="w-full p-2.5 bg-white border border-black/10 text-[#171717] rounded-xl outline-none focus:ring-2 focus:ring-[#C49A32] text-sm cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6E6A63] mb-1">
                  New Password <span className="text-[#6E6A63]/80 font-normal">(Leave blank to keep unchanged)</span>
                </label>
                <input 
                  type="password" 
                  placeholder="Enter new password"
                  value={editingUserCredentials.newPassword || ''}
                  onChange={e => setEditingUserCredentials({...editingUserCredentials, newPassword: e.target.value})}
                  className="w-full p-2.5 bg-white border border-black/10 text-[#171717] rounded-xl outline-none focus:ring-2 focus:ring-[#C49A32] text-sm cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6E6A63] mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={editingUserCredentials.name}
                  onChange={e => setEditingUserCredentials({...editingUserCredentials, name: e.target.value})}
                  className="w-full p-2.5 bg-white border border-black/10 text-[#171717] rounded-xl outline-none focus:ring-2 focus:ring-[#C49A32] text-sm cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6E6A63] mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={editingUserCredentials.email}
                  onChange={e => setEditingUserCredentials({...editingUserCredentials, email: e.target.value})}
                  className="w-full p-2.5 bg-white border border-black/10 text-[#171717] rounded-xl outline-none focus:ring-2 focus:ring-[#C49A32] text-sm cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#6E6A63] mb-1">Phone Number</label>
                  <input 
                    type="text" 
                    value={editingUserCredentials.phone}
                    onChange={e => setEditingUserCredentials({...editingUserCredentials, phone: e.target.value})}
                    className="w-full p-2.5 bg-white border border-black/10 text-[#171717] rounded-xl outline-none focus:ring-2 focus:ring-[#C49A32] text-sm cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6E6A63] mb-1">System Role</label>
                  <select 
                    value={editingUserCredentials.role}
                    onChange={e => setEditingUserCredentials({...editingUserCredentials, role: e.target.value})}
                    className="w-full p-2.5 bg-white border border-black/10 text-[#171717] rounded-xl outline-none focus:ring-2 focus:ring-[#C49A32] text-sm cursor-pointer"
                  >
                    <option value="GUEST">Guest</option>
                    <option value="WAITER">Waiter</option>
                    <option value="KITCHEN">Kitchen Staff</option>
                    <option value="RECEPTION">Receptionist</option>
                    <option value="ADMIN">System Admin</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUserCredentials(null)}
                  className="flex-1 py-2.5 bg-[#F8F6F1] text-[#171717]/80 font-semibold rounded-xl border border-black/10 hover:bg-[#F8F6F1] text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 glowing-btn-indigo text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  Save Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDialog && confirmDialog.isOpen && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in p-4">
          <div className="bg-[#F8F6F1] border border-black/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative animate-scale-in">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-rose-600"></div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                  <Trash className="w-5 h-5 text-rose-400" />
                </div>
                <h3 className="text-xl font-bold text-[#171717] leading-tight">{confirmDialog.title}</h3>
              </div>
              <p className="text-sm text-[#171717]/80 leading-relaxed mb-6">
                {confirmDialog.message}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 py-2.5 bg-[#F8F6F1] hover:bg-[#F8F6F1] border border-black/5 text-[#171717]/80 font-semibold rounded-xl transition cursor-pointer text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-[#171717] font-bold rounded-xl shadow-lg shadow-rose-900/30 transition cursor-pointer text-sm"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Admin;
