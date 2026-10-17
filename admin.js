/**
 * Logic Quản lý tài khoản (admin.js)
 * Phân quyền route, CRUD danh sách tài khoản qua localStorage
 */

// Danh sách tài khoản mặc định và bộ nhớ đệm đồng bộ Firebase
const DEFAULT_USERS = [
    {
        userId: 'u_admin_root_2026',
        username: 'Admin',
        password: 'Loclsct2006',
        role: 'admin',
        createdAt: '08/10/2026',
        isRoot: true,
        status: 'offline',
        lastActive: Date.now(),
        activeSession: null,
        exp: 200
    }
];

let adminUsersList = [];
let adminFeedbacksList = [];
let isFirebaseListenersAttached = false;

// Khởi tạo và bảo vệ route khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Bảo vệ Route: Chỉ cho phép admin truy cập và phiên phải hợp lệ
    if (!protectAdminRoute()) return;

    // 2. Thiết lập theo dõi hiện diện (Presence Tracking) cho tài khoản Admin
    const currAdmin = getAdminCurrentUser();
    if (currAdmin && currAdmin.userId && window.FirebaseService) {
        FirebaseService.setupPresence(currAdmin.userId);
    }

    // 3. Khởi tạo dữ liệu người dùng từ Firebase
    await ensureUserListInitialized();

    // 4. Lắng nghe cập nhật Realtime từ Firebase
    initAdminFirebaseRealtimeListeners();

    // 5. Hiển thị thông tin người dùng quản trị hiện tại
    updateAdminHeaderInfo();

    // 6. Cập nhật các badge số liệu thống kê
    updateAdminStatsBadges();

    // 7. Khởi tạo tab theo URL query parameter (?tab=users|feedbacks)
    const urlParams = new URLSearchParams(window.location.search);
    const initialTab = urlParams.get('tab') === 'feedbacks' ? 'feedbacks' : 'users';
    switchAdminMainTab(initialTab, false);
});

// Xử lý nút Back/Forward của trình duyệt
window.addEventListener('popstate', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab') === 'feedbacks' ? 'feedbacks' : 'users';
    switchAdminMainTab(tab, false);
});

// ==========================================================================
// KIỂM SOÁT PHIÊN ĐĂNG NHẬP ADMIN (SINGLE-DEVICE / SINGLE SESSION GUARD)
// ==========================================================================
let isAdminSessionTerminated = false;

function getAdminCurrentUser() {
    try {
        const userStr = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
        if (!userStr) return null;
        const user = JSON.parse(userStr);
        return (user && (user.userId || user.username)) ? user : null;
    } catch (e) {
        return null;
    }
}

function verifyAdminSession(user) {
    if (isAdminSessionTerminated) return false;
    if (!user) user = getAdminCurrentUser();
    if (!user) {
        window.location.replace('login.html');
        return false;
    }

    // KIM BÀI MIỄN TỬ: Admin không bị check Single Session
    return true;
}

function forceLogoutAdmin(message) {
    isAdminSessionTerminated = true;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('sessionToken');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('sessionToken');
    sessionStorage.clear();
    if (message) {
        alert(message);
    }
    window.location.replace('login.html');
}

/**
 * 1. Bảo vệ Route:
 * Kiểm tra currentUser.role. Nếu không phải admin hoặc phiên bị đè -> chuyển hướng
 */
function protectAdminRoute() {
    const user = getAdminCurrentUser();
    if (!user || !user.loginAt) {
        alert('Vui lòng đăng nhập với tài khoản Quản trị viên (Admin) để truy cập trang này!');
        window.location.replace('login.html');
        return false;
    }

    if (user.role !== 'admin') {
        alert('Bạn không có quyền truy cập trang Quản lý tài khoản! Đang quay lại trang chủ...');
        window.location.replace('index.html');
        return false;
    }

    if (!verifyAdminSession(user)) {
        return false;
    }

    return true;
}

/**
 * Sắp xếp danh sách người dùng theo tiêu chí kép:
 * 1. Ưu tiên status === 'online' lên đầu
 * 2. Sắp xếp theo vần A-Z của username (localeCompare)
 */
function sortUsers(usersArray) {
    if (!Array.isArray(usersArray)) return [];
    return [...usersArray].sort((a, b) => {
        const aOnline = (a.status === 'online') ? 1 : 0;
        const bOnline = (b.status === 'online') ? 1 : 0;
        if (bOnline !== aOnline) {
            return bOnline - aOnline;
        }
        const nameA = (a.username || a.displayName || '').toString().trim();
        const nameB = (b.username || b.displayName || '').toString().trim();
        return nameA.localeCompare(nameB, 'vi', { sensitivity: 'base' });
    });
}

/**
 * Khởi tạo dữ liệu người dùng trên Firebase / Fallback
 */
async function ensureUserListInitialized() {
    if (window.FirebaseService) {
        await FirebaseService.ensureInitialData();
        const users = await FirebaseService.getAllUsers();
        adminUsersList = sortUsers(users);
    } else {
        if (!localStorage.getItem('userList')) {
            localStorage.setItem('userList', JSON.stringify(DEFAULT_USERS));
            adminUsersList = sortUsers([...DEFAULT_USERS]);
        } else {
            try {
                const list = JSON.parse(localStorage.getItem('userList') || '[]');
                const hasAdmin = list.some(u => (u.username || '').toLowerCase() === 'admin');
                if (!hasAdmin) {
                    list.unshift(DEFAULT_USERS[0]);
                    localStorage.setItem('userList', JSON.stringify(list));
                }
                adminUsersList = sortUsers(list);
            } catch (e) {
                adminUsersList = sortUsers([...DEFAULT_USERS]);
            }
        }
    }
}

/**
 * Lắng nghe cập nhật người dùng và phản hồi Realtime từ Firebase Database
 */
function initAdminFirebaseRealtimeListeners() {
    if (isFirebaseListenersAttached) return;
    isFirebaseListenersAttached = true;

    // 1. Lắng nghe Realtime bảng Users
    if (window.ref && window.onValue && window.db) {
        try {
            onValue(ref(db, 'users'), (snapshot) => {
                // BẮT BUỘC: Dọn dẹp nội dung cũ trước khi render để tránh nối tiếp (append) dữ liệu gây đúp dòng
                const tableBody = document.querySelector('#userTableBody') || document.getElementById('user-table-body');
                if (tableBody) {
                    tableBody.innerHTML = '';
                }

                if (snapshot && snapshot.exists() && snapshot.val()) {
                    const data = snapshot.val();
                    const arr = Object.keys(data).map(uid => ({
                        ...data[uid],
                        userId: uid
                    }));
                    adminUsersList = sortUsers(cleanAndFilterUsers(arr));
                } else {
                    adminUsersList = [];
                }
                renderUserTable();
                updateAdminStatsBadges();
            });
        } catch (e) {
            console.warn('[Firebase] onValue users error:', e);
        }

        // 2. Lắng nghe Realtime bảng Feedbacks
        try {
            onValue(ref(db, 'feedbacks'), (snapshot) => {
                if (snapshot && snapshot.exists() && snapshot.val()) {
                    const data = snapshot.val();
                    adminFeedbacksList = Object.keys(data)
                        .map(k => ({ ...data[k], id: k }))
                        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                } else {
                    adminFeedbacksList = [];
                }
                const activeTab = document.getElementById('btn-admin-tab-feedbacks')?.classList.contains('active');
                if (activeTab) {
                    renderFeedbackTable();
                }
                updateAdminStatsBadges();
            });
        } catch (e) {
            console.warn('[Firebase] onValue feedbacks error:', e);
        }
    }
}

/**
 * Lọc sạch danh sách người dùng trước khi đếm và hiển thị:
 * 1. Bỏ qua các bản ghi rác (null, undefined, không có username hoặc userId rỗng)
 * 2. Bỏ qua các bản ghi trùng lặp (trùng userId hoặc trùng username viết thường)
 */
function cleanAndFilterUsers(rawList) {
    if (!Array.isArray(rawList)) return [];
    const seenUids = new Set();
    const seenNames = new Set();
    return rawList.filter(u => {
        if (!u) return false;
        const uname = (u.username || u.displayName || '').toString().trim().toLowerCase();
        if (!uname) return false;
        const uid = (u.userId || ('u_' + uname)).toString().trim().toLowerCase();
        if (seenUids.has(uid) || seenNames.has(uname)) {
            return false;
        }
        seenUids.add(uid);
        seenNames.add(uname);
        return true;
    });
}

function getUserList() {
    let list = [];
    if (adminUsersList && adminUsersList.length > 0) {
        list = adminUsersList;
    } else {
        try {
            const listStr = localStorage.getItem('userList');
            list = listStr ? JSON.parse(listStr) : [...DEFAULT_USERS];
        } catch (e) {
            list = [...DEFAULT_USERS];
        }
    }
    return cleanAndFilterUsers(list);
}

async function saveUserList(list) {
    adminUsersList = list;
    try {
        localStorage.setItem('userList', JSON.stringify(list));
        if (window.ref && window.set && window.db) {
            const map = {};
            list.forEach(u => {
                const uid = u.userId || ('u_' + (u.username || '').toLowerCase());
                map[uid] = { ...u, userId: uid };
            });
            await set(ref(db, 'users'), map);
        }
    } catch (e) {
        console.error('Lỗi khi lưu userList:', e);
    }
}

// ==========================================================================
// HỆ THỐNG CẤP ĐỘ GAMIFICATION (RANKING & EXP POINTS) CHO ADMIN
// ==========================================================================
const ADMIN_RANK = {
    level: 99,
    id: 'thiendiaphaptac',
    name: 'THIÊN ĐỊA PHÁP TẮC',
    displayName: 'Thiên Địa Pháp Tắc',
    minExp: Infinity,
    maxExp: Infinity,
    color: '#ffffff',
    bgColor: 'linear-gradient(90deg, #dc2626 0%, #f59e0b 100%)',
    textColor: '#ffffff',
    borderColor: '#fde047',
    icon: 'fa-solid fa-yin-yang',
    badgeClass: 'rank-thien-dia-phap-tac'
};

const CUC_DAO_RANK = {
    level: 7,
    id: 'chitoncucdao',
    name: 'CHÍ TÔN CỰC ĐẠO',
    displayName: 'Chí Tôn Cực Đạo',
    minExp: 1501,
    maxExp: Infinity,
    color: '#f43f5e',
    bgColor: '#ffe4e6',
    textColor: '#881337',
    borderColor: '#fda4af',
    icon: 'fa-solid fa-dragon',
    badgeClass: 'rank-chitoncucdao'
};

const RANK_LEVELS = [
    { level: 1, id: 'gamo', name: 'PHÀM CẢNH', displayName: 'Phàm cảnh', minExp: 0, maxExp: 100, color: '#475569', bgColor: '#f1f5f9', textColor: '#475569', borderColor: '#cbd5e1', icon: 'fa-solid fa-egg', badgeClass: 'rank-gamo' },
    { level: 2, id: 'tapsu', name: 'LUYỆN KHÍ CẢNH', displayName: 'Luyện Khí cảnh', minExp: 101, maxExp: 300, color: '#15803d', bgColor: '#dcfce7', textColor: '#15803d', borderColor: '#86efac', icon: 'fa-solid fa-feather-pointed', badgeClass: 'rank-tapsu' },
    { level: 3, id: 'tanbinh', name: 'KIM ĐAN CẢNH', displayName: 'Kim Đan cảnh', minExp: 301, maxExp: 600, color: '#1d4ed8', bgColor: '#dbeafe', textColor: '#1d4ed8', borderColor: '#93c5fd', icon: 'fa-solid fa-shield-halved', badgeClass: 'rank-tanbinh' },
    { level: 4, id: 'caothu', name: 'NGUYÊN ANH CẢNH', displayName: 'Nguyên Anh cảnh', minExp: 601, maxExp: 1000, color: '#7e22ce', bgColor: '#f3e8ff', textColor: '#7e22ce', borderColor: '#d8b4fe', icon: 'fa-solid fa-wand-magic-sparkles', badgeClass: 'rank-caothu' },
    { level: 5, id: 'daide', name: 'HÓA THẦN CẢNH', displayName: 'Hóa Thần cảnh', minExp: 1001, maxExp: 1500, color: '#b45309', bgColor: '#fef3c7', textColor: '#92400e', borderColor: '#fcd34d', icon: 'fa-solid fa-crown', badgeClass: 'rank-daide' },
    { level: 6, id: 'chitonthan', name: 'CHÍ TÔN THẦN', displayName: 'Chí tôn thần', minExp: 1501, maxExp: Infinity, color: '#ea580c', bgColor: '#ffedd5', textColor: '#ea580c', borderColor: '#fdba74', icon: 'fa-solid fa-fire-flame-curved', badgeClass: 'rank-chitonthan' }
];

/**
 * Đọc tổng điểm EXP của một tài khoản từ localStorage
 * Kiểm tra cả userStats_${username} và exp_${username} (kể cả chữ thường)
 */
