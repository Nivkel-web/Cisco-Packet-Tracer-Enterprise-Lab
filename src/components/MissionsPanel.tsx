import React, { useState } from 'react';
import { LabMission } from '../types/network';
import { CheckCircle2, Circle, Award, ChevronRight, ChevronDown, Lightbulb, Shield, Zap, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MissionsPanelProps {
  missions: LabMission[];
  onCompleteMission: (missionId: string) => void;
}

export const MissionsPanel: React.FC<MissionsPanelProps> = ({ missions, onCompleteMission }) => {
  const [expandedId, setExpandedId] = useState<string>(missions[0]?.id || '');
  const [showSolutionId, setShowSolutionId] = useState<string | null>(null);

  const totalScore = missions.filter((m) => m.isCompleted).reduce((sum, m) => sum + m.rewardPoints, 0);
  const maxScore = missions.reduce((sum, m) => sum + m.rewardPoints, 0);

  const handleVerify = (mission: LabMission) => {
    onCompleteMission(mission.id);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#06b6d4', '#10b981', '#f59e0b', '#38bdf8'],
    });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      {/* Header with Score */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h3 className="font-mono text-xs font-bold text-slate-100 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span>CISCO ENTERPRISE LAB MISSIONS</span>
          </h3>
          <p className="text-[11px] text-slate-400 font-mono">
            Complete real CCNA/CCNP network configuration and verification drills.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400">SCORE:</span>
          <span className="font-mono text-xs font-bold text-cyan-300">
            {totalScore} / {maxScore} PTS
          </span>
        </div>
      </div>

      {/* Mission Accordion List */}
      <div className="space-y-3 font-mono">
        {missions.map((mission) => {
          const isExp = expandedId === mission.id;
          const isDone = mission.isCompleted;

          return (
            <div
              key={mission.id}
              className={`rounded-lg border transition-all ${
                isDone
                  ? 'bg-emerald-950/20 border-emerald-500/40'
                  : isExp
                  ? 'bg-slate-950 border-cyan-500/50 shadow-md'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Mission Header */}
              <div
                onClick={() => setExpandedId(isExp ? '' : mission.id)}
                className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-3">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-600 shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">
                        {mission.number}. {mission.title}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded border ${
                          mission.difficulty === 'Beginner'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : mission.difficulty === 'Intermediate'
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                            : 'bg-amber-950 text-amber-300 border-amber-800'
                        }`}
                      >
                        {mission.difficulty}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{mission.objective}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-amber-400 font-bold">+{mission.rewardPoints} XP</span>
                  {isExp ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </div>
              </div>

              {/* Mission Body */}
              {isExp && (
                <div className="px-3.5 pb-3.5 pt-1 text-xs border-t border-slate-800/80 space-y-3">
                  <p className="text-slate-300 text-[11px] leading-relaxed">{mission.description}</p>

                  {/* Verification Criteria */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Pass Criteria:</span>
                    <ul className="space-y-1 pl-1">
                      {mission.verificationCriteria.map((crit, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                          <span className="text-cyan-400 font-bold">✓</span>
                          <span>{crit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Hints */}
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-bold">
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>Lab Field Hints:</span>
                    </div>
                    <ul className="list-disc list-inside text-[10px] text-slate-400 space-y-0.5">
                      {mission.hints.map((hint, idx) => (
                        <li key={idx}>{hint}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Solution toggle */}
                  <div>
                    <button
                      onClick={() => setShowSolutionId(showSolutionId === mission.id ? null : mission.id)}
                      className="text-[10px] text-slate-400 hover:text-cyan-300 underline"
                    >
                      {showSolutionId === mission.id ? 'Hide Walkthrough' : 'Show Solution Walkthrough'}
                    </button>
                    {showSolutionId === mission.id && (
                      <div className="mt-1.5 p-2 rounded bg-slate-900/90 border border-cyan-900/50 text-[11px] text-cyan-200/90 space-y-1">
                        {mission.solutionSteps.map((step, idx) => (
                          <div key={idx} className="flex items-start gap-1">
                            <span className="text-cyan-400">{idx + 1}.</span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Complete Action Button */}
                  <div className="pt-2 flex items-center justify-end">
                    <button
                      onClick={() => handleVerify(mission)}
                      disabled={isDone}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-md ${
                        isDone
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/60 cursor-default'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/40'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isDone ? 'Completed' : 'Verify & Claim Lab Points'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
