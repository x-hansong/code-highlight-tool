// 全局变量
let selectedLines = new Set();
let codeLines = [];

// DOM 元素
const codeInput = document.getElementById('codeInput');
const codePreview = document.getElementById('codePreview');
const clearBtn = document.getElementById('clearBtn');
const formatBtn = document.getElementById('formatBtn');
const clearSelection = document.getElementById('clearSelection');
const copyToClipboard = document.getElementById('copyToClipboard');
const downloadPng = document.getElementById('downloadPng');
const status = document.getElementById('status');

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM 加载完成');
    
    // 绑定事件监听器
    codeInput.addEventListener('input', function() {
        autoResizeTextarea();
        updatePreview();
    });
    clearBtn.addEventListener('click', clearCode);
    formatBtn.addEventListener('click', formatCode);
    clearSelection.addEventListener('click', clearSelectedLines);
    copyToClipboard.addEventListener('click', copyImageToClipboard);
    downloadPng.addEventListener('click', downloadImage);
    
    // 等待库加载完成
    waitForLibraries();
});

// 等待库加载完成
function waitForLibraries() {
    const checkInterval = setInterval(() => {
        if (typeof Prism !== 'undefined' && typeof html2canvas !== 'undefined') {
            clearInterval(checkInterval);
            console.log('所有库加载完成');
            
            // 初始预览
            autoResizeTextarea();
            updatePreview();
            
            // 显示初始状态
            showStatus('准备就绪 ✨', 'success');
        } else {
            console.log('等待库加载...', {
                Prism: typeof Prism !== 'undefined',
                html2canvas: typeof html2canvas !== 'undefined'
            });
        }
    }, 100);
    
    // 10秒后超时
    setTimeout(() => {
        clearInterval(checkInterval);
        if (typeof Prism === 'undefined' || typeof html2canvas === 'undefined') {
            console.error('库加载超时');
            showStatus('库加载失败，请刷新页面重试', 'error');
        }
    }, 10000);
}

// 自动调整输入框尺寸
function autoResizeTextarea() {
    const textarea = codeInput;
    const content = textarea.value;
    
    if (!content) {
        // 内容为空时重置为最小尺寸
        textarea.style.height = '60px';
        textarea.style.width = '460px';
        return;
    }
    
    // 创建临时元素来测量内容尺寸
    const measureDiv = document.createElement('div');
    measureDiv.style.cssText = `
        position: absolute;
        visibility: hidden;
        white-space: pre;
        font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
        font-size: 14px;
        line-height: 1.5;
        padding: 15px;
        border: 2px solid transparent;
        border-radius: 8px;
        max-width: 80vw;
    `;
    measureDiv.textContent = content;
    document.body.appendChild(measureDiv);
    
    // 计算所需的高度和宽度
    const lines = content.split('\n');
    const lineHeight = 21; // 14px font-size * 1.5 line-height
    const padding = 30; // 15px padding * 2
    const border = 4; // 2px border * 2
    
    // 计算高度：基于行数
    const calculatedHeight = Math.max(60, lines.length * lineHeight + padding + border);
    
    // 计算宽度：基于最长行的宽度
    const maxLineLength = Math.max(...lines.map(line => line.length));
    const charWidth = 8.4; // 大约的字符宽度（等宽字体）
    const calculatedWidth = Math.max(460, maxLineLength * charWidth + padding + border);
    
    // 应用新尺寸
    textarea.style.height = calculatedHeight + 'px';
    textarea.style.width = Math.min(calculatedWidth, window.innerWidth * 0.8) + 'px';
    
    // 清理临时元素
    document.body.removeChild(measureDiv);
    
    console.log('输入框尺寸已调整:', {
        height: calculatedHeight + 'px',
        width: Math.min(calculatedWidth, window.innerWidth * 0.8) + 'px',
        lines: lines.length,
        maxLineLength
    });
}

