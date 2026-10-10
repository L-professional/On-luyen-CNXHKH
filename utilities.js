/**
 * Logic Quản lý Tiện ích & Hỗ trợ (utilities.js)
 * 4 Phân hệ: Thống kê kết quả, Lịch sử làm bài, Hướng dẫn sử dụng, Liên hệ / Góp ý
 * 
 * ⚠️ RÀNG BUỘC KỸ THUẬT:
 * - Độc lập dữ liệu (Data Isolation): Sử dụng prefix history_${currentUser.username}
 * - Không can thiệp vào dữ liệu gốc trong data/
 */

// Danh sách metadata chủ đề đồng bộ hệ thống
const TOPICS_METADATA = [
    {
        id: 1,
        title: "Chủ đề 1",
        name: "Chủ đề 1: Đối tượng, chức năng, phương pháp nghiên cứu của CNXH khoa học",
        icon: "fa-solid fa-book-open"
    },
    {
        id: 2,
        title: "Chủ đề 2",
        name: "Chủ đề 2: Sự ra đời và phát triển của CNXH khoa học",
        icon: "fa-solid fa-chart-line"
    },
    {
        id: 3,
        title: "Chủ đề 3",
        name: "Chủ đề 3: Sứ mệnh lịch sử của giai cấp công nhân",
        icon: "fa-solid fa-users"
    },
    {
        id: 4,
        title: "Chủ đề 4",
        name: "Chủ đề 4: Những đặc trưng cơ bản của CNXH và con đường đi lên CNXH ở Việt Nam",
        icon: "fa-regular fa-star"
    },
    {
        id: 5,
        title: "Chủ đề 5",
        name: "Chủ đề 5: Các hình thái kinh tế - xã hội",
        icon: "fa-solid fa-gear"
    },
    {
        id: 6,
        title: "Chủ đề 6",
        name: "Chủ đề 6: Thời kỳ quá độ lên CNXH",
        icon: "fa-solid fa-landmark"
    },
    {
        id: 'mock',
        title: "Thi mô phỏng",
        name: "Bài thi mô phỏng tổng hợp toàn diện (40 câu)",
        icon: "fa-solid fa-bullseye"
    }
];

// Khởi chạy khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    // 1. Kiểm tra xác thực người dùng
    const user = getCurrentUser();
    if (!user) {
        window.location.replace('login.html');
        return;
    }

    // Kiểm tra tính hợp lệ của phiên làm việc (Single Device Guard)
    if (!verifySession()) {
        return;
    }

    // 2. Cập nhật thông tin Header
    updateHeaderUser(user);

    // 3. Phân quyền hiển thị Menu Admin
    checkAdminMenu(user);

    // 4. Cập nhật Chuông thông báo
    updateNotificationBellUI();

    // 5. Khởi tạo Tab theo URL query parameter (?tab=stats|history|guide|feedback)
    const urlParams = new URLSearchParams(window.location.search);
    const initialTab = urlParams.get('tab') || 'stats';
    switchUtilityTab(initialTab, false);
});

// Đóng Dropdown thông báo khi click bên ngoài
document.addEventListener('click', (e) => {
    const wrap = document.getElementById('notification-wrap');
    const dropdown = document.getElementById('notification-dropdown');
    if (dropdown && !dropdown.classList.contains('hidden')) {
        if (!e.target.closest('#notification-wrap') && !e.target.closest('#notification-dropdown')) {
            closeNotificationDropdown();
        }
    }
});

// ==========================================================================
// 1. QUẢN LÝ PHIÊN & NGƯỜI DÙNG
// ==========================================================================
function getCurrentUser() {
    try {
        const str = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
        if (!str) return null;
        const u = JSON.parse(str);
        return (u && u.username) ? u : null;
    } catch (e) {
        return null;
    }
}

function updateHeaderUser(user) {
    const nameEl = document.getElementById('header-user-name');
    const avatarEl = document.getElementById('header-user-avatar');
    if (nameEl) nameEl.textContent = user.username;
    if (avatarEl && user.username) {
        avatarEl.textContent = user.username.charAt(0).toUpperCase();
    }
    const senderInput = document.getElementById('fb-sender');
    if (senderInput) senderInput.value = user.username;
    updateHeaderRankDisplay();
}

// ==========================================================================
// GAMIFICATION HELPERS FOR UTILITIES PAGE
// ==========================================================================
const RANK_LEVELS = [
    { level: 1, id: 'gamo', name: 'GÀ MỜ', minExp: 0, maxExp: 100, color: '#475569', icon: 'fa-solid fa-egg', badgeClass: 'rank-gamo', nextRankName: 'TẬP SỰ' },
    { level: 2, id: 'tapsu', name: 'TẬP SỰ', minExp: 101, maxExp: 300, color: '#15803d', icon: 'fa-solid fa-feather-pointed', badgeClass: 'rank-tapsu', nextRankName: 'TÂN BINH' },
    { level: 3, id: 'tanbinh', name: 'TÂN BINH', minExp: 301, maxExp: 600, color: '#1d4ed8', icon: 'fa-solid fa-shield-halved', badgeClass: 'rank-tanbinh', nextRankName: 'CAO THỦ' },
    { level: 4, id: 'caothu', name: 'CAO THỦ', minExp: 601, maxExp: 1000, color: '#7e22ce', icon: 'fa-solid fa-wand-magic-sparkles', badgeClass: 'rank-caothu', nextRankName: 'ĐẠI ĐẾ' },
    { level: 5, id: 'daide', name: 'ĐẠI ĐẾ', minExp: 1001, maxExp: 1500, color: '#b45309', icon: 'fa-solid fa-crown', badgeClass: 'rank-daide', nextRankName: 'CHÍ TÔN THẦN' },
    { level: 6, id: 'chitonthan', name: 'CHÍ TÔN THẦN', minExp: 1501, maxExp: Infinity, color: '#ffffff', icon: 'fa-solid fa-fire-flame-curved', badgeClass: 'rank-chitonthan', nextRankName: null }
];

function getUserStats() {
    const user = getCurrentUser();
    if (!user || !user.username) return { exp: 0, level: 1, rankId: 'gamo' };
    const key = 'userStats_' + user.username;
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return { exp: 0, level: 1, rankId: 'gamo' };
        const data = JSON.parse(raw);
        const exp = Math.max(0, parseInt(data.exp, 10) || 0);
        const rank = getRankByExp(exp);
        return { exp: exp, level: rank.level, rankId: rank.id };
    } catch (e) {
        return { exp: 0, level: 1, rankId: 'gamo' };
    }
}

