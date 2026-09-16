export function digitsOnly(value: string) {
  return (value || '').replace(/\D/g, '');
}

export function crmWhatsAppPath(options?: { contactId?: number | null; phone?: string | null }) {
  const params = new URLSearchParams();
  if (options?.contactId) params.set('contact', String(options.contactId));
  if (options?.phone) {
    const digits = digitsOnly(options.phone);
    if (digits) params.set('phone', digits);
  }
  const query = params.toString();
  return query ? `/whatsapp?${query}` : '/whatsapp';
}
