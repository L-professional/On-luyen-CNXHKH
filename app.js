/**
 * Hệ thống Ôn luyện & Thi trắc nghiệm - Chủ nghĩa xã hội khoa học
 * Quản lý đa chế độ: Ôn luyện (mode=learn) & Kiểm tra (mode=test)
 * Logic định tuyến, chấm điểm và phản hồi tương tác
 */

// Danh sách URL dữ liệu 6 chủ đề (giữ nguyên không chạm vào)
const fileUrls = [
    './data/chude1.json',
    './data/chude2.json',
    './data/chude3.json',
    './data/chude4.json',
    './data/chude5.json',
    './data/chude6.json'
];

// Metadata chi tiết 6 chủ đề ôn luyện
const TOPICS_METADATA = [
    {
        id: 1,
        title: "Chủ đề 1",
        name: "Chủ đề 1: Đối tượng, chức năng, phương pháp nghiên cứu của CNXH khoa học",
        shortTitle: "Đối tượng, chức năng, phương pháp nghiên cứu của CNXH khoa học",
        headerDisplay: "Chủ đề 1: Đối tượng, chức năng, phương pháp nghiên cứu<br>của CNXH khoa học",
        quote: "Hiểu đúng bản chất, nắm vững phương pháp, để vận dụng sáng tạo vào thực tiễn.",
        icon: "fa-solid fa-book-open"
    },
    {
        id: 2,
        title: "Chủ đề 2",
        name: "Chủ đề 2: Sự ra đời và phát triển của CNXH khoa học",
        shortTitle: "Sự ra đời và phát triển của CNXH khoa học",
        headerDisplay: "Chủ đề 2: Sự ra đời và phát triển<br>của CNXH khoa học",
        quote: "Nắm vững quy luật phát triển lịch sử để củng cố niềm tin khoa học.",
        icon: "fa-solid fa-chart-line"
    },
    {
        id: 3,
        title: "Chủ đề 3",
        name: "Chủ đề 3: Sứ mệnh lịch sử của giai cấp công nhân",
        shortTitle: "Sứ mệnh lịch sử của giai cấp công nhân",
        headerDisplay: "Chủ đề 3: Sứ mệnh lịch sử<br>của giai cấp công nhân",
        quote: "Giai cấp tiên phong lãnh đạo cách mạng xã hội chủ nghĩa.",
        icon: "fa-solid fa-users"
    },
    {
        id: 4,
        title: "Chủ đề 4",
        name: "Chủ đề 4: Những đặc trưng cơ bản của CNXH và con đường đi lên CNXH ở Việt Nam",
        shortTitle: "Những đặc trưng cơ bản của CNXH và con đường đi lên CNXH ở Việt Nam",
        headerDisplay: "Chủ đề 4: Những đặc trưng cơ bản của CNXH<br>và con đường đi lên CNXH ở Việt Nam",
        quote: "Vận dụng sáng tạo chủ nghĩa Mác - Lênin vào thực tiễn Việt Nam.",
        icon: "fa-regular fa-star"
    },
    {
        id: 5,
        title: "Chủ đề 5",
        name: "Chủ đề 5: Các hình thái kinh tế - xã hội",
        shortTitle: "Các hình thái kinh tế - xã hội",
        headerDisplay: "Chủ đề 5: Các hình thái kinh tế - xã hội",
        quote: "Quy luật vận động và thay thế tất yếu của các hình thái kinh tế - xã hội.",
        icon: "fa-solid fa-gear"
    },
    {
        id: 6,
        title: "Chủ đề 6",
        name: "Chủ đề 6: Thời kỳ quá độ lên CNXH",
        shortTitle: "Thời kỳ quá độ lên CNXH",
        headerDisplay: "Chủ đề 6: Thời kỳ quá độ lên CNXH",
        quote: "Bước chuyển tất yếu từ xã hội cũ sang xã hội mới văn minh, công bằng.",
        icon: "fa-solid fa-landmark"
    }
];

// Trạng thái phiên làm việc toàn cục
const appState = {
    mode: 'learn',            // 'learn' (Ôn luyện) | 'test' (Kiểm tra)
    topicId: 1,               // 1..6 hoặc 'mock'
    topicMeta: null,
    allQuestions: [],         // Danh sách toàn bộ câu hỏi
    filteredQuestions: [],    // Danh sách câu hỏi sau khi lọc (trong mode=learn)
    activeFilter: 'all',      // 'all' | 'single' | 'multiple' | 'drag_drop' | 'true_false' | 'fill_blank'
    currentIndex: 0,          // Vị trí câu hỏi hiện tại trong danh sách đang xem
    userAnswers: {},          // Lưu câu trả lời của người dùng: { [qId]: value }
    flaggedQuestions: {},     // Đánh dấu câu hỏi: { [qId]: boolean }
    timerSeconds: 30 * 60,    // Đếm ngược (30 phút hoặc 60 phút)
    timerInterval: null,
    isSubmitted: false,
    isReviewMode: false,      // Trong mode=test: sau khi nộp bài bật xem lại đáp án
    pendingLevelUp: null      // Lưu thông tin cấp độ mới nếu thăng cấp để hiển thị popup
};

// ==========================================================================
// 1. QUẢN LÝ TIẾN TRÌNH VỚI LOCALSTORAGE (CHỈ DÀNH CHO CHẾ ĐỘ ÔN LUYỆN)
// ==========================================================================
/**
 * Trả về Storage Key độc lập 1-1 cho tiến trình của từng tài khoản:
 * progress_{username}_topic_{topicId}
 */
function getProgressStorageKey(topicId) {
    const user = getCurrentUser();
    const username = (user && user.username) ? user.username : 'guest';
    return `progress_${username}_topic_${topicId}`;
}

/**
 * Xóa sạch các key dùng chung legacy (nếu có từ trước) để loại bỏ hoàn toàn rò rỉ dữ liệu
 */
function cleanupLegacySharedProgress() {
    try {
        for (let i = 1; i <= 6; i++) {
            localStorage.removeItem(`cnxh_learn_progress_${i}`);
        }
        localStorage.removeItem('topicProgress');
    } catch (e) {
        // ignore
    }
}

/**
 * Lưu tiến trình ôn luyện vào localStorage
 * @param {number|string} topicId - ID của chủ đề (1..6)
 * @param {Object} data - Dữ liệu gồm { currentIndex, answeredQuestions }
 */
function saveProgress(topicId, data) {
    if (!topicId || topicId === 'mock') return;
    try {
        const payload = {
            topicId: topicId,
            currentIndex: (typeof data.currentIndex === 'number') ? data.currentIndex : (parseInt(data.currentIndex, 10) || 0),
            answeredQuestions: data.answeredQuestions || data.userAnswers || {},
            updatedAt: Date.now()
        };
        localStorage.setItem(getProgressStorageKey(topicId), JSON.stringify(payload));
    } catch (e) {
        console.warn('Lỗi khi lưu tiến trình vào localStorage:', e);
    }
}

/**
 * Đọc tiến trình ôn luyện từ localStorage
 * @param {number|string} topicId - ID của chủ đề (1..6)
 * @returns {Object|null} { topicId, currentIndex, answeredQuestions, updatedAt }
 */
function loadProgress(topicId) {
    if (!topicId || topicId === 'mock') return null;
    try {
        const raw = localStorage.getItem(getProgressStorageKey(topicId));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            return parsed;
        }
        return null;
    } catch (e) {
        console.warn('Lỗi khi đọc tiến trình từ localStorage:', e);
        return null;
    }
}

/**
 * Xóa tiến trình ôn luyện của một chủ đề (khi người dùng muốn làm lại từ đầu)
 */
function clearProgress(topicId) {
    if (!topicId || topicId === 'mock') return;
    try {
        localStorage.removeItem(getProgressStorageKey(topicId));
    } catch (e) {
        console.warn('Lỗi khi xóa tiến trình:', e);
    }
}

/**
 * Đếm số lượng câu đã trả lời trong object answeredQuestions
 */
function countAnsweredQuestions(answeredQuestions) {
    if (!answeredQuestions || typeof answeredQuestions !== 'object') return 0;
    let count = 0;
    for (const key in answeredQuestions) {
        if (!Object.prototype.hasOwnProperty.call(answeredQuestions, key)) continue;
        const val = answeredQuestions[key];
        if (val !== undefined && val !== null) {
            if (typeof val === 'object' && !Array.isArray(val)) {
                if (Object.keys(val).length > 0) count++;
            } else if (Array.isArray(val)) {
                if (val.length > 0) count++;
            } else {
                count++;
            }
        }
    }
    return count;
}

/**
 * Tự động lưu tiến trình hiện tại nếu đang trong chế độ Ôn luyện (mode=learn)
 */
function saveCurrentLearnProgress() {
    if (appState.mode !== 'learn' || !appState.topicId || appState.topicId === 'mock') {
        return;
    }

    let targetIndex = appState.currentIndex;
    const currentQ = appState.filteredQuestions[appState.currentIndex];
    if (currentQ) {
        const idxInAll = appState.allQuestions.findIndex(q => q.id === currentQ.id);
        if (idxInAll !== -1) targetIndex = idxInAll;
    }

    saveProgress(appState.topicId, {
        currentIndex: targetIndex,
        answeredQuestions: appState.userAnswers
    });
}

/**
 * Hành vi nút "Tạm dừng ôn":
 * Đảm bảo trạng thái hiện tại đã được ghi vào localStorage và chuyển hướng về index.html
 */
function pauseLearnMode() {
    if (appState.mode === 'learn' && appState.topicId && appState.topicId !== 'mock') {
        saveCurrentLearnProgress();
    }
    if (appState.pendingLevelUp) {
        const rank = appState.pendingLevelUp;
        appState.pendingLevelUp = null;
        showLevelUpModal(rank, null, () => {
            window.location.href = 'index.html';
        });
        return;
    }
    showToast('Đã lưu tiến trình ôn luyện!');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 280);
}

// ==========================================================================
// QUẢN LÝ TÀI KHOẢN & PHÂN QUYỀN (AUTH & USER MANAGEMENT)
// ==========================================================================
const DEFAULT_USERS = [
    {
        username: 'Admin',
        password: 'Loclsct2006',
        role: 'admin',
        createdAt: '08/10/2026',
        isRoot: true,
        activeSession: null
    },
    {
        username: 'Loc',
        password: '123',
        role: 'user',
        createdAt: '08/10/2026',
        isRoot: false,
        activeSession: null
    }
];

