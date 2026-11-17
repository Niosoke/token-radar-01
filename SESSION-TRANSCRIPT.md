# SESSION TRANSCRIPT — token-radar-01 entry build (make.fun)

Build log for the "Build the best token launch radar" entry. Appended after each
major step, as the work happens. Times in WIB (UTC+7). Agent: Muse (Muse Spark 1.3),
harness: Muse subagent session adcd79d4-3be0-462f-8201-af847d702057. No entry is
submitted from this log alone; the kit CLI bundle is the submit artifact.

## 2026-11-17 00:00 WIB — Task received
- Parent (coordinator) assigned bounty token-radar-01, pot $1,325, deadline 14 Dec 2026
  17:00 WIB. Rules: build only, never submit, no keys, no wallet, no spend.
- Node on this machine: v24.22.1 (requirement Node 22.18+ met).

## 2026-11-17 00:01 WIB — Read the bounty page + requirements JSON
- Commands: browser.open https://make.fun/bounty/token-radar-01 and
  https://make.fun/api/competitions/token-radar-01/requirements (also curl to
  /tmp/req-token-radar.json, 110,841 bytes).
- Findings: harness program/v1; main.ts at repo root, Node 22 stdlib only, runs twice
  in a sandbox (120 s, 1 CPU, 1024 MB, no network), both runs byte-identical.
  Deliverables: main.ts, vendor/makefun-board.ts, dashboard/ (static, no network),
  board.json >= 100 rows with whole watchlist covered + implied value + farm plan,
  3 screenshots, dossier.json via buildDossier, transcripts. AI judge (superbot,
  reasoning high) compares dossiers pairwise, margin 1-5, win rate decides;
  top 5 face a 60-minute team review; 10 places paid $1,000 / $50 x4 / $25 x5.
  Gate: 7 rows (dashboard_files, board_file, sorted_by_value, coverage,
  farm_steps, screenshots, dossier_matches). Dashboard source text cap 65,536 bytes
  (judge reads it whole only under that); screenshots 1440 max long side, 800 min
  short side, <= 512 KiB each, 3-4 images; dossier <= 1.5 MiB. Transcript gate:
  >= 30% authored-line coverage, entrypoint >= 1 authored line, some file revised
  in >= 2 assistant messages, >= 5 assistant turns with text, sessions in window
  (opened 2026-11-14T10:00:00Z). Handed-over sessions rank but take NO paid place
  (handed_over_places: none).

## 2026-11-17 00:03 WIB — Downloaded the kit
- Command: cd ~/workspace/bounty/make-fun/work/kit-token-radar-01 &&
  curl -sSL "https://make.fun/c/token-radar-01/kit" | tar xz (17 MB).
- Kit contents: kit.json, RULES.txt (414 lines), competition.yaml (467 lines),
  cli/makefun.mjs, harness/, input/snapshot.json (247,940 bytes) + README.md,
  starter/ (main.ts, lib/model.ts, vendor/makefun-board.ts, dashboard/, 3 screenshots,
  LICENSE). Read competition.yaml and RULES.txt in full, starter main.ts + model.ts,
  vendor/makefun-board.ts, input/README.md.
- Key facts: snapshot = 758 protocols >= $5M TVL, 40 on watchlist, floor $50M,
  as_of 2026-11-14, source DefiLlama api.llama.fi/protocols fetched 2026-11-14T01:18:33Z.
  Starter = house anchor 2-plain (calibration strength 0.593); anchors 1-weak 0.014,
  3-mid 0.782, 4-strong 1.081; ladder rungs r1 1.565, r2 2.310, r3 3.253. Starter handed
  in unchanged is an ordinary entry; to beat the field the model, the farm plans and
  the page must all be clearly better. Judge criteria in order: (1) working radar,
  (2) value model from the snapshot's own figures, no hardcoded names, live-token
  separation, (3) concrete farm plans with cost + time, (4) sortable/filterable page
  with detail view, (5) looks made.
- Dossier text covers dashboard/ files ONLY (in path order) — data.js at /output root
  is invisible to the judge. Decision: ship the board data as dashboard/data.js so
  the judge reads the actual ranked rows, and keep total dashboard source <= ~55 KB
  so it fits the 65,536-byte text cap whole.

