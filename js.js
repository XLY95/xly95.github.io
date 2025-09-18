 // 全局变量
        let sourceImage = null;
        let originalImage = null; // 保存原始图片尺寸
        let canvas, ctx, floatCanvas, floatCtx;
        let originalCanvasData = null; // 保存原始画布数据用于重置
        let startTime;
        let currentParams = {
            saturation: 100,
            brightness: 100,
            contrast: 100,
            diffusion: 50,
            ditherAlg: 'floydSteinberg'
        };
        
        // 当前显示模式
        let currentMode = 'image'; // image, clock, calendar
        
        // 画布旋转相关变量
        let canvasRotation = 0;
        
        // 绘画相关变量
        let isDrawing = false;
        let lastX = 0;
        let lastY = 0;
        let currentTool = 'pen'; // pen, eraser, text
        let brushSize = 3;
        let brushColor = '#000000';
        let imageScale = 100; // 图片缩放比例
        let imageOffset = { x: 0, y: 0 }; // 图片偏移量
        let isDraggingImage = false; // 是否正在拖拽图片
        let dragStartPos = { x: 0, y: 0 }; // 拖拽开始位置
        let shiftKeyPressed = false; // Shift键是否按下
        let imageRotation = 0; // 图片旋转角度（0, 90, 180, 270）
        let isDrawingModeActive = false; // 绘画模式是否激活
        
        // 拖动和调整大小变量
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        let isResizing = false;
        
        // 蓝牙相关变量
        let bleDevice, gattServer;
        let epdService, epdCharacteristic;
        let msgIndex, appVersion, textDecoder;

        // 墨水屏命令常量
        const EpdCmd = {
            SET_PINS:  0xAA,
            INIT:      0xA9,
            CLEAR:     0xA8,
            SEND_CMD:  0xA7,
            SEND_DATA: 0xA6,
            REFRESH:   0xA5,
            SLEEP:     0xA4,

            SET_TIME:  0xA3,  // 新增：设置时间命令
            WEEK_START:0xA2,
            WRITE_IMG: 0xA1,

            SET_CONFIG: 0xA0,
            SYS_RESET:  0xAB,
            SYS_SLEEP:  0xAC,
            CFG_ERASE:  0xAD,
            SET_MODE:   0xAE   // 新增：设置显示模式命令
        };
        
        // 显示模式常量
        const DisplayMode = {
            IMAGE: 0x00,
            CLOCK: 0x01,
            CALENDAR: 0x02
        };

        // 画布尺寸定义
        const canvasSizes = [
            { name: '2.13_122_250', width: 122, height: 250 },
            { name: '4.2_400_300', width: 400, height: 300 },
            { name: '7.5_800_480', width: 800, height: 480 }
        ];

        // DOM 元素
        const imageUpload = document.getElementById('imageFile');
        const previewCanvas = document.getElementById('previewCanvas');
        const floatPreviewCanvas = document.getElementById('floatPreviewCanvas');
        const noImagePlaceholder = document.getElementById('noImagePlaceholder');
        const processedImageInfo = document.getElementById('processedImageInfo');
        const btnProcess = document.getElementById('btnProcess');
        const btnSend = document.getElementById('btnSend');
        const btnDownload = document.getElementById('btnDownload');
        const btnReset = document.getElementById('btnReset');
        const btnClearLog = document.getElementById('btnClearLog');
        const btnBlackWhite = document.getElementById('btnBlackWhite');
        const btnBlackWhiteRed = document.getElementById('btnBlackWhiteRed');
        const ditherMode = document.getElementById('ditherMode');
        const ditherAlg = document.getElementById('ditherAlg');
        const logContainer = document.getElementById('logContainer');
        const statusContainer = document.getElementById('statusContainer');
        const floatingCanvasContainer = document.getElementById('floatingCanvasContainer');
        const toggleCanvasFloat = document.getElementById('toggleCanvasFloat');
        const closeCanvas = document.getElementById('closeCanvas');
        const canvasResizeHandle = document.getElementById('canvasResizeHandle');
        const imageScaleSlider = document.getElementById('imageScale');
        const imageScaleValue = document.getElementById('imageScaleValue');
        const addTextBtn = document.getElementById('addTextBtn');
        
        // 新增的时间和模式按钮
        const btnSetTime = document.getElementById('btnSetTime');
        const btnClockMode = document.getElementById('btnClockMode');
        const btnCalendarMode = document.getElementById('btnCalendarMode');
        const btnClearScreen = document.getElementById('btnClearScreen');
        
        // 时间对话框元素
        const timeDialog = document.getElementById('timeDialog');
        const datetimeInput = document.getElementById('datetimeInput');
        const closeTimeDialog = document.getElementById('closeTimeDialog');
        const confirmTimeBtn = document.getElementById('confirmTimeBtn');
        
        // 图像尺寸控制元素
        const imageWidthInput = document.getElementById('imageWidth');
        const imageHeightInput = document.getElementById('imageHeight');
        
        // 绘画工具元素
        const toolPen = document.getElementById('toolPen');
        const toolEraser = document.getElementById('toolEraser');
        const toolText = document.getElementById('toolText');
        const toolClear = document.getElementById('toolClear');
        const brushSizeSlider = document.getElementById('brushSize');
        const fontSizeInput = document.getElementById('fontSize');
        const fontFamilySelect = document.getElementById('fontFamily');
        const textInput = document.getElementById('textInput');
        const drawingStatus = document.getElementById('drawingStatus');
        const currentToolEl = document.getElementById('currentTool');
        const currentSizeEl = document.getElementById('currentSize');
        const drawingModeIndicator = document.getElementById('drawingModeIndicator');
        const toggleDrawingModeBtn = document.getElementById('toggleDrawingMode');
        const floatToggleDrawingModeBtn = document.getElementById('floatToggleDrawingMode');
        
        // 滑块和值显示
        const sliders = {
            saturation: document.getElementById('saturation'),
            brightness: document.getElementById('brightness'),
            contrast: document.getElementById('contrast'),
            diffusion: document.getElementById('diffusion')
        };
        
        const sliderValues = {
            saturation: document.getElementById('saturationValue'),
            brightness: document.getElementById('brightnessValue'),
            contrast: document.getElementById('contrastValue'),
            diffusion: document.getElementById('diffusionValue')
        };

        // 初始化
        function init() {
            // 设置Canvas上下文
            canvas = previewCanvas;
            ctx = canvas.getContext('2d');
            floatCanvas = floatPreviewCanvas;
            floatCtx = floatCanvas.getContext('2d');
            
            // 初始化画布尺寸
            updateCanvasSize();
            
            // 设置当前日期时间到输入框
            const now = new Date();
            // 调整到本地时间并格式化
            const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16);
            datetimeInput.value = localDateTime;
            
            // 添加鼠标事件监听
            canvas.addEventListener('mousedown', startDrawing);
            canvas.addEventListener('mousemove', draw);
            canvas.addEventListener('mouseup', stopDrawing);
            canvas.addEventListener('mouseout', stopDrawing);
            
            // 浮动画布鼠标事件监听
            floatCanvas.addEventListener('mousedown', startDrawingFloat);
            floatCanvas.addEventListener('mousemove', drawFloat);
            floatCanvas.addEventListener('mouseup', stopDrawing);
            floatCanvas.addEventListener('mouseout', stopDrawing);
            
            // 添加触摸事件监听
            canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
            canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
            canvas.addEventListener('touchend', handleTouchEnd);
            canvas.addEventListener('touchcancel', handleTouchEnd);
            
            // 浮动画布触摸事件监听
            floatCanvas.addEventListener('touchstart', handleFloatTouchStart, { passive: false });
            floatCanvas.addEventListener('touchmove', handleFloatTouchMove, { passive: false });
            floatCanvas.addEventListener('touchend', handleTouchEnd);
            floatCanvas.addEventListener('touchcancel', handleTouchEnd);
            
            // 键盘事件监听 - 用于检测Shift键
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Shift') {
                    shiftKeyPressed = true;
                    // 显示提示，仅在非绘画模式下允许移动
                    if (sourceImage && !isDrawingModeActive) {
                        canvas.style.cursor = 'move';
                        floatCanvas.style.cursor = 'move';
                    }
                }
            });
            
            document.addEventListener('keyup', (e) => {
                if (e.key === 'Shift') {
                    shiftKeyPressed = false;
                    // 恢复光标
                    updateCursorStyle();
                }
            });
            
            // 绘画模式切换按钮事件
            toggleDrawingModeBtn.addEventListener('click', toggleDrawingMode);
            floatToggleDrawingModeBtn.addEventListener('click', toggleDrawingMode);
            
            // 其他事件监听
            btnProcess.addEventListener('click', processImage);
            btnSend.addEventListener('click', sendimg);
            btnDownload.addEventListener('click', downloadImageFile);
            btnReset.addEventListener('click', resetProcessing); // 修改为只重置处理效果
            btnClearLog.addEventListener('click', clearLog);
            toggleCanvasFloat.addEventListener('click', toggleCanvas);
            closeCanvas.addEventListener('click', hideCanvas);
            
            // 新增按钮事件监听
            btnSetTime.addEventListener('click', showTimeDialog);
            closeTimeDialog.addEventListener('click', hideTimeDialog);
            confirmTimeBtn.addEventListener('click', setTime);
            btnClockMode.addEventListener('click', setClockMode);
            btnCalendarMode.addEventListener('click', setCalendarMode);
            btnClearScreen.addEventListener('click', clearScreen);
            
            // 画笔大小事件
            brushSizeSlider.addEventListener('input', function() {
                brushSize = parseInt(this.value);
                currentSizeEl.textContent = brushSize;
            });
            
            // 浮动画布拖动功能
            const canvasHandle = floatingCanvasContainer.querySelector('div:first-child');
            canvasHandle.addEventListener('mousedown', startDrag);
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', stopDrag);
            
            // 浮动画布调整大小功能
            canvasResizeHandle.addEventListener('mousedown', startResize);
            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', stopResize);
            
            // 为所有滑块添加事件监听
            Object.keys(sliders).forEach(key => {
                sliders[key].addEventListener('input', (e) => {
                    currentParams[key] = parseInt(e.target.value);
                    sliderValues[key].textContent = `${currentParams[key]}%`;
                });
            });
            
            // 画布尺寸变更时更新图像尺寸输入框
            document.getElementById('canvasSize').addEventListener('change', function() {
                const selectedSize = getSelectedCanvasSize();
                imageWidthInput.value = selectedSize.width;
                imageHeightInput.value = selectedSize.height;
            });
            
            // 添加初始日志
            addLog("欢迎使用墨水屏蓝牙图片工具！");
            updateButtonStatus();
        }

        // 切换绘画模式
        function toggleDrawingMode() {
            isDrawingModeActive = !isDrawingModeActive;
            
            // 更新按钮文本和样式
            if (isDrawingModeActive) {
                toggleDrawingModeBtn.innerHTML = '<i class="fa fa-stop mr-1"></i>退出绘画';
                toggleDrawingModeBtn.classList.remove('bg-primary');
                toggleDrawingModeBtn.classList.add('bg-amber-500');
                
                floatToggleDrawingModeBtn.innerHTML = '<i class="fa fa-stop mr-1"></i>退出绘画';
                floatToggleDrawingModeBtn.classList.add('text-amber-300');
                
                // 显示绘画模式指示器
                drawingModeIndicator.classList.remove('hidden');
                
                addLog("已进入绘画模式，图片已锁定无法移动");
            } else {
                toggleDrawingModeBtn.innerHTML = '<i class="fa fa-pencil mr-1"></i>开始绘画';
                toggleDrawingModeBtn.classList.remove('bg-amber-500');
                toggleDrawingModeBtn.classList.add('bg-primary');
                
                floatToggleDrawingModeBtn.innerHTML = '<i class="fa fa-pencil mr-1"></i>开始绘画';
                floatToggleDrawingModeBtn.classList.remove('text-amber-300');
                
                // 隐藏绘画模式指示器
                drawingModeIndicator.classList.add('hidden');
                
                addLog("已退出绘画模式，图片可以移动");
            }
            
            // 更新光标样式
            updateCursorStyle();
        }
        
        // 更新光标样式
        function updateCursorStyle() {
            if (isDrawingModeActive) {
                // 绘画模式下的光标
                if (currentTool === 'pen') {
                    canvas.style.cursor = 'crosshair';
                    floatCanvas.style.cursor = 'crosshair';
                } else if (currentTool === 'eraser') {
                    canvas.style.cursor = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'black\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M18 13L5 5\'/%3E%3C/svg%3E") 0 24, auto';
                    floatCanvas.style.cursor = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'black\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M18 13L5 5\'/%3E%3C/svg%3E") 0 24, auto';
                } else if (currentTool === 'text') {
                    canvas.style.cursor = 'text';
                    floatCanvas.style.cursor = 'text';
                }
            } else {
                // 非绘画模式下的光标
                if (shiftKeyPressed && sourceImage) {
                    canvas.style.cursor = 'move';
                    floatCanvas.style.cursor = 'move';
                } else if (currentTool === 'pen') {
                    canvas.style.cursor = 'crosshair';
                    floatCanvas.style.cursor = 'crosshair';
                } else if (currentTool === 'eraser') {
                    canvas.style.cursor = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'black\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M18 13L5 5\'/%3E%3C/svg%3E") 0 24, auto';
                    floatCanvas.style.cursor = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'black\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M18 13L5 5\'/%3E%3C/svg%3E") 0 24, auto';
                } else if (currentTool === 'text') {
                    canvas.style.cursor = 'text';
                    floatCanvas.style.cursor = 'text';
                }
            }
        }

        // 绘画工具函数
        function setDrawingTool(tool) {
            currentTool = tool;
            
            // 更新工具按钮状态
            [toolPen, toolEraser, toolText, toolClear].forEach(el => {
                el.classList.remove('active');
            });
            
            switch(tool) {
                case 'pen':
                    toolPen.classList.add('active');
                    currentToolEl.textContent = '画笔';
                    break;
                case 'eraser':
                    toolEraser.classList.add('active');
                    currentToolEl.textContent = '橡皮擦';
                    break;
                case 'text':
                    toolText.classList.add('active');
                    currentToolEl.textContent = '文字';
                    break;
            }
            
            currentSizeEl.textContent = brushSize;
            drawingStatus.classList.remove('hidden');
            
            // 更新光标样式
            updateCursorStyle();
        }

        // 设置画笔颜色
        function setBrushColor(color) {
            brushColor = color;
            document.getElementById('customColor').value = color;
            addLog(`已选择画笔颜色: ${color}`);
        }

        // 画布坐标转换 - 通用函数，支持鼠标和触摸事件
        function getCanvasCoordinates(canvas, e, isTouch = false) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            
            // 基础坐标计算
            let x, y;
            
            if (isTouch) {
                // 触摸事件处理
                x = (e.touches[0].clientX - rect.left) * scaleX;
                y = (e.touches[0].clientY - rect.top) * scaleY;
            } else {
                // 鼠标事件处理
                x = (e.clientX - rect.left) * scaleX;
                y = (e.clientY - rect.top) * scaleY;
            }
            
            return { x, y };
        }

        // 检查点是否在图片上
        function isPointOnImage(x, y) {
            if (!sourceImage) return false;
            
            const scale = imageScale / 100;
            let scaledWidth = sourceImage.width * scale;
            let scaledHeight = sourceImage.height * scale;
            
            // 如果图片有旋转，交换宽高
            if (imageRotation % 180 !== 0) {
                [scaledWidth, scaledHeight] = [scaledHeight, scaledWidth];
            }
            
            return x >= imageOffset.x && x <= imageOffset.x + scaledWidth &&
                   y >= imageOffset.y && y <= imageOffset.y + scaledHeight;
        }

        // 开始绘画 - 鼠标事件
        function startDrawing(e) {
            const coords = getCanvasCoordinates(canvas, e);
            startDrawingCommon(coords);
        }

        // 开始在浮动画布绘画 - 鼠标事件
        function startDrawingFloat(e) {
            const coords = getCanvasCoordinates(floatCanvas, e);
            startDrawingCommon(coords);
        }

        // 开始绘画 - 触摸事件
        function handleTouchStart(e) {
            // 防止触摸事件的默认行为（如页面滚动）
            e.preventDefault();
            
            // 只处理单点触摸
            if (e.touches.length !== 1) return;
            
            const coords = getCanvasCoordinates(canvas, e, true);
            startDrawingCommon(coords);
        }

        // 开始在浮动画布绘画 - 触摸事件
        function handleFloatTouchStart(e) {
            // 防止触摸事件的默认行为
            e.preventDefault();
            
            // 只处理单点触摸
            if (e.touches.length !== 1) return;
            
            const coords = getCanvasCoordinates(floatCanvas, e, true);
            startDrawingCommon(coords);
        }

        // 开始绘画的通用处理函数
        function startDrawingCommon(coords) {
            lastX = coords.x;
            lastY = coords.y;
            isDrawing = true;
            
            // 仅在非绘画模式下允许移动图片
            if (!isDrawingModeActive && sourceImage && 
                (isPointOnImage(coords.x, coords.y) && currentTool !== 'text')) {
                isDraggingImage = true;
                dragStartPos = { x: coords.x, y: coords.y };
                isDrawing = false;
                canvas.style.cursor = 'move';
                floatCanvas.style.cursor = 'move';
            }
            // 如果是文字工具，直接添加文字
            else if (currentTool === 'text') {
                addTextToCanvas(coords.x, coords.y);
                isDrawing = false;
            }
        }

        // 绘画中 - 鼠标事件
        function draw(e) {
            const coords = getCanvasCoordinates(canvas, e);
            drawCommon(coords);
        }

        // 在浮动画布绘画 - 鼠标事件
        function drawFloat(e) {
            const coords = getCanvasCoordinates(floatCanvas, e);
            drawCommon(coords);
        }

        // 绘画中 - 触摸事件
        function handleTouchMove(e) {
            // 防止触摸事件的默认行为
            e.preventDefault();
            
            // 只处理单点触摸
            if (e.touches.length !== 1) return;
            
            const coords = getCanvasCoordinates(canvas, e, true);
            drawCommon(coords);
        }

        // 在浮动画布绘画 - 触摸事件
        function handleFloatTouchMove(e) {
            // 防止触摸事件的默认行为
            e.preventDefault();
            
            // 只处理单点触摸
            if (e.touches.length !== 1) return;
            
            const coords = getCanvasCoordinates(floatCanvas, e, true);
            drawCommon(coords);
        }

        // 绘画的通用处理函数
        function drawCommon(coords) {
            if (isDraggingImage && !isDrawingModeActive) { // 仅在非绘画模式下允许拖动
                // 处理图片拖动
                const dx = coords.x - dragStartPos.x;
                const dy = coords.y - dragStartPos.y;
                
                imageOffset.x += dx;
                imageOffset.y += dy;
                dragStartPos = coords;
                
                redrawImageWithScaleAndOffset();
                return;
            }
            
            if (!isDrawing) return;
            
            drawOnCanvas(lastX, lastY, coords.x, coords.y);
            
            lastX = coords.x;
            lastY = coords.y;
            
            // 同步到浮动画布
            syncCanvases();
        }

        // 停止绘画 - 鼠标和触摸共用
        function stopDrawing() {
            isDrawing = false;
            if (isDraggingImage) {
                isDraggingImage = false;
                // 恢复光标
                updateCursorStyle();
            }
        }

        // 触摸结束事件处理
        function handleTouchEnd() {
            stopDrawing();
        }

        // 在画布上绘制
        function drawOnCanvas(x1, y1, x2, y2) {
            // 保存当前状态
            ctx.save();
            
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = brushSize;
            
            if (currentTool === 'pen') {
                // 画笔模式 - 使用选定颜色
                ctx.strokeStyle = brushColor;
            } else if (currentTool === 'eraser') {
                // 橡皮擦模式 - 白色
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = brushSize * 2; // 橡皮擦更大一些
            }
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            
            // 恢复状态
            ctx.restore();
        }

        // 添加文字到画布
        function addTextToCanvas(x, y) {
            const text = textInput.value || '请输入文字';
            const fontSize = parseInt(fontSizeInput.value);
            const fontFamily = fontFamilySelect.value;
            
            if (!text.trim()) return;
            
            // 保存当前状态
            ctx.save();
            
            // 设置字体，确保支持中文
            ctx.font = `${fontSize}px ${fontFamily}`;
            ctx.fillStyle = brushColor; // 使用当前画笔颜色
            ctx.textBaseline = 'top';
            ctx.fillText(text, x, y);
            
            // 恢复状态
            ctx.restore();
            
            // 同步到浮动画布
            syncCanvases();
            
            addLog(`已添加文字: "${text}"`);
        }

        // 手动添加文字按钮功能
        function addTextManually() {
            // 切换到文字工具
            setDrawingTool('text');
            
            // 如果有内容，在画布中心添加文字
            if (textInput.value.trim()) {
                const selectedSize = getSelectedCanvasSize();
                const centerX = selectedSize.width / 2;
                const centerY = selectedSize.height / 2;
                
                addTextToCanvas(centerX, centerY);
            } else {
                addLog("请先输入要添加的文字");
            }
        }

        // 清除画布
        function clearCanvas() {
            if (confirm('确定要清除画布内容吗？')) {
                // 保存当前状态
                ctx.save();
                
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // 恢复状态
                ctx.restore();
                
                // 同步到浮动画布
                syncCanvases();
                
                addLog("已清除画布内容");
            }
        }

        // 同步两个画布
        function syncCanvases() {
            // 从主画布同步到浮动画布
            floatCtx.clearRect(0, 0, floatCanvas.width, floatCanvas.height);
            floatCtx.drawImage(canvas, 0, 0);
        }

        // 更改图片缩放
        function changeImageScale(delta) {
            if (!sourceImage) return;
            
            imageScale = Math.max(0, Math.min(1000, imageScale + delta));
            imageScaleSlider.value = imageScale;
            updateImageScale();
        }

        // 更新图片缩放
        function updateImageScale() {
            if (!sourceImage) return;
            
            imageScale = parseInt(imageScaleSlider.value);
            imageScaleValue.textContent = `${imageScale}%`;
            
            // 重新绘制图片以应用新的缩放
            redrawImageWithScaleAndOffset();
        }

        // 按当前缩放和偏移重新绘制图片
        function redrawImageWithScaleAndOffset() {
            if (!sourceImage) return;
            
            // 先清除画布
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // 计算缩放后的图片尺寸
            const scale = imageScale / 100;
            let scaledWidth = sourceImage.width * scale;
            let scaledHeight = sourceImage.height * scale;
            
            // 保存当前状态并应用图片旋转
            ctx.save();
            ctx.translate(imageOffset.x + scaledWidth / 2, imageOffset.y + scaledHeight / 2);
            ctx.rotate((imageRotation * Math.PI) / 180);
            
            // 如果有旋转，需要调整绘制位置
            if (imageRotation % 180 !== 0) {
                [scaledWidth, scaledHeight] = [scaledHeight, scaledWidth];
            }
            
            // 绘制缩放后的图片
            ctx.drawImage(
                sourceImage, 
                -scaledWidth / 2, 
                -scaledHeight / 2, 
                scaledWidth, 
                scaledHeight
            );
            
            // 恢复状态
            ctx.restore();
            
            // 同步到浮动画布
            syncCanvases();
        }

        // 图片缩放到适合画布（保持比例）
        function fitImageToCanvas() {
            if (!sourceImage) return;
            
            const selectedSize = getSelectedCanvasSize();
            let canvasWidth = selectedSize.width;
            let canvasHeight = selectedSize.height;
            
            // 计算适应画布的缩放比例（保持图片比例）
            const scaleX = canvasWidth / sourceImage.width;
            const scaleY = canvasHeight / sourceImage.height;
            const scale = Math.min(scaleX, scaleY);
            
            // 设置缩放和居中
            imageScale = scale * 100;
            imageScaleSlider.value = imageScale;
            imageScaleValue.textContent = `${imageScale.toFixed(0)}%`;
            
            // 居中图片
            imageOffset.x = (canvasWidth - sourceImage.width * scale) / 2;
            imageOffset.y = (canvasHeight - sourceImage.height * scale) / 2;
            
            redrawImageWithScaleAndOffset();
            addLog("图片已适应画布大小");
        }

        // 图片铺满画布（不保持比例，完全填充）
        function fillCanvas() {
            if (!sourceImage) return;
            
            const selectedSize = getSelectedCanvasSize();
            let canvasWidth = selectedSize.width;
            let canvasHeight = selectedSize.height;
            
            // 计算铺满画布的缩放比例（不保持图片比例）
            const scaleX = canvasWidth / sourceImage.width;
            const scaleY = canvasHeight / sourceImage.height;
            
            // 设置缩放和位置（左上角对齐）
            imageScale = Math.max(scaleX, scaleY) * 100;
            imageScaleSlider.value = imageScale;
            imageScaleValue.textContent = `${imageScale.toFixed(0)}%`;
            
            // 左上角对齐
            imageOffset.x = 0;
            imageOffset.y = 0;
            
            redrawImageWithScaleAndOffset();
            addLog("图片已铺满画布");
        }

        // 图片居中显示
        function centerImageOnCanvas() {
            if (!sourceImage) return;
            
            const selectedSize = getSelectedCanvasSize();
            let canvasWidth = selectedSize.width;
            let canvasHeight = selectedSize.height;
            
            const scale = imageScale / 100;
            let scaledWidth = sourceImage.width * scale;
            let scaledHeight = sourceImage.height * scale;
            
            // 如果图片有旋转，交换宽高
            if (imageRotation % 180 !== 0) {
                [scaledWidth, scaledHeight] = [scaledHeight, scaledWidth];
            }
            
            // 居中图片
            imageOffset.x = (canvasWidth - scaledWidth) / 2;
            imageOffset.y = (canvasHeight - scaledHeight) / 2;
            
            redrawImageWithScaleAndOffset();
            addLog("图片已居中显示");
        }

        // 旋转图片（顺时针90度）
        function rotateImage(degrees) {
            if (!sourceImage) {
                addLog("请先上传图片");
                return;
            }
            
            imageRotation = (imageRotation + degrees) % 360;
            redrawImageWithScaleAndOffset();
            addLog(`图片已旋转至 ${imageRotation}°`);
        }

        // 调整图片尺寸
        function resizeImage(widthDelta, heightDelta) {
            if (!sourceImage || !originalImage) return;
            
            // 计算新尺寸，保持原始比例
            const aspectRatio = originalImage.width / originalImage.height;
            let newWidth = sourceImage.width + widthDelta;
            let newHeight = sourceImage.height + heightDelta;
            
            // 确保图片不会太小
            newWidth = Math.max(50, newWidth);
            newHeight = Math.max(50, newHeight);
            
            // 更新尺寸输入框
            imageWidthInput.value = Math.round(newWidth);
            imageHeightInput.value = Math.round(newHeight);
            
            // 创建新的图片对象
            const newImage = new Image();
            newImage.onload = function() {
                sourceImage = newImage;
                redrawImageWithScaleAndOffset();
                addLog(`图片尺寸已调整为: ${newWidth} × ${newHeight}`);
            };
            
            // 使用canvas重新绘制调整尺寸后的图片
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = newWidth;
            tempCanvas.height = newHeight;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(originalImage, 0, 0, newWidth, newHeight);
            newImage.src = tempCanvas.toDataURL();
        }

        // 应用图像尺寸设置
        function applyImageDimensions() {
            const width = parseInt(imageWidthInput.value);
            const height = parseInt(imageHeightInput.value);
            
            if (isNaN(width) || isNaN(height) || width < 50 || height < 50) {
                addLog("请输入有效的尺寸（最小50x50像素）");
                return;
            }
            
            // 创建新的图片对象
            if (originalImage) {
                const newImage = new Image();
                newImage.onload = function() {
                    sourceImage = newImage;
                    fitImageToCanvas(); // 自动适应新画布
                    addLog(`图像尺寸已设置为: ${width} × ${height}`);
                };
                
                // 使用canvas重新绘制调整尺寸后的图片
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = width;
                tempCanvas.height = height;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(originalImage, 0, 0, width, height);
                newImage.src = tempCanvas.toDataURL();
            } else {
                // 如果没有原始图片，仅更新输入框
                addLog(`图像尺寸已设置为: ${width} × ${height}`);
            }
        }

        // 处理图片上传
        function handleImageUpload(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            // 显示文件信息
            document.getElementById('fileInfo').textContent = `文件名: ${file.name} (${formatFileSize(file.size)})`;
            document.getElementById('fileInfo').classList.remove('hidden');
            
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    // 保存原始图片和处理后的图片
                    originalImage = new Image();
                    originalImage.src = img.src;
                    
                    sourceImage = new Image();
                    sourceImage.src = img.src;
                    
                    // 重置图片旋转
                    imageRotation = 0;
                    
                    // 更新图像尺寸输入框
                    imageWidthInput.value = img.width;
                    imageHeightInput.value = img.height;
                    
                    // 自动缩放到适合画布（铺满画布）
                    fitImageToCanvas();
                    
                    // 保存原始画布状态
                    saveOriginalCanvasState();
                    
                    // 更新信息
                    addLog(`已加载图片: ${file.name}`);
                    addLog(`图片原始尺寸: ${img.width} × ${img.height}`);
                    addLog("提示：按住Shift键拖动图片，或直接点击图片拖动");
                    
                    updateCanvasVisibility();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }

        // 保存原始画布状态（用于重置处理效果）
        function saveOriginalCanvasState() {
            const selectedSize = getSelectedCanvasSize();
            originalCanvasData = ctx.getImageData(0, 0, selectedSize.width, selectedSize.height);
        }

        // 清除日志
        function clearLog() {
            logContainer.innerHTML = '<div class="text-gray-500 italic">操作日志将显示在这里...</div>';
            addLog('日志已清除');
        }

       // 蓝牙连接相关函数
