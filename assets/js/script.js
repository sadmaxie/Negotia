// script.js (as ES module)
export function initNegotiationApp() {
    const API_BASE = 'http://localhost:3000';

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
    const currencyTypeSpan = document.getElementById('currency-type');
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

    let selectedCurrency = 'USD';
    let isAConfirmed = false;
    let isBConfirmed = false;

    function createCurrencyDropdown(current = 'USD') {
        const wrapper = document.createElement('div');
        wrapper.className = 'relative w-40';
        const select = document.createElement('select');
        select.className = 'bg-gray-800 text-white px-4 py-2 pr-10 rounded-md w-full';
        select.id = 'currency-select';

        currencies.forEach(code => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = code;
            if (code === current) option.selected = true;
            select.appendChild(option);
        });

        select.addEventListener('change', (e) => {
            selectedCurrency = e.target.value;
        });

        const arrow = document.createElement('div');
        arrow.className = 'pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-white';
        arrow.innerHTML = `
      <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.23 8.27a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
      </svg>`;
        wrapper.appendChild(select);
        wrapper.appendChild(arrow);
        return wrapper;
    }

    function updateAverageDisplay(side) {
        const inputMin = side === 'A' ? negAMinInput : negBMinInput;
        const inputMax = side === 'A' ? negAMaxInput : negBMaxInput;
        const avgSpan = side === 'A' ? negAAvgSpan : negBAvgSpan;

        const min = parseFloat(inputMin.value);
        const max = parseFloat(inputMax.value);

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

        if ([minA, maxA, minB, maxB].some(v => isNaN(v))) return;

        const avgA = (minA + maxA) / 2;
        const avgB = (minB + maxB) / 2;

        const interA = (avgA * 0.85 + avgA * 0.95 * 0.65) / 2;
        const interB = (avgB * 0.85 + avgB * 0.95 * 0.65) / 2;

        const finalA = (avgA + interA) / 2;
        const finalB = (avgB + interB) / 2;
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

        if (isAConfirmed && isBConfirmed) {
            calculateNegotiation();
        }
    }

    function handleEdit(side) {
        if (side === 'A') {
            negAMinInput.disabled = false;
            negAMaxInput.disabled = false;
            isAConfirmed = false;
            negAAvgSpan.textContent = '-';
        } else {
            negBMinInput.disabled = false;
            negBMaxInput.disabled = false;
            isBConfirmed = false;
            negBAvgSpan.textContent = '-';
        }

        finalAvgASpan.textContent = '-';
        finalAvgBSpan.textContent = '-';
        finalValSpan.textContent = '-';
        finalSuggestionSection.classList.add('hidden');
    }

    function copyNegotiationLink() {
        const id = idSpan.textContent.replace('#', '');
        if (!id) return alert('No negotiation ID generated yet.');
        const link = `${window.location.origin}${window.location.pathname}?negotiation_id=${id}`;
        navigator.clipboard.writeText(link)
            .then(() => alert('Copied: ' + link))
            .catch(() => alert('Copy failed.'));
    }

    // Called on page load
    async function checkForExistingSession() {
        const params = new URLSearchParams(window.location.search);
        const existingID = params.get('negotiation_id');

        if (!existingID) return;

        try {
            const res = await fetch(`${API_BASE}/session/${existingID}`);
            if (!res.ok) throw new Error('Invalid session');
            idSpan.textContent = `#${existingID}`;
            heroSection.classList.add('hidden');
            negotiationContent.classList.remove('hidden');
        } catch (err) {
            window.location.href = '/404.html';
        }
    }

    async function startNewNegotiation() {
        try {
            const res = await fetch(`${API_BASE}/create-session`, { method: 'POST' });
            const data = await res.json();
            const newID = data.id;

            idSpan.textContent = `#${newID}`;
            window.history.pushState({}, '', `${window.location.pathname}?negotiation_id=${newID}`);

            heroSection.classList.add('hidden');
            negotiationContent.classList.remove('hidden');

            [negAMinInput, negAMaxInput, negBMinInput, negBMaxInput].forEach(input => {
                input.disabled = false;
                input.value = '';
            });

            [negAAvgSpan, negBAvgSpan, finalAvgASpan, finalAvgBSpan, finalValSpan].forEach(span => {
                span.textContent = '-';
            });

            isAConfirmed = false;
            isBConfirmed = false;
            finalSuggestionSection.classList.add('hidden');
        } catch (err) {
            alert('Error creating session. Please try again.');
        }
    }

    // Init
    document.addEventListener('DOMContentLoaded', () => {
        negotiationContent.classList.add('hidden');
        finalSuggestionSection.classList.add('hidden');
        currencyTypeSpan.replaceWith(createCurrencyDropdown(selectedCurrency));

        document.getElementById('confirm-A').addEventListener('click', () => handleConfirm('A'));
        document.getElementById('edit-A').addEventListener('click', () => handleEdit('A'));
        document.getElementById('confirm-B').addEventListener('click', () => handleConfirm('B'));
        document.getElementById('edit-B').addEventListener('click', () => handleEdit('B'));
        shareLinkBtn?.addEventListener('click', copyNegotiationLink);
        startButton?.addEventListener('click', startNewNegotiation);

        checkForExistingSession(); // entry point
    });
}