function getUserExp(username, userObj = null) {
    if (!username) return 0;
    // Admin có chỉ số EXP vô hạn
    if ((userObj && ((userObj.role && userObj.role.toLowerCase() === 'admin') || userObj.isRoot)) || username.toLowerCase() === 'admin') {
        return Infinity;
    }
    try {
        // 1. Kiểm tra trực tiếp trong userStats_${username}
        const statsStr = localStorage.getItem('userStats_' + username);
        if (statsStr) {
            const parsed = JSON.parse(statsStr);
            if (parsed && typeof parsed.exp !== 'undefined') {
                return Math.max(0, parseInt(parsed.exp, 10) || 0);
            }
        }

        // 2. Kiểm tra key exp_${username}
        const directExp = localStorage.getItem('exp_' + username);
        if (directExp !== null) {
            return Math.max(0, parseInt(directExp, 10) || 0);
        }

        // 3. Kiểm tra với username chữ thường
        const lowerName = username.toLowerCase();
        const lowerStatsStr = localStorage.getItem('userStats_' + lowerName);
        if (lowerStatsStr) {
            const parsed = JSON.parse(lowerStatsStr);
            if (parsed && typeof parsed.exp !== 'undefined') {
                return Math.max(0, parseInt(parsed.exp, 10) || 0);
            }
        }
        const lowerDirectExp = localStorage.getItem('exp_' + lowerName);
        if (lowerDirectExp !== null) {
            return Math.max(0, parseInt(lowerDirectExp, 10) || 0);
        }

        // 4. Kiểm tra trong object user
        if (userObj && typeof userObj.exp !== 'undefined') {
            return Math.max(0, parseInt(userObj.exp, 10) || 0);
        }
    } catch (e) {
        console.warn('Lỗi khi đọc EXP cho tài khoản ' + username, e);
    }
    return 0;
}

/**
 * Tính Cấp độ dựa trên EXP và flag isAscended.
 * Mốc EXP tối đa (> 1500) chỉ trả về tối đa Cấp 6 ("Chí tôn thần").
 * CHỈ KHI isAscended === true thì hàm mới trả về Cấp 7 ("Chí Tôn Cực Đạo").
 */
function getRankByExp(exp, isAscended = false) {
    if (exp === Infinity || exp >= 99999999) return ADMIN_RANK;
    if (isAscended === true || isAscended === 'true') {
        return CUC_DAO_RANK;
    }
    const safeExp = Math.max(0, parseInt(exp, 10) || 0);
    for (let i = RANK_LEVELS.length - 1; i >= 0; i--) {
        if (safeExp >= RANK_LEVELS[i].minExp) {
            return RANK_LEVELS[i];
        }
    }
    return RANK_LEVELS[0];
}

function getRank(exp, isAscended = false) {
    return getRankByExp(exp, isAscended);
}

function getRankLevelByExp(exp, isAscended = false) {
    return getRankByExp(exp, isAscended).level;
}

/**
 * Xác định chính xác Cấp độ (Rank / Level) của người dùng:
 * 1. Admin mang cảnh giới độc quyền "Thiên Địa Pháp Tắc"
 * 2. User đã độ kiếp thành công mang cảnh giới "Chí Tôn Cực Đạo"
 * 3. Người dùng bình thường tính toán chính xác theo EXP qua getRankByExp()
 */
function getResolvedUserRank(u) {
    if (!u) return RANK_LEVELS[0];

    // Quyền lực tuyệt đối của Admin: Thiên Địa Pháp Tắc
    const isAdm = (u.role && u.role.toLowerCase() === 'admin') || (u.username && u.username.toLowerCase() === 'admin') || !!u.isRoot;
    if (isAdm) {
        return ADMIN_RANK;
    }

    // Kiểm tra Cảnh giới sau khi Nghịch Thiên Độ Kiếp: Chí Tôn Cực Đạo (Cấp 7)
    const isAscended = !!(u.isAscended === true || u.isAscended === 'true' ||
                          u.level === 7 || u.level === '7' || 
                          (typeof u.rank === 'string' && (u.rank.toLowerCase().includes('cực đạo') || u.rank.toLowerCase() === 'chitoncucdao')) ||
                          (u.rank && typeof u.rank === 'object' && (u.rank.level === 7 || (u.rank.name && u.rank.name.toLowerCase().includes('cực đạo')))));

    // Người dùng bình thường: Luôn tính toán Cấp độ trực tiếp từ số EXP, cap ở Cấp 6 nếu chưa độ kiếp
    const exp = getUserExp(u.username, u);
    return getRankByExp(exp, isAscended);
}


/**
 * Lấy danh sách lịch sử thi/làm bài của người dùng từ object u hoặc localStorage
 */
function getUserHistoryList(u) {
    if (!u) return [];
    let history = [];
    if (u.history) {
        if (Array.isArray(u.history)) {
            history = u.history;
        } else if (typeof u.history === 'object') {
            history = Object.values(u.history);
        }
    }
    if (history.length === 0) {
        const uid = u.userId || ('u_' + (u.username || '').toLowerCase());
        const raw = localStorage.getItem('history_' + uid) || (u.username ? localStorage.getItem('history_' + u.username) : null);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) history = parsed;
                else if (typeof parsed === 'object') history = Object.values(parsed);
            } catch (e) {}
        }
    }
    return history.filter(item => item && typeof item === 'object');
}

/**
 * Tính toán tiến độ học tập: đếm tổng số lượt ôn tập và số lần thi mô phỏng
 */
function getUserProgressSummary(u) {
    const history = getUserHistoryList(u);
    let mockCount = 0;
    let practiceCount = 0;

    history.forEach(item => {
        const tId = (item.topicId !== undefined && item.topicId !== null) ? String(item.topicId).toLowerCase() : '';
        const tName = (item.topicName || '').toLowerCase();
        const isMock = tId === 'mock' || tName.includes('mô phỏng') || item.isMockExam;
        if (isMock) {
            mockCount++;
        } else {
            practiceCount++;
        }
    });

    // Nếu user chưa có lịch sử làm bài dạng bản ghi nhưng có progress ở các chủ đề
    if (practiceCount === 0 && u.progress && typeof u.progress === 'object') {
        const progKeys = Object.keys(u.progress);
        let completedTopics = 0;
        progKeys.forEach(k => {
            if (Number(u.progress[k]) > 0) completedTopics++;
        });
        if (completedTopics > 0) {
            practiceCount = completedTopics;
        }
    }

    return { practiceCount, mockCount, history };
}

/**
 * Render cấu trúc chuẩn HTML cho Khung Avatar PNG trong suốt (.avatar-wrapper .rank-X)
 * @param {number} level - Cấp độ 1..6
 * @param {string} username - Tên người dùng hiển thị chữ cái đại diện
 * @param {object} options - { isMini, title, imgSrc }
 */
function renderRankContainerHtml(level, username, options = {}) {
    const safeLevel = Math.max(1, Math.min(6, parseInt(level, 10) || 1));
    const initial = (username && typeof username === 'string') ? username.charAt(0).toUpperCase() : 'U';
    const isMini = !!options.isMini;
    const miniClass = isMini ? ' avatar-mini' : ' avatar-large';
    const titleAttr = options.title ? ` title="${options.title}"` : '';
    const innerContent = options.imgSrc
        ? `<img src="${options.imgSrc}" alt="avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
        : initial;

    return `<div class="avatar-wrapper rank-${safeLevel}${miniClass}"${titleAttr}>${innerContent}</div>`;
}

/**
 * Chuẩn hóa Khung viền Avatar (Universal Avatar Frame)
 * Dù user ở Cảnh giới nào (từ Phàm cảnh đến Chí Tôn Cực Đạo, hay Admin),
 * avatar luôn phải được bọc trong một Wrapper chuẩn:
 * <div class="relative flex items-center justify-center w-10 h-10 md:w-12 md:h-12">
 *   <img src="...avatar..." class="rounded-full..." />
 *   <img src="...avatar-frame.png..." class="absolute inset-0 w-full h-full pointer-events-none z-10 scale-110" />
 * </div>
 */
function renderUniversalAvatarHtml(u, rankLevel, isAdm) {
    if (!u) u = {};
    const username = u.username || u.displayName || 'User';
    const initialChar = username.charAt(0).toUpperCase();
    const photoURL = u.photoURL;

    const isGoogleUser = (username && (username.toLowerCase().includes('google') || username.startsWith('User_Google'))) ||
                         (photoURL && (photoURL.includes('googleusercontent') || photoURL.includes('google'))) ||
                         (u.email && u.email.includes('@') && photoURL);

    let frameImgSrc = 'images/frame-1.png';
    let glowClass = '';

    if (isAdm) {
        frameImgSrc = 'images/frame-6.png';
        glowClass = 'avatar-frame-glow-admin';
    } else if (isGoogleUser) {
        frameImgSrc = 'images/avatar-frame-cyan.png';
        glowClass = 'avatar-frame-glow-google';
    } else {
        const lvl = Math.min(6, Math.max(1, parseInt(rankLevel, 10) || 1));
        frameImgSrc = `images/frame-${lvl}.png`;
        glowClass = `avatar-frame-glow-rank-${lvl}`;
    }

    const fallbackSvg = "data:image/svg+xml," + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#1e293b"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="sans-serif" font-weight="800" font-size="28">${initialChar}</text></svg>`
    );
    const defaultAvatar = isAdm ? 'images/avatars/avatar_m1.jpg' : fallbackSvg;
    const avatarUrl = (photoURL && photoURL.trim()) ? photoURL.trim() : defaultAvatar;

    return `
        <div class="relative flex items-center justify-center w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-full bg-gray-800" style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; flex-shrink: 0; border-radius: 9999px; background-color: #1f2937;" title="${isAdm ? 'Thiên Địa Pháp Tắc' : `Cấp ${rankLevel}`}">
            <!-- 1. Ảnh Avatar hoặc Chữ cái -->
            <img src="${escapeHtml(avatarUrl)}" alt="Avatar" class="w-full h-full rounded-full object-cover z-0" style="width: 100%; height: 100%; border-radius: 9999px; object-fit: cover; z-index: 0;" onerror="this.onerror=null; this.src='${fallbackSvg}';" />
            
            <!-- 2. Khung viền rồng (Frame) -->
            <img src="${frameImgSrc}" alt="Frame" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[135%] h-[135%] max-w-none object-contain pointer-events-none z-10 ${glowClass}" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 135%; height: 135%; max-width: none; object-fit: contain; pointer-events: none; z-index: 10;" onerror="this.style.display='none'" />
        </div>
    `.trim();
}

function updateAdminHeaderInfo() {
    const userStr = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    if (!userStr) return;
    try {
        const user = JSON.parse(userStr);
        const nameEl = document.getElementById('admin-user-display-name');
        if (nameEl && user.username) {
            nameEl.textContent = user.username;
        }

        const isAdm = (user.role && user.role.toLowerCase() === 'admin') || (user.username && user.username.toLowerCase() === 'admin') || user.isRoot;
        const exp = isAdm ? Infinity : getUserExp(user.username, user);
        const rank = isAdm ? ADMIN_RANK : getRankByExp(exp);
        const rankLevel = rank.level;

        // Cập nhật huy hiệu cấp độ cạnh tên Admin trên Header
        const pill = document.getElementById('user-pill');
        if (pill) {
            let badgeEl = pill.querySelector('.header-user-rank-badge');
            if (!badgeEl && nameEl && nameEl.parentNode) {
                badgeEl = document.createElement('span');
                badgeEl.className = 'header-user-rank-badge';
                nameEl.parentNode.insertBefore(badgeEl, nameEl.nextSibling);
            }
            if (badgeEl) {
                if (isAdm) {
                    badgeEl.className = 'header-user-rank-badge rank-thien-dia-phap-tac bg-gradient-to-r from-red-600 to-yellow-500 text-white animate-pulse font-bold shadow-[0_0_15px_rgba(239,68,68,0.8)]';
                    badgeEl.innerHTML = `<i class="fa-solid fa-yin-yang fa-spin" style="--fa-animation-duration: 6s;"></i> <span>Thiên Địa Pháp Tắc</span>`;
                    badgeEl.title = `Cảnh giới: Thiên Địa Pháp Tắc (∞ Bất Tử Bất Diệt)`;
                } else {
                    badgeEl.className = `header-user-rank-badge ${rank.badgeClass}`;
                    badgeEl.innerHTML = `<i class="${rank.icon}"></i> <span>${rank.name}</span>`;
                    badgeEl.title = `Cấp ${rank.level}: ${rank.name} (${exp} EXP)`;
                }
            }
        }

        // Cập nhật Khung Avatar PNG thu nhỏ trên Header Admin
        const frameEl = document.getElementById('header-avatar-frame');
        if (frameEl) {
            const initial = (user.username) ? user.username.charAt(0).toUpperCase() : 'A';
            frameEl.className = isAdm ? `avatar-wrapper rank-6 avatar-mini` : `avatar-wrapper rank-${rankLevel} avatar-mini`;
            frameEl.textContent = initial;
            frameEl.title = isAdm ? `Thiên Địa Pháp Tắc (∞ Bất Tử Bất Diệt)` : `Cấp ${rank.level}: ${rank.name} (${exp} EXP)`;
        }
    } catch (e) {
        console.warn(e);
    }
}

/**
 * Định dạng thời gian hoạt động tương đối (Hoạt động X phút/giờ trước)
 * @param {number|string} timestamp Thời điểm hoạt động cuối cùng
 */
function formatLastActiveTime(timestamp) {
    if (!timestamp) return 'Chưa có hoạt động';
    const now = Date.now();
    const diffMs = now - Number(timestamp);
    if (diffMs < 0 || isNaN(diffMs)) return 'Vừa mới đây';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Vừa mới đây';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Hoạt động ${diffMin} phút trước`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Hoạt động ${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `Hoạt động ${diffDays} ngày trước`;
    return 'Hoạt động lâu trước đây';
}

/**
 * Render bảng danh sách tài khoản
 */
