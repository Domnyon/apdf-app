type ContentSecurityPolicyOptions = {
  nonce?: string;
  isDevelopment?: boolean;
};

export function createContentSecurityPolicy({
  nonce,
  isDevelopment = false,
}: ContentSecurityPolicyOptions = {}) {
  const scriptSources = [
    "'self'",
    nonce ? `'nonce-${nonce}'` : null,
    nonce ? "'strict-dynamic'" : null,
    "https://cdnjs.cloudflare.com",
    isDevelopment ? "'unsafe-eval'" : null,
  ].filter(Boolean);

  const styleSources = [
    "'self'",
    nonce ? `'nonce-${nonce}'` : "'unsafe-inline'",
  ].join(' ');

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(' ')}`,
    "script-src-attr 'none'",
    `style-src ${styleSources}`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self' data:",
    "connect-src 'self' https://cdnjs.cloudflare.com https://formsubmit.co",
    "worker-src 'self' blob: https://cdnjs.cloudflare.com",
    "media-src 'self' blob: data:",
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "manifest-src 'self'",
    !isDevelopment ? 'upgrade-insecure-requests' : null,
  ]
    .filter(Boolean)
    .join('; ');
}
