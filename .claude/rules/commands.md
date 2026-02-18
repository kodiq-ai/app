# Tauri Commands & Typed Bridge

All Rust<->JS calls go through `src/shared/lib/tauri.ts`. NEVER use raw `invoke()`.

## Usage

```ts
import { terminal, fs, git, cli, db } from "@shared/lib/tauri";

// Terminal
await terminal.spawn({ command, cwd, shell, env });
await terminal.write(id, data);
await terminal.resize(id, cols, rows);
await terminal.close(id);

// Filesystem
const entries = await fs.readDir(path);
const content = await fs.readFile(path);
await fs.writeFile(path, content);
await fs.startWatching(path);
await fs.stopWatching(path);

// Git
const info = await git.getInfo(path);
const stats = await git.getStats(path);
await git.stage(path, files);
await git.unstage(path, files);
await git.stageAll(path);
await git.unstageAll(path);
const result = await git.commit(path, message);
const diff = await git.diff(path, file, staged);

// CLI
const tools = await cli.detectTools();

// Database (6 sub-modules)
await db.projects.list() / .create() / .touch() / .update()
await db.settings.get(key) / .set(key, val) / .getAll()
await db.sessions.list(projectId) / .save() / .close() / .closeAll()
await db.history.search(query) / .recent() / .add()
await db.snippets.list() / .create() / .use()
await db.launchConfigs.list(projectId) / .create() / .update() / .delete()
```

## Adding a New Command

1. Rust: `#[tauri::command]` fn in `src-tauri/src/<module>/<file>.rs`
2. Export via `mod.rs`
3. Register in `lib.rs` invoke_handler (full path)
4. Add typed wrapper in `src/shared/lib/tauri.ts`
5. Use from React: `import { module } from "@shared/lib/tauri"`
