import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { CONTACT } from '../config/site';
import {
  ApiError,
  formatMoney,
  startCheckout,
  type CatalogueProduct
} from '../lib/payments';

export interface CheckoutModalProps {
  /** Product to buy. Null closes the modal. */
  product: CatalogueProduct | null;
  onClose: () => void;
}

interface FieldErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  quantity?: string;
}

const MAROON = '#4A0D12';
const GOLD = '#e98314';

/**
 * Validate on the client to give immediate, specific feedback.
 *
 * This mirrors the server rules but is not a substitute for them - the server
 * validates independently, because anything enforced only in a browser is not
 * enforced at all.
 */
function validate(
  values: { fullName: string; email: string; phone: string; quantity: number },
  product: CatalogueProduct
): FieldErrors {
  const errors: FieldErrors = {};

  const name = values.fullName.trim();
  if (name.length < 2) {
    errors.fullName = 'Please enter your full name.';
  } else if (name.length > 120) {
    errors.fullName = 'Please use 120 characters or fewer.';
  } else if (/[\r\n\t<>]/.test(name)) {
    errors.fullName = 'Please remove any special characters.';
  }

  // Deliberately permissive: the server and the payment provider both check
  // again, and an over-strict pattern rejects real addresses.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }

  // Count digits and whitelist characters, but do not police the arrangement:
  // "(631) 805-9105" is how a great many people write a US number, and the
  // previous pattern required a digit first, so it rejected that with a message
  // that said brackets were allowed. Upper bound is 15, the most E.164 permits.
  // The server normalises to E.164 before handing anything to the provider.
  const digits = values.phone.replace(/[^0-9]/g, '');
  if (digits.length < 7) {
    errors.phone = 'Please enter a valid phone number.';
  } else if (digits.length > 15) {
    errors.phone = 'Please check that phone number.';
  } else if (!/^[+0-9\s().-]+$/.test(values.phone.trim())) {
    errors.phone = 'Use digits, spaces, brackets, dots and dashes only.';
  }

  if (!Number.isInteger(values.quantity) || values.quantity < 1) {
    errors.quantity = 'Choose at least one.';
  } else if (values.quantity > product.maxQuantity) {
    errors.quantity = `At most ${product.maxQuantity} per order.`;
  }

  return errors;
}

