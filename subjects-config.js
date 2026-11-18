/**
 * ============================================================================
 * SUBJECTS CONFIGURATION & REGISTRY (subjects-config.js)
 * Quản lý danh mục Đa Môn Phái (Multi-subject System)
 * - cnxhkh: Chủ nghĩa Xã hội Khoa học ("Khoa Học Chân Lý Đảo")
 * - lsd: Lịch sử Đảng Cộng sản Việt Nam ("Hồng Kỳ Khởi Nguyên Cung")
 * ============================================================================
 */

var SUBJECTS = (typeof window !== 'undefined' && window.SUBJECTS) ? window.SUBJECTS : {
    'cnxhkh': { id: 'cnxhkh', name: 'Chủ nghĩa Xã hội Khoa học', folder: 'data/cnxhkh', realmName: 'Khoa Học Chân Lý Đảo' },
    'lsd': { id: 'lsd', name: 'Lịch sử Đảng', folder: 'data/lsd', realmName: 'Hồng Kỳ Khởi Nguyên Cung' }
};

var SUBJECTS_CONFIG = (typeof window !== 'undefined' && window.SUBJECTS_CONFIG) ? window.SUBJECTS_CONFIG : SUBJECTS;

var SUBJECTS_MAP = (typeof window !== 'undefined' && window.SUBJECTS_MAP) ? window.SUBJECTS_MAP : {
    cnxhkh: {
        id: 'cnxhkh',
        name: 'Chủ nghĩa Xã hội Khoa học',
        shortName: 'CNXHKH',
        realmName: 'Khoa Học Chân Lý Đảo',
        folder: 'data/cnxhkh',
        tagline: 'Hiểu đúng lý luận, vững vàng tư tưởng, kiến tạo tương lai.',
        quote: '“Hiểu đúng bản chất, nắm vững phương pháp, để vận dụng sáng tạo vào thực tiễn.”',
        badge: 'Chân Lý Pháp Trận',
        badgeClass: 'badge-cnxhkh',
        icon: 'fa-solid fa-atom',
        bannerArt: 'banner-art.jpg',
        dataFile: 'data-cnxhkh.js',
        dataPathPattern: './data/cnxhkh/chude{id}.json',
        dataLoaderType: 'json',
        topicsCount: 6,
        description: 'Bí cảnh nghiên cứu các quy luật chính trị - xã hội, sứ mệnh lịch sử của giai cấp công nhân và con đường đi lên CNXH.',
        cardGradient: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #0284c7 100%)',
        accentColor: '#2563eb',
        topics: [
            {
                id: 1,
                title: "Chủ đề 1",
                name: "Chủ đề 1: Đối tượng, chức năng, phương pháp nghiên cứu của CNXH khoa học",
                shortTitle: "Đối tượng, chức năng, phương pháp nghiên cứu của CNXH khoa học",
                headerDisplay: "Chủ đề 1: Đối tượng, chức năng, phương pháp nghiên cứu<br>của CNXH khoa học",
                desc: "Nghiên cứu bản chất, chức năng, phương pháp nghiên cứu của chủ nghĩa xã hội khoa học.",
                quote: "Hiểu đúng bản chất, nắm vững phương pháp, để vận dụng sáng tạo vào thực tiễn.",
                icon: "fa-solid fa-book-open",
                themeClass: "card-theme-1"
            },
            {
                id: 2,
                title: "Chủ đề 2",
                name: "Chủ đề 2: Sự ra đời và phát triển của CNXH khoa học",
                shortTitle: "Sự ra đời và phát triển của CNXH khoa học",
                headerDisplay: "Chủ đề 2: Sự ra đời và phát triển<br>của CNXH khoa học",
                desc: "Tìm hiểu quá trình hình thành, phát triển và những điều kiện khách quan, chủ quan của CNXH khoa học.",
                quote: "Nắm vững quy luật phát triển lịch sử để củng cố niềm tin khoa học.",
                icon: "fa-solid fa-chart-line",
                themeClass: "card-theme-2"
            },
            {
                id: 3,
                title: "Chủ đề 3",
                name: "Chủ đề 3: Sứ mệnh lịch sử của giai cấp công nhân",
                shortTitle: "Sứ mệnh lịch sử của giai cấp công nhân",
                headerDisplay: "Chủ đề 3: Sứ mệnh lịch sử<br>của giai cấp công nhân",
                desc: "Làm rõ vai trò, sứ mệnh lịch sử của giai cấp công nhân trong quá trình phát triển xã hội.",
                quote: "Giai cấp tiên phong lãnh đạo cách mạng xã hội chủ nghĩa.",
                icon: "fa-solid fa-users",
                themeClass: "card-theme-3"
            },
            {
                id: 4,
                title: "Chủ đề 4",
                name: "Chủ đề 4: Những đặc trưng cơ bản của CNXH và con đường đi lên CNXH ở Việt Nam",
                shortTitle: "Những đặc trưng cơ bản của CNXH và con đường đi lên CNXH ở Việt Nam",
                headerDisplay: "Chủ đề 4: Những đặc trưng cơ bản của CNXH<br>và con đường đi lên CNXH ở Việt Nam",
                desc: "Nắm vững các đặc trưng cơ bản và con đường đi lên CNXH ở Việt Nam.",
                quote: "Vận dụng sáng tạo chủ nghĩa Mác - Lênin vào thực tiễn Việt Nam.",
                icon: "fa-solid fa-star",
                themeClass: "card-theme-4"
            },
            {
                id: 5,
                title: "Chủ đề 5",
                name: "Chủ đề 5: Các hình thái kinh tế - xã hội",
                shortTitle: "Các hình thái kinh tế - xã hội",
                headerDisplay: "Chủ đề 5: Các hình thái kinh tế - xã hội",
                desc: "Tìm hiểu các hình thái kinh tế - xã hội và sự phát triển của xã hội loài người.",
                quote: "Quy luật vận động và thay thế tất yếu của các hình thái kinh tế - xã hội.",
                icon: "fa-solid fa-gear",
                themeClass: "card-theme-5"
            },
            {
                id: 6,
                title: "Chủ đề 6",
                name: "Chủ đề 6: Thời kỳ quá độ lên CNXH",
                shortTitle: "Thời kỳ quá độ lên CNXH",
                headerDisplay: "Chủ đề 6: Thời kỳ quá độ lên CNXH",
                desc: "Nghiên cứu đặc điểm và nhiệm vụ của thời kỳ quá độ lên chủ nghĩa xã hội ở Việt Nam.",
                quote: "Bước chuyển tất yếu từ xã hội cũ sang xã hội mới văn minh, công bằng.",
                icon: "fa-solid fa-landmark",
                themeClass: "card-theme-6"
            }
        ]
    },
    lsd: {
        id: 'lsd',
        name: 'Lịch sử Đảng Cộng sản Việt Nam',
        shortName: 'Lịch sử Đảng',
        realmName: 'Hồng Kỳ Khởi Nguyên Cung',
        folder: 'data/lsd',
        tagline: 'Sáng ngời lý tưởng cách mạng, tiếp bước tiền nhân, rạng rỡ non sông.',
        quote: '“Ôn cố tri tân, sáng ngời cội nguồn cách mạng, vững bước quang vinh.”',
        badge: 'Hồng Kỳ Trận Pháp',
        badgeClass: 'badge-lsd',
        icon: 'fa-solid fa-flag',
        bannerArt: 'banner-art.jpg',
        dataFile: 'data/lsd/chude{id}.json',
        dataPathPattern: './data/lsd/chude{id}.json',
        dataLoaderType: 'json',
        topicsCount: 6,
        description: 'Bí cảnh lưu giữ các mốc son chói lọi, ngọn cờ dẫn lối toàn dân tộc giành độc lập tự do và tiến hành công cuộc đổi mới vẻ vang.',
        cardGradient: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #b45309 100%)',
        accentColor: '#dc2626',
        topics: [
            {
                id: 1,
                title: "Chủ đề 1",
                name: "Chủ đề 1: Đối tượng, chức năng, nhiệm vụ và phương pháp nghiên cứu Lịch sử Đảng",
                shortTitle: "Đối tượng, chức năng và phương pháp nghiên cứu Lịch sử Đảng",
                headerDisplay: "Chủ đề 1: Đối tượng, chức năng, nhiệm vụ<br>và phương pháp nghiên cứu Lịch sử Đảng",
                desc: "Nhận thức khoa học về đối tượng, chức năng, nhiệm vụ và phương pháp nghiên cứu, học tập Lịch sử Đảng.",
                quote: "Nắm vững phương pháp luận sử học Mác - Lênin để hiểu rõ quy luật lịch sử.",
                icon: "fa-solid fa-book-journal-whills",
                themeClass: "card-theme-1"
            },
            {
                id: 2,
                title: "Chủ đề 2",
                name: "Chủ đề 2: Đảng Cộng sản Việt Nam ra đời và lãnh đạo đấu tranh giành chính quyền (1930 - 1945)",
                shortTitle: "Đảng ra đời và lãnh đạo đấu tranh giành chính quyền (1930 - 1945)",
                headerDisplay: "Chủ đề 2: Đảng Cộng sản Việt Nam ra đời<br>và giành chính quyền (1930 - 1945)",
                desc: "Bối cảnh lịch sử, sự thành lập Đảng và các cao trào cách mạng đỉnh cao Cách mạng Tháng Tám 1945.",
                quote: "Ngọn cờ tiên phong dẫn lối dân tộc thoát khỏi đêm dài nô lệ.",
                icon: "fa-solid fa-fire",
                themeClass: "card-theme-2"
            },
            {
                id: 3,
                title: "Chủ đề 3",
                name: "Chủ đề 3: Đảng lãnh đạo hai cuộc kháng chiến chống xâm lược, thống nhất đất nước (1945 - 1975)",
                shortTitle: "Lãnh đạo hai cuộc kháng chiến chống xâm lược (1945 - 1975)",
                headerDisplay: "Chủ đề 3: Lãnh đạo kháng chiến chống xâm lược,<br>thống nhất đất nước (1945 - 1975)",
                desc: "Đường lối kháng chiến toàn dân, toàn diện, trường kỳ và chiến thắng lịch sử 1954 và 1975.",
                quote: "Ý chí sắt đá không có gì quý hơn độc lập tự do.",
                icon: "fa-solid fa-shield-halved",
                themeClass: "card-theme-3"
            },
            {
                id: 4,
                title: "Chủ đề 4",
                name: "Chủ đề 4: Đảng lãnh đạo cả nước quá độ lên CNXH và tiến hành công cuộc đổi mới (1975 - nay)",
                shortTitle: "Lãnh đạo xây dựng CNXH và công cuộc đổi mới (1975 - nay)",
                headerDisplay: "Chủ đề 4: Lãnh đạo xây dựng CNXH<br>và công cuộc đổi mới (1975 - nay)",
                desc: "Bước chuyển mình vĩ đại của đất nước từ Đại hội VI, đổi mới toàn diện và hội nhập quốc tế.",
                quote: "Nhìn thẳng vào sự thật, đổi mới tư duy, kiến thiết đất nước phồn vinh.",
                icon: "fa-solid fa-monument",
                themeClass: "card-theme-4"
            },
            {
                id: 5,
                title: "Chủ đề 5",
                name: "Chủ đề 5: Những thắng lợi vĩ đại và bài học kinh nghiệm lớn về sự lãnh đạo của Đảng",
                shortTitle: "Thắng lợi vĩ đại và bài học kinh nghiệm lịch sử của Đảng",
                headerDisplay: "Chủ đề 5: Những bài học kinh nghiệm lớn<br>về sự lãnh đạo của Đảng",
                desc: "Tổng kết các mốc son lịch sử chói lọi và các bài học kinh nghiệm cầm quyền quý báu.",
                quote: "Bài học lịch sử là kim chỉ nam soi sáng con đường tương lai.",
                icon: "fa-solid fa-medal",
                themeClass: "card-theme-5"
            },
            {
                id: 6,
                title: "Chủ đề 6",
                name: "Chủ đề 6: Xây dựng, chỉnh đốn Đảng trong sạch, vững mạnh trong kỷ nguyên mới",
                shortTitle: "Xây dựng, chỉnh đốn Đảng trong sạch, vững mạnh",
                headerDisplay: "Chủ đề 6: Xây dựng, chỉnh đốn Đảng<br>trong sạch, vững mạnh trong kỷ nguyên mới",
                desc: "Công tác xây dựng chỉnh đốn Đảng, phòng chống tiêu cực và nâng cao năng lực lãnh đạo cầm quyền.",
                quote: "Đảng là đạo đức, là văn minh, gắn bó mật thiết với nhân dân.",
                icon: "fa-solid fa-star-and-crescent",
                themeClass: "card-theme-6"
            }
        ]
    }
};

