/**
 * Logic Quản lý tài khoản (admin.js)
 * Phân quyền route, CRUD danh sách tài khoản qua localStorage
 */

// Danh sách tài khoản mặc định
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

// Khởi tạo và bảo vệ route khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    // 1. Bảo vệ Route: Chỉ cho phép admin truy cập
    if (!protectAdminRoute()) return;

    // 2. Khởi tạo dữ liệu người dùng
    ensureUserListInitialized();

    // 3. Hiển thị thông tin người dùng quản trị hiện tại
    updateAdminHeaderInfo();

    // 4. Render danh sách tài khoản
    renderUserTable();
});

/**
 * 1. Bảo vệ Route:
 * Kiểm tra currentUser.role. Nếu không phải admin, lập tức chuyển hướng về index.html
 */
function protectAdminRoute() {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
        alert('Vui lòng đăng nhập với tài khoản Quản trị viên (Admin) để truy cập trang này!');
        window.location.href = 'index.html';
        return false;
    }

    try {
        const user = JSON.parse(userStr);
        if (!user || user.role !== 'admin') {
            alert('Bạn không có quyền truy cập trang Quản lý tài khoản! Đang quay lại trang chủ...');
            window.location.href = 'index.html';
            return false;
        }
        return true;
    } catch (e) {
        window.location.href = 'index.html';
        return false;
    }
}

/**
 * Khởi tạo mảng userList trong localStorage nếu chưa tồn tại
 */
function ensureUserListInitialized() {
    if (!localStorage.getItem('userList')) {
        localStorage.setItem('userList', JSON.stringify(DEFAULT_USERS));
    } else {
        // Đảm bảo Admin gốc luôn tồn tại
        try {
            const list = JSON.parse(localStorage.getItem('userList') || '[]');
            const hasAdmin = list.some(u => u.username.toLowerCase() === 'admin');
            if (!hasAdmin) {
                list.unshift(DEFAULT_USERS[0]);
                localStorage.setItem('userList', JSON.stringify(list));
            }
        } catch (e) {
            localStorage.setItem('userList', JSON.stringify(DEFAULT_USERS));
        }
    }
}

function getUserList() {
    try {
        const listStr = localStorage.getItem('userList');
        return listStr ? JSON.parse(listStr) : [...DEFAULT_USERS];
    } catch (e) {
        return [...DEFAULT_USERS];
    }
}

function saveUserList(list) {
    try {
        localStorage.setItem('userList', JSON.stringify(list));
    } catch (e) {
        console.error('Lỗi khi lưu userList:', e);
    }
}

function updateAdminHeaderInfo() {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) return;
    try {
        const user = JSON.parse(userStr);
        const nameEl = document.getElementById('admin-user-display-name');
        if (nameEl && user.username) {
            nameEl.textContent = user.username;
        }
    } catch (e) {
        console.warn(e);
    }
}

/**
 * Render bảng danh sách tài khoản
 */