## 2026-11-17 00:05 WIB — Snapshot analysis (python, local file only)
- Pre-token (gecko_id, symbol, mcap all null): 342 of 758. Starter rankable rule
  (pre-token, not CEX, not versioned): 289. Strict rule (also apply the watchlist's
  own exclusions: no Bridge/Canonical Bridge/Liquid Staking/Liquid Restaking/
  Restaked BTC/CEX, no whole word wrapped/staked/staking in name, no exchange-prefixed
  name, no version marker): 198 rows, still covering all 40 watchlist slugs.
  Decision: rank the strict 198 — every row is a genuine launch candidate by the
  watchlist's own logic; the 144 excluded pre-token protocols are listed separately
  in the dashboard with their reason, so nothing is hidden.
- Category FDV/TVL benchmarks from the snapshot's OWN live-token protocols
  (median mcap/tvl per category, n>=3): Dexs 0.3424, RWA 0.2748, Yield 0.1802,
  Lending 0.1324, CDP 0.1687, Basis Trading 0.6544, global median 0.2049.
  Decision: implied value = TVL x category multiple (median, clamped 0.05-0.60,
  global fallback) x growth x maturity x chain-breadth — derived from snapshot
  figures only, no protocol name ever special-cased.

## 2026-11-17 00:06 WIB — Screenshot tooling check
- No chromium/firefox/playwright/puppeteer on PATH. Lightpanda 1.0.2 present:
  served CDP on 127.0.0.1:9222, rendered a test page over local HTTP, JS ran — but
  its PNG ignores CSS almost entirely (no colours, borders, layout styling), so it
  cannot produce judge-grade screenshots. /opt/meta-chromium/chrome exists but
  refuses to start ("Hatch WebGL domain policy is required for browser startup").
- npm registry + Playwright CDN reachable (HTTP 200 / 307). Decision: install
  playwright-core + headless-shell chromium in background
  (~/workspace/bounty/make-fun/work/pw) while building the entry; verify it renders
  before taking the real screenshots. Started: npm install playwright-core@1.55.0
  then `npx playwright-core install --only-shell chromium`.

## 2026-11-17 00:07 WIB — Wrote the entry, first version
- Wrote lib/model.ts (radar-2, my own model), main.ts, dashboard/index.html,
  dashboard/app.css, dashboard/app.js. Copied vendor/makefun-board.ts byte for byte
  from the kit (sha256 9ca51b6e... matches kit.json) and the MIT LICENSE.
- Model radar-2: board = every protocol passing the watchlist's own exclusion rule
  (pre-token, not Bridge/Canonical Bridge/Liquid Staking/Liquid Restaking/Restaked
  BTC/CEX, no wrapped/staked word, no exchange prefix, no version marker);
  implied = TVL x category multiple (median live mcap/TVL per category, n>=3,
  else global median, clamped 0.05-1.0) x growth x maturity x breadth. No name
  special-cased. Farm plans derived from category/chains/TVL/age, 6 steps with
  cost + time each. Live-token view (top 24 by mcap) kept separate at market value.
- First run: MAKEFUN_OUTPUT_DIR=out node main.ts --input <kit>/input/snapshot.json
  -> 198 rows, watchlist 40/40, farm steps 6 per row, 139-238 chars each; exit 1
  only because screenshots/ was still empty (expected). data.js was 41,274 bytes
  and total dashboard source 72,298 bytes — OVER the 65,536-byte dossier text cap,
  so the judge would have read a cut data.js and no index.html.

## 2026-11-17 00:08 WIB — Compacted the dashboard data (revision 2)
- Decision: pack rows as dictionary-indexed arrays (cats/chains dictionaries) and
  drop the stored multipliers/base/farm-cost/hold from data.js; the page recomputes
  them from the raw figures and the model constants (app.js modelOf), so code and
  board are visibly the same arithmetic. Rewrote lib/model.ts radarRow/liveRows/
  buildRadar and dashboard/app.js to the new shape.
- Found and fixed a real bug before it shipped: the global median in the page
  (rounded, 0.2049) would have differed from the board's (raw) for thin categories,
  so the detail view's "it matches the board" check could have failed. Fix: round
  every multiple to 4 decimals once inside categoryMultiples, so board.json,
  data.js and the page all use the same number. Also raised multiple_cap 0.6 -> 1.0
  (four categories were binding at the cap; the highest true median is 1.2205 for
  Cross Chain Bridge, n=4).