function initUserStorage() {
    if (!localStorage.getItem('userList')) {
        localStorage.setItem('userList', JSON.stringify(DEFAULT_USERS));
    } else {
        // Đảm bảo Root Admin mặc định luôn tồn tại
        try {
            const list = JSON.parse(localStorage.getItem('userList') || '[]');
            const hasRoot = list.some(u => u.username.toLowerCase() === 'admin');
            if (!hasRoot) {
                list.unshift(DEFAULT_USERS[0]);
                localStorage.setItem('userList', JSON.stringify(list));
            }
        } catch (e) {
            localStorage.setItem('userList', JSON.stringify(DEFAULT_USERS));
        }
    }
}

function getCurrentUser() {
    try {
        const str = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
        if (!str) return null;
        const user = JSON.parse(str);
        if (!user || !user.username || !user.loginAt) {
            localStorage.removeItem('currentUser');
            sessionStorage.removeItem('currentUser');
            return null;
        }
        return user;
    } catch (e) {
        return null;
    }
}

/**
 * Phân quyền hiển thị menu Quản lý tài khoản trên Sidebar:
 * Nếu currentUser.role === 'admin' -> chuyển style thành display: flex; (hoặc block)
 * Nếu là user thường -> giữ nguyên trạng thái ẩn
 */
function checkAdminMenu() {
    const user = getCurrentUser();
    const adminMenuItems = document.querySelectorAll('#admin-menu-item, .admin-menu-item-sync');
    adminMenuItems.forEach(item => {
        if (user && user.role === 'admin') {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });

    updateHeaderUserPill(user);
}

function updateHeaderUserPill(user) {
    const nameEls = document.querySelectorAll('#header-user-name, .user-name');
    nameEls.forEach(el => {
        el.textContent = user ? user.username : 'Khách';
    });
    const avatarEls = document.querySelectorAll('.user-avatar');
    avatarEls.forEach(el => {
        if (user && user.username) {
            el.textContent = user.username.charAt(0).toUpperCase();
        } else {
            el.innerHTML = '<i class="fa-solid fa-user"></i>';
        }
    });
    updateHeaderRankDisplay();
}

// ==========================================================================
// HỆ THỐNG GAMIFICATION (RANKING & EXP POINTS)
// ==========================================================================

const RANK_LEVELS = [
    {
        level: 1,
        id: 'gamo',
        name: 'GÀ MỜ',
        title: 'Gà Mờ',
        minExp: 0,
        maxExp: 100,
        color: '#475569',
        icon: 'fa-solid fa-egg',
        badgeClass: 'rank-gamo',
        nextRankName: 'TẬP SỰ'
    },
    {
        level: 2,
        id: 'tapsu',
        name: 'TẬP SỰ',
        title: 'Tập Sự',
        minExp: 101,
        maxExp: 300,
        color: '#15803d',
        icon: 'fa-solid fa-feather-pointed',
        badgeClass: 'rank-tapsu',
        nextRankName: 'TÂN BINH'
    },
    {
        level: 3,
        id: 'tanbinh',
        name: 'TÂN BINH',
        title: 'Tân Binh',
        minExp: 301,
        maxExp: 600,
        color: '#1d4ed8',
        icon: 'fa-solid fa-shield-halved',
        badgeClass: 'rank-tanbinh',
        nextRankName: 'CAO THỦ'
    },
    {
        level: 4,
        id: 'caothu',
        name: 'CAO THỦ',
        title: 'Cao Thủ',
        minExp: 601,
        maxExp: 1000,
        color: '#7e22ce',
        icon: 'fa-solid fa-wand-magic-sparkles',
        badgeClass: 'rank-caothu',
        nextRankName: 'ĐẠI ĐẾ'
    },
    {
        level: 5,
        id: 'daide',
        name: 'ĐẠI ĐẾ',
        title: 'Đại Đế',
        minExp: 1001,
        maxExp: 1500,
        color: '#b45309',
        icon: 'fa-solid fa-crown',
        badgeClass: 'rank-daide',
        nextRankName: 'CHÍ TÔN THẦN'
    },
    {
        level: 6,
        id: 'chitonthan',
        name: 'CHÍ TÔN THẦN',
        title: 'Chí Tôn Thần',
        minExp: 1501,
        maxExp: Infinity,
        color: '#ffffff',
        icon: 'fa-solid fa-fire-flame-curved',
        badgeClass: 'rank-chitonthan',
        nextRankName: null // Cảnh giới tối cao
    }
];

/**
 * Đọc thông tin cấp độ và EXP của tài khoản hiện tại từ localStorage
 * Ràng buộc: userStats_${currentUser.username}
 */
function getUserStats() {
    const user = getCurrentUser();
    if (!user || !user.username) {
        return { exp: 0, level: 1, rankId: 'gamo' };
    }
    const key = 'userStats_' + user.username;
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return { exp: 0, level: 1, rankId: 'gamo' };
        const data = JSON.parse(raw);
        const exp = Math.max(0, parseInt(data.exp, 10) || 0);
        const rank = getRankByExp(exp);
        return {
            exp: exp,
            level: rank.level,
            rankId: rank.id
        };
    } catch (e) {
        return { exp: 0, level: 1, rankId: 'gamo' };
    }
}

/**
 * Lưu thông tin cấp độ và EXP vào localStorage
 */
function saveUserStats(stats) {
    const user = getCurrentUser();
    if (!user || !user.username) return;
    const key = 'userStats_' + user.username;
    try {
        localStorage.setItem(key, JSON.stringify(stats));
    } catch (e) {
        console.error('Lỗi khi lưu userStats:', e);
    }
}

/**
 * Xác định Cấp độ Rank dựa trên số điểm EXP
 */
function getRankByExp(exp) {
    const safeExp = Math.max(0, parseInt(exp, 10) || 0);
    for (let i = RANK_LEVELS.length - 1; i >= 0; i--) {
        if (safeExp >= RANK_LEVELS[i].minExp) {
            return RANK_LEVELS[i];
        }
    }
    return RANK_LEVELS[0];
}

/**
 * Tính toán tiến trình % và số EXP cần thiết để thăng cấp tiếp theo
 */
function getRankProgress(exp) {
    const rank = getRankByExp(exp);
    if (rank.id === 'chitonthan') {
        return {
            percent: 100,
            expNeeded: 0,
            nextRankName: null,
            isMax: true
        };
    }

    const percent = Math.min(100, Math.max(0, Math.round((exp / rank.maxExp) * 100)));
    const expNeeded = Math.max(1, rank.maxExp - exp + 1);

    return {
        percent: percent,
        expNeeded: expNeeded,
        nextRankName: rank.nextRankName,
        isMax: false
    };
}

/**
 * Thuật toán cộng điểm kinh nghiệm (EXP Gain Logic)
 * @param {number} points Số điểm EXP cần cộng (+2 khi ôn luyện, +10 khi kiểm tra, +50 điểm 10)
 */
