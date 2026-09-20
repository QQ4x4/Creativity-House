import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { FIELD_LIMITS, maxMessage } from '@/lib/fieldLimits';

const messages = {
  en: {
    required: 'This field is required.',
    nameMin: 'Full name must be at least 2 characters.',
    email: 'Enter a valid email address.',
    phone: 'Enter a valid international phone number.',
    phoneRequired: 'Phone number is required.',
    otp: 'Enter the 6-digit code from your email.',
    passwordMin: 'Password must be at least 8 characters.',
    passwordComplexity:
      'Use upper and lower case letters, a number, and a special character.',
    passwordMatch: 'Passwords do not match.',
  },
  ar: {
    required: 'هذا الحقل مطلوب.',
    nameMin: 'يجب أن يكون الاسم الكامل حرفين على الأقل.',
    email: 'أدخل بريدًا إلكترونيًا صالحًا.',
    phone: 'أدخل رقم هاتف دولي صالحًا.',
    phoneRequired: 'رقم الهاتف مطلوب.',
    otp: 'أدخل الرمز المكون من 6 أرقام من بريدك.',
    passwordMin: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل.',
    passwordComplexity: 'استخدم أحرفًا كبيرة وصغيرة ورقمًا ورمزًا خاصًا.',
    passwordMatch: 'كلمتا المرور غير متطابقتين.',
  },
};

function t(lang) {
  return messages[lang] || messages.en;
}

const nameRegex = /^[\p{L}\s'\-]+$/u;
const e164Regex = /^\+[1-9]\d{6,14}$/;
const passwordComplexityRegex = new RegExp(
  `^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,${FIELD_LIMITS.password}}$`
);

export const CHECKOUT_FIELD_MAP = {
  name: 'fullName',
  email: 'email',
  phone: 'phoneNumber',
  phone_number: 'phoneNumber',
  country: 'country',
  course_id: 'root',
  code: 'code',
  password: 'password',
  password_confirmation: 'passwordConfirmation',
  payment_intent_id: 'root',
};

export function createCheckoutBillingSchema(lang = 'en') {
  const m = t(lang);
  const maxName = maxMessage(FIELD_LIMITS.name * 2, lang);

  return z.object({
    fullName: z
      .string()
      .trim()
      .min(1, m.required)
      .min(2, m.nameMin)
      .max(FIELD_LIMITS.name * 2, maxName)
      .regex(nameRegex, m.nameMin),
    email: z
      .string()
      .trim()
      .min(1, m.required)
      .max(FIELD_LIMITS.email, maxMessage(FIELD_LIMITS.email, lang))
      .email(m.email),
    phoneNumber: z
      .string({ required_error: m.phoneRequired })
      .trim()
      .min(1, m.phoneRequired)
      .max(FIELD_LIMITS.phone, maxMessage(FIELD_LIMITS.phone, lang))
      .refine((value) => e164Regex.test(value) && isValidPhoneNumber(value), {
        message: m.phone,
      }),
    country: z
      .string()
      .trim()
      .length(2, m.required)
      .regex(/^[A-Z]{2}$/, m.required),
  });
}

export function createClaimAccountSchema(lang = 'en') {
  const m = t(lang);
  const maxPassword = maxMessage(FIELD_LIMITS.password, lang);

  return z
    .object({
      code: z
        .string()
        .trim()
        .regex(/^\d{6}$/, m.otp),
      password: z
        .string()
        .min(8, m.passwordMin)
        .max(FIELD_LIMITS.password, maxPassword)
        .regex(passwordComplexityRegex, m.passwordComplexity),
      passwordConfirmation: z
        .string()
        .min(1, m.required)
        .max(FIELD_LIMITS.password, maxPassword),
    })
    .refine((data) => data.password === data.passwordConfirmation, {
      message: m.passwordMatch,
      path: ['passwordConfirmation'],
    });
}
