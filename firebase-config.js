/**
 * ============================================================================
 * FIREBASE CONFIGURATION & SERVICE (firebase-config.js)
 * Cấu hình kết nối Firebase Realtime Database & Hệ thống dịch vụ dữ liệu tập trung
 * ============================================================================
 */

// 1. Cấu hình Firebase Project
// HƯỚNG DẪN: Thay thế các thông số bên dưới bằng cấu hình từ Firebase Console của bạn
// (Firebase Console -> Project Settings -> General -> Your apps -> Web app)
const firebaseConfig = {
    apiKey: "AIzaSyDPkQvvhq2xaH82tZ3vNdoZ_sN7fcLIdlA",
    authDomain: "on-luyen-cnxhkh.firebaseapp.com",
    databaseURL: "https://on-luyen-cnxhkh-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "on-luyen-cnxhkh",
    storageBucket: "on-luyen-cnxhkh.firebasestorage.app",
    messagingSenderId: "311720132544",
    appId: "1:311720132544:web:7edb2d0946e575475ad225",
    measurementId: "G-2CG5RFPCWY"
};

// Khởi tạo Firebase SDK
let fbApp = null;
let fbDb = null;
let isFirebaseReady = false;

try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            fbApp = firebase.initializeApp(firebaseConfig);
        } else {
            fbApp = firebase.app();
        }
        fbDb = firebase.database();
        isFirebaseReady = true;
        console.log('[Firebase] Đã khởi tạo Firebase Realtime Database thành công.');
    } else {
        console.warn('[Firebase] Thư viện Firebase SDK chưa được tải qua thẻ <script>. Sẽ sử dụng chế độ lưu dự phòng.');
    }
} catch (err) {
    console.warn('[Firebase] Khởi tạo Firebase gặp sự cố (sử dụng chế độ fallback):', err.message);
}

// 2. Xuất các hàm Modular API theo yêu cầu kỹ thuật: ref, set, get, update, remove
window.db = fbDb;

window.ref = function (dbInstance, path) {
    const targetDb = dbInstance || fbDb;
    if (targetDb && typeof targetDb.ref === 'function') {
        return targetDb.ref(path);
    }
    return { _mockPath: path };
};

window.child = function (parentRef, path) {
    if (parentRef && typeof parentRef.child === 'function') {
        return parentRef.child(path);
    }
    const basePath = parentRef ? (parentRef._mockPath || parentRef.key || '') : '';
    const fullPath = basePath ? `${basePath.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}` : path;
    return window.ref(fbDb, fullPath);
};

window.set = async function (refObj, data) {
    if (refObj && typeof refObj.set === 'function') {
        return await refObj.set(data);
    }
    // Fallback lưu trữ
    return FirebaseFallback.set(refObj ? refObj._mockPath : '', data);
};

window.get = async function (refObj) {
    if (refObj && typeof refObj.once === 'function') {
        return await refObj.once('value');
    }
    return FirebaseFallback.get(refObj ? refObj._mockPath : '');
};

window.update = async function (refObj, data) {
    if (refObj && typeof refObj.update === 'function') {
        return await refObj.update(data);
    }
    return FirebaseFallback.update(refObj ? refObj._mockPath : '', data);
};

window.remove = async function (refObj) {
    if (refObj && typeof refObj.remove === 'function') {
        return await refObj.remove();
    }
    return FirebaseFallback.remove(refObj ? refObj._mockPath : '');
};

window.onValue = function (refObj, callback) {
    if (refObj && typeof refObj.on === 'function') {
        return refObj.on('value', callback);
    }
    return FirebaseFallback.onValue(refObj ? refObj._mockPath : '', callback);
};

window.onDisconnect = function (refObj) {
    if (refObj && typeof refObj.onDisconnect === 'function') {
        return refObj.onDisconnect();
    }
    return { set: () => Promise.resolve() };
};