function addExp(points) {
    if (!points || points <= 0) {
        return { gained: 0, leveledUp: false, oldRank: null, newRank: null };
    }

    const user = getCurrentUser();
    if (!user || !user.username) {
        return { gained: 0, leveledUp: false };
    }

    const stats = getUserStats();
    const oldExp = stats.exp;
    const oldRank = getRankByExp(oldExp);

    const newExp = oldExp + points;
    const newRank = getRankByExp(newExp);

    stats.exp = newExp;
    stats.level = newRank.level;
    stats.rankId = newRank.id;

    saveUserStats(stats);

    // Cập nhật ngay huy hiệu trên Header
    updateHeaderRankDisplay();

    const leveledUp = newRank.level > oldRank.level;

    if (leveledUp) {
        appState.pendingLevelUp = newRank;

        // Tự động push thông báo vào mảng notifications_${currentUser.username}
        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        addUserNotification({
            message: `🎉 Chúc mừng bạn đã đột phá cảnh giới [${newRank.name}]!`,
            date: dateStr,
            type: 'levelup'
        });
    }

    return {
        gained: points,
        totalExp: newExp,
        leveledUp: leveledUp,
        oldRank: oldRank,
        newRank: newRank
    };
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

    // 3. Cập nhật tức thì vào Modal Tài khoản nếu Modal đang mở trên màn hình (không cần F5)
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
 * Hiển thị hiệu ứng chữ nổi +2 EXP khi làm bài ôn luyện
 */
function showFloatingExpBadge(points) {
    const badge = document.createElement('div');
    badge.className = 'exp-float-badge';
    badge.innerHTML = `<i class="fa-solid fa-bolt"></i> +${points} EXP`;

    const detailCard = document.querySelector('.learn-detail-card') || document.querySelector('.main-content');
    if (detailCard) {
        const rect = detailCard.getBoundingClientRect();
        badge.style.left = `${rect.left + rect.width / 2}px`;
        badge.style.top = `${rect.top + 70}px`;
    } else {
        badge.style.left = '50%';
        badge.style.top = '100px';
    }

    document.body.appendChild(badge);

    setTimeout(() => {
        if (badge && badge.parentNode) {
            badge.parentNode.removeChild(badge);
        }
    }, 1250);
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

/**
 * Render HTML khu vực "Thẻ Bài" (Rank Card) trong Modal thông tin tài khoản
 */
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
// HỆ THỐNG CHUÔNG THÔNG BÁO (NOTIFICATION BELL)
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

/**
 * Biến lưu callback khi đóng Modal Thăng cấp
 */
let levelUpCallback = null;

/**
 * Hiển thị Modal Popup Thăng Cấp Đặc Biệt với Confetti
 */
function showLevelUpModal(newRank, oldRank = null, callback = null) {
    levelUpCallback = callback;

    let modal = document.getElementById('levelup-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'levelup-modal';
        modal.className = 'levelup-backdrop';
        modal.onclick = (e) => closeLevelUpModalOnBackdrop(e);
        document.body.appendChild(modal);
    }

    const stats = getUserStats();

    modal.innerHTML = `
        <div class="levelup-modal-card">
            <!-- Confetti Container -->
            <div class="confetti-wrapper" id="levelup-confetti-box"></div>

            <!-- Header -->
            <div class="levelup-header">
                <div class="levelup-sparkle-icon">✨ ⚡ ✨</div>
                <h3 class="levelup-title">CHÚC MỪNG BẠN ĐÃ ĐỘT PHÁ CẢNH GIỚI!</h3>
                <p class="levelup-subtitle">Nỗ lực không ngừng – Trí tuệ thăng hoa</p>
            </div>

            <!-- Huy hiệu Rank mới cực to -->
            <div class="levelup-badge-showcase">
                <div class="lub-icon-circle ${newRank.badgeClass}">
                    <i class="${newRank.icon}"></i>
                </div>
                <div class="lub-rank-name ${newRank.badgeClass}">${newRank.name}</div>
                <div class="lub-rank-level">CẢNH GIỚI CẤP ${newRank.level}</div>
            </div>

            <!-- Lời chúc mừng -->
            <div class="levelup-message-box">
                <p class="lub-text-main">
                    Trình độ của bạn đã vươn lên một tầm cao mới. Hãy tiếp tục cày cuốc nhé!
                </p>
                <div class="lub-stats-preview">
                    <span>Tổng kinh nghiệm tích lũy: <strong>${stats.exp.toLocaleString('vi-VN')} EXP</strong></span>
                </div>
            </div>

            <!-- Nút Tuyệt vời! -->
            <div class="levelup-actions">
                <button type="button" class="btn-levelup-confirm" onclick="closeLevelUpModal()">
                    <i class="fa-solid fa-sparkles"></i>
                    <span>Tuyệt vời!</span>
                </button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');

    // Kích hoạt hiệu ứng Confetti pháo hoa
    const confettiBox = modal.querySelector('#levelup-confetti-box');
    triggerConfettiEffect(confettiBox);
}

function closeLevelUpModal() {
    const modal = document.getElementById('levelup-modal');
    if (modal) modal.classList.add('hidden');

    if (typeof levelUpCallback === 'function') {
        const cb = levelUpCallback;
        levelUpCallback = null;
        cb();
    }
}

function closeLevelUpModalOnBackdrop(e) {
    if (e.target.id === 'levelup-modal') {
        closeLevelUpModal();
    }
}

function triggerConfettiEffect(container) {
    if (!container) return;
    const colors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#fbbf24', '#f97316'];
    const particleCount = 65;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'confetti-particle';
        const color = colors[Math.floor(Math.random() * colors.length)];
        const left = Math.random() * 100;
        const size = Math.random() * 8 + 6;
        const duration = Math.random() * 2 + 1.8;
        const delay = Math.random() * 0.5;
        const rotate = Math.random() * 360;
        const isCircle = Math.random() > 0.6;

        particle.style.backgroundColor = color;
        particle.style.left = `${left}%`;
        particle.style.width = `${size}px`;
        particle.style.height = isCircle ? `${size}px` : `${size * 0.6}px`;
        particle.style.borderRadius = isCircle ? '50%' : '2px';
        particle.style.animationDuration = `${duration}s`;
        particle.style.animationDelay = `${delay}s`;
        particle.style.transform = `rotate(${rotate}deg)`;

        container.appendChild(particle);
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

                <!-- Nút Đăng xuất -->
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <button type="button" style="padding: 10px 14px; border-radius: 8px; border: 1px solid #fecdd3; background: #fef2f2; text-align: left; cursor: pointer; font-size: 13.5px; display: flex; align-items: center; gap: 10px; color: #dc2626; font-weight: 600;" onclick="logoutUser()">
                        <i class="fa-solid fa-arrow-right-from-bracket"></i>
                        <span>Đăng xuất (Về trang đăng nhập)</span>
                    </button>
                </div>
            </div>
        `,
        actionText: 'Đóng',
        actionCallback: () => closeModal()
    });
}

// ==========================================================================
// KIỂM SOÁT PHIÊN ĐĂNG NHẬP ĐƠN THIẾT BỊ (SINGLE-DEVICE / SINGLE SESSION GUARD)
// ==========================================================================
let isSessionTerminated = false;

/**
 * Kiểm tra tính hợp lệ của phiên đăng nhập
 * Nếu phát hiện currentUser.sessionId KHÔNG KHỚP với activeSession trong userList
 * -> Ngay lập tức alert, xóa sạch dữ liệu phiên và redirect về login.html
 */
function verifySession() {
    if (isSessionTerminated) return false;

    const user = getCurrentUser();
    if (!user) {
        return false;
    }

    // Đọc danh sách tài khoản từ localStorage để đối chiếu activeSession
    let users = [];
    try {
        const str = localStorage.getItem('userList');
        if (str) users = JSON.parse(str);
    } catch (e) {
        users = [];
    }

    const matched = users.find(u => u.username && u.username.toLowerCase() === user.username.toLowerCase());
    if (matched) {
        // Nếu user trong hệ thống đã có activeSession và khác với sessionId hiện tại
        if (matched.activeSession && user.sessionId && matched.activeSession !== user.sessionId) {
            isSessionTerminated = true;
            forceLogoutSession('Tài khoản của bạn vừa được đăng nhập ở một nơi khác. Vui lòng đăng nhập lại!');
            return false;
        }

        // Nếu user trong hệ thống có activeSession mới mà phiên này không có sessionId
        if (matched.activeSession && !user.sessionId) {
            isSessionTerminated = true;
            forceLogoutSession('Tài khoản của bạn vừa được đăng nhập ở một nơi khác. Vui lòng đăng nhập lại!');
            return false;
        }
    } else {
        // Tài khoản đã bị quản trị viên xóa khỏi hệ thống
        isSessionTerminated = true;
        forceLogoutSession('Tài khoản của bạn không tồn tại hoặc đã bị xóa. Vui lòng liên hệ Quản trị viên!');
        return false;
    }

    return true;
}

/**
 * Cưỡng chế đăng xuất khi bị đè phiên hoặc tài khoản bị vô hiệu hóa
 */
function forceLogoutSession(message) {
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');

    resetAppState();
    resetAllProgressUI();

    if (message) {
        alert(message);
    }

    window.location.replace('login.html');
}

/**
 * Reset toàn bộ biến trạng thái toàn cục (appState) về giá trị mặc định
 */
function resetAppState() {
    appState.mode = 'learn';
    appState.topicId = 1;
    appState.topicMeta = null;
    appState.allQuestions = [];
    appState.filteredQuestions = [];
    appState.activeFilter = 'all';
    appState.currentIndex = 0;
    appState.userAnswers = {};
    appState.flaggedQuestions = {};
    appState.timerSeconds = 30 * 60;
    if (appState.timerInterval) {
        clearInterval(appState.timerInterval);
        appState.timerInterval = null;
    }
    appState.isSubmitted = false;
    appState.isReviewMode = false;
    appState.pendingLevelUp = null;
}

/**
 * Reset toàn bộ các thẻ hiển thị tiến độ, cấp độ trên giao diện về giá trị mặc định (0%)
 */
function resetAllProgressUI() {
    // Reset từng chủ đề trên Dashboard
    for (let i = 1; i <= 6; i++) {
        const fillEl = document.getElementById(`topic-fill-${i}`);
        if (fillEl) fillEl.style.width = '0%';
        const percentEl = document.getElementById(`topic-percent-${i}`);
        if (percentEl) percentEl.textContent = '0%';
        const countEl = document.getElementById(`topic-count-${i}`);
        if (countEl) countEl.textContent = '0/0 câu';
    }

    // Reset toàn bộ các thanh fill tiến độ & % khác
    document.querySelectorAll('.tdc-progress-fill, .progress-fill, .urc-progress-fill').forEach(el => {
        el.style.width = '0%';
    });
    document.querySelectorAll('.tdc-progress-percent, .progress-percent, .urc-prog-percent').forEach(el => {
        el.textContent = '0%';
    });

    // Xóa huy hiệu cấp độ trên Header
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

/**
 * Đăng xuất an toàn:
 * 1. Xóa currentUser
 * 2. Reset appState
 * 3. Reset giao diện về 0%
 * 4. window.location.replace('login.html')
 */
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

    // 2. Reset toàn bộ biến trạng thái toàn cục
    resetAppState();

    // 3. Reset toàn bộ thẻ hiển thị tiến độ và cấp độ về 0%
    resetAllProgressUI();

    // Đóng Modal nếu đang mở
    if (typeof closeModal === 'function') {
        closeModal();
    }

    // 4. Điều hướng an toàn bằng window.location.replace để ngăn nút Back của trình duyệt
    window.location.replace('login.html');
}

// Lắng nghe sự kiện storage để nhận diện lập tức khi tài khoản đăng nhập ở tab/cửa sổ khác
window.addEventListener('storage', (e) => {
    if (e.key === 'userList' || e.key === 'currentUser' || e.key === null) {
        verifySession();
    }
});

// Lắng nghe khi tab được focus
window.addEventListener('focus', () => {
    verifySession();
});

// Lắng nghe bfcache khi người dùng bấm Back trình duyệt
window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
        verifySession();
    }
});

// Kiểm tra định kỳ heartbeat mỗi 2.5s
setInterval(() => {
    verifySession();
}, 2500);

// ==========================================================================
// KHỞI ĐỘNG ỨNG DỤNG
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initUserStorage();
    cleanupLegacySharedProgress();

    // Bắt buộc phải đăng nhập mới được ôn luyện và sử dụng hệ thống
    const user = getCurrentUser();
    if (!user) {
        window.location.replace('login.html');
        return;
    }

    // Kiểm tra tính hợp lệ của phiên làm việc (Single Device Guard)
    if (!verifySession()) {
        return;
    }

    checkAdminMenu();
    updateHeaderRankDisplay();
    updateNotificationBellUI();

    const isPracticePage = !!document.getElementById('practice-body');

    if (isPracticePage) {
        initPracticePage();
    } else {
        initDashboardPage();
    }
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

// Tự động lưu khi người dùng đóng tab / rời trang trong mode=learn
window.addEventListener('beforeunload', () => {
    if (appState.mode === 'learn') {
        saveCurrentLearnProgress();
    }
});

// ==========================================================================
// 2. ĐỒNG BỘ DỮ LIỆU RA DASHBOARD (INDEX.HTML)
// ==========================================================================
async function initDashboardPage() {
    await syncDashboardProgress();
}

/**
 * Đồng bộ dữ liệu ra Dashboard:
 * - Dùng fetch() đọc qua 6 file JSON trong thư mục data/ (từ chude1 đến chude6) để lấy length
 * - Thay thế con số tĩnh "10 câu hỏi" bằng tổng số câu thực tế
 * - Đọc dữ liệu từ localStorage, tính % hoàn thành: (Số câu đã trả lời / Tổng số câu) * 100
 * - Cập nhật số % và thay đổi độ dài (width) thanh Progress bar
 */
