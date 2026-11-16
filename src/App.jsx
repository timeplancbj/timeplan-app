import React, { useEffect, useState } from "react";
import { Clock, Home, CalendarDays, CheckSquare, Target, BarChart3, CheckCircle2, Circle, Play, Pause, RotateCcw, Plus } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from "recharts";

const violet = "#6C4BE0";
const ink = "#211B3D";
const tasksSeed = [
  { id: 1, time: "08:00", text: "Planificar el dia de hoy", category: "Personal", done: true },
  { id: 2, time: "09:30", text: "Repasar matematicas", category: "Estudio", done: true },
  { id: 3, time: "11:00", text: "Reunion de equipo", category: "Trabajo", done: false },
  { id: 4, time: "14:00", text: "Entregar informe semanal", category: "Trabajo", done: false },
  { id: 5, time: "17:30", text: "Actualizar el progreso", category: "Personal", done: false },
];
const week = [{ day: "L", hours: 3.5 }, { day: "M", hours: 4.8 }, { day: "X", hours: 2.1 }, { day: "J", hours: 5.2 }, { day: "V", hours: 4 }, { day: "S", hours: 1.5 }, { day: "D", hours: .8 }];
const events = { 12: ["09:00 · Clase de matematicas", "16:00 · Gimnasio"], 15: ["11:00 · Reunion de equipo"], 20: ["10:00 · Entrega de proyecto", "19:00 · Cena con amigos"], 27: ["08:30 · Clase de matematicas"] };
const tabs = [{ id: "home", label: "Inicio", icon: Home }, { id: "calendar", label: "Calendario", icon: CalendarDays }, { id: "tasks", label: "Tareas", icon: CheckSquare }, { id: "focus", label: "Enfoque", icon: Target }, { id: "stats", label: "Estadisticas", icon: BarChart3 }];

function Header({ title }) {
  return <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 20px 14px", color: ink, fontWeight: 800 }}><span style={{ background: violet, color: "white", borderRadius: 9, padding: 7 }}><Clock size={17}/></span>{title}</header>;
}
function Panel({ children }) { return <section style={{ background: "white", border: "1px solid #EFEDF7", borderRadius: 14, padding: 14, marginBottom: 12 }}>{children}</section>; }

