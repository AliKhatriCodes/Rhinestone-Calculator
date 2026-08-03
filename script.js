const items = {
    '6SS': { name: '6SS', price: 0.03 },
    '10SS': { name: '10SS', price: 0.03 },
    '16SS': { name: '16SS', price: 0.05 },
    '4x4': { name: '4/4 Chorsi', price: 0.15 },
    '6x6': { name: '6/6 Chorsi', price: 0.25 },
    '2.5x5': { name: '2.5/5 Tube', price: 0.15 },
    '3x7': { name: '3/7 Tube', price: 0.25 },
    'applic': { name: 'Applic', price: 0 }
};

const state = {
    prices: {
        '6SS': 0.03,
        '10SS': 0.03,
        '16SS': 0.05,
        '4x4': 0.15,
        '6x6': 0.25,
        '2.5x5': 0.15,
        '3x7': 0.25
    },
    inchPrice: 2,
    qty: {},
    applic: {},
    baseTotal: 0
};

let pendingTotalAction = null;
let totalActionAutoApplyTimer = null;

function loadSettings() {
    // session-only pricing, no persistent save
}

function saveSettings() {
    handleSelection();
    toggleSettings();
}

function toggleApplic() {
    handleSelection();
}

function toggleSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal.style.display === 'flex') {
        modal.style.display = 'none';
    } else {
        modal.style.display = 'flex';
        renderSettings();
    }
}

function renderSettings() {
    const content = document.getElementById('settingsContent');
    content.innerHTML = '';

    const applicDiv = document.createElement('div');
    applicDiv.className = 'glass-card p-4 rounded-xl mt-4';
    applicDiv.innerHTML = `
        <h3 class="text-white font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">Applic Price (per inch)</h3>
        <div class="flex items-center justify-between">
            <label class="text-white text-sm">Price per inch (Rupa)</label>
            <input type="number" id="inch-price" value="${state.inchPrice.toFixed(2)}" class="w-28 input-field text-white px-4 py-2 rounded-xl" step="0.01">
        </div>
    `;
    content.appendChild(applicDiv);
}

function handleSelection() {
    const inputsContainer = document.getElementById('inputs');
    inputsContainer.innerHTML = '';
    const checkedItems = document.querySelectorAll('input[name="item"]:checked');

    checkedItems.forEach(checkbox => {
        const itemKey = checkbox.value;
        if (itemKey === 'applic') return;
        const item = items[itemKey];
        const qtyValue = state.qty[itemKey] ?? 1;
        const inputDiv = document.createElement('div');
        inputDiv.className = 'glass-card rounded-xl p-3 slide-in w-full input-item-card';
        inputDiv.innerHTML = `
            <div class="card-header">
                <span class="title-badge">${item.name}</span>
                <span class="metric-chip">Qty</span>
            </div>
            <input type="number" id="qty-${itemKey}" placeholder="Qty" class="w-full input-field text-white rounded-xl" value="${qtyValue}" min="0" step="1">
            <div class="price-row">
                <label for="price-${itemKey}">Price</label>
                <input type="number" id="price-${itemKey}" value="${state.prices[itemKey].toFixed(2)}" min="0" step="0.01" class="price-input text-white">
            </div>
            <div class="total-pill" id="total-${itemKey}">Total: 0.00</div>
        `;
        inputsContainer.appendChild(inputDiv);
    });

    if (document.getElementById('applicToggle').checked) {
        const applicCard = document.createElement('div');
        applicCard.id = 'applic-input';
        applicCard.className = 'glass-card rounded-2xl p-3 slide-in w-full applic-card';
        applicCard.innerHTML = `
            <div class="applic-header">
                <div>
                    <div class="applic-title">Applic</div>
                    <div class="applic-subtitle">Add dimensions to calculate the applic price</div>
                </div>
                <span class="metric-chip">${state.inchPrice.toFixed(2)} / inch</span>
            </div>
            <div class="applic-grid">
                <div class="applic-field">
                    <label class="applic-label" for="dimension1-applic">Dimension 1</label>
                    <input type="number" id="dimension1-applic" placeholder="Enter first size" class="w-full input-field text-white rounded-xl" value="${state.applic.dim1 || ''}" min="0" step="0.1">
                </div>
                <div class="applic-field">
                    <label class="applic-label" for="dimension2-applic">Dimension 2</label>
                    <input type="number" id="dimension2-applic" placeholder="Enter second size" class="w-full input-field text-white rounded-xl" value="${state.applic.dim2 || ''}" min="0" step="0.1">
                </div>
            </div>
            <div class="applic-footer">
                <span class="stat-chip">Inches <span id="total-inches-applic">0.00</span></span>
                <span class="stat-chip accent">Rate <span id="price-per-inch-applic">${state.inchPrice.toFixed(2)}</span> Rupa</span>
            </div>
            <div class="total-pill" id="total-applic">Total: 0.00</div>
        `;
        inputsContainer.appendChild(applicCard);
    }

    calculateTotal();
}

