import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "./index";

export type Portfolio = { id: number; name: string };
type AuthResponse = { token: string; user: { id: number; email: string } };
type Credentials = { email: string; password: string };

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["Portfolio"],
  endpoints: (build) => ({
    login: build.mutation<AuthResponse, Credentials>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
    }),
    register: build.mutation<AuthResponse, Credentials>({
      query: (body) => ({ url: "/auth/register", method: "POST", body }),
    }),
    getPortfolios: build.query<{ portfolios: Portfolio[] }, void>({
      query: () => "/portfolios",
      providesTags: ["Portfolio"],
    }),
    createPortfolio: build.mutation<{ portfolio: Portfolio }, { name: string }>({
      query: (body) => ({ url: "/portfolios", method: "POST", body }),
      invalidatesTags: ["Portfolio"],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetPortfoliosQuery,
  useCreatePortfolioMutation,
} = api;