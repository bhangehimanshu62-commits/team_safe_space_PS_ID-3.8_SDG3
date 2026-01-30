// ============================
// UHRA Frontend SPA
// ============================

// --------------- DOM Elements --------------- //
const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll(".page-section");
const darkModeToggle = document.getElementById("darkModeToggle");

// Home counters
const heroPatientsCounterEl = document.getElementById("heroPatientsCounter");
const heroHospitalsCounterEl = document.getElementById("heroHospitalsCounter");
const heroSyncsCounterEl = document.getElementById("heroSyncsCounter");

// Dashboard form & table
const patientForm = document.getElementById("patientForm");
const patientSearchInput = document.getElementById("patientSearchInput");
const patientsTableBody = document.querySelector("#patientsTable tbody");
const patientsCountBadge = document.getElementById("patientsCountBadge");
const exportJsonBtn = document.getElementById("exportJsonBtn");

// Hospital integration
const hospitalsGrid = document.getElementById("hospitalsGrid");

// Analytics
const patientsPerHospitalCanvas = document.getElementById("patientsPerHospitalChart");
const recordsSyncedCanvas = document.getElementById("recordsSyncedChart");
const activeConnectionsCanvas = document.getElementById("activeConnectionsChart");
const recordsSyncedCounterEl = document.getElementById("recordsSyncedCounter");
const activeConnectionsCounterEl = document.getElementById("activeConnectionsCounter");

// Contact
const contactForm = document.getElementById("contactForm");

// Modal
const patientModal = document.getElementById("patientModal");
const patientModalBody = document.getElementById("patientModalBody");
const closePatientModalBtn = document.getElementById("closePatientModal");
// Toast container
const toastContainer = document.getElementById("toastContainer");

// --------------- App State --------------- //
const STORAGE_KEY_PATIENTS = "uhra_patients";
const STORAGE_KEY_DARKMODE = "uhra_dark_mode";

/** @type {Array<{id:string,name:string,age:number,bloodGroup:string,hospital:string,diagnosis:string,lastVisit:string}>} */
let patients = [];

/** @type {Array<{id:string,name:string,vendor:string,connected:boolean}>} */
let hospitals = [
  { id: "h1", name: "City General Hospital", vendor: "Epic FHIR", connected: true },
  { id: "h2", name: "Northside Medical Center", vendor: "Cerner HL7", connected: false },
  { id: "h3", name: "St. Mary's Cardiac Institute", vendor: "Meditech FHIR", connected: true },
  { id: "h4", name: "Riverbend Children's Hospital", vendor: "Custom HL7", connected: false },
  { id: "h5", name: "Lakeside Oncology Clinic", vendor: "Epic FHIR", connected: false },
  { id: "h6", name: "MetroCare Trauma Center", vendor: "Cerner HL7", connected: true },
];

// Synthetic metrics
let syntheticRecordsSyncedToday = 1324;

// --------------- Utility Functions --------------- //

function generateId() {
  return "P" + Date.now().toString(36).toUpperCase().slice(-5);
}

function loadPatientsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PATIENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        patients = parsed;
        return;
      }
    }
  } catch (err) {
    console.error("Failed to parse stored patients", err);
  }

  // Seed demo patients if nothing in storage
  const today = new Date();
  const formatDate = (offsetDays) => {
    const d = new Date(today);
    d.setDate(today.getDate() - offsetDays);
    return d.toISOString().slice(0, 10);
  };

  patients = [
    {
      id: generateId(),
      name: "Alicia Gomez",
      age: 42,
      bloodGroup: "O+",
      hospital: "City General Hospital",
      diagnosis: "Hypertension",
      lastVisit: formatDate(5),
    },
    {
      id: generateId(),
      name: "Marcus Lee",
      age: 29,
      bloodGroup: "A-",
      hospital: "Northside Medical Center",
      diagnosis: "Asthma",
      lastVisit: formatDate(2),
    },
    {
      id: generateId(),
      name: "Priya Patel",
      age: 36,
      bloodGroup: "B+",
      hospital: "St. Mary's Cardiac Institute",
      diagnosis: "Arrhythmia",
      lastVisit: formatDate(10),
    },
    {
      id: generateId(),
      name: "James Smith",
      age: 63,
      bloodGroup: "AB+",
      hospital: "MetroCare Trauma Center",
      diagnosis: "Post-operative follow-up",
      lastVisit: formatDate(1),
    },
  ];
  persistPatients();
}

