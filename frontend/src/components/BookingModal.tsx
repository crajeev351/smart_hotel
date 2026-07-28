import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { X, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Room {
  id: number;
  room_number: string;
  room_type: string;
  price_per_night: string;
}

interface BookingModalProps {
  room: Room;
  onClose: () => void;
  onSuccess: () => void;
}

const BookingModal: React.FC<BookingModalProps> = ({ room, onClose, onSuccess }) => {
  const getCurrentDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [guests, setGuests] = useState<any[]>([]);
  const [selectedGuestId, setSelectedGuestId] = useState('');
  
  const [checkIn, setCheckIn] = useState(getCurrentDateString());
  const [checkOut, setCheckOut] = useState('');
  const checkInRef = React.useRef<HTMLInputElement>(null);
  const checkOutRef = React.useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const u = userData ? JSON.parse(userData) : null;
    setCurrentUser(u);

    if (u && (u.role === 'ADMIN' || u.role === 'RECEPTION')) {
      API.get('users/')
        .then((res) => {
          // Filter to show only GUEST users
          setGuests(res.data.filter((user: any) => user.role === 'GUEST' || user.role === ''));
        })
        .catch((err) => {
          console.error('Failed to load guest list:', err);
        });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const guestId = selectedGuestId || currentUser?.id;

      if (!guestId) throw new Error('User not found. Please log in again.');

      const response = await API.post('bookings/', {
        room: room.id,
        guest: guestId,
        check_in_date: checkIn,
        check_out_date: checkOut,
        status: 'BOOKED',
        total_price: room.price_per_night // Simplification for now
      });

      // Also update room status to OCCUPIED
      await API.patch(`rooms/${room.id}/`, { status: 'OCCUPIED' });

      onSuccess();
      onClose();

      // Navigate to confirmation page
      navigate('/booking-confirmation', { 
        state: { 
          booking: response.data,
          room: room
        } 
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const isStaff = currentUser?.role === 'ADMIN' || currentUser?.role === 'RECEPTION';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-xl font-bold">Book Room {room.room_number}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          {error && <p className="text-red-500 mb-4 text-sm bg-red-50 p-2 rounded">{error}</p>}
          
          <div className="space-y-4">
            {/* Show Guest selector if staff is booking */}
            {isStaff && guests.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Guest</label>
                <select 
                  required
                  value={selectedGuestId}
                  onChange={(e) => setSelectedGuestId(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Choose Guest --</option>
                  {guests.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name || g.username} ({g.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isStaff && guests.length === 0 && (
              <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                ⚠️ No guests registered in the database. Please register a guest first.
              </p>
            )}

             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Date</label>
              <div className="relative">
                <input 
                  ref={checkInRef}
                  type="date" 
                  required 
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full p-2 pr-9 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <Calendar 
                  className="w-4 h-4 text-blue-500 absolute right-2.5 top-2.5 cursor-pointer hover:text-blue-600 transition"
                  onClick={() => checkInRef.current?.showPicker()}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Date</label>
              <div className="relative">
                <input 
                  ref={checkOutRef}
                  type="date" 
                  required 
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full p-2 pr-9 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <Calendar 
                  className="w-4 h-4 text-blue-500 absolute right-2.5 top-2.5 cursor-pointer hover:text-blue-600 transition"
                  onClick={() => checkOutRef.current?.showPicker()}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading || (isStaff && !selectedGuestId)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Booking...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;
