/**
 * pretext-wrap.js
 * 使用 @chenglou/pretext 實現動態文繞圖排版
 *
 * 用法：在 Publii 編輯器中，為文章內的圖片加上 CSS class：
 *   - `pretext-left`  → 圖片浮動左側，文字繞右
 *   - `pretext-right` → 圖片浮動右側，文字繞左
 *
 * 品牌 Logo 用法：
 *   - `brand-logo-left`  → Logo 浮動左側（含品牌樣式）
 *   - `brand-logo-right` → Logo 浮動右側（含品牌樣式）
 *   Logo 自動套用：縮小尺寸、圓形裁切、半透明浮水印、陰影邊框
 *
 * 範例 HTML：
 *   <img src="photo.jpg" class="pretext-left" alt="說明">
 *   <img src="logo.png" class="brand-logo-right" alt="品牌">
 *   <p>這段文字會自動繞過圖片或 Logo...</p>
 */

import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext'

// ── 設定 ───────────────────────────────────────────────────
var GAP = 20          // 圖片與文字之間的間距 (px)
var LINE_HEIGHT = 1.8 // 行高倍數
var SELECTOR = '#post-entry' // 文章內容容器

// ── 工具函數 ──────────────────────────────────────────────

/**
 * 取得元素的 computed font shorthand，供 pretext 使用
 */
function getFont(el) {
  var s = window.getComputedStyle(el)
  // pretext 需要 CSS font shorthand 格式
  return s.fontStyle + ' ' + s.fontWeight + ' ' + s.fontSize + ' ' + s.fontFamily
}

/**
 * 取得 computed line-height (px)
 */
function getLineHeight(el) {
  var s = window.getComputedStyle(el)
  var lh = parseFloat(s.lineHeight)
  if (isNaN(lh)) {
    // 'normal' → 用 fontSize * LINE_HEIGHT
    lh = parseFloat(s.fontSize) * LINE_HEIGHT
  }
  return lh
}

/**
 * 計算圖片在段落座標系中的覆蓋區域
 */
function getImageRect(img, paragraphEl) {
  var imgRect = img.getBoundingClientRect()
  var pRect = paragraphEl.getBoundingClientRect()
  return {
    top: imgRect.top - pRect.top,
    bottom: imgRect.bottom - pRect.top,
    left: imgRect.left - pRect.left,
    right: imgRect.right - pRect.left,
    width: imgRect.width,
    height: imgRect.height
  }
}

// ── 主邏輯：逐行排版 ─────────────────────────────────────

/**
 * 對單一段落執行 pretext 文繞圖排版
 * @param {HTMLParagraphElement} p - 段落元素
 * @param {Object} imgInfo - { rect, side }
 * @param {number} containerWidth - 容器寬度
 */
function layoutParagraph(p, imgInfo, containerWidth) {
  var text = p.textContent || ''
  if (!text.trim()) return

  var font = getFont(p)
  var lineHeight = getLineHeight(p)
  var prepared = prepareWithSegments(text, font)

  var cursor = { segmentIndex: 0, graphemeIndex: 0 }
  var y = 0
  var lines = []

  // 計算段落相對於圖片的垂直偏移
  var imgTop = imgInfo.rect.top
  var imgBottom = imgInfo.rect.bottom + GAP
  var imgWidth = imgInfo.rect.width + GAP

  while (true) {
    // 判斷當前行是否與圖片重疊
    var lineTop = y
    var lineBottom = y + lineHeight
    var overlaps = lineTop < imgBottom && lineBottom > imgTop

    var availableWidth
    if (overlaps) {
      // 被圖片佔據，縮減可用寬度
      availableWidth = containerWidth - imgWidth
    } else {
      availableWidth = containerWidth
    }

    // 確保最小寬度
    if (availableWidth < 80) availableWidth = 80

    var line = layoutNextLine(prepared, cursor, availableWidth)
    if (line === null) break

    var offsetX = 0
    if (overlaps && imgInfo.side === 'left') {
      offsetX = imgWidth
    }

    lines.push({
      text: line.text,
      x: offsetX,
      y: y,
      width: line.width
    })

    cursor = line.end
    y += lineHeight
  }

  // 用 span 逐行渲染取代原始文字
  renderLines(p, lines, lineHeight, imgInfo.side)
}

/**
 * 將計算好的行資料渲染為 DOM
 */
