// material-ui
import useMediaQuery from '@mui/material/useMediaQuery';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';

// project imports
import Search from './Search';
import Profile from './Profile';
import Notification from './Notification';
import MobileSection from './MobileSection';
import { useTheme } from 'themes';

// project import
import { GithubOutlined } from '@ant-design/icons';
import { BulbOutlined, BulbFilled } from '@ant-design/icons';
import Logo from 'assets/Algo.svg';

// ==============================|| HEADER - CONTENT ||============================== //

export default function HeaderContent() {
  const downLG = useMediaQuery((theme) => theme.breakpoints.down('lg'));
  const { mode, toggleTheme } = useTheme();
  
  // Add this console log to verify the theme context is working
  console.log('Current theme mode:', mode);

  return (
    <>
      {!downLG && <Search />}
      {downLG && <Box sx={{ width: '100%', ml: 1 }} />}
      
      <IconButton
        component={Link}
        href="https://github.com/codedthemes/mantis-free-react-admin-template"
        target="_blank"
        disableRipple
        color="secondary"
        title="Download Free Version"
        sx={{ color: 'text.primary', bgcolor: 'grey.100' }}
      >
        <GithubOutlined />
      </IconButton>

      <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
        <IconButton
          onClick={toggleTheme}
          color="secondary"
          sx={{ 
            mr: 1.5,
            color: 'text.primary',
            bgcolor: 'grey.100',
            '&:hover': {
              bgcolor: 'grey.200'
            }
          }}
        >
          {mode === 'dark' ? <BulbFilled /> : <BulbOutlined />}
        </IconButton>
      </Tooltip>

      <Notification />
      {!downLG && <Profile />}
      {downLG && <MobileSection />}
    </>
  );
}
