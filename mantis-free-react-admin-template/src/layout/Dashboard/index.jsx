import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, CssBaseline } from '@mui/material';
import { useGetMenuMaster } from 'api/menu';
import MainLayout from './MainLayout';

const DashboardLayout = () => {
  const { menuMaster, isLoading, isError } = useGetMenuMaster();

  if (isError) {
    console.error('Failed to load menu data');
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <MainLayout menuMaster={menuMaster} isLoading={isLoading} />
      <Box
        component="main"
        sx={{
          width: '100%',
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          overflow: 'auto',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default DashboardLayout;
