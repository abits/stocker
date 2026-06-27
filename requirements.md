# Portfolio Tracker — Anforderungsdokument

**Status:** v1.0 · Stand: Juni 2026  
**Quelle:** `Anlagestrategie.xlsx` (Anlagestrategie Container)

---

## 1. Kontext & Ausgangslage

Die Anwendung entsteht aus einer bestehenden Excel-Datei (`Anlagestrategie.xlsx`), die ein persönliches Anlageportfolio mit rund 256.000 € Gesamtwert beschreibt. Das Blatt „Anlagestrategie Container" enthält Positionen in fünf Anlageklassen — Aktien (ETFs), Rohstoffe, Anleihen, Festgeld und Tagesgeld — sowie fünf alternative Allokationsszenarien und qualitative Strategienotizen.

Ziel ist eine **eigenständige Web-Applikation** (Single-Page Application), die das Portfolio jederzeit aktuell, auswertbar und verwaltbar hält. Eine Konvertierung von Excel in eine echte Anwendung ist explizit erwünscht; Excel wird nicht als laufendes Backend verwendet.

---

## 2. Funktionale Anforderungen

### 2.1 Portfolioverwaltung

| ID | Anforderung | Priorität |
|----|-------------|-----------|
| F-01 | Anzeige aller Positionen in einer tabellarischen Übersicht | Muss |
| F-02 | Neue Positionen hinzufügen (Name, Ticker, Asset-Typ, Region, Risikogruppe, Stück, Kaufpreis, Kurs, Soll-Allokation) | Muss |
| F-03 | Bestehende Positionen bearbeiten (aktueller Kurs, Soll-Allokation) | Muss |
| F-04 | Positionen löschen | Muss |
| F-05 | **Aufstocken / Zukauf**: Berechnung des neuen gewichteten Durchschnitts-Einstandspreises | Muss |
| F-06 | **Teilverkauf / Vollverkauf**: Reduzierung des Bestands, Einstandspreis bleibt erhalten | Muss |
| F-07 | Anzeige von Stück, Ø-Kaufpreis, aktuellem Kurs, Investitionsbetrag, aktuellem Wert, absolutem G/V, Rendite (%) | Muss |
| F-08 | Berechnung und Anzeige von Ist-Allokation und Soll-Allokation je Position | Muss |
| F-09 | Rebalancing-Delta je Position (Betrag in €, farbcodiert: grün = untergewichtet, rot = übergewichtet) | Muss |
| F-10 | Portfolio-Summenzeile (Gesamt-Invest, Gesamt-Wert, Gesamt-G/V, Gesamt-Rendite) | Muss |
| F-11 | KPI-Kacheln: Gesamtwert, Investiert, Gewinn/Verlust, Anzahl Positionen | Muss |

### 2.2 Performance-Analyse

| ID | Anforderung | Priorität |
|----|-------------|-----------|
| F-20 | Liniendiagramm der Portfolio-Wertentwicklung | Muss |
| F-21 | Zeitraum-Auswahl: 1T / 1W / 1M / 3M / 1J / 3J / 5J | Muss |
| F-22 | Benchmark-Vergleich: DAX, MSCI World, S&P 500, EURO STOXX 50 | Muss |
| F-23 | Benchmarks einzeln ein-/ausblendbar | Muss |
| F-24 | Indexierte Ansicht (Start = 100) für direkten Portfolio-Benchmark-Vergleich | Muss |
| F-25 | Absolute Wert-Ansicht in € (ohne Benchmark, da nicht skalierungsgleich) | Soll |
| F-26 | Anzeige der Performance-Rendite je Zeitraum als Stat-Kachel | Soll |
| F-27 | Alpha-Berechnung (Portfolio-Rendite minus Benchmark-Rendite) je Benchmark | Soll |

### 2.3 Allokationsanalyse

