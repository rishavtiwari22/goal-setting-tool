import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, User, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Header() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  const initials = user?.displayName
    ? user.displayName.charAt(0).toUpperCase()
    : user?.email
    ? user.email.charAt(0).toUpperCase()
    : "U";

  return (
    <>
      <header className="sticky top-0 z-50 shrink-0 w-full border-b border-gray-200 bg-white">
        <div className="w-full h-14 flex items-center justify-between px-6">
          {/* Logo — left */}
          <div 
            className="flex items-center gap-2 cursor-pointer shrink-0" 
            onClick={() => navigate("/")}
            title="Go to Home"
          >
            <Target className="w-7 h-7 text-blue-600" />
            <span className="font-bold text-lg text-slate-800 tracking-tight">Apex</span>
          </div>

          {/* Right side icons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/calendar")}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
              title="View Activity Calendar"
            >
              <CalendarIcon className="w-5 h-5" />
            </button>

            <div className="relative">
              <div 
                className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm cursor-pointer shadow-sm border border-blue-200 overflow-hidden" 
                title="User Profile"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 border border-gray-200 z-50">
                  <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                    <div className="font-semibold">{user?.displayName || 'User'}</div>
                    <div className="text-xs text-gray-500 truncate">{user?.email}</div>
                  </div>
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      signOut();
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
