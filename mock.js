/**
 * ============================================================================
 * MOCK EXAM ACTIVITY TRACKER (mock.js)
 * Quản lý hoạt động người dùng trong chế độ Thi thử mô phỏng (Vượt Bí Cảnh)
 * ============================================================================
 */

/**
 * Phát sóng thông tin câu hỏi trong chế độ Thi thử
 * @param {number} currentQuestionIndex Vị trí câu hỏi hiện tại (0-indexed)
 * @param {number} totalQuestions Tổng số câu hỏi
 * @param {string} [topicId]
 */
function broadcastMockActivity(currentQuestionIndex, totalQuestions, topicId) {
    const questionNum = (currentQuestionIndex !== undefined ? currentQuestionIndex : 0) + 1;
    const total = totalQuestions || 0;
    let activityStr = `Đang vượt Bí Cảnh (Câu ${questionNum}/${total})`;

    if (topicId && topicId !== 'mock') {
        if (topicId === 'tam-ma') {
            activityStr = `Đang vượt Bí Cảnh Trảm Tâm Ma (Câu ${questionNum}/${total})`;
        } else {
            activityStr = `Đang vượt Bí Cảnh: Chủ đề ${topicId} (Câu ${questionNum}/${total})`;
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
window.broadcastMockActivity = broadcastMockActivity;
window.resetMockActivity = resetMockActivity;
