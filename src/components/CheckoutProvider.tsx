import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CheckoutContext } from '../lib/checkoutContext';
import {
  clearReturnedOrderRef,
  fetchCatalogue,
  readReturnedOrderRef,
  type CatalogueProduct
} from '../lib/payments';
import { CheckoutModal } from './CheckoutModal';
import { ContactFallbackDialog } from './ContactFallbackDialog';
import { PaymentReturn } from './PaymentReturn';

/**
 * Owns everything payment-related: the price list, the checkout form and the
 * post-payment status view.
 *
 * The price list is fetched from the server rather than hardcoded, so the
 * amounts a buyer sees are always the amounts the server will charge. If that
 * fetch fails, `openCheckout` opens the phone/email dialog instead of the form
 * - an API outage should never leave a dead button on a fundraising page.
 */
export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<CatalogueProduct[] | null>(null);
  const [activeSku, setActiveSku] = useState<string | null>(null);
  // Shown when a call to action cannot open the form because the price list is
  // not there. See openCheckout below.
  const [showContactFallback, setShowContactFallback] = useState(false);
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
        // Only a non-empty list counts as loaded: `openCheckout` treats a
        // null list as "cannot open the form", so an empty catalogue routes to
        // the contact dialog rather than opening a form with nothing in it.
        setProducts(catalogue.products.length > 0 ? catalogue.products : null);
      })
      .catch(() => {
        // Deliberately silent: the fallback path is a working one, and a console
        // error on a public marketing page helps nobody.
        if (cancelled) return;
        setProducts(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Open the checkout form for a SKU, or the contact dialog if that is not
   * possible.
   *
   * The form cannot render without the server's price list, and the SKU has to
   * be one the server actually prices. When either is missing this used to set
   * `activeSku` anyway: the modal then found no product, rendered null, and the
   * button appeared to do nothing. Callers no longer have to test readiness -
   * every route out of a call to action now ends in something visible.
   */
  const openCheckout = useCallback(
    (sku: string) => {
      if (products?.some((product) => product.sku === sku)) {
        setActiveSku(sku);
        return;
      }
      setShowContactFallback(true);
    },
    [products]
  );

  const getProduct = useCallback(
    (sku: string) => products?.find((product) => product.sku === sku),
    [products]
  );

  const value = useMemo(
    () => ({ openCheckout, getProduct }),
    [openCheckout, getProduct]
  );

  const activeProduct =
    products?.find((product) => product.sku === activeSku) ?? null;

  // Every sponsorship tier, highest first, so the form can offer the choice
  // without refetching or hardcoding a second copy of the tier list.
  const sponsorshipOptions = useMemo(
    () =>
      (products ?? [])
        .filter((product) => product.kind === 'sponsorship')
        .sort((a, b) => b.unitAmountCents - a.unitAmountCents),
    [products]
  );

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
        sponsorshipOptions={sponsorshipOptions}
        onClose={() => setActiveSku(null)}
      />

      <ContactFallbackDialog
        open={showContactFallback}
        onClose={() => setShowContactFallback(false)}
      />

      {returnedRef && (
        <PaymentReturn orderRef={returnedRef} onDismiss={dismissReturn} />
      )}
    </CheckoutContext.Provider>
  );
}

export default CheckoutProvider;
