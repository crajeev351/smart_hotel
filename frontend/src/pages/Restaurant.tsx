import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import API from '../services/api';
import { 
  Utensils, ShoppingCart, Search, Plus, Minus, Send, 
  Clock, CheckCircle, RefreshCcw, Table as TableIcon, HelpCircle,
  Coffee, Users, UserPlus, Calendar, FileText, Hotel, AlertCircle
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

export const getMenuItemImage = (item: any): string => {
  const lowerName = (item.name || '').toLowerCase();
  const lowerCat = (item.category_name || item.category || '').toString().toLowerCase();

  const getFallback = () => {
    if (lowerName.includes('burger')) {
      return 'https://upload.wikimedia.org/wikipedia/commons/4/4d/Cheeseburger.jpg';
    }
    if (lowerName.includes('fries')) {
      return 'https://upload.wikimedia.org/wikipedia/commons/8/83/French_Fries.JPG';
    }
    if (lowerName.includes('pinacolada') || lowerName.includes('pina colada') || lowerCat.includes('drink')) {
      return 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Pi%C3%B1a_Colada.jpg';
    }
    if (lowerName.includes('jamun') || lowerName.includes('kulfi') || lowerName.includes('cake') || lowerCat.includes('dessert')) {
      return 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Gulab-jamun-wallpaper-1.jpg';
    }
    if (lowerName.includes('paneer') || lowerName.includes('naan')) {
      return 'https://upload.wikimedia.org/wikipedia/commons/a/ad/Shahi_panner.jpg';
    }
    if (lowerName.includes('dal') || lowerName.includes('roti') || lowerName.includes('makhani')) {
      return 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Dal_Makhani_%28Dal_Makhni%29.jpg/640px-Dal_Makhani_%28Dal_Makhni%29.jpg';
    }
    if (lowerName.includes('biryani') || lowerName.includes('rice')) {
      return 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Dum_biryani_in_handi.jpg/640px-Dum_biryani_in_handi.jpg';
    }
    if (lowerName.includes('vada') || lowerName.includes('pav') || lowerCat.includes('snack')) {
      return 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Vada_Pav-Indian_street_food.JPG/640px-Vada_Pav-Indian_street_food.JPG';
    }
    if (lowerName.includes('pizza')) {
      return 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Eq_it-na_pizza-margherita_sep2005_sml.jpg';
    }
    if (lowerName.includes('spring roll') || lowerName.includes('roll')) {
      return 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Spring_rolls_at_Pho_Hoa.jpg/640px-Spring_rolls_at_Pho_Hoa.jpg';
    }
    if (lowerName.includes('coffee')) {
      return 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Latte_and_dark_coffee.jpg';
    }
    if (lowerCat.includes('main')) {
      return 'https://upload.wikimedia.org/wikipedia/commons/a/ad/Shahi_panner.jpg';
    }
    return 'https://upload.wikimedia.org/wikipedia/commons/4/4d/Cheeseburger.jpg';
  };

  if (item.image && typeof item.image === 'string' && item.image.trim() !== '') {
    if (item.image.startsWith('http://') || item.image.startsWith('https://')) {
      return item.image;
    }
    if (item.image.startsWith('/menu_images/')) {
      return item.image;
    }
    const baseURL = API.defaults.baseURL || 'http://127.0.0.1:8000/api/';
    const host = baseURL.replace(/\/api\/?$/, '');
    const cleanPath = item.image.startsWith('/') ? item.image : `/${item.image}`;
    return `${host}${cleanPath}`;
  }

  return getFallback();
};

const Restaurant: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tableParam = searchParams.get('table');

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [tableReservations, setTableReservations] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
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

  const isStaff = !currentUser || currentUser?.role !== 'GUEST';
  const isWaiterOrAdmin = isStaff;

  // Dynamically calculate table positions based on capacity and number
  const tablePositions = React.useMemo(() => {
    const positions: { [key: string]: { left: string; top: string; type: 'square' | 'circle' | 'vip' } } = {};
    
    // Group and sort tables
    const cap2 = tables.filter(t => t.capacity <= 2).sort((a, b) => a.table_number.localeCompare(b.table_number));
    const cap4 = tables.filter(t => t.capacity > 2 && t.capacity <= 4).sort((a, b) => a.table_number.localeCompare(b.table_number));
    const cap6 = tables.filter(t => t.capacity > 4).sort((a, b) => a.table_number.localeCompare(b.table_number));

    cap2.forEach((t, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      positions[t.table_number] = {
        left: `${10 + col * 12}%`,
        top: `${93 + row * 135}px`,
        type: 'square'
      };
    });

    cap4.forEach((t, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      positions[t.table_number] = {
        left: `${58 + col * 12}%`,
        top: `${114 + row * 135}px`,
        type: 'circle'
      };
    });

    cap6.forEach((t, i) => {
      const row = i;
      positions[t.table_number] = {
        left: `94%`,
        top: `${78 + row * 88}px`,
        type: 'vip'
      };
    });

    return positions;
  }, [tables]);

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

    let tableColor = 'border-emerald-500/60 bg-white text-[#171717] shadow-sm hover:shadow-md hover:border-emerald-500';
    let chairColor = 'bg-emerald-100 border-emerald-400';
    if (isSelected) {
      tableColor = 'border-2 border-[#C49A32] bg-[#C49A32]/10 text-[#171717] shadow-lg scale-110 z-20';
      chairColor = 'bg-[#C49A32] border-[#C49A32]';
    } else if (isOccupied) {
      tableColor = 'border-amber-500/60 bg-white text-[#171717] shadow-sm hover:shadow-md hover:border-amber-500';
      chairColor = 'bg-amber-100 border-amber-400';
    } else if (isCleaning) {
      tableColor = 'border-amber-500/60 bg-white text-[#171717] shadow-sm hover:shadow-md hover:border-amber-500';
      chairColor = 'bg-amber-100 border-amber-400';
    } else if (isReserved) {
      tableColor = 'border-[#C49A32]/70 bg-white text-[#171717] shadow-sm hover:shadow-md hover:border-[#C49A32]';
      chairColor = 'bg-[#C49A32]/20 border-[#C49A32]';
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
          <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black border shadow-sm ${
            isOccupied ? 'bg-amber-500 border-amber-400 text-white' :
            isCleaning ? 'bg-amber-500 border-amber-400 text-white' :
            isReserved ? 'bg-[#C49A32] border-[#C49A32] text-white' :
            'bg-emerald-600 border-emerald-500 text-white'
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

  
  useWebSocket((data) => {
    console.log('WebSocket update received:', data);
    fetchData(true);
    if (selectedTable) fetchActiveOrder(true, selectedTable);
  });

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [menuRes, catRes, tablesRes, tableReservationsRes, usersRes, bookingsRes] = await Promise.all([
        API.get('menu-items/'),
        API.get('categories/'),
        API.get('tables/'),
        API.get('table-reservations/'),
        API.get('users/'),
        API.get('bookings/')
      ]);
      setMenuItems(menuRes.data);
      setCategories(catRes.data);
      setTables(tablesRes.data);
      setTableReservations(tableReservationsRes.data);
      setGuests(usersRes.data.filter((u: any) => u.role === 'GUEST'));
      setBookings(bookingsRes.data);
    } catch (err: any) {
      setError('Failed to load menu details: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveOrder = async (silent = false, tableNum?: string) => {
    const targetTable = tableNum !== undefined ? tableNum : selectedTable;
    if (!targetTable) {
      setActiveOrder(null);
      return;
    }
    if (!silent) setOrderLoading(true);
    try {
      const response = await API.get(`orders/?table_number=${targetTable}&status=IN_PROGRESS`);
      if (response.data && response.data.length > 0) {
        const match = response.data.find((o: any) => 
          o.table_number === targetTable && 
          Array.isArray(o.items) && 
          o.items.some((i: any) => i.status !== 'CANCELLED')
        );
        setActiveOrder(match || null);
      } else {
        setActiveOrder(null);
      }
    } catch (err) {
      console.error('Error fetching active order:', err);
      setActiveOrder(null);
    } finally {
      if (!silent) setOrderLoading(false);
    }
  };

  const fetchPendingInvoice = async (guestId: any, orderId?: number) => {
    if (!orderId) {
      setGeneratedInvoice(null);
      return;
    }
    try {
      const response = await API.get(`invoices/?guest=${guestId}&payment_status=PENDING`);
      const dineInInvoice = response.data.find((inv: any) => 
        inv.guest_type_at_billing === 'DINE_IN' && 
        (inv.orders?.includes(orderId) || inv.order_details?.some((o: any) => o.id === orderId))
      );
      if (dineInInvoice) {
        setGeneratedInvoice(dineInInvoice);
      } else {
        setGeneratedInvoice(null);
      }
    } catch (err) {
      console.error('Error fetching pending invoice:', err);
      setGeneratedInvoice(null);
    }
  };

  useEffect(() => {
    fetchData();
    const poll = setInterval(() => fetchData(true), 8000);
    return () => clearInterval(poll);
  }, []);

  const selectedTableObj = tables.find(t => t.table_number === selectedTable);
  const currentGuestId = selectedTableObj?.current_guest;
  const hasAssignedGuest = Boolean(currentGuestId || currentUser?.role === 'GUEST');

  useEffect(() => {
    if (selectedTable) {
      fetchActiveOrder(false, selectedTable);
      setSearchParams({ table: selectedTable });
    } else {
      setActiveOrder(null);
    }
    setAssigningGuestId('');
    setShowNewGuestForm(false);
    setGeneratedInvoice(null);
  }, [selectedTable]);

  useEffect(() => {
    const activeItems = activeOrder?.items?.filter(i => i.status !== 'CANCELLED') || [];
    const isAllServed = activeItems.length > 0 && activeItems.every(i => i.status === 'SERVED');
    if (currentGuestId && activeOrder?.id && isAllServed) {
      fetchPendingInvoice(currentGuestId, activeOrder.id);
    } else {
      setGeneratedInvoice(null);
    }
  }, [currentGuestId, activeOrder?.id, activeOrder?.status]);

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
        table_number: selectedTable,
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

  const handleServeAllItems = async () => {
    if (!activeOrder?.id) return;
    setBillingLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await API.post(`orders/${activeOrder.id}/serve-all/`);
      setSuccess('All dishes marked as served to the customer.');
      await fetchActiveOrder(true, selectedTable);
      fetchData(true);
    } catch (err: any) {
      setError('Failed to mark dishes as served: ' + (err.response?.data?.error || err.message));
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
      setSuccess('Invoice paid successfully. Table session closed and table is now vacant.');
      setGeneratedInvoice(null);
      setActiveOrder(null);
      setSelectedTable('');
      setSearchParams({});
      await fetchData();
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
      fetchActiveOrder(true, selectedTable);
      fetchData(true);
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
      setGeneratedInvoice(null);
      fetchData(true);
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
      setSuccess('Charges added to hotel room bill successfully. Table session closed and table is now vacant.');
      setGeneratedInvoice(null);
      setActiveOrder(null);
      setSelectedTable('');
      setSearchParams({});
      await fetchData();
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
    const tbl = tables.find(t => t.table_number === selectedTable);
    if (!tbl?.current_guest && currentUser?.role !== 'GUEST') {
      setError(`Table ${selectedTable} has no assigned guest. Please assign or register a guest before sending orders to the kitchen.`);
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
      setGeneratedInvoice(null);
      fetchActiveOrder(false, selectedTable);
      fetchData(true);
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
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-3.5 h-3.5 text-[#6E6A63] animate-spin" />;
      case 'PREPARING': return <Coffee className="w-3.5 h-3.5 text-amber-400 animate-bounce" />;
      case 'READY': return <CheckCircle className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />;
      case 'SERVED': return <CheckCircle className="w-3.5 h-3.5 text-[#C49A32]" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-gray-500/10 border-gray-500/20 text-[#6E6A63]';
      case 'PREPARING': return 'bg-amber-500/10 border-amber-500/20 text-amber-300';
      case 'READY': return 'bg-emerald-500/10 border-emerald-600/30 text-emerald-300';
      case 'SERVED': return 'bg-[#C49A32]/10 border-[#C49A32]/20 text-[#C49A32]';
      default: return 'bg-gray-500/10 border-gray-500/20 text-[#6E6A63]';
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
            <h3 className="font-extrabold text-[#171717] flex items-center gap-2 tracking-wide text-sm">
              <TableIcon className="w-4 h-4 text-[#C49A32] animate-bounce" />
              INTERACTIVE RESTAURANT FLOOR PLAN
            </h3>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] text-[#6E6A63]">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" /> Vacant</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]" /> Occupied</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]" /> Cleaning</span>
            </div>
          </div>

          {/* The graphical interactive floor mapping area */}
          <div className="overflow-x-auto overflow-y-auto -mx-2 px-2 h-[520px] rounded-xl border border-black/10 shadow-[inset_0_0_20px_rgba(0,0,0,0.03)] custom-scrollbar">
            <div 
              style={{
                backgroundColor: '#F8F6F1',
                backgroundImage: `
                  linear-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0, 0, 0, 0.04) 1px, transparent 1px)
                `,
                backgroundSize: '24px 24px',
              }}
              className="relative w-full h-[1100px] min-w-[700px]"
            >
            {/* Area Partitions & Walls */}

            {/* Outdoor Patio area divider (right-most) */}
            <div className="absolute right-[2%] top-[15%] bottom-[15%] border-l border-dashed border-emerald-600/30 pl-3 flex flex-col justify-center">
              <span className="text-[9px] font-black text-emerald-700/60 tracking-wider uppercase rotate-90 transform origin-left translate-x-3 mb-8">OUTDOOR PATIO</span>
              <div className="absolute top-2 right-2 flex gap-1 text-[10px] opacity-35 text-emerald-400">🌿</div>
              <div className="absolute bottom-2 right-2 flex gap-1 text-[10px] opacity-35 text-emerald-400">🌿</div>
            </div>



            {/* Render tables mapped onto coordinate positions */}
            {tables.map(t => renderFloorTable(t))}
          </div></div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-[#6E6A63] px-1 gap-1">
            <span>Hover on seats to preview capacity</span>
            <span className="text-[#C49A32] font-bold">Click any table to configure kitchen order below</span>
          </div>
        </div>

      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm flex items-center gap-2">
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-600/30 text-emerald-400 rounded-xl text-sm flex items-center gap-2">
          <span>{success}</span>
        </div>
      )}
      {/* Menu Catalog & Shopping Cart (visible as a modal popup when a table is selected) */}
      {selectedTable && createPortal(
        <div className="fixed inset-0 bg-[#F8F6F1]/90 backdrop-blur-md z-50 flex items-center justify-center p-0 sm:p-4 lg:p-6 overflow-hidden">
          <div className="bg-white border border-black/10 w-full lg:max-w-7xl h-full sm:h-[95vh] lg:h-[90vh] sm:rounded-3xl rounded-none p-3 sm:p-4 lg:p-6 shadow-2xl relative flex flex-col overflow-hidden animate-fade-in">
            {/* Header / Table info & Close */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-black/5 pb-4 mb-4 shrink-0 gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#C49A32]/10 rounded-xl border border-[#C49A32]/20">
                  <TableIcon className="w-5 h-5 text-[#C49A32]" />
                </div>
                <div>
                  <h4 className="font-extrabold text-[#171717] text-base">Configuring Order: Table {selectedTable}</h4>
                  <p className="text-xs text-[#6E6A63]">Zone: {getTableZone(selectedTable)} • Capacity: {tables.find(t => t.table_number === selectedTable)?.capacity || 0} Guests</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
                {/* Waiter/Admin Table Status Control */}
                {isWaiterOrAdmin && (
                  <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-black/5">
                    <span className="text-[10px] font-black text-[#6E6A63] uppercase tracking-wider">Table Status:</span>
                    <select
                      value={tables.find(t => t.table_number === selectedTable)?.status || 'VACANT'}
                      onChange={async (e) => {
                        const tbl = tables.find(t => t.table_number === selectedTable);
                        if (tbl) {
                          await handleUpdateTableStatus(tbl.id, e.target.value);
                        }
                      }}
                      className="bg-[#F8F6F1] text-xs font-bold text-[#C49A32] border border-black/5 rounded px-2.5 py-1 outline-none cursor-pointer"
                    >
                      <option value="VACANT">Vacant</option>
                      <option value="OCCUPIED">Occupied</option>
                      <option value="UNDER_CLEANING">Cleaning</option>
                    </select>
                  </div>
                )}

                <button 
                  onClick={() => setSelectedTable('')}
                  className="px-4 py-2 bg-[#171717] hover:bg-[#333333] text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-sm"
                >
                  Close Session
                </button>
              </div>
            </div>

            {/* In-Modal Notifications */}
            {error && (
              <div className="mb-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center justify-between gap-2 shrink-0 animate-fade-in shadow-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
                <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800 font-bold text-xs p-1 cursor-pointer">✕</button>
              </div>
            )}
            {success && (
              <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between gap-2 shrink-0 animate-fade-in shadow-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">{success}</span>
                </div>
                <button onClick={() => setSuccess(null)} className="text-emerald-700 hover:text-emerald-900 font-bold text-xs p-1 cursor-pointer">✕</button>
              </div>
            )}

            {/* Main Content Grid (scrollable) */}
            {isReservedTable ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-8 space-y-6 max-w-lg mx-auto">
                <div className="w-20 h-20 bg-cyan-500/10 rounded-full border border-cyan-500/20 text-cyan-400 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.15)] animate-pulse">
                  <Calendar className="w-10 h-10" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-[#171717] uppercase tracking-wider font-mono">Table Reserved</h3>
                  <p className="text-[#6E6A63] text-sm leading-relaxed">
                    Table <span className="text-cyan-400 font-bold">{selectedTable}</span> has been reserved by the Receptionist for guest <strong className="text-[#171717]">"{activeRes?.customer_name}"</strong>.
                  </p>
                  <p className="text-xs text-[#6E6A63]/80 bg-[#F8F6F1]/50 border border-black/5 rounded-lg py-2 px-4 inline-block font-mono">
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
                    className="flex-grow py-3 px-6 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-[#171717] text-xs font-black uppercase tracking-widest rounded-xl cursor-pointer transition shadow-lg shadow-cyan-600/20"
                  >
                    Seat Reserved Guest
                  </button>
                  <button
                    onClick={() => setSelectedTable('')}
                    className="py-3 px-6 bg-[#F8F6F1] border border-black/5 hover:bg-[#F8F6F1] text-[#6E6A63] hover:text-[#171717] text-xs font-black uppercase tracking-widest rounded-xl cursor-pointer transition"
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
                <div className="glass-panel p-3 sm:p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 border border-black/5 bg-white/[0.01]">
                  <div className="flex-grow max-w-md relative">
                    <Search className="w-4 h-4 text-[#6E6A63]/80 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      placeholder="Search food, beverage, snacks..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full p-2.5 pl-10 bg-[#F8F6F1]/60 border border-black/5 rounded-lg focus:ring-2 focus:ring-[#C49A32] outline-none text-sm text-[#171717]/90"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <button
                      onClick={() => setFilterVegOnly(!filterVegOnly)}
                      className={`px-4 py-2 rounded-full text-xs font-bold border transition duration-200 cursor-pointer ${
                        filterVegOnly 
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
                          : 'bg-[#F8F6F1] border-black/5 text-[#6E6A63] hover:bg-[#F8F6F1]'
                      }`}
                    >
                      🥦 Vegetarian Only
                    </button>
                    <button
                      onClick={() => fetchData()}
                      className="p-2.5 rounded-lg bg-[#F8F6F1] border border-black/5 text-[#6E6A63] hover:bg-[#F8F6F1] transition cursor-pointer"
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
                        ? 'bg-[#C49A32] text-white shadow-sm' 
                        : 'bg-white border border-black/10 text-[#6E6A63] hover:bg-[#F8F6F1] hover:text-[#171717]'
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
                          : 'bg-[#F8F6F1]/80 border border-black/5 text-[#6E6A63] hover:bg-[#F8F6F1] hover:text-[#171717]'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Menu Grid */}
                {loading ? (
                  <div className="py-20 flex flex-col items-center justify-center text-[#6E6A63]/80">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-[#C49A32] rounded-full animate-spin mb-4" />
                    <p>Loading premium kitchen menu...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 pb-4">
                    {filteredMenu.map(item => (
                      <div key={item.id} className="bg-white rounded-2xl overflow-hidden flex flex-col justify-between glass-card-hover group border border-black/10 shadow-sm">
                        <div>
                          <div className="w-full aspect-[16/9] sm:aspect-[16/10] bg-[#F8F6F1] relative overflow-hidden flex items-center justify-center">
                            <img 
                              src={getMenuItemImage(item)} 
                              alt={item.name}
                              referrerPolicy="no-referrer"
                              onError={(e: any) => {
                                e.target.onerror = null;
                                e.target.src = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop';
                              }}
                              className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                            />
                            
                            <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[8px] font-bold shadow-sm border uppercase tracking-wider ${
                              item.is_veg 
                                ? 'bg-emerald-100 border-emerald-300 text-emerald-800' 
                                : 'bg-rose-100 border-rose-300 text-rose-800'
                            }`}>
                              {item.is_veg ? 'Veg' : 'Non-Veg'}
                            </span>
                          </div>

                          <div className="p-3.5 space-y-1.5">
                            <h4 className="font-bold text-[#171717] text-sm group-hover:text-[#C49A32] transition duration-200">{item.name}</h4>
                            <p className="text-[#6E6A63] text-[11px] line-clamp-2 min-h-[28px]">{item.description || 'Delectable house special freshly made to order.'}</p>
                          </div>
                        </div>

                        <div className="p-3.5 pt-0 flex justify-between items-center border-t border-white/[0.04] mt-2">
                          <span className="text-base font-black text-[#C49A32]">₹{parseFloat(item.price).toFixed(2)}</span>
                          <button
                            onClick={() => addToCart(item)}
                            className="p-2 bg-[#C49A32] hover:bg-[#b08828] text-white rounded-lg transition duration-200 cursor-pointer shadow-sm"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {filteredMenu.length === 0 && (
                      <div className="col-span-full py-16 text-center glass-panel rounded-2xl text-[#6E6A63]/80 flex flex-col items-center justify-center bg-white/[0.01]">
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
                {isStaff && (
                  (() => {
                    const tbl = tables.find(t => t.table_number === selectedTable) || {
                      id: 0,
                      table_number: selectedTable,
                      capacity: 4,
                      status: 'VACANT',
                      current_guest: null
                    };

                    if (!tbl.current_guest) {
                      return (
                        <div className="glass-panel rounded-2xl p-4 space-y-4 border border-amber-500/30 bg-amber-500/[0.04] shadow-[0_0_20px_rgba(245,158,11,0.08)] shrink-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-amber-300 flex items-center gap-2 text-xs uppercase tracking-wider">
                              <Users className="w-4 h-4 text-amber-400" />
                              Assign Guest Required
                            </h3>
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              Required to Order
                            </span>
                          </div>
                          <p className="text-[11px] text-[#171717]/80">
                            Assign a seated guest to <strong className="text-[#171717] font-mono">Table {selectedTable}</strong> before taking and sending food orders to the kitchen.
                          </p>
                          <div className="flex gap-2">
                            <select
                              value={assigningGuestId}
                              onChange={e => setAssigningGuestId(e.target.value)}
                              className="flex-grow p-2 bg-[#F8F6F1] text-xs text-[#171717]/90 border border-black/10 rounded-lg outline-none cursor-pointer focus:border-amber-400"
                            >
                              <option value="">-- Select Registered Guest --</option>
                              {guests.map(g => (
                                <option key={g.id} value={g.id}>
                                  {g.name || g.username} {g.phone ? `(${g.phone})` : ''}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => {
                                if (assigningGuestId && tbl.id) {
                                  handleAssignGuestToTable(tbl.id, assigningGuestId);
                                }
                              }}
                              disabled={!assigningGuestId || !tbl.id}
                              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer disabled:opacity-50"
                            >
                              Assign
                            </button>
                          </div>
                          
                          {!showNewGuestForm ? (
                            <button
                              onClick={() => setShowNewGuestForm(true)}
                              className="text-[#C49A32] hover:text-[#C49A32] font-bold text-xs flex items-center gap-1 cursor-pointer"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Or register new guest
                            </button>
                          ) : (
                            <div className="space-y-3.5 border-t border-black/5 pt-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-[#6E6A63] uppercase">New Dine-In Guest</span>
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
                                className="w-full p-2 bg-[#F8F6F1] border border-black/5 rounded-lg outline-none text-xs text-[#171717]/90"
                              />
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                  type="email"
                                  placeholder="Email (Optional)"
                                  value={newGuestEmail}
                                  onChange={e => setNewGuestEmail(e.target.value)}
                                  className="w-full p-2 bg-[#F8F6F1] border border-black/5 rounded-lg outline-none text-xs text-[#171717]/90"
                                />
                                <input
                                  type="text"
                                  placeholder="Phone (Optional)"
                                  value={newGuestPhone}
                                  onChange={e => setNewGuestPhone(e.target.value)}
                                  className="w-full p-2 bg-[#F8F6F1] border border-black/5 rounded-lg outline-none text-xs text-[#171717]/90"
                                />
                              </div>
                              <button
                                onClick={handleRegisterAndAssign}
                                disabled={!newGuestName || billingLoading}
                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-[#171717] font-bold rounded-lg text-xs transition cursor-pointer"
                              >
                                {billingLoading ? 'Registering...' : 'Register & Assign'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    }

                    const guestName = (tbl as any).current_guest_name || 
                                      (tbl as any).current_guest_username || 
                                      guests.find(g => g.id === tbl.current_guest)?.name || 
                                      guests.find(g => g.id === tbl.current_guest)?.username || 
                                      'Assigned Guest';

                    const guestEmail = (tbl as any).current_guest_email || 
                                       guests.find(g => g.id === tbl.current_guest)?.email || '';

                    const guestObj = guests.find(g => g.id === tbl.current_guest);
                    const currentGuestId = tbl.current_guest || guestObj?.id;
                    const currentGuestUsername = (tbl as any).current_guest_username || guestObj?.username;

                    const activeStayBooking = bookings.find((b: any) => 
                      (
                        (currentGuestId && (b.guest === currentGuestId || b.guest === Number(currentGuestId))) ||
                        (currentGuestUsername && b.guest_name === currentGuestUsername)
                      ) && b.status === 'CHECKED_IN'
                    );

                    const activeRoomNumber = (tbl as any).current_guest_active_room || activeStayBooking?.room_number;
                    const hasActiveRoomStay = Boolean(activeRoomNumber);

                    const activeOrderItems = activeOrder?.items?.filter((i: any) => i.status !== 'CANCELLED') || [];
                    const hasActiveOrder = Boolean(activeOrder && activeOrderItems.length > 0);
                    const unservedItems = activeOrderItems.filter((i: any) => i.status !== 'SERVED');
                    const isAllServed = hasActiveOrder && unservedItems.length === 0;

                    return (
                      <div className="glass-panel rounded-2xl p-4 space-y-4 border border-black/5 bg-white shrink-0">
                        <div className="flex items-center justify-between pb-3 border-b border-black/5">
                          <h3 className="font-bold text-[#171717] flex items-center gap-2 text-xs uppercase tracking-wider">
                            <Users className="w-4 h-4 text-emerald-500" />
                            Assigned Guest Details
                          </h3>
                          {tbl.id > 0 && (
                            <button
                              onClick={() => handleAssignGuestToTable(tbl.id, null)}
                              className="text-rose-500 hover:text-rose-600 text-[10px] font-bold cursor-pointer"
                            >
                              Unassign
                            </button>
                          )}
                        </div>
                        <div className="text-xs space-y-1">
                          <p className="font-bold text-[#171717] text-sm">
                            {guestName}
                          </p>
                          {guestEmail && (
                            <p className="text-[#6E6A63] text-[10px] truncate">
                              {guestEmail}
                            </p>
                          )}
                          {hasActiveRoomStay ? (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="text-[10px] bg-emerald-50 border border-emerald-300/80 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                <Hotel className="w-3 h-3 text-emerald-600" />
                                Room {activeRoomNumber} • Checked In
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="text-[10px] bg-amber-50 border border-amber-300/80 text-amber-900 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                <Utensils className="w-3 h-3 text-amber-600" />
                                Dine-In Only • Not Checked In to Room
                              </span>
                            </div>
                          )}
                        </div>

                        {/* State 1: No Food Ordered Yet */}
                        {!hasActiveOrder ? (
                          <div className="p-3.5 bg-[#F8F6F1] border border-black/5 rounded-xl text-center space-y-1">
                            <Utensils className="w-5 h-5 mx-auto text-[#C49A32]" />
                            <p className="text-xs font-bold text-[#171717]">No Food Ordered Yet</p>
                            <p className="text-[10px] text-[#6E6A63]">
                              Select dishes from the menu catalog and send your order to the kitchen.
                            </p>
                          </div>
                        ) : !isAllServed ? (
                          /* State 2: Food in Kitchen Preparation */
                          <div className="space-y-3 border-t border-black/5 pt-3">
                            <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl space-y-2">
                              <div className="flex items-center gap-2">
                                <Coffee className="w-4 h-4 text-amber-500 animate-bounce" />
                                <span className="text-xs font-bold text-[#171717]">Food In Kitchen Preparation</span>
                              </div>
                              <p className="text-[11px] text-[#6E6A63]">
                                Dishes are being prepared. In accordance with service policy, the bill will be available once all food is served to the customer.
                              </p>
                              <div className="flex items-center justify-between text-[10px] text-[#171717]/80 pt-1.5 border-t border-amber-500/20">
                                <span>Pending: <strong className="text-amber-700">{unservedItems.length}</strong> of <strong>{activeOrderItems.length}</strong> dishes</span>
                                <button
                                  onClick={handleServeAllItems}
                                  disabled={billingLoading}
                                  className="text-[10px] font-bold text-[#C49A32] hover:text-[#b08828] cursor-pointer flex items-center gap-1"
                                  title="Mark all dishes as served"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  Mark All as Served ✓
                                </button>
                              </div>
                            </div>

                            <button
                              disabled
                              className="w-full py-2.5 bg-gray-100 border border-black/5 text-[#6E6A63] font-bold rounded-xl text-xs uppercase tracking-wider cursor-not-allowed opacity-75 flex items-center justify-center gap-2"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              Serve Food to Generate Bill
                            </button>
                          </div>
                        ) : !generatedInvoice ? (
                          /* State 3: Food Served - Ready to Generate Bill */
                          <div className="space-y-3 border-t border-black/5 pt-3">
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl space-y-1">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                                <span className="text-xs font-bold text-emerald-900">Food Served to Customer</span>
                              </div>
                              <p className="text-[11px] text-emerald-700">
                                All {activeOrderItems.length} dish(es) have been served. You can now generate the final dine-in bill.
                              </p>
                            </div>

                            <button
                              onClick={handleGenerateDineInBill}
                              disabled={billingLoading}
                              className="w-full py-2.5 bg-[#C49A32] hover:bg-[#b08828] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-sm flex items-center justify-center gap-2"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              {billingLoading ? 'Generating Bill...' : 'Generate Dine-In Bill'}
                            </button>
                          </div>
                        ) : (
                          /* State 4: Bill Statement Generated */
                          <div className="space-y-3 border-t border-black/5 pt-3">
                            {/* Itemized Food List */}
                            <div className="space-y-1.5 border-b border-black/5 pb-2.5 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                              <div className="text-[10px] font-black text-[#6E6A63] uppercase tracking-wider mb-1 flex justify-between">
                                <span>Ordered & Served Items</span>
                                <span>Amount</span>
                              </div>
                              {(() => {
                                const items = (generatedInvoice.itemized_items && generatedInvoice.itemized_items.length > 0)
                                  ? generatedInvoice.itemized_items
                                  : (activeOrderItems.map((i: any) => ({
                                      id: i.id,
                                      name: i.menu_item_details?.name || 'Dish',
                                      quantity: i.quantity,
                                      unit_price: i.menu_item_details?.price || '0',
                                      total_price: (i.quantity * parseFloat(i.menu_item_details?.price || '0')).toFixed(2),
                                      is_veg: i.menu_item_details?.is_veg
                                    })) || []);

                                if (!items.length) {
                                  return <p className="text-[10px] text-[#6E6A63]/80 italic">No food items billed.</p>;
                                }

                                return items.map((item: any) => (
                                  <div key={item.id} className="flex justify-between items-center text-xs text-[#171717]/80">
                                    <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.is_veg ? 'bg-emerald-400 shadow-[0_0_4px_#34d399]' : 'bg-rose-400 shadow-[0_0_4px_#f43f5e]'}`} />
                                      <span className="truncate text-[#171717] font-medium text-[11px]">{item.name} <span className="text-[#C49A32] font-bold font-mono">x{item.quantity}</span></span>
                                    </div>
                                    <span className="font-bold text-[#171717] text-[11px] shrink-0 font-mono">
                                      ₹{parseFloat(item.total_price || (item.quantity * parseFloat(item.unit_price || 0))).toFixed(2)}
                                    </span>
                                  </div>
                                ));
                              })()}
                            </div>

                            <div className="flex justify-between text-xs text-[#6E6A63]">
                              <span>Food Subtotal:</span>
                              <span className="text-[#171717] font-bold font-mono">₹{parseFloat(generatedInvoice.food_charges || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-[#6E6A63]">
                              <span className="flex items-center gap-1">
                                GST on Food <span className="text-[10px] bg-[#C49A32]/20 text-[#C49A32] px-1 py-0.2 rounded font-bold">5%</span>
                              </span>
                              <span className="text-[#171717] font-bold font-mono">₹{parseFloat(generatedInvoice.tax_amount || (parseFloat(generatedInvoice.food_charges || 0) * 0.05)).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold border-t border-black/5 pt-2 text-[#171717]">
                              <span>Total Bill Amount:</span>
                              <span className="text-[#C49A32] font-black text-base font-mono">₹{parseFloat(generatedInvoice.total_amount || 0).toFixed(2)}</span>
                            </div>
                            <div className="space-y-2 pt-1">
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={() => setGeneratedInvoice(null)}
                                  className="py-2 bg-[#F8F6F1] border border-black/5 text-[#171717]/80 hover:text-[#171717] rounded-lg text-xs font-bold transition cursor-pointer"
                                >
                                  Cancel Bill
                                </button>
                                <button
                                  onClick={handlePayDineInBill}
                                  disabled={billingLoading}
                                  className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-sm"
                                >
                                  {billingLoading ? 'Processing...' : 'Pay & Checkout'}
                                </button>
                              </div>
                              {hasActiveRoomStay ? (
                                <button
                                  onClick={handleChargeToRoom}
                                  disabled={billingLoading}
                                  className="w-full py-2.5 bg-[#C49A32] hover:bg-[#b08828] text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-sm flex items-center justify-center gap-2"
                                >
                                  <Hotel className="w-3.5 h-3.5" />
                                  {billingLoading ? 'Processing...' : `Charge to Room ${activeRoomNumber} Bill`}
                                </button>
                              ) : (
                                <div className="space-y-1.5 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setError(`Guest "${guestName}" is not checked in to any hotel room. Please settle the bill via "Pay & Checkout".`)}
                                    className="w-full py-2.5 bg-gray-100 hover:bg-gray-200/80 border border-dashed border-gray-300 text-gray-500 font-semibold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2"
                                    title="Guest is not checked in to any hotel room. Please use Pay & Checkout."
                                  >
                                    <Hotel className="w-3.5 h-3.5 text-gray-400" />
                                    Charge to Hotel Room Bill (Not Checked In)
                                  </button>
                                  <div className="p-2 bg-amber-50 border border-amber-200/80 rounded-xl text-center shadow-sm">
                                    <p className="text-[11px] text-amber-900 font-medium leading-tight">
                                      Guest is dine-in only (no active room check-in). Settle bill via <strong className="text-emerald-700 font-bold">Pay & Checkout</strong>.
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}

                {/* Shopping Cart */}
                <div className="glass-panel rounded-2xl p-3 sm:p-4 flex flex-col justify-between flex-grow min-h-[250px] sm:min-h-[300px] border border-black/5 bg-white">
                  <div>
                    <div className="flex items-center justify-between pb-3.5 border-b border-black/5 mb-4">
                      <h3 className="font-bold text-[#171717] flex items-center gap-2 text-xs uppercase tracking-wider">
                        <ShoppingCart className="w-4 h-4 text-[#C49A32] animate-pulse" />
                        Checkout Session
                      </h3>
                      <span className="bg-[#C49A32]/15 border border-[#C49A32]/20 text-[#C49A32] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {cart.length} items
                      </span>
                    </div>

                    <div className="space-y-3 overflow-y-auto max-h-[180px] sm:max-h-[220px] pr-1">
                      {cart.map(item => (
                        <div key={item.menuItem.id} className="text-xs border-b border-black/5 pb-3 space-y-1.5">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-[#171717]">{item.menuItem.name}</span>
                            <span className="font-black text-[#C49A32]">
                              ₹{(parseFloat(item.menuItem.price) * item.quantity).toFixed(2)}
                            </span>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-1 gap-1.5 sm:gap-0">
                            <input
                              type="text"
                              placeholder="e.g. Extra spicy, no onions..."
                              value={item.notes}
                              onChange={e => updateCartNotes(item.menuItem.id, e.target.value)}
                              className="text-[10px] bg-[#F8F6F1] border border-black/5 rounded-lg px-2.5 py-1 outline-none text-[#6E6A63] focus:ring-1 focus:ring-[#C49A32] w-full sm:max-w-[130px]"
                            />
                            
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => updateCartQuantity(item.menuItem.id, -1)}
                                className="bg-[#F8F6F1] hover:bg-[#F8F6F1] border border-black/5 text-[#6E6A63] p-1 rounded-lg transition cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-bold w-4 text-center text-[#171717] text-xs">{item.quantity}</span>
                              <button 
                                onClick={() => updateCartQuantity(item.menuItem.id, 1)}
                                className="bg-[#F8F6F1] hover:bg-[#F8F6F1] border border-black/5 text-[#6E6A63] p-1 rounded-lg transition cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {cart.length === 0 && (
                        <div className="py-12 text-center text-[#6E6A63]/80 flex flex-col items-center justify-center">
                          <Utensils className="w-10 h-10 mb-3 text-slate-700 stroke-1" />
                          <p className="text-[11px]">Your shopping cart is empty.</p>
                          <p className="text-[9px] text-gray-600 mt-1">Select a table and add dishes to start.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-black/5 pt-4 space-y-4">
                    {!hasAssignedGuest && (
                      <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 flex items-start gap-2.5 text-amber-300">
                        <Users className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-amber-200">Table Not Assigned</p>
                          <p className="text-[11px] text-amber-300/80 mt-0.5">Please assign or register a guest above before sending this order to the kitchen.</p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 text-xs text-[#6E6A63]">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span className="text-[#171717]">₹{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GST on Food (5%)</span>
                        <span className="text-[#171717]">₹{tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-black text-[#171717] border-t border-black/5 pt-2 text-sm">
                        <span>Total Amount</span>
                        <span className="text-[#C49A32] text-base">₹{total.toFixed(2)}</span>
                      </div>
                    </div>

                    <button
                      onClick={handlePlaceOrder}
                      disabled={cart.length === 0 || orderLoading || !selectedTable || !hasAssignedGuest}
                      className="w-full glowing-btn-indigo text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50 text-xs cursor-pointer uppercase tracking-wider"
                    >
                      <Send className="w-3 h-3" />
                      {orderLoading ? 'Placing Order...' : (!hasAssignedGuest ? 'Assign Guest First to Order' : 'Send Order to Kitchen')}
                    </button>
                  </div>
                </div>

                {/* Live Order Status */}
                <div className="glass-panel rounded-2xl p-4 space-y-4 border border-black/5 bg-white shrink-0">
                  <div className="flex items-center justify-between pb-3 border-b border-black/5">
                    <h3 className="font-bold text-[#171717] flex items-center gap-2 text-xs uppercase tracking-wider">
                      <Clock className="w-4 h-4 text-[#C49A32] animate-pulse" />
                      Active Dining Status
                    </h3>
                    <button 
                      onClick={() => fetchActiveOrder(false, selectedTable)} 
                      className="text-[#6E6A63]/80 hover:text-[#C49A32] transition cursor-pointer"
                      title="Refresh Order telemetry"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {activeOrder && Array.isArray(activeOrder.items) && activeOrder.items.some(i => i.status !== 'CANCELLED') ? (
                    <div className="space-y-3 max-h-[180px] sm:max-h-[220px] overflow-y-auto pr-1">
                      <div className="flex justify-between items-center text-[10px] text-[#6E6A63] font-bold uppercase tracking-wider border-b border-black/5 pb-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span>Order Ref: #{activeOrder.id}</span>
                          <button
                            onClick={() => handleCancelOrder(activeOrder.id)}
                            className="text-rose-400 hover:text-rose-300 font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 cursor-pointer text-[8px]"
                          >
                            Cancel Order
                          </button>
                        </div>
                        <span className="text-[#C49A32]">Total: ₹{parseFloat(activeOrder.total_amount || '0').toFixed(2)}</span>
                      </div>
                      {activeOrder.items.map(item => (
                        <div key={item.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs border-b border-white/[0.03] pb-2 gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-[#171717] truncate">{item.menu_item_details?.name || 'Dish'} <span className="text-[#C49A32]">x{item.quantity}</span></p>
                            {item.notes && <p className="text-[10px] text-[#6E6A63]/80 italic mt-0.5">Instructions: {item.notes}</p>}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${getStatusColor(item.status)}`}>
                              {getStatusIcon(item.status)}
                              {item.status}
                            </span>
                            {item.status !== 'SERVED' && item.status !== 'CANCELLED' && (
                              <button
                                onClick={() => handleUpdateItemStatus(item.id, 'SERVED')}
                                className="px-2 py-1 bg-[#C49A32] hover:bg-[#b08828] text-white rounded text-[10px] font-bold cursor-pointer transition uppercase"
                                title="Mark dish as served to table"
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
                    <div className="text-center text-[#6E6A63]/80 py-6 text-xs flex flex-col items-center justify-center">
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