async function syncDashboardProgress() {
    const topicIds = [1, 2, 3, 4, 5, 6];

    // Dùng fetch() đọc 6 file song song
    const fetchPromises = topicIds.map(async (id) => {
        try {
            const res = await fetch(`./data/chude${id}.json`);
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();
            return { id, total: data.length };
        } catch (e) {
            console.warn(`Lỗi fetch chude${id}.json:`, e);
            return { id, total: 0 };
        }
    });

    const results = await Promise.all(fetchPromises);

    // Cập nhật từng thẻ Chủ đề trên Dashboard
    results.forEach(({ id, total }) => {
        // Cập nhật số câu thực tế
        const countEl = document.getElementById(`topic-count-${id}`);
        if (countEl && total > 0) {
            countEl.textContent = `${total} câu hỏi`;
        }

        // Đọc localStorage tương ứng
        const progress = loadProgress(id);
        const answeredCount = progress ? countAnsweredQuestions(progress.answeredQuestions) : 0;

        // Tính % hoàn thành: (Số câu đã trả lời / Tổng số câu) * 100
        const percent = total > 0 ? Math.min(100, Math.round((answeredCount / total) * 100)) : 0;

        // Cập nhật con số %
        const percentEl = document.getElementById(`topic-percent-${id}`);
        if (percentEl) {
            percentEl.textContent = `${percent}%`;
            if (percent > 0) {
                percentEl.style.color = '#2563eb';
                percentEl.style.fontWeight = '700';
            } else {
                percentEl.style.color = '#94a3b8';
                percentEl.style.fontWeight = '600';
            }
        }

        // Thay đổi độ dài (width) thanh Progress bar màu xanh nhạt
        const fillEl = document.getElementById(`topic-fill-${id}`);
        if (fillEl) {
            fillEl.style.width = `${percent}%`;
        }
    });
}

// ==========================================================================
// ĐIỀU HƯỚNG & PHÂN NHÁNH TRANG PRACTICE.HTML
// ==========================================================================
async function initPracticePage() {
    // Đọc tham số topic và mode từ URLSearchParams
    const urlParams = new URLSearchParams(window.location.search);
    const topicParam = urlParams.get('topic') || '1';
    const modeParam = urlParams.get('mode') || 'learn';

    appState.mode = (modeParam === 'test') ? 'test' : 'learn';
    renderLayout(appState.mode);

    initKeyboardShortcuts();

    if (topicParam === 'mock') {
        await loadMockExamData();
    } else {
        const topicId = parseInt(topicParam, 10) || 1;
        await loadTopicData(topicId);
    }

    startCountdownTimer();
}

// Thay đổi class CSS để hiển thị giao diện mode=learn hoặc mode=test
function renderLayout(mode) {
    const body = document.getElementById('practice-body');
    if (!body) return;

    if (mode === 'test') {
        body.className = 'mode-test';
    } else {
        body.className = 'mode-learn';
    }
}

// Chuyển đổi qua lại giữa 2 chế độ ngay trên trang
function switchPracticeMode(targetMode) {
    if (appState.mode === 'learn') {
        saveCurrentLearnProgress();
    }
    const topicParam = appState.topicId;
    window.location.href = `practice.html?topic=${topicParam}&mode=${targetMode}`;
}

// ==========================================================================
// 3. NẠP DỮ LIỆU & PHỤC HỒI TIẾN TRÌNH (RESUME)
// ==========================================================================
async function loadTopicData(topicId) {
    appState.topicId = topicId;
    const meta = TOPICS_METADATA.find(t => t.id === topicId) || TOPICS_METADATA[0];
    appState.topicMeta = meta;

    try {
        const res = await fetch(`./data/chude${topicId}.json`);
        if (!res.ok) throw new Error(`HTTP status: ${res.status}`);
        const data = await res.json();

        appState.allQuestions = data;
        appState.filteredQuestions = data;
        appState.activeFilter = 'all';
        appState.timerSeconds = 30 * 60;
        appState.isSubmitted = false;
        appState.isReviewMode = false;

        document.title = `${meta.title} (${appState.mode === 'learn' ? 'Ôn luyện' : 'Kiểm tra'}) - CNXHKH`;

        if (appState.mode === 'learn') {
            // Phục hồi tiến trình từ localStorage (Resume)
            const saved = loadProgress(topicId);
            if (saved) {
                appState.userAnswers = saved.answeredQuestions || saved.userAnswers || {};

                // Tự động nhảy đến đúng câu hỏi (currentIndex) đang làm dở lần trước
                let savedIndex = parseInt(saved.currentIndex, 10);
                if (!isNaN(savedIndex) && savedIndex >= 0 && savedIndex < data.length) {
                    appState.currentIndex = savedIndex;
                } else {
                    appState.currentIndex = 0;
                }
            } else {
                appState.currentIndex = 0;
                appState.userAnswers = {};
            }

            appState.flaggedQuestions = {};
            initLearnMode();

            // Nếu phục hồi lại tiến trình cũ, thông báo nhẹ cho người dùng
            if (saved && (appState.currentIndex > 0 || Object.keys(appState.userAnswers).length > 0)) {
                showToast(`Tiếp tục ôn luyện: Đang ở Câu ${appState.currentIndex + 1}`);
            }
        } else {
            // Chế độ Thi thử (mode=test): Không lưu và không phục hồi tiến trình dở dang
            appState.currentIndex = 0;
            appState.userAnswers = {};
            appState.flaggedQuestions = {};
            initTestMode();
        }
    } catch (e) {
        console.error('Lỗi tải dữ liệu chủ đề:', e);
        alert(`Không thể tải dữ liệu chủ đề ${topicId}. Lỗi: ${e.message}`);
    }
}

async function loadMockExamData() {
    appState.topicId = 'mock';
    appState.topicMeta = {
        id: 'mock',
        title: "Thi Mô Phỏng",
        name: "Đề Thi Mô Phỏng Toàn Diện (50 câu)",
        shortTitle: "Thi Mô Phỏng Tổng Hợp 6 Chủ Đề",
        headerDisplay: "Đề Thi Mô Phỏng Toàn Diện<br>50 câu trắc nghiệm tổng hợp",
        quote: "Kiểm tra toàn diện kiến thức cả 6 chủ đề của môn học.",
        icon: "fa-solid fa-bullseye"
    };

    let allQuestions = [];
    for (let url of fileUrls) {
        try {
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                allQuestions = allQuestions.concat(data);
            }
        } catch (e) {
            console.warn(`Lỗi đọc file ${url}:`, e);
        }
    }

    if (allQuestions.length === 0) {
        alert('Không tìm thấy dữ liệu câu hỏi để tạo đề thi.');
        window.location.href = 'index.html';
        return;
    }

    // Trộn ngẫu nhiên câu hỏi và lấy 50 câu
    allQuestions.sort(() => 0.5 - Math.random());
    const examQuestions = allQuestions.slice(0, 50);

    appState.allQuestions = examQuestions;
    appState.filteredQuestions = examQuestions;
    appState.currentIndex = 0;
    appState.userAnswers = {};
    appState.flaggedQuestions = {};
    appState.timerSeconds = 60 * 60; // 60 phút
    appState.isSubmitted = false;
    appState.isReviewMode = false;

    document.title = `Thi Mô Phỏng - Ôn luyện trắc nghiệm`;

    // Thi mô phỏng luôn chạy ở mode=test
    appState.mode = 'test';
    renderLayout('test');
    initTestMode();
}

// ==========================================================================
// CHẾ ĐỘ 1: ÔN LUYỆN (mode=learn) - 2 CỘT, GIẢI THÍCH & PHẢN HỒI ĐÚNG/SAI
// ==========================================================================
function initLearnMode() {
    renderLearnSidebar();
    renderLearnBanner();
    updateLearnFilterCounts();
    renderLearnWorkspace();
}

function renderLearnSidebar() {
    const navMenu = document.getElementById('learn-topic-nav-menu');
    if (!navMenu) return;

    navMenu.innerHTML = TOPICS_METADATA.map(t => `
        <button type="button" class="nav-topic-item ${t.id === appState.topicId ? 'active' : ''}" onclick="switchLearnTopic(${t.id})">
            <i class="${t.icon}"></i>
            <span>${t.name}</span>
        </button>
    `).join('');
}

function switchLearnTopic(newTopicId) {
    if (appState.mode === 'learn') {
        saveCurrentLearnProgress();
    }
    window.location.href = `practice.html?topic=${newTopicId}&mode=learn`;
}

function renderLearnBanner() {
    const meta = appState.topicMeta;
    if (!meta) return;

    const subEl = document.getElementById('learn-banner-sub');
    const titleEl = document.getElementById('learn-banner-title');
    const countEl = document.getElementById('learn-stat-count');

    if (subEl) subEl.textContent = meta.title;
    if (titleEl) titleEl.textContent = meta.shortTitle;
    if (countEl) countEl.textContent = `${appState.allQuestions.length} câu`;
}

function updateLearnFilterCounts() {
    const counts = { all: appState.allQuestions.length, single: 0, multiple: 0, drag_drop: 0, true_false: 0, fill_blank: 0 };

    appState.allQuestions.forEach(q => {
        const info = detectQuestionType(q);
        if (counts[info.id] !== undefined) counts[info.id]++;
    });

    const setT = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setT('count-filter-all', counts.all);
    setT('count-filter-single', counts.single);
    setT('count-filter-multiple', counts.multiple);
    setT('count-filter-drag', counts.drag_drop);
    setT('count-filter-tf', counts.true_false);
    setT('count-filter-fill', counts.fill_blank);
}

function applyLearnFilter(filterType) {
    appState.activeFilter = filterType;

    // Cập nhật class active trên nút lọc
    document.querySelectorAll('.l-filter-pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filterType);
    });

    if (filterType === 'all') {
        appState.filteredQuestions = appState.allQuestions;
    } else {
        appState.filteredQuestions = appState.allQuestions.filter(q => detectQuestionType(q).id === filterType);
    }

    appState.currentIndex = 0;
    renderLearnWorkspace();
}

function renderLearnWorkspace() {
    renderLearnQuestionsList();
    renderLearnCurrentQuestionDetail();
    scrollToActiveLearnQuestion();
}

