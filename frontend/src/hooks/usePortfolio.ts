'use client';
import useSWR from 'swr';
import { portfolioApi } from '@/lib/api';

export function usePortfolio(id?: number) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `portfolio-${id}` : null,
    () => portfolioApi.get(id!),
    { refreshInterval: 60_000 }
  );

  return {
    portfolio: data,
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function usePortfolioList() {
  const { data, error, isLoading, mutate } = useSWR(
    'portfolios',
    portfolioApi.list,
    { refreshInterval: 300_000 }
  );

  return {
    portfolios: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}
