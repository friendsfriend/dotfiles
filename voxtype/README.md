# Voxtype

Push-to-talk dictation. Hold **F9**, speak, release → transcribed text gets typed
at the cursor.

## Config approach (vs. omarchy)

[omarchy](https://github.com/basecamp/omarchy) (Hyprland/Linux) disables voxtype's
built-in hotkey (`[hotkey] enabled = false`) and binds F9 press/release in Hyprland
itself, because on Wayland the compositor is the only thing that reliably sees
key-up events.

On macOS that constraint doesn't apply — voxtype ships its own global hotkey
capture that macOS supports natively, and it's explicitly designed for this
(the config even recommends it: "FN (Globe key) is recommended on macOS").
AeroSpace also *can't* replicate omarchy's approach: it only fires on key-down,
so it can't do hold-to-record — only single-press toggle. That's a worse UX
for a "hold to record" workflow.

So here: `[hotkey] enabled = true`, `key = "F9"`, `mode = "push_to_talk"` —
voxtype owns the hotkey directly, no WM involved.

```toml
[hotkey]
key = "F9"
modifiers = []
mode = "push_to_talk"
```

## Autostart — why F9 silently does nothing

The cask ships the CLI binary **only**. Nothing else starts the daemon: no
LaunchAgent, no Login Item. Log out or reboot and the daemon is just gone, and
F9 is dead — no error, no notification, no hint.

`scripts/stow.sh::setup_voxtype_macos_app` runs `voxtype setup app-bundle` on
macOS: creates `/Applications/Voxtype.app`, registers it as a Login Item and
launches it. The daemon *is* the bundle process
(`/Applications/Voxtype.app/Contents/MacOS/voxtype-bin daemon`, bundle id
`io.voxtype.daemon`).

It is guarded by `[[ -d /Applications/Voxtype.app ]]` and skipped when present,
because re-running `app-bundle` re-signs the bundle and invalidates the TCC
grants (next section). So re-run it by hand only after `brew upgrade voxtype`.

When F9 is dead, check in this order:

```bash
pgrep -fl voxtype                  # empty -> daemon not running, re-run scripts/stow.sh
voxtype status                     # should print idle / recording
tail -20 ~/Library/Logs/voxtype/stdout.log   # look for the Accessibility WARN
```

## macOS permissions (the actual gotcha)

Voxtype needs two separate TCC grants, and macOS handles them very differently:

| Permission | Used for | Auto-prompts? |
|---|---|---|
| **Input Monitoring** (`kTCCServiceListenEvent`) | capturing the F9 hotkey | Yes — native popup appears on first use |
| **Accessibility** (`kTCCServiceAccessibility`) | capturing the F9 hotkey **and** typing the transcribed text via CGEvent | **No** — adhoc-signed CLI/app daemons don't trigger the system prompt; it silently stays `Unknown (None)` until manually granted |

Hotkey capture is rdev/CGEventTap, so it needs Accessibility too, not just
Input Monitoring — without it the daemon still logs `Listening for hotkey: F9`
(right after a `Accessibility permission not granted` WARN) but never sees a
keypress.

Symptom when Accessibility is missing: everything *looks* like it works
(logs show `Recording started` → `Transcribed: "..."` → `Text typed via CGEvent`)
but **no text appears anywhere**. No error, no crash — CGEvent (and the
`osascript` fallback) just gets silently dropped by macOS, then falls back
to clipboard copy.

Fix: **System Settings → Privacy & Security → Accessibility** → add
`/Applications/Voxtype.app` (not the brew binary) manually via `+`, ensure the
toggle is on. Grant **Input Monitoring** for the same app, and Microphone — it
appears in the list after the first recording attempt. The daemon detects the
grant and restarts itself (`Accessibility permission granted, restarting daemon
to activate hotkey...`).

```bash
open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
```

### Why toggling off/on doesn't fix it after an update

Voxtype.app is **adhoc-signed** (`codesign -dv` shows `flags=0x2(adhoc)`,
no Team ID). macOS ties Accessibility trust to the exact code signature hash.
Every time `voxtype setup app-bundle` rebuilds the app, the signature changes,
and the old grant becomes stale — Settings still *shows* it enabled, but the
identity no longer matches, so it silently fails again.

If typing breaks after any voxtype update/reinstall, don't just re-toggle —
remove and re-add it:

```bash
tccutil reset Accessibility io.voxtype.daemon
tccutil reset ListenEvent io.voxtype.daemon
osascript -e 'quit app "Voxtype"'; open -a Voxtype
```

Then re-grant both permissions in Settings from scratch.

### Debugging

```bash
# App/daemon status
voxtype setup app-bundle --status

# Live logs
tail -f ~/Library/Logs/voxtype/stdout.log
tail -f ~/Library/Logs/voxtype/stderr.log

# Ground truth for whether macOS actually granted the permission
log show --last 5m --predicate 'subsystem == "com.apple.TCC"' \
  | grep -A2 'kTCCServiceAccessibility'
# Look for: ReqResult(Auth Right: Allowed ...)   -> granted
#           ReqResult(Auth Right: Unknown (None) -> NOT granted, re-add in Settings
```

## Files

- `config.toml` → stowed to `~/.config/voxtype/config.toml`, then symlinked into
  `~/Library/Application Support/voxtype/config.toml` by
  `scripts/stow.sh::link_voxtype_macos_config` (that's where the app actually
  reads from on macOS).
- `scripts/stow.sh::setup_voxtype_macos_app` installs `/Applications/Voxtype.app`
  (Login Item, autostart) once, if missing. Runs for the `minimal` and `work`
  profiles only.
- Installed via `peteonrails/voxtype/voxtype` cask, listed in
  `scripts/brew-minimal.txt` / `scripts/brew-work.txt`.
