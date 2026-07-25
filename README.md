[简体中文](README.zh-CN.md)

# Unity Asset Links for Codex++

## What It Does

Unity Asset Links is the Codex++ half of the Unity Links integration. It intercepts eligible local file links in
Codex Desktop and sends them to the matching Unity Editor through a project-specific Windows named pipe.

- `Assets` links use Unity's normal asset-opening behavior and preserve line and column information.
- `ProjectSettings` links open Unity's Project Settings window.
- `Packages` links open Unity's Package Manager.

The matching Unity package is
[unity-links-unity](https://github.com/kpkhxlgy0/unity-links-unity).

## Requirements

- Windows 10 or 11.
- Codex++ 1.0.0 or newer.
- The matching Unity package installed in every target Unity project.

The current named-pipe transport is Windows-only.

## Install from Codex++ Store

After the tweak is approved, open Codex++ Settings, select **Tweak Store**, find **Unity Asset Links**, and install it.
Enable the tweak and restart Codex++ if the settings page requests a restart.

The store pins an approved Git commit. The manifest's release check links to this repository so users can review newer
published versions.

## Local Development

Clone this repository and link its root into Codex++:

```powershell
git clone https://github.com/kpkhxlgy0/unity-links-codex.git
Set-Location unity-links-codex
codexplusplus dev (Resolve-Path .).Path
```

For coordinated development with the Unity package and Windows maintenance scripts, clone the umbrella
[unity-links](https://github.com/kpkhxlgy0/unity-links) repository with `--recurse-submodules`.

## Validation

```powershell
npm test
codexplusplus validate-tweak (Resolve-Path .).Path
```

With the matching Unity project open, use `scripts/send-open.js` to check an `Assets`, `ProjectSettings`, or `Packages`
path.

## Compatibility

Component version `0.2.2` is tested with `unity-links-unity` version `0.2.2`. The umbrella repository pins the exact
component commits validated together.

## Release Process

1. Update the stable version in `manifest.json` and `package.json`.
2. Commit and push the version change to `master`.
3. Run the repository's `Release` workflow with the version without a leading `v`.
4. Wait for tests and Codex++ validation to pass.
5. Review and manually publish the generated Draft Release.
6. Submit the released commit for Codex++ Tweak Store review.

Never move or reuse a release tag.

## License

This project is licensed under the [MIT License](LICENSE).
