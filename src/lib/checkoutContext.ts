import { createContext, useContext } from 'react';
import type { CatalogueProduct } from './payments';

/**
 * Why the phone/email dialog is being shown.
 *
 * It is not only a fallback any more: "Contact for sponsorship" opens it
 * deliberately, and telling that visitor "online payment is unavailable" would
 * be both untrue and alarming. The reason picks the wording.
 */
export type ContactReason = 'payment-unavailable' | 'sponsorship';

export interface CheckoutContextValue {
  /**
   * Open the checkout form for a SKU.
   *
   * Always safe to call. If the price list has not loaded, or the SKU is not
   * one the server prices, the provider shows the phone/email dialog instead -
   * so a call to action never has to check readiness, and never does nothing.
   */
  openCheckout: (sku: string) => void;
  /**
   * Server-priced product, when the catalogue has loaded.
   *
   * Components render the amount from this in preference to their own hardcoded
   * copy, so the price on the page cannot drift from the price that is charged.
   */
  /**
   * Show the phone and email details.
   *
   * For calls to action that are meant to start a conversation rather than a
   * payment. It renders a real dialog rather than navigating to a `mailto:`,
   * which does nothing at all on a machine with no mail client configured -
   * exactly how the sponsorship button used to look broken.
   */
  showContactDetails: (reason?: ContactReason) => void;
  getProduct: (sku: string) => CatalogueProduct | undefined;
}

/** Defaults keep the app renderable outside the provider (e.g. in isolation). */
export const CheckoutContext = createContext<CheckoutContextValue>({
  openCheckout: () => undefined,
  showContactDetails: () => undefined,
  getProduct: () => undefined
});

export function useCheckout(): CheckoutContextValue {
  return useContext(CheckoutContext);
}
