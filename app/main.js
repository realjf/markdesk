
const { app, BrowserWindow, dialog } = require('electron');
const fs = require('fs');

let mainWindow = null;

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        show: false,
        webPreferences: {
            nodeIntegration: true
        }
    });

    mainWindow.loadFile('app/index.html');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.webContents.openDevTools();
    })

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

});

const getFileFromUser = exports.getFileFromUser = () => {
    const files = dialog.showOpenDialog(mainWindow, {
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
            openFile(files.filePaths[0]);
        }
    })
}

const openFile = (file) => {
    try{
        const content = fs.readFileSync(file).toString();
        mainWindow.webContents.send('file-opened', file, content);
    }catch(err){
        console.log(err, file);
    }
    
};