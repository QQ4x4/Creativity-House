import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { FIELD_LIMITS, maxMessage } from '@/lib/fieldLimits';
import { sanitizeInquiryText } from '@/lib/validations/organization';

const messages = {
  en: {
    required: 'This field is required.',
    nameMin: 'Full name must be at least 2 characters.',
    email: 'Enter a valid email address.',
    phone: 'Enter a valid international phone number.',
    messageMin: 'Please describe your question in at least 20 characters.',
  },
  ar: {
    required: 'هذا الحقل مطلوب.',
    nameMin: 'يجب أن يكون الاسم الكامل حرفين على الأقل.',
    email: 'أدخل بريدًا إلكترونيًا صالحًا.',
    phone: 'أدخل رقم هاتف دولي صالحًا.',
    messageMin: 'يرجى وصف سؤالك في 20 حرفًا على الأقل.',
  },
};

function t(lang) {
  return messages[lang] || messages.en;
}

const nameRegex = /^[\p{L}\s'\-]+$/u;
const e164Regex = /^\+[1-9]\d{6,14}$/;

export function createCourseInquirySchema(lang = 'en') {
  const m = t(lang);

  return z.object({
    name: z
      .string()
      .trim()
      .min(1, m.required)
      .min(2, m.nameMin)
      .max(FIELD_LIMITS.name, maxMessage(FIELD_LIMITS.name, lang))
      .regex(nameRegex, m.nameMin)
      .transform((value) => sanitizeInquiryText(value, FIELD_LIMITS.name)),
    email: z
      .string()
      .trim()
      .min(1, m.required)
      .max(FIELD_LIMITS.email, maxMessage(FIELD_LIMITS.email, lang))
      .email(m.email)
      .transform((value) => sanitizeInquiryText(value, FIELD_LIMITS.email).toLowerCase()),
    phone: z
      .string()
      .optional()
      .nullable()
      .transform((value) => String(value ?? '').trim().slice(0, FIELD_LIMITS.phone))
      .refine(
        (value) => value === '' || (e164Regex.test(value) && isValidPhoneNumber(value)),
        { message: m.phone }
      ),
    course_id: z.union([z.string(), z.number()]).optional().nullable(),
    message: z
      .string()
      .trim()
      .min(1, m.required)
      .min(20, m.messageMin)
      .max(FIELD_LIMITS.long, maxMessage(FIELD_LIMITS.long, lang))
      .transform((value) => sanitizeInquiryText(value, FIELD_LIMITS.long)),
  });
}
