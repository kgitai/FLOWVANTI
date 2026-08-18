# FLOWVANTI

FLOWVANTI is a desktop project-management app for tasks, projects, reports, and team work. It runs locally on Windows.

This project uses the [SignPath Foundation](https://signpath.org/) for code signing.

## Download

Windows installer (direct):

https://github.com/kgitai/FLOWVANTI/releases/latest/download/flowvanti_x64.exe

Releases page: [https://github.com/kgitai/FLOWVANTI/releases](https://github.com/kgitai/FLOWVANTI/releases)

The published Windows binaries are intended to be signed with a certificate from the SignPath Foundation.

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
