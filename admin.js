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
    },
    {
        userId: 'u_student_loc_2026',
        username: 'Loc',
        password: '123',
        role: 'user',
        createdAt: '08/10/2026',
        isRoot: false,
        status: 'offline',
        lastActive: Date.now(),
        activeSession: null,
        exp: 50
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
 * Khởi tạo dữ liệu người dùng trên Firebase / Fallback
 */
async function ensureUserListInitialized() {
    if (window.FirebaseService) {
        await FirebaseService.ensureInitialData();
        adminUsersList = await FirebaseService.getAllUsers();
    } else {
        if (!localStorage.getItem('userList')) {
            localStorage.setItem('userList', JSON.stringify(DEFAULT_USERS));
            adminUsersList = [...DEFAULT_USERS];
        } else {
            try {
                const list = JSON.parse(localStorage.getItem('userList') || '[]');
                const hasAdmin = list.some(u => (u.username || '').toLowerCase() === 'admin');
                if (!hasAdmin) {
                    list.unshift(DEFAULT_USERS[0]);
                    localStorage.setItem('userList', JSON.stringify(list));
                }
                adminUsersList = list;
            } catch (e) {
                adminUsersList = [...DEFAULT_USERS];
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
                    adminUsersList = Object.keys(data).map(uid => ({
                        ...data[uid],
                        userId: uid
                    }));
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

function getUserList() {
    if (adminUsersList && adminUsersList.length > 0) {
        return adminUsersList;
    }
    try {
        const listStr = localStorage.getItem('userList');
        return listStr ? JSON.parse(listStr) : [...DEFAULT_USERS];
    } catch (e) {
        return [...DEFAULT_USERS];
    }
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
const RANK_LEVELS = [
    { level: 1, id: 'gamo', name: 'GÀ MỜ', minExp: 0, maxExp: 100, color: '#475569', icon: 'fa-solid fa-egg', badgeClass: 'rank-gamo' },
    { level: 2, id: 'tapsu', name: 'TẬP SỰ', minExp: 101, maxExp: 300, color: '#15803d', icon: 'fa-solid fa-feather-pointed', badgeClass: 'rank-tapsu' },
    { level: 3, id: 'tanbinh', name: 'TÂN BINH', minExp: 301, maxExp: 600, color: '#1d4ed8', icon: 'fa-solid fa-shield-halved', badgeClass: 'rank-tanbinh' },
    { level: 4, id: 'caothu', name: 'CAO THỦ', minExp: 601, maxExp: 1000, color: '#7e22ce', icon: 'fa-solid fa-wand-magic-sparkles', badgeClass: 'rank-caothu' },
    { level: 5, id: 'daide', name: 'ĐẠI ĐẾ', minExp: 1001, maxExp: 1500, color: '#b45309', icon: 'fa-solid fa-crown', badgeClass: 'rank-daide' },
    { level: 6, id: 'chitonthan', name: 'CHÍ TÔN THẦN', minExp: 1501, maxExp: Infinity, color: '#ffffff', icon: 'fa-solid fa-fire-flame-curved', badgeClass: 'rank-chitonthan' }
];

/**
 * Đọc tổng điểm EXP của một tài khoản từ localStorage
 * Kiểm tra cả userStats_${username} và exp_${username} (kể cả chữ thường)
 */
function getUserExp(username, userObj = null) {
    if (!username) return 0;
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

function getRankByExp(exp) {
    const safeExp = Math.max(0, parseInt(exp, 10) || 0);
    for (let i = RANK_LEVELS.length - 1; i >= 0; i--) {
        if (safeExp >= RANK_LEVELS[i].minExp) {
            return RANK_LEVELS[i];
        }
    }
    return RANK_LEVELS[0];
}

function getRankLevelByExp(exp) {
    return getRankByExp(exp).level;
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

function updateAdminHeaderInfo() {
    const userStr = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    if (!userStr) return;
    try {
        const user = JSON.parse(userStr);
        const nameEl = document.getElementById('admin-user-display-name');
        if (nameEl && user.username) {
            nameEl.textContent = user.username;
        }

        const exp = getUserExp(user.username, user);
        const rank = getRankByExp(exp);
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
                badgeEl.className = `header-user-rank-badge ${rank.badgeClass}`;
                badgeEl.innerHTML = `<i class="${rank.icon}"></i> <span>${rank.name}</span>`;
                badgeEl.title = `Cấp ${rank.level}: ${rank.name} (${exp} EXP)`;
            }
        }

        // Cập nhật Khung Avatar PNG thu nhỏ trên Header Admin
        const frameEl = document.getElementById('header-avatar-frame');
        if (frameEl) {
            const initial = (user.username) ? user.username.charAt(0).toUpperCase() : 'A';
            frameEl.className = `avatar-wrapper rank-${rankLevel} avatar-mini`;
            frameEl.textContent = initial;
            frameEl.title = `Cấp ${rank.level}: ${rank.name} (${exp} EXP)`;
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

    let users = getUserList();

    // Loại bỏ trùng lặp UID hoặc username nếu có bản ghi tạo đúp
    const seenUids = new Set();
    const seenNames = new Set();
    users = users.filter(u => {
        const uid = u.userId || ('u_' + (u.username || '').toLowerCase());
        const uname = (u.username || '').toLowerCase().trim();
        if (seenUids.has(uid) || (uname && seenNames.has(uname))) {
            return false;
        }
        seenUids.add(uid);
        if (uname) seenNames.add(uname);
        return true;
    });

    if (countBadge) {
        countBadge.textContent = users.length;
    }

    if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase().trim();
        users = users.filter(u => (u.username && u.username.toLowerCase().includes(kw)) || (u.role && u.role.toLowerCase().includes(kw)));
    }

    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 30px; color: #94a3b8; font-size: 13.5px;">
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

        // Đọc tổng điểm EXP và xác định Cấp độ MOBA (rank-1 .. rank-6)
        const userExp = getUserExp(u.username, u);
        const userRank = getRankByExp(userExp);
        const rankLevel = userRank.level;

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

        return `
            <tr>
                <td style="text-align: center; font-weight: 600; color: #64748b;">${idx + 1}</td>
                <td>
                    <div class="user-row-name">
                        <div class="avatar-wrapper rank-${rankLevel} avatar-mini" title="Cấp ${rankLevel}: ${userRank.name} (${userExp} EXP)">
                            ${(u.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <strong style="color: #1e293b; font-size: 14px;">${escapeHtml(u.username)}</strong>
                            ${isRootAdmin ? '<span class="root-badge"><i class="fa-solid fa-crown" style="font-size: 9px;"></i> Root Admin</span>' : ''}
                        </div>
                    </div>
                </td>
                <td style="white-space: nowrap;">
                    ${statusHtml}
                </td>
                <td>
                    ${passwordCellHtml}
                </td>
                <td>
                    <span class="role-badge ${roleClass}">
                        <i class="fa-solid ${roleIcon}"></i>
                        <span>${roleLabel}</span>
                    </span>
                </td>
                <td style="color: #64748b; font-size: 13px;">
                    <i class="fa-regular fa-calendar" style="margin-right: 4px; font-size: 11px;"></i>
                    ${u.createdAt || '08/10/2026'}
                </td>
                <td>
                    <div class="action-buttons-group">
                        <button type="button" class="btn-action btn-edit-pwd" onclick="openEditPasswordModal('${escapeHtml(userId)}')" title="Đổi mật khẩu cho ${escapeHtml(u.username)}">
                            <i class="fa-solid fa-key"></i>
                            <span>Sửa MK</span>
                        </button>
                        <button type="button" class="btn-action btn-edit-name" onclick="changeUsername('${escapeHtml(userId)}')" title="Đổi tên đăng nhập cho ${escapeHtml(u.username)}">
                            <i class="fa-solid fa-pen"></i>
                            <span>Sửa Tên</span>
                        </button>
                        ${isRootAdmin ? `
                            <button type="button" class="btn-action btn-delete btn-disabled" disabled title="Tài khoản Admin gốc không được phép xóa">
                                <i class="fa-solid fa-lock"></i>
                                <span>Mặc định</span>
                            </button>
                        ` : `
                            <button type="button" class="btn-action btn-delete" onclick="handleDeleteUser('${escapeHtml(userId)}')" title="Xóa tài khoản ${escapeHtml(u.username)}">
                                <i class="fa-solid fa-trash-can"></i>
                                <span>Xóa</span>
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Đổi tên người dùng (Task 3: Admin User Rename)
 * Lưu theo UID cố định trên Firebase, bảo toàn 100% dữ liệu lịch sử thi & tiến độ
 * @param {string} userId UID của người dùng
 */
async function changeUsername(userId) {
    if (!userId) return;
    const users = getUserList();
    const user = users.find(u => u.userId === userId || (u.username && u.username.toLowerCase() === userId.toLowerCase()));
    if (!user) {
        showToast('Không tìm thấy tài khoản người dùng!', 'error');
        return;
    }

    const promptMsg = `Nhập tên đăng nhập mới cho "${user.username}":\n(Toàn bộ điểm số, lịch sử thi và tiến độ ôn luyện của học viên đều được bảo toàn 100% nhờ lưu theo UID cố định)`;
    const newName = prompt(promptMsg, user.username);
    if (newName === null) return; // Người dùng ấn Hủy

    const cleanName = newName.trim();
    if (!cleanName) {
        alert('Tên đăng nhập không được để trống!');
        return;
    }
    if (/\s/.test(cleanName)) {
        alert('Tên đăng nhập không được chứa khoảng trắng!');
        return;
    }
    if (cleanName.toLowerCase() === user.username.toLowerCase()) {
        showToast('Tên đăng nhập không thay đổi.', 'warning');
        return;
    }

    try {
        if (window.FirebaseService) {
            await FirebaseService.changeUsername(user.userId, cleanName);
        } else {
            // Kiểm tra trùng lặp
            const isDup = users.some(u => u.userId !== user.userId && u.username && u.username.toLowerCase() === cleanName.toLowerCase());
            if (isDup) {
                alert(`Tên đăng nhập "${cleanName}" đã được sử dụng bởi một tài khoản khác!`);
                return;
            }
            user.username = cleanName;
            await saveUserList(users);
        }
        showToast(`Đã đổi tên tài khoản thành "${cleanName}" thành công!`, 'success');
        renderUserTable();
    } catch (err) {
        alert(err.message || 'Lỗi khi đổi tên người dùng!');
    }
}

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

    const iconClass = (type === 'error') ? 'fa-circle-xmark' : 'fa-circle-check';
    const iconColor = (type === 'error') ? '#f87171' : '#38bdf8';

    toast.innerHTML = `<i class="fa-solid ${iconClass}" style="color: ${iconColor};"></i> <span>${message}</span>`;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 2400);
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
                        <span>Đăng xuất</span>
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
    const users = getUserList();
    const feedbacks = getSystemFeedbacks();
    const pendingCount = feedbacks.filter(f => (f.status || 'Chờ duyệt') === 'Chờ duyệt').length;

    const badgeUsers = document.getElementById('badge-users-count');
    const totalUsers = document.getElementById('total-users-count');
    if (badgeUsers) badgeUsers.textContent = users.length;
    if (totalUsers) totalUsers.textContent = users.length;

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