| ID | Anforderung | Priorität |
|----|-------------|-----------|
| F-30 | Donut-Chart: Allokation nach Asset-Typ (Aktien, Rohstoffe, Anleihen, Festgeld, Tagesgeld) | Muss |
| F-31 | Donut-Chart: Allokation nach Risikogruppe (Chance, Wachstum, Sicherheit) | Muss |
| F-32 | Donut-Chart: Allokation nach Region (Industrieländer, Schwellenländer) | Soll |
| F-33 | Balkendiagramm: Ist-Allokation vs. Soll-Allokation je Position | Muss |

### 2.4 Szenarien-Vergleich

| ID | Anforderung | Priorität |
|----|-------------|-----------|
| F-40 | Darstellung der fünf Allokationsszenarien aus `Anlagestrategie.xlsx` | Muss |
| F-41 | Interaktive Szenarioauswahl | Muss |
| F-42 | Detailtabelle je Szenario: Kategorie, Fokus, Risikogruppe, Ziel-Anteil, Gebühren p.a. | Muss |
| F-43 | Allokations-Donut je ausgewähltem Szenario | Muss |
| F-44 | Gestapeltes Balkendiagramm: Vergleich aller fünf Szenarien nach Anlageklasse | Soll |

### 2.5 Datenpflege & Live-Kurse

| ID | Anforderung | Priorität |
|----|-------------|-----------|
| F-50 | Manuelle Kurserfassung für alle Positionen | Muss |
| F-51 | Schaltfläche „Kurse aktualisieren": automatischer Abruf aktueller Marktpreise in EUR für börsengehandelte ETFs | Soll |
| F-52 | Live-Kursabruf via Websuche (Anthropic API); Festgeld/Tagesgeld ausgenommen | Soll |
| F-53 | Statusanzeige nach Kursabruf: Erfolg mit Zeitstempel, Fehler mit Erklärung | Muss |
| F-54 | Graceful Degradation: Wenn Kursabruf gesperrt ist, bleibt manuelle Eingabe vollständig funktionsfähig | Muss |

### 2.6 Persistenz

| ID | Anforderung | Priorität |
|----|-------------|-----------|
| F-60 | Portfoliodaten werden sitzungsübergreifend gespeichert (Reload-fest) | Muss |
| F-61 | Primäres Backend: Claude Artifact Storage (`window.storage`) | Muss |
| F-62 | Fallback-Backend: `localStorage` für Betrieb außerhalb der Claude-Umgebung | Muss |
| F-63 | Abstraktion über Storage-Adapter (`src/storage.js`), sodass Backends austauschbar bleiben | Muss |
| F-64 | Funktion „Zurücksetzen": Wiederherstellung der Ausgangsdaten aus `Anlagestrategie.xlsx` | Soll |

---

## 3. Nicht-funktionale Anforderungen

### 3.1 Architektur

- **Single-Page Application**, kein Backend-Server erforderlich.
- **React 18** mit funktionalen Komponenten und Hooks; kein Redux, kein Context API (State lokal in der Root-Komponente + Memoization via `useMemo`).
- **Vite 5** als Build-Tool; Deployment-fertig für statische Hosts (Netlify, Vercel, GitHub Pages).
- **Recharts 2** für alle Diagramme (Pie/Donut, Bar, Line).
- Keine externen CSS-Frameworks; alle Styles als Inline-Style-Objekte (portabel, keine Build-Pipeline nötig).

### 3.2 Design

- **Dunkles Terminal-Ästhetik** (`#0D1117` Hintergrundbasis, angelehnt an GitHub Dark).
- Monospace-Schrift (`JetBrains Mono`) für alle Zahlenwerte zur Lesbarkeit von Kolonnen.
- Akzentfarbe `#58A6FF` (Blue), semantisch: Aktien, Primäraktion.
- Farbsemantik konsistent: Grün = Sicherheit / positiv, Gelb = Wachstum / neutral, Rot = Chance / negativ.
- Responsive Tabellenlayout mit horizontalem Scroll auf kleinen Viewports.
- Kein Einsatz von generischen UI-Bibliotheken (kein MUI, kein shadcn/ui) — intentional opinionated design.

