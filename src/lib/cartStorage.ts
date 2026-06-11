const CART_STORAGE_KEY = 'embroyit_cart';
const CART_CLEAR_EVENT = 'embroyit:cart-clear';

export function clearPersistedCart() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CART_STORAGE_KEY);
  window.dispatchEvent(new Event(CART_CLEAR_EVENT));
}

export function getCartClearEventName() {
  return CART_CLEAR_EVENT;
}

export function getCartStorageKey() {
  return CART_STORAGE_KEY;
}