// 更新代码预览
function updatePreview() {
    const code = codeInput.value.trim();
    
    if (!code) {
        codePreview.innerHTML = '<div class="placeholder">在上方输入代码以开始预览...</div>';
        updateButtonStates(false);
        return;
    }
    
    // 检查 Prism.js 是否加载
    if (typeof Prism === 'undefined') {
        console.error('Prism.js 未加载');
        codePreview.innerHTML = '<div class="placeholder">语法高亮库加载中...</div>';
        setTimeout(updatePreview, 100);
        return;
    }
    
    // 分割代码行
    codeLines = code.split('\n');
    
    // 生成带行号的代码
    let html = '';
    codeLines.forEach((line, index) => {
        const lineNumber = index + 1;
        const isSelected = selectedLines.has(lineNumber);
        
        try {
            // 使用 Prism.js 进行语法高亮
            const highlightedLine = Prism.highlight(line || ' ', Prism.languages.python, 'python');
            
            html += `
                <div class="code-line ${isSelected ? 'selected' : ''}" data-line="${lineNumber}">
                    <div class="line-number" onclick="toggleLineSelection(${lineNumber}, event)">${lineNumber}</div>
                    <div class="line-content">${highlightedLine}</div>
                </div>
            `;
        } catch (error) {
            console.error('语法高亮失败:', error);
            // 如果语法高亮失败，使用原始文本
            html += `
                <div class="code-line ${isSelected ? 'selected' : ''}" data-line="${lineNumber}">
                    <div class="line-number" onclick="toggleLineSelection(${lineNumber}, event)">${lineNumber}</div>
                    <div class="line-content">${line || ' '}</div>
                </div>
            `;
        }
    });
    
    codePreview.innerHTML = html;
    updateButtonStates(true);
    
    // 调试信息
    console.log('预览更新完成，代码行数:', codeLines.length);
}

// 切换行选择状态
function toggleLineSelection(lineNumber, event) {
    // 检查是否按住 Ctrl/Cmd 键
    const isMultiSelect = event.ctrlKey || event.metaKey;
    
    if (!isMultiSelect) {
        // 单选模式：清除其他选择
        selectedLines.clear();
    }
    
    // 切换当前行的选择状态
    if (selectedLines.has(lineNumber)) {
        selectedLines.delete(lineNumber);
    } else {
        selectedLines.add(lineNumber);
    }
    
    // 更新预览显示
    updatePreview();
    
    // 更新状态显示
    if (selectedLines.size > 0) {
        const lineNumbers = Array.from(selectedLines).sort((a, b) => a - b);
        showStatus(`已选择 ${selectedLines.size} 行: ${lineNumbers.join(', ')}`, 'info');
    } else {
        showStatus('未选择任何行', 'info');
    }
}

// 清空代码
function clearCode() {
    codeInput.value = '';
    selectedLines.clear();
    autoResizeTextarea();
    updatePreview();
    showStatus('代码已清空', 'info');
}

// 格式化代码
function formatCode() {
    const code = codeInput.value.trim();
    
    if (!code) {
        showStatus('没有代码需要格式化', 'info');
        return;
    }
    
    try {
        showStatus('正在格式化代码...', 'loading');
        
        const formattedCode = formatPythonCode(code);
        codeInput.value = formattedCode;
        autoResizeTextarea();
        updatePreview();
        
        showStatus('代码格式化完成 ✨', 'success');
    } catch (error) {
        console.error('格式化失败:', error);
        showStatus('格式化失败: ' + error.message, 'error');
    }
}

