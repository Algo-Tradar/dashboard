import React, { useState } from 'react';
import { Box, Select, MenuItem } from '@mui/material';
import IndicatorTable from './IndicatorTable';
import EntityTable from './EntityTable';

export default function Dashboard() {
  const [selectedCrypto, setSelectedCrypto] = useState('BTCUSDT');

  const handleCryptoChange = (event) => {
    setSelectedCrypto(event.target.value);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, pr: 0 }}>
        <Select value={selectedCrypto} onChange={handleCryptoChange} variant="outlined" size="small">
          <MenuItem value="BTCUSDT">Bitcoin</MenuItem>
          <MenuItem value="ETHUSDT">Ethereum</MenuItem>
          <MenuItem value="SOLUSDT">Solana</MenuItem>
        </Select>
      </Box>
      <IndicatorTable selectedCrypto={selectedCrypto} />
      <EntityTable selectedCrypto={selectedCrypto} />
    </Box>
  );
} 