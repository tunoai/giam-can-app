// ==========================================================================
// FITLIFE - CLIENT SIDE STATE & LOGIC
// ==========================================================================

// --- App State Definition ---
const DEFAULT_STATE = {
    user: {
        name: "Tùng Chu",
        avatar: "tung_chu_avatar.png"
    },
    library: [],
    weight: {
        current: 82.3,
        target: 75.0,
        start: 85.0,
        history: [
            { date: "03/05", val: 85.0 },
            { date: "05/05", val: 84.8 },
            { date: "07/05", val: 84.5 },
            { date: "09/05", val: 84.6 },
            { date: "11/05", val: 84.2 },
            { date: "13/05", val: 83.9 },
            { date: "15/05", val: 83.7 },
            { date: "17/05", val: 83.8 },
            { date: "19/05", val: 83.4 },
            { date: "21/05", val: 83.2 },
            { date: "23/05", val: 83.3 },
            { date: "25/05", val: 83.0 },
            { date: "27/05", val: 82.8 },
            { date: "29/05", val: 82.6 },
            { date: "31/05", val: 82.4 },
            { date: "02/06", val: 82.3 } // Hôm nay
        ]
    },
    streak: {
        current: 18,
        record: 45,
        lastCheckIn: null, // "YYYY-MM-DD" or null
        // 30 days check-in history: 0 = Missed (Grey), 1 = Checked-in (Green), 2 = Pending (Orange)
        // Today is the last cell index 29.
        history30Days: [
            1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2
        ]
    },

    nutrition: {
        kcalTarget: 1800,
        proteinTarget: 140,
        carbTarget: 180,
        fatTarget: 60,
        diary: {
            breakfast: [
                { id: "b1", name: "Trứng gà luộc", weight: 120, kcal: 155, protein: 14, carb: 1, fat: 11, status: "eaten" },
                { id: "b2", name: "Bánh mì nguyên cám", weight: 100, kcal: 250, protein: 9, carb: 46, fat: 3, status: "eaten" },
                { id: "b3", name: "Sữa tươi không đường", weight: 200, kcal: 65, protein: 6, carb: 9, fat: 3, status: "eaten" }
            ],
            lunch: [
                { id: "l1", name: "Ức gà nướng sả", weight: 150, kcal: 250, protein: 35, carb: 2, fat: 8, status: "eaten" },
                { id: "l2", name: "Cơm gạo lứt", weight: 150, kcal: 165, protein: 4, carb: 35, fat: 1.5, status: "eaten" },
                { id: "l3", name: "Bông cải xanh luộc", weight: 200, kcal: 60, protein: 4, carb: 10, fat: 0.5, status: "eaten" },
                { id: "l4", name: "Canh bí đỏ thịt bằm", weight: 200, kcal: 80, protein: 6, carb: 10, fat: 4, status: "eaten" }
            ],
            dinner: [
                { id: "d1", name: "Cá hồi áp chảo", weight: 120, kcal: 240, protein: 26, carb: 0, fat: 15, status: "pending" },
                { id: "d2", name: "Khoai lang hấp", weight: 100, kcal: 86, protein: 2, carb: 20, fat: 0.2, status: "pending" },
                { id: "d3", name: "Măng tây xào tỏi", weight: 150, kcal: 60, protein: 3, carb: 6, fat: 3, status: "pending" }
            ],
            snack: [
                { id: "s1", name: "Quả táo", weight: 150, kcal: 80, protein: 0.5, carb: 21, fat: 0.3, status: "eaten" },
                { id: "s2", name: "Sữa chua Hy Lạp", weight: 100, kcal: 100, protein: 10, carb: 4, fat: 5, status: "eaten" }
            ]
        }
    }
};

// --- Firebase Setup ---
const firebaseConfig = {
  apiKey: "AIzaSyDPrHvRL3MqqLmuPol_ZgTtizlFQZuf4-s",
  authDomain: "giam-can-app.firebaseapp.com",
  databaseURL: "https://giam-can-app-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "giam-can-app",
  storageBucket: "giam-can-app.firebasestorage.app",
  messagingSenderId: "660720606826",
  appId: "1:660720606826:web:15e66d0da97987d0c87413"
};

let db = null;
let storage = null;
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    try {
        storage = firebase.storage();
    } catch(e) { console.warn("Firebase Storage init error:", e); }
}

// --- Firebase Cloud Storage Sync ---
async function uploadImageToStorage(id, base64) {
    if (!storage) return null;
    try {
        const ref = storage.ref(`library/${id}.jpg`);
        await ref.putString(base64, 'data_url');
        return await ref.getDownloadURL();
    } catch (err) {
        console.warn('Storage upload error:', err);
        return null;
    }
}

async function deleteImageFromStorage(id) {
    if (!storage) return;
    try {
        await storage.ref(`library/${id}.jpg`).delete();
    } catch (err) {}
}

let isSyncingFromFirebase = false;
let state = {};
let weightChart = null;

// --- IndexedDB Image Cache (50MB+ capacity, much larger than localStorage) ---
const IMG_DB_NAME = 'fitlife_images';
const IMG_STORE = 'images';

function openImgDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IMG_DB_NAME, 1);
        req.onupgradeneeded = (e) => {
            e.target.result.createObjectStore(IMG_STORE);
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e.target.error);
    });
}

function saveImageToCache(id, base64) {
    return openImgDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IMG_STORE, 'readwrite');
            tx.objectStore(IMG_STORE).put(base64, id);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    }).catch(e => console.warn('Cache save error:', e));
}

function getImageFromCache(id) {
    return openImgDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IMG_STORE, 'readonly');
            const req = tx.objectStore(IMG_STORE).get(id);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    }).catch(() => null);
}

function saveAllImagesToCache(library) {
    if (!library || library.length === 0) return Promise.resolve();
    const promises = library
        .filter(item => item.img && item.img.length > 10)
        .map(item => saveImageToCache(item.id, item.img));
    return Promise.all(promises).catch(e => console.warn('Batch cache error:', e));
}

function loadImagesFromCache(library) {
    if (!library || library.length === 0) return Promise.resolve();
    const promises = library.map(item => {
        if (item.img && item.img.length > 10) return Promise.resolve(); // Already has image
        return getImageFromCache(item.id).then(cached => {
            if (cached) item.img = cached;
        });
    });
    return Promise.all(promises).catch(e => console.warn('Cache load error:', e));
}

// --- State Persist & Load ---
function loadState() {
    const saved = localStorage.getItem('fitlife_state');
    if (saved) {
        try {
            state = JSON.parse(saved);
            if (state.user && state.user.name === "Nguyễn Mai") {
                state.user.name = "Tùng Chu";
                state.user.avatar = "tung_chu_avatar.png";
            }
        } catch (e) {
            console.error("Lỗi parse JSON state, dùng mặc định", e);
            state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        }
    } else {
        state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    }

    // Load cached images from IndexedDB immediately (fast, local)
    loadImagesFromCache(state.library).then(() => {
        if (typeof renderLibraryGrid === 'function') renderLibraryGrid();
    });

    if (db) {
        db.ref('shared_state').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                isSyncingFromFirebase = true;
                state = data;
                
                // Fix Firebase array-to-object conversion
                if (state.library && !Array.isArray(state.library)) {
                    state.library = Object.values(state.library).filter(Boolean);
                } else if (!state.library) {
                    state.library = [];
                }
                
                // DIAGNOSTIC NOTIFICATION
                try {
                    const libCount = state.library ? state.library.length : 0;
                    showNotification("Firebase Sync", `Đã tải dữ liệu từ Cloud. Số ảnh: ${libCount}`, "info");
                } catch(e) {}
                
                if (state.history && !Array.isArray(state.history)) {
                    state.history = Object.values(state.history).filter(Boolean);
                } else if (!state.history) {
                    state.history = [];
                }
                
                delete state.library_images; // cleanup if exists
                if (state.user && state.user.name === "Nguyễn Mai") {
                    state.user.name = "Tùng Chu";
                    state.user.avatar = "tung_chu_avatar.png";
                }

                // Save to localStorage (without images, 5MB limit)
                try {
                    localStorage.setItem('fitlife_state', JSON.stringify(createLightState()));
                } catch (e) {}

                // Cache images locally for offline use
                if (state.library && state.library.length > 0) {
                    saveAllImagesToCache(state.library);
                }

                // Update UI
                updateUI();
                try { if (weightChart) renderWeightChart(); } catch(e) {}
                if (typeof renderLibraryGrid === 'function') renderLibraryGrid();

                isSyncingFromFirebase = false;
            } else {
                if (!isSyncingFromFirebase) {
                    saveStateToFirebase();
                }
            }
        });
    }
}

// Helper: create lightweight state without images for localStorage (5MB limit)
function createLightState() {
    const lightState = JSON.parse(JSON.stringify(state));
    if (lightState.library && lightState.library.length > 0) {
        lightState.library = lightState.library.map(item => {
            const copy = Object.assign({}, item);
            delete copy.img;
            return copy;
        });
    }
    return lightState;
}

// Save FULL state (with images) to Firebase - simple and reliable
function saveStateToFirebase() {
    if (db && !isSyncingFromFirebase) {
        const fullState = JSON.parse(JSON.stringify(state));
        // Remove library_images if it accidentally got into state
        delete fullState.library_images;
        db.ref('shared_state').set(fullState).catch(err => {
            console.error("Lỗi lưu Firebase:", err);
        });
    }
}

function saveState() {
    // Save to localStorage WITHOUT images (5MB limit)
    try {
        const lightState = createLightState();
        localStorage.setItem('fitlife_state', JSON.stringify(lightState));
    } catch (e) {
        console.warn("Lỗi lưu localStorage:", e);
    }

    // Cache images to IndexedDB (local backup)
    saveAllImagesToCache(state.library);

    updateUI();
    // Save FULL state (with images) to Firebase
    saveStateToFirebase();
}

// --- Dynamic Date Formatting ---
function formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' };
    let formatted = date.toLocaleDateString('vi-VN', options);
    // Capitalize first letter
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

// --- Screen Switching Logic ---
function initNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    const sections = document.querySelectorAll('.screen-section');

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-target');
            
            // Toggle active menu class
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Switch sections
            sections.forEach(sec => {
                sec.classList.remove('active');
                if (sec.id === `screen-${target}`) {
                    sec.classList.add('active');
                }
            });

            // Smooth scroll to top of main content
            document.querySelector('.main-content').scrollTop = 0;

            // Hook: Re-render Chart.js on tab focus
            if (target === 'dashboard') {
                setTimeout(renderWeightChart, 100);
            }
        });
    });

    // Sub-card navigation in Dashboard previews
    document.querySelectorAll('.preview-link, .gram-meal-list, #preview-dinh-duong button, #preview-thuc-don button, #preview-nhat-ky button').forEach(el => {
        el.addEventListener('click', (e) => {
            let target = '';
            if (el.classList.contains('preview-link')) {
                target = el.getAttribute('data-link');
            } else if (el.id === 'btn-adjust-target-prev') {
                target = 'thuc-don';
            } else if (el.id === 'btn-view-all-meals-prev') {
                target = 'thuc-don';
            } else if (el.id === 'btn-add-food-prev') {
                target = 'nhat-ky';
            } else {
                return;
            }
            
            e.preventDefault();
            const navLink = document.querySelector(`.menu-item[data-target="${target}"]`);
            if (navLink) navLink.click();
        });
    });
}

