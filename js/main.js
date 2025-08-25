let bleDevice, gattServer;
let epdService, epdCharacteristic;
let startTime, msgIndex, appVersion;
let canvas, ctx, textDecoder;

const EpdCmd = {
  SET_PINS:  0x00,
  INIT:      0x01,
  CLEAR:     0x02,
  SEND_CMD:  0x03,
  SEND_DATA: 0x04,
  REFRESH:   0x05,
  SLEEP:     0x06,

  SET_TIME:  0x20,

  WRITE_IMG: 0x30, // v1.6

  SET_CONFIG: 0x90,
  SYS_RESET:  0x91,
  SYS_SLEEP:  0x92,
  CFG_ERASE:  0x99,


  EPD_CMD_J_H   : 0xFF,                        /**激活参数 */
	
	EPD_CMD_N_Z  : 0xEF,                        /**每天闹钟 */
	
	EPD_CMD_J_S   : 0xEE,                        /**倒计时 */
	
	EPD_CMD_D_S:0xED,                        /**定时一次 */
	EPD_CMD_LED: 0xEC ,//LED设置


  EPD_CMD_MY    :0xEB ,									//MY设置
	
		EPD_CMD_COLOR    :0xEA ,									//时钟模式红色设置设置
	

EPD_CMD_4_MS    :0xFE,                        /**四连显示模式 */
	EPD_CMD_4_C0LOR    : 0xFD,                        /**四连显示颜色 */
	EPD_CMD_4_XZ     :0xFC,                        /**四连旋转 */
	EPD_CMD_4_ZF    : 0xFB,                        /**四连主副机 */
};

const canvasSizes = [
  { name: '1.54_152_152', width: 152, height: 152 },
  { name: '1.54_200_200', width: 200, height: 200 },
  { name: '2.13_212_104', width: 212, height: 104 },
  { name: '2.13_250_122', width: 250, height: 122 },
  { name: '2.66_296_152', width: 296, height: 152 },
  { name: '2.9_296_128', width: 296, height: 128 },
  { name: '2.9_384_168', width: 384, height: 168 },
  { name: '3.5_384_184', width: 384, height: 184 },
  { name: '3.7_416_240', width: 416, height: 240 },
  { name: '3.97_800_480', width: 800, height: 480 },
  { name: '4.2_400_300', width: 400, height: 300 },
  { name: '5.79_792_272', width: 792, height: 272 },
  { name: '7.5_800_480', width: 800, height: 480 },
  { name: '10.2_960_640', width: 960, height: 640 },
  { name: '10.85_1360_480', width: 1360, height: 480 },
  { name: '11.6_960_640', width: 960, height: 640 },
  { name: '4E_600_400', width: 600, height: 400 },
  { name: '7.3E6', width: 480, height: 800 }
];

function hex2bytes(hex) {
  for (var bytes = [], c = 0; c < hex.length; c += 2)
    bytes.push(parseInt(hex.substr(c, 2), 16));
  return new Uint8Array(bytes);
}

function bytes2hex(data) {
  return new Uint8Array(data).reduce(
    function (memo, i) {
      return memo + ("0" + i.toString(16)).slice(-2);
    }, "");
}

function intToHex(intIn) {
  let stringOut = ("0000" + intIn.toString(16)).substr(-4)
  return stringOut.substring(2, 4) + stringOut.substring(0, 2);
}

function resetVariables() {
  gattServer = null;
  epdService = null;
  epdCharacteristic = null;
  msgIndex = 0;
  document.getElementById("log").value = '';
}

async function write(cmd, data, withResponse = true) {
  if (!epdCharacteristic) {
    addLog("服务不可用，请检查蓝牙连接");
    return false;
  }
  let payload = [cmd];
  if (data) {
    if (typeof data == 'string') data = hex2bytes(data);
    if (data instanceof Uint8Array) data = Array.from(data);
    payload.push(...data)
  }
  addLog(bytes2hex(payload), '⇑');
  try {
    if (withResponse)
      await epdCharacteristic.writeValueWithResponse(Uint8Array.from(payload));
    else
      await epdCharacteristic.writeValueWithoutResponse(Uint8Array.from(payload));
  } catch (e) {
    console.error(e);
    if (e.message) addLog("write: " + e.message);
    return false;
  }
  return true;
}

