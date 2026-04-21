import { getSession, logout } from './utils.js';

export function initMenu() {
    const session = getSession();
    if (!session.userId) return;

    document.body.classList.add('has-sidebar-menu');

    // 1. Création de l'Overlay et de la Sidebar
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebarOverlay';

    const sidebar = document.createElement('div');
    sidebar.className = 'sidebar';
    sidebar.id = 'appSidebar';

    // 2. Contenu de la Sidebar
    sidebar.innerHTML = `
        <div class="sidebar-header">
            <h2 style="font-size: 1.25rem; font-weight: 900; color: white; margin: 0;">ALC Transport</h2>
            <p style="font-size: 0.75rem; opacity: 0.8; margin: 0;">Connecté en tant que ${session.name}</p>
        </div>
        <div class="sidebar-content">
            ${getLinksByRole(session.role)}
        </div>
        <div class="menu-footer">
            <button id="sidebarLogout" class="btn" style="background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2;">
                <i data-lucide="log-out" style="width: 16px;"></i> DÉCONNEXION
            </button>
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(sidebar);

    // 3. Injection du bouton Hamburger dans le header s'il n'existe pas
    injectBurgerButton();

    // 4. Events
    overlay.onclick = toggleMenu;
    document.getElementById('sidebarLogout').onclick = logout;

    if (window.lucide) lucide.createIcons();
}

function getLinksByRole(role) {
    const currentPath = window.location.pathname;
    
    let links = '';
    
    if (role === 'patronne') {
        links = `
            <a href="patronne.html" class="menu-link ${currentPath.includes('patronne') ? 'active' : ''}"><i data-lucide="crown"></i> Dashboard Boss</a>
            <a href="point.html" class="menu-link ${currentPath.includes('point') ? 'active' : ''}"><i data-lucide="wallet"></i> Valider les Points</a>
            <a href="rapports.html" class="menu-link ${currentPath.includes('rapports') ? 'active' : ''}"><i data-lucide="archive"></i> Audits & Archives</a>
            <a href="livreurs.html" class="menu-link ${currentPath.includes('livreurs') ? 'active' : ''}"><i data-lucide="users"></i> Équipe Terrain</a>
            <a href="colis.html" class="menu-link ${currentPath.includes('colis') ? 'active' : ''}"><i data-lucide="package"></i> Registre Complet</a>
        `;
    } else if (role === 'gerant') {
        links = `
            <a href="dispatch.html" class="menu-link ${currentPath.includes('dispatch') ? 'active' : ''}"><i data-lucide="plus-square"></i> Nouveau Dispatch</a>
            <a href="point.html" class="menu-link ${currentPath.includes('point') ? 'active' : ''}"><i data-lucide="wallet"></i> Faire le Point</a>
            <a href="rapports.html" class="menu-link ${currentPath.includes('rapports') ? 'active' : ''}"><i data-lucide="archive"></i> Historique Gérant</a>
            <a href="livreurs.html" class="menu-link ${currentPath.includes('livreurs') ? 'active' : ''}"><i data-lucide="users"></i> Gestion Équipe</a>
            <a href="dashboard.html" class="menu-link ${currentPath.includes('dashboard') ? 'active' : ''}"><i data-lucide="bar-chart-3"></i> Statistiques</a>
        `;
    } else if (role === 'livreur') {
        links = `
            <a href="livreur-app.html" class="menu-link active"><i data-lucide="truck"></i> Mes Livraisons</a>
        `;
    }

    return links;
}

export function toggleMenu() {
    const sidebar = document.getElementById('appSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}

function injectBurgerButton() {
    // Si le bouton existe déjà, on ne fait rien
    if (document.querySelector('.burger-menu-btn')) return;

    const burgerBtn = document.createElement('button');
    burgerBtn.className = 'burger-menu-btn';
    burgerBtn.id = 'toggleAppMenu';
    burgerBtn.innerHTML = '<i data-lucide="menu"></i>';
    burgerBtn.onclick = toggleMenu;
    
    document.body.appendChild(burgerBtn);
}

// Auto-init si on est importé
initMenu();
