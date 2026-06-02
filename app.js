// ==========================================================================
// FITLIFE - CLIENT SIDE STATE & LOGIC
// ==========================================================================

// --- App State Definition ---
const DEFAULT_STATE = {
    user: {
        name: "Nguyễn Mai",
        avatar: "nguyen_mai_avatar.png"
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
    water: {
        current: 1.5, // Liters
        target: 2.5,
        history: [
            { time: "07:30", type: "water", vol: 250 },
            { time: "09:15", type: "coffee", vol: 150 },
            { time: "10:30", type: "water", vol: 250 },
            { time: "12:00", type: "water", vol: 250 },
            { time: "13:30", type: "tea", vol: 200 },
            { time: "14:15", type: "water", vol: 400 }
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
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
}

let isSyncingFromFirebase = false;
let state = {};
let weightChart = null;

// --- State Persist & Load ---
function loadState() {
    const saved = localStorage.getItem('fitlife_state');
    if (saved) {
        try {
            state = JSON.parse(saved);
        } catch (e) {
            console.error("Lỗi parse JSON state, dùng mặc định", e);
            state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        }
    } else {
        state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    }

    if (db) {
        db.ref('shared_state').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                isSyncingFromFirebase = true;
                state = data;
                localStorage.setItem('fitlife_state', JSON.stringify(state));
                
                updateUI();
                if (weightChart) renderWeightChart();
                
                const libScreen = document.getElementById('screen-thu-vien');
                if (libScreen && !libScreen.classList.contains('hidden')) {
                    if (typeof renderLibraryGrid === 'function') renderLibraryGrid();
                }

                const diaryScreen = document.getElementById('screen-thuc-don');
                if (diaryScreen && !diaryScreen.classList.contains('hidden')) {
                    const activeTab = document.querySelector('.day-tab.active');
                    if (activeTab) {
                        const dayText = activeTab.querySelector('strong').innerText;
                        const dayKey = dayText.toLowerCase();
                        if (typeof renderDiary === 'function') renderDiary(dayKey);
                    }
                }
                
                isSyncingFromFirebase = false;
            } else {
                if (!isSyncingFromFirebase) {
                    db.ref('shared_state').set(state);
                }
            }
        });
    }
}

function saveState() {
    localStorage.setItem('fitlife_state', JSON.stringify(state));
    updateUI();
    if (db && !isSyncingFromFirebase) {
        db.ref('shared_state').set(state).catch(err => {
            console.error("Lỗi lưu Firebase:", err);
        });
    }
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
    document.querySelectorAll('.preview-link, .gram-meal-list, #preview-dinh-duong button, #preview-thuc-don button, #preview-nhat-ky button, #preview-nuoc button').forEach(el => {
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
            } else if (el.closest('#preview-nuoc')) {
                // If it is water quick buttons, don't redirect
                if (e.target.closest('.water-quick-buttons')) return;
                target = 'nuoc';
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
                    titleFont: { family: 'Outfit', weight: 'bold' },
                    bodyFont: { family: 'Plus Jakarta Sans' },
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
                        font: { family: 'Plus Jakarta Sans', size: 11 }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#64748B',
                        font: { family: 'Plus Jakarta Sans', size: 11 }
                    }
                }
            }
        }
    });
}