function preConnect() {
    if (gattServer != null && gattServer.connected) {
        if (bleDevice != null && bleDevice.gatt.connected) {
            addLog(`正在断开与 ${bleDevice.name || '未知设备'} 的连接...`);
            bleDevice.gatt.disconnect();
        }
    } else {
        resetBluetoothVariables();
        try {
            // 只请求名称以NRF开头的设备
              navigator.bluetooth.requestDevice({
        filters: [{
            namePrefix: 'NRF_'
        }],
        optionalServices: ['32120001-0bf6-448a-9608-1b01a1a8f75c']
    }).then(device => {
                addLog(`已选择设备: ${device.name || 'NRF设备(未知名称)'}`);
                bleDevice = device;
                // 监听断开连接事件
                bleDevice.addEventListener('gattserverdisconnected', disconnect);
                // 延迟连接，给系统一些处理时间
                setTimeout(() => connect(), 300);
            }).catch(error => {
                addLog(`蓝牙设备选择失败: ${error.message}`);
                if (error.name === 'NotFoundError') {
                    addLog('未找到NRF前缀的蓝牙设备，请确认设备已开启');
                }
            });
        } catch (e) {
            addLog(`蓝牙操作异常: ${e.message}`);
            addLog('请检查蓝牙是否已开启并授予权限');
        }
    }
}

