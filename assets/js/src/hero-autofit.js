/**
 * hero-autofit.js
 * 使用 @chenglou/pretext 實現 Hero 標題自適應排版
 *
 * 功能：
 *   - 自動計算最佳字型大小，讓每行標題完美填滿容器寬度
 *   - 支援 <br> 分行，每行獨立計算最佳大小
 *   - 視窗大小改變時自動重新計算
 *   - 保留原始 HTML 結構（如 <span> 樣式）
 *
 * 用法：在 <h1> 加上 data-autofit 屬性
 *   <h1 data-autofit>標題文字<br><span class="accent">第二行</span></h1>
 */

import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext'

// ── 設定 ───────────────────────────────────────────────────
var MIN_SIZE = 24        // 最小字型大小 (px)
var MAX_SIZE = 240       // 最大字型大小 (px)
var PRECISION = 1        // 搜尋精度 (px)
var SAFETY = 4           // 安全邊距 (px)，防止子像素溢出
var LH_RATIO = 1.15      // 行高比例

// ── 原始 HTML 快取（供 resize 時復原）──────────────────────
var cache = []

// ── 測量文字在指定字型大小下的自然寬度 ──────────────────────

function measureWidth(text, fontSize, fontFamily, fontWeight, fontStyle) {
  var font = fontStyle + ' ' + fontWeight + ' ' + fontSize + 'px ' + fontFamily
  var prepared = prepareWithSegments(text, font)
  var cursor = { segmentIndex: 0, graphemeIndex: 0 }
  var line = layoutNextLine(prepared, cursor, 99999)
  return line ? line.width : 0
}

// ── 二分搜尋：找出讓文字寬度 ≤ 容器寬度的最大字型大小 ──────

function findBestSize(text, maxWidth, fontFamily, fontWeight, fontStyle) {
  var lo = MIN_SIZE
  var hi = MAX_SIZE

  while (hi - lo > PRECISION) {
    var mid = (lo + hi) / 2
    var w = measureWidth(text, mid, fontFamily, fontWeight, fontStyle)
    if (w <= maxWidth) {
      lo = mid
    } else {
      hi = mid
    }
  }

  return Math.floor(lo)
}

// ── 從元素中提取視覺行（以 <br> 為分隔）────────────────────

function getLines(el) {
  var lines = []
  var buf = []

  function flush() {
    if (!buf.length) return
    var text = ''
    for (var i = 0; i < buf.length; i++) {
      text += buf[i].textContent || ''
    }
    text = text.trim()
    if (text) lines.push({ text: text, nodes: buf.slice() })
    buf = []
  }

  var nodes = el.childNodes
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].nodeName === 'BR') flush()
    else buf.push(nodes[i])
  }
  flush()
  return lines
}

// ── 對單一元素執行自適應排版 ────────────────────────────────

function fitElement(el) {
  var parent = el.parentElement
  if (!parent) return

  var maxWidth = parent.clientWidth - SAFETY
  if (maxWidth < 100) return

  var cs = window.getComputedStyle(el)
  var fontFamily = cs.fontFamily
  var fontWeight = cs.fontWeight
  var fontStyle = cs.fontStyle || 'normal'

  var lines = getLines(el)
  if (!lines.length) return

  // 清空並重建 DOM
  el.innerHTML = ''

  for (var i = 0; i < lines.length; i++) {
    var size = findBestSize(
      lines[i].text, maxWidth, fontFamily, fontWeight, fontStyle
    )

    var row = document.createElement('span')
    row.className = 'autofit-line'
    row.style.display = 'block'
    row.style.fontSize = size + 'px'
    row.style.lineHeight = String(LH_RATIO)
    row.style.whiteSpace = 'nowrap'

    // 保留原始子節點（含 <span class="text-blue-500"> 等樣式）
    for (var j = 0; j < lines[i].nodes.length; j++) {
      row.appendChild(lines[i].nodes[j].cloneNode(true))
    }

    el.appendChild(row)
  }

  // 標記為已處理
  el.style.visibility = 'visible'
}

// ── 初始化 ──────────────────────────────────────────────────

function init() {
  var els = document.querySelectorAll('[data-autofit]')
  if (!els.length) return

  // 快取原始 HTML（供 resize 復原）
  cache = []
  for (var i = 0; i < els.length; i++) {
    cache.push({ el: els[i], html: els[i].innerHTML })
    fitElement(els[i])
  }
}

// ── 重新計算（resize 用）───────────────────────────────────

function refit() {
  for (var i = 0; i < cache.length; i++) {
    cache[i].el.innerHTML = cache[i].html
  }
  for (var j = 0; j < cache.length; j++) {
    fitElement(cache[j].el)
  }
}

// ── 啟動 ────────────────────────────────────────────────────

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

// 視窗大小改變時自動重新計算（debounced）
var timer
window.addEventListener('resize', function () {
  clearTimeout(timer)
  timer = setTimeout(refit, 200)
})
