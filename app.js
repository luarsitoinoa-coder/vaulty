// ==========================================
// CONFIGURACIÓN OPCIONAL DIRECTA DE SUPABASE
// (También puedes pegarla dentro de la app en Configuración > Conectar Base de Datos)
// ==========================================
const DEFAULT_SUPABASE_URL = "";
const DEFAULT_SUPABASE_KEY = "";

const DOMINICAN_BANKS = [
    { name: 'Banco Popular Dominicano', color: '#003876', badge: 'BPD' },
    { name: 'Asociación Cibao', color: '#004b93', badge: 'ACAP' },
    { name: 'Santa Cruz', color: '#008542', badge: 'BSC' },
    { name: 'BHD', color: '#007a33', badge: 'BHD' },
    { name: 'Asociación Popular', color: '#005596', badge: 'APAP' },
    { name: 'Qik Banco Digital', color: '#00a3e0', badge: 'Qik' },
    { name: 'Scotiabank', color: '#ec111a', badge: 'SB' },
    { name: 'Banco Caribe', color: '#008c45', badge: 'BC' },
    { name: 'Banreservas', color: '#005596', badge: 'BR' }
];

const MONTHS = ['Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre'];
const RATE_USD = 60.0;

let supabaseClient = null;
let modalTxType = 'gasto';

let appState = JSON.parse(localStorage.getItem('vaulty_v2_state')) || {
    userName: 'Eduarly',
    userEmail: 'eduarlymoua90@gmail.com',
    currency: 'RD$',
    period: 'año',
    selectedMonthIndex: 5, // Noviembre
    txFilterType: 'gasto',
    budgetLimit: 15000,
    transfers: 0,
    connectedBanks: [],
    supabaseUrl: DEFAULT_SUPABASE_URL,
    supabaseKey: DEFAULT_SUPABASE_KEY,
    transactions: [
        { id: 101, type: 'gasto', amount: 145, desc: 'Consumo registrado', monthIndex: 3 }
    ]
};

function saveLocalState() {
    localStorage.setItem('vaulty_v2_state', JSON.stringify(appState));
}

function initSupabase() {
    const url = appState.supabaseUrl || DEFAULT_SUPABASE_URL;
    const key = appState.supabaseKey || DEFAULT_SUPABASE_KEY;
    if (url && key && window.supabase) {
        try {
            supabaseClient = window.supabase.createClient(url, key);
            document.getElementById('cloud-dot').className = 'w-2 h-2 rounded-full bg-emeraldAccent';
            document.getElementById('cloud-status-text').textContent = 'Nube Activa (Vaulty)';
            document.getElementById('cfg-cloud-desc').textContent = 'Conectado a Supabase · Sincronización activa';
            syncFromCloud();
        } catch (e) {
            console.error('Error conectando Supabase:', e);
        }
    }
}

async function syncFromCloud() {
    if (!supabaseClient) return;
    const { data, error } = await supabaseClient
        .from('transactions')
        .select('*')
        .order('id', { ascending: false });

    if (!error && data && data.length > 0) {
        appState.transactions = data.map(row => ({
            id: row.id,
            type: row.type,
            amount: Number(row.amount),
            desc: row.desc,
            monthIndex: Number(row.month_index)
        }));
        saveLocalState();
        renderAll();
    }
}

function openCloudConfigModal() {
    document.getElementById('sb-url-input').value = appState.supabaseUrl || '';
    document.getElementById('sb-key-input').value = appState.supabaseKey || '';
    document.getElementById('modal-cloud').classList.remove('hidden');
}

async function saveSupabaseCredentials() {
    const url = document.getElementById('sb-url-input').value.trim();
    const key = document.getElementById('sb-key-input').value.trim();
    if (!url || !key) {
        showToast('Pega tanto la URL como la Key de Supabase');
        return;
    }
    appState.supabaseUrl = url;
    appState.supabaseKey = key;
    saveLocalState();
    closeModal('modal-cloud');
    initSupabase();
    showToast('¡Vaulty conectado a Supabase con éxito!');
}

