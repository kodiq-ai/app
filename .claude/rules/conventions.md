# Code Conventions

## Naming

- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Store slices: `featureSlice.ts`
- Tauri commands: `snake_case`
- i18n keys: `camelCase`
- CSS tokens: `--kebab-case`

## Import Order

1. React / external libs
2. Tauri APIs (`@tauri-apps/*`)
3. UI libs (sonner, lucide, cmdk)
4. Shared (`@shared/lib/*`, `@shared/i18n`)
5. Store (`@/store`)
6. Feature imports (`@features/*`)
7. shadcn (`@/components/ui/*`)
8. App components (`@/components/*`)
9. Hooks (`@/hooks/*`)
10. CSS (last)

## Patterns

- `cn()` for conditional Tailwind classes (clsx + tailwind-merge)
- `listen<T>("event", handler)` for Tauri events
- `t("key")` for ALL user-facing strings
- `handleError(e, context)` for errors with toast
- All interactive elements → shadcn (`<Button>`, `<Input>`, etc.)
- Section comments: `// ── Section Name ──────────────────────────`

## Styling

- Dark theme ONLY — no light mode
- Design tokens in `app.css :root` — never hardcode colors
- Borders: `border-white/[0.06]`
- Hover: `hover:bg-white/[0.02]` or `hover:bg-white/[0.04]`
- Subtle layers: `bg-white/[0.01]` through `bg-white/[0.08]`
- Accent: `text-[#06b6d4]` / `bg-[#06b6d4]` (brand cyan)

## Compatibility

Old imports (`@/lib/store`, `@/lib/i18n`, etc.) work via shim files in `src/lib/` and `src/hooks/`.
New code should use `@shared/` and `@features/` paths directly.
