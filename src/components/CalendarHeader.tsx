import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

export default function CalendarHeader() {
  const navigate = useNavigate();
  const [initials, setInitials] = useState("U");

  useEffect(() => {
    const email = localStorage.getItem("studentEmail");
    if (email) {
      setInitials(email.charAt(0).toUpperCase());
    }
  }, []);

  return (
    <header className="sticky top-0 z-50 shrink-0 w-full border-b border-slate-200 bg-white">
      <div className="w-full h-14 flex items-center justify-between px-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
