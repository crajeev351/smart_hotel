import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import API from '../services/api';
import { 
  Utensils, ShoppingCart, Search, Plus, Minus, Send, 
  Clock, CheckCircle, RefreshCcw, Table as TableIcon, HelpCircle,
  Coffee, Users, UserPlus, Calendar
} from 'lucide-react';

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: string;
  category: number;
  category_name: string;
  is_veg: boolean;
  is_available: boolean;
  image: string;
}

interface MenuCategory {
  id: number;
  name: string;
}

interface Table {
  id: number;
  table_number: string;
  capacity: number;
  status: string;
  current_guest?: string | null;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes: string;
}

interface OrderItemDetails {
  id: number;
  menu_item_details: {
    name: string;
    price: string;
    is_veg: boolean;
  };
  quantity: number;
  status: string;
  notes: string;
}

interface Order {
  id: number;
  table_number: string;
  status: string;
  total_amount: string;
  items: OrderItemDetails[];
}

const getMenuItemImage = (item: any): string => {
  if (item.image && typeof item.image === 'string' && item.image.trim() !== '') {
    if (item.image.startsWith('http')) return item.image;
    const baseURL = API.defaults.baseURL || 'http://127.0.0.1:8000/api/';
    const host = baseURL.replace(/\/api\/?$/, '');
    const cleanPath = item.image.startsWith('/') ? item.image : `/${item.image}`;
    return `${host}${cleanPath}`;
  }

  const lowerName = (item.name || '').toLowerCase();
  const lowerCat = (item.category_name || item.category || '').toString().toLowerCase();

  if (lowerName.includes('burger')) {
    return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80';
  }
  if (lowerName.includes('fries')) {
    return 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80';
  }
  if (lowerName.includes('pinacolada') || lowerName.includes('pina colada') || lowerCat.includes('drink')) {
    return 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80';
  }
  if (lowerName.includes('jamun') || lowerName.includes('cake') || lowerCat.includes('dessert')) {
    return 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80';
  }
  if (lowerName.includes('paneer') || lowerName.includes('naan') || lowerCat.includes('main')) {
    return 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80';
  }
  if (lowerName.includes('coffee')) {
    return 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80';
  }

  return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80';
};

