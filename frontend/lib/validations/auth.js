import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { FIELD_LIMITS, maxMessage } from '@/lib/fieldLimits';

const messages = {
  en: {
    required: 'This field is required.',
    firstNameMin: 'First name must be at least 2 characters.',
    lastNameMin: 'Last name must be at least 2 characters.',
    email: 'Enter a valid email address.',
    phone: 'Enter a valid international phone number.',
    phoneRequired: 'Phone number is required.',
    passwordMin: 'Password must be at least 8 characters.',
    passwordComplexity:
      'Password must include uppercase, lowercase, number, and special character.',
    passwordMatch: 'Passwords do not match.',
    otp: 'Enter the 6-digit verification code.',
  },
  ar: {
    required: 'هذا الحقل مطلوب.',
    firstNameMin: 'يجب أن يكون الاسم الأول حرفين على الأقل.',
    lastNameMin: 'يجب أن يكون اسم العائلة حرفين على الأقل.',
    email: 'أدخل بريدًا إلكترونيًا صالحًا.',
    phone: 'أدخل رقم هاتف دولي صالحًا.',
    phoneRequired: 'رقم الهاتف مطلوب.',
    passwordMin: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل.',
    passwordComplexity:
      'يجب أن تتضمن كلمة المرور حرفًا كبيرًا وصغيرًا ورقمًا ورمزًا خاصًا.',
    passwordMatch: 'كلمتا المرور غير متطابقتين.',
    otp: 'أدخل رمز التحقق المكوّن من 6 أرقام.',
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

export function createRegisterSchema(lang = 'en') {
  const m = t(lang);
  const maxName = maxMessage(FIELD_LIMITS.name, lang);
  const maxEmail = maxMessage(FIELD_LIMITS.email, lang);
  const maxPhone = maxMessage(FIELD_LIMITS.phone, lang);
  const maxPassword = maxMessage(FIELD_LIMITS.password, lang);

  return z
    .object({
      first_name: z
        .string()
        .trim()
        .min(1, m.required)
        .min(2, m.firstNameMin)
        .max(FIELD_LIMITS.name, maxName)
        .regex(nameRegex, m.firstNameMin),
      last_name: z
        .string()
        .trim()
        .min(1, m.required)
        .min(2, m.lastNameMin)
        .max(FIELD_LIMITS.name, maxName)
        .regex(nameRegex, m.lastNameMin),
      email: z
        .string()
        .trim()
        .min(1, m.required)
        .max(FIELD_LIMITS.email, maxEmail)
        .email(m.email),
      phone_number: z
        .string({ required_error: m.phoneRequired })
        .trim()
        .min(1, m.phoneRequired)
        .max(FIELD_LIMITS.phone, maxPhone)
        .refine((value) => e164Regex.test(value) && isValidPhoneNumber(value), {
          message: m.phone,
        }),
      password: z
        .string()
        .min(1, m.required)
        .min(8, m.passwordMin)
        .max(FIELD_LIMITS.password, maxPassword)
        .regex(passwordComplexityRegex, m.passwordComplexity),
      password_confirmation: z
        .string()
        .min(1, m.required)
        .max(FIELD_LIMITS.password, maxPassword),
    })
    .refine((data) => data.password === data.password_confirmation, {
      message: m.passwordMatch,
      path: ['password_confirmation'],
    });
}

export function createLoginSchema(lang = 'en') {
  const m = t(lang);

  return z.object({
    email: z
      .string()
      .trim()
      .min(1, m.required)
      .max(FIELD_LIMITS.email, maxMessage(FIELD_LIMITS.email, lang))
      .email(m.email),
    password: z
      .string()
      .min(1, m.required)
      .max(FIELD_LIMITS.password, maxMessage(FIELD_LIMITS.password, lang)),
  });
}

export function createOtpSchema(lang = 'en') {
  const m = t(lang);

  return z.object({
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, m.otp),
  });
}

export function createForgotPasswordSchema(lang = 'en') {
  const m = t(lang);

  return z.object({
    email: z
      .string()
      .trim()
      .min(1, m.required)
      .max(FIELD_LIMITS.email, maxMessage(FIELD_LIMITS.email, lang))
      .email(m.email),
  });
}

export function createResetPasswordSchema(lang = 'en') {
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
        .min(1, m.required)
        .min(8, m.passwordMin)
        .max(FIELD_LIMITS.password, maxPassword)
        .regex(passwordComplexityRegex, m.passwordComplexity),
      password_confirmation: z.string().min(1, m.required).max(FIELD_LIMITS.password, maxPassword),
    })
    .refine((data) => data.password === data.password_confirmation, {
      message: m.passwordMatch,
      path: ['password_confirmation'],
    });
}
