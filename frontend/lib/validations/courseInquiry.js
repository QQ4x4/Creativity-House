import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { sanitizeInquiryText } from '@/lib/validations/organization';

const messages = {
  en: {
    required: 'This field is required.',
    nameMin: 'Full name must be at least 2 characters.',
    max255: 'Must be 255 characters or fewer.',
    email: 'Enter a valid email address.',
    phone: 'Enter a valid international phone number.',
    messageMin: 'Please describe your question in at least 20 characters.',
    messageMax: 'Message must be 5000 characters or fewer.',
  },
  ar: {
    required: 'هذا الحقل مطلوب.',
    nameMin: 'يجب أن يكون الاسم الكامل حرفين على الأقل.',
    max255: 'يجب ألا يتجاوز 255 حرفًا.',
    email: 'أدخل بريدًا إلكترونيًا صالحًا.',
    phone: 'أدخل رقم هاتف دولي صالحًا.',
    messageMin: 'يرجى وصف سؤالك في 20 حرفًا على الأقل.',
    messageMax: 'يجب ألا تتجاوز الرسالة 5000 حرف.',
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
      .max(255, m.max255)
      .regex(nameRegex, m.nameMin)
      .transform((value) => sanitizeInquiryText(value, 255)),
    email: z
      .string()
      .trim()
      .min(1, m.required)
      .max(255, m.max255)
      .email(m.email)
      .transform((value) => sanitizeInquiryText(value, 255).toLowerCase()),
    phone: z
      .string()
      .optional()
      .nullable()
      .transform((value) => String(value ?? '').trim())
      .refine((value) => value === '' || (e164Regex.test(value) && isValidPhoneNumber(value)), {
        message: m.phone,
      }),
    course_id: z.union([z.string(), z.number()]).optional().nullable(),
    message: z
      .string()
      .trim()
      .min(1, m.required)
      .min(20, m.messageMin)
      .max(5000, m.messageMax)
      .transform((value) => sanitizeInquiryText(value, 5000)),
  });
}