// --- Calorie & Macros Calculation Helper ---
function calculateCurrentDayCalories() {
    let totalKcal = 0;
    let totalProtein = 0;
    let totalCarb = 0;
    let totalFat = 0;

    const diary = state.nutrition.diary;
    for (const meal in diary) {
        diary[meal].forEach(item => {
            let multiplier = 0;
            if (item.status === 'eaten') multiplier = 1.0;
            else if (item.status === 'under') multiplier = 0.5; // Under-eaten (50%)
            else if (item.status === 'over') multiplier = 1.5;  // Over-eaten (150%)
            
            totalKcal += item.kcal * multiplier;
            totalProtein += (item.protein || 0) * multiplier;
            totalCarb += (item.carb || 0) * multiplier;
            totalFat += (item.fat || 0) * multiplier;
        });
    }

    return {
        kcal: Math.round(totalKcal),
        protein: Math.round(totalProtein),
        carb: Math.round(totalCarb),
        fat: Math.round(totalFat)
    };
}

// --- Render Chart.js (Weight progress) ---
function renderWeightChart() {
    const ctx = document.getElementById('weightHistoryChart');
    if (!ctx) return;

    const rangeSelect = document.getElementById('chart-range-select');
    const range = rangeSelect ? parseInt(rangeSelect.value) : 30;

    // Filter history based on range
    let dataset = state.weight.history;
    if (range === 7) {
        dataset = dataset.slice(-7);
    } else {
        dataset = dataset.slice(-30);
    }

    const labels = dataset.map(d => d.date);
    const dataVals = dataset.map(d => d.val);

    if (weightChart) {
        weightChart.destroy();
    }

    weightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cân nặng (kg)',
                data: dataVals,
                borderColor: '#FF6B00',
                backgroundColor: 'rgba(255, 107, 0, 0.05)',
                borderWidth: 3,
                tension: 0.35,
                fill: true,
                pointBackgroundColor: '#FF6B00',
                pointBorderColor: '#FFFFFF',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
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
                    backgroundColor: '#1E293B',
                    titleFont: { family: 'Arial', weight: 'bold' },
                    bodyFont: { family: 'Arial' },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return ` ${context.parsed.y} kg`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    grid: {
                        color: 'rgba(226, 232, 240, 0.6)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#64748B',
                        font: { family: 'Arial', size: 11 }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#64748B',
                        font: { family: 'Arial', size: 11 }
                    }
                }
            }
        }
    });
}

// --- Main UI Rendering & Dom Updates ---
// Safe helper: set innerText only if element exists
function safeText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}
function safeHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

function updateUI() {
    try {
    // Current Date updates
    const now = new Date();
    const formattedNow = formatDate(now);
    safeText('dashboard-date', formattedNow);
    safeText('diary-current-date', formattedNow);

    // Header Greeting
    const greetingEl = document.getElementById('header-greeting');
    if (greetingEl) {
        greetingEl.innerText = `Xin chào, ${state.user.name}! 👋`;
    }

    // Avatar Updates
    const avatarEl = document.getElementById('user-avatar-img');
    if (avatarEl && state.user.avatar) {
        avatarEl.src = state.user.avatar;
    }

    // Recalculate stats based on state
    const currentWeight = state.weight.current;
    const targetWeight = state.weight.target;
    const startWeight = state.weight.start;
    const lostWeight = Math.max(0, startWeight - currentWeight).toFixed(1);
    const streakDays = state.streak.current;

    // Is checked in today check?
    const todayChecked = state.streak.history30Days[29] === 1;

    // Update stats labels
    safeText('val-weight-current', currentWeight.toFixed(1));
    safeText('val-weight-target', targetWeight.toFixed(1));
    safeText('val-weight-lost', lostWeight);
    safeText('val-weight-start', `Từ ${startWeight.toFixed(1)} kg`);
    safeText('val-streak', streakDays);
    safeText('banner-streak-days', streakDays);
    safeText('discipline-streak-current', streakDays);

    // Compliance estimation
    const checkedDays = state.streak.history30Days.filter(h => h === 1).length;
    const compliancePercent = Math.round((checkedDays / 30) * 100);
    safeText('val-compliance', compliancePercent);
    safeText('discipline-compliance-month', compliancePercent);

    // Calories calculation
    const caloriesState = calculateCurrentDayCalories();
    const kcalConsumed = caloriesState.kcal;
    const kcalTarget = state.nutrition.kcalTarget;
    const kcalRemain = Math.max(0, kcalTarget - kcalConsumed);
    const kcalPercent = Math.min(100, Math.round((kcalConsumed / kcalTarget) * 100));

    // Dashboard values
    safeText('dash-kcal-consumed', kcalConsumed.toLocaleString('vi-VN'));
    safeText('dash-kcal-target', kcalTarget.toLocaleString('vi-VN'));
    
    const dashRemainEl = document.getElementById('dash-kcal-remain');
    if (dashRemainEl) {
        if (kcalRemain > 0) {
            dashRemainEl.innerText = `${kcalRemain.toLocaleString('vi-VN')} kcal`;
            dashRemainEl.className = 'text-green';
        } else {
            dashRemainEl.innerText = `Hoàn thành`;
            dashRemainEl.className = 'text-orange-dark';
        }
    }

    // SVG Ring animate
    const circleLen = 377;
    const dashOffset = circleLen - (circleLen * (kcalPercent / 100));
    const ringEl = document.getElementById('calorie-progress-ring');
    if (ringEl) {
        ringEl.style.strokeDashoffset = dashOffset;
    }

    // Dashboard macros progress bar
    safeText('dash-protein-curr', caloriesState.protein);
    safeText('dash-protein-target', state.nutrition.proteinTarget);
    const pPct = Math.min(100, Math.round((caloriesState.protein / state.nutrition.proteinTarget) * 100));
    const pBar = document.getElementById('dash-protein-bar');
    if (pBar) pBar.style.width = `${pPct}%`;

    safeText('dash-carb-curr', caloriesState.carb);
    safeText('dash-carb-target', state.nutrition.carbTarget);
    const cPct = Math.min(100, Math.round((caloriesState.carb / state.nutrition.carbTarget) * 100));
    const cBar = document.getElementById('dash-carb-bar');
    if (cBar) cBar.style.width = `${cPct}%`;

    safeText('dash-fat-curr', caloriesState.fat);
    safeText('dash-fat-target', state.nutrition.fatTarget);
    const fPct = Math.min(100, Math.round((caloriesState.fat / state.nutrition.fatTarget) * 100));
    const fBar = document.getElementById('dash-fat-bar');
    if (fBar) fBar.style.width = `${fPct}%`;

    // Screen 2 Nutrition targets values
    safeText('plan-kcal-val', kcalTarget.toLocaleString('vi-VN'));
    safeText('plan-protein-val', state.nutrition.proteinTarget);
    safeText('plan-carb-val', state.nutrition.carbTarget);
    safeText('plan-fat-val', state.nutrition.fatTarget);

    // Screen 4 Food Diary calories
    safeText('diary-kcal-consumed', kcalConsumed.toLocaleString('vi-VN'));
    safeText('diary-kcal-target', kcalTarget.toLocaleString('vi-VN'));
    
    const diaryRemainEl = document.getElementById('diary-kcal-remain');
    if (diaryRemainEl) {
        if (kcalRemain > 0) {
            diaryRemainEl.innerText = kcalRemain.toLocaleString('vi-VN');
            diaryRemainEl.className = 'text-green';
        } else {
            diaryRemainEl.innerText = `Xong`;
            diaryRemainEl.className = 'text-orange-dark';
        }
    }

    safeText('diary-progress-percent', `${kcalPercent}% hoàn thành mục tiêu`);
    const diaryBar = document.getElementById('diary-progress-bar');
    if (diaryBar) diaryBar.style.width = `${kcalPercent}%`;

    // Dynamic check-in state is now handled by updateDashboardCheckin()

    // Mini sidebar updates for checked/unchecked preview
    const dashDiaryList = document.getElementById('dash-diary-list');
    if (dashDiaryList) {
        let listHTML = '';
        const meals = { breakfast: 'Bữa sáng', lunch: 'Bữa trưa', dinner: 'Bữa tối', snack: 'Bữa phụ' };
        
        for (const meal in meals) {
            let sumKcal = 0;
            let isAllEaten = state.nutrition.diary[meal].length > 0;
            state.nutrition.diary[meal].forEach(item => {
                if (item.status === 'eaten') sumKcal += item.kcal;
                else if (item.status === 'under') sumKcal += item.kcal * 0.5;
                else if (item.status === 'over') sumKcal += item.kcal * 1.5;
                
                if (item.status === 'pending') isAllEaten = false;
            });
            sumKcal = Math.round(sumKcal);

            listHTML += `
                <li>
                    <div class="custom-checkbox ${isAllEaten ? 'checked' : ''}" data-meal="${meal}">
                        <i data-lucide="check"></i>
                    </div>
                    <span>${meals[meal]}</span>
                    <span class="kcal-badge">${sumKcal} kcal</span>
                </li>
            `;
        }
        dashDiaryList.innerHTML = listHTML;
    }

    // Dashboard check-in state update
    updateDashboardCheckin();

    // Refresh history grids and lists
    if (typeof renderDisciplineCalendar === 'function') renderDisciplineCalendar();
    if (typeof renderDiaryMealsList === 'function') renderDiaryMealsList();

    // Reinitialize icons rendered via template
    if (window.lucide) lucide.createIcons();
    
    } catch (uiErr) {
        console.warn("updateUI gặp lỗi (không ảnh hưởng dữ liệu):", uiErr);
    }
}

// --- Dashboard Check-in State ---
function updateDashboardCheckin() {
    const checkinBody = document.getElementById('dash-checkin-body');
    const checkinIcon = document.getElementById('dash-checkin-icon');
    const checkinTitle = document.getElementById('dash-checkin-title');
    const checkinDesc = document.getElementById('dash-checkin-desc');
    const checkinBtn = document.getElementById('btn-checkin-now-prev');
    const streakBadge = document.getElementById('dash-streak-badge');
    const previewCard = document.getElementById('preview-checkin');
    
    if (!checkinBody || !checkinTitle) return;
    
    const todayChecked = state.streak.history30Days[29] === 1;
    const streakDays = state.streak.current;
    
    // Count consecutive missed days from the end (before today)
    let missedDays = 0;
    for (let i = 28; i >= 0; i--) {
        if (state.streak.history30Days[i] === 0) missedDays++;
        else break;
    }
    
    if (streakBadge) streakBadge.innerText = `🔥 ${streakDays} ngày`;
    
    if (todayChecked) {
        // Success state
        if (previewCard) previewCard.className = 'preview-card-item flex-col justify-between checkin-state-success';
        if (checkinIcon) checkinIcon.innerHTML = '<i data-lucide="check-circle"></i>';
        checkinTitle.innerText = 'Đã check-in hôm nay!';
        if (checkinDesc) checkinDesc.innerText = `Tuyệt vời! Bạn đang duy trì chuỗi ${streakDays} ngày liên tục.`;
        if (checkinBtn) {
            checkinBtn.innerText = 'Đã check-in ✓';
            checkinBtn.disabled = true;
            checkinBtn.style.opacity = '0.6';
        }
    } else if (missedDays >= 2) {
        // Danger state - missed multiple days
        if (previewCard) previewCard.className = 'preview-card-item flex-col justify-between checkin-state-danger';
        if (checkinIcon) checkinIcon.innerHTML = '<i data-lucide="alert-octagon"></i>';
        checkinTitle.innerText = `⚠️ Bạn đã quên mục tiêu ${missedDays} ngày!`;
        if (checkinDesc) checkinDesc.innerText = 'Hãy check-in ngay để không bỏ lỡ mục tiêu giảm cân!';
        if (checkinBtn) {
            checkinBtn.innerText = 'Check-in ngay!';
            checkinBtn.disabled = false;
            checkinBtn.style.opacity = '1';
            checkinBtn.style.backgroundColor = 'var(--color-red)';
        }
    } else {
        // Warning state - not checked in today
        if (previewCard) previewCard.className = 'preview-card-item flex-col justify-between checkin-state-warning';
        if (checkinIcon) checkinIcon.innerHTML = '<i data-lucide="alert-triangle"></i>';
        checkinTitle.innerText = 'Bạn chưa check-in hôm nay!';
        if (checkinDesc) checkinDesc.innerText = 'Hãy check-in để duy trì chuỗi mục tiêu giảm cân.';
        if (checkinBtn) {
            checkinBtn.innerText = 'Check-in ngay';
            checkinBtn.disabled = false;
            checkinBtn.style.opacity = '1';
            checkinBtn.style.backgroundColor = '';
        }
    }
    
    if (window.lucide) lucide.createIcons();
}

