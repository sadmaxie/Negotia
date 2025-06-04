const currencies = [
    'USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD',
    'MXN', 'SGD', 'HKD', 'NOK', 'KRW', 'TRY', 'INR', 'RUB', 'BRL', 'ZAR',
    'DKK', 'PLN', 'TWD', 'THB', 'IDR', 'HUF', 'CZK', 'ILS', 'PHP', 'AED'
];

// DOM Elements
const startButton = document.getElementById('start-btn');
const heroSection = document.querySelector('.hero-section');
const negotiationContent = document.getElementById('negotiation-content');
const idSpan = document.getElementById('negotiation-id');
const currencyTypeSpan = document.getElementById('currency-type-container');
const shareLinkBtn = document.getElementById('share-link-btn');
const finalSuggestionSection = document.getElementById('final-suggestion-section');

const negAMinInput = document.getElementById('negA-min-input');
const negAMaxInput = document.getElementById('negA-max-input');
const negBMinInput = document.getElementById('negB-min-input');
const negBMaxInput = document.getElementById('negB-max-input');

const negAAvgSpan = document.getElementById('negA-avg');
const negBAvgSpan = document.getElementById('negB-avg');
const finalAvgASpan = document.getElementById('avgA');
const finalAvgBSpan = document.getElementById('avgB');
const finalValSpan = document.getElementById('finalVal');

const closeSessionBtn = document.getElementById('close-session-btn');
const closeModal = document.getElementById('close-confirmation');
const confirmCloseBtn = document.getElementById('confirm-close');
const cancelCloseBtn = document.getElementById('cancel-close');

const roleSpan = document.getElementById('user-role');
const boxA = document.getElementById('box-a');
const boxB = document.getElementById('box-b');

let selectedCurrency = 'USD';
let isAConfirmed = false;
let isBConfirmed = false;

// Session Logic
function generateNegotiationID() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function saveSessionToStorage(id) {
    const sessions = JSON.parse(localStorage.getItem('negotiation_sessions') || '{}');
    if (!sessions[id]) {
        sessions[id] = {
            createdAt: Date.now(),
            userA: true,
            userB: false
        };
        localStorage.setItem('negotiation_sessions', JSON.stringify(sessions));
    }
    localStorage.setItem('negotia_role', 'A');
}


function sessionExistsAndValid(id) {
    const sessions = JSON.parse(localStorage.getItem('negotiation_sessions') || '{}');
    if (!sessions[id]) return false;
    
    // Clear expired sessions
    if (Date.now() - sessions[id].createdAt > 3600000) {
        delete sessions[id];
        localStorage.setItem('negotiation_sessions', JSON.stringify(sessions));
        return false;
    }
    
    return true;
}

function handleRoleAndUI(id) {
    const sessions = JSON.parse(localStorage.getItem('negotiation_sessions') || '{}');
    const session = sessions[id];

    if (!session) return false;

    let role = localStorage.getItem('negotia_role');

    if (!role) {
        // First-time access from this browser
        if (!session.userB) {
            // Assign this user as B
            sessions[id].userB = true;
            localStorage.setItem('negotiation_sessions', JSON.stringify(sessions));
            localStorage.setItem('negotia_role', 'B');
            role = 'B';
        } else {
            // Both A and B are taken
            alert("❌ This negotiation room already has two users.");
            window.location.href = window.location.pathname; // Refresh to home
            return false;
        }
    } else if (role === 'A' && session.userB) {
        // This is user A returning to an active session
        // No action needed
    } else if (role === 'B' && session.userB) {
        // This is user B returning
        // No action needed
    } else {
        // Invalid state - clear and refresh
        localStorage.removeItem('negotia_role');
        window.location.href = window.location.pathname;
        return false;
    }

    // Apply role-based UI
    if (role === 'A') {
        boxB.classList.add('blurred');
        boxA.classList.remove('blurred');
    } else if (role === 'B') {
        boxA.classList.add('blurred');
        boxB.classList.remove('blurred');
    }

    // Show role in UI
    roleSpan.textContent = role === 'A' ? 'Negotiator A' : 'Negotiator B';

    return true;
}


// UI Logic
function createCurrencyDropdown(current = 'USD') {
    const wrapper = document.createElement('div');
    wrapper.className = 'relative w-40';
    const select = document.createElement('select');
    select.className = 'bg-gray-800 text-white px-4 py-2 pr-10 rounded-md w-full';
    select.id = 'currency-select';
    select.style.appearance = 'none';

    currencies.forEach(code => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = code;
        if (code === current) option.selected = true;
        select.appendChild(option);
    });

    select.addEventListener('change', e => selectedCurrency = e.target.value);

    const arrow = document.createElement('div');
    arrow.className = 'pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-white';
    arrow.innerHTML = `<svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.23 8.27a.75.75 0 01.02-1.06z"/></svg>`;

    wrapper.appendChild(select);
    wrapper.appendChild(arrow);
    return wrapper;
}

function updateAverageDisplay(side) {
    const min = parseFloat(side === 'A' ? negAMinInput.value : negBMinInput.value);
    const max = parseFloat(side === 'A' ? negAMaxInput.value : negBMaxInput.value);
    const avgSpan = side === 'A' ? negAAvgSpan : negBAvgSpan;

    if (!isNaN(min) && !isNaN(max)) {
        const avg = (min + max) / 2;
        avgSpan.textContent = `${selectedCurrency} ${avg.toFixed(2)}`;
    }
}

