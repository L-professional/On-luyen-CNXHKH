/**
 * ============================================================================
 * PRACTICE ACTIVITY TRACKER & LOADER (practice.js)
 * Quản lý hoạt động người dùng trong chế độ Ôn luyện (Luyện khí)
 * Tích hợp hệ thống Đa Môn Phái: tự động nhận diện currentSubject
 * ============================================================================
 */

/**
 * Trả về mã môn học hiện tại trong ngữ cảnh Ôn luyện
 */
function getCurrentPracticeSubject() {
    if (typeof getCurrentSubject === 'function') {
        return getCurrentSubject(true);
    }
    try {
        if (typeof window !== 'undefined' && window.location && window.location.search) {
            const urlParams = new URLSearchParams(window.location.search);
            const sub = urlParams.get('subject');
            if (sub) return sub;
        }
        if (typeof localStorage !== 'undefined') {
            const saved = localStorage.getItem('currentSubject');
            if (saved) return saved;
        }
    } catch (e) {}
    return 'cnxhkh';
}

/**
 * Nạp mảng câu hỏi ôn tập theo môn học và chủ đề
 * @param {string} subjectId Mã môn học ('cnxhkh' | 'lsd')
 * @param {number|string} topicId Mã chủ đề (1..6)
 * @returns {Promise<Array>} Mảng câu hỏi thô
 */
async function loadPracticeQuestionsForSubject(subjectId, topicId) {
    const sub = subjectId || getCurrentPracticeSubject();
    const tid = parseInt(topicId, 10) || 1;

    try {
        // Nạp động từ thư mục namespacing: ./data/${sub}/chude${tid}.json
        const res = await fetch(`./data/${sub}/chude${tid}.json`);
        if (res.ok) {
            return await res.json();
        }
    } catch (e) {
        console.warn(`Lỗi fetch ./data/${sub}/chude${tid}.json:`, e);
    }

    // Fallback dự phòng nếu chạy ở môi trường file:// không hỗ trợ fetch
    if (sub === 'lsd' && window.DATA_LSD && window.DATA_LSD[tid]) {
        return JSON.parse(JSON.stringify(window.DATA_LSD[tid]));
    }
    return [];
}

/**
 * Phát sóng thông tin câu hỏi trong chế độ Ôn tập
 * @param {string|number} topicId Mã chủ đề ôn tập
 * @param {number} currentQuestionIndex Vị trí câu hỏi hiện tại (0-indexed)
 * @param {number} totalQuestions Tổng số câu hỏi
 * @param {string} [subjectId] Mã môn học tùy chọn
 */
function broadcastPracticeActivity(topicId, currentQuestionIndex, totalQuestions, subjectId) {
    const sub = subjectId || getCurrentPracticeSubject();
    let subName = '';
    if (typeof getSubjectConfig === 'function') {
        const cfg = getSubjectConfig(sub);
        subName = cfg ? ` [${cfg.shortName || cfg.realmName}]` : '';
    } else if (sub === 'lsd') {
        subName = ' [Lịch sử Đảng]';
    } else {
        subName = ' [CNXHKH]';
    }

    const questionNum = (currentQuestionIndex !== undefined ? currentQuestionIndex : 0) + 1;
    const total = totalQuestions || 0;
    const activityStr = `Đang luyện khí${subName}: Chủ đề ${topicId} (Câu ${questionNum}/${total})`;

    if (typeof updateUserActivity === 'function') {
        updateUserActivity(activityStr);
    } else if (window.FirebaseService && typeof window.FirebaseService.updateUserActivity === 'function') {
        window.FirebaseService.updateUserActivity(activityStr);
    }
}

/**
 * Reset về trạng thái chờ khi thoát khỏi bài ôn tập
 */
function resetPracticeActivity() {
    const waitStr = "Trạng thái chờ";
    if (typeof updateUserActivity === 'function') {
        updateUserActivity(waitStr);
    } else if (window.FirebaseService && typeof window.FirebaseService.updateUserActivity === 'function') {
        window.FirebaseService.updateUserActivity(waitStr);
    }
}

// Xuất hàm toàn cục
window.getCurrentPracticeSubject = getCurrentPracticeSubject;
window.loadPracticeQuestionsForSubject = loadPracticeQuestionsForSubject;
window.broadcastPracticeActivity = broadcastPracticeActivity;
window.resetPracticeActivity = resetPracticeActivity;