async function writeImage(data, step = 'bw') {
  const chunkSize = document.getElementById('mtusize').value - 2;
  const interleavedCount = document.getElementById('interleavedcount').value;
  const count = Math.round(data.length / chunkSize);
  let chunkIdx = 0;
  let noReplyCount = interleavedCount;

  for (let i = 0; i < data.length; i += chunkSize) {
    let currentTime = (new Date().getTime() - startTime) / 1000.0;
    setStatus(`${step == 'bw' ? '黑白' : '颜色'}块: ${chunkIdx + 1}/${count + 1}, 总用时: ${currentTime}s`);
    const payload = [
      (step == 'bw' ? 0x0F : 0x00) | (i == 0 ? 0x00 : 0xF0),
      ...data.slice(i, i + chunkSize),
    ];
    if (noReplyCount > 0) {
      await write(EpdCmd.WRITE_IMG, payload, false);
      noReplyCount--;
    } else {
      await write(EpdCmd.WRITE_IMG, payload, true);
      noReplyCount = interleavedCount;
    }
    chunkIdx++;
  }
}

async function setDriver() {
  await write(EpdCmd.SET_PINS, document.getElementById("epdpins").value);
  await write(EpdCmd.INIT, document.getElementById("epddriver").value);
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
const   liang_s=document.getElementById('liangdu').value;
  const bytes=[5];
  bytes[0]=color_led;bytes[1]=liang_time;bytes[2]=liang_add;bytes[3]=liangdu;bytes[4]=liang_s;

  await write(EpdCmd.EPD_CMD_LED, bytes);
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
    addLog("时间已同步！");
    addLog("屏幕刷新完成前请不要操作。");
  }
}

async function clearScreen() {
  if (confirm('确认清除屏幕内容?')) {
    await write(EpdCmd.CLEAR);
    addLog("清屏指令已发送！");
    addLog("屏幕刷新完成前请不要操作。");
  }
}

async function sendcmd() {
  const cmdTXT = document.getElementById('cmdTXT').value;
  if (cmdTXT == '') return;
  const bytes = hex2bytes(cmdTXT);
  await write(bytes[0], bytes.length > 1 ? bytes.slice(1) : null);
}

async function sendimg() {


  const canvasSize = document.getElementById('canvasSize').value;
  const ditherMode = document.getElementById('ditherMode').value;
  const epdDriverSelect = document.getElementById('epddriver');
  const selectedOption = epdDriverSelect.options[epdDriverSelect.selectedIndex];

  if (selectedOption.getAttribute('data-size') !== canvasSize) {
    if (!confirm("警告：画布尺寸和驱动不匹配，是否继续？")) return;
  }
  if (selectedOption.getAttribute('data-color') !== ditherMode) {
    if (!confirm("警告：颜色模式和驱动不匹配，是否继续？")) return;
  }

  startTime = new Date().getTime();
  const status = document.getElementById("status");
  status.parentElement.style.display = "block";

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const processedData = processImageData(imageData, ditherMode);

  updateButtonStatus(true);

  if (ditherMode === 'fourColor') {
    await writeImage(processedData, 'color');
  } else if (ditherMode === 'threeColor') {
    const halfLength = Math.floor(processedData.length / 2);
    await writeImage(processedData.slice(0, halfLength), 'bw');
    await writeImage(processedData.slice(halfLength), 'red');
  } else if (ditherMode === 'blackWhiteColor') {
    await writeImage(processedData, 'bw');
  } else {
    addLog("当前固件不支持此颜色模式。");
    updateButtonStatus();
    return;
  }

  await write(EpdCmd.REFRESH);
  updateButtonStatus();

  const sendTime = (new Date().getTime() - startTime) / 1000.0;
  addLog(`发送完成！耗时: ${sendTime}s`);
  setStatus(`发送完成！耗时: ${sendTime}s`);
  addLog("屏幕刷新完成前请不要操作。");
  setTimeout(() => {
    status.parentElement.style.display = "none";
  }, 5000);
}

