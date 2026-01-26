# typescript-app-template

Template typescript application with a web, mobile, and desktop app.

Built with Next.js, Expo, Tauri, tRPC, Turborepo, Tailwind CSS, Prisma, and Neon
DB.

### web

- setup github actions secrets (for deploy script)
    - `NEON_API_KEY` (create here
      https://console.neon.tech/app/settings/api-keys)
    - `SOPS_AGE_KEY` (your sops private key, created above)
    - `VERCEL_ORG_ID` (aka `Vercel ID` from https://vercel.com/account)
    - `VERCEL_TOKEN` (create here https://vercel.com/account/tokens)
- setup github actions vars (for deploy script)

    > NOTE: we setup these values as vars because they show up in urls/etc, so
    > it's pretty annoying if they get masked out

    - `NEON_PROJECT_ID` (in your project's `Settings`
      https://console.neon.tech/app/projects)
    - `NEON_DATABASE_USERNAME` (ie. the name of one of your projects roles)
    - `NEON_DATABASE_NAME` (ie. Database name in connection details)
    - `VERCEL_SCOPE` (your vercel team, or personal account name)

- setup neon db
    - create a database in your project
      `neonctl databases create --name cavalier`
    - update the database name in `bin/dev`'s `dev::db::prod` function (if you
      haven't already)

### desktop

- setup app icon
    - generate desktop icons
        ```bash
        npx -w @repo/desktop tauri icon ~/Downloads/your-icon.png
        ```

---

# cavalier

## Local dev

- `./bin/dev setup`
- run the following commands AND append to your shell configs (ie. `~/.zshrc` or
  `~/.bashrc`/`~/.bash_profile`)

```bash
eval "$(mise activate zsh)"
# or for bash
# eval "$(mise activate bash)"

source "$HOME/.cargo/env"
```

- (optionally) configure mise: `~/.config/mise/settings.toml`

```toml
trusted_config_paths = ["~/Projects"] # where ~/Projects is wherever you clone your repos
```

- `dev start`

### vscode (optional)

- if you use vscode, we have some recommended extensions and settings
- when you open the project in vscode, you should be prompted automatically to
  install the recommended extensions
- settings can either be configured:

    - globally, via the `Preferences: Open User Settings (JSON)` command
    - just for this project, via the
      `Preferences: Open Workspace Settings (JSON)` command

    ```jsonc
    {
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "[prisma]": { "editor.defaultFormatter": "Prisma.prisma" },
        "editor.codeActionsOnSave": {
            "source.fixAll.eslint": "explicit",
        },
        "editor.acceptSuggestionOnCommitCharacter": false,
        "eslint.useFlatConfig": true,
        "eslint.problems.shortenToSingleLine": true,
        "eslint.rules.customizations": [
            // set all eslint errors/warnings to show as warnings
            { "rule": "*", "severity": "warn" },
            // disable some rules in editor (they're just annoying while coding)
            { "rule": "import-x/no-unused-modules", "severity": "off" },
        ],
        "typescript.preferences.importModuleSpecifier": "non-relative",
        "javascript.preferences.importModuleSpecifier": "non-relative",
        "typescript.tsdk": "./node_modules/typescript/lib",
        "typescript.enablePromptUseWorkspaceTsdk": true,
        "files.associations": {
            "turbo.json": "jsonc",
            "*.css": "tailwindcss",
        },
    }
    ```

## Misc

### Diff decrypted env values

- add private key from <!-- TODO: replace name/link  -->
  [your password manager](https://start.1password.com/open) into
  `~/Library/Application Support/sops/age/keys.txt`

- diff decrypted values

```bash
git -c 'diff.sops.textconv=sops -d' diff .env.preview.yaml
# OR
git -c 'diff.sops.textconv=sops -d' show
```

### Disable pre-commit hooks (husky)

> We understand some find pre-commit hooks more annoying than useful, you're
> welcome to disable them as you see fit (checks will still run on pull requests
> & pushes to main)

- for an individual commit: `git commit -m "..." -n`
- permanently: `echo 'HUSKY=0' >> .env.local`

###### Bootstrapped with [pentible/typescript-app-template](https://github.com/pentible/typescript-app-template)
