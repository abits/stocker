# CLAUDE.md — Portfolio Tracker

Dieses Dokument richtet sich an Claude (oder jeden anderen LLM-Assistenten), der in diesem Repository arbeitet. Es beschreibt Architektur, Konventionen, bekannte Einschränkungen und bevorzugte Vorgehensweisen, damit Änderungen konsistent und vorhersehbar bleiben.

---

## Projektüberblick

Single-Page-Anwendung (React 18 + Vite 5) zur Verwaltung eines persönlichen Anlageportfolios. Ausgangsbasis ist `Anlagestrategie.xlsx` — eine Excel-Datei mit ETF-, Rohstoff-, Anleihen-, Festgeld- und Tagesgeldpositionen sowie fünf Allokationsszenarien.

Die App läuft vollständig client-seitig. Es gibt kein Backend. Persistenz erfolgt über einen Storage-Adapter (Details unten).

---

## Dateistruktur

```
portfolio-tracker/
├── index.html            # Einstiegspunkt; lädt JetBrains Mono, bindet /src/main.jsx ein
├── vite.config.js        # Vite-Konfiguration (nur @vitejs/plugin-react)
├── package.json
├── .gitignore
├── README.md
├── CLAUDE.md             # dieses Dokument
├── REQUIREMENTS.md       # Produktanforderungen
└── src/
    ├── main.jsx          # React-Root: ReactDOM.createRoot → <App />
    ├── App.jsx           # Gesamte Anwendungslogik (eine Datei, ~730 LOC)
    └── storage.js        # Storage-Abstraktion (window.storage ↔ localStorage)
```

Die gesamte Anwendungslogik lebt bewusst in einer einzigen Datei (`App.jsx`). Extrahiere keine Komponenten in separate Dateien, außer du wirst explizit darum gebeten — die flache Struktur ist eine bewusste Entscheidung für Portabilität (die Datei wird auch als Claude-Artifact gerendert).

---

## Tech-Stack & Versionen

| Paket | Version | Zweck |
|-------|---------|-------|
| react | ^18.3.1 | UI-Framework |
| react-dom | ^18.3.1 | DOM-Rendering |
| recharts | ^2.12.7 | Alle Diagramme (PieChart, BarChart, LineChart) |
| vite | ^5.4.2 | Dev-Server, Build |
| @vitejs/plugin-react | ^4.3.1 | JSX-Transform |

Keine weiteren Abhängigkeiten hinzufügen, ohne explizite Aufforderung. Insbesondere kein Redux, kein React Router, kein Tailwind, kein shadcn/ui.

---

## Architektur-Entscheidungen & Rationale

### Zustandsverwaltung
State ausschließlich in der Root-Komponente (`App`). Kein Context, kein externer Store. Abgeleitete Werte (Invest, Wert, G/V, Ist-Allokation, Rebalancing-Delta) werden per `useMemo` berechnet, niemals direkt im State gespeichert.

```js
// Richtig: abgeleiteter Wert
const totals = useMemo(() => ({
  totalWert: computed.reduce((s, p) => s + p.wert, 0),
  ...
}), [computed]);

// Falsch: redundante State-Speicherung
const [totalWert, setTotalWert] = useState(0); // NICHT so
```

### Styling
Alle Styles als Inline-Objekte. Keine CSS-Dateien, keine CSS-Module, keine Tailwind-Klassen. Das macht die Datei als Claude-Artifact direkt renderbar.

```js
// Richtig
<div style={{ background: C.surface, border: `1px solid ${C.border}` }}>

// Falsch
<div className="card bg-surface border"> // NICHT so
```

### Farbpalette
Die komplette Palette ist in der Konstante `C` am Dateianfang definiert. Verwende **ausschließlich** diese Tokens — keine Hardcoded-Hex-Werte außerhalb von `C`.

```js
const C = {
  bg: "#0D1117",       // Hintergrund
  surface: "#161B22",  // Karten/Panels
  surface2: "#1C2230", // Tooltips
  border: "#30363D",
  text: "#E6EDF3",
  muted: "#8B949E",
  accent: "#58A6FF",   // Aktien, Primäraktion, Portfolio-Linie
  green: "#3FB950",    // Sicherheit, Gewinn, Kaufen
  red: "#F85149",      // Chance-Klasse, Verlust, Verkaufen
  yellow: "#D29922",   // Wachstum, DAX-Benchmark
  purple: "#BC8CFF",   // Anleihen, Soll-Allokation, S&P 500
  orange: "#FFA657",   // Rohstoffe
};
```