/**
 * Trả về mã môn học hiện tại (ưu tiên query param ?subject=, sau đó localStorage)
 * @param {boolean} [fallbackToDefault=false] Nếu true thì mặc định 'cnxhkh' khi không có cờ
 * @returns {string|null}
 */
function getCurrentSubject(fallbackToDefault = false) {
    try {
        if (typeof window !== 'undefined' && window.location && window.location.search) {
            const urlParams = new URLSearchParams(window.location.search);
            const subFromUrl = urlParams.get('subject');
            if (subFromUrl && SUBJECTS_MAP[subFromUrl]) {
                return subFromUrl;
            }
        }
        if (typeof localStorage !== 'undefined') {
            const saved = localStorage.getItem('currentSubject');
            if (saved && SUBJECTS_MAP[saved]) {
                return saved;
            }
        }
    } catch (e) {
        console.warn('Lỗi khi đọc currentSubject:', e);
    }
    return fallbackToDefault ? 'cnxhkh' : null;
}

/**
 * Thiết lập môn học hiện tại vào localStorage
 * @param {string} subjectId 
 */
function setCurrentSubject(subjectId) {
    if (!SUBJECTS_MAP[subjectId]) return;
    localStorage.setItem('currentSubject', subjectId);
}

/**
 * Lấy cấu hình môn học theo ID
 * @param {string} [subjectId] 
 * @returns {Object}
 */