function updateItemValue(itemKey) {
    const qtyInput = document.getElementById(`qty-${itemKey}`);
    if (qtyInput) {
        state.qty[itemKey] = parseFloat(qtyInput.value) || 0;
    }
    calculateTotal();
}

function updateItemPrice(itemKey) {
    const priceInput = document.getElementById(`price-${itemKey}`);
    if (priceInput) {
        state.prices[itemKey] = parseFloat(priceInput.value) || 0;
    }
    calculateTotal();
}

function calculateApplicDimensions() {
    const dim1 = parseFloat(document.getElementById('dimension1-applic')?.value) || 0;
    const dim2 = parseFloat(document.getElementById('dimension2-applic')?.value) || 0;
    const totalInches = (dim1 + dim2) / 2;
    state.applic = { dim1, dim2, totalInches };
    const inchesEl = document.getElementById('total-inches-applic');
    if (inchesEl) inchesEl.textContent = totalInches.toFixed(2);
    const rateEl = document.getElementById('price-per-inch-applic');
    if (rateEl) rateEl.textContent = state.inchPrice.toFixed(2);
    calculateTotal();
}

function calculateTotal() {
    let grandTotal = 0;
    state.totalModifier = undefined;
    state.totalAction = undefined;
    document.querySelectorAll('input[name="item"]:checked').forEach(checkbox => {
        const itemKey = checkbox.value;
        if (itemKey === 'applic') return;
        const qty = parseFloat(document.getElementById(`qty-${itemKey}`)?.value) || 0;
        const itemTotal = qty * (state.prices[itemKey] || 0);
        const totalEl = document.getElementById(`total-${itemKey}`);
        if (totalEl) totalEl.textContent = `Total: ${itemTotal.toFixed(2)}`;
        grandTotal += itemTotal;
    });

    if (document.getElementById('applicToggle').checked) {
        const totalInches = state.applic.totalInches || 0;
        const applicTotal = totalInches * state.inchPrice;
        const totalEl = document.getElementById('total-applic');
        if (totalEl) totalEl.textContent = `Total: ${applicTotal.toFixed(2)}`;
        grandTotal += applicTotal;
    }

    state.baseTotal = grandTotal;
    state.currentTotal = grandTotal;
    document.getElementById('grandTotal').textContent = grandTotal.toFixed(2);
    document.getElementById('totalActionLabel').textContent = 'Tap × or ÷ to enter amount';
}

function showTotalActionInput(type) {
    pendingTotalAction = type;
    const input = document.getElementById('totalActionAmount');
    const cancelBtn = document.getElementById('cancelTotalAction');
    if (!input) return;
    input.classList.add('visible');
    input.value = '';
    input.placeholder = '1 or 2 or 6';
    input.focus();
    if (cancelBtn) cancelBtn.classList.add('visible');
    document.getElementById('totalActionLabel').textContent = 'Enter a number and press Enter, then close when ready';
}