// --- Render 30-Day Streak Grid (GitHub contribution style) ---
function renderDisciplineCalendar() {
    const gridDashboard = document.getElementById('streak-grid-container');
    const gridDiscipline = document.getElementById('habit-heatmap-grid');
    
    const dates = [];
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - 29); // 30 days ago
    
    for (let i = 0; i < 30; i++) {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + i);
        dates.push(d);
    }

    // Simple Vietnamese representation for day index
    if (gridDashboard) {
        let dashboardHTML = '';
        state.streak.history30Days.forEach((status, idx) => {
            const dayNum = dates[idx].getDate();
            let statusClass = 'state-missed';
            let tooltip = `Ngày ${dayNum}/${dates[idx].getMonth() + 1}: Bỏ lỡ`;
            
            if (status === 1) {
                statusClass = 'state-checked';
                tooltip = `Ngày ${dayNum}/${dates[idx].getMonth() + 1}: Đã check-in`;
            } else if (status === 2) {
                statusClass = 'state-unchecked';
                tooltip = `Ngày ${dayNum}/${dates[idx].getMonth() + 1}: Chưa cập nhật`;
            }

            dashboardHTML += `
                <div class="streak-day-cell">
                    <span>${dayNum}</span>
                    <div class="streak-cell-dot ${statusClass}" title="${tooltip}"></div>
                </div>
            `;
        });
        gridDashboard.innerHTML = dashboardHTML;
    }

    if (gridDiscipline) {
        let heatmapHTML = '';
        state.streak.history30Days.forEach((status, idx) => {
            const dayNum = dates[idx].getDate();
            let statusClass = '';
            
            if (status === 1) statusClass = 'status-ok';
            else if (status === 2) statusClass = 'status-pending';
            else statusClass = 'status-missed';

            heatmapHTML += `
                <div class="heatmap-day-cell">
                    <span class="heatmap-day-num">${dayNum}/${dates[idx].getMonth() + 1}</span>
                    <div class="heatmap-day-status ${statusClass}">
                        <i data-lucide="check"></i>
                    </div>
                </div>
            `;
        });
        gridDiscipline.innerHTML = heatmapHTML;
    }
}

// --- Render Food Diary List (Interactive checkpoints) ---
function renderDiaryMealsList() {
    const container = document.getElementById('diary-meals-container');
    if (!container) return;

    const meals = {
        breakfast: { title: "Bữa sáng", color: "bg-breakfast" },
        lunch: { title: "Bữa trưa", color: "bg-lunch" },
        dinner: { title: "Bữa tối", color: "bg-dinner" },
        snack: { title: "Bữa phụ", color: "bg-snack" }
    };

    let diaryHTML = '';

    for (const key in meals) {
        const mealItems = state.nutrition.diary[key];
        let totalMealKcal = 0;
        
        let itemsHTML = '';
        if (mealItems.length === 0) {
            itemsHTML = `<div class="p-4 text-center text-muted" style="font-size:0.8rem;">Chưa ghi món ăn nào</div>`;
        } else {
            mealItems.forEach(item => {
                let multiplier = 0;
                if (item.status === 'eaten') multiplier = 1.0;
                else if (item.status === 'under') multiplier = 0.5;
                else if (item.status === 'over') multiplier = 1.5;
                
                totalMealKcal += item.kcal * multiplier;

                itemsHTML += `
                    <div class="diary-item-row" data-id="${item.id}" data-meal="${key}">
                        <div class="diary-item-name">
                            <span>${item.name}</span>
                            <small>${item.weight}g • ${item.kcal} kcal</small>
                        </div>
                        <div class="diary-item-kcal">
                            ${Math.round(item.kcal * multiplier)} kcal
                        </div>
                        <div class="discipline-checkboxes">
                            <button class="chk-btn chk-btn-eaten ${item.status === 'eaten' ? 'active' : ''}" data-status="eaten">Đã ăn</button>
                            <button class="chk-btn chk-btn-under ${item.status === 'under' ? 'active' : ''}" data-status="under">Ăn thiếu</button>
                            <button class="chk-btn chk-btn-over ${item.status === 'over' ? 'active' : ''}" data-status="over">Ăn vượt</button>
                        </div>
                        <button class="btn-delete-item" title="Xóa món ăn">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                `;
            });
        }

        diaryHTML += `
            <div class="diary-meal-section">
                <div class="diary-header-wrapper">
                    <div class="diary-meal-header">
                        <h4>${meals[key].title}</h4>
                        <span class="kcal-sum">${Math.round(totalMealKcal)} kcal</span>
                    </div>
                </div>
                <div class="diary-items-list">
                    ${itemsHTML}
                </div>
            </div>
        `;
    }

    container.innerHTML = diaryHTML;

    // Attach listeners to newly generated elements
    attachDiaryEventListeners();
}

function attachDiaryEventListeners() {
    // Checkbox status switching
    document.querySelectorAll('.chk-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const row = btn.closest('.diary-item-row');
            const id = row.getAttribute('data-id');
            const meal = row.getAttribute('data-meal');
            const newStatus = btn.getAttribute('data-status');

            const item = state.nutrition.diary[meal].find(i => i.id === id);
            if (item) {
                // If double tapping an active state, we can revert to pending
                if (item.status === newStatus) {
                    item.status = 'pending';
                } else {
                    item.status = newStatus;
                }
                saveState();
            }
        });
    });

    // Delete item click
    document.querySelectorAll('.btn-delete-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const row = btn.closest('.diary-item-row');
            const id = row.getAttribute('data-id');
            const meal = row.getAttribute('data-meal');

            state.nutrition.diary[meal] = state.nutrition.diary[meal].filter(i => i.id !== id);
            saveState();
        });
    });
}

// --- Recalculating Nutrition Targets ---
function recalculateNutritionTargets() {
    const curWeight = parseFloat(document.getElementById('input-weight').value);
    const targetW = parseFloat(document.getElementById('input-target-weight').value);
    const actLevel = document.getElementById('input-level').value;

    // Standard nutritional formula for mock AI
    let bmr = 10 * curWeight + 6.25 * 158 - 5 * 28 - 161; // Female weight 28yo height 158
    let tdee = bmr * 1.2;
    if (actLevel === 'medium') tdee = bmr * 1.375;
    else if (actLevel === 'heavy') tdee = bmr * 1.55;

    // Deficit of 400kcal
    let targetKcal = Math.round(tdee - 400);
    if (targetKcal < 1200) targetKcal = 1200; // Safe minimum

    // Macros: 30% Protein, 40% Carb, 30% Fat
    const proteinG = Math.round((targetKcal * 0.3) / 4);
    const carbG = Math.round((targetKcal * 0.4) / 4);
    const fatG = Math.round((targetKcal * 0.3) / 9);

    state.nutrition.kcalTarget = targetKcal;
    state.nutrition.proteinTarget = proteinG;
    state.nutrition.carbTarget = carbG;
    state.nutrition.fatTarget = fatG;
    
    // Sync current weight if changed
    if (curWeight !== state.weight.current) {
        state.weight.current = curWeight;
        // Append new history point
        const todayStr = "02/06";
        const todayLog = state.weight.history.find(h => h.date === todayStr);
        if (todayLog) {
            todayLog.val = curWeight;
        } else {
            state.weight.history.push({ date: todayStr, val: curWeight });
        }
    }

    state.weight.target = targetW;

    saveState();
    alert(`AI đã tính toán lại mục tiêu:\n- Calo: ${targetKcal} kcal\n- Protein: ${proteinG}g\n- Carb: ${carbG}g\n- Fat: ${fatG}g\n\nDữ liệu đã được áp dụng toàn hệ thống!`);
}

// --- Check-in Logic ---
function executeCheckIn() {
    if (state.streak.history30Days[29] === 1) {
        alert("Hôm nay bạn đã thực hiện check-in rồi!");
        return;
    }

    // Set today as checked (index 29)
    state.streak.history30Days[29] = 1;
    state.streak.current += 1;
    
    // Automatically flag all pending dinner or snack as eaten for discipline check-in success!
    const diary = state.nutrition.diary;
    for (const meal in diary) {
        diary[meal].forEach(item => {
            if (item.status === 'pending') {
                item.status = 'eaten';
            }
        });
    }

    saveState();

    // Show a congratulatory popup or alert
    alert(`Chúc mừng! Bạn đã check-in kỷ luật thành công.\nChuỗi streak tăng lên ${state.streak.current} ngày liên tục! 🔥`);
    
    // Force redirect to Dashboard to view updated calendar/streak
    const navDashboard = document.getElementById('nav-dashboard');
    if (navDashboard) navDashboard.click();
}

// --- Simulated AI Food Recognition (Image Scanner) ---
function initFoodScanner() {
    const dropzone = document.getElementById('scanner-dropzone');
    const fileInput = document.getElementById('scanner-file-input');
    const defaultView = document.getElementById('scanner-default-view');
    const processingView = document.getElementById('scanner-processing-view');
    const successView = document.getElementById('scanner-success-view');
    const previewImg = document.getElementById('scanner-preview-img');

    // Click trigger file select
    dropzone.addEventListener('click', (e) => {
        // Prevent click trigger if we clicked actions
        if (e.target.closest('.success-actions') || processingView.classList.contains('active')) return;
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            startScanSimulation(file);
        }
    });

    // Drag events
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--color-primary)';
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = 'var(--color-border-hover)';
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--color-border-hover)';
        const file = e.dataTransfer.files[0];
        if (file) {
            startScanSimulation(file);
        }
    });

    // Special click trigger for DEMO
    const demoLink = document.getElementById('demo-trigger-scan');
    if (demoLink) {
        demoLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Start simulation directly with healthy_salad.png
            startScanSimulation(null, 'healthy_salad.png');
        });
    }

    async function startScanSimulation(file, demoUrl = '') {
        // Show scanner processing
        defaultView.classList.add('hidden');
        successView.classList.add('hidden');
        processingView.classList.remove('hidden');

        const scannerStatusText = document.getElementById('scanner-status-text');
        scannerStatusText.innerText = "Đang tải ảnh...";

        let base64Image = "";

        try {
            if (file) {
                base64Image = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        previewImg.src = e.target.result;
                        resolve(e.target.result);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            } else if (demoUrl) {
                previewImg.src = demoUrl;
                const response = await fetch(demoUrl);
                const blob = await response.blob();
                base64Image = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            }

            scannerStatusText.innerText = "AI đang phân tích hình ảnh qua Gemini...";
            
            const aiData = await analyzeImageWithGemini(base64Image);

            processingView.classList.add('hidden');
            successView.classList.remove('hidden');
            
            document.getElementById('detected-food-title').innerText = aiData.name;
            document.getElementById('detected-food-weight').innerText = `${aiData.weight}g`;
            document.getElementById('detected-food-kcal').innerText = `${aiData.kcal} kcal`;
            
            const macrosEl = document.getElementById('detected-food-macros');
            if (macrosEl) {
                macrosEl.innerHTML = `
                    <span>P: ${aiData.macros.p}g</span>
                    <span>C: ${aiData.macros.c}g</span>
                    <span>F: ${aiData.macros.f}g</span>
                `;
            }

            const itemsListEl = document.getElementById('detected-food-items-list');
            if (itemsListEl) {
                itemsListEl.innerHTML = aiData.items.map(item => `
                    <li>
                        <span class="item-name">${item.name}</span>
                        <span class="item-stats">${item.weight}g • ${item.kcal} kcal</span>
                    </li>
                `).join('');
            }
            
            window.lastScannedFood = {
                name: aiData.name,
                weight: aiData.weight,
                kcal: aiData.kcal
            };
        } catch (error) {
            console.error("Lỗi scan:", error);
            showNotification("Lỗi Phân Tích", "Đã có lỗi khi gọi Gemini API. Vui lòng thử lại.", "error");
            processingView.classList.add('hidden');
            defaultView.classList.remove('hidden');
        }
    }

    // Reset scanner to scan again
    document.getElementById('btn-scan-again').addEventListener('click', (e) => {
        e.stopPropagation();
        successView.classList.add('hidden');
        defaultView.classList.remove('hidden');
        fileInput.value = '';
    });
}

