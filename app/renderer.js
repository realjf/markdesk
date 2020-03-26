const { remote, ipcRenderer, shell } = require('electron');
const mainProcess = remote.require('./main');
// 获取当前窗口引用
const currentWindow = remote.getCurrentWindow();

const { Menu } = remote;

const marked = require('marked');
const path = require('path');

// 记录文件信息
let filePath = null;
let originalContent = '';

const markdownView = document.querySelector('#markdown');
const htmlView = document.querySelector('#html');
const newFileButton = document.querySelector('#new-file');
const openFileButton = document.querySelector('#open-file');
const saveMarkdownButton = document.querySelector('#save-markdown');
const revertButton = document.querySelector('#revert');
const saveHtmlButton = document.querySelector('#save-html');
const showFileButton = document.querySelector('#show-file');
const openInDefaultButton = document.querySelector('#open-in-default');



// 新建文件
newFileButton.addEventListener('click', () => {
    mainProcess.createWindow();
})

// 将markdown转换成html视图
const renderMarkdownToHtml = (markdown) => {
    htmlView.innerHTML = marked(markdown, {sanitize: true});
};

// 当markdown变化时，重新渲染html
markdownView.addEventListener('keyup', (event) => {
    const currentContent = event.target.value;
    renderMarkdownToHtml(currentContent);
    updateUserInterface(currentContent !== originalContent);
});

openFileButton.addEventListener('click', () => {
    mainProcess.getFileFromUser(currentWindow);
});

ipcRenderer.on('file-opened', (event, file, content) => {
    filePath = file;
    originalContent = content;

    markdownView.value = content;
    renderMarkdownToHtml(content);
    updateUserInterface();
});


const updateUserInterface = (isEdited) => {
    let title = 'Mark Desk';
    if(filePath){
        title = `${path.basename(filePath)} - ${title}`;
    }
    if(isEdited){
        title = `${title} (Edited)`;
    }
    currentWindow.setTitle(title);
    currentWindow.setDocumentEdited(isEdited);

    saveMarkdownButton.disabled = !isEdited;
    revertButton.disabled = !isEdited;

};

// 触发文件保存对话框
saveHtmlButton.addEventListener('click', () => {
    mainProcess.saveHtml(currentWindow, htmlView.innerHTML);
});

revertButton.addEventListener('click', () => {
    // 回滚文件
    markdownView.value = originalContent;
    renderMarkdownToHtml(originalContent);
});

document.addEventListener('dragstart', event => event.preventDefault());
document.addEventListener('dragover', event => event.preventDefault());
document.addEventListener('dragleave', event => event.preventDefault());
document.addEventListener('drop', event => event.preventDefault());

const getDragedFile = (event) => event.dataTransfer.items[0];
const getDroppedFile = (event) => event.dataTransfer.files[0];

const fileTypeIsSupported = (file) => {
    return ['text/plain', 'text/markdown'].includes(file.type);
};

markdownView.addEventListener('drag-over', (event) => {
    const file = getDragedFile(event);

    if(fileTypeIsSupported(file)){
        markdownView.classList.add('drag-over');
    }else{
        markdownView.classList.add('drag-error');
    }
});

markdownView.addEventListener('dragleave', () => {
    markdownView.classList.remove('drag-over');
    markdownView.classList.remote('drag-error');
});

markdownView.addEventListener('drop', (event) => {
    const file = getDroppedFile(event);

    if(fileTypeIsSupported(file)){
        mainProcess.openFile(currentWindow, file.path);
    }else{
        alert('That file type is not supported');
    }

    markdownView.classList.remove('drag-over');
    markdownView.classList.remove('drag-error');
});

const renderFile = (file, content) => {
    filePath = file;
    originalContent = content;

    markdownView.value = content;
    renderMarkdownToHtml(content);

    // 启用打开默认应用
    showFileButton.disabled = false;
    openInDefaultButton.disabled = false;

    updateUserInterface(false);
};

ipcRenderer.on('file-opened', (event, file, content) => {
    if(currentWindow.isDocumentEdited()) {
        const result = remote.dialog.showMessageBox(currentWindow, {
            type: 'warning',
            title: 'Overwrite Current Unsaved Changes?',
            message: 'Opening a new file in this window will overwrite your unsaved changes. Open this file anyway?',
            buttons: [
                'Yes',
                'Cancel',
            ],
            defaultId: 0,
            cancelId: 1,
        });

        if(result === 1){
            return;
        }
    }

    renderFile(file, content);
});

ipcRenderer.on('file-changed', (event, file, content) => {
    const result = remote.dialog.showMessageBox(currentWindow, {
        type: 'warning',
            title: 'Overwrite Current Unsaved Changes?',
            message: 'Another application has changed this file. Load changes?',
            buttons: [
                'Yes',
                'Cancel',
            ],
            defaultId: 0,
            cancelId: 1,
    });

    renderFile(file, content);
});

ipcRenderer.on('save-markdown', () => {
    mainProcess.saveMarkdown(currentWindow, filePath, markdownView.value);
});

ipcRenderer.on('save-html', () => {
    mainProcess.saveHtml(currentWindow, filePath, htmlView.innerHTML);
});

markdownView.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    markdownContextMenu.popup();
});

const showFile = () => {
    if(!filePath){
        return alert('This file has not been saved to the filesystem.');
    }
    shell.showItemInFolder(filePath);
};

const openInDefaultApplication = () => {
    if(!filePath){
        return alert('This file has not been saved to the filesystem.');
    }
    shell.OpenItem(filePath);
};

showFileButton.addEventListener('click', showFile);
openInDefaultButton.addEventListener('click', openInDefaultApplication);

ipcRenderer.on('show-file', showFile);
ipcRenderer.on('open-in-default', openInDefaultApplication);

const markdownContextMenu = Menu.buildFromTemplate([
    { label: 'Open File', click() { mainProcess.getFileFromUser(); }},
    {
        label: 'Show File in Folder',
        click: showFile
    },
    {
        label: 'Open in Default Editor',
        click: openInDefaultApplication
    },
    { type: 'separator' },
    { label: 'Cut', role: 'cut' },
    { label: 'Copy', role: 'copy' },
    { label: 'Paste', role: 'paste' },
    { label: 'Select All', role: 'selectall'},
]);