function getSubjectConfig(subjectId) {
    const target = subjectId || getCurrentSubject(true);
    return SUBJECTS_MAP[target] || SUBJECTS_MAP.cnxhkh;
}

/**
 * Lấy danh sách 6 chủ đề của môn học
 * @param {string} [subjectId] 
 * @returns {Array}
 */
function getSubjectTopics(subjectId) {
    const cfg = getSubjectConfig(subjectId);
    return cfg ? cfg.topics : SUBJECTS_MAP.cnxhkh.topics;
}

/**
 * Hiển thị Subject View (6 Chủ đề) của môn học tương ứng
 * @param {string} subjectId - 'cnxhkh' hoặc 'lsd'
 */
function showSubjectView(subjectId) {
    const sub = (subjectId === 'lsd') ? 'lsd' : 'cnxhkh';
    try {
        localStorage.setItem('currentSubject', sub);
    } catch (e) {}
    if (typeof appState !== 'undefined') {
        appState.currentSubject = sub;
    }
    if (typeof setCurrentSubject === 'function') {
        setCurrentSubject(sub);
    }

    const selectEl = document.getElementById('sidebar-subject-select');
    if (selectEl) {
        selectEl.value = sub;
    }

    const homeView = document.getElementById('home-view') || document.getElementById('realm-selection-view');
    if (homeView) {
        homeView.classList.add('hidden');
        homeView.style.display = 'none';
    }

    const subjectView = document.getElementById('subject-view') || document.getElementById('subject-detail-view');
    if (subjectView) {
        subjectView.classList.remove('hidden');
        subjectView.style.display = 'block';
    }

    try {
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('subject', sub);
        window.history.pushState({ subject: sub }, '', newUrl.toString());
    } catch (e) {}

    if (typeof renderTopicsList === 'function') {
        renderTopicsList(sub);
    }
}

