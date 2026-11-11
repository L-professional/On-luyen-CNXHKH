/**
 * ============================================================================
 * SUBJECTS CONFIGURATION (config.js)
 * Định nghĩa cấu hình thư mục dữ liệu và định danh các môn học trong hệ thống
 * ============================================================================
 */

var SUBJECTS = (typeof window !== 'undefined' && window.SUBJECTS) ? window.SUBJECTS : {
    'cnxhkh': {
        id: 'cnxhkh',
        name: 'Chủ nghĩa Xã hội Khoa học',
        shortName: 'CNXHKH',
        folder: 'data/cnxhkh',
        realmName: 'Khoa Học Chân Lý Đảo'
    },
    'lsd': {
        id: 'lsd',
        name: 'Lịch sử Đảng',
        shortName: 'Lịch sử Đảng',
        folder: 'data/lsd',
        realmName: 'Hồng Kỳ Khởi Nguyên Cung'
    }
};

var SUBJECTS_CONFIG = (typeof window !== 'undefined' && window.SUBJECTS_CONFIG) ? window.SUBJECTS_CONFIG : SUBJECTS;

// Xuất toàn cục để sử dụng trên toàn hệ thống
if (typeof window !== 'undefined') {
    window.SUBJECTS = SUBJECTS;
    window.SUBJECTS_CONFIG = SUBJECTS_CONFIG;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SUBJECTS, SUBJECTS_CONFIG };
}
