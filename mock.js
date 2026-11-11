/**
 * ============================================================================
 * MOCK EXAM ACTIVITY TRACKER & LOADER (mock.js)
 * Quản lý hoạt động người dùng trong chế độ Thi thử mô phỏng (Vượt Bí Cảnh)
 * Tích hợp hệ thống Đa Môn Phái: tự động nhận diện currentSubject
 * ============================================================================
 */

/**
 * Trả về mã môn học hiện tại trong ngữ cảnh Thi mô phỏng
 */
function getCurrentMockSubject() {
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
 * Gom toàn bộ câu hỏi của tất cả các chủ đề thuộc môn học để tạo đề thi mô phỏng
 * @param {string} subjectId Mã môn học ('cnxhkh' | 'lsd')
 * @returns {Promise<Array>} Mảng câu hỏi tổng hợp
 */
async function loadMockQuestionsForSubject(subjectId) {
    const sub = subjectId || getCurrentMockSubject();
    let allQuestions = [];

    // Nạp động từ thư mục namespacing: ./data/${sub}/chude${i}.json
    for (let i = 1; i <= 6; i++) {
        const topicNum = i;
        const dynamicUrl = `./data/${sub}/chude${topicNum}.json`;
        let loaded = false;

        try {
            const res = await fetch(dynamicUrl);
            if (res.ok) {
                const data = await res.json();
                const grouped = (typeof groupQuestions === 'function' ? groupQuestions(data) : data).map(q => ({
                    ...q,
                    id: `${sub}_cd${topicNum}_${q.id}`,
                    origId: q.id,
                    sourceTopic: topicNum
                }));
                allQuestions = allQuestions.concat(grouped);
                loaded = true;
            }
        } catch (e) {
            console.warn(`Lỗi đọc file ${dynamicUrl}:`, e);
        }

        // Fallback dự phòng nếu chạy ở môi trường file:// không hỗ trợ fetch
        if (!loaded && sub === 'lsd' && window.DATA_LSD && window.DATA_LSD[topicNum]) {
            const rawList = window.DATA_LSD[topicNum];
            const grouped = (typeof groupQuestions === 'function' ? groupQuestions(rawList) : rawList).map(q => ({
                ...q,
                id: `lsd_cd${topicNum}_${q.id}`,
                origId: q.id,
                sourceTopic: topicNum
            }));
            allQuestions = allQuestions.concat(grouped);
        }
    }

    return allQuestions;
}

/**
 * Phát sóng thông tin câu hỏi trong chế độ Thi thử
 * @param {number} currentQuestionIndex Vị trí câu hỏi hiện tại (0-indexed)
 * @param {number} totalQuestions Tổng số câu hỏi
 * @param {string} [topicId]
 * @param {string} [subjectId]
 */
function broadcastMockActivity(currentQuestionIndex, totalQuestions, topicId, subjectId) {
    const sub = subjectId || getCurrentMockSubject();
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
    let activityStr = `Đang vượt Bí Cảnh${subName} (Câu ${questionNum}/${total})`;

    if (topicId && topicId !== 'mock') {
        if (topicId === 'tam-ma') {
            activityStr = `Đang vượt Bí Cảnh Trảm Tâm Ma (Câu ${questionNum}/${total})`;
        } else {
            activityStr = `Đang vượt Bí Cảnh${subName}: Chủ đề ${topicId} (Câu ${questionNum}/${total})`;
        }
    }

    if (typeof updateUserActivity === 'function') {
        updateUserActivity(activityStr);
    } else if (window.FirebaseService && typeof window.FirebaseService.updateUserActivity === 'function') {
        window.FirebaseService.updateUserActivity(activityStr);
    }
}

/**
 * Reset về trạng thái chờ khi thoát khỏi bài thi thử
 */
function resetMockActivity() {
    const waitStr = "Trạng thái chờ";
    if (typeof updateUserActivity === 'function') {
        updateUserActivity(waitStr);
    } else if (window.FirebaseService && typeof window.FirebaseService.updateUserActivity === 'function') {
        window.FirebaseService.updateUserActivity(waitStr);
    }
}

// Xuất hàm toàn cục
window.getCurrentMockSubject = getCurrentMockSubject;
window.loadMockQuestionsForSubject = loadMockQuestionsForSubject;
window.broadcastMockActivity = broadcastMockActivity;
window.resetMockActivity = resetMockActivity;

if (typeof window !== 'undefined') {
    if (typeof window.openMockSubjectModal === 'undefined' && typeof openMockSubjectModal === 'function') {
        window.openMockSubjectModal = openMockSubjectModal;
    }
    if (typeof window.startMockExam === 'undefined' && typeof startMockExam === 'function') {
        window.startMockExam = startMockExam;
    }
}