/**
 * Xử lý khi thay đổi Dropdown môn học ở Sidebar
 * @param {string} newSubject 
 */
function onSidebarSubjectChange(newSubject) {
    const sub = (newSubject === 'lsd') ? 'lsd' : 'cnxhkh';
    try {
        localStorage.setItem('currentSubject', sub);
    } catch (e) {}
    if (typeof appState !== 'undefined') {
        appState.currentSubject = sub;
    }
    if (typeof setCurrentSubject === 'function') {
        setCurrentSubject(sub);
    }

    if (document.getElementById('practice-body')) {
        window.location.href = `practice.html?subject=${sub}&topic=1&mode=learn`;
        return;
    }

    // Nếu đang ở trang utilities.html
    if (window.location.pathname.includes('utilities.html') || document.getElementById('tab-pane-stats')) {
        try {
            const newUrl = new URL(window.location);
            newUrl.searchParams.set('subject', sub);
            window.history.pushState({ subject: sub }, '', newUrl.toString());
        } catch (e) {}
        if (typeof renderMainSidebar === 'function') {
            renderMainSidebar(sub);
        }
        if (typeof onSubjectSwitchedInUtilities === 'function') {
            onSubjectSwitchedInUtilities(sub);
        }
        return;
    }

    // Nếu đang ở trang admin.html
    if (window.location.pathname.includes('admin.html') || document.getElementById('admin-pane-users')) {
        try {
            const newUrl = new URL(window.location);
            newUrl.searchParams.set('subject', sub);
            window.history.pushState({ subject: sub }, '', newUrl.toString());
        } catch (e) {}
        if (typeof renderMainSidebar === 'function') {
            renderMainSidebar(sub);
        }
        if (typeof updateAdminHeaderSubjectInfo === 'function') {
            updateAdminHeaderSubjectInfo(sub);
        }
        return;
    }

    const homeView = document.getElementById('home-view') || document.getElementById('realm-selection-view');
    const subjectView = document.getElementById('subject-view') || document.getElementById('subject-detail-view');
    if (homeView) {
        homeView.classList.add('hidden');
        homeView.style.display = 'none';
    }
    if (subjectView) {
        subjectView.classList.remove('hidden');
        subjectView.style.display = 'block';
    }

    try {
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('subject', sub);
        window.history.pushState({ subject: sub }, '', newUrl.toString());
    } catch (e) {}

    if (typeof renderTopicsList === 'function') {
        renderTopicsList(sub);
    }
}

