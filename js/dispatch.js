import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { compressImage, getSession, checkAuth, formatFCFA, logout } from './utils.js';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- STATE ---
let items = [];
let currentItemPhoto = null;

// --- DOM ELEMENTS ---
const elements = {
    livreurSelect: document.getElementById('livreurSelect'),
    zoneInput: document.getElementById('zoneInput'),
    itemPhotoInput: document.getElementById('itemPhotoInput'),
    itemPhotoPreview: document.getElementById('itemPhotoPreview'),
    camIcon: document.getElementById('camIcon'),
    itemMontant: document.getElementById('itemMontant'),
    itemDesc: document.getElementById('itemDesc'),
    addItemBtn: document.getElementById('addItemBtn'),
    itemList: document.getElementById('itemList'),
    emptyMsg: document.getElementById('emptyMsg'),
    detailSummary: document.getElementById('detailSummary'),
    summaryTotal: document.getElementById('summaryTotal'),
    summaryCount: document.getElementById('summaryCount'),
    dispatchForm: document.getElementById('dispatchForm'),
    submitBtn: document.getElementById('submitBtn'),
    successOverlay: document.getElementById('successOverlay'),
    logoutBtn: document.getElementById('logoutBtn'),
    lightbox: document.getElementById('lightbox'),
    lightboxImg: document.getElementById('lightboxImg')
};

// --- INITIALIZATION ---
async function init() {
    checkAuth('gerant');
    lucide.createIcons();
    await loadLivreurs();
    setupEventListeners();
}

async function loadLivreurs() {
    const { data, error } = await supabaseClient.from('livreurs').select('id, nom').order('nom');
    if (data) {
        data.forEach(l => {
            const opt = document.createElement('option');
            opt.value = l.id;
            opt.textContent = l.nom;
            elements.livreurSelect.appendChild(opt);
        });
    }
}

function setupEventListeners() {
    elements.itemPhotoInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            currentItemPhoto = await compressImage(file);
            elements.itemPhotoPreview.src = URL.createObjectURL(currentItemPhoto);
            elements.itemPhotoPreview.classList.remove('hidden');
            if (elements.camIcon) elements.camIcon.classList.add('hidden');
            elements.itemMontant.focus();
        }
    });

    elements.addItemBtn.addEventListener('click', addItem);
    elements.dispatchForm.addEventListener('submit', handleSubmit);
    elements.logoutBtn.addEventListener('click', logout);
}

function addItem() {
    const montant = elements.itemMontant.value;
    const desc = elements.itemDesc.value || 'Colis';

    if (!montant || !currentItemPhoto) {
        alert("Photo et Montant obligatoires !");
        return;
    }

    const item = {
        id: Math.random().toString(36).substring(2),
        montant: parseFloat(montant),
        desc: desc,
        photo: currentItemPhoto,
        preview: URL.createObjectURL(currentItemPhoto)
    };

    items.push(item);
    renderItems();
    resetItemForm();
}

function renderItems() {
    elements.itemList.innerHTML = '';
    let total = 0;
    
    if (items.length > 0) {
        elements.emptyMsg.classList.add('hidden');
        elements.detailSummary.classList.remove('hidden');
    } else {
        elements.emptyMsg.classList.remove('hidden');
        elements.detailSummary.classList.add('hidden');
    }

    items.forEach((item) => {
        total += item.montant;
        const div = document.createElement('div');
        div.className = 'grid-item';
        div.innerHTML = `
            <img src="${item.preview}" onclick="openZoom('${item.preview}')">
            <div class="badge">${formatFCFA(item.montant)}</div>
            <button class="remove-btn" onclick="removeItem('${item.id}')">×</button>
        `;
        elements.itemList.appendChild(div);
    });

    elements.summaryTotal.textContent = formatFCFA(total);
    elements.summaryCount.textContent = `${items.length} COLIS`;
    lucide.createIcons();
}

window.openZoom = (src) => {
    elements.lightboxImg.src = src;
    elements.lightbox.style.display = 'flex';
};

