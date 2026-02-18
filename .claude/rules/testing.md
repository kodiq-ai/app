# Testing

## Frontend (Vitest)

```bash
pnpm run test            # single run
pnpm run test:watch      # watch mode
pnpm run test:coverage   # with coverage
```

- Tests next to source: `featureName.test.ts` in the feature's store directory
- Setup file `src/test/setup.ts` mocks all Tauri APIs
- For store tests: `create<SliceType>()(createSlice)` — isolated Zustand store
- Current: 31 tests (terminal: 10, settings: 7, editor: 14)

## Backend (cargo test)

```bash
pnpm run test:rust       # or: cd src-tauri && cargo test
```

- Current: 23 tests (db migrations, CRUD, port parser)
- Uses `KodiqError` for error types
- Temp database for isolated tests

## Pre-commit

`pnpm run check:all` runs: ESLint + Prettier check + Vitest + cargo test.
MUST pass before any commit.
