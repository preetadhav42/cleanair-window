# CleanAir Window 🍃 (India Edition — Pune, Mumbai, Delhi)

> **Hackathon MVP**: A clean, accessible, responsive air-quality dashboard that calculates the optimal daily outdoor exercise window (Morning, Afternoon, or Evening) across **Pune**, **Mumbai**, and **Delhi** using India's official **Central Pollution Control Board (CPCB) National Air Quality Index (NAQI)**.

---

## ⚠️ Important Disclaimer & Data Transparency
* **SAMPLE DATA — NOT REAL READINGS**: All readings across Pune, Mumbai, and Delhi are static simulated mock data created solely for hackathon prototyping and evaluation.
* **NOT MEDICAL ADVICE**: CleanAir Window offers general algorithmic comparison for demonstration purposes. A lower AQI indicates relative comparison only and does not guarantee safe breathing conditions, particularly for vulnerable populations (asthma, cardiovascular disease, pregnant individuals, elderly, or children). Always consult qualified healthcare professionals and regional environmental protection agencies.

---

## 🏛️ Government Data Source Investigation (CPCB & Data.gov.in)

An engineering investigation was conducted to determine the feasibility of retrieving real Indian AQI readings directly from official government endpoints:

### 1. Open Government Data Platform India (`data.gov.in`)
* **Endpoint Tested:** `https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69` (*CPCB Real time Air Quality Index*).
* **Investigation Findings:**
  * Direct unauthenticated calls return: `{"error": "Authorization field missing"}`.
  * The API strictly mandates an `api-key` query parameter tied to an individually registered citizen/developer account on `data.gov.in`.
  * Hardcoding private API credentials into client-side code is insecure and violates hackathon guidelines.

### 2. CPCB CAAQMS Feed (`airquality.cpcb.gov.in`)
* **Endpoint Tested:** `https://airquality.cpcb.gov.in/caaqms/rss_feed` (*City AQI XML Feed*).
* **Investigation Findings:**
  * While the endpoint returns HTTP 200 via backend tools, **it does not provide `Access-Control-Allow-Origin` CORS headers**.
  * Any direct `fetch()` call originating from a web browser (e.g., `http://localhost:8000` or `file:///`) is immediately blocked by browser security (Same-Origin Policy).
  * Furthermore, the feed publishes a single instantaneous snapshot rather than the three distinct time-of-day blocks (Morning, Afternoon, Evening) necessary to evaluate daily diurnal windows.

### 3. Conclusion & Implementation
Because direct client-side integration with official government APIs is blocked by mandatory authentication keys and browser CORS policies, **clearly labelled simulated readings** formatted strictly to CPCB NAQI specifications are provided for **Pune**, **Mumbai**, and **Delhi**. Simulated readings are **never presented as real**.

---

## 🇮🇳 India CPCB National AQI (NAQI) Scale Reference

CleanAir Window adopts the official National Air Quality Index (NAQI) standard published by the Central Pollution Control Board (CPCB), Ministry of Environment, Forest and Climate Change (MoEFCC):

| AQI Band | CPCB Category | Color Token | Official CPCB Health Impact & Precaution |
|---|---|---|---|
| **0 – 50** | **Good** | Dark Green (`#16a34a`) | **Minimal impact.** Cleanest air conditions. Safe and optimal for all outdoor workouts. |
| **51 – 100** | **Satisfactory** | Light Green (`#65a30d`) | **Minor breathing discomfort to sensitive people.** Safe for general population; sensitive individuals watch for minor irritation. |
| **101 – 200** | **Moderate** | Amber Gold (`#d97706`) | **Breathing discomfort to people with lung/heart disease.** Jogging/cycling caution triggered. |
| **201 – 300** | **Poor** | Orange (`#ea580c`) | **Breathing discomfort to most people on prolonged exposure.** High-intensity outdoor workouts not recommended. |
| **301 – 400** | **Very Poor** | Red (`#dc2626`) | **Respiratory illness on prolonged exposure.** Pronounced effect on people with lung/heart diseases. Move physical activity indoors. |
| **401 – 500** | **Severe** | Dark Red / Maroon (`#7f1d1d`) | **Affects healthy people and seriously impacts vulnerable groups.** Cease outdoor activities. |

---

## 🌟 Key Features & Implementation

