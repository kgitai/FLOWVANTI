# FLOWVANTI

FLOWVANTI is a desktop project-management app for tasks, projects, reports, and team work. It runs locally on Windows.

This project uses the [SignPath Foundation](https://signpath.org/) for code signing.

## Download

Windows installer: [GitHub Releases](https://github.com/kgitai/FLOWVANTI/releases) (or clone this repository and run `npm run dist`).

The published Windows binaries are signed with a certificate from the SignPath Foundation.

## Privacy

FLOWVANTI stores workspace data on the local computer (`%LOCALAPPDATA%\FLOWVANTI`). It does not send project data, accounts, or attachments to a FLOWVANTI cloud service.

## Build

```bash
npm install
npm start
```

Windows installer:

```bash
npm run dist
```

License: GNU GPL v3.
