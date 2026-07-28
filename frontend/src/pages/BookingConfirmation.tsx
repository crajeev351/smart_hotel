import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, Calendar, Hotel, ArrowLeft, Download } from 'lucide-react';

const BookingConfirmation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { booking, room } = location.state || {};

  if (!booking) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800">No Booking Found</h2>
        <p className="text-gray-500 mt-2">Redirecting to rooms...</p>
        {setTimeout(() => navigate('/rooms'), 2000) && null}
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-green-100 p-4 rounded-full">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>
        
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Booking Confirmed!</h2>
        <p className="text-gray-500 mt-2">Your reservation has been successfully placed.</p>
        
        <div className="mt-6 sm:mt-8 border-t border-b py-4 sm:py-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          <div>
            <p className="text-sm text-gray-500">Booking ID</p>
            <p className="font-semibold text-gray-800">#{booking.id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="font-semibold text-green-600">CONFIRMED</p>
          </div>
          <div className="flex items-start gap-2">
            <Hotel className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Room</p>
              <p className="font-semibold text-gray-800">Room {room.room_number} ({room.room_type})</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Dates</p>
              <p className="font-semibold text-gray-800">{booking.check_in_date} to {booking.check_out_date}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            to="/rooms" 
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Rooms
          </Link>
          <button 
            className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
            onClick={() => window.print()}
          >
            <Download className="w-5 h-5" />
            Download Receipt
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;
