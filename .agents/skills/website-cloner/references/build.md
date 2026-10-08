# Phase 6a — Build and verify

Read this at Phase 6. Inputs: `tasks.md`, `prd.md`, `optimization/findings.md`. Stack: Vite,
React (JSX), shadcn/ui, Tailwind CSS; static output only, no backend. Deployment, the re-audit and
`builder-metadata.json` are in `references/deploy.md`.

## 1. Initialize the project

`PROJECT_DIR` may already hold `analysis.json`, `report.md`, `prd.md`, `tasks.md`,
`optimization/`. Reuse an existing Vite project. For a new one, scaffold in an empty temp
directory, check **every** generated top-level name for collisions, then copy. A collision stops
before any file is copied; report the names. Never pass `--overwrite` or delete project files.

```bash
: "${PROJECT_DIR:?Set PROJECT_DIR to the resolved output directory}"
mkdir -p -- "$PROJECT_DIR" || exit
PROJECT_DIR="$(cd -- "$PROJECT_DIR" && pwd -P)" || exit
export PROJECT_DIR
cd -- "$PROJECT_DIR" || exit
if node --input-type=module <<'JS'
import fs from "node:fs"
const pkg = fs.existsSync("package.json")
  ? JSON.parse(fs.readFileSync("package.json", "utf8")) : {}
process.exit(pkg.dependencies?.vite || pkg.devDependencies?.vite ? 0 : 1)
JS
then
  echo "Existing Vite project: skip scaffolding"
else
  (
    VITE_SCAFFOLD_DIR="$(mktemp -d "${TMPDIR:-/tmp}/website-cloner.XXXXXX")" || exit
    export VITE_SCAFFOLD_DIR
    trap 'rm -rf -- "$VITE_SCAFFOLD_DIR"' EXIT
    (cd -- "$VITE_SCAFFOLD_DIR" &&
      npm create vite@latest . -- --template react --no-interactive --no-immediate) || exit
    node --input-type=module <<'JS'
import fs from "node:fs"
import path from "node:path"
const source = process.env.VITE_SCAFFOLD_DIR
const target = process.env.PROJECT_DIR
if (!fs.existsSync(path.join(source, "package.json"))) process.exit(1)
const names = fs.readdirSync(source)
const collisions = names.filter(name =>
  fs.lstatSync(path.join(target, name), { throwIfNoEntry: false }))
if (collisions.length) {
  console.error("Scaffold collisions: " + collisions.join(", "))
  process.exit(1)
}
for (const name of names) {
  fs.cpSync(path.join(source, name), path.join(target, name), {
    recursive: true, force: false, errorOnExist: true,
  })
}
JS
  ) || exit
fi
npm install || exit
npm install tailwindcss @tailwindcss/vite || exit
```

Configure Tailwind and aliases before shadcn/ui
([Vite guide](https://ui.shadcn.com/docs/installation/vite)):

- `src/index.css` starts with `@import "tailwindcss";` (fresh scaffold: replace the file; existing
  project: add the import). `src/main.jsx` imports `./index.css`.
- `jsconfig.json` (or the existing `tsconfig.json`) merges
  `"baseUrl": "."` and `"paths": {"@/*": ["./src/*"]}` into `compilerOptions`.
- The Vite config merges the Tailwind plugin, the alias and the base, keeping other settings:

```js
import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
})
```

```bash
if [ ! -f components.json ]; then
  npx shadcn@latest init --template vite --preset nova --yes --no-monorepo || exit
fi
npm install class-variance-authority clsx tailwind-merge lucide-react || exit
```

If `components.json` exists, keep it and check its CSS path and aliases. Check the
[CLI options](https://ui.shadcn.com/docs/cli) if the CLI version differs. Use
`import.meta.env.BASE_URL` for public asset URLs. Prefer `HashRouter`; a required `BrowserRouter`
takes `basename` from `import.meta.env.BASE_URL` plus a tested Pages 404 fallback.

## 2. Execute tasks phase by phase

For each task in order: implement it, follow the PRD, collect or create its assets, resolve its
finding IDs, and run `npm run build`.

- **Phase 1 — landing page:** hero (headline, subtext, CTA), navigation, footer, responsive
  layout, PRD style.
- **Phase 2 — core pages:** the planned pages, shared components, routing.
- **Phase 3 — polish:** image compression and lazy loading; meta tags, Open Graph, JSON-LD;
  `public/robots.txt`, `public/sitemap.xml`, `public/llms.txt` per the AI-search task; the
  accessibility pass; security controls a static host supports. Record unsupported
  response-header changes instead of claiming meta tags implement them.

Assets: `[Collect]` fetches from the original into `public/assets/` or `src/assets/`;
`[Create]` writes new copy, components, SVG icons, or PRD colors. A missing optional asset gets an
accessible substitute, recorded as created. Never invent testimonials, business claims, or
nonfunctional backend actions; keep the original destination for externally served actions.

## 3. Verify

Record the observed result of each check:

- `npm run build` exits 0; `dist/index.html` exists; `dist/` has no server entry or API route.
- `npm run preview` serves `/` with HTTP 200.
- In a browser: the hero headline from tasks.md is visible at `/`; every planned route renders on a
  direct load; at 1440 px and 390 px the text is readable, navigation and CTAs work, there is no
  horizontal overflow, and images have correct dimensions.
- Navigation, mobile menu, primary CTAs and in-scope forms work; never label an unconnected
  submission successful.
- Heading order, image alternatives, form labels, visible focus, keyboard operation of menus and
  dialogs.
- **Findings:** for every `build` finding ID, run the check named in its task (file exists in
  `dist/`, JSON-LD parses, CTA visible at 390 px, ...) and mark it `verified`, `unverified`
  (check could not run), or `failed`.
- Compare rendered states with the source and the PRD; fix concrete regressions.

Allow up to two corrective passes, rebuilding and repeating affected checks. Remaining defects
make the result `PARTIAL` if the site is usable, `FAIL` otherwise. Without browser or viewport
control, mark those checks `untested`, never passed. Keep a working preview and record its URL and
exact restart command (project directory and port).

```text
◆ Phase 6a — Build (6 of 7)
  Project initialized: √
  Tasks:               √ N/N | × N/M (deviations)
  Build:               √ dist/index.html
  Render/interactions: √ | × (defects) | — untested
  Findings verified:   √ N/N | × N/M (unverified or failed IDs)
  Preview:             √ (URL; restart command)
  Result:              PASS | PARTIAL | FAIL
```
