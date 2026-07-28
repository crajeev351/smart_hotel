import React, { useEffect, useState } from 'react';
import API from '../services/api';
import { ChefHat, Clock, RefreshCcw, Bell } from 'lucide-react';

interface OrderItem {
  id: number;
  menu_item_details: {
    name: string;
    is_veg: boolean;
  };
  quantity: number;
  status: string;
  notes: string;
}

interface Order {
  id: number;
  guest_name: string;
  table_number: string;
  status: string;
  created_at: string;
  items: OrderItem[];
}

const Kitchen: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [nowTime, setNowTime] = useState<number>(Date.now());

  const [prevRawOrders, setPrevRawOrders] = useState<any[]>([]);

  const fetchKitchenOrders = async () => {
    setLoading(true);
    try {
      const response = await API.get('orders/');
      const active = response.data.filter((order: any) => {
        return order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && 
               order.items.some((i: any) => i.status !== 'SERVED' && i.status !== 'CANCELLED');
      });
      setOrders(active);

      // Detect cancellations by comparing with prevRawOrders
      if (prevRawOrders.length > 0) {
        response.data.forEach((newOrder: any) => {
          const oldOrder = prevRawOrders.find((o: any) => o.id === newOrder.id);
          if (oldOrder) {
            // Check if order was cancelled
            if (newOrder.status === 'CANCELLED' && oldOrder.status !== 'CANCELLED') {
              const message = `🚨 Table ${newOrder.table_number || '?'}: Order #${newOrder.id} has been CANCELLED!`;
              setAlerts(prev => [message, ...prev]);
            }
            // Check if any individual item was cancelled
            newOrder.items.forEach((newItem: any) => {
              const oldItem = oldOrder.items.find((i: any) => i.id === newItem.id);
              if (oldItem && newItem.status === 'CANCELLED' && oldItem.status !== 'CANCELLED') {
                const message = `🚨 Table ${newOrder.table_number || '?'}: ${newItem.quantity} x ${newItem.menu_item_details.name} has been CANCELLED!`;
                setAlerts(prev => [message, ...prev]);
              }
            });
          }
        });
      }
      setPrevRawOrders(response.data);
    } catch (err: any) {
      console.error(err);
      setError('KDS error: Failed to fetch live orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKitchenOrders();
    const interval = setInterval(() => {
      fetchKitchenOrders();
    }, 5000);
    
    const timeInterval = setInterval(() => {
      setNowTime(Date.now());
    }, 10000);

    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, []);

  const updateItemStatus = async (itemId: number, newStatus: string, itemName: string, tableNum: string) => {
    try {
      await API.patch(`order-items/${itemId}/`, { status: newStatus });
      
      if (newStatus === 'READY') {
        const message = `🔔 ${itemName} for Table ${tableNum} is READY!`;
        setAlerts(prev => [message, ...prev]);
        setTimeout(() => {
          setAlerts(prev => prev.filter(a => a !== message));
        }, 8000);
      }

      fetchKitchenOrders();
    } catch (err: any) {
      setError('Failed to update status: ' + err.message);
    }
  };

  const getElapsedTime = (createdAtStr: string) => {
    const created = new Date(createdAtStr).getTime();
    const diffMs = nowTime - created;
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  const getItemStatusStyle = (status: string) => {
    switch (status) {
      case 'PENDING': 
        return 'border-l-4 border-slate-500 bg-slate-950/40 text-gray-300';
      case 'PREPARING': 
        return 'border-l-4 border-amber-500 bg-amber-500/5 text-amber-200';
      case 'READY': 
        return 'border-l-4 border-emerald-500 bg-emerald-500/5 text-emerald-200';
      case 'SERVED': 
        return 'border-l-4 border-indigo-500 bg-indigo-500/5 text-indigo-200';
      default: 
        return 'border-l-4 border-slate-700 bg-slate-900/40 text-gray-400';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 animate-fade-in pb-12">
      
      {/* Header Panel */}
      <div className="glass-panel p-4 sm:p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
            <ChefHat className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">Kitchen Display System (KDS)</h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-0.5 sm:mt-1">Live order orchestration, cooking telemetry, and service handoff.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] sm:text-xs font-bold text-emerald-400">
            <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-400 animate-pulse" />
            LIVE LINK ACTIVE
          </div>
          <button 
            onClick={fetchKitchenOrders}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-900 border border-white/5 text-gray-400 hover:bg-slate-800 transition cursor-pointer"
            title="Refresh Orders queue"
          >
            <RefreshCcw className={`w-4 h-4 sm:w-5 sm:h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, idx) => (
            <div 
              key={idx} 
              className="bg-indigo-950/80 backdrop-blur-md border border-indigo-500/30 text-indigo-200 p-4 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.15)] flex items-center justify-between animate-fade-in font-bold text-base"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-indigo-400 animate-bounce" />
                <span>{alert}</span>
              </div>
              <button 
                onClick={() => setAlerts(prev => prev.filter(a => a !== alert))}
                className="text-gray-400 hover:text-white transition cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Kanban/Orders Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {orders.map(order => {
          const elapsed = getElapsedTime(order.created_at);
          const isWarning = elapsed > 15;
          
          return (
            <div 
              key={order.id} 
              className={`glass-panel rounded-2xl overflow-hidden flex flex-col justify-between border transition duration-300 ${
                isWarning 
                  ? 'border-rose-500/50 shadow-[0_0_25px_rgba(244,63,94,0.15)]' 
                  : 'border-white/5 hover:border-white/10'
              }`}
            >
              <div>
                {/* Header */}
                <div className={`p-4 border-b border-white/5 flex justify-between items-center ${
                  isWarning ? 'bg-rose-500/10' : 'bg-slate-900/50'
                }`}>
                  <div>
                    <h3 className="text-lg font-black text-white">Table {order.table_number || '?'}</h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">Order #{order.id} • {order.guest_name}</p>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold ${
                    isWarning ? 'bg-rose-500/20 text-rose-300 animate-pulse' : 'bg-slate-950 text-gray-400'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{elapsed}m</span>
                  </div>
                </div>

                {/* Items list */}
                <div className="p-4 space-y-3">
                  {order.items.map(item => (
                    <div 
                      key={item.id} 
                      className={`p-3.5 rounded-xl border border-white/[0.04] text-xs space-y-2.5 ${getItemStatusStyle(item.status)}`}
                    >
                      <div className="flex justify-between items-start font-bold">
                        <span className="text-white text-sm">
                          {item.quantity} x {item.menu_item_details.name}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-950 border border-white/10">
                          {item.status}
                        </span>
                      </div>

                      {item.notes && (
                        <p className="text-[10px] text-rose-300 bg-rose-500/10 p-2 rounded-lg font-semibold border border-rose-500/20">
                          ⚠️ instructions: {item.notes}
                        </p>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-1.5">
                        {item.status === 'PENDING' && (
                          <button
                            onClick={() => updateItemStatus(item.id, 'PREPARING', item.menu_item_details.name, order.table_number)}
                            className="flex-grow py-2 glowing-btn-indigo hover:from-indigo-600 hover:to-indigo-500 text-white rounded-lg font-bold text-[10px] tracking-wider uppercase transition cursor-pointer"
                          >
                            Start Preparing
                          </button>
                        )}
                        {item.status === 'PREPARING' && (
                          <button
                            onClick={() => updateItemStatus(item.id, 'READY', item.menu_item_details.name, order.table_number)}
                            className="flex-grow py-2 glowing-btn-emerald hover:from-emerald-600 hover:to-emerald-500 text-white rounded-lg font-bold text-[10px] tracking-wider uppercase transition cursor-pointer"
                          >
                            Mark Ready (Alert)
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
        
        {orders.length === 0 && (
          <div className="col-span-full py-20 text-center glass-panel rounded-2xl text-gray-500 flex flex-col items-center justify-center">
            <ChefHat className="w-16 h-16 mb-4 text-slate-700 stroke-1" />
            <p className="text-lg font-extrabold text-white">Kitchen Log Clear!</p>
            <p className="text-sm mt-1">No pending or preparation order requests in KDS.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default Kitchen;
