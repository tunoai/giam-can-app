// ==========================================================================
// FITLIFE v2 - app giảm cân: AI gợi ý món, chạy 5K, gym, cân nặng
// ==========================================================================

// ---------- Tiện ích ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const num = (v, d = 0) => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? d : n; };
const round1 = (n) => Math.round(n * 10) / 10;
const toArr = (v) => Array.isArray(v) ? v.filter(Boolean) : (v && typeof v === 'object' ? Object.values(v).filter(Boolean) : []);

function isoOf(date) {
    const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, '0'), d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
const todayKey = () => isoOf(new Date());
const parseIso = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (iso, n) => { const d = parseIso(iso); d.setDate(d.getDate() + n); return isoOf(d); };
const ddmm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const fmtDay = (iso) => { const d = parseIso(iso); return `${WEEKDAYS[d.getDay()]}, ${ddmm(iso)}`; };
const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.max(0, sec) % 60).padStart(2, '0')}`;

const MEALS = { b: 'Bữa sáng', l: 'Bữa trưa', s: 'Bữa phụ', d: 'Bữa tối' };
const MEAL_ORDER = ['b', 'l', 's', 'd'];
const MEAL_WEIGHT = { b: 0.25, l: 0.35, s: 0.1, d: 0.3 };
const OLD_MEAL_MAP = { breakfast: 'b', lunch: 'l', snack: 's', dinner: 'd' };

function currentMeal() {
    const h = new Date().getHours();
    if (h < 10) return 'b';
    if (h < 14) return 'l';
    if (h < 17) return 's';
    return 'd';
}

// ---------- Trạng thái ----------
const DEFAULT_STATE = {
    user: { name: 'Tùng Chu', avatar: 'tung_chu_avatar.png' },
    profile: { sex: 'male', age: 30, height: 170, activity: 1.375, dislikes: '', notes: '' },
    weight: { current: 82.3, target: 75, start: 85, history: [] },
    nutrition: { kcalTarget: 1800, proteinTarget: 140, carbTarget: 180, fatTarget: 60, auto: false },
    food: { log: {}, favorites: [] },
    checkins: {},
    run: { startDate: null, days: [1, 3, 5], log: {}, extra: [] },
    gym: { log: {} },
    goal: { photos: [], note: '' },
    library: [],
    _meta: null
};

let state = JSON.parse(JSON.stringify(DEFAULT_STATE));

function normalize(raw) {
    const s = Object.assign(JSON.parse(JSON.stringify(DEFAULT_STATE)), raw || {});
    for (const key of ['user', 'profile', 'weight', 'nutrition', 'food', 'run', 'gym', 'goal']) {
        s[key] = Object.assign(JSON.parse(JSON.stringify(DEFAULT_STATE[key])), s[key] || {});
    }
    s.checkins = s.checkins || {};
    // Ảnh mục tiêu: bản cũ chỉ có 1 ảnh (goal.photo) → chuyển sang danh sách
    s.goal.photos = toArr(s.goal.photos).filter(Boolean);
    if (s.goal.photo) { if (!s.goal.photos.includes(s.goal.photo)) s.goal.photos.unshift(s.goal.photo); }
    delete s.goal.photo;
    const libRaw = s.library;
    s.library = Array.isArray(libRaw)
        ? libRaw.map((x, i) => (x ? { ...x, _k: String(i) } : null)).filter(Boolean)
        : (libRaw && typeof libRaw === 'object' ? Object.entries(libRaw).filter(([, x]) => x).map(([k, x]) => ({ ...x, _k: k })) : []);
    s.food.log = s.food.log || {};
    for (const k of Object.keys(s.food.log)) s.food.log[k] = toArr(s.food.log[k]);
    s.food.favorites = toArr(s.food.favorites);
    s.run.log = s.run.log || {};
    s.run.extra = toArr(s.run.extra);
    s.run.days = toArr(s.run.days).map(Number);
    s.gym.log = s.gym.log || {};
    for (const k of Object.keys(s.gym.log)) {
        s.gym.log[k] = toArr(s.gym.log[k]).map((e) => ({ ...e, sets: toArr(e.sets) }));
    }

    // Lịch sử cân nặng: bản cũ chỉ có "DD/MM" → suy ra năm
    const now = new Date();
    s.weight.history = toArr(s.weight.history).map((h) => {
        if (h.iso) return h;
        const [d, m] = String(h.date || '').split('/').map(Number);
        if (!d || !m) return null;
        let y = now.getFullYear();
        if (m > now.getMonth() + 1) y -= 1;
        const iso = isoOf(new Date(y, m - 1, d));
        return { date: ddmm(iso), iso, val: num(h.val) };
    }).filter(Boolean).sort((a, b) => a.iso.localeCompare(b.iso));

    delete s.nutrition.diary; // nhật ký bản cũ không có ngày, không dùng nữa
    return s;
}

// ---------- Lưu trữ: localStorage + Firebase ----------
const firebaseConfig = {
    apiKey: 'AIzaSyDPrHvRL3MqqLmuPol_ZgTtizlFQZuf4-s',
    authDomain: 'giam-can-app.firebaseapp.com',
    databaseURL: 'https://giam-can-app-default-rtdb.asia-southeast1.firebasedatabase.app/',
    projectId: 'giam-can-app',
    storageBucket: 'giam-can-app.firebasestorage.app',
    messagingSenderId: '660720606826',
    appId: '1:660720606826:web:15e66d0da97987d0c87413'
};

let db = null, storage = null;
try {
    // Chạy thử trên máy (localhost) thì không đụng vào dữ liệu thật, trừ khi thêm ?cloud=1
    var localTest = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !/cloud=1/.test(location.search);
    if (typeof firebase !== 'undefined' && !localTest) {
        firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        try { storage = firebase.storage(); } catch (e) { /* không có Storage vẫn chạy */ }
    }
} catch (e) { console.warn('Firebase init lỗi', e); }

const CLIENT_ID = uid();
const SYNC_KEYS = ['user', 'profile', 'weight', 'nutrition', 'food', 'checkins', 'run', 'gym', 'goal'];
let remoteReady = false;
let saveTimer = null;
let dirtyKeys = new Set();

function saveLocal() {
    try {
        const light = {};
        for (const k of SYNC_KEYS) light[k] = state[k];
        localStorage.setItem('fitlife_v2', JSON.stringify(light));
    } catch (e) { console.warn('localStorage đầy', e); }
}

// Chỉ ghi các nhánh đã đổi (update) để không bao giờ ghi đè thư viện ảnh cũ trên Cloud
function save(...keys) {
    (keys.length ? keys : SYNC_KEYS).forEach((k) => dirtyKeys.add(k));
    saveLocal();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushRemote, 600);
}

function flushRemote() {
    if (!db || !remoteReady || !dirtyKeys.size) return;
    const patch = {};
    for (const k of dirtyKeys) patch[k] = JSON.parse(JSON.stringify(state[k] ?? null));
    state._meta = { by: CLIENT_ID, at: Date.now() };
    patch._meta = state._meta;
    dirtyKeys.clear();
    db.ref('shared_state').update(patch).then(() => setSync('on')).catch((err) => {
        console.error('Lỗi lưu Firebase', err);
        setSync('err');
    });
}

function setSync(stt) {
    const dot = $('#sync-dot');
    if (dot) dot.className = 'sync-dot ' + (stt || '');
}

function loadState() {
    try {
        const saved = localStorage.getItem('fitlife_v2') || localStorage.getItem('fitlife_state');
        if (saved) state = normalize(JSON.parse(saved));
    } catch (e) { state = normalize(null); }

    if (!db) {
        // Chạy thử trên máy: chỉ ĐỌC thư viện ảnh thật để xem, không ghi gì lên Cloud
        if (localTest) fetch(firebaseConfig.databaseURL + 'shared_state/library.json').then((r) => r.json())
            .then((lib) => { if (lib) { state.library = normalize({ library: lib }).library; requestRender(); } }).catch(() => {});
        return;
    }
    db.ref('shared_state').on('value', (snap) => {
        const data = snap.val();
        const first = !remoteReady;
        remoteReady = true;
        setSync('on');
        if (!data) { save(); return; }
        if (data._meta && data._meta.by === CLIENT_ID) return; // tiếng vọng từ chính máy này
        const local = state;
        state = normalize(data);
        // Nếu vừa sửa trên máy này lúc chưa kết nối, giữ phần đã sửa
        if (first && dirtyKeys.size) for (const k of dirtyKeys) state[k] = local[k];
        saveLocal();
        if (first && dirtyKeys.size) flushRemote();
        requestRender();
    }, (err) => { console.warn(err); setSync('err'); });
}

// ---------- Chỉ tiêu dinh dưỡng ----------
function autoTargets() {
    const p = state.profile, w = state.weight.current || 75;
    const bmr = 10 * w + 6.25 * num(p.height, 170) - 5 * num(p.age, 30) + (p.sex === 'female' ? -161 : 5);
    const tdee = bmr * num(p.activity, 1.375);
    const floor = p.sex === 'female' ? 1200 : 1500;
    const kcal = Math.max(floor, Math.round((tdee - 500) / 10) * 10);
    const protein = Math.round(Math.min(2, 1.8) * (state.weight.target || w));
    const fat = Math.round(kcal * 0.25 / 9);
    const carb = Math.max(80, Math.round((kcal - protein * 4 - fat * 9) / 4));
    return { kcal, protein, carb, fat, tdee: Math.round(tdee) };
}

function applyAutoTargets() {
    if (!state.nutrition.auto) return;
    const t = autoTargets();
    Object.assign(state.nutrition, { kcalTarget: t.kcal, proteinTarget: t.protein, carbTarget: t.carb, fatTarget: t.fat });
}

const T = () => ({ kcal: state.nutrition.kcalTarget, p: state.nutrition.proteinTarget, c: state.nutrition.carbTarget, f: state.nutrition.fatTarget });

// ---------- Nhật ký ăn ----------
function dayLog(iso = todayKey()) {
    if (!state.food.log[iso]) state.food.log[iso] = [];
    return state.food.log[iso];
}
function totals(iso = todayKey(), withPlan = false) {
    const t = { kcal: 0, p: 0, c: 0, f: 0 };
    for (const it of state.food.log[iso] || []) {
        if (it.status !== 'eaten' && !withPlan) continue;
        t.kcal += num(it.kcal); t.p += num(it.p); t.c += num(it.c); t.f += num(it.f);
    }
    return t;
}
function addFood(item, iso = todayKey()) {
    dayLog(iso).push({ id: uid(), status: 'eaten', p: 0, c: 0, f: 0, ...item, kcal: Math.round(num(item.kcal)) });
    save('food');
}

function mealBudget(meal) {
    const iso = todayKey();
    const log = state.food.log[iso] || [];
    const eaten = totals(iso).kcal;
    // bữa đã có món "đã ăn" thì coi như xong; kế hoạch của các bữa khác được giữ chỗ
    const reservedOther = log.filter((i) => i.status === 'plan' && i.meal !== meal).reduce((a, i) => a + num(i.kcal), 0);
    const remaining = Math.max(0, T().kcal - eaten - reservedOther);
    const openMeals = MEAL_ORDER.filter((m) => m === meal || (!log.some((i) => i.meal === m)));
    const wSum = openMeals.reduce((a, m) => a + MEAL_WEIGHT[m], 0) || 1;
    const kcal = Math.round(remaining * MEAL_WEIGHT[meal] / wSum / 10) * 10;
    const pLeft = Math.max(0, T().p - totals(iso).p);
    return { kcal: Math.max(kcal, remaining > 0 ? Math.min(remaining, 120) : 0), remaining, protein: Math.round(pLeft * MEAL_WEIGHT[meal] / wSum) };
}

// ---------- Check-in hằng ngày ----------
const CHECKS = [
    { id: 'food', label: 'Ăn đúng kế hoạch', icon: 'utensils' },
    { id: 'move', label: 'Chạy hoặc tập gym', icon: 'footprints' },
    { id: 'warmup', label: 'Khởi động / giãn cơ', icon: 'activity' },
    { id: 'water', label: 'Uống đủ 2 lít nước', icon: 'droplets' },
    { id: 'sleep', label: 'Ngủ trước 23h', icon: 'moon' }
];
function checkinOf(iso) {
    const c = Object.assign({}, state.checkins[iso] || {});
    if (runDoneOn(iso) || (state.gym.log[iso] || []).length) c.move = true;
    return c;
}
const checkScore = (iso) => Object.values(checkinOf(iso)).filter(Boolean).length;
function setCheck(id, val, iso = todayKey()) {
    state.checkins[iso] = Object.assign({}, state.checkins[iso] || {}, { [id]: val });
    save('checkins');
}
function streakCount() {
    let iso = todayKey(), n = 0;
    if (checkScore(iso) < 3) iso = addDays(iso, -1);
    while (checkScore(iso) >= 3) { n++; iso = addDays(iso, -1); }
    return n;
}

// ---------- Chạy 5K ----------
const runLogs = () => state.run.log || {};
const runDoneOn = (iso) => Object.values(runLogs()).some((l) => l.date === iso) || state.run.extra.some((r) => r.date === iso);
const nextSession = () => RUN_PLAN.find((s) => !runLogs()[s.id]);
const sessionMinutes = (s) => Math.round(s.phases.reduce((a, p) => a + p.sec, 0) / 60);
const isRunWeekday = (iso) => state.run.days.includes(parseIso(iso).getDay());
function isPlannedRunDay(iso) {
    if (!state.run.startDate || iso < state.run.startDate) return false;
    if (!isRunWeekday(iso)) return false;
    return Object.keys(runLogs()).length < RUN_PLAN.length || runDoneOn(iso);
}

// ---------- Gemini AI ----------
let GEMINI_KEY = localStorage.getItem('gemini_api_key') || '';
const TEXT_MODELS = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash'];
const IMAGE_MODELS = ['gemini-2.5-flash-image', 'gemini-2.5-flash-image-preview', 'gemini-2.0-flash-preview-image-generation'];

async function gemini(parts, { json = true, temperature = 0.7, models = TEXT_MODELS, image = false } = {}) {
    if (!GEMINI_KEY) throw new Error('NO_KEY');
    const body = { contents: [{ parts }], generationConfig: { temperature } };
    if (json) body.generationConfig.responseMimeType = 'application/json';
    if (image) body.generationConfig.responseModalities = ['TEXT', 'IMAGE'];
    let lastErr = null;
    for (const model of models) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(GEMINI_KEY)}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                const msg = err?.error?.message || `HTTP ${res.status}`;
                if ((res.status === 400 || res.status === 403) && /api key/i.test(msg)) throw new Error('BAD_KEY');
                lastErr = new Error(msg);
                continue;
            }
            const out = await res.json();
            const outParts = out?.candidates?.[0]?.content?.parts || [];
            if (image) {
                const img = outParts.find((p) => p.inlineData);
                if (img) return `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`;
                lastErr = new Error('AI không trả về ảnh');
                continue;
            }
            const text = outParts.map((p) => p.text || '').join('').replace(/```json|```/g, '').trim();
            return json ? JSON.parse(text) : text;
        } catch (e) {
            if (e.message === 'BAD_KEY') throw e;
            lastErr = e;
        }
    }
    throw lastErr || new Error('Không kết nối được Gemini');
}

function aiErrorText(e) {
    if (e.message === 'NO_KEY') return 'Chưa có Gemini API Key. Vào ảnh đại diện (góc trên) để nhập key.';
    if (e.message === 'BAD_KEY') return 'API Key không hợp lệ. Kiểm tra lại trong Cài đặt.';
    return 'AI đang lỗi: ' + e.message;
}

function profileContext() {
    const p = state.profile, w = state.weight;
    return `Người dùng: ${p.sex === 'female' ? 'nữ' : 'nam'}, ${p.age} tuổi, cao ${p.height}cm, nặng ${w.current}kg, mục tiêu ${w.target}kg. ` +
        `Chỉ tiêu/ngày: ${T().kcal} kcal, protein ${T().p}g. ` +
        (p.dislikes ? `Không ăn/không thích: ${p.dislikes}. ` : '') +
        (p.notes ? `Ghi chú thêm: ${p.notes}. ` : '');
}

function recentDishes(days = 3) {
    const names = [];
    for (let i = 1; i <= days; i++) for (const it of state.food.log[addDays(todayKey(), -i)] || []) names.push(it.name);
    return names.slice(0, 20);
}

// ---------- Ảnh ----------
function pickImage() {
    return new Promise((resolve) => {
        const input = $('#file-input');
        input.value = '';
        input.multiple = false;
        input.onchange = () => resolve(input.files[0] || null);
        input.click();
    });
}
function pickImages() {
    return new Promise((resolve) => {
        const input = $('#file-input');
        input.value = '';
        input.multiple = true;
        input.onchange = () => resolve([...input.files]);
        input.click();
    });
}
function compressImage(file, max = 900, quality = 0.75) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(1, max / Math.max(img.width, img.height));
                const c = document.createElement('canvas');
                c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
                c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                resolve(c.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
const splitDataUrl = (u) => ({ mimeType: u.slice(5, u.indexOf(';')), data: u.slice(u.indexOf(',') + 1) });

async function uploadToStorage(path, dataUrl) {
    if (!storage) return null;
    try {
        const ref = storage.ref(path);
        await ref.putString(dataUrl, 'data_url');
        return await ref.getDownloadURL();
    } catch (e) { console.warn('Storage lỗi', e); return null; }
}

// ---------- UI chung ----------
function icons() { if (window.lucide) window.lucide.createIcons(); }

let toastTimer = null;
function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

let sheetOnClose = null;
function openSheet(html, onClose) {
    $('#sheet-body').innerHTML = html;
    $('#sheet-body').scrollTop = 0;
    $('#sheet').classList.add('open');
    $('#sheet-backdrop').classList.add('open');
    sheetOnClose = onClose || null;
    icons();
}
function closeSheet() {
    $('#sheet').classList.remove('open');
    $('#sheet-backdrop').classList.remove('open');
    if (sheetOnClose) { const f = sheetOnClose; sheetOnClose = null; f(); }
    if (pendingRender) requestRender();
}
const sheetOpen = () => $('#sheet').classList.contains('open');
const sheetHead = (title) => `<div class="sheet-title"><h3>${title}</h3><button class="icon-btn" data-act="close-sheet"><i data-lucide="x"></i></button></div>`;

const ui = { view: 'today', foodDay: todayKey(), weightRange: 90, calOffset: 0, gymGroup: 'mine' };
const VIEW_TITLES = { today: 'Hôm nay', food: 'Ăn uống', run: 'Chạy 5K', gym: 'Tập gym', weight: 'Cân nặng' };

function switchView(v) {
    ui.view = v;
    $$('.view').forEach((el) => el.classList.toggle('active', el.id === 'view-' + v));
    $$('.tab').forEach((el) => el.classList.toggle('active', el.dataset.view === v));
    $('#topbar-title').textContent = VIEW_TITLES[v];
    $('#content').scrollTop = 0;
    render();
}

let pendingRender = false;
function requestRender() {
    // không vẽ lại khi đang gõ hoặc đang mở bảng → màn hình không bị nhảy
    const typing = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (typing || sheetOpen() || player.open) { pendingRender = true; return; }
    pendingRender = false;
    render();
}

function render() {
    pendingRender = false;
    $('#topbar-hello').textContent = `Xin chào, ${state.user.name || 'bạn'} 👋`;
    const views = { today: renderToday, food: renderFood, run: renderRun, gym: renderGym, weight: renderWeight };
    const el = $('#view-' + ui.view);
    el.innerHTML = views[ui.view]();
    icons();
    if (ui.view === 'weight') drawWeightChart();
    if (ui.view === 'today') bindGoalSlides();
}

// Lướt ngang giữa các ảnh mục tiêu, tự chuyển ảnh sau 5 giây
let goalTimer = null;
function bindGoalSlides() {
    clearInterval(goalTimer);
    const box = $('#goal-slides');
    if (!box) return;
    const n = box.children.length;
    ui.goalIdx = Math.min(ui.goalIdx || 0, n - 1);
    box.scrollLeft = ui.goalIdx * box.clientWidth;
    const dots = $$('.goal-dots i', box.parentElement);
    const sync = () => {
        ui.goalIdx = Math.round(box.scrollLeft / box.clientWidth);
        dots.forEach((d, k) => d.classList.toggle('on', k === ui.goalIdx));
    };
    box.onscroll = sync;
    if (n < 2) return;
    goalTimer = setInterval(() => {
        if (!document.body.contains(box)) return clearInterval(goalTimer);
        sync();
        const left = ((ui.goalIdx + 1) % n) * box.clientWidth;
        box.scrollTo({ left, behavior: 'smooth' });
        // vài trình duyệt không cuộn mượt được → nhảy thẳng tới ảnh kế
        setTimeout(() => { if (Math.abs(box.scrollLeft - left) > 2) box.scrollLeft = left; sync(); }, 800);
    }, 5000);
}

// ---------- Màn: Hôm nay ----------
function ringSvg(value, max, color) {
    const r = 48, c = 2 * Math.PI * r, pct = Math.min(1, max ? value / max : 0);
    return `<svg viewBox="0 0 112 112"><circle cx="56" cy="56" r="${r}" fill="none" stroke="#e3e8e6" stroke-width="10"/>
        <circle cx="56" cy="56" r="${r}" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"
        stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}"/></svg>`;
}
function macroBar(label, val, max, color) {
    return `<div class="macro"><div class="row between"><span>${label}</span><span class="muted">${Math.round(val)}/${max}g</span></div>
        <div class="progress"><i style="width:${Math.min(100, max ? val / max * 100 : 0)}%;background:${color}"></i></div></div>`;
}

