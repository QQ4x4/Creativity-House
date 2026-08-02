import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { formatValidationErrors } from '@/lib/auth';

/**
 * Extract the first Laravel validation error message from an ApiError payload.
 */
export function firstValidationMessage(errorData) {
  const errors = errorData?.errors;
  if (!errors || typeof errors !== 'object') return null;

  for (const messages of Object.values(errors)) {
    if (Array.isArray(messages) && messages[0]) return String(messages[0]);
    if (typeof messages === 'string' && messages) return messages;
  }

  return null;
}

/**
 * Show a toast for API failures (422 field errors preferred).
 * Never collapses a 422 into a vague generic message.
 */
export function toastApiError(error, fallback = 'Something went wrong. Please try again.') {
  const isApiError = error instanceof ApiError || error?.name === 'ApiError';

  if (isApiError) {
    if (error.status === 422) {
      const detailed =
        formatValidationErrors(error.data) ||
        firstValidationMessage(error.data) ||
        error.data?.message ||
        error.message ||
        'Validation failed. Check the highlighted fields.';
      toast.error(detailed);
      return detailed;
    }

    const fieldMessage = firstValidationMessage(error.data);
    const message =
      fieldMessage || error.data?.message || error.message || fallback;
    toast.error(message);
    return message;
  }

  const message = error?.message || fallback;
  toast.error(message);
  return message;
}