function persistPatients() {
  try {
    localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(patients));
  } catch (err) {
    console.error("Failed to persist patients", err);
  }
}

function animateCounter(el, target, duration = 800) {
  if (!el) return;
  const start = 0;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out
    const value = Math.round(start + (target - start) * eased);
    el.textContent = value.toLocaleString();
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

function showToast({ title, message, type = "success" }) {
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;

  const iconEl = document.createElement("div");
  iconEl.className = "toast__icon";
  iconEl.textContent = type === "error" ? "⚠️" : type === "info" ? "ℹ️" : "✅";

  const contentEl = document.createElement("div");
  contentEl.className = "toast__content";

  const titleEl = document.createElement("div");
  titleEl.className = "toast__title";
  titleEl.textContent = title;

  const messageEl = document.createElement("div");
  messageEl.className = "toast__message";
  messageEl.textContent = message;

  contentEl.appendChild(titleEl);
  contentEl.appendChild(messageEl);

  toast.appendChild(iconEl);
  toast.appendChild(contentEl);

  toastContainer.appendChild(toast);

  // Auto-remove
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(12px)";
    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    }, 180);
  }, 3200);
}

function openModal() {
  patientModal.classList.add("open");
}

function closeModal() {
  patientModal.classList.remove("open");
}

// --------------- SPA Navigation --------------- //