// --- AI Q&A Feature ---
function initAIQA() {
    const dropzone = document.getElementById('ai-qa-dropzone');
    const fileInput = document.getElementById('ai-qa-file-input');
    const defaultView = document.getElementById('ai-qa-default-view');
    const previewDiv = document.getElementById('ai-qa-preview');
    const previewImg = document.getElementById('ai-qa-preview-img');
    const removeBtn = document.getElementById('ai-qa-remove-img');
    const questionInput = document.getElementById('ai-qa-question-input');
    const sendBtn = document.getElementById('ai-qa-send-btn');
    
    if (!dropzone || !fileInput) return;
    
    let qaBase64Image = '';
    
    dropzone.addEventListener('click', (e) => {
        if (e.target.closest('.ai-qa-remove-img')) return;
        if (!previewDiv.classList.contains('hidden')) return;
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) loadQAImage(file);
    });
    
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.style.borderColor = 'var(--color-primary)'; });
    dropzone.addEventListener('dragleave', () => { dropzone.style.borderColor = ''; });
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '';
        const file = e.dataTransfer.files[0];
        if (file) loadQAImage(file);
    });
    
    function loadQAImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            qaBase64Image = e.target.result;
            previewImg.src = qaBase64Image;
            defaultView.classList.add('hidden');
            previewDiv.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
    
    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            qaBase64Image = '';
            previewImg.src = '';
            previewDiv.classList.add('hidden');
            defaultView.classList.remove('hidden');
            fileInput.value = '';
        });
    }
    
    async function sendQuestion() {
        const question = questionInput.value.trim();
        if (!question && !qaBase64Image) {
            alert('Vui lòng nhập câu hỏi hoặc tải ảnh lên!');
            return;
        }
        
        if (!GEMINI_API_KEY) {
            if (window.openApiKeyModal) window.openApiKeyModal();
            return;
        }
        
        // Show loading
        const resultEmpty = document.getElementById('ai-result-empty');
        const qaResult = document.getElementById('ai-qa-result');
        const qaResultBody = document.getElementById('ai-qa-result-body');
        const resultContent = document.getElementById('ai-result-content');
        
        if (resultEmpty) resultEmpty.classList.add('hidden');
        if (resultContent) resultContent.classList.add('hidden');
        if (qaResult) qaResult.classList.remove('hidden');
        if (qaResultBody) qaResultBody.innerText = 'AI đang suy nghĩ...';
        
        try {
            const MODELS = ['gemini-2.5-flash', 'gemini-3.5-flash'];
            const parts = [];
            parts.push({ text: question || 'Hãy phân tích ảnh thực phẩm này chi tiết.' });
            
            if (qaBase64Image) {
                let mimeType = 'image/jpeg';
                let data = qaBase64Image;
                if (qaBase64Image.includes(',')) {
                    const p = qaBase64Image.split(',');
                    mimeType = p[0].match(/:(.*?);/)[1];
                    data = p[1];
                }
                parts.push({ inlineData: { mimeType, data } });
            }
            
            const requestBody = {
                contents: [{ parts }],
                generationConfig: { temperature: 0.4 }
            };
            
            let lastError = null;
            for (const modelName of MODELS) {
                const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
                try {
                    const response = await fetch(API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestBody)
                    });
                    if (!response.ok) { lastError = new Error(`HTTP ${response.status}`); continue; }
                    const result = await response.json();
                    if (!result.candidates || result.candidates.length === 0) { lastError = new Error('No result'); continue; }
                    const textResult = result.candidates[0].content.parts[0].text;
                    if (qaResultBody) qaResultBody.innerText = textResult;
                    return;
                } catch (error) {
                    lastError = error;
                    continue;
                }
            }
            throw lastError || new Error('API error');
        } catch (error) {
            if (qaResultBody) qaResultBody.innerText = 'Lỗi: ' + error.message;
        }
    }
    
    if (sendBtn) sendBtn.addEventListener('click', sendQuestion);
    if (questionInput) questionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendQuestion();
    });
}

// --- Weight Diary ---
function initWeightDiary() {
    const form = document.getElementById('form-weight-entry');
    const dateInput = document.getElementById('weight-entry-date');
    const kgInput = document.getElementById('weight-entry-kg');
    
    if (!form || !dateInput) return;
    
    // Set default date to today
    const today = new Date();
    dateInput.value = today.toISOString().split('T')[0];
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const dateVal = dateInput.value;
        const kgVal = parseFloat(kgInput.value);
        if (!dateVal || isNaN(kgVal)) return;
        
        // Format date as DD/MM
        const parts = dateVal.split('-');
        const dateStr = `${parts[2]}/${parts[1]}`;
        
        // Check if date already exists
        const existing = state.weight.history.find(h => h.date === dateStr);
        if (existing) {
            existing.val = kgVal;
        } else {
            state.weight.history.push({ date: dateStr, val: kgVal });
            // Sort by date
            state.weight.history.sort((a, b) => {
                const [dA, mA] = a.date.split('/');
                const [dB, mB] = b.date.split('/');
                return (parseInt(mA) * 100 + parseInt(dA)) - (parseInt(mB) * 100 + parseInt(dB));
            });
        }
        
        // Update current weight to latest entry
        state.weight.current = kgVal;
        
        saveState();
        renderWeightDiaryTable();
        renderWeightDiaryChart();
        renderWeightChart(); // Update dashboard chart too
        
        showNotification('Đã lưu', `Cân nặng ${kgVal} kg ngày ${dateStr} đã được lưu!`, 'success');
        kgInput.value = '';
    });
    
    // Range selector for diary chart
    const rangeSelect = document.getElementById('weight-diary-range');
    if (rangeSelect) {
        rangeSelect.addEventListener('change', () => renderWeightDiaryChart());
    }
    
    // Initial render
    renderWeightDiaryTable();
    renderWeightDiaryChart();
    updateWeightSummary();
}

let weightDiaryChart = null;

function renderWeightDiaryChart() {
    const ctx = document.getElementById('weightDiaryChart');
    if (!ctx) return;
    
    const rangeSelect = document.getElementById('weight-diary-range');
    const range = rangeSelect ? parseInt(rangeSelect.value) : 30;
    
    let dataset = state.weight.history;
    if (range === 7) dataset = dataset.slice(-7);
    else dataset = dataset.slice(-30);
    
    const labels = dataset.map(d => d.date);
    const dataVals = dataset.map(d => d.val);
    
    if (weightDiaryChart) weightDiaryChart.destroy();
    
    weightDiaryChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Cân nặng (kg)',
                data: dataVals,
                borderColor: '#FF6B00',
                backgroundColor: 'rgba(255, 107, 0, 0.05)',
                borderWidth: 3,
                tension: 0.35,
                fill: true,
                pointBackgroundColor: '#FF6B00',
                pointBorderColor: '#FFFFFF',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1E293B',
                    titleFont: { family: 'Arial', weight: 'bold' },
                    bodyFont: { family: 'Arial' },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: (context) => ` ${context.parsed.y} kg`
                    }
                }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(226, 232, 240, 0.6)', drawBorder: false },
                    ticks: { color: '#64748B', font: { family: 'Arial', size: 11 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748B', font: { family: 'Arial', size: 11 } }
                }
            }
        }
    });
}

function renderWeightDiaryTable() {
    const tbody = document.getElementById('weight-table-rows');
    if (!tbody) return;
    
    const history = [...state.weight.history].reverse();
    let html = '';
    
    history.forEach((entry, idx) => {
        const prevEntry = history[idx + 1];
        let changeHTML = '<span class="weight-change-same">—</span>';
        if (prevEntry) {
            const diff = (entry.val - prevEntry.val).toFixed(1);
            if (diff > 0) changeHTML = `<span class="weight-change-up">+${diff} kg ↑</span>`;
            else if (diff < 0) changeHTML = `<span class="weight-change-down">${diff} kg ↓</span>`;
        }
        
        html += `<tr>
            <td>${entry.date}</td>
            <td><strong>${entry.val} kg</strong></td>
            <td>${changeHTML}</td>
            <td><button class="btn-delete-weight" onclick="deleteWeightEntry('${entry.date}')"><i data-lucide="trash-2"></i></button></td>
        </tr>`;
    });
    
    tbody.innerHTML = html;
    if (window.lucide) lucide.createIcons();
}

function updateWeightSummary() {
    const current = state.weight.current;
    const target = state.weight.target;
    const start = state.weight.start;
    
    safeText('ws-current', `${current.toFixed(1)} kg`);
    safeText('ws-target', `${target.toFixed(1)} kg`);
    safeText('ws-lost', `${Math.max(0, start - current).toFixed(1)} kg`);
    safeText('ws-remaining', `${Math.max(0, current - target).toFixed(1)} kg`);
}

window.deleteWeightEntry = function(dateStr) {
    if (!confirm(`Xóa dữ liệu ngày ${dateStr}?`)) return;
    state.weight.history = state.weight.history.filter(h => h.date !== dateStr);
    if (state.weight.history.length > 0) {
        state.weight.current = state.weight.history[state.weight.history.length - 1].val;
    }
    saveState();
    renderWeightDiaryTable();
    renderWeightDiaryChart();
    renderWeightChart();
    updateWeightSummary();
};

// --- Add Manual Food Form Submission ---
function initManualFoodForm() {
    const form = document.getElementById('form-add-food');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('food-name').value;
        const weight = parseInt(document.getElementById('food-weight').value);
        const kcal = parseInt(document.getElementById('food-kcal').value);
        const mealType = document.getElementById('food-meal-type').value;

        // Estimate macronutrients roughly for mock database
        const protein = Math.round((kcal * 0.25) / 4);
        const carb = Math.round((kcal * 0.45) / 4);
        const fat = Math.round((kcal * 0.30) / 9);

        const newFood = {
            id: 'man_' + Date.now(),
            name: name,
            weight: weight,
            kcal: kcal,
            protein: protein,
            carb: carb,
            fat: fat,
            status: "eaten"
        };

        state.nutrition.diary[mealType].push(newFood);
        saveState();

        // Reset Form
        form.reset();
        alert(`Đã thêm món "${name}" vào nhật ký thành công!`);
    });
}

