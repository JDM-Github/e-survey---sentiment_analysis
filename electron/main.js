const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { spawn, execSync } = require('child_process');
const path = require('path');
const net = require('net');
const fs = require('fs').promises;

let backendProcess = null;
let mainWindow = null;
let isQuitting = false;

const STORES = {
    batch: { file: 'batch_runs.json' },
    category_batch: { file: 'category_batch_runs.json' },
    accuracy: { file: 'accuracy_runs.json' },
    single: { file: 'single_run.json' },
};

function getStorePath(type) {
    return path.join(app.getPath('userData'), STORES[type].file);
}

async function loadRuns(type) {
    try {
        const data = await fs.readFile(getStorePath(type), 'utf8');
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') return [];
        console.error(`Failed to load ${type} runs:`, err);
        return [];
    }
}

async function saveRuns(type, runs) {
    await fs.writeFile(getStorePath(type), JSON.stringify(runs, null, 2));
}

function registerHandlersForType(type) {
    ipcMain.handle(`${type}-get-all-runs`, async () => {
        return await loadRuns(type);
    });

    ipcMain.handle(`${type}-save-run`, async (event, run) => {
        const runs = await loadRuns(type);
        runs.unshift(run);
        if (runs.length > 50) runs.pop();
        await saveRuns(type, runs);
        return runs;
    });

    ipcMain.handle(`${type}-clear-all-runs`, async () => {
        await saveRuns(type, []);
        return [];
    });
}

function registerAllIpcHandlers() {
    for (const type of ['batch', 'category_batch', 'accuracy', 'single']) {
        registerHandlersForType(type);
    }
}

function getBackendExe() {
    if (app.isPackaged) {
        const exe = process.platform === 'win32' ? 'flask_server.exe' : 'flask_server';
        return path.join(process.resourcesPath, 'backend', exe);
    }
    const exe = process.platform === 'win32' ? 'flask_server.exe' : 'flask_server';
    return path.join(__dirname, '../backend/dist', exe);
}

function getFreePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(0, '127.0.0.1', () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        server.on('error', reject);
    });
}

function waitForPort(port, timeout = 15000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const tryConnect = () => {
            const socket = new net.Socket();
            socket.setTimeout(300);
            socket
                .once('connect', () => { socket.destroy(); resolve(); })
                .once('error', () => {
                    socket.destroy();
                    if (Date.now() - start > timeout) {
                        reject(new Error(`Backend did not respond within ${timeout}ms`));
                    } else {
                        setTimeout(tryConnect, 250);
                    }
                })
                .once('timeout', () => { socket.destroy(); setTimeout(tryConnect, 250); })
                .connect(port, '127.0.0.1');
        };
        tryConnect();
    });
}

function killBackend() {
    if (!backendProcess) return;

    console.log('[Electron] Stopping backend...');
    const proc = backendProcess;
    const pid = proc.pid;
    backendProcess = null;

    if (process.platform === 'win32') {
        try {
            execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
            console.log('[Electron] Backend process tree killed via taskkill.');
        } catch (e) {
            console.error('[Electron] taskkill failed:', e.message);
        }
    } else {
        try {
            process.kill(-pid, 'SIGKILL');
        } catch {
            proc.kill('SIGKILL');
        }
    }
}

function startBackend(port) {
    const exePath = getBackendExe();
    console.log('[Backend] launching:', exePath);
    console.log(`[Backend] port: ${port}`);

    backendProcess = spawn(exePath, [], {
        stdio: 'pipe',
        windowsHide: true,
        detached: process.platform !== 'win32',
        env: { ...process.env, FLASK_PORT: String(port) },
    });

    backendProcess.stdout.on('data', (d) => console.log('[Backend]', d.toString().trim()));
    backendProcess.stderr.on('data', (d) => console.error('[Backend ERR]', d.toString().trim()));
    backendProcess.on('exit', (code) => {
        console.log('[Backend] exited with code', code);
        if (!isQuitting) {
            isQuitting = true;
            dialog.showErrorBox('Backend crashed', `Flask server exited unexpectedly (code ${code}).`);
            app.quit();
        }
    });
}

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 820,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    mainWindow.loadFile(path.join(__dirname, 'loading.html'));
    mainWindow.show();

    const port = await getFreePort();

    startBackend(port);
    try {
        await waitForPort(port);
        mainWindow.loadURL(`http://127.0.0.1:${port}`);
    } catch (err) {
        dialog.showErrorBox('Backend failed to start', err.message);
        app.quit();
    }
}

app.on('before-quit', () => {
    isQuitting = true;
    killBackend();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.whenReady().then(() => {
    registerAllIpcHandlers();
    createWindow();
});

process.on('uncaughtException', (err) => {
    console.error('[Electron] Uncaught Exception:', err);
    killBackend();
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error('[Electron] Unhandled Rejection:', reason);
    killBackend();
    process.exit(1);
});