function renderLines(p, lines, lineHeight, side) {
  // 保留原始的 class 和 style
  var wrapper = document.createElement('div')
  wrapper.className = 'pretext-rendered'
  wrapper.style.position = 'relative'
  wrapper.style.lineHeight = lineHeight + 'px'

  for (var i = 0; i < lines.length; i++) {
    var span = document.createElement('span')
    span.className = 'pretext-line'
    span.style.display = 'block'
    span.style.paddingLeft = lines[i].x + 'px'
    span.textContent = lines[i].text
    wrapper.appendChild(span)
  }

  p.textContent = ''
  p.appendChild(wrapper)
}

// ── 原始 HTML 快取（供 resize 還原）──────────────────────
var originalCache = []

// ── 初始化：掃描文章內容 ──────────────────────────────────

function initPretextWrap() {
  var container = document.querySelector(SELECTOR)
  if (!container) return

  var images = container.querySelectorAll(
    'img.pretext-left, img.pretext-right, img.brand-logo-left, img.brand-logo-right'
  )
  if (images.length === 0) return

  var containerWidth = container.clientWidth

  images.forEach(function (img) {
    // 判斷方向
    var side = (img.classList.contains('pretext-left') || img.classList.contains('brand-logo-left'))
      ? 'left' : 'right'

    // 判斷是否為品牌 Logo
    var isBrandLogo = img.classList.contains('brand-logo-left') || img.classList.contains('brand-logo-right')

    // 套用浮動樣式
    img.style.float = side
    if (isBrandLogo) {
      // 品牌 Logo 樣式：小尺寸、圓形、半透明浮水印風格
      img.style.maxWidth = '120px'
      img.style.width = '120px'
      img.style.height = '120px'
      img.style.objectFit = 'contain'
      img.style.padding = '12px'
      img.style.borderRadius = '50%'
      img.style.backgroundColor = 'rgba(241,245,249,0.8)'
      img.style.border = '2px solid rgba(148,163,184,0.2)'
      img.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)'
      img.style.opacity = '0.85'
      img.style.margin = side === 'left'
        ? '0.25em ' + GAP + 'px 0.75em 0'
        : '0.25em 0 0.75em ' + GAP + 'px'
      img.classList.add('brand-logo')
    } else {
      img.style.maxWidth = '40%'
      img.style.borderRadius = '12px'
      img.style.margin = side === 'left'
        ? '0.5em ' + GAP + 'px 0.5em 0'
        : '0.5em 0 0.5em ' + GAP + 'px'
    }

    // 圖片載入完成後再計算排版
    function doLayout() {
      // 找到圖片後面的段落們
      var sibling = img.nextElementSibling
      while (sibling) {
        if (sibling.tagName === 'P' && sibling.textContent.trim()) {
          // 快取原始 HTML（首次處理時）
          if (!sibling.hasAttribute('data-pretext-cached')) {
            originalCache.push({ el: sibling, html: sibling.innerHTML })
            sibling.setAttribute('data-pretext-cached', '1')
          }
          var rect = getImageRect(img, sibling)
          // 只處理與圖片有垂直重疊的段落
          if (rect.top < img.getBoundingClientRect().height + GAP) {
            layoutParagraph(sibling, { rect: rect, side: side }, containerWidth)
          }
        }
        sibling = sibling.nextElementSibling
        // 超過圖片範圍就停止
        if (sibling) {
          var sibRect = sibling.getBoundingClientRect()
          var imgRect = img.getBoundingClientRect()
          if (sibRect.top > imgRect.bottom + GAP) break
        }
      }
    }

    if (img.complete) {
      doLayout()
    } else {
      img.addEventListener('load', doLayout)
    }
  })
}

// ── 還原並重新排版 ────────────────────────────────────────

function refitPretext() {
  // 還原所有被處理過的段落
  for (var i = 0; i < originalCache.length; i++) {
    originalCache[i].el.innerHTML = originalCache[i].html
    originalCache[i].el.removeAttribute('data-pretext-cached')
  }
  originalCache = []
  // 重新排版
  initPretextWrap()
}

// ── 啟動 ──────────────────────────────────────────────────

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPretextWrap)
} else {
  initPretextWrap()
}

// 視窗寬度改變時重新排版（忽略高度變化，避免手機滑動觸發）
var lastWidth = window.innerWidth
var resizeTimer
window.addEventListener('resize', function () {
  var newWidth = window.innerWidth
  if (newWidth === lastWidth) return  // 只有高度變（手機地址欄）→ 忽略
  lastWidth = newWidth
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(refitPretext, 500)
})