function renderUserTable(searchKeyword = '') {
    const tbody = document.querySelector('#userTableBody') || document.getElementById('user-table-body');
    const countBadge = document.getElementById('total-users-count');
    if (!tbody) return;

    // BẮT BUỘC: Dọn dẹp nội dung cũ trước khi render danh sách (Clear before Render / Append)
    tbody.innerHTML = '';

    // Thu thập và sắp xếp: ưu tiên status === 'online' trước, sau đó theo vần A-Z của username (localeCompare)
    let users = sortUsers(cleanAndFilterUsers(getUserList()));

    // Cập nhật thống kê số lượng Online / Offline lên Thẻ (Card) và Badge
    const onlineCount = users.filter(u => u.status === 'online').length;
    const offlineCount = users.length - onlineCount;

    const statOnlineCard = document.getElementById('stat-online-card');
    const statOfflineCard = document.getElementById('stat-offline-card');
    if (statOnlineCard) statOnlineCard.innerHTML = `🟢 Đang Online: <span id="online-users-count">${onlineCount}</span> tài khoản`;
    if (statOfflineCard) statOfflineCard.innerHTML = `⚪ Đang Offline: <span id="offline-users-count">${offlineCount}</span> tài khoản`;

    const onlineCountEl = document.getElementById('online-users-count');
    const offlineCountEl = document.getElementById('offline-users-count');
    if (onlineCountEl) onlineCountEl.textContent = onlineCount;
    if (offlineCountEl) offlineCountEl.textContent = offlineCount;

    if (countBadge) {
        countBadge.textContent = users.length;
    }
    const badgeUsers = document.getElementById('badge-users-count');
    if (badgeUsers) {
        badgeUsers.textContent = users.length;
    }

    if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase().trim();
        users = users.filter(u => (u.username && u.username.toLowerCase().includes(kw)) || (u.role && u.role.toLowerCase().includes(kw)));
    }

    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 30px; color: #94a3b8; font-size: 13.5px;">
                    <i class="fa-solid fa-user-slash" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
                    Không tìm thấy tài khoản nào phù hợp.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = users.map((u, idx) => {
        const userId = u.userId || ('u_' + (u.username || '').toLowerCase());
        const isRootAdmin = u.isRoot || (u.username && u.username.toLowerCase() === 'admin');
        const roleLabel = u.role === 'admin' ? 'Admin' : 'User';
        const roleClass = u.role === 'admin' ? 'role-admin' : 'role-user';
        const roleIcon = u.role === 'admin' ? 'fa-shield-halved' : 'fa-user';

        // Xác định chính xác cấp độ (Rank / Level)
        const userRank = getResolvedUserRank(u);
        const rankLevel = userRank.level;

        // Nhận diện tài khoản Google (User_Google hoặc user đăng nhập Google)
        const isGoogleUser = (u.username && (u.username.toLowerCase().includes('google') || u.username.startsWith('User_Google'))) ||
                             (u.photoURL && (u.photoURL.includes('googleusercontent') || u.photoURL.includes('google'))) ||
                             (u.email && u.email.includes('@') && u.photoURL);


        // Trạng thái hoạt động Online / Offline (Tách thành cột riêng)
        const isOnline = u.status === 'online';
        const statusHtml = isOnline
            ? `<div class="user-activity-status flex items-center gap-2" title="Đang trực tuyến">
                   <span class="status-indicator-dot online"></span>
                   <span class="status-indicator-text online text-xs font-semibold">Online</span>
               </div>`
            : `<div class="user-activity-status flex items-center gap-2" title="${u.lastActive ? new Date(u.lastActive).toLocaleString('vi-VN') : 'Chưa có hoạt động'}">
                   <span class="status-indicator-dot offline"></span>
                   <span class="status-indicator-text offline text-xs font-medium">${formatLastActiveTime(u.lastActive)}</span>
               </div>`;

        const isUserAdmin = (u.role && u.role.toLowerCase() === 'admin') || (u.username && u.username.toLowerCase() === 'admin') || isRootAdmin;

        // Tính toán Tiến độ: Nếu là Admin, ghi đè thành chuỗi "Vạn Kiếp Luân Hồi", ngược lại đếm "Số lượt ôn tập" và "Số lần thi mô phỏng"
        let progressCellHtml = '';
        if (isUserAdmin) {
            progressCellHtml = `
                <div class="van-kiep-luan-hoi-badge" title="Tiến trình vô tận: Vạn Kiếp Luân Hồi">
                    <i class="fa-solid fa-infinity" style="color: #f59e0b; font-size: 13px;"></i>
                    <span>Vạn Kiếp Luân Hồi</span>
                </div>
            `;
        } else {
            const { practiceCount, mockCount } = getUserProgressSummary(u);
            progressCellHtml = `
                <button type="button" class="btn-progress-detail" onclick="openStatsDetailModal('${escapeHtml(userId)}')" title="Bấm để xem chi tiết 6 chủ đề của ${escapeHtml(u.username)}">
                    <i class="fa-solid fa-chart-line" style="font-size: 11px;"></i>
                    <span>Ôn tập: ${practiceCount} | Thi: ${mockCount}</span>
                </button>
            `;
        }

        // Cột Mật khẩu: Root Admin được bảo vệ ([Đã mã hóa]), các User khác có nút mắt xem/ẩn
        const passwordCellHtml = isRootAdmin
            ? `<div class="user-pwd-wrapper">
                   <span class="user-pwd-encrypted" title="Mật khẩu của Root Admin được bảo mật">
                       <i class="fa-solid fa-shield-halved" style="font-size: 11px; margin-right: 4px; color: #2563eb;"></i>[Đã mã hóa]
                   </span>
               </div>`
            : `<div class="user-pwd-wrapper">
                   <span class="user-pwd-display">••••••••</span>
                   <i class="fas fa-eye user-pwd-eye cursor-pointer text-gray-500 hover:text-blue-500" onclick="toggleTablePassword(this)" data-pwd="${escapeHtml(u.password || '')}" title="Xem mật khẩu"></i>
               </div>`;

        // Badge Cấp độ: Admin hiển thị độc quyền "Thiên Địa Pháp Tắc" cực kỳ nổi bật
        const rankBadgeHtml = isUserAdmin
            ? `<span class="user-rank-badge rank-thien-dia-phap-tac bg-gradient-to-r from-red-600 to-yellow-500 text-white animate-pulse font-bold shadow-[0_0_15px_rgba(239,68,68,0.8)]" style="display: inline-flex; align-items: center; gap: 5px; padding: 2px 9px; border-radius: 9999px; font-size: 11px; font-weight: 800; background: linear-gradient(90deg, #dc2626 0%, #f59e0b 100%); color: #ffffff; box-shadow: 0 0 15px rgba(239, 68, 68, 0.8); border: 1px solid #fde047; white-space: nowrap;">
                   <i class="fa-solid fa-yin-yang fa-spin" style="--fa-animation-duration: 6s; font-size: 10px;"></i>
                   <span>Thiên Địa Pháp Tắc</span>
               </span>`
            : `<span class="user-rank-badge ${userRank.badgeClass}" style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background-color: ${userRank.bgColor}; color: ${userRank.textColor}; border: 1px solid ${userRank.borderColor}; white-space: nowrap;">
                   <i class="${userRank.icon}" style="font-size: 10px;"></i>
                   <span>${userRank.displayName || userRank.name}</span>
               </span>`;

        let actionsHtml = '';
        if (isUserAdmin) {
            actionsHtml = `
                <div class="action-buttons-group flex items-center justify-center gap-1.5 whitespace-nowrap">
                    <button type="button" class="btn-action btn-edit-pwd px-2 py-1 text-xs whitespace-nowrap font-medium" onclick="openEditPasswordModal('${escapeHtml(userId)}')" title="Cải biến khẩu quyết cho ${escapeHtml(u.displayName || u.username)}" style="padding: 4px 8px; font-size: 11.5px; border-radius: 6px;">
                        <i class="fa-solid fa-key text-[10px]"></i>
                        <span>Cải Biến Khẩu Quyết</span>
                    </button>
                    ${isRootAdmin ? `
                        <span class="text-[11px] text-slate-400 font-semibold px-2 py-1 bg-slate-100 rounded border border-slate-200" title="Tài khoản Admin gốc mặc định bảo vệ">[Mặc định]</span>
                    ` : `
                        <button type="button" class="btn-action btn-edit-name px-2 py-1 text-xs whitespace-nowrap font-medium" onclick="banTangDaoHieu('${escapeHtml(userId)}')" title="Ban tặng Đạo Hiệu cho ${escapeHtml(u.displayName || u.username)}" style="padding: 4px 8px; font-size: 11.5px; border-radius: 6px;">
                            <i class="fa-solid fa-wand-magic-sparkles text-[10px]"></i>
                            <span>Ban Tặng Đạo Hiệu</span>
                        </button>
                        <button type="button" class="btn-action btn-delete px-2 py-1 text-xs whitespace-nowrap font-medium" onclick="handleDeleteUser('${escapeHtml(userId)}')" title="Trục xuất ${escapeHtml(u.displayName || u.username)} khỏi tông môn" style="padding: 4px 8px; font-size: 11.5px; border-radius: 6px;">
                            <i class="fa-solid fa-trash-can text-[10px]"></i>
                            <span>Trục Xuất Tông Môn</span>
                        </button>
                    `}
                </div>
            `;
        } else {
            actionsHtml = `
                <div class="action-buttons-group flex items-center justify-center gap-1.5 whitespace-nowrap">
                    <button type="button" class="btn-action btn-buff-exp px-2 py-1 text-xs whitespace-nowrap font-bold" onclick="openBuffExpModal('${escapeHtml(userId)}')" title="Ban tạo hóa buff EXP cho ${escapeHtml(u.displayName || u.username)}" style="background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); color: #ffffff; border: 1px solid #f97316; box-shadow: 0 1px 4px rgba(245, 158, 11, 0.35); display: inline-flex; align-items: center; gap: 4px; padding: 4px 9px; border-radius: 6px; font-size: 11.5px; cursor: pointer;">
                        <i class="fa-solid fa-wand-magic-sparkles text-[10px]"></i>
                        <span>✨ Ban Tạo Hóa</span>
                    </button>
                    <div class="admin-dropdown-wrapper relative inline-block text-left">
                        <button type="button" class="btn-action btn-than-thong px-2 py-1 text-xs whitespace-nowrap font-semibold" onclick="toggleAdminDropdown('${escapeHtml(userId)}', event)" title="Thần Thông Chưởng Quản" style="background: #1e293b; color: #f8fafc; border: 1px solid #475569; display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px; font-size: 11.5px; cursor: pointer;">
                            <i class="fa-solid fa-gear text-[10px]"></i>
                            <span>⚙️ Thần Thông</span>
                            <i class="fa-solid fa-chevron-down text-[9px] ml-0.5"></i>
                        </button>
                        <div id="admin-dropdown-${escapeHtml(userId)}" class="admin-dropdown-menu">
                            <button type="button" class="admin-dropdown-item" onclick="openThienKiepModal('${escapeHtml(userId)}'); closeAllAdminDropdowns();" style="color: #dc2626;">
                                <i class="fa-solid fa-bolt-lightning" style="width: 14px; color: #dc2626;"></i>
                                <span>⚡ Giáng Thiên Kiếp</span>
                            </button>
                            <button type="button" class="admin-dropdown-item" onclick="pheBoTuVi('${escapeHtml(userId)}'); closeAllAdminDropdowns();" style="color: #ea580c;">
                                <i class="fa-solid fa-fire" style="width: 14px; color: #ea580c;"></i>
                                <span>🔥 Phế Bỏ Tu Vi</span>
                            </button>
                            <button type="button" class="admin-dropdown-item" onclick="toggleBanUser('${escapeHtml(userId)}'); closeAllAdminDropdowns();" style="color: #475569;">
                                <i class="fa-solid ${u.banned ? 'fa-unlock' : 'fa-link'}" style="width: 14px; color: #475569;"></i>
                                <span>${u.banned ? '🔓 Đại Xá Hắc Lao' : '⛓️ Đả Nhập Hắc Lao'}</span>
                            </button>
                            <div style="height: 1px; background: #e2e8f0; margin: 4px 0;"></div>
                            <button type="button" class="admin-dropdown-item" onclick="openEditPasswordModal('${escapeHtml(userId)}'); closeAllAdminDropdowns();" style="color: #2563eb;">
                                <i class="fa-solid fa-key" style="width: 14px; color: #2563eb;"></i>
                                <span>🔑 Cải Biến Khẩu Quyết</span>
                            </button>
                            <button type="button" class="admin-dropdown-item" onclick="banTangDaoHieu('${escapeHtml(userId)}'); closeAllAdminDropdowns();" style="color: #059669;">
                                <i class="fa-solid fa-wand-magic-sparkles" style="width: 14px; color: #059669;"></i>
                                <span>✨ Ban Tặng Đạo Hiệu</span>
                            </button>
                            <div style="height: 1px; background: #e2e8f0; margin: 4px 0;"></div>
                            <button type="button" class="admin-dropdown-item" onclick="handleDeleteUser('${escapeHtml(userId)}'); closeAllAdminDropdowns();" style="color: #ef4444;">
                                <i class="fa-solid fa-trash-can" style="width: 14px; color: #ef4444;"></i>
                                <span>🗑️ Trục Xuất Tông Môn</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        const displayTitle = u.displayName || u.username;
        const hasCustomTitle = u.displayName && u.displayName !== u.username;

        return `
            <tr>
                <td class="whitespace-nowrap px-3 py-2 text-sm" style="text-align: center; font-weight: 600; color: #64748b;">${idx + 1}</td>
                <td class="whitespace-nowrap px-3 py-2 text-sm">
                    <div class="user-row-name" style="display: flex; align-items: center; gap: 10px;">
                        <!-- Universal Avatar Frame Wrapper chuẩn -->
                        ${renderUniversalAvatarHtml(u, rankLevel, isUserAdmin)}

                        <!-- Cột Tên Đạo Hiệu / Lệnh bài và Badge cấp độ bên cạnh -->
                        <div style="display: flex; flex-direction: column; gap: 2px;">
                            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                <strong style="color: #1e293b; font-size: 14px; font-weight: 700;" title="Đạo Hiệu: ${escapeHtml(displayTitle)} (Lệnh bài: ${escapeHtml(u.username)})">${escapeHtml(displayTitle)}</strong>
                                ${hasCustomTitle ? `<span class="text-xs text-slate-400 font-normal">(@${escapeHtml(u.username)})</span>` : ''}
                                ${isRootAdmin ? '<span class="root-badge"><i class="fa-solid fa-crown" style="font-size: 9px;"></i> Root Admin</span>' : ''}
                                ${u.banned ? '<span class="badge-hac-lao" title="Đang bị giam giữ tại Hắc Lao"><i class="fa-solid fa-link"></i> Hắc Lao</span>' : ''}
                                ${rankBadgeHtml}
                            </div>
                            ${(isGoogleUser && u.email) ? `<div style="font-size: 10.5px; color: #64748b; line-height: 1;"><i class="fa-solid fa-envelope" style="font-size: 9px; margin-right: 3px;"></i>${escapeHtml(u.email)}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td class="whitespace-nowrap px-3 py-2 text-sm">
                    ${statusHtml}
                </td>
                <td class="whitespace-nowrap px-3 py-2 text-sm">
                    ${progressCellHtml}
                </td>
                <td class="whitespace-nowrap px-3 py-2 text-sm">
                    ${passwordCellHtml}
                </td>
                <td class="whitespace-nowrap px-3 py-2 text-sm">
                    <span class="role-badge ${roleClass}">
                        <i class="fa-solid ${roleIcon}"></i>
                        <span>${roleLabel}</span>
                    </span>
                </td>
                <td class="whitespace-nowrap px-3 py-2 text-sm" style="color: #64748b; font-size: 12px;">
                    <i class="fa-regular fa-calendar" style="margin-right: 4px; font-size: 10.5px;"></i>
                    ${u.createdAt || '08/10/2026'}
                </td>
                <td class="whitespace-nowrap px-3 py-2 text-sm" style="text-align: center;">
                    ${actionsHtml}
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Mở Modal chi tiết tiến độ 6 chủ đề của học viên (statsDetailModal)
 * @param {string} userIdOrName UID hoặc username
 */
function openStatsDetailModal(userIdOrName) {
    const modal = document.getElementById('statsDetailModal');
    if (!modal) return;

    const users = getUserList();
    const user = users.find(u => 
        u.userId === userIdOrName || 
        ('u_' + (u.username || '').toLowerCase()) === userIdOrName || 
        (u.username && u.username.toLowerCase() === userIdOrName.toLowerCase())
    );

    if (!user) {
        showToast('Không tìm thấy tài khoản người dùng!', 'error');
        return;
    }

    const modalTitle = document.getElementById('statsDetailModalTitle');
    const modalSubtitle = document.getElementById('statsDetailModalSubtitle');
    const modalBody = document.getElementById('statsDetailModalBody');

    const userRank = getResolvedUserRank(user);
    const { practiceCount, mockCount, history } = getUserProgressSummary(user);

    if (modalTitle) {
        modalTitle.textContent = `Tiến độ học tập: ${user.username}`;
    }
    if (modalSubtitle) {
        modalSubtitle.innerHTML = `Cấp độ: <span style="color: ${userRank.color}; font-weight: 700;">${userRank.displayName || userRank.name}</span> | Ôn tập: <strong>${practiceCount}</strong> lượt | Thi mô phỏng: <strong>${mockCount}</strong> lần`;
    }

    // 6 Chủ đề chuẩn của học phần
    const topics = [
        { id: 1, title: "Chủ đề 1", name: "Đối tượng, chức năng, phương pháp nghiên cứu của CNXH khoa học" },
        { id: 2, title: "Chủ đề 2", name: "Sự ra đời và phát triển của CNXH khoa học" },
        { id: 3, title: "Chủ đề 3", name: "Sứ mệnh lịch sử của giai cấp công nhân" },
        { id: 4, title: "Chủ đề 4", name: "Những đặc trưng cơ bản của CNXH và con đường đi lên CNXH ở Việt Nam" },
        { id: 5, title: "Chủ đề 5", name: "Các hình thái kinh tế - xã hội" },
        { id: 6, title: "Chủ đề 6", name: "Thời kỳ quá độ lên CNXH" }
    ];

    if (modalBody) {
        modalBody.innerHTML = topics.map(t => {
            const topicHistory = history.filter(h => {
                const hId = String(h.topicId !== undefined && h.topicId !== null ? h.topicId : '').toLowerCase();
                const hName = (h.topicName || '').toLowerCase();
                return hId === String(t.id) || 
                       hId === ('topic_' + t.id) || 
                       hId === ('topic' + t.id) || 
                       hName.includes('chủ đề ' + t.id) || 
                       hName.includes('chu de ' + t.id);
            });

            const topicAttempts = topicHistory.length;
            let totalCorrect = 0;
            let totalQuestions = 0;
            let bestScore = 0;

            topicHistory.forEach(h => {
                const c = parseInt(h.correctCount, 10) || 0;
                const tot = parseInt(h.totalQuestions, 10) || 0;
                const sc = parseFloat(h.score) || 0;
                totalCorrect += c;
                totalQuestions += tot;
                if (sc > bestScore) bestScore = sc;
            });

            let directProgress = 0;
            if (user.progress && typeof user.progress === 'object') {
                const pVal = user.progress[t.id] || user.progress['topic' + t.id] || user.progress['topic_' + t.id];
                if (pVal !== undefined && pVal !== null) {
                    directProgress = parseInt(pVal, 10) || 0;
                }
            }

            const totalIncorrect = Math.max(0, totalQuestions - totalCorrect);
            const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

            return `
                <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-300 transition-all" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 12px;">
                    <div class="flex items-center justify-between mb-2" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                        <div class="flex items-center gap-2" style="display: flex; align-items: center; gap: 8px;">
                            <span class="px-2.5 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 rounded-full" style="padding: 2px 10px; font-size: 11px; font-weight: 700; background: #dbeafe; color: #1d4ed8; border-radius: 9999px;">
                                ${t.title}
                            </span>
                            <span class="text-sm font-semibold text-slate-800" style="font-size: 13.5px; font-weight: 600; color: #1e293b;">
                                ${t.name}
                            </span>
                        </div>
                        <span class="text-xs font-bold px-2 py-0.5 rounded" style="font-size: 11.5px; font-weight: 700; padding: 2px 8px; border-radius: 6px; ${topicAttempts > 0 ? 'background: #dcfce7; color: #15803d;' : 'background: #f1f5f9; color: #64748b;'}">
                            ${topicAttempts} lượt làm
                        </span>
                    </div>

                    <div class="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200 text-xs" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 12px;">
                        <div style="color: #16a34a; font-weight: 600;">
                            <i class="fa-solid fa-circle-check" style="margin-right: 4px;"></i> Số câu đúng: <strong>${totalCorrect}</strong>
                        </div>
                        <div style="color: #dc2626; font-weight: 600;">
                            <i class="fa-solid fa-circle-xmark" style="margin-right: 4px;"></i> Số câu sai: <strong>${totalIncorrect}</strong>
                        </div>
                        <div style="color: #2563eb; font-weight: 600; text-align: right;">
                            <i class="fa-solid fa-bullseye" style="margin-right: 4px;"></i> Tỉ lệ đúng: <strong>${accuracy}%</strong> ${topicAttempts > 0 ? `(Cao nhất: ${bestScore}/10)` : (directProgress > 0 ? `(${directProgress} câu)` : '')}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

/**
 * Đóng Modal chi tiết thống kê 6 chủ đề
 */
function closeStatsDetailModal() {
    const modal = document.getElementById('statsDetailModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}
window.openStatsDetailModal = openStatsDetailModal;
window.closeStatsDetailModal = closeStatsDetailModal;

let currentBuffTargetUser = null;

/**
 * Mở Modal "Ban phát Cơ duyên" (Ban tạo hóa buff EXP) cho học viên
 */
function openBuffExpModal(userIdOrName) {
    if (!userIdOrName) return;
    const users = getUserList();
    const user = users.find(u => 
        u.userId === userIdOrName || 
        ('u_' + (u.username || '').toLowerCase()) === userIdOrName ||
        (u.username && u.username.toLowerCase() === userIdOrName.toLowerCase())
    );
    if (!user) {
        showToast('Không tìm thấy tài khoản người dùng!', 'error');
        return;
    }

    currentBuffTargetUser = user;
    const modal = document.getElementById('buffExpModal');
    if (!modal) return;

    const subtitleEl = document.getElementById('buffExpModalSubtitle');
    const targetInfoEl = document.getElementById('buffExpTargetInfo');

    const curExp = getUserExp(user.username, user);
    const userRank = getResolvedUserRank(user);
    const initialChar = (user.username || 'U').charAt(0).toUpperCase();

    if (subtitleEl) {
        subtitleEl.textContent = `Ban phát cơ duyên cho đệ tử: ${user.username}`;
    }

    if (targetInfoEl) {
        targetInfoEl.innerHTML = `
            <div class="flex items-center gap-3" style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 38px; height: 38px; border-radius: 50%; background: #1e293b; border: 2px solid ${userRank.borderColor || '#3b82f6'}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; color: #fff; overflow: hidden;">
                    ${user.photoURL ? `<img src="${escapeHtml(user.photoURL)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.parentElement.innerText='${initialChar}';">` : initialChar}
                </div>
                <div>
                    <div class="flex items-center gap-2" style="display: flex; align-items: center; gap: 8px;">
                        <strong class="text-white text-sm md:text-base font-bold">${escapeHtml(user.username)}</strong>
                        <span class="user-rank-badge ${userRank.badgeClass}" style="display: inline-flex; align-items: center; gap: 4px; padding: 1px 8px; border-radius: 9999px; font-size: 10.5px; font-weight: 600; background-color: ${userRank.bgColor}; color: ${userRank.textColor}; border: 1px solid ${userRank.borderColor};">
                            <i class="${userRank.icon}" style="font-size: 9.5px;"></i>
                            <span>${userRank.displayName || userRank.name} (Cấp ${userRank.level})</span>
                        </span>
                    </div>
                    <div class="text-xs text-slate-400 mt-0.5" style="font-size: 11.5px; color: #94a3b8;">
                        UID: <span class="font-mono text-slate-300">${escapeHtml(user.userId || 'N/A')}</span>
                    </div>
                </div>
            </div>
            <div style="text-align: right;">
                <div class="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Tu vi hiện tại</div>
                <div class="text-amber-400 font-black text-base md:text-lg flex items-center justify-end gap-1.5" style="color: #f59e0b; font-weight: 900;">
                    <i class="fa-solid fa-bolt text-xs text-amber-400"></i>
                    <span>${curExp.toLocaleString('vi-VN')} EXP</span>
                </div>
            </div>
        `;
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

/**
 * Đóng Modal "Ban phát Cơ duyên"
 */
function closeBuffExpModal() {
    const modal = document.getElementById('buffExpModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    currentBuffTargetUser = null;
}

/**
 * Thực hiện "Ban tạo hóa" buff EXP trực tiếp cho tài khoản:
 * 1. Lấy EXP hiện tại + mức buff.
 * 2. Tính toán lại Cấp độ (Rank) để tự động thăng cấp nếu đủ điều kiện.
 * 3. Update thẳng lên Firebase Realtime Database (users/{userId}).
 * 4. Hiển thị thông báo: "Đã ban tạo hóa thành công! Đạo hữu này vừa nhận thêm tu vi."
 */
async function executeBuffExp(amount, buffName) {
    if (!currentBuffTargetUser) return;
    const target = currentBuffTargetUser;
    const targetUid = target.userId;
    if (!targetUid) {
        showToast('Không xác định được UID của tài khoản!', 'error');
        return;
    }

    try {
        const currentExp = getUserExp(target.username, target);
        const newExp = currentExp + amount;

        // Tính toán lại Cấp độ (Rank) dựa trên số EXP mới (chỉ Cấp 7 nếu isCucDao/isAscended)
        const isCucDao = !!(target.isAscended === true || target.isAscended === 'true' || target.level === 7 || (target.rank && typeof target.rank === 'string' && target.rank.toLowerCase().includes('cực đạo')));
        const newRank = getRankByExp(newExp, isCucDao);
        const newLevel = newRank.level || 1;
        const newRankName = newRank.name || 'PHÀM CẢNH';

        const updateData = {
            exp: newExp,
            level: newLevel,
            rank: newRankName,
            rankId: newRank.id || 'gamo',
            updatedAt: Date.now()
        };

        // 1. Update thẳng lên Firebase Realtime Database (users/{userId})
        if (window.update && window.ref && window.db) {
            await update(ref(db, `users/${targetUid}`), updateData);
        } else if (window.FirebaseService && typeof FirebaseService.updateUserStats === 'function') {
            await FirebaseService.updateUserStats(targetUid, updateData);
        }

        // 2. Cập nhật localStorage tương ứng
        localStorage.setItem('exp_' + targetUid, newExp.toString());
        if (target.username) {
            localStorage.setItem('exp_' + target.username, newExp.toString());
        }

        // 3. Cập nhật đối tượng user trong bộ nhớ admin
        target.exp = newExp;
        target.level = newLevel;
        target.rank = newRankName;
        target.rankId = newRank.id;

        const cachedIdx = adminUsersList.findIndex(u => u.userId === targetUid);
        if (cachedIdx !== -1) {
            adminUsersList[cachedIdx].exp = newExp;
            adminUsersList[cachedIdx].level = newLevel;
            adminUsersList[cachedIdx].rank = newRankName;
            adminUsersList[cachedIdx].rankId = newRank.id;
        }

        // 4. Đóng modal và render lại bảng quản lý
        closeBuffExpModal();
        renderUserTable();

        // 5. Hiển thị thông báo đúng chuẩn yêu cầu
        const successMsg = 'Đã ban tạo hóa thành công! Đạo hữu này vừa nhận thêm tu vi.';
        showToast(successMsg, 'success');
        console.log(`[Admin] Ban tạo hóa (${buffName} +${amount} EXP) cho ${target.username}. EXP mới: ${newExp}, Cấp độ mới: Cấp ${newLevel} (${newRankName})`);
    } catch (err) {
        console.error('[Admin] Lỗi khi ban tạo hóa:', err);
        showToast(`Lỗi khi ban tạo hóa: ${err.message || err}`, 'error');
    }
}
window.openBuffExpModal = openBuffExpModal;
window.closeBuffExpModal = closeBuffExpModal;
window.executeBuffExp = executeBuffExp;

let currentThienKiepTargetUser = null;

/**
 * Mở Modal "Giáng hạ Lôi Kiếp" (Giáng Thiên Kiếp trừ EXP) cho học viên
 */
function openThienKiepModal(userIdOrName) {
    if (!userIdOrName) return;
    const users = getUserList();
    const user = users.find(u => 
        u.userId === userIdOrName || 
        ('u_' + (u.username || '').toLowerCase()) === userIdOrName ||
        (u.username && u.username.toLowerCase() === userIdOrName.toLowerCase())
    );
    if (!user) {
        showToast('Không tìm thấy tài khoản người dùng!', 'error');
        return;
    }

    currentThienKiepTargetUser = user;
    const modal = document.getElementById('thienKiepModal');
    if (!modal) return;

    const subtitleEl = document.getElementById('thienKiepModalSubtitle');
    const targetInfoEl = document.getElementById('thienKiepTargetInfo');

    const curExp = getUserExp(user.username, user);
    const userRank = getResolvedUserRank(user);
    const initialChar = (user.username || 'U').charAt(0).toUpperCase();

    if (subtitleEl) {
        subtitleEl.textContent = `Giáng lôi kiếp trừng phạt đệ tử: ${user.username}`;
    }

    if (targetInfoEl) {
        targetInfoEl.innerHTML = `
            <div class="flex items-center gap-3" style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 38px; height: 38px; border-radius: 50%; background: #180d1b; border: 2px solid ${userRank.borderColor || '#ef4444'}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; color: #fff; overflow: hidden; box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);">
                    ${user.photoURL ? `<img src="${escapeHtml(user.photoURL)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.parentElement.innerText='${initialChar}';">` : initialChar}
                </div>
                <div>
                    <div class="flex items-center gap-2" style="display: flex; align-items: center; gap: 8px;">
                        <strong class="text-white text-sm md:text-base font-bold">${escapeHtml(user.username)}</strong>
                        <span class="user-rank-badge ${userRank.badgeClass}" style="display: inline-flex; align-items: center; gap: 4px; padding: 1px 8px; border-radius: 9999px; font-size: 10.5px; font-weight: 600; background-color: ${userRank.bgColor}; color: ${userRank.textColor}; border: 1px solid ${userRank.borderColor};">
                            <i class="${userRank.icon}" style="font-size: 9.5px;"></i>
                            <span>${userRank.displayName || userRank.name} (Cấp ${userRank.level})</span>
                        </span>
                    </div>
                    <div class="text-xs text-slate-400 mt-0.5" style="font-size: 11.5px; color: #94a3b8;">
                        UID: <span class="font-mono text-slate-300">${escapeHtml(user.userId || 'N/A')}</span>
                    </div>
                </div>
            </div>
            <div style="text-align: right;">
                <div class="text-[11px] text-red-300/80 uppercase tracking-wider font-semibold">Tu vi hiện tại</div>
                <div class="text-red-400 font-black text-base md:text-lg flex items-center justify-end gap-1.5" style="color: #f87171; font-weight: 900;">
                    <i class="fa-solid fa-bolt-lightning text-xs text-red-400"></i>
                    <span>${curExp.toLocaleString('vi-VN')} EXP</span>
                </div>
            </div>
        `;
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

/**
 * Đóng Modal "Giáng hạ Lôi Kiếp"
 */
function closeThienKiepModal() {
    const modal = document.getElementById('thienKiepModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    currentThienKiepTargetUser = null;
}

/**
 * Thực hiện "Giáng Thiên Kiếp" trừ EXP trực tiếp:
 * 1. Lấy EXP hiện tại - số EXP tương ứng.
 * 2. Logic an toàn: Math.max(0, currentExp - penalty) đảm bảo EXP không bao giờ âm.
 * 3. Nếu tài khoản đang ở Chí Tôn Cực Đạo (isAscended: true) mà EXP tụt dưới 1500 -> BẮT BUỘC đổi isAscended = false (đánh rớt cảnh giới ẩn).
 * 4. Gọi lại hàm tính toán Cấp độ (getRankByExp) để tự động giáng cấp.
 * 5. Cập nhật dữ liệu mới lên Firebase (users/{userId}) và LocalStorage.
 * 6. Hiển thị thông báo (Toast/Alert) màu đỏ: "Thiên kiếp đã giáng xuống! Đạo hữu này vừa bị hao tổn [X] tu vi."
 */
async function executeThienKiep(amount, kiepName) {
    if (!currentThienKiepTargetUser) return;
    const target = currentThienKiepTargetUser;
    const targetUid = target.userId;
    if (!targetUid) {
        showToast('Không xác định được UID của tài khoản!', 'error');
        return;
    }

    try {
        const currentExp = getUserExp(target.username, target);
        // Logic an toàn: Đảm bảo EXP không bao giờ bị âm
        const newExp = Math.max(0, currentExp - amount);

        // Kiểm tra xem tài khoản có đang ở cảnh giới "Chí Tôn Cực Đạo" không
        const wasCucDao = !!(
            target.isAscended === true || 
            target.isAscended === 'true' || 
            target.level === 7 || 
            (target.rank && typeof target.rank === 'string' && target.rank.toLowerCase().includes('cực đạo')) ||
            (target.rank && target.rank.level === 7) ||
            localStorage.getItem('isAscended_' + targetUid) === 'true' ||
            (target.username && localStorage.getItem('isAscended_' + target.username) === 'true')
        );

        // NẾU đang ở "Chí Tôn Cực Đạo" mà bị đánh tụt EXP xuống dưới ngưỡng 1500:
        // BẮT BUỘC phải đổi cờ isAscended về false (Đánh rớt cảnh giới ẩn).
        let newIsAscended = wasCucDao;
        if (wasCucDao && newExp < 1500) {
            newIsAscended = false;
        }

        // Gọi lại hàm tính toán Cấp độ (Rank) để hệ thống tự động giáng cấp (nếu có)
        const newRank = getRankByExp(newExp, newIsAscended);
        const newLevel = newRank.level || 1;
        const newRankName = newRank.name || 'PHÀM CẢNH';

        const updateData = {
            exp: newExp,
            level: newLevel,
            rank: newRankName,
            rankId: newRank.id || 'gamo',
            isAscended: newIsAscended,
            updatedAt: Date.now()
        };

        // 1. Cập nhật dữ liệu mới lên Firebase Realtime Database (users/{userId})
        if (window.update && window.ref && window.db) {
            await update(ref(db, `users/${targetUid}`), updateData);
        } else if (window.FirebaseService && typeof FirebaseService.updateUserStats === 'function') {
            await FirebaseService.updateUserStats(targetUid, updateData);
        }

        // 2. Cập nhật localStorage tương ứng
        localStorage.setItem('exp_' + targetUid, newExp.toString());
        localStorage.setItem('isAscended_' + targetUid, newIsAscended ? 'true' : 'false');
        if (target.username) {
            localStorage.setItem('exp_' + target.username, newExp.toString());
            localStorage.setItem('isAscended_' + target.username, newIsAscended ? 'true' : 'false');
        }

        // 3. Cập nhật đối tượng user trong bộ nhớ admin
        target.exp = newExp;
        target.level = newLevel;
        target.rank = newRankName;
        target.rankId = newRank.id;
        target.isAscended = newIsAscended;

        const cachedIdx = adminUsersList.findIndex(u => u.userId === targetUid);
        if (cachedIdx !== -1) {
            adminUsersList[cachedIdx].exp = newExp;
            adminUsersList[cachedIdx].level = newLevel;
            adminUsersList[cachedIdx].rank = newRankName;
            adminUsersList[cachedIdx].rankId = newRank.id;
            adminUsersList[cachedIdx].isAscended = newIsAscended;
        }

        // 4. Đóng modal và render lại bảng quản lý
        closeThienKiepModal();
        renderUserTable();

        // 5. Hiển thị thông báo (Toast/Alert) màu đỏ đúng chuẩn
        const penaltyMsg = `Thiên kiếp đã giáng xuống! Đạo hữu này vừa bị hao tổn ${amount} tu vi.`;
        showToast(penaltyMsg, 'error');
        console.log(`[Admin] Giáng thiên kiếp (${kiepName} -${amount} EXP) cho ${target.username}. EXP mới: ${newExp}, Cảnh giới mới: Cấp ${newLevel} (${newRankName}), isAscended: ${newIsAscended}`);
    } catch (err) {
        console.error('[Admin] Lỗi khi giáng thiên kiếp:', err);
        showToast(`Lỗi khi giáng thiên kiếp: ${err.message || err}`, 'error');
    }
}
window.openThienKiepModal = openThienKiepModal;
window.closeThienKiepModal = closeThienKiepModal;
window.executeThienKiep = executeThienKiep;

/**
 * Quyền năng tối thượng: "Phế Bỏ Tu Vi"
 * Reset trực tiếp EXP của user về 0, giáng xuống Phàm Cảnh (Luyện Khí), xóa cờ isAscended
 * @param {string} userId
 */
async function pheBoTuVi(userId) {
    if (!userId) return;
    const users = getUserList();
    const user = users.find(u => u.userId === userId || (u.username && u.username.toLowerCase() === userId.toLowerCase()));
    if (!user) {
        showToast('Không tìm thấy tài khoản người dùng!', 'error');
        return;
    }

    const isAdm = (user.role && user.role.toLowerCase() === 'admin') || (user.username && user.username.toLowerCase() === 'admin') || user.isRoot;
    if (isAdm) {
        alert('Không thể phế bỏ tu vi của Thiên Đạo Chưởng Quản / Chúa Tể Không Gian!');
        return;
    }

    const confirmMsg = `Ngươi có chắc chắn muốn thi triển Đại Pháp Phế Bỏ Tu Vi đối với đạo hữu "${user.username}"?\n\nToàn bộ EXP sẽ bị reset về 0, tước bỏ Chí Tôn Cực Đạo (isAscended = false) và giáng thẳng xuống Phàm Cảnh (Luyện Khí)!`;
    if (!confirm(confirmMsg)) return;

    try {
        const targetUid = user.userId || ('u_' + (user.username || '').toLowerCase());
        const updateData = {
            exp: 0,
            level: 1,
            rank: 'Phàm Cảnh (Luyện Khí)',
            rankId: 'gamo',
            isAscended: false,
            updatedAt: Date.now()
        };

        // 1. Cập nhật Firebase
        if (window.update && window.ref && window.db) {
            await update(ref(db, `users/${targetUid}`), updateData);
        } else if (window.FirebaseService && typeof FirebaseService.updateUserStats === 'function') {
            await FirebaseService.updateUserStats(targetUid, updateData);
        }

        // 2. Cập nhật LocalStorage
        localStorage.setItem('exp_' + targetUid, '0');
        localStorage.setItem('isAscended_' + targetUid, 'false');
        localStorage.removeItem('isAscended_' + targetUid);
        if (user.username) {
            localStorage.setItem('exp_' + user.username, '0');
            localStorage.setItem('isAscended_' + user.username, 'false');
            localStorage.removeItem('isAscended_' + user.username);
        }

        // 3. Cập nhật trong bộ nhớ Admin và userList
        user.exp = 0;
        user.level = 1;
        user.rank = 'Phàm Cảnh (Luyện Khí)';
        user.rankId = 'gamo';
        user.isAscended = false;

        const cachedIdx = adminUsersList.findIndex(u => u.userId === targetUid || u.username === user.username);
        if (cachedIdx !== -1) {
            adminUsersList[cachedIdx].exp = 0;
            adminUsersList[cachedIdx].level = 1;
            adminUsersList[cachedIdx].rank = 'Phàm Cảnh (Luyện Khí)';
            adminUsersList[cachedIdx].rankId = 'gamo';
            adminUsersList[cachedIdx].isAscended = false;
        }

        const userIdx = users.findIndex(u => u.userId === targetUid || u.username === user.username);
        if (userIdx !== -1) {
            users[userIdx].exp = 0;
            users[userIdx].level = 1;
            users[userIdx].rank = 'Phàm Cảnh (Luyện Khí)';
            users[userIdx].rankId = 'gamo';
            users[userIdx].isAscended = false;
            await saveUserList(users);
        }

        renderUserTable();
        showToast(`Đã phế bỏ toàn bộ tu vi của "${user.username}", giáng xuống Phàm Cảnh!`, 'success');
        console.log(`[Admin] Phế bỏ tu vi thành công cho ${user.username}`);
    } catch (err) {
        console.error('[Admin] Lỗi khi phế bỏ tu vi:', err);
        showToast(`Lỗi khi phế bỏ tu vi: ${err.message || err}`, 'error');
    }
}

/**
 * Quyền năng tối thượng: "Đả Nhập Hắc Lao" / "Đại Xá Thiên Hạ"
 * Chuyển trạng thái tài khoản thành banned: true / false
 * Nếu banned: true, kick offline và thu hồi token, khi đăng nhập sẽ bị chặn
 * @param {string} userId
 */
async function toggleBanUser(userId) {
    if (!userId) return;
    const users = getUserList();
    const user = users.find(u => u.userId === userId || (u.username && u.username.toLowerCase() === userId.toLowerCase()));
    if (!user) {
        showToast('Không tìm thấy tài khoản người dùng!', 'error');
        return;
    }

    const isAdm = (user.role && user.role.toLowerCase() === 'admin') || (user.username && user.username.toLowerCase() === 'admin') || user.isRoot;
    if (isAdm) {
        alert('Không thể đả nhập hắc lao đối với Thiên Đạo Chưởng Quản / Admin!');
        return;
    }

    const currentlyBanned = !!user.banned;
    const newBannedStatus = !currentlyBanned;

    const confirmMsg = newBannedStatus
        ? `Ngươi có chắc chắn muốn Đả Nhập Hắc Lao đối với đạo hữu "${user.username}"?\n\nTài khoản sẽ bị phong ấn môn quy, lập tức bị cưỡng chế đăng xuất và không thể đăng nhập tu luyện!`
        : `Ngươi có chắc chắn muốn ban lệnh Đại Xá Thiên Hạ, thả đạo hữu "${user.username}" ra khỏi Hắc Lao để tiếp tục tu luyện?`;

    if (!confirm(confirmMsg)) return;

    try {
        const targetUid = user.userId || ('u_' + (user.username || '').toLowerCase());
        const updateData = {
            banned: newBannedStatus,
            updatedAt: Date.now()
        };
        if (newBannedStatus) {
            updateData.status = 'offline';
            updateData.activeSession = null;
            updateData.sessionToken = null;
        }

        // 1. Cập nhật Firebase
        if (window.update && window.ref && window.db) {
            await update(ref(db, `users/${targetUid}`), updateData);
        } else if (window.FirebaseService && typeof FirebaseService.updateUserStats === 'function') {
            await FirebaseService.updateUserStats(targetUid, updateData);
        }

        // 2. Cập nhật trong bộ nhớ Admin và userList
        user.banned = newBannedStatus;
        if (newBannedStatus) {
            user.status = 'offline';
            user.activeSession = null;
            user.sessionToken = null;
        }

        const cachedIdx = adminUsersList.findIndex(u => u.userId === targetUid || u.username === user.username);
        if (cachedIdx !== -1) {
            adminUsersList[cachedIdx].banned = newBannedStatus;
            if (newBannedStatus) adminUsersList[cachedIdx].status = 'offline';
        }

        const userIdx = users.findIndex(u => u.userId === targetUid || u.username === user.username);
        if (userIdx !== -1) {
            users[userIdx].banned = newBannedStatus;
            if (newBannedStatus) users[userIdx].status = 'offline';
            await saveUserList(users);
        }

        renderUserTable();

        if (newBannedStatus) {
            showToast(`Đã đả nhập "${user.username}" vào Hắc Lao! Phong ấn đăng nhập kích hoạt.`, 'error');
        } else {
            showToast(`Đã đại xá thả "${user.username}" ra khỏi Hắc Lao!`, 'success');
        }
        console.log(`[Admin] Đổi trạng thái Hắc Lao cho ${user.username}: banned = ${newBannedStatus}`);
    } catch (err) {
        console.error('[Admin] Lỗi khi đổi trạng thái Hắc Lao:', err);
        showToast(`Lỗi: ${err.message || err}`, 'error');
    }
}

window.pheBoTuVi = pheBoTuVi;
window.toggleBanUser = toggleBanUser;

/**
 * Điều khiển Dropdown Thần Thông trong bảng Admin
 */
function toggleAdminDropdown(userId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const targetMenu = document.getElementById(`admin-dropdown-${userId}`);
    const wasOpen = targetMenu && targetMenu.style.display === 'block';
    closeAllAdminDropdowns();
    if (targetMenu && !wasOpen) {
        targetMenu.style.display = 'block';
    }
}

function closeAllAdminDropdowns() {
    document.querySelectorAll('.admin-dropdown-menu').forEach(el => {
        el.style.display = 'none';
    });
}

window.toggleAdminDropdown = toggleAdminDropdown;
window.closeAllAdminDropdowns = closeAllAdminDropdowns;

// Đóng dropdown khi click ra ngoài
document.addEventListener('click', (e) => {
    if (!e.target.closest('.admin-dropdown-wrapper')) {
        closeAllAdminDropdowns();
    }
});

/**
 * Ban Tặng Đạo Hiệu (Admin Grant Display Name)
 * Chỉ cập nhật trường displayName trên Firebase, giữ nguyên username đăng nhập
 * @param {string} userId UID của người dùng
 */
async function banTangDaoHieu(userId) {
    if (!userId) return;
    const users = getUserList();
    const user = users.find(u => u.userId === userId || (u.username && u.username.toLowerCase() === userId.toLowerCase()));
    if (!user) {
        showToast('Không tìm thấy tài khoản người dùng!', 'error');
        return;
    }

    const currentTitle = user.displayName || user.username;
    const promptMsg = `Nhập Đạo Hiệu mới ban tặng cho đạo hữu "${currentTitle}":\n(Lệnh bài đăng nhập: "${user.username}" vẫn được giữ nguyên không đổi)`;
    const newTitle = prompt(promptMsg, currentTitle);
    if (newTitle === null) return; // Người dùng ấn Hủy

    const cleanTitle = newTitle.trim();
    if (!cleanTitle) {
        alert('Đạo hiệu không được để trống!');
        return;
    }
    if (cleanTitle === user.displayName) {
        showToast('Đạo hiệu không thay đổi.', 'warning');
        return;
    }

    try {
        const targetUid = user.userId || userId;
        if (window.update && window.ref && window.db) {
            await update(ref(db, 'users/' + targetUid), {
                displayName: cleanTitle
            });
        } else if (window.FirebaseService && typeof FirebaseService.updateUser === 'function') {
            await FirebaseService.updateUser(targetUid, {
                displayName: cleanTitle
            });
        }

        user.displayName = cleanTitle;
        await saveUserList(users);

        showToast(`Đã ban tặng Đạo Hiệu "${cleanTitle}" cho đạo hữu ${user.username} thành công!`, 'success');
        renderUserTable();
    } catch (err) {
        alert(err.message || 'Lỗi khi ban tặng Đạo Hiệu!');
    }
}
window.banTangDaoHieu = banTangDaoHieu;
window.changeUsername = banTangDaoHieu;

/**
 * Lọc bảng tài khoản khi nhập ô tìm kiếm
 */
function filterUserTable() {
    const input = document.getElementById('user-search-input');
    const kw = input ? input.value : '';
    renderUserTable(kw);
}

/**
 * Ẩn/Hiện mật khẩu trực tiếp trên bảng tài khoản
 * @param {HTMLElement} element Icon con mắt được click
 */
function toggleTablePassword(element) {
    if (!element) return;
    const icon = element.tagName.toLowerCase() === 'i' ? element : element.querySelector('i');
    if (!icon) return;

    const rawPwd = element.getAttribute('data-pwd') || icon.getAttribute('data-pwd') || '';
    const container = element.closest('.user-pwd-wrapper') || element.closest('td');
    if (!container) return;
    const pwdDisplay = container.querySelector('.user-pwd-display');
    if (!pwdDisplay) return;

    const isShowing = icon.classList.contains('fa-eye-slash');

    if (isShowing) {
        // Đang hiện -> Ẩn về dấu chấm ••••••••
        pwdDisplay.textContent = '••••••••';
        pwdDisplay.classList.remove('revealed');
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
        element.setAttribute('title', 'Xem mật khẩu');
    } else {
        // Đang ẩn -> Hiện mật khẩu thực tế
        pwdDisplay.textContent = rawPwd || '(Trống)';
        pwdDisplay.classList.add('revealed');
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
        element.setAttribute('title', 'Ẩn mật khẩu');
    }
}

/**
 * Xử lý Form "Tạo tài khoản" (Khối 1) - Tích hợp Firebase
 */
async function handleCreateUser(e) {
    e.preventDefault();

    // 1. Chống Spam Click (Double-click prevention)
    const btnSubmit = (e.target && e.target.querySelector) ? e.target.querySelector('button[type="submit"]') : document.querySelector('.btn-create-account');
    const originalBtnHtml = btnSubmit ? btnSubmit.innerHTML : '<i class="fa-solid fa-plus"></i> <span>Tạo tài khoản</span>';

    // Ngăn chặn spam click nếu đang trong tiến trình tạo
    if (handleCreateUser.isSubmitting || (btnSubmit && btnSubmit.disabled)) {
        return;
    }

    // Disable nút ngay dòng đầu tiên và đổi text thành "Đang tạo..."
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang tạo...</span>';
    }
    handleCreateUser.isSubmitting = true;

    const usernameInput = document.getElementById('new-username');
    const passwordInput = document.getElementById('new-password');
    const roleSelect = document.getElementById('new-role');

    if (!usernameInput || !passwordInput || !roleSelect) {
        handleCreateUser.isSubmitting = false;
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = originalBtnHtml;
        }
        return;
    }

    try {
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const role = roleSelect.value;

        // Validation
        if (username.length < 2) {
            showToast('Tên đăng nhập phải có ít nhất 2 ký tự!', 'error');
            usernameInput.focus();
            return;
        }
        if (/\s/.test(username)) {
            showToast('Tên đăng nhập không được chứa khoảng trắng!', 'error');
            usernameInput.focus();
            return;
        }
        if (password.length < 3) {
            showToast('Mật khẩu phải có ít nhất 3 ký tự!', 'error');
            passwordInput.focus();
            return;
        }

        if (window.FirebaseService) {
            await FirebaseService.registerUser({ username, password, role });
        } else {
            const users = getUserList();
            const isExisted = users.some(u => u.username && u.username.toLowerCase() === username.toLowerCase());
            if (isExisted) {
                showToast(`Tên đăng nhập "${username}" đã tồn tại trên hệ thống!`, 'error');
                usernameInput.focus();
                return;
            }

            const today = new Date();
            const dateFormatted = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
            const newUser = {
                userId: 'u_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
                username: username,
                password: password,
                role: role,
                createdAt: dateFormatted,
                isRoot: false,
                status: 'offline',
                lastActive: Date.now(),
                activeSession: null
            };

            users.push(newUser);
            await saveUserList(users);
        }

        // Reset Form & Render lại bảng
        usernameInput.value = '';
        passwordInput.value = '';
        roleSelect.value = 'user';

        renderUserTable();
        showToast(`Đã tạo tài khoản "${username}" (${role.toUpperCase()}) thành công!`, 'success');
    } catch (err) {
        showToast(err.message || 'Lỗi khi tạo tài khoản!', 'error');
    } finally {
        // Chỉ khi lệnh push dữ liệu lên Firebase báo thành công (hoặc thất bại), mới enable lại nút và trả lại text gốc
        handleCreateUser.isSubmitting = false;
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = originalBtnHtml;
        }
    }
}

/**
 * Xử lý tính năng Xóa tài khoản - Tích hợp Firebase
 */
async function handleDeleteUser(userIdOrName) {
    if (!userIdOrName) return;

    const users = getUserList();
    const userToDelete = users.find(u => 
        u.userId === userIdOrName || 
        (u.username && u.username.toLowerCase() === userIdOrName.toLowerCase())
    );

    if (!userToDelete) {
        showToast('Không tìm thấy tài khoản cần xóa!', 'error');
        return;
    }

    if (userToDelete.isRoot || (userToDelete.username && userToDelete.username.toLowerCase() === 'admin')) {
        alert('TUYỆT ĐỐI KHÔNG ĐƯỢC PHÉP XÓA TÀI KHOẢN ADMIN GỐC MẶC ĐỊNH!');
        return;
    }

    const isConfirmed = confirm(`Bạn có chắc chắn muốn xóa tài khoản "${userToDelete.username}" không?\nHành động này không thể hoàn tác!`);
    if (!isConfirmed) return;

    try {
        if (window.FirebaseService) {
            await FirebaseService.deleteUser(userToDelete.userId);
        } else {
            const updatedUsers = users.filter(u => u.userId !== userToDelete.userId);
            await saveUserList(updatedUsers);
        }

        renderUserTable();
        showToast(`Đã xóa tài khoản "${userToDelete.username}" thành công!`, 'success');
    } catch (err) {
        showToast(err.message || 'Lỗi khi xóa tài khoản!', 'error');
    }
}

/**
 * Tính năng Sửa mật khẩu (Modal Popup) - Tích hợp Firebase
 */
function openEditPasswordModal(userIdOrName) {
    const users = getUserList();
    const user = users.find(u => 
        u.userId === userIdOrName || 
        (u.username && u.username.toLowerCase() === userIdOrName.toLowerCase())
    );
    if (!user) {
        showToast('Không tìm thấy tài khoản!', 'error');
        return;
    }

    showAdminModal({
        title: `Đổi mật khẩu: ${user.username}`,
        icon: 'fa-solid fa-key',
        content: `
            <div style="font-size: 14px; color: #334155; display: flex; flex-direction: column; gap: 14px;">
                <p>Nhập mật khẩu mới cho tài khoản <strong>${escapeHtml(user.username)}</strong> (Vai trò: ${user.role.toUpperCase()}):</p>
                <div class="form-group" style="width: 100%;">
                    <label for="edit-new-pwd"><i class="fa-solid fa-lock"></i> Mật khẩu mới</label>
                    <div class="password-input-wrapper">
                        <input type="password" id="edit-new-pwd" placeholder="Nhập ít nhất 3 ký tự..." style="width: 100%; height: 42px; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0 40px 0 14px; font-size: 14px;">
                        <button type="button" class="btn-toggle-pwd" onclick="togglePasswordVisibility('edit-new-pwd', this)">
                            <i class="fa-regular fa-eye"></i>
                        </button>
                    </div>
                </div>
            </div>
        `,
        actionText: 'Lưu mật khẩu',
        actionCallback: async () => {
            const pwdInput = document.getElementById('edit-new-pwd');
            const newPwd = pwdInput ? pwdInput.value : '';

            if (!newPwd || newPwd.length < 3) {
                alert('Mật khẩu mới phải có tối thiểu 3 ký tự!');
                return;
            }

            try {
                if (window.FirebaseService) {
                    await FirebaseService.updateUser(user.userId, { password: newPwd });
                } else {
                    user.password = newPwd;
                    await saveUserList(users);
                }
                closeAdminModal();
                showToast(`Đã đổi mật khẩu cho tài khoản "${user.username}" thành công!`, 'success');
                renderUserTable();
            } catch (err) {
                alert(err.message || 'Lỗi khi cập nhật mật khẩu!');
            }
        },
        showCancel: true,
        cancelText: 'Hủy'
    });
}

/**
 * Toggle hiển thị mật khẩu
 */
function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input || !btn) return;

    const icon = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        if (icon) icon.className = 'fa-regular fa-eye-slash';
    } else {
        input.type = 'password';
        if (icon) icon.className = 'fa-regular fa-eye';
    }
}

/**
 * Modal Popup & Toast Utilities
 */
function showAdminModal({ title, icon, content, actionText = 'Đóng', actionCallback = null, showCancel = false, cancelText = 'Hủy', cancelCallback = null }) {
    const modalBackdrop = document.getElementById('modal-container');
    const modalCard = document.getElementById('modal-card');
    if (!modalBackdrop || !modalCard) return;

    modalCard.innerHTML = `
        <div class="modal-header">
            <h3 class="modal-title">
                ${icon ? `<i class="${icon}" style="color: #2563eb;"></i>` : ''}
                <span>${title}</span>
            </h3>
            <button class="btn-close-modal" onclick="closeAdminModal()">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
        <div class="modal-body">
            ${content}
        </div>
        <div class="modal-footer">
            ${showCancel ? `<button class="btn-modal-cancel" id="admin-modal-cancel-btn">${cancelText}</button>` : ''}
            <button class="btn-modal-action" id="admin-modal-primary-btn">${actionText}</button>
        </div>
    `;

    document.getElementById('admin-modal-primary-btn').onclick = () => {
        if (actionCallback) actionCallback();
        else closeAdminModal();
    };

    if (showCancel) {
        document.getElementById('admin-modal-cancel-btn').onclick = () => {
            if (cancelCallback) cancelCallback();
            else closeAdminModal();
        };
    }

    modalBackdrop.classList.remove('hidden');
}

function closeAdminModal() {
    const modalBackdrop = document.getElementById('modal-container');
    if (modalBackdrop) modalBackdrop.classList.add('hidden');
}

function closeAdminModalOnBackdrop(e) {
    if (e.target.id === 'modal-container') {
        closeAdminModal();
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast-message');
    if (!toast) return;

    const isError = (type === 'error' || type === 'danger');
    const isWarning = (type === 'warning');
    const iconClass = isError ? 'fa-solid fa-bolt-lightning' : (isWarning ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-circle-check');
    const iconColor = isError ? '#f87171' : (isWarning ? '#f59e0b' : '#38bdf8');

    toast.innerHTML = `<i class="${iconClass}" style="color: ${iconColor}; font-size: 15px;"></i> <span>${message}</span>`;
    
    if (isError) {
        toast.style.background = '#450a0a';
        toast.style.color = '#fecaca';
        toast.style.border = '1.5px solid #ef4444';
        toast.style.boxShadow = '0 10px 25px rgba(220, 38, 38, 0.5), 0 0 15px rgba(239, 68, 68, 0.4)';
    } else {
        toast.style.background = '';
        toast.style.color = '';
        toast.style.border = '';
        toast.style.boxShadow = '';
    }

    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 2800);
}

function openAdminNotification() {
    showAdminModal({
        title: 'Thông báo Quản trị',
        icon: 'fa-solid fa-bell',
        content: `
            <div style="font-size: 13.5px; color: #475569; line-height: 1.6;">
                <p>• Hệ thống hỗ trợ phân quyền <strong>Admin</strong> và <strong>User</strong>.</p>
                <p>• Tài khoản Admin có quyền thêm mới, xóa và đổi mật khẩu người dùng.</p>
                <p>• Tài khoản Admin gốc mặc định (Admin / Loclsct2006) được bảo vệ, không thể bị xóa.</p>
            </div>
        `
    });
}

function openAdminUserMenu() {
    const userStr = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    const user = userStr ? JSON.parse(userStr) : { username: 'Admin', role: 'admin' };

    const exp = getUserExp(user.username, user);
    const rank = getRankByExp(exp);
    const rankLevel = rank.level;

    showAdminModal({
        title: 'Tài khoản Quản trị viên',
        icon: 'fa-solid fa-user-shield',
        content: `
            <div style="font-size: 14px; color: #334155; display: flex; flex-direction: column; gap: 14px;">
                <!-- TÂM ĐIỂM KHUNG AVATAR PNG 6 CẤP ĐỘ -->
                <div id="modal-moba-centerpiece" style="display: flex; justify-content: center; align-items: center; padding: 20px 0; background: radial-gradient(circle at center, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.5);">
                    <div class="avatar-wrapper rank-${rankLevel} avatar-large">${user.username ? user.username.charAt(0).toUpperCase() : 'A'}</div>
                </div>

                <div class="modal-user-card rank-${rankLevel}" id="modal-user-card">
                    <div class="avatar-wrapper rank-${rankLevel}" id="modal-avatar-frame" style="width: 52px; height: 52px; font-size: 20px;">
                        ${user.username ? user.username.charAt(0).toUpperCase() : 'A'}
                    </div>
                    <div class="muc-info">
                        <strong class="muc-name">${user.username}</strong>
                        <div class="muc-role">Quản trị viên hệ thống (Admin)</div>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <button type="button" style="padding: 10px 14px; border-radius: 8px; border: 1px solid #cbd5e1; background: #ffffff; text-align: left; cursor: pointer; font-size: 13.5px; display: flex; align-items: center; gap: 10px;" onclick="window.location.href='index.html'">
                        <i class="fa-solid fa-house" style="color: #2563eb;"></i>
                        <span>Về Trang chủ (Dashboard học tập)</span>
                    </button>
                    <button type="button" style="padding: 10px 14px; border-radius: 8px; border: 1px solid #fecdd3; background: #fef2f2; text-align: left; cursor: pointer; font-size: 13.5px; display: flex; align-items: center; gap: 10px; color: #dc2626; font-weight: 600;" onclick="adminLogout()">
                        <i class="fa-solid fa-arrow-right-from-bracket"></i>
                        <span>🚪 Xuất Quan</span>
                    </button>
                </div>
            </div>
        `,
        actionText: 'Đóng'
    });
}

async function adminLogout() {
    const user = getAdminCurrentUser();
    if (user) {
        const userId = user.userId || ('u_' + (user.username || '').toLowerCase());
        if (window.FirebaseService) {
            try {
                await FirebaseService.updateUserStatus(userId, 'offline');
                await FirebaseService.updateUser(userId, { activeSession: null, sessionToken: null });
            } catch (e) {}
        } else if (user.username) {
            try {
                const users = getUserList();
                const idx = users.findIndex(u => u.username && u.username.toLowerCase() === user.username.toLowerCase());
                if (idx !== -1 && users[idx].activeSession === user.sessionId) {
                    users[idx].activeSession = null;
                    users[idx].sessionToken = null;
                    saveUserList(users);
                }
            } catch (e) {}
        }
    }

    localStorage.removeItem('currentUser');
    localStorage.removeItem('sessionToken');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('sessionToken');
    sessionStorage.clear();
    if (typeof closeAdminModal === 'function') {
        closeAdminModal();
    }
    window.location.replace('login.html');
}

window.addEventListener('storage', (e) => {
    if (e.key === 'userList' || e.key === 'currentUser' || e.key === null) {
        verifyAdminSession();
    }
});

window.addEventListener('focus', () => {
    verifyAdminSession();
});

window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
        verifyAdminSession();
    }
});

setInterval(() => {
    verifyAdminSession();
}, 2500);

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ==========================================================================
// ĐIỀU HƯỚNG VÀ THAO TÁC TRÊN GIAO DIỆN ĐIỆN THOẠI (ADMIN MOBILE NAVIGATION)
// ==========================================================================
function toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar) return;
    const isOpen = sidebar.classList.toggle('open');
    if (backdrop) backdrop.classList.toggle('active', isOpen);
    document.body.classList.toggle('sidebar-open', isOpen);
}

function closeMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
    document.body.classList.remove('sidebar-open');
}

function scrollToCreateUser() {
    closeMobileSidebar();
    const form = document.getElementById('create-user-form');
    const input = document.getElementById('new-username');
    if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (input) setTimeout(() => input.focus(), 300);
    }
}

