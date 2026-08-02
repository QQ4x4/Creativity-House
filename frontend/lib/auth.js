/**
 * Map Laravel 422 validation errors onto react-hook-form fields.
 * Returns the first error message when any were applied.
 */
export function applyServerErrors(setError, errorData) {
  const errors = errorData?.errors;
  if (!errors || typeof errors !== 'object') return null;

  let firstMessage = null;

  Object.entries(errors).forEach(([field, messages]) => {
    const message = Array.isArray(messages) ? messages[0] : String(messages);
    if (field === 'recaptcha_token') {
      setError('root', { type: 'server', message });
    } else {
      setError(field, { type: 'server', message });
    }
    if (!firstMessage) firstMessage = message;
  });

  return firstMessage;
}

/**
 * Flatten all Laravel validation messages for toast / banner display.
 */
export function formatValidationErrors(errorData) {
  const errors = errorData?.errors;
  if (!errors || typeof errors !== 'object') {
    return errorData?.message || null;
  }

  return Object.entries(errors)
    .map(([field, messages]) => {
      const message = Array.isArray(messages) ? messages[0] : String(messages);
      return `${field}: ${message}`;
    })
    .join(' · ');
}

/**
 * Normalize register payload for the API (phone required, E.164).
 */
export function sanitizeRegisterPayload(values, recaptchaToken) {
  const phone = String(values.phone_number || '')
    .trim()
    .replace(/[^\d+]/g, '')
    .slice(0, 20);

  return {
    first_name: String(values.first_name || '').trim().slice(0, 50),
    last_name: String(values.last_name || '').trim().slice(0, 50),
    email: String(values.email || '').trim().toLowerCase().slice(0, 50),
    phone_number: phone,
    password: String(values.password || '').slice(0, 50),
    password_confirmation: String(values.password_confirmation || '').slice(0, 50),
    recaptcha_token: recaptchaToken || 'local-dev-token',
  };
}
