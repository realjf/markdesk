const { remote, ipcRenderer } = require('electron');
const mainProcess = remote.require('./main');
// 获取当前窗口引用
const currentWindow = remote.getCurrentWindow();

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