function goalHero() {
    const w = state.weight, left = round1(w.current - w.target);
    const text = left > 0 ? `Còn ${left} kg nữa là chạm ${w.target} kg` : `Đã đạt mục tiêu ${w.target} kg 🎉`;
    const lost = round1(w.start - w.current);
    const photos = state.goal.photos;
    if (photos.length) {
        const idx = Math.min(ui.goalIdx || 0, photos.length - 1);
        return `<div class="goal-hero" data-act="goal">
            <div class="goal-slides" id="goal-slides">${photos.map((p) => `<img src="${esc(p)}" alt="Ảnh mục tiêu">`).join('')}</div>
            <button class="icon-btn goal-hero-edit" data-act="goal"><i data-lucide="pencil"></i></button>
            ${photos.length > 1 ? `<div class="goal-dots">${photos.map((_, i) => `<i class="${i === idx ? 'on' : ''}"></i>`).join('')}</div>` : ''}
            <div class="goal-hero-text"><h3>${text}</h3><p>${esc(state.goal.note || (lost > 0 ? `Đã giảm ${lost} kg. Tiếp tục nhé!` : 'Mỗi ngày một chút!'))}</p></div>
        </div>`;
    }
    return `<div class="goal-hero" data-act="goal"><div class="goal-hero-empty">
        <i data-lucide="image-plus"></i><b>Thêm ảnh mục tiêu</b>
        <span class="small">Ảnh dáng người bạn muốn đạt được, để mỗi lần mở app là có động lực</span>
        <span class="small" style="opacity:.85">${text}</span></div></div>`;
}

function renderToday() {
    const iso = todayKey();
    const eaten = totals(iso), planned = totals(iso, true), t = T();
    const left = t.kcal - eaten.kcal;
    const meal = currentMeal();
    const ci = checkinOf(iso);
    const next = nextSession();
    const runDay = state.run.startDate ? isPlannedRunDay(iso) : isRunWeekday(iso);
    const ranToday = runDoneOn(iso);
    const gymToday = (state.gym.log[iso] || []).length;
    const hasWeightToday = state.weight.history.some((h) => h.iso === iso);

    let train;
    if (ranToday) {
        train = `<div class="row"><span class="badge ok">✓ Đã chạy hôm nay</span><span class="muted small">Nhớ giãn cơ bắp chân nhé</span></div>
            <button class="btn ghost block" style="margin-top:12px" data-act="routine" data-id="cooldown"><i data-lucide="activity"></i>Giãn cơ sau chạy</button>`;
    } else if (runDay && next) {
        train = `<div class="row between"><div class="grow"><b>Tuần ${next.week} · Buổi ${next.day}</b><div class="muted small">${esc(next.title)} · ~${sessionMinutes(next)} phút</div></div><span class="badge run">Ngày chạy</span></div>
            <div class="grid2" style="margin-top:12px">
              <button class="btn outline" data-act="routine-start" data-id="warmup"><i data-lucide="activity"></i>Khởi động</button>
              <button class="btn run" data-act="run-start" data-id="${next.id}"><i data-lucide="play"></i>Bắt đầu</button>
            </div>`;
    } else if (gymToday) {
        train = `<div class="row"><span class="badge gym">✓ Đã tập gym</span><span class="muted small">${gymToday} bài</span></div>`;
    } else {
        train = `<div class="muted small">Hôm nay là ngày nghỉ chạy. Có thể đi gym nhẹ hoặc đi bộ 30 phút.</div>
            <div class="grid2" style="margin-top:12px">
              <button class="btn outline" data-act="tab" data-view="gym"><i data-lucide="dumbbell"></i>Tập gym</button>
              <button class="btn outline" data-act="run-free"><i data-lucide="footprints"></i>Ghi đi bộ</button>
            </div>`;
    }

    const last7 = Array.from({ length: 7 }, (_, i) => addDays(iso, i - 6));
    return `
    ${goalHero()}

    <button class="ai-cta" data-act="ai-suggest" data-meal="${meal}">
        <div class="ai-cta-icon"><i data-lucide="sparkles"></i></div>
        <div class="grow"><b>${MEALS[meal]} nên ăn gì?</b><span>AI gợi ý món vừa đủ ${Math.max(0, mealBudget(meal).kcal)} kcal để không vỡ kế hoạch</span></div>
        <i data-lucide="chevron-right"></i>
    </button>

    <div class="card">
        <div class="card-title">Năng lượng hôm nay <small>${t.kcal} kcal</small></div>
        <div class="kcal-wrap">
            <div class="ring">${ringSvg(eaten.kcal, t.kcal, left < 0 ? '#dc2626' : '#0f766e')}
                <div class="ring-center"><b>${Math.abs(left)}</b><span>${left < 0 ? 'kcal vượt' : 'kcal còn lại'}</span></div></div>
            <div class="grow">
                ${macroBar('Đạm', eaten.p, t.p, '#0f766e')}
                ${macroBar('Tinh bột', eaten.c, t.c, '#f59e0b')}
                ${macroBar('Béo', eaten.f, t.f, '#ef4444')}
            </div>
        </div>
        <div class="row between" style="margin-top:10px">
            <span class="small muted">Đã ăn ${eaten.kcal} · Kế hoạch ${planned.kcal} kcal</span>
            <button class="btn sm ghost" data-act="tab" data-view="food">Nhật ký <i data-lucide="chevron-right"></i></button>
        </div>
        ${left < 0 ? `<button class="btn danger block" style="margin-top:10px" data-act="rescue"><i data-lucide="life-buoy"></i>Lỡ ăn quá? Nhờ AI chỉnh lại kế hoạch</button>` : ''}
    </div>

    <div class="card">
        <div class="card-title">Vận động hôm nay <small>${fmtDay(iso)}</small></div>
        ${train}
    </div>

    <div class="card">
        <div class="card-title">Check-in mỗi ngày <small>🔥 ${streakCount()} ngày liên tiếp</small></div>
        ${CHECKS.map((c) => `<button class="check-item ${ci[c.id] ? 'done' : ''}" data-act="check" data-id="${c.id}">
            <span class="check-box">${ci[c.id] ? '<i data-lucide="check"></i>' : ''}</span>
            <span class="check-label grow">${c.label}</span><i data-lucide="${c.icon}" class="muted"></i></button>`).join('')}
        <div class="streak-days">${last7.map((d) => {
            const sc = checkScore(d), lv = sc >= 4 ? 3 : sc >= 2 ? 2 : sc >= 1 ? 1 : 0;
            return `<div class="streak-day lv${lv} ${d === iso ? 'today' : ''}"><i>${sc || ''}</i>${WEEKDAYS[parseIso(d).getDay()]}</div>`;
        }).join('')}</div>
    </div>

    ${hasWeightToday ? '' : `<div class="card"><div class="card-title">Cân sáng nay <small>Hiện tại ${state.weight.current} kg</small></div>
        <div class="row"><input class="input grow" id="quick-weight" type="number" inputmode="decimal" step="0.1" placeholder="VD: ${state.weight.current}">
        <button class="btn" data-act="quick-weight">Lưu</button></div></div>`}
    `;
}

// ---------- Màn: Ăn uống ----------
function foodItemRow(it) {
    const macros = [it.p ? `Đạm ${Math.round(it.p)}g` : '', it.c ? `Bột ${Math.round(it.c)}g` : '', it.f ? `Béo ${Math.round(it.f)}g` : ''].filter(Boolean).join(' · ');
    return `<div class="food-item ${it.status}">
        <button class="food-toggle" data-act="food-toggle" data-id="${it.id}" aria-label="Đánh dấu đã ăn">${it.status === 'eaten' ? '<i data-lucide="check"></i>' : ''}</button>
        ${it.lib && libByKey(it.lib) ? `<img class="food-thumb" src="${esc(libByKey(it.lib).img)}" alt="" loading="lazy">` : ''}
        <div class="grow"><b>${esc(it.name)}</b><span>${it.status === 'plan' ? 'Kế hoạch · ' : ''}${macros || '&nbsp;'}</span></div>
        <span class="food-kcal">${num(it.kcal) ? Math.round(it.kcal) : '—'}</span>
        <button class="icon-btn" data-act="food-del" data-id="${it.id}" aria-label="Xoá"><i data-lucide="trash-2"></i></button>
    </div>`;
}