function formatMoney(amountRD) {
    const val = appState.currency === 'RD$' ? amountRD : (amountRD / RATE_USD);
    return `${appState.currency}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2600);
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function switchTab(tabName) {
    ['inicio', 'transacciones', 'parati', 'presupuesto', 'cuentas', 'configuracion'].forEach(s => {
        document.getElementById(`view-${s}`).classList.add('hidden');
    });
    document.getElementById(`view-${tabName}`).classList.remove('hidden');

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('text-emeraldAccent');
        btn.classList.add('text-gray-400');
    });

    const activeBtn = document.getElementById(`nav-${tabName}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-gray-400');
        activeBtn.classList.add('text-emeraldAccent');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderAll();
}

function openView(name) {
    switchTab(name);
}

function setCurrency(curr) {
    appState.currency = curr;
    saveLocalState();
    renderAll();
}

function setPeriod(period, btnEl) {
    appState.period = period;
    document.querySelectorAll('.period-btn').forEach(b => {
        b.className = 'period-btn flex-1 py-2 rounded-full text-gray-300 hover:text-white transition';
    });
    btnEl.className = 'period-btn flex-1 py-2 rounded-full bg-white text-black font-semibold shadow transition';

    const labels = {
        ayer: 'Ayer has gastado',
        hoy: 'Hoy has gastado',
        semana: 'Esta semana has gastado',
        mes: 'Este mes has gastado',
        año: 'Este año has gastado'
    };
    document.getElementById('period-label').textContent = labels[period];
    renderAll();
}

function openTransactionModal(type) {
    modalTxType = type;
    document.getElementById('tx-modal-title').textContent = type === 'gasto' ? 'Registrar Gasto en Vaulty' : 'Registrar Ingreso en Vaulty';
    document.querySelectorAll('.curr-label').forEach(el => el.textContent = appState.currency);
    document.getElementById('tx-input-amount').value = '';
    document.getElementById('tx-input-desc').value = '';
    document.getElementById('modal-transaction').classList.remove('hidden');
    setTimeout(() => document.getElementById('tx-input-amount').focus(), 100);
}

async function saveNewTransaction() {
    const rawVal = parseFloat(document.getElementById('tx-input-amount').value);
    const desc = document.getElementById('tx-input-desc').value.trim() || (modalTxType === 'gasto' ? 'Gasto general' : 'Ingreso recibido');

    if (!rawVal || rawVal <= 0) {
        showToast('Ingresa un monto válido');
        return;
    }

    const amountRD = appState.currency === 'RD$' ? rawVal : rawVal * RATE_USD;
    const mIdx = appState.selectedMonthIndex;

    const newTx = {
        id: Date.now(),
        type: modalTxType,
        amount: amountRD,
        desc,
        monthIndex: mIdx
    };

    appState.transactions.unshift(newTx);
    saveLocalState();
    closeModal('modal-transaction');
    renderAll();
    showToast(modalTxType === 'gasto' ? 'Gasto guardado en Vaulty' : 'Ingreso guardado en Vaulty');

    if (supabaseClient) {
        const { data, error } = await supabaseClient
            .from('transactions')
            .insert([{
                user_email: appState.userEmail,
                type: modalTxType,
                amount: amountRD,
                desc: desc,
                month_index: mIdx
            }])
            .select();

        if (!error && data && data[0]) {
            newTx.id = data[0].id;
            saveLocalState();
        }
    }
}

async function deleteTransaction(id) {
    appState.transactions = appState.transactions.filter(t => t.id !== id);
    saveLocalState();
    renderAll();
    showToast('Registro eliminado de Vaulty');

    if (supabaseClient) {
        await supabaseClient.from('transactions').delete().eq('id', id);
    }
}

function openTransferModal() {
    document.getElementById('transfer-input-amount').value = '';
    document.getElementById('modal-transfer').classList.remove('hidden');
}

function saveNewTransfer() {
    const val = parseFloat(document.getElementById('transfer-input-amount').value);
    if (!val || val <= 0) {
        showToast('Monto inválido');
        return;
    }
    const amountRD = appState.currency === 'RD$' ? val : val * RATE_USD;
    appState.transfers += amountRD;
    saveLocalState();
    closeModal('modal-transfer');
    renderAll();
    showToast('Transferencia actualizada en Vaulty');
}

function openBudgetEditModal() {
    const newLimit = prompt('Escribe tu nuevo presupuesto mensual en RD$ para Vaulty:', appState.budgetLimit);
    if (newLimit && !isNaN(parseFloat(newLimit))) {
        appState.budgetLimit = parseFloat(newLimit);
        saveLocalState();
        renderAll();
        showToast('Presupuesto de Vaulty actualizado');
    }
}