// Python 代码格式化函数
function formatPythonCode(code) {
    if (!code) return '';
    
    // 分割代码行
    let lines = code.split('\n');
    let formattedLines = [];
    let indentStack = [0]; // 使用栈来跟踪缩进级别
    const indentSize = 4;
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        
        // 跳过空行但保留
        if (!line) {
            formattedLines.push('');
            continue;
        }
        
        // 检查当前行的原始缩进
        const originalLine = lines[i];
        const originalIndent = originalLine.length - originalLine.trimStart().length;
        
        // 当前缩进级别
        let currentIndent = indentStack[indentStack.length - 1];
        
        // 检查是否是新的代码块开始
        const isNewBlock = line.includes(':') && (
            line.startsWith('class ') || line.startsWith('def ') || line.startsWith('if ') || 
            line.startsWith('elif ') || line.startsWith('else:') || line.startsWith('try:') || 
            line.startsWith('except ') || line.startsWith('finally:') || line.startsWith('with ') || 
            line.startsWith('for ') || line.startsWith('while ') || line.startsWith('async def ') ||
            line.startsWith('async with ') || line.startsWith('async for ') || 
            line.match(/^\s*else\s*:/) || line.match(/^\s*elif\s+.*:/) || 
            line.match(/^\s*except\s*.*:/) || line.match(/^\s*finally\s*:/)
        );
        
        // 检查是否是代码块结束（比前一行缩进更少）
        if (i > 0 && originalIndent < indentStack[indentStack.length - 1] * indentSize) {
            // 找到对应的缩进级别
            while (indentStack.length > 1 && originalIndent < indentStack[indentStack.length - 1] * indentSize) {
                indentStack.pop();
            }
            currentIndent = indentStack[indentStack.length - 1];
        }
        
        // 特殊处理 else、elif、except、finally（与对应的 if、try 同级）
        if (line.startsWith('else:') || line.startsWith('elif ') || 
            line.startsWith('except ') || line.startsWith('finally:')) {
            if (indentStack.length > 1) {
                indentStack.pop(); // 回到上一级
                currentIndent = indentStack[indentStack.length - 1];
            }
        }
        
        // 添加缩进
        const indent = ' '.repeat(currentIndent * indentSize);
        line = indent + line;
        
        // 格式化运算符周围的空格
        line = formatOperators(line);
        
        // 格式化逗号后的空格
        line = formatCommas(line);
        
        // 格式化冒号后的空格
        line = formatColons(line);
        
        formattedLines.push(line);
        
        // 如果这是一个新的代码块，增加缩进级别
        if (isNewBlock) {
            indentStack.push(currentIndent + 1);
        }
    }
    
    return formattedLines.join('\n');
}

// 格式化运算符周围的空格
function formatOperators(line) {
    // 先处理复合运算符（避免被拆分）
    const compoundOps = ['**', '//', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '//=', '%=', '**='];
    for (const op of compoundOps) {
        const regex = new RegExp(`([^\\s])${op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\s])`, 'g');
        line = line.replace(regex, `$1 ${op} $2`);
    }
    
    // 处理单字符运算符，但要小心负号
    const singleOps = ['+', '*', '/', '%', '<', '>', '='];
    for (const op of singleOps) {
        const regex = new RegExp(`([^\\s])\\${op}([^\\s])`, 'g');
        line = line.replace(regex, `$1 ${op} $2`);
    }
    
    // 特殊处理减号：区分负号和减法运算符
    // 减法运算符：前面是数字、变量或者右括号
    line = line.replace(/([a-zA-Z0-9_)\]])-([^=\s])/g, '$1 - $2');
    
    // 处理特殊情况（函数调用、索引等）
    line = line.replace(/\( /g, '(');
    line = line.replace(/ \)/g, ')');
    line = line.replace(/\[ /g, '[');
    line = line.replace(/ \]/g, ']');
    line = line.replace(/,\s+/g, ', ');
    
    return line;
}

// 格式化逗号后的空格
function formatCommas(line) {
    return line.replace(/,([^\s])/g, ', $1');
}

// 格式化冒号后的空格
function formatColons(line) {
    return line.replace(/:([^\s])/g, ': $1');
}

// 清除选中的行
function clearSelectedLines() {
    selectedLines.clear();
    updatePreview();
    showStatus('选择已清除', 'info');
}

// 更新按钮状态
function updateButtonStates(hasCode) {
    copyToClipboard.disabled = !hasCode;
    downloadPng.disabled = !hasCode;
}

// 复制图片到剪贴板
async function copyImageToClipboard() {
    try {
        showStatus('正在生成图片...', 'loading');
        
        const canvas = await generateCanvas();
        
        // 转换为 blob
        canvas.toBlob(async (blob) => {
            try {
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'image/png': blob
                    })
                ]);
                showStatus('图片已复制到剪贴板 📋', 'success');
            } catch (error) {
                console.error('复制到剪贴板失败:', error);
                showStatus('复制失败，请尝试下载图片', 'error');
            }
        }, 'image/png', 0.95);
        
    } catch (error) {
        console.error('生成图片失败:', error);
        showStatus('生成图片失败', 'error');
    }
}

