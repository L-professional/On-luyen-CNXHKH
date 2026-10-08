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
    isReviewMode: false       // Trong mode=test: sau khi nộp bài bật xem lại đáp án
};

// ==========================================================================
// 1. QUẢN LÝ TIẾN TRÌNH VỚI LOCALSTORAGE (CHỈ DÀNH CHO CHẾ ĐỘ ÔN LUYỆN)
// ==========================================================================
const PROGRESS_STORAGE_PREFIX = 'cnxh_learn_progress_';

function getProgressStorageKey(topicId) {
    return `${PROGRESS_STORAGE_PREFIX}${topicId}`;
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
        isRoot: true
    },
    {
        username: 'Loc',
        password: '123',
        role: 'user',
        createdAt: '08/10/2026',
        isRoot: false
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

    // Khởi tạo currentUser mặc định là Admin nếu chưa đăng nhập để dễ dàng thử nghiệm
    if (!localStorage.getItem('currentUser')) {
        localStorage.setItem('currentUser', JSON.stringify(DEFAULT_USERS[0]));
    }
}

function getCurrentUser() {
    try {
        const str = localStorage.getItem('currentUser');
        if (!str) return null;
        return JSON.parse(str);
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
    const nameEl = document.getElementById('header-user-name');
    if (nameEl) {
        nameEl.textContent = user ? user.username : 'Khách';
    }
}

function openUserMenuModal() {
    const user = getCurrentUser();
    const roleText = (user && user.role === 'admin') ? 'Quản trị viên (Admin)' : 'Học viên (User)';
    const roleBadgeColor = (user && user.role === 'admin') ? '#2563eb' : '#10b981';

    showModal({
        title: 'Tài khoản người dùng',
        icon: 'fa-solid fa-user-circle',
        content: `
            <div style="font-size: 14px; color: #334155; display: flex; flex-direction: column; gap: 14px;">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 14px;">
                    <div style="width: 48px; height: 48px; border-radius: 50%; background: ${roleBadgeColor}; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700;">
                        ${user ? user.username.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                        <div style="font-size: 16px; font-weight: 700; color: #1e293b;">${user ? user.username : 'Chưa đăng nhập'}</div>
                        <div style="display: inline-block; margin-top: 4px; padding: 3px 10px; border-radius: 9999px; background: ${user && user.role === 'admin' ? '#eff6ff' : '#ecfdf5'}; color: ${roleBadgeColor}; font-size: 12px; font-weight: 600;">
                            ${roleText}
                        </div>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <button type="button" style="padding: 10px 14px; border-radius: 8px; border: 1px solid #cbd5e1; background: #ffffff; text-align: left; cursor: pointer; font-size: 13.5px; display: flex; align-items: center; gap: 10px; transition: all 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#ffffff'" onclick="switchDemoAccount()">
                        <i class="fa-solid fa-repeat" style="color: #2563eb;"></i>
                        <span>Chuyển đổi vai trò nhanh (Admin ↔ User)</span>
                    </button>
                    ${user && user.role === 'admin' ? `
                    <button type="button" style="padding: 10px 14px; border-radius: 8px; border: 1px solid #bfdbfe; background: #eff6ff; text-align: left; cursor: pointer; font-size: 13.5px; display: flex; align-items: center; gap: 10px; color: #1e40af; font-weight: 600;" onclick="window.location.href='admin.html'">
                        <i class="fas fa-users-cog"></i>
                        <span>Đến trang Quản lý tài khoản (admin.html)</span>
                    </button>
                    ` : ''}
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

function switchDemoAccount() {
    const current = getCurrentUser();
    if (current && current.role === 'admin') {
        const userAcc = { username: 'Loc', role: 'user' };
        localStorage.setItem('currentUser', JSON.stringify(userAcc));
        showToast('Đã chuyển sang tài khoản User thường!');
    } else {
        const adminAcc = { username: 'Admin', role: 'admin' };
        localStorage.setItem('currentUser', JSON.stringify(adminAcc));
        showToast('Đã chuyển sang tài khoản Admin!');
    }
    closeModal();
    checkAdminMenu();
}

function logoutUser() {
    localStorage.removeItem('currentUser');
    closeModal();
    window.location.href = 'login.html';
}

// ==========================================================================
// KHỞI ĐỘNG ỨNG DỤNG
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initUserStorage();
    checkAdminMenu();

    const isPracticePage = !!document.getElementById('practice-body');

    if (isPracticePage) {
        initPracticePage();
    } else {
        initDashboardPage();
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
    if (nextBtn) prevBtn.disabled = appState.currentIndex === total - 1;
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
    }
}

function learnPrevQuestion() {
    if (appState.currentIndex > 0) {
        appState.currentIndex--;
        if (appState.mode === 'learn') {
            saveCurrentLearnProgress();
        }
        renderLearnWorkspace();
    }
}

function learnNextQuestion() {
    if (appState.currentIndex < appState.filteredQuestions.length - 1) {
        appState.currentIndex++;
        if (appState.mode === 'learn') {
            saveCurrentLearnProgress();
        }
        renderLearnWorkspace();
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
    }
}

function testPrevQuestion() {
    if (appState.currentIndex > 0) {
        appState.currentIndex--;
        renderTestProgressSection();
        renderTestQuestionCard();
    }
}

function testNextQuestion() {
    if (appState.currentIndex < appState.allQuestions.length - 1) {
        appState.currentIndex++;
        renderTestProgressSection();
        renderTestQuestionCard();
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
                <p style="color: #64748b; font-size: 13.5px; margin-bottom: 16px;">
                    Số câu đúng: <strong>${correctCount}/${total}</strong> câu (${Math.round((correctCount / total) * 100)}%)
                </p>
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
            // Bật Review Mode: lúc này mới hiện xanh/đỏ cho từng câu và hiện giải thích
            appState.isReviewMode = true;
            appState.currentIndex = 0;
            renderTestProgressSection();
            renderTestQuestionCard();
            showToast('Chế độ xem lại đáp án: Đáp án đúng tô xanh, sai tô đỏ.');
        },
        showCancel: true,
        cancelText: 'Về trang chủ',
        cancelCallback: () => {
            window.location.href = 'index.html';
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
    if (type === 'stats') {
        showModal({
            title: 'Thống kê kết quả',
            icon: 'fa-solid fa-chart-simple',
            content: `<p style="font-size: 13.5px; color: #475569; line-height: 1.6;">Hệ thống ghi nhận kết quả và hỗ trợ 2 chế độ: Ôn luyện (học kèm giải thích) và Kiểm tra (bấm giờ tính điểm). Hãy chọn chủ đề bạn muốn để bắt đầu!</p>`
        });
    } else if (type === 'history') {
        showModal({
            title: 'Lịch sử làm bài',
            icon: 'fa-solid fa-clock-rotate-left',
            content: `<p style="color: #64748b; text-align: center; padding: 20px;">Chưa có lịch sử làm bài kiểm tra nào.</p>`
        });
    } else if (type === 'guide') {
        showModal({
            title: 'Hướng dẫn sử dụng',
            icon: 'fa-regular fa-circle-question',
            content: `
                <div style="font-size: 13.5px; color: #475569; display: flex; flex-direction: column; gap: 8px;">
                    <p>• <strong>Chế độ Ôn luyện (mode=learn):</strong> Hiển thị 2 cột, xem giải thích chi tiết, chọn đáp án biết ngay đúng (xanh) hoặc sai (đỏ).</p>
                    <p>• <strong>Chế độ Kiểm tra (mode=test):</strong> Giao diện 1 cột tập trung, không hiện giải thích hay đúng/sai trong khi làm, bấm giờ và nộp bài tính điểm.</p>
                    <p>• Dùng phím mũi tên <strong>Trái / Phải</strong> trên bàn phím để chuyển nhanh câu hỏi.</p>
                </div>
            `
        });
    } else if (type === 'contact') {
        showModal({
            title: 'Liên hệ / Góp ý',
            icon: 'fa-regular fa-envelope',
            content: `<p style="font-size: 13.5px; color: #475569;">Email hỗ trợ: <strong>hotro@onluyencnxh.edu.vn</strong></p>`
        });
    } else if (type === 'notifications') {
        showModal({
            title: 'Thông báo hệ thống',
            icon: 'fa-solid fa-bell',
            content: `<p style="font-size: 13.5px; color: #475569;">Hệ thống đã nâng cấp phân tách rõ rệt 2 chế độ: <strong>Ôn luyện</strong> (học kèm giải thích) và <strong>Kiểm tra</strong> (tập trung tính điểm)!</p>`
        });
    }
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
}

function closeModalOnBackdrop(e) {
    if (e.target.id === 'modal-container') {
        closeModal();
    }
}