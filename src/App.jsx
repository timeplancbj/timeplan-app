import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
import {
  Activity, AlarmClock, ArrowLeft, ArrowRight, BarChart3, CalendarDays,
  Check, CheckCircle2, ChevronLeft, ChevronRight, Circle, Clock3, Flame,
  Home, ListTodo, Menu, MoreHorizontal, Pause, Pencil, Play, Plus, RotateCcw,
  Search, Settings2, Sparkles, Target, Trash2, X
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";

const STORAGE = { tasks: "timeplan.tasks.v2", sessions: "timeplan.sessions.v2" };
const CATEGORIES = [
  { id: "personal", label: "Personal", color: "#E7A23B" },
  { id: "estudio", label: "Estudio", color: "#7657D8" },
  { id: "trabajo", label: "Trabajo", color: "#20A99A" },
  { id: "salud", label: "Salud", color: "#E4778B" }
];
const NAV = [
  { id: "home", label: "Resumen", icon: Home },
  { id: "tasks", label: "Mis tareas", icon: ListTodo },
  { id: "calendar", label: "Calendario", icon: CalendarDays },
  { id: "focus", label: "Enfoque", icon: Target },
  { id: "stats", label: "Estadísticas", icon: BarChart3 }
];
const today = () => dateKey(new Date());
function dateKey(date) {
  const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, "0"), d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function parseDate(value) { const [y,m,d] = value.split("-").map(Number); return new Date(y, m - 1, d); }
function readStorage(key, fallback) {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
  catch { return fallback; }
}
function makeInitialTasks() {
  const d = today();
  return [
    { id: "seed-1", title: "Organizar las prioridades del día", category: "personal", date: d, time: "08:30", done: true, completedAt: new Date().toISOString() },
    { id: "seed-2", title: "Repasar contenidos pendientes", category: "estudio", date: d, time: "10:00", done: false, completedAt: null },
    { id: "seed-3", title: "Avanzar en el proyecto", category: "trabajo", date: d, time: "14:00", done: false, completedAt: null }
  ];
}
function formatLong(date) {
  return new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long" }).format(date);
}
function sameDay(a,b) { return a === b; }
function category(id) { return CATEGORIES.find(c => c.id === id) || CATEGORIES[0]; }

function TimePlanWorkspace({ user, supabase, onSignOut }) {
  const [tasks, setTasks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [dataReady, setDataReady] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [tab, setTab] = useState("home");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today());
  const [editor, setEditor] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [duration, setDuration] = useState(25);
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadUserData() {
      setDataReady(false);
      setSyncError("");
      const [taskResult, sessionResult] = await Promise.all([
        supabase.from("tasks").select("*").eq("user_id", user.id),
        supabase.from("focus_sessions").select("*").eq("user_id", user.id)
      ]);
      if (taskResult.error || sessionResult.error) {
        if (active) setSyncError("No se pudieron cargar tus datos. Comprueba tu conexión e inténtalo de nuevo.");
        if (active) setDataReady(true);
        return;
      }
      let remoteTasks = taskResult.data || [];
      let remoteSessions = sessionResult.data || [];
      const importedKey = "timeplan.legacyImported.v1";
      if (!localStorage.getItem(importedKey)) {
        const legacyTasks = readStorage(STORAGE.tasks, []);
        const legacySessions = readStorage(STORAGE.sessions, []);
        if (remoteTasks.length === 0 && remoteSessions.length === 0 && (legacyTasks.length || legacySessions.length)) {
          const taskRows = legacyTasks.map(t => ({
            user_id: user.id, id: String(t.id), title: t.title, category: t.category,
            date: t.date, time: t.time || null, done: !!t.done, completed_at: t.completedAt || null
          }));
          const sessionRows = legacySessions.map(s => ({
            user_id: user.id, id: String(s.id), date: s.date, minutes: s.minutes, completed_at: s.completedAt || null
          }));
          const writes = await Promise.all([
            taskRows.length ? supabase.from("tasks").upsert(taskRows, { onConflict: "user_id,id" }) : Promise.resolve({error:null}),
            sessionRows.length ? supabase.from("focus_sessions").upsert(sessionRows, { onConflict: "user_id,id" }) : Promise.resolve({error:null})
          ]);
          if (!writes.some(w => w.error)) {
            remoteTasks = taskRows;
            remoteSessions = sessionRows;
          } else {
            setSyncError("No se pudieron importar los datos anteriores; tus datos locales siguen intactos.");
          }
        }
        localStorage.setItem(importedKey, "true");
      }
      if (active) {
        setTasks(remoteTasks.map(t => ({
          id: t.id, title: t.title, category: t.category, date: t.date,
          time: t.time || "", done: !!t.done, completedAt: t.completed_at
        })));
        setSessions(remoteSessions.map(s => ({
          id: s.id, date: s.date, minutes: s.minutes, completedAt: s.completed_at
        })));
        setDataReady(true);
      }
    }
    loadUserData();
    return () => { active = false; };
  }, [user.id, supabase]);

  useEffect(() => {
    if (!dataReady) return;
    localStorage.setItem(STORAGE.tasks, JSON.stringify(tasks));
    const rows = tasks.map(t => ({
      user_id: user.id, id: String(t.id), title: t.title, category: t.category,
      date: t.date, time: t.time || null, done: !!t.done, completed_at: t.completedAt || null
    }));
    if (rows.length) supabase.from("tasks").upsert(rows, { onConflict: "user_id,id" }).then(({error}) => {
      if (error) setSyncError("No se pudieron sincronizar algunos cambios. Revisa tu conexión.");
    });
  }, [tasks, dataReady, user.id, supabase]);

  useEffect(() => {
    if (!dataReady) return;
    localStorage.setItem(STORAGE.sessions, JSON.stringify(sessions));
    const rows = sessions.map(s => ({
      user_id: user.id, id: String(s.id), date: s.date, minutes: s.minutes, completed_at: s.completedAt || null
    }));
    if (rows.length) supabase.from("focus_sessions").upsert(rows, { onConflict: "user_id,id" }).then(({error}) => {
      if (error) setSyncError("No se pudieron sincronizar tus sesiones.");
    });
  }, [sessions, dataReady, user.id, supabase]);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (running && seconds === 0) {
      setRunning(false);
      setSessions(old => [...old, { id: Date.now(), date: today(), minutes: duration, completedAt: new Date().toISOString() }]);
      setSeconds(duration * 60);
    }
  }, [running, seconds, duration]);

  const todayTasks = tasks.filter(t => t.date === today());
  const completedToday = todayTasks.filter(t => t.done).length;
  const pendingToday = todayTasks.filter(t => !t.done).length;
  const nextTask = todayTasks.filter(t => !t.done && t.time).sort((a,b) => a.time.localeCompare(b.time))[0];
  const visibleTasks = useMemo(() => tasks.filter(t => {
    const matchesText = t.title.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es"));
    const matchesFilter = filter === "all" || (filter === "pending" ? !t.done : filter === "done" ? t.done : t.category === filter);
    return matchesText && matchesFilter;
  }).sort((a,b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || "")), [tasks, query, filter]);

  function saveTask(data) {
    if (editor?.id) setTasks(old => old.map(t => t.id === editor.id ? { ...t, ...data } : t));
    else setTasks(old => [...old, { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), ...data, done: false, completedAt: null }]);
    setEditor(null);
  }
  function toggleTask(id) {
    setTasks(old => old.map(t => t.id === id ? { ...t, done: !t.done, completedAt: !t.done ? new Date().toISOString() : null } : t));
  }
  function deleteTask(id) {
    if (window.confirm("¿Eliminar esta tarea?")) {
      supabase.from("tasks").delete().eq("user_id", user.id).eq("id", String(id)).then(({error}) => {
        if (error) setSyncError("No se pudo eliminar la tarea de la nube.");
      });
      setTasks(old => old.filter(t => t.id !== id));
    }
  }
  function changeTab(id) { setTab(id); setMenuOpen(false); }
  function resetTimer() { setRunning(false); setSeconds(duration * 60); }
  function changeDuration(value) { const next = Number(value); setDuration(next); setSeconds(next * 60); setRunning(false); }

  const title = NAV.find(n => n.id === tab)?.label || "TimePlan";
  if (!dataReady) return <div className="auth-loading">Cargando tu espacio TimePlan…</div>;
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Clock3 size={20}/></span><span>Time<span>Plan</span></span></div>
      <div className="side-caption">ESPACIO DE TRABAJO</div>
      <nav className="side-nav" aria-label="Navegación principal">
        {NAV.map(({id,label,icon:Icon}) => <button key={id} className={tab === id ? "nav-item active" : "nav-item"} onClick={() => changeTab(id)}><Icon size={19}/><span>{label}</span>{id === "tasks" && pendingToday > 0 && <small>{pendingToday}</small>}</button>)}
      </nav>
      <div className="sidebar-bottom"><div className="tip-card"><Sparkles size={18}/><b>Un paso a la vez</b><p>Organiza tu tiempo y avanza a tu ritmo.</p></div><span className="version">TIMEPLAN · TU ESPACIO PERSONAL</span></div>
    </aside>

    <div className="main-column">
      <header className="topbar">
        <button className="mobile-brand" onClick={() => changeTab("home")}><span className="brand-mark"><Clock3 size={18}/></span>TimePlan</button>
        <div className="breadcrumb"><span>Workspace</span><ChevronRight size={15}/><b>{title}</b></div>
        <div className="topbar-actions"><span className="today-label">{formatLong(new Date())}</span><button className="icon-button mobile-menu-button" aria-label="Abrir menú" onClick={() => setMenuOpen(v => !v)}><Menu size={19}/></button><button className="avatar" aria-label="Perfil">T</button></div>
      </header>
      {menuOpen && <div className="mobile-menu">{NAV.map(({id,label,icon:Icon}) => <button key={id} onClick={() => changeTab(id)}><Icon size={17}/>{label}</button>)}</div>}
      <main className="content">
        <div className="account-strip"><span>{user.email}</span><button onClick={onSignOut}>Cerrar sesión</button></div>{syncError && <div className="sync-warning" role="status">{syncError}</div>}
        {tab === "home" && <Dashboard tasks={tasks} todayTasks={todayTasks} completedToday={completedToday} pendingToday={pendingToday} nextTask={nextTask} sessions={sessions} onNavigate={changeTab} onToggle={toggleTask} onAdd={() => setEditor({})} onEdit={t => setEditor(t)}/>}
        {tab === "tasks" && <TasksPage tasks={visibleTasks} query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} onAdd={() => setEditor({})} onToggle={toggleTask} onEdit={t => setEditor(t)} onDelete={deleteTask}/>}
        {tab === "calendar" && <CalendarPage tasks={tasks} month={month} setMonth={setMonth} selectedDate={selectedDate} setSelectedDate={setSelectedDate} onAdd={() => setEditor({ date: selectedDate })} onToggle={toggleTask} onEdit={t => setEditor(t)}/>}
        {tab === "focus" && <FocusPage duration={duration} seconds={seconds} running={running} sessions={sessions.filter(s => s.date === today())} onDuration={changeDuration} onToggle={() => setRunning(v => !v)} onReset={resetTimer}/>}
        {tab === "stats" && <StatsPage tasks={tasks} sessions={sessions}/>}
      </main>
    </div>
    <nav className="mobile-nav" aria-label="Navegación inferior">{NAV.map(({id,label,icon:Icon}) => <button key={id} onClick={() => changeTab(id)} className={tab === id ? "mobile-nav-item active" : "mobile-nav-item"}><Icon size={20}/><span>{label}</span></button>)}</nav>
    {editor && <TaskEditor task={editor.id ? editor : null} initialDate={editor.date || today()} onClose={() => setEditor(null)} onSave={saveTask}/>}
  </div>;
}


