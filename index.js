/**
 * ============================================================================
 * INDEX / DASHBOARD ACTIVITY TRACKER (index.js)
 * Quản lý hoạt động người dùng tại Trang chủ Tông Môn (Trận Pháp Truy Vết)
 * ============================================================================
 */

/**
 * Phát sóng trạng thái đang hoạt động ở Trang chủ Tông Môn
 */
function broadcastHomeActivity() {
    if (typeof updateUserActivity === 'function') {
        updateUserActivity("Đang dạo bước Tông Môn");
    } else if (window.FirebaseService && typeof window.FirebaseService.updateUserActivity === 'function') {
        window.FirebaseService.updateUserActivity("Đang dạo bước Tông Môn");
    }
}

// Tự động phát sóng trạng thái khi mở Trang chủ (index.html)
document.addEventListener('DOMContentLoaded', () => {
    // Chỉ kích hoạt nếu đang ở trang chủ (không phải practice, admin, utilities, login)
    const isPractice = !!document.getElementById('practice-body');
    const isAdmin = !!document.getElementById('admin-pane-users');
    const isUtil = !!document.getElementById('util-tab-stats');
    const isLogin = !!document.getElementById('login-form');

    if (!isPractice && !isAdmin && !isUtil && !isLogin) {
        setTimeout(() => {
            broadcastHomeActivity();
        }, 300);
    }
});

// Xuất hàm toàn cục
window.broadcastHomeActivity = broadcastHomeActivity;
