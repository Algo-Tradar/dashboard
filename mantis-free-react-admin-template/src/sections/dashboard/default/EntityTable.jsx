import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
// material-ui
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Select,
  MenuItem,
  Stack,
  Paper
} from '@mui/material';

// project imports
import Dot from 'components/@extended/Dot';

// API Configuration
const API_BASE_URL = 'http://localhost:5002';

// Helper function for API calls
const fetchFromApi = async (endpoint, crypto = '') => {
  const response = await fetch(`${API_BASE_URL}${endpoint}/${crypto}`.replace(/\/$/, ''));
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status}`);
  }
  return response.json();
};

// Component for rendering the table header
function EntityTableHead({ category }) {
  return (
    <TableHead>
      <TableRow>
        <TableCell sx={{ width: '20%' }}>{`${category}`}</TableCell>
        <TableCell sx={{ width: '10%', pr: 0 }}>Holdings</TableCell>
        <TableCell sx={{ width: '15%', pl: 1 }}>% (24h)</TableCell>
        <TableCell sx={{ width: '8%', pr: 0 }}>Streak</TableCell>
        <TableCell sx={{ width: '10%', pl: 1 }}>% (24h)</TableCell>
      </TableRow>
    </TableHead>
  );
}

EntityTableHead.propTypes = {
  category: PropTypes.string.isRequired
};

// Component for rendering group headers
function GroupHeader({ title }) {
  return (
    <TableRow>
      <TableCell
        colSpan={5}
        sx={{
          backgroundColor: '#f8fafc',  // Light blue-grey color
          color: 'text.primary',
          fontWeight: 500,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        {title}
      </TableCell>
    </TableRow>
  );
}

GroupHeader.propTypes = {
  title: PropTypes.string.isRequired
};

// Helper function to format the text by removing asterisks, signs, and % symbol
const formatText = (text) => {
  if (!text) return '';
  return text.replace(/\*/g, '').replace(/[+-]/g, '').replace(/%/g, '');
};

// Helper function to extract percentage from value
const extractPercentage = (value) => {
  if (!value) return '';
  // If value is just "hold", return empty for percentage
  if (value.toLowerCase() === 'hold') return '';
  // First try to find percentage in parentheses
  const match = value.match(/\(([-+]?\d+\.?\d*%)\)/);
  if (match) {
    return formatText(match[1]);
  }
  // If no parentheses, try to find percentage at the end of the string
  const percentMatch = value.match(/([-+]?\d+\.?\d*%)/);
  return percentMatch ? formatText(percentMatch[1]) : '';
};

// Helper function to extract main value without percentage
const extractMainValue = (value) => {
  if (!value) return '';
  // If value is just "hold", return it as is
  if (value.toLowerCase() === 'hold') return 'Hold';
  // Remove any content in parentheses and trim, then remove signs
  return formatText(value.replace(/\s*\([^)]*\)/, '').trim());
};

// Component for rendering change values with dot indicators
function ChangeValue({ value, showPercentage = false }) {
  if (!value) return <Typography>-</Typography>;
  
  const displayValue = showPercentage ? extractPercentage(value) : extractMainValue(value);
  // For "hold" value, use primary color
  const color = value.toLowerCase() === 'hold' ? 'primary' : 
                value.includes('+') ? 'success' : 
                value.includes('-') ? 'error' : 'primary';

  return (
    <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
      {!showPercentage && <Dot color={color} />}
      <Typography>{displayValue || '-'}</Typography>
    </Stack>
  );
}

ChangeValue.propTypes = {
  value: PropTypes.string
};

// Main component for the entity table
export default function EntityTable() {
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [entityData, setEntityData] = useState({
    ETFs: {},
    CEX: {},
    Companies: {}
  });

  // Handler for changing the selected cryptocurrency
  const handleCryptoChange = (event) => {
    setSelectedCrypto(event.target.value);
  };

  // Effect hook to fetch data and update state
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetchFromApi('/api/entities', selectedCrypto);
        setEntityData(response.Entities || {
          ETFs: {},
          CEX: {},
          Companies: {}
        });
      } catch (error) {
        console.error('Error fetching entity data:', error);
        setEntityData({
          ETFs: {},
          CEX: {},
          Companies: {}
        });
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [selectedCrypto]);

  const renderCategoryTable = (category, entities) => (
    <Table sx={{ mb: 4, tableLayout: 'fixed', width: '100%' }}>
      <EntityTableHead category={category} />
      <TableBody>
        {Object.entries(entities)
          .filter(([_, data]) => data?.change)
          .map(([entityName, data]) => (
            <TableRow key={entityName}>
              <TableCell sx={{ width: '35%' }}>
                <Typography sx={{ textTransform: 'capitalize' }}>
                  {entityName}
                </Typography>
              </TableCell>
              <TableCell sx={{ width: '18%', pr: 0 }}>
                <ChangeValue value={data?.change} />
              </TableCell>
              <TableCell sx={{ width: '12%', pl: 1 }}>
                <ChangeValue value={data?.change} showPercentage={true} />
              </TableCell>
              <TableCell sx={{ width: '15%', pr: 0 }}>
                <ChangeValue value={data?.streak} />
              </TableCell>
              <TableCell sx={{ width: '10%', pl: 1 }}>
                <ChangeValue value={data?.streak} showPercentage={true} />
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Select value={selectedCrypto} onChange={handleCryptoChange} variant="outlined" size="small">
          <MenuItem value="BTC">Bitcoin</MenuItem>
          <MenuItem value="ETH">Ethereum</MenuItem>
          <MenuItem value="SOL">Solana</MenuItem>
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
        {renderCategoryTable('CEX', entityData.CEX)}
        {renderCategoryTable('Companies', entityData.Companies)}
        {renderCategoryTable('ETFs', entityData.ETFs)}
      </TableContainer>
    </Box>
  );
} 