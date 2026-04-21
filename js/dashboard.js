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
            // Pour les anciennes sorties, on doit calculer. 
            // Pour les nouvelles (après ma correction de clôture), s.montant_total est déjà le NET.
            // On vérifie si la sortie a été clôturée AVANT aujourd'hui 12:00 (moment de ma correction)
            // Ou plus simple : si s.cloture_at existe, on fait confiance au montant_total.
            if (s.cloture_at) {
                monthlyTotal += Number(s.montant_total);
            } else {
                const ajouts = (s.completions || []).filter(c => c.type === 'ajout').reduce((sum, c) => sum + Number(c.montant), 0);
                const retours = (s.completions || []).filter(c => c.type === 'retour').reduce((sum, c) => sum + Number(c.montant), 0);
                monthlyTotal += (Number(s.montant_total) + ajouts - retours);
            }
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
            const ajouts = (s.completions || []).filter(c => c.type === 'ajout').reduce((sum, c) => sum + Number(c.nb || 0), 0);
            const retours = (s.completions || []).filter(c => c.type === 'retour').reduce((sum, c) => sum + Number(c.nb || 0), 0);
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
            div.style.cssText = 'display:flex; align-items:center; background:white; padding:0.75rem; border-radius:12px; margin-bottom:0.5rem; border:1px solid var(--slate-100);';
            div.innerHTML = `
                <img src="${s.photo_url}" style="width:40px; height:40px; border-radius:8px; object-fit:cover;">
                <div class="activity-info" style="flex:1; margin-left:0.75rem;">
                    <h4 style="font-size:0.8rem; font-weight:800; margin:0;">${s.livreur?.nom || 'Inconnu'}</h4>
                    <p style="font-size:0.6rem; color:var(--slate-500); margin:0;">${s.zone_libre} • ${new Date(s.created_at).toLocaleDateString()}</p>
                </div>
                <div style="text-align: right;">
                    <span class="badge" style="font-size:0.5rem; padding:0.1rem 0.4rem; background:${s.statut === 'En Cours' ? '#eff6ff' : '#ecfdf5'}; color:${s.statut === 'En Cours' ? '#1e40af' : '#047857'};">${s.statut}</span>
                    <p style="font-weight: 900; font-size: 0.75rem; margin-top: 0.1rem; color:var(--brand-navy);">${formatFCFA(s.montant_total)}</p>
                </div>
            `;
            list.appendChild(div);
        });
    } else {
        list.innerHTML = '<p style="text-align: center; color: var(--slate-400); padding: 1rem;">Aucune activité.</p>';
    }
    lucide.createIcons();
}

init();
