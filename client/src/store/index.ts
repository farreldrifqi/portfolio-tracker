import { configureStore } from "@reduxjs/toolkit";
import auth, { AUTH_KEY } from "./authSlice";
import { api } from "./api";

export const store = configureStore({
  reducer: { auth, [api.reducerPath]: api.reducer },
  middleware: (getDefault) => getDefault().concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;

// Simpan sesi ke localStorage setiap kali state auth berubah
store.subscribe(() => {
  const { token, user } = store.getState().auth;
  try {
    if (token) localStorage.setItem(AUTH_KEY, JSON.stringify({ token, user }));
    else localStorage.removeItem(AUTH_KEY);
  } catch {
    // abaikan jika storage tidak tersedia
  }
});