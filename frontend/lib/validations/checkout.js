import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';

const messages = {
  en: {
    required: 'This field is required.',
    firstNameMin: 'First name must be at least 2 characters.',
    lastNameMin: 'Last name must be at least 2 characters.',
    max50: 'Must be 50 characters or fewer.',
    email: 'Enter a valid email address.',
    phone: 'Enter a valid international phone number.',
    phoneRequired: 'Phone number is required.',
    country: 'Select your country.',
    cardNumber: 'Enter a valid card number.',
    expiry: 'Enter a valid expiry date (MM/YY).',
    cvc: 'Enter a valid CVC.',
  },
  ar: {
    required: 'هذا الحقل مطلوب.',
    firstNameMin: 'يجب أن يكون الاسم الأول حرفين على الأقل.',
    lastNameMin: 'يجب أن يكون اسم العائلة حرفين على الأقل.',
    max50: 'يجب ألا يتجاوز 50 حرفًا.',
    email: 'أدخل بريدًا إلكترونيًا صالحًا.',
    phone: 'أدخل رقم هاتف دولي صالحًا.',
    phoneRequired: 'رقم الهاتف مطلوب.',
    country: 'اختر دولتك.',
    cardNumber: 'أدخل رقم بطاقة صالحًا.',
    expiry: 'أدخل تاريخ انتهاء صالحًا (MM/YY).',
    cvc: 'أدخل رمز CVC صالحًا.',
  },
};

function t(lang) {
  return messages[lang] || messages.en;
}

const nameRegex = /^[\p{L}\s'\-]+$/u;
const e164Regex = /^\+[1-9]\d{6,14}$/;

export const CHECKOUT_FIELD_MAP = {
  first_name: 'firstName',
  last_name: 'lastName',
  email: 'email',
  phone_number: 'phoneNumber',
  phone: 'phoneNumber',
  country: 'country',
  course_id: 'root',
  course_slug: 'root',
};

export function createCheckoutBillingSchema(lang = 'en') {
  const m = t(lang);

  return z.object({
    firstName: z
      .string()
      .trim()
      .min(1, m.required)
      .min(2, m.firstNameMin)
      .max(50, m.max50)
      .regex(nameRegex, m.firstNameMin),
    lastName: z
      .string()
      .trim()
      .min(1, m.required)
      .min(2, m.lastNameMin)
      .max(50, m.max50)
      .regex(nameRegex, m.lastNameMin),
    email: z.string().trim().min(1, m.required).max(50, m.max50).email(m.email),
    phoneNumber: z
      .string({ required_error: m.phoneRequired })
      .trim()
      .min(1, m.phoneRequired)
      .max(20, m.max50)
      .refine((value) => e164Regex.test(value) && isValidPhoneNumber(value), {
        message: m.phone,
      }),
    country: z.string().trim().length(2, m.country),
  });
}

export function createCheckoutCardSchema(lang = 'en') {
  const m = t(lang);

  return z.object({
    cardNumber: z
      .string()
      .trim()
      .refine((value) => {
        const digits = value.replace(/\D/g, '');
        return digits.length >= 13 && digits.length <= 19;
      }, m.cardNumber),
    expiry: z
      .string()
      .trim()
      .refine((value) => isValidExpiry(value), m.expiry),
    cvc: z
      .string()
      .trim()
      .refine((value) => /^\d{3,4}$/.test(value), m.cvc),
  });
}

function isValidExpiry(value) {
  const match = String(value || '').match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (!match) return false;

  const month = Number(match[1]);
  const year = Number(`20${match[2]}`);
  if (month < 1 || month > 12) return false;

  const now = new Date();
  const exp = new Date(year, month, 1);
  return exp > now;
}
