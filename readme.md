# cavalier

## Local dev

- `./bin/dev setup`
- run the following commands AND append to your shell configs (ie. `~/.zshrc` or
  `~/.bashrc`/`~/.bash_profile`)

```bash
eval "$(mise activate zsh)"
# or for bash
# eval "$(mise activate bash)"
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

- add private key from
  [your password manager](https://start.1password.com/open/i?a=EWZXI436YZFG5GCL2RCHDAVIDM&v=cneefiowmi6ol5bftk56uzqree&i=plhmmz2a6pjlzufvx3efjri6by&h=my.1password.com)
  into `~/Library/Application Support/sops/age/keys.txt` (macos) or
  `~/.config/sops/age/keys.txt` (linux)

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