async function connect() {
    // 验证设备状态
    if (!bleDevice) {
        addLog('连接失败: 未选择蓝牙设备');
        return;
    }
    
    if (epdCharacteristic) {
        addLog('已经连接到设备，无需重复连接');
        return;
    }

    try {
        addLog(`正在连接: ${bleDevice.name || 'NRF设备(未知名称)'}`);
        // 连接到GATT服务器
        gattServer = await bleDevice.gatt.connect();
        // 获取服务
        epdService = await gattServer.getPrimaryService('32120001-0bf6-448a-9608-1b01a1a8f75c');
        // 获取特征值 - 注意：修正了UUID中的数字错误（321200012应为32120002或正确的UUID）
        epdCharacteristic = await epdService.getCharacteristic('32120002-0bf6-448a-9608-1b01a1a8f75c');
        
        addLog('已成功连接到设备！');
        
        // 启动通知
        await epdCharacteristic.startNotifications();
        epdCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
            handleNotify(event.target.value);
        });
        
        // 初始化设备
        await write(EpdCmd.INIT);
        
        // 更新UI状态
        document.getElementById("connectbutton").innerHTML = '<i class="fa fa-unplug mr-1"></i>断开';
        updateButtonStatus();
        
    } catch (e) {
        addLog(`连接过程出错: ${e.message}`);
        // 确保断开连接以清理状态
        disconnect();
    }
}


        function disconnect() {
            if (bleDevice && bleDevice.gatt.connected) {
                bleDevice.gatt.disconnect();
            }
            resetBluetoothVariables();
            addLog('已断开连接');
            document.getElementById("connectbutton").innerHTML = '<i class="fa fa-plug mr-1"></i>连接';
            updateButtonStatus();
        }

        function resetBluetoothVariables() {
            gattServer = null;
            epdService = null;
            epdCharacteristic = null;
            msgIndex = 0;
        }

        async function write(cmd, data, withResponse = true) {
            if (!epdCharacteristic) {
                addLog("未连接蓝牙设备");
                return false;
            }
            
            let payload = [cmd];
            if (data) {
                if (typeof data == 'string') data = hex2bytes(data);
                if (data instanceof Uint8Array) data = Array.from(data);
                payload.push(...data);
            }
            
            try {
                if (withResponse)
                    await epdCharacteristic.writeValueWithResponse(Uint8Array.from(payload));
                else
                    await epdCharacteristic.writeValueWithoutResponse(Uint8Array.from(payload));
            } catch (e) {
                addLog(`发送失败: ${e.message}`);
                return false;
            }
            return true;
        }

        async function writeImage(data, step = 'bw') {
            const chunkSize = document.getElementById('mtusize').value - 2;
            const interleavedCount = document.getElementById('interleavedcount').value;
            const count = Math.ceil(data.length / chunkSize);
            let chunkIdx = 0;
            let noReplyCount = interleavedCount;

            // 针对122x250尺寸优化传输参数
            const selectedSize = getSelectedCanvasSize();
            if (selectedSize.name === '2.13_122_250') {
                // 对于小尺寸屏幕，减少交织计数以提高可靠性
                noReplyCount = Math.max(1, Math.floor(interleavedCount / 2));
            }

            for (let i = 0; i < data.length; i += chunkSize) {
                let currentTime = (new Date().getTime() - startTime) / 1000.0;
                setStatus(`${step == 'bw' ? '黑白' : '红色'}包: ${chunkIdx + 1}/${count}, 用时: ${currentTime.toFixed(1)}s`);
                const payload = [
                    (step == 'bw' ? 0x0F : 0x00) | (i == 0 ? 0x00 : 0xF0),0x00,
                    ...data.slice(i, i + chunkSize),
                ];
                
                if (noReplyCount > 0) {
                    await write(EpdCmd.WRITE_IMG, payload, false);
                    noReplyCount--;
                } else {
                    await write(EpdCmd.WRITE_IMG, payload, true);
                    noReplyCount = interleavedCount;
                    
                    // 针对122x250尺寸添加额外延迟，提高可靠性
                    if (selectedSize.name === '2.13_122_250') {
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                }
                chunkIdx++;
            }
        }

        // 下载处理后的图像文本文件
        function downloadImageFile() {
            if (!checkCanvasHasContent(canvas)) {
                addLog("请先上传或绘制图像并处理后再下载");
                return;
            }
            
            // 获取画布尺寸和旋转状态
            const selectedSize = getSelectedCanvasSize();
            const { width, height } = getEffectiveCanvasSize(selectedSize);
            
            // 获取处理后的图像数据（考虑旋转）
            const rotatedData = getRotatedImageData(canvas, selectedSize, imageRotation);
            
            // 处理图像数据
            const mode = ditherMode.value;
            const processedData = processImageData(rotatedData, mode, width, height);
            
            // 计算数据量信息
            const dataSize = processedData.length;
            const kiloBytes = (dataSize / 1024).toFixed(2);
            const pixels = width * height;
            
            // 将处理后的数据转换为文本格式
            const textData = processedData.map(byte => byte.toString(16).padStart(2, '0')).join(' ');
            
            // 创建Blob并下载
            const blob = new Blob([textData], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `e-paper-image-${new Date().getTime()}.txt`;
            document.body.appendChild(a);
            a.click();
            
            // 清理
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 0);
            
            addLog(`图像文本文件已下载 - 数据量: ${dataSize} 字节 (${kiloBytes} KB)，像素: ${pixels}`);
        }

        // 显示时间设置对话框
        function showTimeDialog() {
            if (!epdCharacteristic) {
                addLog("请先连接蓝牙设备！");
                return;
            }
            
            // 更新当前时间
            const now = new Date();
            const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16);
            datetimeInput.value = localDateTime;
            
            timeDialog.classList.remove('hidden');
        }
        
        // 隐藏时间设置对话框
        function hideTimeDialog() {
            timeDialog.classList.add('hidden');
        }
        
        // 设置时间到设备 - 使用32位时间戳格式
        async function setTime() {
            if (!epdCharacteristic) {
                addLog("请先连接蓝牙设备！");
                hideTimeDialog();
                return;
            }
            
            const datetime = datetimeInput.value;
            if (!datetime) {
                addLog("请选择日期和时间");
                return;
            }
            
            // 转换为Unix时间戳（秒）
            const date = new Date(datetime);
            const timestamp = Math.floor(date.getTime() / 1000); // 转换为秒
            
            // 将32位时间戳拆分为4个字节，符合接收端的格式：(p_data[1] << 24) | (p_data[2] << 16) | (p_data[3] << 8) | p_data[4]
            const timeData = [
                (timestamp >> 24) & 0xFF,  // 高8位
                (timestamp >> 16) & 0xFF,
                (timestamp >> 8) & 0xFF,
                timestamp & 0xFF           // 低8位
            ];
            
            try {
                setStatus("正在设置时间...");
                statusContainer.style.display = "block";
                
                // 发送设置时间命令和时间戳数据
                await write(EpdCmd.SET_TIME, timeData);
                addLog(`已设置时间: ${date.toLocaleString()}`);
                addLog(`时间戳: ${timestamp} (0x${timestamp.toString(16).toUpperCase()})`);
                
                setTimeout(() => {
                    statusContainer.style.display = 'none';
                }, 2000);
            } catch (error) {
                addLog(`设置时间失败: ${error.message}`);
            } finally {
                hideTimeDialog();
            }
        }
        
        // 设置时钟模式
        async function setClockMode() {
            if (!epdCharacteristic) {
                addLog("请先连接蓝牙设备！");
                return;
            }
            
            try {
                setStatus("正在切换到时钟模式...");
                statusContainer.style.display = "block";
                
                await write(EpdCmd.SET_MODE, [DisplayMode.CLOCK]);
                currentMode = 'clock';
                addLog("已切换到时钟模式");
                
                setTimeout(() => {
                    statusContainer.style.display = 'none';
                }, 2000);
            } catch (error) {
                addLog(`切换模式失败: ${error.message}`);
            }
        }
        
        // 设置日历模式
        async function setCalendarMode() {
            if (!epdCharacteristic) {
                addLog("请先连接蓝牙设备！");
                return;
            }
            
            try {
                setStatus("正在切换到日历模式...");
                statusContainer.style.display = "block";
                
                await write(EpdCmd.SET_MODE, [DisplayMode.CALENDAR]);
                currentMode = 'calendar';
                addLog("已切换到日历模式");
                
                setTimeout(() => {
                    statusContainer.style.display = 'none';
                }, 2000);
            } catch (error) {
                addLog(`切换模式失败: ${error.message}`);
            }
        }
        
        // 清空屏幕
        async function clearScreen() {
            if (!epdCharacteristic) {
                addLog("请先连接蓝牙设备！");
                return;
            }
            
            if (!confirm('确定要清空墨水屏显示内容吗？')) {
                return;
            }
            
            try {
                setStatus("正在清空屏幕...");
                statusContainer.style.display = "block";
                
                await write(EpdCmd.CLEAR);
                await write(EpdCmd.REFRESH);
                addLog("已清空墨水屏显示内容");
                
                setTimeout(() => {
                    statusContainer.style.display = 'none';
                }, 2000);
            } catch (error) {
                addLog(`清空屏幕失败: ${error.message}`);
            }
        }

        // 获取考虑旋转后的有效画布尺寸
        function getEffectiveCanvasSize(originalSize) {
            let width = originalSize.width;
            let height = originalSize.height;
            
            // 如果旋转了90或270度，交换宽高
            if (imageRotation % 180 !== 0) {
                [width, height] = [height, width];
            }
            
            return { width, height };
        }

        // 获取旋转后的图像数据
        function getRotatedImageData(canvas, originalSize, rotation) {
            // 创建临时画布用于旋转
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            
            // 设置临时画布尺寸
            const { width, height } = getEffectiveCanvasSize(originalSize);
            tempCanvas.width = width;
            tempCanvas.height = height;
            
            // 旋转并绘制图像
            tempCtx.save();
            
            // 根据旋转角度设置变换
            if (rotation === 90) {
                tempCtx.translate(width, 0);
                tempCtx.rotate(Math.PI / 2);
            } else if (rotation === 180) {
                tempCtx.translate(width, height);
                tempCtx.rotate(Math.PI);
            } else if (rotation === 270) {
                tempCtx.translate(0, height);
                tempCtx.rotate(3 * Math.PI / 2);
            }
            
            // 绘制原始图像
            tempCtx.drawImage(canvas, 0, 0);
            tempCtx.restore();
            
            // 返回旋转后的图像数据
            return tempCtx.getImageData(0, 0, width, height);
        }

        // 其他工具函数 (图片处理、日志等)
        function getDitherAlgorithmName(alg) {
            const names = {
                'floydSteinberg': 'Floyd-Steinberg',
                'atkinson': 'Atkinson',
                'bayer': 'Bayer',
                'stucki': 'Stucki',
                'jarvis': 'Jarvis-Judice-Ninke'
            };
            return names[alg] || alg;
        }

        function setDitherMode(mode) {
            ditherMode.value = mode;
            addLog(`已选择${mode === 'blackWhiteColor' ? '黑白' : '黑白红'}模式`);
        }

        function onDitherAlgChange(e) {
            currentParams.ditherAlg = e.target.value;
            addLog(`已选择${getDitherAlgorithmName(currentParams.ditherAlg)}抖动算法`);
        }

        function getSelectedCanvasSize() {
            const selectedSizeName = document.getElementById('canvasSize').value;
            return canvasSizes.find(size => size.name === selectedSizeName) || canvasSizes[1]; // 默认返回400x300
        }

        // 保存原始图像数据用于尺寸变更时恢复
        let originalImageData = null;
        
        function updateCanvasSize(keepContent = false) {
            const selectedSize = getSelectedCanvasSize();
            const hasContent = checkCanvasHasContent(canvas);
            
            // 更新图像尺寸输入框
            imageWidthInput.value = selectedSize.width;
            imageHeightInput.value = selectedSize.height;
            
            // 更新主画布和浮动画布尺寸
            canvas.width = selectedSize.width;
            canvas.height = selectedSize.height;
            floatCanvas.width = selectedSize.width;
            floatCanvas.height = selectedSize.height;
            
            // 如果需要保留内容
            if (keepContent && hasContent) {
                // 重新绘制内容（如果有原始数据）
                if (originalCanvasData) {
                    ctx.putImageData(originalCanvasData, 0, 0);
                }
            } else {
                // 清空画布
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, selectedSize.width, selectedSize.height);
            }
            
            // 同步到浮动画布
            syncCanvases();
            
            processedImageInfo.textContent = `${selectedSize.width} × ${selectedSize.height} 像素`;
            updateCanvasVisibility();
        }

        function updateDitcherOptions() {
            const epdDriverSelect = document.getElementById('epddriver');
            const selectedOption = epdDriverSelect.options[epdDriverSelect.selectedIndex];
            const colorMode = selectedOption.getAttribute('data-color');
            const canvasSize = selectedOption.getAttribute('data-size');
            
            if (colorMode) ditherMode.value = colorMode;
            if (canvasSize) {
                // 检查驱动推荐的尺寸是否在我们保留的三种尺寸中
                const sizeExists = canvasSizes.some(s => s.name === canvasSize);
                if (sizeExists) {
                    document.getElementById('canvasSize').value = canvasSize;
                }
            }
            
            updateCanvasSize(true); // 变更尺寸时保留内容
        }

        function processImage() {
            // 保存原始画布状态用于重置
            saveOriginalCanvasState();
            
            addLog(`开始处理图片，使用${getDitherAlgorithmName(currentParams.ditherAlg)}算法...`);
            
            // 获取画布尺寸
            const selectedSize = getSelectedCanvasSize();
            
            // 获取图像数据并应用处理
            let imageData = ctx.getImageData(0, 0, selectedSize.width, selectedSize.height);
            imageData = adjustImageParameters(imageData, currentParams);
            
            // 根据选择的模式处理图像
            const mode = ditherMode.value;
            let processedResult;
            
            if (mode === 'blackWhiteColor') {
                processedResult = convertToBlackWhite(imageData, currentParams);
            } else if (mode === 'threeColor') {
                processedResult = convertToBlackWhiteRed(imageData, currentParams);
            }
            
            // 显示处理后的图像
            ctx.putImageData(processedResult.imageData, 0, 0);
            
            // 同步到浮动画布
            syncCanvases();
            
            processedImageInfo.textContent = `${selectedSize.width} × ${selectedSize.height} 像素 (${mode === 'blackWhiteColor' ? '黑白' : '黑白红'})`;
            addLog(`图片处理完成`);
            
            updateCanvasVisibility();
        }

        async function sendimg() {
            if (!epdCharacteristic) {
                addLog("请先连接蓝牙设备！");
                return;
            }

            const canvasSize = document.getElementById('canvasSize').value;
            const ditherMode = document.getElementById('ditherMode').value;
            const epdDriverSelect = document.getElementById('epddriver');
            const selectedOption = epdDriverSelect.options[epdDriverSelect.selectedIndex];

            // 检查画布尺寸和驱动是否匹配
            if (selectedOption.getAttribute('data-size') !== canvasSize) {
                if (!confirm("警告：画布尺寸和驱动不匹配，是否继续？")) return;
            }
            
            startTime = new Date().getTime();
            setStatus("正在传输图片...");
            statusContainer.style.display = "block";
            addLog("开始传输原始画布数据到墨水屏...");

            // 获取画布尺寸和旋转状态
            const selectedSize = getSelectedCanvasSize();
            const { width, height } = getEffectiveCanvasSize(selectedSize);
            
            // 获取旋转后的图像数据
            const rotatedData = getRotatedImageData(canvas, selectedSize, imageRotation);
            
            // 处理图像数据（考虑旋转）
            const processedData = processImageData(rotatedData, ditherMode, width, height);

            updateButtonStatus(true);

            try {
                // 移除发送前的清屏操作，解决全屏红色问题
                
                // 先切换到图像模式
                await write(EpdCmd.SET_MODE, [DisplayMode.IMAGE]);
                currentMode = 'image';
                
                if (ditherMode === 'threeColor') {
                    const halfLength = Math.floor(processedData.length / 2);
                    await writeImage(processedData.slice(0, halfLength), 'bw');
                    await writeImage(processedData.slice(halfLength), 'red');
                } else if (ditherMode === 'blackWhiteColor') {
                    await writeImage(processedData, 'bw');
                } else {
                    addLog("当前设备不支持此颜色模式");
                    updateButtonStatus();
                    return;
                }
                
                await write(EpdCmd.REFRESH);
                
                // // 针对122x250尺寸增加刷新后的延迟
                // if (selectedSize.name === '2.13_122_250') {
                //     await new Promise(resolve => setTimeout(resolve, 2000));
                // }
                
                // 传输成功
                const endTime = new Date().getTime();
                const duration = ((endTime - startTime) / 1000).toFixed(2);
                setStatus(`传输成功！耗时 ${duration} 秒`);
                addLog(`原始画布数据传输成功！耗时 ${duration} 秒`);
                addLog("请等待屏幕刷新完成");
            } catch (error) {
                setStatus("传输失败");
                addLog(`传输失败: ${error.message}`);
            } finally {
                updateButtonStatus(false);
                setTimeout(() => {
                    statusContainer.style.display = 'none';
                }, 5000);
            }
        }

        // 工具函数实现
        function adjustImageParameters(imageData, params) {
            const data = imageData.data;
            const saturation = params.saturation / 100;
            const brightness = params.brightness / 100;
            const contrast = params.contrast / 100;
            const diffusion = params.diffusion / 100;
            const contrastFactor = contrast !== 0 ? (259 * (contrast + 255)) / (255 * (259 - contrast)) : 1;
            
            // 先复制原始数据，用于扩散计算
            const originalData = new Uint8ClampedArray(data);
            
            for (let i = 0; i < data.length; i += 4) {
                // 亮度调整
                let r = Math.min(255, Math.max(0, originalData[i] * brightness));
                let g = Math.min(255, Math.max(0, originalData[i+1] * brightness));
                let b = Math.min(255, Math.max(0, originalData[i+2] * brightness));
                
                // 对比度调整
                r = Math.min(255, Math.max(0, contrastFactor * (r - 128) + 128));
                g = Math.min(255, Math.max(0, contrastFactor * (g - 128) + 128));
                b = Math.min(255, Math.max(0, contrastFactor * (b - 128) + 128));
                
                // 饱和度调整
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                r = Math.min(255, Math.max(0, gray + saturation * (r - gray)));
                g = Math.min(255, Math.max(0, gray + saturation * (g - gray)));
                b = Math.min(255, Math.max(0, gray + saturation * (b - gray)));
                
                // 应用扩散效果
                if (diffusion > 0) {
                    const width = imageData.width;
                    const x = (i / 4) % width;
                    const y = Math.floor((i / 4) / width);
                    
                    // 简单的高斯模糊近似
                    if (x > 0 && y > 0) {
                        const neighborIndex = i - 4 * (width + 1);
                        r = Math.floor(r * (1 - diffusion) + originalData[neighborIndex] * diffusion);
                        g = Math.floor(g * (1 - diffusion) + originalData[neighborIndex + 1] * diffusion);
                        b = Math.floor(b * (1 - diffusion) + originalData[neighborIndex + 2] * diffusion);
                    }
                }
                
                data[i] = r;
                data[i+1] = g;
                data[i+2] = b;
            }
            
            return imageData;
        }

        function convertToBlackWhite(imageData, params) {
            const width = imageData.width;
            const height = imageData.height;
            const newImageData = ctx.createImageData(width, height);
            newImageData.data.set(imageData.data);
            
            applyDitheringAlgorithm(newImageData, 128, params);
            return { imageData: newImageData };
        }

        function convertToBlackWhiteRed(imageData, params) {
            const width = imageData.width;
            const height = imageData.height;
            const newImageData = ctx.createImageData(width, height);
            newImageData.data.set(imageData.data);
            const data = newImageData.data;
            
            // 改进的红色区域检测算法，解决红色显示异常问题
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i+1];
                const b = data[i+2];
                
                // 提高红色检测阈值，确保只有明显的红色才会被识别
                if (r > 180 && g < r * 0.6 && b < r * 0.6) {
                    data[i+3] = 1; // 标记为红色
                } else {
                    // 转换为灰度
                    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                    data[i] = gray;
                    data[i+1] = gray;
                    data[i+2] = gray;
                    data[i+3] = 0; // 标记为黑白区域
                }
            }
            
            // 对黑白区域应用抖动
            applyDitheringAlgorithm(newImageData, 100, params, true);
            
            // 最终颜色转换
            for (let i = 0; i < data.length; i += 4) {
                if (data[i+3] === 1) {
                    data[i] = 255; data[i+1] = 0; data[i+2] = 0; // 红色
                } else {
                    const color = data[i] > 100 ? 255 : 0;
                    data[i] = data[i+1] = data[i+2] = color;
                }
                data[i+3] = 255;
            }
            
            return { imageData: newImageData };
        }

        function applyDitheringAlgorithm(imageData, threshold, params, useAlphaMask = false) {
            const data = imageData.data;
            const width = imageData.width;
            const height = imageData.height;
            const algorithm = params.ditherAlg;
            const diffusion = params.diffusion / 100;
            
            // 复制原始数据用于处理
            const pixels = new Uint8ClampedArray(data);
            
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const index = (y * width + x) * 4;
                    
                    // 如果使用alpha掩码且是红色区域，则跳过处理
                    if (useAlphaMask && pixels[index + 3] === 1) {
                        continue;
                    }
                    
                    // 获取灰度值
                    const gray = pixels[index]; // 已经在convertToBlackWhiteRed中转换为灰度
                    
                    // 确定输出颜色（黑或白）
                    const output = gray < threshold ? 0 : 255;
                    const error = gray - output;
                    
                    // 根据扩散参数调整误差传播强度
                    const errorScaling = 1 + diffusion;
                    
                    // 应用抖动算法扩散误差
                    switch (algorithm) {
                        case 'floydSteinberg':
                            // Floyd-Steinberg抖动算法
                            propagateError(pixels, x, y, width, height, error * errorScaling, 7/16, 1, 0);
                            propagateError(pixels, x, y, width, height, error * errorScaling, 3/16, -1, 1);
                            propagateError(pixels, x, y, width, height, error * errorScaling, 5/16, 0, 1);
                            propagateError(pixels, x, y, width, height, error * errorScaling, 1/16, 1, 1);
                            break;
                            
                        case 'atkinson':
                            // Atkinson抖动算法
                            propagateError(pixels, x, y, width, height, error * errorScaling, 1/8, 1, 0);
                            propagateError(pixels, x, y, width, height, error * errorScaling, 1/8, 2, 0);
                            propagateError(pixels, x, y, width, height, error * errorScaling, 1/8, -1, 1);
                            propagateError(pixels, x, y, width, height, error * errorScaling, 1/8, 0, 1);
                            propagateError(pixels, x, y, width, height, error * errorScaling, 1/8, 1, 1);
                            propagateError(pixels, x, y, width, height, error * errorScaling, 1/8, 0, 2);
                            break;
                            
                        default:
                            // 默认使用简单阈值
                            break;
                    }
                    
                    // 设置输出像素值
                    data[index] = output;
                    data[index + 1] = output;
                    data[index + 2] = output;
                }
            }
        }

        // 误差扩散辅助函数
        function propagateError(pixels, x, y, width, height, error, factor, dx, dy) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const index = (ny * width + nx) * 4;
                pixels[index] = Math.max(0, Math.min(255, pixels[index] + error * factor));
            }
        }

       function processImageData(imageData, mode) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  let processedData;

  if (mode === 'sixColor') {
    processedData = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];

        const closest = findClosestColor(r, g, b, mode);
        const newIndex = (x * height) + (height - 1 - y);
        processedData[newIndex] = closest.value;
      }
    }
  } else if (mode === 'fourColor') {
    processedData = new Uint8Array(Math.ceil((width * height) / 4));
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const closest = findClosestColor(r, g, b, mode); // 使用 fourColorPalette
        const colorValue = closest.value; // 0x00 (黑), 0x01 (白), 0x02 (红), 0x03 (黄)
        const newIndex = (y * width + x) / 4 | 0;
        const shift = 6 - ((x % 4) * 2);
        processedData[newIndex] |= (colorValue << shift);
      }
    }
  } else if (mode === 'blackWhiteColor') {
    const byteWidth = Math.ceil(width / 8);
    processedData = new Uint8Array(byteWidth * height);
    const threshold = 140;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const grayscale = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        const bit = grayscale >= threshold ? 1 : 0;
        const byteIndex = y * byteWidth + Math.floor(x / 8);
        const bitIndex = 7 - (x % 8);
        processedData[byteIndex] |= (bit << bitIndex);
      }
    }
  } else if (mode === 'threeColor') {
    const byteWidth = Math.ceil(width / 8);
    const blackWhiteThreshold = 140;
    const redThreshold = 160;

    const blackWhiteData = new Uint8Array(height * byteWidth);
    const redWhiteData = new Uint8Array(height * byteWidth);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const grayscale = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

        const blackWhiteBit = grayscale >= blackWhiteThreshold ? 1 : 0;
        const blackWhiteByteIndex = y * byteWidth + Math.floor(x / 8);
        const blackWhiteBitIndex = 7 - (x % 8);
        if (blackWhiteBit) {
          blackWhiteData[blackWhiteByteIndex] |= (0x01 << blackWhiteBitIndex);
        } else {
          blackWhiteData[blackWhiteByteIndex] &= ~(0x01 << blackWhiteBitIndex);
        }

        const redWhiteBit = (r > redThreshold && r > g && r > b) ? 0 : 1;
        const redWhiteByteIndex = y * byteWidth + Math.floor(x / 8);
        const redWhiteBitIndex = 7 - (x % 8);
        if (redWhiteBit) {
          redWhiteData[redWhiteByteIndex] |= (0x01 << redWhiteBitIndex);
        } else {
          redWhiteData[redWhiteByteIndex] &= ~(0x01 << redWhiteBitIndex);
        }
      }
    }

    processedData = new Uint8Array(blackWhiteData.length + redWhiteData.length);
    processedData.set(blackWhiteData, 0);
    processedData.set(redWhiteData, blackWhiteData.length);
  }

  return processedData;
}

        function toggleCanvas() {
            if (floatingCanvasContainer.classList.contains('hidden')) {
                floatingCanvasContainer.classList.remove('hidden');
                toggleCanvasFloat.innerHTML = '<i class="fa fa-compress mr-1"></i>隐藏画布';
                addLog("已显示浮动画布");
            } else {
                hideCanvas();
            }
        }

        function hideCanvas() {
            floatingCanvasContainer.classList.add('hidden');
            toggleCanvasFloat.innerHTML = '<i class="fa fa-arrows-alt mr-1"></i>浮动画布';
            addLog("已隐藏浮动画布");
        }

        function updateCanvasVisibility() {
            // 检查画布是否有内容
            const hasContent = checkCanvasHasContent(canvas);
            
            if (hasContent) {
                noImagePlaceholder.classList.add('hidden');
                canvas.classList.remove('hidden');
                floatPreviewCanvas.classList.remove('hidden');
            } else {
                noImagePlaceholder.classList.remove('hidden');
                canvas.classList.add('hidden');
                floatPreviewCanvas.classList.add('hidden');
            }
        }

        // 检查画布是否有内容
        function checkCanvasHasContent(canvasEl) {
            const ctx = canvasEl.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
            const data = imageData.data;
            
            // 检查是否全为白色
            for (let i = 0; i < data.length; i += 4) {
                if (data[i] !== 255 || data[i+1] !== 255 || data[i+2] !== 255) {
                    return true; // 有非白色内容
                }
            }
            return false;
        }

        function startDrag(e) {
            isDragging = true;
            const rect = floatingCanvasContainer.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
        }

        function drag(e) {
            if (!isDragging) return;
            e.preventDefault();
            
            const newX = e.clientX - dragOffset.x;
            const newY = e.clientY - dragOffset.y;
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const canvasWidth = floatingCanvasContainer.offsetWidth;
            const canvasHeight = floatingCanvasContainer.offsetHeight;
            
            // 限制在窗口内
            const boundedX = Math.max(0, Math.min(newX, windowWidth - canvasWidth));
            const boundedY = Math.max(0, Math.min(newY, windowHeight - canvasHeight));
            
            floatingCanvasContainer.style.left = `${boundedX}px`;
            floatingCanvasContainer.style.top = `${boundedY}px`;
        }

        function stopDrag() {
            isDragging = false;
        }

        function startResize(e) {
            isResizing = true;
            e.preventDefault();
        }

        function resize(e) {
            if (!isResizing) return;
            e.preventDefault();
            
            const containerRect = floatingCanvasContainer.getBoundingClientRect();
            const newWidth = e.clientX - containerRect.left;
            const newHeight = e.clientY - containerRect.top;
            
            // 设置最小尺寸限制
            if (newWidth > 200 && newHeight > 150) {
                floatingCanvasContainer.style.width = `${newWidth}px`;
                floatingCanvasContainer.style.height = `${newHeight}px`;
            }
        }

        function stopResize() {
            isResizing = false;
        }

        // 重置处理效果（保留原始图片和设置）
        function resetProcessing() {
            if (originalCanvasData) {
                // 恢复原始画布数据
                ctx.putImageData(originalCanvasData, 0, 0);
                
                // 同步到浮动画布
                syncCanvases();
                
                // 更新信息
                const selectedSize = getSelectedCanvasSize();
                processedImageInfo.textContent = `${selectedSize.width} × ${selectedSize.height} 像素`;
                
                addLog("已重置处理效果，保留原始图片和设置");
            } else {
                // 如果没有处理过的内容，清空画布
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                syncCanvases();
                addLog("已清空画布，保留设置和图片");
            }
        }

        function addLog(message) {
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = document.createElement('div');
            logEntry.className = 'mb-1 border-b border-gray-100 pb-1 last:border-0 last:mb-0 last:pb-0';
            logEntry.innerHTML = `<span class="text-gray-500">[${timestamp}]</span> <span class="text-gray-800">${message}</span>`;
            
            if (logContainer.querySelector('.italic')) {
                logContainer.innerHTML = '';
            }
            
            logContainer.appendChild(logEntry);
            logContainer.scrollTop = logContainer.scrollHeight;
            
            // 限制日志数量
            while (logContainer.childNodes.length > 30) {
                logContainer.removeChild(logContainer.firstChild);
            }
        }

        function setStatus(statusText) {
            document.getElementById("status").textContent = statusText;
        }

        function updateButtonStatus(disabled = false) {
            const connected = gattServer != null && gattServer.connected;
            const isDisabled = disabled || !connected;
            
            btnSend.disabled = isDisabled;
            btnSetTime.disabled = isDisabled;
            btnClockMode.disabled = isDisabled;
            btnCalendarMode.disabled = isDisabled;
            btnClearScreen.disabled = isDisabled;
            
            if (isDisabled) {
                btnSend.classList.add('opacity-50', 'cursor-not-allowed');
                btnSetTime.classList.add('opacity-50', 'cursor-not-allowed');
                btnClockMode.classList.add('opacity-50', 'cursor-not-allowed');
                btnCalendarMode.classList.add('opacity-50', 'cursor-not-allowed');
                btnClearScreen.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                btnSend.classList.remove('opacity-50', 'cursor-not-allowed');
                btnSetTime.classList.remove('opacity-50', 'cursor-not-allowed');
                btnClockMode.classList.remove('opacity-50', 'cursor-not-allowed');
                btnCalendarMode.classList.remove('opacity-50', 'cursor-not-allowed');
                btnClearScreen.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }

        // 以下是修复缺失的函数
        function reConnect() {
            // 重连逻辑
            addLog("尝试重新连接设备...");
            preConnect();
        }

        function handleNotify(value) {
            // 处理蓝牙通知
            console.log("收到通知:", value);
        }

        function hex2bytes(hex) {
            // 十六进制字符串转字节数组
            const bytes = [];
            for (let i = 0; i < hex.length; i += 2) {
                bytes.push(parseInt(hex.substr(i, 2), 16));
            }
            return bytes;
        }

        function formatFileSize(bytes) {
            // 格式化文件大小
            if (bytes < 1024) return bytes + " B";
            else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + " KB";
            else return (bytes / 1048576).toFixed(2) + " MB";
        }
async function set_EPD_CMD_J_H() {//激活
 
  await write(EpdCmd.EPD_CMD_J_H, document.getElementById("epdpins").value);
}

async function set_EPD_CMD_N_Z() {//闹钟
  const hour = document.getElementById('N_Z_hour').value;
  const min = document.getElementById('N_Z_min').value;
   const N_Z_start = document.getElementById('N_Z_start').value;
  const bytes=[4];
  bytes[0]=0;bytes[1]=0;bytes[2]=hour;bytes[3]=min;bytes[4]=N_Z_start;

  await write(EpdCmd.EPD_CMD_N_Z, bytes);
}
async function set_EPD_CMD_D_S() {//定时
  const hour = document.getElementById('D_S_hour').value;
  const min = document.getElementById('D_S_min').value;
   const D_S_start = document.getElementById('D_S_start').value;
  const bytes=[4];
  bytes[0]=0;bytes[1]=0;bytes[2]=hour;bytes[3]=min;bytes[4]=D_S_start;

  await write(EpdCmd.EPD_CMD_D_S, bytes);
}

async function set_EPD_CMD_J_S() {//倒计时
  const hour = document.getElementById('J_S_hour').value;
  const min = document.getElementById('J_S_min').value;
  const J_S_start = document.getElementById('J_S_start').value;
  const bytes=[4];
  bytes[0]=0;bytes[1]=0;bytes[2]=hour;bytes[3]=min;bytes[4]=J_S_start;

  await write(EpdCmd.EPD_CMD_J_S, bytes);
}


async function set_EPD_CMD_LED() {//设置LED
  const color_led = document.getElementById('color_led').value;
  const liang_time = document.getElementById('liang_time').value;
  const  liang_add= document.getElementById('liang_add').value;
  const  liangdu= document.getElementById('liangdu').value;
const   liang_s=document.getElementById('liang_s').value;
  const bytes=[5];
  bytes[0]=color_led;bytes[1]=liang_time;bytes[2]=liang_add;bytes[3]=liangdu;bytes[4]=liang_s;

  await write(EpdCmd.EPD_CMD_LED, bytes);
}

async function set_EPD_CMD_LED1() {//设置四连LED
  const color_led = document.getElementById('color_led').value;
  const liang_time = document.getElementById('liang_time').value;
  const  liang_add= document.getElementById('liang_add').value;
  const  liangdu= document.getElementById('liangdu').value;
const   liang_s=document.getElementById('liang_s').value;
  const bytes=[5];
  bytes[0]=color_led;bytes[1]=liang_time;bytes[2]=liang_add;bytes[3]=liangdu;bytes[4]=liang_s;

  await write(EpdCmd.EPD_CMD_4_LED, bytes);
}


async function set_EPD_CMD_MY() {//设置我的设置
  const fanxian = document.getElementById('fanxian').value;
  const xuanzhuan = document.getElementById('xuanzhuan').value;
  const  qiangzhi_shuaxing= document.getElementById('qiangzhi_shuaxing').value;
  const  jushua_time= document.getElementById('jushua_time').value;
  const bytes=[4];
  bytes[0]=fanxian;bytes[1]=xuanzhuan;bytes[2]=qiangzhi_shuaxing;bytes[3]=jushua_time;

  await write(EpdCmd.EPD_CMD_MY, bytes);
}

async function set_EPD_CMD_COLOR() {//设置时钟模块颜色
  const color_1 = document.getElementById('color_1').value;
  const time_color = document.getElementById('time_color').value;
  const  wendu_color= document.getElementById('wendu_color').value;
  const  gongli_color= document.getElementById('gongli_color').value;

  const  shichen_color= document.getElementById('shichen_color').value;
   const  jieqi_color= document.getElementById('jieqi_color').value;
    const  r_jushua_time= document.getElementById('r_jushua_time').value;
  const bytes=[7];
  bytes[0]= color_1;bytes[1]=time_color;bytes[2]=wendu_color;bytes[3]=gongli_color;
bytes[4]=shichen_color;bytes[5]=jieqi_color;bytes[6]=r_jushua_time;
  await write(EpdCmd.EPD_CMD_COLOR, bytes);
}
 

async function set_EPD_CMD_4_MS() {//设置四连
  const fanxian = document.getElementById('fanxian1').value;
  const xuanzhuan = document.getElementById('xuanzhuan1').value;
  const  jushua_time= document.getElementById('jushua_time1').value;
  const xianshi_peizhi= document.getElementById('xianshi_peizhi').value;
 const  moshi_id= document.getElementById('moshi_id').value;


 const color_11=document.getElementById('color_11').value;
 const silian_ziti=document.getElementById('silian_ziti').value;

  const bytes=[7];
  bytes[0]=fanxian;bytes[1]=xuanzhuan;bytes[2]=jushua_time;
  bytes[3]=xianshi_peizhi;bytes[4]=moshi_id;bytes[5]=color_11;bytes[6]=silian_ziti
  await write(EpdCmd.EPD_CMD_4_MS, bytes);

}

async function syncTime(mode) {

  const timestamp = new Date().getTime() / 1000;
  const data = new Uint8Array([
    (timestamp >> 24) & 0xFF,
    (timestamp >> 16) & 0xFF,
    (timestamp >> 8) & 0xFF,
    timestamp & 0xFF,
    -(new Date().getTimezoneOffset() / 60),
    mode
  ]);
  if (await write(EpdCmd.SET_TIME, data)) {
    addLog("已同步时间！");
  
  }
}


async function set_EPD_CMD_4_ZF(mode) {//设置主副机
  const bytes=[1];
  bytes[0]=mode;
  await write(EpdCmd.EPD_CMD_4_ZF, bytes);
  if (mode==0) {
    syncTime(2);
    addLog("主机已同步时间！");
   
  }
  
}
        // 初始化页面
        window.onload = init;
