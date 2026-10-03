import { z } from "zod";

export const authSchema = z.object({
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
});