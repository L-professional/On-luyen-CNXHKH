/**
 * Logic Trang Đăng nhập (login.js)
 * Xác thực với userList từ localStorage, lưu currentUser
 */

const DEFAULT_USERS = [
    {
        userId: 'u_admin_root_2026',
        username: 'Admin',
        password: 'Loclsct2006',
        role: 'admin',
        createdAt: '08/10/2026',
        isRoot: true,
        activeSession: null
    }
];

function initLoginApp() {
    ensureUserListInitialized();
    checkExistingSession();
    initFormBindings();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoginApp);
} else {
    initLoginApp();
}

async function ensureUserListInitialized() {
    if (window.FirebaseService) {
        await FirebaseService.ensureInitialData();
    }
}

async function getUserList() {
    if (window.FirebaseService) {
        return await FirebaseService.getAllUsers();
    }
    return [...DEFAULT_USERS];
}

async function checkExistingSession() {
    try {
        const str = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
        if (!str) return;
        const user = JSON.parse(str);
        if (user && (user.userId || user.username) && user.loginAt) {
            // Kiểm tra session từ Firebase
            let matched = null;
            if (user.userId && window.FirebaseService) {
                matched = await FirebaseService.getUserById(user.userId);
            }
            if (!matched && window.FirebaseService) {
                matched = await FirebaseService.findUserByUsername(user.username);
            }

            if (matched && matched.activeSession && user.sessionId && matched.activeSession !== user.sessionId) {
                // Phiên đã bị nơi khác đăng nhập đè -> dọn dẹp phiên cũ
                localStorage.removeItem('currentUser');
                sessionStorage.removeItem('currentUser');
                return;
            }

            const banner = document.getElementById('existing-session-banner');
            const nameEl = document.getElementById('existing-username');
            if (banner && nameEl) {
                const displayName = matched ? matched.username : user.username;
                nameEl.textContent = `${displayName} (${user.role === 'admin' ? 'Admin' : 'User'})`;
                banner.classList.remove('hidden');
            }
        } else {
            localStorage.removeItem('currentUser');
            sessionStorage.removeItem('currentUser');
        }
    } catch (e) {
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentUser');
    }
}

