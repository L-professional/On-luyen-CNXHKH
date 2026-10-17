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
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Kiểm tra xác thực người dùng qua Firebase (Auth Guard & Auto-clear Session)
    const isAuthValid = await checkAuthentication();
    if (!isAuthValid) {
        return;
    }

    const user = getCurrentUser();
    // Thiết lập Presence Tracking cho người dùng trên Firebase
    if (user && user.userId && window.FirebaseService) {
        FirebaseService.setupPresence(user.userId);
    }

    // 2. Cập nhật thông tin Header
    updateHeaderUser(user);

    // 3. Phân quyền hiển thị Menu Admin
    checkAdminMenu(user);

    // 4. Cập nhật Chuông thông báo
    updateNotificationBellUI();

    // 5. Kiểm tra Khởi Tạo Đạo Cơ (Lần đầu đăng nhập hoặc chưa có Đạo Hiệu/Avatar)
    checkFirstTimeFoundationSetup();

    // 6. Khởi tạo Tab theo URL query parameter (?tab=stats|history|guide|feedback)
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
// 1. QUẢN LÝ PHIÊN & NGƯỜI DÙNG (FIREBASE & LOCAL SESSION)
// ==========================================================================
function getCurrentUser() {
    try {
        const str = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
        if (!str) return null;
        const u = JSON.parse(str);
        return (u && (u.userId || u.username)) ? u : null;
    } catch (e) {
        return null;
    }
}

function getCurrentUserUID() {
    const user = getCurrentUser();
    if (!user) return 'guest';
    return user.userId || ('u_' + (user.username || 'guest').toLowerCase());
}

function updateHeaderUser(user) {
    const nameEl = document.getElementById('header-user-name');
    const avatarEl = document.getElementById('header-user-avatar');
    const displayName = user ? (user.displayName || user.username) : 'Khách';
    if (nameEl) nameEl.textContent = displayName;
    if (avatarEl) {
        if (user && user.photoURL) {
            avatarEl.innerHTML = `<img src="${escapeHtml(user.photoURL)}" alt="avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;" onerror="this.onerror=null; this.parentElement.textContent='${escapeHtml(displayName.charAt(0).toUpperCase())}';" />`;
        } else if (user && (user.displayName || user.username)) {
            avatarEl.textContent = displayName.charAt(0).toUpperCase();
        } else {
            avatarEl.innerHTML = '<i class="fa-solid fa-user"></i>';
        }
    }
    const senderInput = document.getElementById('fb-sender');
    if (senderInput) senderInput.value = displayName;
    updateHeaderRankDisplay();
}

// ==========================================================================
// GAMIFICATION HELPERS FOR UTILITIES PAGE
// ==========================================================================
// GAMIFICATION HELPERS FOR UTILITIES PAGE
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
    badgeClass: 'rank-thien-dia-phap-tac',
    nextRankName: null
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
    badgeClass: 'rank-chitoncucdao',
    nextRankName: null
};

const RANK_LEVELS = [
    { level: 1, id: 'gamo', name: 'PHÀM CẢNH', displayName: 'Phàm cảnh', minExp: 0, maxExp: 100, color: '#475569', icon: 'fa-solid fa-egg', badgeClass: 'rank-gamo', nextRankName: 'LUYỆN KHÍ CẢNH' },
    { level: 2, id: 'tapsu', name: 'LUYỆN KHÍ CẢNH', displayName: 'Luyện Khí cảnh', minExp: 101, maxExp: 300, color: '#15803d', icon: 'fa-solid fa-feather-pointed', badgeClass: 'rank-tapsu', nextRankName: 'KIM ĐAN CẢNH' },
    { level: 3, id: 'tanbinh', name: 'KIM ĐAN CẢNH', displayName: 'Kim Đan cảnh', minExp: 301, maxExp: 600, color: '#1d4ed8', icon: 'fa-solid fa-shield-halved', badgeClass: 'rank-tanbinh', nextRankName: 'NGUYÊN ANH CẢNH' },
    { level: 4, id: 'caothu', name: 'NGUYÊN ANH CẢNH', displayName: 'Nguyên Anh cảnh', minExp: 601, maxExp: 1000, color: '#7e22ce', icon: 'fa-solid fa-wand-magic-sparkles', badgeClass: 'rank-caothu', nextRankName: 'HÓA THẦN CẢNH' },
    { level: 5, id: 'daide', name: 'HÓA THẦN CẢNH', displayName: 'Hóa Thần cảnh', minExp: 1001, maxExp: 1500, color: '#b45309', icon: 'fa-solid fa-crown', badgeClass: 'rank-daide', nextRankName: 'CHÍ TÔN THẦN' },
    { level: 6, id: 'chitonthan', name: 'CHÍ TÔN THẦN', displayName: 'Chí tôn thần', minExp: 1501, maxExp: Infinity, color: '#ffffff', icon: 'fa-solid fa-fire-flame-curved', badgeClass: 'rank-chitonthan', nextRankName: null }
];

function getUserStats() {
    const user = getCurrentUser();
    if (!user) return { exp: 0, level: 1, rankId: 'gamo', rank: RANK_LEVELS[0] };

    // Admin nắm giữ quyền năng Thiên Địa Pháp Tắc tuyệt đối với EXP vô hạn
    const isAdm = (user.role && user.role.toLowerCase() === 'admin') || (user.username && user.username.toLowerCase() === 'admin') || !!user.isRoot;
    if (isAdm) {
        return {
            exp: Infinity,
            level: 99,
            rankId: 'thiendiaphaptac',
            rank: ADMIN_RANK
        };
    }

    const uid = getCurrentUserUID();
    try {
        let savedExp = localStorage.getItem('exp_' + uid);
        let exp;
        if (savedExp !== null && savedExp !== undefined) {
            exp = Math.max(0, parseInt(savedExp, 10) || 0);
        } else {
            if (user.username) {
                savedExp = localStorage.getItem('exp_' + user.username);
                if (savedExp !== null && savedExp !== undefined) {
                    exp = Math.max(0, parseInt(savedExp, 10) || 0);
                } else {
                    const key = 'userStats_' + user.username;
                    const raw = localStorage.getItem(key);
                    if (raw) {
                        const data = JSON.parse(raw);
                        if (data && typeof data.exp !== 'undefined' && data.exp !== null) {
                            exp = Math.max(0, parseInt(data.exp, 10) || 0);
                        }
                    }
                }
            }
            if (typeof exp !== 'undefined' && !isNaN(exp)) {
                localStorage.setItem('exp_' + uid, exp.toString());
            }
        }
        if (typeof exp === 'undefined' || isNaN(exp)) {
            exp = 0;
        }

        // Kiểm tra xem user đã đột phá cảnh giới Chí Tôn Cực Đạo chưa (flag isAscended)
        const isAscended = !!(user.isAscended === true || user.isAscended === 'true' || 
                              localStorage.getItem('isAscended_' + uid) === 'true' || 
                              (user.username && localStorage.getItem('isAscended_' + user.username) === 'true') ||
                              (user.rank && (typeof user.rank === 'string' ? (user.rank.toLowerCase().includes('cực đạo') || user.rank.toLowerCase() === 'chitoncucdao') : (user.rank.level === 7 || (user.rank.name && user.rank.name.toLowerCase().includes('cực đạo'))))) || 
                              (user.level === 7));
        if (isAscended) {
            return {
                exp: exp,
                level: 7,
                rankId: 'chitoncucdao',
                rank: CUC_DAO_RANK,
                isAscended: true
            };
        }

        const rank = getRankByExp(exp, false);
        return { exp: exp, level: rank.level, rankId: rank.id, rank: rank, isAscended: false };
    } catch (e) {
        return { exp: 0, level: 1, rankId: 'gamo', rank: RANK_LEVELS[0], isAscended: false };
    }
}

function getRankByExp(exp, isAscended = false) {
    if (isAscended === true || isAscended === 'true') {
        return CUC_DAO_RANK;
    }
    const safeExp = Math.max(0, parseInt(exp, 10) || 0);
    for (let i = RANK_LEVELS.length - 1; i >= 0; i--) {
        if (safeExp >= RANK_LEVELS[i].minExp) return RANK_LEVELS[i];
    }
    return RANK_LEVELS[0];
}

function getRank(exp, isAscended = false) {
    return getRankByExp(exp, isAscended);
}

function getRankProgress(exp) {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    const isAdm = user && ((user.role && user.role.toLowerCase() === 'admin') || (user.username && user.username.toLowerCase() === 'admin') || !!user.isRoot);
    if (isAdm) {
        return { percent: 100, expNeeded: 0, nextRankName: null, isMax: true, isAdmin: true };
    }

    const isCucDao = user && ((user.rank && (typeof user.rank === 'string' ? (user.rank.toLowerCase().includes('cực đạo') || user.rank.toLowerCase() === 'chitoncucdao') : (user.rank.level === 7 || (user.rank.name && user.rank.name.toLowerCase().includes('cực đạo'))))) || user.level === 7);
    if (isCucDao) {
        return { percent: 100, expNeeded: 0, nextRankName: null, isMax: true, isCucDao: true };
    }

    const rank = getRankByExp(exp);
    if (rank.id === 'chitonthan' || rank.level === 6) {
        return { percent: 100, expNeeded: 0, nextRankName: null, isMax: true };
    }
    const percent = Math.min(100, Math.max(0, Math.round((exp / rank.maxExp) * 100)));
    const expNeeded = Math.max(1, rank.maxExp - exp + 1);
    return { percent: percent, expNeeded: expNeeded, nextRankName: rank.nextRankName, isMax: false };
}

/**
 * Render Avatar khung viền chuẩn hóa
 */
function renderUniversalAvatarHtml(u, rankLevel, isAdm, customId = '') {
    if (!u) u = {};
    const username = u.username || u.displayName || 'User';
    const initialChar = (username.charAt(0) || 'U').toUpperCase();
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

    const fallbackLetter = `<div class="w-full h-full rounded-full flex items-center justify-center font-extrabold text-sm uppercase text-white shadow-inner select-none" style="background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);">${initialChar}</div>`;

    const avatarInnerHtml = photoURL
        ? `<img src="${escapeHtml(photoURL)}" alt="${escapeHtml(username)}" class="w-full h-full rounded-full object-cover" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" />
           <div class="w-full h-full rounded-full flex items-center justify-center font-extrabold text-sm uppercase text-white shadow-inner select-none" style="display: none; background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);">${initialChar}</div>`
        : fallbackLetter;

    const idAttr = customId ? `id="${customId}" ` : '';

    return `
        <div ${idAttr}class="relative flex items-center justify-center w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-full" title="${isAdm ? 'Thiên Địa Pháp Tắc' : `Cấp ${rankLevel}`}">
            ${avatarInnerHtml}
            <img src="${frameImgSrc}" alt="Avatar Frame" class="absolute inset-0 w-full h-full object-contain pointer-events-none z-10 scale-110 ${glowClass}" onerror="this.style.display='none'" />
        </div>
    `.trim();
}

/**
 * Cập nhật hiển thị Cảnh giới (Huy hiệu & Khung Avatar) trên Header Navbar của utilities
 */