function renderUserTable(searchKeyword = '') {
    const tbody = document.getElementById('user-table-body');
    const countBadge = document.getElementById('total-users-count');
    if (!tbody) return;

    let users = getUserList();

    if (countBadge) {
        countBadge.textContent = users.length;
    }

    if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase().trim();
        users = users.filter(u => u.username.toLowerCase().includes(kw) || u.role.toLowerCase().includes(kw));
    }

    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 30px; color: #94a3b8; font-size: 13.5px;">
                    <i class="fa-solid fa-user-slash" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
                    Không tìm thấy tài khoản nào phù hợp.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = users.map((u, idx) => {
        const isRootAdmin = u.isRoot || u.username.toLowerCase() === 'admin';
        const roleLabel = u.role === 'admin' ? 'Admin' : 'User';
        const roleClass = u.role === 'admin' ? 'role-admin' : 'role-user';
        const roleIcon = u.role === 'admin' ? 'fa-shield-halved' : 'fa-user';
        const initial = u.username ? u.username.charAt(0).toUpperCase() : 'U';

        return `
            <tr>
                <td style="text-align: center; font-weight: 600; color: #64748b;">${idx + 1}</td>
                <td>
                    <div class="user-row-name">
                        <div class="avatar-circle">${initial}</div>
                        <div>
                            <strong style="color: #1e293b; font-size: 14px;">${escapeHtml(u.username)}</strong>
                            ${isRootAdmin ? '<span class="root-badge"><i class="fa-solid fa-crown" style="font-size: 9px;"></i> Root Admin</span>' : ''}
                        </div>
                    </div>
                </td>
                <td>
                    <span class="role-badge ${roleClass}">
                        <i class="fa-solid ${roleIcon}"></i>
                        <span>${roleLabel}</span>
                    </span>
                </td>
                <td style="color: #64748b; font-size: 13px;">
                    <i class="fa-regular fa-calendar" style="margin-right: 4px; font-size: 11px;"></i>
                    ${u.createdAt || '08/10/2026'}
                </td>
                <td>
                    <div class="action-buttons-group">
                        <button type="button" class="btn-action btn-edit-pwd" onclick="openEditPasswordModal('${escapeHtml(u.username)}')" title="Đổi mật khẩu cho ${escapeHtml(u.username)}">
                            <i class="fa-solid fa-key"></i>
                            <span>Sửa MK</span>
                        </button>
                        ${isRootAdmin ? `
                            <button type="button" class="btn-action btn-delete btn-disabled" disabled title="Tài khoản Admin gốc không được phép xóa">
                                <i class="fa-solid fa-lock"></i>
                                <span>Mặc định</span>
                            </button>
                        ` : `
                            <button type="button" class="btn-action btn-delete" onclick="handleDeleteUser('${escapeHtml(u.username)}')" title="Xóa tài khoản ${escapeHtml(u.username)}">
                                <i class="fa-solid fa-trash-can"></i>
                                <span>Xóa</span>
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Lọc bảng tài khoản khi nhập ô tìm kiếm
 */
function filterUserTable() {
    const input = document.getElementById('user-search-input');
    const kw = input ? input.value : '';
    renderUserTable(kw);
}

/**
 * Xử lý Form "Tạo tài khoản" (Khối 1)
 */
function handleCreateUser(e) {
    e.preventDefault();

    const usernameInput = document.getElementById('new-username');
    const passwordInput = document.getElementById('new-password');
    const roleSelect = document.getElementById('new-role');

    if (!usernameInput || !passwordInput || !roleSelect) return;

    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const role = roleSelect.value;

    // Validation
    if (username.length < 2) {
        showToast('Tên đăng nhập phải có ít nhất 2 ký tự!', 'error');
        usernameInput.focus();
        return;
    }

    if (password.length < 3) {
        showToast('Mật khẩu phải có ít nhất 3 ký tự!', 'error');
        passwordInput.focus();
        return;
    }

    const users = getUserList();

    // Kiểm tra trùng username (không phân biệt chữ hoa thường)
    const isExisted = users.some(u => u.username.toLowerCase() === username.toLowerCase());
    if (isExisted) {
        showToast(`Tên đăng nhập "${username}" đã tồn tại trên hệ thống!`, 'error');
        usernameInput.focus();
        return;
    }

    // Định dạng ngày hiện tại
    const today = new Date();
    const dateFormatted = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    // Thêm người dùng mới
    const newUser = {
        username: username,
        password: password,
        role: role,
        createdAt: dateFormatted,
        isRoot: false
    };

    users.push(newUser);
    saveUserList(users);

    // Reset Form & Render lại bảng
    usernameInput.value = '';
    passwordInput.value = '';
    roleSelect.value = 'user';

    renderUserTable();
    showToast(`Đã tạo tài khoản "${username}" (${role.toUpperCase()}) thành công!`, 'success');
}

/**
 * Xử lý tính năng Xóa tài khoản
 */
function handleDeleteUser(username) {
    if (!username) return;

    // Không cho phép xóa tài khoản Admin gốc mặc định
    if (username.toLowerCase() === 'admin') {
        alert('TUYỆT ĐỐI KHÔNG ĐƯỢC PHÉP XÓA TÀI KHOẢN ADMIN GỐC MẶC ĐỊNH (Admin / Loclsct2006)!');
        return;
    }

    const users = getUserList();
    const userToDelete = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!userToDelete) {
        showToast('Không tìm thấy tài khoản cần xóa!', 'error');
        return;
    }

    if (userToDelete.isRoot) {
        alert('Tài khoản này là tài khoản hệ thống gốc, không được phép xóa!');
        return;
    }

    const isConfirmed = confirm(`Bạn có chắc chắn muốn xóa tài khoản "${username}" không?\nHành động này không thể hoàn tác!`);
    if (!isConfirmed) return;

    // Lọc bỏ tài khoản
    const updatedUsers = users.filter(u => u.username.toLowerCase() !== username.toLowerCase());
    saveUserList(updatedUsers);

    renderUserTable();
    showToast(`Đã xóa tài khoản "${username}" thành công!`, 'success');
}

/**
 * Tính năng Sửa mật khẩu (Modal Popup)
 */
function openEditPasswordModal(username) {
    const users = getUserList();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
        showToast('Không tìm thấy tài khoản!', 'error');
        return;
    }

    showAdminModal({
        title: `Đổi mật khẩu: ${user.username}`,
        icon: 'fa-solid fa-key',
        content: `
            <div style="font-size: 14px; color: #334155; display: flex; flex-direction: column; gap: 14px;">
                <p>Nhập mật khẩu mới cho tài khoản <strong>${escapeHtml(user.username)}</strong> (Vai trò: ${user.role.toUpperCase()}):</p>
                <div class="form-group" style="width: 100%;">
                    <label for="edit-new-pwd"><i class="fa-solid fa-lock"></i> Mật khẩu mới</label>
                    <div class="password-input-wrapper">
                        <input type="password" id="edit-new-pwd" placeholder="Nhập ít nhất 3 ký tự..." style="width: 100%; height: 42px; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0 40px 0 14px; font-size: 14px;">
                        <button type="button" class="btn-toggle-pwd" onclick="togglePasswordVisibility('edit-new-pwd', this)">
                            <i class="fa-regular fa-eye"></i>
                        </button>
                    </div>
                </div>
            </div>
        `,
        actionText: 'Lưu mật khẩu',
        actionCallback: () => {
            const pwdInput = document.getElementById('edit-new-pwd');
            const newPwd = pwdInput ? pwdInput.value : '';

            if (!newPwd || newPwd.length < 3) {
                alert('Mật khẩu mới phải có tối thiểu 3 ký tự!');
                return;
            }

            user.password = newPwd;
            saveUserList(users);
            closeAdminModal();
            showToast(`Đã đổi mật khẩu cho tài khoản "${user.username}" thành công!`, 'success');
        },
        showCancel: true,
        cancelText: 'Hủy'
    });
}