function clearExistingSession() {
    const session = window.FirebaseService ? FirebaseService.getCurrentSession() : null;
    if (session && session.userId && window.FirebaseService) {
        FirebaseService.updateUserStatus(session.userId, 'offline');
    }
    localStorage.removeItem('currentUser');
    localStorage.removeItem('sessionToken');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('sessionToken');
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

async function handleLogin(e) {
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

    const users = await getUserList();

    // Tìm kiếm tài khoản phù hợp (ưu tiên Firebase, dự phòng DEFAULT_USERS)
    let matchedUser = users.find(u => 
        u.username && u.username.toLowerCase() === username.toLowerCase() && 
        u.password === password
    );

    if (!matchedUser) {
        matchedUser = DEFAULT_USERS.find(u => 
            u.username && u.username.toLowerCase() === username.toLowerCase() && 
            u.password === password
        );
    }

    if (matchedUser) {
        // Đảm bảo lấy đúng UID trên Firebase cho Admin và User
        let userId = matchedUser.userId;
        if (!userId && window.FirebaseService) {
            try {
                const fbUser = await FirebaseService.findUserByUsername(matchedUser.username);
                if (fbUser && fbUser.userId) {
                    userId = fbUser.userId;
                }
            } catch (err) {}
        }
        if (!userId) {
            if (matchedUser.username && matchedUser.username.toLowerCase() === 'admin') {
                userId = 'u_admin_root_2026';
            } else {
                userId = 'u_' + (matchedUser.username || 'user').toLowerCase();
            }
        }

        // BẮT BUỘC: Dù là Admin (hardcode/Firebase) hay User thường, đều phải sinh sessionToken ngẫu nhiên
        const token = Date.now().toString() + Math.random().toString(36).substr(2);

        const userData = {
            userId: userId,
            username: matchedUser.username,
            role: matchedUser.role || (matchedUser.username.toLowerCase() === 'admin' ? 'admin' : 'user'),
            loginAt: Date.now(),
            sessionId: token,
            sessionToken: token
        };

        // Phải Update sessionToken đó lên Firebase của user/admin đó
        update(ref(db, 'users/' + userId), {
            sessionToken: token,
            activeSession: token,
            status: 'online',
            lastActive: Date.now()
        })
          .then(() => {
              // Lưu sessionToken đó vào localStorage cùng với currentUser rồi mới cho phép window.location.replace()
              localStorage.setItem('currentUser', JSON.stringify(userData));
              localStorage.setItem('sessionToken', token);
              sessionStorage.removeItem('currentUser');
              sessionStorage.removeItem('sessionToken');
              window.location.replace('index.html');
          })
          .catch(err => {
              console.error(err);
              alert("Lỗi mạng!");
          });
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
    const input = typeof inputId === 'string' ? (document.getElementById(inputId) || document.getElementById('login-password') || document.getElementById('password')) : inputId;
    if (!input || !btn) return;

    const icon = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        if (icon) {
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    } else {
        input.type = 'password';
        if (icon) {
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        }
    }
}
window.togglePasswordVisibility = togglePasswordVisibility;

function handleForgotPassword() {
    alert('Vui lòng liên hệ Quản trị viên (Admin) để được cấp lại mật khẩu hoặc đổi mật khẩu trực tiếp!');
}

async function handleRegister(e) {
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

    // 4. Kiểm tra username đã tồn tại trên Firebase (không phân biệt hoa thường)
    if (window.FirebaseService) {
        const existed = await FirebaseService.findUserByUsername(username);
        if (existed) {
            showToast('Tên đăng nhập đã tồn tại!', 'error');
            if (regUsernameEl) regUsernameEl.focus();
            return;
        }

        // 5. Tạo userId (UID) duy nhất làm key gốc trong Firebase
        try {
            const newUser = await FirebaseService.registerUser({
                username: username,
                password: password,
                role: 'user'
            });

            // BƯỚC 1: Sửa lỗi bất đồng bộ (Race Condition) khi Đăng ký
            const userId = newUser.userId;
            const token = Date.now().toString() + Math.random().toString(36).substr(2);
            const userData = {
                userId: userId,
                username: newUser.username,
                role: 'user',
                loginAt: Date.now(),
                sessionId: token,
                sessionToken: token
            };

            update(ref(db, 'users/' + userId), {
                sessionToken: token,
                activeSession: token,
                status: 'online',
                lastActive: Date.now()
            })
              .then(() => {
                  localStorage.setItem('currentUser', JSON.stringify(userData));
                  localStorage.setItem('sessionToken', token);
                  sessionStorage.removeItem('currentUser');
                  sessionStorage.removeItem('sessionToken');
                  window.location.replace('index.html');
              })
              .catch(err => {
                  console.error(err);
                  alert("Lỗi mạng!");
              });
            return;
        } catch (err) {
            showToast(err.message, 'error');
            return;
        }
    } else {
        const users = await getUserList();
        const isExisted = users.some(u => u.username && u.username.toLowerCase() === username.toLowerCase());
        if (isExisted) {
            showToast('Tên đăng nhập đã tồn tại!', 'error');
            if (regUsernameEl) regUsernameEl.focus();
            return;
        }

        const userId = 'u_' + Date.now();
        const token = Date.now().toString() + Math.random().toString(36).substr(2);
        const userData = {
            userId: userId,
            username: username,
            role: 'user',
            loginAt: Date.now(),
            sessionId: token,
            sessionToken: token
        };

        if (window.update && window.ref && window.db) {
            update(ref(db, 'users/' + userId), {
                sessionToken: token,
                activeSession: token,
                status: 'online',
                lastActive: Date.now()
            })
              .then(() => {
                  localStorage.setItem('currentUser', JSON.stringify(userData));
                  localStorage.setItem('sessionToken', token);
                  sessionStorage.removeItem('currentUser');
                  sessionStorage.removeItem('sessionToken');
                  window.location.replace('index.html');
              })
              .catch(err => {
                  console.error(err);
                  alert("Lỗi mạng!");
              });
        }
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
    const togglePasswordBtn = document.getElementById('togglePassword') || document.querySelector('#login-view .input-icon-right') || document.querySelector('.input-icon-right');
    if (togglePasswordBtn) {
        togglePasswordBtn.classList.remove('pointer-events-none');
        togglePasswordBtn.classList.add('cursor-pointer');
        togglePasswordBtn.style.cursor = 'pointer';
        togglePasswordBtn.style.pointerEvents = 'auto';

        togglePasswordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const passwordInput = document.getElementById('login-password') || document.getElementById('password') || getPasswordInput();
            if (!passwordInput) return;

            const icon = togglePasswordBtn.querySelector('i');
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                if (icon) {
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            } else {
                passwordInput.type = 'password';
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
}
