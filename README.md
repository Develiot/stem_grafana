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

## License

The project is distributed under [AGPL-3.0-only](LICENSE).
