// material-ui
import { useTheme } from '@mui/material/styles';
import logo from 'assets/UTGL.svg'; // Ensure this path is correct

/**
 * if you want to use image instead of <svg> uncomment following.
 *
 * import logoDark from 'assets/images/logo-dark.svg';
 * import logo from 'assets/images/logo.svg';
 *
 */

// ==============================|| LOGO SVG ||============================== //

export default function LogoMain() {
  const theme = useTheme();
  return (
    <img src={logo} alt="Your Logo" width="100" />
  );
}
