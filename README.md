![STEM](./TBS_Logo_png_Purple.png)

Open-source platform for monitoring and observability of STEM kits used for education in schools, based on Grafana.

[![License](https://img.shields.io/github/license/Develiot/stem_grafana)](LICENSE)

The platform allows you to query, visualize, and understand your metrics sent from the STEM education kits. Explore the data that is all around you.

- **Visualizations:** Fast and flexible client side graphs with a multitude of options.
- **Dynamic Dashboards:** Dashboards with template variables that appear as dropdowns at the top of the dashboard.
- **Explore Metrics:** Explore your data through ad-hoc queries and dynamic drilldown. Split view and compare different time ranges, queries and data sources side by side.

## Get started

- You have an account? No installation steps required. Log in now: [stem.tbs.tech](https://stem.tbs.tech/)

- If you want to run the platform locally, you have two options:
  - Download the latest release tar file (a docker image) and load it into docker with the command `docker load -i filename.tar`
  - OR Download the source code and compile it with the commands `yarns start` and `go run build.go build` and start it with `grafana.exe server`

## Documentation

The STEM user guides are available at [stem.tbs.tech/files/](https://stem.tbs.tech/files/).

## Changes to Grafana

STEM is a modified version of [Grafana](https://github.com/grafana/grafana) (Grafana Labs, AGPL-3.0), based on its
`main` branch of 3 February 2023 (9.4.0-pre). The changes are in this repository's commit history; in summary:

- 2023: STEM interface (menu, login page, footer, Bulgarian translation, time picker wording, home dashboard).
- 2026-11-06, `stem-v0.4.2`: security hardening: current Go toolchain and libraries, Grafana security fixes
  backported, updated browser libraries and base images. See [HARDENING.md](HARDENING.md). Every backported code
  change is marked `STEM security backport` in the source.

## License

The project is distributed under [AGPL-3.0-only](LICENSE).
