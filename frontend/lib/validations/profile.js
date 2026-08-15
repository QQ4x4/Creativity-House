import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';

/**
 * Student Portal form schemas. Field names are camelCase to match the
 * normalized models in `lib/student/types.js`; `lib/student/api.js` converts
 * them to Laravel's snake_case on the way out.
 */

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
    passwordSame: 'New password must be different from the current password.',
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
    passwordSame: 'يجب أن تختلف كلمة المرور الجديدة عن الحالية.',
  },
};

function t(lang) {
  return messages[lang] || messages.en;
}

const nameRegex = /^[\p{L}\s'\-]+$/u;
const e164Regex = /^\+[1-9]\d{6,14}$/;
const passwordComplexityRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,50}$/;

/**
 * Laravel returns validation keys in snake_case; these maps translate them back
 * onto the camelCase react-hook-form fields so 422s land on the right input.
 */
export const ACCOUNT_FIELD_MAP = {
  first_name: 'firstName',
  last_name: 'lastName',
  email: 'email',
  phone_number: 'phoneNumber',
  avatar: 'root',
};

export const PASSWORD_FIELD_MAP = {
  current_password: 'currentPassword',
  password: 'newPassword',
  password_confirmation: 'confirmPassword',
};

export function remapServerErrors(errorData, fieldMap) {
  const errors = errorData?.errors;
  if (!errors || typeof errors !== 'object') return errorData;

  const remapped = {};
  Object.entries(errors).forEach(([field, messages]) => {
    remapped[fieldMap[field] || field] = messages;
  });

  return { ...errorData, errors: remapped };
}

export function createAccountInfoSchema(lang = 'en') {
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
      .string()
      .trim()
      .min(1, m.phoneRequired)
      .max(20, m.max50)
      .refine((value) => e164Regex.test(value) && isValidPhoneNumber(value), {
        message: m.phone,
      }),
  });
}

export function createPasswordChangeSchema(lang = 'en') {
  const m = t(lang);

  return z
    .object({
      currentPassword: z.string().min(1, m.required).max(50, m.max50),
      newPassword: z
        .string()
        .min(1, m.required)
        .min(8, m.passwordMin)
        .max(50, m.max50)
        .regex(passwordComplexityRegex, m.passwordComplexity),
      confirmPassword: z.string().min(1, m.required).max(50, m.max50),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: m.passwordMatch,
      path: ['confirmPassword'],
    })
    .refine((data) => data.newPassword !== data.currentPassword, {
      message: m.passwordSame,
      path: ['newPassword'],
    });
}
