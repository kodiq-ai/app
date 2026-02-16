// ── Project Slice ────────────────────────────────────────────────────────────
import type { StateCreator } from "zustand";
import type { RecentProject, CliTool } from "@shared/lib/types";
import { db } from "@shared/lib/tauri";

export interface ProjectSlice {
  // State
  projectPath: string | null;
  projectName: string;
  projectId: string | null;
  defaultCli: string | null;
  recentProjects: RecentProject[];
  cliTools: CliTool[];

  // Actions
  setProject: (path: string | null, name?: string) => void;
  setDefaultCli: (cli: string | null) => void;
  addRecent: (project: RecentProject) => void;
  setRecentProjects: (projects: RecentProject[]) => void;
  setCliTools: (tools: CliTool[]) => void;

  // DB hydration
  loadProjectFromDB: () => Promise<void>;
}

export const createProjectSlice: StateCreator<ProjectSlice, [], [], ProjectSlice> = (set) => ({
  projectPath: null,
  projectName: "",
  projectId: null,
  defaultCli: null,
  recentProjects: [],
  cliTools: [],

  setProject: (path, name) => {
    if (path) {
      const n = name || path.split("/").pop() || "project";
      set({ projectPath: path, projectName: n });
      // Resolve projectId + default_cli from DB
      db.projects
        .getOrCreate(n, path)
        .then((project) => {
          set({ projectId: project.id, defaultCli: project.default_cli ?? null });
          db.settings.set("lastProjectPath", path).catch((e) => console.error("[DB] setting:", e));
        })
        .catch((e) => console.error("[DB] getOrCreate:", e));
    } else {
      set({ projectPath: null, projectName: "", projectId: null, defaultCli: null });
      db.settings.set("lastProjectPath", "").catch((e) => console.error("[DB] setting:", e));
    }
  },

  setDefaultCli: (cli) =>
    set((s) => {
      if (s.projectId) {
        db.projects
          .update(s.projectId, { default_cli: cli })
          .catch((e) => console.error("[DB] setDefaultCli:", e));
      }
      return { defaultCli: cli };
    }),

  addRecent: (project) =>
    set((s) => {
      const filtered = s.recentProjects.filter((p) => p.path !== project.path);
      const next = [project, ...filtered].slice(0, 5);
      // Persist to SQLite (idempotent)
      db.projects.getOrCreate(project.name, project.path).catch((e) => console.error("[DB]", e));
      return { recentProjects: next };
    }),

  setRecentProjects: (recentProjects) => set({ recentProjects }),
  setCliTools: (cliTools) => set({ cliTools }),

  loadProjectFromDB: async () => {
    try {
      const projects = await db.projects.list();
      if (projects.length > 0) {
        const recent = projects
          .sort((a, b) => b.last_opened - a.last_opened)
          .slice(0, 5)
          .map((p) => ({ name: p.name, path: p.path }));
        set({ recentProjects: recent });
      }
    } catch {
      // DB not ready yet — localStorage values already loaded
    }
  },
});
