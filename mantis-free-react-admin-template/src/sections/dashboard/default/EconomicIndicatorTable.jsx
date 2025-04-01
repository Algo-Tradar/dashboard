import PropTypes from 'prop-types';
import React, { useState, useEffect } from 'react';

// material-ui
import {
    Box,
    Typography,
    Stack,
    IconButton,
    Tooltip,
    useTheme,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Grid,
    ButtonBase,
    List,
    ListItem,
    ListItemText,
    Divider,
    Link
} from '@mui/material';

// ant design icons
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import RiseOutlined from '@ant-design/icons/RiseOutlined';
import FallOutlined from '@ant-design/icons/FallOutlined';
import MinusOutlined from '@ant-design/icons/MinusOutlined';
import CalendarOutlined from '@ant-design/icons/CalendarOutlined';
import ClockCircleOutlined from '@ant-design/icons/ClockCircleOutlined';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const EconomicIndicatorTable = () => {
    const theme = useTheme();
    const [indicators, setIndicators] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

    const fetchIndicators = async () => {
        try {
            // First try to fetch from API
            const response = await fetch('http://localhost:5002/api/economic-indicators');
            if (!response.ok) throw new Error('API request failed');
            const data = await response.json();
            if (Array.isArray(data)) {
                setIndicators(data);
                setLastUpdated(new Date().toLocaleTimeString());
            } else {
                setIndicators([]);
            }
        } catch (error) {
            // Fallback to backup data
            try {
                const backupResponse = await fetch('/dashboard/backup_data.json');
                if (!backupResponse.ok) throw new Error('Backup data request failed');
                const backupData = await backupResponse.json();
                
                if (backupData.indicator_data && Array.isArray(backupData.indicator_data.economic_indicators)) {
                    setIndicators(backupData.indicator_data.economic_indicators);
                    setLastUpdated(new Date().toLocaleTimeString() + ' (from backup)');
                } else {
                    setIndicators([]);
                }
            } catch (backupError) {
                setIndicators([]);
            }
        }
    };

    useEffect(() => {
        fetchIndicators();
        // Set up an interval to refresh data every 5 minutes
        const interval = setInterval(fetchIndicators, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const handleRefresh = () => {
        fetchIndicators();
    };

    // Group indicators by date
    const groupedIndicators = indicators.reduce((groups, indicator) => {
        const date = indicator.date;
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(indicator);
        return groups;
    }, {});

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    };

    const formatTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(':');
        return `${hours}:${minutes}`;
    };

    return (
        <Box>
            {/* Header */}
            <Stack 
                direction="row" 
                alignItems="center" 
                justifyContent="space-between"
                sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
            >
                <Stack direction="row" spacing={1} alignItems="center">
                    <CalendarOutlined style={{ fontSize: '0.875rem' }} />
                    <Typography variant="body2" color="textSecondary">
                        Last updated: {lastUpdated}
                    </Typography>
                </Stack>
                <IconButton size="small" onClick={handleRefresh}>
                    <ReloadOutlined style={{ fontSize: '0.875rem' }} />
                </IconButton>
            </Stack>

            <Box sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Upcoming Events</Typography>
                
                <Stack spacing={3}>
                    {Object.entries(groupedIndicators).map(([date, events]) => (
                        <Box key={date}>
                            <Typography color="primary" sx={{ mb: 2 }}>
                                {formatDate(date)}
                            </Typography>
                            
                            <Stack spacing={2}>
                                {events.map((event, index) => (
                                    <Box key={index}>
                                        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                                            <Typography variant="caption" color="textSecondary" sx={{ width: 70 }}>
                                                {formatTime(event.time)}
                                            </Typography>
                                            <Typography variant="body2">{event.event_name}</Typography>
                                        </Stack>
                                        <Stack spacing={0.5} sx={{ pl: 11 }}>
                                            <Stack direction="row" spacing={8}>
                                                <Stack>
                                                    <Stack direction="row" spacing={1}>
                                                        <Typography variant="caption" color="textSecondary">Actual:</Typography>
                                                        <Typography variant="caption" sx={{ 
                                                            color: event.actual_value === null ? 'text.secondary' : 
                                                                   parseFloat(event.actual_value) > parseFloat(event.previous_value) ? 'success.main' : 
                                                                   'error.main' 
                                                        }}>
                                                            {event.actual_value || 'NULL'}
                                                        </Typography>
                                                    </Stack>
                                                    <Stack direction="row" spacing={1}>
                                                        <Typography variant="caption" color="textSecondary">Consensus:</Typography>
                                                        <Typography variant="caption">
                                                            {event.consensus_value || 'NULL'}
                                                        </Typography>
                                                    </Stack>
                                                </Stack>
                                                <Stack>
                                                    <Stack direction="row" spacing={1}>
                                                        <Typography variant="caption" color="textSecondary">Previous:</Typography>
                                                        <Typography variant="caption">
                                                            {event.previous_value || 'NULL'}
                                                        </Typography>
                                                    </Stack>
                                                    <Stack direction="row" spacing={1}>
                                                        <Typography variant="caption" color="textSecondary">Forecast:</Typography>
                                                        <Typography variant="caption">
                                                            {event.forecast_value || 'NULL'}
                                                        </Typography>
                                                    </Stack>
                                                </Stack>
                                            </Stack>
                                        </Stack>
                                    </Box>
                                ))}
                            </Stack>
                        </Box>
                    ))}
                </Stack>
            </Box>
        </Box>
    );
};

export default EconomicIndicatorTable; 