export default function TimePlanPrototype() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(() => typeof window !== "undefined" && window.location.hash.includes("type=recovery"));
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({data}) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);
  if (!supabase) return <div className="auth-page"><div className="auth-card"><div className="auth-logo">◷</div><h1>TimePlan</h1><p>La conexión con la nube todavía no está configurada.</p><small>Faltan las variables de entorno de Supabase en el despliegue.</small></div></div>;
  if (loading) return <div className="auth-loading">Preparando TimePlan…</div>;
  if (recovery) return <AuthScreen supabase={supabase} mode="recovery" onRecoveryDone={() => { setRecovery(false); window.history.replaceState({}, document.title, window.location.pathname); }} />;
  if (!session) return <AuthScreen supabase={supabase} />;
  return <TimePlanWorkspace user={session.user} supabase={supabase} onSignOut={() => supabase.auth.signOut()} />;
}

function AuthScreen({ supabase, mode: initialMode = "login", onRecoveryDone }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const recovery = mode === "recovery";
  const titles = { login: "Bienvenido de nuevo", signup: "Crea tu cuenta", forgot: "Recupera tu contraseña", recovery: "Nueva contraseña" };
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    let result;
    if (mode === "signup") result = await supabase.auth.signUp({ email, password });
    else if (mode === "login") result = await supabase.auth.signInWithPassword({ email, password });
    else if (mode === "forgot") result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    else result = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (result.error) setError(result.error.message);
    else if (mode === "signup") setMessage("Revisa tu correo para confirmar la cuenta y comenzar a usar TimePlan.");
    else if (mode === "forgot") setMessage("Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.");
    else if (recovery) { setMessage("Contraseña actualizada correctamente."); onRecoveryDone?.(); }
  }
  async function google() {
    setBusy(true); setError("");
    const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    if (oauthError) { setError(oauthError.message); setBusy(false); }
  }
  return <div className="auth-page"><section className="auth-card">
    <div className="auth-logo">◷</div><div className="auth-eyebrow">TU ESPACIO PERSONAL</div><h1>TimePlan</h1><h2>{titles[mode]}</h2>
    <p className="auth-description">{recovery ? "Elige una contraseña nueva para proteger tu cuenta." : mode === "forgot" ? "Te enviaremos un enlace seguro a tu correo." : "Organiza tus tareas, calendario y sesiones desde cualquier dispositivo."}</p>
    <form onSubmit={submit}>
      <label className="auth-label">Correo electrónico<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@correo.com" disabled={recovery}/></label>
      {mode !== "forgot" && <label className="auth-label">{recovery ? "Nueva contraseña" : "Contraseña"}<input type="password" required minLength={6} autoComplete={recovery ? "new-password" : mode === "signup" ? "new-password" : "current-password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo 6 caracteres"/></label>}
      {error && <div className="auth-error">{error}</div>}{message && <div className="auth-message">{message}</div>}
      <button className="auth-submit" disabled={busy}>{busy ? "Un momento…" : recovery ? "Guardar contraseña" : mode === "signup" ? "Crear cuenta" : mode === "forgot" ? "Enviar enlace" : "Iniciar sesión"}</button>
    </form>
    {mode === "login" && <><button className="auth-google" onClick={google} disabled={busy}><b>G</b> Continuar con Google</button><button className="auth-link" onClick={()=>{setMode("forgot");setError("");setMessage("");}}>¿Olvidaste tu contraseña?</button></>}
    {!recovery && <div className="auth-switch">{mode === "login" ? "¿Todavía no tienes cuenta?" : mode === "signup" ? "¿Ya tienes una cuenta?" : "¿Recordaste tu contraseña?"} <button onClick={()=>{setMode(mode === "login" ? "signup" : "login");setError("");setMessage("");}}>{mode === "login" ? "Regístrate" : "Inicia sesión"}</button></div>}
  </section></div>;
}

