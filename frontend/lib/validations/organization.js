import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { FIELD_LIMITS, maxMessage } from '@/lib/fieldLimits';

const messages = {
  en: {
    required: 'This field is required.',
    nameMin: 'Full name must be at least 2 characters.',
    companyMin: 'Company name must be at least 2 characters.',
    email: 'Enter a valid work email address.',
    phone: 'Enter a valid international phone number.',
    phoneRequired: 'Phone number is required.',
    messageMin: 'Please describe your requirements in at least 20 characters.',
  },
  ar: {
    required: 'هذا الحقل مطلوب.',
    nameMin: 'يجب أن يكون الاسم الكامل حرفين على الأقل.',
    companyMin: 'يجب أن يكون اسم الشركة حرفين على الأقل.',
    email: 'أدخل بريد عمل إلكتروني صالحًا.',
    phone: 'أدخل رقم هاتف دولي صالحًا.',
    phoneRequired: 'رقم الهاتف مطلوب.',
    messageMin: 'يرجى وصف متطلباتك في 20 حرفًا على الأقل.',
  },
};

function t(lang) {
  return messages[lang] || messages.en;
}

const nameRegex = /^[\p{L}\s'\-]+$/u;
const e164Regex = /^\+[1-9]\d{6,14}$/;

/** Strip tags and angle brackets before validation / POST. */
export function sanitizeInquiryText(value, max = FIELD_LIMITS.long) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .replace(/\0/g, '')
    .trim()
    .slice(0, max);
}

export function createOrganizationInquirySchema(lang = 'en') {
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
    company_name: z
      .string()
      .trim()
      .min(1, m.required)
      .min(2, m.companyMin)
      .max(FIELD_LIMITS.medium, maxMessage(FIELD_LIMITS.medium, lang))
      .transform((value) => sanitizeInquiryText(value, FIELD_LIMITS.medium)),
    email: z
      .string()
      .trim()
      .min(1, m.required)
      .max(FIELD_LIMITS.email, maxMessage(FIELD_LIMITS.email, lang))
      .email(m.email)
      .transform((value) => sanitizeInquiryText(value, FIELD_LIMITS.email).toLowerCase()),
    phone: z
      .string({ required_error: m.phoneRequired })
      .trim()
      .min(1, m.phoneRequired)
      .max(FIELD_LIMITS.phone, maxMessage(FIELD_LIMITS.phone, lang))
      .refine((value) => e164Regex.test(value) && isValidPhoneNumber(value), {
        message: m.phone,
      }),
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
