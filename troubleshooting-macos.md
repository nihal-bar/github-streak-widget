# Troubleshooting — github-streak-widget

A running log of every issue hit while building this project, what caused it, and the exact commands to diagnose/fix it.

---

## 1. `streak.json` not saving to the Übersicht widgets folder

**Symptom:** Widgets folder doesn't exist under `~/Library/Application Support/Übersicht/`.

**Cause:** The folder is only created once Übersicht has actually been launched at least once (or manually created).

**Fix:**
```bash
mkdir -p ~/Library/Application\ Support/Übersicht/widgets
```
> Note: you don't need a subfolder per widget if your widget's `command` uses an **absolute path** to read its data file — see issue #7 below for why we ended up doing this instead of symlinking.

---

## 2. `launchctl` job fails silently — `last exit code = 78 (EX_CONFIG)`

**Symptom:**
```
cat: /tmp/github-streak.log: No such file or directory
cat: /tmp/github-streak-error.log: No such file or directory
last exit code = 78: EX_CONFIG
```
No log files ever get created — meaning launchd never even successfully spawned the process.

**Cause (in order of likelihood):**
- `WorkingDirectory` or the `index.js` path in the `.plist` points to a folder that doesn't exist (typo, wrong project name, etc.)
- Using `~` inside the `.plist` — **launchd does not expand `~`**, only absolute paths work
- Editing the `.plist` with `sudo`, which can change file ownership to `root` and break loading as your own user

**Diagnose:**
```bash
# Confirm the exact path in the plist is real
ls -la /Users/nihal/practice-ts/github-streak-widget

# Confirm node path matches what's in the plist
which node

# Confirm plist ownership is you, not root
ls -la ~/Library/LaunchAgents/com.nihal-bar.github-streak-widget.plist

# Validate plist syntax
plutil -lint ~/Library/LaunchAgents/com.nihal-bar.github-streak-widget.plist
```

**Fix ownership if it got sudo'd:**
```bash
sudo chown nihal:staff ~/Library/LaunchAgents/com.nihal-bar.github-streak-widget.plist
```

**Always edit without sudo** (LaunchAgents are per-user, no sudo needed):
```bash
nano ~/Library/LaunchAgents/com.nihal-bar.github-streak-widget.plist
```

---

## 3. Reloading a launchd job after editing the `.plist`

Modern replacement for the legacy `load`/`unload`/`start` commands (which can silently no-op on newer macOS):

```bash
# Fully unload
launchctl bootout gui/$(id -u)/com.nihal-bar.github-streak-widget

# Load fresh
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.nihal-bar.github-streak-widget.plist

# Force an immediate run (don't wait for the 15-min interval)
launchctl kickstart -k gui/$(id -u)/com.nihal-bar.github-streak-widget

# Check status / last exit code
launchctl print gui/$(id -u)/com.nihal-bar.github-streak-widget | grep "last exit code"
```

---

## 4. Streak data structure was wrong (month/day-index math instead of GitHub's own week grouping)

**Symptom:** Weeks miscounted at month boundaries; streak logic broke on partial weeks.

**Cause:** Original code derived week numbers manually from `date.getDate()`, discarding GitHub's own `weeks` array — which is already correctly Sunday–Saturday aligned.

**Fix:** Use `contributionCalendar.weeks` directly instead of re-deriving. See `index.js` in the repo — key part is `recentWeeks = allWeeks.slice(-5)` instead of any manual date math.

---

## 5. `streak-widget.jsx` throws `undefined is not an object (evaluating 'data.weeks.map')`

**Cause:** `streak.json` on disk still had the *old* shape (`{ days: [...] }`) because `index.js` hadn't been re-run yet with the updated script that outputs `{ weeks: [...] }`.

**Fix:** Always re-run manually after changing `index.js`'s output shape, and confirm before assuming the widget is broken:
```bash
cd /Users/nihal/practice-ts/github-streak-widget
node index.js
cat streak.json   # confirm the shape actually changed
```

---

## 6. Widget stuck on "Loading..." even though `streak.json` looks correct

