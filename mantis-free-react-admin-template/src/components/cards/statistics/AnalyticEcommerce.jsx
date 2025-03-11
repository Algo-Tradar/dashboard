import PropTypes from 'prop-types';
// material-ui
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import MainCard from 'components/MainCard';

// assets
import RiseOutlined from '@ant-design/icons/RiseOutlined';
import FallOutlined from '@ant-design/icons/FallOutlined';

// Style for icons
const iconSX = { fontSize: '0.75rem', color: 'inherit', marginLeft: 0, marginRight: 0 };

// Main component for displaying trading statistics
export default function TradingStatistics({ color = 'primary', title, count, percentage, isLoss, extra }) {
  return (
    <MainCard contentSX={{ p: 2.25 }}>
      <Stack sx={{ gap: 0.5 }}>
        {/* Display the title of the trading statistic */}
        <Typography variant="h6" color="text.secondary">
          {title}
        </Typography>
        <Grid container alignItems="center">
          <Grid>
            {/* Display the count of the trading statistic */}
            <Typography variant="h4" color="inherit">
              {count}
            </Typography>
          </Grid>
          {percentage && (
            <Grid>
              {/* Display the percentage change with an icon indicating rise or fall */}
              <Chip
                variant="combined"
                color={color}
                icon={isLoss ? <FallOutlined style={iconSX} /> : <RiseOutlined style={iconSX} />}
                label={`${percentage}%`}
                sx={{ ml: 1.25, pl: 1 }}
                size="small"
              />
            </Grid>
          )}
        </Grid>
      </Stack>
      <Box sx={{ pt: 2.25 }}>
        {/* Display additional information or advice related to trading */}
        <Typography variant="caption" color="text.secondary">
          You should{' '}
          <Typography variant="caption" sx={{ color: `${color || 'primary'}.main` }}>
            {extra}
          </Typography>{' '}
          Today
        </Typography>
      </Box>
    </MainCard>
  );
}

// Define the expected prop types for the component
TradingStatistics.propTypes = {
  color: PropTypes.string,
  title: PropTypes.string,
  count: PropTypes.string,
  percentage: PropTypes.number,
  isLoss: PropTypes.bool,
  extra: PropTypes.string
};