/**
 * Trở về Đại Điện Tông Môn (Home View)
 */
function returnToHomeView() {
    const homeView = document.getElementById('home-view') || document.getElementById('realm-selection-view');
    const subjectView = document.getElementById('subject-view') || document.getElementById('subject-detail-view');
    if (subjectView) {
        subjectView.classList.add('hidden');
        subjectView.style.display = 'none';
    }
    if (homeView) {
        homeView.classList.remove('hidden');
        homeView.style.display = 'block';
    }
    try {
        const newUrl = new URL(window.location);
        newUrl.searchParams.delete('subject');
        window.history.pushState({}, '', newUrl.pathname + (newUrl.search ? '?' + newUrl.searchParams.toString() : ''));
    } catch (e) {}

    const curSub = (typeof appState !== 'undefined' && appState.currentSubject) || localStorage.getItem('currentSubject') || 'cnxhkh';
    if (typeof renderMainSidebar === 'function') {
        renderMainSidebar(curSub);
    }
}

/**
 * Render danh sách 6 chủ đề của môn học
 * @param {string} subjectId 
 */
function renderTopicsList(subjectId) {
    const sub = (subjectId === 'lsd') ? 'lsd' : 'cnxhkh';
    const cfg = getSubjectConfig(sub);
    const realmTitle = cfg ? cfg.realmName : (sub === 'lsd' ? 'Hồng Kỳ Khởi Nguyên Cung' : 'Khoa Học Chân Lý Đảo');
    const subName = cfg ? cfg.name : (sub === 'lsd' ? 'Lịch sử Đảng' : 'Chủ nghĩa xã hội khoa học');

    const breadcrumbEl = document.getElementById('subject-breadcrumb-name');
    if (breadcrumbEl) breadcrumbEl.textContent = realmTitle;

    const headingEl = document.getElementById('subject-hero-heading');
    if (headingEl) headingEl.textContent = subName;

    const tagEl = document.getElementById('subject-hero-tag');
    if (tagEl) tagEl.textContent = cfg ? cfg.badge : (sub === 'lsd' ? 'Hồng Kỳ Trận Pháp' : 'Chân Lý Pháp Trận');

    const iconEl = document.getElementById('subject-hero-icon');
    if (iconEl) iconEl.className = (sub === 'lsd') ? 'fa-solid fa-flag' : 'fa-solid fa-atom';

    const secTitle = document.getElementById('subject-section-title');
    if (secTitle) secTitle.textContent = `Danh sách Chủ đề: ${realmTitle}`;

    const topics = getSubjectTopics(sub);
    const grid = document.getElementById('topic-cards-grid');
    if (grid && topics) {
        grid.innerHTML = topics.map(t => `
            <div class="topic-dashboard-card ${t.themeClass || 'card-theme-1'}" id="topic-card-${t.id}" data-topic-id="${t.id}">
                <div class="tdc-top">
                    <div class="tdc-icon-circle bg-theme-${t.id}">
                        <i class="${t.icon}"></i>
                    </div>
                    <div class="tdc-header-text">
                        <span class="tdc-pill-tag tag-theme-${t.id}">${t.title}</span>
                        <h4 class="tdc-title">${t.shortTitle}</h4>
                    </div>
                </div>
                <p class="tdc-desc">${t.desc || t.quote || ''}</p>
                <div class="tdc-bottom">
                    <div class="tdc-progress-group">
                        <div class="tdc-count-info">
                            <i class="fa-regular fa-file-lines"></i>
                            <span id="topic-count-${t.id}">Đang tải...</span>
                        </div>
                        <div class="tdc-progress-bar">
                            <div class="tdc-progress-fill" id="topic-fill-${t.id}" style="width: 0%;"></div>
                        </div>
                        <span class="tdc-progress-percent" id="topic-percent-${t.id}">0%</span>
                    </div>
                    <button class="btn-choose-topic" onclick="openModeSelectModal(${t.id})" title="Vào ôn luyện hoặc kiểm tra">
                        <span>Vào Ôn Luyện</span>
                        <i class="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderMainSidebar(sub);

    if (typeof syncDashboardProgress === 'function') {
        try {
            syncDashboardProgress(sub);
        } catch (e) {}
    }

    if (typeof updateUserActivity === 'function') {
        try {
            updateUserActivity("Đang dạo bước Tông Môn");
        } catch (e) {}
    }
}

/**
 * Render Sidebar hiển thị danh sách 6 chủ đề
 * @param {string} activeSubjectId 
 */
function renderMainSidebar(activeSubjectId) {
    const sidebarTitle = document.getElementById('sidebar-topics-title');
    const navMenu = document.getElementById('topic-nav-menu');
    const subjectSelect = document.getElementById('sidebar-subject-select');
    if (!navMenu) return;

    const sub = activeSubjectId || (typeof getCurrentSubject === 'function' ? getCurrentSubject(true) : 'cnxhkh');
    if (subjectSelect && subjectSelect.value !== sub) {
        subjectSelect.value = sub;
    }

    const cfg = getSubjectConfig(sub);
    const subName = cfg ? (cfg.shortName || cfg.name) : (sub === 'lsd' ? 'Lịch sử Đảng' : 'CNXHKH');

    if (sidebarTitle) {
        sidebarTitle.innerHTML = `CHỦ ĐỀ ÔN LUYỆN: <span style="color: #2563eb;">${subName.toUpperCase()}</span>`;
    }

    const topics = getSubjectTopics(sub);
    if (topics) {
        navMenu.innerHTML = topics.map(t => {
            if (typeof openModeSelectModal === 'function') {
                return `
                    <button type="button" class="nav-topic-item" onclick="openModeSelectModal(${t.id})" title="${t.name}">
                        <i class="${t.icon}"></i>
                        <span>${t.name}</span>
                    </button>
                `;
            } else {
                return `
                    <button type="button" class="nav-topic-item" onclick="window.location.href='practice.html?subject=${encodeURIComponent(sub)}&topic=${t.id}&mode=learn'" title="${t.name}">
                        <i class="${t.icon}"></i>
                        <span>${t.name}</span>
                    </button>
                `;
            }
        }).join('');
    }
}

// Xuất các hàm và đối tượng toàn cục
/**
 * Điều hướng về trang chủ bảo tồn tham số subject
 */
function navigateToHome() {
    const sub = (typeof getCurrentSubject === 'function') ? getCurrentSubject(true) : (localStorage.getItem('currentSubject') || 'cnxhkh');
    window.location.href = `index.html?subject=${encodeURIComponent(sub)}`;
}

/**
 * Điều hướng tới Bí Cảnh Thi Mô Phỏng bảo tồn tham số subject
 */
function navigateToMockExam() {
    const sub = (typeof getCurrentSubject === 'function') ? getCurrentSubject(true) : (localStorage.getItem('currentSubject') || 'cnxhkh');
    window.location.href = `practice.html?subject=${encodeURIComponent(sub)}&topic=mock&mode=test`;
}

/**
 * Điều hướng tới Bảng Xếp Hạng bảo tồn tham số subject
 */
function navigateToLeaderboard() {
    const sub = (typeof getCurrentSubject === 'function') ? getCurrentSubject(true) : (localStorage.getItem('currentSubject') || 'cnxhkh');
    window.location.href = `index.html?subject=${encodeURIComponent(sub)}&openLeaderboard=1`;
}

/**
 * Điều hướng sang phân hệ Tiện Ích bảo tồn tham số subject
 */
function navigateToUtility(tab, e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const sub = (typeof getCurrentSubject === 'function') ? getCurrentSubject(true) : (localStorage.getItem('currentSubject') || 'cnxhkh');
    const validTabs = ['stats', 'history', 'guide', 'feedback'];
    const targetTab = validTabs.includes(tab) ? tab : (tab === 'contact' ? 'feedback' : 'stats');
    
    if (window.location.pathname.includes('utilities.html') || document.getElementById('tab-pane-stats')) {
        if (typeof switchUtilityTab === 'function') {
            switchUtilityTab(targetTab);
            return;
        }
    }
    window.location.href = `utilities.html?subject=${encodeURIComponent(sub)}&tab=${encodeURIComponent(targetTab)}`;
}

/**
 * Điều hướng sang phân hệ Quản Trị (admin.html) bảo tồn tham số subject
 */
function navigateToAdmin(tab, e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const sub = (typeof getCurrentSubject === 'function') ? getCurrentSubject(true) : (localStorage.getItem('currentSubject') || 'cnxhkh');
    const targetTab = (tab === 'feedbacks') ? 'feedbacks' : 'users';
    
    if (window.location.pathname.includes('admin.html')) {
        if (typeof switchAdminMainTab === 'function') {
            switchAdminMainTab(targetTab);
            return;
        }
    }
    window.location.href = `admin.html?subject=${encodeURIComponent(sub)}&tab=${encodeURIComponent(targetTab)}`;
}

if (typeof window !== 'undefined') {
    window.SUBJECTS = SUBJECTS;
    window.SUBJECTS_CONFIG = SUBJECTS_CONFIG;
    window.SUBJECTS_MAP = SUBJECTS_MAP;
    window.getCurrentSubject = getCurrentSubject;
    window.setCurrentSubject = setCurrentSubject;
    window.getSubjectConfig = getSubjectConfig;
    window.getSubjectTopics = getSubjectTopics;
    window.showSubjectView = showSubjectView;
    window.enterSubject = showSubjectView;
    window.renderSubjectView = showSubjectView;
    window.onSidebarSubjectChange = onSidebarSubjectChange;
    window.switchSubjectFromSidebar = onSidebarSubjectChange;
    window.returnToHomeView = returnToHomeView;
    window.exitToPalace = returnToHomeView;
    window.renderPalaceView = returnToHomeView;
    window.renderTopicsList = renderTopicsList;
    window.renderSubjectTopicCards = renderTopicsList;
    window.renderMainSidebar = renderMainSidebar;
    window.navigateToHome = navigateToHome;
    window.navigateToMockExam = navigateToMockExam;
    window.navigateToLeaderboard = navigateToLeaderboard;
    window.navigateToUtility = navigateToUtility;
    window.navigateToAdmin = navigateToAdmin;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SUBJECTS,
        SUBJECTS_CONFIG,
        SUBJECTS_MAP,
        getCurrentSubject,
        setCurrentSubject,
        getSubjectConfig,
        getSubjectTopics,
        showSubjectView,
        onSidebarSubjectChange,
        returnToHomeView,
        renderTopicsList,
        renderMainSidebar,
        navigateToHome,
        navigateToMockExam,
        navigateToLeaderboard,
        navigateToUtility,
        navigateToAdmin
    };
}
