// ── Project Slice ────────────────────────────────────────────────────────────
import type { StateCreator } from "zustand";
import type { RecentProject, CliTool } from "@shared/lib/types";
import { db } from "@shared/lib/tauri";

export interface ProjectSlice {
  // State
  projectPath: string | null;
  projectName: string;
  recentProjects: RecentProject[];
  cliTools: CliTool[];

  // Actions
  setProject: (path: string | null, name?: string) => void;
  addRecent: (project: RecentProject) => void;
  setRecentProjects: (projects: RecentProject[]) => void;
  setCliTools: (tools: CliTool[]) => void;

  // DB hydration
  loadProjectFromDB: () => Promise<void>;
}

const loadRecentProjects = (): RecentProject[] => {
  try {
    const saved = localStorage.getItem("kodiq-recent-projects");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const createProjectSlice: StateCreator<ProjectSlice, [], [], ProjectSlice> = (set) => ({
  projectPath: null,
  projectName: "",
  recentProjects: loadRecentProjects(),
  cliTools: [],

  setProject: (path, name) => {
    if (path) {
      const n = name || path.split("/").pop() || "project";
      localStorage.setItem("kodiq-project-path", path);
      set({ projectPath: path, projectName: n });
      db.projects.touch(path).catch((e) => console.error("[DB]", e));
    } else {
      localStorage.removeItem("kodiq-project-path");
      set({ projectPath: null, projectName: "" });
    }
  },

  addRecent: (project) =>
    set((s) => {
      const filtered = s.recentProjects.filter((p) => p.path !== project.path);
      const next = [project, ...filtered].slice(0, 5);
      localStorage.setItem("kodiq-recent-projects", JSON.stringify(next));
      // Also persist to SQLite
      db.projects.create(project.name, project.path).catch((e) => console.error("[DB]", e));
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
