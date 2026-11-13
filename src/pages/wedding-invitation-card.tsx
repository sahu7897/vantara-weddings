/**
 * Route entry for /wedding-invitation-card.
 * The Webflow markup in InvitationCardPageBody mutates the DOM after load
 * (dropdown ids/aria attributes), which caused React hydration mismatches.
 * It is rendered client-only so the server HTML and client tree always match.
 */
import dynamic from 'next/dynamic';

const InvitationCardPageBody = dynamic(
  () => import('@/components/invitation/InvitationCardPageBody'),
  { ssr: false },
);

export default function WeddingInvitationCardPage() {
  return <InvitationCardPageBody />;
}