// --- Menu Generation with Gemini AI ---
function initMenuGenerator() {
    const btnGen = document.getElementById('btn-generate-menu');
    if (!btnGen) return;

    btnGen.addEventListener('click', () => {
        // Show custom confirm modal instead of browser confirm()
        const modal = document.getElementById('menu-confirm-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons();

        // Remove old listeners
        const btnCancel = document.getElementById('btn-menu-cancel');
        const btnConfirm = document.getElementById('btn-menu-confirm');
        const newCancel = btnCancel.cloneNode(true);
        const newConfirm = btnConfirm.cloneNode(true);
        btnCancel.parentNode.replaceChild(newCancel, btnCancel);
        btnConfirm.parentNode.replaceChild(newConfirm, btnConfirm);

        newCancel.addEventListener('click', () => modal.classList.add('hidden'));
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

        newConfirm.addEventListener('click', async () => {
            modal.classList.add('hidden');

        btnGen.disabled = true;
        btnGen.innerHTML = `<span class="spinner-small"></span> AI đang lên thực đơn...`;

        // Check if API key exists
        if (!GEMINI_API_KEY) {
            btnGen.innerHTML = `<span class="spinner-small"></span> Chưa có API Key, dùng thực đơn mẫu...`;
            setTimeout(() => {
                randomizeMenus();
                btnGen.disabled = false;
                btnGen.innerHTML = `<i data-lucide="sparkles"></i> Tạo thực đơn mới`;
                if (window.lucide) window.lucide.createIcons();
                showNotification("Thực đơn mẫu", "Đã tạo thực đơn mẫu. Nhập API Key để AI tạo thực đơn cá nhân hóa!", "warning");
                updateUI();
            }, 800);
            return;
        }

        try {
            const targetKcal = state.nutrition?.targetKcal || 1800;
            const aiMenu = await generateMenuWithGemini(targetKcal);
            
            if (aiMenu && aiMenu.days && aiMenu.days.length >= 3) {
                applyAIMenu(aiMenu);
                showNotification("Thành công", "AI đã tạo thực đơn 3 ngày mới phù hợp với mục tiêu của bạn!", "success");
            } else {
                randomizeMenus();
                showNotification("Thực đơn mẫu", "AI trả về dữ liệu không đủ, đã dùng thực đơn mẫu thay thế.", "warning");
            }
            updateUI();
        } catch (err) {
            console.error("Lỗi tạo thực đơn AI:", err);
            randomizeMenus();
            showNotification("Dùng thực đơn mẫu", `Lỗi AI: ${err.message}. Đã dùng thực đơn mẫu.`, "warning");
            updateUI();
        } finally {
            btnGen.disabled = false;
            btnGen.innerHTML = `<i data-lucide="sparkles"></i> Tạo thực đơn mới`;
            if (window.lucide) window.lucide.createIcons();
        }
        });  // end newConfirm click
    });  // end btnGen click
}

async function generateMenuWithGemini(targetKcal) {
    const MODELS = ['gemini-2.5-flash', 'gemini-3.5-flash'];
    
    const prompt = `Bạn là chuyên gia dinh dưỡng Việt Nam. Hãy tạo thực đơn GIẢM CÂN 3 ngày với mục tiêu ${targetKcal} kcal/ngày.

Yêu cầu:
- Mỗi ngày có 4 bữa: breakfast (sáng), lunch (trưa), dinner (tối), snack (phụ)
- Mỗi bữa có danh sách món ăn với tên Tiếng Việt, khối lượng (gram), calo
- Tổng calo mỗi ngày xấp xỉ ${targetKcal} kcal
- Món ăn phải là món Việt Nam phổ biến, dễ nấu, phù hợp giảm cân
- Mỗi bữa có tên tổng quát mô tả ngắn
- Mỗi bữa có trường "imageKeyword": từ khóa tiếng Anh mô tả món ăn chính để tìm ảnh (ví dụ: "grilled chicken rice", "pho soup", "fruit salad", "oatmeal banana")

Trả về JSON thuần túy (KHÔNG bọc markdown):
{
  "days": [
    {
      "day": 1,
      "breakfast": {
        "title": "Tên bữa sáng",
        "imageKeyword": "english food keyword",
        "items": [{"name": "Tên món", "weight": gram, "kcal": số}]
      },
      "lunch": {
        "title": "Tên bữa trưa",
        "imageKeyword": "english food keyword",
        "items": [{"name": "Tên món", "weight": gram, "kcal": số}]
      },
      "dinner": {
        "title": "Tên bữa tối",
        "imageKeyword": "english food keyword",
        "items": [{"name": "Tên món", "weight": gram, "kcal": số}]
      },
      "snack": {
        "title": "Tên bữa phụ",
        "imageKeyword": "english food keyword",
        "items": [{"name": "Tên món", "weight": gram, "kcal": số}]
      }
    }
  ]
}`;

    const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.8,
            responseMimeType: "application/json"
        }
    };

    for (const modelName of MODELS) {
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            if (!response.ok) continue;
            const result = await response.json();
            if (!result.candidates || result.candidates.length === 0) continue;
            let text = result.candidates[0].content.parts[0].text;
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(text);
        } catch (e) {
            console.warn(`Model ${modelName} failed:`, e);
            continue;
        }
    }
    throw new Error("Không thể kết nối Gemini API");
}

function applyAIMenu(aiMenu) {
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    
    aiMenu.days.forEach((day, idx) => {
        const dayNum = idx + 1;
        if (dayNum > 3) return;
        
        mealTypes.forEach(meal => {
            const mealData = day[meal];
            if (!mealData || !mealData.items) return;
            
            const listEl = document.getElementById(`day${dayNum}-${meal}-list`);
            const totalEl = document.getElementById(`day${dayNum}-${meal}-total`);
            const imgEl = document.getElementById(`day${dayNum}-${meal}-img`);
            
            if (listEl) {
                listEl.innerHTML = mealData.items.map(item => 
                    `<li><span>${item.name}</span><strong>${item.weight}g • ${item.kcal} kcal</strong></li>`
                ).join('');
            }
            
            if (totalEl) {
                const sum = mealData.items.reduce((acc, i) => acc + (i.kcal || 0), 0);
                totalEl.innerText = `${sum} kcal`;
            }
            
            // Generate food image with Gemini AI
            if (imgEl && mealData.imageKeyword) {
                // Show loading state
                imgEl.style.backgroundImage = 'none';
                imgEl.style.display = 'flex';
                imgEl.style.alignItems = 'center';
                imgEl.style.justifyContent = 'center';
                imgEl.style.background = 'linear-gradient(135deg, #f0f0f0 0%, #e8e8e8 100%)';
                imgEl.innerHTML = '<span class="spinner-small"></span>';
                
                generateFoodImage(mealData.imageKeyword).then(dataUrl => {
                    imgEl.innerHTML = '';
                    imgEl.style.display = '';
                    imgEl.style.background = '';
                    imgEl.style.backgroundImage = `url('${dataUrl}')`;
                    imgEl.style.backgroundSize = 'cover';
                    imgEl.style.backgroundPosition = 'center';
                }).catch(() => {
                    // Fallback: use a keyword-based local image
                    imgEl.innerHTML = '';
                    imgEl.style.display = '';
                    imgEl.style.background = '';
                    const kw = (mealData.imageKeyword || '').toLowerCase();
                    let fallback = 'healthy_lunch.png';
                    if (meal === 'breakfast' || kw.includes('oat') || kw.includes('egg') || kw.includes('bread')) fallback = 'healthy_breakfast.png';
                    else if (meal === 'dinner' || kw.includes('fish') || kw.includes('salmon')) fallback = 'healthy_dinner.png';
                    else if (meal === 'snack' || kw.includes('fruit') || kw.includes('nut') || kw.includes('yogurt')) fallback = 'healthy_snack.png';
                    imgEl.style.backgroundImage = `url('${fallback}')`;
                    imgEl.style.backgroundSize = 'cover';
                    imgEl.style.backgroundPosition = 'center';
                });
            }
        });
    });
}

// Generate food image using Gemini API (same API key)
async function generateFoodImage(keyword) {
    const MODELS = ['gemini-2.0-flash-exp', 'gemini-2.0-flash-preview-image-generation'];
    
    const prompt = `Generate a beautiful, professional food photography image of: ${keyword}. 
The image should look like a real photograph taken from above or at a 45-degree angle, with natural lighting, on a clean plate or wooden table. Make it look appetizing and high quality.`;

    for (const modelName of MODELS) {
        try {
            const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseModalities: ["IMAGE", "TEXT"]
                    }
                })
            });
            
            if (!response.ok) continue;
            const result = await response.json();
            
            if (result.candidates && result.candidates[0]?.content?.parts) {
                for (const part of result.candidates[0].content.parts) {
                    if (part.inlineData) {
                        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    }
                }
            }
        } catch (err) {
            console.warn(`Image gen with ${modelName} failed:`, err);
            continue;
        }
    }
    
    // Fallback to local images
    const fallbackMap = {
        'breakfast': 'healthy_breakfast.png',
        'lunch': 'healthy_lunch.png', 
        'dinner': 'healthy_dinner.png',
        'snack': 'healthy_snack.png'
    };
    const type = keyword.toLowerCase();
    if (type.includes('breakfast') || type.includes('oat') || type.includes('egg')) return fallbackMap.breakfast;
    if (type.includes('lunch') || type.includes('rice') || type.includes('chicken')) return fallbackMap.lunch;
    if (type.includes('dinner') || type.includes('fish') || type.includes('salmon')) return fallbackMap.dinner;
    return fallbackMap.snack;
}

