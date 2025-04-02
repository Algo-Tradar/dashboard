import useSWR, { mutate } from 'swr';
import { useMemo } from 'react';

const initialState = {
  isDashboardDrawerOpened: false
};

const endpoints = {
  key: 'api/menu',
  master: 'master',
  dashboard: '/dashboard' // server URL
};

const fetcher = async (url) => {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message);
  }

  return data;
};

export function useGetMenuMaster() {
  try {
    const { data, error, isLoading } = useSWR('/api/menu', fetcher, {
      revalidateOnFocus: false,
    });

    return {
      menuMaster: data,
      isLoading,
      isError: error,
    };
  } catch (error) {
    console.error('Error in useGetMenuMaster:', error);
    return {
      menuMaster: null,
      isLoading: false,
      isError: true,
    };
  }
}

export function handlerDrawerOpen(isDashboardDrawerOpened) {
  // to update local state based on key

  mutate(
    endpoints.key + endpoints.master,
    (currentMenuMaster) => {
      return { ...currentMenuMaster, isDashboardDrawerOpened };
    },
    false
  );
}
