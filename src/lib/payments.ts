/**
 * Client for the payments API.
 *
 * The browser never sends an amount. It sends a SKU and a quantity, and the
 * server prices the order from its own catalogue - so editing anything in
 * devtools cannot change what is charged. Prices shown on the page come from
 * `fetchCatalogue` for the same reason: what the buyer sees is what the server
 * will charge.
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

export type ProductKind = 'ticket' | 'sponsorship';

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'canceled'
  | 'refunded';

export interface CatalogueProduct {
  sku: string;
  kind: ProductKind;
  label: string;
  unitAmountCents: number;
  seatsPerUnit: number;
  maxQuantity: number;
  /** False when the amount is too large to take by card and needs a call. */
  onlineCheckout: boolean;
}

export interface Catalogue {
  currency: string;
  products: CatalogueProduct[];
  capacity: { seatsRemaining: number | null; nearlyFull: boolean };
}

export interface CheckoutRequest {
  fullName: string;
  email: string;
  phone: string;
  sku: string;
  quantity: number;
  idempotencyKey: string;
}

export interface CheckoutResponse {
  orderRef: string;
  checkoutUrl: string;
  totalAmountCents: number;
  currency: string;
}

export interface OrderView {
  orderRef: string;
  status: OrderStatus;
  productLabel: string;
  productKind: string;
  quantity: number;
  seats: number;
  totalAmountCents: number;
  deductibleAmountCents: number;
  currency: string;
  cardBrand: string | null;
  cardLast4: string | null;
  paidAt: string | null;
  createdAt: string;
}

/** An error carrying the server's machine-readable code. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

/** Format integer cents for display, e.g. 2000000 -> "$20,000". */
export function formatMoney(cents: number, currency = 'USD'): string {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2
  }).format(cents / 100);
}

/** Ten seconds: long enough for a cold start, short enough not to feel stuck. */
const REQUEST_TIMEOUT_MS = 10_000;

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch (error) {
    // Offline, DNS failure, CORS rejection or timeout all land here.
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
    throw new ApiError(
      timedOut ? 'timeout' : 'network_error',
      timedOut
        ? 'The request took too long. Please check your connection and try again.'
        : 'We could not reach the server. Please check your connection and try again.',
      0
    );
  }

  const text = await response.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    // Two envelope shapes come back, and both have to be understood or the
    // buyer gets "Something went wrong" for a fixable typo:
    //
    //   { error, message }      - the payment handlers' own failures
    //                             (unknown_sku, amount_requires_contact, ...)
    //   { errorCode, hint }     - node-server-engine's error middleware, which
    //                             is what every request-validation rejection
    //                             and the 404 handler produce. For a validation
    //                             failure `hint` is { field: message }.
    const body = payload as {
      error?: string;
      message?: string;
      errorCode?: string;
      hint?: unknown;
      errors?: unknown;
    };

    // Flatten the engine's hint object into one sentence.
    const hintMessage =
      body.hint && typeof body.hint === 'object'
        ? Object.values(body.hint as Record<string, unknown>)
            .filter((value): value is string => typeof value === 'string')
            .join(' ')
        : typeof body.hint === 'string'
          ? body.hint
          : undefined;

    // Raw express-validator output, in case anything answers with it directly.
    const validationMessage = Array.isArray(body.errors)
      ? (body.errors as Array<{ msg?: string }>)
          .map((item) => item.msg)
          .filter(Boolean)
          .join(' ')
      : undefined;

    throw new ApiError(
      body.error ?? body.errorCode ?? 'request_failed',
      body.message ??
        hintMessage ??
        validationMessage ??
        'Something went wrong. Please try again.',
      response.status
    );
  }

  return payload as T;
}

export function fetchCatalogue(): Promise<Catalogue> {
  return apiFetch<Catalogue>('/payments/products');
}

export function startCheckout(body: CheckoutRequest): Promise<CheckoutResponse> {
  return apiFetch<CheckoutResponse>('/payments/checkout', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export function fetchOrder(orderRef: string): Promise<{ order: OrderView }> {
  return apiFetch<{ order: OrderView }>(
    `/payments/orders/${encodeURIComponent(orderRef)}`
  );
}

/**
 * Read the order reference the payment provider appended on the way back.
 *
 * Only the reference is trusted from this URL - never any status the query
 * string claims, since a buyer can type whatever they like into the address
 * bar. Whether the payment succeeded is always asked of the server.
 */
export function readReturnedOrderRef(): string | null {
  const ref = new URLSearchParams(window.location.search).get('ref');
  return ref && /^VH-[0-9A-F]{16}$/.test(ref) ? ref : null;
}

/** Remove the payment reference from the address bar without reloading. */
export function clearReturnedOrderRef(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('ref');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}
