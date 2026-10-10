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
        isRoot: true,
        activeSession: null
    },
    {
        username: 'Loc',
        password: '123',
        role: 'user',
        createdAt: '08/10/2026',
        isRoot: false,
        activeSession: null
    }
];

document.addEventListener('DOMContentLoaded', () => {
    ensureUserListInitialized();
    checkExistingSession();
    initFormBindings();
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

function checkExistingSession() {
    try {
        const str = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
        if (!str) return;
        const user = JSON.parse(str);
        if (user && user.username && user.loginAt) {
            // Kiểm tra xem sessionId còn khớp với activeSession trong userList hay không
            const users = getUserList();
            const matched = users.find(u => u.username && u.username.toLowerCase() === user.username.toLowerCase());
            if (matched && matched.activeSession && user.sessionId && matched.activeSession !== user.sessionId) {
                // Phiên đã bị nơi khác đăng nhập đè -> dọn dẹp phiên cũ
                localStorage.removeItem('currentUser');
                sessionStorage.removeItem('currentUser');
                return;
            }
            const banner = document.getElementById('existing-session-banner');
            const nameEl = document.getElementById('existing-username');
            if (banner && nameEl) {
                nameEl.textContent = `${user.username} (${user.role === 'admin' ? 'Admin' : 'User'})`;
                banner.classList.remove('hidden');
            }
        } else {
            // Dọn dẹp phiên không hợp lệ
            localStorage.removeItem('currentUser');
            sessionStorage.removeItem('currentUser');
        }
    } catch (e) {
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentUser');
    }
}

function clearExistingSession() {
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
    const banner = document.getElementById('existing-session-banner');
    if (banner) banner.classList.add('hidden');
    showToast('Đã xóa phiên đăng nhập trên thiết bị!', 'success');
}

function getUsernameInput() {
    return document.getElementById('login-username') || document.querySelector('input[autocomplete="username"]') || document.querySelector('.input-field[type="text"]');
}

function getPasswordInput() {
    return document.getElementById('login-password') || document.querySelector('input[type="password"]');
}

function getRememberCheckbox() {
    return document.getElementById('remember-me') || document.querySelector('.custom-checkbox') || document.querySelector('input[type="checkbox"]');
}

function handleLogin(e) {
    if (e && e.preventDefault) e.preventDefault();

    const usernameInput = getUsernameInput();
    const passwordInput = getPasswordInput();
    const rememberMeCheckbox = getRememberCheckbox();
    const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : true;

    if (!usernameInput || !passwordInput) return;

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
        showToast('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!', 'error');
        return;
    }

    const users = getUserList();

    // Tìm kiếm tài khoản phù hợp
    const matchedUser = users.find(u => 
        u.username.toLowerCase() === username.toLowerCase() && 
        u.password === password
    );

    if (matchedUser) {
        // Sinh sessionId duy nhất cho phiên đăng nhập mới (Single Device Login)
        const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

        // Cập nhật activeSession trong userList trên localStorage
        const userIndex = users.findIndex(u => u.username.toLowerCase() === matchedUser.username.toLowerCase());
        if (userIndex !== -1) {
            users[userIndex].activeSession = sessionId;
            localStorage.setItem('userList', JSON.stringify(users));
        }

        // Lưu phiên đăng nhập currentUser với loginAt và sessionId
        const currentSession = {
            username: matchedUser.username,
            role: matchedUser.role,
            loginAt: Date.now(),
            sessionId: sessionId
        };

        if (rememberMe) {
            localStorage.setItem('currentUser', JSON.stringify(currentSession));
            sessionStorage.removeItem('currentUser');
        } else {
            sessionStorage.setItem('currentUser', JSON.stringify(currentSession));
            localStorage.removeItem('currentUser');
        }

        showToast(`Đăng nhập thành công với vai trò ${matchedUser.role.toUpperCase()}!`, 'success');

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    } else {
        showToast('Tên đăng nhập hoặc mật khẩu không chính xác!', 'error');
        passwordInput.focus();
    }
}

function quickFillAccount(username, password) {
    const uInput = getUsernameInput();
    const pInput = getPasswordInput();
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
    const rememberMeCheckbox = document.getElementById('remember-me');
    const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : true;

    showToast(`Đang kết nối tài khoản ${provider}... (Tính năng Demo)`, 'success');
    setTimeout(() => {
        const username = `User_${provider}`;
        const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        const users = getUserList();
        let userIndex = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
        if (userIndex === -1) {
            users.push({
                username: username,
                password: '',
                role: 'user',
                createdAt: new Date().toLocaleDateString('vi-VN'),
                isRoot: false,
                activeSession: sessionId
            });
        } else {
            users[userIndex].activeSession = sessionId;
        }
        localStorage.setItem('userList', JSON.stringify(users));

        const currentSession = {
            username: username,
            role: 'user',
            loginAt: Date.now(),
            sessionId: sessionId
        };
        if (rememberMe) {
            localStorage.setItem('currentUser', JSON.stringify(currentSession));
            sessionStorage.removeItem('currentUser');
        } else {
            sessionStorage.setItem('currentUser', JSON.stringify(currentSession));
            localStorage.removeItem('currentUser');
        }
        window.location.href = 'index.html';
    }, 600);
}

function handleForgotPassword() {
    alert('Vui lòng liên hệ Quản trị viên (Admin) để được cấp lại mật khẩu hoặc đổi mật khẩu trực tiếp!');
}

function handleRegister(e) {
    if (e && e.preventDefault) e.preventDefault();

    const regUsernameEl = document.getElementById('reg-username');
    const regPasswordEl = document.getElementById('reg-password');
    const regConfirmPasswordEl = document.getElementById('reg-confirm-password');

    const username = regUsernameEl ? regUsernameEl.value.trim() : '';
    const password = regPasswordEl ? regPasswordEl.value : '';
    const confirmPassword = regConfirmPasswordEl ? regConfirmPasswordEl.value : '';

    // 1. Validation Tên đăng nhập: không trống, không chứa khoảng trắng
    if (!username) {
        showToast('Vui lòng nhập tên đăng nhập!', 'error');
        if (regUsernameEl) regUsernameEl.focus();
        return;
    }
    if (/\s/.test(username)) {
        showToast('Tên đăng nhập không được chứa khoảng trắng!', 'error');
        if (regUsernameEl) regUsernameEl.focus();
        return;
    }

    // 2. Validation Mật khẩu: tối thiểu 4 ký tự
    if (!password) {
        showToast('Vui lòng nhập mật khẩu!', 'error');
        if (regPasswordEl) regPasswordEl.focus();
        return;
    }
    if (password.length < 4) {
        showToast('Mật khẩu phải có độ dài tối thiểu 4 ký tự!', 'error');
        if (regPasswordEl) regPasswordEl.focus();
        return;
    }

    // 3. Validation Mật khẩu và Nhập lại mật khẩu phải khớp nhau
    if (password !== confirmPassword) {
        showToast('Mật khẩu và Nhập lại mật khẩu không khớp nhau!', 'error');
        if (regConfirmPasswordEl) regConfirmPasswordEl.focus();
        return;
    }

    // 4. Kiểm tra username đã tồn tại trong userList (không phân biệt hoa thường)
    const users = getUserList();
    const isExisted = users.some(u => u.username.toLowerCase() === username.toLowerCase());
    if (isExisted) {
        showToast('Tên đăng nhập đã tồn tại!', 'error');
        if (regUsernameEl) regUsernameEl.focus();
        return;
    }

    // 5. Tạo Object user mới: { username, password, role: 'user', createdAt: [ngày hôm nay], isRoot: false }
    const today = new Date();
    const dateFormatted = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    const newUser = {
        username: username,
        password: password,
        role: 'user',
        createdAt: dateFormatted,
        isRoot: false,
        activeSession: null
    };

    // 6. Push vào mảng userList và lưu vào localStorage
    users.push(newUser);
    localStorage.setItem('userList', JSON.stringify(users));

    // 7. Chuyển luồng: Toast thành công, ẩn form Đăng ký, hiện lại form Đăng nhập, điền sẵn username
    showToast('Đăng ký thành công! Vui lòng đăng nhập.', 'success');

    // Reset các trường form đăng ký
    if (regUsernameEl) regUsernameEl.value = '';
    if (regPasswordEl) regPasswordEl.value = '';
    if (regConfirmPasswordEl) regConfirmPasswordEl.value = '';

    // Tự động chuyển về form Đăng nhập
    showLoginForm();

    // Fill sẵn tên đăng nhập vừa tạo vào ô Input Username của form Đăng nhập
    const loginUserInput = getUsernameInput();
    const loginPwdInput = getPasswordInput();
    if (loginUserInput) {
        loginUserInput.value = username;
    }
    if (loginPwdInput) {
        loginPwdInput.value = '';
        loginPwdInput.focus();
    }
}

/**
 * Hiển thị form Đăng ký và ẩn form Đăng nhập
 */
function showRegisterForm(e) {
    if (e && e.preventDefault) e.preventDefault();
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');
    if (loginView && registerView) {
        loginView.style.display = 'none';
        registerView.style.display = 'block';
        registerView.classList.remove('animate-fade-in');
        void registerView.offsetWidth; // Force reflow
        registerView.classList.add('animate-fade-in');

        const regUser = document.getElementById('reg-username');
        if (regUser) regUser.focus();
    }
}

/**
 * Hiển thị form Đăng nhập và ẩn form Đăng ký
 */
function showLoginForm(e) {
    if (e && e.preventDefault) e.preventDefault();
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');
    if (loginView && registerView) {
        registerView.style.display = 'none';
        loginView.style.display = 'block';
        loginView.classList.remove('animate-fade-in');
        void loginView.offsetWidth; // Force reflow
        loginView.classList.add('animate-fade-in');

        const loginUser = getUsernameInput();
        if (loginUser) loginUser.focus();
    }
}

function toggleQuickAccountMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('quick-accounts-menu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

function selectQuickAccount(username, password) {
    quickFillAccount(username, password);
    const menu = document.getElementById('quick-accounts-menu');
    if (menu) menu.classList.add('hidden');
    // Auto submit to log in immediately
    const form = document.getElementById('login-form');
    if (form) {
        const submitEvent = new Event('submit', { cancelable: true });
        form.dispatchEvent(submitEvent);
    }
}

// Đóng dropdown khi bấm ra ngoài
document.addEventListener('click', (e) => {
    const menu = document.getElementById('quick-accounts-menu');
    const btn = document.getElementById('btn-other-accounts');
    if (menu && !menu.classList.contains('hidden')) {
        if (!menu.contains(e.target) && (!btn || !btn.contains(e.target))) {
            menu.classList.add('hidden');
        }
    }
});

function showToast(message, type = 'success') {
    let toast = document.getElementById('toast-message');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-message';
        toast.style.position = 'fixed';
        toast.style.bottom = '28px';
        toast.style.right = '28px';
        toast.style.backgroundColor = '#1e293b';
        toast.style.color = '#ffffff';
        toast.style.padding = '14px 22px';
        toast.style.borderRadius = '12px';
        toast.style.fontSize = '14px';
        toast.style.fontWeight = '600';
        toast.style.boxShadow = '0 12px 30px rgba(0,0,0,0.2)';
        toast.style.zIndex = '9999';
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.gap = '10px';
        toast.style.transition = 'all 0.3s ease';
        document.body.appendChild(toast);
    }

    const iconClass = (type === 'error') ? 'fa-circle-xmark' : 'fa-circle-check';
    const iconColor = (type === 'error') ? '#f87171' : '#38bdf8';

    toast.innerHTML = `<i class="fa-solid ${iconClass}" style="color: ${iconColor};"></i> <span>${message}</span>`;
    toast.style.display = 'flex';
    toast.style.opacity = '1';

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 300);
    }, 2400);
}

