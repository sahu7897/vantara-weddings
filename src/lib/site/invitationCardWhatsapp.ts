/**
 * WhatsApp enquiry links for the Wedding Invitation Card page.
 * Each card click opens WhatsApp with the card name and its canonical link
 * pre-filled. The number is the public Vantara contact number.
 */
import { site } from '@/config/site';
import { buildWhatsappUrl } from '@/lib/site/whatsapp';

export const INVITATION_CARD_BASE_URL = 'https://www.vantaraweddings.com/wedding-invitation-card';

export function buildInvitationCardMessage(cardName: string, cardUrl: string): string {
  return `Hello Vantara Weddings, I am interested in this wedding invitation card (${cardName}). Please share more details.\n\nCard Link: ${cardUrl}`;
}

export function buildInvitationCardWhatsappUrl(slug: string, cardName: string): string | null {
  const cardUrl = `${INVITATION_CARD_BASE_URL}?design=${slug}`;
  return buildWhatsappUrl(site.contacts.whatsappNumber, buildInvitationCardMessage(cardName, cardUrl));
}
