"use client";

import { useState, useEffect, useCallback } from "react";

type Status = "ACTIVE" | "PROBABLE" | "QUESTIONABLE" | "OUT";

interface DayStatus {
  status: Status;
  reason: string;
  updatedAt: string;
}

interface PlayerData {
  name: string;
  gamertag: string;
  avatar: string;
  statuses: Record<string, DayStatus>; // keyed by YYYY-MM-DD
}

const PLAYER_META = [
  { name: "WoolyLobster", gamertag: "WoolyLobster", avatar: "🦞" },
  { name: "JohnnySins", gamertag: "JohnnySins", avatar: "🕴️" },
  { name: "SpeedyLlama", gamertag: "SpeedyLlama", avatar: "🦙" },
  { name: "D00m5hr00m", gamertag: "D00m5hr00m", avatar: "🍄" },
];

const STATUS_CONFIG: Record<Status, { color: string; bg: string; glow: string; label: string; icon: string; short: string }> = {
  ACTIVE: { color: "#00ff88", bg: "rgba(0,255,136,0.15)", glow: "0 0 20px rgba(0,255,136,0.4)", label: "ACTIVE", icon: "🟢", short: "ACT" },
  PROBABLE: { color: "#00ccff", bg: "rgba(0,204,255,0.15)", glow: "0 0 20px rgba(0,204,255,0.4)", label: "PROBABLE", icon: "🔵", short: "PRB" },
  QUESTIONABLE: { color: "#ffaa00", bg: "rgba(255,170,0,0.15)", glow: "0 0 20px rgba(255,170,0,0.4)", label: "QUESTIONABLE", icon: "🟡", short: "QST" },
  OUT: { color: "#ff3355", bg: "rgba(255,51,85,0.15)", glow: "0 0 20px rgba(255,51,85,0.4)", label: "OUT", icon: "🔴", short: "OUT" },
};

const QUOTES = [
  "Drop in. Loot up. Die immediately.",
  "Gulag is just a second chance at disappointment.",
  "If you ain't dying, you ain't trying.",
  "RATS don't quit... they just rage quit.",
  "Buy back incoming... again.",
  "Loadout drop is my love language.",
  "Camping is a valid strategy. Fight me.",
  "1v4? More like 1v4got how to aim.",
];

function getDateStr(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDayLabel(dateStr: string) {
  const today = getDateStr(new Date());
  const now = new Date();
  const tomorrow = getDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  if (dateStr === today) return "TONIGHT";
  if (dateStr === tomorrow) return "TOMORROW";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase();
}

function getNext7Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    days.push(getDateStr(d));
  }
  return days;
}

