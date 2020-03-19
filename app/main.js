
const { app, BrowserWindow, dialog } = require('electron');
const fs = require('fs');

const windows = new Set();

app.on('ready', () => {
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
    let currentWindow = new BrowserWindow.getFocusedWindow();

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
    })

    newWindow.on('closed', () => {
        windows.delete(newWindow);
        newWindow = null;
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
    try{
        const content = fs.readFileSync(file).toString();
        targetWindow.webContents.send('file-opened', file, content);
    }catch(err){
        console.log(err, file);
    }
    
};