// ============================================================================
// 3. HỆ THỐNG MOCK / FALLBACK DỰ PHÒNG KHI CHƯA ĐIỀN API KEY HOẶC MẤT MẠNG
// ============================================================================
const FirebaseFallback = {
    _getDb() {
        try {
            return JSON.parse(localStorage.getItem('__fb_local_db__') || '{}');
        } catch (e) {
            return {};
        }
    },
    _saveDb(data) {
        try {
            localStorage.setItem('__fb_local_db__', JSON.stringify(data));
        } catch (e) { }
    },
    _resolvePath(obj, path, create = false) {
        if (!path) return obj;
        const parts = path.split('/').filter(Boolean);
        let curr = obj;
        for (let i = 0; i < parts.length; i++) {
            const p = parts[i];
            if (create && (curr[p] === undefined || curr[p] === null || typeof curr[p] !== 'object')) {
                curr[p] = {};
            }
            if (i === parts.length - 1) return { parent: curr, key: p };
            curr = curr[p];
            if (!curr) return null;
        }
        return { parent: curr, key: '' };
    },
    async set(path, data) {
        const dbData = this._getDb();
        const parts = path.split('/').filter(Boolean);
        if (parts.length === 0) return;
        let curr = dbData;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!curr[parts[i]] || typeof curr[parts[i]] !== 'object') curr[parts[i]] = {};
            curr = curr[parts[i]];
        }
        curr[parts[parts.length - 1]] = JSON.parse(JSON.stringify(data));
        this._saveDb(dbData);
        window.dispatchEvent(new CustomEvent('fb_fallback_change', { detail: { path } }));
    },
    async get(path) {
        const dbData = this._getDb();
        const parts = path.split('/').filter(Boolean);
        let curr = dbData;
        for (const p of parts) {
            if (curr === undefined || curr === null) break;
            curr = curr[p];
        }
        return {
            val: () => (curr !== undefined ? JSON.parse(JSON.stringify(curr)) : null),
            exists: () => curr !== undefined && curr !== null
        };
    },
    async update(path, data) {
        const snap = await this.get(path);
        const curr = snap.val() || {};
        const updated = Object.assign({}, curr, data);
        await this.set(path, updated);
    },
    async remove(path) {
        const dbData = this._getDb();
        const resolved = this._resolvePath(dbData, path);
        if (resolved && resolved.parent) {
            delete resolved.parent[resolved.key];
            this._saveDb(dbData);
            window.dispatchEvent(new CustomEvent('fb_fallback_change', { detail: { path } }));
        }
    },
    onValue(path, callback) {
        this.get(path).then(snap => callback(snap));
        const handler = (e) => {
            if (!path || e.detail.path.startsWith(path) || path.startsWith(e.detail.path)) {
                this.get(path).then(snap => callback(snap));
            }
        };
        window.addEventListener('fb_fallback_change', handler);
        return () => window.removeEventListener('fb_fallback_change', handler);
    }
};

// ============================================================================
// 4. FIREBASE SERVICE - LỚP DỊCH VỤ TRỪU TƯỢNG HÓA THAO TÁC CƠ SỞ DỮ LIỆU
// ============================================================================
const DEFAULT_ROOT_USERS = [
    {
        userId: 'u_admin_root_2026',
        username: 'Admin',
        password: 'Loclsct2006',
        role: 'admin',
        createdAt: '08/10/2026',
        isRoot: true,
        status: 'offline',
        lastActive: Date.now(),
        activeSession: null,
        exp: 200
    }
];

