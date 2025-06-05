// assets/js/script.js

// List of currency codes
const currencies = [
  'USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD',
  'MXN', 'SGD', 'HKD', 'NOK', 'KRW', 'TRY', 'INR', 'RUB', 'BRL', 'ZAR',
  'DKK', 'PLN', 'TWD', 'THB', 'IDR', 'HUF', 'CZK', 'ILS', 'PHP', 'AED'
];

// Firestore collection reference
const sessionsCollection = db.collection('negotiation_sessions');

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

/**
 * Generate a random 6-digit ID.
 */
function generateNegotiationID() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Save a new session document to Firestore:
 * { createdAt, confirmedA: false, confirmedB: false }
 * and mark this browser’s role as 'A' in localStorage.
 */
async function saveSessionToFirestore(id) {
  const now = Date.now();
  await sessionsCollection.doc(id).set({
    createdAt: now,
    confirmedA: false,
    confirmedB: false
  });
  localStorage.setItem(`negotia_role_${id}`, 'A');
}

/**
 * Check if a session exists in Firestore and is not older than one hour.
 */
async function sessionExistsAndValid(id) {
  const docRef = sessionsCollection.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return false;
  const data = doc.data();
  if (Date.now() - data.createdAt > 3600000) {
    await docRef.delete();
    return false;
  }
  return true;
}

/**
 * Assign this browser's role (A or B) based on Firestore state and localStorage.
 * Blurs the opposite negotiator box accordingly.
 */
async function handleRoleAndUI(id) {
  const roleKey = `negotia_role_${id}`;
  let role = localStorage.getItem(roleKey);
  const sessionRef = sessionsCollection.doc(id);
  const doc = await sessionRef.get();
  if (!doc.exists) return false;

  const data = doc.data();
  if (!role) {
    // First time in this browser
    if (!data.confirmedA && !data.confirmedB) {
      // A started the session, so second browser becomes B
      role = 'B';
      localStorage.setItem(roleKey, 'B');
    } else if (data.confirmedA && !data.confirmedB) {
      role = 'B';
      localStorage.setItem(roleKey, 'B');
    } else if (!data.confirmedA && data.confirmedB) {
      role = 'A';
      localStorage.setItem(roleKey, 'A');
    } else {
      alert("❌ This negotiation room already has two users.");
      window.location.href = window.location.pathname;
      return false;
    }
  }

  if (role === 'A') {
    boxB.classList.add('blurred');
    boxA.classList.remove('blurred');
  } else {
    boxA.classList.add('blurred');
    boxB.classList.remove('blurred');
  }
  roleSpan.textContent = role === 'A' ? 'Negotiator A' : 'Negotiator B';
  return true;
}

/**
 * Create a currency dropdown <select> element.
 */
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
  arrow.innerHTML = `
    <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 
               4.24a.75.75 0 01-1.06 0L5.23 8.27a.75.75 0 01.02-1.06z"/>
    </svg>
  `;
  wrapper.appendChild(select);
  wrapper.appendChild(arrow);
  return wrapper;
}

/**
 * Update the “Initial Average” display for either side 'A' or 'B'.
 */
function updateAverageDisplay(side) {
  const min = parseFloat(side === 'A' ? negAMinInput.value : negBMinInput.value);
  const max = parseFloat(side === 'A' ? negAMaxInput.value : negBMaxInput.value);
  const avgSpan = side === 'A' ? negAAvgSpan : negBAvgSpan;

  if (!isNaN(min) && !isNaN(max)) {
    const avg = (min + max) / 2;
    avgSpan.textContent = `${selectedCurrency} ${avg.toFixed(2)}`;
  }
}

/**
 * Calculate the final suggested value once both sides have confirmed.
 */
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

/**
 * When a user clicks “Confirm” for side A or B:
 *  - Disable that side’s inputs and update the “Initial Average.”
 *  - Update Firestore: { confirmedA: true } or { confirmedB: true }.
 *  - We do not call calculateNegotiation() directly; a polling loop will detect when both flags are true.
 */
async function handleConfirm(side) {
  const id = idSpan.textContent.replace('#', '');
  if (!id) return;
  const roleKey = `negotia_role_${id}`;
  const role = localStorage.getItem(roleKey);
  if (!role) return;

  if (side === 'A') {
    negAMinInput.disabled = true;
    negAMaxInput.disabled = true;
    isAConfirmed = true;
    updateAverageDisplay('A');
    await sessionsCollection.doc(id).update({ confirmedA: true });
  } else {
    negBMinInput.disabled = true;
    negBMaxInput.disabled = true;
    isBConfirmed = true;
    updateAverageDisplay('B');
    await sessionsCollection.doc(id).update({ confirmedB: true });
  }
}

