type ServerError = {
  status: number | string;
  data?: { error?: string; errors?: { message: string }[] };
};

export function pesanError(err: unknown): string | null {
  if (!err) return null;
  const e = err as ServerError;
  if (e.status === "FETCH_ERROR") {
    return "Server tidak bisa dihubungi. Pastikan backend sedang berjalan.";
  }
  if (e.data?.errors?.length) return e.data.errors.map((x) => x.message).join(". ");
  if (e.data?.error) return e.data.error;
  return "Terjadi kesalahan. Coba lagi.";
}