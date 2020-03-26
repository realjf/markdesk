
const { app, BrowserWindow, dialog, Menu } = require('electron');
const createApplicationMenu = require('./application-menu');
const fs = require('fs');

const windows = new Set();

// 监控对象列表
const OpenFiles = new Map();

app.on('ready', () => {
    // 设置应用菜单
    createApplicationMenu();
    createWindow();
});

app.on('window-all-closed', () => {
    if(process.platform === 'darwin') {
        return false;
    }
});

app.on('activate', (event, hasVisibleWindows) => {
    if(!hasVisibleWindows){
        createWindow();
    }
});

const createWindow = exports.createWindow = () => {
    let x, y;
    let currentWindow = BrowserWindow.getFocusedWindow();

    if (currentWindow){
        const[currentWindowX, currentWindowY] = currentWindow.getPosition();
        x = currentWindowX + 10;
        y = currentWindowY + 10;
    }

    let newWindow = new BrowserWindow({
        x,
        y,
        show: false,
        webPreferences: {
            nodeIntegration: true
        }
    });

    newWindow.loadFile('app/index.html');

    newWindow.once('ready-to-show', () => {
        newWindow.show();
        // 打开调试工具
        newWindow.webContents.openDevTools();
    });

    newWindow.on('focus', createApplicationMenu);

    newWindow.on('closed', () => {
        windows.delete(newWindow);
        // 窗口关闭后，同时关闭与关联的文件监控器
        // stopWatchingFile(newWindow);
        createApplicationMenu();
        newWindow = null;
    });

    newWindow.on('close', (event) => {
        if(newWindow.isDocumentEdited()){
            event.preventDefault();
    
            const result = dialog.showMessageBox(newWindow, {
                type: 'warning',
                title: 'Quit with Unsaved Changes?',
                message: 'Your changes will be lost if you do not save.',
                buttons: [
                    'Quit Anyway',
                    'Cancel',
                ],
                defaultId: 0,
                cancelId: 1
            });
    
            if (result === 0) newWindow.destroy();
        }
    });

    windows.add(newWindow);
    return newWindow;
};

const getFileFromUser = exports.getFileFromUser = (targetWindow) => {
    const files = dialog.showOpenDialog(targetWindow, {
        properties: ['openFile'], // 打开文件
        // 打开文件限制
        filters: [
            {
                name: 'Text Files',
                extensions: ['txt']
            },
            {
                name: 'Markdown Files',
                extensions: ['md', 'markdown']
            },
            {
                name: 'Images',
                extensions: ['png', 'jpg', 'jpeg']
            }
        ]
    }).then( files => {
        if (files) {
            openFile(targetWindow, files.filePaths[0]);
        }
    });
};

const openFile = exports.openFile = (targetWindow, file) => {
    const content = fs.readFileSync(file).toString();
    startWatchingFile(targetWindow, file);
    app.addRecentDocument(file);
    targetWindow.setRepresentedFilename(file);
    targetWindow.webContents.send('file-opened', file, content);
    createApplicationMenu();
};

app.on('will-finish-launching', () => {
    app.on('open-file', (event, file) => {
        const win = createWindow();
        win.once('ready-to-show', () => {
            openFile(win, file);
        })
    })
});

const saveHtml = exports.saveHtml = (targetWindow, content) => {
    const file = dialog.showSaveDialog(targetWindow, {
        title: 'Save HTML',
        defaultPath: app.getPath('documents'),
        filters: [
            { name: 'HTML Files', extensions: ['html', 'htm']}
        ]
    });

    if(!file) return;

    fs.writeFileSync(file, content);
};

const saveMarkdown = exports.saveMarkdown = (targetWindow, file, content) => {
    if(!file) {
        file = dialog.showSaveDialog(targetWindow, {
            title: 'Save Markdown',
            defaultPath: app.getPath('documents'),
            filters: [
                { name: 'Markdown Files', extensions: ['md', 'markdown']}
            ]
        });
    }

    if(!file) return;
    // 将文件内容写入文件系统
    fs.writeFileSync(file, content);
    openFile(targetWindow, file);
};

const startWatchingFile = (targetWindow, file) => {
    stopWatchingFile(targetWindow);

    const watcher = fs.watchFile(file, (event) => {
        if(event === 'change'){
            const content = fs.readFileSync(file).toString();
            targetWindow.webContents.send('file-changed', file, content);
        }
    });

    OpenFiles.set(targetWindow, watcher);
};

const stopWatchingFile = (targetWindow) => {
    if(OpenFiles.has(targetWindow)){
        OpenFiles.get(targetWindow).stop();
        OpenFiles.delete(targetWindow);
    }
};

