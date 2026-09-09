import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CheckoutContext } from '../lib/checkoutContext';
import {
  clearReturnedOrderRef,
  fetchCatalogue,
  readReturnedOrderRef,
  type Catalogue,
  type CatalogueProduct
} from '../lib/payments';
import { CheckoutModal } from './CheckoutModal';
import { PaymentReturn } from './PaymentReturn';

/**
 * Owns everything payment-related: the price list, the checkout form and the
 * post-payment status view.
 *
 * The price list is fetched from the server rather than hardcoded, so the
 * amounts a buyer sees are always the amounts the server will charge. If that
 * fetch fails the provider reports `isReady: false` and every call to action
 * falls back to the phone/email path the site used before online payment - an
 * API outage should never leave a dead button on a fundraising page.
 */
export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<CatalogueProduct[] | null>(null);
  const [capacity, setCapacity] = useState<Catalogue['capacity'] | null>(null);
  const [activeSku, setActiveSku] = useState<string | null>(null);
  // The provider appends ?ref= on the way back. Read once at mount, before
  // anything else can rewrite the URL.
  const [returnedRef, setReturnedRef] = useState<string | null>(
    readReturnedOrderRef
  );

  useEffect(() => {
    let cancelled = false;

    fetchCatalogue()
      .then((catalogue) => {
        if (cancelled) return;
        setProducts(catalogue.products);
        setCapacity(catalogue.capacity);
      })
      .catch(() => {
        // Deliberately silent: the fallback path is a working one, and a console
        // error on a public marketing page helps nobody.
        if (cancelled) return;
        setProducts(null);
        setCapacity(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const openCheckout = useCallback((sku: string) => {
    setActiveSku(sku);
  }, []);

  const getProduct = useCallback(
    (sku: string) => products?.find((product) => product.sku === sku),
    [products]
  );

  const value = useMemo(
    () => ({ openCheckout, isReady: products !== null, getProduct, capacity }),
    [openCheckout, products, getProduct, capacity]
  );

  const activeProduct =
    products?.find((product) => product.sku === activeSku) ?? null;

  const dismissReturn = useCallback(() => {
    // Drop the reference from the address bar so a refresh does not reopen the
    // status dialog, and a shared link does not carry someone's order.
    clearReturnedOrderRef();
    setReturnedRef(null);
  }, []);

  return (
    <CheckoutContext.Provider value={value}>
      {children}

      {/* Keyed by SKU: choosing a different product remounts the form with
          clean state, which is why CheckoutModal needs no reset effect. */}
      <CheckoutModal
        key={activeSku ?? 'none'}
        product={activeProduct}
        onClose={() => setActiveSku(null)}
      />

      {returnedRef && (
        <PaymentReturn orderRef={returnedRef} onDismiss={dismissReturn} />
      )}
    </CheckoutContext.Provider>
  );
}

export default CheckoutProvider;
