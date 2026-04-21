import { getSession, logout } from './utils.js';

export function initMenu() {
    const session = getSession();
    if (!session.userId) return;

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
    // On cherche un conteneur d'en-tête existant
    let header = document.querySelector('.page-header, .boss-hero, .fixed-top-area, .header-livreur');
    
    if (header) {
        // Si c'est l'un de ces conteneurs, on injecte le bouton au début ou dans un coin
        const burgerBtn = document.createElement('button');
        burgerBtn.className = 'burger-menu-btn';
        burgerBtn.innerHTML = '<i data-lucide="menu"></i>';
        burgerBtn.onclick = toggleMenu;
        
        // On l'ajoute comme premier enfant
        header.prepend(burgerBtn);
    } else {
        // Fallback : Bouton flottant si pas de header détecté
        const fab = document.createElement('button');
        fab.className = 'burger-menu-btn';
        fab.style.position = 'fixed';
        fab.style.top = '15px';
        fab.style.left = '15px';
        fab.style.zIndex = '2500';
        fab.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        fab.innerHTML = '<i data-lucide="menu"></i>';
        fab.onclick = toggleMenu;
        document.body.appendChild(fab);
        
        // On descend un peu le contenu du body pour pas qu'il soit dessous sur mobile si possible
        document.body.style.paddingTop = '60px';
    }
}

// Auto-init si on est importé
initMenu();
