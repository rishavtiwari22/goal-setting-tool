import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import type { InterviewConfig } from "../../services/interview/interviewEngine";

export interface InterviewModalsProps {
  conflictModalData: {
    unlockedCount: number;
    lockedCount: number;
    pendingConfig: InterviewConfig;
  } | null;
  noGoalsFound: boolean;
  
  // Actions
  onResolveConflict: (mode: 'append', config: InterviewConfig) => void;
  onNavigateHome: () => void;
  onNavigateToGoalSetting: () => void;
}

export function InterviewModals({
  conflictModalData,
  noGoalsFound,
  onResolveConflict,
  onNavigateHome,
  onNavigateToGoalSetting,
}: InterviewModalsProps) {
  
  return (
    <>
      {/* --- Goal Conflict Modal --- */}
      {conflictModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] p-8 md:p-10 max-w-lg w-full shadow-2xl flex flex-col gap-6 animate-in fade-in zoom-in duration-300 border border-slate-100 relative overflow-hidden">
            {/* Background Decoratives */}
            <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full opacity-50 bg-amber-50 pointer-events-none" />
            
            <div className="z-10 relative">
              <div className="flex items-center gap-4 text-amber-600 mb-2">
                <div className="p-3 bg-amber-50 rounded-2xl">
                  <Info size={28} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">You already have goals today</h2>
              </div>
              <div className="text-slate-500 font-medium leading-relaxed space-y-4">
                <p>
                  You have <span className="text-slate-900 font-bold">{conflictModalData.unlockedCount + conflictModalData.lockedCount}</span> goal{conflictModalData.unlockedCount + conflictModalData.lockedCount !== 1 ? 's' : ''} saved for today
                  {conflictModalData.lockedCount > 0 && <>, including <span className="text-amber-600 font-bold">{conflictModalData.lockedCount}</span> already reflected on (locked).</>}.
                </p>
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-[15px] text-green-700 font-semibold shadow-sm">
                  Any new goals you set in this session will be added alongside your existing ones.
                </div>
              </div>
            </div>
            
            <div className="z-10 relative mt-4">
              <Button
                className="w-full bg-[#2B5E2B] hover:bg-[#234E23] text-white font-semibold py-6 rounded-2xl transition-all shadow-md text-lg"
                onClick={() => onResolveConflict('append', conflictModalData.pendingConfig)}
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- No Goals Overlay (Reflection opened before Goal Setting) --- */}
      {noGoalsFound && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] p-8 md:p-10 max-w-lg w-full shadow-2xl flex flex-col gap-6 animate-in fade-in zoom-in duration-300 border border-slate-100 relative overflow-hidden">
            {/* Background Decoratives */}
            <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full opacity-50 bg-amber-50 pointer-events-none" />
            
            <div className="z-10 relative">
              <div className="flex items-center gap-4 text-amber-600 mb-2">
                <div className="p-3 bg-amber-50 rounded-2xl">
                  <Info size={28} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">No Goals Set Yet</h2>
              </div>
              <p className="text-slate-500 font-medium leading-relaxed mt-4">
                You haven't set any goals for today yet. Please complete a <span className="text-slate-900 font-bold">Goal Setting</span> session first — there's nothing to reflect on yet!
              </p>
            </div>
            
            <div className="z-10 relative flex flex-col gap-3 mt-4">
              <Button
                className="w-full bg-[#2B5E2B] hover:bg-[#234E23] text-white font-bold py-6 rounded-2xl transition-all shadow-md text-lg"
                onClick={onNavigateToGoalSetting}
              >
                Set a Goal
              </Button>
              <Button
                variant="ghost"
                className="w-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 font-bold py-6 rounded-2xl transition-all text-lg"
                onClick={onNavigateHome}
              >
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
