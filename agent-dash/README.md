# agent-dash

OpenTUI dashboard for managed Herdr OpenSpec workflows.

```bash
bun install
agent-dash --repo /path/to/repo --change change-id
```

Preview without a workflow using interactive dummy data:

```bash
agent-dash --profile test
```

Press Enter in test profile to cycle through workflow phases.

Keys: `Enter` approves current gate, `j/k` scroll tasks, `r` refreshes, `q` exits. Data auto-refreshes every five seconds.