function getRankByExp(exp) {
    const safeExp = Math.max(0, parseInt(exp, 10) || 0);
    for (let i = RANK_LEVELS.length - 1; i >= 0; i--) {
        if (safeExp >= RANK_LEVELS[i].minExp) return RANK_LEVELS[i];
    }
    return RANK_LEVELS[0];
}

function getRankProgress(exp) {
    const rank = getRankByExp(exp);
    if (rank.id === 'chitonthan') {
        return { percent: 100, expNeeded: 0, nextRankName: null, isMax: true };
    }
    const percent = Math.min(100, Math.max(0, Math.round((exp / rank.maxExp) * 100)));
    const expNeeded = Math.max(1, rank.maxExp - exp + 1);
    return { percent: percent, expNeeded: expNeeded, nextRankName: rank.nextRankName, isMax: false };
}

/**
 * Cập nhật huy hiệu cấp độ trên Header User Pill & Khung Avatar 6 Cấp độ
 */
function updateHeaderRankDisplay() {
    const user = getCurrentUser();
    if (!user) return;
    const stats = getUserStats();
    const rank = getRankByExp(stats.exp);

    const userPills = document.querySelectorAll('.user-pill');
    userPills.forEach(pill => {
        // 1. Cập nhật Badge Rank cạnh User Name
        let badgeEl = pill.querySelector('.header-user-rank-badge');
        if (!badgeEl) {
            badgeEl = document.createElement('span');
            badgeEl.className = 'header-user-rank-badge';
            const nameEl = pill.querySelector('.user-name');
            if (nameEl && nameEl.parentNode) {
                nameEl.parentNode.insertBefore(badgeEl, nameEl.nextSibling);
            } else {
                pill.appendChild(badgeEl);
            }
        }
        badgeEl.className = `header-user-rank-badge ${rank.badgeClass}`;
        badgeEl.innerHTML = `<i class="${rank.icon}"></i> <span>${rank.name}</span>`;
        badgeEl.title = `Cấp ${rank.level}: ${rank.name} (${stats.exp} EXP)`;

        // 2. Cập nhật Khung Avatar PNG thu nhỏ (.avatar-mini) trên Header
        const initial = (user && user.username) ? user.username.charAt(0).toUpperCase() : 'U';
        let frameEl = pill.querySelector('#header-avatar-frame') || pill.querySelector('.avatar-wrapper') || pill.querySelector('.avatar-frame');
        if (!frameEl) {
            frameEl = document.createElement('div');
            frameEl.id = 'header-avatar-frame';
            pill.insertBefore(frameEl, pill.firstChild);
        }
        frameEl.className = `avatar-wrapper rank-${rank.level} avatar-mini`;
        frameEl.textContent = initial;
        frameEl.title = `Cấp ${rank.level}: ${rank.name} (${stats.exp} EXP)`;

        const nameEl = pill.querySelector('.user-name');
        if (nameEl && user && user.username) {
            nameEl.textContent = user.username;
        }
    });

    // 3. Cập nhật tức thì vào Modal Tài khoản nếu Modal đang mở trên màn hình
    const initial = (user && user.username) ? user.username.charAt(0).toUpperCase() : 'U';
    const modalCenterpiece = document.getElementById('modal-moba-centerpiece');
    if (modalCenterpiece) {
        modalCenterpiece.innerHTML = `<div class="avatar-wrapper rank-${rank.level} avatar-large">${initial}</div>`;
    }
    const modalAvatarFrame = document.getElementById('modal-avatar-frame');
    if (modalAvatarFrame) {
        modalAvatarFrame.className = `avatar-wrapper rank-${rank.level}`;
        modalAvatarFrame.textContent = initial;
    }
    const modalUserCard = document.getElementById('modal-user-card');
    if (modalUserCard) {
        for (let i = 1; i <= 6; i++) {
            modalUserCard.classList.remove(`rank-${i}`);
        }
        modalUserCard.classList.add(`rank-${rank.level}`);
    }
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
 * Mở Modal Bộ Sưu Tập 6 Khung Avatar MOBA / Esports
 */
function openAvatarShowcaseModal() {
    let backdrop = document.getElementById('avatar-showcase-backdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'avatar-showcase-backdrop';
        backdrop.className = 'avatar-showcase-backdrop';
        backdrop.onclick = function(e) {
            if (e.target === backdrop) closeAvatarShowcaseModal();
        };
        document.body.appendChild(backdrop);
    }

    const user = getCurrentUser();
    const stats = getUserStats();
    const currentRank = getRankByExp(stats.exp);

    const cardsHtml = (typeof RANK_LEVELS !== 'undefined' ? RANK_LEVELS : []).map(r => {
        const isCurrent = r.level === currentRank.level;
        const cardClass = isCurrent ? 'avatar-showcase-card current-user-rank' : 'avatar-showcase-card';
        return `
            <div class="${cardClass}">
                ${renderRankContainerHtml(r.level, user ? user.username : 'User', { showExp: true })}
            </div>
        `;
    }).join('');

    backdrop.innerHTML = `
        <div class="avatar-showcase-dialog">
            <button type="button" class="avatar-showcase-close" onclick="closeAvatarShowcaseModal()" title="Đóng">
                <i class="fa-solid fa-xmark"></i>
            </button>
            <div class="avatar-showcase-header">
                <div class="avatar-showcase-title">
                    <i class="fa-solid fa-shield-halved" style="color: #60a5fa;"></i>
                    <span>HỆ THỐNG KHUNG AVATAR MOBA / ESPORTS</span>
                </div>
                <div class="avatar-showcase-sub">
                    Bộ sưu tập 6 cấp bậc vinh quang với hiệu ứng kim loại, đôi cánh, đá quý và bệ đỡ phát sáng
                </div>
            </div>
            <div class="avatar-showcase-grid">
                ${cardsHtml}
            </div>
        </div>
    `;

    requestAnimationFrame(() => {
        backdrop.classList.add('active');
    });
}

/**
 * Đóng Modal Bộ Sưu Tập Khung Avatar
 */
function closeAvatarShowcaseModal() {
    const backdrop = document.getElementById('avatar-showcase-backdrop');
    if (backdrop) {
        backdrop.classList.remove('active');
        setTimeout(() => {
            if (backdrop && !backdrop.classList.contains('active')) {
                backdrop.remove();
            }
        }, 300);
    }
}

function renderRankCardHtml() {
    const stats = getUserStats();
    const rank = getRankByExp(stats.exp);
    const prog = getRankProgress(stats.exp);

    const nextInfoHtml = prog.isMax
        ? `<i class="fa-solid fa-crown" style="color: #f59e0b;"></i> Đã đạt Cảnh giới Tối cao (MAX LEVEL)`
        : `<i class="fa-solid fa-angles-up"></i> Cần <strong>${prog.expNeeded} EXP</strong> nữa để thăng cấp <strong>${prog.nextRankName}</strong>`;

    return `
        <div class="user-rank-card ${rank.badgeClass}">
            <div class="urc-top">
                <div class="urc-badge-pill ${rank.badgeClass}">
                    <i class="${rank.icon}"></i>
                    <span>${rank.name}</span>
                </div>
                <div class="urc-exp-display">
                    <strong>${stats.exp.toLocaleString('vi-VN')}</strong>
                    <span class="urc-exp-unit">EXP</span>
                </div>
            </div>

            <div class="urc-progress-section">
                <div class="urc-progress-header">
                    <span>Tiến trình thăng cấp (Cấp ${rank.level})</span>
                    <span class="urc-prog-percent">${prog.percent}%</span>
                </div>
                <div class="urc-progress-track">
                    <div class="urc-progress-fill" style="width: ${prog.percent}%;"></div>
                </div>
                <div class="urc-next-info">
                    ${nextInfoHtml}
                </div>
            </div>

            <div class="urc-footer-tips">
                <i class="fa-solid fa-bolt" style="color: #f59e0b; font-size: 13px;"></i>
                <span>Ôn luyện: <strong>+2 EXP/câu</strong> &bull; Kiểm tra: <strong>+10 EXP/câu đúng</strong> &bull; Điểm 10: <strong>+50 EXP</strong></span>
            </div>

            <!-- NÚT XEM BỘ SƯU TẬP 6 KHUNG AVATAR MOBA -->
            <div style="margin-top: 10px;">
                <button type="button" class="btn-toggle-showcase" onclick="openAvatarShowcaseModal()" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(59, 130, 246, 0.4); background: linear-gradient(135deg, rgba(30, 58, 138, 0.5), rgba(15, 23, 42, 0.8)); color: #93c5fd; font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.2s ease;">
                    <span style="display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid fa-gem" style="color: #60a5fa;"></i>
                        <span>Bộ sưu tập 6 Khung Avatar MOBA</span>
                    </span>
                    <i class="fa-solid fa-chevron-right" style="font-size: 11px;"></i>
                </button>
            </div>

            <!-- NÚT XEM LỘ TRÌNH THĂNG CẤP -->
            <div class="urc-roadmap-trigger-wrap" style="margin-top: 8px;">
                <button type="button" class="btn-toggle-roadmap" id="btn-toggle-roadmap" onclick="toggleRankRoadmap()">
                    <span class="btr-left">
                        <i class="fa-solid fa-route"></i>
                        <span>Xem lộ trình thăng cấp</span>
                    </span>
                    <i class="fa-solid fa-chevron-down roadmap-chevron" id="roadmap-chevron"></i>
                </button>
            </div>

            <!-- KHU VỰC LỘ TRÌNH (ROADMAP) DẠNG TIMELINE -->
            <div class="urc-roadmap-container hidden" id="urc-roadmap-container">
                ${renderRankRoadmapHtml()}
            </div>
        </div>
    `;
}

/**
 * Render Lộ trình 6 Cảnh giới (Roadmap)
 */
function renderRankRoadmapHtml() {
    const stats = getUserStats();
    const currentRank = getRankByExp(stats.exp);

    const itemsHtml = RANK_LEVELS.map((r, index) => {
        let status = 'locked';
        let statusText = 'Chưa mở khóa';
        let statusIcon = '<i class="fa-solid fa-lock"></i>';
        let expText = r.maxExp === Infinity ? '> 1500 EXP' : `${r.minExp} - ${r.maxExp} EXP`;

        if (r.level < currentRank.level) {
            status = 'passed';
            statusText = 'Đã đạt';
            statusIcon = '<i class="fa-solid fa-circle-check"></i>';
        } else if (r.level === currentRank.level) {
            status = 'current';
            statusText = 'Hiện tại';
            statusIcon = '<i class="fa-solid fa-award"></i>';
        }

        const isLast = index === RANK_LEVELS.length - 1;

        return `
            <div class="roadmap-item ${status}">
                <div class="roadmap-marker-wrap">
                    <div class="roadmap-marker-node ${status}">
                        ${statusIcon}
                    </div>
                    ${!isLast ? `<div class="roadmap-line-connector ${status}"></div>` : ''}
                </div>
                <div class="roadmap-content-card ${status}">
                    <div class="rmc-left">
                        <div class="rmc-icon-badge ${r.badgeClass}">
                            <i class="${r.icon}"></i>
                        </div>
                        <div class="rmc-info">
                            <div class="rmc-title-row">
                                <span class="rmc-name">${r.name}</span>
                                <span class="rmc-level">Cấp ${r.level}</span>
                            </div>
                            <div class="rmc-exp-req">
                                <i class="fa-solid fa-fire-flame-curved"></i>
                                <span>${expText}</span>
                            </div>
                        </div>
                    </div>
                    <div class="rmc-status-badge ${status}">
                        ${statusText}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="roadmap-header-info">
            <div class="rhi-title">
                <i class="fa-solid fa-map-location-dot"></i>
                <span>Lộ trình 6 Cảnh giới</span>
            </div>
            <div class="rhi-sub">Hiện tại: <strong>${currentRank.name}</strong></div>
        </div>
        <div class="roadmap-timeline">
            ${itemsHtml}
        </div>
    `;
}

/**
 * Mở / Đóng Lộ trình cấp độ trong Modal Tài khoản
 */
function toggleRankRoadmap() {
    const container = document.getElementById('urc-roadmap-container');
    const btn = document.getElementById('btn-toggle-roadmap');
    if (!container) return;
    const isHidden = container.classList.toggle('hidden');
    if (btn) btn.classList.toggle('active', !isHidden);
}

// ==========================================================================
// HỆ THỐNG CHUÔNG THÔNG BÁO (NOTIFICATION BELL) TRÊN UTILITIES
// ==========================================================================
function getUserNotifications() {
    const user = getCurrentUser();
    if (!user || !user.username) return [];
    try {
        const key = 'notifications_' + user.username;
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch (e) {
        return [];
    }
}

function saveUserNotifications(notifications) {
    const user = getCurrentUser();
    if (!user || !user.username) return;
    try {
        const key = 'notifications_' + user.username;
        localStorage.setItem(key, JSON.stringify(notifications));
    } catch (e) {
        console.error('Lỗi lưu thông báo:', e);
    }
}

function addUserNotification({ message, date, type = 'levelup' }) {
    const user = getCurrentUser();
    if (!user || !user.username) return null;

    const list = getUserNotifications();
    const now = new Date();
    const defaultDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    const newNotif = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        message: message,
        date: date || defaultDate,
        isRead: false,
        type: type
    };

    list.unshift(newNotif);
    if (list.length > 50) list.length = 50;
    saveUserNotifications(list);
    updateNotificationBellUI();
    return newNotif;
}

function updateNotificationBellUI() {
    const list = getUserNotifications();
    const unreadCount = list.filter(n => !n.isRead).length;

    const dots = document.querySelectorAll('.notification-dot, #notification-dot');
    dots.forEach(dot => {
        dot.style.display = unreadCount > 0 ? 'block' : 'none';
    });

    const badge = document.getElementById('notif-unread-count');
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }
}

function renderNotificationDropdownHtml() {
    const list = getUserNotifications();
    const unreadCount = list.filter(n => !n.isRead).length;

    let itemsHtml = '';
    if (list.length === 0) {
        itemsHtml = `
            <div class="notif-empty-state">
                <div class="notif-empty-icon"><i class="fa-regular fa-bell-slash"></i></div>
                <p class="notif-empty-text">Không có thông báo mới</p>
            </div>
        `;
    } else {
        itemsHtml = list.map(item => {
            const isUnread = !item.isRead;
            const iconClass = item.type === 'levelup' ? 'fa-solid fa-trophy' : 'fa-solid fa-bell';
            const iconStyle = item.type === 'levelup' ? 'levelup' : 'general';

            return `
                <div class="notif-item ${isUnread ? 'unread' : 'read'}" data-id="${item.id}">
                    <div class="notif-icon-circle ${iconStyle}">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="notif-content">
                        <div class="notif-msg">${escapeHtml(item.message)}</div>
                        <div class="notif-date"><i class="fa-regular fa-clock"></i> ${escapeHtml(item.date)}</div>
                    </div>
                    ${isUnread ? '<div class="notif-unread-dot" title="Chưa đọc"></div>' : ''}
                </div>
            `;
        }).join('');
    }

    return `
        <div class="notif-dropdown-header">
            <div class="notif-header-title">
                <i class="fa-solid fa-bell" style="color: var(--primary);"></i>
                <span>Thông báo</span>
                <span class="notif-unread-badge" id="notif-unread-count" style="${unreadCount > 0 ? '' : 'display: none;'}">${unreadCount}</span>
            </div>
            <button type="button" class="notif-btn-close" onclick="closeNotificationDropdown()" title="Đóng">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
        <div class="notif-dropdown-list" id="notif-dropdown-list">
            ${itemsHtml}
        </div>
        <div class="notif-dropdown-footer">
            <button type="button" class="notif-btn-mark-all" onclick="markAllNotificationsAsRead()">
                <i class="fa-solid fa-check-double"></i>
                <span>Đánh dấu đã đọc tất cả</span>
            </button>
        </div>
    `;
}

function toggleNotificationDropdown(event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    closeMobileSidebar();

    let dropdown = document.getElementById('notification-dropdown');
    if (!dropdown) {
        const wrap = document.getElementById('notification-wrap') || document.querySelector('.notification-wrap');
        if (wrap) {
            dropdown = document.createElement('div');
            dropdown.id = 'notification-dropdown';
            dropdown.className = 'notification-dropdown hidden';
            wrap.appendChild(dropdown);
        } else {
            return;
        }
    }

    const isHidden = dropdown.classList.contains('hidden');
    if (isHidden) {
        dropdown.innerHTML = renderNotificationDropdownHtml();
        dropdown.classList.remove('hidden');
    } else {
        dropdown.classList.add('hidden');
    }
}

function closeNotificationDropdown() {
    const dropdown = document.getElementById('notification-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
}

function markAllNotificationsAsRead() {
    const list = getUserNotifications();
    list.forEach(n => n.isRead = true);
    saveUserNotifications(list);
    updateNotificationBellUI();

    const dropdown = document.getElementById('notification-dropdown');
    if (dropdown && !dropdown.classList.contains('hidden')) {
        dropdown.innerHTML = renderNotificationDropdownHtml();
    }
    showToast('Đã đánh dấu đã đọc tất cả thông báo!');
}

function checkAdminMenu(user) {
    const adminMenuItem = document.getElementById('admin-menu-item');
    if (adminMenuItem) {
        adminMenuItem.style.display = (user && user.role === 'admin') ? 'block' : 'none';
    }
}

// ==========================================================================
// 2. CHUYỂN ĐỔI TAB TIỆN ÍCH (STATS | HISTORY | GUIDE | FEEDBACK)
// ==========================================================================
function switchUtilityTab(tabName, updateUrl = true) {
    const validTabs = ['stats', 'history', 'guide', 'feedback'];
    if (!validTabs.includes(tabName)) {
        tabName = 'stats';
    }

    closeMobileSidebar();

    // 1. Cập nhật thanh Tab Pills
    document.querySelectorAll('.util-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeTabBtn = document.getElementById(`tab-btn-${tabName}`);
    if (activeTabBtn) activeTabBtn.classList.add('active');

    // 2. Cập nhật Menu Sidebar
    document.querySelectorAll('.utility-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeSidebarBtn = document.getElementById(`sidebar-tab-${tabName}`);
    if (activeSidebarBtn) activeSidebarBtn.classList.add('active');

    // 3. Hiển thị Content Pane tương ứng
    document.querySelectorAll('.util-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    const activePane = document.getElementById(`tab-pane-${tabName}`);
    if (activePane) activePane.classList.add('active');

    // 4. Cập nhật Header Tiêu đề & Icon
    updateHeaderCardInfo(tabName);

    // 5. Cập nhật URL mà không reload trang
    if (updateUrl && window.history && window.history.pushState) {
        const newUrl = window.location.pathname + `?tab=${tabName}`;
        window.history.pushState({ tab: tabName }, '', newUrl);
    }

    // 6. Thực thi render dữ liệu tương ứng
    if (tabName === 'stats') {
        renderStatsTab();
    } else if (tabName === 'history') {
        renderHistoryTab();
    } else if (tabName === 'guide') {
        // Hướng dẫn tĩnh, không cần gọi fetch
    } else if (tabName === 'feedback') {
        renderFeedbackTab();
    }
}

// Xử lý nút Back/Forward của trình duyệt
window.addEventListener('popstate', (e) => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab') || 'stats';
    switchUtilityTab(tab, false);
});

function updateHeaderCardInfo(tabName) {
    const titleEl = document.getElementById('util-header-title');
    const descEl = document.getElementById('util-header-desc');
    const iconEl = document.getElementById('util-header-icon');

    const config = {
        stats: {
            title: 'Thống kê kết quả học tập',
            desc: 'Tổng hợp chi tiết kết quả ôn thi, điểm trung bình và biểu đồ phân tích năng lực từng chủ đề.',
            icon: '<i class="fa-solid fa-chart-simple"></i>'
        },
        history: {
            title: 'Lịch sử làm bài kiểm tra',
            desc: 'Danh sách toàn bộ các lượt làm bài kiểm tra lấy điểm (mode=test) đã được hệ thống lưu lại.',
            icon: '<i class="fa-solid fa-clock-rotate-left"></i>'
        },
        guide: {
            title: 'Hướng dẫn sử dụng & Quy chế',
            desc: 'Cẩm nang chi tiết về cách ôn luyện từng câu, quy chế thi bấm giờ và cách xem lại bài thi.',
            icon: '<i class="fa-regular fa-circle-question"></i>'
        },
        feedback: {
            title: 'Liên hệ & Đóng góp ý kiến',
            desc: 'Gửi thắc mắc, báo lỗi câu hỏi hoặc đề xuất tính năng mới trực tiếp tới ban quản trị.',
            icon: '<i class="fa-regular fa-envelope"></i>'
        }
    };

    const c = config[tabName] || config.stats;
    if (titleEl) titleEl.textContent = c.title;
    if (descEl) descEl.textContent = c.desc;
    if (iconEl) iconEl.innerHTML = c.icon;
}

// ==========================================================================
// 3. PHÂN HỆ 1: THỐNG KÊ KẾT QUẢ (tab=stats)
// ==========================================================================
function getUserHistory() {
    const user = getCurrentUser();
    if (!user || !user.username) return [];
    const historyKey = 'history_' + user.username;
    try {
        const stored = localStorage.getItem(historyKey);
        const list = stored ? JSON.parse(stored) : [];
        return Array.isArray(list) ? list : [];
    } catch (e) {
        return [];
    }
}

function renderStatsTab() {
    const history = getUserHistory();

    const totalTestsEl = document.getElementById('stat-total-tests');
    const avgScoreEl = document.getElementById('stat-avg-score');
    const passRateEl = document.getElementById('stat-pass-rate');
    const maxScoreEl = document.getElementById('stat-max-score');
    const topicListEl = document.getElementById('topic-stat-list');

    const totalTests = history.length;

    // Tính toán bằng reduce và filter chuẩn JS
    let avgScore = 0;
    let passCount = 0;
    let maxScore = 0;

    if (totalTests > 0) {
        const sumScores = history.reduce((acc, item) => acc + (Number(item.score) || 0), 0);
        avgScore = (sumScores / totalTests).toFixed(1);
        passCount = history.filter(item => item.passed || Number(item.score) >= 5.0).length;
        maxScore = Math.max(...history.map(item => Number(item.score) || 0)).toFixed(1);
    }

    const passRate = totalTests > 0 ? Math.round((passCount / totalTests) * 100) : 0;

    if (totalTestsEl) totalTestsEl.textContent = `${totalTests} bài`;
    if (avgScoreEl) avgScoreEl.textContent = `${avgScore} / 10`;
    if (passRateEl) passRateEl.textContent = `${passRate}%`;
    if (maxScoreEl) maxScoreEl.textContent = `${maxScore} / 10`;

    // Render danh sách tiến độ điểm số theo từng chủ đề
    if (!topicListEl) return;

    topicListEl.innerHTML = TOPICS_METADATA.map(t => {
        const topicHistory = history.filter(h => String(h.topicId) === String(t.id));
        const attempts = topicHistory.length;

        let bestScore = 0;
        let bestPercent = 0;
        let scoreDisplay = 'Chưa thi';
        let fillClass = 'none';

        if (attempts > 0) {
            bestScore = Math.max(...topicHistory.map(h => Number(h.score) || 0)).toFixed(1);
            bestPercent = Math.min(100, Math.round((Number(bestScore) / 10) * 100));
            scoreDisplay = `${bestScore} / 10`;
            if (Number(bestScore) >= 8.0) fillClass = 'excellent';
            else if (Number(bestScore) >= 5.0) fillClass = 'pass';
            else fillClass = 'fail';
        }

        const isMock = t.id === 'mock';
        const targetHref = `practice.html?topic=${t.id}&mode=test`;

        return `
            <div class="topic-stat-item">
                <div class="tsi-icon" style="${isMock ? 'background: #fef2f2; color: #ef4444;' : ''}">
                    <i class="${t.icon}"></i>
                </div>
                <div class="tsi-details">
                    <div class="tsi-title-row">
                        <span class="tsi-name" title="${escapeHtml(t.name)}">${escapeHtml(t.name)}</span>
                        <span class="tsi-score" style="${attempts === 0 ? 'color: #94a3b8; font-size: 13px;' : ''}">${scoreDisplay}</span>
                    </div>
                    <div class="tsi-progress-bar">
                        <div class="tsi-progress-fill ${fillClass}" style="width: ${bestPercent}%;"></div>
                    </div>
                    <div class="tsi-sub-row">
                        <span>Đã thi: <strong>${attempts}</strong> lượt</span>
                        <span>Điểm cao nhất: <strong>${attempts > 0 ? bestPercent + '%' : '0%'}</strong></span>
                    </div>
                </div>
                <a href="${targetHref}" class="btn-tsi-action" title="Làm bài kiểm tra chủ đề này">
                    <i class="fa-solid fa-play"></i>
                    <span>${attempts > 0 ? 'Thi lại' : 'Làm bài'}</span>
                </a>
            </div>
        `;
    }).join('');
}

// ==========================================================================
// 4. PHÂN HỆ 2: LỊCH SỬ LÀM BÀI (tab=history)
// ==========================================================================
function renderHistoryTab() {
    const history = getUserHistory();
    const container = document.getElementById('history-container');
    if (!container) return;

    if (history.length === 0) {
        container.innerHTML = `
            <div class="empty-state-box">
                <div class="empty-state-icon">
                    <i class="fa-solid fa-clock-rotate-left"></i>
                </div>
                <h4 class="empty-state-title">Bạn chưa làm bài kiểm tra nào!</h4>
                <p class="empty-state-desc">
                    Hãy tham gia làm ít nhất một bài kiểm tra tính điểm (mode=test) để hệ thống tự động ghi nhận kết quả và xếp hạng năng lực cho bạn.
                </p>
                <a href="practice.html?topic=mock&mode=test" class="btn-tsi-action" style="padding: 10px 20px; font-size: 13.5px; background: var(--primary); color: #fff; border: none; border-radius: 10px;">
                    <i class="fa-solid fa-bullseye"></i>
                    <span>Bắt đầu thi thử ngay</span>
                </a>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="table-responsive" style="margin-top: 10px;">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th style="width: 50px; text-align: center;">STT</th>
                        <th style="width: 160px;">Thời gian nộp</th>
                        <th>Chủ đề bài thi</th>
                        <th style="width: 130px; text-align: center;">Số câu đúng</th>
                        <th style="width: 110px; text-align: center;">Thời gian</th>
                        <th style="width: 100px; text-align: center;">Điểm số</th>
                        <th style="width: 120px; text-align: center;">Đánh giá</th>
                        <th style="width: 90px; text-align: center;">Xóa</th>
                    </tr>
                </thead>
                <tbody>
                    ${history.map((item, idx) => {
                        const isPass = item.passed || Number(item.score) >= 5.0;
                        const scoreVal = Number(item.score).toFixed(1);
                        return `
                            <tr>
                                <td style="text-align: center; font-weight: 600; color: #64748b;">${idx + 1}</td>
                                <td style="color: #64748b; font-size: 13px;">
                                    <i class="fa-regular fa-calendar-check" style="margin-right: 4px; font-size: 11px;"></i>
                                    ${escapeHtml(item.date)}
                                </td>
                                <td>
                                    <strong style="color: #1e293b; font-size: 13.5px;">${escapeHtml(item.topicName)}</strong>
                                </td>
                                <td style="text-align: center; font-weight: 600; color: #334155;">
                                    ${item.correctCount} / ${item.totalQuestions}
                                </td>
                                <td style="text-align: center; color: #64748b; font-size: 13px;">
                                    <i class="fa-regular fa-clock" style="margin-right: 3px; font-size: 11px;"></i>
                                    ${item.timeSpent || '15:00'}
                                </td>
                                <td style="text-align: center;">
                                    <span style="font-size: 15px; font-weight: 800; color: ${isPass ? '#10b981' : '#ef4444'};">
                                        ${scoreVal}
                                    </span>
                                </td>
                                <td style="text-align: center;">
                                    <span class="${isPass ? 'badge-pass' : 'badge-fail'}">
                                        <i class="fa-solid ${isPass ? 'fa-check' : 'fa-xmark'}"></i>
                                        <span>${isPass ? 'Đạt' : 'Chưa đạt'}</span>
                                    </span>
                                </td>
                                <td style="text-align: center;">
                                    <button type="button" class="btn-action" style="padding: 5px 8px; background: #fef2f2; color: #dc2626; border: 1px solid #fecdd3; border-radius: 6px;" onclick="deleteHistoryItem(${item.id})" title="Xóa lượt thi này">
                                        <i class="fa-solid fa-trash-can" style="font-size: 12px;"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function deleteHistoryItem(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa kết quả lượt thi này khỏi lịch sử cá nhân?')) return;
    const user = getCurrentUser();
    if (!user || !user.username) return;

    const historyKey = 'history_' + user.username;
    let history = getUserHistory();
    history = history.filter(item => item.id !== id);
    localStorage.setItem(historyKey, JSON.stringify(history));

    showToast('Đã xóa lượt thi khỏi lịch sử!');
    renderHistoryTab();
}

function confirmClearHistory() {
    const history = getUserHistory();
    if (history.length === 0) {
        showToast('Lịch sử làm bài hiện đang trống!', 'warning');
        return;
    }

    if (confirm('CẢNH BÁO: Bạn có chắc chắn muốn xóa TOÀN BỘ lịch sử làm bài kiểm tra của tài khoản này? Hành động này không thể hoàn tác.')) {
        const user = getCurrentUser();
        if (!user || !user.username) return;
        const historyKey = 'history_' + user.username;
        localStorage.removeItem(historyKey);
        showToast('Đã dọn sạch toàn bộ lịch sử thi!');
        renderHistoryTab();
    }
}

// ==========================================================================
// 5. PHÂN HỆ 3: HƯỚNG DẪN SỬ DỤNG (ACCORDION)
// ==========================================================================
function toggleAccordion(headerBtn) {
    const item = headerBtn.closest('.guide-acc-item');
    if (!item) return;
    item.classList.toggle('open');
}

// ==========================================================================
// 6. PHÂN HỆ 4: LIÊN HỆ / GÓP Ý (tab=feedback)
// ==========================================================================
function handleSendFeedback(e) {
    e.preventDefault();

    const user = getCurrentUser();
    if (!user || !user.username) {
        showToast('Vui lòng đăng nhập để gửi góp ý!', 'error');
        return;
    }

    const typeSelect = document.getElementById('fb-type');
    const titleInput = document.getElementById('fb-title');
    const contentTextarea = document.getElementById('fb-content');

    if (!titleInput || !contentTextarea) return;

    const type = typeSelect ? typeSelect.value : 'Khác';
    const title = titleInput.value.trim();
    const content = contentTextarea.value.trim();

    if (title.length < 4) {
        showToast('Tiêu đề góp ý phải có ít nhất 4 ký tự!', 'error');
        titleInput.focus();
        return;
    }

    if (content.length < 10) {
        showToast('Nội dung góp ý phải có ít nhất 10 ký tự!', 'error');
        contentTextarea.focus();
        return;
    }

    // Định dạng ngày giờ gửi
    const now = new Date();
    const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Tạo Object góp ý
    const newFeedback = {
        id: Date.now(),
        username: user.username,
        type: type,
        title: title,
        content: content,
        createdAt: dateFormatted,
        status: 'Chờ duyệt'
    };

    // Lưu vào mảng chung system_feedbacks trên localStorage
    let allFeedbacks = [];
    try {
        const raw = localStorage.getItem('system_feedbacks');
        allFeedbacks = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(allFeedbacks)) allFeedbacks = [];
    } catch (err) {
        allFeedbacks = [];
    }

    allFeedbacks.unshift(newFeedback);
    localStorage.setItem('system_feedbacks', JSON.stringify(allFeedbacks));

    // Hiển thị Toast thông báo và reset form
    showToast('Gửi thành công! Cảm ơn bạn đã đóng góp ý kiến.');
    titleInput.value = '';
    contentTextarea.value = '';

    // Cập nhật lại danh sách góp ý của user này
    renderUserFeedbackList();
}

function renderFeedbackTab() {
    renderUserFeedbackList();
}

function renderUserFeedbackList() {
    const user = getCurrentUser();
    const container = document.getElementById('user-feedback-list-container');
    if (!container || !user) return;

    let allFeedbacks = [];
    try {
        const raw = localStorage.getItem('system_feedbacks');
        allFeedbacks = raw ? JSON.parse(raw) : [];
    } catch (e) {
        allFeedbacks = [];
    }

    const myFeedbacks = allFeedbacks.filter(f => f.username === user.username);

    if (myFeedbacks.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 24px 10px; color: #94a3b8; font-size: 13.5px;">
                <i class="fa-regular fa-envelope-open" style="font-size: 24px; margin-bottom: 6px; display: block; color: #cbd5e1;"></i>
                Bạn chưa gửi ý kiến đóng góp nào. Hãy điền form bên trên khi phát hiện câu hỏi chưa chính xác hoặc muốn bổ sung tính năng!
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="table-responsive" style="margin-top: 8px;">
            <table class="feedback-history-table">
                <thead>
                    <tr>
                        <th style="width: 150px;">Thời gian</th>
                        <th style="width: 180px;">Phân loại</th>
                        <th>Tiêu đề & Nội dung</th>
                        <th style="width: 110px; text-align: center;">Trạng thái</th>
                    </tr>
                </thead>
                <tbody>
                    ${myFeedbacks.map(f => `
                        <tr>
                            <td style="color: #64748b; font-size: 12.5px;">
                                <i class="fa-regular fa-calendar" style="margin-right: 4px; font-size: 11px;"></i>
                                ${escapeHtml(f.createdAt)}
                            </td>
                            <td>
                                <span style="display: inline-block; padding: 3px 8px; border-radius: 6px; background: #eff6ff; color: #2563eb; font-size: 12px; font-weight: 600;">
                                    ${escapeHtml(f.type)}
                                </span>
                            </td>
                            <td>
                                <div style="font-weight: 700; color: #1e293b; margin-bottom: 3px;">${escapeHtml(f.title)}</div>
                                <div style="color: #475569; font-size: 13px; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(f.content)}</div>
                            </td>
                            <td style="text-align: center;">
                                <span style="display: inline-block; padding: 3px 8px; border-radius: 9999px; background: ${f.status === 'Đã xử lý' ? '#ecfdf5' : '#fffbeb'}; color: ${f.status === 'Đã xử lý' ? '#059669' : '#d97706'}; font-size: 11.5px; font-weight: 700; border: 1px solid ${f.status === 'Đã xử lý' ? '#a7f3d0' : '#fde68a'};">
                                    ${escapeHtml(f.status || 'Chờ duyệt')}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ==========================================================================
// 7. TOAST NOTIFICATION & MODAL POPUP TIỆN ÍCH DÙNG CHUNG
// ==========================================================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast-message');
    if (!toast) return;

    let iconClass = 'fa-circle-check';
    let iconColor = '#10b981';
    if (type === 'error') {
        iconClass = 'fa-circle-exclamation';
        iconColor = '#ef4444';
    } else if (type === 'warning') {
        iconClass = 'fa-triangle-exclamation';
        iconColor = '#f59e0b';
    }

    toast.innerHTML = `<i class="fa-solid ${iconClass}" style="color: ${iconColor};"></i> <span>${escapeHtml(message)}</span>`;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 2800);
}

function showModal({ title, icon, content, actionText = 'Đóng', actionCallback = null }) {
    const modalBackdrop = document.getElementById('modal-container');
    const modalCard = document.getElementById('modal-card');
    if (!modalBackdrop || !modalCard) return;

    modalCard.innerHTML = `
        <div class="modal-header">
            <h3 class="modal-title">
                <i class="${icon}"></i>
                <span>${title}</span>
            </h3>
            <button class="btn-close-modal" onclick="closeModal()">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
        <div class="modal-body">
            ${content}
        </div>
        <div class="modal-footer">
            <button class="btn-modal-action" id="modal-primary-btn">${actionText}</button>
        </div>
    `;

    document.getElementById('modal-primary-btn').onclick = () => {
        if (actionCallback) actionCallback();
        else closeModal();
    };

    modalBackdrop.classList.remove('hidden');
}

function closeModal() {
    const modalBackdrop = document.getElementById('modal-container');
    if (modalBackdrop) modalBackdrop.classList.add('hidden');
}

function closeModalOnBackdrop(e) {
    if (e.target.id === 'modal-container') {
        closeModal();
    }
}

function openUserMenuModal() {
    closeMobileSidebar();
    const user = getCurrentUser();
    const roleText = (user && user.role === 'admin') ? 'Quản trị viên (Admin)' : 'Học viên (User)';
    const roleBadgeColor = (user && user.role === 'admin') ? '#2563eb' : '#10b981';

    const stats = getUserStats();
    const rank = getRankByExp(stats.exp);

    let avatarBg = roleBadgeColor;
    if (rank.level === 5) {
        avatarBg = 'linear-gradient(135deg, #f59e0b, #b45309)';
    } else if (rank.level === 6) {
        avatarBg = 'linear-gradient(135deg, #ef4444, #991b1b)';
    }

    showModal({
        title: 'Tài khoản người dùng',
        icon: 'fa-solid fa-user-circle',
        content: `
            <div style="font-size: 14px; color: #334155; display: flex; flex-direction: column; gap: 14px;">
                <!-- TÂM ĐIỂM KHUNG AVATAR PNG 6 CẤP ĐỘ -->
                <div id="modal-moba-centerpiece" style="display: flex; justify-content: center; align-items: center; padding: 20px 0; background: radial-gradient(circle at center, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.5);">
                    <div class="avatar-wrapper rank-${rank.level} avatar-large">${user ? user.username.charAt(0).toUpperCase() : 'U'}</div>
                </div>

                <!-- Thông tin người dùng với Khung Avatar & Card theo Cấp độ (.rank-1 .. .rank-6) -->
                <div class="modal-user-card rank-${rank.level}" id="modal-user-card">
                    <div class="avatar-wrapper rank-${rank.level}" id="modal-avatar-frame" style="width: 52px; height: 52px; font-size: 20px;">
                        ${user ? user.username.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div class="muc-info">
                        <div class="muc-name">${user ? user.username : 'Chưa đăng nhập'}</div>
                        <div class="muc-role">
                            ${roleText}
                        </div>
                    </div>
                </div>

                <!-- KHU VỰC THẺ BÀI (RANK CARD) HIỂN THỊ CẤP ĐỘ & EXP -->
                ${renderRankCardHtml()}

                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <button type="button" style="padding: 10px 14px; border-radius: 8px; border: 1px solid #fecdd3; background: #fef2f2; text-align: left; cursor: pointer; font-size: 13.5px; display: flex; align-items: center; gap: 10px; color: #dc2626; font-weight: 600;" onclick="logoutUser()">
                        <i class="fa-solid fa-arrow-right-from-bracket"></i>
                        <span>Đăng xuất (Về trang đăng nhập)</span>
                    </button>
                </div>
            </div>
        `,
        actionText: 'Đóng'
    });
}

// ==========================================================================
// KIỂM SOÁT PHIÊN ĐĂNG NHẬP ĐƠN THIẾT BỊ (SINGLE-DEVICE / SINGLE SESSION GUARD)
// ==========================================================================
let isSessionTerminated = false;

function verifySession() {
    if (isSessionTerminated) return false;

    const user = getCurrentUser();
    if (!user) {
        return false;
    }

    let users = [];
    try {
        const str = localStorage.getItem('userList');
        if (str) users = JSON.parse(str);
    } catch (e) {
        users = [];
    }

    const matched = users.find(u => u.username && u.username.toLowerCase() === user.username.toLowerCase());
    if (matched) {
        if (matched.activeSession && user.sessionId && matched.activeSession !== user.sessionId) {
            isSessionTerminated = true;
            forceLogoutSession('Tài khoản của bạn vừa được đăng nhập ở một nơi khác. Vui lòng đăng nhập lại!');
            return false;
        }

        if (matched.activeSession && !user.sessionId) {
            isSessionTerminated = true;
            forceLogoutSession('Tài khoản của bạn vừa được đăng nhập ở một nơi khác. Vui lòng đăng nhập lại!');
            return false;
        }
    } else {
        isSessionTerminated = true;
        forceLogoutSession('Tài khoản của bạn không tồn tại hoặc đã bị xóa. Vui lòng liên hệ Quản trị viên!');
        return false;
    }

    return true;
}

function forceLogoutSession(message) {
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');

    resetAllProgressUI();

    if (message) {
        alert(message);
    }

    window.location.replace('login.html');
}

function resetAllProgressUI() {
    document.querySelectorAll('.tdc-progress-fill, .progress-fill, .urc-progress-fill').forEach(el => {
        el.style.width = '0%';
    });
    document.querySelectorAll('.tdc-progress-percent, .progress-percent, .urc-prog-percent').forEach(el => {
        el.textContent = '0%';
    });
    document.querySelectorAll('.header-user-rank-badge').forEach(badge => {
        badge.remove();
    });
    // Reset tên người dùng & avatar về mặc định
    document.querySelectorAll('#header-user-name, .user-name').forEach(nameEl => {
        nameEl.textContent = 'Khách';
    });
    document.querySelectorAll('.user-avatar').forEach(avatarEl => {
        avatarEl.innerHTML = '<i class="fa-solid fa-user"></i>';
    });

    // Reset khung Avatar và Avatar về Rank 1
    document.querySelectorAll('.avatar-frame, .user-avatar, .modal-user-card').forEach(el => {
        for (let i = 1; i <= 6; i++) {
            el.classList.remove(`rank-${i}`);
        }
        el.classList.add('rank-1');
    });
}

function logoutUser() {
    const user = getCurrentUser();
    if (user && user.username) {
        try {
            const users = JSON.parse(localStorage.getItem('userList') || '[]');
            const idx = users.findIndex(u => u.username && u.username.toLowerCase() === user.username.toLowerCase());
            if (idx !== -1 && users[idx].activeSession === user.sessionId) {
                users[idx].activeSession = null;
                localStorage.setItem('userList', JSON.stringify(users));
            }
        } catch (e) {
            // ignore
        }
    }

    // 1. Xóa sạch currentUser
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');

    // 2. Reset các hiển thị giao diện
    resetAllProgressUI();

    // Đóng Modal nếu đang mở
    if (typeof closeModal === 'function') {
        closeModal();
    }

    // 3. Điều hướng an toàn bằng window.location.replace để ngăn nút Back
    window.location.replace('login.html');
}

window.addEventListener('storage', (e) => {
    if (e.key === 'userList' || e.key === 'currentUser' || e.key === null) {
        verifySession();
    }
});

window.addEventListener('focus', () => {
    verifySession();
});

window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
        verifySession();
    }
});

setInterval(() => {
    verifySession();
}, 2500);

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

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
