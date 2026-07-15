import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import DailyRecordModal from "@/components/DailyRecordModal";
import { getMonthlyRecords } from "@/services/api/dailySessionApi";
import { ENV } from "@/utils/env";

export default function CalendarPage() {
  const { date: routeDate } = useParams();
  const navigate = useNavigate();
  
  const initialDate = routeDate ? new Date(routeDate) : new Date();
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [records, setRecords] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(routeDate || null);
  const [isModalOpen, setIsModalOpen] = useState(!!routeDate);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    setUserId(ENV.DUMMY_EMAIL());
  }, []);

  useEffect(() => {
    fetchRecords();

    // Listen for custom event triggered when a new goal/reflection is saved
    const handleGoalSaved = () => fetchRecords();
    window.addEventListener('goalSaved', handleGoalSaved);
    
    return () => {
      window.removeEventListener('goalSaved', handleGoalSaved);
    };
  }, [currentDate]);

  const fetchRecords = async () => {
    const yearMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
    try {
      const data = await getMonthlyRecords(yearMonth);
      console.log("[CalendarPage] Fetched records:", data);
      setRecords(data || []);
    } catch (e) {
      console.error("Failed to fetch records", e);
      setRecords([]);
    }
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const openDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dateStr);
    setIsModalOpen(true);
  };

  const getRecordForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return records.find((r) => {
      if (!r) return false;
      const rDate = r.date || r.createdAt;
      if (!rDate) return false;
      const recordDate = typeof rDate === 'string' ? rDate.split('T')[0] : "";
      return recordDate === dateStr;
    }) || null;
  };

  const renderGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const today = new Date();

    const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => (
      <div key={`blank-${i}`} className="bg-slate-50 border-b border-r border-slate-200" />
    ));

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
      const record = getRecordForDay(day);

      const hasGoals = record?.goals && record.goals.length > 0;
      const hasReflections = record?.reflections && record.reflections.length > 0;
      
      if (record) {
        console.log(`[CalendarPage] Day ${day} record found:`, record);
      }

      // Determine dot color
      let dotColor = null;
      if (hasGoals && hasReflections) dotColor = "bg-green-500";
      else if (hasGoals) dotColor = "bg-blue-500";
      else if (hasReflections) dotColor = "bg-purple-500";

      return (
        <div
          key={`day-${day}`}
          onClick={() => openDay(day)}
          className={`relative min-h-[120px] p-2 bg-white border-b border-r border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors group ${isToday ? "bg-blue-50/30" : ""
            }`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-sm font-semibold p-1.5 rounded-full w-7 h-7 flex items-center justify-center ${isToday ? "bg-blue-600 text-white" : "text-slate-700 group-hover:text-blue-600"
              }`}>
              {day}
            </span>

            {dotColor && (
              <div className={`mt-2 w-2.5 h-2.5 rounded-full ${dotColor} shadow-sm`} title={
                hasGoals && hasReflections ? "Goals and reflections recorded" :
                  hasGoals ? "Goals set" : "Reflections recorded"
              } />
            )}
          </div>

          <div className="mt-2 space-y-1 px-1">
            {hasGoals && (
              <div className="text-[10px] font-medium bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded truncate">
                {record.goals.length} {record.goals.length === 1 ? 'Goal' : 'Goals'}
              </div>
            )}
            {hasReflections && (
              <div className="text-[10px] font-medium bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded truncate">
                {record.reflections.length} {record.reflections.length === 1 ? 'Reflection' : 'Reflections'}
              </div>
            )}
          </div>
        </div>
      );
    });

    return [...blanks, ...days];
  };

  const handleClose = () => {
    navigate(-1);
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0 shadow-sm">
            <div className="flex items-center gap-6">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Calendar</h2>

              <div className="flex items-center gap-3">
                <button
                  onClick={goToToday}
                  className="px-4 py-1.5 text-sm font-medium border border-slate-300 rounded-md hover:bg-slate-50 text-slate-700 transition-colors"
                >
                  Today
                </button>
                <div className="flex items-center text-slate-700">
                  <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <span className="text-xl font-medium text-slate-800 ml-2">
                  {currentDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </span>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
              title="Close Calendar"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 p-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="text-center text-xs font-bold text-slate-500 uppercase tracking-wider py-3 border-r border-slate-200 last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                {renderGrid()}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <DailyRecordModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        dateStr={selectedDate || ""}
        record={selectedDate ? records.find(r => r.date.split('T')[0] === selectedDate) : null}
      />
    </>
  );
}
