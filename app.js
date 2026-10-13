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
    questionResults: {},      // Quản lý trạng thái Đúng/Sai: { [qId]: { isCorrect: boolean } }
    flaggedQuestions: {},     // Đánh dấu câu hỏi: { [qId]: boolean }
    timerSeconds: 30 * 60,    // Đếm ngược (30 phút hoặc 60 phút)
    timerInterval: null,
    isSubmitted: false,
    isReviewMode: false,      // Trong mode=test: sau khi nộp bài bật xem lại đáp án
    pendingLevelUp: null      // Lưu thông tin cấp độ mới nếu thăng cấp để hiển thị popup
};

// ==========================================================================
// 1. QUẢN LÝ TIẾN TRÌNH VỚI FIREBASE & LOCAL CACHE (CHẾ ĐỘ ÔN LUYỆN)
// Cấu trúc định danh: Sử dụng userId (UID cố định) làm key gốc
// ==========================================================================
/**
 * Trả về UID của người dùng hiện tại (hoặc u_username nếu phiên cũ)
 */
function getCurrentUserUID() {
    const user = getCurrentUser();
    if (!user) return 'guest';
    return user.userId || ('u_' + (user.username || 'guest').toLowerCase());
}

/**
 * Trả về Storage Key độc lập 1-1 cho tiến trình của từng tài khoản theo UID:
 * progress_{userId}_topic_{topicId}
 */
function getProgressStorageKey(topicId) {
    const uid = getCurrentUserUID();
    return `progress_${uid}_topic_${topicId}`;
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
 * Lưu tiến trình ôn luyện vào Firebase Realtime Database & Local Cache
 * @param {number|string} topicId - ID của chủ đề (1..6)
 * @param {Object} data - Dữ liệu gồm { currentIndex, answeredQuestions }
 */
function saveProgress(topicId, data) {
    if (!topicId || topicId === 'mock') return;
    const uid = getCurrentUserUID();
    const payload = {
        topicId: topicId,
        currentIndex: (typeof data.currentIndex === 'number') ? data.currentIndex : (parseInt(data.currentIndex, 10) || 0),
        answeredQuestions: data.answeredQuestions || data.userAnswers || {},
        questionResults: data.questionResults || (appState ? appState.questionResults : {}) || {},
        updatedAt: Date.now()
    };

    // 1. Lưu vào Local Cache
    try {
        localStorage.setItem(getProgressStorageKey(topicId), JSON.stringify(payload));
    } catch (e) {
        console.warn('Lỗi khi lưu tiến trình vào localStorage:', e);
    }

    // 2. Ghi trực tiếp lên Firebase Realtime Database
    if (uid !== 'guest') {
        if (window.FirebaseService) {
            FirebaseService.saveProgress(uid, topicId, payload);
            FirebaseService.updateUserStatus(uid, 'online');
        } else if (window.ref && window.set && window.db) {
            try {
                set(ref(db, `users/${uid}/progress/${topicId}`), payload);
            } catch (err) {}
        }
    }
}

/**
 * Đọc tiến trình ôn luyện từ Local Cache / Firebase
 * @param {number|string} topicId - ID của chủ đề (1..6)
 * @returns {Object|null} { topicId, currentIndex, answeredQuestions, updatedAt }
 */
function loadProgress(topicId) {
    if (!topicId || topicId === 'mock') return null;
    const user = getCurrentUser();
    const uid = getCurrentUserUID();

    try {
        // 1. Đọc từ cache theo UID
        let raw = localStorage.getItem(getProgressStorageKey(topicId));
        // Fallback: nếu chưa có theo UID, thử đọc theo username phiên bản cũ
        if (!raw && user && user.username) {
            raw = localStorage.getItem(`progress_${user.username}_topic_${topicId}`);
            if (raw) {
                localStorage.setItem(getProgressStorageKey(topicId), raw);
            }
        }

        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                return parsed;
            }
        }
    } catch (e) {
        console.warn('Lỗi khi đọc tiến trình từ cache:', e);
    }
    return null;
}

/**
 * Xóa tiến trình ôn luyện của một chủ đề
 */
function clearProgress(topicId) {
    if (!topicId || topicId === 'mock') return;
    const uid = getCurrentUserUID();
    try {
        localStorage.removeItem(getProgressStorageKey(topicId));
    } catch (e) {
        console.warn('Lỗi khi xóa tiến trình:', e);
    }
    if (uid !== 'guest' && window.ref && window.remove && window.db) {
        try {
            remove(ref(db, `users/${uid}/progress/${topicId}`));
        } catch (err) {}
    }
}

/**
 * Trả về Storage Key cho TIẾN ĐỘ CAO NHẤT (Max Progress) theo UID:
 * max_progress_topic{topicId}_{userId}
 */
function getMaxProgressStorageKey(topicId) {
    const uid = getCurrentUserUID();
    return `max_progress_topic${topicId}_${uid}`;
}

/**
 * Đọc TIẾN ĐỘ CAO NHẤT (Max Progress) từ Cache / Firebase
 */
function getMaxProgress(topicId) {
    if (!topicId || topicId === 'mock') return 0;
    const user = getCurrentUser();
    if (!user) return 0;

    try {
        const key = getMaxProgressStorageKey(topicId);
        let val = localStorage.getItem(key);
        // Fallback kiểm tra key theo username cũ
        if (val === null && user.username) {
            val = localStorage.getItem(`max_progress_topic${topicId}_${user.username}`) ||
                  localStorage.getItem(`max_progress_topic_${topicId}_${user.username}`);
            if (val !== null) {
                localStorage.setItem(key, val);
            }
        }
        if (val !== null && val !== undefined) {
            return Math.min(100, Math.max(0, parseInt(val, 10) || 0));
        }
        return 0;
    } catch (e) {
        return 0;
    }
}

/**
 * Cập nhật TIẾN ĐỘ CAO NHẤT (Max Progress) vào Firebase & Cache nếu % hiện tại lớn hơn max đã lưu
 */
function saveMaxProgress(topicId, percent) {
    if (!topicId || topicId === 'mock') return 0;
    const user = getCurrentUser();
    if (!user) return 0;
    const uid = getCurrentUserUID();

    try {
        const currentMax = getMaxProgress(topicId);
        const newPercent = Math.min(100, Math.max(0, Math.round(percent) || 0));
        if (newPercent > currentMax || localStorage.getItem(getMaxProgressStorageKey(topicId)) === null) {
            const key = getMaxProgressStorageKey(topicId);
            localStorage.setItem(key, newPercent.toString());

            // Ghi lên Firebase Realtime Database
            if (uid !== 'guest') {
                if (window.FirebaseService) {
                    FirebaseService.saveMaxProgress(uid, topicId, newPercent);
                } else if (window.ref && window.set && window.db) {
                    set(ref(db, `users/${uid}/maxProgress/${topicId}`), newPercent);
                }
            }
            return Math.max(currentMax, newPercent);
        }
        return currentMax;
    } catch (e) {
        console.warn('Lỗi khi lưu max progress:', e);
        return 0;
    }
}

/**
 * Lấy danh sách index các đáp án đúng của câu hỏi (hỗ trợ cả correctAnswers và correct)
 */
function getQuestionCorrectAnswers(q) {
    if (!q) return [0];
    if (Array.isArray(q.correctAnswers)) return q.correctAnswers;
    if (Array.isArray(q.correct)) return q.correct;
    if (typeof q.correctAnswers === 'number') return [q.correctAnswers];
    if (typeof q.correct === 'number') return [q.correct];
    return [0];
}

/**
 * Kiểm tra xem câu hỏi đã được trả lời / chấm điểm hoàn tất hay chưa
 */
function isQuestionGraded(q, userAns) {
    if (userAns === undefined || userAns === null) return false;
    const correctList = getQuestionCorrectAnswers(q);
    const qInfo = detectQuestionType(q);
    if (q.type === 'grouped_true_false' || (q.subQuestions && q.subQuestions.length > 0)) {
        if (typeof userAns !== 'object' || Array.isArray(userAns)) return false;
        return Object.keys(userAns).length >= q.subQuestions.length;
    }
    if (qInfo.id === 'multiple' || correctList.length > 1) {
        return Array.isArray(userAns) && userAns.length >= correctList.length;
    }
    if (qInfo.id === 'drag_drop' && q.pairs) {
        if (typeof userAns !== 'object' || Array.isArray(userAns)) return false;
        return Object.keys(userAns).length === q.pairs.length;
    }
    return true;
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
        answeredQuestions: appState.userAnswers,
        questionResults: appState.questionResults
    });

    // Tính % hiện tại và cập nhật Max Progress nếu lớn hơn
    if (Array.isArray(appState.allQuestions) && appState.allQuestions.length > 0) {
        let gradedCount = 0;
        appState.allQuestions.forEach(item => {
            if (isQuestionGraded(item, appState.userAnswers[item.id])) {
                gradedCount++;
            }
        });
        const currentPercent = Math.min(100, Math.round((gradedCount / appState.allQuestions.length) * 100));
        saveMaxProgress(appState.topicId, currentPercent);
    }
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
 * Quản lý điểm kinh nghiệm (EXP) và Cấp độ gắn với UID người dùng
 */