// --- Main UI Rendering & Dom Updates ---
function updateUI() {
    // Current Date updates
    const now = new Date();
    const formattedNow = formatDate(now);
    const dashDateEl = document.getElementById('dashboard-date');
    if (dashDateEl) dashDateEl.innerText = formattedNow;
    const diaryDateEl = document.getElementById('diary-current-date');
    if (diaryDateEl) diaryDateEl.innerText = formattedNow;

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
    // Today index is index 29 (the last one) in history30Days
    const todayChecked = state.streak.history30Days[29] === 1;

    // Update stats labels
    document.getElementById('val-weight-current').innerText = currentWeight.toFixed(1);
    document.getElementById('val-weight-target').innerText = targetWeight.toFixed(1);
    document.getElementById('val-weight-lost').innerText = lostWeight;
    document.getElementById('val-weight-start').innerText = `Từ ${startWeight.toFixed(1)} kg`;
    document.getElementById('val-streak').innerText = streakDays;
    document.getElementById('banner-streak-days').innerText = streakDays;
    document.getElementById('discipline-streak-current').innerText = streakDays;

    // Compliance estimation
    // Calculated by counting checks out of 30 days
    const checkedDays = state.streak.history30Days.filter(h => h === 1).length;
    const compliancePercent = Math.round((checkedDays / 30) * 100);
    document.getElementById('val-compliance').innerText = compliancePercent;
    document.getElementById('discipline-compliance-month').innerText = compliancePercent;

    // Calories calculation
    const caloriesState = calculateCurrentDayCalories();
    const kcalConsumed = caloriesState.kcal;
    const kcalTarget = state.nutrition.kcalTarget;
    const kcalRemain = Math.max(0, kcalTarget - kcalConsumed);
    const kcalPercent = Math.min(100, Math.round((kcalConsumed / kcalTarget) * 100));

    // Dashboard values
    document.getElementById('dash-kcal-consumed').innerText = kcalConsumed.toLocaleString('vi-VN');
    document.getElementById('dash-kcal-target').innerText = kcalTarget.toLocaleString('vi-VN');
    
    const dashRemainEl = document.getElementById('dash-kcal-remain');
    if (kcalRemain > 0) {
        dashRemainEl.innerText = `${kcalRemain.toLocaleString('vi-VN')} kcal`;
        dashRemainEl.className = 'text-green';
    } else {
        dashRemainEl.innerText = `Hoàn thành`;
        dashRemainEl.className = 'text-orange-dark';
    }

    // SVG Ring animate: Dasharray of circle is 2*pi*r = 2 * 3.14 * 60 = 377
    const circleLen = 377;
    const dashOffset = circleLen - (circleLen * (kcalPercent / 100));
    const ringEl = document.getElementById('calorie-progress-ring');
    if (ringEl) {
        ringEl.style.strokeDashoffset = dashOffset;
    }

    // Dashboard macros progress bar
    document.getElementById('dash-protein-curr').innerText = caloriesState.protein;
    document.getElementById('dash-protein-target').innerText = state.nutrition.proteinTarget;
    const pPct = Math.min(100, Math.round((caloriesState.protein / state.nutrition.proteinTarget) * 100));
    document.getElementById('dash-protein-bar').style.width = `${pPct}%`;

    document.getElementById('dash-carb-curr').innerText = caloriesState.carb;
    document.getElementById('dash-carb-target').innerText = state.nutrition.carbTarget;
    const cPct = Math.min(100, Math.round((caloriesState.carb / state.nutrition.carbTarget) * 100));
    document.getElementById('dash-carb-bar').style.width = `${cPct}%`;

    document.getElementById('dash-fat-curr').innerText = caloriesState.fat;
    document.getElementById('dash-fat-target').innerText = state.nutrition.fatTarget;
    const fPct = Math.min(100, Math.round((caloriesState.fat / state.nutrition.fatTarget) * 100));
    document.getElementById('dash-fat-bar').style.width = `${fPct}%`;

    // Screen 2 Nutrition targets values
    document.getElementById('plan-kcal-val').innerText = kcalTarget.toLocaleString('vi-VN');
    document.getElementById('plan-protein-val').innerText = state.nutrition.proteinTarget;
    document.getElementById('plan-carb-val').innerText = state.nutrition.carbTarget;
    document.getElementById('plan-fat-val').innerText = state.nutrition.fatTarget;

    // Screen 4 Food Diary calories
    document.getElementById('diary-kcal-consumed').innerText = kcalConsumed.toLocaleString('vi-VN');
    document.getElementById('diary-kcal-target').innerText = kcalTarget.toLocaleString('vi-VN');
    
    const diaryRemainEl = document.getElementById('diary-kcal-remain');
    if (kcalRemain > 0) {
        diaryRemainEl.innerText = kcalRemain.toLocaleString('vi-VN');
        diaryRemainEl.className = 'text-green';
    } else {
        diaryRemainEl.innerText = `Xong`;
        diaryRemainEl.className = 'text-orange-dark';
    }

    const diaryProgressPercentEl = document.getElementById('diary-progress-percent');
    diaryProgressPercentEl.innerText = `${kcalPercent}% hoàn thành mục tiêu`;
    document.getElementById('diary-progress-bar').style.width = `${kcalPercent}%`;

    // Dynamic warning text block
    const warningStatusEl = document.getElementById('dash-warning-status');
    const btnCheckinPrev = document.getElementById('btn-checkin-now-prev');
    if (todayChecked) {
        if (warningStatusEl) {
            warningStatusEl.innerText = "Hôm nay bạn đã check-in!";
            warningStatusEl.className = "warning-title text-green";
            warningStatusEl.closest('.warning-box-body').querySelector('.warning-icon-large').className = "warning-icon-large text-green";
            warningStatusEl.closest('.warning-box-body').querySelector('.warning-icon-large i').setAttribute('data-lucide', 'check-circle');
        }
        if (btnCheckinPrev) {
            btnCheckinPrev.innerText = "Đã check-in";
            btnCheckinPrev.disabled = true;
            btnCheckinPrev.style.opacity = "0.6";
        }
        document.getElementById('val-weight-update-time').innerText = "Cập nhật: Mới xong";
    } else {
        if (warningStatusEl) {
            warningStatusEl.innerText = "Bạn chưa check-in hôm nay!";
            warningStatusEl.className = "warning-title text-orange";
            warningStatusEl.closest('.warning-box-body').querySelector('.warning-icon-large').className = "warning-icon-large text-orange";
            warningStatusEl.closest('.warning-box-body').querySelector('.warning-icon-large i').setAttribute('data-lucide', 'alert-triangle');
        }
        if (btnCheckinPrev) {
            btnCheckinPrev.innerText = "Check-in ngay";
            btnCheckinPrev.disabled = false;
            btnCheckinPrev.style.opacity = "1";
        }
        document.getElementById('val-weight-update-time').innerText = "Cập nhật: Hôm nay";
    }

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

    // Water Tracker values
    const waterLiters = state.water.current;
    const waterTarget = state.water.target;
    const waterRemain = Math.max(0, waterTarget - waterLiters);
    
    document.getElementById('dash-water-volume').innerText = waterLiters.toFixed(1);
    document.getElementById('dash-water-remain').innerText = waterRemain.toFixed(1);

    document.getElementById('water-current-text').innerHTML = `${waterLiters.toFixed(1)} <span class="unit">lít</span>`;
    document.getElementById('water-missing-liters').innerText = waterRemain.toFixed(1);
    document.getElementById('water-missing-glasses').innerText = Math.ceil(waterRemain / 0.25);

    // Height of water cylinder animation
    const waterPercent = Math.min(100, Math.round((waterLiters / waterTarget) * 100));
    const waterLevelEl = document.getElementById('water-level-fill');
    if (waterLevelEl) {
        waterLevelEl.style.height = `${waterPercent}%`;
    }
    const miniWaterWaveEl = document.querySelector('.mini-water-wave');
    if (miniWaterWaveEl) {
        miniWaterWaveEl.style.height = `${waterPercent}%`;
    }

    const waterAlertEl = document.getElementById('water-warning-alert');
    if (waterRemain <= 0) {
        if (waterAlertEl) {
            waterAlertEl.style.backgroundColor = 'var(--color-green-light)';
            waterAlertEl.style.borderColor = 'var(--color-green)';
            waterAlertEl.querySelector('.alert-icon').style.color = 'var(--color-green)';
            waterAlertEl.querySelector('.alert-body h4').innerText = "Đã đủ lượng nước cần thiết!";
            waterAlertEl.querySelector('.alert-body p').innerText = "Tuyệt vời! Bạn đã hoàn thành 100% mục tiêu uống nước hôm nay.";
        }
    } else {
        if (waterAlertEl) {
            waterAlertEl.style.backgroundColor = 'var(--color-blue-light)';
            waterAlertEl.style.borderColor = 'rgba(59, 130, 246, 0.2)';
            waterAlertEl.querySelector('.alert-icon').style.color = 'var(--color-blue)';
            waterAlertEl.querySelector('.alert-body h4').innerText = `Bạn còn thiếu ${waterRemain.toFixed(1)} lít nước hôm nay`;
            waterAlertEl.querySelector('.alert-body p').innerText = `Tương đương khoảng ${Math.ceil(waterRemain / 0.25)} ly nước nữa. Hãy uống đều đặn nhé!`;
        }
    }

    // Refresh history grids and lists
    renderDisciplineCalendar();
    renderWaterHistoryList();
    renderDiaryMealsList();

    // Reinitialize icons rendered via template
    lucide.createIcons();
}