/**
 * Toggle hiển thị mật khẩu
 */
function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input || !btn) return;

    const icon = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        if (icon) icon.className = 'fa-regular fa-eye-slash';
    } else {
        input.type = 'password';
        if (icon) icon.className = 'fa-regular fa-eye';
    }
}

/**
 * Modal Popup & Toast Utilities
 */
function showAdminModal({ title, icon, content, actionText = 'Đóng', actionCallback = null, showCancel = false, cancelText = 'Hủy', cancelCallback = null }) {
    const modalBackdrop = document.getElementById('modal-container');
    const modalCard = document.getElementById('modal-card');
    if (!modalBackdrop || !modalCard) return;

    modalCard.innerHTML = `
        <div class="modal-header">
            <h3 class="modal-title">
                ${icon ? `<i class="${icon}" style="color: #2563eb;"></i>` : ''}
                <span>${title}</span>
            </h3>
            <button class="btn-close-modal" onclick="closeAdminModal()">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
        <div class="modal-body">
            ${content}
        </div>
        <div class="modal-footer">
            ${showCancel ? `<button class="btn-modal-cancel" id="admin-modal-cancel-btn">${cancelText}</button>` : ''}
            <button class="btn-modal-action" id="admin-modal-primary-btn">${actionText}</button>
        </div>
    `;

    document.getElementById('admin-modal-primary-btn').onclick = () => {
        if (actionCallback) actionCallback();
        else closeAdminModal();
    };

    if (showCancel) {
        document.getElementById('admin-modal-cancel-btn').onclick = () => {
            if (cancelCallback) cancelCallback();
            else closeAdminModal();
        };
    }

    modalBackdrop.classList.remove('hidden');
}