function openProfileEditModal() {
    const newName = prompt('Tu nombre en Vaulty:', appState.userName);
    if (newName && newName.trim()) {
        appState.userName = newName.trim();
        saveLocalState();
        renderAll();
        showToast('Nombre actualizado');
    }
}

function setTxTypeFilter(type) {
    appState.txFilterType = type;
    const btnG = document.getElementById('tab-tx-gastos');
    const btnI = document.getElementById('tab-tx-ingresos');

    if (type === 'gasto') {
        btnG.className = 'py-2.5 rounded-xl bg-[#163626] text-white font-semibold text-[14px] transition';
        btnI.className = 'py-2.5 rounded-xl text-emeraldAccent font-semibold text-[14px] hover:bg-white/5 transition';
        document.getElementById('tx-month-subtitle').textContent = 'Gastos por categoría';
        document.getElementById('ver-tx-label').textContent = 'Ver gastos';
    } else {
        btnI.className = 'py-2.5 rounded-xl bg-[#163626] text-white font-semibold text-[14px] transition';
        btnG.className = 'py-2.5 rounded-xl text-emeraldAccent font-semibold text-[14px] hover:bg-white/5 transition';
        document.getElementById('tx-month-subtitle').textContent = 'Ingresos del mes';
        document.getElementById('ver-tx-label').textContent = 'Ver ingresos';
    }
    renderAll();
}

function changeSelectedMonth(delta) {
    appState.selectedMonthIndex = Math.max(0, Math.min(5, appState.selectedMonthIndex + delta));
    renderAll();
}

function selectBarMonth(idx) {
    appState.selectedMonthIndex = idx;
    const totals = getMonthlyTotals(appState.txFilterType);
    document.getElementById('bar-selected-info').textContent = `${MONTHS[idx]}: ${formatMoney(totals[idx])}`;
    renderAll();
}

function toggleTxDetailList() {
    document.getElementById('tx-detail-drawer').classList.toggle('hidden');
}

function exportMonthlySummaryPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const monthName = MONTHS[appState.selectedMonthIndex];
    const monthTxs = appState.transactions.filter(t => t.monthIndex === appState.selectedMonthIndex);

    doc.setFontSize(18);
    doc.text(`Vaulty - Resumen de ${monthName}`, 14, 22);
    doc.setFontSize(11);
    doc.text(`Usuario: ${appState.userName} (${appState.userEmail})`, 14, 30);

    let y = 44;
    if (monthTxs.length === 0) {
        doc.text('No hay transacciones registradas en este mes.', 14, y);
    } else {
        monthTxs.forEach((t, i) => {
            const sign = t.type === 'gasto' ? '-' : '+';
            doc.text(`${i + 1}. [${t.type.toUpperCase()}] ${t.desc}: ${sign}${formatMoney(t.amount)}`, 14, y);
            y += 8;
        });
    }

    doc.save(`Vaulty_Resumen_${monthName}.pdf`);
    showToast(`PDF de Vaulty (${monthName}) descargado`);
}

function openConnectEmailModal() {
    document.getElementById('modal-connect-email').classList.remove('hidden');
}

function openBankSelector() {
    const container = document.getElementById('banks-list-container');
    container.innerHTML = DOMINICAN_BANKS.map(b => `
        <button onclick="selectBank('${b.name}')" class="w-full p-3.5 rounded-2xl bg-[#14231b] hover:bg-[#1c3025] flex items-center justify-between transition">
            <div class="flex items-center gap-3.5">
                <div class="w-11 h-11 rounded-2xl bg-white flex items-center justify-center font-extrabold text-xs shrink-0" style="color:${b.color}">
                    ${b.badge}
                </div>
                <span class="text-[15px] font-bold text-white">${b.name}</span>
            </div>
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
        </button>
    `).join('');
    document.getElementById('bank-selector-sheet').classList.remove('hidden');
}

