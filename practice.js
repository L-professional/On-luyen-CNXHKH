/**
 * ============================================================================
 * PRACTICE ACTIVITY TRACKER (practice.js)
 * Quản lý hoạt động người dùng trong chế độ Ôn luyện (Luyện khí)
 * ============================================================================
 */

/**
 * Phát sóng thông tin câu hỏi trong chế độ Ôn tập
 * @param {string|number} topicId Mã chủ đề ôn tập
 * @param {number} currentQuestionIndex Vị trí câu hỏi hiện tại (0-indexed)
 * @param {number} totalQuestions Tổng số câu hỏi
 */
function broadcastPracticeActivity(topicId, currentQuestionIndex, totalQuestions) {
    const questionNum = (currentQuestionIndex !== undefined ? currentQuestionIndex : 0) + 1;
    const total = totalQuestions || 0;
    const activityStr = `Đang luyện khí: Chủ đề ${topicId} (Câu ${questionNum}/${total})`;

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
window.broadcastPracticeActivity = broadcastPracticeActivity;
window.resetPracticeActivity = resetPracticeActivity;