// ==========================================================================
// QUẢN LÝ TAB QUẢN TRỊ & HÒM THƯ GÓP Ý (ADMIN TAB & FEEDBACK INBOX)
// ==========================================================================

/**
 * Chuyển đổi tab chính trong trang Admin (users | feedbacks)
 */
function switchAdminMainTab(tabName, updateUrl = true) {
    if (tabName !== 'users' && tabName !== 'feedbacks') {
        tabName = 'users';
    }

    closeMobileSidebar();

    // 1. Cập nhật Tab Buttons
    const btnUsers = document.getElementById('btn-admin-tab-users');
    const btnFeedbacks = document.getElementById('btn-admin-tab-feedbacks');
    if (btnUsers) btnUsers.classList.toggle('active', tabName === 'users');
    if (btnFeedbacks) btnFeedbacks.classList.toggle('active', tabName === 'feedbacks');

    // 2. Cập nhật Mobile Bottom Nav Buttons
    const mbBtnUsers = document.getElementById('mb-nav-btn-users');
    const mbBtnFeedbacks = document.getElementById('mb-nav-btn-feedbacks');
    if (mbBtnUsers) mbBtnUsers.classList.toggle('active', tabName === 'users');
    if (mbBtnFeedbacks) mbBtnFeedbacks.classList.toggle('active', tabName === 'feedbacks');

    // 3. Cập nhật Sidebar Active items
    const sideUsers = document.getElementById('sidebar-admin-users-item');
    const sideFeedbacks = document.getElementById('sidebar-admin-feedbacks-item');
    if (sideUsers) {
        sideUsers.classList.toggle('active', tabName === 'users');
        if (tabName === 'users') {
            sideUsers.style.backgroundColor = '#eff6ff';
            sideUsers.style.color = '#2563eb';
            sideUsers.style.fontWeight = '700';
        } else {
            sideUsers.style.backgroundColor = '';
            sideUsers.style.color = '';
            sideUsers.style.fontWeight = '';
        }
    }
    if (sideFeedbacks) {
        sideFeedbacks.classList.toggle('active', tabName === 'feedbacks');
        if (tabName === 'feedbacks') {
            sideFeedbacks.style.backgroundColor = '#eff6ff';
            sideFeedbacks.style.color = '#2563eb';
            sideFeedbacks.style.fontWeight = '700';
        } else {
            sideFeedbacks.style.backgroundColor = '';
            sideFeedbacks.style.color = '';
            sideFeedbacks.style.fontWeight = '';
        }
    }

    // 4. Hiển thị / Ẩn Content Pane
    const paneUsers = document.getElementById('admin-pane-users');
    const paneFeedbacks = document.getElementById('admin-pane-feedbacks');
    if (paneUsers) paneUsers.classList.toggle('hidden', tabName !== 'users');
    if (paneFeedbacks) paneFeedbacks.classList.toggle('hidden', tabName !== 'feedbacks');

    // 5. Cập nhật Tiêu đề Header & Badge
    updateAdminHeaderForTab(tabName);

    // 6. Cập nhật URL mà không reload
    if (updateUrl && window.history && window.history.pushState) {
        const newUrl = window.location.pathname + `?tab=${tabName}`;
        window.history.pushState({ tab: tabName }, '', newUrl);
    }

    // 7. Render dữ liệu tương ứng
    if (tabName === 'users') {
        renderUserTable();
    } else {
        renderFeedbackTable();
    }
}

