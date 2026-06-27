import { useState, useMemo, useEffect } from "react"
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts"
import { storage } from "./storage.js"

// ─── Farben ──────────────────────────────────────────────────────────────────
const C = {
  bg: "#0D1117",
  surface: "#161B22",
  surface2: "#1C2230",
  border: "#30363D",
  text: "#E6EDF3",
  muted: "#8B949E",
  accent: "#58A6FF",
  green: "#3FB950",
  red: "#F85149",
  yellow: "#D29922",
  purple: "#BC8CFF",
  orange: "#FFA657",
}

// ─── Format-Helfer ────────────────────────────────────────────────────────────
const fmt = (n, d = 2) =>
  Number(n).toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d })
const fmtEur = (n) =>
  Number(n).toLocaleString("de-DE", { style: "currency", currency: "EUR" })
const fmtPct = (n) =>
  (Number(n) * 100).toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }) + " %"
const fmtPctSigned = (n) => (n >= 0 ? "+" : "") + fmtPct(n)
const fmtEurSigned = (n) => (n >= 0 ? "+" : "") + fmtEur(n)

// ─── Asset- / Risikofarben ───────────────────────────────────────────────────
const ASSET_FARBE = {
  Aktien: C.accent,
  Rohstoffe: C.orange,
  Anleihen: C.purple,
  Festgeld: C.green,
  Tagesgeld: "#2EA043",
}
const RISIKO_FARBE = { Chance: C.red, Wachstum: C.yellow, Sicherheit: C.green }
const REGION_FARBE = { "Industrieländer": C.accent, "Schwellenländer": C.orange }

// ─── Seed-Positionen ─────────────────────────────────────────────────────────
const SEED = [
  { id: 1, name: "iShares MSCI EM", ticker: "XMME", assetType: "Aktien", region: "Schwellenländer", risikogruppe: "Chance", stueck: 279, kaufpreis: 75.497, kurs: 83.522, soll: 0.087, kategorie: "ETF" },
  { id: 2, name: "iShares Core MSCI World", ticker: "EUNL", assetType: "Aktien", region: "Industrieländer", risikogruppe: "Wachstum", stueck: 459, kaufpreis: 131.183, kurs: 135.99, soll: 0.435, kategorie: "ETF" },
  { id: 3, name: "iShares Semiconductor", ticker: "SEC0", assetType: "Aktien", region: "Industrieländer", risikogruppe: "Chance", stueck: 11, kaufpreis: 69.70, kurs: 49.40, soll: 0.000, kategorie: "ETF" },
  { id: 4, name: "iShares Div. Commodity", ticker: "SXRS", assetType: "Rohstoffe", region: "Industrieländer", risikogruppe: "Chance", stueck: 0, kaufpreis: 52.87, kurs: 52.87, soll: 0.087, kategorie: "ETF" },
  { id: 5, name: "iShares EUR Aggregate", ticker: "EUNA", assetType: "Anleihen", region: "Industrieländer", risikogruppe: "Sicherheit", stueck: 200, kaufpreis: 149.715, kurs: 149.38, soll: 0.130, kategorie: "ETF" },
  { id: 6, name: "ING DiBa Festgeld 6 Mo", ticker: "-", assetType: "Festgeld", region: "Industrieländer", risikogruppe: "Sicherheit", stueck: 1, kaufpreis: 35000, kurs: 35297.50, soll: 0.130, kategorie: "Festgeld", zins: 0.017 },
  { id: 7, name: "ING DiBa Festgeld 3 Mo", ticker: "-", assetType: "Festgeld", region: "Industrieländer", risikogruppe: "Sicherheit", stueck: 1, kaufpreis: 50000, kurs: 50200, soll: 0.000, kategorie: "Festgeld", zins: 0.016 },
  { id: 8, name: "ING DiBa Extrakonto", ticker: "-", assetType: "Tagesgeld", region: "Industrieländer", risikogruppe: "Sicherheit", stueck: 1, kaufpreis: 54016.98, kurs: 54422.11, soll: 0.130, kategorie: "Tagesgeld", zins: 0.015 },
]

let naechsteId = 9