function PageHeading({ eyebrow, title, description, action }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>;
}
function MetricCard({ icon: Icon, label, value, note, tone = "purple" }) {
  return <div className={`metric-card tone-${tone}`}><div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={18}/></span></div><strong>{value}</strong><small>{note}</small></div>;
}
function TaskLine({ task, onToggle, onEdit, onDelete, compact = false }) {
  const cat = category(task.category);
  return <div className={compact ? "task-line compact" : "task-line"}>
    <button className={task.done ? "check-control checked" : "check-control"} aria-label={task.done ? "Marcar pendiente" : "Marcar completada"} onClick={() => onToggle(task.id)}>{task.done && <Check size={14}/>}</button>
    <button className="task-main" onClick={() => onEdit(task)}><span className={task.done ? "task-title done" : "task-title"}>{task.title}</span><span className="task-meta">{task.time || "Sin hora"} <i/> {cat.label}</span></button>
    <span className="category-dot" style={{ background: cat.color }} />
    {!compact && <div className="task-actions"><button aria-label="Editar tarea" onClick={() => onEdit(task)}><Pencil size={15}/></button>{onDelete && <button aria-label="Eliminar tarea" onClick={() => onDelete(task.id)}><Trash2 size={15}/></button>}</div>}
  </div>;
}
function Dashboard({ tasks, todayTasks, completedToday, pendingToday, nextTask, sessions, onNavigate, onToggle, onAdd, onEdit }) {
  const firstName = "¡Hola!";
  const progress = todayTasks.length ? Math.round(completedToday / todayTasks.length * 100) : 0;
  const upcoming = todayTasks.filter(t => !t.done).sort((a,b) => (a.time || "99:99").localeCompare(b.time || "99:99")).slice(0,4);
  return <>
    <PageHeading eyebrow={formatLong(new Date()).toUpperCase()} title={firstName} description="Este es tu espacio para organizar el día y cuidar tu tiempo." action={<button className="button primary" onClick={onAdd}><Plus size={17}/> Nueva tarea</button>}/>
    <section className="welcome-banner"><div><span className="banner-kicker"><Sparkles size={14}/> TU DÍA, A TU RITMO</span><h2>Pequeños avances, grandes resultados.</h2><p>Concéntrate en lo importante. Lo demás puede esperar.</p><button className="banner-button" onClick={() => onNavigate("focus")}>Iniciar enfoque <ArrowRight size={16}/></button></div><div className="banner-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-clock"><Clock3 size={42}/></div><span className="art-star star-one">✦</span><span className="art-star star-two">✧</span></div></section>
    <div className="metrics-grid"><MetricCard icon={ListTodo} label="Pendientes de hoy" value={pendingToday} note={pendingToday === 1 ? "Tarea por completar" : "Tareas por completar"} tone="purple"/><MetricCard icon={CheckCircle2} label="Completadas hoy" value={completedToday} note={`${progress}% de tu lista diaria`} tone="teal"/><MetricCard icon={AlarmClock} label="Sesiones de enfoque" value={sessions.filter(s => s.date === today()).length} note="Sesiones completadas hoy" tone="orange"/></div>
    <div className="dashboard-grid"><section className="panel task-panel"><div className="panel-heading"><div><h3>Lo que sigue</h3><p>Tus próximas tareas pendientes</p></div><button className="text-button" onClick={() => onNavigate("tasks")}>Ver todas <ArrowRight size={15}/></button></div>{upcoming.length ? upcoming.map(t => <TaskLine key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} compact/>) : <EmptyState title="Todo al día" text="No tienes tareas pendientes para hoy."/>}</section><section className="panel progress-panel"><div className="panel-heading"><div><h3>Tu progreso</h3><p>Así va tu día</p></div><Activity size={18} className="muted-icon"/></div><div className="progress-ring-wrap"><ProgressRing value={progress}/><div><strong>{progress}%</strong><span>completado</span></div></div><div className="progress-foot"><span>{completedToday} completadas</span><span>{pendingToday} pendientes</span></div><div className="progress-track"><span style={{ width: `${progress}%` }}/></div><button className="subtle-button full" onClick={() => onNavigate("stats")}>Ver estadísticas <ArrowRight size={15}/></button></section></div>
    <section className="panel all-task-panel"><div className="panel-heading"><div><h3>Agenda de hoy</h3><p>{formatLong(new Date())}</p></div><button className="icon-button" aria-label="Agregar tarea" onClick={onAdd}><Plus size={18}/></button></div>{todayTasks.length ? todayTasks.slice().sort((a,b) => (a.time || "").localeCompare(b.time || "")).map(t => <TaskLine key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} compact/>) : <EmptyState title="Tu agenda está despejada" text="Agrega una tarea para empezar a planificar."/>}</section>
  </>;
}
function ProgressRing({ value }) {
  const radius = 43, circumference = 2 * Math.PI * radius;
  return <svg className="progress-ring" viewBox="0 0 110 110" role="img" aria-label={`${value}% completado`}><circle cx="55" cy="55" r={radius} className="ring-bg"/><circle cx="55" cy="55" r={radius} className="ring-value" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)}/></svg>;
}
function TasksPage({ tasks, query, setQuery, filter, setFilter, onAdd, onToggle, onEdit, onDelete }) {
  const pending = tasks.filter(t => !t.done).length, done = tasks.filter(t => t.done).length;
  return <><PageHeading eyebrow="ORGANIZA Y AVANZA" title="Mis tareas" description="Todo lo que tienes por hacer, en un solo lugar." action={<button className="button primary" onClick={onAdd}><Plus size={17}/> Nueva tarea</button>}/><div className="task-toolbar"><label className="search-box"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar tareas..." /></label><select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)} aria-label="Filtrar tareas"><option value="all">Todas las tareas</option><option value="pending">Pendientes</option><option value="done">Completadas</option>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div><div className="task-summary"><span>{tasks.length} tareas</span><span>{pending} pendientes</span><span>{done} completadas</span></div><section className="panel task-list-panel">{tasks.length ? tasks.map(t => <TaskLine key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete}/>) : <EmptyState title="No encontramos tareas" text="Prueba con otro filtro o crea una tarea nueva."/>}</section></>;
}
function CalendarPage({ tasks, month, setMonth, selectedDate, setSelectedDate, onAdd, onToggle, onEdit }) {
  const year = month.getFullYear(), monthIndex = month.getMonth();
  const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const selectedTasks = tasks.filter(t => t.date === selectedDate).sort((a,b) => (a.time || "").localeCompare(b.time || ""));
  const monthLabel = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" }).format(month);
  const monthTasks = tasks.filter(t => t.date.startsWith(`${year}-${String(monthIndex+1).padStart(2,"0")}`));
  return <><PageHeading eyebrow="PLANIFICA TU TIEMPO" title="Calendario" description="Visualiza tus tareas y organiza tus días." action={<button className="button primary" onClick={onAdd}><Plus size={17}/> Nueva tarea</button>}/><div className="calendar-layout"><section className="panel calendar-panel"><div className="calendar-toolbar"><button className="icon-button" aria-label="Mes anterior" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}><ChevronLeft size={19}/></button><h3>{monthLabel}</h3><button className="icon-button" aria-label="Mes siguiente" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}><ChevronRight size={19}/></button><button className="today-button" onClick={() => {setMonth(new Date(new Date().getFullYear(),new Date().getMonth(),1));setSelectedDate(today());}}>Hoy</button></div><div className="calendar-grid">{["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(d => <span className="weekday" key={d}>{d}</span>)}{Array.from({length:firstWeekday},(_,i)=><span key={`empty-${i}`} />)}{Array.from({length:days},(_,i)=>i+1).map(day=>{const key=dateKey(new Date(year,monthIndex,day));const count=monthTasks.filter(t=>t.date===key).length;return <button key={day} onClick={()=>setSelectedDate(key)} className={`calendar-day ${selectedDate===key?"selected":""} ${today()===key?"is-today":""}`}><span>{day}</span>{count>0&&<i className="day-dots">{Array.from({length:Math.min(count,3)},(_,j)=><b key={j}/>)}</i>}</button>;})}</div></section><section className="panel selected-day-panel"><div className="panel-heading"><div><h3>{formatLong(parseDate(selectedDate))}</h3><p>{selectedTasks.length} {selectedTasks.length===1?"tarea":"tareas"} programadas</p></div><button className="icon-button" aria-label="Agregar tarea" onClick={onAdd}><Plus size={18}/></button></div>{selectedTasks.length?selectedTasks.map(t=><TaskLine key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} compact/>):<EmptyState title="Día libre" text="No hay tareas para esta fecha."/>}</section></div></>;
}
function FocusPage({ duration, seconds, running, sessions, onDuration, onToggle, onReset }) {
  const radius=92, circumference=2*Math.PI*radius, progress=1-seconds/(duration*60);
  const mm=String(Math.floor(seconds/60)).padStart(2,"0"), ss=String(seconds%60).padStart(2,"0");
  return <><PageHeading eyebrow="MODO CONCENTRACIÓN" title="Tiempo de enfoque" description="Dedica un momento a una sola cosa. Tú puedes."/><section className="panel focus-panel"><div className="focus-orbit"><svg viewBox="0 0 220 220"><circle cx="110" cy="110" r={radius} className="focus-track"/><circle cx="110" cy="110" r={radius} className="focus-progress" strokeDasharray={circumference} strokeDashoffset={circumference*(1-progress)}/></svg><div className="focus-time"><strong>{mm}:{ss}</strong><span>{running?"Mantén el ritmo":"Listo cuando tú estés"}</span></div></div><div className="focus-controls"><button className="button primary focus-start" onClick={onToggle}>{running?<Pause size={18}/>:<Play size={18}/>} {running?"Pausar":"Comenzar"}</button><button className="button secondary" onClick={onReset}><RotateCcw size={17}/> Reiniciar</button></div><div className="duration-picker"><span>Duración de sesión</span><div>{[15,25,45,60].map(n=><button key={n} onClick={()=>onDuration(n)} className={duration===n?"chosen":""} disabled={running}>{n} min</button>)}</div></div><div className="focus-session-count"><div><Target size={18}/><b>{sessions.length}</b><span>sesiones completadas hoy</span></div><div><Clock3 size={18}/><b>{sessions.reduce((sum,s)=>sum+s.minutes,0)} min</b><span>tiempo concentrado hoy</span></div></div></section></>;
}
function StatsPage({ tasks, sessions }) {
  const completed=tasks.filter(t=>t.done).length, pending=tasks.filter(t=>!t.done).length;
  const start=new Date(); start.setDate(start.getDate()-6);
  const chartData=Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);const key=dateKey(d);return {day:new Intl.DateTimeFormat("es-CL",{weekday:"short"}).format(d).replace(".",""),done:tasks.filter(t=>t.completedAt&&dateKey(new Date(t.completedAt))===key).length,minutes:sessions.filter(s=>s.date===key).reduce((sum,s)=>sum+s.minutes,0)};});
  const totalMinutes=sessions.reduce((sum,s)=>sum+s.minutes,0);
  return <><PageHeading eyebrow="MIRA TU AVANCE" title="Estadísticas" description="Un vistazo a todo lo que has ido logrando."/><div className="metrics-grid stats-metrics"><MetricCard icon={CheckCircle2} label="Tareas completadas" value={completed} note="En total" tone="teal"/><MetricCard icon={ListTodo} label="Tareas pendientes" value={pending} note="Por completar" tone="purple"/><MetricCard icon={Clock3} label="Tiempo de enfoque" value={totalMinutes>=60?`${Math.floor(totalMinutes/60)} h ${totalMinutes%60} min`:`${totalMinutes} min`} note="Sesiones registradas" tone="orange"/></div><section className="panel chart-panel"><div className="panel-heading"><div><h3>Actividad de los últimos 7 días</h3><p>Tareas que completaste cada día</p></div><span className="chart-legend"><i/> Tareas</span></div><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{top:8,right:8,left:-24,bottom:0}}><CartesianGrid vertical={false} stroke="#F0EEF7" strokeDasharray="4 4"/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:"#9691AE",fontSize:12}}/><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill:"#9691AE",fontSize:11}}/><Tooltip cursor={{fill:"#F5F2FC"}} contentStyle={{border:"1px solid #ECE9F5",borderRadius:12,fontSize:12}}/><Bar dataKey="done" name="Tareas completadas" fill="#7657D8" radius={[6,6,0,0]} maxBarSize={38}/></BarChart></ResponsiveContainer></div></section><section className="panel chart-panel"><div className="panel-heading"><div><h3>Minutos de concentración</h3><p>Sesiones completadas en los últimos 7 días</p></div><span className="chart-legend teal-legend"><i/> Minutos</span></div><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{top:8,right:8,left:-24,bottom:0}}><CartesianGrid vertical={false} stroke="#F0EEF7" strokeDasharray="4 4"/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:"#9691AE",fontSize:12}}/><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill:"#9691AE",fontSize:11}}/><Tooltip cursor={{fill:"#F5F2FC"}} contentStyle={{border:"1px solid #ECE9F5",borderRadius:12,fontSize:12}}/><Bar dataKey="minutes" name="Minutos" fill="#20B7A8" radius={[6,6,0,0]} maxBarSize={38}/></BarChart></ResponsiveContainer></div></section></>;
}
function EmptyState({ title, text }) { return <div className="empty-state"><span><Sparkles size={20}/></span><b>{title}</b><p>{text}</p></div>; }
function TaskEditor({ task, initialDate, onClose, onSave }) {
  const [title,setTitle]=useState(task?.title||"");
  const [cat,setCat]=useState(task?.category||"personal");
  const [date,setDate]=useState(task?.date||initialDate);
  const [time,setTime]=useState(task?.time||"09:00");
  const [error,setError]=useState("");
  function submit(e){e.preventDefault();if(!title.trim()){setError("Escribe un nombre para la tarea.");return;}onSave({title:title.trim(),category:cat,date,time});}
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><form className="task-modal" onSubmit={submit}><div className="modal-heading"><div><span className="eyebrow">{task?"ACTUALIZA TU PLAN":"NUEVA ACTIVIDAD"}</span><h2>{task?"Editar tarea":"Crear una tarea"}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={19}/></button></div><label className="form-label">¿Qué necesitas hacer?<input autoFocus value={title} onChange={e=>{setTitle(e.target.value);setError("");}} placeholder="Ej. Estudiar para la prueba" maxLength={100}/></label>{error&&<p className="form-error">{error}</p>}<label className="form-label">Categoría<select value={cat} onChange={e=>setCat(e.target.value)}>{CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label><div className="form-row"><label className="form-label">Fecha<input type="date" value={date} onChange={e=>setDate(e.target.value)} required/></label><label className="form-label">Hora<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label></div><div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary"><Check size={17}/>{task?"Guardar cambios":"Crear tarea"}</button></div></form></div>;
}
