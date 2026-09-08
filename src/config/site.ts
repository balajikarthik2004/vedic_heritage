/**
 * Navigation targets and outbound contact details.
 *
 * Every call to action on the page resolves through this file, so there is one
 * place to change when the booking flow gets a real payment provider.
 */

/**
 * Anchor ids. Each value is set as the `id` of the matching <section>, so these
 * are the single source of truth for both the navbar and the footer links -
 * a typo here fails loudly in `SECTION_LABELS` rather than silently producing a
 * dead link.
 */
export const SECTION = {
  home: 'home',
  aboutEvent: 'about-event',
  artists: 'artists',
  sponsorship: 'sponsorship',
  community: 'community',
  about: 'about',
  tickets: 'tickets',
  contact: 'contact',
} as const;

export type SectionId = (typeof SECTION)[keyof typeof SECTION];

/** Contact routes used by the call-to-action buttons. */
export const CONTACT = {
  email: 'vedic.heritageinc@gmail.com',
  /** Primary booking line (Manjula). `tel:` needs E.164, the label stays as designed. */
  phone: '+16318059105',
  /** Used by the footer "Map" link and the JSON-LD address. */
  address: '111 Jerusalem Ave, Hempstead, NY 11550, USA',
} as const;

/**
 * Where the ticket and sponsorship buttons should send people.
 *
 * `ticketUrl` is null because this build has no payment provider wired up. While
 * it is null every "book" button scrolls to the tickets section and the final
 * purchase button opens a pre-filled email, which are both real, working paths.
 *
 * To switch on real checkout, set `ticketUrl` to the Eventbrite / Zelle / PayPal
 * link and every booking button follows automatically - no component changes.
 */
export const BOOKING: { ticketUrl: string | null; websiteUrl: string | null } = {
  ticketUrl: null,
  websiteUrl: null,
};

const mailto = (subject: string, body?: string) =>
  `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}` +
  (body ? `&body=${encodeURIComponent(body)}` : '');

/** Pre-filled ticket enquiry, used when no `ticketUrl` is configured. */
export const TICKET_ENQUIRY_MAILTO = mailto(
  'Ticket booking - Annual Dipawali Fundraising Program',
  'Namaste,\n\nI would like to book tickets for the Annual Dipawali Fundraising ' +
    'Program on Saturday, October 24, 2026.\n\nNumber of tickets:\nName:\nPhone:\n\nThank you.'
);

/** Pre-filled sponsorship enquiry. */
export const SPONSORSHIP_MAILTO = mailto(
  'Sponsorship enquiry - Annual Dipawali Fundraising Program',
  'Namaste,\n\nI am interested in sponsoring the Annual Dipawali Fundraising ' +
    'Program on Saturday, October 24, 2026.\n\nSponsorship tier:\nName:\nPhone:\n\nThank you.'
);

export const VOLUNTEER_MAILTO = mailto('Volunteering enquiry - Vedic Heritage');

export const MAP_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  CONTACT.address
)}`;

/** Resolved destination for the final "Purchase ticket" button. */
export const ticketDestination = () => BOOKING.ticketUrl ?? TICKET_ENQUIRY_MAILTO;
