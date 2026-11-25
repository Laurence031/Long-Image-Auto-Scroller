const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const remoteServer = require("./remote-server");

if (process.platform === "win32") {
    app.setAppUserModelId("com.lyricsscroller.mict");
}

let splashWindow = null;
let mainWindow = null;
let remote = null;

// icon na gagamitin ng main window, Lyrics Maker at Output window
const iconPath = path.join(__dirname, "MICT-MICT.ico");
const hasIcon = fs.existsSync(iconPath);

function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 420,
        height: 420,
        frame: false,        // walang titlebar/border
        transparent: true,   // para diamond/logo shape lang ang lalabas, walang white box
        alwaysOnTop: true,
        resizable: false,
        center: true,
        show: false,
        skipTaskbar: true,   // hindi na kailangan lumabas sa taskbar
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    splashWindow.loadFile(path.join(__dirname, "splash.html"));

    // ipapakita lang pag ready na, para walang flicker
    splashWindow.once("ready-to-show", () => {
        splashWindow.show();
    });
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 650,
        title: "MICT Lyrics Prompter",
        icon: hasIcon ? iconPath : undefined,
        backgroundColor: "#1a2335",
        show: false, // itago muna habang naglo-load, ipapakita lang pagtapos ng splash
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // Ang Lyrics Maker (+ Manual Prompt) at ang Output window ay binubuksan ng scroller
    // gamit ang window.open. Dito sila nabibigyan ng parehong icon.
    // Walang Node access ang mga popup (hindi nila kailangan), para ligtas.
    // Gumagana pa rin ang window.opener at postMessage.
    mainWindow.webContents.setWindowOpenHandler(() => ({
        action: "allow",
        overrideBrowserWindowOptions: {
            icon: hasIcon ? iconPath : undefined,
            autoHideMenuBar: true,
            backgroundColor: "#000000",
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        }
    }));

    // file name
    const htmlPath = path.join(__dirname, "lyrics_scroller_mict.html");
    mainWindow.loadFile(htmlPath);

    Menu.setApplicationMenu(null);

    // kapag tapos na mag-load yung main app...
    mainWindow.once("ready-to-show", () => {
        // hintayin munang matapos yung splash animation (2.5 seconds)
        // ayusin mo itong number depende kung gaano katagal gusto mong makita yung splash
        setTimeout(() => {
            if (splashWindow) {
                splashWindow.close();
                splashWindow = null;
            }
            if (mainWindow) {
                mainWindow.show();
            }
        }, 2500);
    });

    // kapag isinara ang main window, sarado na rin ang buong app
    // (kasama ang Output window at Lyrics Maker na nakabukas pa)
    mainWindow.on("closed", () => {
        mainWindow = null;
        if (process.platform !== "darwin") {
            app.quit();
        }
    });
}

app.whenReady().then(() => {
    createSplashWindow();
    createMainWindow();

    // Server para magamit ang Lyrics Maker sa ibang device (phone / laptop) na nasa parehong Wi-Fi.
    // Ang link at PIN ay lalabas sa scroller (sa ibaba ng playlist, "Remote Maker").
    remote = remoteServer.start({
        ipcMain: ipcMain,
        getMainWindow: () => mainWindow,
        htmlPath: path.join(__dirname, "lyrics_maker.html"),
        dataDir: app.getPath("userData")
    });

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createSplashWindow();
            createMainWindow();
        }
    });
});

app.on("will-quit", () => {
    if (remote) remote.stop();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