function randomizeMenus() {
    // Generate Day 1, 2, 3 randomized foods lists fits target calories
    const breakItemsPool = [
        {
            img: 'pho_ga.png',
            items: [
                { name: "Phở gà ít bánh", weight: 350, kcal: 320, protein: 22, carb: 40, fat: 8 },
                { name: "Nước ép cam không đường", weight: 200, kcal: 80, protein: 1, carb: 18, fat: 0 }
            ]
        },
        {
            img: 'banh_mi_den.png',
            items: [
                { name: "Bánh mì đen ốp la", weight: 120, kcal: 280, protein: 14, carb: 30, fat: 9 },
                { name: "Sữa hạnh nhân", weight: 250, kcal: 90, protein: 3, carb: 12, fat: 2 }
            ]
        },
        {
            img: 'yen_mach.png',
            items: [
                { name: "Yến mạch ngâm sữa chua chuối", weight: 200, kcal: 340, protein: 16, carb: 52, fat: 6 }
            ]
        }
    ];

    const lunchItemsPool = [
        {
            img: 'ca_thu.png',
            items: [
                { name: "Cá thu kho thơm", weight: 120, kcal: 230, protein: 24, carb: 5, fat: 12 },
                { name: "Cơm gạo lứt", weight: 150, kcal: 165, protein: 4, carb: 35, fat: 1.5 },
                { name: "Bắp cải luộc", weight: 150, kcal: 45, protein: 2, carb: 8, fat: 0 },
                { name: "Canh bí xanh", weight: 200, kcal: 60, protein: 3, carb: 10, fat: 1 }
            ]
        },
        {
            img: 'thit_heo.png',
            items: [
                { name: "Thịt heo nạc luộc", weight: 130, kcal: 220, protein: 28, carb: 0, fat: 11 },
                { name: "Khoai lang luộc", weight: 150, kcal: 130, protein: 3, carb: 30, fat: 0.3 },
                { name: "Salad cà chua dưa leo", weight: 200, kcal: 90, protein: 2, carb: 10, fat: 5 },
                { name: "Canh cà chua hành lá", weight: 200, kcal: 50, protein: 2, carb: 8, fat: 1 }
            ]
        }
    ];

    const dinnerItemsPool = [
        {
            img: 'tom_ram.png',
            items: [
                { name: "Tôm ram cháy tỏi (ít dầu)", weight: 130, kcal: 180, protein: 26, carb: 2, fat: 4 },
                { name: "Bún gạo lứt", weight: 120, kcal: 135, protein: 3, carb: 28, fat: 0.5 },
                { name: "Rau muống luộc", weight: 200, kcal: 50, protein: 3, carb: 8, fat: 0 },
                { name: "Canh cua mồng tơi", weight: 200, kcal: 95, protein: 8, carb: 6, fat: 3 }
            ]
        },
        {
            img: 'bo_ap_chao.png',
            items: [
                { name: "Bò áp chảo hương thảo", weight: 120, kcal: 250, protein: 30, carb: 0, fat: 14 },
                { name: "Khoai tây hấp thảo mộc", weight: 120, kcal: 100, protein: 2, carb: 22, fat: 0 },
                { name: "Măng tây luộc", weight: 150, kcal: 50, protein: 3, carb: 6, fat: 0 },
                { name: "Canh cải ngọt nấu tôm", weight: 200, kcal: 70, protein: 8, carb: 6, fat: 1 }
            ]
        }
    ];

    const snackPool = [
        { img: 'qua_bo.png', items: [{ name: "Quả bơ sáp", weight: 80, kcal: 130, protein: 1.5, carb: 6, fat: 12 }] },
        { img: 'hat_macca.png', items: [{ name: "Hạt macca", weight: 20, kcal: 140, protein: 2, carb: 3, fat: 15 }] },
        { img: 'sinh_to_dau.png', items: [{ name: "Sinh tố protein dâu tây", weight: 250, kcal: 180, protein: 20, carb: 14, fat: 2 }] }
    ];

    // Modify Day 1, Day 2, Day 3 HTML elements text content directly
    const updateDayUI = (dayNum, b, l, d, s) => {
        // Build items inside list
        const bHTML = b.items.map(item => `<li><span>${item.name}</span><strong>${item.weight}g • ${item.kcal} kcal</strong></li>`).join('');
        const bSum = b.items.reduce((acc, i) => acc + i.kcal, 0);
        document.getElementById(`day${dayNum}-breakfast-list`).innerHTML = bHTML;
        document.getElementById(`day${dayNum}-breakfast-total`).innerText = `${bSum} kcal`;
        document.getElementById(`day${dayNum}-breakfast-img`).style.backgroundImage = `url('${b.img}')`;

        const lHTML = l.items.map(item => `<li><span>${item.name}</span><strong>${item.weight}g • ${item.kcal} kcal</strong></li>`).join('');
        const lSum = l.items.reduce((acc, i) => acc + i.kcal, 0);
        document.getElementById(`day${dayNum}-lunch-list`).innerHTML = lHTML;
        document.getElementById(`day${dayNum}-lunch-total`).innerText = `${lSum} kcal`;
        document.getElementById(`day${dayNum}-lunch-img`).style.backgroundImage = `url('${l.img}')`;

        const dHTML = d.items.map(item => `<li><span>${item.name}</span><strong>${item.weight}g • ${item.kcal} kcal</strong></li>`).join('');
        const dSum = d.items.reduce((acc, i) => acc + i.kcal, 0);
        document.getElementById(`day${dayNum}-dinner-list`).innerHTML = dHTML;
        document.getElementById(`day${dayNum}-dinner-total`).innerText = `${dSum} kcal`;
        document.getElementById(`day${dayNum}-dinner-img`).style.backgroundImage = `url('${d.img}')`;

        const sHTML = s.items.map(item => `<li><span>${item.name}</span><strong>${item.weight}g • ${item.kcal} kcal</strong></li>`).join('');
        const sSum = s.items.reduce((acc, i) => acc + i.kcal, 0);
        document.getElementById(`day${dayNum}-snack-list`).innerHTML = sHTML;
        document.getElementById(`day${dayNum}-snack-total`).innerText = `${sSum} kcal`;
        document.getElementById(`day${dayNum}-snack-img`).style.backgroundImage = `url('${s.img}')`;
    };

    // For Day 1
    updateDayUI(1, breakItemsPool[0], lunchItemsPool[0], dinnerItemsPool[0], snackPool[0]);
    // For Day 2
    updateDayUI(2, breakItemsPool[1], lunchItemsPool[1], dinnerItemsPool[1], snackPool[1]);
    // For Day 3
    updateDayUI(3, breakItemsPool[2], lunchItemsPool[0], dinnerItemsPool[1], snackPool[2]);
}

function initMenuTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.day-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const day = btn.getAttribute('data-day');
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `day-${day}-content`) {
                    content.classList.add('active');
                }
            });
        });
    });
}

// --- Notification Dialog actions ---
function initNotificationDialog() {
    const popover = document.getElementById('notification-popover');
    const bellBtn = document.getElementById('btn-notifications');
    const closeBtn = document.getElementById('btn-close-notifications');

    bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        popover.classList.toggle('hidden');
        // Reset badge count on open
        const badge = bellBtn.querySelector('.bell-badge');
        if (badge) {
            badge.style.display = 'none';
        }
    });

    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        popover.classList.add('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!popover.contains(e.target) && e.target !== bellBtn) {
            popover.classList.add('hidden');
        }
    });
}

// --- Weight Logger Modal ---
function initWeightModal() {
    const modal = document.getElementById('weight-modal');
    const btnOpen = document.getElementById('btn-add-weight-log');
    const btnClose = document.getElementById('btn-close-weight-modal');
    const btnCancel = document.getElementById('btn-cancel-weight-modal');
    const btnSave = document.getElementById('btn-save-weight-modal');
    const inputWeight = document.getElementById('modal-input-weight');

    if (!btnOpen) return;

    btnOpen.addEventListener('click', () => {
        inputWeight.value = state.weight.current.toFixed(1);
        modal.classList.remove('hidden');
    });

    const closeModal = () => modal.classList.add('hidden');

    btnClose.addEventListener('click', closeModal);
    btnCancel.addEventListener('click', closeModal);

    btnSave.addEventListener('click', () => {
        const val = parseFloat(inputWeight.value);
        if (isNaN(val) || val < 30 || val > 200) {
            alert("Vui lòng nhập cân nặng hợp lệ (30 - 200 kg)!");
            return;
        }

        // Apply new weight
        state.weight.current = val;
        
        // Update history dataset
        const todayStr = "02/06";
        const todayLog = state.weight.history.find(h => h.date === todayStr);
        if (todayLog) {
            todayLog.val = val;
        } else {
            state.weight.history.push({ date: todayStr, val: val });
        }

        // Automatically trigger check-in too
        state.streak.history30Days[29] = 1;

        saveState();
        closeModal();
        
        // Re-render chart on data change
        renderWeightChart();
        alert(`Đã ghi nhận cân nặng hôm nay: ${val} kg. Hệ thống đã cập nhật biểu đồ!`);
    });
}

// --- Discipline Simulation Testing Panel ---
function initDisciplineSimulator() {
    const banner = document.getElementById('discipline-active-banner');
    const bannerTitle = document.getElementById('discipline-banner-title');
    const bannerDesc = document.getElementById('discipline-banner-desc');
    const bannerIcon = document.getElementById('discipline-banner-icon');
    const riskBar = document.getElementById('discipline-risk-bar');
    const riskEval = document.getElementById('discipline-risk-eval');

    const updateBannerState = (type, title, desc, iconName, riskPct, riskText) => {
        // Remove existing statuses
        banner.className = `discipline-status-banner status-${type}`;
        bannerTitle.innerText = title;
        bannerDesc.innerText = desc;
        bannerIcon.querySelector('i').setAttribute('data-lucide', iconName);
        
        // Animate risk meter
        riskBar.style.width = `${riskPct}%`;
        let riskColor = 'var(--color-green)';
        if (riskPct > 35) riskColor = 'var(--color-yellow)';
        if (riskPct > 65) riskColor = 'var(--color-primary)';
        if (riskPct > 80) riskColor = 'var(--color-red)';
        
        riskBar.style.background = riskColor;
        riskEval.innerHTML = `Hệ thống phân tích: ${riskText} Rủi ro bỏ cuộc là <strong>${riskPct}%</strong>.`;
        
        // Re-render lucide icon
        lucide.createIcons();
    };

    document.getElementById('btn-test-state-green').addEventListener('click', () => {
        updateBannerState(
            'green',
            'Hôm nay bạn đã check-in',
            'Giữ vững phong độ kỷ luật nhé! Bạn đang làm rất tốt hành trình kiểm soát cân nặng của mình.',
            'check-circle',
            10,
            'Bạn đang duy trì chuỗi check-in cực tốt. Hãy tiếp tục phát huy!'
        );
    });

    document.getElementById('btn-test-state-yellow').addEventListener('click', () => {
        updateBannerState(
            'yellow',
            'Bạn chưa cập nhật dữ liệu hôm nay',
            'Hãy cập nhật nhật ký ăn uống hoặc nhấn nút "Check-in ngay" bên dưới để hoàn tất mục tiêu hôm nay và duy trì streak.',
            'alert-triangle',
            25,
            'Hôm nay bạn chưa có dữ liệu cập nhật. Hãy cập nhật sớm để tránh bị đứt chuỗi streak!'
        );
    });

    document.getElementById('btn-test-state-orange').addEventListener('click', () => {
        updateBannerState(
            'orange',
            'Đã bỏ check-in 2 ngày',
            'Cảnh báo: Bạn đang mất dần thói quen kỷ luật. Nhấp check-in hoặc ăn uống lành mạnh để kích hoạt lại guồng quay giảm béo.',
            'shield-alert',
            55,
            'Bạn đã vắng mặt 2 ngày liên tục. Thói quen giảm cân đang bị lung lay!'
        );
    });

    document.getElementById('btn-test-state-red').addEventListener('click', () => {
        updateBannerState(
            'red',
            'Nguy cơ rơi khỏi mục tiêu giảm cân',
            'Nguy hiểm: Chuỗi bỏ lỡ quá dài. Lượng calo nạp dư thừa liên tiếp có thể khiến bạn tăng cân trở lại. Hãy hành động ngay!',
            'skull',
            85,
            'Nguy cơ bỏ cuộc rất cao! Bạn cần nhanh chóng lên lại kế hoạch ăn kiêng kỷ luật.'
        );
    });
}

// --- Sync Button Animation ---
function initSyncButton() {
    const btn = document.getElementById('btn-sync-data');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
            btn.innerHTML = '<span class="spinner-small"></span> <span>Đang đồng bộ...</span>';
        } catch(e) {}

        try {
            // 1. Save state to Firebase
            saveStateToFirebase();

            // 2. Load images from IndexedDB cache first
            const library = state.library || [];
            await loadImagesFromCache(library);

            // 3. Count images available
            const imagesWithData = library.filter(item => item.img && item.img.length > 10);
            
            if (imagesWithData.length === 0) {
                alert("Không tìm thấy ảnh nào trong thư viện để đồng bộ. Số item trong thư viện: " + library.length);
                btn.disabled = false;
                btn.innerHTML = '<i data-lucide="refresh-cw"></i> <span>Đồng bộ dữ liệu</span>';
                if (window.lucide) window.lucide.createIcons();
                return;
            }

            // 4. Upload each image to Firebase Storage
            let uploadCount = 0;
            let errors = [];
            for (const item of imagesWithData) {
                // Chỉ upload nếu img đang là base64 (chưa phải url cloud)
                if (item.img && item.img.startsWith('data:image')) {
                    try {
                        const url = await uploadImageToStorage(item.id, item.img);
                        if (url) {
                            item.img = url;
                            uploadCount++;
                        }
                    } catch (e) {
                        errors.push(item.id + ': ' + (e.message || e));
                    }
                }
            }
            
            // Lưu lại state với các URL mới
            if (uploadCount > 0) saveState();

            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="refresh-cw"></i> <span>Đồng bộ dữ liệu</span>';
            if (window.lucide) window.lucide.createIcons();

            if (errors.length > 0) {
                alert("Đồng bộ: " + uploadCount + "/" + imagesWithData.length + " ảnh thành công.\nLỗi: " + errors.join(', '));
            } else {
                alert("✅ Đồng bộ thành công! Đã upload " + uploadCount + " ảnh lên Firebase.\nBây giờ mở điện thoại và reload trang.");
            }
        } catch (err) {
            alert("❌ Lỗi đồng bộ: " + (err.message || err));
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="refresh-cw"></i> <span>Đồng bộ dữ liệu</span>';
            if (window.lucide) window.lucide.createIcons();
        }
    });
}

// --- Recalculate Button Trigger ---
function initRecalculateTrigger() {
    const btn = document.getElementById('btn-recalculate-macros');
    if (btn) {
        btn.addEventListener('click', recalculateNutritionTargets);
    }
}