const Restaurant: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tableParam = searchParams.get('table');

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [tableReservations, setTableReservations] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [selectedTable, setSelectedTable] = useState<string>(tableParam || '');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVegOnly, setFilterVegOnly] = useState(false);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [itemNotes, setItemNotes] = useState<{ [key: number]: string }>({});

  // Active Order
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  const [guests, setGuests] = useState<any[]>([]);
  const [generatedInvoice, setGeneratedInvoice] = useState<any | null>(null);
  const [assigningGuestId, setAssigningGuestId] = useState<string>('');
  const [newGuestName, setNewGuestName] = useState<string>('');
  const [newGuestEmail, setNewGuestEmail] = useState<string>('');
  const [newGuestPhone, setNewGuestPhone] = useState<string>('');
  const [showNewGuestForm, setShowNewGuestForm] = useState<boolean>(false);
  const [billingLoading, setBillingLoading] = useState<boolean>(false);

  const [loading, setLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
  }, []);

  const isWaiterOrAdmin = currentUser?.role === 'WAITER' || currentUser?.role === 'ADMIN';

  // Table positions absolute coordinates matching the floor layout
  const tablePositions: { [key: string]: { left: string; top: string; type: 'square' | 'circle' | 'vip' } } = {
    // 10 tables of 2 (square)
    '101': { left: '10%', top: '18%', type: 'square' },
    '102': { left: '22%', top: '18%', type: 'square' },
    '103': { left: '34%', top: '18%', type: 'square' },
    '104': { left: '46%', top: '18%', type: 'square' },
    '105': { left: '10%', top: '44%', type: 'square' },
    '106': { left: '22%', top: '44%', type: 'square' },
    '107': { left: '34%', top: '44%', type: 'square' },
    '108': { left: '46%', top: '44%', type: 'square' },
    '109': { left: '34%', top: '70%', type: 'square' },
    '110': { left: '46%', top: '70%', type: 'square' },
    // 10 tables of 4 (circle)
    '201': { left: '58%', top: '22%', type: 'circle' },
    '202': { left: '70%', top: '22%', type: 'circle' },
    '203': { left: '82%', top: '22%', type: 'circle' },
    '204': { left: '58%', top: '48%', type: 'circle' },
    '205': { left: '70%', top: '48%', type: 'circle' },
    '206': { left: '82%', top: '48%', type: 'circle' },
    '207': { left: '58%', top: '74%', type: 'circle' },
    '208': { left: '70%', top: '74%', type: 'circle' },
    '209': { left: '82%', top: '74%', type: 'circle' },
    '210': { left: '70%', top: '91%', type: 'circle' },
    // 5 tables of 6 (vip)
    '301': { left: '94%', top: '15%', type: 'vip' },
    '302': { left: '94%', top: '32%', type: 'vip' },
    '303': { left: '94%', top: '49%', type: 'vip' },
    '304': { left: '94%', top: '66%', type: 'vip' },
    '305': { left: '94%', top: '83%', type: 'vip' },
  };

  const getTableZone = (tableNumber: string): string => {
    const num = parseInt(tableNumber);
    if (num >= 301 && num <= 305) return 'Outdoor Patio';
    if (num >= 201 && num <= 210) return 'Main Dining Hall';
    return 'Window Side (Couple)';
  };

  const handleUpdateTableStatus = async (tableId: number, newStatus: string) => {
    try {
      const payload: any = { status: newStatus };
      if (newStatus === 'VACANT' || newStatus === 'UNDER_CLEANING') {
        payload.current_guest = null;
      }
      await API.patch(`tables/${tableId}/`, payload);
      setSuccess(`Table status updated to ${newStatus.replace('_', ' ')}`);
      fetchData(); // Refresh tables data
    } catch (err: any) {
      setError('Failed to update table status: ' + err.message);
    }
  };

  const renderFloorTable = (t: Table) => {
    const pos = tablePositions[t.table_number] || { left: '50%', top: '50%', type: 'circle' };
    const isSelected = selectedTable === t.table_number;
    const isOccupied = t.status === 'OCCUPIED';
    const isCleaning = t.status === 'UNDER_CLEANING';
    const isReserved = !isOccupied && !isCleaning && tableReservations.some((tr: any) => tr.table === t.id && tr.status === 'BOOKED');

    let tableColor = 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.35)]';
    let chairColor = 'bg-emerald-500/20 border-emerald-500/35';
    if (isSelected) {
      tableColor = 'border-indigo-400 bg-indigo-950/30 text-white shadow-[0_0_25px_rgba(99,102,241,0.4)] scale-110 z-20 border-2';
      chairColor = 'bg-indigo-400/40 border-indigo-400/60';
    } else if (isOccupied) {
      tableColor = 'border-purple-500/40 bg-purple-950/20 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.15)] hover:shadow-[0_0_25px_rgba(168,85,247,0.35)]';
      chairColor = 'bg-purple-500/20 border-purple-500/35';
    } else if (isCleaning) {
      tableColor = 'border-amber-500/40 bg-amber-950/20 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:shadow-[0_0_25px_rgba(245,158,11,0.35)]';
      chairColor = 'bg-amber-500/20 border-amber-500/35';
    } else if (isReserved) {
      tableColor = 'border-cyan-500/40 bg-cyan-950/20 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_25px_rgba(6,182,212,0.35)]';
      chairColor = 'bg-cyan-500/20 border-cyan-500/35';
    }

    const activeRes = isReserved ? tableReservations.find((tr: any) => tr.table === t.id && tr.status === 'BOOKED') : null;

    return (
      <div 
        key={t.id}
        style={{ left: pos.left, top: pos.top }}
        className="absolute transform -translate-x-1/2 -translate-y-1/2 group animate-fade-in"
      >
        <button
          onClick={() => setSelectedTable(t.table_number)}
          title={isReserved && activeRes ? `Reserved for ${activeRes.customer_name} at ${new Date(activeRes.reservation_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : `Capacity: ${t.capacity} Guests`}
          className={`relative border transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer flex flex-col items-center justify-center text-center shadow-lg select-none z-10 ${
            pos.type === 'circle' ? 'w-14 h-14 rounded-full' :
            pos.type === 'vip' ? 'w-18 h-13 rounded-2xl' : 'w-12 h-12 rounded-xl'
          } ${tableColor}`}
        >
          {/* Table Number */}
          <span className="text-[10px] font-black tracking-wider">T-{t.table_number}</span>
          {isReserved && activeRes ? (
            <span className="text-[7px] text-cyan-300 font-bold px-0.5 truncate max-w-full">
              {new Date(activeRes.reservation_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : (
            <span className="text-[8px] opacity-60">Cap: {t.capacity}</span>
          )}
          
          {/* Status Indicator Badge on Top Right */}
          <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black border shadow-md ${
            isOccupied ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_8px_rgba(168,85,247,0.5)]' :
            isCleaning ? 'bg-amber-500 border-amber-400 text-slate-900 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
            isReserved ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_8px_rgba(6,182,212,0.5)]' :
            'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]'
          }`}>
            {isOccupied ? 'O' : isCleaning ? 'C' : isReserved ? 'R' : 'V'}
          </span>

          {/* Render chairs around table */}
          {pos.type === 'square' && (
            <>
              {/* Left Chair */}
              <div className={`absolute -left-2.5 top-[14px] w-1.5 h-5 border rounded-l-sm transition-all duration-300 ${chairColor}`} />
              {/* Right Chair */}
              <div className={`absolute -right-2.5 top-[14px] w-1.5 h-5 border rounded-r-sm transition-all duration-300 ${chairColor}`} />
            </>
          )}

          {pos.type === 'circle' && (
            <>
              {/* Top Chair */}
              <div className={`absolute left-[18px] -top-2.5 w-5 h-1.5 border rounded-t-sm transition-all duration-300 ${chairColor}`} />
              {/* Bottom Chair */}
              <div className={`absolute left-[18px] -bottom-2.5 w-5 h-1.5 border rounded-b-sm transition-all duration-300 ${chairColor}`} />
              {/* Left Chair */}
              <div className={`absolute -left-2.5 top-[18px] w-1.5 h-5 border rounded-l-sm transition-all duration-300 ${chairColor}`} />
              {/* Right Chair */}
              <div className={`absolute -right-2.5 top-[18px] w-1.5 h-5 border rounded-r-sm transition-all duration-300 ${chairColor}`} />
            </>
          )}

          {pos.type === 'vip' && (
            <>
              {/* Top Left Chair */}
              <div className={`absolute left-[12px] -top-2.5 w-4 h-1.5 border rounded-t-sm transition-all duration-300 ${chairColor}`} />
              {/* Top Right Chair */}
              <div className={`absolute right-[12px] -top-2.5 w-4 h-1.5 border rounded-t-sm transition-all duration-300 ${chairColor}`} />
              {/* Bottom Left Chair */}
              <div className={`absolute left-[12px] -bottom-2.5 w-4 h-1.5 border rounded-b-sm transition-all duration-300 ${chairColor}`} />
              {/* Bottom Right Chair */}
              <div className={`absolute right-[12px] -bottom-2.5 w-4 h-1.5 border rounded-b-sm transition-all duration-300 ${chairColor}`} />
              {/* Left Chair */}
              <div className={`absolute -left-2.5 top-[16px] w-1.5 h-5 border rounded-l-sm transition-all duration-300 ${chairColor}`} />
              {/* Right Chair */}
              <div className={`absolute -right-2.5 top-[16px] w-1.5 h-5 border rounded-r-sm transition-all duration-300 ${chairColor}`} />
            </>
          )}
        </button>
      </div>
    );
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [menuRes, catRes, tablesRes, tableReservationsRes, usersRes] = await Promise.all([
        API.get('menu-items/'),
        API.get('categories/'),
        API.get('tables/'),
        API.get('table-reservations/'),
        API.get('users/')
      ]);
      setMenuItems(menuRes.data);
      setCategories(catRes.data);
      setTables(tablesRes.data);
      setTableReservations(tableReservationsRes.data);
      setGuests(usersRes.data.filter((u: any) => u.role === 'GUEST'));
    } catch (err: any) {
      setError('Failed to load menu details: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveOrder = async () => {
    if (!selectedTable) return;
    try {
      const response = await API.get('orders/');
      const active = response.data.find(
        (o: any) => o.table_number === selectedTable && o.status !== 'COMPLETED' && o.status !== 'CANCELLED'
      );
      if (active) {
        setActiveOrder(active);
      } else {
        setActiveOrder(null);
      }
    } catch (err) {
      console.error('Error fetching active order:', err);
    }
  };

  const fetchPendingInvoice = async (guestId: any) => {
    try {
      const response = await API.get(`invoices/?guest=${guestId}&payment_status=PENDING`);
      const dineInInvoice = response.data.find((inv: any) => inv.guest_type_at_billing === 'DINE_IN');
      if (dineInInvoice) {
        setGeneratedInvoice(dineInInvoice);
      } else {
        setGeneratedInvoice(null);
      }
    } catch (err) {
      console.error('Error fetching pending invoice:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const selectedTableObj = tables.find(t => t.table_number === selectedTable);
  const currentGuestId = selectedTableObj?.current_guest;

  useEffect(() => {
    if (selectedTable) {
      fetchActiveOrder();
      setSearchParams({ table: selectedTable });
    } else {
      setActiveOrder(null);
    }
    setAssigningGuestId('');
    setShowNewGuestForm(false);
  }, [selectedTable]);

  useEffect(() => {
    if (currentGuestId) {
      fetchPendingInvoice(currentGuestId);
    } else {
      setGeneratedInvoice(null);
    }
  }, [currentGuestId]);

  useEffect(() => {
    if (!selectedTable) return;
    const interval = setInterval(() => {
      fetchActiveOrder();
      if (currentGuestId) {
        fetchPendingInvoice(currentGuestId);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedTable, currentGuestId]);

  const handleAssignGuestToTable = async (tableId: number, guestId: string | null) => {
    try {
      setError(null);
      setSuccess(null);
      await API.patch(`tables/${tableId}/`, { 
        current_guest: guestId,
        status: guestId ? 'OCCUPIED' : 'VACANT'
      });
      setSuccess(guestId ? 'Guest assigned to table successfully.' : 'Guest unassigned from table.');
      setAssigningGuestId('');
      fetchData();
    } catch (err: any) {
      setError('Failed to assign guest: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSeatReservation = async (resId: number, name: string, tableId: number) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await API.patch(`table-reservations/${resId}/`, {
        status: 'COMPLETED'
      });
      // Set table to occupied
      await API.patch(`tables/${tableId}/`, {
        status: 'OCCUPIED'
      });
      setSuccess(`Table reservation for ${name} marked as completed.`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to seat reservation');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterAndAssign = async () => {
    if (!newGuestName) return;
    setBillingLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const sanitizedUsername = newGuestName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.floor(100 + Math.random() * 900);
      const email = newGuestEmail.trim() || `${sanitizedUsername}@smarthotel.com`;
      const phone = newGuestPhone.trim() || '0000000000';

      // 1. Create guest user
      const userRes = await API.post('users/', {
        username: sanitizedUsername,
        name: newGuestName,
        email: email,
        phone: phone,
        role: 'GUEST',
        guest_type: 'DINE_IN',
        password: 'TemporaryGuestPassword123!'
      });
      const newGuest = userRes.data;

      // 2. Assign to table
      const tbl = tables.find(t => t.table_number === selectedTable);
      if (tbl) {
        await API.patch(`tables/${tbl.id}/`, {
          current_guest: newGuest.id,
          status: 'OCCUPIED'
        });
      }

      setSuccess(`Guest ${newGuestName} registered and assigned to table.`);
      setNewGuestName('');
      setNewGuestEmail('');
      setNewGuestPhone('');
      setShowNewGuestForm(false);
      fetchData();
    } catch (err: any) {
      setError('Failed to register and assign guest: ' + (err.response?.data?.error || err.message));
    } finally {
      setBillingLoading(false);
    }
  };

  const handleGenerateDineInBill = async () => {
    const tbl = tables.find(t => t.table_number === selectedTable);
    if (!tbl || !tbl.current_guest) return;

    setBillingLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await API.post('invoices/generate-bill/', { 
        guest_id: tbl.current_guest,
        billing_type: 'DINE_IN'
      });
      setGeneratedInvoice(res.data);
      setSuccess('Dine-in bill statement generated.');
    } catch (err: any) {
      setError('Failed to generate bill: ' + (err.response?.data?.error || err.message));
    } finally {
      setBillingLoading(false);
    }
  };

  const handlePayDineInBill = async () => {
    if (!generatedInvoice) return;
    setBillingLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await API.post(`invoices/${generatedInvoice.id}/pay-invoice/`);
      setSuccess('Invoice paid successfully. Table session closed.');
      setGeneratedInvoice(null);
      setSelectedTable('');
      fetchData();
    } catch (err: any) {
      setError('Failed to process invoice payment: ' + (err.response?.data?.error || err.message));
    } finally {
      setBillingLoading(false);
    }
  };

  const handleUpdateItemStatus = async (itemId: number, newStatus: string) => {
    try {
      setError(null);
      setSuccess(null);
      await API.patch(`order-items/${itemId}/`, { status: newStatus });
      setSuccess(`Dish marked as ${newStatus.toLowerCase()}.`);
      fetchActiveOrder();
      fetchData();
    } catch (err: any) {
      setError('Failed to update dish status: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!window.confirm("Are you sure you want to cancel the entire order? This cannot be undone.")) return;
    try {
      setError(null);
      setSuccess(null);
      await API.patch(`orders/${orderId}/`, { status: 'CANCELLED' });
      setSuccess("Order cancelled successfully.");
      setActiveOrder(null);
      fetchData();
    } catch (err: any) {
      setError('Failed to cancel order: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleChargeToRoom = async () => {
    if (!generatedInvoice) return;
    setBillingLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await API.post(`invoices/${generatedInvoice.id}/charge-to-room/`);
      setSuccess('Charges added to room bill. Table session closed.');
      setGeneratedInvoice(null);
      setSelectedTable('');
      fetchData();
    } catch (err: any) {
      setError('Failed to charge to room: ' + (err.response?.data?.error || err.message));
    } finally {
      setBillingLoading(false);
    }
  };

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuItem.id === item.id);
      if (existing) {
        return prev.map(i => i.menuItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { menuItem: item, quantity: 1, notes: itemNotes[item.id] || '' }];
    });
  };

  const updateCartQuantity = (itemId: number, delta: number) => {
    setCart(prev => {
      return prev.map(i => {
        if (i.menuItem.id === itemId) {
          const qty = i.quantity + delta;
          return qty > 0 ? { ...i, quantity: qty } : null;
        }
        return i;
      }).filter(Boolean) as CartItem[];
    });
  };

  const updateCartNotes = (itemId: number, notes: string) => {
    setItemNotes(prev => ({ ...prev, [itemId]: notes }));
    setCart(prev => prev.map(i => i.menuItem.id === itemId ? { ...i, notes } : i));
  };

  const handlePlaceOrder = async () => {
    if (!selectedTable) {
      setError('Please select a table number first');
      return;
    }
    if (cart.length === 0) return;

    setOrderLoading(true);
    setError(null);
    setSuccess(null);

    const itemsPayload = cart.map(i => ({
      menu_item_id: i.menuItem.id,
      quantity: i.quantity,
      notes: i.notes
    }));

    try {
      const tbl = tables.find(t => t.table_number === selectedTable);
      const payload: any = {
        table_number: selectedTable,
        items: itemsPayload
      };
      if (tbl?.current_guest) {
        payload.guest_id = tbl.current_guest;
      }

      await API.post('orders/place-order/', payload);
      
      setSuccess('Order placed successfully! Sent to kitchen.');
      setCart([]);
      setItemNotes({});
      fetchActiveOrder();
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to place order.');
    } finally {
      setOrderLoading(false);
    }
  };

  const filteredMenu = menuItems.filter(item => {
    if (!item.is_available) return false;
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (filterVegOnly && !item.is_veg) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(query) || (item.description && item.description.toLowerCase().includes(query));
    }
    return true;
  });

  const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.menuItem.price) * item.quantity), 0);
  const tax = subtotal * 0.10;
  const total = subtotal + tax;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-3.5 h-3.5 text-gray-400 animate-spin" />;
      case 'PREPARING': return <Coffee className="w-3.5 h-3.5 text-amber-400 animate-bounce" />;
      case 'READY': return <CheckCircle className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />;
      case 'SERVED': return <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-gray-500/10 border-gray-500/20 text-gray-400';
      case 'PREPARING': return 'bg-amber-500/10 border-amber-500/20 text-amber-300';
      case 'READY': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300';
      case 'SERVED': return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300';
      default: return 'bg-gray-500/10 border-gray-500/20 text-gray-400';
    }
  };

  const tblObj = tables.find(t => t.table_number === selectedTable);
  const activeRes = tblObj ? tableReservations.find((tr: any) => tr.table === tblObj.id && tr.status === 'BOOKED') : null;
  const isReservedTable = !!activeRes;

  return (
    <div className="space-y-8 pb-12">
      
      {/* Visual Floor Plan Section (Matches Mockup) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Expanded Floor Plan Canvas */}
        <div className="xl:col-span-12 glass-panel p-6 rounded-2xl flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h3 className="font-extrabold text-white flex items-center gap-2 tracking-wide text-sm">
              <TableIcon className="w-4 h-4 text-indigo-400 animate-bounce" />
              INTERACTIVE RESTAURANT FLOOR PLAN
            </h3>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] text-gray-400">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" /> Vacant (Emerald)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_6px_#a855f7]" /> Occupied (Violet)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]" /> Cleaning (Amber)</span>
            </div>
          </div>

          {/* The graphical interactive floor mapping area */}
          <div className="overflow-x-auto -mx-2 px-2"><div 
            style={{
              backgroundColor: '#070514',
              backgroundImage: `
                linear-gradient(rgba(139, 92, 246, 0.04) 1px, transparent 1px),
                linear-gradient(90deg, rgba(139, 92, 246, 0.04) 1px, transparent 1px)
              `,
              backgroundSize: '24px 24px',
            }}
            className="relative w-full h-[520px] rounded-xl overflow-x-auto overflow-y-hidden border border-white/5 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] min-w-[700px]"
          >
            {/* Area Partitions & Walls */}
            {/* Reception (bottom-left) */}
            <div className="absolute left-[3%] bottom-[3%] p-3 border-r border-t border-dashed border-white/10 bg-white/[0.01] rounded-tr-xl flex flex-col justify-end">
              <span className="text-[9px] font-black text-gray-600 tracking-wider uppercase">RECEPTION</span>
              <div className="w-16 h-8 border border-white/10 bg-slate-900/60 rounded-md mt-1 flex items-center justify-center shadow-md">
                <span className="text-[8px] font-bold text-gray-500">Desk</span>
              </div>
            </div>

            {/* Lunar Bar (top-right area) */}
            <div className="absolute right-[20%] top-[3%] p-3 border-l border-b border-dashed border-white/10 bg-white/[0.01] rounded-bl-xl flex flex-col items-end">
              <span className="text-[9px] font-black text-purple-400/50 tracking-wider uppercase">LUNAR BAR</span>
              <div className="w-32 h-6 border-b border-l border-r border-purple-500/30 bg-purple-950/20 rounded-b-xl mt-1 flex items-center justify-around shadow-md px-2">
                <div className="w-2 h-2 rounded-full bg-purple-500/60 shadow-[0_0_5px_#a855f7]" />
                <div className="w-2 h-2 rounded-full bg-purple-500/60 shadow-[0_0_5px_#a855f7]" />
                <div className="w-2 h-2 rounded-full bg-purple-500/60 shadow-[0_0_5px_#a855f7]" />
                <div className="w-2 h-2 rounded-full bg-purple-500/60 shadow-[0_0_5px_#a855f7]" />
              </div>
            </div>

            {/* Outdoor Patio area divider (right-most) */}
            <div className="absolute right-[2%] top-[15%] bottom-[15%] border-l border-dashed border-emerald-500/20 pl-3 flex flex-col justify-center">
              <span className="text-[9px] font-black text-emerald-500/40 tracking-wider uppercase rotate-90 transform origin-left translate-x-3 mb-8">OUTDOOR PATIO</span>
              <div className="absolute top-2 right-2 flex gap-1 text-[10px] opacity-35 text-emerald-400">🌿</div>
              <div className="absolute bottom-2 right-2 flex gap-1 text-[10px] opacity-35 text-emerald-400">🌿</div>
            </div>

            {/* Area Label for Main Dining */}
            <div className="absolute left-[35%] bottom-[8%] pointer-events-none">
              <span className="text-[10px] font-black text-indigo-500/30 tracking-widest uppercase">MAIN DINING AREA</span>
            </div>

            {/* Render tables mapped onto coordinate positions */}
            {tables.map(t => renderFloorTable(t))}
          </div></div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-gray-400 px-1 gap-1">
            <span>Hover on seats to preview capacity</span>
            <span className="text-indigo-400 font-bold">Click any table to configure kitchen order below</span>
          </div>
        </div>

      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm flex items-center gap-2">
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm flex items-center gap-2">
          <span>{success}</span>
        </div>
      )}
      {/* Menu Catalog & Shopping Cart (visible as a modal popup when a table is selected) */}
      {selectedTable && createPortal(
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-0 sm:p-4 lg:p-6 overflow-hidden">
          <div className="bg-[#050712] border border-white/10 w-full lg:max-w-7xl h-full sm:h-[95vh] lg:h-[90vh] sm:rounded-3xl rounded-none p-3 sm:p-4 lg:p-6 shadow-2xl relative flex flex-col overflow-hidden animate-fade-in">
            {/* Header / Table info & Close */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/5 pb-4 mb-4 shrink-0 gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                  <TableIcon className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-base">Configuring Order: Table {selectedTable}</h4>
                  <p className="text-xs text-gray-400">Zone: {getTableZone(selectedTable)} • Capacity: {tables.find(t => t.table_number === selectedTable)?.capacity || 0} Guests</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
                {/* Waiter/Admin Table Status Control */}
                {isWaiterOrAdmin && (
                  <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded-lg border border-white/5">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Table Status:</span>
                    <select
                      value={tables.find(t => t.table_number === selectedTable)?.status || 'VACANT'}
                      onChange={async (e) => {
                        const tbl = tables.find(t => t.table_number === selectedTable);
                        if (tbl) {
                          await handleUpdateTableStatus(tbl.id, e.target.value);
                        }
                      }}
                      className="bg-slate-950 text-xs font-bold text-indigo-300 border border-white/5 rounded px-2.5 py-1 outline-none cursor-pointer"
                    >
                      <option value="VACANT">Vacant (Emerald)</option>
                      <option value="OCCUPIED">Occupied (Violet)</option>
                      <option value="UNDER_CLEANING">Cleaning (Amber)</option>
                    </select>
                  </div>
                )}

                <button 
                  onClick={() => setSelectedTable('')}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-lg shadow-rose-600/10"
                >
                  Close Session
                </button>
              </div>
            </div>

            {/* Main Content Grid (scrollable) */}
            {isReservedTable ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-8 space-y-6 max-w-lg mx-auto">
                <div className="w-20 h-20 bg-cyan-500/10 rounded-full border border-cyan-500/20 text-cyan-400 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.15)] animate-pulse">
                  <Calendar className="w-10 h-10" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-white uppercase tracking-wider font-mono">Table Reserved</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Table <span className="text-cyan-400 font-bold">{selectedTable}</span> has been reserved by the Receptionist for guest <strong className="text-white">"{activeRes?.customer_name}"</strong>.
                  </p>
                  <p className="text-xs text-gray-500 bg-white/[0.02] border border-white/5 rounded-lg py-2 px-4 inline-block font-mono">
                    Time: {activeRes ? new Date(activeRes.reservation_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
                  <button
                    onClick={async () => {
                      if (activeRes) {
                        await handleSeatReservation(activeRes.id, activeRes.customer_name, activeRes.table);
                      }
                    }}
                    disabled={loading}
                    className="flex-grow py-3 px-6 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-xl cursor-pointer transition shadow-lg shadow-cyan-600/20"
                  >
                    Seat Reserved Guest
                  </button>
                  <button
                    onClick={() => setSelectedTable('')}
                    className="py-3 px-6 bg-slate-900 border border-white/5 hover:bg-slate-800 text-gray-400 hover:text-white text-xs font-black uppercase tracking-widest rounded-xl cursor-pointer transition"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 overflow-y-auto flex-grow pr-0 sm:pr-1">
              {/* Menu Catalog (Left Column - 8 cols) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Filters Panel */}
                <div className="glass-panel p-3 sm:p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 border border-white/5 bg-white/[0.01]">
                  <div className="flex-grow max-w-md relative">
                    <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      placeholder="Search food, beverage, snacks..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full p-2.5 pl-10 bg-slate-950/40 border border-white/5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-200"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <button
                      onClick={() => setFilterVegOnly(!filterVegOnly)}
                      className={`px-4 py-2 rounded-full text-xs font-bold border transition duration-200 cursor-pointer ${
                        filterVegOnly 
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
                          : 'bg-slate-900 border-white/5 text-gray-400 hover:bg-slate-800'
                      }`}
                    >
                      🥦 Vegetarian Only
                    </button>
                    <button
                      onClick={fetchData}
                      className="p-2.5 rounded-lg bg-slate-900 border border-white/5 text-gray-400 hover:bg-slate-800 transition cursor-pointer"
                      title="Reload Catalog"
                    >
                      <RefreshCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Categories Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-4 py-2 rounded-xl font-bold text-xs tracking-wider uppercase whitespace-nowrap transition cursor-pointer ${
                      selectedCategory === 'all' 
                        ? 'glowing-btn-indigo text-white' 
                        : 'bg-slate-900/50 border border-white/5 text-gray-400 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    All Menu
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-4 py-2 rounded-xl font-bold text-xs tracking-wider uppercase whitespace-nowrap transition cursor-pointer ${
                        selectedCategory === cat.id 
                          ? 'glowing-btn-indigo text-white' 
                          : 'bg-slate-900/50 border border-white/5 text-gray-400 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Menu Grid */}
                {loading ? (
                  <div className="py-20 flex flex-col items-center justify-center text-gray-500">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
                    <p>Loading premium kitchen menu...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 pb-4">
                    {filteredMenu.map(item => (
                      <div key={item.id} className="glass-panel rounded-2xl overflow-hidden flex flex-col justify-between glass-card-hover group border border-white/5 bg-slate-950/20">
                        <div>
                          <div className="w-full aspect-[16/9] sm:aspect-[16/10] bg-slate-950 relative overflow-hidden flex items-center justify-center">
                            <img 
                              src={getMenuItemImage(item)} 
                              alt={item.name}
                              onError={(e: any) => {
                                e.target.onerror = null;
                                e.target.src = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80';
                              }}
                              className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                            />
                            
                            <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[8px] font-bold text-white shadow-md border uppercase tracking-wider ${
                              item.is_veg 
                                ? 'bg-emerald-600/80 border-emerald-500/30' 
                                : 'bg-rose-600/80 border-rose-500/30'
                            }`}>
                              {item.is_veg ? 'Veg' : 'Non-Veg'}
                            </span>
                          </div>

                          <div className="p-3.5 space-y-1.5">
                            <h4 className="font-bold text-white text-sm group-hover:text-indigo-300 transition duration-200">{item.name}</h4>
                            <p className="text-gray-400 text-[11px] line-clamp-2 min-h-[28px]">{item.description || 'Delectable house special freshly made to order.'}</p>
                          </div>
                        </div>

                        <div className="p-3.5 pt-0 flex justify-between items-center border-t border-white/[0.04] mt-2">
                          <span className="text-base font-black text-indigo-400">₹{parseFloat(item.price).toFixed(2)}</span>
                          <button
                            onClick={() => addToCart(item)}
                            className="p-2 bg-indigo-500/10 hover:bg-indigo-600 border border-indigo-500/30 hover:border-transparent text-indigo-400 hover:text-white rounded-lg transition duration-200 cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {filteredMenu.length === 0 && (
                      <div className="col-span-full py-16 text-center glass-panel rounded-2xl text-gray-500 flex flex-col items-center justify-center bg-white/[0.01]">
                        <Coffee className="w-10 h-10 mb-2 text-slate-700" />
                        <p className="text-sm">No dishes found matching your catalog options.</p>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Cart & Status Column (Right Column - 4 cols) */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                
                {/* Dine-In Billing & Checkout Section */}
                {isWaiterOrAdmin && (
                  (() => {
                    const tbl = tables.find(t => t.table_number === selectedTable);
                     if (!tbl || (tbl.status !== 'VACANT' && tbl.status !== 'OCCUPIED')) return null;

                    if (!tbl.current_guest) {
                      return (
                        <div className="glass-panel rounded-2xl p-4 space-y-4 border border-white/5 bg-slate-950/10 shrink-0">
                          <h3 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider">
                            <Users className="w-4 h-4 text-indigo-400" />
                            Assign Dine-In Guest
                          </h3>
                          <p className="text-[11px] text-gray-400">
                            To track orders and generate a bill, assign a guest to this table.
                          </p>
                          <div className="flex gap-2">
                            <select
                              value={assigningGuestId}
                              onChange={e => setAssigningGuestId(e.target.value)}
                              className="flex-grow p-2 bg-slate-950 text-xs text-gray-200 border border-white/5 rounded-lg outline-none cursor-pointer"
                            >
                              <option value="">Select Guest</option>
                              {guests.map(g => (
                                <option key={g.id} value={g.id}>
                                  {g.name || g.username}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => {
                                if (assigningGuestId) {
                                  handleAssignGuestToTable(tbl.id, assigningGuestId);
                                }
                              }}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                            >
                              Assign
                            </button>
                          </div>
                          
                          {!showNewGuestForm ? (
                            <button
                              onClick={() => setShowNewGuestForm(true)}
                              className="text-indigo-400 hover:text-indigo-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Or register new guest
                            </button>
                          ) : (
                            <div className="space-y-3.5 border-t border-white/5 pt-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-gray-400 uppercase">New Dine-In Guest</span>
                                <button
                                  onClick={() => setShowNewGuestForm(false)}
                                  className="text-rose-400 hover:text-rose-300 text-[10px] font-bold cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                              <input
                                type="text"
                                placeholder="Guest Full Name"
                                value={newGuestName}
                                onChange={e => setNewGuestName(e.target.value)}
                                className="w-full p-2 bg-slate-950 border border-white/5 rounded-lg outline-none text-xs text-gray-200"
                              />
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                  type="email"
                                  placeholder="Email (Optional)"
                                  value={newGuestEmail}
                                  onChange={e => setNewGuestEmail(e.target.value)}
                                  className="w-full p-2 bg-slate-950 border border-white/5 rounded-lg outline-none text-xs text-gray-200"
                                />
                                <input
                                  type="text"
                                  placeholder="Phone (Optional)"
                                  value={newGuestPhone}
                                  onChange={e => setNewGuestPhone(e.target.value)}
                                  className="w-full p-2 bg-slate-950 border border-white/5 rounded-lg outline-none text-xs text-gray-200"
                                />
                              </div>
                              <button
                                onClick={handleRegisterAndAssign}
                                disabled={!newGuestName || billingLoading}
                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                              >
                                {billingLoading ? 'Registering...' : 'Register & Assign'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div className="glass-panel rounded-2xl p-4 space-y-4 border border-white/5 bg-slate-950/10 shrink-0">
                        <div className="flex items-center justify-between pb-3 border-b border-white/5">
                          <h3 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider">
                            <Users className="w-4 h-4 text-emerald-400" />
                            Assigned Guest Details
                          </h3>
                          <button
                            onClick={() => handleAssignGuestToTable(tbl.id, null)}
                            className="text-rose-400 hover:text-rose-300 text-[10px] font-bold cursor-pointer"
                          >
                            Unassign
                          </button>
                        </div>
                        <div className="text-xs space-y-1">
                          <p className="font-bold text-white text-sm">
                            {(() => {
                              const g = guests.find(g => g.id === tbl.current_guest);
                              return g ? (g.name || g.username) : 'Loading Guest...';
                            })()}
                          </p>
                          <p className="text-gray-400 text-[10px] truncate">
                            {(() => {
                              const g = guests.find(g => g.id === tbl.current_guest);
                              return g ? g.email : '';
                            })()}
                          </p>
                          <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mt-1">
                            Dine-In Billing
                          </p>
                        </div>

                        {!generatedInvoice ? (
                          <button
                            onClick={handleGenerateDineInBill}
                            disabled={billingLoading}
                            className="w-full py-2.5 glowing-btn-indigo text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                          >
                            {billingLoading ? 'Generating Bill...' : 'Generate Dine-In Bill'}
                          </button>
                        ) : (
                          <div className="space-y-3.5 border-t border-white/5 pt-3">
                            <div className="flex justify-between text-xs text-gray-400">
                              <span>Food Charges:</span>
                              <span className="text-white font-bold">₹{parseFloat(generatedInvoice.food_charges).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-400">
                              <span>Taxes (10%):</span>
                              <span className="text-white font-bold">₹{parseFloat(generatedInvoice.tax_amount).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold border-t border-white/5 pt-2 text-white">
                              <span>Total Bill Amount:</span>
                              <span className="text-indigo-400 font-black text-base">₹{parseFloat(generatedInvoice.total_amount).toFixed(2)}</span>
                            </div>
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={() => setGeneratedInvoice(null)}
                                  className="py-2 bg-slate-900 border border-white/5 text-gray-300 hover:text-white rounded-lg text-xs font-bold transition cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handlePayDineInBill}
                                  disabled={billingLoading}
                                  className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                                >
                                  {billingLoading ? 'Processing...' : 'Pay & Checkout'}
                                </button>
                              </div>
                              {(() => {
                                const tbl = tables.find(t => t.table_number === selectedTable);
                                const g = guests.find(g => g.id === tbl?.current_guest);
                                const isStayGuest = g?.guest_type === 'STAY_IN' || g?.guest_type === 'BOTH';
                                if (isStayGuest) {
                                  return (
                                    <button
                                      onClick={handleChargeToRoom}
                                      disabled={billingLoading}
                                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                                    >
                                      {billingLoading ? 'Processing...' : 'Charge to Hotel Room Bill'}
                                    </button>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}

                {/* Shopping Cart */}
                <div className="glass-panel rounded-2xl p-3 sm:p-4 flex flex-col justify-between flex-grow min-h-[250px] sm:min-h-[300px] border border-white/5 bg-slate-950/10">
                  <div>
                    <div className="flex items-center justify-between pb-3.5 border-b border-white/5 mb-4">
                      <h3 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider">
                        <ShoppingCart className="w-4 h-4 text-indigo-400 animate-pulse" />
                        Checkout Session
                      </h3>
                      <span className="bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {cart.length} items
                      </span>
                    </div>

                    <div className="space-y-3 overflow-y-auto max-h-[180px] sm:max-h-[220px] pr-1">
                      {cart.map(item => (
                        <div key={item.menuItem.id} className="text-xs border-b border-white/5 pb-3 space-y-1.5">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-white">{item.menuItem.name}</span>
                            <span className="font-black text-indigo-400">
                              ₹{(parseFloat(item.menuItem.price) * item.quantity).toFixed(2)}
                            </span>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-1 gap-1.5 sm:gap-0">
                            <input
                              type="text"
                              placeholder="e.g. Extra spicy, no onions..."
                              value={item.notes}
                              onChange={e => updateCartNotes(item.menuItem.id, e.target.value)}
                              className="text-[10px] bg-slate-950 border border-white/5 rounded-lg px-2.5 py-1 outline-none text-gray-400 focus:ring-1 focus:ring-indigo-500 w-full sm:max-w-[130px]"
                            />
                            
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => updateCartQuantity(item.menuItem.id, -1)}
                                className="bg-slate-900 hover:bg-slate-800 border border-white/5 text-gray-400 p-1 rounded-lg transition cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-bold w-4 text-center text-white text-xs">{item.quantity}</span>
                              <button 
                                onClick={() => updateCartQuantity(item.menuItem.id, 1)}
                                className="bg-slate-900 hover:bg-slate-800 border border-white/5 text-gray-400 p-1 rounded-lg transition cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {cart.length === 0 && (
                        <div className="py-12 text-center text-gray-500 flex flex-col items-center justify-center">
                          <Utensils className="w-10 h-10 mb-3 text-slate-700 stroke-1" />
                          <p className="text-[11px]">Your shopping cart is empty.</p>
                          <p className="text-[9px] text-gray-600 mt-1">Select a table and add dishes to start.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-4 space-y-4">
                    <div className="space-y-2 text-xs text-gray-400">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span className="text-white">₹{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Kitchen Service Tax (10%)</span>
                        <span className="text-white">₹{tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-black text-white border-t border-white/5 pt-2 text-sm">
                        <span>Total Amount</span>
                        <span className="text-indigo-400 text-base">₹{total.toFixed(2)}</span>
                      </div>
                    </div>

                    <button
                      onClick={handlePlaceOrder}
                      disabled={cart.length === 0 || orderLoading || !selectedTable}
                      className="w-full glowing-btn-indigo text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50 text-xs cursor-pointer uppercase tracking-wider"
                    >
                      <Send className="w-3 h-3" />
                      {orderLoading ? 'Placing Order...' : 'Send Order to Kitchen'}
                    </button>
                  </div>
                </div>

                {/* Live Order Status */}
                <div className="glass-panel rounded-2xl p-4 space-y-4 border border-white/5 bg-slate-950/10 shrink-0">
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <h3 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider">
                      <Clock className="w-4 h-4 text-indigo-400 animate-pulse" />
                      Active Dining Status
                    </h3>
                    <button 
                      onClick={fetchActiveOrder} 
                      className="text-gray-500 hover:text-indigo-400 transition cursor-pointer"
                      title="Refresh Order telemetry"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {activeOrder ? (
                    <div className="space-y-3 max-h-[180px] sm:max-h-[220px] overflow-y-auto pr-1">
                      <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider border-b border-white/5 pb-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span>Order Ref: #{activeOrder.id}</span>
                          <button
                            onClick={() => handleCancelOrder(activeOrder.id)}
                            className="text-rose-400 hover:text-rose-300 font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 cursor-pointer text-[8px]"
                          >
                            Cancel Order
                          </button>
                        </div>
                        <span className="text-indigo-400">Total: ₹{parseFloat(activeOrder.total_amount).toFixed(2)}</span>
                      </div>
                      {activeOrder.items.map(item => (
                        <div key={item.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs border-b border-white/[0.03] pb-2 gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-white truncate">{item.menu_item_details.name} <span className="text-indigo-400">x{item.quantity}</span></p>
                            {item.notes && <p className="text-[10px] text-gray-500 italic mt-0.5">Instructions: {item.notes}</p>}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${getStatusColor(item.status)}`}>
                              {getStatusIcon(item.status)}
                              {item.status}
                            </span>
                            {item.status === 'READY' && (
                              <button
                                onClick={() => handleUpdateItemStatus(item.id, 'SERVED')}
                                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold cursor-pointer transition uppercase"
                              >
                                Serve
                              </button>
                            )}
                            {item.status !== 'SERVED' && item.status !== 'CANCELLED' && (
                              <button
                                onClick={() => handleUpdateItemStatus(item.id, 'CANCELLED')}
                                className="text-rose-400 hover:text-rose-300 font-bold px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 cursor-pointer text-[8px]"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-6 text-xs flex flex-col items-center justify-center">
                      <HelpCircle className="w-7 h-7 mb-2 text-slate-800 stroke-1" />
                      <p>No active food orders for T-{selectedTable}.</p>
                    </div>
                  )}
                </div>



              </div>
            </div>
          )}
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default Restaurant;
