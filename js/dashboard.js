import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { checkAuth, formatFCFA } from './utils.js';

let supabaseClient = null;

async function init() {
    if (!window.supabase) {
        alert("Erreur de connexion : La base de données n'est pas disponible.");
        return;
    }
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    checkAuth();
    lucide.createIcons();
    loadDashboardStats();
    
    document.getElementById('refreshBtn').addEventListener('click', () => location.reload());
    document.getElementById('periodFilter').addEventListener('change', loadDashboardStats);
}

function getPeriodDates(period) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    switch(period) {
        case 'today':
            return {
                start: today.toISOString(),
                label: "CA (Aujourd'hui)"
            };
        case 'week':
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
            return {
                start: startOfWeek.toISOString(),
                label: "CA (Semaine)"
            };
        case 'month':
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            return {
                start: startOfMonth.toISOString(),
                label: "CA (Ce Mois)"
            };
        case 'all':
            return {
                start: new Date(2000, 0, 1).toISOString(),
                label: "CA (Global)"
            };
        default:
            return {
                start: new Date(today.getFullYear(), today.getMonth(), 1).toISOString(),
                label: "CA (Mois)"
            };
    }
}

async function loadDashboardStats() {
    const period = document.getElementById('periodFilter').value || 'month';
    const { start, label } = getPeriodDates(period);

    document.getElementById('revenueLabel').textContent = label;

    // 1. Recettes de la période (Clôturés)
    const { data: periodData } = await supabaseClient
        .from('sorties')
        .select('montant_total, completions')
        .eq('statut', 'Clôturé')
        .gte('created_at', start);

    let monthlyTotal = 0;
    if (periodData) {
        periodData.forEach(s => {
            const ajouts = (s.completions || []).filter(c => c.type === 'ajout').reduce((sum, c) => sum + Number(c.montant), 0);
            const retours = (s.completions || []).filter(c => c.type === 'retour').reduce((sum, c) => sum + Number(c.montant), 0);
            monthlyTotal += (Number(s.montant_total) + ajouts - retours);
        });
    }
    document.getElementById('statMonthlyRevenue').textContent = formatFCFA(monthlyTotal);

    // 2. À Encaisser (En Cours)
    const { data: pendingData } = await supabaseClient
        .from('sorties')
        .select('montant_total, completions')
        .eq('statut', 'En Cours');

    let pendingTotal = 0;
    if (pendingData) {
        pendingData.forEach(s => {
            const ajouts = (s.completions || []).filter(c => c.type === 'ajout').reduce((sum, c) => sum + Number(c.montant), 0);
            const retours = (s.completions || []).filter(c => c.type === 'retour').reduce((sum, c) => sum + Number(c.montant), 0);
            pendingTotal += (Number(s.montant_total) + ajouts - retours);
        });
        document.getElementById('statActiveLivreurs').textContent = pendingData.length;
    }
    document.getElementById('statPending').textContent = formatFCFA(pendingTotal);

    // 3. Taux de Succès
    const { data: allSorties } = await supabaseClient
        .from('sorties')
        .select('nb_colis, completions')
        .limit(200);

    if (allSorties) {
        let totalColis = 0;
        let totalRetours = 0;
        allSorties.forEach(s => {
            const ajouts = (s.completions || []).filter(c => c.type === 'ajout').reduce((sum, c) => sum + Number(c.nb), 0);
            const retours = (s.completions || []).filter(c => c.type === 'retour').reduce((sum, c) => sum + Number(c.nb || 1), 0);
            totalColis += (Number(s.nb_colis) + ajouts);
            totalRetours += retours;
        });

        const successRate = totalColis > 0 ? Math.round(((totalColis - totalRetours) / totalColis) * 100) : 0;
        document.getElementById('statProgressBar').style.width = `${successRate}%`;
        document.getElementById('statSuccessRate').textContent = `${successRate}% de réussite`;
        document.getElementById('statTotalColis').textContent = `${totalColis} colis traités`;
    }

    // 4. Activités Récentes
    const { data: recent } = await supabaseClient
        .from('sorties')
        .select('*, livreur:livreurs(nom)')
        .order('created_at', { ascending: false })
        .limit(5);

    renderRecentActivity(recent);
}

function renderRecentActivity(data) {
    const list = document.getElementById('recentActivityList');
    list.innerHTML = '';
    if (data && data.length > 0) {
        data.forEach(s => {
            const div = document.createElement('div');
            div.className = 'activity-item';
            div.innerHTML = `
                <img src="${s.photo_url}" class="preview-img">
                <div class="activity-info">
                    <h4>${s.livreur.nom}</h4>
                    <p>${new Date(s.created_at).toLocaleDateString()} • ${s.zone_libre}</p>
                </div>
                <div style="text-align: right;">
                    <div class="badge" style="background: ${s.statut === 'En Cours' ? 'var(--slate-100)' : '#dcfce7'}">${s.statut}</div>
                    <p style="font-weight: 800; font-size: 0.8rem; margin-top: 0.25rem;">${formatFCFA(s.montant_total)}</p>
                </div>
            `;
            list.appendChild(div);
        });
    } else {
        list.innerHTML = '<p style="text-align: center; color: var(--slate-400);">Aucune activité.</p>';
    }
    lucide.createIcons();
}

init();