function downloadDataArray() {
  if (isCropMode()) {
    addLog("请先完成图片裁剪！下载已取消。");
    return;
  }

  const mode = document.getElementById('ditherMode').value;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const processedData = processImageData(imageData, mode);

  if (mode === 'sixColor' && processedData.length !== canvas.width * canvas.height) {
    console.log(`错误：预期${canvas.width * canvas.height}字节，但得到${processedData.length}字节`);
    addLog('数组大小不匹配。请检查图像尺寸和模式。');
    return;
  }

  const dataLines = [];
  for (let i = 0; i < processedData.length; i++) {
    const hexValue = (processedData[i] & 0xff).toString(16).padStart(2, '0');
    dataLines.push(`0x${hexValue}`);
  }

  const formattedData = [];
  for (let i = 0; i < dataLines.length; i += 16) {
    formattedData.push(dataLines.slice(i, i + 16).join(', '));
  }

  const colorModeValue = mode === 'sixColor' ? 0 : mode === 'fourColor' ? 1 : mode === 'blackWhiteColor' ? 2 : 3;
  const arrayContent = [
    'const uint8_t imageData[] IMAGE = {',
    formattedData.join(',\n'),
    '};',
    `const uint16_t imageWidth = ${canvas.width};`,
    `const uint16_t imageHeight = ${canvas.height};`,
    `const uint8_t colorMode = ${colorModeValue};`
  ].join('\n');

  const blob = new Blob([arrayContent], { type: 'text/plain' });
  const link = document.createElement('a');
  link.download = 'image.h';
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

function updateButtonStatus(forceDisabled = false) {
  const connected = gattServer != null && gattServer.connected;
  const status = forceDisabled ? 'disabled' : (connected ? null : 'disabled');
  document.getElementById("reconnectbutton").disabled = (gattServer == null || gattServer.connected) ? 'disabled' : null;
  document.getElementById("sendcmdbutton").disabled = status;
  document.getElementById("calendarmodebutton").disabled = status;
  document.getElementById("clockmodebutton").disabled = status;
  document.getElementById("clearscreenbutton").disabled = status;
  document.getElementById("sendimgbutton").disabled = status;
  document.getElementById("setDriverbutton").disabled = status;
}

function disconnect() {
  updateButtonStatus();
  resetVariables();
  addLog('已断开连接.');
  document.getElementById("connectbutton").innerHTML = '连接';
}

async function preConnect() {
  if (gattServer != null && gattServer.connected) {
    if (bleDevice != null && bleDevice.gatt.connected) {
      bleDevice.gatt.disconnect();
    }
  }
  else {
    resetVariables();
    try {
      bleDevice = await navigator.bluetooth.requestDevice({
        optionalServices: ['62750001-d828-918d-fb46-b6c11c675aec'],
        acceptAllDevices: true
      });
    } catch (e) {
      console.error(e);
      if (e.message) addLog("requestDevice: " + e.message);
      addLog("请检查蓝牙是否已开启，且使用的浏览器支持蓝牙！建议使用以下浏览器：");
      addLog("• 电脑: Chrome/Edge");
      addLog("• Android: Chrome/Edge");
      addLog("• iOS: Bluefy 浏览器");
      return;
    }

    await bleDevice.addEventListener('gattserverdisconnected', disconnect);
    setTimeout(async function () { await connect(); }, 300);
  }
}

async function reConnect() {
  if (bleDevice != null && bleDevice.gatt.connected)
    bleDevice.gatt.disconnect();
  resetVariables();
  addLog("正在重连");
  setTimeout(async function () { await connect(); }, 300);
}

function handleNotify(value, idx) {
  const data = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (idx == 0) {
  
  } else {
    if (textDecoder == null) textDecoder = new TextDecoder();
    const msg = textDecoder.decode(data);
    addLog(msg, '⇓');
    if (msg.startsWith('mtu=') && msg.length > 4) {
      const mtuSize = parseInt(msg.substring(4));
      document.getElementById('mtusize').value = mtuSize;
      addLog(`MTU 已更新为: ${mtuSize}`);
    } else if (msg.startsWith('t=') && msg.length > 2) {
      const t = parseInt(msg.substring(2)) + new Date().getTimezoneOffset() * 60;
      addLog(`远端时间: ${new Date(t * 1000).toLocaleString()}`);
      addLog(`本地时间: ${new Date().toLocaleString()}`);
    }
  }
}

async function connect() {
  if (bleDevice == null || epdCharacteristic != null) return;

  try {
    addLog("正在连接: " + bleDevice.name);
    gattServer = await bleDevice.gatt.connect();
    addLog('  找到 GATT Server');
    epdService = await gattServer.getPrimaryService('62750001-d828-918d-fb46-b6c11c675aec');
    addLog('  找到 EPD Service');
    epdCharacteristic = await epdService.getCharacteristic('62750002-d828-918d-fb46-b6c11c675aec');
    addLog('  找到 Characteristic');
  } catch (e) {
    console.error(e);
    if (e.message) addLog("connect: " + e.message);
    disconnect();
    return;
  }

  try {
    const versionCharacteristic = await epdService.getCharacteristic('62750003-d828-918d-fb46-b6c11c675aec');
    const versionData = await versionCharacteristic.readValue();
    appVersion = versionData.getUint8(0);
    addLog(`固件版本: 0x${appVersion.toString(16)}`);
  } catch (e) {
    console.error(e);
    appVersion = 0x15;
  }

  if (appVersion < 0x16) {
    const oldURL = "https://tsl0922.github.io/EPD-nRF5/v1.5";
    alert("!!!注意!!!\n当前固件版本过低，可能无法正常使用部分功能，建议升级到最新版本。");
    if (confirm('是否访问旧版本上位机？')) location.href = oldURL;
    setTimeout(() => {
      addLog(`如遇到问题，可访问旧版本上位机: ${oldURL}`);
    }, 500);
  }

  try {
    await epdCharacteristic.startNotifications();
    epdCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
      handleNotify(event.target.value, msgIndex++);
    });
  } catch (e) {
    console.error(e);
    if (e.message) addLog("startNotifications: " + e.message);
  }

  await write(EpdCmd.INIT);

  document.getElementById("connectbutton").innerHTML = '断开';
  updateButtonStatus();
}