function hideTotalActionInput() {
    const input = document.getElementById('totalActionAmount');
    const cancelBtn = document.getElementById('cancelTotalAction');
    if (input) {
        input.classList.remove('visible');
        if (input.value !== '') {
            input.value = '';
        }
    }
    if (cancelBtn) cancelBtn.classList.remove('visible');
    if (totalActionAutoApplyTimer) {
        clearTimeout(totalActionAutoApplyTimer);
        totalActionAutoApplyTimer = null;
    }
    pendingTotalAction = null;
    state.totalModifier = undefined;
    state.currentTotal = state.baseTotal;
    document.getElementById('grandTotal').textContent = state.currentTotal.toFixed(2);
    document.getElementById('totalActionLabel').textContent = 'Tap × or ÷ to enter amount';
}

function scheduleTotalActionApply() {
    // Auto-apply behavior removed. Keep input open until the user closes it.
}

function applyTotalWithAmount(type, amount) {
    const current = state.baseTotal || 0;
    let result = current;

    if (type === 'multiply') {
        result = current * amount;
    } else if (type === 'divide') {
        result = current / amount;
    }

    state.totalModifier = result;
    state.currentTotal = result;
    document.getElementById('grandTotal').textContent = result.toFixed(2);
    document.getElementById('totalActionLabel').textContent = `${type === 'multiply' ? 'Multiplied' : 'Divided'} by ${amount}`;
    // Keep the input visible until the user clicks the close button.
}

function applyTotalOperation(type) {
    showTotalActionInput(type);
}

document.addEventListener('input', (event) => {
    if (event.target.id && event.target.id.startsWith('qty-')) {
        updateItemValue(event.target.id.replace('qty-', ''));
    }
    if (event.target.id && event.target.id.startsWith('price-')) {
        updateItemPrice(event.target.id.replace('price-', ''));
    }
    if (event.target.id === 'dimension1-applic' || event.target.id === 'dimension2-applic') {
        calculateApplicDimensions();
    }
});

document.addEventListener('keydown', (event) => {
    const input = document.getElementById('totalActionAmount');
    if (event.target === input && event.key === 'Enter') {
        const amount = parseFloat(input.value);
        if (pendingTotalAction && amount > 0) {
            applyTotalWithAmount(pendingTotalAction, amount);
        }
    }
});

document.addEventListener('blur', (event) => {
    const input = document.getElementById('totalActionAmount');
    if (event.target === input) {
        // Do not auto-apply or auto-close on blur.
    }
}, true);

document.getElementById('cancelTotalAction')?.addEventListener('click', () => {
    hideTotalActionInput();
});

document.addEventListener('change', (event) => {
    if (event.target.matches('input[name="item"]')) {
        handleSelection();
    }
    if (event.target.id === 'applicToggle') {
        handleSelection();
    }
    if (event.target.id === 'totalActionAmount' && pendingTotalAction) {
        // Input value changes are accepted, but closing is handled only by the cancel button.
    }
});

const saveSettingsBtn = document.getElementById('saveSettings');
if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
        const inchInput = document.getElementById('inch-price');
        if (inchInput) {
            state.inchPrice = parseFloat(inchInput.value) || 0;
        }
        saveSettings();
    });
}

const resetSettingsBtn = document.getElementById('resetSettings');
if (resetSettingsBtn) {
    resetSettingsBtn.addEventListener('click', () => {
        state.prices = {
            '6SS': 0.03,
            '10SS': 0.03,
            '16SS': 0.05,
            '4x4': 0.15,
            '6x6': 0.25,
            '2.5x5': 0.15,
            '3x7': 0.25
        };
        state.inchPrice = 2;
        handleSelection();
        toggleSettings();
    });
}

const openSettingsBtn = document.getElementById('openSettings');
if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', toggleSettings);
}

const closeSettingsBtn = document.getElementById('closeSettings');
if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', toggleSettings);
}

const multiplyBtn = document.getElementById('multiplyTotal');
if (multiplyBtn) {
    multiplyBtn.addEventListener('click', () => applyTotalOperation('multiply'));
}

const divideBtn = document.getElementById('divideTotal');
if (divideBtn) {
    divideBtn.addEventListener('click', () => applyTotalOperation('divide'));
}

loadSettings();
handleSelection();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
    });
}
