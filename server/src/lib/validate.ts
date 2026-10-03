import { z } from "zod";

export function formatIssues(error: z.ZodError) {
  return error.issues.map((i) => ({
    field: i.path.join("."),
    message: i.message,
  }));
}

export function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}