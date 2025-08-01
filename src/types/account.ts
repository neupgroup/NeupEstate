
import { z } from 'zod';

export const AccountTypeSchema = z.enum(['brand', 'individual', 'dependent', 'guest']);
export type AccountType = z.infer<typeof AccountTypeSchema>;

const BaseAccountSchema = z.object({
  id: z.string(),
  created_on: z.string(), // ISO string
  accessed_on: z.string(), // ISO string
  created_from_ip: z.string().optional(),
  last_accessed_from_ip: z.string().optional(),
});

export const RegisteredAccountSchema = BaseAccountSchema.extend({
  registered: z.literal(true),
  account_type: z.enum(['brand', 'individual', 'dependent']),
});

export const UnregisteredAccountSchema = BaseAccountSchema.extend({
  registered: z.literal(false),
  account_type: z.literal('guest'),
  name: z.string().optional(),
  location: z.string().optional(),
});

export const AccountSchema = z.discriminatedUnion("registered", [
  RegisteredAccountSchema,
  UnregisteredAccountSchema,
]);

export type Account = z.infer<typeof AccountSchema>;