function renderFood() {
    const iso = ui.foodDay, isToday = iso === todayKey();
    const log = state.food.log[iso] || [];
    const eaten = totals(iso), t = T();
    const days = Array.from({ length: 7 }, (_, i) => addDays(todayKey(), i - 6));
    return `
    <div class="chip-row" style="margin-bottom:12px">${days.map((d) => `<button class="chip ${d === iso ? 'on' : ''}" data-act="food-day" data-day="${d}">${d === todayKey() ? 'Hôm nay' : fmtDay(d)}</button>`).join('')}</div>

    <div class="card">
        <div class="row between"><div><div class="muted small">Đã ăn</div><b style="font-size:24px">${eaten.kcal}</b> <span class="muted">/ ${t.kcal} kcal</span></div>
        <span class="badge ${eaten.kcal > t.kcal ? 'accent' : 'ok'}">${eaten.kcal > t.kcal ? `Vượt ${eaten.kcal - t.kcal}` : `Còn ${t.kcal - eaten.kcal}`}</span></div>
        <div class="progress" style="margin-top:10px"><i style="width:${Math.min(100, eaten.kcal / t.kcal * 100)}%;${eaten.kcal > t.kcal ? 'background:#dc2626' : ''}"></i></div>
    </div>

    ${isToday ? `
    <div class="grid2" style="margin-bottom:12px">
        <button class="btn accent" data-act="ai-suggest" data-meal="${currentMeal()}"><i data-lucide="sparkles"></i>Gợi ý món</button>
        <button class="btn ghost" data-act="ai-dayplan"><i data-lucide="list-checks"></i>Thực đơn cả ngày</button>
        <button class="btn outline" data-act="scan"><i data-lucide="camera"></i>Chụp món ăn</button>
        <button class="btn outline" data-act="rescue"><i data-lucide="life-buoy"></i>Lỡ ăn quá</button>
    </div>` : ''}

    <div class="card">
        ${MEAL_ORDER.map((m) => {
            const items = log.filter((i) => i.meal === m);
            const sum = items.filter((i) => i.status === 'eaten').reduce((a, i) => a + num(i.kcal), 0);
            return `<div class="meal-block">
                <div class="meal-head"><span>${MEALS[m]} <span class="muted small">${sum ? sum + ' kcal' : ''}</span></span>
                <span class="row" style="gap:6px">
                    ${isToday ? `<button class="icon-btn" data-act="ai-suggest" data-meal="${m}" aria-label="AI gợi ý"><i data-lucide="sparkles"></i></button>` : ''}
                    <button class="icon-btn" data-act="food-add" data-meal="${m}" aria-label="Thêm món"><i data-lucide="plus"></i></button></span></div>
                ${items.map(foodItemRow).join('') || '<div class="muted small" style="padding:4px 0 8px">Chưa có món</div>'}
            </div>`;
        }).join('')}
    </div>
    ${isToday ? libCard() : ''}
    <p class="muted small" style="text-align:center">Chạm vòng tròn để đánh dấu món kế hoạch là đã ăn.</p>`;
}


// ---------- Thư viện ảnh món ("gọi món từ ảnh") ----------
const libReady = (it) => it.analyzed && num(it.kcal) > 0;
// Ảnh nguyên liệu lẻ (1 quả trứng, gạo sống…) không tính là một bữa
const isMealSize = (it) => num(it.kcal) >= 150 && num(it.kcal) <= 1000;
const libByKey = (k) => state.library.find((x) => x._k === String(k));

function libThumb(it) {
    return `<button class="lib-thumb" data-act="lib-open" data-k="${esc(it._k)}">
        <img src="${esc(it.img)}" alt="" loading="lazy">
        ${libReady(it) ? `<span class="lib-kcal">${Math.round(num(it.kcal))} kcal</span>` : ''}</button>`;
}
function libCard() {
    const lib = state.library;
    if (!lib.length) return `<div class="card"><div class="card-title">📸 Gọi món từ ảnh</div>
        <p class="small muted" style="margin-top:0">Lưu ảnh những đĩa ăn bạn thích, lần sau chỉ cần chạm ảnh là thêm vào bữa ăn.</p>
        <button class="btn ghost block" data-act="lib-add"><i data-lucide="image-plus"></i>Thêm ảnh món</button></div>`;
    const show = mealPhotos().slice(0, 6);
    return `<div class="card"><div class="card-title">📸 Gọi món từ ảnh <small>${mealPhotos().length} món</small></div>
        <div class="lib-grid">${show.map(libThumb).join('')}</div>
        <div class="grid2" style="margin-top:10px"><button class="btn ghost" data-act="lib-all"><i data-lucide="images"></i>Xem tất cả</button>
        <button class="btn outline" data-act="lib-add"><i data-lucide="image-plus"></i>Thêm ảnh</button></div></div>`;
}
// Ảnh dùng để gọi món: bỏ ảnh nguyên liệu lẻ (trứng, gạo sống…) và ảnh trùng tên
function mealPhotos() {
    const seen = new Set();
    return state.library.filter((it) => {
        if (libReady(it) && !isMealSize(it)) return false;
        const key = it.name ? it.name + '|' + it.kcal : it._k;
        if (seen.has(key)) return false;
        seen.add(key); return true;
    });
}
function openLibrary() {
    const list = mealPhotos();
    const keep = sheetOpen() ? $('#sheet-body').scrollTop : 0;
    openSheet(`${sheetHead('Gọi món từ ảnh')}
        <p class="small muted" style="margin-top:0">Chạm ảnh món bạn muốn ăn.</p>
        <div class="lib-grid">${list.map(libThumb).join('') || '<div class="empty">Chưa có ảnh</div>'}</div>
        <button class="btn outline block" style="margin-top:12px" data-act="lib-add"><i data-lucide="image-plus"></i>Thêm ảnh món</button>`);
    if (keep) $('#sheet-body').scrollTop = keep;
}
function openLibItem(k, meal) {
    const it = libByKey(k); if (!it) return;
    const hasCal = libReady(it);
    const draw = (meal) => {
        openSheet(`${sheetHead('Gọi món này')}
            <img class="lib-big" src="${esc(it.img)}" alt="">
            <div class="row between" style="margin-top:12px;align-items:flex-start">
                <h3 class="grow" style="margin:0;font-size:18px">${esc(it.name || 'Món theo ảnh')}</h3>
                ${hasCal ? `<span class="dish-kcal">${Math.round(num(it.kcal))}<small>kcal</small></span>` : ''}</div>
            <div class="section-label">Ăn vào bữa nào?</div>
            <div class="chip-row">${MEAL_ORDER.map((x) => `<button class="chip ${x === meal ? 'on' : ''}" data-lm="${x}">${MEALS[x]}</button>`).join('')}</div>
            <div class="grid2" style="margin-top:16px"><button class="btn ghost" id="li-plan">Lên kế hoạch</button><button class="btn" id="li-eat">Ăn món này</button></div>
            <button class="btn danger block" style="margin-top:24px" id="li-del">Xoá ảnh khỏi thư viện</button>`);
        $$('[data-lm]').forEach((c) => c.onclick = () => draw(c.dataset.lm));
        const order = (status) => {
            addFood({ meal, name: it.name || 'Món theo ảnh', kcal: hasCal ? num(it.kcal) : 0, p: num(it.macros?.p), c: num(it.macros?.c), f: num(it.macros?.f), status, src: 'library', lib: it._k });
            closeSheet(); toast(status === 'plan' ? `Đã thêm vào ${MEALS[meal].toLowerCase()}` : 'Đã ghi là đã ăn'); render();
        };
        $('#li-plan').onclick = () => order('plan');
        $('#li-eat').onclick = () => order('eaten');
        $('#li-del').onclick = () => {
            if (!confirm('Xoá ảnh này khỏi thư viện? Không khôi phục được.')) return;
            state.library = state.library.filter((x) => x !== it);
            if (db && remoteReady) db.ref(`shared_state/library/${it._k}`).remove();
            closeSheet(); toast('Đã xoá ảnh'); render();
        };
    };
    draw(meal || currentMeal());
}
async function addLibPhotos() {
    const file = await pickImage(); if (!file) return;
    const dataUrl = await compressImage(file, 800, 0.72);
    const id = uid();
    const keys = state.library.map((x) => parseInt(x._k, 10)).filter((n) => !isNaN(n));
    const k = String(keys.length ? Math.max(...keys) + 1 : 0);
    toast('Đang lưu ảnh…');
    const url = await uploadToStorage(`library/${id}.jpg`, dataUrl);
    const item = { id, img: url || dataUrl, analyzed: false, name: '', weight: 0, kcal: 0, _k: k };
    state.library.push(item);
    if (db && remoteReady) { const { _k, ...data } = item; db.ref(`shared_state/library/${k}`).set(data); }
    render();
    openLibItem(k);
}

// AI gợi ý món cho một bữa (ưu tiên số 1)
const suggestUI = { meal: 'l', where: 'home', style: 'any', craving: '', loading: false, result: null, error: '', shown: [] };
const WHERE = { home: 'Nấu ở nhà', out: 'Ăn ngoài quán', office: 'Cơm văn phòng', party: 'Tiệc / nhậu' };
const STYLES = {
    mine: { label: '📸 Ảnh của tôi', ai: '' },
    any: { label: '🎲 Gì cũng được', ai: 'đa dạng, mỗi lựa chọn một kiểu khác nhau (món nước, món khô/cơm, món lạ miệng)' },
    viet: { label: '🇻🇳 Món Việt', ai: 'món Việt đặc sắc các vùng miền (Bắc, Trung, Nam), không chỉ phở và cơm gà' },
    new: { label: '🌏 Đổi gió', ai: 'món châu Á/Âu dễ tìm ở Việt Nam: Hàn, Nhật, Thái, Địa Trung Hải, Mexico' },
    quick: { label: '⚡ Nhanh 15 phút', ai: 'làm hoặc mua trong 15 phút, ít bước' },
    treat: { label: '😋 Thèm đồ ngon', ai: 'phiên bản nhẹ calo của món "tội lỗi" (burger, gà rán, pizza, lẩu, bún bò, trà sữa…), vẫn đã thèm' }
};
const CARD_TONES = ['#fff1e6', '#e8f5ef', '#eef2ff', '#fff7d6', '#fde8ef'];