window.removeItem = (id) => {
    items = items.filter(i => i.id !== id);
    renderItems();
};

function resetItemForm() {
    elements.itemMontant.value = '';
    elements.itemDesc.value = '';
    elements.itemPhotoPreview.src = '';
    elements.itemPhotoPreview.classList.add('hidden');
    if (elements.camIcon) elements.camIcon.classList.remove('hidden');
    currentItemPhoto = null;
    if (navigator.vibrate) navigator.vibrate(50);
}

async function handleSubmit(e) {
    e.preventDefault();
    if (items.length === 0) return;

    elements.submitBtn.disabled = true;
    elements.submitBtn.innerHTML = "Envoi...";

    try {
        console.log("Démarrage envoi :", items.length, "colis");
        const livreurId = elements.livreurSelect.value;
        const zone = elements.zoneInput.value;
        const { userId } = getSession();
        
        if (!livreurId) throw new Error("Sélectionnez un livreur");
        if (!userId) throw new Error("Session expirée, reconnectez-vous");

        const today = new Date().toISOString().split('T')[0];

        // 1. Check existing
        console.log("Vérification tournée existante...");
        const { data: existingSortie, error: checkErr } = await supabaseClient
            .from('sorties')
            .select('*')
            .eq('livreur_id', livreurId)
            .eq('statut', 'En Cours')
            .gte('created_at', `${today}T00:00:00Z`)
            .lte('created_at', `${today}T23:59:59Z`)
            .maybeSingle();

        if (checkErr) console.error("Erreur check:", checkErr);

        // 2. Upload
        console.log("Upload des photos...");
        const uploadPromises = items.map(async (item, index) => {
            const fileName = `colis-${Date.now()}-${index}-${Math.random().toString(36).substring(2)}.jpg`;
            const { error: upErr } = await supabaseClient.storage.from('sorties_photos').upload(fileName, item.photo);
            if (upErr) {
                console.error("Erreur upload photo", index, upErr);
                throw new Error("Échec upload photo: " + upErr.message);
            }
            const { data } = supabaseClient.storage.from('sorties_photos').getPublicUrl(fileName);
            return { 
                valeur: item.montant, 
                commentaire: item.desc, 
                photo_url: data.publicUrl,
                timestamp: new Date().toISOString()
            };
        });
        
        const finalDetails = await Promise.all(uploadPromises);
        console.log("Photos uploadées :", finalDetails.length);

        const totalAmount = items.reduce((s, i) => s + i.montant, 0);
        const totalCount = items.length;

        if (existingSortie) {
            console.log("Fusion avec tournée existante ID :", existingSortie.id);
            const newAjout = {
                id: Math.random().toString(36).substring(2),
                type: 'ajout',
                date: new Date().toISOString(),
                nb: totalCount,
                montant: totalAmount,
                photo_url: finalDetails[0].photo_url,
                details: finalDetails,
                is_fusion: true
            };
            const { error: upErr } = await supabaseClient
                .from('sorties')
                .update({ completions: [...(existingSortie.completions || []), newAjout] })
                .eq('id', existingSortie.id);
            if (upErr) throw upErr;
        } else {
            console.log("Création nouvelle tournée...");
            const { error: insErr } = await supabaseClient
                .from('sorties').insert({
                    livreur_id: livreurId,
                    gerant_id: userId,
                    photo_url: finalDetails[0].photo_url,
                    nb_colis: totalCount,
                    montant_total: totalAmount,
                    zone_libre: zone,
                    details_colis: finalDetails,
                    statut: 'En Cours'
                });
            if (insErr) throw insErr;
        }

        console.log("Succès final !");
        elements.successOverlay.classList.add('show');
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        setTimeout(() => window.location.reload(), 2000);

    } catch (err) {
        console.error("CRITICAL ERROR during save:", err);
        alert("Erreur critique d'enregistrement : " + err.message);
        elements.submitBtn.disabled = false;
        elements.submitBtn.innerHTML = "VALIDER TOUT";
    }
}

init();
