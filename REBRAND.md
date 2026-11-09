# STEM 0.5.0: Enlayer rebrand

`stem-v0.5.0` = the `stem-v0.4.2` security hardening (see `HARDENING.md`) + the Enlayer brand. The layout, menu,
fonts, dashboards and behaviour are unchanged: only the logo, the interface colours and a few words change.

## What changes

| Where                                                  | Before (0.4.2)                               | After (0.5.0)                                                                                          |
| ------------------------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Login logo                                             | TBS circle logo                              | Enlayer wordmark (Deep Green; Warm Ivory in dark mode), approved artwork used unchanged                |
| Login background                                       | Grafana's pastel gradient                    | Plain Warm Ivory `#F7F5F0` (Deep Green `#183A33` in dark mode)                                         |
| Login subtitle                                         | none                                         | "STEM, an Enlayer platform"                                                                            |
| Menu logo (top left)                                   | TBS circle logo                              | Enlayer symbol (on a Warm Ivory tile in dark mode)                                                     |
| Browser tab icon, home-screen icon, loading animation  | TBS logo                                     | Enlayer symbol on a Warm Ivory tile                                                                    |
| Footer                                                 | "Telelink Business Services EAD" -> tbs.tech | "STEM, an Enlayer platform" -> enlayer.com; version `stem-v0.5.0`                                      |
| Primary colour (buttons, links, selected items, focus) | TBS purple `#5629C8`                         | Brand Green `#00805A`, text in Editorial Green `#0B6B52`                                               |
| Light theme greys                                      | Grafana greys                                | Enlayer product tokens: Section Tint canvas, Graphite text, Hairline/Ash/Stone borders, Mint selection |
| Status colours (info, error, success, warning)         | Grafana blue/red/green/orange                | Platform Blue, Terracotta, Emerald, Status Amber                                                       |
| Dark theme                                             | Grafana dark grey                            | Deep Green palette (shades and tints of Deep Green, Warm Ivory text)                                   |
| Browser theme colour                                   | black / Grafana orange                       | Deep Green                                                                                             |

## What deliberately does not change

- Fonts (Inter, as before).
- Dashboard content: the HTML/SVG panels draw their own blue headers, icons and buttons inside their own shadow DOM,
  and chart, gauge and stat colours come from the dashboards and Grafana's visualization palette, which is untouched.
  Recolouring them would mean editing the dashboards in the database.
- Menu, navigation, login form, profile page, wording in Bulgarian.

## Files

- `packages/grafana-data/src/themes/createColors.ts`: `enlayer` colour tokens, light and dark palettes
- `packages/grafana-data/src/themes/palette.ts`: TBS purple removed (back to the upstream value; no longer used)
- `public/sass/_variables.*.generated.scss`: regenerated with `yarn themes:generate`
- `public/app/core/components/Branding/Branding.tsx`: logos, login background, subtitle
- `public/app/core/components/Footer/Footer.tsx`, `docker-compose.yml`: version and Enlayer link
- `public/views/index-template.html`: browser colours; Grafana's Safari pinned-tab icon removed (no vector of the
  symbol exists, and the logo must not be redrawn, so browsers use the favicon)
- `public/img/enlayer/*`, `public/img/grafana_icon.svg`, `public/img/fav32.png`, `public/img/apple-touch-icon.png`