function showSectionById(targetId) {
  sections.forEach((section) => {
    if (section.id === targetId) {
      section.classList.add("active");
    } else {
      section.classList.remove("active");
    }
  });

  navLinks.forEach((link) => {
    const linkTarget = link.getAttribute("data-target");
    if (linkTarget === targetId) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

// --------------- Dashboard: Rendering --------------- //

function renderPatientsTable(filterValue = "") {
  const query = filterValue.trim().toLowerCase();
  patientsTableBody.innerHTML = "";

  const filteredPatients = patients.filter((p) => {
    if (!query) return true;
    const combined =
      `${p.id} ${p.name} ${p.hospital} ${p.diagnosis}`.toLowerCase();
    return combined.includes(query);
  });

  filteredPatients.forEach((patient) => {
    const tr = document.createElement("tr");

    const idTd = document.createElement("td");
    idTd.textContent = patient.id;

    const nameTd = document.createElement("td");
    nameTd.textContent = patient.name;

    const ageTd = document.createElement("td");
    ageTd.textContent = patient.age.toString();

    const bloodTd = document.createElement("td");
    bloodTd.textContent = patient.bloodGroup;

    const hospitalTd = document.createElement("td");
    hospitalTd.textContent = patient.hospital;

    const lastVisitTd = document.createElement("td");
    lastVisitTd.textContent = patient.lastVisit;

    const actionsTd = document.createElement("td");
    const actionsWrapper = document.createElement("div");
    actionsWrapper.className = "table-actions";

    const viewBtn = document.createElement("button");
    viewBtn.className = "btn btn-xs btn-soft";
    viewBtn.textContent = "View";
    viewBtn.addEventListener("click", () => handleViewPatient(patient.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-xs btn-danger-soft";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => handleDeletePatient(patient.id));

    actionsWrapper.appendChild(viewBtn);
    actionsWrapper.appendChild(deleteBtn);
    actionsTd.appendChild(actionsWrapper);
    tr.appendChild(idTd);
    tr.appendChild(nameTd);
    tr.appendChild(ageTd);
    tr.appendChild(bloodTd);
    tr.appendChild(hospitalTd);
    tr.appendChild(lastVisitTd);
    tr.appendChild(actionsTd);

    patientsTableBody.appendChild(tr);
  });

  patientsCountBadge.textContent = `${patients.length} Patients`;

  // Update analytics after table render
  updateAnalyticsFromState();
}

function handleViewPatient(id) {
  const patient = patients.find((p) => p.id === id);
  if (!patient) return;

  patientModalBody.innerHTML = "";

  const rows = [
    ["Patient ID", patient.id],
    ["Name", patient.name],
    ["Age", patient.age.toString()],
    ["Blood Group", patient.bloodGroup],
    ["Hospital", patient.hospital],
    ["Diagnosis", patient.diagnosis],
    ["Last Visit", patient.lastVisit],
  ];

  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "modal__body-row";
    const labelEl = document.createElement("div");
    labelEl.className = "modal__body-label";
    labelEl.textContent = label;
    const valueEl = document.createElement("div");
    valueEl.className = "modal__body-value";
    valueEl.textContent = value;
    row.appendChild(labelEl);
    row.appendChild(valueEl);
    patientModalBody.appendChild(row);
  });

  openModal();
}

function handleDeletePatient(id) {
  const idx = patients.findIndex((p) => p.id === id);
  if (idx === -1) return;
  const [removed] = patients.splice(idx, 1);
  persistPatients();
  renderPatientsTable(patientSearchInput.value);
  showToast({
    title: "Patient removed",
    message: `${removed.name} was deleted from the unified record.`,
    type: "info",
  });
}

function handleAddPatient(event) {
  event.preventDefault();
  const nameInput = document.getElementById("patientName");
  const ageInput = document.getElementById("patientAge");
  const bloodInput = document.getElementById("patientBloodGroup");
  const hospitalInput = document.getElementById("patientHospital");
  const diagnosisInput = document.getElementById("patientDiagnosis");
  const lastVisitInput = document.getElementById("patientLastVisit");

  const name = nameInput.value.trim();
  const age = Number(ageInput.value);
  const bloodGroup = bloodInput.value;
  const hospital = hospitalInput.value.trim();
  const diagnosis = diagnosisInput.value.trim();
  const lastVisit = lastVisitInput.value;

  if (!name || !hospital || !diagnosis || !lastVisit || !bloodGroup || !age) {
    showToast({
      title: "Validation error",
      message: "Please fill in all patient fields before adding.",
      type: "error",
    });
    return;
  }

  const patient = {
    id: generateId(),
    name,
    age,
    bloodGroup,
    hospital,
    diagnosis,
    lastVisit,
  };

  patients.unshift(patient);
  persistPatients();
  renderPatientsTable(patientSearchInput.value);

  patientForm.reset();

  showToast({
    title: "Patient added",
    message: `${patient.name} has been added to the unified record.`,
    type: "success",
  });
}

// --------------- Hospitals Integration --------------- //

function renderHospitals() {
  hospitalsGrid.innerHTML = "";

  hospitals.forEach((hospital) => {
    const card = document.createElement("article");
    card.className = "hospital-card glass";
    card.dataset.id = hospital.id;
    const nameEl = document.createElement("h3");
    nameEl.className = "hospital-card__name";
    nameEl.textContent = hospital.name;

    const vendorEl = document.createElement("div");
    vendorEl.className = "hospital-card__vendor";
    vendorEl.textContent = hospital.vendor;

    const footer = document.createElement("div");
    footer.className = "hospital-card__footer";

    const statusEl = document.createElement("div");
    statusEl.className = "hospital-card__status";
    const statusDot = document.createElement("span");
    statusDot.className = "hospital-card__status-dot " +
      (hospital.connected
        ? "hospital-card__status-dot--connected"
        : "hospital-card__status-dot--disconnected");
    const statusText = document.createElement("span");
    statusText.textContent = hospital.connected ? "Connected" : "Disconnected";

    statusEl.appendChild(statusDot);
    statusEl.appendChild(statusText);

    const spinner = document.createElement("span");
    spinner.className = "hospital-card__spinner";

    const btn = document.createElement("button");
    btn.className = "btn btn-xs " + (hospital.connected ? "btn-secondary" : "btn-primary");
    btn.textContent = hospital.connected ? "Disconnect" : "Connect";

    btn.addEventListener("click", () => handleToggleHospitalConnection(hospital.id, card, statusDot, statusText, btn, spinner));

    footer.appendChild(statusEl);
    footer.appendChild(btn);

    card.appendChild(nameEl);
    card.appendChild(vendorEl);
    card.appendChild(spinner);
    card.appendChild(footer);

    hospitalsGrid.appendChild(card);
  });

  updateAnalyticsFromState();
}

function handleToggleHospitalConnection(id, card, statusDot, statusText, btn, spinner) {
  const hospital = hospitals.find((h) => h.id === id);
  if (!hospital) return;

  // Simulate API integration via setTimeout
  card.classList.add("loading");
  btn.disabled = true;
  const connecting = !hospital.connected;
  statusText.textContent = connecting ? "Connecting..." : "Disconnecting...";

  setTimeout(() => {
    card.classList.remove("loading");
    btn.disabled = false;
    hospital.connected = connecting;

    if (hospital.connected) {
      statusDot.classList.remove("hospital-card__status-dot--disconnected");
      statusDot.classList.add("hospital-card__status-dot--connected");
      statusText.textContent = "Connected";
      btn.textContent = "Disconnect";
      btn.classList.remove("btn-primary");
      btn.classList.add("btn-secondary");

      showToast({
        title: "Secure FHIR API Connected",
        message: `${hospital.name} is now streaming data into UHRA.`,
        type: "success",
      });
    } else {
      statusDot.classList.remove("hospital-card__status-dot--connected");
      statusDot.classList.add("hospital-card__status-dot--disconnected");
      statusText.textContent = "Disconnected";
      btn.textContent = "Connect";
      btn.classList.remove("btn-secondary");
      btn.classList.add("btn-primary");

      showToast({
        title: "Connection closed",
        message: `${hospital.name} has been disconnected from the FHIR API.`,
        type: "info",
      });
    }

    updateAnalyticsFromState();
  }, 1100);
}

// --------------- Analytics (Canvas) --------------- //

function clearCanvas(ctx, canvas) {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawBarChart(ctx, canvas, labels, values, options = {}) {
  if (!ctx || !canvas) return;
  clearCanvas(ctx, canvas);

  const padding = 24;
  const width = canvas.width;
  const height = canvas.height;

  const maxValue = Math.max(...values, 1);
  const barCount = values.length;
  const gap = 16;
  const barWidth = (width - padding * 2 - gap * (barCount - 1)) / barCount;

  ctx.font = "11px system-ui, sans-serif";
  ctx.textBaseline = "middle";

  // Axes line (simple baseline)
  ctx.strokeStyle = "rgba(148,163,184,0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  values.forEach((value, index) => {
    const x = padding + index * (barWidth + gap);
    const barHeight = ((height - padding * 2) * value) / maxValue;
    const y = height - padding - barHeight;

    const gradient = ctx.createLinearGradient(x, y, x, height - padding);
    gradient.addColorStop(0, options.colorTop || "#38bdf8");
    gradient.addColorStop(1, options.colorBottom || "#22c55e");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    const radius = 6;
    const bw = barWidth;
    const bh = barHeight;
    ctx.moveTo(x, y + bh);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.lineTo(x + bw - radius, y);
    ctx.quadraticCurveTo(x + bw, y, x + bw, y + radius);
    ctx.lineTo(x + bw, y + bh);
    ctx.closePath();
    ctx.fill();

    // Label (value)
    ctx.fillStyle = "#e5e7eb";
    ctx.fillText(value.toString(), x + bw / 2 - 6, y - 8);

    // X label
    ctx.fillStyle = "rgba(148,163,184,0.9)";
    ctx.save();
    ctx.translate(x + bw / 2, height - padding + 10);
    ctx.rotate(-Math.PI / 8);
    ctx.fillText(labels[index], 0, 0);
    ctx.restore();
  });
}

function updateAnalyticsFromState() {
  // Patients per hospital
  const hospitalCounts = {};
  patients.forEach((p) => {
    const key = p.hospital || "Unknown";
    hospitalCounts[key] = (hospitalCounts[key] || 0) + 1;
  });
  const hospitalLabels = Object.keys(hospitalCounts);
  const hospitalValues = Object.values(hospitalCounts);

  const ctxPatients = patientsPerHospitalCanvas
    ? patientsPerHospitalCanvas.getContext("2d")
    : null;
  if (hospitalLabels.length > 0) {
    drawBarChart(ctxPatients, patientsPerHospitalCanvas, hospitalLabels, hospitalValues, {
      colorTop: "#38bdf8",
      colorBottom: "#22c55e",
    });
  } else if (ctxPatients) {
    clearCanvas(ctxPatients, patientsPerHospitalCanvas);
  }

  // Synthetic records synced
  const ctxRecords = recordsSyncedCanvas
    ? recordsSyncedCanvas.getContext("2d")
    : null;
  const recordsValues = [Math.round(syntheticRecordsSyncedToday * 0.2), Math.round(syntheticRecordsSyncedToday * 0.4), syntheticRecordsSyncedToday];
  const recordsLabels = ["Morning", "Afternoon", "Today"];
  drawBarChart(ctxRecords, recordsSyncedCanvas, recordsLabels, recordsValues, {
    colorTop: "#a855f7",
    colorBottom: "#38bdf8",
  });

  animateCounter(recordsSyncedCounterEl, syntheticRecordsSyncedToday, 900);

  // Active connections
  const connectedCount = hospitals.filter((h) => h.connected).length;
  const ctxActive = activeConnectionsCanvas
  ? activeConnectionsCanvas.getContext("2d")
  : null;
const activeValues = [connectedCount, hospitals.length - connectedCount];
const activeLabels = ["Connected", "Offline"];
drawBarChart(ctxActive, activeConnectionsCanvas, activeLabels, activeValues, {
  colorTop: "#22c55e",
  colorBottom: "#ef4444",
});

animateCounter(activeConnectionsCounterEl, connectedCount, 800);

// Hero counters
animateCounter(heroPatientsCounterEl, patients.length, 900);
animateCounter(heroHospitalsCounterEl, hospitals.length, 900);
animateCounter(heroSyncsCounterEl, syntheticRecordsSyncedToday, 900);
}

// --------------- Contact Form --------------- //

function validateEmail(email) {
const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
return re.test(email);
}

function handleContactSubmit(event) {
event.preventDefault();

const name = document.getElementById("contactName").value.trim();
const email = document.getElementById("contactEmail").value.trim();
const message = document.getElementById("contactMessage").value.trim();

if (!name || !email || !message) {
  showToast({
    title: "Missing information",
    message: "Please complete all contact fields before submitting.",
    type: "error",
  });
  return;
}
if (!validateEmail(email)) {
  showToast({
    title: "Invalid email",
    message: "Please provide a valid email address.",
    type: "error",
  });
  return;
}

// Simulate sending
showToast({
  title: "Message sent",
  message: "Your secure message has been submitted. Our team will follow up shortly.",
  type: "success",
});

contactForm.reset();
}

// --------------- Dark Mode --------------- //

function applyStoredDarkModePreference() {
const stored = localStorage.getItem(STORAGE_KEY_DARKMODE);
const isDark = stored === "true";
if (isDark) {
  document.body.classList.add("dark-mode");
  if (darkModeToggle) darkModeToggle.checked = true;
}
}

function handleDarkModeToggleChange() {
const isDark = darkModeToggle.checked;
if (isDark) {
  document.body.classList.add("dark-mode");
} else {
  document.body.classList.remove("dark-mode");
}
localStorage.setItem(STORAGE_KEY_DARKMODE, String(isDark));
}

// --------------- Export JSON --------------- //
function handleExportJson() {
  const dataStr = JSON.stringify(patients, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "uhra-patients.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast({
    title: "Export started",
    message: "Unified patient records exported as JSON.",
    type: "success",
  });
}

// --------------- Event Listeners --------------- //

// Sidebar SPA navigation
navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const targetId = link.getAttribute("data-target");
    if (targetId) {
      showSectionById(targetId);
    }
  });
});

