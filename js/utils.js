/**
 * Helper to compress image before upload
 * @param {File} file 
 * @returns {Promise<Blob>}
 */
export async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Max resolution 800px (highly optimized for fast mobile upload)
                const MAX_SIZE = 800;
                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    }));
                }, 'image/jpeg', 0.5); // Compression max à 50% pour économiser la data
            };
        };
    });
}

/**
 * Session Management via LocalStorage (more reliable than cookies for PWAs)
 */
export function setSession(data) {
    localStorage.setItem('alc_userId', data.id);
    localStorage.setItem('alc_role', data.role);
    localStorage.setItem('alc_name', data.nom);
}

export function getSession() {
    return {
        userId: localStorage.getItem('alc_userId'),
        role: localStorage.getItem('alc_role'),
        name: localStorage.getItem('alc_name')
    };
}

export function clearSession() {
    localStorage.removeItem('alc_userId');
    localStorage.removeItem('alc_role');
    localStorage.removeItem('alc_name');
}

/**
 * Format currency
 */
export function formatFCFA(amount) {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' F';
}

/**
 * Check if session exists and enforce roles
 */
export function checkAuth(requiredRole = null) {
    const { userId, role } = getSession();
    const href = window.location.href.toLowerCase();

    // On détermine si on est sur la page de login
    const isLoginPage = href.includes('index.html') || href.endsWith(':3001/') || href.endsWith(':3001');

    console.log("Auth Check:", { isLoginPage, role, userId });

    // 1. Si on est sur LOGIN et qu'on a une session -> Direction Dashboard
    if (isLoginPage) {
        if (userId && role) {
            redirectByRole(role);
            return;
        }
        document.body.classList.add('auth-ok');
        return;
    }

    // 2. Pas de session -> Retour au login
    if (!userId || !role) {
        logout();
        return;
    }

    // 3. Protection de Zone
    if (requiredRole && role !== requiredRole && role !== 'patronne') {
        alert("🔒 Accès restreint : Redirection...");
        redirectByRole(role);
        return;
    }

    injectNav(role);
    document.body.classList.add('auth-ok');
    return role;
}

export function redirectByRole(role) {
    const href = window.location.href.toLowerCase();
    let target = 'index.html';

    if (role === 'patronne') target = 'patronne.html';
    else if (role === 'gerant') target = 'dispatch.html';
    else if (role === 'livreur') target = 'livreur-app.html';
    else target = 'dashboard.html';

    // Anti-boucle
    if (!href.includes(target.toLowerCase())) {
        window.location.replace(target);
    }
}

export function logout() {
    clearSession();
    window.location.replace('index.html');
}

export function injectNav(role) {
    const nav = document.querySelector('.bottom-nav');
    if (!nav) return;

    if (role === 'patronne') {
        nav.innerHTML = `
            <a href="patronne.html" class="nav-item ${window.location.pathname.includes('patronne')?'active':''}"><i data-lucide="crown"></i><span>Boss</span></a>
            <a href="point.html" class="nav-item ${window.location.pathname.includes('point')?'active':''}"><i data-lucide="wallet"></i><span>Le Point</span></a>
            <a href="rapports.html" class="nav-item ${window.location.pathname.includes('rapports')?'active':''}"><i data-lucide="archive"></i><span>Audits</span></a>
            <a href="livreurs.html" class="nav-item ${window.location.pathname.includes('livreurs')?'active':''}"><i data-lucide="users"></i><span>Équipe</span></a>
        `;
    } else if (role === 'gerant') {
        nav.innerHTML = `
            <a href="dispatch.html" class="nav-item ${window.location.pathname.includes('dispatch')?'active':''}"><i data-lucide="plus-square"></i><span>Nouveau</span></a>
            <a href="point.html" class="nav-item ${window.location.pathname.includes('point')?'active':''}"><i data-lucide="wallet"></i><span>Le Point</span></a>
            <a href="rapports.html" class="nav-item ${window.location.pathname.includes('rapports')?'active':''}"><i data-lucide="archive"></i><span>Archives</span></a>
            <a href="livreurs.html" class="nav-item ${window.location.pathname.includes('livreurs')?'active':''}"><i data-lucide="users"></i><span>Équipe</span></a>
            <a href="dashboard.html" class="nav-item ${window.location.pathname.includes('dashboard')?'active':''}"><i data-lucide="bar-chart-3"></i><span>Stats</span></a>
        `;
    } else if (role === 'livreur') {
        nav.innerHTML = `
            <a href="#" onclick="switchLivreurTab('colis')" id="nav-colis" class="nav-item active"><i data-lucide="truck"></i><span>Mes Colis</span></a>
            <a href="#" onclick="switchLivreurTab('profile')" id="nav-profile" class="nav-item"><i data-lucide="user"></i><span>Moi</span></a>
        `;
    }
    if (window.lucide) lucide.createIcons();
}
