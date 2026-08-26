const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");
const fs = require("fs");

if (process.platform === "win32") {
    app.setAppUserModelId("com.lyricsscroller.mict");
}

let mainWindow = null;

function createMainWindow() {
    const iconPath = path.join(__dirname, "MICT-MICT.ico");
    const hasIcon = fs.existsSync(iconPath);

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 650,
        title: "Lyrics Scroller MICT",
        icon: hasIcon ? iconPath : undefined,
        backgroundColor: "#1a2335",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // file name
    const htmlPath = path.join(__dirname, "lyrics_scroller_MICT.html");
    mainWindow.loadFile(htmlPath);

    Menu.setApplicationMenu(null);

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createMainWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});