function selectBank(bankName) {
    document.getElementById('selected-bank-display').textContent = bankName;
    document.getElementById('selected-bank-display').classList.remove('text-gray-400');
    document.getElementById('selected-bank-display').classList.add('text-white', 'font-semibold');
    if (!appState.connectedBanks.includes(bankName)) {
        appState.connectedBanks.push(bankName);
        saveLocalState();
    }
    closeModal('bank-selector-sheet');
    renderAll();
}

function connectEmailProvider(provider) {
    if (appState.connectedBanks.length === 0) {
        showToast('Selecciona tu banco primero');
        return;
    }
    closeModal('modal-connect-email');
    showToast(`Vaulty vinculado con ${provider}`);
    renderAll();
}

function resetAllData() {
    if (confirm('¿Seguro que deseas reiniciar todos los registros de Vaulty?')) {
        localStorage.removeItem('vaulty_v2_state');
        location.reload();
    }
}

function getMonthlyTotals(type) {
    const arr = [0, 0, 0, 0, 0, 0];
    appState.transactions.forEach(t => {
        if (t.type === type && t.monthIndex >= 0 && t.monthIndex < 6) {
            arr[t.monthIndex] += Number(t.amount);
        }
    });
    return arr;
}

function renderAll() {
    document.getElementById('user-greeting-name').textContent = appState.userName;
    document.getElementById('cfg-user-email').textContent = appState.userEmail;

    const isRD = appState.currency === 'RD$';
    document.getElementById('curr-btn-rd').className = isRD ? 'px-4 py-1 rounded-full text-[13px] font-bold bg-white text-[#0c3b24] transition' : 'px-4 py-1 rounded-full text-[13px] font-semibold text-gray-300 transition';
    document.getElementById('curr-btn-us').className = !isRD ? 'px-4 py-1 rounded-full text-[13px] font-bold bg-white text-[#0c3b24] transition' : 'px-4 py-1 rounded-full text-[13px] font-semibold text-gray-300 transition';

    document.getElementById('tx-curr-rd').className = isRD ? 'px-3.5 py-1 rounded-full text-[12px] font-bold bg-white text-[#0c3b24]' : 'px-3.5 py-1 rounded-full text-[12px] font-semibold text-gray-300';
    document.getElementById('tx-curr-us').className = !isRD ? 'px-3.5 py-1 rounded-full text-[12px] font-bold bg-white text-[#0c3b24]' : 'px-3.5 py-1 rounded-full text-[12px] font-semibold text-gray-300';

    const expTotals = getMonthlyTotals('gasto');
    const incTotals = getMonthlyTotals('ingreso');
    const totalYearExpense = expTotals.reduce((a, b) => a + b, 0);

    const mIdx = appState.selectedMonthIndex;
    const currentMonthExpense = expTotals[mIdx];
    const currentMonthIncome = incTotals[mIdx];

    const heroVal = appState.period === 'año' ? totalYearExpense : currentMonthExpense;
    document.getElementById('hero-amount').textContent = formatMoney(heroVal);

    document.getElementById('month-income-text').textContent = currentMonthIncome > 0 ? formatMoney(currentMonthIncome) : 'Sin ingresos';
    document.getElementById('month-income-text').className = currentMonthIncome > 0 ? 'text-[15px] font-bold text-emeraldAccent mt-2.5' : 'text-[13px] text-gray-400 mt-3';

    document.getElementById('month-expense-text').textContent = currentMonthExpense > 0 ? formatMoney(currentMonthExpense) : 'No hay registros';
    document.getElementById('month-expense-text').className = currentMonthExpense > 0 ? 'text-[15px] font-bold text-white mt-2.5' : 'text-[13px] text-gray-400 mt-3';

    const available = Math.max(0, currentMonthIncome - currentMonthExpense);
    document.getElementById('available-amount').textContent = formatMoney(available);
    document.getElementById('available-dot').className = currentMonthIncome > 0 ? 'w-2.5 h-2.5 rounded-full bg-emeraldAccent' : 'w-2.5 h-2.5 rounded-full bg-barYellow';
    document.getElementById('available-warning').style.display = currentMonthIncome > 0 ? 'none' : 'flex';
    document.getElementById('transfers-amount').textContent = formatMoney(appState.transfers);

    if (appState.connectedBanks.length > 0) {
        document.getElementById('connected-bank-subtitle').textContent = `Conectado: ${appState.connectedBanks.join(', ')}`;
    }

    const activeData = appState.txFilterType === 'gasto' ? expTotals : incTotals;
    const maxVal = Math.max(150, ...activeData);
    document.getElementById('y-max').textContent = isRD ? `RD$${Math.round(maxVal)}` : `US$${(maxVal / RATE_USD).toFixed(0)}`;
    document.getElementById('y-mid').textContent = isRD ? `RD$${Math.round(maxVal * 0.66)}` : `US$${((maxVal * 0.66) / RATE_USD).toFixed(0)}`;
    document.getElementById('y-min').textContent = isRD ? `RD$${Math.round(maxVal * 0.33)}` : `US$${((maxVal * 0.33) / RATE_USD).toFixed(0)}`;

    const barsContainer = document.getElementById('bars-container');
    barsContainer.innerHTML = activeData.map((val, idx) => {
        const heightPct = val > 0 ? Math.max(5, Math.min(100, (val / maxVal) * 100)) : 0;
        const barColor = appState.txFilterType === 'gasto' ? 'bg-barYellow' : 'bg-emeraldAccent';
        return `
            <div onclick="selectBarMonth(${idx})" class="h-full flex items-end justify-center cursor-pointer group">
                ${val > 0 ? `<div style="height:${heightPct}%" class="w-3.5 ${barColor} rounded-t-md rounded-b-sm transition-all duration-300"></div>` : ''}
            </div>
        `;
    }).join('');

    document.getElementById('tx-month-title').textContent = MONTHS[mIdx];
    document.getElementById('tx-month-total').textContent = formatMoney(activeData[mIdx]);
    document.getElementById('tx-transfers-total').textContent = formatMoney(appState.transfers);

    const monthTxs = appState.transactions.filter(t => t.monthIndex === mIdx && t.type === appState.txFilterType);
    const listEl = document.getElementById('tx-items-list');
    if (monthTxs.length === 0) {
        listEl.innerHTML = `<p class="text-xs text-gray-400 py-1">No hay registros en ${MONTHS[mIdx]}.</p>`;
    } else {
        listEl.innerHTML = monthTxs.map(t => `
            <div class="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                <span class="text-gray-200 text-xs">${t.desc}</span>
                <div class="flex items-center gap-3">
                    <span class="font-bold text-xs ${t.type === 'gasto' ? 'text-barYellow' : 'text-emeraldAccent'}">${formatMoney(t.amount)}</span>
                    <button onclick="deleteTransaction(${t.id})" class="text-rose-400 text-xs hover:text-rose-300">✕</button>
                </div>
            </div>
        `).join('');
    }

    const budgetPct = Math.min(100, Math.round((currentMonthExpense / appState.budgetLimit) * 100));
    document.getElementById('budget-limit-display').textContent = formatMoney(appState.budgetLimit);
    document.getElementById('budget-progress-bar').style.width = `${Math.max(3, budgetPct)}%`;
    document.getElementById('budget-spent-label').textContent = `Gastado este mes: ${formatMoney(currentMonthExpense)}`;
    document.getElementById('budget-remaining-pct').textContent = `Disponible: ${Math.max(0, 100 - budgetPct)}%`;

    const accountsEl = document.getElementById('accounts-list');
    let accountsHTML = `
        <div class="bg-[#111d16] border border-white/[0.06] rounded-[22px] p-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-[#163626] text-emeraldAccent flex items-center justify-center font-bold">💵</div>
                <div>
                    <p class="font-bold text-white text-sm">Efectivo / Cartera (Vaulty)</p>
                    <p class="text-xs text-gray-400">Cuenta principal</p>
                </div>
            </div>
            <span class="font-bold text-white text-base">${formatMoney(available)}</span>
        </div>
    `;
    appState.connectedBanks.forEach(bank => {
        accountsHTML += `
            <div class="bg-[#111d16] border border-emerald-500/20 rounded-[22px] p-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-2xl bg-white text-black flex items-center justify-center font-extrabold text-xs">🏦</div>
                    <div>
                        <p class="font-bold text-white text-sm">${bank}</p>
                        <p class="text-xs text-emeraldAccent">Sincronizado</p>
                    </div>
                </div>
                <span class="text-xs font-semibold text-gray-300">Activo</span>
            </div>
        `;
    });
    accountsEl.innerHTML = accountsHTML;
}

initSupabase();
renderAll();