export default function Home() {
  const [allData, setAllData] = useState<Record<string, Record<string, DayStatus>>>({});
  const [selectedDay, setSelectedDay] = useState(getDateStr(new Date()));
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [tempStatus, setTempStatus] = useState<Status>("ACTIVE");
  const [tempReason, setTempReason] = useState("");
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [loaded, setLoaded] = useState(false);

  const days = getNext7Days();

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await fetch("/api/statuses");
      if (res.ok) {
        const data = await res.json();
        if (data.statuses) setAllData(data.statuses);
      }
    } catch { /* offline */ }
  }, []);

  useEffect(() => {
    fetchStatuses().then(() => setLoaded(true));
    const interval = setInterval(fetchStatuses, 5000);
    return () => clearInterval(interval);
  }, [fetchStatuses]);

  const getPlayerStatus = (playerName: string, day: string): DayStatus => {
    return allData[playerName]?.[day] || { status: "OUT" as Status, reason: "", updatedAt: "" };
  };

  const saveStatus = async (playerName: string, day: string, status: Status, reason: string) => {
    // Optimistic update first
    setAllData((prev) => ({
      ...prev,
      [playerName]: {
        ...prev[playerName],
        [day]: { status, reason, updatedAt: new Date().toISOString() },
      },
    }));

    try {
      const res = await fetch("/api/statuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName, day, status, reason }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.statuses) setAllData(data.statuses);
      }
    } catch {
      // optimistic update already applied
    }
  };

  const handleSave = (playerName: string) => {
    saveStatus(playerName, selectedDay, tempStatus, tempReason);
    setEditingPlayer(null);
  };

  const startEditing = (player: typeof PLAYER_META[0]) => {
    const current = getPlayerStatus(player.name, selectedDay);
    setEditingPlayer(player.name);
    setTempStatus(current.status);
    setTempReason(current.reason);
  };

  const activeTonight = PLAYER_META.filter((p) => {
    const s = getPlayerStatus(p.name, selectedDay).status;
    return s === "ACTIVE" || s === "PROBABLE";
  }).length;

  return (
    <div style={styles.container}>
      <div style={styles.gridOverlay} />

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logoRow}>
          <span style={styles.ratEmoji}>🐀</span>
          <div>
            <h1 style={styles.title}>RATS DASHBOARD</h1>
            <p style={styles.subtitle}>WARZONE SQUAD STATUS</p>
          </div>
          <span style={styles.ratEmoji}>🐀</span>
        </div>
        <div style={styles.quoteBar}>
          <span style={styles.quoteText}>&ldquo;{quote}&rdquo;</span>
        </div>
      </header>

      {/* Calendar Strip */}
      <div style={styles.calendarSection}>
        <div style={styles.calendarStrip}>
          {days.map((day) => {
            const isSelected = day === selectedDay;
            const isToday = day === getDateStr(new Date());
            const dayActive = PLAYER_META.filter((p) => {
              const s = getPlayerStatus(p.name, day).status;
              return s === "ACTIVE" || s === "PROBABLE";
            }).length;

            return (
              <button
                key={day}
                onClick={() => { setSelectedDay(day); setEditingPlayer(null); }}
                style={{
                  ...styles.calendarDay,
                  ...(isSelected ? styles.calendarDaySelected : {}),
                  borderColor: isSelected ? "#00ff88" : "rgba(255,255,255,0.1)",
                }}
              >
                {isToday && <span style={styles.todayDot}>●</span>}
                <span style={styles.calDayName}>
                  {new Date(day + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}
                </span>
                <span style={styles.calDayNum}>
                  {new Date(day + "T12:00:00").getDate()}
                </span>
                <div style={styles.calDots}>
                  {PLAYER_META.map((p) => {
                    const s = getPlayerStatus(p.name, day).status;
                    return (
                      <span
                        key={p.name}
                        style={{
                          ...styles.calDot,
                          backgroundColor: STATUS_CONFIG[s].color,
                        }}
                      />
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day Header */}
      <div style={styles.dayHeader}>
        <span style={styles.dayTitle}>{getDayLabel(selectedDay)}</span>
        <span style={{
          ...styles.squadCount,
          color: activeTonight >= 3 ? "#00ff88" : activeTonight >= 2 ? "#ffaa00" : "#ff3355",
        }}>
          {activeTonight}/4 READY
        </span>
        {activeTonight === 4 && <span style={styles.fireText}>🔥 FULL SQUAD 🔥</span>}
        {activeTonight === 0 && <span style={styles.fireText}>💀 DEAD NIGHT 💀</span>}
      </div>

      {/* Player Cards */}
      <main style={styles.main}>
        {!loaded ? (
          <div style={styles.loading}><span style={styles.loadingText}>DEPLOYING TO WARZONE...</span></div>
        ) : (
          <div style={styles.grid}>
            {PLAYER_META.map((player) => {
              const dayStatus = getPlayerStatus(player.name, selectedDay);
              const config = STATUS_CONFIG[dayStatus.status];
              const isEditing = editingPlayer === player.name;

              return (
                <div key={player.name} style={{ ...styles.card, borderColor: config.color, boxShadow: config.glow }}>
                  <div style={{ ...styles.statusBadge, backgroundColor: config.bg, borderColor: config.color }}>
                    <span>{config.icon}</span>
                    <span style={{ ...styles.statusText, color: config.color }}>{config.label}</span>
                  </div>

                  <div style={styles.avatarSection}>
                    <div style={{ ...styles.avatarCircle, borderColor: config.color, boxShadow: config.glow }}>
                      <span style={styles.avatarEmoji}>{player.avatar}</span>
                    </div>
                    <h2 style={styles.playerName}>{player.gamertag}</h2>
                  </div>

                  {/* Week mini-strip */}
                  <div style={styles.miniStrip}>
                    {days.map((d) => {
                      const ds = getPlayerStatus(player.name, d);
                      const c = STATUS_CONFIG[ds.status];
                      return (
                        <div key={d} style={{
                          ...styles.miniDay,
                          backgroundColor: d === selectedDay ? c.bg : "transparent",
                          borderColor: d === selectedDay ? c.color : "rgba(255,255,255,0.08)",
                        }}>
                          <span style={{ fontSize: "8px", color: "#666688" }}>
                            {new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "narrow" })}
                          </span>
                          <span style={{ fontSize: "10px" }}>{c.icon}</span>
                        </div>
                      );
                    })}
                  </div>

                  {dayStatus.reason && !isEditing && (
                    <div style={styles.reasonBox}>
                      <span style={styles.reasonLabel}>INJURY REPORT:</span>
                      <span style={styles.reasonText}>{dayStatus.reason}</span>
                    </div>
                  )}

                  {isEditing ? (
                    <div style={styles.editSection}>
                      <div style={styles.statusButtons}>
                        {(Object.keys(STATUS_CONFIG) as Status[]).map((s) => (
                          <button
                            key={s}
                            onClick={() => setTempStatus(s)}
                            style={{
                              ...styles.statusBtn,
                              backgroundColor: tempStatus === s ? STATUS_CONFIG[s].color : "transparent",
                              color: tempStatus === s ? "#0a0a1a" : STATUS_CONFIG[s].color,
                              borderColor: STATUS_CONFIG[s].color,
                              fontWeight: tempStatus === s ? "bold" : "normal",
                            }}
                          >
                            {STATUS_CONFIG[s].icon} {s}
                          </button>
                        ))}
                      </div>
                      <input
                        style={styles.reasonInput}
                        placeholder='Reason (e.g. "gf aggro", "work late")'
                        value={tempReason}
                        onChange={(e) => setTempReason(e.target.value)}
                        maxLength={100}
                      />
                      <div style={styles.editActions}>
                        <button style={styles.saveBtn} onClick={() => handleSave(player.name)}>✅ LOCK IN</button>
                        <button style={styles.cancelBtn} onClick={() => setEditingPlayer(null)}>❌ NAH</button>
                      </div>
                    </div>
                  ) : (
                    <button style={styles.editBtn} onClick={() => startEditing(player)}>✏️ UPDATE STATUS</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        <p style={styles.footerText}>🐀 RATS DASHBOARD v1.0 — No rats left behind 🐀</p>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 30%, #0a1628 60%, #0a0a1a 100%)",
    color: "#ffffff",
    fontFamily: "'Orbitron', sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  gridOverlay: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundImage: "linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px)",
    backgroundSize: "50px 50px",
    pointerEvents: "none" as const,
    zIndex: 0,
  },
  header: {
    position: "relative" as const, zIndex: 1,
    textAlign: "center" as const, padding: "30px 20px 10px",
  },
  logoRow: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", marginBottom: "10px",
  },
  ratEmoji: { fontSize: "48px" },
  title: {
    fontFamily: "'Press Start 2P', cursive",
    fontSize: "clamp(20px, 5vw, 44px)",
    background: "linear-gradient(90deg, #00ff88, #00ccff, #ff3355, #ffaa00)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    margin: 0, letterSpacing: "2px",
  },
  subtitle: {
    fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(9px, 2vw, 14px)",
    color: "#8888aa", letterSpacing: "8px", margin: "5px 0 0 0",
  },
  quoteBar: {
    margin: "12px auto", padding: "8px 20px",
    background: "rgba(255,255,255,0.04)", borderRadius: "8px",
    maxWidth: "600px", border: "1px solid rgba(255,255,255,0.08)",
  },
  quoteText: { fontSize: "11px", color: "#6666aa", fontStyle: "italic" },

  // Calendar
  calendarSection: {
    position: "relative" as const, zIndex: 1,
    padding: "10px 20px", maxWidth: "800px", margin: "0 auto",
  },
  calendarStrip: {
    display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" as const,
  },
  calendarDay: {
    display: "flex", flexDirection: "column" as const, alignItems: "center",
    gap: "4px", padding: "10px 14px", borderRadius: "12px",
    border: "2px solid rgba(255,255,255,0.1)",
    background: "rgba(15,15,35,0.8)", cursor: "pointer",
    transition: "all 0.2s", position: "relative" as const,
    fontFamily: "'Orbitron', sans-serif", minWidth: "70px",
  },
  calendarDaySelected: {
    background: "rgba(0,255,136,0.08)", borderColor: "#00ff88",
    boxShadow: "0 0 15px rgba(0,255,136,0.2)",
  },
  todayDot: { position: "absolute" as const, top: "4px", right: "8px", color: "#00ff88", fontSize: "8px" },
  calDayName: { fontSize: "10px", color: "#8888aa", fontWeight: "bold", letterSpacing: "1px" },
  calDayNum: { fontSize: "20px", fontWeight: "900", color: "#ffffff" },
  calDots: { display: "flex", gap: "3px" },
  calDot: { width: "6px", height: "6px", borderRadius: "50%" },

  // Day header
  dayHeader: {
    position: "relative" as const, zIndex: 1,
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: "16px", padding: "16px 20px", flexWrap: "wrap" as const,
  },
  dayTitle: {
    fontFamily: "'Press Start 2P', cursive", fontSize: "16px", color: "#ffffff", letterSpacing: "3px",
  },
  squadCount: {
    fontSize: "16px", fontWeight: "900", fontFamily: "'Press Start 2P', cursive",
  },
  fireText: { fontSize: "14px" },

  // Main
  main: {
    position: "relative" as const, zIndex: 1,
    padding: "10px 20px 30px", maxWidth: "1200px", margin: "0 auto",
  },
  loading: { textAlign: "center" as const, padding: "80px 20px" },
  loadingText: { fontFamily: "'Press Start 2P', cursive", fontSize: "14px", color: "#00ff88" },
  grid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: "20px",
  },
  card: {
    background: "rgba(15,15,35,0.9)", borderRadius: "16px",
    border: "2px solid", padding: "20px",
    backdropFilter: "blur(10px)", transition: "all 0.3s ease",
    display: "flex", flexDirection: "column" as const, alignItems: "center" as const, gap: "10px",
  },
  statusBadge: {
    display: "flex", alignItems: "center", gap: "8px",
    padding: "5px 14px", borderRadius: "20px", border: "1px solid", fontSize: "12px", fontWeight: "bold",
  },
  statusText: { fontFamily: "'Press Start 2P', cursive", fontSize: "9px", letterSpacing: "2px" },
  avatarSection: {
    display: "flex", flexDirection: "column" as const, alignItems: "center" as const, gap: "8px",
  },
  avatarCircle: {
    width: "72px", height: "72px", borderRadius: "50%", border: "3px solid",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(255,255,255,0.05)",
  },
  avatarEmoji: { fontSize: "36px" },
  playerName: {
    fontFamily: "'Press Start 2P', cursive", fontSize: "11px", margin: 0,
    textAlign: "center" as const, letterSpacing: "1px",
  },
  miniStrip: {
    display: "flex", gap: "3px", padding: "4px 0",
  },
  miniDay: {
    display: "flex", flexDirection: "column" as const, alignItems: "center",
    gap: "1px", padding: "3px 5px", borderRadius: "6px",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  reasonBox: {
    background: "rgba(255,255,255,0.05)", borderRadius: "8px",
    padding: "8px 14px", width: "100%", textAlign: "center" as const,
  },
  reasonLabel: {
    display: "block", fontSize: "8px", color: "#ff3355",
    fontFamily: "'Press Start 2P', cursive", marginBottom: "4px", letterSpacing: "2px",
  },
  reasonText: { fontSize: "12px", color: "#ccccdd" },
  editSection: { width: "100%", display: "flex", flexDirection: "column" as const, gap: "8px" },
  statusButtons: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" },
  statusBtn: {
    padding: "8px 4px", borderRadius: "8px", border: "1px solid",
    cursor: "pointer", fontSize: "10px", fontFamily: "'Orbitron', sans-serif",
    transition: "all 0.2s", background: "transparent",
  },
  reasonInput: {
    width: "100%", padding: "10px 12px", borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)",
    color: "#ffffff", fontSize: "12px", fontFamily: "'Orbitron', sans-serif",
    outline: "none", boxSizing: "border-box" as const,
  },
  editActions: { display: "flex", gap: "8px" },
  saveBtn: {
    flex: 1, padding: "10px", borderRadius: "8px", border: "2px solid #00ff88",
    background: "rgba(0,255,136,0.15)", color: "#00ff88", cursor: "pointer",
    fontFamily: "'Press Start 2P', cursive", fontSize: "9px", fontWeight: "bold",
  },
  cancelBtn: {
    flex: 1, padding: "10px", borderRadius: "8px", border: "2px solid #ff3355",
    background: "rgba(255,51,85,0.15)", color: "#ff3355", cursor: "pointer",
    fontFamily: "'Press Start 2P', cursive", fontSize: "9px", fontWeight: "bold",
  },
  editBtn: {
    width: "100%", padding: "10px", borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)",
    color: "#aaaacc", cursor: "pointer", fontFamily: "'Orbitron', sans-serif",
    fontSize: "12px", transition: "all 0.2s", marginTop: "2px",
  },
  footer: { position: "relative" as const, zIndex: 1, textAlign: "center" as const, padding: "30px 20px" },
  footerText: { fontSize: "10px", color: "#444466", fontFamily: "'Press Start 2P', cursive" },
};