/**
 * Cập nhật header page info khi đổi tab
 */
function updateAdminHeaderForTab(tabName) {
    const titleEl = document.getElementById('admin-main-page-title');
    const descEl = document.getElementById('admin-main-page-desc');
    const iconEl = document.getElementById('admin-header-icon');
    const badgeEl = document.getElementById('admin-header-stat-badge');

    const usersCount = getUserList().length;
    const feedbacks = getSystemFeedbacks();
    const pendingCount = feedbacks.filter(f => (f.status || 'Chờ duyệt') === 'Chờ duyệt').length;

    if (tabName === 'users') {
        if (titleEl) titleEl.textContent = 'Quản lý tài khoản người dùng';
        if (descEl) descEl.textContent = 'Thêm mới, phân quyền và quản lý tài khoản người dùng trong hệ thống.';
        if (iconEl) iconEl.innerHTML = '<i class="fas fa-users-cog"></i>';
        if (badgeEl) badgeEl.innerHTML = `<i class="fa-solid fa-users"></i> <span>Tổng số: <strong id="total-users-count">${usersCount}</strong> tài khoản</span>`;
    } else {
        if (titleEl) titleEl.textContent = 'Hòm thư Góp ý & Báo lỗi';
        if (descEl) descEl.textContent = 'Tiếp nhận phản hồi, ý kiến đóng góp và báo lỗi câu hỏi từ học viên.';
        if (iconEl) iconEl.innerHTML = '<i class="fa-solid fa-inbox"></i>';
        if (badgeEl) badgeEl.innerHTML = `<i class="fa-regular fa-envelope"></i> <span>Chờ duyệt: <strong>${pendingCount}</strong> / ${feedbacks.length} phản hồi</span>`;
    }
}