// Hero CTA buttons act as SPA navigation
document.querySelectorAll(".hero__actions .btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.getAttribute("data-target");
    if (targetId) {
      showSectionById(targetId);
    }
  });
});

// Dashboard events
if (patientForm) {
  patientForm.addEventListener("submit", handleAddPatient);
}

if (patientSearchInput) {
  patientSearchInput.addEventListener("input", () => {
    renderPatientsTable(patientSearchInput.value);
  });
}

if (exportJsonBtn) {
  exportJsonBtn.addEventListener("click", handleExportJson);
}

// Modal events
if (closePatientModalBtn) {
  closePatientModalBtn.addEventListener("click", closeModal);
}
if (patientModal) {
  patientModal.addEventListener("click", (event) => {
    if (event.target === patientModal || event.target.classList.contains("modal__backdrop")) {
      closeModal();
    }
  });
}

// Contact
if (contactForm) {
  contactForm.addEventListener("submit", handleContactSubmit);
}

// Dark mode
if (darkModeToggle) {
  darkModeToggle.addEventListener("change", handleDarkModeToggleChange);
}

// --------------- Init --------------- //
function init() {
  applyStoredDarkModePreference();
  loadPatientsFromStorage();
  renderPatientsTable();
  renderHospitals();
  updateAnalyticsFromState();
}

document.addEventListener("DOMContentLoaded", init);