// --- Ảnh món ăn: fal.ai (ưu tiên) hoặc Gemini; lưu bộ nhớ đệm theo tên món ---
let FAL_KEY = localStorage.getItem('fal_api_key') || '';
const foodImgCache = (() => { try { return JSON.parse(localStorage.getItem('fitlife_food_imgs') || '{}'); } catch (e) { return {}; } })();
const foodImgPending = {};
function cacheFoodImg(name, url) {
    foodImgCache[name] = url;
    const keys = Object.keys(foodImgCache);
    if (keys.length > 120) delete foodImgCache[keys[0]];
    try { localStorage.setItem('fitlife_food_imgs', JSON.stringify(foodImgCache)); } catch (e) { /* đầy bộ nhớ thì thôi */ }
}
async function makeFoodImage(name, desc) {
    const prompt = `Appetizing professional food photography of a Vietnamese-style healthy meal: "${name}". ${desc || ''} ` +
        'Served on a ceramic plate on a rustic wooden table, natural window light, shallow depth of field, vibrant fresh colors, overhead 45 degree angle, realistic, no text.';
    if (FAL_KEY) {
        const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
            method: 'POST',
            headers: { 'Authorization': `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, image_size: 'landscape_4_3', num_images: 1, num_inference_steps: 4, enable_safety_checker: true })
        });
        if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? 'fal.ai key không hợp lệ' : `fal.ai lỗi ${res.status}`);
        const out = await res.json();
        const url = out?.images?.[0]?.url;
        if (!url) throw new Error('fal.ai không trả về ảnh');
        return url;
    }
    if (GEMINI_KEY) {
        const dataUrl = await gemini([{ text: prompt }], { json: false, image: true, models: IMAGE_MODELS, temperature: 0.8 });
        return await new Promise((resolve) => { // thu nhỏ để lưu được nhiều ảnh
            const img = new Image();
            img.onload = () => {
                const c = document.createElement('canvas'), sc = Math.min(1, 480 / img.width);
                c.width = img.width * sc; c.height = img.height * sc;
                c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                resolve(c.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = () => resolve(dataUrl);
            img.src = dataUrl;
        });
    }
    return null;
}
function loadFoodImage(name, desc) {
    if (foodImgCache[name]) return Promise.resolve(foodImgCache[name]);
    if (!foodImgPending[name]) {
        foodImgPending[name] = makeFoodImage(name, desc)
            .then((url) => { if (url) cacheFoodImg(name, url); return url; })
            .catch((e) => { console.warn('Ảnh món lỗi', e); return null; })
            .finally(() => { delete foodImgPending[name]; });
    }
    return foodImgPending[name];
}
function fillFoodImages(root) {
    $$('[data-food-img]', root).forEach((box) => {
        const name = box.dataset.foodImg;
        if (foodImgCache[name]) { box.innerHTML = `<img src="${esc(foodImgCache[name])}" alt="">`; return; }
        if (!FAL_KEY && !GEMINI_KEY) return;
        box.classList.add('loading');
        loadFoodImage(name, box.dataset.desc).then((url) => {
            box.classList.remove('loading');
            const live = $$('[data-food-img]').find((b) => b.dataset.foodImg === name);
            if (url && live) live.innerHTML = `<img src="${esc(url)}" alt="">`;
        });
    });
}

function openSuggest(meal) {
    Object.assign(suggestUI, { meal: meal || currentMeal(), loading: false, result: null, error: '', shown: [] });
    drawSuggest();
}
function drawSuggest() {
    const b = mealBudget(suggestUI.meal);
    const r = suggestUI.result;
    const keepScroll = r ? $('#sheet-body').scrollTop : 0;
    openSheet(`${sheetHead('Hôm nay ăn gì ngon?')}
        ${suggestUI.style === 'mine' ? '' : `<div class="budget-pill"><span>${MEALS[suggestUI.meal]}</span><b>≈ ${b.kcal} kcal</b><span>· ${b.protein}g đạm</span></div>`}
        <div class="chip-row" style="margin-top:12px">${MEAL_ORDER.map((m) => `<button class="chip ${m === suggestUI.meal ? 'on' : ''}" data-act="sg-meal" data-meal="${m}">${MEALS[m]}</button>`).join('')}</div>
        <div class="section-label">Ăn ở đâu?</div>
        <div class="chip-row">${Object.entries(WHERE).map(([k, v]) => `<button class="chip ${k === suggestUI.where ? 'on' : ''}" data-act="sg-where" data-where="${k}">${v}</button>`).join('')}</div>
        <div class="section-label">Muốn ăn kiểu gì?</div>
        <div class="chip-row">${Object.entries(STYLES).map(([k, v]) => `<button class="chip ${k === suggestUI.style ? 'on' : ''}" data-act="sg-style" data-style="${k}">${v.label}</button>`).join('')}</div>
        <input class="input" style="margin-top:12px" id="sg-craving" placeholder="Đang thèm gì / nhà có gì? VD: thèm cay, nhà có tôm…" value="${esc(suggestUI.craving)}">
        <button class="btn accent block" style="margin-top:12px" data-act="sg-go" ${suggestUI.loading ? 'disabled' : ''}>
            ${suggestUI.loading ? '<span class="spinner"></span> Đang nghĩ món ngon…' : r ? '<i data-lucide="refresh-cw"></i> Đổi món khác' : '<i data-lucide="sparkles"></i> Gợi ý cho tôi'}</button>
        ${suggestUI.error ? `<p class="small" style="color:var(--danger)">${esc(suggestUI.error)}</p>` : ''}
        <div id="sg-result" style="margin-top:14px">${r ? suggestResultHtml(r) : ''}</div>`);
    if (keepScroll) $('#sheet-body').scrollTop = keepScroll;
    fillFoodImages($('#sheet-body'));
}
function suggestResultHtml(r) {
    return (r.options || []).map((o, i) => {
        const items = toArr(o.items);
        const meta = [o.time ? `⏱ ${esc(o.time)}` : '', o.price ? `💰 ${esc(o.price)}` : '', o.where ? `📍 ${esc(o.where)}` : ''].filter(Boolean).join(' · ');
        return `<div class="dish-card">
        ${o.img ? `<div class="dish-photo"><img src="${esc(o.img)}" alt=""></div>` : `<div class="dish-photo" style="background:${CARD_TONES[i % CARD_TONES.length]}" data-food-img="${esc(o.name)}" data-desc="${esc(o.desc || '')}">
            <span class="dish-emoji">${esc(o.emoji || '🍽️')}</span></div>`}
        <div class="dish-body">
            <div class="row between" style="align-items:flex-start"><h4 class="grow">${esc(o.name)}</h4>${num(o.kcal) ? `<span class="dish-kcal">${Math.round(num(o.kcal))}<small>kcal</small></span>` : ''}</div>
            ${o.desc ? `<p class="dish-desc">${esc(o.desc)}</p>` : ''}
            ${meta ? `<div class="small muted">${meta}</div>` : ''}
            ${num(o.kcal) ? `<div class="macro-pills" style="margin-top:8px"><span class="badge ok">Đạm ${Math.round(num(o.protein))}g</span><span class="badge">Bột ${Math.round(num(o.carb))}g</span><span class="badge">Béo ${Math.round(num(o.fat))}g</span></div>` : ''}
            ${items.length ? `<details class="dish-more"><summary>Khẩu phần & mẹo</summary><ul>${items.map((it) => `<li>${esc(it.name)}${it.amount ? ` – ${esc(it.amount)}` : ''}${it.kcal ? ` <span class="muted">(${Math.round(num(it.kcal))} kcal)</span>` : ''}</li>`).join('')}</ul>
                ${o.tip ? `<div class="why">👉 ${esc(o.tip)}</div>` : ''}</details>` : (o.tip ? `<div class="why">👉 ${esc(o.tip)}</div>` : '')}
            <div class="grid2" style="margin-top:10px"><button class="btn sm ghost" data-act="sg-pick" data-i="${i}" data-status="plan">Lên kế hoạch</button>
            <button class="btn sm" data-act="sg-pick" data-i="${i}" data-status="eaten">Ăn món này</button></div>
        </div></div>`;
    }).join('') + (r.note ? `<p class="small muted" style="text-align:center">${esc(r.note)}</p>` : '') +
        (r.mine ? '' : '') + (r.offline ? `<p class="small muted" style="text-align:center">Gợi ý từ danh sách món có sẵn. Nhập Gemini API Key để AI gợi ý theo đúng khẩu vị bạn.</p>` : '') +
        (!r.mine && !FAL_KEY && !GEMINI_KEY ? `<p class="small muted" style="text-align:center">Nhập fal.ai hoặc Gemini API Key trong Cài đặt để hiện ảnh món ăn.</p>` : '');
}

function librarySuggest(budget) {
    let pool = mealPhotos().filter((it) => !suggestUI.shown.includes(it._k));
    if (pool.length < 3) { suggestUI.shown = []; pool = mealPhotos(); }
    pool = pool.slice().sort(() => Math.random() - 0.5).slice(0, 3);
    return {
        mine: true,
        options: pool.map((it) => ({
            name: it.name || 'Món theo ảnh', libK: it._k, img: it.img,
            kcal: libReady(it) ? num(it.kcal) : 0, protein: num(it.macros?.p), carb: num(it.macros?.c), fat: num(it.macros?.f)
        })),
        note: pool.length ? '' : 'Chưa có ảnh món nào. Vào "Gọi món từ ảnh" để thêm ảnh.'
    };
}

function offlineSuggest(meal, where, style, budget) {
    const exclude = new Set(suggestUI.shown);
    const byWhere = (f) => where === 'home' ? f.where === 'home' : f.where === 'out';
    let pool = FOOD_DB.filter((f) => f.meals.includes(meal) && byWhere(f));
    if (style !== 'any') { const st = pool.filter((f) => f.style === style); if (st.length >= 2) pool = st; }
    const fits = pool.filter((f) => f.kcal <= budget * 1.15 + 40);
    let list = (fits.length >= 2 ? fits : pool).filter((f) => !exclude.has(f.name));
    if (list.length < 3) { suggestUI.shown = []; list = fits.length >= 2 ? fits : pool; }
    list = list.slice().sort(() => Math.random() - 0.5);
    // ưu tiên mỗi lựa chọn một kiểu khác nhau cho đỡ chán
    const pick = [], usedStyles = new Set();
    for (const f of list) { if (pick.length < 3 && !usedStyles.has(f.style)) { pick.push(f); usedStyles.add(f.style); } }
    for (const f of list) { if (pick.length < 3 && !pick.includes(f)) pick.push(f); }
    return {
        offline: true,
        options: pick.map((f) => ({
            name: f.name, emoji: f.emoji, desc: f.desc, kcal: f.kcal, protein: f.p, carb: f.c, fat: f.f,
            time: f.time ? `${f.time} phút` : '', price: f.price, where: f.where === 'home' ? 'Nấu ở nhà' : 'Mua ngoài'
        }))
    };
}

async function runSuggest() {
    suggestUI.craving = $('#sg-craving')?.value.trim() || '';
    if (suggestUI.result) suggestUI.shown.push(...toArr(suggestUI.result.options).map((o) => o.libK || o.name));
    const b = mealBudget(suggestUI.meal);
    if (suggestUI.style === 'mine') { suggestUI.result = librarySuggest(b.kcal); drawSuggest(); $('#sheet-body').scrollTop = 0; return; }
    if (!GEMINI_KEY) { suggestUI.result = offlineSuggest(suggestUI.meal, suggestUI.where, suggestUI.style, b.kcal); drawSuggest(); $('#sheet-body').scrollTop = 0; return; }
    suggestUI.loading = true; suggestUI.error = ''; drawSuggest();
    const eatenToday = (state.food.log[todayKey()] || []).map((i) => `${MEALS[i.meal]}: ${i.name} (${i.kcal} kcal, ${i.status === 'eaten' ? 'đã ăn' : 'kế hoạch'})`);
    const runToday = isPlannedRunDay(todayKey()) && !runDoneOn(todayKey());
    const prompt = `Bạn là đầu bếp kiêm chuyên gia dinh dưỡng người Việt, giỏi biến món giảm cân thành món NGON, hấp dẫn, không nhàm chán.
${profileContext()}
Hôm nay đã ăn/lên kế hoạch: ${eatenToday.join('; ') || 'chưa ăn gì'}.
Cần gợi ý cho: ${MEALS[suggestUI.meal]}. Ngân sách khoảng ${b.kcal} kcal (tối đa ${Math.round(b.kcal * 1.1)} kcal), nên có ≥ ${b.protein}g protein.
Bối cảnh: ${WHERE[suggestUI.where]}. Phong cách: ${STYLES[suggestUI.style].ai}.
${suggestUI.craving ? `Mong muốn/nguyên liệu có sẵn: ${suggestUI.craving}.` : ''}
${runToday ? 'Hôm nay có buổi chạy bộ, nên có tinh bột dễ tiêu.' : ''}
KHÔNG gợi ý lại: ${[...recentDishes(), ...suggestUI.shown].join(', ') || 'không có'}.
Quy tắc:
- Đúng 3 lựa chọn, 3 kiểu KHÁC NHAU (khác nguyên liệu chính và cách chế biến).
- TRÁNH món ăn kiêng khô khan (ức gà luộc + cơm trắng, rau luộc suông, whey pha nước…). Dùng gia vị, nước sốt, rau thơm để món đậm đà mà vẫn ít calo.
- Món phải có thật, dễ mua/dễ nấu ở Việt Nam; khẩu phần cụ thể (gram, chén, tô, cái). Nếu ăn ngoài: nói cách gọi món cho ít calo.
- "desc" là 1 câu mô tả gợi cảm giác thèm (mùi, vị, độ giòn/mềm), tối đa 20 từ.
Trả về JSON: {"options":[{"name":"tên món ngắn gọn","emoji":"1 emoji","desc":"","time":"VD 15 phút","price":"VD 40–50k","where":"nấu ở nhà / mua ở đâu","items":[{"name":"","amount":"","kcal":0}],"kcal":0,"protein":0,"carb":0,"fat":0,"tip":"mẹo giữ kế hoạch"}],"note":"1 câu động viên vui vẻ"}`;
    try {
        suggestUI.result = await gemini([{ text: prompt }], { temperature: 1 });
    } catch (e) {
        suggestUI.error = aiErrorText(e) + ' Đang hiện gợi ý có sẵn.';
        suggestUI.result = offlineSuggest(suggestUI.meal, suggestUI.where, suggestUI.style, b.kcal);
    }
    suggestUI.loading = false;
    if (sheetOpen()) { drawSuggest(); $('#sheet-body').scrollTop = 0; }
}

// AI lên thực đơn cả ngày
async function aiDayPlan() {
    if (!GEMINI_KEY) { toast('Cần Gemini API Key để AI lên thực đơn.'); openProfile(); return; }
    openSheet(`${sheetHead('Thực đơn cả ngày')}<div class="loading-box"><span class="spinner dark"></span>AI đang lên thực đơn vừa ${T().kcal} kcal…</div>`);
    const log = dayLog();
    const eatenMeals = MEAL_ORDER.filter((m) => log.some((i) => i.meal === m && i.status === 'eaten'));
    const openMeals = MEAL_ORDER.filter((m) => !eatenMeals.includes(m));
    const eaten = totals();
    const prompt = `Bạn là chuyên gia dinh dưỡng người Việt. ${profileContext()}
Hôm nay đã ăn ${eaten.kcal} kcal, ${Math.round(eaten.p)}g protein (${log.filter((i) => i.status === 'eaten').map((i) => i.name).join(', ') || 'chưa ăn gì'}).
Hãy lên thực đơn cho các bữa còn lại: ${openMeals.map((m) => MEALS[m]).join(', ')}, sao cho TỔNG cả ngày ≈ ${T().kcal} kcal và protein ≥ ${T().p}g.
Món Việt dễ nấu/dễ mua, khẩu phần cụ thể. Tránh lặp: ${recentDishes().join(', ') || 'không có'}.
Trả về JSON: {"meals":[{"meal":"b|l|s|d","name":"tên món kèm khẩu phần","kcal":0,"p":0,"c":0,"f":0}],"note":"lời khuyên ngắn"}
Mã bữa: b=sáng, l=trưa, s=phụ, d=tối. Chỉ trả về các bữa: ${openMeals.join(',')}.`;
    try {
        const r = await gemini([{ text: prompt }], { temperature: 0.8 });
        const meals = toArr(r.meals).filter((m) => openMeals.includes(m.meal));
        const sum = meals.reduce((a, m) => a + num(m.kcal), 0);
        openSheet(`${sheetHead('Thực đơn cả ngày')}
            <div class="card">${meals.map((m) => `<div class="food-item"><div class="grow"><b>${esc(m.name)}</b><span>${MEALS[m.meal]} · Đạm ${Math.round(num(m.p))}g</span></div><span class="food-kcal">${Math.round(num(m.kcal))}</span></div>`).join('')}
            <div class="row between" style="margin-top:8px"><span class="muted">Tổng cả ngày (kể cả đã ăn)</span><b>${Math.round(sum + eaten.kcal)} kcal</b></div></div>
            ${r.note ? `<p class="small muted">💡 ${esc(r.note)}</p>` : ''}
            <button class="btn block" id="dayplan-apply"><i data-lucide="check"></i>Dùng thực đơn này</button>
            <p class="small muted">Các món "kế hoạch" cũ của những bữa này sẽ được thay thế.</p>`);
        $('#dayplan-apply').onclick = () => {
            state.food.log[todayKey()] = dayLog().filter((i) => !(i.status === 'plan' && openMeals.includes(i.meal)));
            meals.forEach((m) => dayLog().push({ id: uid(), meal: m.meal, name: m.name, kcal: Math.round(num(m.kcal)), p: num(m.p), c: num(m.c), f: num(m.f), status: 'plan', src: 'ai' }));
            save('food'); closeSheet(); toast('Đã lưu thực đơn hôm nay'); render();
        };
    } catch (e) {
        openSheet(`${sheetHead('Thực đơn cả ngày')}<p>${esc(aiErrorText(e))}</p>`);
    }
}

// Lỡ ăn quá → AI chỉnh lại kế hoạch
function openRescue() {
    openSheet(`${sheetHead('Cứu kế hoạch ăn uống')}
        <p class="muted small" style="margin-top:0">Lỡ ăn nhiều, sắp đi tiệc hay bị mời ăn? Kể cho AI, AI sẽ tính lại phần còn lại của hôm nay và ngày mai để bạn vẫn đúng hướng.</p>
        <textarea class="input" id="rescue-text" rows="3" placeholder="VD: trưa nay lỡ ăn 1 đĩa cơm tấm sườn bì chả + trà sữa; tối nay có tiệc nướng"></textarea>
        <button class="btn accent block" style="margin-top:12px" id="rescue-go"><i data-lucide="life-buoy"></i>Tính lại giúp tôi</button>
        <div id="rescue-out" style="margin-top:14px"></div>`);
    $('#rescue-go').onclick = async () => {
        const text = $('#rescue-text').value.trim();
        if (!text) return toast('Nhập chuyện đã ăn/sắp ăn trước nhé');
        const out = $('#rescue-out');
        out.innerHTML = '<div class="loading-box"><span class="spinner dark"></span>AI đang tính…</div>';
        const eaten = totals();
        const prompt = `Bạn là huấn luyện viên dinh dưỡng thân thiện, không phán xét. ${profileContext()}
Hôm nay đã ghi nhận ${eaten.kcal} kcal. Người dùng kể: "${text}".
1) Ước lượng calo của phần vừa kể (kcalEstimate) và macro.
2) Nói ngắn gọn tình hình (verdict), không làm họ thấy tội lỗi.
3) Đưa 3-5 điều chỉnh cụ thể cho phần còn lại của hôm nay và ngày mai (không nhịn ăn cực đoan, không dưới ${state.profile.sex === 'female' ? 1200 : 1500} kcal/ngày), có thể thêm đi bộ/chạy nhẹ.
4) Gợi ý món cho các bữa tiếp theo.
Trả về JSON: {"kcalEstimate":0,"p":0,"c":0,"f":0,"itemName":"tên ngắn của phần đã ăn","verdict":"","adjustments":[""],"nextMeals":[{"meal":"tên bữa","name":"món","kcal":0}],"encouragement":""}`;
        try {
            const r = await gemini([{ text: prompt }], { temperature: 0.6 });
            out.innerHTML = `<div class="card">
                <div class="row between"><b>Ước tính: ${Math.round(num(r.kcalEstimate))} kcal</b><span class="badge accent">${esc(r.itemName || '')}</span></div>
                <p>${esc(r.verdict)}</p>
                <b>Điều chỉnh:</b><ul>${toArr(r.adjustments).map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
                ${toArr(r.nextMeals).length ? `<b>Bữa tiếp theo:</b><ul>${toArr(r.nextMeals).map((m) => `<li>${esc(m.meal)}: ${esc(m.name)} <span class="muted">(${Math.round(num(m.kcal))} kcal)</span></li>`).join('')}</ul>` : ''}
                <p class="muted small">💪 ${esc(r.encouragement || '')}</p></div>
                <button class="btn block" id="rescue-add"><i data-lucide="plus"></i>Ghi ${Math.round(num(r.kcalEstimate))} kcal vào nhật ký hôm nay</button>`;
            icons();
            $('#rescue-add').onclick = () => {
                addFood({ meal: currentMeal(), name: r.itemName || text.slice(0, 60), kcal: r.kcalEstimate, p: num(r.p), c: num(r.c), f: num(r.f), src: 'rescue' });
                closeSheet(); toast('Đã ghi vào nhật ký'); render();
            };
        } catch (e) { out.innerHTML = `<p>${esc(aiErrorText(e))}</p>`; }
    };
}

// Thêm món thủ công
function openFoodAdd(meal) {
    const favs = [
        ...state.food.favorites,
        ...state.library.filter((l) => l.analyzed && l.name).map((l) => ({ name: l.name, kcal: num(l.kcal), p: num(l.macros?.p), c: num(l.macros?.c), f: num(l.macros?.f) }))
    ];
    const quick = [...favs.slice(0, 12), ...FOOD_DB.filter((f) => f.meals.includes(meal)).slice(0, 12)];
    openSheet(`${sheetHead('Thêm vào ' + MEALS[meal].toLowerCase())}
        <label class="field"><span>Tên món</span><input class="input" id="fa-name" placeholder="VD: Phở gà"></label>
        <div class="grid2">
            <label class="field"><span>Calo (kcal)</span><input class="input" id="fa-kcal" type="number" inputmode="numeric"></label>
            <label class="field"><span>Đạm (g)</span><input class="input" id="fa-p" type="number" inputmode="decimal"></label>
        </div>
        <div class="grid2">
            <button class="btn outline" id="fa-plan">Kế hoạch</button>
            <button class="btn" id="fa-save">Đã ăn</button>
        </div>
        <div class="section-label">Chọn nhanh</div>
        <div class="card" style="padding:4px 14px">${quick.map((f, i) => `<button class="food-item" style="width:100%;text-align:left" data-quick="${i}">
            <div class="grow"><b>${esc(f.name)}</b><span>Đạm ${Math.round(num(f.p))}g</span></div><span class="food-kcal">${Math.round(num(f.kcal))}</span></button>`).join('')}</div>`);
    const submit = (status) => {
        const name = $('#fa-name').value.trim(), kcal = num($('#fa-kcal').value);
        if (!name || !kcal) return toast('Nhập tên món và calo');
        const ds = $('#fa-name').dataset;
        addFood({ meal, name, kcal, p: num($('#fa-p').value), c: num(ds.c), f: num(ds.f), status, src: 'manual' }, ui.foodDay);
        closeSheet(); render();
    };
    $('#fa-save').onclick = () => submit('eaten');
    $('#fa-plan').onclick = () => submit('plan');
    $$('[data-quick]', $('#sheet-body')).forEach((btn) => btn.onclick = () => {
        const f = quick[+btn.dataset.quick];
        $('#fa-name').value = f.name; $('#fa-kcal').value = Math.round(num(f.kcal)); $('#fa-p').value = Math.round(num(f.p));
        $('#fa-name').dataset.c = f.c || 0; $('#fa-name').dataset.f = f.f || 0;
        $('#sheet-body').scrollTop = 0;
    });
}

// Chụp ảnh món ăn → AI ước tính calo
async function scanFood() {
    const file = await pickImage();
    if (!file) return;
    const dataUrl = await compressImage(file, 800, 0.7);
    openSheet(`${sheetHead('Nhận diện món ăn')}<img src="${dataUrl}" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:16px">
        <div id="scan-out"><div class="loading-box"><span class="spinner dark"></span>AI đang phân tích…</div></div>`);
    const prompt = `Bạn là chuyên gia dinh dưỡng. Nhìn ảnh bữa ăn, ước lượng: tên chung (name), tổng khối lượng gram (weight), tổng kcal, macro p/c/f (gram), và danh sách thành phần.
Trả về JSON: {"name":"","weight":0,"kcal":0,"macros":{"p":0,"c":0,"f":0},"items":[{"name":"","weight":0,"kcal":0}],"advice":"1 câu nhận xét cho người giảm cân"}`;
    try {
        const r = await gemini([{ text: prompt }, { inlineData: splitDataUrl(dataUrl) }], { temperature: 0.3 });
        const meal = currentMeal();
        $('#scan-out').innerHTML = `<div class="card" style="margin-top:12px">
            <label class="field"><span>Tên món</span><input class="input" id="sc-name" value="${esc(r.name)}"></label>
            <div class="grid2"><label class="field"><span>Calo</span><input class="input" id="sc-kcal" type="number" value="${Math.round(num(r.kcal))}"></label>
            <label class="field"><span>Đạm (g)</span><input class="input" id="sc-p" type="number" value="${Math.round(num(r.macros?.p))}"></label></div>
            <ul class="small">${toArr(r.items).map((i) => `<li>${esc(i.name)} – ${Math.round(num(i.weight))}g · ${Math.round(num(i.kcal))} kcal</li>`).join('')}</ul>
            ${r.advice ? `<p class="small muted">💡 ${esc(r.advice)}</p>` : ''}
            <div class="chip-row" style="margin-bottom:12px">${MEAL_ORDER.map((m) => `<button class="chip ${m === meal ? 'on' : ''}" data-scmeal="${m}">${MEALS[m]}</button>`).join('')}</div>
            <button class="btn block" id="sc-save"><i data-lucide="plus"></i>Thêm vào nhật ký</button></div>`;
        icons();
        let chosen = meal;
        $$('[data-scmeal]').forEach((c) => c.onclick = () => { chosen = c.dataset.scmeal; $$('[data-scmeal]').forEach((x) => x.classList.toggle('on', x === c)); });
        $('#sc-save').onclick = () => {
            const item = { meal: chosen, name: $('#sc-name').value.trim() || r.name, kcal: num($('#sc-kcal').value), p: num($('#sc-p').value), c: num(r.macros?.c), f: num(r.macros?.f), src: 'scan' };
            addFood(item);
            if (!state.food.favorites.some((f) => f.name === item.name)) {
                state.food.favorites.unshift({ name: item.name, kcal: item.kcal, p: item.p, c: item.c, f: item.f });
                state.food.favorites = state.food.favorites.slice(0, 30);
                save('food');
            }
            closeSheet(); toast('Đã thêm vào nhật ký'); render();
        };
    } catch (e) { $('#scan-out').innerHTML = `<p>${esc(aiErrorText(e))}</p>`; }
}

// ---------- Ảnh mục tiêu ----------
const GOAL_MAX = 8; // ảnh lưu thẳng trong database nên giới hạn số lượng
function openGoal() {
    const g = state.goal;
    openSheet(`${sheetHead('Ảnh mục tiêu')}
        ${g.photos.length ? `<div class="goal-grid">${g.photos.map((p, i) => `<div class="goal-thumb"><img src="${esc(p)}" alt="">
            <button class="icon-btn" data-goal-del="${i}" title="Xoá ảnh này"><i data-lucide="x"></i></button></div>`).join('')}</div>`
            : `<div class="goal-hero" style="aspect-ratio:4/5;max-width:240px;margin:0 auto 12px"><div class="goal-hero-empty"><i data-lucide="image"></i><b>Chưa có ảnh</b></div></div>`}
        <div class="grid2" style="margin-bottom:12px">
            <button class="btn" id="goal-upload"><i data-lucide="upload"></i>Tải ảnh lên</button>
            <button class="btn accent" id="goal-ai"><i data-lucide="wand-sparkles"></i>AI tạo từ ảnh tôi</button>
        </div>
        <p class="small muted" style="margin-top:0">• <b>Tải ảnh lên</b>: chọn được nhiều ảnh cùng lúc (tối đa ${GOAL_MAX} ảnh) — dáng người bạn muốn có, ảnh cũ lúc gọn hoặc hình mẫu. Nên dùng ảnh dọc.<br>• <b>AI tạo</b>: chọn 1 ảnh toàn thân hiện tại, AI vẽ bạn lúc đạt ${state.weight.target} kg.</p>
        <label class="field"><span>Câu nhắc bản thân (hiện trên ảnh)</span><input class="input" id="goal-note" maxlength="80" placeholder="VD: Tết này mặc vừa áo size M!" value="${esc(g.note)}"></label>
        <div class="grid2"><button class="btn danger" id="goal-del" ${g.photos.length ? '' : 'disabled'}>Xoá tất cả</button><button class="btn ghost" id="goal-save">Lưu câu nhắc</button></div>
        <div id="goal-status" class="small muted" style="margin-top:10px"></div>`);
    const status = (t) => { $('#goal-status').innerHTML = t; };
    const addPhotos = (list) => {
        // Lưu thẳng vào database: Firebase Storage của dự án đang báo 402 (cần gói trả phí)
        const room = GOAL_MAX - state.goal.photos.length;
        if (room <= 0) return toast(`Tối đa ${GOAL_MAX} ảnh, hãy xoá bớt trước`);
        state.goal.photos.push(...list.slice(0, room));
        ui.goalIdx = state.goal.photos.length - 1;
        save('goal'); toast(list.length > room ? `Chỉ thêm được ${room} ảnh (tối đa ${GOAL_MAX})` : 'Đã cập nhật ảnh mục tiêu 💪');
        openGoal(); render();
    };
    $$('[data-goal-del]').forEach((b) => b.onclick = () => {
        if (!confirm('Xoá ảnh này?')) return;
        state.goal.photos.splice(+b.dataset.goalDel, 1);
        save('goal'); openGoal(); render();
    });
    $('#goal-upload').onclick = async () => {
        const files = await pickImages(); if (!files.length) return;
        status('<span class="spinner dark"></span> Đang lưu ảnh…');
        addPhotos(await Promise.all(files.slice(0, GOAL_MAX).map((f) => compressImage(f, 900, 0.75))));
    };
    $('#goal-ai').onclick = async () => {
        if (!GEMINI_KEY) return toast('Cần Gemini API Key để dùng AI');
        const f = await pickImage(); if (!f) return;
        const src = await compressImage(f, 900, 0.8);
        status('<span class="spinner dark"></span> AI đang tạo ảnh, mất khoảng 10–30 giây…');
        const prompt = `Edit this photo realistically. Show the SAME person (keep the exact face, identity, skin tone, hairstyle, clothing style and background) ` +
            `but with a healthier, leaner and fitter body as if they lost about ${round1(state.weight.current - state.weight.target)} kg and now weigh about ${state.weight.target} kg ` +
            `at ${state.profile.height} cm tall. Natural, believable result, slimmer waist and face, toned but not bodybuilder. Photorealistic, same lighting.`;
        try {
            const out = await gemini([{ text: prompt }, { inlineData: splitDataUrl(src) }], { json: false, image: true, models: IMAGE_MODELS, temperature: 0.4 });
            const img = new Image();
            img.onload = async () => {
                const c = document.createElement('canvas');
                const sc = Math.min(1, 900 / Math.max(img.width, img.height));
                c.width = img.width * sc; c.height = img.height * sc;
                c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                addPhotos([c.toDataURL('image/jpeg', 0.8)]);
            };
            img.src = out;
        } catch (e) { status(esc(aiErrorText(e))); }
    };
    $('#goal-save').onclick = () => { state.goal.note = $('#goal-note').value.trim(); save('goal'); closeSheet(); render(); };
    $('#goal-del').onclick = () => { if (confirm('Xoá tất cả ảnh mục tiêu?')) { state.goal.photos = []; save('goal'); closeSheet(); render(); } };
}

// ---------- Màn: Chạy 5K ----------
function phaseBar(s) {
    const total = s.phases.reduce((a, p) => a + p.sec, 0);
    return `<div class="phase-bar">${s.phases.map((p) => `<i class="ph-${p.type}" style="width:${p.sec / total * 100}%"></i>`).join('')}</div>`;
}

function runCalendar() {
    const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + ui.calOffset);
    const y = base.getFullYear(), m = base.getMonth();
    const first = (new Date(y, m, 1).getDay() + 6) % 7; // thứ 2 đầu tuần
    const dim = new Date(y, m + 1, 0).getDate();
    const today = todayKey();
    let cells = '';
    for (let i = 0; i < first; i++) cells += '<div class="cal-d blank"></div>';
    for (let d = 1; d <= dim; d++) {
        const iso = isoOf(new Date(y, m, d));
        let cls = '';
        if (runDoneOn(iso)) cls = 'done';
        else if (isPlannedRunDay(iso)) cls = iso < today ? 'miss' : 'plan';
        cells += `<div class="cal-d ${cls} ${iso === today ? 'today' : ''}">${d}</div>`;
    }
    return `<div class="row between" style="margin-bottom:8px">
            <button class="icon-btn" data-act="cal-nav" data-d="-1"><i data-lucide="chevron-left"></i></button>
            <b>Tháng ${m + 1}/${y}</b>
            <button class="icon-btn" data-act="cal-nav" data-d="1"><i data-lucide="chevron-right"></i></button></div>
        <div class="cal">${['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((h) => `<div class="cal-h">${h}</div>`).join('')}${cells}</div>
        <div class="row small muted" style="margin-top:10px;gap:14px;flex-wrap:wrap">
            <span><span class="badge run">■</span> Đã chạy</span><span><span class="badge" style="background:var(--run-soft)">■</span> Lịch chạy</span><span><span class="badge" style="background:var(--danger-soft);color:var(--danger)">■</span> Bỏ lỡ</span></div>`;
}

function renderRun() {
    const done = Object.keys(runLogs()).length;
    const next = nextSession();
    const allRuns = [...Object.values(runLogs()), ...state.run.extra];
    const km = allRuns.reduce((a, r) => a + num(r.km), 0);
    const longest = allRuns.reduce((a, r) => Math.max(a, num(r.min)), 0);
    const schedule = state.run.days.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => WEEKDAYS[d]).join(' · ');

    return `
    <div class="card run-hero">
        <div class="row between"><span class="small muted">Giáo trình ${RUN_WEEKS} tuần · ${schedule || 'chưa chọn lịch'}</span><b>${done}/${RUN_PLAN.length}</b></div>
        <div class="progress" style="margin:8px 0 14px"><i style="width:${done / RUN_PLAN.length * 100}%"></i></div>
        ${next ? `<div class="small muted">Buổi tiếp theo · Tuần ${next.week} buổi ${next.day}</div>
            <div style="font-size:20px;font-weight:800;margin:2px 0">${esc(next.title)}</div>
            <div class="small muted">${esc(next.desc)} · ~${sessionMinutes(next)} phút</div>
            ${phaseBar(next)}
            <div class="grid2">
                <button class="btn" style="background:rgba(255,255,255,.18)" data-act="routine-start" data-id="warmup"><i data-lucide="activity"></i>Khởi động</button>
                <button class="btn" style="background:#fff;color:#1d4ed8" data-act="run-start" data-id="${next.id}"><i data-lucide="play"></i>Bắt đầu chạy</button>
            </div>`
        : `<div style="font-size:22px;font-weight:800">🏆 Bạn đã hoàn thành 5K!</div><p class="muted">Giữ phong độ: chạy 30 phút, 3 buổi/tuần.</p>`}
    </div>

    ${!state.run.startDate ? `<div class="card" style="border:2px dashed var(--run)"><b>Chọn lịch chạy để app nhắc và theo dõi mỗi ngày</b>
        <button class="btn run block" style="margin-top:10px" data-act="run-schedule"><i data-lucide="calendar"></i>Đặt lịch chạy</button></div>` : ''}

    <div class="grid3" style="margin-bottom:12px">
        <div class="stat"><b>${allRuns.length}</b><span>buổi chạy</span></div>
        <div class="stat"><b>${round1(km)}</b><span>km tổng</span></div>
        <div class="stat"><b>${longest}′</b><span>buổi dài nhất</span></div>
    </div>

    <div class="card">
        <div class="card-title">Theo dõi mỗi ngày <button class="btn sm ghost" data-act="run-schedule"><i data-lucide="settings-2"></i>Lịch</button></div>
        ${runCalendar()}
    </div>

    <div class="section-label">Khởi động & giãn cơ</div>
    ${[WARMUP_ROUTINE, COOLDOWN_ROUTINE].map((r) => `<div class="card" data-act="routine" data-id="${r.id}">
        <div class="row"><div class="routine-emoji">${r.id === 'warmup' ? '🦶' : '🧘'}</div>
        <div class="grow"><b>${r.title}</b><div class="small muted">${r.steps.length} động tác · ~${Math.round(r.steps.reduce((a, s) => a + s.sec, 0) / 60)} phút</div></div>
        <i data-lucide="chevron-right" class="muted"></i></div></div>`).join('')}

    <div class="card">
        <div class="card-title">Giáo trình ${RUN_WEEKS} tuần <button class="btn sm outline" data-act="run-free"><i data-lucide="plus"></i>Chạy tự do</button></div>
        ${Array.from({ length: RUN_WEEKS }, (_, w) => `<div class="week-row"><span>Tuần ${w + 1}</span>${RUN_PLAN.filter((s) => s.week === w + 1).map((s) =>
            `<button class="sess ${runLogs()[s.id] ? 'done' : next && next.id === s.id ? 'next' : ''}" data-act="run-session" data-id="${s.id}">${runLogs()[s.id] ? '<i data-lucide="check"></i>' : ''}Buổi ${s.day}</button>`).join('')}</div>`).join('')}
    </div>

    <div class="card">
        <div class="card-title">Lịch sử chạy</div>
        ${allRuns.length ? allRuns.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 10).map((r) =>
            `<div class="hist-row"><div><b>${esc(r.title || 'Chạy tự do')}</b><div class="small muted">${fmtDay(r.date)}${r.note ? ' · ' + esc(r.note) : ''}</div></div>
             <div style="text-align:right"><b>${r.km ? r.km + ' km' : ''}</b><div class="small muted">${r.min || 0} phút ${['', '😫', '🙁', '😐', '🙂', '😄'][r.feel || 0] || ''}</div></div></div>`).join('')
        : '<div class="empty">Chưa có buổi chạy nào. Bắt đầu buổi đầu tiên thôi!</div>'}
    </div>`;
}

function openRunSchedule() {
    const days = new Set(state.run.days);
    const order = [1, 2, 3, 4, 5, 6, 0];
    openSheet(`${sheetHead('Lịch chạy')}
        <label class="field"><span>Ngày bắt đầu giáo trình</span><input class="input" type="date" id="rs-start" value="${state.run.startDate || todayKey()}"></label>
        <div class="field"><span>Chạy vào các ngày (nên chọn 3 ngày, cách nhau 1 ngày nghỉ)</span>
        <div class="chip-row" id="rs-days">${order.map((d) => `<button class="chip ${days.has(d) ? 'on' : ''}" data-d="${d}">${WEEKDAYS[d]}</button>`).join('')}</div></div>
        <button class="btn run block" id="rs-save">Lưu lịch</button>`);
    $$('#rs-days .chip').forEach((c) => c.onclick = () => {
        const d = +c.dataset.d;
        days.has(d) ? days.delete(d) : days.add(d);
        c.classList.toggle('on', days.has(d));
    });
    $('#rs-save').onclick = () => {
        if (!days.size) return toast('Chọn ít nhất 1 ngày');
        state.run.startDate = $('#rs-start').value || todayKey();
        state.run.days = [...days];
        save('run'); closeSheet(); toast('Đã lưu lịch chạy'); render();
    };
}

function openRunSession(id) {
    const s = RUN_PLAN.find((x) => x.id === id);
    const log = runLogs()[id];
    openSheet(`${sheetHead(`Tuần ${s.week} · Buổi ${s.day}`)}
        <div class="card"><b style="font-size:17px">${esc(s.title)}</b><p class="muted small" style="margin:4px 0 0">${esc(s.desc)} · ~${sessionMinutes(s)} phút</p>${phaseBar(s)}
        <ol class="ol small">${s.phases.map((p) => `<li>${p.label} – ${mmss(p.sec)}</li>`).join('')}</ol></div>
        ${log ? `<div class="card"><span class="badge ok">✓ Đã hoàn thành ${fmtDay(log.date)}</span><div class="small muted" style="margin-top:6px">${log.km ? log.km + ' km · ' : ''}${log.min} phút</div></div>` : ''}
        <div class="grid2">
            <button class="btn outline" data-act="run-log" data-id="${s.id}">${log ? 'Sửa kết quả' : 'Đánh dấu đã chạy'}</button>
            <button class="btn run" data-act="run-start" data-id="${s.id}"><i data-lucide="play"></i>Bắt đầu</button>
        </div>
        ${log ? `<button class="btn danger block" style="margin-top:10px" data-act="run-unlog" data-id="${s.id}">Bỏ đánh dấu</button>` : ''}
        <button class="btn outline block" style="margin-top:10px" data-act="run-repeat-week" data-week="${s.week}"><i data-lucide="rotate-ccw"></i>Thấy nặng? Tập lại tuần ${s.week}</button>
        <p class="small muted">Mệt quá thì cứ lặp lại tuần đó 1–2 lần, rất bình thường. Chạy chậm tới mức vẫn nói được cả câu.</p>`);
}

function openRunLog(sessionId, minutes) {
    const s = RUN_PLAN.find((x) => x.id === sessionId);
    const old = sessionId ? runLogs()[sessionId] : null;
    let feel = old?.feel || 4;
    openSheet(`${sheetHead(s ? 'Hoàn thành buổi chạy 🎉' : 'Ghi buổi chạy / đi bộ')}
        ${s ? `<p class="muted" style="margin-top:0">Tuần ${s.week} · Buổi ${s.day}: ${esc(s.title)}</p>` : ''}
        <label class="field"><span>Ngày</span><input class="input" type="date" id="rl-date" value="${old?.date || todayKey()}"></label>
        <div class="grid2">
            <label class="field"><span>Quãng đường (km)</span><input class="input" id="rl-km" type="number" inputmode="decimal" step="0.01" value="${old?.km || ''}" placeholder="VD: 3.2"></label>
            <label class="field"><span>Thời gian (phút)</span><input class="input" id="rl-min" type="number" inputmode="numeric" value="${old?.min || minutes || (s ? sessionMinutes(s) : '')}"></label>
        </div>
        <div class="field"><span>Cảm giác</span><div class="chip-row" id="rl-feel">${['😫', '🙁', '😐', '🙂', '😄'].map((e, i) => `<button class="chip ${feel === i + 1 ? 'on' : ''}" data-f="${i + 1}" style="font-size:20px">${e}</button>`).join('')}</div></div>
        <label class="field"><span>Ghi chú</span><input class="input" id="rl-note" value="${esc(old?.note || '')}" placeholder="VD: đau nhẹ bắp chân trái"></label>
        <button class="btn run block" id="rl-save">Lưu</button>`);
    $$('#rl-feel .chip').forEach((c) => c.onclick = () => { feel = +c.dataset.f; $$('#rl-feel .chip').forEach((x) => x.classList.toggle('on', x === c)); });
    $('#rl-save').onclick = () => {
        const entry = { date: $('#rl-date').value || todayKey(), km: num($('#rl-km').value), min: Math.round(num($('#rl-min').value)), feel, note: $('#rl-note').value.trim() };
        if (s) { entry.title = `Tuần ${s.week} · Buổi ${s.day}`; state.run.log[s.id] = entry; }
        else state.run.extra.push({ ...entry, id: uid(), title: 'Chạy tự do' });
        save('run'); closeSheet();
        toast(s && feel <= 2 ? `Buổi này hơi nặng. Nên tập lại tuần ${s.week} trước khi lên tuần mới nhé` : 'Đã lưu buổi chạy 💙');
        render();
    };
}

function openRoutine(id) {
    const r = id === 'warmup' ? WARMUP_ROUTINE : COOLDOWN_ROUTINE;
    openSheet(`${sheetHead(r.title)}
        <p class="muted small" style="margin-top:0">${r.desc}</p>
        ${videoBtn(ROUTINE_VIDEO[r.id], 'Xem video cả bài (tiếng Việt)', 'btn ghost block')}
        <div class="card" style="margin-top:12px">${r.steps.map((s) => { const m = STEP_MEDIA[s.name] || {}; return `<div class="routine-step">
            ${m.img ? exAnim(m.img, 'thumb-anim') : `<div class="routine-emoji">${s.emoji}</div>`}
            <div class="grow"><div class="row between"><b>${s.name}</b><span class="badge">${s.sec}s</span></div><div class="small muted">${s.how}</div>
            ${videoBtn(m.yt, 'Video', 'btn sm ghost video-sm')}</div></div>`; }).join('')}</div>
        <button class="btn block" data-act="routine-start" data-id="${r.id}"><i data-lucide="play"></i>Bắt đầu theo hướng dẫn</button>`);
}

// ---------- Ảnh động & video minh hoạ ----------
// 2 ảnh (tư thế đầu / cuối) chạy luân phiên như video ngắn
function exAnim(img, cls = '') {
    if (!img) return '';
    return `<div class="ex-anim ${cls}"><img src="img/ex/${img}-0.jpg" alt="" loading="lazy"><img class="f2" src="img/ex/${img}-1.jpg" alt="" loading="lazy"></div>`;
}
function videoBtn(yt, label = 'Xem video hướng dẫn', cls = 'btn outline block') {
    if (!yt) return '';
    return `<button class="${cls}" data-act="video" data-yt="${yt}"><i data-lucide="circle-play"></i>${label}</button>`;
}
function playVideoInline(el, yt) {
    const box = document.createElement('div');
    box.className = 'video-box';
    box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt)}?autoplay=1&playsinline=1&rel=0&modestbranding=1"
        title="Video hướng dẫn" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    el.replaceWith(box);
}

// ---------- Trình hẹn giờ ----------
const player = { open: false, phases: [], idx: 0, endAt: 0, left: 0, paused: false, timer: null, onDone: null, title: '', lastBeep: -1, wake: null, audio: null };

function beep(freq = 880, ms = 160) {
    try {
        player.audio = player.audio || new (window.AudioContext || window.webkitAudioContext)();
        const ctx = player.audio, o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = freq; o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.25, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000);
        o.start(); o.stop(ctx.currentTime + ms / 1000);
    } catch (e) { /* thiết bị không hỗ trợ âm thanh */ }
}
function speak(text) {
    try {
        if (!window.speechSynthesis) return;
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'vi-VN'; u.rate = 1;
        speechSynthesis.speak(u);
    } catch (e) { /* bỏ qua */ }
}
async function keepAwake() {
    try { if ('wakeLock' in navigator) player.wake = await navigator.wakeLock.request('screen'); } catch (e) { /* bỏ qua */ }
}
document.addEventListener('visibilitychange', () => { if (player.open && document.visibilityState === 'visible') keepAwake(); });

function startPlayer({ title, phases, onDone }) {
    closeSheet();
    Object.assign(player, { open: true, title, phases, idx: -1, paused: false, onDone, lastBeep: -1 });
    beep(660, 80);
    keepAwake();
    $('#player').classList.add('open');
    gotoPhase(0);
    clearInterval(player.timer);
    player.timer = setInterval(tickPlayer, 250);
}
function gotoPhase(i) {
    if (i >= player.phases.length) return finishPlayer(true);
    player.idx = Math.max(0, i);
    const p = player.phases[player.idx];
    player.left = p.sec;
    player.endAt = Date.now() + p.sec * 1000;
    player.lastBeep = -1;
    if (navigator.vibrate) navigator.vibrate(p.type === 'run' ? [300, 100, 300] : [200]);
    beep(p.type === 'run' ? 1046 : 784, 300);
    speak(p.type === 'run' ? 'Bắt đầu chạy' : p.type === 'walk' ? 'Đi bộ' : p.name || p.label);
    drawPlayer();
}
function tickPlayer() {
    if (!player.open || player.paused) return;
    const left = Math.ceil((player.endAt - Date.now()) / 1000);
    if (left <= 0) { gotoPhase(player.idx + 1); return; }
    if (left !== player.left) {
        player.left = left;
        if (left <= 3 && left !== player.lastBeep) { player.lastBeep = left; beep(660, 90); }
        updatePlayerTime();
    }
}
function updatePlayerTime() {
    const p = player.phases[player.idx];
    const t = $('#pl-time'); if (t) t.textContent = mmss(player.left);
    const bar = $('#pl-bar'); if (bar) bar.style.width = `${(1 - player.left / p.sec) * 100}%`;
    const totalLeft = player.left + player.phases.slice(player.idx + 1).reduce((a, x) => a + x.sec, 0);
    const tl = $('#pl-total'); if (tl) tl.textContent = `Còn ${mmss(totalLeft)} tổng`;
}
function drawPlayer() {
    const p = player.phases[player.idx], nx = player.phases[player.idx + 1];
    const el = $('#player');
    el.className = 'player open ph-' + (p.type || 'step');
    el.innerHTML = `
        <div class="player-top"><button class="icon-btn" data-act="pl-close"><i data-lucide="x"></i></button>
            <span class="small" style="opacity:.8">${esc(player.title)}</span><span class="small" id="pl-total"></span></div>
        <div class="player-main">
            ${(STEP_MEDIA[p.name] || {}).img ? exAnim(STEP_MEDIA[p.name].img, 'player-anim') : `<div class="player-emoji">${p.emoji || (p.type === 'run' ? '🏃' : p.type === 'walk' ? '🚶' : '🔥')}</div>`}
            <div class="player-phase">${esc(p.name || p.label)}</div>
            <div class="player-time" id="pl-time">${mmss(player.left)}</div>
            <div class="player-how">${esc(p.how || (p.type === 'run' ? 'Chạy chậm, vẫn nói chuyện được là đúng tốc độ.' : p.type === 'walk' ? 'Đi bộ nhanh, thở đều để hồi sức.' : p.type === 'warm' ? 'Đi bộ nhanh, vung tay tự nhiên để làm nóng người.' : p.type === 'cool' ? 'Đi bộ chậm dần, hít thở sâu. Xong thì giãn cơ bắp chân.' : ''))}</div>
            ${(STEP_MEDIA[p.name] || {}).yt ? `<button class="btn sm" style="background:rgba(255,255,255,.18)" data-act="video-pause" data-yt="${STEP_MEDIA[p.name].yt}"><i data-lucide="circle-play"></i>Xem video động tác</button>` : ''}
            <div class="player-next">${nx ? `Tiếp theo: ${esc(nx.name || nx.label)} · ${mmss(nx.sec)}` : 'Phần cuối cùng!'}</div>
        </div>
        <div class="small" style="text-align:center;opacity:.8">Phần ${player.idx + 1}/${player.phases.length}</div>
        <div class="progress"><i id="pl-bar" style="width:0%"></i></div>
        <div class="player-controls">
            <button class="btn" data-act="pl-prev"><i data-lucide="skip-back"></i></button>
            <button class="btn main" data-act="pl-pause"><i data-lucide="${player.paused ? 'play' : 'pause'}"></i>${player.paused ? 'Tiếp tục' : 'Tạm dừng'}</button>
            <button class="btn" data-act="pl-next"><i data-lucide="skip-forward"></i></button>
        </div>`;
    icons();
    updatePlayerTime();
}
function togglePause() {
    if (player.paused) { player.endAt = Date.now() + player.left * 1000; player.paused = false; }
    else { player.paused = true; }
    drawPlayer();
}
function finishPlayer(completed) {
    clearInterval(player.timer);
    player.open = false;
    $('#player').classList.remove('open');
    $('#player').innerHTML = '';
    try { player.wake && player.wake.release(); } catch (e) { /* bỏ qua */ }
    if (completed) { beep(1046, 500); speak('Hoàn thành. Giỏi lắm!'); }
    const cb = player.onDone; player.onDone = null;
    if (cb) cb(completed);
    else if (pendingRender) requestRender();
}

function startRun(id) {
    const s = RUN_PLAN.find((x) => x.id === id);
    const startedAt = Date.now();
    startPlayer({
        title: `Tuần ${s.week} · Buổi ${s.day}`, phases: s.phases,
        onDone: (completed) => {
            const mins = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
            if (completed || confirm('Dừng sớm. Vẫn ghi lại buổi chạy này?')) openRunLog(s.id, mins);
            else render();
        }
    });
}
function startRoutine(id) {
    const r = id === 'warmup' ? WARMUP_ROUTINE : COOLDOWN_ROUTINE;
    startPlayer({
        title: r.title, phases: r.steps.map((s) => ({ ...s, type: 'step' })),
        onDone: (completed) => {
            if (completed) { setCheck('warmup', true); toast('Xong! Đã tick "Khởi động / giãn cơ" hôm nay'); }
            render();
        }
    });
}

// ---------- Màn: Gym ----------
function lastSetsOf(exId) {
    const days = Object.keys(state.gym.log).sort().reverse();
    for (const d of days) {
        const e = state.gym.log[d].find((x) => x.ex === exId);
        if (e) return { date: d, sets: e.sets };
    }
    return null;
}

function renderGym() {
    const recent = Object.keys(state.gym.log).sort().reverse().slice(0, 6);
    return `
    <div class="section-label" style="margin-top:4px">Buổi tập gợi ý</div>
    ${GYM_TEMPLATES.map((t) => `<div class="card">
        <div class="card-title">${t.name}</div>
        <div class="small muted" style="margin-bottom:12px">${t.items.map((id) => GYM_EXERCISES.find((e) => e.id === id).name).join(' · ')}</div>
        <button class="btn gym block" data-act="gym-start" data-id="${t.id}"><i data-lucide="play"></i>Bắt đầu buổi tập</button></div>`).join('')}

    <div class="section-label">Hướng dẫn sử dụng máy</div>
    <div class="chip-row" style="margin-bottom:10px">${GYM_GROUPS.map((g) => `<button class="chip ${g.id === ui.gymGroup ? 'on' : ''}" data-act="gym-group" data-id="${g.id}">${g.name}</button>`).join('')}</div>
    <div class="card" style="padding:6px 16px">
        ${GYM_EXERCISES.filter((e) => e.group === ui.gymGroup).map((e) => {
            const last = lastSetsOf(e.id);
            return `<button class="ex-item" data-act="gym-ex" data-id="${e.id}">${EX_MEDIA[e.id] ? `<div class="ex-emoji ex-thumb"><img src="img/ex/${EX_MEDIA[e.id].img}-1.jpg" alt="" loading="lazy"></div>` : `<div class="ex-emoji">${e.emoji}</div>`}
            <div class="grow"><b>${e.name}</b><span>${e.en} · ${e.target}</span>${last ? `<span style="display:block;color:var(--gym)">Lần trước: ${last.sets.map((s) => `${s.kg || 0}kg×${s.reps}`).join(', ')}</span>` : ''}</div>
            <i data-lucide="chevron-right" class="muted"></i></button>`;
        }).join('')}
    </div>
    <p class="small muted">⚠️ Mới tập: chọn tạ nhẹ, ưu tiên đúng tư thế. Đau nhói khớp thì dừng ngay. Nhờ PT ở phòng tập chỉnh máy lần đầu.</p>

    <div class="card">
        <div class="card-title">Lịch sử tập</div>
        ${recent.length ? recent.map((d) => `<div class="hist-row"><div><b>${fmtDay(d)}</b><div class="small muted">${state.gym.log[d].map((e) => GYM_EXERCISES.find((x) => x.id === e.ex)?.name || e.ex).join(', ')}</div></div>
            <span class="badge gym">${state.gym.log[d].length} bài</span></div>`).join('') : '<div class="empty">Chưa có buổi tập nào</div>'}
    </div>`;
}

function openExercise(id) {
    const e = GYM_EXERCISES.find((x) => x.id === id);
    const last = lastSetsOf(id);
    openSheet(`${sheetHead(e.emoji + ' ' + e.name)}
        <div class="small muted" style="margin:-8px 0 12px">${e.en} · Cơ chính: ${e.target}</div>
        ${EX_MEDIA[e.id] ? `${exAnim(EX_MEDIA[e.id].img, 'detail-anim')}
            ${e.assist ? '<p class="small muted" style="margin:6px 0 0">Ảnh minh hoạ động tác hít xà/nhúng xà tự do; trên máy hỗ trợ bạn quỳ gối lên đệm, chuyển động giống hệt.</p>' : ''}
            <div style="margin:10px 0 12px">${videoBtn(EX_MEDIA[e.id].yt)}</div>` : ''}
        <div class="card"><div class="card-title">1. Chỉnh máy</div><ol class="ol">${e.setup.map((s) => `<li>${s}</li>`).join('')}</ol></div>
        <div class="card"><div class="card-title">2. Cách tập</div><ol class="ol">${e.steps.map((s) => `<li>${s}</li>`).join('')}</ol></div>
        <div class="card"><div class="card-title">Lỗi hay gặp</div><ul class="warn-list">${e.mistakes.map((s) => `<li>${s}</li>`).join('')}</ul></div>
        <div class="card"><div class="row"><i data-lucide="repeat"></i><b>${e.sets}</b></div>
            ${last ? `<div class="small muted" style="margin-top:6px">Lần trước (${fmtDay(last.date)}): ${last.sets.map((s) => `${s.kg || 0}kg × ${s.reps}`).join(', ')}</div>` : ''}</div>
        <a class="btn outline block" href="https://www.youtube.com/results?search_query=${encodeURIComponent(e.video)}" target="_blank" rel="noopener"><i data-lucide="search"></i>Tìm thêm video khác trên YouTube</a>`);
}

function openGymSession(templateId) {
    const t = GYM_TEMPLATES.find((x) => x.id === templateId);
    const iso = todayKey();
    const existing = state.gym.log[iso] || [];
    const rows = t.items.map((id) => {
        const e = GYM_EXERCISES.find((x) => x.id === id);
        const prev = existing.find((x) => x.ex === id)?.sets || lastSetsOf(id)?.sets || [];
        const sets = [0, 1, 2].map((i) => prev[i] || prev[prev.length - 1] || { kg: e.group === 'dumbbell' ? 5 : '', reps: 12 });
        return `<div class="card" data-ex="${id}">
            <div class="row" style="margin-bottom:8px">${EX_MEDIA[id] ? `<div class="ex-emoji ex-thumb"><img src="img/ex/${EX_MEDIA[id].img}-1.jpg" alt=""></div>` : `<div class="ex-emoji">${e.emoji}</div>`}
                <b class="grow">${e.name}</b><button class="btn sm ghost" data-act="gym-ex" data-id="${id}">Cách tập</button></div>
            ${e.assist ? '<div class="small" style="color:var(--gym);margin-bottom:6px">Máy hỗ trợ: tạ càng nặng càng dễ. Mục tiêu là giảm dần số kg.</div>' : ''}
            <div class="set-row small muted"><span>#</span><span>${e.assist ? 'Hỗ trợ (kg)' : 'Tạ (kg)'}</span><span>Số lần</span><span></span></div>
            ${sets.map((s, i) => `<div class="set-row"><span class="muted">${i + 1}</span>
                <input class="input" type="number" inputmode="decimal" data-k="kg" value="${s.kg ?? ''}" placeholder="kg">
                <input class="input" type="number" inputmode="numeric" data-k="reps" value="${s.reps ?? ''}">
                <button class="check-box ${existing.find((x) => x.ex === id) ? '' : ''}" data-act="set-done" aria-label="Xong hiệp"></button></div>`).join('')}
        </div>`;
    }).join('');
    openSheet(`${sheetHead(t.name)}
        <p class="small muted" style="margin-top:0">Khởi động 5 phút (đi bộ máy chạy/ xoay khớp) trước khi vào máy. Nghỉ 60–90 giây giữa các hiệp. Chạm ô vuông khi xong hiệp.</p>
        <div id="gym-rows">${rows}</div>
        <button class="btn gym block" id="gym-save"><i data-lucide="check"></i>Lưu buổi tập</button>`);
    $$('#gym-rows [data-act="set-done"]').forEach((b) => b.onclick = (ev) => {
        ev.stopPropagation();
        const on = !b.classList.contains('on');
        b.classList.toggle('on', on);
        b.style.background = on ? 'var(--gym)' : ''; b.style.borderColor = on ? 'var(--gym)' : '';
        b.innerHTML = on ? '<i data-lucide="check"></i>' : ''; icons();
        if (on && navigator.vibrate) navigator.vibrate(60);
    });
    $('#gym-save').onclick = () => {
        const entries = $$('#gym-rows [data-ex]').map((card) => ({
            ex: card.dataset.ex,
            sets: $$('.set-row', card).slice(1).map((r) => ({ kg: num($('[data-k="kg"]', r).value), reps: Math.round(num($('[data-k="reps"]', r).value)), done: $('[data-act="set-done"]', r).classList.contains('on') }))
                .filter((s) => s.reps > 0)
        })).filter((e) => e.sets.length);
        const kept = (state.gym.log[iso] || []).filter((x) => !entries.some((e) => e.ex === x.ex));
        state.gym.log[iso] = [...kept, ...entries];
        save('gym'); closeSheet(); toast('Đã lưu buổi tập 💜'); render();
    };
}

// ---------- Màn: Cân nặng ----------
let weightChart = null;
function renderWeight() {
    const w = state.weight, h = w.history;
    const lost = round1(w.start - w.current), left = round1(w.current - w.target);
    const bmi = round1(w.current / Math.pow(num(state.profile.height, 170) / 100, 2));
    const pct = w.start > w.target ? Math.max(0, Math.min(100, (w.start - w.current) / (w.start - w.target) * 100)) : 0;
    const rows = h.slice().reverse().slice(0, 30);
    return `
    <div class="card">
        <div class="grid3">
            <div class="stat"><b>${w.current}</b><span>kg hiện tại</span></div>
            <div class="stat"><b style="color:var(--ok)">${lost}</b><span>kg đã giảm</span></div>
            <div class="stat"><b>${Math.max(0, left)}</b><span>kg còn lại</span></div>
        </div>
        <div class="row between small muted" style="margin-top:12px"><span>Bắt đầu ${w.start} kg</span><span>${Math.round(pct)}%</span><span>Mục tiêu ${w.target} kg</span></div>
        <div class="progress" style="margin-top:4px"><i style="width:${pct}%"></i></div>
        <div class="small muted" style="margin-top:8px">BMI ${bmi} · ${bmi < 18.5 ? 'Thiếu cân' : bmi < 23 ? 'Bình thường' : bmi < 25 ? 'Thừa cân' : 'Béo phì'} (chuẩn châu Á)</div>
    </div>

    <div class="card">
        <div class="card-title">Biểu đồ <span class="chip-row">${[[30, '30 ngày'], [90, '3 tháng'], [0, 'Tất cả']].map(([v, l]) => `<button class="chip ${ui.weightRange === v ? 'on' : ''}" style="height:28px;font-size:12px" data-act="w-range" data-v="${v}">${l}</button>`).join('')}</span></div>
        <div class="chart-box"><canvas id="weight-chart"></canvas></div>
    </div>

    <div class="card">
        <div class="card-title">Ghi cân nặng</div>
        <div class="grid2"><input class="input" type="date" id="w-date" value="${todayKey()}"><input class="input" id="w-kg" type="number" inputmode="decimal" step="0.1" placeholder="kg"></div>
        <button class="btn block" style="margin-top:10px" data-act="w-add">Lưu</button>
        <p class="small muted" style="margin-bottom:0">Mẹo: cân buổi sáng, sau khi đi vệ sinh, trước khi ăn để số đo ổn định.</p>
    </div>

    <div class="card">
        <div class="card-title">Lịch sử</div>
        ${rows.length ? rows.map((r, i) => {
            const prev = rows[i + 1]; const d = prev ? round1(r.val - prev.val) : 0;
            return `<div class="hist-row"><span>${fmtDay(r.iso)}</span><span class="row" style="gap:12px">
                ${prev ? `<span class="${d <= 0 ? 'delta-down' : 'delta-up'}">${d > 0 ? '+' : ''}${d}</span>` : ''}<b>${r.val} kg</b>
                <button class="icon-btn" data-act="w-del" data-iso="${r.iso}"><i data-lucide="trash-2"></i></button></span></div>`;
        }).join('') : '<div class="empty">Chưa có dữ liệu</div>'}
    </div>`;
}

function drawWeightChart() {
    const canvas = $('#weight-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    let h = state.weight.history;
    if (ui.weightRange) { const from = addDays(todayKey(), -ui.weightRange); h = h.filter((x) => x.iso >= from); }
    if (weightChart) weightChart.destroy();
    weightChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: h.map((x) => ddmm(x.iso)),
            datasets: [
                { data: h.map((x) => x.val), borderColor: '#0f766e', backgroundColor: 'rgba(15,118,110,.1)', fill: true, tension: 0.3, pointRadius: h.length > 40 ? 0 : 3, borderWidth: 2.5 },
                { data: h.map(() => state.weight.target), borderColor: '#f97316', borderDash: [6, 5], pointRadius: 0, borderWidth: 1.5, fill: false }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.parsed.y} kg` } } },
            scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 6, font: { size: 11 } } }, y: { ticks: { font: { size: 11 } }, grace: '5%' } }
        }
    });
}