### 3.3 Daten & Transparenz

- Historische Kursverläufe im Performance-Tab sind **modelliert** (Brownian-Bridge-Simulation, verankert am realen aktuellen Kurs). Dies ist in der UI durch ein sichtbares Badge **MODELLIERT** und einen Erklärungstext kenntlich zu machen.
- Für echte Tageskurse ist der Button „Kurse aktualisieren" zu verwenden oder manuelle Pflege.

### 3.4 Erweiterbarkeit

Die Architektur soll folgende zukünftige Erweiterungen ermöglichen, ohne Refactoring zu erfordern:

- Austausch des Storage-Adapters gegen ein echtes Backend (Microsoft Graph / OneDrive-Excel via REST, eigener Node-Proxy).
- Integration eines echten Marktdaten-Feeds (Twelve Data, Finnhub) über einen Proxy-Service.
- Historisierung von Transaktionen für echte Renditezeitreihen (statt modellierter Pfade).
- Deployment-Pipeline via GitHub Actions (GitHub Pages, Netlify, Vercel).

---

## 4. Ausgangsdaten aus `Anlagestrategie.xlsx`

### 4.1 Positionen (Seed-Daten)

| Ticker | Name | Asset-Typ | Region | Risikogruppe | Stück | Ø-Kauf (€) | Kurs (€) | Soll |
|--------|------|-----------|--------|--------------|-------|------------|---------|------|
| XMME | iShares MSCI EM | Aktien | Schwellenländer | Chance | 279 | 75,497 | 83,522 | 8,7 % |
| EUNL | iShares Core MSCI World | Aktien | Industrieländer | Wachstum | 459 | 131,183 | 135,99 | 43,5 % |
| SEC0 | iShares Semiconductor | Aktien | Industrieländer | Chance | 11 | 69,70 | 49,40 | 0,0 % |
| SXRS | iShares Div. Commodity | Rohstoffe | Industrieländer | Chance | 0 | 52,87 | 52,87 | 8,7 % |
| EUNA | iShares EUR Aggregate | Anleihen | Industrieländer | Sicherheit | 200 | 149,715 | 149,38 | 13,0 % |
| – | ING DiBa Festgeld 6 Mo | Festgeld | Industrieländer | Sicherheit | 1 | 35.000 | 35.297,50 | 13,0 % |
| – | ING DiBa Festgeld 3 Mo | Festgeld | Industrieländer | Sicherheit | 1 | 50.000 | 50.200 | 0,0 % |
| – | ING DiBa Extrakonto | Tagesgeld | Industrieländer | Sicherheit | 1 | 54.016,98 | 54.422,11 | 13,0 % |

### 4.2 Szenarien

| # | Name | Aktien | Rohstoffe/Gold | Anleihen | Festgeld/Bar |
|---|------|--------|---------------|---------|-------------|
| 1 | Minimal | 55 % | 20 % | 10 % | 15 % |
| 2 | Aktien Breit | 50 % | 15 % | 20 % | 15 % |
| 3 | Aktien Gold | 50 % | 10 % | 15 % | 25 % |
| 4 | Aktien Festgeld Intermediate | 50 % | 10 % | 15 % | 25 % |
| 5 | Aktien Breit Plus | 45 % | 20 % | 15 % | 20 % |

---

## 5. Explizit ausgeschlossen (Out of Scope v1)

- Echtzeit-Streaming-Kurse (WebSocket / SSE).
- Multi-User / Authentifizierung.
- Steuerberechnung (Abgeltungsteuer, Vorabpauschale).
- Dividendenverfolgung.
- Direktanbindung an einen Broker via API.
- OneDrive/Excel als Live-Backend (erfordert eigenen OAuth-Proxy-Service).
