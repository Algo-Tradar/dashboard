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
export default function IndicatorTable() {
  // State variables for various indicators and statuses
  const [selectedCrypto, setSelectedCrypto] = useState('BTCUSDT');
  const [smaValue, setSmaValue] = useState('Loading...');
  const [smaStatus, setSmaStatus] = useState('Loading...');
  const [fundingRate, setFundingRate] = useState('Loading...');
  const [fundingRateStatus, setFundingRateStatus] = useState(0);
  const [knnMovingAverage, setKnnMovingAverage] = useState('Loading...');
  const [keltnerChannels, setKeltnerChannels] = useState('Loading...');
  const [aiTrendNavigator, setAiTrendNavigator] = useState('Loading...');
  const [fearGreedValue, setFearGreedValue] = useState('Loading...');
  const [fearGreedStatus, setFearGreedStatus] = useState(0);
  const previousSmaStatus = useRef(null);
  const order = 'asc';
  const orderBy = 'tracking_no';

  // Handler for changing the selected cryptocurrency
  const handleCryptoChange = (event) => {
    setSelectedCrypto(event.target.value);
  };

  // Effect hook to fetch data and update state
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log(`Fetching data for ${selectedCrypto}`);

        // Fetch historical data for the past 128 days
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${selectedCrypto}&interval=1d&limit=128`);
        if (!response.ok) throw new Error('Failed to fetch historical data');
        const data = await response.json();
        console.log('Historical data:', data);

        // Extract closing prices
        const closingPrices = data.map(item => parseFloat(item[4])); // 4th index is the closing price

        // Calculate the 128 SMA
        const sma128 = calculateSMA(closingPrices, 128);
        setSmaValue(sma128.toFixed(2));
        console.log('128 SMA:', sma128);

        // Fetch current price
        const currentResponse = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${selectedCrypto}`);
        if (!currentResponse.ok) throw new Error('Failed to fetch current price');
        const currentData = await currentResponse.json();
        const currentPrice = parseFloat(currentData.price);
        console.log('Current price:', currentPrice);

        // Calculate percentage difference
        const percentageDifference = ((currentPrice - sma128) / sma128) * 100;

        // Determine the decision based on the logic provided
        let decision = 0; // Default to Hold
        if (currentPrice > sma128) {
          decision = percentageDifference > 7 ? 2 : 0; // Sell or Hold
        } else {
          decision = percentageDifference < -20 ? 1 : 0; // Buy or Hold
        }

        // Check for status change
        if (previousSmaStatus.current !== null) {
          if (previousSmaStatus.current === 1 && decision === 2) {
            decision = 2; // Sell
          } else if (previousSmaStatus.current === 2 && decision === 1) {
            decision = 1; // Buy
          }
        }

        previousSmaStatus.current = decision;
        setSmaStatus(decision);

        // Fetch funding rate
        const fundingResponse = await fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${selectedCrypto}`);
        if (!fundingResponse.ok) throw new Error('Failed to fetch funding rate');
        const fundingData = await fundingResponse.json();
        const fundingRateValue = parseFloat(fundingData.lastFundingRate) * 100;
        setFundingRate(fundingRateValue.toFixed(4) + '%');
        console.log('Funding rate:', fundingRateValue);

        // Determine funding rate status
        const fundingStatus = fundingRateValue < 0 ? 1 : 2;
        setFundingRateStatus(fundingStatus);

        // Fetch data from Flask API
        const indicatorsResponse = await fetch('http://192.168.10.177:5002/api/indicators');
        if (!indicatorsResponse.ok) throw new Error('Failed to fetch indicators');
        const indicatorsData = await indicatorsResponse.json();

        // Access data for the selected cryptocurrency
        const selectedIndicators = indicatorsData[selectedCrypto] || {};

        // Set state with the selected cryptocurrency's data
        setKnnMovingAverage(selectedIndicators.knnMovingAverage || 'N/A');
        setKeltnerChannels(selectedIndicators.keltnerChannels || 'N/A');
        setAiTrendNavigator(selectedIndicators.aiTrendNavigator || 'N/A');

        console.log('Knn Moving Average:', selectedIndicators.knnMovingAverage);
        console.log('Keltner Channels:', selectedIndicators.keltnerChannels);
        console.log('AI Trend Navigator:', selectedIndicators.aiTrendNavigator);

        // Fetch Fear & Greed Index
        const [fearGreedGrade, fearGreedValue] = await get_greed_fear_index();
        const fearGreedStatus = fearGreedValue < 20 ? 1 : fearGreedValue > 80 ? 2 : 0;
        setFearGreedValue(fearGreedValue);
        setFearGreedStatus(fearGreedStatus);
        console.log('Fear & Greed Index:', fearGreedValue, fearGreedGrade);


      } catch (error) {
        console.error('Error fetching data:', error);
        setSmaValue('Error');
        setSmaStatus('Error');
        setFundingRate('Error');
        setFundingRateStatus(0);
        setKnnMovingAverage('Error');
        setKeltnerChannels('Error');
        setAiTrendNavigator('Error');
        setFearGreedValue('Error');
        setFearGreedStatus(0);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Update every minute

    return () => clearInterval(interval); // Cleanup on component unmount
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
    createData('Onchain', '100+ Holder', '-10000', 2, 40570),
    createData("Rainbow Price Chart", 'High/Low', 'High', 0, 180139),
    createData('Mining Cost', '0.00-2.00', '0.94', 1, 90989),
    createData('Google Trend', '0-100', '100', 0, 14001)
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0, pr: 0 }}>
        <Select value={selectedCrypto} onChange={handleCryptoChange} variant="outlined" size="small">
          <MenuItem value="BTCUSDT">Bitcoin</MenuItem>
          <MenuItem value="ETHUSDT">Ethereum</MenuItem>
          <MenuItem value="SOLUSDT">Solana</MenuItem>
        </Select>
      </Box>
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