function scrollToActiveLearnQuestion() {
    setTimeout(() => {
        const activeItem = document.querySelector('.lql-item.active');
        if (activeItem) {
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, 40);
}

// Cột trái: Danh sách câu hỏi
function renderLearnQuestionsList() {
    const listEl = document.getElementById('learn-questions-list');
    if (!listEl) return;

    if (appState.filteredQuestions.length === 0) {
        listEl.innerHTML = `<p style="padding: 16px; color: #64748b; font-size: 13px; text-align: center;">Không có câu hỏi trong phân loại này.</p>`;
        return;
    }

    listEl.innerHTML = appState.filteredQuestions.map((q, idx) => {
        const qInfo = detectQuestionType(q);
        const isActive = idx === appState.currentIndex;
        const userAns = appState.userAnswers[q.id];
        const isAnswered = userAns !== undefined;

        let badgeClass = 'single';
        if (qInfo.id === 'multiple') badgeClass = 'multiple';
        if (qInfo.id === 'drag_drop') badgeClass = 'drag';
        if (qInfo.id === 'true_false') badgeClass = 'tf';
        if (qInfo.id === 'fill_blank') badgeClass = 'fill';

        return `
            <div class="lql-item ${isActive ? 'active' : ''}" onclick="goToLearnQuestion(${idx})">
                <div class="lql-left">
                    <span class="lql-num">${idx + 1}</span>
                    <span class="lql-badge ${badgeClass}">${qInfo.label}</span>
                </div>
                <div>
                    ${isAnswered 
                        ? `<i class="fa-solid fa-circle-check" style="color: #10b981; font-size: 12px;" title="Đã trả lời"></i>` 
                        : `<i class="fa-solid fa-chevron-right lql-chevron"></i>`}
                </div>
            </div>
        `;
    }).join('');
}

// Cột phải: Khung làm bài chi tiết với Giải thích & Màu Đúng/Sai
function renderLearnCurrentQuestionDetail() {
    const q = appState.filteredQuestions[appState.currentIndex];
    if (!q) return;

    const qInfo = detectQuestionType(q);
    const total = appState.filteredQuestions.length;
    const answeredCount = Object.keys(appState.userAnswers).length;
    const percent = Math.round((answeredCount / (appState.allQuestions.length || 1)) * 100);

    // Header counter & progress
    const counterEl = document.getElementById('learn-q-counter');
    const fillEl = document.getElementById('learn-progress-fill');
    if (counterEl) counterEl.textContent = `Câu ${appState.currentIndex + 1} / ${total}`;
    if (fillEl) fillEl.style.width = `${percent}%`;

    // Badge loại câu hỏi
    const badgeEl = document.getElementById('learn-q-badge-type');
    if (badgeEl) badgeEl.innerHTML = `<i class="fa-regular fa-circle-dot"></i> ${qInfo.fullLabel}`;

    // Tiêu đề câu hỏi
    const titleEl = document.getElementById('learn-question-title');
    if (titleEl) titleEl.textContent = cleanQuestionText(q.question);

    // Danh sách đáp án
    const optionsContainer = document.getElementById('learn-options-list');
    if (optionsContainer) {
        optionsContainer.innerHTML = renderLearnOptionsHtml(q, qInfo);
    }

    // Khối Giải Thích (luôn hiển thị trong mode=learn)
    const expBox = document.getElementById('learn-explanation-box');
    const expText = document.getElementById('learn-explanation-text');
    if (expBox && expText) {
        expBox.style.display = 'block';
        expText.textContent = getQuestionExplanation(q);
    }

    // Nút trước / sau
    const prevBtn = document.getElementById('btn-learn-prev');
    const nextBtn = document.getElementById('btn-learn-next');
    if (prevBtn) prevBtn.disabled = appState.currentIndex === 0;
    if (nextBtn) nextBtn.disabled = appState.currentIndex === total - 1;

    // Cập nhật Mobile Quick Navigation Strip (Hiển thị trên điện thoại)
    const stripEl = document.getElementById('learn-mobile-q-strip');
    const pillTextEl = document.getElementById('learn-mobile-q-pill-text');
    if (pillTextEl) {
        pillTextEl.textContent = `Câu ${appState.currentIndex + 1} / ${total}`;
    }
    if (stripEl) {
        stripEl.innerHTML = appState.filteredQuestions.map((item, i) => {
            const isActive = i === appState.currentIndex;
            const uAns = appState.userAnswers[item.id];
            let statusClass = '';
            if (uAns !== undefined) {
                const isCorr = isAnswerCorrectForQuestion(item, uAns);
                statusClass = isCorr ? 'answered-correct' : 'answered-wrong';
            }
            return `<button type="button" class="mq-pill ${isActive ? 'active' : ''} ${statusClass}" onclick="goToLearnQuestion(${i})">${i + 1}</button>`;
        }).join('');

        // Tự động cuộn số câu đang chọn vào giữa thanh trượt
        setTimeout(() => {
            const activePill = stripEl.querySelector('.mq-pill.active');
            if (activePill) {
                activePill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }, 50);
    }
}

function renderLearnOptionsHtml(q, qInfo) {
    const savedAnswer = appState.userAnswers[q.id];
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const correctAnswers = Array.isArray(q.correctAnswers) ? q.correctAnswers : [0];

    // Dạng kéo thả
    if (qInfo.id === 'drag_drop' && q.pairs) {
        const dropZones = [...new Set(q.pairs.map(p => p.dropZone))];
        const userMatches = savedAnswer || {};

        return `
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <p style="font-size: 13.5px; color: #64748b;">Chọn nhóm phù hợp cho từng mục bên dưới:</p>
                ${q.pairs.map((pair, pIdx) => {
                    const currentSelected = userMatches[pIdx] || '';
                    const isCorrect = currentSelected === pair.dropZone;
                    const isAnswered = currentSelected !== '';
                    return `
                        <div style="background: ${isAnswered ? (isCorrect ? '#ecfdf5' : '#fef2f2') : '#f8fafc'}; border: 1.5px solid ${isAnswered ? (isCorrect ? '#10b981' : '#ef4444') : '#e2e8f0'}; border-radius: 12px; padding: 14px 18px; display: flex; flex-direction: column; gap: 8px;">
                            <span style="font-size: 14px; font-weight: 600; color: #1e293b;">• ${pair.dragItem}</span>
                            <select style="width: 100%; padding: 10px 14px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 13.5px; outline: none; background: #ffffff; color: #1e293b;" onchange="handleSelectAnswer(${pIdx}, this.value, true)">
                                <option value="">-- Chọn nhóm tương ứng --</option>
                                ${dropZones.map(zone => `
                                    <option value="${zone}" ${currentSelected === zone ? 'selected' : ''}>${zone}</option>
                                `).join('')}
                            </select>
                            ${isAnswered ? `<span style="font-size: 12px; font-weight: 600; color: ${isCorrect ? '#059669' : '#dc2626'};">${isCorrect ? '✓ Đúng' : '✗ Đáp án đúng: ' + pair.dropZone}</span>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // Các dạng trắc nghiệm / Đúng Sai / Điền từ
    const options = (qInfo.id === 'true_false') ? ((q.options && q.options.length >= 2) ? q.options : ['Đúng', 'Sai']) : (q.options || []);

    return options.map((opt, oIdx) => {
        const isUserSelected = (savedAnswer !== undefined) && (
            Array.isArray(savedAnswer) ? savedAnswer.includes(oIdx) : savedAnswer === oIdx
        );
        const isActuallyCorrect = correctAnswers.includes(oIdx);

        let stateClass = '';
        if (savedAnswer !== undefined) {
            if (isUserSelected) {
                stateClass = isActuallyCorrect ? 'is-correct' : 'is-wrong';
            } else if (isActuallyCorrect) {
                // Làm nổi bật đáp án đúng khi người dùng chọn sai
                stateClass = 'is-revealed-correct';
            }
        }

        return `
            <div class="l-option-box ${stateClass}" onclick="handleSelectAnswer(${oIdx})">
                <div class="l-option-ring">
                    ${(stateClass === 'is-correct' || stateClass === 'is-revealed-correct') 
                        ? '<i class="fa-solid fa-check" style="font-size: 11px;"></i>' 
                        : (stateClass === 'is-wrong' 
                            ? '<i class="fa-solid fa-xmark" style="font-size: 12px;"></i>' 
                            : '')}
                </div>
                <span class="l-option-prefix">${letters[oIdx]}.</span>
                <span class="l-option-text">${cleanOptionText(opt)}</span>
            </div>
        `;
    }).join('');
}

function goToLearnQuestion(index) {
    if (index >= 0 && index < appState.filteredQuestions.length) {
        appState.currentIndex = index;
        if (appState.mode === 'learn') {
            saveCurrentLearnProgress();
        }
        renderLearnWorkspace();

        // Tự động cuộn lên đầu câu hỏi và đóng danh sách câu hỏi nếu đang mở trên mobile
        if (window.innerWidth <= 900) {
            const sheet = document.getElementById('learn-question-list-card');
            if (sheet) sheet.classList.remove('mobile-visible');
            const detailCard = document.querySelector('.learn-detail-card');
            if (detailCard) {
                detailCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }
}

function learnPrevQuestion() {
    if (appState.currentIndex > 0) {
        appState.currentIndex--;
        if (appState.mode === 'learn') {
            saveCurrentLearnProgress();
        }
        renderLearnWorkspace();
        if (window.innerWidth <= 900) {
            const detailCard = document.querySelector('.learn-detail-card');
            if (detailCard) detailCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

function learnNextQuestion() {
    if (appState.currentIndex < appState.filteredQuestions.length - 1) {
        appState.currentIndex++;
        if (appState.mode === 'learn') {
            saveCurrentLearnProgress();
        }
        renderLearnWorkspace();
        if (window.innerWidth <= 900) {
            const detailCard = document.querySelector('.learn-detail-card');
            if (detailCard) detailCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

// ==========================================================================
// CHẾ ĐỘ 2: KIỂM TRA (mode=test) - 1 CỘT TẬP TRUNG, KHÔNG GIẢI THÍCH, TÍNH ĐIỂM
// ==========================================================================
function initTestMode() {
    renderTestHeader();
    renderTestProgressSection();
    renderTestQuestionCard();
}

function renderTestHeader() {
    const meta = appState.topicMeta;
    if (!meta) return;

    const titleEl = document.getElementById('test-header-topic-title');
    if (titleEl) titleEl.innerHTML = meta.headerDisplay;
}

function renderTestProgressSection() {
    const total = appState.allQuestions.length;
    const currentNum = appState.currentIndex + 1;
    const answeredCount = Object.keys(appState.userAnswers).length;
    const percent = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

    const curNumEl = document.getElementById('test-current-q-num');
    const totNumEl = document.getElementById('test-total-q-num');
    const fillEl = document.getElementById('test-progress-bar-fill');
    const pctEl = document.getElementById('test-progress-percent');

    if (curNumEl) curNumEl.textContent = `Câu ${currentNum}`;
    if (totNumEl) totNumEl.textContent = `/ ${total}`;
    if (fillEl) fillEl.style.width = `${percent}%`;
    if (pctEl) pctEl.textContent = `${percent}%`;

    const stripEl = document.getElementById('test-question-number-strip');
    if (!stripEl) return;

    stripEl.innerHTML = appState.allQuestions.map((q, idx) => {
        const isCurrent = idx === appState.currentIndex;
        const isAnswered = appState.userAnswers[q.id] !== undefined;
        const isFlagged = !!appState.flaggedQuestions[q.id];

        let stateClass = 'unanswered';
        if (isAnswered) stateClass = 'answered';
        if (isCurrent) stateClass = 'active';
        if (isFlagged) stateClass += ' flagged';

        return `
            <div class="q-circle ${stateClass}" onclick="goToTestQuestion(${idx})" title="Câu ${idx + 1}">
                ${idx + 1}
            </div>
        `;
    }).join('');
}

function renderTestQuestionCard() {
    const q = appState.allQuestions[appState.currentIndex];
    if (!q) return;

    const qInfo = detectQuestionType(q);

    // Tags
    ['single', 'multiple', 'drag_drop', 'true_false', 'fill_blank'].forEach(t => {
        const el = document.getElementById(`test-tag-${t}`);
        if (el) el.classList.toggle('active', t === qInfo.id);
    });

    // Tiêu đề
    const titleEl = document.getElementById('test-question-title');
    if (titleEl) titleEl.textContent = cleanQuestionText(q.question);

    // Đáp án (CHỈ HIGHLIGHT XANH NHẠT KHI CHỌN - KHÔNG HIỆN ĐÚNG/SAI)
    const optionsContainer = document.getElementById('test-options-list');
    if (optionsContainer) {
        optionsContainer.innerHTML = renderTestOptionsHtml(q, qInfo);
    }

    // Các nút bottom
    const prevBtn = document.getElementById('btn-test-prev');
    const nextBtn = document.getElementById('btn-test-next');
    if (prevBtn) prevBtn.disabled = appState.currentIndex === 0;
    if (nextBtn) {
        const isLast = appState.currentIndex === appState.allQuestions.length - 1;
        nextBtn.innerHTML = isLast ? `<span>Nộp bài</span> <i class="fa-solid fa-check"></i>` : `<span>Câu tiếp theo</span> <i class="fa-solid fa-chevron-right"></i>`;
    }

    updateTestFlagIcon();
}

function renderTestOptionsHtml(q, qInfo) {
    const savedAnswer = appState.userAnswers[q.id];
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const correctAnswers = Array.isArray(q.correctAnswers) ? q.correctAnswers : [0];

    // Sau khi nộp bài và đang ở chế độ Xem lại đáp án (Review Mode)
    if (appState.isReviewMode) {
        const options = (qInfo.id === 'true_false') ? ((q.options && q.options.length >= 2) ? q.options : ['Đúng', 'Sai']) : (q.options || []);
        return options.map((opt, oIdx) => {
            const isUserSelected = (savedAnswer !== undefined) && (
                Array.isArray(savedAnswer) ? savedAnswer.includes(oIdx) : savedAnswer === oIdx
            );
            const isActuallyCorrect = correctAnswers.includes(oIdx);

            let styleClass = '';
            if (isUserSelected) {
                styleClass = isActuallyCorrect ? 'is-correct' : 'is-wrong';
            } else if (isActuallyCorrect) {
                styleClass = 'is-revealed-correct';
            }

            return `
                <div class="practice-option-item ${styleClass}" style="cursor: default;">
                    <div class="option-radio-ring">
                        ${isActuallyCorrect ? '<i class="fa-solid fa-check" style="font-size: 11px;"></i>' : (isUserSelected ? '<i class="fa-solid fa-xmark" style="font-size: 12px;"></i>' : '')}
                    </div>
                    <span class="option-prefix">${letters[oIdx]}.</span>
                    <span class="option-content">${cleanOptionText(opt)}</span>
                </div>
            `;
        }).join('') + `
            <div class="learn-explanation-box" style="margin-top: 14px; display: block;">
                <div class="explanation-header"><i class="fa-regular fa-lightbulb"></i> <span>Giải thích</span></div>
                <p class="explanation-body">${getQuestionExplanation(q)}</p>
            </div>
        `;
    }

    // Khi đang làm bài bình thường: CHỈ BÔI XANH NHẠT ĐÃ CHỌN
    const options = (qInfo.id === 'true_false') ? ((q.options && q.options.length >= 2) ? q.options : ['Đúng', 'Sai']) : (q.options || []);

    return options.map((opt, oIdx) => {
        const isSelected = (savedAnswer !== undefined) && (
            Array.isArray(savedAnswer) ? savedAnswer.includes(oIdx) : savedAnswer === oIdx
        );

        return `
            <div class="practice-option-item ${isSelected ? 'selected' : ''}" onclick="handleSelectAnswer(${oIdx})">
                <div class="option-radio-ring">
                    <div class="option-radio-dot"></div>
                </div>
                <span class="option-prefix">${letters[oIdx]}.</span>
                <span class="option-content">${cleanOptionText(opt)}</span>
            </div>
        `;
    }).join('');
}

function goToTestQuestion(index) {
    if (index >= 0 && index < appState.allQuestions.length) {
        appState.currentIndex = index;
        renderTestProgressSection();
        renderTestQuestionCard();
        if (window.innerWidth <= 900) {
            const card = document.getElementById('test-question-card');
            if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

function testPrevQuestion() {
    if (appState.currentIndex > 0) {
        appState.currentIndex--;
        renderTestProgressSection();
        renderTestQuestionCard();
        if (window.innerWidth <= 900) {
            const card = document.getElementById('test-question-card');
            if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

function testNextQuestion() {
    if (appState.currentIndex < appState.allQuestions.length - 1) {
        appState.currentIndex++;
        renderTestProgressSection();
        renderTestQuestionCard();
        if (window.innerWidth <= 900) {
            const card = document.getElementById('test-question-card');
            if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    } else {
        openTestSubmitModal();
    }
}

function testSaveAnswer() {
    const q = appState.allQuestions[appState.currentIndex];
    const isAnswered = q && appState.userAnswers[q.id] !== undefined;
    showToast(isAnswered ? `Đã lưu đáp án Câu ${appState.currentIndex + 1}` : `Chưa chọn đáp án Câu ${appState.currentIndex + 1}`);

    if (appState.currentIndex < appState.allQuestions.length - 1) {
        setTimeout(testNextQuestion, 250);
    }
}

function testToggleFlagCurrentQuestion() {
    const q = appState.allQuestions[appState.currentIndex];
    if (!q) return;

    appState.flaggedQuestions[q.id] = !appState.flaggedQuestions[q.id];
    updateTestFlagIcon();
    renderTestProgressSection();
    showToast(appState.flaggedQuestions[q.id] ? `Đã đánh dấu Câu ${appState.currentIndex + 1}` : `Bỏ đánh dấu Câu ${appState.currentIndex + 1}`);
}

function updateTestFlagIcon() {
    const q = appState.allQuestions[appState.currentIndex];
    const isFlagged = q && !!appState.flaggedQuestions[q.id];

    const box = document.getElementById('test-flag-icon-box');
    const icon = document.getElementById('test-flag-icon');

    if (box) box.style.background = isFlagged ? '#2563eb' : 'transparent';
    if (icon) {
        icon.className = isFlagged ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark';
        icon.style.color = isFlagged ? '#ffffff' : '#2563eb';
    }
}

// ==========================================================================
// XỬ LÝ CHỌN ĐÁP ÁN (RẼ NHÁNH GIỮA LEARN VÀ TEST)
// ==========================================================================
function handleSelectAnswer(optionIndex, customVal = null, isDrag = false) {
    // Không cho chọn lại nếu đang ở Review Mode
    if (appState.isReviewMode) return;

    const list = (appState.mode === 'learn') ? appState.filteredQuestions : appState.allQuestions;
    const q = list[appState.currentIndex];
    if (!q) return;

    const qInfo = detectQuestionType(q);

    if (isDrag) {
        let matches = appState.userAnswers[q.id] || {};
        if (customVal) matches[optionIndex] = customVal;
        else delete matches[optionIndex];
        appState.userAnswers[q.id] = matches;
    } else if (qInfo.id === 'multiple') {
        let cur = appState.userAnswers[q.id] || [];
        if (!Array.isArray(cur)) cur = [];
        if (cur.includes(optionIndex)) {
            cur = cur.filter(x => x !== optionIndex);
        } else {
            cur.push(optionIndex);
        }
        if (cur.length === 0) delete appState.userAnswers[q.id];
        else appState.userAnswers[q.id] = cur;
    } else {
        // Single choice / true_false / fill_blank
        appState.userAnswers[q.id] = optionIndex;
    }

    // Re-render UI theo mode
    if (appState.mode === 'learn') {
        saveCurrentLearnProgress();
        renderLearnWorkspace();

        // GAMIFICATION: Chế độ Ôn luyện (mode=learn): Mỗi khi tick chọn 1 đáp án -> +2 EXP
        const expResult = addExp(2);
        showFloatingExpBadge(2);

        if (expResult.leveledUp) {
            showLevelUpModal(expResult.newRank, expResult.oldRank);
        }
    } else {
        renderTestProgressSection();
        renderTestQuestionCard();
    }
}

// ==========================================================================
// CHẤM ĐIỂM & NỘP BÀI KIỂM TRA (mode=test)
// ==========================================================================
function openTestSubmitModal() {
    const total = appState.allQuestions.length;
    const answered = Object.keys(appState.userAnswers).length;
    const unanswered = total - answered;
    const flagged = Object.values(appState.flaggedQuestions).filter(Boolean).length;

    showModal({
        title: 'Xác nhận nộp bài kiểm tra',
        icon: 'fa-solid fa-paper-plane',
        content: `
            <div style="font-size: 14px; color: #334155; display: flex; flex-direction: column; gap: 12px;">
                <p>Bạn có chắc chắn muốn nộp bài để hoàn thành và tính điểm?</p>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; text-align: center;">
                    <div>
                        <div style="font-size: 11.5px; color: #64748b; font-weight: 600;">ĐÃ LÀM</div>
                        <div style="font-size: 22px; font-weight: 700; color: #10b981;">${answered}</div>
                    </div>
                    <div>
                        <div style="font-size: 11.5px; color: #64748b; font-weight: 600;">CHƯA LÀM</div>
                        <div style="font-size: 22px; font-weight: 700; color: #ef4444;">${unanswered}</div>
                    </div>
                    <div>
                        <div style="font-size: 11.5px; color: #64748b; font-weight: 600;">ĐÁNH DẤU</div>
                        <div style="font-size: 22px; font-weight: 700; color: #f59e0b;">${flagged}</div>
                    </div>
                </div>
            </div>
        `,
        actionText: 'Nộp bài ngay',
        actionCallback: () => {
            closeModal();
            submitTest();
        },
        showCancel: true
    });
}

function submitTest() {
    appState.isSubmitted = true;
    if (appState.timerInterval) clearInterval(appState.timerInterval);

    let correctCount = 0;
    const total = appState.allQuestions.length;

    appState.allQuestions.forEach(q => {
        const userAns = appState.userAnswers[q.id];
        if (userAns === undefined) return;

        if (q.type === 'drag_drop' && q.pairs) {
            let isAllCorrect = true;
            q.pairs.forEach((p, idx) => {
                if (userAns[idx] !== p.dropZone) isAllCorrect = false;
            });
            if (isAllCorrect) correctCount++;
        } else if (q.type === 'multiple') {
            if (Array.isArray(userAns) && Array.isArray(q.correctAnswers)) {
                const s1 = [...userAns].sort().join(',');
                const s2 = [...q.correctAnswers].sort().join(',');
                if (s1 === s2) correctCount++;
            }
        } else {
            const correctAns = Array.isArray(q.correctAnswers) ? q.correctAnswers[0] : 0;
            if (userAns === correctAns) correctCount++;
        }
    });

    const score = total > 0 ? ((correctCount / total) * 10).toFixed(1) : 0;
    const passed = score >= 5.0;
    const isPerfect = parseFloat(score) === 10.0;

    // === GAMIFICATION: TÍNH ĐIỂM EXP TRONG CHẾ ĐỘ KIỂM TRA ===
    // Mỗi câu đúng +10 EXP, sai không trừ, thưởng thêm +50 EXP nếu đạt điểm 10 tuyệt đối
    const earnedExp = (correctCount * 10) + (isPerfect ? 50 : 0);
    const expResult = addExp(earnedExp);

    // === ĐỘC LẬP DỮ LIỆU (DATA ISOLATION): LƯU KẾT QUẢ THI THEO USER HIỆN TẠI ===
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.username) {
        const historyKey = 'history_' + currentUser.username;
        let historyList = [];
        try {
            const rawHistory = localStorage.getItem(historyKey);
            historyList = rawHistory ? JSON.parse(rawHistory) : [];
            if (!Array.isArray(historyList)) historyList = [];
        } catch (e) {
            historyList = [];
        }

        const now = new Date();
        const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const totalDurationSec = (appState.topicId === 'mock' || appState.isMockExam) ? 60 * 60 : 30 * 60;
        const timeSpentSec = Math.max(0, totalDurationSec - appState.timerSeconds);
        const timeSpentStr = formatTimer(timeSpentSec);

        const topicName = appState.topicMeta ? (appState.topicMeta.name || appState.topicMeta.title) : 'Bài thi trắc nghiệm';

        const historyItem = {
            id: Date.now(),
            date: dateFormatted,
            topicId: appState.topicId,
            topicName: topicName,
            correctCount: correctCount,
            totalQuestions: total,
            score: parseFloat(score),
            timeSpent: timeSpentStr,
            passed: passed
        };

        historyList.unshift(historyItem);
        localStorage.setItem(historyKey, JSON.stringify(historyList));
    }

    // Hiển thị Popup kết quả
    showModal({
        title: 'Kết quả bài kiểm tra',
        icon: passed ? 'fa-solid fa-trophy' : 'fa-solid fa-award',
        content: `
            <div style="text-align: center; padding: 10px 0;">
                <div style="font-size: 46px; font-weight: 800; color: ${passed ? '#10b981' : '#ef4444'}; line-height: 1; margin-bottom: 8px;">
                    ${score} <span style="font-size: 20px; font-weight: 500; color: #64748b;">/ 10</span>
                </div>
                <h4 style="font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 6px;">
                    ${passed ? 'Xin chúc mừng! Bạn đã hoàn thành tốt bài kiểm tra.' : 'Hãy tiếp tục ôn luyện thêm để cải thiện kết quả.'}
                </h4>
                <p style="color: #64748b; font-size: 13.5px; margin-bottom: 12px;">
                    Số câu đúng: <strong>${correctCount}/${total}</strong> câu (${Math.round((correctCount / total) * 100)}%)
                </p>

                <!-- Thẻ Thưởng EXP Gamification -->
                <div class="test-exp-reward-card">
                    <div class="ter-icon"><i class="fa-solid fa-bolt"></i></div>
                    <div class="ter-info">
                        <div class="ter-title">Điểm kinh nghiệm nhận được: <strong>+${earnedExp} EXP</strong></div>
                        <div class="ter-desc">${correctCount} câu đúng (+${correctCount * 10} EXP)${isPerfect ? ' &bull; <strong>Thưởng điểm 10 tuyệt đối (+50 EXP)!</strong>' : ''}</div>
                    </div>
                </div>

                ${expResult.leveledUp ? `
                    <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border: 1.5px solid #f59e0b; border-radius: 10px; padding: 10px 14px; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 800; color: #92400e; font-size: 13.5px;">
                        <i class="fa-solid fa-sparkles" style="color: #d97706;"></i>
                        <span>BẠN ĐÃ ĐỘT PHÁ CẢNH GIỚI: ${expResult.newRank.name}!</span>
                    </div>
                ` : ''}

                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 18px; text-align: left; font-size: 13px; color: #475569; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <span>Nội dung:</span>
                        <strong>${appState.topicMeta ? appState.topicMeta.title : 'Kiểm tra'}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Thời gian còn lại:</span>
                        <strong>${formatTimer(appState.timerSeconds)}</strong>
                    </div>
                </div>
            </div>
        `,
        actionText: 'Xem lại đáp án',
        actionCallback: () => {
            closeModal();
            if (expResult.leveledUp) {
                showLevelUpModal(expResult.newRank, expResult.oldRank, () => {
                    appState.isReviewMode = true;
                    appState.currentIndex = 0;
                    renderTestProgressSection();
                    renderTestQuestionCard();
                    showToast('Chế độ xem lại đáp án: Đáp án đúng tô xanh, sai tô đỏ.');
                });
            } else {
                appState.isReviewMode = true;
                appState.currentIndex = 0;
                renderTestProgressSection();
                renderTestQuestionCard();
                showToast('Chế độ xem lại đáp án: Đáp án đúng tô xanh, sai tô đỏ.');
            }
        },
        showCancel: true,
        cancelText: 'Về trang chủ',
        cancelCallback: () => {
            closeModal();
            if (expResult.leveledUp) {
                showLevelUpModal(expResult.newRank, expResult.oldRank, () => {
                    window.location.href = 'index.html';
                });
            } else {
                window.location.href = 'index.html';
            }
        }
    });
}

// ==========================================================================
// ĐỒNG HỒ ĐẾM NGƯỢC
// ==========================================================================
function startCountdownTimer() {
    if (appState.timerInterval) clearInterval(appState.timerInterval);

    appState.timerInterval = setInterval(() => {
        if (appState.timerSeconds > 0) {
            appState.timerSeconds--;
            const timeStr = formatTimer(appState.timerSeconds);

            const testTimerEl = document.getElementById('test-timer-text');
            if (testTimerEl) testTimerEl.textContent = timeStr;

            const learnTimerEl = document.getElementById('learn-timer-text');
            if (learnTimerEl) learnTimerEl.textContent = timeStr;
        } else if (appState.mode === 'test' && !appState.isSubmitted) {
            clearInterval(appState.timerInterval);
            alert('Hết giờ làm bài! Hệ thống tự động nộp bài.');
            submitTest();
        }
    }, 1000);
}

function formatTimer(totalSec) {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const pad = n => String(n).padStart(2, '0');
    return `${pad(m)}:${pad(s)}`;
}

// ==========================================================================
// CÁC HÀM TIỆN ÍCH DÙNG CHUNG
// ==========================================================================
function confirmExit() {
    showModal({
        title: 'Xác nhận thoát bài',
        icon: 'fa-solid fa-arrow-right-from-bracket',
        content: `
            <p style="font-size: 14.5px; color: #1e293b; margin-bottom: 8px;">Bạn có chắc chắn muốn rời khỏi bài làm?</p>
            <p style="color: #64748b; font-size: 13px;">Tiến trình hiện tại sẽ không được lưu nếu chưa hoàn tất.</p>
        `,
        actionText: 'Rời khỏi',
        actionCallback: () => {
            if (appState.pendingLevelUp) {
                const rank = appState.pendingLevelUp;
                appState.pendingLevelUp = null;
                showLevelUpModal(rank, null, () => {
                    window.location.href = 'index.html';
                });
                return;
            }
            window.location.href = 'index.html';
        },
        showCancel: true
    });
}

function detectQuestionType(q) {
    if (q.type === 'drag_drop' || (q.pairs && q.pairs.length > 0)) {
        return { id: 'drag_drop', label: 'Kéo thả', fullLabel: 'Kéo thả (ghép cặp / sắp xếp)' };
    }
    if (q.type === 'true_false') {
        return { id: 'true_false', label: 'Đúng / Sai', fullLabel: 'Đúng / Sai' };
    }
    const qLower = (q.question || '').toLowerCase();
    if (qLower.includes('điền từ') || qLower.includes('chỗ trống') || qLower.includes('điền vào')) {
        return { id: 'fill_blank', label: 'Điền từ', fullLabel: 'Điền từ' };
    }
    if (q.type === 'multiple' || (Array.isArray(q.correctAnswers) && q.correctAnswers.length > 1)) {
        return { id: 'multiple', label: 'Trắc nghiệm nhiều đáp án', fullLabel: 'Trắc nghiệm nhiều đáp án đúng' };
    }
    return { id: 'single', label: 'Trắc nghiệm 1 đáp án đúng', fullLabel: 'Trắc nghiệm 1 đáp án đúng' };
}

function cleanQuestionText(text) {
    if (!text) return '';
    return text
        .replace(/\[cite:\s*\d+\]/gi, '')
        .replace(/^Câu\s+\d+(\.\d+)?\s*:\s*/i, '')
        .trim();
}

function cleanOptionText(text) {
    if (!text) return '';
    return text.replace(/^[A-D]\.\s*/, '').trim();
}

function getQuestionExplanation(q) {
    if (q.explanation) return q.explanation;
    const qLower = (q.question || '').toLowerCase();
    if (qLower.includes('đối tượng nghiên cứu của chủ nghĩa xã hội')) {
        return 'Đối tượng nghiên cứu của chủ nghĩa xã hội khoa học là các quy luật hình thành, phát triển của xã hội cộng sản chủ nghĩa và quá trình chuyển biến từ chủ nghĩa tư bản lên chủ nghĩa xã hội.';
    }
    if (q.type === 'drag_drop' && q.pairs) {
        return 'Ghép cặp chính xác: ' + q.pairs.map(p => `"${p.dragItem}" → [${p.dropZone}]`).join('; ') + '.';
    }
    if (q.type === 'true_false') {
        const correctIdx = Array.isArray(q.correctAnswers) ? q.correctAnswers[0] : 0;
        const ans = q.options && q.options[correctIdx] ? q.options[correctIdx] : (correctIdx === 0 ? 'Đúng' : 'Sai');
        return `Khẳng định trên là: ${ans}. Căn cứ vào các nguyên lý cơ bản của giáo trình Chủ nghĩa xã hội khoa học.`;
    }
    if (Array.isArray(q.correctAnswers) && q.options) {
        const correctTexts = q.correctAnswers.map(idx => cleanOptionText(q.options[idx] || '')).filter(Boolean);
        if (correctTexts.length > 0) {
            return `Đáp án đúng là: "${correctTexts.join('; ')}". Căn cứ theo giáo trình chuẩn của Bộ Giáo dục & Đào tạo.`;
        }
    }
    return 'Căn cứ vào giáo trình Chủ nghĩa xã hội khoa học (NXB Chính trị Quốc gia Sự thật).';
}

function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

        if (e.key === 'ArrowLeft') {
            if (appState.mode === 'learn') learnPrevQuestion();
            else testPrevQuestion();
        } else if (e.key === 'ArrowRight') {
            if (appState.mode === 'learn') learnNextQuestion();
            else testNextQuestion();
        }
    });
}

// Toast Popup
function showToast(message) {
    const toast = document.getElementById('toast-message');
    if (!toast) return;

    toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color: #38bdf8;"></i> <span>${message}</span>`;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 2200);
}

// ==========================================================================
// MODAL HỘP THOẠI TRÊN INDEX.HTML: CHỌN ÔN LUYỆN HOẶC KIỂM TRA
// ==========================================================================
function openModeSelectModal(topicId) {
    closeMobileSidebar();
    const meta = TOPICS_METADATA.find(t => t.id === topicId) || TOPICS_METADATA[0];
    const saved = loadProgress(topicId);
    const answeredCount = saved ? countAnsweredQuestions(saved.answeredQuestions) : 0;
    const hasProgress = saved && (answeredCount > 0 || (saved.currentIndex && saved.currentIndex > 0));

    let resumeHtml = '';
    let learnTitle = 'Vào Ôn luyện';
    let learnDesc = 'Xem giải thích chi tiết, biết ngay đúng/sai sau mỗi câu để nắm chắc lý luận.';

    if (hasProgress) {
        const curNum = (parseInt(saved.currentIndex, 10) || 0) + 1;
        learnTitle = `Tiếp tục Ôn luyện (Câu ${curNum})`;
        learnDesc = `Tiếp tục làm dở câu ${curNum} (đã trả lời ${answeredCount} câu). Toàn bộ lựa chọn đã được lưu.`;
        resumeHtml = `
            <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 10px; padding: 10px 14px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #1e40af;">
                    <i class="fa-solid fa-clock-rotate-left"></i>
                    <span>Tiến trình dở dang: <strong>Đang ở câu ${curNum}</strong> (đã trả lời ${answeredCount} câu)</span>
                </div>
                <button type="button" style="color: #dc2626; font-size: 12px; font-weight: 600; text-decoration: underline; background: none; border: none; cursor: pointer; white-space: nowrap;" onclick="resetTopicProgress(${topicId})">
                    Làm lại từ đầu
                </button>
            </div>
        `;
    }

    showModal({
        title: `Lựa chọn chế độ: ${meta.title}`,
        icon: meta.icon,
        content: `
            <div style="font-size: 14px; color: #475569;">
                <p style="font-weight: 600; color: #1e293b; margin-bottom: 6px;">${meta.shortTitle}</p>
                <p style="margin-bottom: 14px; font-size: 13px;">Vui lòng chọn hình thức học tập phù hợp với nhu cầu của bạn:</p>

                ${resumeHtml}

                <div class="mode-select-grid">
                    <!-- Nút 1: Vào Ôn luyện -->
                    <div class="mode-choice-card learn-choice" onclick="window.location.href='practice.html?topic=${topicId}&mode=learn'">
                        <div class="mcc-icon"><i class="fa-solid fa-book-open-reader"></i></div>
                        <div class="mcc-title">${learnTitle}</div>
                        <div class="mcc-desc">${learnDesc}</div>
                    </div>

                    <!-- Nút 2: Kiểm tra lấy điểm -->
                    <div class="mode-choice-card test-choice" onclick="window.location.href='practice.html?topic=${topicId}&mode=test'">
                        <div class="mcc-icon"><i class="fa-solid fa-stopwatch-20"></i></div>
                        <div class="mcc-title">Kiểm tra lấy điểm</div>
                        <div class="mcc-desc">Thi thử tập trung bấm giờ 30 phút, nộp bài tính điểm thang 10 chuẩn xác.</div>
                    </div>
                </div>
            </div>
        `,
        actionText: 'Đóng',
        actionCallback: () => closeModal()
    });
}

function resetTopicProgress(topicId) {
    if (confirm('Bạn có chắc chắn muốn xóa tiến trình ôn luyện cũ để làm lại từ đầu từ Câu 1?')) {
        clearProgress(topicId);
        closeModal();
        syncDashboardProgress();
        showToast('Đã đặt lại tiến trình về Câu 1!');
    }
}

function openUtilityModal(type) {
    closeMobileSidebar();
    if (type === 'notifications') {
        showModal({
            title: 'Thông báo hệ thống',
            icon: 'fa-solid fa-bell',
            content: `<p style="font-size: 13.5px; color: #475569;">Hệ thống đã nâng cấp phân tách rõ rệt 2 chế độ: <strong>Ôn luyện</strong> (học kèm giải thích) và <strong>Kiểm tra</strong> (tập trung tính điểm)!</p>`
        });
        return;
    }
    const tabMap = {
        'stats': 'stats',
        'history': 'history',
        'guide': 'guide',
        'contact': 'feedback',
        'feedback': 'feedback'
    };
    const tab = tabMap[type] || 'stats';
    window.location.href = `utilities.html?tab=${tab}`;
}

// Modal Cửa sổ
function showModal({ title, icon, content, actionText = 'Đóng', actionCallback = null, showCancel = false, cancelText = 'Hủy', cancelCallback = null }) {
    const modalBackdrop = document.getElementById('modal-container');
    const modalCard = document.getElementById('modal-card');
    if (!modalBackdrop || !modalCard) return;

    modalCard.innerHTML = `
        <div class="modal-header">
            <h3 class="modal-title">
                ${icon ? `<i class="${icon}" style="color: #2563eb;"></i>` : ''}
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
            ${showCancel ? `<button class="btn-modal-cancel" id="modal-cancel-btn">${cancelText}</button>` : ''}
            <button class="btn-modal-action" id="modal-primary-btn">${actionText}</button>
        </div>
    `;

    document.getElementById('modal-primary-btn').onclick = () => {
        if (actionCallback) actionCallback();
        else closeModal();
    };

    if (showCancel) {
        document.getElementById('modal-cancel-btn').onclick = () => {
            if (cancelCallback) cancelCallback();
            else closeModal();
        };
    }

    modalBackdrop.classList.remove('hidden');
}

function closeModal() {
    const modalBackdrop = document.getElementById('modal-container');
    if (modalBackdrop) modalBackdrop.classList.add('hidden');

    if (appState.pendingLevelUp) {
        const rank = appState.pendingLevelUp;
        appState.pendingLevelUp = null;
        showLevelUpModal(rank);
    }
}

function closeModalOnBackdrop(e) {
    if (e.target.id === 'modal-container') {
        closeModal();
    }
}

// ==========================================================================
// ĐIỀU HƯỚNG VÀ THAO TÁC TRÊN GIAO DIỆN ĐIỆN THOẠI (MOBILE NAVIGATION)
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

function toggleMobileQuestionSheet() {
    const sheet = document.getElementById('learn-question-list-card');
    if (!sheet) return;
    const isVisible = sheet.classList.toggle('mobile-visible');
    if (isVisible) {
        sheet.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function isAnswerCorrectForQuestion(q, userAns) {
    if (userAns === undefined || userAns === null) return false;
    const qInfo = detectQuestionType(q);
    if (qInfo.id === 'drag_drop' && q.pairs) {
        let isAll = true;
        q.pairs.forEach((p, idx) => {
            if (userAns[idx] !== p.dropZone) isAll = false;
        });
        return isAll;
    }
    if (qInfo.id === 'multiple') {
        if (!Array.isArray(userAns) || !Array.isArray(q.correctAnswers)) return false;
        const s1 = [...userAns].sort().join(',');
        const s2 = [...q.correctAnswers].sort().join(',');
        return s1 === s2;
    }
    const correctAns = Array.isArray(q.correctAnswers) ? q.correctAnswers[0] : 0;
    return userAns === correctAns;
}