Farbsemantik ist **konsistent** zu halten. `C.green` bedeutet immer „gut/sicher", `C.red` bedeutet immer „riskant/negativ" — nicht tauschen.

### Diagramme
Alle Diagramme über Recharts. Eigene Tooltip-Komponenten (`PieTip`, anonyme Funktion in LineChart) für einheitliches Styling. `ResponsiveContainer width="100%"` immer verwenden.

---

## Storage-Adapter (`src/storage.js`)

```js
// Claude-Artifact-Umgebung: window.storage (inject runtime)
// Standalone-Browser:       localStorage (Fallback)
export const storage = { get, set, delete };
```

**Wichtig:** Im Code wird `storage` (aus dem Adapter-Import) verwendet, niemals direkt `window.storage` oder `localStorage`. Wenn du Storage-Calls hinzufügst, immer über diesen Adapter.

Storage-Key: `"portfolio:positions:v1"` — bei Breaking Changes im Datenmodell (neue Pflichtfelder) die Version erhöhen (`v2`, `v3`, …) und eine Migrations-Funktion schreiben.

---

## Datenmodell

### Position-Objekt
```js
{
  id: Number,              // eindeutig, auto-increment
  name: String,            // Anzeigename ("iShares Core MSCI World")
  ticker: String,          // Börsenkürzel ("EUNL") oder "-" für Festgeld/Tagesgeld
  assetType: String,       // "Aktien" | "Rohstoffe" | "Anleihen" | "Festgeld" | "Tagesgeld"
  region: String,          // "Industrieländer" | "Schwellenländer"
  risikogruppe: String,    // "Chance" | "Wachstum" | "Sicherheit"
  stueck: Number,          // Bestand (Stück oder Einheiten)
  kaufpreis: Number,       // Ø-Einstandspreis in EUR
  kurs: Number,            // Aktueller Kurs in EUR
  soll: Number,            // Soll-Allokation als Dezimalzahl (0.435 = 43,5 %)
  kategorie: String,       // "ETF" | "Festgeld" | "Tagesgeld"
  zins?: Number,           // Nur Festgeld/Tagesgeld: Zinssatz p.a. (0.017 = 1,7 %)
}
```

### Abgeleitete Werte (nie im State speichern)
```js
invest        = stueck * kaufpreis
wert          = stueck * kurs
gl            = wert - invest
rendite       = invest > 0 ? gl / invest : 0
ist           = wert / totalWert
rebalanceDelta = (soll - ist) * totalWert
```

### Transaktion: Zukauf (weighted average cost basis)
```js
neuerKaufpreis = (alteStueck * alterKaufpreis + neueStueck * preis) / (alteStueck + neueStueck)
neueStueckGesamt = alteStueck + neueStueck
```

### Transaktion: Verkauf
```js
neueStueckGesamt = max(0, alteStueck - verkaufteStueck)
// kaufpreis bleibt unverändert
```

---

## Performance-Simulation

Die Kursverläufe im Performance-Tab sind **modelliert**, keine echten Zeitreihen.

**Methode:** Brownian Bridge — stochastischer Pfad, der deterministisch von einem gerechneten Startpreis zum **realen aktuellen Kurs** als Endpunkt verläuft. Gleicher Seed → gleicher Pfad (reproduzierbar).

**Annahmen je Asset-Klasse:**

| Klasse | CAGR | Volatilität |
|--------|------|-------------|
| Festgeld / Tagesgeld | Zinssatz | 0,4 % |
| Anleihen | 2,0 % | 5 % |
| Rohstoffe | 4,0 % | 18 % |
| Aktien Industrieländer | 8,5 % | 15 % |
| Aktien Schwellenländer | 6,5 % | 20 % |
| Aktien Halbleiter | 14,0 % | 28 % |

**Benchmark-Annahmen:**

| Index | CAGR | Volatilität | Farbe |
|-------|------|-------------|-------|
| DAX | 8,0 % | 18 % | `C.yellow` |
| MSCI World | 9,0 % | 15 % | `C.green` |
| S&P 500 | 10,0 % | 16 % | `C.purple` |
| EURO STOXX 50 | 6,0 % | 17 % | `C.orange` |

