import { X, Target, BrainCircuit, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DailyRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
  record: any | null;
}

export default function DailyRecordModal({ isOpen, onClose, dateStr, record }: DailyRecordModalProps) {
  if (!isOpen) return null;

  const displayDate = new Date(dateStr).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const goals = record?.goals || [];
  const reflections = record?.reflections || [];
  const revisions = record?.revisions || [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[85vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Daily Review</h2>
              <p className="text-sm text-slate-500 font-medium">{displayDate}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {!record || (goals.length === 0 && reflections.length === 0 && revisions.length === 0) ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">No Activity</h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto">
                  You didn't set any goals or complete any reflections on this day.
                </p>
              </div>
            ) : (
              <>
                {/* Goals & Reflections Interleaved */}
                {goals.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <Target className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-bold text-slate-900">Goals & Reflections</h3>
                    </div>

                    <div className="space-y-4">
                      {goals.map((goal: any, index: number) => {
                        const reflection = reflections.find((r: any) => r.goalId === goal.goalId || r.goalId === goal.id);

                        return (
                          <div key={goal.id || goal.goalId || `goal-${index}`} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            {/* Goal Section */}
                            <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                              <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                  {index + 1}
                                </div>
                                <div>
                                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Goal</span>
                                  <p className="text-slate-800 font-medium mt-1 leading-relaxed">
                                    {goal.description || goal.title}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Reflection Section */}
                            <div className="p-4 bg-white">
                              {reflection ? (
                                <div className="pl-9 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                      <BrainCircuit className="w-3.5 h-3.5" /> Reflection
                                    </span>
                                    {reflection.assessment === 'sufficient' ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-bold">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Sufficient
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-orange-50 text-orange-700 text-xs font-bold">
                                        <XCircle className="w-3.5 h-3.5" /> Insufficient
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-slate-600 text-sm leading-relaxed">
                                    {reflection.reflectionText || reflection.summary}
                                  </p>
                                </div>
                              ) : (
                                <div className="pl-9 text-slate-400 text-sm italic">
                                  No reflection completed for this goal yet.
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Revisions */}
                {revisions.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <RefreshCw className="w-5 h-5 text-purple-600" />
                      <h3 className="text-lg font-bold text-slate-900">Revisions</h3>
                    </div>
                    <div className="space-y-3">
                      {revisions.map((rev: any, idx: number) => (
                        <div key={rev.id || `rev-${idx}`} className="bg-purple-50/50 border border-purple-100 rounded-xl p-4">
                          <h4 className="font-semibold text-purple-900 mb-1">{rev.topic}</h4>
                          <p className="text-purple-700 text-sm">{rev.reason}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