// ─── Szenarien ────────────────────────────────────────────────────────────────
const SZENARIEN = [
  {
    id: 1, name: "Minimal",
    allokation: [
      { name: "Aktien", anteil: 0.55, farbe: C.accent },
      { name: "Rohstoffe", anteil: 0.20, farbe: C.orange },
      { name: "Anleihen", anteil: 0.10, farbe: C.purple },
      { name: "Festgeld/Bar", anteil: 0.15, farbe: C.green },
    ],
    details: [
      { kategorie: "Aktien", fokus: "Breit gestreut (MSCI World + EM)", risikogruppe: "Wachstum / Chance", zielAnteil: "55 %", gebuehren: "0,20 %" },
      { kategorie: "Rohstoffe", fokus: "Diversifizierte Rohstoffe + Gold", risikogruppe: "Chance", zielAnteil: "20 %", gebuehren: "0,19 %" },
      { kategorie: "Anleihen", fokus: "EUR Aggregate", risikogruppe: "Sicherheit", zielAnteil: "10 %", gebuehren: "0,10 %" },
      { kategorie: "Festgeld/Bar", fokus: "Festgeld + Tagesgeld", risikogruppe: "Sicherheit", zielAnteil: "15 %", gebuehren: "0,00 %" },
    ],
  },
  {
    id: 2, name: "Aktien Breit",
    allokation: [
      { name: "Aktien", anteil: 0.50, farbe: C.accent },
      { name: "Rohstoffe", anteil: 0.15, farbe: C.orange },
      { name: "Anleihen", anteil: 0.20, farbe: C.purple },
      { name: "Festgeld/Bar", anteil: 0.15, farbe: C.green },
    ],
    details: [
      { kategorie: "Aktien", fokus: "Breit gestreut", risikogruppe: "Wachstum / Chance", zielAnteil: "50 %", gebuehren: "0,20 %" },
      { kategorie: "Rohstoffe", fokus: "Rohstoffe diversifiziert", risikogruppe: "Chance", zielAnteil: "15 %", gebuehren: "0,19 %" },
      { kategorie: "Anleihen", fokus: "EUR Aggregate erhöht", risikogruppe: "Sicherheit", zielAnteil: "20 %", gebuehren: "0,10 %" },
      { kategorie: "Festgeld/Bar", fokus: "Festgeld + Tagesgeld", risikogruppe: "Sicherheit", zielAnteil: "15 %", gebuehren: "0,00 %" },
    ],
  },
  {
    id: 3, name: "Aktien Gold",
    allokation: [
      { name: "Aktien", anteil: 0.50, farbe: C.accent },
      { name: "Rohstoffe", anteil: 0.10, farbe: C.orange },
      { name: "Anleihen", anteil: 0.15, farbe: C.purple },
      { name: "Festgeld/Bar", anteil: 0.25, farbe: C.green },
    ],
    details: [
      { kategorie: "Aktien", fokus: "MSCI World + EM + Halbleiter", risikogruppe: "Wachstum / Chance", zielAnteil: "50 %", gebuehren: "0,22 %" },
      { kategorie: "Rohstoffe", fokus: "Gold-Fokus", risikogruppe: "Chance", zielAnteil: "10 %", gebuehren: "0,15 %" },
      { kategorie: "Anleihen", fokus: "EUR Aggregate", risikogruppe: "Sicherheit", zielAnteil: "15 %", gebuehren: "0,10 %" },
      { kategorie: "Festgeld/Bar", fokus: "Festgeld erhöht", risikogruppe: "Sicherheit", zielAnteil: "25 %", gebuehren: "0,00 %" },
    ],
  },
  {
    id: 4, name: "Aktien Festgeld Int.",
    allokation: [
      { name: "Aktien", anteil: 0.50, farbe: C.accent },
      { name: "Rohstoffe", anteil: 0.10, farbe: C.orange },
      { name: "Anleihen", anteil: 0.15, farbe: C.purple },
      { name: "Festgeld/Bar", anteil: 0.25, farbe: C.green },
    ],
    details: [
      { kategorie: "Aktien", fokus: "MSCI World + EM", risikogruppe: "Wachstum / Chance", zielAnteil: "50 %", gebuehren: "0,20 %" },
      { kategorie: "Rohstoffe", fokus: "Diversifiziert", risikogruppe: "Chance", zielAnteil: "10 %", gebuehren: "0,19 %" },
      { kategorie: "Anleihen", fokus: "EUR Aggregate", risikogruppe: "Sicherheit", zielAnteil: "15 %", gebuehren: "0,10 %" },
      { kategorie: "Festgeld/Bar", fokus: "Festgeld intermediate", risikogruppe: "Sicherheit", zielAnteil: "25 %", gebuehren: "0,00 %" },
    ],
  },
  {
    id: 5, name: "Aktien Breit Plus",
    allokation: [
      { name: "Aktien", anteil: 0.45, farbe: C.accent },
      { name: "Rohstoffe", anteil: 0.20, farbe: C.orange },
      { name: "Anleihen", anteil: 0.15, farbe: C.purple },
      { name: "Festgeld/Bar", anteil: 0.20, farbe: C.green },
    ],
    details: [
      { kategorie: "Aktien", fokus: "Breit + Faktor-ETFs", risikogruppe: "Wachstum / Chance", zielAnteil: "45 %", gebuehren: "0,25 %" },
      { kategorie: "Rohstoffe", fokus: "Rohstoffe + Gold erhöht", risikogruppe: "Chance", zielAnteil: "20 %", gebuehren: "0,19 %" },
      { kategorie: "Anleihen", fokus: "EUR Aggregate", risikogruppe: "Sicherheit", zielAnteil: "15 %", gebuehren: "0,10 %" },
      { kategorie: "Festgeld/Bar", fokus: "Festgeld + Tagesgeld", risikogruppe: "Sicherheit", zielAnteil: "20 %", gebuehren: "0,00 %" },
    ],
  },
]

// ─── Simulation ───────────────────────────────────────────────────────────────
function seededRand(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) | 0
    return (s >>> 0) / 4294967296
  }
}

function brownianBridge(start, ende, schritte, jaehrlVol, seed) {
  const rng = seededRand(seed)
  const dt = 1 / 252
  const pfad = [start]
  let v = start
  for (let i = 1; i < schritte; i++) {
    const u1 = Math.max(1e-10, rng())
    const u2 = rng()
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    v = Math.max(0.01, v + (ende - v) / (schritte - i) + jaehrlVol * Math.sqrt(dt) * v * z)
    pfad.push(v)
  }
  pfad.push(ende)
  return pfad
}

function assetParams(p) {
  if (p.assetType === "Festgeld") return { cagr: p.zins ?? 0.017, vol: 0.004 }
  if (p.assetType === "Tagesgeld") return { cagr: p.zins ?? 0.015, vol: 0.004 }
  if (p.assetType === "Anleihen") return { cagr: 0.020, vol: 0.05 }
  if (p.assetType === "Rohstoffe") return { cagr: 0.040, vol: 0.18 }
  if (p.ticker === "SEC0") return { cagr: 0.140, vol: 0.28 }
  if (p.region === "Schwellenländer") return { cagr: 0.065, vol: 0.20 }
  return { cagr: 0.085, vol: 0.15 }
}

const BENCHMARKS = [
  { key: "DAX", cagr: 0.080, vol: 0.18, farbe: C.yellow },
  { key: "MSCI World", cagr: 0.090, vol: 0.15, farbe: C.green },
  { key: "S&P 500", cagr: 0.100, vol: 0.16, farbe: C.purple },
  { key: "EURO STOXX 50", cagr: 0.060, vol: 0.17, farbe: C.orange },
]