**Transparenz-Anforderung:** Das Badge `MODELLIERT` und der erläuternde Text unterhalb des Diagramms dürfen nicht entfernt werden.

---

## Bekannte Einschränkungen

### Live-Kursabruf
`updatePrices()` ruft die Anthropic-API mit aktiviertem `web_search`-Tool auf. Das funktioniert nur, wenn die App innerhalb der Claude-Artifact-Umgebung läuft (API-Schlüssel wird automatisch injiziert). Im Standalone-Browser-Betrieb schlägt der Fetch mit einem Netzwerkfehler fehl — der graceful-degradation-Pfad zeigt eine Fehlermeldung, manuelle Kurspflege bleibt voll funktionsfähig.

Europäische Xetra-ETFs (XMME, EUNL, SXRS, EUNA) werden von US-zentrierten APIs oft schlecht abgedeckt. Die Web-Suche ist hier robuster als direkte Börsen-APIs.

### OneDrive / Excel-Backend
Explizit **nicht implementiert**. Würde Microsoft Graph OAuth2 + einen eigenen Proxy-Service erfordern (CORS). Ist im Storage-Adapter als zukünftiges drittes Backend vorgesehen.

### Historische Kursverläufe
Es gibt keine Transaktionshistorie. Alle Pfade werden bei jedem Render aus dem aktuellen Kurs zurückgerechnet. Für echte Rendite-Zeitreihen müsste eine Transaktionsdatenbank eingeführt werden.

### Festgeld / Tagesgeld
Diese Positionen haben keinen Börsenkurs. `kurs` entspricht dem aktuellen Guthaben (Kapital + aufgelaufene Zinsen). Der Kursabruf-Button überspringt diese Positionen.

---

## Erweiterungspunkte

### Echter Marktdaten-Feed
Ersetze `updatePrices()` durch einen Call gegen einen eigenen Proxy (z. B. Twelve Data oder Finnhub). Der Proxy löst das CORS-Problem und hält den API-Key serverseitig. Die Signatur von `setPositions(ps => ps.map(...))` bleibt unverändert.

### OneDrive-Backend
Implementiere ein drittes Branch im Storage-Adapter:
```js
// src/storage.js
const hasOneDrive = typeof window.msalInstance !== "undefined";
if (hasOneDrive) { /* Graph API calls */ }
else if (hasClaudeStorage) { /* window.storage */ }
else { /* localStorage */ }
```

### Transaktionshistorie
Füge ein zweites Storage-Key hinzu (`"portfolio:transactions:v1"`), das ein Array von Transaktionen speichert: `{ id, posId, type, stueck, preis, timestamp }`. Die abgeleiteten Werte (aktueller Bestand, Ø-Einstand) werden dann aus dieser Historie berechnet statt direkt gespeichert.

### GitHub Actions / Deployment
Für Deployment zu GitHub Pages:
```yaml
# .github/workflows/deploy.yml
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - uses: actions/deploy-pages@v4
```

---

## Entwicklungsworkflow

```bash
npm install         # Abhängigkeiten installieren
npm run dev         # Dev-Server auf http://localhost:5173
npm run build       # Produktions-Build nach dist/
npm run preview     # Produktions-Build lokal testen
```

---

## Coding-Konventionen

- **Sprache:** Alle Variablennamen, Kommentare und UI-Strings auf **Deutsch** (Ausnahme: React/JS-Schlüsselwörter, Bibliotheks-APIs).
- **Formatierung:** 2-Spaces-Einrückung, keine Semikolons am Zeilenende (außer wo JSX es verlangt).
- **Zahlenformate:** Immer über `fmt()`, `fmtEur()`, `fmtPct()`, `fmtPctSigned()` — niemals `toFixed()` direkt in JSX.
- **Keine `console.log`** im Produktionscode.
- **Keine `any`-Typen** (Projekt ist plain JS, nicht TypeScript — aber wenn TypeScript eingeführt wird: strikte Typen).
- **Kein `!important`** in Styles.

---

## Git-Konventionen

```
Initial commit: portfolio tracker (React/Vite)    ← erster Commit
feat: add transaction history                      ← neue Funktion
fix: correct weighted average on partial sell      ← Bugfix
refactor: extract position table component         ← Umstrukturierung
docs: update REQUIREMENTS with OneDrive scope      ← Dokumentation
```

Branch-Strategie: `main` (oder `master`) ist der stabile Branch. Feature-Branches für größere Änderungen.
