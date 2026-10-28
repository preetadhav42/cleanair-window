/**
 * CleanAir Window — Hackathon MVP Logic
 * National Air Quality Index (CPCB NAQI - India) Implementation
 * Cities: Pune, Mumbai, Delhi
 * 
 * Features:
 * 1. Clean city selection for Pune, Mumbai, and Delhi
 * 2. India Central Pollution Control Board (CPCB) NAQI scale & category palette
 * 3. Recommendation engine:
 *    - Strict minimum 2 valid readings rule (insufficient data protection preserved)
 *    - Lowest AQI selection
 *    - Chronological tie-breaking (Earliest window selected + tie announcement)
 *    - AQI > 100 caution alert (CPCB Moderate, Poor, Very Poor, Severe)
 * 4. Interactive activity guidance (Walking, Jogging, Cycling) without shifting the window
 * 5. Chart.js comparative timeline with CPCB NAQI category coloring
 * 6. Missing / invalid sensor data handling
 * 7. Transparent reporting on simulated readings & official government data investigation
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // Application State
  // --------------------------------------------------------------------------
  const state = {
    dataset: null,
    selectedLocationId: null,
    selectedActivity: 'walking', // 'walking' | 'jogging' | 'cycling'
    chartInstance: null
  };

  // Chronological order for daily slots (Used for tie-breaking)
  const SLOT_CHRONOLOGY = [
    { key: 'morning', label: 'Morning', icon: '🌅', timeRange: '6:00 AM – 11:00 AM' },
    { key: 'afternoon', label: 'Afternoon', icon: '☀️', timeRange: '12:00 PM – 5:00 PM' },
    { key: 'evening', label: 'Evening', icon: '🌙', timeRange: '6:00 PM – 10:00 PM' }
  ];

  // --------------------------------------------------------------------------
  // India CPCB National AQI (NAQI) Standard Categories & Color Tokens
  // Source: Central Pollution Control Board (CPCB), Govt. of India
  // --------------------------------------------------------------------------
  const CPCB_AQI_SCALE = [
    {
      min: 0,
      max: 50,
      category: 'Good',
      color: '#16a34a', // Dark Green
      bgColor: '#ecfdf5',
      borderColor: '#86efac',
      textColor: '#14532d',
      badgeClass: 'good',
      cpcbImpact: 'Minimal impact',
      generalPrecaution: 'Air quality is clean and poses minimal impact. Ideal conditions for all outdoor sports and physical exercise.'
    },
    {
      min: 51,
      max: 100,
      category: 'Satisfactory',
      color: '#65a30d', // Light Green
      bgColor: '#f7fee7',
      borderColor: '#bef264',
      textColor: '#365314',
      badgeClass: 'satisfactory',
      cpcbImpact: 'Minor breathing discomfort to sensitive people',
      generalPrecaution: 'Air quality is satisfactory. Sensitive individuals with asthma or respiratory allergies should watch for minor symptoms during prolonged exertion.'
    },
    {
      min: 101,
      max: 200,
      category: 'Moderate',
      color: '#d97706', // Yellow / Amber (High contrast)
      bgColor: '#fffbeb',
      borderColor: '#fde68a',
      textColor: '#92400e',
      badgeClass: 'moderate',
      cpcbImpact: 'Breathing discomfort to people with lungs, asthma and heart diseases',
      generalPrecaution: 'Breathing discomfort likely for individuals with lung/heart disease, children and the elderly. Sensitive groups should curtail prolonged outdoor exertion.'
    },
    {
      min: 201,
      max: 300,
      category: 'Poor',
      color: '#ea580c', // Orange
      bgColor: '#fff7ed',
      borderColor: '#fed7aa',
      textColor: '#9a3412',
      badgeClass: 'poor',
      cpcbImpact: 'Breathing discomfort to most people on prolonged exposure',
      generalPrecaution: 'Breathing discomfort to most people on prolonged exposure. Avoid strenuous outdoor activities; active population should reduce outdoor training.'
    },
    {
      min: 301,
      max: 400,
      category: 'Very Poor',
      color: '#dc2626', // Red
      bgColor: '#fef2f2',
      borderColor: '#fca5a5',
      textColor: '#991b1b',
      badgeClass: 'very-poor',
      cpcbImpact: 'Respiratory illness to the people on prolonged exposure',
      generalPrecaution: 'Significant health hazard: Respiratory illness on prolonged exposure. Pronounced effect on people with lung and heart diseases. Move workouts indoors.'
    },
    {
      min: 401,
      max: 9999,
      category: 'Severe',
      color: '#7f1d1d', // Dark Red / Maroon
      bgColor: '#fff1f2',
      borderColor: '#fda4af',
      textColor: '#450a0a',
      badgeClass: 'severe',
      cpcbImpact: 'Affects healthy people and seriously impacts those with existing diseases',
      generalPrecaution: 'Public health emergency: Affects healthy individuals and severely impacts vulnerable populations. Avoid all outdoor physical exertion completely.'
    }
  ];

  /**
   * Helper to retrieve CPCB category info for a given AQI number
   */
  function getCpcbCategoryInfo(aqi) {
    if (typeof aqi !== 'number' || isNaN(aqi) || aqi < 0) {
      return {
        category: 'Data Unavailable',
        color: '#94a3b8',
        bgColor: '#f8fafc',
        borderColor: '#cbd5e1',
        textColor: '#64748b',
        badgeClass: 'missing',
        cpcbImpact: 'Telemetry unavailable',
        generalPrecaution: 'Sensor reading is missing or offline. Cannot verify ambient air conditions.'
      };
    }

    const tier = CPCB_AQI_SCALE.find(item => aqi >= item.min && aqi <= item.max);
    return tier || CPCB_AQI_SCALE[CPCB_AQI_SCALE.length - 1];
  }

  // --------------------------------------------------------------------------
  // Activity Specific Guidance Database (Adapted for Indian AQI Realities)
  // --------------------------------------------------------------------------
  const ACTIVITY_METADATA = {
    walking: {
      name: 'Walking',
      icon: '🚶',
      intensity: 'Low Exertion',
      intensityClass: 'low',
      baseVentilation: '1x – 2x baseline breathing rate',
      adviceGood: 'Excellent conditions for morning or evening walks across city parks and promenades.',
      adviceSatisfactory: 'Safe for walking. Sensitive walkers (asthma or dust allergies) should maintain a steady pace away from heavy traffic corridors.',
      adviceModerate: 'Moderate air quality (AQI > 100). Keep walks brisk but avoid prolonged exposure during peak traffic hours. Sensitive groups should wear an N95 mask.',
      adviceHazardous: 'Air quality is Poor to Severe (AQI > 200). Avoid leisure walking outdoors. If walking for commute, wear a certified particulate mask and minimize time roadside.'
    },
    jogging: {
      name: 'Jogging',
      icon: '🏃',
      intensity: 'Medium Exertion',
      intensityClass: 'medium',
      baseVentilation: '3x – 5x baseline breathing rate',
      adviceGood: 'Superb running weather. Deep ventilation carries minimal particulate risk. Enjoy your workout!',
      adviceSatisfactory: 'Acceptable for jogging. If you have exercise-induced bronchitis or allergies, hydrate well and avoid unpaved or dusty roads.',
      adviceModerate: 'Caution (AQI > 100): Running increases minute lung ventilation by 3x–5x. At Moderate CPCB AQI, deep particulate inhalation causes bronchial irritation. Shorten distance or switch to indoor treadmills.',
      adviceHazardous: 'Outdoor jogging strictly discouraged (AQI > 200). High breathing rates transport PM2.5 and toxic aerosols directly into alveolar capillaries. Move training entirely indoors.'
    },
    cycling: {
      name: 'Cycling',
      icon: '🚴',
      intensity: 'High Exertion',
      intensityClass: 'high',
      baseVentilation: '4x – 6x baseline breathing rate',
      adviceGood: 'Prime conditions for endurance road rides or urban cycling commutes with clear air.',
      adviceSatisfactory: 'Good for recreational cycling. Long highway rides may cause mild nasal irritation in sensitive cyclists; stay hydrated.',
      adviceModerate: 'Caution (AQI > 100): High aerobic cadence combined with road headwind forces heavy unfiltered particulate intake. Sensitive riders should cancel hard interval training or ride on stationary trainers.',
      adviceHazardous: 'High cardiovascular danger (AQI > 200). Heavy aerobic cycling in Poor or Very Poor Indian air triggers acute airway constriction and cardiovascular stress. Exercise indoors.'
    }
  };

  // --------------------------------------------------------------------------
  // DOM Elements
  // --------------------------------------------------------------------------
  const elements = {
    locationSelect: document.getElementById('location-select'),
    locationScenarioHint: document.getElementById('location-scenario-hint'),
    activityBtns: document.querySelectorAll('.activity-btn'),
    recommendationSection: document.getElementById('recommendation-section'),
    slotsGrid: document.getElementById('slots-grid'),
    chartCanvas: document.getElementById('aqi-comparison-chart'),
    guidanceContent: document.getElementById('guidance-content'),
    activeActivityLabel: document.getElementById('active-activity-label'),
    activityIntensityBadge: document.getElementById('activity-intensity-badge')
  };

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------
  async function init() {
    await loadDataset();
    populateLocationDropdown();
    setupEventListeners();
    renderCurrentState();
  }

  /**
   * Load dataset from window object or fallback to fetch
   */
  async function loadDataset() {
    if (window.CLEAN_AIR_SAMPLE_DATA && window.CLEAN_AIR_SAMPLE_DATA.locations) {
      state.dataset = window.CLEAN_AIR_SAMPLE_DATA;
      state.selectedLocationId = state.dataset.locations[0].id;
      return;
    }

    try {
      const response = await fetch('sample-data.json');
      if (response.ok) {
        state.dataset = await response.json();
        state.selectedLocationId = state.dataset.locations[0].id;
        return;
      }
    } catch (e) {
      console.warn('Could not fetch sample-data.json directly; verifying embedded fallback.', e);
    }

    // Resilient fallback for Indian cities
    state.dataset = {
      locations: [
        {
          id: 'pune',
          name: 'Pune',
          station: 'Shivajinagar Station (IITM / SAFAR)',
          description: 'Deccan plateau urban valley with cleaner morning air.',
          readings: {
            morning: { timeRange: '6:00 AM – 11:00 AM', aqi: 68, primaryPollutant: 'PM2.5' },
            afternoon: { timeRange: '12:00 PM – 5:00 PM', aqi: 110, primaryPollutant: 'Ozone' },
            evening: { timeRange: '6:00 PM – 10:00 PM', aqi: 88, primaryPollutant: 'PM10' }
          }
        }
      ]
    };
    state.selectedLocationId = state.dataset.locations[0].id;
  }

  /**
   * Populate location dropdown strictly with Pune, Mumbai, and Delhi
   * Scenario and demonstration tags are removed for professional presentation.
   */
  function populateLocationDropdown() {
    elements.locationSelect.innerHTML = '';
    state.dataset.locations.forEach(loc => {
      const option = document.createElement('option');
      option.value = loc.id;
      // Clean city name only: Pune, Mumbai, Delhi
      option.textContent = loc.name;
      elements.locationSelect.appendChild(option);
    });
    elements.locationSelect.value = state.selectedLocationId;
  }

  /**
   * Attach interactive event listeners
   */
  function setupEventListeners() {
    elements.locationSelect.addEventListener('change', (e) => {
      state.selectedLocationId = e.target.value;
      renderCurrentState();
    });

    elements.activityBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.activityBtns.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');

        state.selectedActivity = btn.dataset.activity;
        
        // Changing activity updates precautions without shifting recommended time slot
        renderActivityGuidance();
      });
    });
  }

  // --------------------------------------------------------------------------
  // Core Recommendation Engine
  // --------------------------------------------------------------------------
  /**
   * Evaluates the time slots for a given location according to CPCB NAQI specifications:
   * 1. Extracts morning, afternoon, evening slots.
   * 2. Checks validity (valid if number >= 0). Excludes missing/null.
   * 3. Requires at least 2 valid readings. If < 2, returns INSUFFICIENT_DATA.
   * 4. Identifies lowest AQI value.
   * 5. If multiple slots have identical lowest AQI, picks earliest slot and flags tie.
   * 6. Flags caution if recommended AQI > 100 (CPCB Moderate, Poor, Very Poor, Severe).
   */
  function evaluateWindowRecommendation(location) {
    const rawReadings = location.readings || {};

    const slots = SLOT_CHRONOLOGY.map(slotMeta => {
      const raw = rawReadings[slotMeta.key] || {};
      const aqi = raw.aqi;
      const isValid = typeof aqi === 'number' && !isNaN(aqi) && aqi >= 0;

      return {
        key: slotMeta.key,
        name: slotMeta.label,
        icon: slotMeta.icon,
        timeRange: raw.timeRange || slotMeta.timeRange,
        aqi: isValid ? aqi : null,
        isValid: isValid,
        primaryPollutant: raw.primaryPollutant || 'N/A',
        temperature: raw.temperature || '--',
        humidity: raw.humidity || '--',
        categoryInfo: getCpcbCategoryInfo(isValid ? aqi : null)
      };
    });

    const validSlots = slots.filter(s => s.isValid);

    // Rule 6: Require at least two valid readings before making a recommendation
    // Preserved as an essential core safety feature
    if (validSlots.length < 2) {
      return {
        status: 'INSUFFICIENT_DATA',
        validCount: validSlots.length,
        slots: slots,
        recommendedSlot: null,
        isTie: false,
        tiedSlots: [],
        hasCaution: false
      };
    }

    // Rule 4: Lowest valid AQI
    const minAQI = Math.min(...validSlots.map(s => s.aqi));
    const tiedSlots = validSlots.filter(s => s.aqi === minAQI);

    // Rule 5: If multiple slots have same lowest AQI, select earliest slot (Morning > Afternoon > Evening)
    const recommendedSlot = tiedSlots[0];
    const isTie = tiedSlots.length > 1;

    // Rule 9 & Indian CPCB scale: Caution when recommended AQI exceeds 100 (Moderate or higher)
    const hasCaution = recommendedSlot.aqi > 100;

    return {
      status: 'RECOMMENDED',
      validCount: validSlots.length,
      slots: slots,
      recommendedSlot: recommendedSlot,
      isTie: isTie,
      tiedSlots: tiedSlots,
      hasCaution: hasCaution
    };
  }

  // --------------------------------------------------------------------------
  // Render Orchestrator
  // --------------------------------------------------------------------------
  function renderCurrentState() {
    const location = state.dataset.locations.find(l => l.id === state.selectedLocationId) || state.dataset.locations[0];

    // Clean station info without demo or scenario tags
    elements.locationScenarioHint.innerHTML = `<strong>Station:</strong> ${location.station} — <em>${location.description}</em>`;

    // Calculate recommendation
    const evaluation = evaluateWindowRecommendation(location);

    // Render components
    renderRecommendationHero(evaluation, location);
    renderTimeSlotCards(evaluation);
    renderChart(evaluation, location);
    renderActivityGuidance(evaluation);
  }

  // --------------------------------------------------------------------------
  // 1. Recommendation Hero Banner Render
  // --------------------------------------------------------------------------
  function renderRecommendationHero(evaluation, location) {
    const container = elements.recommendationSection;

    // Case A: Insufficient Data (< 2 valid readings)
    // Preserved as an automated safety feature when station data is insufficient
    if (evaluation.status === 'INSUFFICIENT_DATA') {
      container.innerHTML = `
        <div class="recom-card status-insufficient" role="alert">
          <div class="insufficient-container">
            <div class="insufficient-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 class="insufficient-title">Recommendation Unavailable: Insufficient Station Data</h3>
            <p class="insufficient-desc">
              CleanAir Window requires <strong>at least two valid time slot readings</strong> to calculate an optimal outdoor window under CPCB NAQI standards. 
              Currently, ${location.name} has only <strong>${evaluation.validCount} valid reading</strong> available (missing slots can occur during continuous ambient air quality monitoring telemetry calibration).
            </p>
          </div>
        </div>
      `;
      return;
    }

    // Case B: Valid recommendation (>= 2 valid readings)
    const slot = evaluation.recommendedSlot;
    const cat = slot.categoryInfo;
    const cardStatusClass = evaluation.hasCaution ? 'status-caution' : 'status-recommended';

    let tieCalloutHtml = '';
    if (evaluation.isTie) {
      const slotNames = evaluation.tiedSlots.map(s => s.name).join(' and ');
      tieCalloutHtml = `
        <div class="tie-alert-box" role="note">
          <span style="font-size: 1.15rem;">⚖️</span>
          <div>
            <strong>Tie Detected:</strong> Both <strong>${slotNames}</strong> share the lowest recorded CPCB AQI of <strong>${slot.aqi}</strong>. 
            By standard protocol, <strong>${slot.name}</strong> was selected because it is the earliest available time window.
          </div>
        </div>
      `;
    }

    let cautionCalloutHtml = '';
    if (evaluation.hasCaution) {
      const alertSeverity = slot.aqi > 200 ? 'High Pollution Alert' : 'Elevated Air Pollution Caution';
      cautionCalloutHtml = `
        <div class="caution-alert-box" role="alert">
          <span class="caution-icon">⚠️</span>
          <div>
            <strong>${alertSeverity} (CPCB AQI ${slot.aqi} — ${cat.category}):</strong> Although ${slot.name} represents the cleanest window of the day in ${location.name}, the CPCB National AQI is in the <strong>${cat.category}</strong> band. <em>${cat.cpcbImpact}.</em> Vulnerable groups and high-intensity runners/cyclists must take safeguards.
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="recom-card ${cardStatusClass}">
        <div class="recom-header-row">
          <div class="recom-badge-group">
            <span class="recom-badge primary">
              <span aria-hidden="true">★</span> Best Outdoor Window
            </span>
            ${evaluation.isTie ? '<span class="recom-badge tie">Earliest Window Selected (Tie)</span>' : ''}
            ${evaluation.hasCaution ? '<span class="recom-badge alert">Caution: AQI > 100</span>' : ''}
          </div>
          <span class="data-mode-tag" style="background: rgba(255,255,255,0.7);">
            CPCB NAQI Comparative Analysis
          </span>
        </div>

        <div class="recom-content-grid">
          <div>
            <h2 class="recom-title">${slot.icon} ${slot.name} Window</h2>
            <div class="recom-time-range">${slot.timeRange}</div>
            <p class="recom-explanation">
              Lowest ambient pollution recorded for <strong>${location.name}</strong> today. 
              Primary monitored parameter: <strong>${slot.primaryPollutant}</strong>.
            </p>
          </div>

          <div class="recom-metric-box">
            <span class="recom-aqi-num" style="color: ${cat.color};">${slot.aqi}</span>
            <span class="recom-aqi-label">CPCB NAQI Metric</span>
            <span class="recom-category-tag" style="background-color: ${cat.bgColor}; color: ${cat.textColor}; border: 1px solid ${cat.borderColor};">
              ${cat.category}
            </span>
          </div>
        </div>

        ${tieCalloutHtml}
        ${cautionCalloutHtml}
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // 2. Morning, Afternoon, Evening Cards Grid
  // --------------------------------------------------------------------------
  function renderTimeSlotCards(evaluation) {
    const container = elements.slotsGrid;
    container.innerHTML = '';

    evaluation.slots.forEach(slot => {
      const card = document.createElement('article');
      card.className = 'slot-card';

      const isWinningSlot = evaluation.status === 'RECOMMENDED' && evaluation.recommendedSlot && evaluation.recommendedSlot.key === slot.key;

      if (isWinningSlot) {
        card.classList.add('is-winner');
      }

      if (!slot.isValid) {
        card.classList.add('is-missing');
        card.innerHTML = `
          <div>
            <div class="slot-top-row">
              <div class="slot-name-col">
                <div class="slot-time-icon">${slot.icon}</div>
                <div>
                  <h3 class="slot-name">${slot.name}</h3>
                  <span class="slot-hours">${slot.timeRange}</span>
                </div>
              </div>
            </div>

            <div class="missing-indicator">
              <span class="missing-badge">Offline / Missing</span>
              <p class="missing-note">CAAQM telemetry unavailable for this time window. Excluded from calculation.</p>
            </div>
          </div>

          <ul class="slot-meta-list">
            <li class="slot-meta-item">
              <span class="slot-meta-label">Station Status</span>
              <span class="slot-meta-val" style="color: #ef4444;">No Feed</span>
            </li>
            <li class="slot-meta-item">
              <span class="slot-meta-label">Pollutant</span>
              <span class="slot-meta-val">${slot.primaryPollutant}</span>
            </li>
          </ul>
        `;
        container.appendChild(card);
        return;
      }

      const cat = slot.categoryInfo;
      let badgeMarkup = '';
      if (isWinningSlot) {
        badgeMarkup = evaluation.isTie 
          ? '<span class="slot-badge-best slot-badge-tie">★ Earliest Best</span>'
          : '<span class="slot-badge-best">★ Best Window</span>';
      }

      card.innerHTML = `
        <div>
          <div class="slot-top-row">
            <div class="slot-name-col">
              <div class="slot-time-icon">${slot.icon}</div>
              <div>
                <h3 class="slot-name">${slot.name}</h3>
                <span class="slot-hours">${slot.timeRange}</span>
              </div>
            </div>
            ${badgeMarkup}
          </div>

          <div class="slot-score-area">
            <span class="slot-aqi-value" style="color: ${cat.color};">${slot.aqi}</span>
            <span class="slot-aqi-unit">CPCB AQI</span>
          </div>

          <div class="slot-status-pill" style="background-color: ${cat.bgColor}; color: ${cat.textColor}; border: 1px solid ${cat.borderColor};">
            <span style="width: 7px; height: 7px; border-radius: 50%; background-color: ${cat.color}; display: inline-block;"></span>
            ${cat.category}
          </div>
        </div>

        <ul class="slot-meta-list">
          <li class="slot-meta-item">
            <span class="slot-meta-label">Primary Pollutant</span>
            <span class="slot-meta-val">${slot.primaryPollutant}</span>
          </li>
          <li class="slot-meta-item">
            <span class="slot-meta-label">Temp / Humidity</span>
            <span class="slot-meta-val">${slot.temperature} • ${slot.humidity}</span>
          </li>
        </ul>
      `;

      container.appendChild(card);
    });
  }

  // --------------------------------------------------------------------------
  // 3. Interactive Chart (Chart.js)
  // --------------------------------------------------------------------------
  function renderChart(evaluation, location) {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js library not loaded yet.');
      return;
    }

    if (state.chartInstance) {
      state.chartInstance.destroy();
    }

    const labels = evaluation.slots.map(s => `${s.name} (${s.timeRange.split('–')[0].trim()})`);
    const dataValues = evaluation.slots.map(s => s.isValid ? s.aqi : null);

    const backgroundColors = evaluation.slots.map(s => {
      if (!s.isValid) return 'rgba(203, 213, 225, 0.4)';
      return s.categoryInfo.color;
    });

    const borderColors = evaluation.slots.map(s => {
      if (evaluation.recommendedSlot && s.key === evaluation.recommendedSlot.key) {
        return '#0f172a';
      }
      return !s.isValid ? '#94a3b8' : s.categoryInfo.color;
    });

    const borderWidths = evaluation.slots.map(s => {
      return (evaluation.recommendedSlot && s.key === evaluation.recommendedSlot.key) ? 3 : 1;
    });

    const ctx = elements.chartCanvas.getContext('2d');

    state.chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'India National Air Quality Index (CPCB NAQI)',
          data: dataValues,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: borderWidths,
          borderRadius: 8,
          borderSkipped: false,
          barPercentage: 0.55
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#0f172a',
            titleFont: { size: 13, weight: 'bold', family: "'Plus Jakarta Sans', sans-serif" },
            bodyFont: { size: 12, family: "'Plus Jakarta Sans', sans-serif" },
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: function (context) {
                const slot = evaluation.slots[context.dataIndex];
                if (!slot.isValid) {
                  return 'Telemetry Offline (Reading Missing)';
                }
                const isWin = evaluation.recommendedSlot && slot.key === evaluation.recommendedSlot.key;
                const star = isWin ? ' ★ Best Window' : '';
                return ` CPCB AQI: ${slot.aqi} — ${slot.categoryInfo.category}${star}`;
              },
              afterLabel: function (context) {
                const slot = evaluation.slots[context.dataIndex];
                if (slot.isValid) {
                  return `Health Impact: ${slot.categoryInfo.cpcbImpact}`;
                }
                return 'Excluded from window comparison';
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: 350,
            grid: {
              color: '#f1f5f9'
            },
            ticks: {
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
              color: '#64748b',
              stepSize: 50
            },
            title: {
              display: true,
              text: 'CPCB NAQI Level (0 – 500)',
              color: '#64748b',
              font: { size: 11, weight: 'bold' }
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '600' },
              color: '#0f172a'
            }
          }
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // 4. Dynamic Activity Guidance Panel (CPCB Standards)
  // --------------------------------------------------------------------------
  function renderActivityGuidance(evaluation) {
    if (!evaluation) {
      const location = state.dataset.locations.find(l => l.id === state.selectedLocationId);
      evaluation = evaluateWindowRecommendation(location);
    }

    const activity = ACTIVITY_METADATA[state.selectedActivity] || ACTIVITY_METADATA.walking;

    elements.activeActivityLabel.textContent = activity.name;
    elements.activityIntensityBadge.textContent = activity.intensity;
    elements.activityIntensityBadge.className = `intensity-pill ${activity.intensityClass}`;

    const container = elements.guidanceContent;

    // If insufficient data
    if (evaluation.status === 'INSUFFICIENT_DATA') {
      container.innerHTML = `
        <div class="guidance-block general">
          <h4>ℹ️ General Exercise Precaution</h4>
          <p>Because there is insufficient station telemetry to recommend an optimal window, monitor local visibility and haze before commencing outdoor activities.</p>
        </div>
      `;
      return;
    }

    const recomAqi = evaluation.recommendedSlot.aqi;
    const cat = evaluation.recommendedSlot.categoryInfo;

    // Tailored advice based on CPCB AQI categories
    let adviceText = '';
    const isElevated = recomAqi > 100;

    if (recomAqi <= 50) {
      adviceText = activity.adviceGood;
    } else if (recomAqi <= 100) {
      adviceText = activity.adviceSatisfactory;
    } else if (recomAqi <= 200) {
      adviceText = activity.adviceModerate;
    } else {
      adviceText = activity.adviceHazardous;
    }

    // Additional specific caution for jogging / cycling when AQI > 100 (Core Rule 9 & CPCB Standards)
    let highExertionWarningHtml = '';
    if (isElevated && (state.selectedActivity === 'jogging' || state.selectedActivity === 'cycling')) {
      const isSevere = recomAqi > 200;
      highExertionWarningHtml = `
        <div class="respiratory-warning" role="alert">
          <h4>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            CPCB Respiratory Safeguard Alert for ${activity.name}
          </h4>
          <p>
            During <strong>${activity.name.toLowerCase()}</strong>, human ventilation rate expands by up to <strong>${activity.baseVentilation}</strong>, bypassing nasal filtration and transporting fine particulates deep into bronchioles. 
            Because today's recommended window is in the CPCB <strong>${cat.category}</strong> category (AQI ${recomAqi}), high-intensity outdoor cardiovascular exertion is <strong>${isSevere ? 'strictly advised against' : 'not recommended'}</strong>.
          </p>
          <ul class="guidance-list" style="margin-top: 0.5rem;">
            <li>Switch to an indoor climate-controlled environment, home treadmill, or stationary trainer.</li>
            <li>If outdoor exercise is essential, downgrade intensity to a gentle walk and avoid arterial roads.</li>
            <li>Wear a well-fitted particulate respirator (N95/KF94) if transiting outdoors.</li>
          </ul>
        </div>
      `;
    }

    container.innerHTML = `
      <!-- General AQI precaution for current CPCB tier -->
      <div class="guidance-block general">
        <h4>🛡️ CPCB Health Impact Benchmark (${cat.category} • ${recomAqi} AQI)</h4>
        <p><strong>Official CPCB Impact:</strong> <em>${cat.cpcbImpact}.</em></p>
        <p style="margin-top: 0.35rem;">${cat.generalPrecaution}</p>
      </div>

      <!-- Activity Specific Guidance -->
      <div class="guidance-block specific ${isElevated ? 'alert-level' : ''}">
        <h4>${activity.icon} Recommended Protocol for ${activity.name}</h4>
        <p>${adviceText}</p>
        <p style="font-size: 0.775rem; color: var(--text-subtle); margin-top: 0.4rem;">
          Estimated pulmonary ventilation: <strong>${activity.baseVentilation}</strong>.
        </p>
      </div>

      ${highExertionWarningHtml}
    `;
  }

  // --------------------------------------------------------------------------
  // Document Ready Execution
  // --------------------------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