function setStatus(statusText) {
  document.getElementById("status").innerHTML = statusText;
}

function addLog(logTXT, action = '') {
  const log = document.getElementById("log");
  const now = new Date();
  const time = String(now.getHours()).padStart(2, '0') + ":" +
    String(now.getMinutes()).padStart(2, '0') + ":" +
    String(now.getSeconds()).padStart(2, '0') + " ";

  const logEntry = document.createElement('div');
  const timeSpan = document.createElement('span');
  timeSpan.className = 'time';
  timeSpan.textContent = time;
  logEntry.appendChild(timeSpan);

  if (action !== '') {
    const actionSpan = document.createElement('span');
    actionSpan.className = 'action';
    actionSpan.innerHTML = action;
    logEntry.appendChild(actionSpan);
  }
  logEntry.appendChild(document.createTextNode(logTXT));

  log.appendChild(logEntry);
  log.scrollTop = log.scrollHeight;

  while (log.childNodes.length > 20) {
    log.removeChild(log.firstChild);
  }
}

function clearLog() {
  document.getElementById("log").innerHTML = '';
}

function fillCanvas(style) {
  ctx.fillStyle = style;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function updateImage() {
  const imageFile = document.getElementById('imageFile');
  if (imageFile.files.length == 0) {
    fillCanvas('white');
    return;
  }

  const image = new Image();
  image.onload = function () {
    URL.revokeObjectURL(this.src);
    if (image.width / image.height == canvas.width / canvas.height) {
      if (isCropMode()) exitCropMode();
      ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, canvas.width, canvas.height);
      redrawTextElements();
      redrawLineSegments();
      convertDithering();
    } else {
      addLog("图片宽高比例与画布不匹配，已进入裁剪模式。");
      initializeCrop();
    }
  };
  image.src = URL.createObjectURL(imageFile.files[0]);
}

