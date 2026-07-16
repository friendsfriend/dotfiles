# agent-dash

OpenTUI dashboard for managed Herdr OpenSpec workflows.

```bash
bun install
bun run build:single # current OS/architecture
bun run build        # all supported variants
bun run install:bin  # build current variant and install to ~/.local/bin

agent-dash --repo /path/to/repo --change change-id
agent-dash --home  # global workspace overview
```

Build output lives under `dist/agent-dash-<os>-<arch>/` with baseline and musl variants included by the all-platform build.

Preview without a workflow using interactive dummy data:

```bash
agent-dash --profile test
```

Press Enter in test profile to cycle through workflow phases.

Keys: `Enter` approves current gate, `J/K` or Tab switches focused panels, `j/k` scrolls the focused panel, `Alt+C` copies selected text, `r` refreshes, `q` exits. Mouse selection copies automatically on release. Data auto-refreshes every five seconds.