function calculateNegotiation() {
    const minA = parseFloat(negAMinInput.value);
    const maxA = parseFloat(negAMaxInput.value);
    const minB = parseFloat(negBMinInput.value);
    const maxB = parseFloat(negBMaxInput.value);
    if ([minA, maxA, minB, maxB].some(isNaN)) return;

    const avgA = (minA + maxA) / 2;
    const avgB = (minB + maxB) / 2;
    const finalA = (avgA + (avgA * 0.85 + avgA * 0.95 * 0.65) / 2) / 2;
    const finalB = (avgB + (avgB * 0.85 + avgB * 0.95 * 0.65) / 2) / 2;
    const final = (finalA + finalB) / 2;

    finalAvgASpan.textContent = `${selectedCurrency} ${finalA.toFixed(2)}`;
    finalAvgBSpan.textContent = `${selectedCurrency} ${finalB.toFixed(2)}`;
    finalValSpan.textContent = `${selectedCurrency} ${final.toFixed(2)}`;
    finalSuggestionSection.classList.remove('hidden');
}

function handleConfirm(side) {
    if (side === 'A') {
        negAMinInput.disabled = true;
        negAMaxInput.disabled = true;
        isAConfirmed = true;
        updateAverageDisplay('A');
    } else {
        negBMinInput.disabled = true;
        negBMaxInput.disabled = true;
        isBConfirmed = true;
        updateAverageDisplay('B');
    }
    if (isAConfirmed && isBConfirmed) calculateNegotiation();
}

function handleEdit(side) {
    if (side === 'A') {
        negAMinInput.disabled = false;
        negAMaxInput.disabled = false;
        negAAvgSpan.textContent = '-';
        isAConfirmed = false;
    } else {
        negBMinInput.disabled = false;
        negBMaxInput.disabled = false;
        negBAvgSpan.textContent = '-';
        isBConfirmed = false;
    }

    finalAvgASpan.textContent = finalAvgBSpan.textContent = finalValSpan.textContent = '-';
    finalSuggestionSection.classList.add('hidden');
}

function copyNegotiationLink() {
    const id = idSpan.textContent.replace('#', '');
    const link = `${window.location.origin}${window.location.pathname}?negotiation_id=${id}`;
    document.getElementById('share-link-input').value = link;
    document.getElementById('share-link-modal').classList.remove('hidden');
    navigator.clipboard.writeText(link).catch(() => console.warn("Clipboard write failed"));
}

document.getElementById('close-share-modal').addEventListener('click', () => {
    document.getElementById('share-link-modal').classList.add('hidden');
});

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('negotiation_id');

    negotiationContent.classList.add('hidden');
    finalSuggestionSection.classList.add('hidden');

    currencyTypeSpan.innerHTML = '';
    currencyTypeSpan.appendChild(createCurrencyDropdown(selectedCurrency));

    document.getElementById('confirm-A').addEventListener('click', () => handleConfirm('A'));
    document.getElementById('edit-A').addEventListener('click', () => handleEdit('A'));
    document.getElementById('confirm-B').addEventListener('click', () => handleConfirm('B'));
    document.getElementById('edit-B').addEventListener('click', () => handleEdit('B'));
    shareLinkBtn?.addEventListener('click', copyNegotiationLink);

    if (id) {
        if (!sessionExistsAndValid(id)) {
            window.location.href = '/404.html';
        } else {
            if (!handleRoleAndUI(id)) return;
            idSpan.textContent = `#${id}`;
            heroSection.classList.add('hidden');
            negotiationContent.classList.remove('hidden');
            negotiationContent.classList.add('animate-slide-in');
        }
    }
});

startButton?.addEventListener('click', () => {
    const newID = generateNegotiationID();
    saveSessionToStorage(newID);
    window.history.pushState({}, '', `${window.location.pathname}?negotiation_id=${newID}`);

    idSpan.textContent = `#${newID}`;
    roleSpan.textContent = 'Negotiator A';
    heroSection.classList.add('hidden');
    negotiationContent.classList.remove('hidden');
    negotiationContent.classList.add('animate-slide-in');
    boxB.classList.add('blurred');

    [negAMinInput, negAMaxInput, negBMinInput, negBMaxInput].forEach(input => {
        input.disabled = false;
        input.value = '';
    });

    [negAAvgSpan, negBAvgSpan, finalAvgASpan, finalAvgBSpan, finalValSpan].forEach(span => span.textContent = '-');

    isAConfirmed = false;
    isBConfirmed = false;
    finalSuggestionSection.classList.add('hidden');
});

closeSessionBtn?.addEventListener('click', () => {
    closeModal.classList.remove('hidden');
});

confirmCloseBtn?.addEventListener('click', () => {
    const id = idSpan.textContent.replace('#', '');
    const sessions = JSON.parse(localStorage.getItem('negotiation_sessions') || '{}');
    if (sessions[id]) {
        delete sessions[id];
        localStorage.setItem('negotiation_sessions', JSON.stringify(sessions));
    }
    window.location.href = '/';
});

cancelCloseBtn?.addEventListener('click', () => {
    closeModal.classList.add('hidden');
});

document.getElementById('terms-btn').addEventListener('click', () => {
    document.getElementById('terms-modal').classList.remove('hidden');
});

document.getElementById('close-terms-modal')?.addEventListener('click', () => {
    document.getElementById('terms-modal').classList.add('hidden');
});

document.getElementById('about-btn').addEventListener('click', () => {
    document.getElementById('about-modal').classList.remove('hidden');
});

document.getElementById('close-about-modal')?.addEventListener('click', () => {
    document.getElementById('about-modal').classList.add('hidden');
});
