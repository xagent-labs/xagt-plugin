# Contributing to Wallet Whisperer

Thanks for the interest. Small project, simple rules.

## Filing issues

- Reproduction steps + the exact `wallet-whisperer --version` output.
- For data-correctness issues, include the address + chain so we can re-run the same persona inference.

## Pull requests

1. **One change per PR.** A bug fix, a single feature, a doc tweak. Don't bundle.
2. **Run the lint** before pushing: `plugin-store lint ./`. It must pass with zero errors.
3. **Run a syntax check** on any touched JS: `node --check cli/path/to/file.js`.
4. **Keep the persona logic deterministic.** If you add a new heuristic, it must be a pure function of API responses — no random sampling, no LLM calls inside `cli/lib/persona.js`.
5. **Keep both implementations in sync.** Persona logic lives in two places: the JS module (`cli/lib/persona.js`, used by CLI and web) and the skill spec (`skills/wallet-whisperer/SKILL.md`, followed by the agent). A change to one without the other will silently diverge.
6. **No AI co-author trailers** in commit messages. The OKX hackathon norm is to omit them.

## Codebase tour

See the [Project structure](README.md#project-structure) section of the README.

The three places people most often touch:

- `cli/lib/persona.js` — pure functions, no I/O. Change a heuristic here.
- `cli/web/server.js` — add a new SSE endpoint, change rate limits.
- `cli/web/public/whisper.html` — add a new view to the app sidebar.

## Adding a new behavioural tell

1. Edit `inferPersona` in `cli/lib/persona.js`. The tell is a boolean computed over the closed-trade list.
2. Add the same heuristic to the "Dimension 5 — Behavioural Tells" table in `skills/wallet-whisperer/SKILL.md`.
3. If the new tell should be a `forbidden_tells` default for mirror mode, update the defaults in `skills/wallet-whisperer/SKILL.md`'s Mirror section and the web wizard form in `cli/web/public/whisper.html`.

## Adding a new agent host (skill installer)

1. Add a tab to the host tabs in `cli/web/public/setup.html` and `cli/web/public/whisper.html`.
2. Add a row to the install commands matrix.
3. Smoke-test by copying the skill into that host's skills dir and running `whisper this wallet 21czpZj3BxT75dVbzmUJtE5QznJrLrYHHaF5pT4CpWM1`.

## License

By contributing you agree your contribution is licensed under the [MIT License](LICENSE).