/**
 * Đọc danh sách phản hồi từ Firebase / Fallback
 */
function getSystemFeedbacks() {
    if (adminFeedbacksList && adminFeedbacksList.length > 0) {
        return adminFeedbacksList;
    }
    try {
        const raw = localStorage.getItem('system_feedbacks');
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
    } catch (e) {
        return [];
    }
}

/**
 * Lưu danh sách phản hồi vào Firebase & LocalStorage
 */
async function saveSystemFeedbacks(list) {
    adminFeedbacksList = list;
    try {
        localStorage.setItem('system_feedbacks', JSON.stringify(list));
        if (window.ref && window.set && window.db) {
            const map = {};
            list.forEach(f => {
                const fid = f.id || ('fb_' + Date.now());
                map[fid] = { ...f, id: fid };
            });
            await set(ref(db, 'feedbacks'), map);
        }
    } catch (e) {
        console.error('Lỗi khi lưu system_feedbacks:', e);
    }
}

/**
 * Cập nhật các badge số lượng trên header và tab buttons
 */
function updateAdminStatsBadges() {
    const users = cleanAndFilterUsers(getUserList());
    const feedbacks = getSystemFeedbacks();
    const pendingCount = feedbacks.filter(f => (f.status || 'Chờ duyệt') === 'Chờ duyệt').length;

    const badgeUsers = document.getElementById('badge-users-count');
    const totalUsers = document.getElementById('total-users-count');
    if (badgeUsers) badgeUsers.textContent = users.length;
    if (totalUsers) totalUsers.textContent = users.length;

    // Cập nhật thẻ Online / Offline
    const onlineCount = users.filter(u => u.status === 'online').length;
    const offlineCount = users.length - onlineCount;

    const statOnlineCard = document.getElementById('stat-online-card');
    const statOfflineCard = document.getElementById('stat-offline-card');
    if (statOnlineCard) statOnlineCard.innerHTML = `🟢 Đang Online: <span id="online-users-count">${onlineCount}</span> tài khoản`;
    if (statOfflineCard) statOfflineCard.innerHTML = `⚪ Đang Offline: <span id="offline-users-count">${offlineCount}</span> tài khoản`;

    const onlineCountEl = document.getElementById('online-users-count');
    const offlineCountEl = document.getElementById('offline-users-count');
    if (onlineCountEl) onlineCountEl.textContent = onlineCount;
    if (offlineCountEl) offlineCountEl.textContent = offlineCount;

    const badgeFeedbacks = document.getElementById('badge-feedbacks-count');
    if (badgeFeedbacks) {
        badgeFeedbacks.textContent = pendingCount > 0 ? `${pendingCount} mới` : feedbacks.length;
        if (pendingCount > 0) {
            badgeFeedbacks.classList.add('badge-unread');
        } else {
            badgeFeedbacks.classList.remove('badge-unread');
        }
    }
}

