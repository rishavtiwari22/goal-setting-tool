import { useEffect, useRef, useState } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ReflectionItem {
  summary: string;
  conclusion: string;
  status: string;
}

interface ReflectionResultPopupProps {
  items: ReflectionItem[];
  onDismiss: () => void;
  onClose: () => void;
}

export function ReflectionResultPopup({ items, onDismiss, onClose }: ReflectionResultPopupProps) {
  const [countdown, setCountdown] = useState(5);
  const onDismissRef = useRef(onDismiss);
  useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismissRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const circumference = 2 * Math.PI * 22;
  const strokeDashoffset = circumference * (countdown / 5);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-[#1C2128] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#2EA043]/20 rounded-lg">
              <CheckCircle size={22} className="text-[#2EA043]" />
            </div>
            <h2 className="text-white font-semibold text-lg">Reflection Saved</h2>
          </div>
          <button
            onClick={onClose}
            className="relative flex items-center justify-center w-10 h-10 group"
            title="Close and go home"
          >
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="22" fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="3" />
              <circle
                cx="24" cy="24" r="22" fill="none"
                stroke="#2EA043" strokeWidth="3"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <span className="relative text-white/70 group-hover:text-white transition-colors">
              <X size={16} />
            </span>
          </button>
        </div>

        {/* Reflection Items */}
        <div className="flex flex-col gap-4 p-5 max-h-[60vh] overflow-y-auto">
          {items.map((item, i) => {
            const isSufficient = !item.conclusion?.toLowerCase().includes('insufficient');
            return (
              <div key={i} className="bg-white/5 rounded-xl p-4 flex flex-col gap-3">
                {items.length > 1 && (
                  <div className="text-xs text-white/40 font-medium uppercase tracking-widest">Goal {i + 1}</div>
                )}
                <p className="text-white/90 text-sm leading-relaxed">{item.summary}</p>
                <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full w-fit ${
                  isSufficient
                    ? 'bg-[#2EA043]/15 text-[#2EA043]'
                    : 'bg-amber-500/15 text-amber-400'
                }`}>
                  {isSufficient ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                  {isSufficient ? 'Understanding: Sufficient' : 'Understanding: Needs work'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/10 flex items-center justify-between">
          <span className="text-white/40 text-sm">
            Going to calendar in <span className="text-white/70 font-medium">{countdown}s</span>
          </span>
          <button onClick={onDismiss} className="text-sm text-[#2EA043] hover:text-[#26893a] font-medium transition-colors">
            View Calendar →
          </button>
        </div>
      </div>
    </div>
  );
}