// 下载图片
async function downloadImage() {
    try {
        showStatus('正在生成图片...', 'loading');
        
        const canvas = await generateCanvas();
        
        // 创建下载链接
        const link = document.createElement('a');
        link.download = `code-snippet-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png', 0.95);
        
        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showStatus('图片下载完成 💾', 'success');
        
    } catch (error) {
        console.error('下载图片失败:', error);
        showStatus('下载失败', 'error');
    }
}

// 生成图片 Canvas
async function generateCanvas() {
    const previewElement = codePreview;
    
    // 临时移除边框以获得更好的截图效果
    const originalBorder = previewElement.style.border;
    previewElement.style.border = 'none';
    
    try {
        const canvas = await html2canvas(previewElement, {
            backgroundColor: '#1e1e2f',
            scale: 2, // 提高分辨率
            useCORS: true,
            allowTaint: true,
            scrollX: 0,
            scrollY: 0,
            width: previewElement.scrollWidth,
            height: previewElement.scrollHeight,
            onclone: function(clonedDoc) {
                // 在克隆的文档中确保样式正确应用
                const clonedElement = clonedDoc.querySelector('.code-preview');
                if (clonedElement) {
                    clonedElement.style.border = 'none';
                    clonedElement.style.borderRadius = '8px';
                    clonedElement.style.overflow = 'visible';
                }
            }
        });
        
        return canvas;
    } finally {
        // 恢复原始边框
        previewElement.style.border = originalBorder;
    }
}

// 显示状态信息
function showStatus(message, type = 'info') {
    status.innerHTML = '';
    
    if (type === 'loading') {
        status.innerHTML = `<span class="loading"></span> ${message}`;
    } else {
        status.textContent = message;
    }
    
    // 根据类型设置颜色
    switch (type) {
        case 'success':
            status.style.color = '#4caf50';
            break;
        case 'error':
            status.style.color = '#f44336';
            break;
        case 'loading':
            status.style.color = '#64ffda';
            break;
        default:
            status.style.color = '#64ffda';
    }
    
    // 3秒后清除状态（除非是错误信息）
    if (type !== 'error' && type !== 'loading') {
        setTimeout(() => {
            if (status.textContent === message) {
                status.textContent = '';
            }
        }, 3000);
    }
}

// 键盘快捷键支持
document.addEventListener('keydown', function(event) {
    // Ctrl/Cmd + A: 全选所有行
    if ((event.ctrlKey || event.metaKey) && event.key === 'a' && event.target !== codeInput) {
        event.preventDefault();
        if (codeLines.length > 0) {
            selectedLines.clear();
            for (let i = 1; i <= codeLines.length; i++) {
                selectedLines.add(i);
            }
            updatePreview();
            showStatus(`已选择所有 ${codeLines.length} 行`, 'info');
        }
    }
    
    // Ctrl/Cmd + D: 清除选择
    if ((event.ctrlKey || event.metaKey) && event.key === 'd' && event.target !== codeInput) {
        event.preventDefault();
        clearSelectedLines();
    }
    
    // Ctrl/Cmd + S: 下载图片
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (!downloadPng.disabled) {
            downloadImage();
        }
    }
    
    // Ctrl/Cmd + C: 复制到剪贴板（当焦点不在输入框时）
    if ((event.ctrlKey || event.metaKey) && event.key === 'c' && event.target !== codeInput) {
        event.preventDefault();
        if (!copyToClipboard.disabled) {
            copyImageToClipboard();
        }
    }
    
    // Ctrl/Cmd + F: 格式化代码
    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        formatCode();
    }
});

// 检查浏览器兼容性
function checkBrowserSupport() {
    console.log('检查浏览器兼容性...');
    
    if (!navigator.clipboard) {
        console.warn('剪贴板 API 不支持，将只能下载图片');
    }
    
    if (!window.html2canvas) {
        console.error('html2canvas 库未加载');
        showStatus('图片生成库加载失败', 'error');
    }
    
    if (!window.Prism) {
        console.error('Prism.js 库未加载');
        showStatus('语法高亮库加载失败', 'error');
    }
    
    // 测试基本功能
    testBasicFunctionality();
}

// 测试基本功能
function testBasicFunctionality() {
    console.log('测试基本功能...');
    
    // 测试代码输入
    const testCode = `def hello_world():
    print("Hello, World!")
    return True`;
    
    codeInput.value = testCode;
    updatePreview();
    
    // 2秒后清空测试代码
    setTimeout(() => {
        codeInput.value = '';
        updatePreview();
        console.log('基本功能测试完成');
    }, 2000);
}

// 页面加载完成后检查兼容性
window.addEventListener('load', function() {
    setTimeout(checkBrowserSupport, 100);
}); 