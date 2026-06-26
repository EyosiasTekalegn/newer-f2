import React, { useState, useEffect } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { getCalendarEvents, CalendarEvent } from '../services/calendarService';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export function Calendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<any>(Views.MONTH);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCalendarEvents();
      setEvents(data);
    } catch (err: any) {
      console.error('Error fetching calendar events:', err);
      setError('Failed to load rentals schedule.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const closeEventModal = () => {
    setSelectedEvent(null);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'reserved':
        return 'bg-red-100 text-[#DC2626] border border-red-200';
      case 'delivered':
        return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'partially returned':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'closed':
        return 'bg-green-100 text-green-800 border border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white border border-gray-200 rounded shadow-sm">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
        <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-gray-500" />
          Rental Schedule
        </h2>
      </div>

      <div className="flex-1 p-4 overflow-hidden relative">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-[#DC2626]"></div>
            <p className="mt-4 text-sm font-medium text-gray-500">Loading schedule...</p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white">
            <p className="text-[#DC2626] font-medium mb-4">{error}</p>
            <button 
              onClick={fetchEvents}
              className="bg-[#DC2626] text-white px-4 py-2 rounded text-sm font-bold hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 z-10 pointer-events-none">
             <p>No rentals scheduled.</p>
          </div>
        ) : null}

        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          onSelectEvent={handleSelectEvent}
          views={[Views.MONTH, Views.WEEK, Views.DAY]}
          view={currentView}
          onView={setCurrentView}
          date={currentDate}
          onNavigate={setCurrentDate}
          eventPropGetter={(event) => {
            return {
              className: 'bg-red-50 text-gray-900 border-l-4 border-[#DC2626] rounded-sm text-xs font-medium px-1',
              style: { backgroundColor: '#FEF2F2', color: '#111827', border: 'none', borderLeft: '4px solid #DC2626' }
            };
          }}
          components={{
            toolbar: CustomToolbar
          }}
        />
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-md overflow-hidden flex flex-col border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-lg text-gray-900 truncate pr-4">
                {selectedEvent.title}
              </h3>
              <button 
                onClick={closeEventModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Customer</p>
                  <p className="text-sm font-medium text-gray-900">{selectedEvent.resource.customerName}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Rental Type</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">{selectedEvent.resource.rentalType}</p>
                </div>
                
                <div className="col-span-2">
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Schedule</p>
                  <p className="text-sm font-medium text-gray-900">
                    {format(selectedEvent.start, 'MMM d, yyyy h:mm a')} — {format(selectedEvent.end, 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Status</p>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeColor(selectedEvent.resource.status)}`}>
                    {selectedEvent.resource.status}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Total Price</p>
                  <p className="text-sm font-bold text-gray-900">
                    ${selectedEvent.resource.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button 
                onClick={closeEventModal}
                className="bg-[#DC2626] text-white px-6 py-2 rounded text-sm font-bold hover:bg-red-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Custom Toolbar to match the theme
function CustomToolbar(toolbar: any) {
  const goToBack = () => {
    toolbar.onNavigate('PREV');
  };

  const goToNext = () => {
    toolbar.onNavigate('NEXT');
  };

  const goToCurrent = () => {
    toolbar.onNavigate('TODAY');
  };

  return (
    <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
      <div className="flex items-center gap-2">
        <button 
          onClick={goToCurrent}
          className="px-3 py-1.5 border border-gray-200 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Today
        </button>
        <div className="flex items-center border border-gray-200 rounded overflow-hidden">
          <button 
            onClick={goToBack}
            className="px-2 py-1.5 hover:bg-[#DC2626] hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={goToNext}
            className="px-2 py-1.5 border-l border-gray-200 hover:bg-[#DC2626] hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div><span className="font-bold text-lg text-[#1A1A1A]">{toolbar.label}</span></div>
      
      <div className="flex items-center border border-gray-200 rounded overflow-hidden">
        {toolbar.views.map((viewName: string) => (
          <button
            key={viewName}
            onClick={() => toolbar.onView(viewName)}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors capitalize border-r last:border-r-0 border-gray-200 ${
              toolbar.view === viewName 
                ? 'bg-[#DC2626] text-white' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {viewName}
          </button>
        ))}
      </div>
    </div>
  );
}