function getUserStats() {
    const user = getCurrentUser();
    if (!user) {
        return { exp: 0, level: 1, rankId: 'gamo' };
    }
    const uid = getCurrentUserUID();
    try {
        // 1. Kiểm tra theo UID
        let savedExp = localStorage.getItem('exp_' + uid);
        let exp;
        if (savedExp !== null && savedExp !== undefined) {
            exp = Math.max(0, parseInt(savedExp, 10) || 0);
        } else {
            // Fallback sang username cũ hoặc userStats
            if (user.username) {
                savedExp = localStorage.getItem('exp_' + user.username);
                if (savedExp !== null && savedExp !== undefined) {
                    exp = Math.max(0, parseInt(savedExp, 10) || 0);
                } else {
                    const raw = localStorage.getItem('userStats_' + user.username);
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
 * Khởi tạo/Đồng bộ EXP khi load trang từ Firebase & Cache
 */
function initExp() {
    const user = getCurrentUser();
    if (!user) return;
    const uid = getCurrentUserUID();

    let stats = getUserStats();
    let exp = stats.exp;

    localStorage.setItem('exp_' + uid, exp.toString());
    if (user.username) {
        localStorage.setItem('exp_' + user.username, exp.toString());
    }
    const rank = getRankByExp(exp);
    saveUserStats({ exp: exp, level: rank.level, rankId: rank.id });

    // Đồng bộ tức thời từ Firebase Realtime Database
    if (uid !== 'guest' && window.FirebaseService) {
        FirebaseService.getExp(uid).then(fbExp => {
            if (fbExp > 0 && fbExp !== exp) {
                localStorage.setItem('exp_' + uid, fbExp.toString());
                const updatedRank = getRankByExp(fbExp);
                saveUserStats({ exp: fbExp, level: updatedRank.level, rankId: updatedRank.id });
                updateHeaderRankDisplay();
            }
        }).catch(() => {});
    }
}

/**
 * Lưu thông tin cấp độ và EXP vào Firebase & LocalStorage
 */
function saveUserStats(stats) {
    const user = getCurrentUser();
    if (!user) return;
    const uid = getCurrentUserUID();

    try {
        localStorage.setItem('userStats_' + uid, JSON.stringify(stats));
        if (typeof stats.exp !== 'undefined' && stats.exp !== null) {
            localStorage.setItem('exp_' + uid, stats.exp.toString());
            if (user.username) {
                localStorage.setItem('exp_' + user.username, stats.exp.toString());
            }

            // Ghi trực tiếp lên Firebase Realtime Database
            if (uid !== 'guest') {
                if (window.FirebaseService) {
                    FirebaseService.saveExp(uid, stats.exp);
                } else if (window.ref && window.set && window.db) {
                    set(ref(db, `users/${uid}/exp`), stats.exp);
                }
            }
        }
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
    if (!user) {
        return { gained: 0, leveledUp: false };
    }
    const uid = getCurrentUserUID();

    const stats = getUserStats();
    const oldExp = stats.exp;
    const oldRank = getRankByExp(oldExp);

    const newExp = oldExp + points;
    const newRank = getRankByExp(newExp);

    stats.exp = newExp;
    stats.level = newRank.level;
    stats.rankId = newRank.id;

    // Lưu điểm EXP theo UID và đồng bộ Firebase
    localStorage.setItem('exp_' + uid, newExp.toString());
    if (user.username) {
        localStorage.setItem('exp_' + user.username, newExp.toString());
    }
    saveUserStats(stats);

    // Cập nhật ngay huy hiệu trên Header
    updateHeaderRankDisplay();

    const leveledUp = newRank.level > oldRank.level;

    if (leveledUp) {
        appState.pendingLevelUp = newRank;

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

function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
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
// KIỂM SOÁT PHIÊN ĐĂNG NHẬP & BẢO VỆ SINGLE SESSION TOÀN CỤC (GLOBAL SCOPE)
// ==========================================================================
let isSessionTerminated = false;
let isRealtimeWatcherAttached = false;

/**
 * BƯỚC 2: Listener bảo vệ Single Session toàn cục (Global Scope)
 * Khi trang load, nếu có currentUser, lập tức kiểm tra sessionToken trên Firebase.
 * Nếu Token trên Firebase KHÁC Token dưới localStorage (hoặc Firebase trả về null do tài khoản bị xóa),
 * BẮT BUỘC thực thi:
 *   localStorage.removeItem('currentUser');
 *   localStorage.removeItem('sessionToken');
 *   alert("Phiên đăng nhập đã hết hạn hoặc tài khoản đang được sử dụng ở thiết bị khác. Vui lòng đăng nhập lại!");
 *   window.location.replace('login.html');
 */
function setupUserRealtimeWatcher(userId) {
    if (isRealtimeWatcherAttached || isSessionTerminated) return;

    if (!userId) {
        const userStr = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
        if (!userStr) return;
        try {
            const parsed = JSON.parse(userStr);
            userId = parsed ? (parsed.userId || ('u_' + (parsed.username || '').toLowerCase())) : null;
        } catch (e) {
            return;
        }
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
                // Chỉ thực hiện lệnh KICK (đăng xuất) khi thỏa mãn đủ 2 điều kiện: Có tồn tại dbToken trên mạng VÀ dbToken đó KHÁC với localToken ở máy.
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

                // Đồng bộ tức thời tên đăng nhập mới nếu Admin vừa thực hiện đổi tên
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
                        if (typeof updateHeaderUserPill === 'function') {
                            updateHeaderUserPill(curr);
                        }
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

/**
 * Kiểm tra xác thực người dùng trên Firebase Realtime Database (Auth Guard & Auto-clear Session)
 */
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

    const userId = user.userId || ('u_' + (user.username || '').toLowerCase());

    // Kiểm tra trực tiếp trên Firebase Realtime Database
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

            // Fallback qua FirebaseService nếu get() theo userId không tìm thấy
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

            // Code phòng thủ: Chỉ kick khi có dbToken trên mạng VÀ dbToken khác localToken ở máy
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

            // Tài khoản hợp lệ -> Cập nhật cấu trúc user mới nếu session cũ chưa có userId
            if (userData) {
                if (!user.userId && userData.userId) {
                    user.userId = userData.userId;
                }
                if (userData.username && user.username !== userData.username) {
                    user.username = userData.username;
                }
                if (localStorage.getItem('currentUser')) {
                    localStorage.setItem('currentUser', JSON.stringify(user));
                } else if (sessionStorage.getItem('currentUser')) {
                    sessionStorage.setItem('currentUser', JSON.stringify(user));
                }
                if (typeof updateHeaderUserPill === 'function') {
                    updateHeaderUserPill(user);
                }
            }

            // Thiết lập Realtime Watcher để theo dõi liên tục bằng onValue()
            setupUserRealtimeWatcher(user.userId || userId);

            return true;
        } catch (err) {
            console.warn('[checkAuthentication] Lỗi khi kết nối Firebase:', err);
            return true;
        }
    }

    return verifySession();
}

/**
 * Kiểm tra tính hợp lệ của phiên đăng nhập (Dành cho Fallback Offline & Heartbeat)
 */
function verifySession() {
    if (isSessionTerminated) return false;

    const user = getCurrentUser();
    if (!user) {
        return false;
    }

    // Nếu đang kết nối Firebase, việc kiểm tra user tồn tại do checkAuthentication & Realtime Watcher phụ trách
    if (window.FirebaseService || (window.ref && window.db)) {
        return true;
    }

    // Fallback Offline: Đọc danh sách tài khoản từ localStorage
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

/**
 * Cưỡng chế đăng xuất khi bị đè phiên hoặc tài khoản bị vô hiệu hóa
 */
function forceLogoutSession(message) {
    isSessionTerminated = true;

    // 1. TRƯỚC KHI alert: BẮT BUỘC xóa sạch phiên đăng nhập hiện tại
    localStorage.removeItem('currentUser');
    localStorage.removeItem('sessionToken');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('sessionToken');
    sessionStorage.clear();

    try {
        resetAppState();
        resetAllProgressUI();
    } catch (e) {}

    // Thông báo cho người dùng
    if (message) {
        alert(message);
    }

    // 2. Điều hướng an toàn bằng replace đẩy hẳn ra login.html
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
    appState.questionResults = {};
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
 * 1. Chuyển status = 'offline' trên Firebase
 * 2. Xóa currentUser
 * 3. Reset appState
 * 4. Reset giao diện về 0%
 * 5. window.location.replace('login.html')
 */
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
document.addEventListener('DOMContentLoaded', async () => {
    initUserStorage();
    initExp();
    cleanupLegacySharedProgress();

    // 1. Kiểm tra xác thực phiên đăng nhập qua Firebase (Auth Guard & Auto-clear Session)
    const isAuthValid = await checkAuthentication();
    if (!isAuthValid) {
        return;
    }

    // Thiết lập Presence Tracking cho người dùng trên Firebase
    const user = getCurrentUser();
    if (user && user.userId && window.FirebaseService) {
        FirebaseService.setupPresence(user.userId);
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
 * Thuật toán gom nhóm dữ liệu câu hỏi Đúng / Sai (Data Pre-processing):
 * Tự động gom các ý nhỏ rời rạc (Ví dụ: "Câu 33.1", "Câu 33.2", "Câu 33.3", "Câu 33.4")
 * thành 1 câu hỏi duy nhất có type: "grouped_true_false" chứa mảng subQuestions.
 * Đảm bảo bộ đếm tổng số câu hiển thị đúng chuẩn và giao diện hiển thị trọn vẹn cả 4 ý trên 1 trang.
 */
function groupQuestions(rawQuestions) {
    if (!Array.isArray(rawQuestions)) return [];

    const result = [];
    const groupedMap = new Map();

    for (const q of rawQuestions) {
        if (q.type === 'true_false' || /Câu\s*\d+[a-z]?\s*\.\s*\d+/i.test(q.question || '')) {
            const match = (q.question || '').match(/Câu\s*(\d+[a-z]?)/i);
            if (match) {
                const prefixNum = match[1];
                const groupKey = 'gtf_' + prefixNum.toLowerCase();

                if (!groupedMap.has(groupKey)) {
                    const groupedQ = {
                        id: groupKey,
                        type: 'grouped_true_false',
                        groupPrefix: `Câu ${prefixNum}`,
                        question: `Câu ${prefixNum}: Xác định tính Đúng hoặc Sai cho mỗi nhận định sau:`,
                        subQuestions: []
                    };
                    groupedMap.set(groupKey, groupedQ);
                    result.push(groupedQ);
                }

                const groupObj = groupedMap.get(groupKey);
                const subCleanText = (q.question || '')
                    .replace(/\[cite:\s*\d+\]/gi, '')
                    .replace(/^Câu\s*\d+[a-z]?\s*\.\s*\d+\s*:\s*/i, '')
                    .trim();

                groupObj.subQuestions.push({
                    ...q,
                    cleanText: subCleanText,
                    correctAnswer: Array.isArray(q.correctAnswers) ? q.correctAnswers[0] : (q.correctAnswer ?? 0)
                });
                continue;
            }
        }
        result.push(q);
    }

    return result;
}

/**
 * Đồng bộ dữ liệu ra Dashboard:
 * - Dùng fetch() đọc qua 6 file JSON trong thư mục data/ (từ chude1 đến chude6)
 * - Gom nhóm câu hỏi Đúng/Sai qua groupQuestions() để lấy tổng số câu chuẩn xác
 * - Cập nhật số lượng câu thực tế và tiến độ Max Progress
 */
async function syncDashboardProgress() {
    const topicIds = [1, 2, 3, 4, 5, 6];

    // Dùng fetch() đọc 6 file song song
    const fetchPromises = topicIds.map(async (id) => {
        try {
            const res = await fetch(`./data/chude${id}.json`);
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();
            const grouped = groupQuestions(data);
            return { id, total: grouped.length };
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

        // LUÔN đọc từ TIẾN ĐỘ CAO NHẤT (Max Progress): max_progress_topicX_${currentUser.username}
        let percent = getMaxProgress(id);

        // Fallback: nếu chưa có max_progress nhưng có resume progress cũ thì cập nhật sang max_progress
        const progress = loadProgress(id);
        const answeredCount = progress ? countAnsweredQuestions(progress.answeredQuestions) : 0;
        const resumePercent = total > 0 ? Math.min(100, Math.round((answeredCount / total) * 100)) : 0;
        if (resumePercent > percent) {
            percent = resumePercent;
            saveMaxProgress(id, percent);
        }

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
        const grouped = groupQuestions(data);

        appState.allQuestions = grouped;
        appState.filteredQuestions = grouped;
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
                appState.questionResults = saved.questionResults || {};

                // Migration: chuyển các câu trả lời phân mảnh cũ (331, 332...) sang câu grouped_true_false
                appState.allQuestions.forEach(item => {
                    if ((item.type === 'grouped_true_false' || item.subQuestions) && !appState.userAnswers[item.id]) {
                        let migrated = null;
                        item.subQuestions.forEach((sq, idx) => {
                            if (appState.userAnswers[sq.id] !== undefined) {
                                if (!migrated) migrated = {};
                                migrated[idx] = appState.userAnswers[sq.id];
                            }
                        });
                        if (migrated) {
                            appState.userAnswers[item.id] = migrated;
                        }
                    }
                });

                // Đồng bộ lại questionResults cho mọi câu đã hoàn tất
                appState.allQuestions.forEach(item => {
                    const uAns = appState.userAnswers[item.id];
                    if (isQuestionGraded(item, uAns)) {
                        if (!appState.questionResults) appState.questionResults = {};
                        appState.questionResults[item.id] = {
                            isCorrect: isAnswerCorrectForQuestion(item, uAns)
                        };
                    }
                });

                // Tự động nhảy đến đúng câu hỏi (currentIndex) đang làm dở lần trước
                let savedIndex = parseInt(saved.currentIndex, 10);
                if (!isNaN(savedIndex) && savedIndex >= 0 && savedIndex < grouped.length) {
                    appState.currentIndex = savedIndex;
                } else {
                    appState.currentIndex = 0;
                }
            } else {
                appState.currentIndex = 0;
                appState.userAnswers = {};
                appState.questionResults = {};
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
            appState.questionResults = {};
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
                allQuestions = allQuestions.concat(groupQuestions(data));
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
    appState.questionResults = {};
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

/**
 * Lấy hoặc tính toán trạng thái Đúng/Sai của câu hỏi trong chế độ Ôn luyện
 * @param {Object} q Câu hỏi
 * @param {*} [overrideAns] Đáp án tùy chọn nếu vừa được cập nhật
 * @returns {{ isAnswered: boolean, isCorrect: boolean }}
 */
function getQuestionCorrectness(q, overrideAns) {
    if (!q) return { isAnswered: false, isCorrect: false };
    const uAns = (overrideAns !== undefined) ? overrideAns : (appState.userAnswers ? appState.userAnswers[q.id] : undefined);
    const isAnswered = isQuestionGraded(q, uAns);
    if (!isAnswered) {
        if (appState.questionResults) delete appState.questionResults[q.id];
        return { isAnswered: false, isCorrect: false };
    }
    if (appState.questionResults && appState.questionResults[q.id] !== undefined && overrideAns === undefined) {
        return { isAnswered: true, isCorrect: appState.questionResults[q.id].isCorrect === true };
    }
    const isCorr = isAnswerCorrectForQuestion(q, uAns);
    if (!appState.questionResults) appState.questionResults = {};
    appState.questionResults[q.id] = { isCorrect: isCorr };
    return { isAnswered: true, isCorrect: isCorr };
}

/**
 * Đồng bộ ngay lập tức icon trạng thái của câu hỏi trên Sidebar (Danh sách câu hỏi) mà không cần reload trang
 * @param {number|string} qId ID của câu hỏi
 */
function updateLearnSidebarQuestionStatus(qId) {
    if (!qId) return;
    const q = (appState.allQuestions || []).find(item => String(item.id) === String(qId));
    if (!q) return;
    const qStatus = getQuestionCorrectness(q);
    const statusBox = document.getElementById(`lql-status-${q.id}`);
    const itemEl = document.querySelector(`.lql-item[data-qid="${q.id}"]`);

    if (statusBox) {
        if (!qStatus.isAnswered) {
            statusBox.innerHTML = `<i class="fa-solid fa-chevron-right lql-chevron"></i>`;
            if (itemEl) itemEl.classList.remove('answered-correct', 'answered-wrong');
        } else if (qStatus.isCorrect === true) {
            statusBox.innerHTML = `<i class="fas fa-check-circle text-green-500" style="color: #10b981; font-size: 13px;" title="Đúng"></i>`;
            if (itemEl) {
                itemEl.classList.add('answered-correct');
                itemEl.classList.remove('answered-wrong');
            }
        } else {
            statusBox.innerHTML = `<i class="fas fa-times-circle text-red-500" style="color: #ef4444; font-size: 13px;" title="Sai"></i>`;
            if (itemEl) {
                itemEl.classList.add('answered-wrong');
                itemEl.classList.remove('answered-correct');
            }
        }
    }
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
        const qStatus = getQuestionCorrectness(q);

        let badgeClass = 'single';
        if (qInfo.id === 'multiple') badgeClass = 'multiple';
        if (qInfo.id === 'drag_drop') badgeClass = 'drag';
        if (qInfo.id === 'true_false') badgeClass = 'tf';
        if (qInfo.id === 'fill_blank') badgeClass = 'fill';

        let statusIconHtml = `<i class="fa-solid fa-chevron-right lql-chevron"></i>`;
        let itemStatusClass = '';

        if (qStatus.isAnswered) {
            if (qStatus.isCorrect === true) {
                statusIconHtml = `<i class="fas fa-check-circle text-green-500" style="color: #10b981; font-size: 13px;" title="Đúng"></i>`;
                itemStatusClass = 'answered-correct';
            } else {
                statusIconHtml = `<i class="fas fa-times-circle text-red-500" style="color: #ef4444; font-size: 13px;" title="Sai"></i>`;
                itemStatusClass = 'answered-wrong';
            }
        }

        return `
            <div class="lql-item ${isActive ? 'active' : ''} ${itemStatusClass}" data-qid="${q.id}" onclick="goToLearnQuestion(${idx})">
                <div class="lql-left">
                    <span class="lql-num">${idx + 1}</span>
                    <span class="lql-badge ${badgeClass}">${qInfo.label}</span>
                </div>
                <div class="lql-status-box" id="lql-status-${q.id}">
                    ${statusIconHtml}
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
    let answeredCount = 0;
    appState.allQuestions.forEach(item => {
        if (isQuestionGraded(item, appState.userAnswers[item.id])) {
            answeredCount++;
        }
    });
    const percent = Math.min(100, Math.round((answeredCount / (appState.allQuestions.length || 1)) * 100));

    // Header counter & progress
    const counterEl = document.getElementById('learn-q-counter');
    const fillEl = document.getElementById('learn-progress-fill');
    if (counterEl) counterEl.textContent = `Câu ${appState.currentIndex + 1} / ${total}`;
    if (fillEl) fillEl.style.width = `${percent}%`;

    // Cập nhật Max Progress
    saveMaxProgress(appState.topicId, percent);

    // Badge loại câu hỏi
    const badgeEl = document.getElementById('learn-q-badge-type');
    if (badgeEl) badgeEl.innerHTML = `<i class="fa-regular fa-circle-dot"></i> ${qInfo.fullLabel}`;

    // Tiêu đề câu hỏi
    const titleEl = document.getElementById('learn-question-title');
    if (titleEl) {
        if (q.type === 'grouped_true_false') {
            titleEl.innerHTML = `<span style="color: var(--primary); font-weight: 700;">${escapeHtml(q.groupPrefix || 'Câu')}:</span> Xác định tính Đúng hoặc Sai cho mỗi nhận định sau:`;
        } else {
            titleEl.textContent = cleanQuestionText(q.question);
        }
    }

    // Danh sách đáp án
    const optionsContainer = document.getElementById('learn-options-list');
    if (optionsContainer) {
        optionsContainer.innerHTML = renderLearnOptionsHtml(q, qInfo);
    }

    // Khối Giải Thích (Chỉ hiển thị KHI VÀ CHỈ KHI câu hỏi đã được chấm điểm hoàn tất)
    const expBox = document.getElementById('learn-explanation-box');
    const expText = document.getElementById('learn-explanation-text');
    const isCurrentGraded = isQuestionGraded(q, appState.userAnswers[q.id]);
    if (isCurrentGraded) {
        if (!appState._dragGradedCache) appState._dragGradedCache = {};
        appState._dragGradedCache[q.id] = true;
    }
    if (expBox) {
        if (isCurrentGraded) {
            expBox.style.display = 'block';
            if (expText) expText.textContent = getQuestionExplanation(q);
        } else {
            expBox.style.display = 'none';
        }
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
            const qStatus = getQuestionCorrectness(item);
            let statusClass = '';
            if (qStatus.isAnswered) {
                statusClass = qStatus.isCorrect ? 'answered-correct' : 'answered-wrong';
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

// ==========================================================================
// THÀNH PHẦN KÉO THẢ GHÉP CẶP / SẮP XẾP (HTML5 DRAG & DROP API)
// ==========================================================================

// Biến toàn cục lưu trữ dữ liệu phần tử đang được kéo
let currentDragData = null;

/**
 * Trộn thứ tự các từ khóa trong Kho từ khóa một cách tất định (deterministic) theo id câu hỏi.
 * Đảm bảo các từ khóa không bị lộ ngay theo thứ tự ban đầu, nhưng không bị nhảy vị trí lung tung khi re-render.
 */
function getShuffledPillOrder(q) {
    if (!q || !q.pairs) return [];
    const count = q.pairs.length;
    const indices = [];
    for (let i = 0; i < count; i++) indices.push(i);

    let seed = ((typeof q.id === 'number' ? q.id : 42) * 16807 + 7) % 2147483647;
    for (let i = count - 1; i > 0; i--) {
        seed = (seed * 16807) % 2147483647;
        const j = Math.floor((seed / 2147483647) * (i + 1));
        const temp = indices[i];
        indices[i] = indices[j];
        indices[j] = temp;
    }

    let isIdentical = true;
    for (let i = 0; i < count; i++) {
        if (indices[i] !== i) {
            isIdentical = false;
            break;
        }
    }
    if (isIdentical && count > 1) {
        indices.push(indices.shift());
    }
    return indices;
}

/**
 * Render giao diện câu hỏi Kéo Thả (HTML5 Drag & Drop) chuẩn 2 khu vực:
 * Khu vực 1 - Kho từ khóa (Draggable Items): Flexbox các thẻ bài từ khóa draggable="true"
 * Khu vực 2 - Các câu hỏi & Ô trống đích (Drop Zones): Danh sách Card vế trái kèm Ô trống nhận thả
 */
function renderDragDropHtml(q, savedAnswer, isReview = false) {
    if (!q || !q.pairs) return '';

    const isLearn = appState.mode === 'learn';
    const isGraded = isReview || (isLearn && isQuestionGraded(q, savedAnswer));
    const userMatches = (savedAnswer && typeof savedAnswer === 'object' && !Array.isArray(savedAnswer)) ? savedAnswer : {};

    // 1. Tạo danh sách toàn bộ pills
    const allPills = q.pairs.map((p, idx) => ({
        id: `drag-pill-${q.id}-${idx}`,
        text: p.dropZone,
        origIdx: idx
    }));

    // Sắp xếp thứ tự hiển thị trong kho
    const pillOrder = getShuffledPillOrder(q);
    const orderedPills = pillOrder.map(i => allPills[i]);

    // 2. Phân loại: Pill nào đã nằm ở Ô trống đích?
    const assignedZonePill = {};
    const usedPillIds = new Set();

    for (let zIdx = 0; zIdx < q.pairs.length; zIdx++) {
        const savedText = userMatches[zIdx];
        if (savedText !== undefined && savedText !== null && savedText !== '') {
            const matchedPill = orderedPills.find(p => p.text === savedText && !usedPillIds.has(p.id));
            if (matchedPill) {
                assignedZonePill[zIdx] = matchedPill;
                usedPillIds.add(matchedPill.id);
            } else {
                assignedZonePill[zIdx] = {
                    id: `drag-pill-${q.id}-z${zIdx}`,
                    text: savedText,
                    origIdx: zIdx
                };
            }
        }
    }

    // 3. Những pills còn lại nằm ở Kho từ khóa
    const poolPills = orderedPills.filter(p => !usedPillIds.has(p.id));

    // Render Khu vực 1: Kho từ khóa (Draggable Items)
    const poolHtml = `
        <div class="drag-pool-wrapper">
            <div class="drag-pool-header">
                <i class="fa-solid fa-shapes"></i>
                <span>Kéo thả các yếu tố sau đây vào cột tương ứng:</span>
            </div>
            <div class="drag-items-pool" id="drag-items-pool-${q.id}"
                 ${!isGraded ? `ondragover="handleDragOverPool(event)" ondragleave="handleDragLeavePool(event)" ondrop="handleDropToPool(event, '${q.id}')"` : ''}>
                ${poolPills.length > 0 ? poolPills.map(pill => `
                    <div class="drag-pill"
                         id="${pill.id}"
                         draggable="${!isGraded ? 'true' : 'false'}"
                         data-id="${pill.id}"
                         data-text="${escapeHtml(pill.text)}"
                         ${!isGraded ? `ondragstart="handleDragStart(event, '${pill.id}', '${q.id}', 'pool')" ondragend="handleDragEnd(event)" onclick="handlePoolPillClick('${pill.id}', '${q.id}')"` : ''}
                         title="${!isGraded ? 'Kéo thả hoặc bấm để đưa vào ô trống' : ''}">
                        <i class="fa-solid fa-grip-vertical drag-grip-icon"></i>
                        <span>${escapeHtml(pill.text)}</span>
                    </div>
                `).join('') : `
                    <div class="drag-pool-empty">
                        <i class="fa-solid fa-circle-check" style="color: #10b981;"></i>
                        <span>Đã phân loại hết tất cả từ khóa vào các ô bên dưới!</span>
                    </div>
                `}
            </div>
        </div>
    `;

    // Render Khu vực 2: Các câu hỏi & Ô trống đích (Drop Zones)
    const cardsHtml = `
        <div class="drag-cards-list">
            <div class="drag-instruction-text">
                <i class="fa-solid fa-circle-arrow-down"></i>
                <span>Kéo thả các yếu tố sau đây vào ô tương ứng:</span>
            </div>
            ${q.pairs.map((pair, pIdx) => {
                const assignedPill = assignedZonePill[pIdx];
                const hasPill = !!assignedPill;
                const isCorrect = hasPill && assignedPill.text === pair.dropZone;

                let cardClass = '';
                let zoneClass = '';
                let pillClass = '';

                if (isGraded) {
                    if (isCorrect) {
                        cardClass = 'card-correct';
                        zoneClass = 'is-correct filled';
                        pillClass = 'pill-correct';
                    } else {
                        cardClass = 'card-wrong';
                        zoneClass = 'is-wrong' + (hasPill ? ' filled' : '');
                        pillClass = 'pill-wrong';
                    }
                } else if (hasPill) {
                    zoneClass = 'filled';
                }

                return `
                    <div class="drag-card-item ${cardClass}" id="drag-card-${q.id}-${pIdx}">
                        <div class="drag-target-label">
                            <span class="drag-bullet">•</span>
                            <span class="drag-text">${cleanOptionText(pair.dragItem)}</span>
                        </div>
                        <div class="drag-drop-zone ${zoneClass}"
                             id="drop-zone-${q.id}-${pIdx}"
                             data-zone-idx="${pIdx}"
                             data-q-id="${q.id}"
                             ${!isGraded ? `ondragover="handleDragOverZone(event)" ondragleave="handleDragLeaveZone(event)" ondrop="handleDropToZone(event, ${pIdx}, '${q.id}')"` : ''}>
                            ${hasPill ? `
                                <div class="drag-pill drag-zone-pill ${pillClass}"
                                     id="${assignedPill.id}"
                                     draggable="${!isGraded ? 'true' : 'false'}"
                                     data-id="${assignedPill.id}"
                                     data-text="${escapeHtml(assignedPill.text)}"
                                     ${!isGraded ? `ondragstart="handleDragStart(event, '${assignedPill.id}', '${q.id}', '${pIdx}')" ondragend="handleDragEnd(event)" onclick="handleZonePillClick(${pIdx}, '${q.id}')"` : ''}
                                     title="${!isGraded ? 'Bấm để trả về Kho từ khóa hoặc kéo sang ô khác' : ''}">
                                    <i class="fa-solid fa-grip-vertical drag-grip-icon"></i>
                                    <span>${escapeHtml(assignedPill.text)}</span>
                                    ${!isGraded ? '<i class="fa-solid fa-xmark pill-remove-icon" title="Gỡ từ khóa"></i>' : ''}
                                </div>
                            ` : `
                                <div class="drop-zone-placeholder">
                                    <i class="fa-regular fa-square-plus"></i>
                                    <span>Kéo thả từ khóa vào đây (hoặc click từ kho)</span>
                                </div>
                            `}
                        </div>
                        ${isGraded ? `
                            <div class="drag-feedback-badge ${isCorrect ? 'correct' : 'wrong'}">
                                <i class="fa-solid ${isCorrect ? 'fa-check' : 'fa-xmark'}"></i>
                                <span>${isCorrect ? 'Chính xác' : 'Đáp án đúng: ' + escapeHtml(pair.dropZone)}</span>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;

    // Nếu ở chế độ Xem lại bài thi (Test Review Mode), render thêm khối Giải thích
    const reviewExplanationHtml = (isReview) ? `
        <div class="learn-explanation-box" style="margin-top: 16px; display: block;">
            <div class="explanation-header"><i class="fa-regular fa-lightbulb"></i> <span>Giải thích</span></div>
            <p class="explanation-body">${getQuestionExplanation(q)}</p>
        </div>
    ` : '';

    return `
        <div class="drag-drop-container" id="drag-drop-container-${q.id}">
            ${poolHtml}
            ${cardsHtml}
            ${reviewExplanationHtml}
        </div>
    `;
}

// ==========================================================================
// CÁC SỰ KIỆN HTML5 DRAG & DROP VÀ TƯƠNG TÁC CLICK
// ==========================================================================

function handleDragStart(e, pillId, qId, from) {
    const target = e.currentTarget;
    const text = target.getAttribute('data-text') || '';
    currentDragData = { pillId, qId, from, text };

    if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        try {
            e.dataTransfer.setData('text/plain', JSON.stringify(currentDragData));
        } catch (err) {
            e.dataTransfer.setData('text', text);
        }
    }

    target.classList.add('dragging');
}

function handleDragEnd(e) {
    if (e && e.currentTarget) {
        e.currentTarget.classList.remove('dragging');
    }
    document.querySelectorAll('.drag-pill.dragging').forEach(el => el.classList.remove('dragging'));
    document.querySelectorAll('.dragover').forEach(el => el.classList.remove('dragover'));
    currentDragData = null;
}

function handleDragOverZone(e) {
    e.preventDefault();
    if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
    }
    const zone = e.currentTarget;
    if (zone && !zone.classList.contains('dragover')) {
        zone.classList.add('dragover');
    }
}

function handleDragLeaveZone(e) {
    const zone = e.currentTarget;
    if (zone) {
        zone.classList.remove('dragover');
    }
}

function handleDragOverPool(e) {
    e.preventDefault();
    if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
    }
    const pool = e.currentTarget;
    if (pool && !pool.classList.contains('dragover')) {
        pool.classList.add('dragover');
    }
}

function handleDragLeavePool(e) {
    const pool = e.currentTarget;
    if (pool) {
        pool.classList.remove('dragover');
    }
}

function handleDropToZone(e, targetZoneIdx, qId) {
    e.preventDefault();
    const zone = e.currentTarget;
    if (zone) zone.classList.remove('dragover');

    let dragData = currentDragData;
    if (!dragData && e.dataTransfer) {
        try {
            const raw = e.dataTransfer.getData('text/plain');
            if (raw) dragData = JSON.parse(raw);
        } catch (err) {}
    }
    if (!dragData || String(dragData.qId) !== String(qId)) return;

    const list = (appState.mode === 'learn') ? appState.filteredQuestions : appState.allQuestions;
    const q = list.find(item => String(item.id) === String(qId)) || list[appState.currentIndex];
    if (!q || !q.pairs) return;

    if (appState.mode === 'learn' && isQuestionGraded(q, appState.userAnswers[q.id])) return;
    if (appState.isReviewMode) return;

    let userMatches = appState.userAnswers[q.id] || {};
    if (typeof userMatches !== 'object' || Array.isArray(userMatches)) {
        userMatches = {};
    } else {
        userMatches = { ...userMatches };
    }

    const { from, text } = dragData;

    // Nếu kéo từ một ô trống khác sang (chuyển ô)
    if (from !== 'pool' && from !== undefined && from !== null) {
        const fromIdx = parseInt(from, 10);
        if (!isNaN(fromIdx)) {
            delete userMatches[fromIdx];
        }
    }

    // Đặt vào ô trống đích (nếu ô trống đã có sẵn một từ khóa, từ khóa cũ tự động được thay thế và quay lại kho)
    userMatches[targetZoneIdx] = text;
    appState.userAnswers[q.id] = userMatches;

    handleDragEnd(e);
    onDragDropAnswerUpdated(q);
}

function handleDropToPool(e, qId) {
    e.preventDefault();
    const pool = e.currentTarget;
    if (pool) pool.classList.remove('dragover');

    let dragData = currentDragData;
    if (!dragData && e.dataTransfer) {
        try {
            const raw = e.dataTransfer.getData('text/plain');
            if (raw) dragData = JSON.parse(raw);
        } catch (err) {}
    }
    if (!dragData || String(dragData.qId) !== String(qId)) return;

    const list = (appState.mode === 'learn') ? appState.filteredQuestions : appState.allQuestions;
    const q = list.find(item => String(item.id) === String(qId)) || list[appState.currentIndex];
    if (!q || !q.pairs) return;

    if (appState.mode === 'learn' && isQuestionGraded(q, appState.userAnswers[q.id])) return;
    if (appState.isReviewMode) return;

    const { from } = dragData;
    if (from !== 'pool' && from !== undefined && from !== null) {
        const fromIdx = parseInt(from, 10);
        if (!isNaN(fromIdx) && appState.userAnswers[q.id]) {
            let userMatches = { ...appState.userAnswers[q.id] };
            delete userMatches[fromIdx];
            if (Object.keys(userMatches).length === 0) {
                delete appState.userAnswers[q.id];
            } else {
                appState.userAnswers[q.id] = userMatches;
            }
            handleDragEnd(e);
            onDragDropAnswerUpdated(q);
        }
    }
}

function handleZonePillClick(zoneIdx, qId) {
    const list = (appState.mode === 'learn') ? appState.filteredQuestions : appState.allQuestions;
    const q = list.find(item => String(item.id) === String(qId)) || list[appState.currentIndex];
    if (!q || !q.pairs) return;

    if (appState.mode === 'learn' && isQuestionGraded(q, appState.userAnswers[q.id])) return;
    if (appState.isReviewMode) return;

    let userMatches = appState.userAnswers[q.id];
    if (userMatches && typeof userMatches === 'object') {
        userMatches = { ...userMatches };
        delete userMatches[zoneIdx];
        if (Object.keys(userMatches).length === 0) {
            delete appState.userAnswers[q.id];
        } else {
            appState.userAnswers[q.id] = userMatches;
        }
        onDragDropAnswerUpdated(q);
    }
}

function handlePoolPillClick(pillId, qId) {
    const list = (appState.mode === 'learn') ? appState.filteredQuestions : appState.allQuestions;
    const q = list.find(item => String(item.id) === String(qId)) || list[appState.currentIndex];
    if (!q || !q.pairs) return;

    if (appState.mode === 'learn' && isQuestionGraded(q, appState.userAnswers[q.id])) return;
    if (appState.isReviewMode) return;

    const allPills = q.pairs.map((p, idx) => ({ id: `drag-pill-${q.id}-${idx}`, text: p.dropZone, origIdx: idx }));
    const targetPill = allPills.find(p => p.id === pillId);
    if (!targetPill) return;

    let userMatches = appState.userAnswers[q.id] || {};
    if (typeof userMatches !== 'object' || Array.isArray(userMatches)) {
        userMatches = {};
    } else {
        userMatches = { ...userMatches };
    }

    // Tìm ô trống đích đầu tiên chưa có từ khóa
    let emptyZoneIdx = -1;
    for (let i = 0; i < q.pairs.length; i++) {
        if (!userMatches[i]) {
            emptyZoneIdx = i;
            break;
        }
    }

    if (emptyZoneIdx !== -1) {
        userMatches[emptyZoneIdx] = targetPill.text;
        appState.userAnswers[q.id] = userMatches;
        onDragDropAnswerUpdated(q);
    }
}

function onDragDropAnswerUpdated(q) {
    if (appState.mode === 'learn') {
        const wasGradedBefore = appState._dragGradedCache && appState._dragGradedCache[q.id];
        const isGradedNow = isQuestionGraded(q, appState.userAnswers[q.id]);

        if (isGradedNow) {
            const isCorr = isAnswerCorrectForQuestion(q, appState.userAnswers[q.id]);
            if (!appState.questionResults) appState.questionResults = {};
            appState.questionResults[q.id] = { isCorrect: isCorr };
        } else {
            if (appState.questionResults) delete appState.questionResults[q.id];
        }

        saveCurrentLearnProgress();
        renderLearnWorkspace();
        updateLearnSidebarQuestionStatus(q.id);

        if (isGradedNow && !wasGradedBefore) {
            if (!appState._dragGradedCache) appState._dragGradedCache = {};
            appState._dragGradedCache[q.id] = true;

            const expResult = addExp(2);
            showFloatingExpBadge(2);
            if (expResult.leveledUp) {
                showLevelUpModal(expResult.newRank, expResult.oldRank);
            }
        }
    } else {
        renderTestProgressSection();
        renderTestQuestionCard();
    }
}

// ==========================================================================
// THÀNH PHẦN CÂU HỎI ĐÚNG / SAI 4 Ý (GROUPED TRUE/FALSE COMPONENT)
// ==========================================================================

/**
 * Render giao diện câu hỏi Đúng / Sai 4 ý (Grouped True/False):
 * - Tiêu đề hướng dẫn chung
 * - Render 4 hàng dọc (List), mỗi hàng là 1 ý nhỏ kèm 2 nút chọn: [ Đúng ] và [ Sai ]
 * - Hiển thị phản hồi chi tiết cho từng ý khi đã hoàn thành hoặc ở chế độ xem lại
 */
function renderGroupedTrueFalseHtml(q, savedAnswer, isReview = false) {
    if (!q || !q.subQuestions) return '';

    const isLearn = appState.mode === 'learn';
    const isGraded = isReview || (isLearn && isQuestionGraded(q, savedAnswer));
    const userChoices = (savedAnswer && typeof savedAnswer === 'object' && !Array.isArray(savedAnswer)) ? savedAnswer : {};
    const subLabels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    const rowsHtml = q.subQuestions.map((subQ, sIdx) => {
        const statementText = subQ.cleanText || (subQ.question || '')
            .replace(/\[cite:\s*\d+\]/gi, '')
            .replace(/^Câu\s*\d+[a-z]?\s*\.\s*\d+\s*:\s*/i, '')
            .trim();

        const userChoice = userChoices[sIdx]; // 0 (Đúng) hoặc 1 (Sai) hoặc undefined
        const isAnswered = userChoice !== undefined && userChoice !== null;
        const correctChoice = Array.isArray(subQ.correctAnswers) ? subQ.correctAnswers[0] : (subQ.correctAnswer ?? 0);
        const isCorrect = isAnswered && userChoice === correctChoice;

        let rowCardClass = '';
        if (isGraded) {
            rowCardClass = isCorrect ? 'row-correct' : 'row-wrong';
        }

        // 2 nút chọn: [0: Đúng], [1: Sai]
        const choiceOptions = [
            { label: 'Đúng', val: 0 },
            { label: 'Sai', val: 1 }
        ];

        const buttonsHtml = choiceOptions.map(opt => {
            const isSelected = isAnswered && userChoice === opt.val;
            let btnClass = '';
            let iconHtml = '';

            if (isGraded) {
                if (isSelected) {
                    btnClass = (opt.val === correctChoice) ? 'is-correct' : 'is-wrong';
                    iconHtml = (opt.val === correctChoice) 
                        ? '<i class="fa-solid fa-check"></i>' 
                        : '<i class="fa-solid fa-xmark"></i>';
                } else if (opt.val === correctChoice) {
                    btnClass = 'is-revealed-correct';
                    iconHtml = '<i class="fa-solid fa-check"></i>';
                } else {
                    btnClass = '';
                    iconHtml = '';
                }
            } else {
                if (isSelected) {
                    btnClass = 'selected';
                    iconHtml = '<div class="gtf-btn-radio-indicator"><i class="fa-solid fa-circle" style="font-size: 7px;"></i></div>';
                } else {
                    btnClass = '';
                    iconHtml = '<div class="gtf-btn-radio-indicator"></div>';
                }
            }

            const clickHandler = !isGraded ? `onclick="handleSelectGroupedTfAnswer('${q.id}', ${sIdx}, ${opt.val})"` : '';
            const titleTooltip = isGraded ? '' : `Chọn: ${opt.label}`;

            return `
                <button type="button" 
                        class="gtf-btn-choice ${btnClass}" 
                        ${clickHandler} 
                        title="${titleTooltip}"
                        ${isGraded ? 'disabled' : ''}>
                    ${iconHtml}
                    <span>${opt.label}</span>
                </button>
            `;
        }).join('');

        // Phản hồi Đúng/Sai và giải thích dưới từng hàng
        let feedbackHtml = '';
        if (isGraded) {
            const actualText = correctChoice === 0 ? 'Đúng' : 'Sai';
            feedbackHtml = `
                <div class="gtf-row-feedback ${isCorrect ? 'correct' : 'wrong'}">
                    <i class="fa-solid ${isCorrect ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
                    <span>${isCorrect ? 'Chính xác' : 'Đáp án đúng'}: Khẳng định trên là <strong>${actualText}</strong>.</span>
                </div>
            `;
        }

        const labelBadge = subLabels[sIdx] || `${sIdx + 1}`;

        return `
            <div class="gtf-row-card ${rowCardClass}" id="gtf-row-${q.id}-${sIdx}">
                <div class="gtf-row-main">
                    <div class="gtf-statement-col">
                        <span class="gtf-sub-badge">${labelBadge})</span>
                        <div class="gtf-statement-text">${escapeHtml(statementText)}</div>
                    </div>
                    <div class="gtf-buttons-col">
                        ${buttonsHtml}
                    </div>
                </div>
                ${feedbackHtml}
            </div>
        `;
    }).join('');

    const explanationHtml = isReview ? `
        <div class="learn-explanation-box" style="margin-top: 16px; display: block;">
            <div class="explanation-header"><i class="fa-regular fa-lightbulb"></i> <span>Giải thích tổng quan</span></div>
            <p class="explanation-body">${getQuestionExplanation(q)}</p>
        </div>
    ` : '';

    return `
        <div class="gtf-container" id="gtf-container-${q.id}">
            <div class="gtf-instruction-card">
                <i class="fa-solid fa-list-check"></i>
                <span>Hãy chọn Đúng hoặc Sai cho từng khẳng định bên dưới (cần chọn đủ cả 4 ý):</span>
            </div>
            <div class="gtf-rows-list">
                ${rowsHtml}
            </div>
            ${explanationHtml}
        </div>
    `;
}

function handleSelectGroupedTfAnswer(qId, subIdx, choiceVal) {
    if (appState.isReviewMode) return;

    const list = (appState.mode === 'learn') ? appState.filteredQuestions : appState.allQuestions;
    const q = list.find(item => String(item.id) === String(qId)) || list[appState.currentIndex];
    if (!q || !q.subQuestions) return;

    // Nếu đã hoàn thành trong mode=learn thì không cho chọn tiếp
    if (appState.mode === 'learn' && isQuestionGraded(q, appState.userAnswers[q.id])) {
        return;
    }

    let userChoices = appState.userAnswers[q.id] || {};
    if (typeof userChoices !== 'object' || Array.isArray(userChoices)) {
        userChoices = {};
    } else {
        userChoices = { ...userChoices };
    }

    userChoices[subIdx] = choiceVal;
    appState.userAnswers[q.id] = userChoices;

    if (appState.mode === 'learn') {
        const wasGradedBefore = appState._dragGradedCache && appState._dragGradedCache[q.id];
        const isGradedNow = isQuestionGraded(q, appState.userAnswers[q.id]);

        if (isGradedNow) {
            const isCorr = isAnswerCorrectForQuestion(q, userChoices);
            if (!appState.questionResults) appState.questionResults = {};
            appState.questionResults[q.id] = { isCorrect: isCorr };
        } else {
            if (appState.questionResults) delete appState.questionResults[q.id];
        }

        saveCurrentLearnProgress();
        renderLearnWorkspace();
        updateLearnSidebarQuestionStatus(q.id);

        // CHỈ kích hoạt chấm điểm và cộng EXP khi và chỉ khi user đã tick đủ số lượng đáp án yêu cầu (cả 4 ý)
        if (isGradedNow && !wasGradedBefore) {
            if (!appState._dragGradedCache) appState._dragGradedCache = {};
            appState._dragGradedCache[q.id] = true;

            const expResult = addExp(2);
            showFloatingExpBadge(2);
            if (expResult.leveledUp) {
                showLevelUpModal(expResult.newRank, expResult.oldRank);
            }
        }
    } else {
        renderTestProgressSection();
        renderTestQuestionCard();
    }
}

function renderLearnOptionsHtml(q, qInfo) {
    const savedAnswer = appState.userAnswers[q.id];
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const correctAnswers = getQuestionCorrectAnswers(q);

    // Dạng câu hỏi Đúng / Sai 4 ý (Grouped True/False)
    if (q.type === 'grouped_true_false' || (q.subQuestions && q.subQuestions.length > 0)) {
        return renderGroupedTrueFalseHtml(q, savedAnswer, false);
    }

    // Dạng kéo thả ghép cặp (HTML5 Drag & Drop)
    if (qInfo.id === 'drag_drop' && q.pairs) {
        return renderDragDropHtml(q, savedAnswer, false);
    }

    // Các dạng trắc nghiệm / Đúng Sai / Điền từ
    const options = (qInfo.id === 'true_false') ? ((q.options && q.options.length >= 2) ? q.options : ['Đúng', 'Sai']) : (q.options || []);
    const isGraded = isQuestionGraded(q, savedAnswer);

    return options.map((opt, oIdx) => {
        const isUserSelected = (savedAnswer !== undefined && savedAnswer !== null) && (
            Array.isArray(savedAnswer) ? savedAnswer.includes(oIdx) : savedAnswer === oIdx
        );
        const isActuallyCorrect = correctAnswers.includes(oIdx);

        let stateClass = '';
        let customStyle = '';
        let ringStyle = '';
        let ringContent = '';

        if (isGraded) {
            // ĐÃ CHẤM ĐIỂM: Đổi màu xanh/đỏ và hiện đáp án đúng
            if (isUserSelected) {
                stateClass = isActuallyCorrect ? 'is-correct' : 'is-wrong';
            } else if (isActuallyCorrect) {
                // Làm nổi bật đáp án đúng khi người dùng chọn sai
                stateClass = 'is-revealed-correct';
            }

            ringContent = (stateClass === 'is-correct' || stateClass === 'is-revealed-correct')
                ? '<i class="fa-solid fa-check" style="font-size: 11px;"></i>'
                : (stateClass === 'is-wrong'
                    ? '<i class="fa-solid fa-xmark" style="font-size: 12px;"></i>'
                    : '');
        } else {
            // CHƯA CHẤM ĐIỂM (đang tick chọn dở các checkbox):
            if (isUserSelected) {
                stateClass = 'selected';
                customStyle = 'background-color: #eff6ff; border-color: #3b82f6; color: #1e40af;';
                ringStyle = 'background-color: #3b82f6; border-color: #3b82f6; color: #ffffff;';
                ringContent = '<i class="fa-solid fa-check" style="font-size: 11px;"></i>';
            }
        }

        return `
            <div class="l-option-box ${stateClass}" ${customStyle ? `style="${customStyle}"` : ''} onclick="handleSelectAnswer(${oIdx})">
                <div class="l-option-ring" ${ringStyle ? `style="${ringStyle}"` : ''}>
                    ${ringContent}
                </div>
                <span class="l-option-prefix" ${isUserSelected && !isGraded ? 'style="color: #1e40af;"' : ''}>${letters[oIdx]}.</span>
                <span class="l-option-text" ${isUserSelected && !isGraded ? 'style="color: #1e40af; font-weight: 500;"' : ''}>${cleanOptionText(opt)}</span>
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
    if (titleEl) {
        if (q.type === 'grouped_true_false') {
            titleEl.innerHTML = `<span style="color: var(--primary); font-weight: 700;">${escapeHtml(q.groupPrefix || 'Câu')}:</span> Xác định tính Đúng hoặc Sai cho mỗi nhận định sau:`;
        } else {
            titleEl.textContent = cleanQuestionText(q.question);
        }
    }

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

    // Dạng câu hỏi Đúng / Sai 4 ý trong chế độ kiểm tra (Grouped True/False)
    if (q.type === 'grouped_true_false' || (q.subQuestions && q.subQuestions.length > 0)) {
        return renderGroupedTrueFalseHtml(q, savedAnswer, appState.isReviewMode);
    }

    // Dạng kéo thả ghép cặp trong chế độ kiểm tra (HTML5 Drag & Drop)
    if (qInfo.id === 'drag_drop' && q.pairs) {
        return renderDragDropHtml(q, savedAnswer, appState.isReviewMode);
    }

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
    const correctList = getQuestionCorrectAnswers(q);
    const isMultiple = (qInfo.id === 'multiple') || (correctList.length > 1);

    if (appState.mode === 'learn') {
        if (isDrag) {
            let matches = appState.userAnswers[q.id] || {};
            if (customVal) matches[optionIndex] = customVal;
            else delete matches[optionIndex];
            appState.userAnswers[q.id] = matches;

            const isGradedNow = isQuestionGraded(q, matches);
            if (isGradedNow) {
                const isCorr = isAnswerCorrectForQuestion(q, matches);
                if (!appState.questionResults) appState.questionResults = {};
                appState.questionResults[q.id] = { isCorrect: isCorr };
            } else {
                if (appState.questionResults) delete appState.questionResults[q.id];
            }

            saveCurrentLearnProgress();
            renderLearnWorkspace();
            updateLearnSidebarQuestionStatus(q.id);

            if (isGradedNow) {
                const expResult = addExp(2);
                showFloatingExpBadge(2);
                if (expResult.leveledUp) {
                    showLevelUpModal(expResult.newRank, expResult.oldRank);
                }
            }
            return;
        }

        if (isMultiple) {
            const requiredCount = correctList.length;
            let selectedAnswers = appState.userAnswers[q.id] || [];
            if (!Array.isArray(selectedAnswers)) selectedAnswers = [];

            // Nếu câu này đã được chấm điểm hoàn tất (đã chọn đủ số đáp án yêu cầu), không cho chọn tiếp
            if (selectedAnswers.length >= requiredCount) {
                return;
            }

            // Ghi nhận đáp án user vừa tick (toggle: click lại để bỏ chọn)
            if (selectedAnswers.includes(optionIndex)) {
                selectedAnswers = selectedAnswers.filter(x => x !== optionIndex);
            } else {
                selectedAnswers.push(optionIndex);
            }

            if (selectedAnswers.length === 0) {
                delete appState.userAnswers[q.id];
                if (appState.questionResults) delete appState.questionResults[q.id];
            } else {
                appState.userAnswers[q.id] = selectedAnswers;
            }

            if (selectedAnswers.length >= requiredCount) {
                const isCorr = isAnswerCorrectForQuestion(q, selectedAnswers);
                if (!appState.questionResults) appState.questionResults = {};
                appState.questionResults[q.id] = { isCorrect: isCorr };
            } else {
                if (appState.questionResults) delete appState.questionResults[q.id];
            }

            // Lưu tiến trình dở dang
            saveCurrentLearnProgress();
            // Re-render UI
            renderLearnWorkspace();
            updateLearnSidebarQuestionStatus(q.id);

            // CHỈ KÍCH HOẠT HÀM CHẤM ĐIỂM KHI VÀ CHỈ KHI user đã tick đủ số lượng đáp án yêu cầu
            if (selectedAnswers.length >= requiredCount) {
                const expResult = addExp(2);
                showFloatingExpBadge(2);

                if (expResult.leveledUp) {
                    showLevelUpModal(expResult.newRank, expResult.oldRank);
                }
            }
            return;
        }

        // Single choice / true_false / fill_blank: Click là chấm điểm ngay (giữ nguyên logic cũ)
        appState.userAnswers[q.id] = optionIndex;
        const isCorr = isAnswerCorrectForQuestion(q, optionIndex);
        if (!appState.questionResults) appState.questionResults = {};
        appState.questionResults[q.id] = { isCorrect: isCorr };

        saveCurrentLearnProgress();
        renderLearnWorkspace();
        updateLearnSidebarQuestionStatus(q.id);

        // GAMIFICATION: Chế độ Ôn luyện (mode=learn): Mỗi khi tick chọn 1 đáp án -> +2 EXP
        const expResult = addExp(2);
        showFloatingExpBadge(2);

        if (expResult.leveledUp) {
            showLevelUpModal(expResult.newRank, expResult.oldRank);
        }
    } else {
        // Mode = 'test': Không chấm điểm ngay, chỉ lưu lựa chọn
        if (isDrag) {
            let matches = appState.userAnswers[q.id] || {};
            if (customVal) matches[optionIndex] = customVal;
            else delete matches[optionIndex];
            appState.userAnswers[q.id] = matches;
        } else if (isMultiple) {
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
            appState.userAnswers[q.id] = optionIndex;
        }

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

        if (q.type === 'grouped_true_false' || (q.subQuestions && q.subQuestions.length > 0)) {
            let subCorrectCount = 0;
            const subTotal = q.subQuestions.length || 4;
            q.subQuestions.forEach((sq, idx) => {
                const correctVal = Array.isArray(sq.correctAnswers) ? sq.correctAnswers[0] : (sq.correctAnswer ?? 0);
                if (userAns && userAns[idx] === correctVal) subCorrectCount++;
            });
            if (subCorrectCount === subTotal) {
                correctCount += 1;
            } else {
                correctCount += (subCorrectCount / subTotal);
            }
        } else if (q.type === 'drag_drop' && q.pairs) {
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

    // === ĐỘC LẬP DỮ LIỆU (DATA ISOLATION): LƯU KẾT QUẢ THI THEO UID TRÊN FIREBASE ===
    const currentUser = getCurrentUser();
    if (currentUser) {
        const uid = getCurrentUserUID();
        const historyKey = 'history_' + uid;
        let historyList = [];
        try {
            const rawHistory = localStorage.getItem(historyKey) || (currentUser.username ? localStorage.getItem('history_' + currentUser.username) : null);
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
        if (currentUser.username) {
            localStorage.setItem('history_' + currentUser.username, JSON.stringify(historyList));
        }

        // Lưu trực tiếp lên Firebase Realtime Database
        if (uid !== 'guest') {
            if (window.FirebaseService) {
                FirebaseService.addHistory(uid, historyItem);
            } else if (window.ref && window.set && window.db) {
                set(ref(db, `users/${uid}/history`), historyList);
            }
        }
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
    if (q.type === 'grouped_true_false' || (q.subQuestions && q.subQuestions.length > 0)) {
        return { id: 'true_false', label: 'Đúng / Sai', fullLabel: 'Đúng / Sai (4 ý)' };
    }
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
    if ((q.type === 'grouped_true_false' || q.subQuestions) && q.subQuestions.length > 0) {
        const labels = ['a', 'b', 'c', 'd', 'e', 'f'];
        const parts = q.subQuestions.map((sq, idx) => {
            const cVal = Array.isArray(sq.correctAnswers) ? sq.correctAnswers[0] : (sq.correctAnswer ?? 0);
            return `Ý ${labels[idx] || (idx + 1)}: [${cVal === 0 ? 'Đúng' : 'Sai'}]`;
        });
        return `Kết quả chuẩn từng ý: ${parts.join('; ')}. Căn cứ theo giáo trình chuẩn Chủ nghĩa xã hội khoa học (NXB Chính trị Quốc gia Sự thật).`;
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
        const user = getCurrentUser();
        if (user && user.username) {
            localStorage.removeItem(getMaxProgressStorageKey(topicId));
            localStorage.removeItem(`max_progress_topic_${topicId}_${user.username}`);
        }
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
    if (!q || userAns === undefined || userAns === null) return false;
    const correctList = getQuestionCorrectAnswers(q);
    const qInfo = detectQuestionType(q);

    // Dạng câu hỏi Đúng / Sai gom nhóm (4 ý): phải đúng hoàn toàn mọi ý
    if (q.type === 'grouped_true_false' || (q.subQuestions && q.subQuestions.length > 0)) {
        if (typeof userAns !== 'object' || Array.isArray(userAns)) return false;
        if (Object.keys(userAns).length < q.subQuestions.length) return false;
        let isAll = true;
        q.subQuestions.forEach((sq, idx) => {
            const correctVal = Array.isArray(sq.correctAnswers) ? sq.correctAnswers[0] : (sq.correctAnswer ?? 0);
            if (Number(userAns[idx]) !== Number(correctVal)) isAll = false;
        });
        return isAll;
    }

    // Dạng kéo thả ghép cặp: phải đúng hoàn toàn tất cả các cặp
    if (qInfo.id === 'drag_drop' && q.pairs) {
        if (typeof userAns !== 'object' || Array.isArray(userAns)) return false;
        if (Object.keys(userAns).length < q.pairs.length) return false;
        let isAll = true;
        q.pairs.forEach((p, idx) => {
            if (userAns[idx] !== p.dropZone) isAll = false;
        });
        return isAll;
    }

    // Dạng trắc nghiệm nhiều đáp án: phải chọn đúng HOÀN TOÀN tất cả các đáp án yêu cầu
    if (qInfo.id === 'multiple' || correctList.length > 1) {
        if (!Array.isArray(userAns)) return false;
        if (userAns.length !== correctList.length) return false;
        const s1 = [...userAns].map(Number).sort((a, b) => a - b).join(',');
        const s2 = [...correctList].map(Number).sort((a, b) => a - b).join(',');
        return s1 === s2;
    }

    // Trắc nghiệm 1 đáp án / Đúng Sai 2 lựa chọn / Điền từ
    const correctAns = correctList[0];
    return Number(userAns) === Number(correctAns);
}