function updateHeaderRankDisplay() {
    const user = getCurrentUser();
    if (!user) return;

    const isAdm = (user.role && user.role.toLowerCase() === 'admin') || (user.username && user.username.toLowerCase() === 'admin') || !!user.isRoot;
    const stats = getUserStats();
    const rank = isAdm ? ADMIN_RANK : (stats.rank || getRankByExp(stats.exp));

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

        if (isAdm) {
            badgeEl.className = 'header-user-rank-badge rank-thien-dia-phap-tac bg-gradient-to-r from-red-600 to-yellow-500 text-white animate-pulse font-bold shadow-[0_0_15px_rgba(239,68,68,0.8)]';
            badgeEl.innerHTML = `<i class="fa-solid fa-yin-yang fa-spin" style="--fa-animation-duration: 6s;"></i> <span>Thiên Địa Pháp Tắc</span>`;
            badgeEl.title = `Thiên Địa Pháp Tắc (∞ Bất Tử Bất Diệt)`;
        } else {
            badgeEl.className = `header-user-rank-badge ${rank.badgeClass}`;
            badgeEl.innerHTML = `<i class="${rank.icon}"></i> <span>${rank.displayName || rank.name}</span>`;
            badgeEl.title = `Cấp ${rank.level}: ${rank.displayName || rank.name} (${stats.exp} EXP)`;
        }

        // 2. Cập nhật Khung Avatar chuẩn hóa trên Header
        const displayName = (user && (user.displayName || user.username)) || 'User';
        const frameRankLevel = isAdm ? 6 : Math.min(6, rank.level || 1);
        let frameEl = pill.querySelector('#header-avatar-frame') || pill.querySelector('.avatar-wrapper') || pill.querySelector('.avatar-frame');
        if (frameEl) {
            frameEl.outerHTML = renderUniversalAvatarHtml(user, frameRankLevel, isAdm, 'header-avatar-frame');
        } else {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = renderUniversalAvatarHtml(user, frameRankLevel, isAdm, 'header-avatar-frame');
            pill.insertBefore(tempDiv.firstElementChild, pill.firstChild);
        }

        const nameEl = pill.querySelector('.user-name');
        if (nameEl && user) {
            nameEl.textContent = displayName;
        }
    });

    // 3. Cập nhật tức thì vào Modal Tài khoản nếu Modal đang mở trên màn hình
    const displayName = (user && (user.displayName || user.username)) || 'User';
    const initial = displayName.charAt(0).toUpperCase();
    const modalCenterpiece = document.getElementById('modal-moba-centerpiece');
    const frameRankLevel = isAdm ? 6 : Math.min(6, rank.level || 1);
    const innerAvatar = (user && user.photoURL)
        ? `<img src="${escapeHtml(user.photoURL)}" alt="avatar" class="w-full h-full rounded-full object-cover" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" /><span class="w-full h-full rounded-full flex items-center justify-center font-extrabold uppercase text-white shadow-inner select-none" style="display: none; background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);">${initial}</span>`
        : `<span class="w-full h-full rounded-full flex items-center justify-center font-extrabold uppercase text-white shadow-inner select-none" style="background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);">${initial}</span>`;

    if (modalCenterpiece) {
        modalCenterpiece.innerHTML = `<div class="avatar-wrapper rank-${frameRankLevel} avatar-large ${isAdm ? 'avatar-frame-glow-admin' : ''}">${innerAvatar}</div>`;
    }
    const modalAvatarFrame = document.getElementById('modal-avatar-frame');
    if (modalAvatarFrame) {
        modalAvatarFrame.className = `avatar-wrapper rank-${frameRankLevel} ${isAdm ? 'avatar-frame-glow-admin' : ''}`;
        modalAvatarFrame.innerHTML = innerAvatar;
    }
    const modalUserCard = document.getElementById('modal-user-card');
    if (modalUserCard) {
        for (let i = 1; i <= 6; i++) {
            modalUserCard.classList.remove(`rank-${i}`);
        }
        modalUserCard.classList.add(`rank-${frameRankLevel}`);
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

    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    const stats = typeof getUserStats === 'function' ? getUserStats() : { exp: 0 };
    const currentRank = typeof getRankByExp === 'function' ? getRankByExp(stats.exp) : { level: 1 };

    const cardsHtml = (typeof RANK_LEVELS !== 'undefined' ? RANK_LEVELS : []).map(r => {
        const isCurrent = r.level === currentRank.level;
        const isUnlocked = stats.exp >= r.minExp;
        const cardClass = isCurrent ? 'avatar-showcase-card current-user-rank' : 'avatar-showcase-card';
        const expLabel = r.maxExp === Infinity ? '> 1.500 EXP' : `${r.minExp.toLocaleString('vi-VN')} - ${r.maxExp.toLocaleString('vi-VN')} EXP`;

        let statusBadge = '';
        if (isCurrent) {
            statusBadge = `<span class="asc-tag current"><i class="fa-solid fa-circle-check"></i> Đang trang bị</span>`;
        } else if (isUnlocked) {
            statusBadge = `<span class="asc-tag unlocked"><i class="fa-solid fa-unlock"></i> Đã mở khóa</span>`;
        } else {
            statusBadge = `<span class="asc-tag locked"><i class="fa-solid fa-lock"></i> Cần mở khóa</span>`;
        }

        return `
            <div class="${cardClass}">
                <div class="asc-avatar-slot">
                    ${renderRankContainerHtml(r.level, user ? user.username : 'User', { showExp: true })}
                </div>
                <div class="asc-info">
                    <div class="asc-rank-title" style="color: ${r.color || '#ffffff'};">
                        <i class="${r.icon}"></i>
                        <span>${r.name}</span>
                    </div>
                    <div class="asc-level-pill">CẤP ${r.level}</div>
                    <div class="asc-exp-needed"><i class="fa-solid fa-bolt" style="color: #f59e0b; font-size: 11px;"></i> ${expLabel}</div>
                    <div class="asc-status-wrap">${statusBadge}</div>
                </div>
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

    const handleKeydown = (e) => {
        if (e.key === 'Escape') {
            closeAvatarShowcaseModal();
            document.removeEventListener('keydown', handleKeydown);
        }
    };
    document.addEventListener('keydown', handleKeydown);
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
        }, 250);
    }
}

function renderRankCardHtml() {
    const user = getCurrentUser();
    const isAdm = user && ((user.role && user.role.toLowerCase() === 'admin') || (user.username && user.username.toLowerCase() === 'admin') || !!user.isRoot);

    if (isAdm) {
        return `
            <div class="user-rank-card rank-thien-dia-phap-tac" style="border: 2px solid #fde047; background: linear-gradient(135deg, rgba(220, 38, 38, 0.08) 0%, rgba(245, 158, 11, 0.12) 100%); border-radius: 16px; padding: 16px; box-shadow: 0 0 20px rgba(239, 68, 68, 0.25);">
                <div class="urc-top" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
                    <div class="urc-badge-pill rank-thien-dia-phap-tac bg-gradient-to-r from-red-600 to-yellow-500 text-white animate-pulse font-bold shadow-[0_0_15px_rgba(239,68,68,0.8)]" style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 9999px; font-size: 12px; border: 1px solid #fde047;">
                        <i class="fa-solid fa-yin-yang fa-spin" style="--fa-animation-duration: 6s;"></i>
                        <span>Thiên Địa Pháp Tắc</span>
                    </div>
                    <div class="urc-exp-display" style="display: flex; align-items: baseline; gap: 5px;">
                        <strong style="font-size: 26px; font-weight: 900; color: #dc2626; line-height: 1;">∞</strong>
                        <span class="urc-exp-unit" style="font-size: 11px; font-weight: 800; color: #b45309;">Bất Tử Bất Diệt</span>
                    </div>
                </div>

                <div class="urc-progress-section">
                    <div class="urc-progress-header" style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 6px;">
                        <span>Quyền Năng Tuyệt Đối (Admin Tối Cao)</span>
                        <span class="urc-prog-percent" style="color: #dc2626; font-weight: 800;">100% Vô Hạn</span>
                    </div>
                    <div class="urc-progress-track" style="height: 10px; background: rgba(239, 68, 68, 0.15); border-radius: 9999px; overflow: hidden; border: 1px solid rgba(239, 68, 68, 0.25);">
                        <div class="urc-progress-fill" style="width: 100%; height: 100%; background: linear-gradient(90deg, #dc2626, #f59e0b);"></div>
                    </div>
                    <div class="urc-next-info" style="margin-top: 8px; font-size: 12.5px; color: #b45309; font-weight: 700;">
                        <i class="fa-solid fa-infinity" style="color: #dc2626;"></i> Vạn Kiếp Luân Hồi &bull; Thống lĩnh toàn cõi học phần
                    </div>
                </div>

                <div class="urc-footer-tips" style="margin-top: 12px; padding: 8px 12px; border-radius: 8px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); font-size: 12px; color: #78350f; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-crown" style="color: #f59e0b; font-size: 14px;"></i>
                    <span>Tài khoản Quản trị nắm giữ quyền điều khiển Thiên Địa Pháp Tắc.</span>
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
            </div>
        `;
    }

    const stats = getUserStats();
    const rank = stats.rank || getRankByExp(stats.exp);
    const prog = getRankProgress(stats.exp);

    const isCucDao = (user && ((user.rank && (typeof user.rank === 'string' ? (user.rank.toLowerCase().includes('cực đạo') || user.rank.toLowerCase() === 'chitoncucdao') : (user.rank.level === 7 || (user.rank.name && user.rank.name.toLowerCase().includes('cực đạo'))))) || user.level === 7));
    const isChitonthan = !isCucDao && (rank.id === 'chitonthan' || rank.level === 6 || (user && user.rank && typeof user.rank === 'string' && user.rank.toLowerCase().includes('chí tôn thần')));
    const isExpMax = prog.percent >= 100 || prog.isMax || stats.exp >= 1501;
    const canDoKiep = !isCucDao && isChitonthan && isExpMax;

    let nextInfoHtml = '';
    if (isCucDao) {
        nextInfoHtml = `<i class="fa-solid fa-dragon" style="color: #f43f5e;"></i> Đã đột phá <strong>CHÍ TÔN CỰC ĐẠO</strong> - Uy chấn vạn giới!`;
    } else if (prog.isMax) {
        nextInfoHtml = `<i class="fa-solid fa-crown" style="color: #f59e0b;"></i> Đã đạt Cảnh giới Tối cao (MAX LEVEL: Chí Tôn Thần)`;
    } else {
        nextInfoHtml = `<i class="fa-solid fa-angles-up"></i> Cần <strong>${prog.expNeeded} EXP</strong> nữa để thăng cấp <strong>${prog.nextRankName}</strong>`;
    }

    return `
        <div class="user-rank-card ${rank.badgeClass}">
            <div class="urc-top">
                <div class="urc-badge-pill ${rank.badgeClass}">
                    <i class="${rank.icon}"></i>
                    <span>${rank.displayName || rank.name}</span>
                </div>
                <div class="urc-exp-display">
                    <strong>${stats.exp.toLocaleString('vi-VN')}</strong>
                    <span class="urc-exp-unit">EXP</span>
                </div>
            </div>

            <div class="urc-progress-section">
                <div class="urc-progress-header">
                    <span>${isCucDao ? 'Cảnh giới Thần Thoại (Cấp 7)' : `Tiến trình thăng cấp (Cấp ${rank.level})`}</span>
                    <span class="urc-prog-percent">${prog.percent}%</span>
                </div>
                <div class="urc-progress-track">
                    <div class="urc-progress-fill" style="width: ${prog.percent}%; ${isCucDao ? 'background: linear-gradient(90deg, #f43f5e, #fb7185);' : ''}"></div>
                </div>
                <div class="urc-next-info">
                    ${nextInfoHtml}
                </div>

                <!-- NÚT NGHỊCH THIÊN ĐỘ KIẾP (CHỈ HIỂN THỊ KHI ĐẠT MAX LEVEL 6 VÀ ĐẦY 100% EXP) -->
                ${canDoKiep ? `
                    <div class="do-kiep-container" style="margin-top: 14px;">
                        <button type="button" class="btn-do-kiep animate-pulse" id="btn-do-kiep" onclick="triggerDoKiep()" title="Đột phá bình cảnh lên cảnh giới Chí Tôn Cực Đạo">
                            <i class="fa-solid fa-fire" style="color: #fef08a;"></i>
                            <span>🔥 Nghịch Thiên Độ Kiếp</span>
                            <i class="fa-solid fa-bolt" style="color: #fef08a;"></i>
                        </button>
                    </div>
                ` : ''}
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
 * Render Lộ trình Cảnh giới Tu Tiên (Roadmap)
 * Mặc định CHỈ render từ Cấp 1 (Phàm cảnh) đến Cấp 6 (Chí tôn thần).
 * Chỉ khi người dùng đạt Cấp 6 hoặc Cấp 7 mới hiển thị Cấp 7:
 * - Cấp 6: Hiển thị "Cực Cảnh", ghi chú "Đã đủ điều kiện Độ Kiếp" kèm nút kích hoạt triggerDoKiep().
 * - Cấp 7: Hiển thị "Chí Tôn Cực Đạo" (Đã đạt).
 */
function renderRankRoadmapHtml() {
    const stats = getUserStats();
    const currentRank = stats.rank || getRankByExp(stats.exp);
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;

    const isChitonthan = currentRank.level === 6 || (user && user.rank && typeof user.rank === 'string' && user.rank.toLowerCase().includes('chí tôn thần'));
    const isCucDao = currentRank.level === 7 || (user && ((user.rank && typeof user.rank === 'string' && (user.rank.toLowerCase().includes('cực đạo') || user.rank.toLowerCase() === 'chitoncucdao')) || user.level === 7));

    // Mặc định CHỈ hiển thị từ Cấp 1 đến Cấp 6
    const roadmapRanks = [...RANK_LEVELS];

    // Chỉ khi đạt Cấp 6 hoặc Cấp 7 mới unhide Cấp 7
    if (isChitonthan) {
        roadmapRanks.push({
            id: 'cuccanh',
            name: 'Cực Cảnh',
            displayName: 'Cực Cảnh',
            level: 7,
            minExp: 1500,
            maxExp: Infinity,
            icon: 'fa-solid fa-bolt-lightning',
            badgeClass: 'rank-cuccanh',
            bgColor: '#fff1f2',
            textColor: '#9f1239',
            borderColor: '#f43f5e',
            isSpecialDoKiep: true,
            note: 'Đã đủ điều kiện Độ Kiếp'
        });
    } else if (isCucDao) {
        roadmapRanks.push({
            ...CUC_DAO_RANK,
            isAchievedCucDao: true
        });
    }

    const itemsHtml = roadmapRanks.map((r, index) => {
        let status = 'locked';
        let statusText = 'Chưa mở khóa';
        let statusIcon = '<i class="fa-solid fa-lock"></i>';
        let expText = r.maxExp === Infinity ? '> 1500 EXP' : `${r.minExp} - ${r.maxExp} EXP`;

        if (r.isSpecialDoKiep) {
            status = 'ready-dokiep';
            statusText = 'Sẵn sàng Độ Kiếp';
            statusIcon = '<i class="fa-solid fa-bolt-lightning text-rose-500 animate-pulse"></i>';
            expText = r.note || 'Đã đủ điều kiện Độ Kiếp';
        } else if (r.isAchievedCucDao) {
            status = 'passed';
            statusText = 'Đã đạt';
            statusIcon = '<i class="fa-solid fa-circle-check"></i>';
            expText = 'Đã đắc đạo - Uy chấn vạn giới';
        } else if (r.level < currentRank.level) {
            status = 'passed';
            statusText = 'Đã đạt';
            statusIcon = '<i class="fa-solid fa-circle-check"></i>';
        } else if (r.level === currentRank.level) {
            status = 'current';
            statusText = 'Hiện tại';
            statusIcon = '<i class="fa-solid fa-award"></i>';
        }

        const isLast = index === roadmapRanks.length - 1;

        // Nếu là Cực Cảnh (người dùng Cấp 6), render nút kích hoạt Độ Kiếp
        let statusColHtml = `<div class="rmc-status-badge ${status}">${statusText}</div>`;
        if (r.isSpecialDoKiep) {
            statusColHtml = `
                <div class="rmc-action-wrap flex flex-col items-end gap-1.5" style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                    <span class="text-[11px] font-bold text-rose-600 uppercase tracking-wide" style="color: #e11d48; font-size: 11px;">Đã đủ điều kiện Độ Kiếp</span>
                    <button type="button" class="btn-do-kiep-mini" onclick="triggerDoKiep()" title="Kích hoạt Nghịch Thiên Độ Kiếp" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%); color: #ffffff; border: 1.5px solid #f87171; border-radius: 8px; padding: 4px 12px; font-size: 11.5px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 0 10px rgba(239, 68, 68, 0.6); animation: pulse 2s infinite;">
                        <i class="fa-solid fa-bolt-lightning"></i>
                        <span>ĐỘ KIẾP</span>
                    </button>
                </div>
            `;
        }

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
                                <span class="rmc-name">${r.displayName || r.name}</span>
                                <span class="rmc-level">Cấp ${r.level}</span>
                            </div>
                            <div class="rmc-exp-req">
                                <i class="fa-solid fa-fire-flame-curved"></i>
                                <span>${expText}</span>
                            </div>
                        </div>
                    </div>
                    ${statusColHtml}
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="roadmap-header-info">
            <div class="rhi-title">
                <i class="fa-solid fa-map-location-dot"></i>
                <span>Lộ trình Cảnh giới Tu Tiên</span>
            </div>
            <div class="rhi-sub">Hiện tại: <strong>${currentRank.displayName || currentRank.name}</strong></div>
        </div>
        <div class="roadmap-timeline">
            ${itemsHtml}
        </div>
    `;
}

/**
 * Kích hoạt Modal xác nhận "Nghịch Thiên Độ Kiếp"
 */
function triggerDoKiep() {
    const user = getCurrentUser();
    if (!user) return;

    showModal({
        title: '⚡ NGHỊCH THIÊN ĐỘ KIẾP ⚡',
        icon: 'fa-solid fa-bolt-lightning',
        content: `
            <div style="text-align: center; padding: 14px 6px;">
                <div style="font-size: 52px; color: #dc2626; margin-bottom: 12px; animation: doKiepPulse 1.5s infinite;">
                    🔥
                </div>
                <div style="padding: 16px 20px; border-radius: 14px; background: linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%); border: 2px solid #fca5a5; box-shadow: 0 4px 18px rgba(220, 38, 38, 0.15); margin-bottom: 16px;">
                    <p style="font-size: 15px; color: #991b1b; font-weight: 700; line-height: 1.6; margin: 0;">
                        "Đạo hữu đã chạm đến bình cảnh. Phía trước là cảnh giới 'Chí Tôn Cực Đạo'. Thiên đạo vô thường, nhân phẩm quyết định. Thành thì uy trấn vạn giới, bại thì tu vi hao tổn (trừ 500 EXP). Ngươi có dám đánh cược?"
                    </p>
                </div>
                <div style="display: flex; justify-content: center; gap: 14px; font-size: 12.5px; color: #64748b;">
                    <span>Tỷ lệ thành công: <strong style="color: #ea580c; font-weight: 800;">5%</strong></span>
                    <span>&bull;</span>
                    <span>Tổn thất nếu bại: <strong style="color: #dc2626; font-weight: 800;">-500 EXP</strong></span>
                </div>
            </div>
        `,
        actionText: '🔥 Quyết Chiến Thiên Đạo',
        actionCallback: () => {
            executeDoKiepBreakthrough();
        },
        showCancel: true,
        cancelText: 'Bế quan suy nghĩ thêm',
        cancelCallback: () => {
            closeModal();
            openUserMenuModal();
        }
    });
}
window.triggerDoKiep = triggerDoKiep;

/**
 * Thực thi cơ chế RNG Độ Kiếp: 5% Thành công -> Chí Tôn Cực Đạo | 95% Thất bại -> Trừ 500 EXP
 */
async function executeDoKiepBreakthrough() {
    const user = getCurrentUser();
    if (!user) return;
    const uid = getCurrentUserUID();
    const stats = getUserStats();
    const currentExp = stats.exp;

    // Hiệu ứng đang độ kiếp (Dramatic Lightning Animation)
    showModal({
        title: '⚡ THIÊN KIẾP GIÁNG LÂM ⚡',
        icon: 'fa-solid fa-cloud-bolt',
        content: `
            <div style="text-align: center; padding: 24px 10px;">
                <div style="font-size: 52px; color: #ea580c; margin-bottom: 16px; animation: doKiepPulse 1s infinite alternate;">
                    <i class="fa-solid fa-bolt-lightning"></i>
                </div>
                <h4 style="font-size: 17px; font-weight: 800; color: #dc2626; margin-bottom: 8px;">CỬU TRỌNG LÔI KIẾP ĐANG GIÁNG XUỐNG!</h4>
                <p style="font-size: 13.5px; color: #64748b; line-height: 1.6;">
                    Thiên lôi cuồn cuộn, sấm chớp rền vang! Đạo tâm của đạo hữu đang được tôi luyện giữa biển lôi kiếp...
                </p>
                <div style="margin-top: 18px; display: flex; justify-content: center;">
                    <i class="fa-solid fa-spinner fa-spin text-2xl text-amber-500"></i>
                </div>
            </div>
        `,
        actionText: 'Đang ngưng tụ tu vi...',
        actionCallback: null
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Xử lý Tỷ lệ (RNG): 5% Thành Công
    const isSuccess = Math.random() <= 0.05;

    if (isSuccess) {
        // ================= NHÁNH THÀNH CÔNG (5%) =================
        const newRankName = 'Chí Tôn Cực Đạo';

        try {
            if (uid !== 'guest') {
                if (window.update && window.ref && window.db) {
                    await update(ref(db, `users/${uid}`), {
                        rank: newRankName,
                        level: 7,
                        isAscended: true,
                        updatedAt: Date.now()
                    });
                } else if (window.FirebaseService) {
                    await FirebaseService.updateUser(uid, {
                        rank: newRankName,
                        level: 7,
                        isAscended: true
                    });
                }
            }
        } catch (e) {
            console.error('Lỗi cập nhật Firebase khi độ kiếp thành công:', e);
        }

        user.rank = newRankName;
        user.level = 7;
        user.isAscended = true;
        try {
            localStorage.setItem('currentUser', JSON.stringify(user));
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            localStorage.setItem('isAscended_' + uid, 'true');
            if (user.username) {
                localStorage.setItem('isAscended_' + user.username, 'true');
            }
            const curStats = getUserStats();
            curStats.rank = CUC_DAO_RANK;
            curStats.level = 7;
            curStats.isAscended = true;
            localStorage.setItem('userStats_' + uid, JSON.stringify(curStats));
        } catch (e) {}

        if (typeof createLevelUpParticles === 'function') {
            createLevelUpParticles();
            setTimeout(createLevelUpParticles, 600);
            setTimeout(createLevelUpParticles, 1200);
        }

        updateHeaderRankDisplay();

        showModal({
            title: '🎉 NGHỊCH THIÊN ĐỘ KIẾP THÀNH CÔNG! 🎉',
            icon: 'fa-solid fa-dragon',
            content: `
                <div style="text-align: center; padding: 20px 10px;">
                    <div style="font-size: 58px; margin-bottom: 14px; filter: drop-shadow(0 0 16px rgba(244, 63, 94, 0.9));">
                        🐉
                    </div>
                    <div class="user-rank-badge rank-chitoncucdao" style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 20px; border-radius: 9999px; font-size: 16px; font-weight: 900; background: #ffe4e6; color: #881337; border: 2px solid #fb7185; box-shadow: 0 0 20px rgba(244, 63, 94, 0.8); margin-bottom: 16px;">
                        <i class="fa-solid fa-dragon" style="color: #f43f5e;"></i>
                        <span>CHÍ TÔN CỰC ĐẠO</span>
                    </div>
                    <h3 style="font-size: 19px; font-weight: 900; color: #9f1239; margin-bottom: 10px;">ĐỘNG TRỜI CHUYỂN ĐẤT &bull; DANH CHẤN VẠN GIỚI!</h3>
                    <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                        Chúc mừng Đạo hữu đã nghịch thiên cải mệnh thành công! Vượt qua Cửu Trọng Lôi Kiếp, chính thức bước chân vào cảnh giới thần thoại <strong>CHÍ TÔN CỰC ĐẠO (Cấp 7)</strong>. Uy trấn vạn cõi, vạn thần quy phục!
                    </p>
                </div>
            `,
            actionText: 'Tiếp Nhận Thần Vị',
            actionCallback: () => {
                closeModal();
                openUserMenuModal();
            }
        });

    } else {
        // ================= NHÁNH THẤT BẠI (95%) =================
        const deductedExp = Math.max(0, currentExp - 500);
        const demotedRank = getRankByExp(deductedExp);

        try {
            if (uid !== 'guest') {
                if (window.update && window.ref && window.db) {
                    await update(ref(db, `users/${uid}`), {
                        exp: deductedExp,
                        level: demotedRank.level,
                        rank: demotedRank.displayName || demotedRank.name,
                        updatedAt: Date.now()
                    });
                } else if (window.FirebaseService) {
                    await FirebaseService.saveExp(uid, deductedExp);
                    await FirebaseService.updateUser(uid, {
                        exp: deductedExp,
                        level: demotedRank.level,
                        rank: demotedRank.displayName || demotedRank.name
                    });
                }
            }
        } catch (e) {
            console.error('Lỗi cập nhật Firebase khi độ kiếp thất bại:', e);
        }

        try {
            localStorage.setItem('exp_' + uid, deductedExp.toString());
            if (user.username) {
                localStorage.setItem('exp_' + user.username, deductedExp.toString());
            }
            saveUserStats({
                exp: deductedExp,
                level: demotedRank.level,
                rankId: demotedRank.id
            });
            user.exp = deductedExp;
            user.level = demotedRank.level;
            user.rank = demotedRank.displayName || demotedRank.name;
            localStorage.setItem('currentUser', JSON.stringify(user));
            sessionStorage.setItem('currentUser', JSON.stringify(user));
        } catch (e) {}

        updateHeaderRankDisplay();

        showModal({
            title: '⚡ ĐỘ KIẾP THẤT BẠI ⚡',
            icon: 'fa-solid fa-cloud-bolt',
            content: `
                <div style="text-align: center; padding: 20px 10px;">
                    <div style="font-size: 54px; color: #dc2626; margin-bottom: 14px; filter: drop-shadow(0 0 12px rgba(220, 38, 38, 0.7));">
                        <i class="fa-solid fa-heart-crack"></i>
                    </div>
                    <div style="padding: 12px 16px; border-radius: 12px; background: #fef2f2; border: 1.5px solid #f87171; color: #b91c1c; font-weight: 800; font-size: 15px; margin-bottom: 14px; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.15);">
                        Độ kiếp thất bại! Đạo cơ tổn thương, ngươi đã đánh mất 500 EXP!
                    </div>
                    <p style="font-size: 13.5px; color: #475569; line-height: 1.6;">
                        Lôi kiếp quá đỗi hung hiểm, tu vi của ngươi đã bị phản phệ và tụt xuống còn <strong>${deductedExp.toLocaleString('vi-VN')} EXP</strong> (Cấp độ: <span class="user-rank-badge ${demotedRank.badgeClass}" style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background-color: ${demotedRank.bgColor}; color: ${demotedRank.textColor}; border: 1px solid ${demotedRank.borderColor};"><i class="${demotedRank.icon}"></i> ${demotedRank.displayName || demotedRank.name}</span>).
                    </p>
                    <p style="font-size: 12.5px; color: #64748b; margin-top: 10px;">
                        Hãy tiếp tục ôn luyện và thi trắc nghiệm để tôi luyện đạo tâm, tích lũy lại tu vi trước khi tiếp tục nghịch thiên!
                    </p>
                </div>
            `,
            actionText: 'Dưỡng Thương Bế Quan',
            actionCallback: () => {
                closeModal();
                openUserMenuModal();
            }
        });
    }
}
window.executeDoKiepBreakthrough = executeDoKiepBreakthrough;

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
    const isAdm = user && ((user.role && user.role.toLowerCase() === 'admin') || (user.username && user.username.toLowerCase() === 'admin') || user.isRoot);
    if (adminMenuItem) {
        adminMenuItem.style.display = isAdm ? 'block' : 'none';
    }
    const leaderboardBtns = document.querySelectorAll('#btnLeaderboard, .btn-leaderboard');
    leaderboardBtns.forEach(btn => {
        if (btn) btn.style.display = 'flex';
    });
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
            title: 'Sổ Bộ Tu Vi - Ghi chép tiến cảnh và ngộ tính',
            desc: 'Theo dõi căn cơ tu vi, kích hoạt Lục Đạo Luân Hồi Trận, trảm tâm ma và tổng hợp tiến cảnh ngộ tính.',
            icon: '<i class="fa-solid fa-dharmachakra"></i>'
        },
        history: {
            title: 'Ký Lục Luân Hồi',
            desc: 'Bia đá khắc ghi toàn bộ các lượt vượt ải khảo thí, ma kiếp luân hồi đã trải qua.',
            icon: '<i class="fa-solid fa-monument"></i>'
        },
        guide: {
            title: 'Cẩm Nang Nhập Môn',
            desc: 'Tàng Kinh Các chỉ dẫn bí cảnh mô phỏng, thiên đạo pháp tắc tính điểm và ngự khí quyết cơ bản.',
            icon: '<i class="fa-solid fa-book-skull"></i>'
        },
        feedback: {
            title: 'Truyền Âm Phù',
            desc: 'Phóng phù truyền âm báo cáo tâm ma, hiến kế tông môn hoặc cầu cứu trưởng lão.',
            icon: '<i class="fa-solid fa-fire-flame-curved"></i>'
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
    if (!user) return [];
    const uid = getCurrentUserUID();
    const historyKey = 'history_' + uid;
    try {
        let stored = localStorage.getItem(historyKey);
        if (!stored && user.username) {
            stored = localStorage.getItem('history_' + user.username);
            if (stored) localStorage.setItem(historyKey, stored);
        }
        const list = stored ? JSON.parse(stored) : [];
        return Array.isArray(list) ? list : [];
    } catch (e) {
        return [];
    }
}

let lucDaoRadarChartInstance = null;

function renderStatsTab() {
    const history = getUserHistory();

    const totalTestsEl = document.getElementById('stat-total-tests');
    const avgScoreEl = document.getElementById('stat-avg-score');
    const passRateEl = document.getElementById('stat-pass-rate');
    const maxScoreEl = document.getElementById('stat-max-score');
    const topicListEl = document.getElementById('topic-stat-list');

    const totalTests = history.length;

    // 1. TÍNH TOÁN ĐÁNH GIÁ ĐẠO TÂM:
    // Tính tổng số câu hỏi đã làm và tổng số câu trả lời đúng trên toàn bộ lịch sử thi
    let totalQuestionsAttempted = 0;
    let totalCorrectAnswers = 0;

    let sumScores = 0;
    let passCount = 0;
    let maxScore = 0;

    history.forEach(item => {
        sumScores += (Number(item.score) || 0);
        if (item.passed || Number(item.score) >= 5.0) passCount++;
        const s = Number(item.score) || 0;
        if (s > maxScore) maxScore = s;

        totalQuestionsAttempted += (Number(item.totalQuestions) || 0);
        totalCorrectAnswers += (Number(item.correctCount) || 0);
    });

    const avgScore = totalTests > 0 ? (sumScores / totalTests).toFixed(1) : '0.0';
    const passRate = totalTests > 0 ? Math.round((passCount / totalTests) * 100) : 0;
    const maxScoreVal = maxScore.toFixed(1);

    const overallAccuracy = totalQuestionsAttempted > 0
        ? Math.round((totalCorrectAnswers / totalQuestionsAttempted) * 100)
        : 0;

    // Logic Đánh giá Đạo Tâm:
    // < 50%: "Đạo tâm bất ổn, dễ sinh tâm ma (Cần bế quan luyện lại)".
    // 50% - 80%: "Căn cơ vững chắc, linh khí dồi dào".
    // > 80%: "Vạn pháp khai thông, ngộ tính tuyệt đỉnh".
    let daoTamClass = 'dao-tam-solid';
    let daoTamIcon = 'fa-solid fa-shield-halved';
    let daoTamTitle = 'CĂN CƠ VỮNG CHẮC';
    let daoTamComment = 'Căn cơ vững chắc, linh khí dồi dào';

    if (totalTests === 0 || overallAccuracy < 50) {
        daoTamClass = 'dao-tam-unstable';
        daoTamIcon = 'fa-solid fa-skull-crossbones';
        daoTamTitle = 'ĐẠO TÂM BẤT ỔN';
        daoTamComment = 'Đạo tâm bất ổn, dễ sinh tâm ma (Cần bế quan luyện lại)';
    } else if (overallAccuracy <= 80) {
        daoTamClass = 'dao-tam-solid';
        daoTamIcon = 'fa-solid fa-shield-halved';
        daoTamTitle = 'CĂN CƠ VỮNG CHẮC';
        daoTamComment = 'Căn cơ vững chắc, linh khí dồi dào';
    } else {
        daoTamClass = 'dao-tam-transcendent';
        daoTamIcon = 'fa-solid fa-sparkles';
        daoTamTitle = 'VẠN PHÁP KHAI THÔNG';
        daoTamComment = 'Vạn pháp khai thông, ngộ tính tuyệt đỉnh';
    }

    const daoTamCardEl = document.getElementById('dao-tam-evaluation-card');
    if (daoTamCardEl) {
        daoTamCardEl.className = `dao-tam-card ${daoTamClass}`;
        daoTamCardEl.innerHTML = `
            <div class="dao-tam-left">
                <div class="dao-tam-icon">
                    <i class="${daoTamIcon}"></i>
                </div>
                <div>
                    <div class="dao-tam-title">Đạo Tâm Luận • ${daoTamTitle}</div>
                    <div class="dao-tam-comment">"${escapeHtml(daoTamComment)}"</div>
                </div>
            </div>
            <div class="dao-tam-percent-badge">
                Tỷ lệ chính xác: ${overallAccuracy}% (${totalCorrectAnswers}/${totalQuestionsAttempted} câu đúng)
            </div>
        `;
    }

    // 2. CẬP NHẬT 4 THẺ CHỈ SỐ TU VI TỔNG QUÁT:
    if (totalTestsEl) totalTestsEl.textContent = `${totalTests} bài`;
    if (avgScoreEl) avgScoreEl.textContent = `${avgScore} / 10`;
    if (passRateEl) passRateEl.textContent = `${passRate}%`;
    if (maxScoreEl) maxScoreEl.textContent = `${maxScoreVal} / 10`;

    // 3. RENDER LỤC ĐẠO LUÂN HỒI TRẬN (CHART.JS RADAR CHART):
    const radarCanvas = document.getElementById('luc-dao-radar-chart');
    if (radarCanvas && typeof Chart !== 'undefined') {
        if (lucDaoRadarChartInstance) {
            try { lucDaoRadarChartInstance.destroy(); } catch (e) {}
            lucDaoRadarChartInstance = null;
        }

        const radarLabels = [
            'CĐ 1: Đối tượng & PP',
            'CĐ 2: Sự ra đời',
            'CĐ 3: Sứ mệnh lịch sử',
            'CĐ 4: Đặc trưng CNXH',
            'CĐ 5: Hình thái KT-XH',
            'CĐ 6: Quá độ lên CNXH'
        ];

        const radarScores = [1, 2, 3, 4, 5, 6].map(id => {
            const topicHistory = history.filter(h => String(h.topicId) === String(id));
            if (topicHistory.length === 0) return 0;
            return parseFloat(Math.max(...topicHistory.map(h => Number(h.score) || 0)).toFixed(1));
        });

        const ctx = radarCanvas.getContext('2d');
        lucDaoRadarChartInstance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: radarLabels,
                datasets: [{
                    label: 'Linh lực cao nhất (Thang 10)',
                    data: radarScores,
                    backgroundColor: 'rgba(245, 158, 11, 0.28)',
                    borderColor: '#d97706',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#dc2626',
                    pointBorderColor: '#fef08a',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                layout: {
                    padding: 20
                },
                scales: {
                    r: {
                        min: 0,
                        max: 10,
                        ticks: {
                            stepSize: 2,
                            backdropColor: 'transparent',
                            color: '#94a3b8',
                            font: { size: 10, weight: 'bold' }
                        },
                        grid: {
                            color: 'rgba(245, 158, 11, 0.25)'
                        },
                        angleLines: {
                            color: 'rgba(245, 158, 11, 0.35)'
                        },
                        pointLabels: {
                            color: '#78350f',
                            font: { size: 11, weight: 'bold', family: "'Inter', sans-serif" }
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#78350f',
                            font: { size: 13, weight: 'bold', family: "'Inter', sans-serif" }
                        }
                    }
                }
            }
        });
    }

    // 4. RENDER DANH SÁCH CHI TIẾT 6 CHỦ ĐỀ:
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
                        <span>Đã vượt ải: <strong>${attempts}</strong> lượt</span>
                        <span>Đỉnh cao: <strong>${attempts > 0 ? bestPercent + '%' : '0%'}</strong></span>
                    </div>
                </div>
                <a href="${targetHref}" class="btn-tsi-action" title="Nhập trận kiểm tra chủ đề này">
                    <i class="fa-solid fa-play"></i>
                    <span>${attempts > 0 ? 'Tái Đấu' : 'Vào Trận'}</span>
                </a>
            </div>
        `;
    }).join('');
}

// ==========================================================================
// 4. PHÂN HỆ 2: KÝ LỤC LUÂN HỒI (tab=history) & TRẢM TÂM MA
// ==========================================================================

/**
 * Thu thập tất cả các câu hỏi mà học viên đã từng làm sai trong các lần thi
 */
async function collectAllWrongQuestions() {
    const user = getCurrentUser();
    if (!user) return [];
    const uid = getCurrentUserUID();
    const history = getUserHistory();
    let wrongList = [];

    // 1. Lấy từ tam_ma_pool trong localStorage nếu có
    try {
        const poolRaw = localStorage.getItem('tam_ma_pool_' + uid) || localStorage.getItem('tam_ma_pool_' + user.username);
        if (poolRaw) {
            const pool = JSON.parse(poolRaw);
            if (Array.isArray(pool)) wrongList.push(...pool);
        }
    } catch (e) {}

    // 2. Lấy từ các bài thi trong lịch sử
    history.forEach(item => {
        if (Array.isArray(item.wrongQuestions) && item.wrongQuestions.length > 0) {
            wrongList.push(...item.wrongQuestions);
        }
    });

    // 3. Khử trùng lặp theo ID câu hỏi
    const uniqueMap = new Map();
    wrongList.forEach(q => {
        if (q && q.id && !uniqueMap.has(q.id)) {
            uniqueMap.set(q.id, q);
        }
    });

    // 4. Nếu chưa có câu sai được lưu nhưng có các bài thi điểm chưa tuyệt đối (< 10đ),
    // tự động trích xuất câu hỏi từ các chủ đề chưa đạt để đệ tử tôi luyện
    if (uniqueMap.size === 0 && history.length > 0) {
        const imperfectTests = history.filter(h => (Number(h.score) || 0) < 10);
        if (imperfectTests.length > 0) {
            for (const t of imperfectTests.slice(0, 3)) {
                const tid = (t.topicId && t.topicId !== 'mock') ? parseInt(t.topicId, 10) : 1;
                if (tid >= 1 && tid <= 6) {
                    try {
                        const res = await fetch(`./data/chude${tid}.json`);
                        if (res.ok) {
                            const qData = await res.json();
                            if (Array.isArray(qData)) {
                                qData.slice(0, 5).forEach(q => {
                                    if (!uniqueMap.has(q.id)) {
                                        uniqueMap.set(q.id, { ...q, topicId: tid });
                                    }
                                });
                            }
                        }
                    } catch (err) {}
                }
            }
        }
    }

    return Array.from(uniqueMap.values());
}

/**
 * Thực thi chức năng "⚔️ Trảm Tâm Ma":
 * Quét lịch sử làm bài, gom tất cả các câu hỏi mà học viên đã làm sai và mở bài thi luyện lại
 */
async function executeTramTamMa() {
    const user = getCurrentUser();
    if (!user) {
        showToast('Vui lòng đăng nhập để thi triển bí thuật Trảm Tâm Ma!', 'error');
        return;
    }
    const uid = getCurrentUserUID();
    showToast('Đang thám trắc thức hải, thu thập tâm ma...', 'info');

    const wrongQuestions = await collectAllWrongQuestions();

    if (!wrongQuestions || wrongQuestions.length === 0) {
        showModal({
            title: 'Đạo Tâm Viên Mãn',
            icon: 'fa-solid fa-sparkles',
            content: `
                <div style="text-align: center; padding: 12px 0;">
                    <i class="fa-solid fa-yin-yang fa-spin" style="--fa-animation-duration: 8s; font-size: 48px; color: #f59e0b; margin-bottom: 12px;"></i>
                    <h4 style="font-size: 17px; font-weight: 800; color: #1e293b; margin-bottom: 8px;">Không Phát Hiện Tâm Ma!</h4>
                    <p style="color: #64748b; font-size: 13.5px; line-height: 1.6;">
                        Đạo tâm của đạo hữu vô cùng kiên định, chưa có câu hỏi sai nào tích tụ thành ma chướng. Hãy khiêu chiến các Bí Cảnh mới để tiếp tục thăng tiến tu vi!
                    </p>
                </div>
            `,
            actionText: 'Vào Bí Cảnh Thi Thử',
            actionCallback: () => {
                closeModal();
                window.location.href = 'practice.html?topic=mock&mode=test';
            }
        });
        return;
    }

    // Lưu danh sách câu hỏi tâm ma vào bộ nhớ phiên
    sessionStorage.setItem('tam_ma_questions', JSON.stringify(wrongQuestions));
    localStorage.setItem('tam_ma_questions_' + uid, JSON.stringify(wrongQuestions));

    showToast(`Đã phong ấn ${wrongQuestions.length} tâm ma! Đang chuyển hướng vào Bí Cảnh Trảm Tâm Ma...`, 'success');
    setTimeout(() => {
        window.location.href = 'practice.html?topic=tam-ma&mode=test';
    }, 700);
}
window.executeTramTamMa = executeTramTamMa;
window.handleTramTamMa = executeTramTamMa;

function renderHistoryTab() {
    const history = getUserHistory();
    const container = document.getElementById('history-container');
    if (!container) return;

    if (history.length === 0) {
        container.innerHTML = `
            <div class="empty-state-box" style="background: rgba(255,255,255,0.7); border: 2px dashed #b45309; border-radius: 12px; padding: 36px 20px;">
                <div class="empty-state-icon" style="background: rgba(180, 83, 9, 0.15); color: #78350f;">
                    <i class="fa-solid fa-monument"></i>
                </div>
                <h4 class="empty-state-title" style="color: #78350f; font-family: 'Merriweather', 'Times New Roman', serif;">Chưa Từng Vượt Ải Độ Kiếp Nào!</h4>
                <p class="empty-state-desc" style="color: #92400e;">
                    Thạch bia luân hồi vẫn còn để trống. Hãy nhập trận Bí Cảnh để thiên đạo ghi danh chiến tích của đạo hữu vào sử sách.
                </p>
                <a href="practice.html?topic=mock&mode=test" class="btn-action btn-tram-tam-ma" style="padding: 10px 22px; font-size: 14px; text-decoration: none;">
                    <i class="fa-solid fa-wand-magic-sparkles"></i>
                    <span>Vào Bí Cảnh Khảo Hạch Ngay</span>
                </a>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="table-responsive" style="margin-top: 10px;">
            <table class="ancient-table">
                <thead>
                    <tr>
                        <th style="width: 50px; text-align: center;">STT</th>
                        <th style="width: 160px;">Thời Khắc Độ Kiếp</th>
                        <th>Bí Cảnh Khảo Hạch</th>
                        <th style="width: 140px; text-align: center;">Kiếp Nạn Vượt Qua</th>
                        <th style="width: 110px; text-align: center;">Thời Thần</th>
                        <th style="width: 100px; text-align: center;">Linh Lực</th>
                        <th style="width: 130px; text-align: center;">Đạo Quả</th>
                        <th style="width: 80px; text-align: center;">Tẩy</th>
                    </tr>
                </thead>
                <tbody>
                    ${history.map((item, idx) => {
                        const isPass = item.passed || Number(item.score) >= 5.0;
                        const scoreVal = Number(item.score).toFixed(1);
                        return `
                            <tr>
                                <td style="text-align: center; font-weight: 700; color: #78350f;">${idx + 1}</td>
                                <td style="color: #78350f; font-size: 13px;">
                                    <i class="fa-regular fa-calendar-check" style="margin-right: 4px; font-size: 11px;"></i>
                                    ${escapeHtml(item.date)}
                                </td>
                                <td>
                                    <strong style="color: #451a03; font-size: 13.5px;">${escapeHtml(item.topicName)}</strong>
                                </td>
                                <td style="text-align: center; font-weight: 700; color: #78350f;">
                                    ${item.correctCount} / ${item.totalQuestions}
                                </td>
                                <td style="text-align: center; color: #78350f; font-size: 13px;">
                                    <i class="fa-regular fa-clock" style="margin-right: 3px; font-size: 11px;"></i>
                                    ${item.timeSpent || '15:00'}
                                </td>
                                <td style="text-align: center;">
                                    <span style="font-size: 16px; font-weight: 900; color: ${isPass ? '#15803d' : '#b91c1c'};">
                                        ${scoreVal}
                                    </span>
                                </td>
                                <td style="text-align: center;">
                                    <span class="${isPass ? 'badge-pass' : 'badge-fail'}" style="${isPass ? 'background: #dcfce7; color: #15803d; border: 1px solid #86efac;' : 'background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5;'} font-weight: 800; border-radius: 9999px; padding: 2px 10px; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
                                        <i class="fa-solid ${isPass ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
                                        <span>${isPass ? 'Đắc Đạo' : 'Chưa Đạt'}</span>
                                    </span>
                                </td>
                                <td style="text-align: center;">
                                    <button type="button" class="btn-action" style="padding: 4px 8px; background: rgba(254, 242, 242, 0.85); color: #b91c1c; border: 1px solid #fca5a5; border-radius: 6px;" onclick="deleteHistoryItem(${item.id})" title="Tẩy xóa lượt thi này khỏi bia đá">
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
    if (!user) return;
    const uid = getCurrentUserUID();

    const historyKey = 'history_' + uid;
    let history = getUserHistory();
    history = history.filter(item => item.id !== id);
    localStorage.setItem(historyKey, JSON.stringify(history));
    if (user.username) {
        localStorage.setItem('history_' + user.username, JSON.stringify(history));
    }

    if (uid !== 'guest' && window.ref && window.set && window.db) {
        set(ref(db, `users/${uid}/history`), history);
    }

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
        if (!user) return;
        const uid = getCurrentUserUID();
        const historyKey = 'history_' + uid;
        localStorage.removeItem(historyKey);
        if (user.username) {
            localStorage.removeItem('history_' + user.username);
        }
        if (uid !== 'guest') {
            if (window.FirebaseService) {
                FirebaseService.clearHistory(uid);
            } else if (window.ref && window.set && window.db) {
                set(ref(db, `users/${uid}/history`), []);
            }
        }
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
    if (!user) {
        showToast('Vui lòng đăng nhập để gửi góp ý!', 'error');
        return;
    }
    const uid = getCurrentUserUID();

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
        userId: uid,
        username: user.username,
        type: type,
        title: title,
        content: content,
        createdAt: dateFormatted,
        status: 'Chờ duyệt'
    };

    // Lưu vào Firebase
    if (window.FirebaseService) {
        FirebaseService.sendFeedback(newFeedback);
    } else if (window.ref && window.set && window.db) {
        set(ref(db, `feedbacks/${newFeedback.id}`), newFeedback);
    }

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

    // Hiệu ứng Phóng Bùa Truyền Âm (Fade out & trượt lên không gian)
    const talismanEl = document.getElementById('talisman-feedback-box') || document.getElementById('feedback-form');
    if (talismanEl) {
        talismanEl.classList.add('phong-bua-flying');
    }

    setTimeout(() => {
        if (talismanEl) {
            talismanEl.classList.remove('phong-bua-flying');
        }
        titleInput.value = '';
        contentTextarea.value = '';
        showToast('Lá bùa đã hóa thành đạo kim quang bay thẳng về Tàng Kinh Các! Trưởng lão sẽ sớm tiếp nhận lời truyền âm.', 'success');
        renderUserFeedbackList();
    }, 850);
}

function renderFeedbackTab() {
    renderUserFeedbackList();
}

async function renderUserFeedbackList() {
    const user = getCurrentUser();
    const container = document.getElementById('user-feedback-list-container');
    if (!container || !user) return;
    const uid = getCurrentUserUID();

    let allFeedbacks = [];
    if (window.FirebaseService) {
        try {
            allFeedbacks = await FirebaseService.getFeedbacks();
        } catch (e) {}
    }
    if (!allFeedbacks || allFeedbacks.length === 0) {
        try {
            const raw = localStorage.getItem('system_feedbacks');
            allFeedbacks = raw ? JSON.parse(raw) : [];
        } catch (e) {
            allFeedbacks = [];
        }
    }

    const myFeedbacks = allFeedbacks.filter(f => 
        (f.userId && f.userId === uid) || 
        (f.username && user.username && f.username.toLowerCase() === user.username.toLowerCase())
    );

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
    const isAdm = (user && ((user.role && user.role.toLowerCase() === 'admin') || (user.username && user.username.toLowerCase() === 'admin') || !!user.isRoot));
    const roleText = isAdm ? 'Quản trị viên (Admin)' : 'Học viên (User)';

    const stats = getUserStats();
    const rank = isAdm ? ADMIN_RANK : (stats.rank || getRankByExp(stats.exp));
    const displayName = user ? (user.displayName || user.username) : 'Chưa đăng nhập';
    const initial = displayName.charAt(0).toUpperCase();
    const frameLevel = isAdm ? 6 : Math.min(6, rank.level || 1);
    const photoURL = user ? user.photoURL : null;

    const avatarInnerHtml = photoURL
        ? `<img src="${escapeHtml(photoURL)}" alt="avatar" class="w-full h-full rounded-full object-cover" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" /><span class="w-full h-full rounded-full flex items-center justify-center font-extrabold uppercase text-white shadow-inner select-none" style="display: none; background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);">${initial}</span>`
        : `<span class="w-full h-full rounded-full flex items-center justify-center font-extrabold uppercase text-white shadow-inner select-none" style="background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);">${initial}</span>`;

    showModal({
        title: 'Tài khoản người dùng',
        icon: 'fa-solid fa-user-circle',
        content: `
            <div style="font-size: 14px; color: #334155; display: flex; flex-direction: column; gap: 14px;">
                <!-- TÂM ĐIỂM KHUNG AVATAR PNG 6 CẤP ĐỘ -->
                <div id="modal-moba-centerpiece" style="display: flex; justify-content: center; align-items: center; padding: 20px 0; background: radial-gradient(circle at center, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.5);">
                    <div class="avatar-wrapper rank-${frameLevel} avatar-large ${isAdm ? 'avatar-frame-glow-admin' : ''}">${avatarInnerHtml}</div>
                </div>

                <!-- Thông tin người dùng với Khung Avatar & Card theo Cấp độ (.rank-1 .. .rank-6) -->
                <div class="modal-user-card rank-${frameLevel}" id="modal-user-card">
                    <div class="avatar-wrapper rank-${frameLevel} ${isAdm ? 'avatar-frame-glow-admin' : ''}" id="modal-avatar-frame" style="width: 52px; height: 52px; font-size: 20px;">
                        ${avatarInnerHtml}
                    </div>
                    <div class="muc-info">
                        <div class="muc-name" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span style="font-weight: 700;">${escapeHtml(displayName)}</span>
                            ${(user && user.displayName && user.displayName !== user.username) ? `<span style="font-size: 12px; color: #64748b; font-weight: normal;">(@${escapeHtml(user.username)})</span>` : ''}
                            ${isAdm ? `<span class="user-rank-badge rank-thien-dia-phap-tac bg-gradient-to-r from-red-600 to-yellow-500 text-white animate-pulse font-bold shadow-[0_0_15px_rgba(239,68,68,0.8)]" style="padding: 1px 8px; border-radius: 9999px; font-size: 10px; border: 1px solid #fde047;"><i class="fa-solid fa-yin-yang fa-spin" style="--fa-animation-duration: 6s; font-size: 9px;"></i> Thiên Địa Pháp Tắc</span>` : ''}
                        </div>
                        <div class="muc-role" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 3px;">
                            <span>${roleText}</span>
                            ${isAdm ? `<span class="van-kiep-luan-hoi-badge"><i class="fa-solid fa-infinity"></i> Vạn Kiếp Luân Hồi</span>` : ''}
                        </div>
                    </div>
                </div>

                <!-- KHU VỰC THẺ BÀI (RANK CARD) HIỂN THỊ CẤP ĐỘ & EXP -->
                ${renderRankCardHtml()}

                <!-- Nút Sửa Đạo Hiệu & Dung Mạo và Nút Xuất Quan -->
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <button type="button" style="padding: 10px 14px; border-radius: 8px; border: 1px solid #fde047; background: linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(245, 158, 11, 0.25)); text-align: left; cursor: pointer; font-size: 13.5px; display: flex; align-items: center; justify-content: space-between; color: #b45309; font-weight: 700;" onclick="closeModal(); openFoundationSetupModal(false);">
                        <span style="display: flex; align-items: center; gap: 10px;">
                            <i class="fa-solid fa-user-pen" style="color: #d97706;"></i>
                            <span>Sửa Đạo Hiệu & Dung Mạo</span>
                        </span>
                        <i class="fa-solid fa-chevron-right" style="font-size: 11px;"></i>
                    </button>

                    <button type="button" style="padding: 10px 14px; border-radius: 8px; border: 1px solid #fecdd3; background: #fef2f2; text-align: left; cursor: pointer; font-size: 13.5px; display: flex; align-items: center; gap: 10px; color: #dc2626; font-weight: 600;" onclick="logoutUser()">
                        <i class="fa-solid fa-arrow-right-from-bracket"></i>
                        <span>🚪 Xuất Quan</span>
                    </button>
                </div>
            </div>
        `,
        actionText: 'Đóng'
    });
}

// ==========================================================================
// KIỂM SOÁT PHIÊN ĐĂNG NHẬP & XÁC THỰC FIREBASE (AUTH GUARD & SINGLE SESSION)
// ==========================================================================
let isSessionTerminated = false;
let isRealtimeWatcherAttached = false;

function setupUserRealtimeWatcher(userId) {
    if (isRealtimeWatcherAttached || isSessionTerminated) return;

    let currentUser = null;
    try {
        const userStr = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
        if (!userStr) return; // Khách thì bỏ qua
        currentUser = JSON.parse(userStr);
    } catch (e) {
        return;
    }
    if (!currentUser) return; // Khách thì bỏ qua

    // KIM BÀI MIỄN TỬ: Admin không bị check Single Session
    if (currentUser.role === 'Admin' || currentUser.role === 'admin' || currentUser.username === 'Admin' || currentUser.username === 'admin' || currentUser.isRoot) {
        return;
    }

    if (!userId) {
        userId = currentUser.userId || ('u_' + (currentUser.username || '').toLowerCase());
    }
    if (!userId) return;

    if (window.ref && window.onValue && window.db) {
        try {
            isRealtimeWatcherAttached = true;
            onValue(ref(db, 'users/' + userId), (snapshot) => {
                if (isSessionTerminated) return;

                const localToken = localStorage.getItem('sessionToken');
                const dbToken = snapshot.val() ? snapshot.val().sessionToken : null;

                // Code phòng thủ (Defensive Programming):
                // Chỉ thực hiện lệnh KICK khi thỏa mãn: Có dbToken trên mạng VÀ dbToken KHÁC localToken ở máy
                if (dbToken && localToken && dbToken !== localToken) {
                    isSessionTerminated = true;
                    localStorage.removeItem('currentUser');
                    localStorage.removeItem('sessionToken');
                    sessionStorage.removeItem('currentUser');
                    sessionStorage.removeItem('sessionToken');
                    alert("Phiên đăng nhập đã hết hạn hoặc tài khoản đang được sử dụng ở thiết bị khác. Vui lòng đăng nhập lại!");
                    window.location.replace('login.html');
                    return;
                }

                const val = snapshot.val();
                if (val && val.username) {
                    const curr = getCurrentUser();
                    if (curr && curr.username !== val.username) {
                        curr.username = val.username;
                        if (localStorage.getItem('currentUser')) {
                            localStorage.setItem('currentUser', JSON.stringify(curr));
                        } else if (sessionStorage.getItem('currentUser')) {
                            sessionStorage.setItem('currentUser', JSON.stringify(curr));
                        }
                        updateHeaderUser(curr);
                    }
                }
            });
        } catch (e) {
            console.warn('[setupUserRealtimeWatcher] error:', e);
        }
    }
}

// Tự động kích hoạt lắng nghe Single Session ngay khi trang load
setupUserRealtimeWatcher();

async function checkAuthentication() {
    if (isSessionTerminated) return false;

    const userStr = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    if (!userStr) {
        window.location.replace('login.html');
        return false;
    }

    let user = null;
    try {
        user = JSON.parse(userStr);
    } catch (e) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('sessionToken');
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('sessionToken');
        sessionStorage.clear();
        window.location.replace('login.html');
        return false;
    }

    if (!user || (!user.userId && !user.username) || !user.loginAt) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('sessionToken');
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('sessionToken');
        sessionStorage.clear();
        window.location.replace('login.html');
        return false;
    }

    // KIM BÀI MIỄN TỬ: Admin không bị check Single Session
    if (user.role === 'Admin' || user.role === 'admin' || user.username === 'Admin' || user.username === 'admin' || user.isRoot) {
        return true;
    }

    const userId = user.userId || ('u_' + (user.username || '').toLowerCase());

    if (window.FirebaseService || (window.get && window.ref && window.db)) {
        try {
            let userData = null;
            let snapshot = null;

            if (window.get && window.ref && window.db) {
                const dbRef = ref(db);
                const userRef = window.child ? child(dbRef, 'users/' + userId) : ref(db, 'users/' + userId);
                snapshot = await get(userRef);
                if (snapshot && snapshot.exists && snapshot.exists() && snapshot.val()) {
                    userData = snapshot.val();
                }
            }

            if (!userData && window.FirebaseService) {
                if (user.userId) {
                    userData = await FirebaseService.getUserById(user.userId);
                }
                if (!userData && user.username) {
                    userData = await FirebaseService.findUserByUsername(user.username);
                }
            }

            const localToken = localStorage.getItem('sessionToken');
            const dbToken = userData ? userData.sessionToken : null;

            if (dbToken && localToken && dbToken !== localToken) {
                isSessionTerminated = true;
                localStorage.removeItem('currentUser');
                localStorage.removeItem('sessionToken');
                sessionStorage.removeItem('currentUser');
                sessionStorage.removeItem('sessionToken');
                alert("Phiên đăng nhập đã hết hạn hoặc tài khoản đang được sử dụng ở thiết bị khác. Vui lòng đăng nhập lại!");
                window.location.replace('login.html');
                return false;
            }

            if (!user.userId && userData.userId) {
                user.userId = userData.userId;
            }
            if (userData.username && user.username !== userData.username) {
                user.username = userData.username;
            }
            if (userData.displayName) {
                user.displayName = userData.displayName;
            }
            if (userData.photoURL) {
                user.photoURL = userData.photoURL;
            }
            if (localStorage.getItem('currentUser')) {
                localStorage.setItem('currentUser', JSON.stringify(user));
            } else if (sessionStorage.getItem('currentUser')) {
                sessionStorage.setItem('currentUser', JSON.stringify(user));
            }
            updateHeaderUser(user);

            // Thiết lập Realtime Watcher để theo dõi liên tục bằng onValue()
            setupUserRealtimeWatcher(user.userId || userId);
            return true;
        } catch (err) {
            console.warn('[checkAuthentication] error:', err);
            return true;
        }
    }

    return verifySession();
}

function verifySession() {
    if (isSessionTerminated) return false;

    const user = getCurrentUser();
    if (!user) {
        return false;
    }

    // KIM BÀI MIỄN TỬ: Admin không bị check Single Session
    if (user.role === 'Admin' || user.role === 'admin' || user.username === 'Admin' || user.username === 'admin' || user.isRoot) {
        return true;
    }

    if (window.FirebaseService || (window.ref && window.db)) {
        return true;
    }

    let users = [];
    try {
        const str = localStorage.getItem('userList');
        if (str) users = JSON.parse(str);
    } catch (e) {
        users = [];
    }

    const matched = users.find(u => 
        (u.userId && user.userId && u.userId === user.userId) ||
        (u.username && user.username && u.username.toLowerCase() === user.username.toLowerCase())
    );

    if (matched) {
        const localToken = localStorage.getItem('sessionToken') || user.sessionId;
        const targetToken = matched.sessionToken || matched.activeSession;
        if (targetToken && localToken && targetToken !== localToken) {
            isSessionTerminated = true;
            forceLogoutSession('Tài khoản của bạn vừa được đăng nhập ở một thiết bị khác. Bạn đã bị đăng xuất!');
            return false;
        }
    } else if (users.length > 0) {
        isSessionTerminated = true;
        forceLogoutSession('Tài khoản của bạn không tồn tại hoặc đã bị xóa. Vui lòng liên hệ Quản trị viên!');
        return false;
    }

    return true;
}

function forceLogoutSession(message) {
    isSessionTerminated = true;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('sessionToken');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('sessionToken');
    sessionStorage.clear();

    try {
        resetAllProgressUI();
    } catch (e) {}

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

async function logoutUser() {
    const user = getCurrentUser();
    if (user) {
        const uid = user.userId || ('u_' + (user.username || '').toLowerCase());
        if (window.FirebaseService) {
            try {
                await FirebaseService.updateUserStatus(uid, 'offline');
                await FirebaseService.updateUser(uid, { activeSession: null, sessionToken: null });
            } catch (e) {}
        }
        try {
            const users = JSON.parse(localStorage.getItem('userList') || '[]');
            const idx = users.findIndex(u => (u.userId && u.userId === uid) || (u.username && u.username.toLowerCase() === user.username.toLowerCase()));
            if (idx !== -1 && users[idx].activeSession === user.sessionId) {
                users[idx].activeSession = null;
                users[idx].sessionToken = null;
                localStorage.setItem('userList', JSON.stringify(users));
            }
        } catch (e) {}
    }

    // 1. Xóa sạch currentUser và sessionToken
    localStorage.removeItem('currentUser');
    localStorage.removeItem('sessionToken');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('sessionToken');
    sessionStorage.clear();

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

// ==========================================================================
// HỆ THỐNG KHỞI TẠO ĐẠO CƠ (FIRST-TIME LOGIN & AVATAR/DISPLAY NAME SETUP)
// ==========================================================================
const XIANXIA_PRESET_AVATARS = [
    { id: 'm1', name: 'Kiếm Tôn (Nam)', src: 'images/avatars/avatar_m1.jpg' },
    { id: 'm2', name: 'Ma Hoàng (Nam)', src: 'images/avatars/avatar_m2.jpg' },
    { id: 'm3', name: 'Đan Thánh (Nam)', src: 'images/avatars/avatar_m3.jpg' },
    { id: 'f1', name: 'Băng Cơ (Nữ)', src: 'images/avatars/avatar_f1.jpg' },
    { id: 'f2', name: 'Thánh Nữ (Nữ)', src: 'images/avatars/avatar_f2.jpg' },
    { id: 'f3', name: 'Huyền Nữ (Nữ)', src: 'images/avatars/avatar_f3.jpg' }
];

window._foundationSelectedPhotoURL = null;

function checkFirstTimeFoundationSetup() {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if (!user) return;

    // Check điều kiện: if (!currentUser.displayName || !currentUser.photoURL)
    const hasDisplayName = !!(user.displayName && String(user.displayName).trim());
    const hasPhotoURL = !!(user.photoURL && String(user.photoURL).trim());

    if (!hasDisplayName || !hasPhotoURL) {
        openFoundationSetupModal(true);
    }
}

function openFoundationSetupModal(isFirstTime = false) {
    let backdrop = document.getElementById('foundation-setup-backdrop');
    if (backdrop) {
        backdrop.remove();
    }

    backdrop = document.createElement('div');
    backdrop.id = 'foundation-setup-backdrop';
    backdrop.style.cssText = 'position: fixed; inset: 0; z-index: 999999; display: flex; align-items: center; justify-content: center; background: rgba(15, 23, 42, 0.88); backdrop-filter: blur(8px); padding: 16px; overflow-y: auto;';

    if (!isFirstTime) {
        backdrop.onclick = function(e) {
            if (e.target === backdrop) closeFoundationModal();
        };
    }

    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : { username: 'User' };
    const defaultName = (user && (user.displayName || user.username)) || '';
    window._foundationSelectedPhotoURL = (user && user.photoURL) || 'images/avatars/avatar_m1.jpg';

    backdrop.innerHTML = `
        <div class="foundation-modal-dialog" style="max-width: 520px; width: 100%; background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%); border: 2px solid #eab308; box-shadow: 0 0 35px rgba(234, 179, 8, 0.35), 0 20px 40px rgba(0, 0, 0, 0.8); border-radius: 18px; padding: 24px; color: #f8fafc; position: relative;">
            ${!isFirstTime ? `
                <button type="button" onclick="closeFoundationModal()" style="position: absolute; top: 16px; right: 16px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: #94a3b8; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;" title="Đóng">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            ` : ''}

            <div style="text-align: center; margin-bottom: 20px;">
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 50px; height: 50px; border-radius: 50%; background: radial-gradient(circle, rgba(234, 179, 8, 0.3) 0%, rgba(234, 179, 8, 0.05) 100%); border: 1.5px solid #facc15; margin-bottom: 10px;">
                    <i class="fa-solid fa-yin-yang fa-spin" style="--fa-animation-duration: 8s; color: #fde047; font-size: 24px;"></i>
                </div>
                <h3 style="font-size: 20px; font-weight: 900; color: #fde047; margin: 0 0 6px 0; letter-spacing: 0.5px; text-shadow: 0 0 12px rgba(250, 204, 21, 0.4);">
                    Khởi Tạo Đạo Cơ - Nhập Môn Tông Môn
                </h3>
                <p style="font-size: 12.5px; color: #94a3b8; margin: 0; line-height: 1.5;">
                    ${isFirstTime ? 'Chào mừng tân đệ tử nhập môn! Hãy lập Đạo Hiệu và lựa chọn Pháp Tướng đại diện cho căn cơ trước khi bắt đầu tu tập.' : 'Thay đổi Đạo Hiệu giang hồ và Pháp Tướng đại diện cho căn cơ tu vi của bạn.'}
                </p>
            </div>

            <!-- KHU VỰC LIVE PREVIEW AVATAR ĐƯỢC CHỌN -->
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 18px;">
                <div style="position: relative; width: 84px; height: 84px;">
                    <img id="foundation-preview-avatar" src="${escapeHtml(window._foundationSelectedPhotoURL)}" alt="Preview Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 3px solid #fbbf24; box-shadow: 0 0 20px rgba(251, 191, 36, 0.6);" />
                    <div style="position: absolute; bottom: 0; right: 0; background: #eab308; color: #1e293b; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900; box-shadow: 0 0 8px rgba(0,0,0,0.5);">
                        <i class="fa-solid fa-sparkles"></i>
                    </div>
                </div>
                <div id="foundation-preview-name" style="margin-top: 8px; font-size: 14px; font-weight: 800; color: #fef08a; text-shadow: 0 0 8px rgba(254, 240, 138, 0.5);">
                    ${escapeHtml(defaultName || 'Tân Đệ Tử')}
                </div>
            </div>

            <!-- INPUT 1: NHẬP ĐẠO HIỆU -->
            <div style="margin-bottom: 18px;">
                <label for="foundation-display-name-input" style="display: block; font-size: 13px; font-weight: 700; color: #cbd5e1; margin-bottom: 6px;">
                    <i class="fa-solid fa-feather-pointed" style="color: #fbbf24; margin-right: 5px;"></i>
                    <span>Đạo Hiệu (Tên giang hồ của bạn):</span>
                </label>
                <input type="text" id="foundation-display-name-input" value="${escapeHtml(defaultName)}" placeholder="Ví dụ: Tiêu Viêm, Hàn Lập, Bạch Y Kiếm Tiên..." maxlength="30" oninput="updateFoundationPreviewName(this.value)" style="width: 100%; padding: 11px 14px; background: rgba(30, 41, 59, 0.9); border: 1.5px solid #475569; border-radius: 10px; color: #ffffff; font-size: 14.5px; font-weight: 600; outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor='#f59e0b'" onblur="this.style.borderColor='#475569'" />
                <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
                    <i class="fa-solid fa-circle-info"></i> Lệnh bài đăng nhập (Username: <strong>${escapeHtml(user.username || 'User')}</strong>) được giữ nguyên để xác thực.
                </div>
            </div>

            <!-- GRID CHỌN AVATAR: 6 MẪU CÓ SẴN -->
            <div style="margin-bottom: 16px;">
                <label style="display: block; font-size: 13px; font-weight: 700; color: #cbd5e1; margin-bottom: 10px;">
                    <i class="fa-solid fa-user-astronaut" style="color: #60a5fa; margin-right: 5px;"></i>
                    <span>Lựa chọn Dung Mạo / Pháp Tướng (6 Căn Cơ Mặc Định):</span>
                </label>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    ${XIANXIA_PRESET_AVATARS.map(av => {
                        const isSelected = window._foundationSelectedPhotoURL === av.src;
                        return `
                            <div class="foundation-preset-card" onclick="selectFoundationAvatar('${av.src}', this)" style="display: flex; flex-direction: column; align-items: center; padding: 10px 6px; border-radius: 12px; cursor: pointer; transition: all 0.2s; background: ${isSelected ? 'rgba(234, 179, 8, 0.15)' : 'rgba(30, 41, 59, 0.6)'}; border: 1.5px solid ${isSelected ? '#facc15' : 'rgba(255,255,255,0.1)'}; box-shadow: ${isSelected ? '0 0 14px rgba(250, 204, 21, 0.45)' : 'none'}; transform: ${isSelected ? 'scale(1.03)' : 'scale(1)'};">
                                <div style="position: relative; width: 56px; height: 56px; margin-bottom: 6px;">
                                    <img src="${av.src}" alt="${av.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid ${isSelected ? '#facc15' : '#64748b'};" />
                                    <div class="f-check-icon" style="display: ${isSelected ? 'flex' : 'none'}; position: absolute; bottom: -2px; right: -2px; background: #eab308; color: #000; width: 18px; height: 18px; border-radius: 50%; align-items: center; justify-content: center; font-size: 10px; font-weight: 900;">
                                        <i class="fa-solid fa-check"></i>
                                    </div>
                                </div>
                                <span style="font-size: 11px; font-weight: 700; color: ${isSelected ? '#fef08a' : '#cbd5e1'}; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">
                                    ${av.name}
                                </span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- (OPTIONAL) UPLOAD ẢNH MỘC TỪ THIẾT BỊ -->
            <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 22px;">
                <input type="file" id="foundation-avatar-file-input" accept="image/*" style="display: none;" onchange="handleFoundationUpload(event)" />
                <button type="button" onclick="document.getElementById('foundation-avatar-file-input').click()" style="padding: 7px 16px; border-radius: 8px; background: rgba(51, 65, 85, 0.6); border: 1px dashed #64748b; color: #cbd5e1; font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; transition: all 0.2s;">
                    <i class="fa-solid fa-cloud-arrow-up" style="color: #38bdf8;"></i>
                    <span>Hoặc tải ảnh mộc từ thiết bị của bạn</span>
                </button>
            </div>

            <!-- NÚT HÀNH ĐỘNG: TRÚC CƠ THÀNH CÔNG -->
            <div style="display: flex; gap: 10px;">
                ${!isFirstTime ? `
                    <button type="button" onclick="closeFoundationModal()" style="flex: 1; padding: 12px 16px; border-radius: 10px; background: transparent; border: 1px solid #64748b; color: #cbd5e1; font-weight: 700; font-size: 14px; cursor: pointer; transition: all 0.2s;">
                        Hủy bỏ
                    </button>
                ` : ''}
                <button type="button" id="btn-foundation-submit" onclick="submitFoundationSetup(${isFirstTime})" style="flex: 2; padding: 12px 20px; border-radius: 10px; background: linear-gradient(135deg, #d97706 0%, #b45309 50%, #78350f 100%); border: 1.5px solid #fbbf24; color: #ffffff; font-weight: 800; font-size: 15px; cursor: pointer; box-shadow: 0 0 16px rgba(245, 158, 11, 0.45); display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s;">
                    <i class="fa-solid fa-wand-magic-sparkles" style="color: #fef08a;"></i>
                    <span>Trúc Cơ Thành Công</span>
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(backdrop);
}

function selectFoundationAvatar(src, el) {
    window._foundationSelectedPhotoURL = src;
    const preview = document.getElementById('foundation-preview-avatar');
    if (preview) preview.src = src;

    const cards = document.querySelectorAll('.foundation-preset-card');
    cards.forEach(c => {
        c.style.background = 'rgba(30, 41, 59, 0.6)';
        c.style.border = '1.5px solid rgba(255, 255, 255, 0.1)';
        c.style.boxShadow = 'none';
        c.style.transform = 'scale(1)';
        const check = c.querySelector('.f-check-icon');
        if (check) check.style.display = 'none';
        const txt = c.querySelector('span');
        if (txt) txt.style.color = '#cbd5e1';
    });

    if (el) {
        el.style.background = 'rgba(234, 179, 8, 0.15)';
        el.style.border = '1.5px solid #facc15';
        el.style.boxShadow = '0 0 14px rgba(250, 204, 21, 0.45)';
        el.style.transform = 'scale(1.03)';
        const check = el.querySelector('.f-check-icon');
        if (check) check.style.display = 'flex';
        const txt = el.querySelector('span');
        if (txt) txt.style.color = '#fef08a';
    }
}

function updateFoundationPreviewName(val) {
    const preview = document.getElementById('foundation-preview-name');
    if (preview) {
        preview.textContent = val.trim() || 'Tân Đệ Tử';
    }
}

function handleFoundationUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn file hình ảnh hợp lệ!');
        return;
    }
    if (file.size > 2 * 1024 * 1024) {
        alert('Dung lượng ảnh vượt quá 2MB, vui lòng chọn ảnh nhẹ hơn!');
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        window._foundationSelectedPhotoURL = dataUrl;
        const preview = document.getElementById('foundation-preview-avatar');
        if (preview) preview.src = dataUrl;

        const cards = document.querySelectorAll('.foundation-preset-card');
        cards.forEach(c => {
            c.style.background = 'rgba(30, 41, 59, 0.6)';
            c.style.border = '1.5px solid rgba(255, 255, 255, 0.1)';
            c.style.boxShadow = 'none';
            c.style.transform = 'scale(1)';
            const check = c.querySelector('.f-check-icon');
            if (check) check.style.display = 'none';
        });
    };
    reader.readAsDataURL(file);
}

function closeFoundationModal() {
    const backdrop = document.getElementById('foundation-setup-backdrop');
    if (backdrop) {
        backdrop.remove();
    }
}

async function submitFoundationSetup(isFirstTime) {
    const nameInput = document.getElementById('foundation-display-name-input');
    const nameVal = nameInput ? nameInput.value.trim() : '';
    if (!nameVal) {
        alert('Vui lòng nhập Đạo Hiệu để hoàn tất Trúc Cơ!');
        if (nameInput) nameInput.focus();
        return;
    }

    const photoURL = window._foundationSelectedPhotoURL || 'images/avatars/avatar_m1.jpg';
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if (!user) {
        alert('Không tìm thấy thông tin phiên đăng nhập!');
        return;
    }

    const btn = document.getElementById('btn-foundation-submit');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang Trúc Cơ...</span>`;
    }

    const uid = user.userId || ('u_' + (user.username || '').toLowerCase());

    try {
        if (window.update && window.ref && window.db) {
            await update(ref(db, 'users/' + uid), {
                displayName: nameVal,
                photoURL: photoURL
            });
        } else if (window.FirebaseService && typeof FirebaseService.updateUser === 'function') {
            await FirebaseService.updateUser(uid, {
                displayName: nameVal,
                photoURL: photoURL
            });
        }
    } catch (e) {
        console.warn('[Foundation] Lỗi khi lưu lên Firebase:', e);
    }

    // Cập nhật session/local
    user.displayName = nameVal;
    user.photoURL = photoURL;
    try {
        if (localStorage.getItem('currentUser')) {
            localStorage.setItem('currentUser', JSON.stringify(user));
        }
        if (sessionStorage.getItem('currentUser')) {
            sessionStorage.setItem('currentUser', JSON.stringify(user));
        }
    } catch (e) {}

    closeFoundationModal();

    if (typeof updateHeaderUserPill === 'function') {
        updateHeaderUserPill(user);
    }
    if (typeof updateHeaderUser === 'function') {
        updateHeaderUser(user);
    }
    if (typeof updateHeaderRankDisplay === 'function') {
        updateHeaderRankDisplay();
    }
    if (typeof renderLeaderboard === 'function') {
        renderLeaderboard();
    }
    if (typeof showToast === 'function') {
        showToast(`Chúc mừng đạo hữu "${nameVal}" đã Trúc Cơ Thành Công! Căn cơ vững chắc!`, 'success');
    } else {
        alert(`Chúc mừng đạo hữu "${nameVal}" đã Trúc Cơ Thành Công!`);
    }
}

window.checkFirstTimeFoundationSetup = checkFirstTimeFoundationSetup;
window.openFoundationSetupModal = openFoundationSetupModal;
window.closeFoundationModal = closeFoundationModal;
window.selectFoundationAvatar = selectFoundationAvatar;
window.updateFoundationPreviewName = updateFoundationPreviewName;
window.handleFoundationUpload = handleFoundationUpload;
window.submitFoundationSetup = submitFoundationSetup;