export function CheckoutModal({ product, onClose }: CheckoutModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [needsContact, setNeedsContact] = useState(false);

  /**
   * Idempotency key, held stable for a given payload.
   *
   * A retry of the same details must reuse the key so the server returns the
   * existing checkout rather than creating a second one. Changing the details
   * is a genuinely different order, so it earns a fresh key - otherwise
   * correcting a quantity would silently re-send you to the old amount.
   */
  const idempotency = useRef<{ signature: string; key: string } | null>(null);

  const keyFor = useCallback((signature: string): string => {
    if (idempotency.current?.signature === signature) {
      return idempotency.current.key;
    }
    const key = crypto.randomUUID();
    idempotency.current = { signature, key };
    return key;
  }, []);

  const isOpen = product !== null;

  // No reset effect is needed: CheckoutProvider keys this component by SKU, so
  // choosing a different product remounts it with fresh state.

  // Remember what had focus, move focus into the dialog, and restore on close.
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => firstFieldRef.current?.focus(), 10);
    return () => {
      window.clearTimeout(timer);
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen]);

  // Stop the page behind the dialog from scrolling.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  // Escape to close, and keep Tab inside the dialog.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, submitting, onClose]);

  const totalCents = useMemo(
    () => (product ? product.unitAmountCents * quantity : 0),
    [product, quantity]
  );

  // Errors are computed during render rather than mirrored into state: they are
  // a pure function of the current values, and storing them would need an
  // effect to keep the copy in step. Shown only after a first submit, so the
  // form does not scold anyone for a field they have not finished typing.
  const visibleErrors: FieldErrors =
    submitted && product
      ? validate({ fullName, email, phone, quantity }, product)
      : {};

  if (!product) return null;

  const isTicket = product.kind === 'ticket';
  const allowsQuantity = product.maxQuantity > 1;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitted(true);
    setFormError(null);

    const values = { fullName, email, phone, quantity };
    const found = validate(values, product);

    if (Object.keys(found).length > 0) {
      // Move focus to the first problem so a screen reader announces it.
      const firstKey = Object.keys(found)[0];
      dialogRef.current
        ?.querySelector<HTMLElement>(`[name="${firstKey}"]`)
        ?.focus();
      return;
    }

    setSubmitting(true);

    try {
      const signature = JSON.stringify({
        sku: product.sku,
        quantity,
        email: email.trim().toLowerCase()
      });

      const result = await startCheckout({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        sku: product.sku,
        quantity,
        idempotencyKey: keyFor(signature)
      });

      // Hand off to the provider's hosted page. Kept as a full navigation
      // rather than a popup so it survives strict popup blockers.
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      setSubmitting(false);

      if (error instanceof ApiError && error.code === 'amount_requires_contact') {
        setNeedsContact(true);
        return;
      }
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Something went wrong. Please try again.'
      );
    }
  };

  const fieldClass = (hasError: boolean) =>
    [
      "w-full rounded-md border px-3 py-2.5 text-sm font-['Outfit',sans-serif]",
      'text-gray-900 placeholder:text-gray-400 bg-white',
      'focus:outline-none focus:ring-2 focus:ring-offset-1',
      hasError
        ? 'border-red-500 focus:ring-red-400'
        : 'border-gray-300 focus:ring-[#e98314]'
    ].join(' ');

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      // Clicking the backdrop closes, but never mid-submission - losing a form
      // by a stray click while a payment is starting would be unforgivable.
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="my-auto w-full max-w-md rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div
          className="flex items-start justify-between gap-4 rounded-t-2xl px-6 py-5"
          style={{ backgroundColor: MAROON }}
        >
          <div>
            <h2
              id={titleId}
              className="font-['Alga','Bodoni_Moda','Playfair_Display',Georgia,serif] text-lg font-normal text-[#FFD238]"
            >
              {isTicket ? 'Book Your Tickets' : 'Confirm Your Sponsorship'}
            </h2>
            <p className="mt-1 font-['Outfit',sans-serif] text-[11px] text-[#FFF5ED]/80">
              {product.label}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="-mr-1 -mt-1 shrink-0 rounded-md p-1.5 text-[#FFF5ED] transition hover:bg-white/10 disabled:opacity-40"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {needsContact ? (
          /* Large sponsorships are arranged by phone: a declined $20,000 card
             is a worse experience than a conversation. */
          <div className="px-6 py-6">
            <h3 className="font-['Outfit',sans-serif] text-sm font-bold text-gray-900">
              Let us arrange this personally
            </h3>
            <p className="mt-2 font-['Outfit',sans-serif] text-[12px] leading-relaxed text-gray-600">
              Sponsorships at this level are confirmed directly with our team so we
              can arrange payment by cheque or bank transfer and record your
              recognition details correctly.
            </p>
            <div className="mt-4 space-y-2 rounded-lg bg-[#fff8f0] p-4">
              <a
                href={`tel:${CONTACT.phone}`}
                className="block font-['Outfit',sans-serif] text-[13px] font-bold text-[#4A0D12] hover:underline"
              >
                {CONTACT.phone}
              </a>
              <a
                href={`mailto:${CONTACT.email}`}
                className="block font-['Outfit',sans-serif] text-[13px] font-bold text-[#4A0D12] hover:underline"
              >
                {CONTACT.email}
              </a>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-md py-2.5 font-['Outfit',sans-serif] text-xs font-bold uppercase tracking-wider text-white"
              style={{ backgroundColor: GOLD }}
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="px-6 py-5">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="checkout-name"
                  className="mb-1.5 block font-['Outfit',sans-serif] text-[11px] font-semibold uppercase tracking-wide text-gray-600"
                >
                  Full name
                </label>
                <input
                  ref={firstFieldRef}
                  id="checkout-name"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  aria-invalid={Boolean(visibleErrors.fullName)}
                  aria-describedby={
                    visibleErrors.fullName ? 'checkout-name-error' : undefined
                  }
                  className={fieldClass(Boolean(visibleErrors.fullName))}
                  placeholder="Your name"
                />
                {visibleErrors.fullName && (
                  <p
                    id="checkout-name-error"
                    className="mt-1 font-['Outfit',sans-serif] text-[11px] text-red-600"
                  >
                    {visibleErrors.fullName}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="checkout-email"
                  className="mb-1.5 block font-['Outfit',sans-serif] text-[11px] font-semibold uppercase tracking-wide text-gray-600"
                >
                  Email
                </label>
                <input
                  id="checkout-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={Boolean(visibleErrors.email)}
                  aria-describedby="checkout-email-hint"
                  className={fieldClass(Boolean(visibleErrors.email))}
                  placeholder="you@example.com"
                />
                <p
                  id="checkout-email-hint"
                  className="mt-1 font-['Outfit',sans-serif] text-[11px] text-gray-500"
                >
                  {visibleErrors.email ? (
                    <span className="text-red-600">{visibleErrors.email}</span>
                  ) : (
                    'Your receipt and confirmation are sent here.'
                  )}
                </p>
              </div>

              <div>
                <label
                  htmlFor="checkout-phone"
                  className="mb-1.5 block font-['Outfit',sans-serif] text-[11px] font-semibold uppercase tracking-wide text-gray-600"
                >
                  Phone
                </label>
                <input
                  id="checkout-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  aria-invalid={Boolean(visibleErrors.phone)}
                  aria-describedby={
                    visibleErrors.phone ? 'checkout-phone-error' : undefined
                  }
                  className={fieldClass(Boolean(visibleErrors.phone))}
                  placeholder="+1 631 555 0123"
                />
                {visibleErrors.phone && (
                  <p
                    id="checkout-phone-error"
                    className="mt-1 font-['Outfit',sans-serif] text-[11px] text-red-600"
                  >
                    {visibleErrors.phone}
                  </p>
                )}
              </div>

              {allowsQuantity && (
                <div>
                  <label
                    htmlFor="checkout-quantity"
                    className="mb-1.5 block font-['Outfit',sans-serif] text-[11px] font-semibold uppercase tracking-wide text-gray-600"
                  >
                    Number of tickets
                  </label>
                  <select
                    id="checkout-quantity"
                    name="quantity"
                    value={quantity}
                    onChange={(event) => setQuantity(Number(event.target.value))}
                    className={fieldClass(Boolean(visibleErrors.quantity))}
                  >
                    {Array.from({ length: product.maxQuantity }, (_, index) => (
                      <option key={index + 1} value={index + 1}>
                        {index + 1}
                      </option>
                    ))}
                  </select>
                  {visibleErrors.quantity && (
                    <p className="mt-1 font-['Outfit',sans-serif] text-[11px] text-red-600">
                      {visibleErrors.quantity}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Total. Shown from the server-provided unit price, so it always
                matches what will actually be charged. */}
            <div className="mt-5 flex items-baseline justify-between rounded-lg bg-[#fff8f0] px-4 py-3">
              <span className="font-['Outfit',sans-serif] text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                Total
              </span>
              <span
                className="font-['Outfit',sans-serif] text-xl font-extrabold"
                style={{ color: GOLD }}
              >
                {formatMoney(totalCents)}
              </span>
            </div>

            {formError && (
              <p
                role="alert"
                className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 font-['Outfit',sans-serif] text-[12px] text-red-700"
              >
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 w-full rounded-md py-3 font-['Outfit',sans-serif] text-xs font-bold uppercase tracking-wider text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: submitting ? '#9ca3af' : GOLD }}
            >
              {submitting
                ? 'Taking you to secure payment...'
                : `Continue to secure payment`}
            </button>

            <p className="mt-3 text-center font-['Outfit',sans-serif] text-[10px] leading-relaxed text-gray-500">
              Payment is completed on Square&rsquo;s secure checkout page. Your card
              details are never entered on, or stored by, this website.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default CheckoutModal;