// --- Global Check-in Listeners ---
function initCheckInTriggers() {
    // Dash preview check-in
    const btnCheckinPrev = document.getElementById('btn-checkin-now-prev');
    if (btnCheckinPrev) {
        btnCheckinPrev.addEventListener('click', executeCheckIn);
    }

    // Full screen discipline check-in
    const btnCheckinFull = document.getElementById('btn-discipline-checkin');
    if (btnCheckinFull) {
        btnCheckinFull.addEventListener('click', executeCheckIn);
    }
}

// --- App Initialization Entry Point ---
window.showNotification = function(title, message, type = 'info') {
    const el = document.createElement('div');
    el.className = `notification notification-${type}`;
    el.innerHTML = `<strong>${title}</strong><br>${message}`;
    el.style.position = 'fixed';
    el.style.bottom = '20px';
    el.style.right = '20px';
    el.style.backgroundColor = type === 'error' ? '#fee2e2' : (type === 'warning' ? '#fef3c7' : '#dcfce7');
    el.style.color = type === 'error' ? '#991b1b' : (type === 'warning' ? '#92400e' : '#166534');
    el.style.padding = '12px 20px';
    el.style.borderRadius = '8px';
    el.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    el.style.zIndex = '9999';
    el.style.transition = 'opacity 0.3s';
    el.style.borderLeft = `4px solid ${type === 'error' ? '#ef4444' : (type === 'warning' ? '#f59e0b' : '#22c55e')}`;
    document.body.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 300);
    }, 3000);
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Load data from localStorage
    loadState();

    // 2. Initialize modules (each wrapped in try-catch so one failure doesn't block others)
    const initModules = [
        ['initNavigation', initNavigation],
        ['initMenuTabs', initMenuTabs],
        ['initNotificationDialog', initNotificationDialog],
        ['initWeightModal', initWeightModal],
        ['initAIQA', initAIQA],
        ['initWeightDiary', initWeightDiary],
        ['initManualFoodForm', initManualFoodForm],
        ['initFoodScanner', initFoodScanner],
        ['initMenuGenerator', initMenuGenerator],
        ['initDisciplineSimulator', initDisciplineSimulator],
        ['initSyncButton', initSyncButton],
        ['initRecalculateTrigger', initRecalculateTrigger],
        ['initCheckInTriggers', initCheckInTriggers],
        ['initLibrary', initLibrary],
        ['initApiKeyModal', initApiKeyModal],
    ];
    
    initModules.forEach(([name, fn]) => {
        try {
            fn();
        } catch (err) {
            console.warn(`Module ${name} init failed:`, err);
        }
    });

    // 3. Render Views
    try { randomizeMenus(); } catch(e) { console.warn('randomizeMenus error:', e); }
    updateUI();
    try { renderWeightChart(); } catch(e) { console.warn('renderWeightChart error:', e); }

    // Attach listener to chart range switcher
    const chartRange = document.getElementById('chart-range-select');
    if (chartRange) {
        chartRange.addEventListener('change', renderWeightChart);
    }
    
    // Background task to compress existing uncompressed images in library to free up memory
    compressExistingLibraryImages();
});

// --- MEAL LIBRARY FUNCTIONS ---
function compressExistingLibraryImages() {
    if (!state.library || state.library.length === 0) return;
    let hasChanges = false;
    let promises = state.library.map((item, index) => {
        return new Promise((resolve) => {
            // Check if base64 length indicates a large file (> 200KB)
            if (item.img && item.img.length > 250000) { 
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_SIZE = 800;
                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressed = canvas.toDataURL('image/jpeg', 0.7);
                    
                    if (compressed.length < item.img.length) {
                        state.library[index].img = compressed;
                        hasChanges = true;
                    }
                    resolve();
                };
                img.onerror = resolve; // Skip on error
                img.src = item.img;
            } else {
                resolve();
            }
        });
    });

    Promise.all(promises).then(() => {
        if (hasChanges) {
            try {
                saveAllImagesToCache(state.library);
                const lightState = createLightState();
                localStorage.setItem('fitlife_state', JSON.stringify(lightState));
                saveStateToFirebase();
                console.log("Đã tự động nén các ảnh cũ, giải phóng bộ nhớ thành công!");
            } catch (e) {
                console.error("Lỗi khi lưu ảnh đã nén", e);
            }
        }
    });
}
function initLibrary() {
    if (!state.library) state.library = [];
    const uploadInput = document.getElementById('library-upload-input');
    if (uploadInput) {
        uploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        try {
                            const canvas = document.createElement('canvas');
                            let width = img.width;
                            let height = img.height;
                            const MAX_SIZE = 600; // Giảm xuống 600px để ảnh nhẹ hơn nữa

                            if (width > height) {
                                if (width > MAX_SIZE) {
                                    height *= MAX_SIZE / width;
                                    width = MAX_SIZE;
                                }
                            } else {
                                if (height > MAX_SIZE) {
                                    width *= MAX_SIZE / height;
                                    height = MAX_SIZE;
                                }
                            }

                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, width, height);

                            // Nén ảnh sang JPEG chất lượng 60%
                            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);

                            const newItem = {
                                id: Date.now().toString(),
                                img: compressedBase64,
                                analyzed: false,
                                name: "",
                                weight: "",
                                kcal: 0
                            };
                            state.library.push(newItem);
                            saveState();
                            renderLibraryGrid();
                            uploadInput.value = '';
                            
                            // Auto upload to storage in background
                            uploadImageToStorage(newItem.id, compressedBase64).then(url => {
                                if (url) {
                                    const item = state.library.find(i => i.id === newItem.id);
                                    if (item) {
                                        item.img = url;
                                        saveState();
                                    }
                                }
                            });
                            
                            showNotification("Thành công", "Ảnh đã tải lên! Đang đồng bộ tự động lên Cloud Storage...", "success");
                        } catch (err) {
                            console.error("Lỗi upload ảnh:", err);
                            state.library.pop();
                            showNotification("Lỗi", "Lỗi khi xử lý ảnh: " + (err.message || err), "error");
                        }
                    };
                    img.onerror = () => {
                        showNotification("Lỗi", "Không thể đọc file ảnh này. Hãy thử ảnh khác.", "error");
                    };
                    img.src = event.target.result;
                };
                reader.onerror = () => {
                    showNotification("Lỗi", "Không thể đọc file. Hãy thử lại.", "error");
                };
                reader.readAsDataURL(file);
            }
        });
    }
    renderLibraryGrid();
}

function renderLibraryGrid() {
    const container = document.getElementById('library-grid-container');
    const emptyState = document.getElementById('library-empty-state');
    if (!container) return;

    if (!state.library || state.library.length === 0) {
        if(emptyState) emptyState.style.display = 'block';
        Array.from(container.children).forEach(child => {
            if (child.id !== 'library-empty-state') container.removeChild(child);
        });
        return;
    }
    
    if(emptyState) emptyState.style.display = 'none';

    let html = '';
    state.library.forEach(item => {
        const imgSrc = item.img || '';
        const hasImage = imgSrc && imgSrc.length > 10;
        const imgTag = hasImage 
            ? `<img src="${imgSrc}" alt="${item.name || 'Ảnh món ăn'}">`
            : `<div class="library-img-loading" data-item-id="${item.id}" style="width:100%;height:180px;background:linear-gradient(135deg,#f0f0f0,#e0e0e0);display:flex;align-items:center;justify-content:center;color:#999;font-size:14px;"><span class="spinner-small" style="margin-right:8px;"></span> Đang tải ảnh...</div>`;

        if (item.analyzed) {
            html += `
            <div class="library-card">
                ${imgTag}
                <div class="library-card-content" style="position: relative;">
                    <h3>${item.name}</h3>
                    <div class="library-card-stats" style="margin-bottom: 8px;">
                        <span><i data-lucide="scale"></i> ${item.weight}</span>
                        <span class="text-orange-dark"><i data-lucide="flame"></i> ${item.kcal} kcal</span>
                    </div>
                    ${item.items && item.items.length > 0 ? `
                    <div class="food-breakdown-list">
                        ${item.items.map(food => `
                        <div class="food-breakdown-item">
                            <span class="food-name">${food.name}</span>
                            <span class="food-amount">${food.weight}g &bull; ${food.kcal} kcal</span>
                        </div>
                        `).join('')}
                    </div>
                    ` : ''}
                    <button class="btn-delete-library" onclick="deleteLibraryItem('${item.id}')" title="Xóa ảnh">
                        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                    </button>
                </div>
            </div>`;
        } else {
            html += `
            <div class="library-card" id="lib-card-${item.id}">
                ${imgTag}
                <div class="library-card-content" style="position: relative;">
                    <button class="btn-analyze" onclick="analyzeLibraryImage('${item.id}')" id="btn-analyze-${item.id}" style="margin-right: 28px;">
                        <i data-lucide="scan"></i> Phân tích AI
                    </button>
                    <button class="btn-delete-library" onclick="deleteLibraryItem('${item.id}')" title="Xóa ảnh" style="bottom: 16px;">
                        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                    </button>
                </div>
            </div>`;
        }
    });

    container.innerHTML = (emptyState ? emptyState.outerHTML : '') + html;
    if(window.lucide) window.lucide.createIcons();

    // Retry loading missing images from IndexedDB cache, then Cloud Storage
    const loadingPlaceholders = container.querySelectorAll('.library-img-loading');
    if (loadingPlaceholders.length > 0) {
        loadingPlaceholders.forEach(placeholder => {
            const itemId = placeholder.getAttribute('data-item-id');
            if (itemId) {
                getImageFromCache(itemId).then(cached => {
                    if (cached) {
                        const item = state.library.find(i => i.id === itemId);
                        if (item) item.img = cached;
                        const img = document.createElement('img');
                        img.src = cached;
                        img.alt = (item && item.name) || 'Ảnh món ăn';
                        placeholder.replaceWith(img);
                    } else {
                        // IndexedDB empty → try Firebase Cloud Storage
                        placeholder.innerHTML = '<span class="spinner-small" style="margin-right:8px;"></span> Đang tải từ cloud...';
                        if (storage) {
                            storage.ref(`library/${itemId}.jpg`).getDownloadURL().then(url => {
                                const item = state.library.find(i => i.id === itemId);
                                if (item) {
                                    item.img = url;
                                    saveState(); // update state with the new URL
                                }
                                const img = document.createElement('img');
                                img.src = url;
                                img.alt = (item && item.name) || 'Ảnh món ăn';
                                placeholder.replaceWith(img);
                            }).catch(() => {
                                placeholder.innerHTML = '<i data-lucide="image-off" style="width:24px;height:24px;margin-right:8px;"></i> Ảnh không khả dụng';
                                if(window.lucide) window.lucide.createIcons();
                            });
                        } else {
                            placeholder.innerHTML = '<i data-lucide="image-off" style="width:24px;height:24px;margin-right:8px;"></i> Lỗi Cloud';
                            if(window.lucide) window.lucide.createIcons();
                        }
                    }
                });
            }
        });
    }
}

window.analyzeLibraryImage = async function(id) {
    const btn = document.getElementById(`btn-analyze-${id}`);
    if (btn) {
        btn.innerHTML = '<span class="spinner-small"></span> Đang phân tích...';
        btn.classList.add('loading');
    }

    try {
        const item = state.library.find(i => i.id === id);
        if (item) {
            // Call Gemini API with the image
            const aiData = await analyzeImageWithGemini(item.img);
            
            item.analyzed = true;
            item.name = aiData.name;
            item.weight = aiData.weight + "g"; 
            item.kcal = aiData.kcal;
            item.items = aiData.items;
            item.macros = aiData.macros;
            saveState();
            renderLibraryGrid();
            showNotification("Phân tích hoàn tất", `AI đã nhận diện: ${item.name}`, "success");
        }
    } catch (err) {
        console.error("Lỗi khi phân tích:", err);
        const errMsg = err.message || "Không rõ lỗi";
        showNotification("Lỗi AI", `${errMsg}`, "error");
        if (btn) {
            btn.innerHTML = '<i data-lucide="scan"></i> Phân tích AI';
            btn.classList.remove('loading');
            if(window.lucide) window.lucide.createIcons();
        }
    }
}

