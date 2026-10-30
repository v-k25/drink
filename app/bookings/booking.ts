// Booking Phase 1 (request-to-book, no payment): the rules in plain TypeScript.
// The database functions in supabase/migrations/20261030_booking_phase1.sql are the source of truth and enforce
// every rule below; this module lets a form check the same rules before it calls them and show plain messages.
// It has no I/O, so scripts/booking-check.cjs can run it directly.

export const BOOKING_STATUSES = ['requested', 'approved', 'declined', 'expired', 'cancelled'] as const
export type BookingStatus = (typeof BOOKING_STATUSES)[number]

// requested -> approved | declined | expired | cancelled; approved -> cancelled. Everything else is final.
export const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  requested: ['approved', 'declined', 'expired', 'cancelled'],
  approved: ['cancelled'],
  declined: [],
  expired: [],
  cancelled: [],
}

export const canTransition = (from: BookingStatus, to: BookingStatus) => TRANSITIONS[from].includes(to)
// A request holds capacity while it is waiting or approved.
export const holdsCapacity = (status: BookingStatus) => status === 'requested' || status === 'approved'

export const MAX_NIGHTS_AHEAD = 60
export const MAX_NOTE_LENGTH = 300
export const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{8,64}$/

export type Offer = { id: string; active: boolean; venueActive: boolean; capacityPerNight: number; maxPartySize: number }
export type BookingInput = { offerId: string; night: string; partySize: number; note?: string; idempotencyKey: string }

export type BookingError =
  | 'invalid_idempotency_key' | 'offer_unavailable' | 'invalid_night' | 'invalid_party_size' | 'invalid_note' | 'capacity_exceeded'

// Messages are plain and say what to do next. The error codes are the same strings the database raises.
export const BOOKING_MESSAGES: Record<BookingError | 'not_authenticated' | 'forbidden' | 'invalid_transition' | 'request_expired' | 'booking_not_found', string> = {
  invalid_idempotency_key: 'Something went wrong with that request. Please try again.',
  offer_unavailable: 'That option isn’t available.',
  invalid_night: 'Pick a night from today up to 60 days ahead.',
  invalid_party_size: 'That group size isn’t available for this option.',
  invalid_note: 'Keep the note to 300 characters.',
  capacity_exceeded: 'That night is full for this option. Try another night.',
  not_authenticated: 'Sign in to send a request.',
  forbidden: 'You can’t answer requests for this venue.',
  invalid_transition: 'That request has already been answered or cancelled.',
  request_expired: 'That request has expired.',
  booking_not_found: 'We couldn’t find that request.',
}

const DATE = /^\d{4}-\d{2}-\d{2}$/
const dayNumber = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86_400_000

// `today` is the current date in India (Asia/Kolkata), as the database uses; `booked` is the party total already holding capacity that night.
export function checkBookingRequest(input: BookingInput, offer: Offer | null, today: string, booked: number): { ok: true } | { ok: false; error: BookingError } {
  if (!IDEMPOTENCY_KEY.test(input.idempotencyKey)) return { ok: false, error: 'invalid_idempotency_key' }
  if (!offer || offer.id !== input.offerId || !offer.active || !offer.venueActive) return { ok: false, error: 'offer_unavailable' }
  if (!DATE.test(input.night) || !DATE.test(today)) return { ok: false, error: 'invalid_night' }
  const ahead = dayNumber(input.night) - dayNumber(today)
  if (!Number.isFinite(ahead) || ahead < 0 || ahead > MAX_NIGHTS_AHEAD) return { ok: false, error: 'invalid_night' }
  if (!Number.isInteger(input.partySize) || input.partySize < 1 || input.partySize > offer.maxPartySize) return { ok: false, error: 'invalid_party_size' }
  if (input.note !== undefined && input.note.length > MAX_NOTE_LENGTH) return { ok: false, error: 'invalid_note' }
  if (booked + input.partySize > offer.capacityPerNight) return { ok: false, error: 'capacity_exceeded' }
  return { ok: true }
}