function updateCanvasSize() {
  const selectedSizeName = document.getElementById('canvasSize').value;
  const selectedSize = canvasSizes.find(size => size.name === selectedSizeName);

  canvas.width = selectedSize.width;
  canvas.height = selectedSize.height;

  updateImage();
}

function updateDitcherOptions() {
  const epdDriverSelect = document.getElementById('epddriver');
  const selectedOption = epdDriverSelect.options[epdDriverSelect.selectedIndex];
  const colorMode = selectedOption.getAttribute('data-color');
  const canvasSize = selectedOption.getAttribute('data-size');

  if (colorMode) document.getElementById('ditherMode').value = colorMode;
  if (canvasSize) document.getElementById('canvasSize').value = canvasSize;

  updateCanvasSize(); // always update image
}

function rotateCanvas() {
  const currentWidth = canvas.width;
  const currentHeight = canvas.height;
  canvas.width = currentHeight;
  canvas.height = currentWidth;
  addLog(`画布已旋转: ${currentWidth}x${currentHeight} -> ${canvas.width}x${canvas.height}`);
  updateImage();
}

function clearCanvas() {
  if (confirm('清除画布内容?')) {
    fillCanvas('white');
    textElements = []; // Clear stored text positions
    lineSegments = []; // Clear stored line segments
    if (isCropMode()) exitCropMode();
    return true;
  }
  return false;
}

function convertDithering() {
  const contrast = parseFloat(document.getElementById('ditherContrast').value);
  const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const imageData = new ImageData(
    new Uint8ClampedArray(currentImageData.data),
    currentImageData.width,
    currentImageData.height
  );

  adjustContrast(imageData, contrast);

  const alg = document.getElementById('ditherAlg').value;
  const strength = parseFloat(document.getElementById('ditherStrength').value);
  const mode = document.getElementById('ditherMode').value;
  const processedData = processImageData(ditherImage(imageData, alg, strength, mode), mode);
  const finalImageData = decodeProcessedData(processedData, canvas.width, canvas.height, mode);
  ctx.putImageData(finalImageData, 0, 0);
}

function initEventHandlers() {
  document.getElementById("epddriver").addEventListener("change", updateDitcherOptions);
  document.getElementById("imageFile").addEventListener("change", updateImage);
  document.getElementById("ditherMode").addEventListener("change", finishCrop);
  document.getElementById("ditherAlg").addEventListener("change", finishCrop);
  document.getElementById("ditherStrength").addEventListener("input", function () {
    finishCrop();
    document.getElementById("ditherStrengthValue").innerText = parseFloat(this.value).toFixed(1);
  });
  document.getElementById("ditherContrast").addEventListener("input", function () {
    finishCrop();
    document.getElementById("ditherContrastValue").innerText = parseFloat(this.value).toFixed(1);
  });
  document.getElementById("canvasSize").addEventListener("change", updateCanvasSize);
}

function checkDebugMode() {
  const link = document.getElementById('debug-toggle');
  const urlParams = new URLSearchParams(window.location.search);
  const debugMode = urlParams.get('debug');

 
    document.body.classList.add('debug-mode');
   
    link.setAttribute('href', window.location.pathname);
  

 
}

document.body.onload = () => {
  textDecoder = null;
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext("2d");

  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  initPaintTools();
  initCropTools();
  initEventHandlers();
  updateButtonStatus();
  checkDebugMode();
}
