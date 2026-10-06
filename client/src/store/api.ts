import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import type { RootState } from "./index.ts";
import { keluar } from "./authSlice.ts";

export type Portfolio = { id: number; name: string };
type AuthResponse = { token: string; user: { id: number; email: string } };
type Credentials = { email: string; password: string };

export type Holding = {
  symbol: string;
  name: string;
  type: "STOCK" | "CRYPTO";
  quantity: string;
  avgPrice: string | null;
  costBasis: string;
  marketPrice: string | null;
  marketValue: string | null;
  unrealizedPnl: string | null;
  unrealizedPnlPct: string | null;
  realizedPnl: string;
};

export type Summary = {
  portfolioId: number;
  quoteCurrency: string;
  holdings: Holding[];
  totals: {
    costBasis: string;
    marketValue: string;
    unrealizedPnl: string;
    realizedPnl: string;
  };
  missingPrices: string[];
};

export type Transaction = {
  id: number;
  type: "BUY" | "SELL";
  quantity: string;
  price: string;
  fee: string;
  executedAt: string;
  asset: { symbol: string; name: string; type: "STOCK" | "CRYPTO" };
};

export type NewTransaction = {
  symbol: string;
  assetType: "STOCK" | "CRYPTO";
  type: "BUY" | "SELL";
  quantity: number;
  price: number;
  fee: number;
  executedAt: string;
};

export type TitikRiwayat = { date: string; value: string; cost: string };

export type Riwayat = {
  portfolioId: number;
  quoteCurrency: string;
  points: TitikRiwayat[];
  missingPrices: string[];
};

const dasar = fetchBaseQuery({
  baseUrl: "/api",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

// Token kedaluwarsa atau tidak valid: keluar otomatis dan bersihkan cache
const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> =
  async (args, bq, extra) => {
    const hasil = await dasar(args, bq, extra);
    if (hasil.error?.status === 401 && (bq.getState() as RootState).auth.token) {
      bq.dispatch(keluar());
      bq.dispatch({ type: "api/resetApiState" });
    }
    return hasil;
  };

export const api = createApi({
  reducerPath: "api",
  baseQuery,
  tagTypes: ["Portfolio", "Posisi"],
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
    updatePortfolio: build.mutation<
      { portfolio: Portfolio },
      { id: number; name: string }
    >({
      query: ({ id, name }) => ({
        url: `/portfolios/${id}`,
        method: "PATCH",
        body: { name },
      }),
      invalidatesTags: ["Portfolio"],
    }),
    deletePortfolio: build.mutation<void, number>({
      query: (id) => ({ url: `/portfolios/${id}`, method: "DELETE" }),
      invalidatesTags: ["Portfolio"],
    }),
    getPortfolio: build.query<Portfolio, number>({
      query: (id) => `/portfolios/${id}`,
      transformResponse: (res: { portfolio: Portfolio }) => res.portfolio,
      providesTags: ["Portfolio"],
    }),
    getSummary: build.query<Summary, number>({
      query: (id) => `/portfolios/${id}/summary`,
      providesTags: (_r, _e, id) => [{ type: "Posisi", id }],
    }),
    getTransactions: build.query<{ transactions: Transaction[] }, number>({
      query: (id) => `/portfolios/${id}/transactions`,
      providesTags: (_r, _e, id) => [{ type: "Posisi", id }],
    }),
    getHistory: build.query<Riwayat, number>({
      query: (id) => `/portfolios/${id}/history`,
      providesTags: (_r, _e, id) => [{ type: "Posisi", id }],
    }),
    addTransaction: build.mutation<
      unknown,
      { portfolioId: number; body: NewTransaction }
    >({
      query: ({ portfolioId, body }) => ({
        url: `/portfolios/${portfolioId}/transactions`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { portfolioId }) => [
        { type: "Posisi", id: portfolioId },
      ],
    }),
    deleteTransaction: build.mutation<void, { id: number; portfolioId: number }>({
      query: ({ id }) => ({ url: `/transactions/${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, { portfolioId }) => [
        { type: "Posisi", id: portfolioId },
      ],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetPortfoliosQuery,
  useCreatePortfolioMutation,
  useGetPortfolioQuery,
  useGetSummaryQuery,
  useGetTransactionsQuery,
  useAddTransactionMutation,
  useDeleteTransactionMutation,
  useGetHistoryQuery,
  useUpdatePortfolioMutation,
  useDeletePortfolioMutation,
} = api;