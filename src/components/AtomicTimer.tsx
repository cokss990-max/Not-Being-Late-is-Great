import { Bell, BellOff, Play, Pause, RotateCcw, SkipForward, Volume2, VolumeX } from 'lucide-react';
import {
  AlertRecord,
  BREAK_DURATION_SECONDS,
  SessionPhase,
  TEACHING_DURATION_SECONDS,
  WARNING_THRESHOLD_SECONDS,
} from '../types/schedule';
import { formatCountdown } from '../utils/dates';

interface AtomicTimerProps {
  phase: SessionPhase;
  blockNumber: number;
  secondsRemaining: number;
  isRunning: boolean;
  soundEnabled: boolean;
  autoAdvance: boolean;
  completedTeachingBlocks: number;
  alertLog: AlertRecord[];
  onToggleRun: () => void;
  onReset: () => void;
  onSkipNext: () => void;
  onSwitchPhase: (phase: SessionPhase) => void;
  onToggleSound: () => void;
  onToggleAutoAdvance: () => void;
  onTestAlert: () => void;
  onClearLog: () => void;
}

export function AtomicTimer({
  phase,
  blockNumber,
  secondsRemaining,
  isRunning,
  soundEnabled,
  autoAdvance,
  completedTeachingBlocks,
  alertLog,
  onToggleRun,
  onReset,
  onSkipNext,
  onSwitchPhase,
  onToggleSound,
  onToggleAutoAdvance,
  onTestAlert,
  onClearLog,
}: AtomicTimerProps) {
  const totalDuration = phase === 'teaching' ? TEACHING_DURATION_SECONDS : BREAK_DURATION_SECONDS;
  const elapsed = Math.max(0, totalDuration - secondsRemaining);
  const progressPercent = Math.min(100, (elapsed / totalDuration) * 100);
  const isInFinalMinute = secondsRemaining <= WARNING_THRESHOLD_SECONDS && secondsRemaining > 0;

  const alertTriggerTimeLabel =
    phase === 'teaching' ? 'Fires at 01:00 remaining (24m elapsed)' : 'Fires at 01:00 remaining (4m elapsed)';

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8">
      {/* Header row with segmented session selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
            Atomic Teaching Cycle
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            25-minute teaching blocks · 5-minute breaks · Single alert at 1 minute remaining
          </p>
        </div>

        <div
          className="inline-flex items-center p-1 bg-slate-100 rounded-lg self-start sm:self-auto"
          role="tablist"
          aria-label="Session phase"
        >
          <button
            type="button"
            role="tab"
            aria-selected={phase === 'teaching'}
            onClick={() => onSwitchPhase('teaching')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
              phase === 'teaching'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Teaching Block (25m)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={phase === 'break'}
            onClick={() => onSwitchPhase('break')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
              phase === 'break'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Break (5m)
          </button>
        </div>
      </div>

      {/* Main focal countdown stage */}
      <div className="py-8 flex flex-col items-center text-center">
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
          <span className={`font-semibold ${phase === 'teaching' ? 'text-sky-700' : 'text-emerald-700'}`}>
            {phase === 'teaching' ? `Teaching Block ${blockNumber}` : `Break ${blockNumber}`}
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>
            {isRunning ? 'Running' : secondsRemaining === totalDuration ? 'Ready' : 'Paused'}
          </span>
          {isInFinalMinute && (
            <>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="font-semibold text-amber-700">Final Minute</span>
            </>
          )}
        </div>

        <div
          className={`font-mono tabular-nums text-6xl sm:text-7xl font-semibold tracking-tight leading-none ${
            isInFinalMinute ? 'text-amber-700' : 'text-slate-900'
          }`}
          aria-live="off"
        >
          {formatCountdown(secondsRemaining)}
        </div>

        <p className="mt-3 text-xs text-slate-500 font-mono tabular-nums">
          {alertTriggerTimeLabel}
        </p>

        {/* Precision horizontal progress bar with 1-minute warning tick */}
        <div className="w-full max-w-md mt-6">
          <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-transform duration-300 ease-out origin-left ${
                isInFinalMinute
                  ? 'bg-amber-600'
                  : phase === 'teaching'
                    ? 'bg-sky-600'
                    : 'bg-emerald-600'
              }`}
              style={{ transform: `scaleX(${progressPercent / 100})` }}
            />
            {/* Exact 1-minute remaining marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-amber-600/80"
              style={{
                left: `${((totalDuration - WARNING_THRESHOLD_SECONDS) / totalDuration) * 100}%`,
              }}
              title="1-minute alert threshold"
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500 font-mono tabular-nums">
            <span>00:00</span>
            <span>Alert at 01:00 left</span>
            <span>{phase === 'teaching' ? '25:00' : '05:00'}</span>
          </div>
        </div>

        {/* Primary transport controls */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onToggleRun}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isRunning ? 'Pause' : secondsRemaining < totalDuration ? 'Resume' : 'Start Session'}</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={onSkipNext}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            <SkipForward className="w-4 h-4" />
            <span>{phase === 'teaching' ? 'Start Break' : 'Next Teaching Block'}</span>
          </button>
        </div>
      </div>

      {/* Controls & session summary strip */}
      <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm">
        <div className="flex flex-wrap items-center gap-4 text-slate-600">
          <span className="font-mono tabular-nums text-slate-900 font-medium">
            {completedTeachingBlocks} {completedTeachingBlocks === 1 ? 'block' : 'blocks'} completed today
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoAdvance}
              onChange={onToggleAutoAdvance}
              className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            />
            <span>Auto-advance sessions</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSound}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{soundEnabled ? 'Chime On' : 'Chime Muted'}</span>
          </button>

          <button
            type="button"
            onClick={onTestAlert}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Test 1-Min Alert</span>
          </button>
        </div>
      </div>

      {/* Recent 1-minute alert log */}
      <div className="mt-6 pt-5 border-t border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900">One-Minute Alert Log</h3>
          {alertLog.length > 0 && (
            <button
              type="button"
              onClick={onClearLog}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Clear Log
            </button>
          )}
        </div>

        {alertLog.length === 0 ? (
          <div className="py-4 text-sm text-slate-500 flex items-center gap-2">
            <BellOff className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              No alerts fired yet. A single distinct alert is logged automatically at 01:00 remaining in each session.
            </span>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {alertLog.slice(0, 6).map((entry) => (
              <li
                key={entry.id}
                className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`font-medium shrink-0 ${
                      entry.phase === 'teaching' ? 'text-sky-700' : 'text-emerald-700'
                    }`}
                  >
                    {entry.phase === 'teaching'
                      ? `Teaching Block ${entry.blockNumber}`
                      : `Break ${entry.blockNumber}`}
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="text-slate-700 truncate">{entry.message}</span>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500 shrink-0">
                  {entry.firedAt}
                  {entry.isPreview ? ' · Test' : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
