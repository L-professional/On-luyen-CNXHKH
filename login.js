/**
 * Logic Trang Đăng nhập (login.js)
 * Xác thực với userList từ localStorage, lưu currentUser
 */

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

document.addEventListener('DOMContentLoaded', () => {
    ensureUserListInitialized();
});

function ensureUserListInitialized() {
    if (!localStorage.getItem('userList')) {
        localStorage.setItem('userList', JSON.stringify(DEFAULT_USERS));
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

function handleLogin(e) {
    e.preventDefault();

    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');

    if (!usernameInput || !passwordInput) return;

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    const users = getUserList();

    // Tìm kiếm tài khoản phù hợp
    const matchedUser = users.find(u => 
        u.username.toLowerCase() === username.toLowerCase() && 
        u.password === password
    );

    if (matchedUser) {
        // Lưu phiên đăng nhập currentUser
        const currentSession = {
            username: matchedUser.username,
            role: matchedUser.role,
            loginAt: Date.now()
        };
        localStorage.setItem('currentUser', JSON.stringify(currentSession));

        showToast(`Đăng nhập thành công với vai trò ${matchedUser.role.toUpperCase()}!`, 'success');

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 400);
    } else {
        showToast('Tên đăng nhập hoặc mật khẩu không chính xác!', 'error');
        passwordInput.focus();
    }
}

function quickFillAccount(username, password) {
    const uInput = document.getElementById('login-username');
    const pInput = document.getElementById('login-password');
    if (uInput && pInput) {
        uInput.value = username;
        pInput.value = password;
        showToast(`Đã điền tài khoản ${username}`, 'success');
    }
}

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

function handleSocialLogin(provider) {
    showToast(`Đang kết nối tài khoản ${provider}... (Tính năng Demo)`, 'success');
    setTimeout(() => {
        const currentSession = {
            username: `User_${provider}`,
            role: 'user',
            loginAt: Date.now()
        };
        localStorage.setItem('currentUser', JSON.stringify(currentSession));
        window.location.href = 'index.html';
    }, 600);
}

function handleForgotPassword() {
    alert('Vui lòng liên hệ Quản trị viên (Admin) để được cấp lại mật khẩu hoặc đổi mật khẩu trực tiếp!');
}

function handleRegister() {
    const newUsername = prompt('Nhập tên đăng nhập bạn muốn tạo:');
    if (!newUsername || newUsername.trim().length < 2) return;

    const newPassword = prompt('Nhập mật khẩu (tối thiểu 3 ký tự):');
    if (!newPassword || newPassword.length < 3) {
        alert('Mật khẩu quá ngắn!');
        return;
    }

    const users = getUserList();
    if (users.some(u => u.username.toLowerCase() === newUsername.trim().toLowerCase())) {
        alert('Tên đăng nhập này đã tồn tại!');
        return;
    }

    const today = new Date();
    const dateFormatted = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    const newUser = {
        username: newUsername.trim(),
        password: newPassword,
        role: 'user',
        createdAt: dateFormatted,
        isRoot: false
    };

    users.push(newUser);
    localStorage.setItem('userList', JSON.stringify(users));

    alert(`Đăng ký tài khoản "${newUsername.trim()}" thành công! Bạn có thể đăng nhập ngay.`);
    quickFillAccount(newUsername.trim(), newPassword);
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