function addWeight(iso, kg) {
    if (!kg || kg < 30 || kg > 250) return toast('Số cân không hợp lệ');
    const h = state.weight.history;
    const ex = h.find((x) => x.iso === iso);
    if (ex) ex.val = kg; else h.push({ iso, date: ddmm(iso), val: kg });
    h.sort((a, b) => a.iso.localeCompare(b.iso));
    state.weight.current = h[h.length - 1].val;
    applyAutoTargets();
    save('weight', 'nutrition');
    toast(`Đã lưu ${kg} kg`);
    render();
}

// ---------- Cài đặt ----------
function openProfile() {
    const p = state.profile, n = state.nutrition, w = state.weight, a = autoTargets();
    openSheet(`${sheetHead('Cài đặt')}
        <div class="card">
            <label class="field"><span>Tên</span><input class="input" id="pf-name" value="${esc(state.user.name)}"></label>
            <div class="grid2">
                <label class="field"><span>Giới tính</span><select class="input" id="pf-sex"><option value="male" ${p.sex !== 'female' ? 'selected' : ''}>Nam</option><option value="female" ${p.sex === 'female' ? 'selected' : ''}>Nữ</option></select></label>
                <label class="field"><span>Tuổi</span><input class="input" id="pf-age" type="number" value="${p.age}"></label>
                <label class="field"><span>Chiều cao (cm)</span><input class="input" id="pf-height" type="number" value="${p.height}"></label>
                <label class="field"><span>Cân lúc bắt đầu</span><input class="input" id="pf-start" type="number" step="0.1" value="${w.start}"></label>
                <label class="field"><span>Cân mục tiêu</span><input class="input" id="pf-target" type="number" step="0.1" value="${w.target}"></label>
                <label class="field"><span>Vận động</span><select class="input" id="pf-act">
                    ${[[1.2, 'Ít (ngồi nhiều)'], [1.375, 'Nhẹ (1–3 buổi/tuần)'], [1.55, 'Vừa (3–5 buổi)'], [1.725, 'Nhiều (6–7 buổi)']].map(([v, l]) => `<option value="${v}" ${num(p.activity) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
            </div>
        </div>
        <div class="card">
            <div class="card-title">Chỉ tiêu mỗi ngày</div>
            <label class="row" style="margin-bottom:10px"><input type="checkbox" id="pf-auto" ${n.auto ? 'checked' : ''} style="width:20px;height:20px"> <span>Tự tính theo thông tin trên (gợi ý ${a.kcal} kcal, tiêu hao ~${a.tdee})</span></label>
            <div class="grid2">
                <label class="field"><span>Calo</span><input class="input" id="pf-kcal" type="number" value="${n.kcalTarget}"></label>
                <label class="field"><span>Đạm (g)</span><input class="input" id="pf-p" type="number" value="${n.proteinTarget}"></label>
            </div>
            <label class="field"><span>Không ăn được / không thích (AI sẽ tránh)</span><input class="input" id="pf-dislikes" value="${esc(p.dislikes)}" placeholder="VD: hải sản, sầu riêng"></label>
            <label class="field"><span>Ghi chú cho AI</span><input class="input" id="pf-notes" value="${esc(p.notes)}" placeholder="VD: trưa ăn ở công ty, tối nấu ở nhà"></label>
        </div>
        <div class="card">
            <div class="card-title">Gemini API Key <small>${GEMINI_KEY ? '✅ Đã cài' : '⚠️ Chưa có'}</small></div>
            <input class="input" id="pf-key" type="password" placeholder="Dán API Key…" value="${esc(GEMINI_KEY)}" autocomplete="off">
            <a class="small" href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;color:var(--primary)">Lấy API Key miễn phí ↗</a>
            <p class="small muted" style="margin-bottom:0">Key chỉ lưu trên máy này, không đồng bộ lên Cloud.</p>
        </div>
        <div class="card">
            <div class="card-title">fal.ai API Key <small>${FAL_KEY ? '✅ Đã cài' : 'Tuỳ chọn'}</small></div>
            <input class="input" id="pf-fal" type="password" placeholder="Dán fal.ai key để tạo ảnh món ăn…" value="${esc(FAL_KEY)}" autocomplete="off">
            <p class="small muted" style="margin-bottom:0">Dùng để vẽ ảnh minh hoạ món ăn trong phần gợi ý. Key chỉ lưu trên máy này.</p>
        </div>
        <button class="btn block" id="pf-save">Lưu cài đặt</button>
        <div class="grid2" style="margin-top:10px">
            <button class="btn outline" id="pf-export"><i data-lucide="download"></i>Sao lưu dữ liệu</button>
            <button class="btn outline" id="pf-reload"><i data-lucide="refresh-cw"></i>Tải lại app</button>
        </div>
        <p class="small muted" style="text-align:center">Đồng bộ Cloud: ${db ? (remoteReady ? 'đang kết nối ✅' : 'đang kết nối…') : 'không khả dụng'}</p>`);
    $('#pf-save').onclick = () => {
        state.user.name = $('#pf-name').value.trim() || state.user.name;
        Object.assign(p, { sex: $('#pf-sex').value, age: num($('#pf-age').value, 30), height: num($('#pf-height').value, 170), activity: num($('#pf-act').value, 1.375), dislikes: $('#pf-dislikes').value.trim(), notes: $('#pf-notes').value.trim() });
        w.start = num($('#pf-start').value, w.start); w.target = num($('#pf-target').value, w.target);
        n.auto = $('#pf-auto').checked;
        if (n.auto) applyAutoTargets();
        else { n.kcalTarget = num($('#pf-kcal').value, 1800); n.proteinTarget = num($('#pf-p').value, 120); n.fatTarget = Math.round(n.kcalTarget * 0.25 / 9); n.carbTarget = Math.max(80, Math.round((n.kcalTarget - n.proteinTarget * 4 - n.fatTarget * 9) / 4)); }
        FAL_KEY = $('#pf-fal').value.trim();
        if (FAL_KEY) localStorage.setItem('fal_api_key', FAL_KEY); else localStorage.removeItem('fal_api_key');
        GEMINI_KEY = $('#pf-key').value.trim();
        if (GEMINI_KEY) localStorage.setItem('gemini_api_key', GEMINI_KEY); else localStorage.removeItem('gemini_api_key');
        save('user', 'profile', 'weight', 'nutrition');
        closeSheet(); toast('Đã lưu cài đặt'); render();
    };
    $('#pf-export').onclick = () => {
        const data = {}; for (const k of SYNC_KEYS) data[k] = state[k];
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = `fitlife-backup-${todayKey()}.json`; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    $('#pf-reload').onclick = () => location.reload();
}

// ---------- Sự kiện (uỷ quyền 1 chỗ) ----------
const actions = {
    'tab': (d) => switchView(d.view),
    'close-sheet': () => closeSheet(),
    'goal': () => openGoal(),
    'check': (d) => { const iso = todayKey(); const cur = !!checkinOf(iso)[d.id]; if (d.id === 'move' && cur && !state.checkins[iso]?.move) return toast('Đã tự tick vì bạn có buổi chạy/tập hôm nay'); setCheck(d.id, !cur); render(); },
    'quick-weight': () => addWeight(todayKey(), num($('#quick-weight').value)),
    'ai-suggest': (d) => openSuggest(d.meal),
    'sg-meal': (d) => { suggestUI.craving = $('#sg-craving')?.value || ''; suggestUI.meal = d.meal; suggestUI.result = null; drawSuggest(); },
    'sg-where': (d) => { suggestUI.craving = $('#sg-craving')?.value || ''; suggestUI.where = d.where; drawSuggest(); },
    'sg-style': (d) => { suggestUI.craving = $('#sg-craving')?.value || ''; suggestUI.style = d.style; drawSuggest(); },
    'sg-go': () => runSuggest(),
    'sg-pick': (d) => {
        const o = suggestUI.result.options[+d.i];
        addFood({ meal: suggestUI.meal, name: o.name, lib: o.libK, kcal: o.kcal, p: num(o.protein), c: num(o.carb), f: num(o.fat), status: d.status, src: 'ai' });
        closeSheet(); toast(d.status === 'plan' ? 'Đã thêm vào kế hoạch' : 'Đã ghi là đã ăn'); render();
    },
    'ai-dayplan': () => aiDayPlan(),
    'rescue': () => openRescue(),
    'scan': () => scanFood(),
    'food-day': (d) => { ui.foodDay = d.day; render(); },
    'food-add': (d) => openFoodAdd(d.meal),
    'food-toggle': (d) => { const it = (state.food.log[ui.view === 'food' ? ui.foodDay : todayKey()] || []).find((x) => x.id === d.id); if (it) { it.status = it.status === 'eaten' ? 'plan' : 'eaten'; save('food'); render(); } },
    'food-del': (d) => { const iso = ui.foodDay; state.food.log[iso] = (state.food.log[iso] || []).filter((x) => x.id !== d.id); save('food'); render(); },
    'run-start': (d) => startRun(d.id),
    'run-session': (d) => openRunSession(d.id),
    'run-log': (d) => openRunLog(d.id),
    'run-repeat-week': (d) => {
        if (!confirm(`Tập lại tuần ${d.week}? Các buổi của tuần này sẽ được bỏ đánh dấu (lịch sử chạy vẫn giữ trong "Chạy tự do").`)) return;
        RUN_PLAN.filter((x) => x.week === +d.week).forEach((x) => {
            const l = state.run.log[x.id];
            if (l) { state.run.extra.push({ ...l, id: uid(), title: `${l.title || 'Buổi chạy'} (lần trước)` }); delete state.run.log[x.id]; }
        });
        save('run'); closeSheet(); toast(`Đã đặt lại tuần ${d.week}`); render();
    },
    'run-unlog': (d) => { delete state.run.log[d.id]; save('run'); closeSheet(); render(); },
    'run-free': () => openRunLog(null),
    'run-schedule': () => openRunSchedule(),
    'cal-nav': (d) => { ui.calOffset += +d.d; render(); },
    'routine': (d) => openRoutine(d.id),
    'routine-start': (d) => startRoutine(d.id),
    'pl-pause': () => togglePause(),
    'pl-next': () => gotoPhase(player.idx + 1),
    'pl-prev': () => gotoPhase(player.left < player.phases[player.idx].sec - 3 ? player.idx : player.idx - 1),
    'pl-close': () => { if (confirm('Dừng bài tập?')) finishPlayer(false); },
    'video': (d, el) => playVideoInline(el, d.yt),
    'video-pause': (d, el) => { if (!player.paused) togglePause(); playVideoInline($('[data-act="video-pause"]', $('#player')) || el, d.yt); },
    'lib-open': (d) => openLibItem(d.k),
    'lib-all': () => openLibrary(),
    'lib-add': () => addLibPhotos(),
    'gym-group': (d) => { ui.gymGroup = d.id; render(); },
    'gym-ex': (d) => openExercise(d.id),
    'gym-start': (d) => openGymSession(d.id),
    'w-range': (d) => { ui.weightRange = +d.v; render(); },
    'w-add': () => addWeight($('#w-date').value || todayKey(), num($('#w-kg').value)),
    'w-del': (d) => { if (confirm('Xoá lần cân này?')) { state.weight.history = state.weight.history.filter((x) => x.iso !== d.iso); if (state.weight.history.length) state.weight.current = state.weight.history[state.weight.history.length - 1].val; save('weight'); render(); } }
};

document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el) return;
    const fn = actions[el.dataset.act];
    if (!fn) return;
    ev.preventDefault();
    fn(el.dataset, el);
});
$$('.tab').forEach((t) => t.addEventListener('click', () => switchView(t.dataset.view)));
$('#sheet-backdrop').addEventListener('click', closeSheet);
$('#btn-profile').addEventListener('click', openProfile);
document.addEventListener('focusout', () => setTimeout(() => { if (pendingRender) requestRender(); }, 50));
window.addEventListener('beforeunload', () => { if (dirtyKeys.size) flushRemote(); });

// Qua ngày mới khi app vẫn mở → vẽ lại
let lastDay = todayKey();
setInterval(() => { if (todayKey() !== lastDay) { lastDay = todayKey(); ui.foodDay = lastDay; requestRender(); } }, 60000);

// ---------- Khởi động ----------
loadState();
render();
if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}