function closeAdminModal() {
    const modalBackdrop = document.getElementById('modal-container');
    if (modalBackdrop) modalBackdrop.classList.add('hidden');
}

function closeAdminModalOnBackdrop(e) {
    if (e.target.id === 'modal-container') {
        closeAdminModal();
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast-message');
    if (!toast) return;

    const iconClass = (type === 'error') ? 'fa-circle-xmark' : 'fa-circle-check';
    const iconColor = (type === 'error') ? '#f87171' : '#38bdf8';

    toast.innerHTML = `<i class="fa-solid ${iconClass}" style="color: ${iconColor};"></i> <span>${message}</span>`;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 2400);
}

function openAdminNotification() {
    showAdminModal({
        title: 'Thông báo Quản trị',
        icon: 'fa-solid fa-bell',
        content: `
            <div style="font-size: 13.5px; color: #475569; line-height: 1.6;">
                <p>• Hệ thống hỗ trợ phân quyền <strong>Admin</strong> và <strong>User</strong>.</p>
                <p>• Tài khoản Admin có quyền thêm mới, xóa và đổi mật khẩu người dùng.</p>
                <p>• Tài khoản Admin gốc mặc định (Admin / Loclsct2006) được bảo vệ, không thể bị xóa.</p>
            </div>
        `
    });
}

function openAdminUserMenu() {
    const userStr = localStorage.getItem('currentUser');
    const user = userStr ? JSON.parse(userStr) : { username: 'Admin', role: 'admin' };

    showAdminModal({
        title: 'Tài khoản Quản trị viên',
        icon: 'fa-solid fa-user-shield',
        content: `
            <div style="font-size: 14px; color: #334155; display: flex; flex-direction: column; gap: 14px;">
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 14px; display: flex; align-items: center; gap: 12px;">
                    <div style="width: 44px; height: 44px; border-radius: 50%; background: #2563eb; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700;">
                        ${user.username ? user.username.charAt(0).toUpperCase() : 'A'}
                    </div>
                    <div>
                        <strong style="font-size: 15px; color: #1e293b;">${user.username}</strong>
                        <div style="color: #2563eb; font-size: 12px; font-weight: 600;">Quản trị viên hệ thống (Admin)</div>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <button type="button" style="padding: 10px 14px; border-radius: 8px; border: 1px solid #cbd5e1; background: #ffffff; text-align: left; cursor: pointer; font-size: 13.5px; display: flex; align-items: center; gap: 10px;" onclick="window.location.href='index.html'">
                        <i class="fa-solid fa-house" style="color: #2563eb;"></i>
                        <span>Về Trang chủ (Dashboard học tập)</span>
                    </button>
                    <button type="button" style="padding: 10px 14px; border-radius: 8px; border: 1px solid #fecdd3; background: #fef2f2; text-align: left; cursor: pointer; font-size: 13.5px; display: flex; align-items: center; gap: 10px; color: #dc2626; font-weight: 600;" onclick="adminLogout()">
                        <i class="fa-solid fa-arrow-right-from-bracket"></i>
                        <span>Đăng xuất</span>
                    </button>
                </div>
            </div>
        `,
        actionText: 'Đóng'
    });
}

function adminLogout() {
    localStorage.removeItem('currentUser');
    closeAdminModal();
    window.location.href = 'login.html';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