- Cross-checked the median code against python: python's 0.2049 included one bogus
  protocol ('autofinance', negative market cap, ratio -0.0) that the TS guard
  (mcap<=0 skipped) correctly drops; TS global median 0.2138 over 128 valid ratios
  is the right number.
- Second run: total dashboard source 59,944 bytes (under the cap with 5,592 spare);
  data.js 28,160 bytes. Verification script (node, mimics app.js modelOf for all
  198 rows): 0 implied-value mismatches against board.json.

## 2026-11-17 00:09 WIB — README, claim file, gitignore
- Wrote README.md from the requirements' readme_template (description + run command
  filled; {owner}/{repo} badge paths and {referral_code} left as placeholders —
  the repo does not exist yet, see open items). Wrote .makefun/owner.json naming
  the agent wallet AianyZaesVNZCZQewrJqdZzZ8Wj8NABbMgKzAq7zfWoL (the wallet the
  kit CLI login connected to @nio-sokeh) so repo ownership is proven by wallet
  whatever the GitHub owner is. .gitignore: out/, node_modules/.
- Playwright headless-shell install (started 00:06) still running; a second
  playwright install by another worker (/tmp/pw, full chromium) is running in
  parallel against the same cache — watching, not interfering.

## 2026-11-17 17:21 WIB — Chrome for Testing (screenshot blocker solved)
- Playwright headless-shell CDN was unreachable through the sandbox proxy
  (307 to playwright.download.prss.microsoft.com -> 400 GatewayServiceFileDetails).
  Switched to Chrome for Testing via Google Storage: last-known-good-versions.json
  gave Stable 157.0.8103.78; curl HEAD on the 141 zip returned 200 first.
- Downloaded https://storage.googleapis.com/chrome-for-testing-public/157.0.8103.78/linux64/chrome-linux64.zip
  (203,266,906 bytes, 309 files, unzip -l total 426,668,795) to
  ~/workspace/bounty/make-fun/work/pw/; ./chrome-linux64/chrome --version =
  "Google Chrome for Testing 157.0.8103.78".
- First launch failed: selective unzip had skipped chrome_crashpad_handler
  (FATAL posix_spawn ... No such file). Extracted the whole zip; launch works.
- Driver: ~/workspace/bounty/make-fun/work/pw/shots.mjs (playwright-core 1.55.0,
  executablePath to the downloaded chrome, --no-sandbox, viewport 1440x900),
  served the built out/dashboard over local HTTP on 127.0.0.1:8932.

## 2026-11-17 17:23 WIB — Three screenshots, one real bug found and fixed
- Screenshots into screenshots/: 1-board.png (147,185 B), 2-detail.png
  (155,194 B), 3-filtered.png (141,829 B after fix); all 1440x900 PNG, each
  under the 512 KiB cap. Read all three visually: board shows header stats
  (198 rows, 40/40 watchlist, $557.9M top), filters, ranked table (#1
  Steakhouse Financial $557,901,091); detail shows Steakhouse card with
  stat boxes, the worked math ("recomputes ... it matches the board"),
  farm steps below.
