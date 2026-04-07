/**
 * scroll-wrap.js
 * 浮動社群按鈕（Facebook / IG / LINE）在捲動時「擠開」鄰近文字
 *
 * 使用 @chenglou/pretext 精準測量與排版：
 *   偵測頁面上所有文字區塊元素，
 *   當任何元素與右下角浮動按鈕在視覺上重疊時，
 *   重疊行自動縮短寬度，讓文字避開按鈕區域，
 *   產生即時文繞圖效果；離開重疊範圍後自動還原。
 */

import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext'

// ── 設定 ───────────────────────────────────────────────────
var GAP = 24              // 按鈕與文字的間距 (px)
var FLOAT_ID = 'floating-btns'
var LINE_HEIGHT_RATIO = 1.8

// 偵測所有文字區塊元素（僅語意標籤，避免誤抓含連結的容器）
var TEXT_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, figcaption, td, th, dt, dd'

// 排除的區域（不處理這些元素內部的文字）
var SKIP_SELECTORS = 'nav, footer, #floating-btns, #main-nav, .post__toc, .pagination, button, input, select, textarea, script, style, svg, form'

// ── 快取 ───────────────────────────────────────────────────
var entries = []   // { el, text, html, prepared, lh, wrapped }
var floatEl = null
var ticking = false

// ── 工具 ───────────────────────────────────────────────────

function fontOf(el) {
  var s = getComputedStyle(el)
  return s.fontStyle + ' ' + s.fontWeight + ' ' + s.fontSize + ' ' + s.fontFamily
}

function lineHeightOf(el) {
  var v = parseFloat(getComputedStyle(el).lineHeight)
  return isNaN(v) ? parseFloat(getComputedStyle(el).fontSize) * LINE_HEIGHT_RATIO : v
}

/** 元素是否適合處理（僅含純文字，不含連結或互動元素） */
function isPlain(el) {
  for (var i = 0; i < el.childNodes.length; i++) {
    var child = el.childNodes[i]
    if (child.nodeType !== 1) continue // 文字節點 OK
    var tag = child.tagName
    // 含連結 → 不處理（重排會丟失 href）
    if (tag === 'A') return false
    // 允許純裝飾行內標籤
    if (tag === 'STRONG' || tag === 'EM' || tag === 'B' || tag === 'I' ||
        tag === 'SPAN' || tag === 'CODE' || tag === 'MARK' ||
        tag === 'SUB' || tag === 'SUP' || tag === 'SMALL' || tag === 'TIME' ||
        tag === 'BR') continue
    // 含區塊子元素 → 不處理
    return false
  }
  return true
}

function esc(s) {
  var d = document.createElement('div')
  d.textContent = s
  return d.innerHTML
}

// ── 蒐集頁面上所有可處理的文字元素 ────────────────────────

function collect() {
  entries = []

  var els = document.querySelectorAll(TEXT_SELECTOR)
  for (var i = 0; i < els.length; i++) {
    var el = els[i]

    // 跳過排除區域內的元素
    if (el.closest(SKIP_SELECTORS)) continue
    // 跳過已被其他 pretext 功能處理的元素
    if (el.closest('.pretext-rendered')) continue
    // 跳過 autofit 處理的標題
    if (el.hasAttribute('data-autofit')) continue
    // 跳過隱藏元素
    if (el.offsetParent === null && el.tagName !== 'BODY') continue

    var text = el.textContent.trim()
    if (!text) continue
    if (!isPlain(el)) continue

    var font = fontOf(el)
    entries.push({
      el: el,
      text: text,
      html: el.innerHTML,
      prepared: prepareWithSegments(text, font),
      lh: lineHeightOf(el),
      wrapped: false
    })
  }
}

// ── 捲動處理 ────────────────────────────────────────────────

function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(function () {
    process()
    ticking = false
  })
}

function process() {
  if (!floatEl) return
  var fR = floatEl.getBoundingClientRect()

  for (var i = 0; i < entries.length; i++) {
    var e = entries[i]
    var eR = e.el.getBoundingClientRect()

    // 不在畫面內 → 跳過（已包裹的先還原）
    if (eR.bottom < -50 || eR.top > window.innerHeight + 50) {
      if (e.wrapped) restore(e)
      continue
    }

    // 垂直＋水平都重疊才處理
    var overV = eR.bottom > fR.top - GAP && eR.top < fR.bottom + GAP
    var overH = eR.right > fR.left - GAP

    if (overV && overH) {
      wrap(e, eR, fR)
    } else if (e.wrapped) {
      restore(e)
    }
  }
}

// ── 排版：擠開重疊行 ──────────────────────────────────────

function wrap(e, eR, fR) {
  var fullW = e.el.clientWidth
  // 按鈕左緣相對於段落左緣
  var narrowW = Math.floor(fR.left - eR.left - GAP)
  if (narrowW >= fullW) {
    // 按鈕完全在段落右側之外 → 不需擠開
    if (e.wrapped) restore(e)
    return
  }
  if (narrowW < 80) narrowW = 80

  // 按鈕在段落座標系中的垂直範圍
  var fTop = fR.top - eR.top
  var fBot = fR.bottom - eR.top + GAP

  var cursor = { segmentIndex: 0, graphemeIndex: 0 }
  var y = 0
  var lines = []
  var safety = 0

  while (safety++ < 200) {
    var lt = y
    var lb = y + e.lh
    var hit = lt < fBot && lb > fTop

    var w = hit ? narrowW : fullW
    var line = layoutNextLine(e.prepared, cursor, w)
    if (!line) break

    lines.push(line.text)
    cursor = line.end
    y += e.lh
  }

  // 組合 HTML
  var buf = ''
  for (var k = 0; k < lines.length; k++) {
    buf += '<span class="scroll-wrap-ln" style="display:block">' + esc(lines[k]) + '</span>'
  }

  e.el.innerHTML = buf
  e.wrapped = true
}

function restore(e) {
  e.el.innerHTML = e.html
  e.wrapped = false
}

// ── 初始化 ──────────────────────────────────────────────────

function init() {
  floatEl = document.getElementById(FLOAT_ID)
  if (!floatEl) return

  collect()
  if (!entries.length) return

  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll() // 初始檢查一次
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

// 視窗大小改變 → 重新蒐集 & 重新準備
var resizeTimer
window.addEventListener('resize', function () {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(function () {
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].wrapped) restore(entries[i])
    }
    collect()
    onScroll()
  }, 300)
})