| Feature / Requirement | Implementation in CleanAir Window |
|---|---|
| **1. Modern Dashboard** | Built with vanilla HTML5, CSS3, and JavaScript. Zero frameworks or build dependencies. Fast, responsive, accessible. |
| **2. Clean City Selection** | Clean dropdown with only **Pune**, **Mumbai**, and **Delhi**. No clutter or distracting demo labels. |
| **3. Morning, Afternoon, Evening Cards** | Distinct cards displaying CPCB NAQI score, CPCB category pill, primary monitored pollutant (PM2.5, PM10, Ozone, NO2), temperature, and humidity. |
| **4. Lowest AQI Recommendation** | Automatically analyzes all valid time slots and highlights the window with the lowest pollution index. |
| **5. Tie-Breaking Protocol** | When multiple slots share the lowest AQI, the earliest chronological slot (Morning > Afternoon > Evening) is selected, and an explicit **"Tie Detected"** announcement is displayed. |
| **6. Minimum 2 Valid Readings Rule** | Requires at least 2 valid readings to recommend an optimal window. If fewer than 2 valid readings exist in a dataset, displays a clear **"Insufficient Station Data"** notice. |
| **7. Interactive Comparison Chart** | Powered by **Chart.js (via CDN)**. Renders color-coded bars corresponding to CPCB NAQI categories with responsive tooltips and highlights for the chosen window. |
| **8. Activity Selector** | Seamless toggle between **Walking**, **Jogging**, and **Cycling**. |
| **9. Activity Precautions & AQI > 100 Caution** | If recommended AQI > 100 (Moderate, Poor, Very Poor, Severe), a prominent caution banner appears. Selecting **Jogging** or **Cycling** triggers an additional **CPCB Respiratory Safeguard Alert** explaining alveolar particulate risks. Changing activity **does not** alter the recommended window. |
| **10. Missing / Invalid Data Handling** | Null, offline, or corrupted readings are visually identified as "Offline / Missing" and strictly excluded from comparisons. |
| **11. Sample Data Badge** | Prominent, persistent header pill with an animated pulsing indicator: **"SAMPLE DATA — NOT REAL READINGS"**. |
| **12. Safety & Medical Disclaimer** | Dedicated card explaining guidance limitations and why lower AQI does not guarantee absolute safety. |
| **13. Responsive Layout** | Mobile-first CSS Grid and Flexbox layout tested across smartphones, tablets, and widescreen displays. |

---

## 🏙️ Monitored Cities & Stations

1. **Pune (Shivajinagar Station):**
   - Morning: 68 (Satisfactory) | Afternoon: 110 (Moderate) | Evening: 88 (Satisfactory)
   - *Recommendation:* Morning (68 AQI, Satisfactory)
2. **Mumbai (Bandra Kurla Complex):**
   - Morning: 128 (Moderate) | Afternoon: 85 (Satisfactory) | Evening: 142 (Moderate)
   - *Recommendation:* Afternoon (85 AQI, Satisfactory — afternoon sea-breeze clearance)
3. **Delhi (Anand Vihar Station):**
   - Morning: 340 (Very Poor) | Afternoon: 225 (Poor) | Evening: 385 (Very Poor)
   - *Recommendation:* Afternoon (225 AQI, Poor — triggers elevated caution banner and respiratory alert for jogging/cycling)

---

## 🚀 How to Run the Website Locally

### Option 1: Direct Browser Opening (Quickest)
1. Open the project folder in Finder.
2. Double-click **`index.html`** or drag it into any web browser (Chrome, Safari, Firefox, Edge).
3. The dashboard loads immediately. Both `sample-data.js` and `sample-data.json` are included to guarantee offline/local `file://` compatibility without CORS hurdles.

### Option 2: Using Python's Built-In HTTP Server (Recommended)
Open your terminal in this directory and run:
```bash
python3 -m http.server 8000
```
Then visit [http://localhost:8000](http://localhost:8000) in your browser.

### Option 3: Using Node / npx
```bash
npx serve .
```

---

## 📁 Project Structure

```text
CleanAirWindow/
├── index.html         # Accessible HTML5 dashboard with CPCB scale & city selector
├── style.css          # Modern design system with official CPCB NAQI color tokens
├── script.js          # Core recommendation engine, tie-breaking & CPCB guidance
├── sample-data.js     # Simulated CPCB dataset exposed via window for zero-CORS file:// launch
├── sample-data.json   # Machine-readable JSON mock dataset for standard REST pipelines
└── README.md          # Technical documentation, government API findings, & city details
```