// --- Render Water Log History ---
function renderWaterHistoryList() {
    const listContainer = document.getElementById('water-history-container');
    if (!listContainer) return;

    if (state.water.history.length === 0) {
        listContainer.innerHTML = `<li class="text-muted" style="background:none;justify-content:center;">Chưa có dữ liệu hôm nay</li>`;
        return;
    }

    const typeLabels = { water: "Nước lọc", coffee: "Cà phê", tea: "Trà xanh" };
    let listHTML = '';
    
    // Show newest first
    [...state.water.history].reverse().forEach((log, index) => {
        listHTML += `
            <li>
                <span>${typeLabels[log.type]} (+${log.vol}ml)</span>
                <span class="time">${log.time}</span>
            </li>
        `;
    });

    listContainer.innerHTML = listHTML;
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

// --- Interactive Water Tracker Actions ---
function initWaterTracker() {
    const handleAddFluid = (type, volumeMl) => {
        state.water.current = Math.min(5.0, state.water.current + (volumeMl / 1000));
        
        const timestamp = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        state.water.history.push({
            time: timestamp,
            type: type,
            vol: volumeMl
        });
        
        saveState();
    };

    // Quick add dashboard previews
    document.getElementById('prev-add-water-1').addEventListener('click', () => handleAddFluid('water', 250));
    document.getElementById('prev-add-coffee-1').addEventListener('click', () => handleAddFluid('coffee', 150));
    document.getElementById('prev-add-tea-1').addEventListener('click', () => handleAddFluid('tea', 200));

    // Full screen add controls
    document.getElementById('btn-add-water-250').addEventListener('click', () => handleAddFluid('water', 250));
    document.getElementById('btn-add-coffee-150').addEventListener('click', () => handleAddFluid('coffee', 150));
    document.getElementById('btn-add-tea-200').addEventListener('click', () => handleAddFluid('tea', 200));

    // Reset water today
    document.getElementById('btn-reset-water').addEventListener('click', () => {
        if (confirm("Bạn có chắc chắn muốn xóa lịch sử uống nước hôm nay không?")) {
            state.water.current = 0;
            state.water.history = [];
            saveState();
        }
    });
}

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

// --- Menu Generation simulation ---
function initMenuGenerator() {
    const btnGen = document.getElementById('btn-generate-menu');
    if (!btnGen) return;

    btnGen.addEventListener('click', () => {
        if (confirm("Tạo thực đơn AI mới dựa trên calo mục tiêu của bạn? Mọi thực đơn 3 ngày cũ sẽ bị ghi đè.")) {
            // Show dynamic loading simulation
            btnGen.disabled = true;
            btnGen.innerHTML = `<span class="spinner-small"></span> Đang phân tích chỉ số...`;

            setTimeout(() => {
                btnGen.innerHTML = `<span class="spinner-small"></span> Lập lịch calo tối ưu...`;
            }, 800);

            setTimeout(() => {
                // Generate and randomize values slightly
                randomizeMenus();
                btnGen.disabled = false;
                btnGen.innerHTML = `<i data-lucide="sparkles"></i> Tạo thực đơn mới`;
                alert("Đã tạo thành công thực đơn AI 3 ngày mới phù hợp với mục tiêu giảm cân của bạn!");
                updateUI();
            }, 1800);
        }
    });
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

    btn.addEventListener('click', () => {
        btn.disabled = true;
        const icon = btn.querySelector('i');
        icon.style.animation = 'rotate 1s infinite linear';
        btn.querySelector('span').innerText = 'Đang đồng bộ...';

        setTimeout(() => {
            icon.style.animation = '';
            btn.disabled = false;
            btn.querySelector('span').innerText = 'Đồng bộ dữ liệu';
            alert("Đã đồng bộ dữ liệu calo, nước uống và cân nặng lên đám mây AI thành công!");
        }, 1200);
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

    // 2. Initialize modules
    initNavigation();
    initMenuTabs();
    initNotificationDialog();
    initWeightModal();
    initWaterTracker();
    initManualFoodForm();
    initFoodScanner();
    initMenuGenerator();
    initDisciplineSimulator();
    initSyncButton();
    initRecalculateTrigger();
    initCheckInTriggers();
    initLibrary();

    // 3. Render Views
    randomizeMenus();
    updateUI();
    renderWeightChart();

    // Attach listener to chart range switcher
    const chartRange = document.getElementById('chart-range-select');
    if (chartRange) {
        chartRange.addEventListener('change', renderWeightChart);
    }
});

// --- MEAL LIBRARY FUNCTIONS ---
function initLibrary() {
    if (!state.library) state.library = [];
    const uploadInput = document.getElementById('library-upload-input');
    if (uploadInput) {
        uploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const newItem = {
                            id: Date.now().toString(),
                            img: event.target.result,
                            analyzed: false,
                            name: "",
                            weight: "",
                            kcal: 0
                        };
                        state.library.push(newItem);
                        saveState();
                        renderLibraryGrid();
                        // Reset input so the same file can be uploaded again
                        uploadInput.value = '';
                    } catch (err) {
                        console.error(err);
                        if (err.name === 'QuotaExceededError') {
                            showNotification("Lỗi dung lượng", "Ảnh quá lớn, không thể lưu vào bộ nhớ cục bộ.", "error");
                        } else {
                            showNotification("Lỗi", "Đã có lỗi xảy ra khi xử lý ảnh.", "error");
                        }
                    }
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
        if (item.analyzed) {
            html += `
            <div class="library-card">
                <img src="${item.img}" alt="${item.name}">
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
                <img src="${item.img}" alt="Chưa phân tích">
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
        showNotification("Lỗi AI", "Không thể phân tích hình ảnh lúc này. Vui lòng thử lại sau.", "error");
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
if (!GEMINI_API_KEY || GEMINI_API_KEY === "null") {
    GEMINI_API_KEY = prompt("Vui lòng nhập Google Gemini API Key của bạn để sử dụng tính năng phân tích AI:");
    if (GEMINI_API_KEY) {
        localStorage.setItem('gemini_api_key', GEMINI_API_KEY);
    }
}

async function analyzeImageWithGemini(base64Image) {
    if (!GEMINI_API_KEY) {
        throw new Error("Missing Gemini API Key");
    }
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

    let mimeType = "image/jpeg";
    let data = base64Image;

    if (base64Image.includes(',')) {
        const parts = base64Image.split(',');
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

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Lỗi HTTP: ${response.status}`);
        }

        const result = await response.json();
        if (!result.candidates || result.candidates.length === 0) {
            throw new Error("Gemini không trả về kết quả");
        }
        
        let textResult = result.candidates[0].content.parts[0].text;
        textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();

        const parsedData = JSON.parse(textResult);
        return {
            name: parsedData.name || "Món ăn chưa xác định",
            weight: parsedData.weight || 200,
            kcal: parsedData.kcal || 300,
            macros: parsedData.macros || {p: 0, c: 0, f: 0},
            items: parsedData.items || []
        };
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
}
