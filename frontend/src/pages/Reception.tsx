import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import API from '../services/api';
import { CreditCard, CheckCircle, CheckCircle2, ShieldAlert, RefreshCcw, ConciergeBell, Download, Calendar, Hotel, Sparkles, Building2, Search, Filter, X, Users, ChevronLeft, ChevronRight } from 'lucide-react';

interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  phone: string;
  guest_type: string;
  role: string;
}

interface Room {
  id: number;
  room_number: string;
  room_type: string;
  price_per_night: string;
  status: string;
  capacity: number;
  floor?: number;
}

interface Table {
  id: number;
  table_number: string;
  capacity: number;
  status: string;
}

interface Booking {
  id: number;
  guest_name: string;
  room_number: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
  total_price: string;
}

interface Invoice {
  id: number;
  guest_name: string;
  guest_type_at_billing: string;
  room_charges: string;
  food_charges: string;
  tax_amount: string;
  total_amount: string;
  payment_status: string;
}

const Reception: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'checkin' | 'active' | 'calendar' | 'billing'>('checkin');
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [floorTransitioning, setFloorTransitioning] = useState(false);
  const [lobbyVisible, setLobbyVisible] = useState(false);
  const [roomFilter, setRoomFilter] = useState<'all' | 'vacant' | 'occupied' | 'maintenance'>('all');
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [guests, setGuests] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isReservingTable, setIsReservingTable] = useState(false);
  const [reserveCustomerName, setReserveCustomerName] = useState('');
  const [reserveTableId, setReserveTableId] = useState('');
  const [reserveTime, setReserveTime] = useState('');
  const [tableReservations, setTableReservations] = useState<any[]>([]);
  const [isExistingGuestReservation, setIsExistingGuestReservation] = useState(false);
  const [selectedReserveGuestId, setSelectedReserveGuestId] = useState('');

  // Form states
  const [selectedExistingGuestId, setSelectedExistingGuestId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [groupSize, setGroupSize] = useState('2');
  const [guestType, setGuestType] = useState('BOTH'); // DINE_IN, STAY_IN, BOTH
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedTableId, setSelectedTableId] = useState('');
  const getCurrentDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [checkInDate, setCheckInDate] = useState(getCurrentDateString());
  const [checkOutDate, setCheckOutDate] = useState('');
  const [immediateCheckIn, setImmediateCheckIn] = useState(true);
  const [roomPage, setRoomPage] = useState(0);

  // Calendar states
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth()); // 0-indexed
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarSearchQuery, setCalendarSearchQuery] = useState('');
  const [calendarStatusFilter, setCalendarStatusFilter] = useState<'all' | 'vacant' | 'occupied' | 'maintenance' | 'booked'>('all');

  const checkInRef = React.useRef<HTMLInputElement>(null);
  const checkOutRef = React.useRef<HTMLInputElement>(null);
  const reserveTimeRef = React.useRef<HTMLInputElement>(null);

  // Billing states
  const [selectedBillingGuestId, setSelectedBillingGuestId] = useState('');

  // OTP Verification for check-in
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Reset OTP verification states when guest contact details change
    setOtpSent(false);
    setOtpVerified(false);
    setOtpCode('');
    setOtpError(null);
    setOtpSuccess(null);
  }, [email, phone]);

  const handleSendCheckinOtp = async () => {
    if (!email || !phone) {
      setOtpError('Please enter both Guest Email and Contact Number first.');
      return;
    }
    setOtpLoading(true);
    setOtpError(null);
    setOtpSuccess(null);
    try {
      const res = await API.post('users/send-checkin-otp/', {
        email: email.trim(),
        phone: phone.trim()
      });
      setOtpSent(true);
      setOtpSuccess(res.data.message || 'Verification OTP code sent to guest email!');
    } catch (err: any) {
      console.error('Failed to send OTP:', err);
      setOtpError(err.response?.data?.error || 'Failed to send verification code. Verify mail setup.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyCheckinOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP code.');
      return;
    }
    setOtpLoading(true);
    setOtpError(null);
    setOtpSuccess(null);
    try {
      const res = await API.post('users/verify-checkin-otp/', {
        email: email.trim(),
        phone: phone.trim(),
        otp: otpCode.trim()
      });
      if (res.data.verified) {
        setOtpVerified(true);
        setOtpSuccess('Guest identity verified successfully! You can now proceed to check-in.');
      }
    } catch (err: any) {
      console.error('Failed to verify OTP:', err);
      setOtpError(err.response?.data?.error || 'Invalid or expired verification code.');
    } finally {
      setOtpLoading(false);
    }
  };
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    confirmText: string;
    cancelText?: string | null;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  // Dynamically group rooms into floors
  const getRoomFloor = (roomNumber: string): number => {
    const num = parseInt(roomNumber);
    if (isNaN(num)) return 1;
    return Math.floor(num / 100) || 1;
  };

  const uniqueFloors = Array.from(new Set(rooms.map(r => getRoomFloor(r.room_number)))).sort((a, b) => a - b);

  const handleFloorClick = (floorNum: number) => {
    setFloorTransitioning(true);
    setRoomFilter('all');
    setRoomSearchQuery('');
    setRoomPage(0);
    setTimeout(() => {
      setSelectedFloor(floorNum);
      setFloorTransitioning(false);
      setLobbyVisible(false);
      setTimeout(() => setLobbyVisible(true), 80);
    }, 500);
  };

  const handleBackToBuilding = () => {
    setLobbyVisible(false);
    setFloorTransitioning(true);
    setRoomPage(0);
    setTimeout(() => {
      setSelectedFloor(null);
      setFloorTransitioning(false);
    }, 400);
  };


  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, roomsRes, tablesRes, bookingsRes, tableReservationsRes] = await Promise.all([
        API.get('users/'),
        API.get('rooms/'),
        API.get('tables/'),
        API.get('bookings/'),
        API.get('table-reservations/')
      ]);
      setGuests(usersRes.data.filter((u: any) => u.role === 'GUEST' || u.role === ''));
      setRooms(roomsRes.data);
      setTables(tablesRes.data);
      setBookings(bookingsRes.data);
      setTableReservations(tableReservationsRes.data);
    } catch (err: any) {
      setError('Failed to fetch data: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setImmediateCheckIn(checkInDate === getCurrentDateString());
  }, [checkInDate]);

  useEffect(() => {
    setRoomPage(0);
  }, [roomFilter, roomSearchQuery]);

  const handleRegisterAndCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const fullName = `${firstName} ${lastName}`;
    const sanitizedUsername = fullName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.floor(100 + Math.random() * 900);

    try {
      let guestId = '';
      if (selectedExistingGuestId) {
        guestId = selectedExistingGuestId;
        // Update existing guest details
        await API.patch(`users/${guestId}/`, {
          name: fullName,
          email: email,
          phone: phone,
          guest_type: guestType
        });
      } else {
        // 1. Create guest user account
        const userRes = await API.post('users/', {
          username: sanitizedUsername,
          name: fullName,
          email: email,
          phone: phone,
          role: 'GUEST',
          guest_type: guestType,
          password: 'TemporaryGuestPassword123!'
        });
        guestId = userRes.data.id;
      }

      // 2. Allocate room if guest has stay
      if (guestType === 'STAY_IN' || guestType === 'BOTH') {
        if (!selectedRoomId || !checkInDate || !checkOutDate) {
          throw new Error('Room details and dates are required for Stay guests.');
        }
        await API.post('bookings/', {
          room: selectedRoomId,
          guest: guestId,
          check_in_date: checkInDate,
          check_out_date: checkOutDate,
          status: immediateCheckIn ? 'CHECKED_IN' : 'BOOKED'
        });
      }

      // 3. Allocate table if guest is Dine-in or Both
      if (guestType === 'DINE_IN' || guestType === 'BOTH') {
        if (selectedTableId) {
          await API.patch(`tables/${selectedTableId}/`, {
            status: 'OCCUPIED',
            current_guest: guestId
          });
        }
      }

      setSuccess(selectedExistingGuestId ? `Guest ${fullName} checked in successfully!` : `Guest ${fullName} registered and checked in successfully!`);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setSelectedRoomId('');
      setSelectedTableId('');
      setCheckInDate(getCurrentDateString());
      setCheckOutDate('');
      setSelectedExistingGuestId('');
      setImmediateCheckIn(true);
      setIsRegistering(false); // Close registration popup
      fetchData();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!reserveTableId || !reserveCustomerName || !reserveTime) {
        throw new Error('All reservation fields are required.');
      }
      await API.post('table-reservations/', {
        table: reserveTableId,
        customer_name: reserveCustomerName,
        reservation_time: new Date(reserveTime).toISOString(),
        status: 'BOOKED'
      });
      setSuccess(`Table reservation for ${reserveCustomerName} created successfully!`);
      setReserveCustomerName('');
      setReserveTableId('');
      setReserveTime('');
      setIsReservingTable(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'Failed to create table reservation');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = async (resId: number, name: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await API.patch(`table-reservations/${resId}/`, {
        status: 'CANCELLED'
      });
      setSuccess(`Reservation for ${name} cancelled successfully.`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel reservation');
    } finally {
      setLoading(false);
    }
  };



  const handleGenerateBill = async () => {
    if (!selectedBillingGuestId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await API.post('invoices/generate-bill/', {
        guest_id: selectedBillingGuestId
      });
      setCurrentInvoice(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate statement');
    } finally {
      setLoading(false);
    }
  };

  const handlePayBill = async () => {
    if (!currentInvoice) return;
    setLoading(true);
    setError(null);
    try {
      const response = await API.post(`invoices/${currentInvoice.id}/pay-invoice/`);
      if (response.data?.email_sent) {
        setSuccess(`Invoice paid successfully! A polished receipt has been emailed to the guest.`);
      } else {
        setSuccess(`Invoice paid successfully, but the receipt email was not delivered. ${response.data?.email_error || 'Please check the email provider settings.'}`);
      }
      setCurrentInvoice(null);
      setSelectedBillingGuestId('');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInBooking = async (id: number) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await API.patch(`bookings/${id}/`, { status: 'CHECKED_IN' });
      setSuccess('Booking checked in successfully! Room status set to Occupied.');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to check in stay');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = (id: number, guestName: string, roomNum: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Cancel Booking',
      message: (
        <span>
          Are you sure you want to cancel the booking for guest <strong className="text-white">"{guestName}"</strong> in Room <strong className="text-white font-mono">{roomNum}</strong>?
        </span>
      ),
      confirmText: 'Yes, Cancel Booking',
      cancelText: 'No, Keep It',
      onConfirm: async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
          await API.delete(`bookings/${id}/`);
          setSuccess('Booking cancelled and removed successfully.');
          fetchData();
        } catch (err: any) {
          setError(err.response?.data?.error || 'Failed to cancel booking');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleCompleteMaintenance = async (roomId: number, roomNumber: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await API.patch(`rooms/${roomId}/`, { status: 'AVAILABLE' });
      setSuccess(`Room ${roomNumber} maintenance completed. Status is now Vacant.`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to complete maintenance');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="space-y-6 pb-12 relative">

      {/* Visual CSS styles for 3D hotel building */}
      {/* Visual CSS styles for 3D hotel building & lobby */}
      <style>{`
        @keyframes buildingEntrance {
          from { opacity: 0; transform: perspective(1000px) rotateX(20deg) translateY(40px) scale(0.92); }
          to   { opacity: 1; transform: perspective(1000px) rotateX(0deg) translateY(0px) scale(1); }
        }
        @keyframes lobbySlideIn {
          from { opacity: 0; transform: translateY(32px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0px) scale(1); }
        }
        @keyframes roomCardPop {
          from { opacity: 0; transform: translateY(20px) scale(0.9); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes floatY {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.4; }
          50%      { transform: translateY(-20px) scale(1.5); opacity: 0.8; }
        }
        .hotel-building-3d {
          perspective: 1200px;
          perspective-origin: 50% 40%;
        }
        .building-body {
          transform-style: preserve-3d;
          animation: buildingEntrance 0.9s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .building-fade-out {
          animation: buildingEntrance 0.4s cubic-bezier(0.16, 1, 0.3, 1) reverse both;
        }
        .building-floor-group {
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .building-floor-group:hover {
          transform: translate(-10px, -5px);
        }
        .floor-card {
          position: relative;
          transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
          transform-style: preserve-3d;
        }
        .floor-card:hover {
          transform: translateY(-4px) scale(1.015);
          z-index: 20;
        }
        .floor-card:hover .floor-front {
          border-color: rgba(99,102,241,0.7);
          box-shadow: 0 0 0 1px rgba(99,102,241,0.3), 0 8px 32px rgba(99,102,241,0.25), 0 0 60px rgba(99,102,241,0.08);
        }
        .floor-card:hover .floor-top {
          background: linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.12) 100%);
        }
        .floor-card:hover .floor-side {
          background: linear-gradient(180deg, rgba(60,70,130,0.9) 0%, rgba(20,25,60,0.95) 100%);
        }
        .floor-front {
          transition: all 0.28s ease;
        }
        .floor-top {
          transition: all 0.28s ease;
        }
        .floor-side {
          transition: all 0.28s ease;
        }
        .lobby-view {
          animation: lobbySlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .lobby-view-exit {
          animation: lobbySlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse both;
        }
        .building-float {
          animation: floatY 4s ease-in-out infinite;
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
          background: radial-gradient(circle at 50% 15%, #0e1428 0%, #020409 100%);
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
          background: rgba(99,102,241,0.25);
          border-radius: 9px;
        }
        .lobby-corridor-container::-webkit-scrollbar-thumb:hover {
          background: rgba(99,102,241,0.4);
        }
        .corridor-floor {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%) rotateX(75deg);
          transform-origin: top center;
          width: 140px;
          background: linear-gradient(180deg, rgba(99,102,241,0.05) 0%, rgba(99,102,241,0.2) 100%);
          border-left: 2px dashed rgba(99,102,241,0.3);
          border-right: 2px dashed rgba(99,102,241,0.3);
          box-shadow: 0 0 40px rgba(99,102,241,0.1);
          pointer-events: none;
          z-index: 0;
        }
        .corridor-floor-lines {
          position: absolute;
          inset: 0;
          background: linear-gradient(0deg, transparent 29px, rgba(99,102,241,0.06) 30px);
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
          height: 125px;
          cursor: pointer;
          flex-shrink: 0;
        }
        .corridor-wall-left .room-cabinet-3d:hover {
          transform: translateZ(40px) translateX(12px);
        }
        .corridor-wall-right .room-cabinet-3d:hover {
          transform: translateZ(40px) translateX(-12px);
        }
        .room-cabinet-front {
          position: absolute;
          inset: 0;
          border-radius: 16px;
          padding: 0.55rem;
          box-shadow: 0 12px 28px rgba(0,0,0,0.6);
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

        /* 3D Restaurant Table Styles */
        .table-grid-3d {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 1.5rem;
          padding: 1rem;
          perspective: 1000px;
          perspective-origin: 50% 30%;
        }
        .table-pod-3d {
          position: relative;
          transform-style: preserve-3d;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          height: 140px;
          cursor: pointer;
          transform: perspective(600px) rotateX(12deg) rotateY(-8deg);
        }
        .table-pod-3d:hover {
          transform: perspective(600px) rotateX(4deg) rotateY(-3deg) translateY(-8px) scale(1.05);
        }
        .table-front-face {
          position: absolute;
          inset: 0;
          border-radius: 20px;
          padding: 1rem;
          box-shadow: 0 10px 24px rgba(0,0,0,0.55);
          z-index: 2;
          transform-style: preserve-3d;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border: 1px solid rgba(255,255,255,0.06);
          transition: all 0.35s ease;
        }
        .table-depth-side {
          position: absolute;
          left: 4px;
          right: 4px;
          bottom: -10px;
          height: 10px;
          z-index: 1;
          border-radius: 0 0 16px 16px;
          box-shadow: inset 0 -2px 8px rgba(0,0,0,0.8);
          transition: all 0.35s ease;
        }
        @keyframes pageTurnFade {
          0% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        .page-turn-anim {
          animation: pageTurnFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/5 pb-4 print:hidden">
          <div className="flex items-center gap-3">
            <ConciergeBell className="w-8 h-8 text-indigo-400" />
            <h2 className="text-2xl font-bold tracking-tight text-white font-sans">Reception & Check-In Panel</h2>
            <button
              onClick={fetchData}
              className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-white/5 rounded-xl transition cursor-pointer"
              title="Reload Reception Metrics"
            >
              <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm print:hidden">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-amber-600/10 border border-amber-600/20 text-amber-400 rounded-xl text-sm flex items-center gap-2 print:hidden">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span className="font-semibold">{success}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex overflow-x-auto whitespace-nowrap scrollbar-none border border-white/5 mb-6 bg-slate-900/80 backdrop-blur-md rounded-xl p-1 shadow-sm print:hidden">
          <button
            onClick={() => { setActiveTab('checkin'); setError(null); setSuccess(null); }}
            className={`flex-1 py-3 px-4 text-center rounded-lg text-xs sm:text-sm font-semibold transition duration-200 cursor-pointer shrink-0 ${activeTab === 'checkin' ? 'bg-slate-700 border border-amber-500/30 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            Guest Registration
          </button>
          <button
            onClick={() => { setActiveTab('active'); setError(null); setSuccess(null); }}
            className={`flex-1 py-3 px-4 text-center rounded-lg text-xs sm:text-sm font-semibold transition duration-200 cursor-pointer shrink-0 ${activeTab === 'active' ? 'bg-slate-700 border border-amber-500/30 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            Active Stays
          </button>
          <button
            onClick={() => { setActiveTab('calendar'); setError(null); setSuccess(null); }}
            className={`flex-1 py-3 px-4 text-center rounded-lg text-xs sm:text-sm font-semibold transition duration-200 cursor-pointer shrink-0 ${activeTab === 'calendar' ? 'bg-slate-700 border border-amber-500/30 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            Occupancy Calendar
          </button>
          <button
            onClick={() => { setActiveTab('billing'); setError(null); setSuccess(null); }}
            className={`flex-1 py-3 px-4 text-center rounded-lg text-xs sm:text-sm font-semibold transition duration-200 cursor-pointer shrink-0 ${activeTab === 'billing' ? 'bg-slate-700 border border-amber-500/30 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            Billing & Checkout
          </button>
        </div>

        {/* Checkin Registration Tab */}
        {activeTab === 'checkin' && (
          <div className="space-y-6">

            {/* ═══ ISOMETRIC HOTEL BUILDING + FLOOR MAP ═══ */}
            <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
              {/* Panel Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Smart Hotel Reservation — Floor Map
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    onClick={() => { setSelectedRoomId(''); setGuestType('STAY_IN'); setIsRegistering(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/30 transition cursor-pointer text-[10px] font-black uppercase tracking-wider font-mono shadow-md"
                  >+ Register Guest</button>
                  <button
                    onClick={() => setIsReservingTable(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/20 border border-amber-600/40 text-emerald-300 hover:bg-amber-600/30 transition cursor-pointer text-[10px] font-black uppercase tracking-wider font-mono shadow-md"
                  >+ Reserve Table</button>
                </div>
              </div>

              {/* ─── Split Panel: Building Left | Floor Map Right ─── */}
              <div className="flex flex-col lg:flex-row min-h-[520px]">

                {/* ═══ LEFT PANEL: Isometric Building + Floor Selector ═══ */}
                <div className="flex flex-col items-center w-full lg:w-[350px] shrink-0 border-b lg:border-b-0 lg:border-r border-white/5 p-3 sm:p-5 bg-[#03050d] relative overflow-hidden">
                  {/* Background grid */}
                  <div className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: `radial-gradient(circle at 50% 30%, rgba(0,255,136,0.04) 0%, transparent 60%),
                      linear-gradient(rgba(0,255,136,0.02) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(0,255,136,0.02) 1px, transparent 1px)`,
                      backgroundSize: '100% 100%, 24px 24px, 24px 24px'
                    }}
                  />

                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 text-center relative z-10">
                    HOTEL STRUCTURE
                  </div>
                  {/* SVG 3D Isometric Building — Neon Dark Design */}
                  {/* SVG Isometric Skyscraper — Exact Mockup Replica */}
                  <div className="flex items-start justify-center gap-2 sm:gap-4 relative z-10 w-full max-w-full overflow-x-auto pb-2">
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
                          const groundColor = sorted.length > 0 ? (selectedFloor === sorted[0] ? '#d4af37' : '#d4af3777') : '#d4af3777';
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
                            const vacantCount = floorRooms.filter(r => r.status === 'AVAILABLE').length;
                            const occupiedCount = floorRooms.filter(r => r.status === 'OCCUPIED').length;
                            const isFull = vacantCount === 0 && floorRooms.length > 0;
                            const isHeavy = occupiedCount > floorRooms.length * 0.7;
                            const neon = isSelected ? '#d4af37' : isFull ? '#722f37' : isHeavy ? '#8b7355' : '#d4af37';

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

                                <text x={p(w + 20, 0, z1 + h / 2 - 2).x} y={p(w + 20, 0, z1 + h / 2 - 2).y} fill={isSelected ? neon : '#94a3b8'} fontSize="9" fontWeight="900" fontFamily="monospace" textAnchor="end">L{floorNum}</text>
                                <text x={p(w + 20, 0, z1 + h / 2 + 7).x} y={p(w + 20, 0, z1 + h / 2 + 7).y} fill={isFull ? '#722f37' : isHeavy ? '#8b7355' : '#b8860b'} fontSize="6.5" fontWeight="800" fontFamily="monospace" textAnchor="end" opacity={0.9}>{vacantCount > 0 ? `${vacantCount} VACANT` : 'FULL'}</text>


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

                          const defColor = sorted.length > 0 ? ('#d4af37') : '#d4af37';

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
                        const floorRooms = rooms.filter(r => getRoomFloor(r.room_number) === floorNum);
                        const vacantCount = floorRooms.filter(r => r.status === 'AVAILABLE').length;
                        const isFull = vacantCount === 0 && floorRooms.length > 0;
                        return (
                          <button key={floorNum} onClick={() => handleFloorClick(floorNum)}
                            className={`w-full rounded-lg text-center px-2 py-2.5 transition-all duration-300 cursor-pointer border relative overflow-hidden flex flex-col items-center gap-1 ${isSelected
                                ? 'bg-amber-600/15 border-emerald-400/70 text-emerald-200 shadow-md shadow-black/20'
                                : 'bg-white/[0.02] border-white/8 text-gray-500 hover:text-emerald-300 hover:border-amber-600/40'
                              }`}
                          >
                            {isSelected && <div className="absolute inset-0 bg-gradient-to-b from-emerald-400/10 to-transparent" />}
                            <span className="text-[11px] font-black relative z-10">L{floorNum}</span>
                            <span className={`w-1.5 h-1.5 rounded-full relative z-10 ${isFull
                                ? 'bg-rose-500 shadow-md shadow-black/20'
                                : 'bg-emerald-400 animate-pulse shadow-md shadow-black/20'
                              }`} />
                            <span className={`text-[7px] font-bold uppercase tracking-wide relative z-10 ${isFull ? 'text-rose-400' : 'text-amber-400/70'
                              }`}>
                              {isFull ? 'FULL' : `${vacantCount}V`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>


                  {/* Building Stats */}
                  <div className="mt-auto pt-4 border-t border-white/5 w-full space-y-2 relative z-10">
                    <div className="flex justify-between items-center text-xs px-1">
                      <span className="text-gray-500">Total Floors</span>
                      <span className="text-white font-bold">{uniqueFloors.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs px-1">
                      <span className="text-gray-500">Total Rooms</span>
                      <span className="text-white font-bold">{rooms.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs px-1">
                      <span className="text-gray-500">Selected</span>
                      <span className="text-amber-400 font-bold">{selectedFloor === 0 ? 'Lobby / Cafe' : selectedFloor !== null ? `Floor ${selectedFloor}` : 'None'}</span>
                    </div>
                  </div>
                </div>

                {/* ═══ RIGHT PANEL: Floor Map (3D Lobby corridor / Restaurant Table Map) ═══ */}
                <div className="flex-1 flex flex-col bg-[#03050d] relative overflow-hidden">
                  {/* Background grid */}
                  <div className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: `radial-gradient(circle at 60% 20%, rgba(99,102,241,0.04) 0%, transparent 60%),
                      linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)`,
                      backgroundSize: '100% 100%, 32px 32px, 32px 32px'
                    }}
                  />

                  {selectedFloor === null && !floorTransitioning ? (
                    /* ── No floor selected: Prompt to select ── */
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-10 relative z-10">
                      <Building2 className="w-16 h-16 text-indigo-500/30 mb-4" />
                      <h3 className="text-xl font-black text-white mb-2">Select a Floor</h3>
                      <p className="text-sm text-gray-500 max-w-md">
                        Click on a floor from the building structure view to explore room statuses.
                      </p>
                      {uniqueFloors.length === 0 && (
                        <p className="text-gray-600 text-sm mt-4">No rooms registered in the system yet.</p>
                      )}
                    </div>
                  ) : floorTransitioning ? (
                    /* ── Transition spinner ── */
                    <div className="flex-1 flex items-center justify-center relative z-10">
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-full border-2 border-amber-600/30 border-t-emerald-400 animate-spin mx-auto mb-3" />
                        <div className="text-[11px] font-black text-amber-400 uppercase tracking-[0.2em]">
                          Loading Floor {selectedFloor === 0 ? 'Lobby' : `Level ${selectedFloor}`}...
                        </div>
                      </div>
                    </div>
                  ) : (() => {

                    // Render 3D Restaurant Table Map if Lobby is selected
                    if (selectedFloor === 0) {
                      const vacantTables = tables.filter(t => t.status === 'VACANT' && !tableReservations.some((tr: any) => tr.table === t.id && tr.status === 'BOOKED')).length;
                      const occupiedTables = tables.filter(t => t.status === 'OCCUPIED').length;
                      const reservedTables = tableReservations.filter((tr: any) => tr.status === 'BOOKED').length;

                      const filteredTables = tables.filter(t => {
                        const isReserved = tableReservations.some((tr: any) => tr.table === t.id && tr.status === 'BOOKED');
                        if (roomFilter === 'all') return true;
                        if (roomFilter === 'vacant') return t.status === 'VACANT' && !isReserved;
                        if (roomFilter === 'occupied') return t.status === 'OCCUPIED';
                        if (roomFilter === 'maintenance') return isReserved;
                        return true;
                      }).filter(t => {
                        if (!roomSearchQuery) return true;
                        const q = roomSearchQuery.toLowerCase();
                        if (t.table_number.toLowerCase().includes(q)) return true;
                        const resMatch = tableReservations.find((tr: any) => tr.table === t.id && tr.status === 'BOOKED' && tr.customer_name.toLowerCase().includes(q));
                        if (resMatch) return true;
                        return false;
                      }).sort((a, b) => a.table_number.localeCompare(b.table_number, undefined, { numeric: true }));

                      return (
                        <div className={`flex-1 flex flex-col p-5 relative z-10 ${lobbyVisible ? 'lobby-view' : 'lobby-view-exit'}`}>
                          {/* Floor Map Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                              <button onClick={handleBackToBuilding}
                                className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                                title="Back to building view"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <div>
                                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                  Selected Floor: <span className="text-white">Ground Lobby / Café</span>
                                </h2>
                              </div>
                              {/* Mobile floor switcher */}
                              <div className="flex lg:hidden gap-1 ml-2">
                                <button onClick={() => handleFloorClick(0)}
                                  className={`px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer ${selectedFloor === 0
                                      ? 'bg-amber-600/20 text-emerald-300 border border-emerald-400/40'
                                      : 'bg-white/5 text-gray-500 border border-white/5 hover:text-amber-400'
                                    }`}
                                >Lobby</button>
                                {[...uniqueFloors].sort((a, b) => b - a).map(f => (
                                  <button key={f} onClick={() => handleFloorClick(f)}
                                    className={`px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer ${selectedFloor === f
                                        ? 'bg-amber-600/20 text-emerald-300 border border-emerald-400/40'
                                        : 'bg-white/5 text-gray-500 border border-white/5 hover:text-amber-400'
                                      }`}
                                  >L{f}</button>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {/* Search */}
                              <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                                <input type="text" placeholder="Search tables..."
                                  value={roomSearchQuery}
                                  onChange={e => setRoomSearchQuery(e.target.value)}
                                  className="pl-8 pr-3 py-2 text-xs rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-600/40 focus:bg-white/[0.05] transition w-36"
                                />
                              </div>
                              <span className="text-xs font-mono text-gray-400">
                                <span className="text-amber-400 font-bold">{tables.length}</span> Tables
                              </span>
                            </div>
                          </div>

                          {/* Split Panel: Left side Table Map, Right side Concierge Dashboard */}
                          <div className="flex-1 flex flex-col xl:flex-row gap-5 min-h-0 overflow-hidden">
                            {/* Left Panel: Table Map */}
                            <div className="flex-1 flex flex-col min-h-0">
                              {/* Filter Pills */}
                              <div className="flex items-center gap-2 mb-4">
                                <Filter className="w-3.5 h-3.5 text-gray-500 mr-1" />
                                {([
                                  { label: 'All Tables', value: 'all' as const, count: tables.length },
                                  { label: 'Vacant', value: 'vacant' as const, count: vacantTables },
                                  { label: 'Occupied', value: 'occupied' as const, count: occupiedTables },
                                  { label: 'Reserved', value: 'maintenance' as const, count: reservedTables },
                                ] as const).map(f => (
                                  <button key={f.label} onClick={() => setRoomFilter(f.value)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all duration-200 cursor-pointer border ${roomFilter === f.value
                                        ? f.value === 'occupied'
                                          ? 'bg-purple-500/15 text-purple-300 border-purple-500/40 shadow-md shadow-black/20'
                                          : f.value === 'maintenance'
                                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-md shadow-black/20'
                                            : 'bg-amber-600/15 text-emerald-300 border-emerald-400/40 shadow-md shadow-black/20'
                                        : 'bg-white/[0.02] text-gray-500 border-white/5 hover:text-white hover:border-white/15'
                                      }`}
                                  >
                                    {f.label} <span className="ml-1.5 opacity-60">{f.count}</span>
                                  </button>
                                ))}
                              </div>

                              {/* 3D Restaurant Table Map Grid */}
                              <div className="flex-1 overflow-auto pr-1">
                                {filteredTables.length === 0 ? (
                                  <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
                                    No tables match the current filter.
                                  </div>
                                ) : (
                                  <div className="table-grid-3d">
                                    {filteredTables.map((table) => {
                                      const activeRes = tableReservations.find((tr: any) => tr.table === table.id && tr.status === 'BOOKED');
                                      const isReserved = !!activeRes;
                                      const isOccupied = table.status === 'OCCUPIED';
                                      const isVacant = !isReserved && !isOccupied;

                                      let themeColor = 'rgba(16, 185, 129, 0.2)';
                                      let themeBg = 'linear-gradient(135deg, rgba(6, 78, 59, 0.25) 0%, rgba(3, 7, 18, 0.98) 100%)';
                                      let sideBg = '#047857';
                                      let statusLabel = 'VACANT';
                                      let glowDot = 'bg-emerald-400 shadow-md shadow-black/20';

                                      if (isOccupied) {
                                        themeColor = 'rgba(168, 85, 247, 0.2)';
                                        themeBg = 'linear-gradient(135deg, rgba(88, 28, 135, 0.25) 0%, rgba(3, 7, 18, 0.98) 100%)';
                                        sideBg = '#701a75';
                                        statusLabel = 'OCCUPIED';
                                        glowDot = 'bg-purple-400 shadow-md shadow-black/20';
                                      } else if (isReserved) {
                                        themeColor = 'rgba(245, 158, 11, 0.2)';
                                        themeBg = 'linear-gradient(135deg, rgba(120, 53, 15, 0.25) 0%, rgba(3, 7, 18, 0.98) 100%)';
                                        sideBg = '#b45309';
                                        statusLabel = 'RESERVED';
                                        glowDot = 'bg-amber-400 shadow-md shadow-black/20';
                                      }

                                      const handleTableClick = () => {
                                        if (isReserved && activeRes) {
                                          setConfirmDialog({
                                            isOpen: true,
                                            title: 'Table Reserved',
                                            message: (
                                              <span>
                                                Table <strong className="text-white font-mono">{table.table_number}</strong> is reserved for <strong className="text-white">{activeRes.customer_name}</strong> at <strong className="text-white">{new Date(activeRes.reservation_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>.
                                              </span>
                                            ),
                                            confirmText: 'OK',
                                            cancelText: null,
                                            onConfirm: () => { }
                                          });
                                        } else if (isOccupied) {
                                          setConfirmDialog({
                                            isOpen: true,
                                            title: 'Clear Table',
                                            message: (
                                              <span>
                                                Are you sure you want to mark Table <strong className="text-white font-mono">{table.table_number}</strong> as vacant?
                                              </span>
                                            ),
                                            confirmText: 'Yes, Mark Vacant',
                                            cancelText: 'Cancel',
                                            onConfirm: async () => {
                                              setLoading(true);
                                              try {
                                                await API.patch(`tables/${table.id}/`, {
                                                  status: 'VACANT',
                                                  current_guest: null
                                                });
                                                setSuccess(`Table ${table.table_number} is now vacant.`);
                                                fetchData();
                                              } catch (err: any) {
                                                setError('Failed to clear table: ' + err.message);
                                              } finally {
                                                setLoading(false);
                                              }
                                            }
                                          });
                                        } else {
                                          setReserveTableId(table.id.toString());
                                          setReserveCustomerName('');
                                          setReserveTime('');
                                          setIsReservingTable(true);
                                        }
                                      };

                                      return (
                                        <div
                                          key={table.id}
                                          onClick={handleTableClick}
                                          className="table-pod-3d"
                                        >
                                          <div className="table-depth-side" style={{ background: sideBg }} />
                                          <div className="table-front-face" style={{ background: themeBg, borderColor: themeColor }}>
                                            {/* Top Section */}
                                            <div className="flex justify-between items-start">
                                              <div>
                                                <span className="text-xl font-black tracking-tight text-white block">
                                                  Table {table.table_number}
                                                </span>
                                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5 block">
                                                  Capacity: {table.capacity} Pax
                                                </span>
                                              </div>
                                              <div className={`w-2 h-2 rounded-full mt-1.5 ${glowDot}`} />
                                            </div>

                                            {/* Middle section */}
                                            <div className="text-[10px] text-gray-400 py-1">
                                              {isOccupied ? (
                                                <span className="text-purple-300 font-medium truncate block">
                                                  Seated Dine-In Guest
                                                </span>
                                              ) : isReserved && activeRes ? (
                                                <div className="space-y-0.5">
                                                  <span className="text-amber-300 font-bold truncate block">
                                                    Reserved: {activeRes.customer_name}
                                                  </span>
                                                  <span className="text-[8px] text-gray-500 block">
                                                    {new Date(activeRes.reservation_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                  </span>
                                                </div>
                                              ) : (
                                                <span className="text-amber-400/70 block">
                                                  Ready for seating
                                                </span>
                                              )}
                                            </div>

                                            {/* Bottom Section */}
                                            <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                              <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${isOccupied
                                                  ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                                                  : isReserved
                                                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                                                    : 'bg-amber-600/15 border-amber-600/30 text-emerald-300'
                                                }`}>
                                                {statusLabel}
                                              </span>
                                              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                                                {isVacant ? 'Reserve' : isOccupied ? 'Clear' : 'Seat'}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Summary Badges */}
                              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
                                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600/10 border border-amber-600/20">
                                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-md shadow-black/20" />
                                  <span className="text-xl font-black text-emerald-300">{vacantTables}</span>
                                  <span className="text-[10px] font-bold text-amber-400/70 uppercase tracking-widest">Vacant</span>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                  <div className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-md shadow-black/20" />
                                  <span className="text-xl font-black text-purple-300">{occupiedTables}</span>
                                  <span className="text-[10px] font-bold text-purple-400/70 uppercase tracking-widest">Occupied</span>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-md shadow-black/20" />
                                  <span className="text-xl font-black text-amber-300">{reservedTables}</span>
                                  <span className="text-[10px] font-bold text-amber-400/70 uppercase tracking-widest">Reserved</span>
                                </div>
                              </div>
                            </div>

                            {/* Right Panel: Lobby Concierge & Lounge Dashboard */}
                            <div className="w-full xl:w-[280px] shrink-0 glass-panel border border-white/5 bg-indigo-500/[0.02] p-4.5 rounded-2xl flex flex-col justify-between overflow-y-auto min-h-[300px]">
                              <div>
                                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3.5 flex items-center gap-1.5 font-mono">
                                  <Users className="w-4 h-4" /> Lobby Concierge
                                </h3>

                                {/* Lounge Seating Progress Bar */}
                                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 mb-4">
                                  <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">
                                    <span>Lounge Occupancy</span>
                                    <span className="text-purple-400">7 / 12 Seats</span>
                                  </div>
                                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                    <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full animate-pulse" style={{ width: '58%' }}></div>
                                  </div>
                                  <span className="text-[9px] text-gray-600 block mt-1.5">
                                    *Waiting area for guest arrivals & checkout processing.
                                  </span>
                                </div>

                                {/* Lobby Services Quick Stats */}
                                <div className="space-y-2 mb-4">
                                  <div className="flex justify-between items-center bg-white/[0.01] border border-white/5 rounded-xl p-2.5 hover:bg-white/[0.03] transition">
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">💼</span>
                                      <div>
                                        <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider">Luggage Vault</span>
                                        <span className="text-[9px] text-gray-500 block">Active storage claims</span>
                                      </div>
                                    </div>
                                    <span className="text-xs font-mono font-black text-amber-400 bg-amber-600/10 px-2 py-0.5 rounded">4 Items</span>
                                  </div>

                                  <div className="flex justify-between items-center bg-white/[0.01] border border-white/5 rounded-xl p-2.5 hover:bg-white/[0.03] transition">
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">🔑</span>
                                      <div>
                                        <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider">Valet Vault</span>
                                        <span className="text-[9px] text-gray-500 block">Vehicles parked</span>
                                      </div>
                                    </div>
                                    <span className="text-xs font-mono font-black text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">3 Keys</span>
                                  </div>
                                </div>
                              </div>

                              {/* Dining Reservations Board */}
                              <div className="flex-1 flex flex-col min-h-0 border-t border-white/5 pt-3.5 mb-4">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2 font-mono">
                                  DINING BOARD
                                </span>
                                <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[140px] pr-1">
                                  {tableReservations.filter((tr: any) => tr.status === 'BOOKED').length === 0 ? (
                                    <div className="text-[10px] text-gray-600 italic py-2">No active dining reservations today.</div>
                                  ) : (
                                    tableReservations.filter((tr: any) => tr.status === 'BOOKED').map((tr: any) => {
                                      const tableMatch = tables.find(t => t.id === tr.table);
                                      return (
                                        <div key={tr.id} className="bg-white/[0.02] border border-white/5 rounded-lg p-2 flex justify-between items-center text-[10px] gap-2">
                                          <div className="min-w-0 flex-1">
                                            <span className="font-bold text-white block truncate">{tr.customer_name}</span>
                                            <span className="text-[9px] text-gray-500 block">Table {tableMatch?.table_number || tr.table} • {tr.pax || 2} Pax</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-mono text-amber-400/80">
                                              {new Date(tr.reservation_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <button
                                              onClick={() => handleCancelReservation(tr.id, tr.customer_name)}
                                              className="text-rose-400 hover:text-rose-300 font-bold px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 cursor-pointer text-[8px]"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>

                              {/* Quick Service Action Buttons */}
                              <div className="border-t border-white/5 pt-3.5 space-y-2">
                                <button onClick={() => { setSelectedRoomId(''); setGuestType('STAY_IN'); setIsRegistering(true); }}
                                  className="w-full py-2 bg-amber-600/10 hover:bg-amber-600/20 border border-amber-600/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider font-mono rounded-xl cursor-pointer transition shadow-md shadow-black/20"
                                >
                                  + Walk-in Check-in
                                </button>
                                <button onClick={() => { setReserveTableId(''); setIsReservingTable(true); }}
                                  className="w-full py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-black uppercase tracking-wider font-mono rounded-xl cursor-pointer transition"
                                >
                                  + Table Reservation
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    /* ── Floor Map View (3D Corridor Lobby) ── */
                    const floorRooms = rooms
                      .filter(r => getRoomFloor(r.room_number) === selectedFloor)
                      .sort((a, b) => a.room_number.localeCompare(b.room_number));
                    const vacant = floorRooms.filter(r => r.status === 'AVAILABLE').length;
                    const occupied = floorRooms.filter(r => r.status === 'OCCUPIED').length;
                    const maintenance = floorRooms.filter(r => r.status === 'MAINTENANCE').length;

                    // Filter rooms by roomFilter state
                    const filteredFloorRooms = floorRooms.filter(r => {
                      if (roomFilter === 'all') return true;
                      if (roomFilter === 'vacant') return r.status === 'AVAILABLE';
                      if (roomFilter === 'occupied') return r.status === 'OCCUPIED';
                      if (roomFilter === 'maintenance') return r.status === 'MAINTENANCE';
                      return true;
                    }).filter(r => {
                      if (!roomSearchQuery) return true;
                      const q = roomSearchQuery.toLowerCase();
                      if (r.room_number.toLowerCase().includes(q)) return true;
                      const match = bookings.find(b => b.room_number === r.room_number && (b.status === 'CHECKED_IN' || b.status === 'BOOKED'));
                      if (match && match.guest_name.toLowerCase().includes(q)) return true;
                      return false;
                    });

                    // Split rooms for the left and right walls of the corridor (paginated)
                    const totalPages = Math.ceil(filteredFloorRooms.length / 10);
                    const paginatedRooms = filteredFloorRooms.slice(roomPage * 10, (roomPage + 1) * 10);
                    const leftRooms = paginatedRooms.filter((_, idx) => idx % 2 === 0);
                    const rightRooms = paginatedRooms.filter((_, idx) => idx % 2 === 1);

                    return (
                      <div className={`flex-1 flex flex-col p-5 relative z-10 ${lobbyVisible ? 'lobby-view' : 'lobby-view-exit'}`}>
                        {/* Floor Map Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3">
                            <button onClick={handleBackToBuilding}
                              className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                              title="Back to building view"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <div>
                              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                Selected Floor: <span className="text-white">Level {selectedFloor}</span>
                              </h2>
                            </div>
                            {/* Mobile floor switcher */}
                            <div className="flex lg:hidden gap-1 ml-2">
                              {[...uniqueFloors].sort((a, b) => b - a).map(f => (
                                <button key={f} onClick={() => handleFloorClick(f)}
                                  className={`px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer ${selectedFloor === f
                                      ? 'bg-amber-600/20 text-emerald-300 border border-emerald-400/40'
                                      : 'bg-white/5 text-gray-500 border border-white/5 hover:text-amber-400'
                                    }`}
                                >L{f}</button>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {/* Search */}
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                              <input type="text" placeholder="Search rooms..."
                                value={roomSearchQuery}
                                onChange={e => setRoomSearchQuery(e.target.value)}
                                className="pl-8 pr-3 py-2 text-xs rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-600/40 focus:bg-white/[0.05] transition w-36"
                              />
                            </div>
                            <span className="text-xs font-mono text-gray-400">
                              <span className="text-amber-400 font-bold">{floorRooms.length}</span> / {rooms.length} Rooms
                            </span>
                          </div>
                        </div>

                        {/* Filter Pills */}
                        <div className="flex items-center gap-2 mb-4">
                          <Filter className="w-3.5 h-3.5 text-gray-500 mr-1" />
                          {([
                            { label: 'All', value: 'all' as const, count: floorRooms.length },
                            { label: 'Vacant', value: 'vacant' as const, count: vacant },
                            { label: 'Occupied', value: 'occupied' as const, count: occupied },
                            { label: 'Maintenance', value: 'maintenance' as const, count: maintenance },
                          ] as const).map(f => (
                            <button key={f.value} onClick={() => setRoomFilter(f.value)}
                              className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all duration-200 cursor-pointer border ${roomFilter === f.value
                                  ? f.value === 'occupied'
                                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/40 shadow-md shadow-black/20'
                                    : f.value === 'maintenance'
                                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-md shadow-black/20'
                                      : 'bg-amber-600/15 text-emerald-300 border-emerald-400/40 shadow-md shadow-black/20'
                                  : 'bg-white/[0.02] text-gray-500 border-white/5 hover:text-white hover:border-white/15'
                                }`}
                            >
                              {f.label} <span className="ml-1.5 opacity-60">{f.count}</span>
                            </button>
                          ))}
                        </div>

                        {/* 3D Hallway Lobby Corridor */}
                        <div className="flex-1 relative flex flex-col justify-center min-h-[500px]">
                          {filteredFloorRooms.length === 0 ? (
                            <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
                              No rooms match the current filter.
                            </div>
                          ) : (
                            <>
                              <div key={roomPage} className="lobby-corridor-container flex-grow overflow-y-auto page-turn-anim">
                                {/* Central receded floor path */}
                                <div className="corridor-floor">
                                  <div className="corridor-floor-lines" />
                                </div>

                                {/* Left Wall Rooms (Even indices) */}
                                <div className="corridor-wall-left">
                                  {leftRooms.map(room => {
                                    const isVacant = room.status === 'AVAILABLE';
                                    const isOccupied = room.status === 'OCCUPIED';
                                    const isMaint = room.status === 'MAINTENANCE';
                                    const isSelected = selectedRoomId === room.id.toString();
                                    const booking = bookings.find(b => b.room_number === room.room_number && (b.status === 'CHECKED_IN' || b.status === 'BOOKED'));

                                    const handleRoomClick = () => {
                                      if (isOccupied) {
                                        setActiveTab('active');
                                        setSuccess(booking ? `Room ${room.room_number} occupied by ${booking.guest_name}` : `Inspecting Room ${room.room_number}`);
                                      } else if (isMaint) {
                                        setConfirmDialog({
                                          isOpen: true,
                                          title: 'Complete Maintenance',
                                          message: (
                                            <span>
                                              Room <strong className="text-white font-mono">{room.room_number}</strong> is under maintenance. Mark it as Vacant/Available?
                                            </span>
                                          ),
                                          confirmText: 'Yes, Mark Vacant',
                                          cancelText: 'Cancel',
                                          onConfirm: () => handleCompleteMaintenance(room.id, room.room_number)
                                        });
                                      } else {
                                        setSelectedRoomId(room.id.toString());
                                        setGuestType(prev => prev === 'DINE_IN' ? 'BOTH' : 'STAY_IN');
                                        setSuccess(`Selected Room ${room.room_number} for check-in.`);
                                        setIsRegistering(true);
                                      }
                                    };

                                    // Style values based on status
                                    let themeColor = 'rgba(16, 185, 129, 0.2)';
                                    let themeBg = 'linear-gradient(135deg, rgba(6, 78, 59, 0.25) 0%, rgba(3, 7, 18, 0.98) 100%)';
                                    let sideBg = '#047857';
                                    let glowDot = 'bg-emerald-400 shadow-md shadow-black/20';
                                    let borderGlow = isSelected ? '0 0 20px rgba(16, 185, 129, 0.4)' : '';

                                    if (isOccupied) {
                                      themeColor = 'rgba(168, 85, 247, 0.2)';
                                      themeBg = 'linear-gradient(135deg, rgba(88, 28, 135, 0.25) 0%, rgba(3, 7, 18, 0.98) 100%)';
                                      sideBg = '#701a75';
                                      glowDot = 'bg-purple-400 shadow-md shadow-black/20';
                                      borderGlow = isSelected ? '0 0 20px rgba(16, 185, 129, 0.4)' : '';
                                    } else if (isMaint) {
                                      themeColor = 'rgba(245, 158, 11, 0.2)';
                                      themeBg = 'linear-gradient(135deg, rgba(120, 53, 15, 0.25) 0%, rgba(3, 7, 18, 0.98) 100%)';
                                      sideBg = '#b45309';
                                      glowDot = 'bg-amber-400 shadow-md shadow-black/20';
                                      borderGlow = isSelected ? '0 0 20px rgba(245, 158, 11, 0.4)' : '';
                                    }

                                    if (isSelected) {
                                      themeColor = isOccupied ? '#a855f7' : isMaint ? '#f59e0b' : '#10b981';
                                    }

                                    return (
                                      <div
                                        key={room.id}
                                        onClick={handleRoomClick}
                                        className="room-cabinet-3d"
                                      >
                                        {/* Extruded Depth Side */}
                                        <div
                                          className="room-cabinet-side"
                                          style={{ background: sideBg }}
                                        />

                                        {/* Front Face */}
                                        <div
                                          className="room-cabinet-front"
                                          style={{
                                            background: themeBg,
                                            borderColor: themeColor,
                                            borderWidth: isSelected ? '2px' : '1px',
                                            boxShadow: borderGlow || '0 8px 24px rgba(0,0,0,0.5)'
                                          }}
                                        >
                                          {/* Top Section */}
                                          <div className="flex justify-between items-start">
                                            <div>
                                              <span className="text-xl font-black tracking-tight text-white block">
                                                Room {room.room_number}
                                              </span>
                                              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5 block">
                                                {room.room_type}
                                              </span>
                                            </div>
                                            <span className="text-sm font-black text-indigo-400 font-mono">
                                              ₹{parseFloat(room.price_per_night).toFixed(0)}
                                            </span>
                                          </div>

                                          {/* Middle details (Guest/Pax) */}
                                          <div className="flex items-center gap-4 text-gray-400 text-[10px]">
                                            <span className="flex items-center gap-1">
                                              <Users className="w-3.5 h-3.5 text-gray-500" />
                                              <span>{room.capacity} Pax</span>
                                            </span>

                                            {isOccupied && booking && (
                                              <span className="text-purple-300 font-medium truncate max-w-[130px] flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                                                {booking.guest_name}
                                              </span>
                                            )}
                                          </div>

                                          {/* Bottom Section */}
                                          <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-white/5">
                                            <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${isOccupied
                                                ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                                                : isMaint
                                                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                                                  : 'bg-amber-600/15 border-amber-600/30 text-emerald-300'
                                              }`}>
                                              {isVacant ? 'VACANT' : isOccupied ? 'OCCUPIED' : 'MAINTENANCE'}
                                            </span>

                                            <div className="flex items-center gap-2">
                                              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider group-hover:text-white transition">
                                                {isVacant ? 'Book Stay' : isOccupied ? 'Checkout' : 'Mark Vacant'}
                                              </span>
                                              <div className={`w-2 h-2 rounded-full ${glowDot}`} />
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Right Wall Rooms (Odd indices) */}
                                <div className="corridor-wall-right">
                                  {rightRooms.map(room => {
                                    const isVacant = room.status === 'AVAILABLE';
                                    const isOccupied = room.status === 'OCCUPIED';
                                    const isMaint = room.status === 'MAINTENANCE';
                                    const isSelected = selectedRoomId === room.id.toString();
                                    const booking = bookings.find(b => b.room_number === room.room_number && (b.status === 'CHECKED_IN' || b.status === 'BOOKED'));

                                    const handleRoomClick = () => {
                                      if (isOccupied) {
                                        setActiveTab('active');
                                        setSuccess(booking ? `Room ${room.room_number} occupied by ${booking.guest_name}` : `Inspecting Room ${room.room_number}`);
                                      } else if (isMaint) {
                                        setConfirmDialog({
                                          isOpen: true,
                                          title: 'Complete Maintenance',
                                          message: (
                                            <span>
                                              Room <strong className="text-white font-mono">{room.room_number}</strong> is under maintenance. Mark it as Vacant/Available?
                                            </span>
                                          ),
                                          confirmText: 'Yes, Mark Vacant',
                                          cancelText: 'Cancel',
                                          onConfirm: () => handleCompleteMaintenance(room.id, room.room_number)
                                        });
                                      } else {
                                        setSelectedRoomId(room.id.toString());
                                        setGuestType(prev => prev === 'DINE_IN' ? 'BOTH' : 'STAY_IN');
                                        setSuccess(`Selected Room ${room.room_number} for check-in.`);
                                        setIsRegistering(true);
                                      }
                                    };

                                    // Style values based on status
                                    let themeColor = 'rgba(16, 185, 129, 0.2)';
                                    let themeBg = 'linear-gradient(135deg, rgba(6, 78, 59, 0.25) 0%, rgba(3, 7, 18, 0.98) 100%)';
                                    let sideBg = '#047857';
                                    let glowDot = 'bg-emerald-400 shadow-md shadow-black/20';
                                    let borderGlow = isSelected ? '0 0 20px rgba(16, 185, 129, 0.4)' : '';

                                    if (isOccupied) {
                                      themeColor = 'rgba(168, 85, 247, 0.2)';
                                      themeBg = 'linear-gradient(135deg, rgba(88, 28, 135, 0.25) 0%, rgba(3, 7, 18, 0.98) 100%)';
                                      sideBg = '#701a75';
                                      glowDot = 'bg-purple-400 shadow-md shadow-black/20';
                                      borderGlow = isSelected ? '0 0 20px rgba(16, 185, 129, 0.4)' : '';
                                    } else if (isMaint) {
                                      themeColor = 'rgba(245, 158, 11, 0.2)';
                                      themeBg = 'linear-gradient(135deg, rgba(120, 53, 15, 0.25) 0%, rgba(3, 7, 18, 0.98) 100%)';
                                      sideBg = '#b45309';
                                      glowDot = 'bg-amber-400 shadow-md shadow-black/20';
                                      borderGlow = isSelected ? '0 0 20px rgba(245, 158, 11, 0.4)' : '';
                                    }

                                    if (isSelected) {
                                      themeColor = isOccupied ? '#a855f7' : isMaint ? '#f59e0b' : '#10b981';
                                    }

                                    return (
                                      <div
                                        key={room.id}
                                        onClick={handleRoomClick}
                                        className="room-cabinet-3d"
                                      >
                                        {/* Extruded Depth Side */}
                                        <div
                                          className="room-cabinet-side"
                                          style={{ background: sideBg }}
                                        />

                                        {/* Front Face */}
                                        <div
                                          className="room-cabinet-front"
                                          style={{
                                            background: themeBg,
                                            borderColor: themeColor,
                                            borderWidth: isSelected ? '2px' : '1px',
                                            boxShadow: borderGlow || '0 8px 24px rgba(0,0,0,0.5)'
                                          }}
                                        >
                                          {/* Top Section */}
                                          <div className="flex justify-between items-start">
                                            <div>
                                              <span className="text-xl font-black tracking-tight text-white block">
                                                Room {room.room_number}
                                              </span>
                                              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5 block">
                                                {room.room_type}
                                              </span>
                                            </div>
                                            <span className="text-sm font-black text-indigo-400 font-mono">
                                              ₹{parseFloat(room.price_per_night).toFixed(0)}
                                            </span>
                                          </div>

                                          {/* Middle details (Guest/Pax) */}
                                          <div className="flex items-center gap-4 text-gray-400 text-[10px]">
                                            <span className="flex items-center gap-1">
                                              <Users className="w-3.5 h-3.5 text-gray-500" />
                                              <span>{room.capacity} Pax</span>
                                            </span>

                                            {isOccupied && booking && (
                                              <span className="text-purple-300 font-medium truncate max-w-[130px] flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                                                {booking.guest_name}
                                              </span>
                                            )}
                                          </div>

                                          {/* Bottom Section */}
                                          <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-white/5">
                                            <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${isOccupied
                                                ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                                                : isMaint
                                                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                                                  : 'bg-amber-600/15 border-amber-600/30 text-emerald-300'
                                              }`}>
                                              {isVacant ? 'VACANT' : isOccupied ? 'OCCUPIED' : 'MAINTENANCE'}
                                            </span>

                                            <div className="flex items-center gap-2">
                                              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider group-hover:text-white transition">
                                                {isVacant ? 'Book Stay' : isOccupied ? 'Checkout' : 'Mark Vacant'}
                                              </span>
                                              <div className={`w-2 h-2 rounded-full ${glowDot}`} />
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Paging controls overlay */}
                              {totalPages > 1 && (
                                <>
                                  {roomPage > 0 && (
                                    <button
                                      onClick={() => setRoomPage(prev => prev - 1)}
                                      className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-slate-950/90 border border-white/10 hover:border-indigo-500 text-gray-400 hover:text-white rounded-full transition cursor-pointer z-30 shadow-2xl hover:scale-110 flex items-center justify-center"
                                      title="Previous Page"
                                    >
                                      <ChevronLeft className="w-5 h-5" />
                                    </button>
                                  )}
                                  {roomPage < totalPages - 1 && (
                                    <button
                                      onClick={() => setRoomPage(prev => prev + 1)}
                                      className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-slate-950/90 border border-white/10 hover:border-indigo-500 text-gray-400 hover:text-white rounded-full transition cursor-pointer z-30 shadow-2xl hover:scale-110 flex items-center justify-center"
                                      title="Next Page"
                                    >
                                      <ChevronRight className="w-5 h-5" />
                                    </button>
                                  )}

                                  {/* Page Number indicator */}
                                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-950/80 border border-white/5 rounded-full text-[10px] font-black tracking-widest text-indigo-400 uppercase font-mono z-30 shadow-md">
                                    Page {roomPage + 1} of {totalPages}
                                  </div>
                                </>
                              )}
                            </>
                          )}
                        </div>

                        {/* Summary Badges */}
                        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
                          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600/10 border border-amber-600/20">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-md shadow-black/20" />
                            <span className="text-xl font-black text-emerald-300">{vacant}</span>
                            <span className="text-[10px] font-bold text-amber-400/70 uppercase tracking-widest">Vacant</span>
                          </div>
                          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                            <div className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-md shadow-black/20" />
                            <span className="text-xl font-black text-purple-300">{occupied}</span>
                            <span className="text-[10px] font-bold text-purple-400/70 uppercase tracking-widest">Occupied</span>
                          </div>
                          {maintenance > 0 && (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-md shadow-black/20" />
                              <span className="text-xl font-black text-amber-300">{maintenance}</span>
                              <span className="text-[10px] font-bold text-amber-400/70 uppercase tracking-widest">Maint.</span>
                            </div>
                          )}
                          <div className="flex-1" />
                          <div className="hidden md:flex items-center gap-4 text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-600/30 border border-amber-600/40" /> Vacant</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-500/30 border border-purple-500/40" /> Occupied</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/40" /> Maintenance</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Tip text */}
              <div className="px-5 py-3 border-t border-white/5 text-[10px] text-gray-500 font-medium">
                {selectedFloor === 0
                  ? '💡 Click any Vacant restaurant table to reserve it. Click Occupied tables to mark them vacant.'
                  : selectedFloor !== null
                    ? '💡 Click any Vacant room to register a guest. Occupied rooms navigate to Active Stays.'
                    : '💡 Click any floor on the building or use floor selector buttons to view room statuses.'
                }
              </div>
            </div>

            {/* 4 Premium metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <div className="glass-panel p-4.5 rounded-2xl border border-white/5 bg-indigo-500/5 shadow-md shadow-black/20 flex flex-col justify-between min-h-[90px]">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block font-mono">Available Rooms</span>
                <span className="text-2xl font-black text-white font-mono mt-2">
                  {rooms.filter(r => r.status === 'AVAILABLE').length} <span className="text-xs text-gray-500 font-bold">/ {rooms.length}</span>
                </span>
              </div>
              <div className="glass-panel p-4.5 rounded-2xl border border-white/5 bg-rose-500/5 shadow-md shadow-black/20 flex flex-col justify-between min-h-[90px]">
                <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest block font-mono">Occupied Rooms</span>
                <span className="text-2xl font-black text-white font-mono mt-2">
                  {rooms.filter(r => r.status === 'OCCUPIED').length}
                </span>
              </div>
              <div className="glass-panel p-4.5 rounded-2xl border border-white/5 bg-amber-500/5 shadow-md shadow-black/20 flex flex-col justify-between min-h-[90px]">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block font-mono">Maintenance</span>
                <span className="text-2xl font-black text-white font-mono mt-2">
                  {rooms.filter(r => r.status === 'MAINTENANCE').length}
                </span>
              </div>
              <div className="glass-panel p-4.5 rounded-2xl border border-white/5 bg-amber-600/5 shadow-md shadow-black/20 flex flex-col justify-between min-h-[90px]">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block font-mono">Vacant Tables</span>
                <span className="text-2xl font-black text-white font-mono mt-2">
                  {tables.filter(t => t.status === 'VACANT').length} <span className="text-xs text-gray-500 font-bold">/ {tables.length}</span>
                </span>
              </div>
            </div>

          </div>
        )}

        {/* Active Bookings & Stays Tab */}
        {activeTab === 'active' && (
          <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
            <div className="p-6 border-b border-white/5">
              <h3 className="text-lg font-bold text-white">Active Bookings & Guest Stays</h3>
            </div>
            <div className="overflow-x-auto text-xs sm:text-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/40 text-gray-400 border-b border-white/5">
                    <th className="p-4 font-semibold uppercase tracking-wider text-xs">Guest Name</th>
                    <th className="p-4 font-semibold uppercase tracking-wider text-xs">Room Number</th>
                    <th className="p-4 font-semibold uppercase tracking-wider text-xs">Check-In</th>
                    <th className="p-4 font-semibold uppercase tracking-wider text-xs">Scheduled Check-Out</th>
                    <th className="p-4 font-semibold uppercase tracking-wider text-xs">Status</th>
                    <th className="p-4 font-semibold uppercase tracking-wider text-xs">Total Stay Budget</th>
                    <th className="p-4 font-semibold uppercase tracking-wider text-xs text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.filter(b => b.status === 'CHECKED_IN' || b.status === 'BOOKED').map(booking => (
                    <tr key={booking.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="p-4 font-medium text-white">{booking.guest_name}</td>
                      <td className="p-4 font-bold text-indigo-400">Room {booking.room_number}</td>
                      <td className="p-4 text-gray-400">{booking.check_in_date}</td>
                      <td className="p-4 text-gray-400">{booking.check_out_date}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${booking.status === 'CHECKED_IN' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                          }`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-white">₹{parseFloat(booking.total_price).toFixed(2)}</td>
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        {booking.status === 'BOOKED' && (
                          <button
                            onClick={() => handleCheckInBooking(booking.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            Check In
                          </button>
                        )}
                        <button
                          onClick={() => handleCancelBooking(booking.id, booking.guest_name, booking.room_number)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          Cancel / Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {bookings.filter(b => b.status === 'CHECKED_IN' || b.status === 'BOOKED').length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-500">
                        No active bookings found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Calendar Occupancy Tab */}
        {activeTab === 'calendar' && (() => {
          const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
          ];

          const getDaysInMonth = (year: number, month: number) => {
            return new Date(year, month + 1, 0).getDate();
          };

          const getMonthDates = (year: number, month: number) => {
            const daysCount = getDaysInMonth(year, month);
            const dates = [];
            for (let i = 1; i <= daysCount; i++) {
              dates.push(new Date(year, month, i));
            }
            return dates;
          };

          const formatDateString = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          };

          const getRoomStatusOnDate = (room: Room, dateStr: string) => {
            const todayStr = getCurrentDateString();

            // 1. Check for active stays / bookings
            const bookingMatch = bookings.find(b =>
              b.room_number === room.room_number &&
              (b.status === 'CHECKED_IN' || b.status === 'BOOKED') &&
              b.check_in_date <= dateStr &&
              dateStr < b.check_out_date
            );

            if (bookingMatch) {
              return { type: 'BOOKING', data: bookingMatch };
            }

            // Check if it's the check-out day (the day they vacate the room)
            const checkOutMatch = bookings.find(b =>
              b.room_number === room.room_number &&
              (b.status === 'CHECKED_IN' || b.status === 'BOOKED') &&
              b.check_out_date === dateStr
            );

            if (checkOutMatch) {
              return { type: 'CHECKOUT', data: checkOutMatch };
            }

            // 2. Check for maintenance status
            if (room.status === 'MAINTENANCE' && dateStr >= todayStr) {
              return { type: 'MAINTENANCE', data: null };
            }

            return { type: 'VACANT', data: null };
          };

          const getNextDayString = (dateStr: string) => {
            const d = new Date(dateStr);
            d.setDate(d.getDate() + 1);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
          };

          const handlePrevMonth = () => {
            if (calendarMonth === 0) {
              setCalendarMonth(11);
              setCalendarYear(prev => prev - 1);
            } else {
              setCalendarMonth(prev => prev - 1);
            }
          };

          const handleNextMonth = () => {
            if (calendarMonth === 11) {
              setCalendarMonth(0);
              setCalendarYear(prev => prev + 1);
            } else {
              setCalendarMonth(prev => prev + 1);
            }
          };

          const occupancyDates = getMonthDates(calendarYear, calendarMonth);

          const filteredRooms = rooms.filter(room => {
            // 1. Search Query filter (matches room number or room type)
            if (calendarSearchQuery) {
              const query = calendarSearchQuery.toLowerCase();
              const matchesNumber = room.room_number.toLowerCase().includes(query);
              const matchesType = room.room_type.toLowerCase().includes(query);
              if (!matchesNumber && !matchesType) return false;
            }

            // 2. Status Filter
            if (calendarStatusFilter !== 'all') {
              if (calendarStatusFilter === 'vacant') {
                return room.status === 'AVAILABLE';
              }
              if (calendarStatusFilter === 'occupied') {
                return room.status === 'OCCUPIED';
              }
              if (calendarStatusFilter === 'maintenance') {
                return room.status === 'MAINTENANCE';
              }
              if (calendarStatusFilter === 'booked') {
                const startOfMonthStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-01`;
                const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
                const endOfMonthStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

                return bookings.some(b =>
                  b.room_number === room.room_number &&
                  (b.status === 'BOOKED' || b.status === 'CHECKED_IN') &&
                  b.check_in_date <= endOfMonthStr &&
                  b.check_out_date >= startOfMonthStr
                );
              }
            }

            return true;
          });

          return (
            <div className="glass-panel p-6 rounded-2xl overflow-hidden border border-white/5">

              {/* Header controls for Month & Year */}
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 border-b border-white/5 pb-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-400" />
                    Monthly Room Occupancy Calendar
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Live grid showing guest reservations, check-ins, and maintenance for the entire month.</p>
                </div>

                {/* Navigation Controls */}
                <div className="flex flex-wrap items-center gap-2 self-start xl:self-center">
                  <button
                    onClick={handlePrevMonth}
                    className="p-2.5 bg-slate-900 border border-white/5 text-gray-400 hover:text-white rounded-xl cursor-pointer hover:bg-slate-800 transition duration-150 flex items-center justify-center"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <select
                    value={calendarMonth}
                    onChange={(e) => setCalendarMonth(parseInt(e.target.value))}
                    className="p-2 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 rounded-xl outline-none transition cursor-pointer text-xs font-bold uppercase tracking-wider"
                  >
                    {monthNames.map((name, idx) => (
                      <option key={idx} value={idx}>{name}</option>
                    ))}
                  </select>

                  <select
                    value={calendarYear}
                    onChange={(e) => setCalendarYear(parseInt(e.target.value))}
                    className="p-2 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 rounded-xl outline-none transition cursor-pointer text-xs font-bold font-mono"
                  >
                    {[2025, 2026, 2027, 2028].map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>

                  <button
                    onClick={handleNextMonth}
                    className="p-2.5 bg-slate-900 border border-white/5 text-gray-400 hover:text-white rounded-xl cursor-pointer hover:bg-slate-800 transition duration-150 flex items-center justify-center"
                    title="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setCalendarMonth(new Date().getMonth());
                      setCalendarYear(new Date().getFullYear());
                    }}
                    className="px-3.5 py-2 bg-slate-700 border border-amber-500/30/10 hover:bg-slate-700 border border-amber-500/30 border border-indigo-500/20 text-indigo-300 hover:text-white rounded-xl text-xs font-bold tracking-wider uppercase transition cursor-pointer"
                  >
                    Today
                  </button>
                </div>

                {/* Legends */}
                <div className="flex flex-wrap gap-2">
                  <span className="flex items-center gap-1 text-[9px] text-amber-400 bg-amber-600/10 px-2 py-1.5 rounded-lg border border-amber-600/20 font-bold uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-600"></span> Vacant
                  </span>
                  <span className="flex items-center gap-1 text-[9px] text-indigo-400 bg-indigo-500/10 px-2 py-1.5 rounded-lg border border-indigo-500/20 font-bold uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span> Reserved
                  </span>
                  <span className="flex items-center gap-1 text-[9px] text-rose-400 bg-rose-500/10 px-2 py-1.5 rounded-lg border border-rose-500/20 font-bold uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span> Checked In
                  </span>
                  <span className="flex items-center gap-1 text-[9px] text-yellow-400 bg-yellow-500/10 px-2 py-1.5 rounded-lg border border-yellow-500/20 font-bold uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-yellow-500"></span> Maint
                  </span>
                </div>
              </div>

              {/* Dedicated Search and Status Filters Bar */}
              <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-5 bg-[#050711]/40 border border-white/5 p-4 rounded-xl">
                {/* Search input with search icon */}
                <div className="relative flex-grow max-w-md">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="Quick search room (e.g. 101, Single, Deluxe)..."
                    value={calendarSearchQuery}
                    onChange={(e) => setCalendarSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 rounded-xl outline-none text-xs font-semibold placeholder:text-gray-500 transition"
                  />
                  {calendarSearchQuery && (
                    <button
                      onClick={() => setCalendarSearchQuery('')}
                      className="absolute right-3.5 top-3.5 text-gray-400 hover:text-white text-xs cursor-pointer font-bold uppercase tracking-wider text-[10px]"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Status Selector dropdown */}
                <div className="flex items-center gap-2.5 border-t border-white/5 pt-3 md:pt-0 md:border-t-0">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Filter Status:</span>
                  <select
                    value={calendarStatusFilter}
                    onChange={(e) => setCalendarStatusFilter(e.target.value as any)}
                    className="p-2.5 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 rounded-xl outline-none transition cursor-pointer text-xs font-bold uppercase tracking-wider"
                  >
                    <option value="all">All Rooms</option>
                    <option value="vacant">Vacant Today</option>
                    <option value="occupied">Occupied Today</option>
                    <option value="maintenance">Maintenance Today</option>
                    <option value="booked">Has Bookings in Selected Month</option>
                  </select>
                </div>
              </div>

              {/* Scrollable Month Grid */}
              <div className="overflow-x-auto border border-white/5 rounded-2xl max-h-[calc(100vh-320px)] h-[560px] min-h-[350px] overflow-y-auto custom-scrollbar relative">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="border-b border-white/5">
                      {/* Sticky Room info column header: sticky left AND top */}
                      <th className="p-3 border-r border-b border-white/10 font-bold text-gray-300 text-xs w-40 min-w-[160px] sticky top-0 left-0 bg-[#060811] z-30 shadow-[4px_4px_8px_rgba(0,0,0,0.5)]">
                        Room Info
                      </th>
                      {occupancyDates.map((date) => {
                        const dateStr = formatDateString(date);
                        const isTodayVal = dateStr === getCurrentDateString();
                        return (
                          <th
                            key={dateStr}
                            className={`p-2 border-r border-b border-white/10 text-center font-bold text-xs min-w-[56px] w-14 sticky top-0 bg-[#060811] z-20 shadow-[0_2px_4px_rgba(0,0,0,0.4)] ${isTodayVal ? 'bg-indigo-950/40' : ''
                              }`}
                          >
                            <div className="text-indigo-400 uppercase tracking-widest text-[8px]">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                            <div className={`text-xs font-black mt-0.5 inline-block w-6 h-6 leading-6 rounded-full ${isTodayVal ? 'bg-slate-700 border border-amber-500/30 text-white' : 'text-white'
                              }`}>
                              {date.getDate()}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRooms.map(room => (
                      <tr key={room.id} className="hover:bg-white/[0.01]">
                        {/* Sticky Room name cell with real-time status light dot */}
                        <td className="p-3 border-r border-b border-white/5 font-semibold text-white bg-[#060811]/90 sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${room.status === 'AVAILABLE' ? 'bg-amber-600 animate-pulse' :
                                room.status === 'OCCUPIED' ? 'bg-rose-500 animate-pulse' :
                                  'bg-yellow-500 animate-pulse'
                              }`} title={`Current status: ${room.status.toLowerCase()}`}></span>
                            <span className="font-extrabold text-[13px] text-white">Room {room.room_number}</span>
                          </div>
                          <div className="text-[9px] text-gray-400 font-medium capitalize mt-1.5 pl-4">
                            {room.room_type.toLowerCase()} • {room.capacity} Pax
                          </div>
                        </td>

                        {/* Date Cells */}
                        {occupancyDates.map(date => {
                          const dateStr = formatDateString(date);
                          const cellStatus = getRoomStatusOnDate(room, dateStr);
                          const isTodayVal = dateStr === getCurrentDateString();

                          return (
                            <td
                              key={dateStr}
                              className={`p-1 border-r border-b border-white/5 text-center text-xs h-14 min-w-[56px] w-14 ${isTodayVal ? 'bg-indigo-500/5' : ''
                                }`}
                            >
                              {(() => {
                                if (cellStatus.type === 'BOOKING') {
                                  const b = cellStatus.data as Booking;
                                  const isCheckedIn = b.status === 'CHECKED_IN';
                                  return (
                                    <div
                                      className={`h-full w-full rounded-xl flex flex-col justify-center items-center select-none text-center relative group/cell transition ${isCheckedIn
                                          ? 'bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300'
                                          : 'bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300'
                                        }`}
                                    >
                                      <span className="font-extrabold text-[9px] uppercase tracking-wider truncate max-w-[48px] px-0.5">
                                        {b.guest_name.split(' ')[0]}
                                      </span>
                                      <span className="text-[7px] font-black uppercase tracking-widest mt-0.5 opacity-80">
                                        {isCheckedIn ? 'IN' : 'RES'}
                                      </span>

                                      {/* Tooltip on Hover */}
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-52 bg-[#050711] border border-white/10 text-white rounded-2xl p-3 text-left shadow-2xl hidden group-hover/cell:block z-30 pointer-events-none">
                                        <p className="font-extrabold text-xs text-white border-b border-white/5 pb-1 mb-1.5 flex items-center gap-1.5">
                                          <span className={`h-2 w-2 rounded-full ${isCheckedIn ? 'bg-rose-500 animate-pulse' : 'bg-indigo-500 animate-pulse'}`}></span>
                                          {b.guest_name}
                                        </p>
                                        <p className="text-[10px] text-gray-400">Status: <span className={`font-bold ${isCheckedIn ? 'text-rose-400' : 'text-indigo-400'}`}>{b.status === 'CHECKED_IN' ? 'Checked In' : 'Reserved'}</span></p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">Stay: <span className="font-semibold text-gray-200">{b.check_in_date} to {b.check_out_date}</span></p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">Total price: <span className="font-extrabold text-indigo-400">₹{parseFloat(b.total_price).toFixed(0)}</span></p>
                                      </div>
                                    </div>
                                  );
                                } else if (cellStatus.type === 'CHECKOUT') {
                                  const b = cellStatus.data as Booking;
                                  return (
                                    <div
                                      onClick={() => {
                                        setSelectedRoomId(room.id.toString());
                                        setCheckInDate(dateStr);
                                        setCheckOutDate(getNextDayString(dateStr));
                                        setImmediateCheckIn(dateStr === getCurrentDateString());
                                        setGuestType('STAY_IN');
                                        setIsRegistering(true);
                                      }}
                                      className="h-full w-full bg-amber-600/5 hover:bg-amber-600/10 border border-dashed border-amber-600/20 hover:border-amber-600/40 text-amber-400 rounded-xl flex flex-col justify-center items-center cursor-pointer select-none text-center relative group/cell transition"
                                    >
                                      <span className="font-extrabold text-[8px] uppercase tracking-widest text-amber-400">OUT</span>
                                      <span className="text-[7px] text-gray-500 font-bold uppercase tracking-wider truncate max-w-[48px] mt-0.5">
                                        {b.guest_name.split(' ')[0]}
                                      </span>

                                      {/* Tooltip on Hover */}
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-52 bg-[#050711] border border-white/10 text-white rounded-2xl p-3 text-left shadow-2xl hidden group-hover/cell:block z-30 pointer-events-none">
                                        <p className="font-extrabold text-xs text-white border-b border-white/5 pb-1 mb-1.5">Check-Out Day</p>
                                        <p className="text-[10px] text-gray-400">Guest: <span className="font-semibold text-gray-200">{b.guest_name}</span></p>
                                        <p className="text-[10px] text-gray-400 mt-1">Room will be vacated today. Click cell to book next guest check-in.</p>
                                      </div>
                                    </div>
                                  );
                                } else if (cellStatus.type === 'MAINTENANCE') {
                                  return (
                                    <div
                                      className="h-full w-full bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 rounded-xl flex flex-col justify-center items-center select-none text-center relative group/cell transition"
                                    >
                                      <span className="font-black text-[9px] uppercase tracking-widest">CLEAN</span>
                                      <span className="text-[7px] text-yellow-500/80 font-bold uppercase tracking-wider mt-0.5">MAINT</span>

                                      {/* Tooltip on Hover */}
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-[#050711] border border-white/10 text-white rounded-2xl p-3 text-left shadow-2xl hidden group-hover/cell:block z-30 pointer-events-none">
                                        <p className="font-extrabold text-xs text-yellow-400 border-b border-white/5 pb-1 mb-1.5">Maintenance</p>
                                        <p className="text-[10px] text-gray-400">Room is undergoing cleanup. Go to Room Cleaning to set vacant.</p>
                                      </div>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div
                                      onClick={() => {
                                        setSelectedRoomId(room.id.toString());
                                        setCheckInDate(dateStr);
                                        setCheckOutDate(getNextDayString(dateStr));
                                        setImmediateCheckIn(dateStr === getCurrentDateString());
                                        setGuestType('STAY_IN');
                                        setIsRegistering(true);
                                      }}
                                      className="h-full w-full bg-amber-600/[0.02] border border-dashed border-white/[0.04] hover:bg-amber-600/5 hover:border-amber-600/20 rounded-xl flex items-center justify-center cursor-pointer text-gray-600 hover:text-amber-400 transition group/cell relative"
                                    >
                                      <span className="text-xs font-bold opacity-0 group-hover/cell:opacity-100 transition">+</span>

                                      {/* Tooltip on Hover */}
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-44 bg-[#050711] border border-white/10 text-white rounded-2xl p-2.5 text-center shadow-2xl hidden group-hover/cell:block z-30 pointer-events-none">
                                        <p className="font-bold text-[10px] text-amber-400 uppercase tracking-widest">Vacant</p>
                                        <p className="text-[9px] text-gray-400 mt-1">Click to reserve Room {room.room_number} starting {dateStr}</p>
                                      </div>
                                    </div>
                                  );
                                }
                              })()}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {filteredRooms.length === 0 && (
                      <tr>
                        <td colSpan={occupancyDates.length + 1} className="text-center py-12 text-gray-500 font-bold bg-[#060811]/30">
                          No rooms match the selected search or filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* Billing & Checkout Tab */}
        {activeTab === 'billing' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:grid-cols-1 print:gap-0">

            {/* Guest Selector */}
            <div className="glass-panel p-6 rounded-2xl space-y-4 self-start print:hidden">
              <h3 className="text-lg font-bold text-white">Generate Invoice</h3>
              <div className="text-sm">
                <label className="block font-medium text-gray-300 mb-1">Select Checked-In Guest</label>
                <select
                  value={selectedBillingGuestId}
                  onChange={e => setSelectedBillingGuestId(e.target.value)}
                  className="w-full p-3 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 rounded-lg outline-none transition cursor-pointer"
                >
                  <option value="">Select Guest</option>
                  {guests.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name || g.username} ({g.email})
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleGenerateBill}
                disabled={!selectedBillingGuestId || loading}
                className="w-full py-3.5 glowing-btn-indigo text-white font-bold rounded-xl transition duration-200 disabled:opacity-50 flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer shadow-lg"
              >
                <CreditCard className="w-4 h-4" />
                Generate Statement
              </button>
            </div>

            {/* Bill Statement */}
            <div className="lg:col-span-2 glass-panel rounded-2xl p-6 space-y-6 border border-white/5 print:col-span-full print:border-none print:shadow-none print:p-0">
              {currentInvoice ? (
                <div className="space-y-6">
                  <div className="border-b border-white/5 pb-4 flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-bold text-white">Invoice Statement</h3>
                      <p className="text-xs text-gray-400 mt-1">Invoice #{currentInvoice.id} • Dynamic Guest Type: {currentInvoice.guest_type_at_billing}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider border ${currentInvoice.payment_status === 'PAID' ? 'bg-amber-600/10 border-amber-600/20 text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                      }`}>
                      {currentInvoice.payment_status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm">
                    <div>
                      <p className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Billed To</p>
                      <p className="font-bold text-white text-base mt-1">{currentInvoice.guest_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Billing Date</p>
                      <p className="font-bold text-white text-base mt-1">{new Date().toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="border border-white/5 rounded-xl overflow-hidden text-xs sm:text-sm">
                    <div className="bg-slate-950/40 p-3 grid grid-cols-3 font-bold text-gray-300 border-b border-white/5">
                      <div>Charge Item</div>
                      <div className="text-center">Details / Subtotal</div>
                      <div className="text-right">Amount</div>
                    </div>

                    <div className="p-3 grid grid-cols-3 border-b border-white/5 text-gray-400">
                      <div className="font-semibold text-white">Room Lodging</div>
                      <div className="text-center">Stay nights charges</div>
                      <div className="text-right font-bold text-white">${parseFloat(currentInvoice.room_charges).toFixed(2)}</div>
                    </div>

                    <div className="p-3 grid grid-cols-3 border-b border-white/5 text-gray-400">
                      <div className="font-semibold text-white">Food & Restaurant</div>
                      <div className="text-center">Active dining orders</div>
                      <div className="text-right font-bold text-white">${parseFloat(currentInvoice.food_charges).toFixed(2)}</div>
                    </div>

                    <div className="p-3 grid grid-cols-3 border-b border-white/5 text-gray-400 bg-slate-900/10">
                      <div className="font-semibold text-white">Taxes</div>
                      <div className="text-center">10% tax rate</div>
                      <div className="text-right font-bold text-white">${parseFloat(currentInvoice.tax_amount).toFixed(2)}</div>
                    </div>

                    <div className="p-4 grid grid-cols-3 font-bold text-white text-lg bg-indigo-500/5">
                      <div className="text-base tracking-tight">Total Price</div>
                      <div></div>
                      <div className="text-right text-indigo-400 font-black">${parseFloat(currentInvoice.total_amount).toFixed(2)}</div>
                    </div>
                  </div>

                  <button
                    onClick={handlePayBill}
                    disabled={loading}
                    className="w-full py-4 glowing-btn-emerald text-white font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 text-base print:hidden cursor-pointer shadow-lg uppercase tracking-wider"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Process Payment & Checkout
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="w-full mt-2 py-2.5 bg-slate-900 border border-white/5 text-gray-300 hover:text-white hover:bg-slate-800 font-bold rounded-xl transition flex items-center justify-center gap-2 print:hidden cursor-pointer text-xs uppercase tracking-wider"
                  >
                    <Download className="w-4 h-4" />
                    Print / Download Invoice PDF
                  </button>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-gray-500 text-center">
                  <CreditCard className="w-12 h-12 mb-3 text-slate-700 stroke-1 animate-pulse" />
                  <p className="font-bold text-white">No Statement Generated</p>
                  <p className="text-xs mt-1">Select a guest and generate a statement to see invoice items.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reserve Table Modal Popup */}
      {isReservingTable && createPortal(
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden animate-fade-in"
          onClick={() => {
            setIsReservingTable(false);
            setReserveCustomerName('');
            setReserveTableId('');
            setReserveTime('');
            setIsExistingGuestReservation(false);
            setSelectedReserveGuestId('');
          }}
        >
          <div
            className="bg-[#050712] border border-white/10 w-full max-w-md rounded-3xl p-6 shadow-2xl relative flex flex-col overflow-hidden max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono">
                  Reserve Restaurant Table
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsReservingTable(false);
                  setReserveCustomerName('');
                  setReserveTableId('');
                  setReserveTime('');
                  setIsExistingGuestReservation(false);
                  setSelectedReserveGuestId('');
                }}
                className="px-3 py-1.5 bg-slate-900 border border-white/5 text-gray-400 hover:text-white rounded-xl text-xs font-bold cursor-pointer transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateReservation} className="space-y-4 text-xs sm:text-sm">
              {/* Reservation Type Segment Picker */}
              <div className="flex gap-2 p-1 bg-slate-950/60 border border-white/5 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsExistingGuestReservation(false);
                    setReserveCustomerName('');
                    setSelectedReserveGuestId('');
                  }}
                  className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition duration-200 cursor-pointer ${!isExistingGuestReservation ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                    }`}
                >
                  New Dine-in Guest
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsExistingGuestReservation(true);
                    setReserveCustomerName('');
                    setSelectedReserveGuestId('');
                  }}
                  className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition duration-200 cursor-pointer ${isExistingGuestReservation ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                    }`}
                >
                  Hotel Checked-In Guest
                </button>
              </div>

              {isExistingGuestReservation ? (
                <div>
                  <label className="block font-medium text-gray-300 mb-1">Select Checked-In / Booked Guest</label>
                  <select
                    required
                    value={selectedReserveGuestId}
                    onChange={e => {
                      setSelectedReserveGuestId(e.target.value);
                      const match = bookings.find(b => b.id.toString() === e.target.value);
                      setReserveCustomerName(match ? match.guest_name : '');
                    }}
                    className="w-full p-3 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-emerald-500 rounded-lg outline-none transition text-xs cursor-pointer"
                  >
                    <option value="">Choose a guest...</option>
                    {bookings.filter(b => b.status === 'CHECKED_IN' || b.status === 'BOOKED').map(b => (
                      <option key={b.id} value={b.id}>
                        {b.guest_name} (Room {b.room_number} - {b.status})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block font-medium text-gray-300 mb-1">Customer Full Name</label>
                  <input
                    type="text"
                    required
                    value={reserveCustomerName}
                    onChange={e => setReserveCustomerName(e.target.value)}
                    className="w-full p-3 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-lg outline-none transition text-xs"
                    placeholder="Jane Smith"
                  />
                </div>
              )}

              <div>
                <label className="block font-medium text-gray-300 mb-1">Select Vacant Table</label>
                <select
                  required
                  value={reserveTableId}
                  onChange={e => setReserveTableId(e.target.value)}
                  className="w-full p-3 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-emerald-500 rounded-lg outline-none transition text-xs cursor-pointer"
                >
                  <option value="">Choose a table...</option>
                  {tables.filter(t => t.status === 'VACANT' && !tableReservations.some((tr: any) => tr.table === t.id && tr.status === 'BOOKED')).map(t => (
                    <option key={t.id} value={t.id}>
                      Table {t.table_number} (Capacity: {t.capacity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-gray-300 mb-1">Reservation Date & Time</label>
                <div className="relative">
                  <input
                    ref={reserveTimeRef}
                    type="datetime-local"
                    required
                    value={reserveTime}
                    onChange={e => setReserveTime(e.target.value)}
                    className="w-full p-3 pr-10 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-emerald-500 rounded-lg outline-none transition text-xs"
                  />
                  <Calendar
                    className="w-4 h-4 text-amber-400 absolute right-3 top-3.5 cursor-pointer hover:text-emerald-300 transition"
                    onClick={() => reserveTimeRef.current?.showPicker()}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 glowing-btn-emerald text-white font-bold rounded-xl transition duration-200 uppercase tracking-wider text-xs cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {loading ? 'Creating Reservation...' : 'Confirm Table Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Premium Registration Modal Popup */}
      {isRegistering && createPortal(
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden animate-fade-in"
          onClick={() => {
            setIsRegistering(false);
            setSelectedRoomId('');
            setSelectedExistingGuestId('');
            setFirstName('');
            setLastName('');
            setEmail('');
            setPhone('');
            setImmediateCheckIn(true);
          }}
        >
          <div
            className="bg-[#050712] border border-white/10 w-full max-w-3xl rounded-3xl p-6 shadow-2xl relative flex flex-col overflow-hidden max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                <h3 className="text-lg font-bold text-white uppercase tracking-wider font-mono">
                  {selectedRoomId ? `Check-in Guest: Room ${rooms.find(r => r.id.toString() === selectedRoomId)?.room_number || selectedRoomId}` : 'Register Walk-In Guest'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsRegistering(false);
                  setSelectedRoomId('');
                  setSelectedExistingGuestId('');
                  setFirstName('');
                  setLastName('');
                  setEmail('');
                  setPhone('');
                  setImmediateCheckIn(true);
                }}
                className="px-4 py-2 bg-slate-900 border border-white/5 text-gray-400 hover:text-white rounded-xl text-xs font-bold cursor-pointer transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto pr-1 flex-grow">
              <form onSubmit={handleRegisterAndCheckIn} className="space-y-4 text-xs sm:text-sm">

                {/* Select Past Guest Select Dropdown */}
                <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 space-y-2">
                  <label className="block text-xs font-mono font-bold text-indigo-300 uppercase tracking-wider">
                    Quick Select Past Guest (Optional)
                  </label>
                  <select
                    value={selectedExistingGuestId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedExistingGuestId(id);
                      if (id) {
                        const g = guests.find(g => g.id === id);
                        if (g) {
                          const parts = g.name ? g.name.trim().split(/\s+/) : [];
                          setFirstName(parts[0] || '');
                          setLastName(parts.slice(1).join(' ') || '');
                          setEmail(g.email || '');
                          setPhone(g.phone || '');
                          setGuestType(g.guest_type || 'BOTH');
                        }
                      } else {
                        setFirstName('');
                        setLastName('');
                        setEmail('');
                        setPhone('');
                        setGuestType('BOTH');
                      }
                    }}
                    className="w-full p-3 bg-slate-950 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 rounded-lg outline-none cursor-pointer text-xs"
                  >
                    <option value="">-- Create New Walk-in Guest --</option>
                    {guests.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name || g.username} ({g.email || 'No email'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-gray-300 mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className="w-full p-3 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent rounded-lg outline-none transition text-xs"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-300 mb-1">Last Name</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className="w-full p-3 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent rounded-lg outline-none transition text-xs"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-gray-300 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full p-3 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent rounded-lg outline-none transition text-xs"
                      placeholder="john.doe@example.com"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-300 mb-1">Contact Number</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full p-3 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent rounded-lg outline-none transition text-xs"
                      placeholder="e.g. +919999999999"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-gray-300 mb-1">Number of People</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={groupSize}
                      onChange={e => setGroupSize(e.target.value)}
                      className="w-full p-3 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent rounded-lg outline-none transition text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-300 mb-1">Guest Type</label>
                    <select
                      value={guestType}
                      onChange={e => setGuestType(e.target.value)}
                      className="w-full p-3 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent rounded-lg outline-none transition text-xs cursor-pointer"
                    >
                      <option value="DINE_IN">Dine-in Only Guest</option>
                      <option value="STAY_IN">Stay-in Only Guest</option>
                      <option value="BOTH">Guest with Stay + Dine-in</option>
                    </select>
                  </div>
                </div>

                {/* STAY details */}
                {(guestType === 'STAY_IN' || guestType === 'BOTH') && (
                  <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                    <h4 className="font-bold text-indigo-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Hotel className="w-4 h-4" />
                      Stay Room Allocation
                    </h4>
                    <div className={`grid grid-cols-1 ${selectedRoomId ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
                      {!selectedRoomId && (
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Room Selected</label>
                          <select
                            value={selectedRoomId}
                            onChange={e => setSelectedRoomId(e.target.value)}
                            className="w-full p-2 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 rounded-lg outline-none transition text-xs cursor-pointer"
                            required={guestType === 'STAY_IN' || guestType === 'BOTH'}
                          >
                            <option value="">Select Room</option>
                            {rooms.map(r => (
                              <option key={r.id} value={r.id} disabled={r.status !== 'AVAILABLE' && r.id.toString() !== selectedRoomId}>
                                Room {r.room_number} ({r.room_type} - ₹{parseFloat(r.price_per_night).toFixed(0)}) {r.status !== 'AVAILABLE' && r.id.toString() !== selectedRoomId ? `[${r.status}]` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Check-in Date</label>
                        <div className="relative">
                          <input
                            ref={checkInRef}
                            type="date"
                            value={checkInDate}
                            onChange={e => setCheckInDate(e.target.value)}
                            className="w-full p-2 pr-9 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 rounded-lg outline-none transition text-xs"
                            required={guestType === 'STAY_IN' || guestType === 'BOTH'}
                          />
                          <Calendar
                            className="w-4 h-4 text-indigo-400 absolute right-2.5 top-2.5 cursor-pointer hover:text-indigo-300 transition"
                            onClick={() => checkInRef.current?.showPicker()}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Check-out Date</label>
                        <div className="relative">
                          <input
                            ref={checkOutRef}
                            type="date"
                            value={checkOutDate}
                            onChange={e => setCheckOutDate(e.target.value)}
                            className="w-full p-2 pr-9 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 rounded-lg outline-none transition text-xs"
                            required={guestType === 'STAY_IN' || guestType === 'BOTH'}
                          />
                          <Calendar
                            className="w-4 h-4 text-indigo-400 absolute right-2.5 top-2.5 cursor-pointer hover:text-indigo-300 transition"
                            onClick={() => checkOutRef.current?.showPicker()}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Immediate Check-In Toggle */}
                    <div className="flex items-center gap-2 pt-3.5 border-t border-white/5">
                      <input
                        type="checkbox"
                        id="immediateCheckIn"
                        checked={immediateCheckIn}
                        onChange={e => setImmediateCheckIn(e.target.checked)}
                        className="w-4 h-4 rounded bg-slate-950 border border-white/10 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <label htmlFor="immediateCheckIn" className="text-xs font-semibold text-gray-300 cursor-pointer select-none">
                        Check-in guest immediately (Occupies room in database)
                      </label>
                    </div>
                  </div>
                )}

                {/* DINE_IN details */}
                {(guestType === 'DINE_IN' || guestType === 'BOTH') && (
                  <div className="p-4 rounded-xl bg-amber-600/5 border border-amber-600/10 space-y-4">
                    <h4 className="font-bold text-emerald-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <ConciergeBell className="w-4 h-4" />
                      Restaurant Table Allocation
                    </h4>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Reserve Vacant Table (Optional)</label>
                      <select
                        value={selectedTableId}
                        onChange={e => setSelectedTableId(e.target.value)}
                        className="w-full p-2 bg-slate-950/40 border border-white/5 text-gray-200 focus:ring-2 focus:ring-indigo-500 rounded-lg outline-none transition text-xs cursor-pointer"
                      >
                        <option value="">Allocate Table Later</option>
                        {tables.filter(t => t.status === 'VACANT' && !tableReservations.some((tr: any) => tr.table === t.id && tr.status === 'BOOKED')).map(t => (
                          <option key={t.id} value={t.id}>
                            Table {t.table_number} (Capacity: {t.capacity})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Guest Identity Verification Section */}
                <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 space-y-4">
                  <h4 className="font-bold text-indigo-300 text-xs uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <ShieldAlert className="w-4 h-4 text-indigo-400" />
                    Guest Identity Verification
                  </h4>
                  <p className="text-gray-400 text-xs">
                    Verify the guest's email via a secure OTP code before check-in.
                  </p>

                  {otpError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2.5 animate-fade-in">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{otpError}</span>
                    </div>
                  )}

                  {otpSuccess && (
                    <div className="p-3 bg-amber-600/10 border border-amber-600/20 text-amber-400 text-xs rounded-xl flex items-center gap-2.5 animate-fade-in">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{otpSuccess}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="flex-grow w-full">
                      {otpSent && !otpVerified ? (
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Enter 6-digit OTP Code</label>
                          <input
                            type="text"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="• • • • • •"
                            className="w-full p-2.5 bg-slate-950 border border-white/10 text-gray-200 text-center tracking-widest font-mono text-sm rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                          />
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 py-2">
                          {otpVerified ? (
                            <span className="text-amber-400 font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-amber-400" />
                              Email successfully verified.
                            </span>
                          ) : (
                            "Provide guest email, then trigger verification code."
                          )}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 w-full sm:w-auto">
                      {!otpSent ? (
                        <button
                          type="button"
                          disabled={otpLoading || !email || !phone}
                          onClick={handleSendCheckinOtp}
                          className="w-full sm:w-auto px-5 py-2.5 bg-slate-700 border border-amber-500/30 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition cursor-pointer disabled:opacity-50"
                        >
                          {otpLoading ? 'Sending...' : 'Send OTP Code'}
                        </button>
                      ) : !otpVerified ? (
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button
                            type="button"
                            disabled={otpLoading || otpCode.length !== 6}
                            onClick={handleVerifyCheckinOtp}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition cursor-pointer disabled:opacity-50 flex-grow text-center"
                          >
                            {otpLoading ? 'Verifying...' : 'Verify OTP'}
                          </button>
                          <button
                            type="button"
                            disabled={otpLoading}
                            onClick={handleSendCheckinOtp}
                            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-lg text-xs transition cursor-pointer"
                          >
                            Resend
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !otpVerified}
                    className="w-full py-3.5 glowing-btn-indigo text-white font-bold rounded-xl transition duration-200 uppercase tracking-wider text-xs cursor-pointer shadow-lg disabled:opacity-50"
                  >
                    {loading ? 'Processing Registration...' : 'Register Guest & Check-In'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Custom Confirmation Modal */}
      {confirmDialog && confirmDialog.isOpen && createPortal(
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-hidden animate-fade-in"
          onClick={() => setConfirmDialog(null)}
        >
          <div
            className="bg-[#050712] border border-white/10 w-full max-w-md rounded-3xl p-6 shadow-2xl relative flex flex-col overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-4">
              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                {confirmDialog.title}
              </h3>
            </div>

            {/* Body */}
            <div className="text-gray-300 text-sm mb-6 font-medium leading-relaxed">
              {confirmDialog.message}
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              {confirmDialog.cancelText !== null && (
                <button
                  onClick={() => setConfirmDialog(null)}
                  className={`px-4 py-2.5 bg-slate-900 border border-white/5 text-gray-400 hover:text-white rounded-xl text-xs font-bold cursor-pointer transition hover:bg-slate-800 ${confirmDialog.confirmText ? 'w-1/2' : 'w-full'}`}
                >
                  {confirmDialog.cancelText || 'Cancel'}
                </button>
              )}
              {confirmDialog.confirmText && (
                <button
                  onClick={async () => {
                    await confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className={`px-4 py-2.5 bg-indigo-500 hover:bg-slate-700 border border-amber-500/30 text-white rounded-xl text-xs font-black cursor-pointer transition shadow-lg shadow-indigo-500/20 ${confirmDialog.cancelText !== null ? 'w-1/2' : 'w-full'}`}
                >
                  {confirmDialog.confirmText}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Reception;
