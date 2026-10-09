/**
 * Public lead capture (Phase 5 §13.6) → `public.leads` via the anon/auth
 * session. RLS (0002 "leads: public intake") enforces status='new' and no
 * assignment server-side; this form never sends status/assignment at all.
 *
 * VERIFIED RULE (rls-test-checklist #4b): the insert is deliberately sent
 * WITHOUT `.select()`/RETURNING — anonymous leads are write-only, and
 * INSERT … RETURNING re-checks the SELECT policy on the new row (which anon
 * does not have) and would fail with an RLS error.
 *
 * Honeypot field + double-submit guard keep the anon spam surface small
 * (platform rate limits are listed in the checklist).
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { FormEvent } from 'react';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';

interface Props {
  /** Page path recorded on the lead for attribution (defaults to the route). */
  sourcePage?: string;
  /** Pre-fills city (display name). */
  city?: string;
  /** Adds a service to `services_needed`, e.g. 'Venue' or 'Decoration'. */
  service?: string;
  heading?: string;
}

const BUDGETS = [
  'Under ₹1 lakh',
  '₹1 lakh – ₹3 lakh',
  '₹3 lakh – ₹10 lakh',
  '₹10 lakh and above',
  'Not sure yet',
];

const label = 'block text-xs font-semibold text-gray-500 mb-1';
const field =
  'w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-appTheme';

/** Indian mobile: strip formatting/+91/0 prefix, then require 6–9XXXXXXXXX. */
function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export default function LeadForm({ sourcePage, city, service, heading }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cityField, setCityField] = useState(city ?? '');
  const [eventDate, setEventDate] = useState('');
  const [budget, setBudget] = useState('');
  const [guests, setGuests] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [today, setToday] = useState('');

  useEffect(() => {
    setToday(new Date().toISOString().slice(0, 10));
  }, []);

  // Prefill city only until the visitor edits it themselves.
  useEffect(() => {
    if (city) setCityField(city);
  }, [city]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (submitting || done) return;

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError('Please enter your name.');
      return;
    }
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (honeypot) {
      // Bot filled the hidden field — pretend success, write nothing.
      setDone(true);
      return;
    }
    if (!isSupabaseConfigured()) {
      setError('Enquiry form is not configured in this build yet.');
      return;
    }

    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      // Attach the enquiry to the signed-in account when there is one
      // (policy allows customer_id = auth.uid(); anon → null).
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload: Record<string, unknown> = {
        name: trimmedName,
        phone: normalizedPhone,
        city: cityField.trim() || null,
        event_date: eventDate || null,
        budget_range: budget || null,
        guest_count: guests ? Math.trunc(Number(guests)) : null,
        services_needed: service ? [service] : null,
        source_page: sourcePage ?? router.pathname,
        customer_id: user?.id ?? null,
        // status / assigned_vendor_id are intentionally absent: RLS forces
        // status='new' + unassigned for non-admins anyway.
      };

      // NO .select() — see file header (verified rule #4b).
      const { error: insertError } = await supabase.from('leads').insert(payload);
      if (insertError) throw new Error(insertError.message);
      setDone(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="lead-form" className="rounded-2xl border border-lightGray bg-white p-6 shadow-[0px_4px_16px_0px_rgba(0,0,0,0.06)] lg:p-8">
      <h2 className="font-plus-jakarata-sans text-2xl font-extrabold text-black lg:text-3xl">
        {heading ?? 'Share your requirement'}
      </h2>
      <p className="mt-1 text-sm text-secondary">
        Tell us your date and budget — we call you back within 24 hours with shortlisted options.
      </p>

      {done ? (
        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800" role="status">
          <p className="font-bold">Thank you{name ? `, ${name.split(' ')[0]}` : ''}! Your enquiry is recorded.</p>
          <p className="mt-1">Our team will reach out on {phone} within 24 hours.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="lead-name">
                Your name *
              </label>
              <input
                id="lead-name"
                className={field}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                autoComplete="name"
                required
              />
            </div>
            <div>
              <label className={label} htmlFor="lead-phone">
                Mobile number *
              </label>
              <input
                id="lead-phone"
                className={field}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile"
                inputMode="tel"
                autoComplete="tel"
                required
              />
            </div>
            <div>
              <label className={label} htmlFor="lead-city">
                City
              </label>
              <input
                id="lead-city"
                className={field}
                value={cityField}
                onChange={(e) => setCityField(e.target.value)}
                placeholder="e.g. Banda"
              />
            </div>
            <div>
              <label className={label} htmlFor="lead-date">
                Wedding date
              </label>
              <input
                id="lead-date"
                type="date"
                className={field}
                value={eventDate}
                min={today || undefined}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            <div>
              <label className={label} htmlFor="lead-budget">
                Budget
              </label>
              <select id="lead-budget" className={field} value={budget} onChange={(e) => setBudget(e.target.value)}>
                <option value="">Select a range</option>
                {BUDGETS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="lead-guests">
                Expected guests
              </label>
              <input
                id="lead-guests"
                className={field}
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                placeholder="e.g. 250"
                inputMode="numeric"
              />
            </div>
          </div>

          {/* Honeypot — invisible to humans; bots tend to fill it. */}
          <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
            <label htmlFor="lead-company">Company</label>
            <input
              id="lead-company"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-appTheme px-6 py-3 text-sm font-bold text-white transition hover:brightness-95 disabled:opacity-50 sm:w-auto"
          >
            {submitting ? 'Sending…' : 'Get a callback'}
          </button>
          <p className="text-xs text-darkGrey">
            By submitting you agree to be contacted about your wedding enquiry.
          </p>
        </form>
      )}
    </div>
  );
}
