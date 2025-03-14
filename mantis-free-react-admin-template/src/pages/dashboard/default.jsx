// material-ui
import Avatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid2';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import MainCard from 'components/MainCard';
import get_greed_fear_index from 'data/get_greed_fear_index';
import AnalyticEcommerce from 'components/cards/statistics/AnalyticEcommerce';
import MonthlyBarChart from 'sections/dashboard/default/MonthlyBarChart';
import ReportAreaChart from 'sections/dashboard/default/ReportAreaChart';
import UniqueVisitorCard from 'sections/dashboard/default/UniqueVisitorCard';
import SaleReportCard from 'sections/dashboard/default/SaleReportCard';
import IndicatorTable from 'sections/dashboard/default/IndicatorTable';
import EntityTable from 'sections/dashboard/default/EntityTable';

// assets
import GiftOutlined from '@ant-design/icons/GiftOutlined';
import MessageOutlined from '@ant-design/icons/MessageOutlined';
import SettingOutlined from '@ant-design/icons/SettingOutlined';

import avatar1 from 'assets/images/users/avatar-1.png';
import avatar2 from 'assets/images/users/avatar-2.png';
import avatar3 from 'assets/images/users/avatar-3.png';
import avatar4 from 'assets/images/users/avatar-4.png';

// avatar style
const avatarSX = {
  width: 36,
  height: 36,
  fontSize: '1rem'
};

// action style
const actionSX = {
  mt: 0.75,
  ml: 1,
  top: 'auto',
  right: 'auto',
  alignSelf: 'flex-start',
  transform: 'none'
};

// ==============================|| DASHBOARD - DEFAULT ||============================== //

import React, { useState, useEffect } from 'react';