function handleOtherAccountChoice() {
    const choice = prompt('CHỌN TÀI KHOẢN MẪU:\n1. Quản trị viên (Admin / Loclsct2006)\n2. Người học (Loc / 123)\n\nNhập 1 hoặc 2:');
    if (choice === '1') {
        quickFillAccount('Admin', 'Loclsct2006');
        const form = document.querySelector('.login-card form') || document.querySelector('form');
        if (form) form.dispatchEvent(new Event('submit', { cancelable: true }));
    } else if (choice === '2') {
        quickFillAccount('Loc', '123');
        const form = document.querySelector('.login-card form') || document.querySelector('form');
        if (form) form.dispatchEvent(new Event('submit', { cancelable: true }));
    }
}

function initFormBindings() {
    // Tự động gắn sự kiện Submit Form Đăng nhập
    const loginForm = document.getElementById('login-form') || document.querySelector('.login-card form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Tự động gắn sự kiện Submit Form Đăng ký
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Chuyển sang form Đăng ký
    const linkToRegister = document.getElementById('link-to-register');
    if (linkToRegister) {
        linkToRegister.addEventListener('click', showRegisterForm);
    }

    // Chuyển sang form Đăng nhập
    const linkToLogin = document.getElementById('link-to-login');
    if (linkToLogin) {
        linkToLogin.addEventListener('click', showLoginForm);
    }

    // Toggle ẩn/hiện mật khẩu form đăng nhập
    const eyeBtn = document.querySelector('#login-view .input-icon-right') || document.querySelector('.input-icon-right');
    if (eyeBtn) {
        eyeBtn.style.cursor = 'pointer';
        eyeBtn.addEventListener('click', () => {
            const pwdInput = getPasswordInput();
            if (!pwdInput) return;
            const icon = eyeBtn.querySelector('i');
            if (pwdInput.type === 'password') {
                pwdInput.type = 'text';
                if (icon) {
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            } else {
                pwdInput.type = 'password';
                if (icon) {
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                }
            }
        });
    }

    // Quên mật khẩu
    const forgotLink = document.querySelector('.forgot-link');
    if (forgotLink) {
        forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            handleForgotPassword();
        });
    }

    // Các nút Social Login
    const socialBtns = document.querySelectorAll('.social-btn');
    socialBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const text = btn.innerText.trim();
            if (text.includes('Google')) {
                handleSocialLogin('Google');
            } else if (text.includes('Microsoft')) {
                handleSocialLogin('Microsoft');
            } else {
                handleOtherAccountChoice();
            }
        });
    });
}
