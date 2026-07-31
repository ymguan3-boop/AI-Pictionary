(function() {
  'use strict';

  var CANVAS_SIZE = 500;
  var canvas = document.querySelector('#drawCanvas');
  var ctx = canvas.getContext('2d');

  var elements = {
    connBadge: document.querySelector('#connBadge'),
    roomLabel: document.querySelector('#roomLabel'),
    palette: document.querySelector('#palette'),
    brushBtn: document.querySelector('#brushBtn'),
    eraserBtn: document.querySelector('#eraserBtn'),
    undoBtn: document.querySelector('#undoBtn'),
    clearBtn: document.querySelector('#clearBtn'),
    sizeSlider: document.querySelector('#sizeSlider'),
    sizeDisplay: document.querySelector('#sizeDisplay'),
    submitBtn: document.querySelector('#submitBtn'),
    statusMsg: document.querySelector('#statusMsg')
  };

  var peer = null;
  var conn = null;
  var retryTimer = null;
  var connTimeout = null;
  var attemptCount = 0;
  var isConnected = false;
  var roomId = '';

  var isDrawing = false;
  var lastPoint = null;
  var tool = 'brush';
  var color = '#1a1a1a';
  var brushSize = 6;
  var history = [];
  var hasDrawing = false;

  function initCanvas() {
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    saveState();
  }

  function saveState() {
    history.push(ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE));
    if (history.length > 20) history.shift();
    elements.undoBtn.disabled = history.length <= 1;
  }

  function fitCanvas() {
    var wrap = canvas.parentElement;
    canvas.style.width = wrap.clientWidth + 'px';
    canvas.style.height = wrap.clientHeight + 'px';
  }

  function getPos(e) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function startDraw(e) {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    isDrawing = true;
    lastPoint = getPos(e);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = tool === 'eraser' ? '#f8f9fa' : color;
    ctx.beginPath();
    ctx.arc(lastPoint.x, lastPoint.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function moveDraw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    var pt = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPoint = pt;
  }

  function endDraw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    isDrawing = false;
    lastPoint = null;
    ctx.restore();
    hasDrawing = true;
    saveState();
    updateSubmitBtn();
  }

  function undo() {
    if (history.length <= 1) return;
    history.pop();
    ctx.putImageData(history[history.length - 1], 0, 0);
    hasDrawing = history.length > 1;
    elements.undoBtn.disabled = history.length <= 1;
    updateSubmitBtn();
  }

  function clearCanvas() {
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    history = [];
    hasDrawing = false;
    saveState();
    updateSubmitBtn();
    setMsg('畫布已清除');
  }

  function updateSubmitBtn() {
    elements.submitBtn.disabled = !(isConnected && hasDrawing);
  }

  function setMsg(text, type) {
    elements.statusMsg.textContent = text;
    elements.statusMsg.className = 'status-msg' + (type ? ' ' + type : '');
  }

  function setConnected(online) {
    isConnected = online;
    elements.connBadge.textContent = online ? '已連線' : '連線中';
    elements.connBadge.className = 'conn-badge ' + (online ? 'online' : 'offline');
    updateSubmitBtn();
  }

  function connectPeer(room) {
    roomId = room;
    elements.roomLabel.textContent = '#' + room;

    if (peer) { peer.destroy(); peer = null; }
    if (conn) { conn.close(); conn = null; }
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    if (connTimeout) { clearTimeout(connTimeout); connTimeout = null; }
    attemptCount = 0;

    try {
      peer = new Peer();
    } catch (err) {
      setMsg('連線模組載入失敗，請重新整理', 'err');
      console.error('[peer] init error:', err);
      return;
    }

    peer.on('open', function() {
      tryConnect();
    });

    peer.on('error', function(err) {
      console.error('[peer] error:', err.type);
      setConnected(false);
      if (err.type === 'server-error' || err.type === 'network') {
        scheduleRetry('連線服務暫時無法存取，重試中…');
      }
    });

    peer.on('disconnected', function() {
      setConnected(false);
      setMsg('連線已中斷，嘗試重新連線…', 'err');
      if (peer && !peer.destroyed) {
        try { peer.reconnect(); } catch (_) {}
      }
    });
  }

  function tryConnect() {
    if (isConnected) return;
    if (!peer) return;

    if (conn) { conn.close(); conn = null; }
    if (connTimeout) { clearTimeout(connTimeout); connTimeout = null; }

    if (attemptCount > 0) {
      setMsg('大螢幕尚未就緒，第 ' + attemptCount + ' 次重試中…', 'err');
    }
    if (attemptCount >= 5) {
      setMsg('連線失敗，請確認大螢幕已開啟後重新整理', 'err');
      return;
    }
    attemptCount++;

    try {
      conn = peer.connect(roomId, { reliable: true });
    } catch (err) {
      console.error('[connect] error:', err);
      scheduleRetry('連線建立失敗，重試中…');
      return;
    }

    connTimeout = setTimeout(function() {
      if (!isConnected) {
        console.log('[conn] timeout, retry');
        if (conn) { conn.close(); conn = null; }
        tryConnect();
      }
    }, 8000);

    conn.on('open', function() {
      if (connTimeout) { clearTimeout(connTimeout); connTimeout = null; }
      attemptCount = 0;
      setConnected(true);
      setMsg('已連線，開始畫畫吧！');
    });

    conn.on('data', function(data) {
      try {
        var msg = typeof data === 'string' ? JSON.parse(data) : data;
        if (msg.type === 'ack') {
          setMsg('🎉 已送出！等待 AI 猜測中', 'ok');
        }
      } catch (_) {}
    });

    conn.on('close', function() {
      if (connTimeout) { clearTimeout(connTimeout); connTimeout = null; }
      setConnected(false);
      setMsg('連線已中斷', 'err');
      scheduleRetry('嘗試重新連線中…');
    });

    conn.on('error', function(err) {
      console.error('[conn] error:', err);
      if (connTimeout) { clearTimeout(connTimeout); connTimeout = null; }
      setConnected(false);
      if (attemptCount < 5) {
        if (conn) { conn.close(); conn = null; }
        retryTimer = setTimeout(tryConnect, 3000);
      } else {
        setMsg('連線失敗，請確認大螢幕已開啟', 'err');
      }
    });
  }

  function scheduleRetry(msg) {
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    if (attemptCount >= 5) {
      setMsg('連線失敗，請確認大螢幕已開啟後重新整理', 'err');
      return;
    }
    setMsg(msg, 'err');
    retryTimer = setTimeout(tryConnect, 3000);
  }

  function submitDrawing() {
    if (!isConnected || !hasDrawing) return;
    elements.submitBtn.disabled = true;
    elements.submitBtn.innerHTML = '⏳ 傳送中…';

    try {
      var image = canvas.toDataURL('image/png');
      conn.send(JSON.stringify({ type: 'drawing', data: image }));
      setMsg('🎉 已送出！等待 AI 猜測中', 'ok');
    } catch (err) {
      setMsg('❌ 傳送失敗，請重試', 'err');
      console.error('[submit] error:', err);
    }

    elements.submitBtn.innerHTML = '🚀 送出畫作給 AI 猜';
    updateSubmitBtn();
  }

  function init() {
    var params = new URLSearchParams(window.location.search);
    var room = params.get('room');
    if (!room) {
      setMsg('⚠️ 缺少房間代號，請掃 QR Code 進入', 'err');
      elements.roomLabel.textContent = '無房間';
      return;
    }
    connectPeer(room);

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    initCanvas();
    fitCanvas();
    window.addEventListener('resize', fitCanvas);

    canvas.addEventListener('pointerdown', startDraw);
    canvas.addEventListener('pointermove', moveDraw);
    canvas.addEventListener('pointerup', endDraw);
    canvas.addEventListener('pointercancel', endDraw);

    elements.palette.addEventListener('click', function(e) {
      var swatch = e.target.closest('.swatch');
      if (!swatch) return;
      elements.palette.querySelectorAll('.swatch').forEach(function(s) { s.classList.remove('active'); });
      swatch.classList.add('active');
      color = swatch.dataset.color;
      tool = 'brush';
      elements.brushBtn.classList.add('active');
      elements.eraserBtn.classList.remove('active');
    });

    elements.brushBtn.addEventListener('click', function() {
      tool = 'brush';
      elements.brushBtn.classList.add('active');
      elements.eraserBtn.classList.remove('active');
    });

    elements.eraserBtn.addEventListener('click', function() {
      tool = 'eraser';
      elements.eraserBtn.classList.add('active');
      elements.brushBtn.classList.remove('active');
    });

    elements.undoBtn.addEventListener('click', undo);
    elements.clearBtn.addEventListener('click', clearCanvas);
    elements.submitBtn.addEventListener('click', submitDrawing);

    elements.sizeSlider.addEventListener('input', function() {
      brushSize = parseInt(elements.sizeSlider.value, 10);
      elements.sizeDisplay.textContent = brushSize;
    });
  }

  init();
})();
