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
    max50: 'يجب ألا يتجاوز 50 حرفًا.',
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
const passwordComplexityRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,50}$/;

export function createRegisterSchema(lang = 'en') {
  const m = t(lang);

  return z
    .object({
      first_name: z
        .string()
        .trim()
        .min(1, m.required)
        .min(2, m.firstNameMin)
        .max(50, m.max50)
        .regex(nameRegex, m.firstNameMin),
      last_name: z
        .string()
        .trim()
        .min(1, m.required)
        .min(2, m.lastNameMin)
        .max(50, m.max50)
        .regex(nameRegex, m.lastNameMin),
      email: z
        .string()
        .trim()
        .min(1, m.required)
        .max(50, m.max50)
        .email(m.email),
      phone_number: z
        .string({ required_error: m.phoneRequired })
        .trim()
        .min(1, m.phoneRequired)
        .max(20, m.max50)
        .refine((value) => e164Regex.test(value) && isValidPhoneNumber(value), {
          message: m.phone,
        }),
      password: z
        .string()
        .min(1, m.required)
        .min(8, m.passwordMin)
        .max(50, m.max50)
        .regex(passwordComplexityRegex, m.passwordComplexity),
      password_confirmation: z.string().min(1, m.required).max(50, m.max50),
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
      .max(50, m.max50)
      .email(m.email),
    password: z.string().min(1, m.required).max(50, m.max50),
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
      .max(50, m.max50)
      .email(m.email),
  });
}

export function createResetPasswordSchema(lang = 'en') {
  const m = t(lang);

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
        .max(50, m.max50)
        .regex(passwordComplexityRegex, m.passwordComplexity),
      password_confirmation: z.string().min(1, m.required).max(50, m.max50),
    })
    .refine((data) => data.password === data.password_confirmation, {
      message: m.passwordMatch,
      path: ['password_confirmation'],
    });
}
