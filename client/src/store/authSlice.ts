import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export const AUTH_KEY = "pantau-auth";

type User = { id: number; email: string };
type AuthState = { token: string | null; user: User | null };

function muat(): AuthState {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) return JSON.parse(raw) as AuthState;
  } catch {
    // storage tidak tersedia atau isinya rusak
  }
  return { token: null, user: null };
}

const slice = createSlice({
  name: "auth",
  initialState: muat(),
  reducers: {
    masuk(state, action: PayloadAction<{ token: string; user: User }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
    },
    keluar(state) {
      state.token = null;
      state.user = null;
    },
  },
});

export const { masuk, keluar } = slice.actions;
export default slice.reducer;