export default function DashboardDefault() {
  const [bitcoinPrice, setBitcoinPrice] = useState("Loading...");
  const [bitcoinChange, setBitcoinChange] = useState(0);
  const [ethPrice, setEthPrice] = useState("Loading...");
  const [ethChange, setEthChange] = useState(0);
  const [solPrice, setSolPrice] = useState("Loading...");
  const [solChange, setSolChange] = useState(0);

  useEffect(() => {
    const fetchCryptoData = async () => {
      try {
        // Fetch 24-hour ticker data for BTC
        const btcResponse = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT");
        const btcData = await btcResponse.json();
        const currentBtcPrice = parseFloat(btcData.lastPrice);
        const btcChange = parseFloat(btcData.priceChangePercent);

        // Fetch 24-hour ticker data for ETH
        const ethResponse = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT");
        const ethData = await ethResponse.json();
        const currentEthPrice = parseFloat(ethData.lastPrice);
        const ethChange = parseFloat(ethData.priceChangePercent);

        // Fetch 24-hour ticker data for SOL
        const solResponse = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=SOLUSDT");
        const solData = await solResponse.json();
        const currentSolPrice = parseFloat(solData.lastPrice);
        const solChange = parseFloat(solData.priceChangePercent);

        setBitcoinPrice(currentBtcPrice.toFixed(2));
        setBitcoinChange(btcChange.toFixed(2));
        setEthPrice(currentEthPrice.toFixed(2));
        setEthChange(ethChange.toFixed(2));
        setSolPrice(currentSolPrice.toFixed(2));
        setSolChange(solChange.toFixed(2));
      } catch (error) {
        console.error("Error fetching crypto data:", error);
        setBitcoinPrice("Error");
        setBitcoinChange(0);
        setEthPrice("Error");
        setEthChange(0);
        setSolPrice("Error");
        setSolChange(0);
      }
    };

    fetchCryptoData();
    const interval = setInterval(fetchCryptoData, 1000); // Update every second

    return () => clearInterval(interval); // Cleanup on component unmount
  }, []);

  return (
    <Grid container rowSpacing={4.5} columnSpacing={2.75}>
      {/* row 1 */}
      <Grid sx={{ mb: -2.25 }} size={12}>
        <Typography variant="h5">AlgoTradar Dashboard</Typography>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
        <AnalyticEcommerce
          title="Bitcoin"
          count={bitcoinPrice}
          percentage={bitcoinChange}
          isLoss={bitcoinChange < 0}
          color={bitcoinChange < 0 ? "error" : "success"}
          extra="Buy"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
        <AnalyticEcommerce
          title="ETH"
          count={ethPrice}
          percentage={ethChange}
          isLoss={ethChange < 0}
          color={ethChange < 0 ? "error" : "success"}
          extra="Sell"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
        <AnalyticEcommerce
          title="SOL"
          count={solPrice}
          percentage={solChange}
          isLoss={solChange < 0}
          color={solChange < 0 ? "error" : "success"}
          extra="Hold"
        />
      </Grid>


      <Grid sx={{ display: { sm: 'none', md: 'block', lg: 'none' } }} size={{ md: 8 }} />

      {/* row 2 */}
      {/* <Grid size={{ xs: 12, md: 7, lg: 8 }}>
        <UniqueVisitorCard />
      </Grid>
      <Grid size={{ xs: 12, md: 5, lg: 4 }}>
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid>
            <Typography variant="h5">Income Overview</Typography>
          </Grid>
          <Grid />
        </Grid>
        <MainCard sx={{ mt: 2 }} content={false}>
          <Box sx={{ p: 3, pb: 0 }}>
            <Stack sx={{ gap: 2 }}>
              <Typography variant="h6" color="text.secondary">
                This Week Statistics
              </Typography>
              <Typography variant="h3">$7,650</Typography>
            </Stack>
          </Box>
          <MonthlyBarChart />
        </MainCard>
      </Grid> */}

      {/* row 3 */}
      <Grid size={{ xs: 12, md: 7, lg: 8 }}>
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid>
            <Typography variant="h5">AlgoTradar Indicators</Typography>
          </Grid>
          <Grid />
        </Grid>
        <MainCard sx={{ mt: 2 }} content={false}>
          <IndicatorTable />
        </MainCard>
      </Grid>
      <Grid size={{ xs: 12, md: 5, lg: 4 }}>
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid>
            <Typography variant="h5">Overall Analytics Report</Typography>
          </Grid>
          <Grid />
        </Grid>
        <MainCard sx={{ mt: 2 }} content={false}>
          <List sx={{ p: 0, '& .MuiListItemButton-root': { py: 2 } }}>
            <ListItemButton divider>
              <ListItemText primary="AlgoTradar Index" />
              <Typography variant="h5">56%</Typography>
            </ListItemButton>
            <ListItemButton divider>
              <ListItemText primary="Overall Market Alert" />
              <Typography variant="h5">Sell</Typography>
            </ListItemButton>
            <ListItemButton>
              <ListItemText primary="Market Risk" />
              <Typography variant="h5">High</Typography>
            </ListItemButton>
          </List>
          <ReportAreaChart />
        </MainCard>
      </Grid>

      {/* Entity Holdings Table */}
      <Grid size={{ xs: 12, md: 7, lg: 8 }}>
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid>
            <Typography variant="h5">Entity Holdings</Typography>
          </Grid>
          <Grid />
        </Grid>
        <MainCard sx={{ mt: 2 }} content={false}>
          <EntityTable />
        </MainCard>
      </Grid>

      {/* row 4 */}
      {/* <Grid size={{ xs: 12, md: 7, lg: 8 }}>
        <SaleReportCard />
      </Grid> */}
      <Grid size={{ xs: 12, md: 5, lg: 4 }}>
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid>
            <Typography variant="h5">Signal History</Typography>
          </Grid>
          <Grid />
        </Grid>
        <MainCard sx={{ mt: 2 }} content={false}>
          <List
            component="nav"
            sx={{
              px: 0,
              py: 0,
              '& .MuiListItemButton-root': {
                py: 1.5,
                px: 2,
                '& .MuiAvatar-root': avatarSX,
                '& .MuiListItemSecondaryAction-root': { ...actionSX, position: 'relative' }
              }
            }}
          >
            <ListItem
              component={ListItemButton}
              divider
              secondaryAction={
                <Stack sx={{ alignItems: 'flex-end' }}>
                  <Typography variant="subtitle1" noWrap>
                    Price: 60000
                  </Typography>
                  <Typography variant="h6" color="secondary" noWrap>
                    Under 128 Moving Average
                  </Typography>
                </Stack>
              }
            >
              <ListItemAvatar>
                <Box sx={{ bgcolor: 'success.main', width: 24, height: 24, borderRadius: '50%' }} />
              </ListItemAvatar>
              <ListItemText primary={<Typography variant="subtitle1">128 Moving Average</Typography>} secondary="Today, 2:00 AM" />
            </ListItem>
            <ListItem
              component={ListItemButton}
              divider
              secondaryAction={
                <Stack sx={{ alignItems: 'flex-end' }}>
                  <Typography variant="subtitle1" noWrap>
                    Price: 60000
                  </Typography>
                  <Typography variant="h6" color="secondary" noWrap>
                    From Down to Up
                  </Typography>
                </Stack>
              }
            >
              <ListItemAvatar>
                <Box sx={{ bgcolor: 'success.main', width: 24, height: 24, borderRadius: '50%' }} />
              </ListItemAvatar>
              <ListItemText primary={<Typography variant="subtitle1">Knn Moving Average</Typography>} secondary="5 August, 1:45 PM" />
            </ListItem>
            <ListItem
              component={ListItemButton}
              secondaryAction={
                <Stack sx={{ alignItems: 'flex-end' }}>
                  <Typography variant="subtitle1" noWrap>
                    Price: 60000
                  </Typography>
                  <Typography variant="h6" color="secondary" noWrap>
                    Arrived Lower band
                  </Typography>
                </Stack>
              }
            >
              <ListItemAvatar>
                <Box sx={{ bgcolor: 'error.main', width: 24, height: 24, borderRadius: '50%' }} />
              </ListItemAvatar>
              <ListItemText primary={<Typography variant="subtitle1">Keltner Channel</Typography>} secondary="7 hours ago" />
            </ListItem>
          </List>
        </MainCard>
        <MainCard sx={{ mt: 2 }}>
          <Stack sx={{ gap: 3 }}>
            <Grid container justifyContent="space-between" alignItems="center">
              <Grid>
                <Stack>
                  <Typography variant="h5" noWrap>
                    Help & Support Chat
                  </Typography>
                  <Typography variant="caption" color="secondary" noWrap>
                    Typical replay within 5 min
                  </Typography>
                </Stack>
              </Grid>
              <Grid>
                <AvatarGroup sx={{ '& .MuiAvatar-root': { width: 32, height: 32 } }}>
                  <Avatar alt="Remy Sharp" src={avatar1} />
                  <Avatar alt="Travis Howard" src={avatar2} />
                  <Avatar alt="Cindy Baker" src={avatar3} />
                  <Avatar alt="Agnes Walker" src={avatar4} />
                </AvatarGroup>
              </Grid>
            </Grid>
            <Button size="small" variant="contained" sx={{ textTransform: 'capitalize' }}>
              Need Help?
            </Button>
          </Stack>
        </MainCard>
      </Grid>
    </Grid>
  );
}
