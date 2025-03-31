// material-ui
import { createTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

// third-party
import { presetDarkPalettes, presetPalettes } from '@ant-design/colors';

// project imports
import ThemeOption from './theme';

// theme constant
export const ThemeMode = {
  LIGHT: 'light',
  DARK: 'dark'
};

// ==============================|| DEFAULT THEME - PALETTE ||============================== //

export default function Palette(mode, presetColor) {
  const colors = mode === ThemeMode.DARK ? presetDarkPalettes : presetPalettes;

  let greyPrimary = [
    '#ffffff',
    '#fafafa',
    '#f5f5f5',
    '#f0f0f0',
    '#d9d9d9',
    '#bfbfbf',
    '#8c8c8c',
    '#595959',
    '#262626',
    '#141414',
    '#000000'
  ];
  let greyAscent = ['#fafafa', '#bfbfbf', '#434343', '#1f1f1f'];
  let greyConstant = ['#fafafb', '#e6ebf1'];

  if (mode === ThemeMode.DARK) {
    greyPrimary = greyPrimary.reverse();
    greyAscent = greyAscent.reverse();
    greyConstant = ['#121212', '#121212'];
  }

  colors.grey = [...greyPrimary, ...greyAscent, ...greyConstant];

  const paletteColor = ThemeOption(colors, presetColor, mode);

  return createTheme({
    palette: {
      mode,
      common: {
        black: '#000',
        white: '#fff'
      },
      ...paletteColor,
      text: {
        primary: mode === ThemeMode.DARK ? '#fff' : paletteColor.grey[700],
        secondary: mode === ThemeMode.DARK ? '#b2bac2' : paletteColor.grey[500],
        disabled: mode === ThemeMode.DARK ? '#636363' : paletteColor.grey[400]
      },
      action: {
        disabled: paletteColor.grey[300]
      },
      divider: mode === ThemeMode.DARK ? alpha('#fff', 0.12) : paletteColor.grey[200],
      background: {
        paper: mode === ThemeMode.DARK ? '#1a1a1a' : paletteColor.grey[0],
        default: mode === ThemeMode.DARK ? '#121212' : paletteColor.grey.A50
      },
      grey: {
        ...paletteColor.grey,
        A50: mode === ThemeMode.DARK ? '#1a1a1a' : paletteColor.grey.A50,
        A100: mode === ThemeMode.DARK ? '#242424' : paletteColor.grey.A100,
        A200: mode === ThemeMode.DARK ? '#323232' : paletteColor.grey.A200,
        A400: mode === ThemeMode.DARK ? '#424242' : paletteColor.grey.A400,
        A700: mode === ThemeMode.DARK ? '#525252' : paletteColor.grey.A700,
        A800: mode === ThemeMode.DARK ? '#626262' : paletteColor.grey.A800
      }
    }
  });
}