window.deleteLibraryItem = function(id) {
    const modal = document.getElementById('custom-confirm-modal');
    modal.classList.remove('hidden');
    
    const btnCancel = document.getElementById('btn-confirm-cancel');
    const btnDelete = document.getElementById('btn-confirm-delete');
    
    // Remove old listeners to prevent multiple firing
    const newBtnCancel = btnCancel.cloneNode(true);
    const newBtnDelete = btnDelete.cloneNode(true);
    btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);
    btnDelete.parentNode.replaceChild(newBtnDelete, btnDelete);
    
    newBtnCancel.addEventListener('click', () => {
        modal.classList.add('hidden');
    });
    
    newBtnDelete.addEventListener('click', () => {
        modal.classList.add('hidden');
        // Xóa ảnh khỏi Firebase Storage
        deleteImageFromStorage(id);
        state.library = state.library.filter(i => i.id !== id);
        saveState();
        renderLibraryGrid();
        showNotification("Đã xóa", "Ảnh đã được xóa thành công.", "success");
    });
}

window.replaceMealFromLibrary = function(day, mealType) {
    if (!state.library) state.library = [];
    const analyzedItems = state.library.filter(item => item.analyzed);
    if (analyzedItems.length === 0) {
        showNotification("Thư viện trống", "Bạn cần tải lên và phân tích ít nhất một ảnh bữa ăn trong Thư viện trước khi đổi món.", "warning");
        return;
    }
    const randomItem = analyzedItems[Math.floor(Math.random() * analyzedItems.length)];
    
    // Update DOM
    document.getElementById(`day${day}-${mealType}-img`).style.backgroundImage = `url('${randomItem.img}')`;
    document.getElementById(`day${day}-${mealType}-total`).textContent = `${randomItem.kcal} kcal`;
    
    let listHtml = '';
    if (randomItem.items && randomItem.items.length > 0) {
        listHtml = randomItem.items.map(food => `
            <li><span>${food.name}</span><strong>${food.weight}g &bull; ${food.kcal} kcal</strong></li>
        `).join('');
    } else {
        listHtml = `
            <li><span>${randomItem.name}</span><strong>${randomItem.weight} &bull; ${randomItem.kcal} kcal</strong></li>
        `;
    }
    
    const listEl = document.getElementById(`day${day}-${mealType}-list`);
    if(listEl) listEl.innerHTML = listHtml;
    
    showNotification("Đã đổi món", `Đã thay thế bằng ${randomItem.name} từ Thư viện!`, "success");
}

let GEMINI_API_KEY = localStorage.getItem('gemini_api_key');
if (GEMINI_API_KEY === "null") GEMINI_API_KEY = null;

// --- API Key Sidebar + Modal Logic ---
function initApiKeyModal() {
    // Sidebar elements
    const sidebarInput = document.getElementById('sidebar-apikey-input');
    const sidebarSaveBtn = document.getElementById('sidebar-apikey-save');
    const sidebarStatus = document.getElementById('sidebar-apikey-status');
    
    // Modal elements (kept as secondary)
    const modal = document.getElementById('apikey-modal');
    const btnClose = document.getElementById('btn-close-apikey-modal');
    const btnSave = document.getElementById('btn-save-apikey');
    const btnDelete = document.getElementById('btn-delete-apikey');
    const btnToggle = document.getElementById('btn-toggle-apikey');
    const modalInput = document.getElementById('apikey-input');
    const statusDiv = document.getElementById('apikey-status');

    function updateAllStatus() {
        // Update sidebar status
        if (sidebarStatus) {
            if (GEMINI_API_KEY && GEMINI_API_KEY.length > 5) {
                const masked = '••••' + GEMINI_API_KEY.substring(GEMINI_API_KEY.length - 4);
                sidebarStatus.innerHTML = `<span class="apikey-dot apikey-dot-active"></span><span>Đã kết nối (${masked})</span>`;
                if (sidebarInput) sidebarInput.value = GEMINI_API_KEY;
            } else {
                sidebarStatus.innerHTML = `<span class="apikey-dot apikey-dot-inactive"></span><span>Chưa cài đặt</span>`;
                if (sidebarInput) sidebarInput.value = '';
            }
        }
        
        // Update modal status
        if (statusDiv) {
            if (GEMINI_API_KEY && GEMINI_API_KEY.length > 5) {
                const masked = GEMINI_API_KEY.substring(0, 6) + '••••••••' + GEMINI_API_KEY.substring(GEMINI_API_KEY.length - 4);
                statusDiv.innerHTML = `<i data-lucide="check-circle" style="width:18px;height:18px;color:#22c55e;"></i> <span style="color:#166534;"><strong>Đã cài đặt:</strong> ${masked}</span>`;
                statusDiv.style.background = '#dcfce7';
                if (modalInput) modalInput.value = GEMINI_API_KEY;
            } else {
                statusDiv.innerHTML = `<i data-lucide="alert-circle" style="width:18px;height:18px;color:#f59e0b;"></i> <span style="color:#92400e;"><strong>Chưa có API Key.</strong> Hãy nhập key để sử dụng tính năng AI.</span>`;
                statusDiv.style.background = '#fef3c7';
                if (modalInput) modalInput.value = '';
            }
        }
        if (window.lucide) window.lucide.createIcons();
    }

    function saveKey(val) {
        if (!val || val.trim().length < 10) {
            showNotification("Lỗi", "API Key không hợp lệ. Key phải có ít nhất 10 ký tự.", "error");
            return false;
        }
        GEMINI_API_KEY = val.trim();
        localStorage.setItem('gemini_api_key', GEMINI_API_KEY);
        updateAllStatus();
        showNotification("Thành công", "API Key đã được lưu thành công!", "success");
        return true;
    }

    // --- Sidebar handlers ---
    if (sidebarSaveBtn && sidebarInput) {
        sidebarSaveBtn.addEventListener('click', () => {
            saveKey(sidebarInput.value);
        });
        sidebarInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') saveKey(sidebarInput.value);
        });
    }

    // --- Modal handlers ---
    function openModal() {
        updateAllStatus();
        if (modalInput) modalInput.type = 'password';
        if (modal) modal.classList.remove('hidden');
    }

    function closeModal() {
        if (modal) modal.classList.add('hidden');
    }

    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (modal) modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    if (btnToggle && modalInput) {
        btnToggle.addEventListener('click', () => {
            const isPassword = modalInput.type === 'password';
            modalInput.type = isPassword ? 'text' : 'password';
            const icon = btnToggle.querySelector('i');
            if (icon) icon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
            if (window.lucide) window.lucide.createIcons();
        });
    }

    if (btnSave && modalInput) {
        btnSave.addEventListener('click', () => {
            if (saveKey(modalInput.value)) closeModal();
        });
    }

    if (btnDelete) {
        btnDelete.addEventListener('click', () => {
            GEMINI_API_KEY = null;
            localStorage.removeItem('gemini_api_key');
            updateAllStatus();
            showNotification("Đã xóa", "API Key đã được xóa.", "warning");
        });
    }

    // Expose open function globally
    window.openApiKeyModal = openModal;
    
    // Initial status update
    updateAllStatus();
}

async function analyzeImageWithGemini(base64Image) {
    if (!GEMINI_API_KEY) {
        // Open modal instead of prompt
        if (window.openApiKeyModal) {
            window.openApiKeyModal();
        }
        throw new Error("Chưa có API Key. Vui lòng nhập API Key trong cài đặt để sử dụng tính năng này.");
    }

    // Try models in order of preference
    const MODELS = ['gemini-2.5-flash', 'gemini-3.5-flash'];
    
    let mimeType = "image/jpeg";
    let data = base64Image;

    // Convert URL to base64 if it's an http link (Firebase Storage)
    if (base64Image.startsWith('http')) {
        try {
            // Use corsproxy.io to bypass CORS restrictions
            const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(base64Image);
            const response = await fetch(proxyUrl);
            const blob = await response.blob();
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            data = dataUrl;
        } catch (e) {
            throw new Error("Không thể tải ảnh từ Cloud để phân tích do lỗi CORS. Vui lòng thử lại sau.");
        }
    }

    if (data.includes(',')) {
        const parts = data.split(',');
        mimeType = parts[0].match(/:(.*?);/)[1];
        data = parts[1];
    }

    const prompt = `Bạn là một chuyên gia dinh dưỡng. Hãy nhìn vào đĩa thức ăn trong bức ảnh và phân tích CHUYÊN SÂU:
1. Tên gọi chung của cả đĩa thức ăn (name).
2. Tổng khối lượng (tổng số gram) và Tổng lượng calo (kcal).
3. Tổng Macros: Protein (p), Carbs (c), Fat (f) tính bằng gram.
4. Danh sách CHI TIẾT từng thành phần món ăn có trong đĩa. Với mỗi thành phần, ước lượng tên (name), khối lượng (weight), và calo (kcal).

Bạn BẮT BUỘC trả về ĐÚNG MỘT ĐỐI TƯỢNG JSON thuần túy (không bọc trong markdown \`\`\`), với định dạng chính xác như sau:
{
  "name": "Tên tổng quát",
  "weight": tổng_số_gram_nguyên,
  "kcal": tổng_calo_nguyên,
  "macros": {"p": số_g, "c": số_g, "f": số_g},
  "items": [
    {"name": "Thành phần 1", "weight": số_g, "kcal": số_g},
    {"name": "Thành phần 2", "weight": số_g, "kcal": số_g}
  ]
}`;

    const requestBody = {
        contents: [
            {
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: data
                        }
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.4,
            responseMimeType: "application/json"
        }
    };

    let lastError = null;
    
    for (const modelName of MODELS) {
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
        
        try {
            console.log(`Đang thử model: ${modelName}...`);
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;
                console.warn(`Model ${modelName} lỗi: ${errorMsg}`);
                
                // If API key is invalid, don't try other models
                if (response.status === 400 || response.status === 403) {
                    if (errorMsg.toLowerCase().includes('api key') || errorMsg.toLowerCase().includes('permission')) {
                        localStorage.removeItem('gemini_api_key');
                        GEMINI_API_KEY = null;
                        throw new Error(`API Key không hợp lệ: ${errorMsg}. Vui lòng reload trang và nhập lại API Key.`);
                    }
                }
                
                lastError = new Error(`Model ${modelName}: ${errorMsg}`);
                continue; // Try next model
            }

            const result = await response.json();
            if (!result.candidates || result.candidates.length === 0) {
                lastError = new Error(`Model ${modelName}: Gemini không trả về kết quả`);
                continue;
            }
            
            let textResult = result.candidates[0].content.parts[0].text;
            textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();

            const parsedData = JSON.parse(textResult);
            console.log(`Phân tích thành công với model: ${modelName}`);
            return {
                name: parsedData.name || "Món ăn chưa xác định",
                weight: parsedData.weight || 200,
                kcal: parsedData.kcal || 300,
                macros: parsedData.macros || {p: 0, c: 0, f: 0},
                items: parsedData.items || []
            };
        } catch (error) {
            console.error(`Gemini API Error (${modelName}):`, error);
            lastError = error;
            // If it's a definitive error (bad key), throw immediately
            if (error.message.includes('API Key không hợp lệ')) {
                throw error;
            }
            continue; // Try next model
        }
    }
    
    // All models failed
    throw lastError || new Error("Không thể kết nối với Gemini API. Vui lòng kiểm tra kết nối mạng và API Key.");
}