- BUG in the first filtered shot: the Steakhouse detail card stayed open
  under the Dexs filter ("Showing 21 of 198" was right, detail was stale).
  Cause: readHash() only overwrote state fields present in the hash, so a
  hash-only navigation from #p=... to #category=Dexs never cleared state.p.
  Fix in dashboard/app.js: readHash() resets all state to defaults first,
  then applies the hash params. Rebuilt main.ts and retook all three shots;
  3-filtered.png now shows only Dexs rows (#8 Bittensor dTAO, #48 Nado Spot,
  #59 Project X, ...) with no detail card. Verified in-browser with a second
  script: ranked table has 21 rows, all category Dexs (the extra 14-row table
  in #board is the methodology benchmark table, not a filter leak).

## 2026-11-17 17:24 WIB — Full gate validation + determinism (two full runs)
- Ran main.ts twice into outA and outB (board + dashboard + screenshots +
  dossier): diff -r outA outB clean — byte-identical including dossier.json.
- Gate checks (node script, run by me): dashboard 4 files, 60,263 bytes,
  zero http(s) references in dashboard source; board 198 rows, every slug
  in the snapshot, watchlist 40/40, ranks exactly 1..198, implied values
  non-increasing, 198 distinct values, farm steps 3-12 per row (6 each,
  139-238 chars), implied ints positive <= 1e14; screenshots 1440x900,
  141-155 KiB each; dossier.json 656,285 bytes (cap 1,572,864), dossier text
  60,598 bytes (cap 65,536), no "left out" cut, byte-identical to a rebuild
  via vendor buildDossier with the kit's own limits, images listed
  1-board/2-detail/3-filtered.png.
- Browser functional check (Chrome for Testing, script checksteps.mjs):
  detail farm steps for ranks 1 (steakhouse-financial), 50 (keyrock) and
  198 (flying-tulip-ftusd) match board.json exactly, and each detail page
  says "it matches the board"; Dexs filter shows 21 rows; live tab renders
  the 24 already-launched protocols.
- Deleted test dirs out/, outA/, outB/ (out/ is gitignored; outA/outB were
  one-off verification dirs, not part of the entry).

## 2026-11-17 17:20 WIB — Kit bundle --dry-run (full output read)
- Command: node cli/makefun.mjs bundle --repo <entry> --out /tmp/test-bundle.tar.gz
  --dry-run (took ~4.5 min). Result: 6 session files found; MY session
  sessions/muse-app/adcd79d4-3be0-462f-8201-af847d702057.jsonl is in the
  bundle (62 turns, 209 lines) plus the parent session 460bf698 (27 turns,
  94 lines kept) and 4 earlier sessions that wrote files this build read
  (worker-b 59a6d821, worker-d d185380b, ai-excited-01 c7660912,
  makefun-coin-promo-01 fd41a26b). Redaction counted: 217 emails, 276 home
  paths, 216 usernames, 28 credentials removed before bundling.
- Bundle writes NOTHING yet — run record missing three things, all fixable
  at bundle time by the top-level agent (not by me, a subagent):
  (a) the prompt: earliest session 460bf698 opens with a summary, so the
  person's opening prompt must be passed with --prompt-file + --prompt-origin
  + --prompt-via (the parent holds the user's exact words);
  (b) MCP servers: I used none, so --mcp none;
  (c) agent facts: --harness-version, --provider, --effort (harness muse-app,
  provider meta, model muse-spark-1.3, effort default).
- Critical warning: "0 usage rows attached ... this entry will be rejected
  where transcripts are required" — a subagent's usage row is written only
  once its run completes, so the bundle MUST be run by the top-level agent
  after I finish, with the SELECT over its own agent_id and each subagent's
  (--muse-usage). The parent session b5f11a32-714d-454a-9120-ca17dae0d720
  (over 256 MiB, not searched by the dry run) is the top-level agent's.
- Also: repo had uncommitted changes at dry-run time (recorded repo.dirty);
  fixed by the single commit below.
- Honest status: my real Muse session exists and bundle discovers it, so a
  paid-place bundle is feasible, but it is NOT yet runnable by me — it needs
  the parent to run bundle with the prompt file, flags, and usage rows after
  this run completes. SESSION-TRANSCRIPT.md (this file) is my hand-written
  build log; it is NOT a harness session and cannot substitute for the bundle.

## 2026-11-17 17:25 WIB — Single commit (submit-ready build)
- git add all entry files, one commit. Repo contents: main.ts, lib/model.ts,
  dashboard/ (index.html, app.css, app.js, data.js), vendor/makefun-board.ts
  (byte-identical to kit), LICENSE (MIT), README.md, .makefun/owner.json,
  .gitignore, SESSION-TRANSCRIPT.md, screenshots/ (3 PNGs).
- NOT pushed anywhere, NOT submitted. Open items for the parent/user:
  (1) GitHub repo does not exist yet — create it (after 2026-11-14 open),
  push this one commit, fill {owner}/{repo} in the README badges and
  {referral_code}; (2) run kit bundle from the top-level agent with the
  prompt file, --mcp none, --harness-version/--provider/--effort flags and
  --muse-usage rows, then kit check; (3) MEMORY notes the user at 00:20 WIB
  authorised submitting FREE entries (including this one) once built and
  self-tested, via @nio-sokeh — the submit itself is the parent's call,
  not mine.