const FirebaseService = {
    /**
     * Tạo UID duy nhất cho người dùng mới
     */
    generateUID() {
        return 'u_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    },

    /**
     * Khởi tạo dữ liệu người dùng ban đầu nếu Firebase rỗng
     */
    async ensureInitialData() {
        try {
            const snap = await get(ref(db, 'users'));
            if (!snap || !snap.exists() || !snap.val()) {
                const seedMap = {};
                DEFAULT_ROOT_USERS.forEach(u => {
                    seedMap[u.userId] = u;
                });
                await set(ref(db, 'users'), seedMap);
                console.log('[Firebase] Đã khởi tạo tài khoản quản trị mặc định lên Firebase.');
            }
        } catch (e) {
            console.warn('[Firebase] Lỗi khởi tạo dữ liệu mặc định:', e);
        }
    },

    /**
     * Lấy toàn bộ danh sách người dùng dưới dạng mảng từ Firebase Realtime Database
     * @returns {Promise<Array>}
     */
    async getAllUsers() {
        try {
            await this.ensureInitialData();
            const snap = await get(ref(db, 'users'));
            if (!snap || !snap.exists()) return [];
            const data = snap.val();
            if (!data || typeof data !== 'object') return [];
            return Object.keys(data).map(uid => ({
                ...data[uid],
                userId: uid
            }));
        } catch (e) {
            console.warn('[Firebase] getAllUsers error:', e);
            return [];
        }
    },

    /**
     * Lấy dữ liệu 1 người dùng theo userId
     * @param {string} userId
     * @returns {Promise<Object|null>}
     */
    async getUserById(userId) {
        if (!userId) return null;
        try {
            const snap = await get(ref(db, `users/${userId}`));
            if (snap && snap.exists()) {
                const u = snap.val();
                return { ...u, userId };
            }
            return null;
        } catch (e) {
            console.warn('[Firebase] getUserById error:', e);
            return null;
        }
    },

    /**
     * Tìm người dùng theo username (không phân biệt hoa thường)
     * @param {string} username
     * @returns {Promise<Object|null>}
     */
    async findUserByUsername(username) {
        if (!username) return null;
        const users = await this.getAllUsers();
        const lower = username.toLowerCase().trim();
        return users.find(u => u.username && u.username.toLowerCase().trim() === lower) || null;
    },

    /**
     * Đăng ký tài khoản mới: tạo userId (UID) duy nhất làm key gốc
     * @param {Object} userData { username, password, role }
     * @returns {Promise<Object>} user đã tạo
     */
    async registerUser({ username, password, role = 'user' }) {
        const cleanName = username.trim();
        const existed = await this.findUserByUsername(cleanName);
        if (existed) {
            throw new Error(`Tên đăng nhập "${cleanName}" đã tồn tại trên hệ thống!`);
        }

        const userId = this.generateUID();
        const today = new Date();
        const dateFormatted = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

        const newUser = {
            userId: userId,
            username: cleanName,
            password: password,
            role: role,
            createdAt: dateFormatted,
            isRoot: false,
            status: 'offline',
            lastActive: Date.now(),
            activeSession: null,
            exp: 0,
            progress: {},
            maxProgress: {},
            history: []
        };

        await set(ref(db, `users/${userId}`), newUser);
        return newUser;
    },

    /**
     * Cập nhật thông tin người dùng
     * @param {string} userId
     * @param {Object} partialData
     */
    async updateUser(userId, partialData) {
        if (!userId) return;
        try {
            await update(ref(db, `users/${userId}`), partialData);
        } catch (e) {
            console.warn('[Firebase] updateUser error:', e);
        }
    },

    /**
     * Đổi tên người dùng (Task 3: Giữ nguyên UID và toàn bộ dữ liệu lịch sử/điểm số)
     * @param {string} userId UID của người dùng
     * @param {string} newUsername Tên mới cần đổi
     */
    async changeUsername(userId, newUsername) {
        if (!userId) throw new Error('userId không hợp lệ!');
        const cleanName = (newUsername || '').trim();
        if (!cleanName) throw new Error('Tên đăng nhập không được để trống!');
        if (/\s/.test(cleanName)) throw new Error('Tên đăng nhập không được chứa khoảng trắng!');

        // Kiểm tra xem tên mới có bị trùng với tài khoản khác không
        const allUsers = await this.getAllUsers();
        const isDuplicate = allUsers.some(u =>
            u.userId !== userId &&
            u.username &&
            u.username.toLowerCase().trim() === cleanName.toLowerCase()
        );
        if (isDuplicate) {
            throw new Error(`Tên đăng nhập "${cleanName}" đã được sử dụng bởi một học viên khác!`);
        }

        // Cập nhật thuộc tính username trong UID đó trên Firebase
        await update(ref(db, `users/${userId}`), {
            username: cleanName,
            lastActive: Date.now()
        });

        // Nếu tài khoản đang đổi chính là tài khoản đang đăng nhập trên máy hiện tại -> cập nhật session
        const currentSession = this.getCurrentSession();
        if (currentSession && currentSession.userId === userId) {
            currentSession.username = cleanName;
            this.saveCurrentSession(currentSession);
        }

        return cleanName;
    },

    /**
     * Xóa tài khoản người dùng
     * @param {string} userId
     */
    async deleteUser(userId) {
        if (!userId) return;
        const target = await this.getUserById(userId);
        if (target && target.isRoot) {
            throw new Error('Không thể xóa tài khoản Root Admin!');
        }
        await remove(ref(db, `users/${userId}`));
    },

    /**
     * Cập nhật trạng thái hoạt động Online / Offline & lastActive (Task 2)
     * @param {string} userId
     * @param {'online'|'offline'} status
     * @param {boolean} [useBeacon=false] Dùng sendBeacon khi beforeunload nếu khả dụng
     */
    async updateUserStatus(userId, status = 'online', useBeacon = false) {
        if (!userId) return;
        const now = Date.now();
        const payload = {
            status: status,
            lastActive: now
        };

        try {
            await update(ref(db, `users/${userId}`), payload);
        } catch (e) {
            console.warn('[Firebase] updateUserStatus error:', e);
        }
    },

    /**
     * Thiết lập theo dõi trạng thái hiện diện (Presence Tracking) cho người dùng
     * @param {string} userId
     */
    setupPresence(userId) {
        if (!userId) return;

        // 1. Cập nhật online ngay khi vào ứng dụng
        this.updateUserStatus(userId, 'online');

        // 2. Lắng nghe các tương tác (click, phím, cuộn) để duy trì online & cập nhật lastActive
        let lastThrottle = 0;
        const onActivity = () => {
            const now = Date.now();
            if (now - lastThrottle > 20000) { // Cập nhật nhịp tim mỗi 20 giây
                lastThrottle = now;
                this.updateUserStatus(userId, 'online');
            }
        };
        window.addEventListener('click', onActivity, { passive: true });
        window.addEventListener('keydown', onActivity, { passive: true });
        window.addEventListener('scroll', onActivity, { passive: true });

        // 3. Sử dụng onDisconnect của Firebase để chuyển status sang offline khi mất kết nối đột ngột
        try {
            if (fbDb && typeof fbDb.ref === 'function') {
                const statusRef = fbDb.ref(`users/${userId}/status`);
                const lastActiveRef = fbDb.ref(`users/${userId}/lastActive`);
                statusRef.onDisconnect().set('offline');
                lastActiveRef.onDisconnect().set(Date.now());
            }
        } catch (e) {
            console.warn('[Firebase] onDisconnect setup:', e);
        }

        // 4. Bắt sự kiện beforeunload khi tắt trình duyệt / tab -> chuyển status = 'offline'
        window.addEventListener('beforeunload', () => {
            this.updateUserStatus(userId, 'offline', true);
        });
    },

    /**
     * Quản lý phiên đăng nhập hiện tại trên thiết bị (Local Session)
     */
    getCurrentSession() {
        try {
            const str = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
            if (!str) return null;
            return JSON.parse(str);
        } catch (e) {
            return null;
        }
    },

    saveCurrentSession(sessionData, rememberMe = true) {
        if (!sessionData) return;
        const str = JSON.stringify(sessionData);
        if (rememberMe) {
            localStorage.setItem('currentUser', str);
            sessionStorage.removeItem('currentUser');
        } else {
            sessionStorage.setItem('currentUser', str);
            localStorage.removeItem('currentUser');
        }
    },

    clearCurrentSession() {
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentUser');
    },

    /**
     * Lưu tiến trình học vào Firebase: users/{userId}/progress/{topicId}
     */
    async saveProgress(userId, topicId, data) {
        if (!userId || !topicId || topicId === 'mock') return;
        try {
            await set(ref(db, `users/${userId}/progress/${topicId}`), data);
        } catch (e) {
            console.warn('[Firebase] saveProgress error:', e);
        }
    },

    /**
     * Tải tiến trình học từ Firebase: users/{userId}/progress/{topicId}
     */
    async loadProgress(userId, topicId) {
        if (!userId || !topicId || topicId === 'mock') return null;
        try {
            const snap = await get(ref(db, `users/${userId}/progress/${topicId}`));
            return snap && snap.exists() ? snap.val() : null;
        } catch (e) {
            console.warn('[Firebase] loadProgress error:', e);
            return null;
        }
    },

    /**
     * Lưu tiến độ cao nhất (%): users/{userId}/maxProgress/{topicId}
     */
    async saveMaxProgress(userId, topicId, percent) {
        if (!userId || !topicId) return;
        try {
            await set(ref(db, `users/${userId}/maxProgress/${topicId}`), percent);
        } catch (e) {
            console.warn('[Firebase] saveMaxProgress error:', e);
        }
    },

    /**
     * Đọc tiến độ cao nhất (%): users/{userId}/maxProgress/{topicId}
     */
    async getMaxProgress(userId, topicId) {
        if (!userId || !topicId) return 0;
        try {
            const snap = await get(ref(db, `users/${userId}/maxProgress/${topicId}`));
            return snap && snap.exists() ? (parseInt(snap.val(), 10) || 0) : 0;
        } catch (e) {
            return 0;
        }
    },

    /**
     * Lưu tổng điểm EXP: users/{userId}/exp
     */
    async saveExp(userId, exp) {
        if (!userId) return;
        try {
            await set(ref(db, `users/${userId}/exp`), Math.max(0, parseInt(exp, 10) || 0));
        } catch (e) {
            console.warn('[Firebase] saveExp error:', e);
        }
    },

    /**
     * Đọc tổng điểm EXP: users/{userId}/exp
     */
    async getExp(userId) {
        if (!userId) return 0;
        try {
            const snap = await get(ref(db, `users/${userId}/exp`));
            return snap && snap.exists() ? (parseInt(snap.val(), 10) || 0) : 0;
        } catch (e) {
            return 0;
        }
    },

    /**
     * Lưu bài thi vào lịch sử: users/{userId}/history
     */
    async addHistory(userId, historyItem) {
        if (!userId) return;
        try {
            const snap = await get(ref(db, `users/${userId}/history`));
            let list = (snap && snap.exists() && Array.isArray(snap.val())) ? snap.val() : [];
            list.unshift(historyItem);
            if (list.length > 50) list = list.slice(0, 50); // Lưu tối đa 50 bài gần nhất
            await set(ref(db, `users/${userId}/history`), list);
        } catch (e) {
            console.warn('[Firebase] addHistory error:', e);
        }
    },

    /**
     * Đọc lịch sử làm bài: users/{userId}/history
     */
    async getHistory(userId) {
        if (!userId) return [];
        try {
            const snap = await get(ref(db, `users/${userId}/history`));
            return (snap && snap.exists() && Array.isArray(snap.val())) ? snap.val() : [];
        } catch (e) {
            return [];
        }
    },

    /**
     * Xóa toàn bộ lịch sử làm bài: users/{userId}/history
     */
    async clearHistory(userId) {
        if (!userId) return;
        try {
            await set(ref(db, `users/${userId}/history`), []);
        } catch (e) {
            console.warn('[Firebase] clearHistory error:', e);
        }
    },

    /**
     * Gửi phản hồi / góp ý: feedbacks/{fbId}
     */
    async sendFeedback(feedbackData) {
        const fbId = 'fb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const item = {
            id: fbId,
            ...feedbackData,
            timestamp: Date.now()
        };
        try {
            await set(ref(db, `feedbacks/${fbId}`), item);
            return item;
        } catch (e) {
            console.warn('[Firebase] sendFeedback error:', e);
            return item;
        }
    },

    /**
     * Đọc danh sách phản hồi / góp ý
     */
    async getFeedbacks() {
        try {
            const snap = await get(ref(db, 'feedbacks'));
            if (!snap || !snap.exists()) return [];
            const data = snap.val();
            return Object.keys(data).map(k => data[k]).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        } catch (e) {
            return [];
        }
    },

    /**
     * Xóa phản hồi
     */
    async deleteFeedback(fbId) {
        if (!fbId) return;
        try {
            await remove(ref(db, `feedbacks/${fbId}`));
        } catch (e) {
            console.warn('[Firebase] deleteFeedback error:', e);
        }
    },

    /**
     * Đổi trạng thái xử lý phản hồi
     */
    async updateFeedbackStatus(fbId, status) {
        if (!fbId) return;
        try {
            await update(ref(db, `feedbacks/${fbId}`), { status });
        } catch (e) {
            console.warn('[Firebase] updateFeedbackStatus error:', e);
        }
    }
};

window.FirebaseService = FirebaseService;