/**
 * Render bảng danh sách Hòm thư Góp ý
 */
function renderFeedbackTable(searchKeyword = '', statusFilter = 'all') {
    const tbody = document.getElementById('feedback-table-body');
    if (!tbody) return;

    let feedbacks = getSystemFeedbacks();

    // Cập nhật thống kê nhỏ
    const totalEl = document.getElementById('fb-stat-total');
    const pendingEl = document.getElementById('fb-stat-pending');
    const resolvedEl = document.getElementById('fb-stat-resolved');

    const totalCount = feedbacks.length;
    const pendingCount = feedbacks.filter(f => (f.status || 'Chờ duyệt') === 'Chờ duyệt').length;
    const resolvedCount = feedbacks.filter(f => f.status === 'Đã xử lý').length;

    if (totalEl) totalEl.textContent = totalCount;
    if (pendingEl) pendingEl.textContent = pendingCount;
    if (resolvedEl) resolvedEl.textContent = resolvedCount;

    updateAdminStatsBadges();

    // Lọc theo tìm kiếm
    if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase().trim();
        feedbacks = feedbacks.filter(f =>
            (f.title && f.title.toLowerCase().includes(kw)) ||
            (f.content && f.content.toLowerCase().includes(kw)) ||
            (f.username && f.username.toLowerCase().includes(kw)) ||
            (f.type && f.type.toLowerCase().includes(kw))
        );
    }

    // Lọc theo trạng thái
    if (statusFilter && statusFilter !== 'all') {
        feedbacks = feedbacks.filter(f => (f.status || 'Chờ duyệt') === statusFilter);
    }

    if (feedbacks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 36px 16px; color: #94a3b8; font-size: 13.5px;">
                    <i class="fa-regular fa-envelope-open" style="font-size: 28px; margin-bottom: 8px; display: block; color: #cbd5e1;"></i>
                    Không có phản hồi nào phù hợp bộ lọc tìm kiếm.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = feedbacks.map((f, idx) => {
        const isResolved = f.status === 'Đã xử lý';
        const sender = f.username || 'Ẩn danh';
        const initial = sender.charAt(0).toUpperCase();

        return `
            <tr>
                <td style="text-align: center; font-weight: 600; color: #64748b;">${idx + 1}</td>
                <td>
                    <div class="user-row-name">
                        <div class="avatar-circle" style="background: #ecfdf5; color: #059669; border-color: #a7f3d0;">${initial}</div>
                        <div>
                            <strong style="color: #1e293b; font-size: 13.5px;">${escapeHtml(sender)}</strong>
                        </div>
                    </div>
                </td>
                <td style="color: #64748b; font-size: 12.5px;">
                    <i class="fa-regular fa-calendar" style="margin-right: 4px; font-size: 11px;"></i>
                    ${escapeHtml(f.createdAt || '')}
                </td>
                <td>
                    <span style="display: inline-block; padding: 3px 8px; border-radius: 6px; background: #eff6ff; color: #2563eb; font-size: 12px; font-weight: 600;">
                        ${escapeHtml(f.type || 'Góp ý')}
                    </span>
                </td>
                <td>
                    <div class="fb-content-title" title="${escapeHtml(f.title || '')}">${escapeHtml(f.title || '(Không có tiêu đề)')}</div>
                    <div class="fb-content-snippet" title="${escapeHtml(f.content || '')}">${escapeHtml(f.content || '')}</div>
                </td>
                <td style="text-align: center;">
                    <span class="fb-status-badge ${isResolved ? 'status-resolved' : 'status-pending'}" onclick="toggleFeedbackStatus(${f.id})" title="Nhấn để chuyển đổi trạng thái">
                        <i class="fa-solid ${isResolved ? 'fa-circle-check' : 'fa-clock'}"></i>
                        <span>${isResolved ? 'Đã xử lý' : 'Chờ duyệt'}</span>
                    </span>
                </td>
                <td>
                    <div class="action-buttons-group">
                        <button type="button" class="btn-action" style="background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe;" onclick="viewFeedbackDetail(${f.id})" title="Xem chi tiết nội dung">
                            <i class="fa-regular fa-eye"></i>
                            <span>Xem</span>
                        </button>
                        <button type="button" class="btn-action" style="background: ${isResolved ? '#fffbeb' : '#ecfdf5'}; color: ${isResolved ? '#d97706' : '#059669'}; border: 1px solid ${isResolved ? '#fde68a' : '#a7f3d0'};" onclick="toggleFeedbackStatus(${f.id})" title="${isResolved ? 'Đánh dấu chưa xử lý' : 'Đánh dấu đã xử lý'}">
                            <i class="fa-solid ${isResolved ? 'fa-rotate-left' : 'fa-check'}"></i>
                        </button>
                        <button type="button" class="btn-action btn-delete" onclick="deleteFeedback(${f.id})" title="Xóa phản hồi này">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Lọc bảng Hòm thư góp ý theo từ khóa và trạng thái
 */
function filterFeedbackTable() {
    const searchInput = document.getElementById('feedback-search-input');
    const filterSelect = document.getElementById('feedback-filter-status');
    const kw = searchInput ? searchInput.value : '';
    const status = filterSelect ? filterSelect.value : 'all';
    renderFeedbackTable(kw, status);
}

/**
 * Đổi trạng thái phản hồi giữa "Chờ duyệt" và "Đã xử lý"
 */
function toggleFeedbackStatus(id) {
    const feedbacks = getSystemFeedbacks();
    const item = feedbacks.find(f => f.id === id);
    if (!item) return;

    item.status = (item.status === 'Đã xử lý') ? 'Chờ duyệt' : 'Đã xử lý';
    saveSystemFeedbacks(feedbacks);

    filterFeedbackTable();
    showToast(`Đã chuyển trạng thái sang "${item.status}"!`, 'success');
}

/**
 * Xóa 1 phản hồi
 */
function deleteFeedback(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa phản hồi này không? Hành động này không thể hoàn tác!')) return;

    let feedbacks = getSystemFeedbacks();
    feedbacks = feedbacks.filter(f => f.id !== id);
    saveSystemFeedbacks(feedbacks);

    filterFeedbackTable();
    showToast('Đã xóa phản hồi thành công!', 'success');
}

/**
 * Dọn dẹp toàn bộ phản hồi đã xử lý
 */
function clearResolvedFeedbacks() {
    let feedbacks = getSystemFeedbacks();
    const resolvedCount = feedbacks.filter(f => f.status === 'Đã xử lý').length;

    if (resolvedCount === 0) {
        showToast('Không có phản hồi nào ở trạng thái "Đã xử lý" để dọn dẹp!', 'warning');
        return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa toàn bộ ${resolvedCount} phản hồi "Đã xử lý"?`)) {
        feedbacks = feedbacks.filter(f => f.status !== 'Đã xử lý');
        saveSystemFeedbacks(feedbacks);
        filterFeedbackTable();
        showToast(`Đã dọn dẹp ${resolvedCount} phản hồi đã xử lý!`, 'success');
    }
}

