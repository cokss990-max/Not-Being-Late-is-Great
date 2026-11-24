import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  LayoutGrid,
  Menu,
  Pause,
  Play,
  X,
} from 'lucide-react';
import { AtomicTimer } from './components/AtomicTimer';
import { AppointmentsPanel } from './components/AppointmentsPanel';
import { TodoPanel } from './components/TodoPanel';
import { WeeklyAgenda } from './components/WeeklyAgenda';
import {
  AlertRecord,
  Appointment,
  BREAK_DURATION_SECONDS,
  NavSection,
  SessionPhase,
  TEACHING_DURATION_SECONDS,
  TodoItem,
  WARNING_THRESHOLD_SECONDS,
} from './types/schedule';
import { playAlertChime } from './utils/audio';
import {
  addDays,
  formatCountdown,
  formatLongDate,
  getInitialAppointments,
  getInitialTodos,
  toDateKey,
} from './utils/dates';

const STORAGE_KEYS = {
  appointments: 'cadence_appointments_v1',
  todos: 'cadence_todos_v1',
  completedBlocks: 'cadence_completed_blocks_v1',
  soundEnabled: 'cadence_sound_enabled_v1',
  autoAdvance: 'cadence_auto_advance_v1',
};

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function formatCurrentClock(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function App() {
  const [todayKey] = useState<string>(() => toDateKey(new Date()));
  const [selectedDate, setSelectedDate] = useState<string>(() => toDateKey(new Date()));
  const [activeNav, setActiveNav] = useState<NavSection>('today');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [pendingAddAppointment, setPendingAddAppointment] = useState(false);

  // Atomic schedule timer state
  const [phase, setPhase] = useState<SessionPhase>('teaching');
  const [blockNumber, setBlockNumber] = useState<number>(1);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(TEACHING_DURATION_SECONDS);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() =>
    loadJson<boolean>(STORAGE_KEYS.soundEnabled, true),
  );
  const [autoAdvance, setAutoAdvance] = useState<boolean>(() =>
    loadJson<boolean>(STORAGE_KEYS.autoAdvance, true),
  );
  const [completedTeachingBlocks, setCompletedTeachingBlocks] = useState<number>(() => {
    const saved = loadJson<{ date: string; count: number } | null>(
      STORAGE_KEYS.completedBlocks,
      null,
    );
    return saved && saved.date === toDateKey(new Date()) ? saved.count : 0;
  });

  // Single distinct 1-minute warning alert state
  const [activeAlert, setActiveAlert] = useState<AlertRecord | null>(null);
  const [alertLog, setAlertLog] = useState<AlertRecord[]>([]);

  // Planner data
  const [appointments, setAppointments] = useState<Appointment[]>(() =>
    loadJson<Appointment[]>(STORAGE_KEYS.appointments, getInitialAppointments(toDateKey(new Date()))),
  );
  const [todos, setTodos] = useState<TodoItem[]>(() =>
    loadJson<TodoItem[]>(STORAGE_KEYS.todos, getInitialTodos(toDateKey(new Date()))),
  );

  // Wall-clock refs to guarantee drift-free countdown and exactly one alert per session
  const endTimeMsRef = useRef<number | null>(null);
  const alertFiredRef = useRef<boolean>(false);
  const phaseRef = useRef<SessionPhase>(phase);
  const blockNumberRef = useRef<number>(blockNumber);
  const soundEnabledRef = useRef<boolean>(soundEnabled);
  const autoAdvanceRef = useRef<boolean>(autoAdvance);

  phaseRef.current = phase;
  blockNumberRef.current = blockNumber;
  soundEnabledRef.current = soundEnabled;
  autoAdvanceRef.current = autoAdvance;

  // Persist planner data and settings
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.appointments, JSON.stringify(appointments));
    } catch {
      // Ignore storage quota errors
    }
  }, [appointments]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.todos, JSON.stringify(todos));
    } catch {
      // Ignore storage quota errors
    }
  }, [todos]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.completedBlocks,
        JSON.stringify({ date: todayKey, count: completedTeachingBlocks }),
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [completedTeachingBlocks, todayKey]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.soundEnabled, JSON.stringify(soundEnabled));
    } catch {
      // Ignore storage quota errors
    }
  }, [soundEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.autoAdvance, JSON.stringify(autoAdvance));
    } catch {
      // Ignore storage quota errors
    }
  }, [autoAdvance]);

  const emitOneMinuteAlert = useCallback(
    (targetPhase: SessionPhase, targetBlock: number, isPreview = false) => {
      const message =
        targetPhase === 'teaching'
          ? `1 minute left in Teaching Block ${targetBlock} — prepare to wrap up for a 5-minute break.`
          : `1 minute left in Break ${targetBlock} — Teaching Block ${targetBlock + 1} starts next.`;

      const record: AlertRecord = {
        id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        phase: targetPhase,
        blockNumber: targetBlock,
        firedAt: formatCurrentClock(),
        message,
        isPreview,
      };

      setActiveAlert(record);
      setAlertLog((prev) => [record, ...prev]);

      if (soundEnabledRef.current) {
        playAlertChime(targetPhase);
      }
    },
    [],
  );

  // Sync browser document title with live countdown while running
  useEffect(() => {
    if (isRunning) {
      const prefix = phase === 'teaching' ? `Teach ${blockNumber}` : `Break ${blockNumber}`;
      document.title = `${formatCountdown(secondsRemaining)} · ${prefix} — Cadence`;
    } else {
      document.title = 'Cadence — Atomic Schedule Manager & Daily Planner';
    }
  }, [isRunning, secondsRemaining, phase, blockNumber]);

  // Drift-free timer ticker
  useEffect(() => {
    if (!isRunning) {
      endTimeMsRef.current = null;
      return;
    }

    if (endTimeMsRef.current === null) {
      endTimeMsRef.current = Date.now() + secondsRemaining * 1000;
    }

    const tick = () => {
      if (endTimeMsRef.current === null) return;
      const msLeft = endTimeMsRef.current - Date.now();
      const nextSeconds = Math.max(0, Math.ceil(msLeft / 1000));

      setSecondsRemaining(nextSeconds);

      // Fire a single distinct alert at exactly 1 minute (60s) remaining
      if (
        nextSeconds <= WARNING_THRESHOLD_SECONDS &&
        nextSeconds > 0 &&
        !alertFiredRef.current
      ) {
        alertFiredRef.current = true;
        emitOneMinuteAlert(phaseRef.current, blockNumberRef.current, false);
      }

      // Session complete: transition cleanly to the next phase
      if (nextSeconds === 0) {
        const finishedPhase = phaseRef.current;
        const currentBlock = blockNumberRef.current;
        const nextPhase: SessionPhase = finishedPhase === 'teaching' ? 'break' : 'teaching';
        const nextBlock = finishedPhase === 'teaching' ? currentBlock : currentBlock + 1;
        const nextDuration =
          nextPhase === 'teaching' ? TEACHING_DURATION_SECONDS : BREAK_DURATION_SECONDS;

        if (finishedPhase === 'teaching') {
          setCompletedTeachingBlocks((c) => c + 1);
        }

        alertFiredRef.current = false;
        setPhase(nextPhase);
        setBlockNumber(nextBlock);
        setSecondsRemaining(nextDuration);
        setActiveAlert(null);

        if (autoAdvanceRef.current) {
          endTimeMsRef.current = Date.now() + nextDuration * 1000;
        } else {
          endTimeMsRef.current = null;
          setIsRunning(false);
        }
      }
    };

    const intervalId = window.setInterval(tick, 250);
    return () => window.clearInterval(intervalId);
  }, [isRunning, emitOneMinuteAlert]);

  const handleToggleRun = () => {
    if (isRunning) {
      setIsRunning(false);
      endTimeMsRef.current = null;
    } else {
      endTimeMsRef.current = Date.now() + secondsRemaining * 1000;
      setIsRunning(true);
    }
  };

  const handleReset = () => {
    const duration = phase === 'teaching' ? TEACHING_DURATION_SECONDS : BREAK_DURATION_SECONDS;
    setIsRunning(false);
    endTimeMsRef.current = null;
    alertFiredRef.current = false;
    setSecondsRemaining(duration);
    setActiveAlert(null);
  };

  const handleSkipNext = () => {
    const nextPhase: SessionPhase = phase === 'teaching' ? 'break' : 'teaching';
    const nextBlock = phase === 'teaching' ? blockNumber : blockNumber + 1;
    const nextDuration =
      nextPhase === 'teaching' ? TEACHING_DURATION_SECONDS : BREAK_DURATION_SECONDS;

    setIsRunning(false);
    endTimeMsRef.current = null;
    alertFiredRef.current = false;
    setPhase(nextPhase);
    setBlockNumber(nextBlock);
    setSecondsRemaining(nextDuration);
    setActiveAlert(null);
  };

  const handleSwitchPhase = (targetPhase: SessionPhase) => {
    if (targetPhase === phase) return;
    const duration =
      targetPhase === 'teaching' ? TEACHING_DURATION_SECONDS : BREAK_DURATION_SECONDS;
    setIsRunning(false);
    endTimeMsRef.current = null;
    alertFiredRef.current = false;
    setPhase(targetPhase);
    setSecondsRemaining(duration);
    setActiveAlert(null);
  };

  const handleAddAppointment = (data: Omit<Appointment, 'id'>) => {
    const created: Appointment = {
      ...data,
      id: `apt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setAppointments((prev) => [...prev, created]);
  };

  const handleDeleteAppointment = (id: string) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAddTodo = (data: Omit<TodoItem, 'id'>) => {
    const created: TodoItem = {
      ...data,
      id: `todo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setTodos((prev) => [...prev, created]);
  };

  const handleToggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );
  };

  const handleDeleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const handleQuickAddFromWeek = (dateKey: string) => {
    setSelectedDate(dateKey);
    setActiveNav('appointments');
    setPendingAddAppointment(true);
  };

  const navItems: { id: NavSection; label: string; icon: typeof Clock }[] = [
    { id: 'today', label: 'Today & Timer', icon: Clock },
    { id: 'appointments', label: 'Appointments', icon: CalendarDays },
    { id: 'todos', label: 'Daily To-Dos', icon: CheckSquare },
    { id: 'week', label: 'Weekly Agenda', icon: LayoutGrid },
  ];

  const activeBreadcrumb =
    activeNav === 'today'
      ? 'Today & Timer'
      : activeNav === 'appointments'
        ? 'Appointments'
        : activeNav === 'todos'
          ? 'Daily To-Dos'
          : 'Weekly Agenda';

  const dayAppointmentsCount = appointments.filter((a) => a.date === selectedDate).length;
  const dayOpenTodosCount = todos.filter((t) => t.date === selectedDate && !t.completed).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-white border-r border-slate-200">
        <div className="h-16 px-6 flex items-center border-b border-slate-200">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            Cadence
          </span>
        </div>

        <nav className="p-4 flex-1 space-y-1" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Compact timer strip in sidebar when navigating away from timer view */}
        {activeNav !== 'today' && (
          <div className="p-4 border-t border-slate-200">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-medium text-slate-900">
                  {phase === 'teaching' ? `Block ${blockNumber}` : `Break ${blockNumber}`}
                </span>
                <span>{isRunning ? 'Running' : 'Paused'}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="font-mono tabular-nums text-2xl font-semibold text-slate-900">
                  {formatCountdown(secondsRemaining)}
                </span>
                <button
                  type="button"
                  onClick={handleToggleRun}
                  aria-label={isRunning ? 'Pause timer' : 'Start timer'}
                  className="p-2 text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
                >
                  {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-64 max-w-[80vw] bg-white h-full border-r border-slate-200 flex flex-col z-10">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
              <span className="font-display text-lg font-bold tracking-tight text-slate-900">
                Cadence
              </span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 text-slate-500 hover:text-slate-900 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveNav(item.id);
                      setMobileNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb on left, primary timer action on right */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-md"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-400 hidden sm:inline">Schedule</span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">/</span>
              <h1 className="font-semibold text-slate-900 truncate">{activeBreadcrumb}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden md:inline font-mono tabular-nums text-xs text-slate-500">
              {phase === 'teaching' ? `Block ${blockNumber}` : `Break ${blockNumber}`} ·{' '}
              {formatCountdown(secondsRemaining)}
            </span>

            <button
              type="button"
              onClick={handleToggleRun}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isRunning ? 'Pause Session' : 'Start Session'}</span>
            </button>
          </div>
        </header>

        {/* Distinct Single One-Minute Warning Alert Banner */}
        {activeAlert && (
          <div
            role="alert"
            aria-live="assertive"
            className="bg-amber-50 border-b border-amber-300 px-4 sm:px-6 lg:px-8 py-3.5"
          >
            <div className="max-w-6xl mx-auto flex items-start sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-950">
                    One-Minute Session Alert
                    <span className="font-mono tabular-nums font-normal text-amber-800 ml-2 text-xs">
                      {activeAlert.firedAt}
                      {activeAlert.isPreview ? ' · Preview' : ''}
                    </span>
                  </p>
                  <p className="text-sm text-amber-900 mt-0.5">{activeAlert.message}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveAlert(null)}
                className="px-3 py-1.5 text-xs font-medium text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Workspace Viewport */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Contextual Day Bar (on Today, Appointments, and To-Dos views) */}
            {activeNav !== 'week' && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-900 tracking-tight">
                    {formatLongDate(selectedDate)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                    {selectedDate === todayKey ? 'Today' : selectedDate} · {dayAppointmentsCount}{' '}
                    {dayAppointmentsCount === 1 ? 'appointment' : 'appointments'} ·{' '}
                    {dayOpenTodosCount} open {dayOpenTodosCount === 1 ? 'task' : 'tasks'}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedDate((d) => addDays(d, -1))}
                    aria-label="Previous day"
                    className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(todayKey)}
                    className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDate((d) => addDays(d, 1))}
                    aria-label="Next day"
                    className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* View: Today & Timer */}
            {activeNav === 'today' && (
              <div className="space-y-6">
                <AtomicTimer
                  phase={phase}
                  blockNumber={blockNumber}
                  secondsRemaining={secondsRemaining}
                  isRunning={isRunning}
                  soundEnabled={soundEnabled}
                  autoAdvance={autoAdvance}
                  completedTeachingBlocks={completedTeachingBlocks}
                  alertLog={alertLog}
                  onToggleRun={handleToggleRun}
                  onReset={handleReset}
                  onSkipNext={handleSkipNext}
                  onSwitchPhase={handleSwitchPhase}
                  onToggleSound={() => setSoundEnabled((s) => !s)}
                  onToggleAutoAdvance={() => setAutoAdvance((a) => !a)}
                  onTestAlert={() => emitOneMinuteAlert(phase, blockNumber, true)}
                  onClearLog={() => setAlertLog([])}
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  <AppointmentsPanel
                    selectedDate={selectedDate}
                    appointments={appointments}
                    onAddAppointment={handleAddAppointment}
                    onDeleteAppointment={handleDeleteAppointment}
                  />
                  <TodoPanel
                    selectedDate={selectedDate}
                    todos={todos}
                    onAddTodo={handleAddTodo}
                    onToggleTodo={handleToggleTodo}
                    onDeleteTodo={handleDeleteTodo}
                  />
                </div>
              </div>
            )}

            {/* View: Appointments */}
            {activeNav === 'appointments' && (
              <AppointmentsPanel
                selectedDate={selectedDate}
                appointments={appointments}
                showAllDates
                isAddModalOpen={pendingAddAppointment}
                onCloseAddModal={() => setPendingAddAppointment(false)}
                onAddAppointment={handleAddAppointment}
                onDeleteAppointment={handleDeleteAppointment}
                onSelectDate={(dateKey) => {
                  setSelectedDate(dateKey);
                  setActiveNav('today');
                }}
              />
            )}

            {/* View: Daily To-Dos */}
            {activeNav === 'todos' && (
              <TodoPanel
                selectedDate={selectedDate}
                todos={todos}
                showAllDates
                onAddTodo={handleAddTodo}
                onToggleTodo={handleToggleTodo}
                onDeleteTodo={handleDeleteTodo}
              />
            )}

            {/* View: Weekly Agenda */}
            {activeNav === 'week' && (
              <WeeklyAgenda
                todayKey={todayKey}
                selectedDate={selectedDate}
                appointments={appointments}
                todos={todos}
                onSelectDate={(dateKey) => setSelectedDate(dateKey)}
                onQuickAddAppointment={handleQuickAddFromWeek}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
