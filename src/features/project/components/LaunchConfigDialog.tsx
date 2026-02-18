// ── Launch Config Dialog ─────────────────────────────────────────────────────
// Create / Edit dialog for saved CLI launch configurations.

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { db } from "@shared/lib/tauri";
import { t } from "@/lib/i18n";
import type { LaunchConfig, LaunchConfigPayload, NewLaunchConfig } from "@shared/lib/types";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface LaunchConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If set, we're editing an existing config. Otherwise, creating new. */
  editConfig?: LaunchConfig | null;
}

export function LaunchConfigDialog({ open, onOpenChange, editConfig }: LaunchConfigDialogProps) {
  const cliTools = useAppStore((s) => s.cliTools);
  const projectId = useAppStore((s) => s.projectId);
  const addLaunchConfig = useAppStore((s) => s.addLaunchConfig);
  const updateLaunchConfigInStore = useAppStore((s) => s.updateLaunchConfigInStore);

  const installedCli = cliTools.filter((tool) => tool.installed);

  // Form state
  const [profileName, setProfileName] = useState("");
  const [cliName, setCliName] = useState("");
  const [args, setArgs] = useState("");
  const [envText, setEnvText] = useState("");
  const [isGlobal, setIsGlobal] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (!open) return;
    if (editConfig) {
      setProfileName(editConfig.profile_name);
      setCliName(editConfig.cli_name);
      setIsDefault(editConfig.is_default);
      setIsGlobal(editConfig.project_id === null);
      try {
        const payload: LaunchConfigPayload = JSON.parse(editConfig.config);
        setArgs(payload.args.join(" "));
        setEnvText(
          Object.entries(payload.env)
            .map(([k, v]) => `${k}=${v}`)
            .join("\n"),
        );
      } catch {
        setArgs("");
        setEnvText("");
      }
    } else {
      // Reset for new config
      setProfileName("");
      setCliName(installedCli[0]?.bin || "");
      setArgs("");
      setEnvText("");
      setIsGlobal(false);
      setIsDefault(false);
    }
  }, [open, editConfig, installedCli]);

  const parseEnv = (text: string): Record<string, string> => {
    const env: Record<string, string> = {};
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.includes("=")) continue;
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim();
      if (key) env[key] = value;
    }
    return env;
  };

  const handleSave = async () => {
    if (!cliName || !profileName.trim()) return;
    setSaving(true);

    const payload: LaunchConfigPayload = {
      args: args
        .trim()
        .split(/\s+/)
        .filter((a) => a),
      env: parseEnv(envText),
      cwd: null,
      shell: null,
    };
    const configJson = JSON.stringify(payload);

    try {
      if (editConfig) {
        // Update existing
        const patch = {
          profile_name: profileName.trim(),
          config: configJson,
          is_default: isDefault,
        };
        await db.launchConfigs.update(editConfig.id, patch);
        updateLaunchConfigInStore(editConfig.id, patch);
        toast.success(t("launchConfigUpdated"));
      } else {
        // Create new
        const newConfig: NewLaunchConfig = {
          cli_name: cliName,
          profile_name: profileName.trim(),
          config: configJson,
          is_default: isDefault,
          project_id: isGlobal ? null : projectId,
        };
        const created = await db.launchConfigs.create(newConfig);
        addLaunchConfig(created);
        toast.success(t("launchConfigCreated"));
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSaving(false);
    }
  };

  const isEditing = !!editConfig;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-k-bg-surface border-white/[0.06] sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-k-text text-sm font-medium">
            {isEditing ? t("editLaunchConfig") : t("newLaunchConfig")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {/* Profile name */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-k-text-dim text-[11px]">{t("launchConfigName")}</Label>
            <Input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="e.g. sonnet-4, fast-mode"
              className="text-k-text placeholder:text-k-border h-8 border-white/[0.06] bg-white/[0.02] text-xs"
              autoFocus
            />
          </div>

          {/* CLI tool selector */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-k-text-dim text-[11px]">{t("launchConfigCli")}</Label>
            <Select value={cliName} onValueChange={setCliName} disabled={isEditing}>
              <SelectTrigger className="text-k-text h-8 w-full border-white/[0.06] bg-white/[0.02] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-k-bg-raised border-white/[0.06]">
                {installedCli.map((tool) => (
                  <SelectItem key={tool.bin} value={tool.bin} className="text-xs">
                    {tool.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Arguments */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-k-text-dim text-[11px]">{t("launchConfigArgs")}</Label>
            <Input
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              placeholder={t("launchConfigArgsPlaceholder")}
              className="text-k-text placeholder:text-k-border h-8 border-white/[0.06] bg-white/[0.02] font-mono text-xs"
            />
          </div>

          {/* Environment variables */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-k-text-dim text-[11px]">{t("launchConfigEnv")}</Label>
            <Textarea
              value={envText}
              onChange={(e) => setEnvText(e.target.value)}
              placeholder={t("launchConfigEnvPlaceholder")}
              rows={3}
              className="text-k-text placeholder:text-k-border resize-none border-white/[0.06] bg-white/[0.02] font-mono text-xs"
            />
          </div>

          {/* Switches row */}
          <div className="flex items-center gap-4 pt-1">
            {!isEditing && (
              <label className="text-k-text-dim flex items-center gap-2 text-[11px]">
                <Switch checked={isGlobal} onCheckedChange={setIsGlobal} className="scale-75" />
                {t("launchConfigGlobal")}
              </label>
            )}
            <label className="text-k-text-dim flex items-center gap-2 text-[11px]">
              <Switch checked={isDefault} onCheckedChange={setIsDefault} className="scale-75" />
              {t("launchConfigDefault")}
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-k-text-dim text-xs"
          >
            {t("launchConfigCancel")}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!profileName.trim() || !cliName || saving}
            className="bg-k-accent hover:bg-k-accent-light text-xs text-black"
          >
            {t("launchConfigSave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
