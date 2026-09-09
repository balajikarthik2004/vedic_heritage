import { createContext, useContext } from 'react';
import type { CatalogueProduct, Catalogue } from './payments';

export interface CheckoutContextValue {
  /**
   * Open the checkout form for a SKU.
   *
   * Only meaningful when `isReady` is true - the form needs the server's price
   * list to know what to display and what quantities to allow.
   */
  openCheckout: (sku: string) => void;
  /**
   * True once the price list has loaded.
   *
   * Callers check this and fall back to the existing phone/email path when it
   * is false, so an API outage degrades the site to how it behaved before
   * online payment existed rather than leaving a dead button.
   */
  isReady: boolean;
  /**
   * Server-priced product, when the catalogue has loaded.
   *
   * Components render the amount from this in preference to their own hardcoded
   * copy, so the price on the page cannot drift from the price that is charged.
   */
  getProduct: (sku: string) => CatalogueProduct | undefined;
  /**
   * Seat availability from the server, or null until it loads.
   *
   * `seatsRemaining` is null when no capacity is configured
   * (`EVENT_SEAT_CAPACITY=0`), which is the signal to show nothing at all
   * rather than guess. The cap is soft, so this can in principle go to zero or
   * below without blocking a purchase - callers must not present it as a hard
   * limit.
   */
  capacity: Catalogue['capacity'] | null;
}

/** Defaults keep the app renderable outside the provider (e.g. in isolation). */
export const CheckoutContext = createContext<CheckoutContextValue>({
  openCheckout: () => undefined,
  isReady: false,
  getProduct: () => undefined,
  capacity: null
});

export function useCheckout(): CheckoutContextValue {
  return useContext(CheckoutContext);
}