This one had **two separate causes** layered on top of each other — worth checking both.

### 6a. App Nap throttling Übersicht in the background

**Cause:** macOS suspends background/unfocused apps aggressively, which can stall a widget's own polling loop even with a correct `refreshFrequency`.

**Fix:**
```bash
defaults write com.tracesOf.Uebersicht NSAppSleepDisabled -bool YES
```
Then fully quit and relaunch Übersicht for it to take effect.

### 6b. Stale hot-reload / cache after editing the widget file

**Symptom:** Even after fixing the data and confirming the shell command works perfectly when run manually, the widget still showed old/stuck output.

**Cause:** Übersicht didn't actually pick up the latest edit to `streak-widget.jsx` — it kept running a cached/old version, even across a laptop restart.

**Diagnose — isolate data layer vs render layer** by temporarily replacing `render()` with a bare test:
```jsx
export const render = ({ output }) => {
  return <div>TEST {output ? "GOT DATA" : "NO DATA"}</div>;
};
```
If this still shows stale/wrong output after confirming the data file is correct, it's a reload/cache issue, not a data or shell issue.

**Fix — force a real process restart** (not just "Refresh" from the menu bar, which wasn't enough in our case):
```bash
# Find the actual PID (avoid typing "Übersicht" directly — see note below)
ps aux | grep -i rsicht

# Kill it and relaunch
kill <PID>
open /Applications/Übersicht.app
```

> **Note on the `Ü` character:** commands like `killall Übersicht` or `open -a Übersicht` can fail with "Unable to find application" even when the app is definitely installed and running. This is a Unicode normalization quirk — typed/pasted `Ü` may not byte-match how macOS stores it internally. Use `ps aux | grep -i rsicht` (partial match, no special character) to find the process reliably instead.

---

## 7. Where should `streak.json` actually live?

We initially tried symlinking `streak.json` from the project folder into a per-widget subfolder under Übersicht's `widgets/` directory. Unnecessary complexity — instead, keep `streak.json` in the project folder and point the widget's `command` at it via an **absolute path**:

```js
export const command = "cat /Users/nihal/practice-ts/github-streak-widget/streak.json";
```

No symlinks, no risk of the widget subfolder not existing, no dependency on where Übersicht happens to be installed.

---

## Quick reference — full diagnostic sweep

Copy-paste this whole block any time something seems broken, then read top to bottom:

```bash
# 1. Confirm the data file is fresh and correct
cat /Users/nihal/practice-ts/github-streak-widget/streak.json

# 2. Confirm the launchd job is configured correctly and exists
plutil -lint ~/Library/LaunchAgents/com.nihal-bar.github-streak-widget.plist
cat ~/Library/LaunchAgents/com.nihal-bar.github-streak-widget.plist

# 3. Confirm node + project paths match what's in the plist
which node
ls -la /Users/nihal/practice-ts/github-streak-widget

# 4. Force a clean reload of the launchd job
launchctl bootout gui/$(id -u)/com.nihal-bar.github-streak-widget
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.nihal-bar.github-streak-widget.plist
launchctl kickstart -k gui/$(id -u)/com.nihal-bar.github-streak-widget

# 5. Check the run actually succeeded
cat /tmp/github-streak.log
cat /tmp/github-streak-error.log
launchctl print gui/$(id -u)/com.nihal-bar.github-streak-widget | grep "last exit code"

# 6. Confirm Übersicht itself is running (avoid typing "Übersicht" directly)
ps aux | grep -i rsicht

# 7. Force a full Übersicht restart (not just menu-bar refresh)
kill <PID from step 6>
open /Applications/Übersicht.app

# 8. Test the widget's exact shell command in a login shell,
#    matching how Übersicht itself executes it
/bin/zsh --login -c "cat /Users/nihal/practice-ts/github-streak-widget/streak.json"
```

If step 8 returns clean JSON but the widget still looks wrong on screen → it's almost certainly a stale-reload issue (see #6b). If step 8 itself fails or hangs, the problem is upstream in `index.js` or the launchd job (see #1–#4).