export default function TimePlanPrototype() {
  const [tab, setTab] = useState("home");
  const [tasks, setTasks] = useState(tasksSeed);
  const [selectedDay, setSelectedDay] = useState(27);
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(3);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setSeconds(s => {
      if (s <= 1) { setRunning(false); setSessions(n => n + 1); return 25 * 60; }
      return s - 1;
    }), 1000);
    return () => clearInterval(timer);
  }, [running]);
  const pending = tasks.filter(t => !t.done).length;
  const toggle = id => setTasks(old => old.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const addTask = () => {
    const text = window.prompt("Que tarea quieres agregar?");
    if (text?.trim()) setTasks(old => [...old, { id: Date.now(), time: "--:--", text: text.trim(), category: "Personal", done: false }]);
  };
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const page = tab === "home" ? <>
    <div style={{ background: "linear-gradient(145deg,#6C4BE0,#4B37A8)", color: "white", padding: "28px 22px", borderRadius: "0 0 26px 26px" }}>
      <div style={{ opacity: .8, fontSize: 13 }}>Tu organizacion diaria</div><h1 style={{ margin: "8px 0", fontSize: 25 }}>¡Hola!</h1><p style={{ margin: 0 }}>Tu tiempo, tu plan, tu mejor version.</p>
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}><div style={{ flex: 1, background: "#ffffff25", padding: 13, borderRadius: 12 }}><b style={{ fontSize: 24 }}>{pending}</b><div style={{ fontSize: 12 }}>tareas pendientes</div></div><div style={{ flex: 1, background: "#ffffff25", padding: 13, borderRadius: 12 }}><b style={{ fontSize: 24 }}>11:00</b><div style={{ fontSize: 12 }}>proximo evento</div></div></div>
    </div>
    <div style={{ padding: 18 }}><h3 style={{ color: ink }}>Resumen de hoy</h3>{tasks.slice(0, 4).map(t => <TaskRow key={t.id} task={t} onToggle={toggle}/>)}</div>
  </> : tab === "tasks" ? <div style={{ padding: "0 18px" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><p style={{ color: "#8985A5", fontSize: 13 }}>{tasks.filter(t => t.done).length} de {tasks.length} completadas</p><button onClick={addTask} style={primaryButton}><Plus size={16}/></button></div>{tasks.map(t => <TaskRow key={t.id} task={t} onToggle={toggle}/>)}</div> : tab === "calendar" ? <div style={{ padding: "0 18px" }}><Panel><h3 style={{ textAlign: "center", color: ink }}>Julio 2026</h3><div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5 }}>{["L","M","X","J","V","S","D"].map(d => <b key={d} style={{ textAlign: "center", color: "#9995B2", fontSize: 12 }}>{d}</b>)}{Array.from({ length: 2 }, (_,i) => <span key={"blank"+i}/>)}{Array.from({ length: 31 }, (_,i) => i+1).map(d => <button key={d} onClick={() => setSelectedDay(d)} style={{ border: 0, borderRadius: 9, padding: 9, background: selectedDay === d ? violet : "#F7F6FC", color: selectedDay === d ? "white" : ink }}>{d}</button>)}</div></Panel><h3 style={{ color: ink }}>Eventos del {selectedDay} de julio</h3>{(events[selectedDay] || []).map(e => <Panel key={e}>{e}</Panel>)}{!events[selectedDay] && <p style={{ color: "#9995B2" }}>Sin eventos para este dia.</p>}</div> : tab === "focus" ? <div style={{ textAlign: "center", padding: 25 }}><h2 style={{ color: ink }}>Sesion de enfoque</h2><div style={{ fontSize: 52, fontWeight: 800, color: violet, margin: "30px 0" }}>{mm}:{ss}</div><button onClick={() => setRunning(v => !v)} style={roundButton}>{running ? <Pause/> : <Play/>}</button><button onClick={() => { setRunning(false); setSeconds(25*60); }} style={{ ...roundButton, background: "#EEEAFB", color: violet, marginLeft: 12 }}><RotateCcw/></button><p style={{ color: "#8985A5" }}>{sessions} sesiones hoy · Metodo Pomodoro 25 min</p></div> : <div style={{ padding: "0 18px" }}><Panel><h3 style={{ color: ink }}>Horas dedicadas por dia</h3><ResponsiveContainer width="100%" height={160}><BarChart data={week}><XAxis dataKey="day"/><Tooltip/><Bar dataKey="hours" fill={violet} radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></Panel><Panel><h3 style={{ color: ink }}>Progreso semanal</h3><ResponsiveContainer width="100%" height={140}><LineChart data={[{w:"S1",v:40},{w:"S2",v:55},{w:"S3",v:48},{w:"S4",v:72}]}><XAxis dataKey="w"/><Tooltip/><Line dataKey="v" stroke="#2AD9C6" strokeWidth={3}/></LineChart></ResponsiveContainer></Panel><Panel><b style={{ color: violet }}>28</b><div>Tareas completadas</div></Panel></div>;
  return <main style={{ minHeight: "100vh", background: "#EDEBFA", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "system-ui,sans-serif" }}>
    <div style={{ width: "min(100%,380px)", height: 720, maxHeight: "92vh", background: "#F7F6FC", border: "9px solid #211B3D", borderRadius: 38, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px #211B3D30" }}>
      <div style={{ flex: 1, overflowY: "auto" }}>{tab !== "home" && <Header title={tabs.find(t => t.id === tab)?.label}/ >}{page}</div>
      <nav style={{ display: "flex", justifyContent: "space-around", background: "white", borderTop: "1px solid #ECEAF6", padding: "10px 2px" }}>{tabs.map(({id,label,icon:Icon}) => <button key={id} onClick={() => setTab(id)} style={{ border: 0, background: "transparent", color: tab === id ? violet : "#A6A2BE", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontSize: 10, cursor: "pointer" }}><Icon size={19}/>{label}</button>)}</nav>
    </div>
  </main>;
}
function TaskRow({ task, onToggle }) {
  return <button onClick={() => onToggle(task.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, textAlign: "left", border: "1px solid #EFEDF7", background: "white", borderRadius: 12, padding: 12, marginBottom: 8, cursor: "pointer" }}>{task.done ? <CheckCircle2 color="#2AD9C6"/> : <Circle color="#C9C6DE"/>}<span style={{ flex: 1, color: ink, textDecoration: task.done ? "line-through" : "none", opacity: task.done ? .55 : 1 }}>{task.text}<small style={{ display: "block", color: "#9995B2", marginTop: 3 }}>{task.time} · {task.category}</small></span></button>;
}
const primaryButton = { background: violet, color: "white", border: 0, borderRadius: 10, padding: 8, cursor: "pointer" };
const roundButton = { width: 56, height: 56, border: 0, borderRadius: 50, background: violet, color: "white", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" };
