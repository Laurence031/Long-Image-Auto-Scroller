# Lyrics Scroller MICT

A desktop lyrics/prompting application built with **Electron**. The project is designed for displaying and controlling lyrics or presentation text, with a separate packaged Windows installer for distribution.

## Project Overview

**Lyrics Scroller MICT** is an Electron-based desktop application intended for use as a lyrics/prompting tool. The source project contains the main HTML interface, Electron main-process code, package configuration, and build output.

The project can be developed and tested directly from the source folder, while the production build is generated inside the `dist` folder.

## Project Structure

```text
lyricscrollerorigin/
│
├── dist/
│   ├── win-unpacked/
│   ├── builder-debug.yml
│   ├── builder-effective-config.yaml
│   ├── Lyrics Scroller MICT Setup 1.0.0.exe
│   └── Lyrics Scroller MICT Setup 1.0.0.exe.blockmap
│
├── node_modules/
│   └── Installed npm dependencies
│
├── lyrics_scroller_mict.html
├── main.js
├── package.json
├── package-lock.json
└── MICT-MICT.ico
```

## Main Files

### `lyrics_scroller_mict.html`

Contains the application's main user interface and front-end layout.

This is where the visual interface, controls, input areas, and client-side application elements are defined.

### `main.js`

Contains the Electron main-process code.

It is responsible for creating and managing the application window and connecting the HTML interface to the desktop environment.

### `package.json`

Contains the project's npm configuration, including:

- Project name and version
- Electron dependency
- Application start script
- Build/package configuration
- Windows installer configuration

### `package-lock.json`

Stores the exact versions of installed npm packages so the same dependency tree can be restored on another machine.

### `MICT-MICT.ico`

Application icon used by the Windows build/installer.

### `node_modules/`

Contains the project's installed npm dependencies.

This folder is normally not committed to Git because it can be recreated with:

```bash
npm install
```

### `dist/`

Contains the generated production/build files.

The current build includes:

- `win-unpacked/` — unpacked Windows application files
- `Lyrics Scroller MICT Setup 1.0.0.exe` — Windows installer
- `builder-debug.yml` — build/debug information
- `builder-effective-config.yaml` — resolved Electron Builder configuration
- `.blockmap` — block map used by Electron Builder for update-related operations

## Requirements

Before running the project from source, make sure the following are installed:

- **Node.js**
- **npm**
- **Windows OS** for the Windows installer/build

Check your Node.js and npm versions:

```bash
node -v
npm -v
```

## Installation

Open Command Prompt or PowerShell inside the project folder:

```bash
cd path\to\lyricscrollerorigin
```

Install dependencies:

```bash
npm install
```

## Running the Application

Start the Electron application with:

```bash
npm start
```

The exact start command depends on the `scripts` section in `package.json`.

## Building the Windows Application

This project uses Electron Builder for packaging.

A typical build command is:

```bash
npm run build
```

The resulting files should appear in the `dist/` folder.

> Note: Use the build script defined in the current `package.json`. The command above is the expected convention, but the actual script name should always match the project's configuration.

## Running the Built Version

After a successful build, the Windows installer can be found in:

```text
dist/
```

Example:

```text
Lyrics Scroller MICT Setup 1.0.0.exe
```

Run the installer to install the application on Windows.

## Development Workflow

A typical development workflow is:

```text
1. Edit lyrics_scroller_mict.html
2. Edit main.js when Electron/main-process changes are needed
3. Test using npm start
4. Fix and test changes
5. Build using the configured Electron Builder script
6. Check the generated files inside dist/
7. Test the Windows installer
```

## Reinstalling Dependencies

If the dependency installation becomes corrupted or causes unexpected errors, remove `node_modules` and reinstall:

```bash
npm install
```

On Windows, you can also remove `node_modules` manually and run:

```bash
npm install
```

## Important Notes

Do not edit files inside `dist/win-unpacked/` as the primary source of the application. Those files are generated from the source project.

Do not manually edit files inside `node_modules/`. Changes there will normally be lost when dependencies are reinstalled.

Keep the source files and build configuration in the project root.

## Version

Current packaged version shown in the project:

```text
Lyrics Scroller MICT 1.0.0
```

## Application Type

```text
Platform: Windows
Framework: Electron
Language: HTML / JavaScript
Package Manager: npm
Build Tool: Electron Builder
Installer: Windows .exe
```

## Future Development

Possible areas for future improvements include:

- Live lyrics editing and scrolling controls
- Custom fonts and text styling
- Multiple display/output windows
- Keyboard shortcuts
- Full-screen prompting mode
- Better multi-monitor support
- Automatic saving of lyrics
- Import/export of lyrics files
- Improved installer/update workflow

## Author

**MICT / MICT Lyrics Prompter**

---

This README describes the project structure and workflow based on the current project layout. Update the commands and feature descriptions as the application grows.
