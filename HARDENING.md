# STEM 9.4 security hardening

STEM stays on its Grafana base (upstream `main` of 2023-02-03, labelled 9.4.0-pre) so that the interface and behaviour
remain exactly as they are. This branch only adds security fixes. Every code change is marked `STEM security backport`
with the CVE and the upstream commit it comes from.

How it was checked: this build and the previous one were run side by side on test data, with every dashboard opened
by every kind of account. There were no differences in what accounts can see, in any data request or response, in any
panel text, or in the screenshots.

## 1. Build toolchain and base images

| Change                                                                                                                           | Why                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Go 1.19.4 -> 1.26.10 (`go.mod`: `go 1.26.0`, `toolchain go1.26.10`; Dockerfile `golang:1.26.10-alpine`)                          | Removes every known Go standard-library vulnerability (33 reachable ones in the old build)                 |
| Runtime image `alpine:3.15` -> `alpine:3.24`                                                                                     | 3.15 has been end-of-life since 2023                                                                       |
| Frontend build image `node:18-alpine3.15` -> `node:18-alpine`                                                                    | Build stage only (not shipped); stays on Node 18, which this Grafana version builds with                   |
| `wire` v0.5.0 -> v0.7.0 (`.bingo`)                                                                                               | v0.5.0 crashes with Go >= 1.22                                                                             |
| glibc for Alpine: Grafana's own glibc 2.40 runtime libraries instead of the sgerrand 2.35 package (method from Grafana v11.6.16) | The old package no longer installs on current Alpine                                                       |
| `CGO_CFLAGS=-D_LARGEFILE64_SOURCE` in the Go build stage                                                                         | Lets the bundled SQLite compile against current Alpine's C library, with the same SQLite version as before |
| Version `stem-v0.4.2` (footer, `docker-compose.yml`)                                                                             | Security-only release after `stem-v0.4.1`                                                                  |

## 2. Go libraries (reachable vulnerabilities only)

`golang.org/x/net` 0.4.0 -> 0.60.0, `x/crypto` 0.4.0 -> 0.58.0, `x/text` 0.5.0 -> 0.43.0, `x/sys` -> 0.49.0,
`x/oauth2` 0.3.0 -> 0.27.0, `google.golang.org/protobuf` 1.28.1 -> 1.33.0, `gorilla/websocket` 1.5.0 -> 1.5.3,
`golang-jwt/jwt/v4` 4.4.3 -> 4.5.2, `golang/glog` 1.0.0 -> 1.2.4, `klauspost/compress` 1.15.13 -> 1.20.2,
`andybalholm/brotli` 1.0.4 -> 1.2.7 (plus what these pull in: `x/sync`, `x/term`, `x/mod`, `x/tools`, `go-cmp`).

Deliberately left, because the vulnerable code is not reachable in STEM's configuration:

- OpenTelemetry (tracing is off), gRPC server-side issues (Grafana's gRPC server is off; plugins talk over local
  sockets), go-git/go-billy (only used by the alpha export/storage features, off), Azure SDK (Azure data sources
  unused), kin-openapi (build-time code generation only), Prometheus remote-read (not served), grafana-plugin-sdk-go
  (huge jump; the issue is in code STEM never calls), `x/crypto/openpgp` (unmaintained package, not used for user input).

## 3. Grafana security fixes backported

| CVE            | CVSS | Issue                                                         | Change                                                                                                    |
| -------------- | ---- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| CVE-2025-4123  | 7.6  | Open redirect + path traversal -> XSS                         | `pkg/api/static/static.go`: clean path before redirect                                                    |
| CVE-2026-33382 | 7.5  | Pre-auth DoS through unlimited request bodies                 | 100 KiB cap on login/sign-up/password/invite; 100 MiB cap on JSON binding                                 |
| CVE-2026-21720 | 7.5  | Unauthenticated avatar goroutine leak                         | `/avatar` requires sign-in; fetch goroutine can no longer block forever                                   |
| CVE-2023-2183  | 7.5  | Viewer can send test alert notifications (spam, webhook SSRF) | Testing receivers needs write permission                                                                  |
| CVE-2023-2801  | 7.5  | Server crash on concurrent mixed-datasource queries           | Mixed queries run one at a time (upstream workaround)                                                     |
| CVE-2023-0507  | 7.3  | Geomap attribution stored XSS                                 | Attribution is sanitized                                                                                  |
| CVE-2026-33377 | 7.1  | Dashboard import resets permissions                           | Only new dashboards get default permissions                                                               |
| CVE-2026-15815 | 8.8  | Plugin archive (zip slip) writes outside the plugins folder   | Members must land in the plugin's folder; nothing written through archive symlinks (adapted; tests added) |
| CVE-2026-88858 | 6.5  | Expression parser stack overflow (Viewer)                     | Nesting depth limit 100                                                                                   |
| CVE-2026-27879 | 6.5  | Resample OOM (Viewer)                                         | Series length limit 1,000,000                                                                             |
| CVE-2026-28376 | 6.5  | Live push OOM                                                 | 500 KiB per pushed message                                                                                |
| CVE-2026-28379 | 6.5  | Live race condition crash                                     | Map read under lock                                                                                       |
| CVE-2026-28383 | 6.5  | Plugin resource OOM                                           | 128 MiB body cap                                                                                          |
| CVE-2026-28380 | 6.5  | Snapshot deletion without permission                          | Orphaned snapshots: only creator or Admin may delete (adapted)                                            |
| CVE-2025-3580  | 5.5  | Org Admin can delete a Server Admin                           | Server Admins are never deleted as orphaned org users                                                     |

## 4. Browser libraries

`dompurify` 2.3.8/2.4.3 -> 2.5.9, `protobufjs` 6.11.3 -> 6.11.6, `immutable` 3.8.2 -> 3.8.4,
`path-to-regexp` 6.2.1 -> 6.3.0, `ua-parser-js` 1.0.32 -> 1.0.41 (all within their current major version).

Deliberately left:

- `uplot` 1.6.24: 1.6.31 draws threshold bands on time-series charts 2 px lower, a visible change. Its issue
  (prototype pollution) needs control over chart options, which only dashboard editors have; STEM has none.
- `angular` 1.8.3: no fixed version exists; it is needed by STEM's HTML, SVG and Worldmap panels.
- `lodash`, `js-cookie`: the issues need attacker-controlled template imports / object keys, which STEM does not pass.
- Build-only tools (webpack, storybook, cypress, ...): not shipped to browsers.
