import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
// material-ui
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import get_greed_fear_index from 'data/get_greed_fear_index';

// project imports
import Dot from 'components/@extended/Dot';

// API Configuration
const API_BASE_URL = 'http://localhost:5002';

// API endpoints
const API_ENDPOINTS = {
  indicators: '/api/indicators',
  fearGreed: '/api/fear-greed',
  miningCost: '/api/mining-cost',
  googleTrends: '/api/google-trends'
};

// Helper function for API calls
const fetchFromApi = async (endpoint, crypto = '') => {
  const response = await fetch(`${API_BASE_URL}${endpoint}/${crypto}`.replace(/\/$/, ''));
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status}`);
  }
  return response.json();
};

// Function to fetch data from a local JSON file
const fetchFromJson = async () => {
  try {
    const response = await fetch('/dashboard/backup_data.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch from JSON: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching from JSON:', error);
    return null;
  }
};

// Function to create data structure for table rows
function createData(tracking_no, name, fat, carbs) {
  return { tracking_no, name, fat, carbs };
}

// Define the table head cells
const headCells = [
  { id: 'Indicators', align: 'left', disablePadding: false, label: 'Indicators' },
  { id: 'Analytics', align: 'left', disablePadding: true, label: 'Analytics' },
  { id: 'fat', align: 'right', disablePadding: false, label: 'Current Status' },
  { id: 'carbs', align: 'left', disablePadding: false, label: 'Options' },
];

// Component for rendering the table header
function OrderTableHead({ order, orderBy }) {
  return (
    <TableHead>
      <TableRow>
        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={headCell.align}
            padding={headCell.disablePadding ? 'none' : 'normal'}
            sortDirection={orderBy === headCell.id ? order : false}
          >
            {headCell.label}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

// Component for rendering trade decisions with color-coded indicators
function TradeDecision({ decision }) {
  let color;
  let action;

  switch (decision) {
    case 0:
      color = 'warning'; // Yellow color for Hold
      action = 'Hold';
      break;
    case 1:
      color = 'success'; // Green color for Buy
      action = 'Buy';
      break;
    case 2:
      color = 'error'; // Red color for Sell
      action = 'Sell';
      break;
    default:
      color = 'primary'; // Default color for None
      action = 'None';
  }

  return (
    <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
      <Dot color={color} />
      <Typography>{action}</Typography>
    </Stack>
  );
}

TradeDecision.propTypes = {
  decision: PropTypes.number.isRequired
};

// Function to calculate the Simple Moving Average (SMA)
function calculateSMA(data, period) {
  if (data.length < period) return null;
  const sum = data.slice(-period).reduce((acc, val) => acc + val, 0);
  return sum / period;
}

// Main component for the indicator table
export default function IndicatorTable({ selectedCrypto }) {
  // State variables for various indicators and statuses
  const [smaValue, setSmaValue] = useState('Loading...');
  const [smaStatus, setSmaStatus] = useState('Loading...');
  const [fundingRate, setFundingRate] = useState('Loading...');
  const [fundingRateStatus, setFundingRateStatus] = useState(0);
  const [knnMovingAverage, setKnnMovingAverage] = useState('Loading...');
  const [keltnerChannels, setKeltnerChannels] = useState('Loading...');
  const [aiTrendNavigator, setAiTrendNavigator] = useState('Loading...');
  const [fearGreedValue, setFearGreedValue] = useState('Loading...');
  const [fearGreedStatus, setFearGreedStatus] = useState(0);
  const [miningCostValue, setMiningCostValue] = useState('Loading...');
  const [miningCostStatus, setMiningCostStatus] = useState(0);
  const [googleTrendsValue, setGoogleTrendsValue] = useState('Loading...');
  const [googleTrendsStatus, setGoogleTrendsStatus] = useState(0);
  const previousSmaStatus = useRef(null);
  const order = 'asc';
  const orderBy = 'tracking_no';

  // Effect hook to fetch data and update state
  useEffect(() => {
    const fetchData = async () => {
      const cryptoSymbol = selectedCrypto.replace('USDT', '');

      try {
        // Fetch Binance data
        const [historicalData, currentPrice, fundingRate] = await Promise.all([
          fetch(`https://api.binance.com/api/v3/klines?symbol=${selectedCrypto}&interval=1d&limit=128`).then(res => res.json()),
          fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${selectedCrypto}`).then(res => res.json()),
          fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${selectedCrypto}`).then(res => res.json())
        ]);

        // Process SMA data
        const closingPrices = historicalData.map(item => parseFloat(item[4]));
        const sma128 = calculateSMA(closingPrices, 128);
        setSmaValue(sma128.toFixed(2));

        // Calculate SMA decision
        const currentPriceValue = parseFloat(currentPrice.price);
        const percentageDifference = ((currentPriceValue - sma128) / sma128) * 100;
        let decision = 0;
        if (currentPriceValue > sma128) {
          decision = percentageDifference > 7 ? 2 : 0;
        } else {
          decision = percentageDifference < -20 ? 1 : 0;
        }
        setSmaStatus(decision);

        // Process funding rate
        const fundingRateValue = parseFloat(fundingRate.lastFundingRate) * 100;
        setFundingRate(fundingRateValue.toFixed(4) + '%');
        setFundingRateStatus(fundingRateValue < 0 ? 1 : 2);

      } catch (error) {
        console.error('Error fetching Binance data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [selectedCrypto]);

  // Effect hook to fetch data and update state
  useEffect(() => {
    const fetchData = async () => {
      const cryptoSymbol = selectedCrypto.replace('USDT', '');

      try {
        // Fetch data from our API
        const indicators = await fetchFromApi(API_ENDPOINTS.indicators);
        console.log('Indicators API Response:', indicators); // Debugging statement

        // Process indicators data
        const selectedIndicators = indicators.indicator_data[selectedCrypto] || {};
        setKnnMovingAverage(selectedIndicators.knnMovingAverage || 'N/A');
        setKeltnerChannels(selectedIndicators.keltnerChannels || 'N/A');
        setAiTrendNavigator(selectedIndicators.aiTrendNavigator || 'N/A');

        // Fetch other data
        const [fearGreed, miningCost, googleTrends] = await Promise.all([
          fetchFromApi(API_ENDPOINTS.fearGreed, cryptoSymbol),
          fetchFromApi(API_ENDPOINTS.miningCost, cryptoSymbol),
          fetchFromApi(API_ENDPOINTS.googleTrends, cryptoSymbol)
        ]);

        // Process Fear & Greed data
        if (fearGreed && fearGreed['Fear-Greed']) {
          const { value, change, valuation } = fearGreed['Fear-Greed'];
          setFearGreedValue(`${change.toFixed(2)}%`);
          setFearGreedStatus(valuation === 'Buy' ? 1 : valuation === 'Sell' ? 2 : 0);
        }

        // Process Mining Cost data
        if (miningCost && miningCost['Mining-Cost']) {
          const { ratio, valuation } = miningCost['Mining-Cost'];
          setMiningCostValue(ratio.toFixed(2));
          setMiningCostStatus(valuation === 'Buy' ? 1 : valuation === 'Sell' ? 2 : 0);
        }

        // Process Google Trends data
        if (googleTrends && googleTrends['Google-Trends']) {
          const { change, valuation } = googleTrends['Google-Trends'];
          setGoogleTrendsValue(`${change.toFixed(2)}%`);
          setGoogleTrendsStatus(valuation === 'Buy' ? 1 : valuation === 'Sell' ? 2 : 0);
        }

      } catch (error) {
        console.error('Error fetching data from API:', error);

        // Fetch data from JSON as a fallback
        const backupData = await fetchFromJson();
        if (backupData) {
          const { indicator_data, crypto_data } = backupData;

          // Process indicators data from JSON
          const selectedIndicators = indicator_data[selectedCrypto] || {};
          setKnnMovingAverage(selectedIndicators.knnMovingAverage || 'N/A');
          setKeltnerChannels(selectedIndicators.keltnerChannels || 'N/A');
          setAiTrendNavigator(selectedIndicators.aiTrendNavigator || 'N/A');

          // Process Fear & Greed data from JSON
          if (crypto_data['Fear-Greed'] && crypto_data['Fear-Greed']['Fear-Greed']) {
            const fearGreedData = crypto_data['Fear-Greed']['Fear-Greed'];
            console.log('Fear & Greed Data:', fearGreedData);
            if (fearGreedData) {
              const { value, change, valuation } = fearGreedData;
              console.log('Setting Fear & Greed Value:', change.toFixed(2), 'Status:', valuation);
              setFearGreedValue(`${change.toFixed(2)}%`);
              setFearGreedStatus(valuation === 'Buy' ? 1 : valuation === 'Sell' ? 2 : 0);
            }
          }

          // Process Mining Cost data from JSON
          if (crypto_data['Mining-Cost'] && crypto_data['Mining-Cost']['Mining-Cost']) {
            const miningCostData = crypto_data['Mining-Cost']['Mining-Cost'];
            console.log('Mining Cost Data:', miningCostData);
            if (miningCostData) {
              const { ratio, valuation } = miningCostData;
              console.log('Setting Mining Cost Value:', ratio.toFixed(2), 'Status:', valuation);
              setMiningCostValue(ratio.toFixed(2));
              setMiningCostStatus(valuation === 'Buy' ? 1 : valuation === 'Sell' ? 2 : 0);
            }
          }

          // Process Google Trends data from JSON
          if (crypto_data['Google-Trends'] && crypto_data['Google-Trends']['Google-Trends']) {
            const googleTrendsData = crypto_data['Google-Trends']['Google-Trends'];
            console.log('Google Trends Data:', googleTrendsData);
            if (googleTrendsData) {
              const { change, valuation } = googleTrendsData;
              console.log('Setting Google Trends Value:', change.toFixed(2), 'Status:', valuation);
              setGoogleTrendsValue(`${change.toFixed(2)}%`);
              setGoogleTrendsStatus(valuation === 'Buy' ? 1 : valuation === 'Sell' ? 2 : 0);
            }
          }
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [selectedCrypto]);

  // Determine status for KNN Moving Average
  const knnStatus = knnMovingAverage === 'Above' ? 1 : 0;

  // Determine status for Keltner Channels
  const keltnerStatus = keltnerChannels === 'Upper' ? 1 : keltnerChannels === 'Middle' ? 0 : 2;

  // Determine status for AI Trend Navigator
  const aiTrendStatus = aiTrendNavigator === 'Green' ? 1 : 2;

  // Define the rows for the table
  const rows = [
    createData(
      <Link href="https://www.tradingview.com/chart/BTCUSD/CJMehAwG-128-Moving-Average/" target="_blank" rel="noopener noreferrer" color="secondary">
        128 Moving Average
      </Link>,
      'Above/Below',
      smaValue,
      smaStatus
    ),
    createData(
      <Link href="https://www.binance.com/en/futures/funding-history/perpetual/real-time-funding-rate" target="_blank" rel="noopener noreferrer" color="secondary">
        Funding Rate
      </Link>,
      '+/-',
      fundingRate,
      fundingRateStatus
    ),
    createData(
      <Link href="https://example.com/knn-moving-average" target="_blank" rel="noopener noreferrer" color="secondary">
        Knn Classifier Line
      </Link>,
      'Above/Below',
      knnMovingAverage,
      knnStatus
    ),
    createData(
      <Link href="https://example.com/keltner-channels" target="_blank" rel="noopener noreferrer" color="secondary">
        Keltner Channels
      </Link>,
      'Upper/Middle/Lower',
      keltnerChannels,
      keltnerStatus
    ),
    createData(
      <Link href="https://example.com/ai-trend-navigator" target="_blank" rel="noopener noreferrer" color="secondary">
        AI Trend Navigator
      </Link>,
      'Green/Red',
      aiTrendNavigator,
      aiTrendStatus
    ),
    createData(
      <Link href="https://www.coinglass.com/pro/i/FearGreedIndex" target="_blank" rel="noopener noreferrer" color="secondary">
        Fear & Greed Index
      </Link>,
      '0-100',
      fearGreedValue,
      fearGreedStatus
    ),
    createData(
      <Link href="https://www.coinglass.com/pro/i/MiningCost" target="_blank" rel="noopener noreferrer" color="secondary">
        Mining Cost
      </Link>,
      '0.00-2.00',
      miningCostValue,
      miningCostStatus
    ),
    createData(
      <Link href="https://trends.google.com/trends/" target="_blank" rel="noopener noreferrer" color="secondary">
        Google Trends
      </Link>,
      '0-100',
      googleTrendsValue,
      googleTrendsStatus
    )
  ];

  return (
    <Box>
      <TableContainer
        sx={{
          width: '100%',
          overflowX: 'auto',
          position: 'relative',
          display: 'block',
          maxWidth: '100%',
          '& td, & th': { whiteSpace: 'nowrap' }
        }}
      >
        <Table aria-labelledby="tableTitle">
          <OrderTableHead order={order} orderBy={orderBy} />
          <TableBody>
            {rows.map((row, index) => {
              const labelId = `enhanced-table-checkbox-${index}`;

              return (
                <TableRow
                  hover
                  role="checkbox"
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  tabIndex={-1}
                  key={index}
                >
                  <TableCell component="th" id={labelId} scope="row">
                    {row.tracking_no}
                  </TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell align="right">{row.fat}</TableCell>
                  <TableCell>
                    <TradeDecision decision={row.carbs} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

OrderTableHead.propTypes = { order: PropTypes.any, orderBy: PropTypes.string };

IndicatorTable.propTypes = {
  selectedCrypto: PropTypes.string.isRequired
};