/**
 * Xem chi tiết phản hồi bằng Modal Popup
 */
function viewFeedbackDetail(id) {
    const feedbacks = getSystemFeedbacks();
    const item = feedbacks.find(f => f.id === id);
    if (!item) return;

    const isResolved = item.status === 'Đã xử lý';

    showAdminModal({
        title: 'Chi tiết Ý kiến Góp ý & Báo lỗi',
        icon: 'fa-regular fa-envelope-open',
        content: `
            <div style="font-size: 14px; color: #334155; display: flex; flex-direction: column; gap: 14px;">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <div style="font-size: 12px; color: #64748b;">Người gửi:</div>
                        <strong style="font-size: 15px; color: #1e293b;"><i class="fa-regular fa-user" style="color: #2563eb; margin-right: 6px;"></i>${escapeHtml(item.username || 'Ẩn danh')}</strong>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: #64748b;">Thời gian:</div>
                        <span style="font-size: 13px; color: #475569;"><i class="fa-regular fa-calendar-check" style="margin-right: 4px;"></i>${escapeHtml(item.createdAt || '')}</span>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: #64748b;">Phân loại:</div>
                        <span style="display: inline-block; padding: 3px 10px; border-radius: 6px; background: #eff6ff; color: #2563eb; font-size: 12px; font-weight: 700;">
                            ${escapeHtml(item.type || 'Góp ý')}
                        </span>
                    </div>
                </div>

                <div>
                    <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">Tiêu đề:</div>
                    <div style="font-size: 16px; font-weight: 700; color: #1e293b; padding: 8px 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
                        ${escapeHtml(item.title || '(Không có tiêu đề)')}
                    </div>
                </div>

                <div>
                    <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">Nội dung chi tiết:</div>
                    <div style="font-size: 13.5px; line-height: 1.6; color: #334155; padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; white-space: pre-wrap; max-height: 250px; overflow-y: auto;">
                        ${escapeHtml(item.content || '')}
                    </div>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 6px; border-top: 1px solid #e2e8f0;">
                    <span style="font-size: 13px; color: #64748b;">Trạng thái hiện tại:</span>
                    <span class="fb-status-badge ${isResolved ? 'status-resolved' : 'status-pending'}" style="cursor: default;">
                        <i class="fa-solid ${isResolved ? 'fa-circle-check' : 'fa-clock'}"></i>
                        <span>${isResolved ? 'Đã xử lý' : 'Chờ duyệt'}</span>
                    </span>
                </div>
            </div>
        `,
        actionText: isResolved ? 'Đánh dấu Chờ duyệt' : 'Đánh dấu Đã xử lý',
        actionCallback: () => {
            toggleFeedbackStatus(item.id);
            closeAdminModal();
        },
        showCancel: true,
        cancelText: 'Đóng'
    });
}