const ZEITRAEUME = [
  { label: "1T", tage: 1 },
  { label: "1W", tage: 5 },
  { label: "1M", tage: 21 },
  { label: "3M", tage: 63 },
  { label: "1J", tage: 252 },
  { label: "3J", tage: 756 },
  { label: "5J", tage: 1260 },
]

// ─── UI-Primitives ────────────────────────────────────────────────────────────
function Karte({ style, children }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, ...style }}>
      {children}
    </div>
  )
}

function Btn({ onClick, disabled, farbe, style, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: farbe ?? C.accent,
        color: "#000",
        border: "none",
        borderRadius: 4,
        padding: "5px 12px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontSize: 11,
        fontFamily: "inherit",
        fontWeight: 600,
        ...style,
      }}
    >
      {children}
    </button>
  )
}

function GhostBtn({ onClick, aktiv, style, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: aktiv ? C.border : "transparent",
        color: aktiv ? C.text : C.muted,
        border: `1px solid ${aktiv ? C.accent : C.border}`,
        borderRadius: 4,
        padding: "3px 10px",
        cursor: "pointer",
        fontSize: 11,
        fontFamily: "inherit",
        ...style,
      }}
    >
      {children}
    </button>
  )
}

function KpiKachel({ titel, wert, sub, farbe }) {
  return (
    <Karte style={{ padding: "14px 18px", minWidth: 160 }}>
      <div style={{ color: C.muted, fontSize: 11, marginBottom: 6 }}>{titel}</div>
      <div style={{ color: farbe ?? C.text, fontSize: 20, fontWeight: 600 }}>{wert}</div>
      {sub && <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </Karte>
  )
}

function Modal({ titel, onClose, breite, children }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.7)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
        width: breite ?? 460, maxWidth: "95vw", maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 18px", borderBottom: `1px solid ${C.border}`,
        }}>
          <span style={{ fontWeight: 600 }}>{titel}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 18 }}>{children}</div>
      </div>
    </div>
  )
}

function FormRow({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", color: C.muted, fontSize: 11, marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4,
  color: C.text, padding: "6px 8px", fontSize: 12, fontFamily: "inherit", outline: "none",
}

function PieTip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 10px", fontSize: 11 }}>
      <span style={{ color: C.muted }}>{name}: </span>
      <span style={{ color: C.text, fontWeight: 600 }}>{fmtPct(value)}</span>
    </div>
  )
}

function LineTip({ active, payload, label, indexed }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 4, padding: "8px 12px", fontSize: 11 }}>
      <div style={{ color: C.muted, marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{indexed ? fmt(p.value, 1) : fmtEur(p.value)}</strong>
        </div>
      ))}
    </div>
  )
}

