import { css, cx } from '@emotion/css';
import React, { FC } from 'react';

import { colorManipulator } from '@grafana/data';
import { useTheme2 } from '@grafana/ui';

// STEM / Enlayer branding.
// Logo artwork is the approved Enlayer files, used unchanged (brand book A.6):
// Deep Green on light grounds, Warm Ivory on Deep Green.
export const ENLAYER_ENDORSEMENT = 'STEM, an Enlayer platform';

export interface BrandComponentProps {
  className?: string;
  children?: JSX.Element | JSX.Element[];
}

export const LoginLogo: FC<BrandComponentProps & { logo?: string }> = ({ className, logo }) => {
  const theme = useTheme2();
  const src = logo ? logo : `public/img/enlayer/enlayer-${theme.isDark ? 'warm-ivory' : 'deep-green'}.svg`;
  // The Enlayer wordmark is wide, so it needs more room than the square Grafana logo the layout is sized for.
  const wide = css({
    maxWidth: '180px !important',
    marginBottom: theme.spacing(3),
    [theme.breakpoints.up('sm')]: {
      maxWidth: '240px !important',
    },
  });
  return <img className={cx(className, !logo && wide)} src={src} alt="Enlayer" />;
};

const LoginBackground: FC<BrandComponentProps> = ({ className, children }) => {
  const theme = useTheme2();

  // Plain brand ground: Warm Ivory in light, Deep Green in dark (brand book A.5 / A.6).
  const background = css({
    '&:before': {
      content: '""',
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      top: 0,
      background: theme.isDark ? '#183A33' : '#F7F5F0',
      opacity: 0,
      transition: 'opacity 1s ease-in-out',
    },
  });

  return <div className={cx(background, className)}>{children}</div>;
};

const MenuLogo: FC<BrandComponentProps> = ({ className }) => {
  const theme = useTheme2();
  // Light: the Deep Green symbol on its own (a Warm Ivory tile barely shows on the white menu).
  // Dark: the symbol on its Warm Ivory tile, since Deep Green would disappear on the dark menu.
  const src = theme.isDark ? 'public/img/grafana_icon.svg' : 'public/img/enlayer/enlayer-symbol-deep-green.png';
  return <img className={className} src={src} alt={ENLAYER_ENDORSEMENT} />;
};

const LoginBoxBackground = () => {
  const theme = useTheme2();
  return css({
    background: colorManipulator.alpha(theme.colors.background.primary, theme.isDark ? 0.55 : 0.9),
    backgroundSize: 'cover',
  });
};

export class Branding {
  static LoginLogo = LoginLogo;
  static LoginBackground = LoginBackground;
  static MenuLogo = MenuLogo;
  static LoginBoxBackground = LoginBoxBackground;
  static AppTitle = 'STEM';
  static LoginTitle = 'Добре дошли в STEM';
  static GetLoginSubTitle = (): null | string => {
    return ENLAYER_ENDORSEMENT;
  };
}
