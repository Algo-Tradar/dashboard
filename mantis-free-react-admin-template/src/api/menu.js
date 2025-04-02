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

export function useGetMenuMaster() {
  const { data, error, isLoading } = useSWR(endpoints.key + endpoints.master, {
    fallbackData: initialState,
    revalidateOnFocus: false,
  });

  return {
    menuMaster: data || initialState,
    isLoading,
    isError: error,
  };
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