// ─── PORTFOLIO TAB ────────────────────────────────────────────────────────────
function PortfolioTab({ positionen, setPositionen, onReset }) {
  const [modal, setModal] = useState(null)
  const [kursStatus, setKursStatus] = useState({ laden: false, fehler: null, zeitstempel: null })

  const totalWert = useMemo(
    () => positionen.reduce((s, p) => s + p.stueck * p.kurs, 0),
    [positionen]
  )

  const computed = useMemo(
    () =>
      positionen.map((p) => {
        const invest = p.stueck * p.kaufpreis
        const wert = p.stueck * p.kurs
        const gl = wert - invest
        const rendite = invest > 0 ? gl / invest : 0
        const ist = totalWert > 0 ? wert / totalWert : 0
        const rebalanceDelta = (p.soll - ist) * totalWert
        return { ...p, invest, wert, gl, rendite, ist, rebalanceDelta }
      }),
    [positionen, totalWert]
  )

  const summen = useMemo(() => ({
    invest: computed.reduce((s, p) => s + p.invest, 0),
    wert: computed.reduce((s, p) => s + p.wert, 0),
    gl: computed.reduce((s, p) => s + p.gl, 0),
  }), [computed])

  const renditeGesamt = summen.invest > 0 ? summen.gl / summen.invest : 0

  async function kursAktualisieren() {
    setKursStatus({ laden: true, fehler: null, zeitstempel: null })
    try {
      const boerse = positionen.filter((p) => p.ticker !== "-" && p.stueck > 0)
      const tickers = boerse.map((p) => p.ticker).join(", ")
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          "x-api-key": (typeof window !== "undefined" && window.ANTHROPIC_API_KEY) || "",
        },
        body: JSON.stringify({
          model: "claude-opus-4-5",
          max_tokens: 512,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{
            role: "user",
            content: `Aktuelle Kurse in EUR (Xetra) für ETFs: ${tickers}. Antworte NUR mit JSON: {"TICKER": kurs_zahl}`,
          }],
        }),
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      const txt = data.content?.find((c) => c.type === "text")?.text ?? ""
      const m = txt.match(/\{[\s\S]*?\}/)
      if (!m) throw new Error("Kein JSON in Antwort")
      const kurse = JSON.parse(m[0])
      setPositionen((ps) =>
        ps.map((p) => (kurse[p.ticker] != null ? { ...p, kurs: Number(kurse[p.ticker]) } : p))
      )
      setKursStatus({ laden: false, fehler: null, zeitstempel: new Date() })
    } catch (err) {
      setKursStatus({ laden: false, fehler: err.message, zeitstempel: null })
    }
  }

  function handleHinzufuegen(felder) {
    setPositionen((ps) => [...ps, { ...felder, id: naechsteId++ }])
    setModal(null)
  }

  function handleBearbeiten(felder) {
    setPositionen((ps) => ps.map((p) => (p.id === modal.position.id ? { ...p, ...felder } : p)))
    setModal(null)
  }

  function handleLoeschen(id) {
    if (confirm("Position wirklich löschen?")) {
      setPositionen((ps) => ps.filter((p) => p.id !== id))
    }
  }

  function handleZukauf({ stueck: neuStueck, preis }) {
    setPositionen((ps) =>
      ps.map((p) => {
        if (p.id !== modal.position.id) return p
        const neuerKaufpreis =
          (p.stueck * p.kaufpreis + neuStueck * preis) / (p.stueck + neuStueck)
        return { ...p, stueck: p.stueck + neuStueck, kaufpreis: neuerKaufpreis, kurs: preis }
      })
    )
    setModal(null)
  }

  function handleVerkauf({ stueck: verkauftStueck }) {
    setPositionen((ps) =>
      ps.map((p) =>
        p.id !== modal.position.id ? p : { ...p, stueck: Math.max(0, p.stueck - verkauftStueck) }
      )
    )
    setModal(null)
  }

  const thS = {
    padding: "8px 10px", color: C.muted, fontSize: 10, fontWeight: 600,
    textAlign: "right", whiteSpace: "nowrap", borderBottom: `1px solid ${C.border}`,
    position: "sticky", top: 0, background: C.surface,
  }
  const tdS = { padding: "7px 10px", fontSize: 12, textAlign: "right", borderBottom: `1px solid ${C.border}` }

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <KpiKachel titel="Gesamtwert" wert={fmtEur(summen.wert)} />
        <KpiKachel titel="Investiert" wert={fmtEur(summen.invest)} farbe={C.muted} />
        <KpiKachel
          titel="Gewinn / Verlust"
          wert={fmtEurSigned(summen.gl)}
          sub={fmtPctSigned(renditeGesamt)}
          farbe={summen.gl >= 0 ? C.green : C.red}
        />
        <KpiKachel titel="Positionen" wert={String(positionen.length)} farbe={C.muted} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Btn onClick={() => setModal({ typ: "hinzufuegen" })}>+ Position</Btn>
        <Btn
          onClick={kursAktualisieren}
          disabled={kursStatus.laden}
          farbe={C.surface}
          style={{ color: C.text, border: `1px solid ${C.border}` }}
        >
          {kursStatus.laden ? "Lädt…" : "Kurse aktualisieren"}
        </Btn>
        <Btn
          onClick={onReset}
          farbe={C.surface}
          style={{ color: C.red, border: `1px solid ${C.red}44` }}
        >
          Zurücksetzen
        </Btn>
        {kursStatus.zeitstempel && (
          <span style={{ color: C.green, fontSize: 11 }}>
            Aktualisiert {kursStatus.zeitstempel.toLocaleTimeString("de-DE")}
          </span>
        )}
        {kursStatus.fehler && (
          <span style={{ color: C.red, fontSize: 11 }}>Fehler: {kursStatus.fehler}</span>
        )}
      </div>

      <Karte style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
          <thead>
            <tr>
              <th style={{ ...thS, textAlign: "left" }}>Name / Ticker</th>
              <th style={thS}>Typ</th>
              <th style={thS}>Stück</th>
              <th style={thS}>Ø-Kauf</th>
              <th style={thS}>Kurs</th>
              <th style={thS}>Invest</th>
              <th style={thS}>Wert</th>
              <th style={thS}>G/V</th>
              <th style={thS}>Rendite</th>
              <th style={thS}>Ist</th>
              <th style={thS}>Soll</th>
              <th style={thS}>Delta</th>
              <th style={thS}></th>
            </tr>
          </thead>
          <tbody>
            {computed.map((p) => (
              <tr
                key={p.id}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.surface2)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ ...tdS, textAlign: "left" }}>
                  <span style={{ color: ASSET_FARBE[p.assetType] ?? C.muted, marginRight: 6, fontSize: 10 }}>●</span>
                  <span>{p.name}</span>
                  {p.ticker !== "-" && (
                    <span style={{ color: C.muted, fontSize: 10, marginLeft: 6 }}>{p.ticker}</span>
                  )}
                </td>
                <td style={tdS}>
                  <span style={{ color: RISIKO_FARBE[p.risikogruppe], fontSize: 10 }}>{p.assetType}</span>
                </td>
                <td style={tdS}>{fmt(p.stueck, p.stueck % 1 === 0 ? 0 : 2)}</td>
                <td style={tdS}>{fmtEur(p.kaufpreis)}</td>
                <td style={tdS}>{fmtEur(p.kurs)}</td>
                <td style={tdS}>{fmtEur(p.invest)}</td>
                <td style={tdS}>{fmtEur(p.wert)}</td>
                <td style={{ ...tdS, color: p.gl >= 0 ? C.green : C.red }}>{fmtEurSigned(p.gl)}</td>
                <td style={{ ...tdS, color: p.rendite >= 0 ? C.green : C.red }}>{fmtPctSigned(p.rendite)}</td>
                <td style={tdS}>{fmtPct(p.ist)}</td>
                <td style={{ ...tdS, color: C.muted }}>{fmtPct(p.soll)}</td>
                <td style={{ ...tdS, color: p.rebalanceDelta >= 0 ? C.green : C.red }}>
                  {fmtEurSigned(p.rebalanceDelta)}
                </td>
                <td style={{ ...tdS }}>
                  <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                    <GhostBtn onClick={() => setModal({ typ: "zukauf", position: p })}>+</GhostBtn>
                    <GhostBtn onClick={() => setModal({ typ: "verkauf", position: p })}>−</GhostBtn>
                    <GhostBtn onClick={() => setModal({ typ: "bearbeiten", position: p })}>✎</GhostBtn>
                    <GhostBtn onClick={() => handleLoeschen(p.id)} style={{ color: C.red }}>✕</GhostBtn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: C.surface2 }}>
              <td colSpan={5} style={{ ...tdS, textAlign: "left", color: C.muted, fontWeight: 600 }}>Gesamt</td>
              <td style={{ ...tdS, fontWeight: 600 }}>{fmtEur(summen.invest)}</td>
              <td style={{ ...tdS, fontWeight: 600 }}>{fmtEur(summen.wert)}</td>
              <td style={{ ...tdS, fontWeight: 600, color: summen.gl >= 0 ? C.green : C.red }}>{fmtEurSigned(summen.gl)}</td>
              <td style={{ ...tdS, fontWeight: 600, color: renditeGesamt >= 0 ? C.green : C.red }}>{fmtPctSigned(renditeGesamt)}</td>
              <td colSpan={4} />
            </tr>
          </tfoot>
        </table>
      </Karte>

      {modal?.typ === "hinzufuegen" && (
        <PositionsModal titel="Position hinzufügen" onSave={handleHinzufuegen} onClose={() => setModal(null)} />
      )}
      {modal?.typ === "bearbeiten" && (
        <PositionsModal titel="Position bearbeiten" initialValues={modal.position} onSave={handleBearbeiten} onClose={() => setModal(null)} />
      )}
      {modal?.typ === "zukauf" && (
        <ZukaufModal position={modal.position} onSave={handleZukauf} onClose={() => setModal(null)} />
      )}
      {modal?.typ === "verkauf" && (
        <VerkaufModal position={modal.position} onSave={handleVerkauf} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

// ─── Positions-Modal ──────────────────────────────────────────────────────────
function PositionsModal({ titel, initialValues, onSave, onClose }) {
  const [f, setF] = useState({
    name: "", ticker: "-", assetType: "Aktien", region: "Industrieländer",
    risikogruppe: "Wachstum", kategorie: "ETF",
    stueck: "", kaufpreis: "", kurs: "", soll: "", zins: "",
    ...initialValues,
    stueck: initialValues?.stueck ?? "",
    kaufpreis: initialValues?.kaufpreis ?? "",
    kurs: initialValues?.kurs ?? "",
    soll: initialValues ? String(Math.round(initialValues.soll * 1000) / 10) : "",
    zins: initialValues?.zins != null ? String(initialValues.zins * 100) : "",
  })

  const istKasse = f.assetType === "Festgeld" || f.assetType === "Tagesgeld"

  function submit(e) {
    e.preventDefault()
    onSave({
      name: f.name, ticker: f.ticker || "-", assetType: f.assetType,
      region: f.region, risikogruppe: f.risikogruppe, kategorie: f.kategorie,
      stueck: Number(f.stueck), kaufpreis: Number(f.kaufpreis),
      kurs: Number(f.kurs), soll: Number(f.soll) / 100,
      ...(istKasse && { zins: Number(f.zins) / 100 }),
    })
  }

  const inp = (key) => ({
    value: f[key],
    onChange: (e) => setF((prev) => ({ ...prev, [key]: e.target.value })),
    style: inputStyle,
  })

  return (
    <Modal titel={titel} onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
          <FormRow label="Name"><input required {...inp("name")} placeholder="iShares Core MSCI World" /></FormRow>
          <FormRow label="Ticker"><input {...inp("ticker")} placeholder="EUNL" /></FormRow>
          <FormRow label="Asset-Typ">
            <select {...inp("assetType")} style={{ ...inputStyle, cursor: "pointer" }}>
              {["Aktien", "Rohstoffe", "Anleihen", "Festgeld", "Tagesgeld"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </FormRow>
          <FormRow label="Kategorie">
            <select {...inp("kategorie")} style={{ ...inputStyle, cursor: "pointer" }}>
              {["ETF", "Festgeld", "Tagesgeld"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </FormRow>
          <FormRow label="Region">
            <select {...inp("region")} style={{ ...inputStyle, cursor: "pointer" }}>
              {["Industrieländer", "Schwellenländer"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </FormRow>
          <FormRow label="Risikogruppe">
            <select {...inp("risikogruppe")} style={{ ...inputStyle, cursor: "pointer" }}>
              {["Chance", "Wachstum", "Sicherheit"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </FormRow>
          <FormRow label="Stück"><input required type="number" min={0} step="any" {...inp("stueck")} /></FormRow>
          <FormRow label="Ø-Kaufpreis (€)"><input required type="number" min={0} step="any" {...inp("kaufpreis")} /></FormRow>
          <FormRow label="Aktueller Kurs (€)"><input required type="number" min={0} step="any" {...inp("kurs")} /></FormRow>
          <FormRow label="Soll-Allokation (%)"><input required type="number" min={0} max={100} step="0.1" {...inp("soll")} /></FormRow>
          {istKasse && (
            <FormRow label="Zinssatz (% p.a.)"><input type="number" min={0} step="0.01" {...inp("zins")} /></FormRow>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
          <GhostBtn onClick={onClose}>Abbrechen</GhostBtn>
          <Btn style={{ padding: "6px 16px" }}>Speichern</Btn>
        </div>
      </form>
    </Modal>
  )
}

// ─── Zukauf-Modal ─────────────────────────────────────────────────────────────
function ZukaufModal({ position, onSave, onClose }) {
  const [neuStueck, setNeuStueck] = useState("")
  const [preis, setPreis] = useState(String(position.kurs))
  const ns = Number(neuStueck), pr = Number(preis)
  const neuerKp = ns > 0 && pr > 0
    ? (position.stueck * position.kaufpreis + ns * pr) / (position.stueck + ns)
    : null

  return (
    <Modal titel={`Zukauf: ${position.name}`} onClose={onClose} breite={340}>
      <FormRow label="Neue Stücke">
        <input autoFocus type="number" min={0} step="any" value={neuStueck}
          onChange={(e) => setNeuStueck(e.target.value)} style={inputStyle} />
      </FormRow>
      <FormRow label="Kaufpreis (€)">
        <input type="number" min={0} step="any" value={preis}
          onChange={(e) => setPreis(e.target.value)} style={inputStyle} />
      </FormRow>
      {neuerKp && (
        <div style={{ color: C.muted, fontSize: 11, marginBottom: 14 }}>
          Neuer Ø-Kauf: <span style={{ color: C.text }}>{fmtEur(neuerKp)}</span>
          {" · "}Gesamt: <span style={{ color: C.text }}>{fmt(position.stueck + ns, 0)} Stück</span>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <GhostBtn onClick={onClose}>Abbrechen</GhostBtn>
        <Btn onClick={() => ns > 0 && pr > 0 && onSave({ stueck: ns, preis: pr })}>Kaufen</Btn>
      </div>
    </Modal>
  )
}

// ─── Verkauf-Modal ────────────────────────────────────────────────────────────
function VerkaufModal({ position, onSave, onClose }) {
  const [vs, setVs] = useState("")
  const vn = Number(vs)
  const rest = Math.max(0, position.stueck - vn)

  return (
    <Modal titel={`Verkauf: ${position.name}`} onClose={onClose} breite={340}>
      <FormRow label={`Stücke verkaufen (max. ${fmt(position.stueck, 0)})`}>
        <input autoFocus type="number" min={0} max={position.stueck} step="any"
          value={vs} onChange={(e) => setVs(e.target.value)} style={inputStyle} />
      </FormRow>
      {vn > 0 && (
        <div style={{ color: C.muted, fontSize: 11, marginBottom: 14 }}>
          Verbleibend: <span style={{ color: C.text }}>{fmt(rest, 0)} Stück</span>
          {" · "}Erlös: <span style={{ color: C.green }}>{fmtEur(vn * position.kurs)}</span>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <GhostBtn onClick={onClose}>Abbrechen</GhostBtn>
        <Btn farbe={C.red} style={{ color: C.text }}
          onClick={() => vn > 0 && vn <= position.stueck && onSave({ stueck: vn })}>
          Verkaufen
        </Btn>
      </div>
    </Modal>
  )
}

// ─── PERFORMANCE TAB ──────────────────────────────────────────────────────────
function PerformanceTab({ positionen }) {
  const [zeitraumIdx, setZeitraumIdx] = useState(4)
  const [aktiveBM, setAktiveBM] = useState({ DAX: true, "MSCI World": true, "S&P 500": false, "EURO STOXX 50": false })
  const [indexed, setIndexed] = useState(true)

  const totalWert = positionen.reduce((s, p) => s + p.stueck * p.kurs, 0)

  const portfolioCAGR = useMemo(() => {
    if (totalWert === 0) return 0.07
    return positionen.reduce((sum, p) => sum + (p.stueck * p.kurs / totalWert) * assetParams(p).cagr, 0)
  }, [positionen, totalWert])

  const portfolioVol = useMemo(() => {
    if (totalWert === 0) return 0.12
    return positionen.reduce((sum, p) => sum + (p.stueck * p.kurs / totalWert) * assetParams(p).vol, 0)
  }, [positionen, totalWert])

  const { tage } = ZEITRAEUME[zeitraumIdx]
  const schritte = Math.min(tage, 260)

  const chartDaten = useMemo(() => {
    if (schritte <= 1) {
      return [
        { tag: "Gestern", Portfolio: indexed ? 100 : totalWert / (1 + portfolioCAGR / 252) },
        { tag: "Heute", Portfolio: indexed ? 100 * (1 + portfolioCAGR / 252) : totalWert },
      ]
    }

    const pfadEnd = indexed ? 100 * Math.pow(1 + portfolioCAGR, tage / 252) : totalWert
    const pfadStart = indexed ? 100 : totalWert / Math.pow(1 + portfolioCAGR, tage / 252)
    const portfolioPfad = brownianBridge(pfadStart, pfadEnd, schritte, portfolioVol, 42)

    const benchmarkPfade = {}
    BENCHMARKS.forEach((b) => {
      if (!aktiveBM[b.key] || !indexed) return
      const bEnd = 100 * Math.pow(1 + b.cagr, tage / 252)
      benchmarkPfade[b.key] = brownianBridge(100, bEnd, schritte, b.vol, b.key.length * 17)
    })

    const heute = new Date()
    return Array.from({ length: schritte }, (_, i) => {
      const d = new Date(heute)
      d.setDate(d.getDate() - (schritte - 1 - i))
      let tag
      if (tage <= 21) tag = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })
      else if (tage <= 252) tag = d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" })
      else tag = String(d.getFullYear())
      const pt = { tag, Portfolio: portfolioPfad[i] }
      BENCHMARKS.forEach((b) => { if (benchmarkPfade[b.key]) pt[b.key] = benchmarkPfade[b.key][i] })
      return pt
    })
  }, [schritte, tage, portfolioCAGR, portfolioVol, totalWert, indexed, aktiveBM])

  const letzter = chartDaten[chartDaten.length - 1]
  const erster = chartDaten[0]
  const portfolioRendite = erster?.Portfolio > 0 ? (letzter?.Portfolio - erster?.Portfolio) / erster?.Portfolio : 0

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {ZEITRAEUME.map((z, i) => (
            <GhostBtn key={z.label} aktiv={i === zeitraumIdx} onClick={() => setZeitraumIdx(i)}>{z.label}</GhostBtn>
          ))}
        </div>
        <div style={{ width: 1, height: 20, background: C.border, margin: "0 4px" }} />
        <GhostBtn aktiv={indexed} onClick={() => setIndexed(true)}>Indexiert</GhostBtn>
        <GhostBtn aktiv={!indexed} onClick={() => setIndexed(false)}>Absolut (€)</GhostBtn>
        {indexed && (
          <>
            <div style={{ width: 1, height: 20, background: C.border, margin: "0 4px" }} />
            {BENCHMARKS.map((b) => (
              <GhostBtn
                key={b.key}
                aktiv={aktiveBM[b.key]}
                onClick={() => setAktiveBM((prev) => ({ ...prev, [b.key]: !prev[b.key] }))}
                style={{ borderColor: aktiveBM[b.key] ? b.farbe : C.border, color: aktiveBM[b.key] ? b.farbe : C.muted }}
              >
                {b.key}
              </GhostBtn>
            ))}
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <KpiKachel
          titel={`Portfolio ${ZEITRAEUME[zeitraumIdx].label}`}
          wert={fmtPctSigned(portfolioRendite)}
          farbe={portfolioRendite >= 0 ? C.green : C.red}
        />
        {indexed && BENCHMARKS.filter((b) => aktiveBM[b.key]).map((b) => {
          const bEnd = letzter?.[b.key]
          const bStart = erster?.[b.key]
          const bRendite = bStart > 0 ? (bEnd - bStart) / bStart : 0
          const alpha = portfolioRendite - bRendite
          return (
            <KpiKachel
              key={b.key}
              titel={`Alpha vs. ${b.key}`}
              wert={fmtPctSigned(alpha)}
              sub={`${b.key}: ${fmtPctSigned(bRendite)}`}
              farbe={alpha >= 0 ? C.green : C.red}
            />
          )
        })}
      </div>

      <Karte style={{ padding: "16px 4px 8px" }}>
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={chartDaten} margin={{ top: 4, right: 20, left: 10, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="tag" tick={{ fill: C.muted, fontSize: 10 }} tickLine={false} axisLine={{ stroke: C.border }} interval="preserveStartEnd" />
            <YAxis
              tick={{ fill: C.muted, fontSize: 10 }} tickLine={false} axisLine={false}
              tickFormatter={(v) => indexed ? fmt(v, 0) : "€ " + fmt(v, 0)}
              width={indexed ? 36 : 72}
            />
            <Tooltip content={(props) => <LineTip {...props} indexed={indexed} />} />
            <Line dataKey="Portfolio" name="Portfolio" stroke={C.accent} strokeWidth={2} dot={false} />
            {indexed && BENCHMARKS.filter((b) => aktiveBM[b.key]).map((b) => (
              <Line key={b.key} dataKey={b.key} name={b.key} stroke={b.farbe} strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
            ))}
          </LineChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px 4px" }}>
          <span style={{
            background: C.yellow + "22", color: C.yellow, border: `1px solid ${C.yellow}55`,
            borderRadius: 3, padding: "1px 6px", fontSize: 10, fontWeight: 700,
          }}>MODELLIERT</span>
          <span style={{ color: C.muted, fontSize: 10 }}>
            Kursverläufe werden mittels Brownian Bridge simuliert (deterministisch, am aktuellen Kurs verankert). Keine realen Tageskurse.
          </span>
        </div>
      </Karte>
    </div>
  )
}

// ─── ALLOKATIONS TAB ─────────────────────────────────────────────────────────
function AllokationsTab({ positionen }) {
  const totalWert = positionen.reduce((s, p) => s + p.stueck * p.kurs, 0)

  const computed = positionen.map((p) => ({
    ...p,
    wert: p.stueck * p.kurs,
    ist: totalWert > 0 ? (p.stueck * p.kurs) / totalWert : 0,
  }))

  function gruppeDonut(schluessel, farbMap) {
    const gruppen = {}
    computed.forEach((p) => {
      const k = p[schluessel]
      gruppen[k] = (gruppen[k] ?? 0) + p.wert
    })
    return Object.entries(gruppen)
      .map(([name, wert]) => ({ name, value: totalWert > 0 ? wert / totalWert : 0 }))
      .sort((a, b) => b.value - a.value)
  }

  const assetDonut = gruppeDonut("assetType", ASSET_FARBE)
  const risikoDonut = gruppeDonut("risikogruppe", RISIKO_FARBE)
  const regionDonut = gruppeDonut("region", REGION_FARBE)

  const balkenDaten = computed
    .filter((p) => p.wert > 0 || p.soll > 0)
    .map((p) => ({
      name: p.ticker !== "-" ? p.ticker : p.name.split(" ").slice(-1)[0],
      Ist: p.ist,
      Soll: p.soll,
    }))
    .sort((a, b) => b.Soll - a.Soll)

  function DonutKarte({ titel, daten, farbMap }) {
    return (
      <Karte style={{ padding: "14px 16px", flex: 1, minWidth: 220 }}>
        <div style={{ color: C.muted, fontSize: 11, marginBottom: 10 }}>{titel}</div>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie data={daten} dataKey="value" cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={2}>
              {daten.map((d) => <Cell key={d.name} fill={farbMap[d.name] ?? C.muted} />)}
            </Pie>
            <Tooltip content={<PieTip />} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
          {daten.map((d) => (
            <div key={d.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
              <span style={{ color: farbMap[d.name] ?? C.muted }}>● {d.name}</span>
              <span style={{ color: C.text }}>{fmtPct(d.value)}</span>
            </div>
          ))}
        </div>
      </Karte>
    )
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <DonutKarte titel="Nach Asset-Typ" daten={assetDonut} farbMap={ASSET_FARBE} />
        <DonutKarte titel="Nach Risikogruppe" daten={risikoDonut} farbMap={RISIKO_FARBE} />
        <DonutKarte titel="Nach Region" daten={regionDonut} farbMap={REGION_FARBE} />
      </div>
      <Karte style={{ padding: "14px 16px" }}>
        <div style={{ color: C.muted, fontSize: 11, marginBottom: 14 }}>Ist-Allokation vs. Soll-Allokation</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={balkenDaten} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 10 }} axisLine={{ stroke: C.border }} tickLine={false} />
            <YAxis tickFormatter={(v) => fmtPct(v)} tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
            <Tooltip
              formatter={(v, n) => [fmtPct(v), n]}
              contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 11, fontFamily: "inherit" }}
            />
            <Bar dataKey="Ist" name="Ist" fill={C.accent} radius={[2, 2, 0, 0]} />
            <Bar dataKey="Soll" name="Soll" fill={C.purple} radius={[2, 2, 0, 0]} />
            <Legend wrapperStyle={{ fontSize: 11, color: C.muted }} />
          </BarChart>
        </ResponsiveContainer>
      </Karte>
    </div>
  )
}

// ─── SZENARIEN TAB ────────────────────────────────────────────────────────────
function SzenarienTab() {
  const [aktivId, setAktivId] = useState(1)
  const szenario = SZENARIEN.find((s) => s.id === aktivId) ?? SZENARIEN[0]

  const szenarioFarben = [C.accent, C.green, C.yellow, C.purple, C.orange]

  const vergleichDaten = ["Aktien", "Rohstoffe", "Anleihen", "Festgeld/Bar"].map((name) => {
    const row = { name }
    SZENARIEN.forEach((s) => {
      row[s.name] = s.allokation.find((a) => a.name === name)?.anteil ?? 0
    })
    return row
  })

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {SZENARIEN.map((s) => (
          <GhostBtn key={s.id} aktiv={s.id === aktivId} onClick={() => setAktivId(s.id)} style={{ padding: "6px 14px" }}>
            {s.name}
          </GhostBtn>
        ))}
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <Karte style={{ padding: "14px 16px", minWidth: 220, width: 260 }}>
          <div style={{ color: C.muted, fontSize: 11, marginBottom: 10 }}>{szenario.name}</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={szenario.allokation.map((a) => ({ name: a.name, value: a.anteil }))}
                dataKey="value" cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={2}
              >
                {szenario.allokation.map((a) => <Cell key={a.name} fill={a.farbe} />)}
              </Pie>
              <Tooltip content={<PieTip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
            {szenario.allokation.map((a) => (
              <div key={a.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                <span style={{ color: a.farbe }}>● {a.name}</span>
                <span style={{ color: C.text }}>{fmtPct(a.anteil)}</span>
              </div>
            ))}
          </div>
        </Karte>

        <Karte style={{ flex: 1, overflowX: "auto", minWidth: 300 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Kategorie", "Fokus", "Risikogruppe", "Ziel-Anteil", "Gebühren p.a."].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", color: C.muted, fontSize: 10, textAlign: "left", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {szenario.details.map((d) => (
                <tr key={d.kategorie}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.surface2)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "9px 12px", fontSize: 12, borderBottom: `1px solid ${C.border}`, color: ASSET_FARBE[d.kategorie.split("/")[0]] ?? C.text }}>{d.kategorie}</td>
                  <td style={{ padding: "9px 12px", fontSize: 12, borderBottom: `1px solid ${C.border}`, color: C.muted }}>{d.fokus}</td>
                  <td style={{ padding: "9px 12px", fontSize: 12, borderBottom: `1px solid ${C.border}`, color: C.muted }}>{d.risikogruppe}</td>
                  <td style={{ padding: "9px 12px", fontSize: 12, borderBottom: `1px solid ${C.border}`, color: C.text }}>{d.zielAnteil}</td>
                  <td style={{ padding: "9px 12px", fontSize: 12, borderBottom: `1px solid ${C.border}`, color: C.muted }}>{d.gebuehren}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Karte>
      </div>

      <Karte style={{ padding: "14px 16px" }}>
        <div style={{ color: C.muted, fontSize: 11, marginBottom: 14 }}>Allokationsvergleich aller Szenarien</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={vergleichDaten} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 10 }} axisLine={{ stroke: C.border }} tickLine={false} />
            <YAxis tickFormatter={(v) => fmtPct(v)} tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
            <Tooltip
              formatter={(v, n) => [fmtPct(v), n]}
              contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 11, fontFamily: "inherit" }}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: C.muted }} />
            {SZENARIEN.map((s, i) => (
              <Bar key={s.name} dataKey={s.name} stackId="a" fill={szenarioFarben[i]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Karte>
    </div>
  )
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: "portfolio", label: "Portfolio" },
  { id: "performance", label: "Performance" },
  { id: "allokation", label: "Allokation" },
  { id: "szenarien", label: "Szenarien" },
]

export default function App() {
  const [positionen, setPositionen] = useState(() => storage.get() ?? SEED)
  const [tab, setTab] = useState("portfolio")

  useEffect(() => {
    storage.set(positionen)
  }, [positionen])

  function onReset() {
    if (confirm("Alle Positionen auf Ausgangsdaten zurücksetzen?")) {
      storage.delete()
      setPositionen(SEED)
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'JetBrains Mono', monospace" }}>
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ padding: "14px 0", fontWeight: 700, fontSize: 14, color: C.accent, whiteSpace: "nowrap" }}>
            Portfolio Tracker
          </div>
          <nav style={{ display: "flex" }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  background: "none", border: "none",
                  color: tab === t.id ? C.text : C.muted,
                  borderBottom: `2px solid ${tab === t.id ? C.accent : "transparent"}`,
                  padding: "14px 16px", cursor: "pointer", fontSize: 12,
                  fontFamily: "inherit", fontWeight: tab === t.id ? 600 : 400,
                }}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: 24 }}>
        {tab === "portfolio" && (
          <PortfolioTab positionen={positionen} setPositionen={setPositionen} onReset={onReset} />
        )}
        {tab === "performance" && <PerformanceTab positionen={positionen} />}
        {tab === "allokation" && <AllokationsTab positionen={positionen} />}
        {tab === "szenarien" && <SzenarienTab />}
      </div>
    </div>
  )
}