/**
 * When a user clicks “Edit” for side A or B:
 *  - Re-enable that side’s inputs and clear its initial average.
 *  - Hide the final suggestion (reset state).
 */
function handleEdit(side) {
  if (side === 'A') {
    negAMinInput.disabled = false;
    negAMaxInput.disabled = false;
    negAAvgSpan.textContent = '-';
    isAConfirmed = false;
    // Optionally reset Firestore confirmedA: false
    // await sessionsCollection.doc(id).update({ confirmedA: false });
  } else {
    negBMinInput.disabled = false;
    negBMaxInput.disabled = false;
    negBAvgSpan.textContent = '-';
    isBConfirmed = false;
    // await sessionsCollection.doc(id).update({ confirmedB: false });
  }
  finalAvgASpan.textContent = '-';
  finalAvgBSpan.textContent = '-';
  finalValSpan.textContent = '-';
  finalSuggestionSection.classList.add('hidden');
}

/**
 * Copy the current negotiation URL (including ?negotiation_id=…) into the Share modal.
 */
function copyNegotiationLink() {
  const id = idSpan.textContent.replace('#', '');
  const link = `${window.location.origin}${window.location.pathname}?negotiation_id=${id}`;
  document.getElementById('share-link-input').value = link;
  document.getElementById('share-link-modal').classList.remove('hidden');
  navigator.clipboard.writeText(link).catch(() => console.warn("Clipboard write failed"));
}

// Close the “Share” modal
document.getElementById('close-share-modal').addEventListener('click', () => {
  document.getElementById('share-link-modal').classList.add('hidden');
});

/**
 * On page load:
 * 1. Read ?negotiation_id=<id> from URL.
 * 2. If no id, keep hero visible.
 * 3. If id present, call sessionExistsAndValid(id). If false, redirect to /404.html.
 * 4. Otherwise, call handleRoleAndUI(id) to set this browser's role.
 * 5. Show negotiation UI and insert currency dropdown.
 * 6. Wire up Confirm/Edit/Share buttons.
 * 7. Start a 2-second polling loop: fetch Firestore doc → when confirmedA && confirmedB, call calculateNegotiation().
 */
document.addEventListener('DOMContentLoaded', async () => {
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

  if (!id) {
    // No session ID in URL → show only the hero
    return;
  }

  const valid = await sessionExistsAndValid(id);
  if (!valid) {
    window.location.href = '/404.html';
    return;
  }

  const ok = await handleRoleAndUI(id);
  if (!ok) return;

  idSpan.textContent = `#${id}`;
  heroSection.classList.add('hidden');
  negotiationContent.classList.remove('hidden');
  negotiationContent.classList.add('animate-slide-in');

  let finalShown = false;
  setInterval(async () => {
    const doc = await sessionsCollection.doc(id).get();
    if (!doc.exists) {
      window.location.href = '/';
      return;
    }
    const data = doc.data();
    if (data.confirmedA && data.confirmedB && !finalShown) {
      calculateNegotiation();
      finalShown = true;
    }
  }, 2000);
});

/**
 * “Start a New Negotiation”:
 * 1. Generate a random 6-digit ID.
 * 2. saveSessionToFirestore(id) → writes { createdAt, confirmedA:false, confirmedB:false }.
 * 3. Push new URL ?negotiation_id=<id>.
 * 4. Show UI for Negotiator A, blur B, reset inputs.
 */
startButton?.addEventListener('click', async () => {
  const newID = generateNegotiationID();
  await saveSessionToFirestore(newID);

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
  [negAAvgSpan, negBAvgSpan, finalAvgASpan, finalAvgBSpan, finalValSpan].forEach(span => {
    span.textContent = '-';
  });
  isAConfirmed = false;
  isBConfirmed = false;
  finalSuggestionSection.classList.add('hidden');
});

/**
 * “Close This Session”:
 *  - Show confirmation modal.
 *  - If confirmed: delete Firestore doc, clear localStorage role, redirect home.
 */
closeSessionBtn?.addEventListener('click', () => {
  closeModal.classList.remove('hidden');
});
confirmCloseBtn?.addEventListener('click', async () => {
  const id = idSpan.textContent.replace('#', '');
  const docRef = sessionsCollection.doc(id);
  const doc = await docRef.get();
  if (doc.exists) await docRef.delete();
  localStorage.removeItem(`negotia_role_${id}`);
  window.location.href = '/';
});
cancelCloseBtn?.addEventListener('click', () => {
  closeModal.classList.add('hidden');
});

// “Terms” and “About” modals
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
