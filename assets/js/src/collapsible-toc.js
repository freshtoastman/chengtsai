/**
 * collapsible-toc.js
 * 自動產生可收合的文章目錄（Table of Contents）
 *
 * 功能：
 *   - 掃描 #post-entry 內的 h2/h3/h4 標題自動產生目錄
 *   - 點擊標題列可收合/展開目錄
 *   - 點擊目錄項目可平滑捲動至對應段落
 *   - 支援 ARIA 無障礙屬性
 *   - 捲動時自動高亮目前閱讀位置
 *   - 標題不足 3 個時自動隱藏
 */

(function () {
  'use strict'

  // ── 設定 ─────────────────────────────────────────────────
  var CONTAINER = '#post-entry'
  var HEADING_SELECTOR = 'h2, h3, h4'
  var MIN_HEADINGS = 3        // 至少幾個標題才顯示 TOC
  var SCROLL_OFFSET = 100     // 捲動偏移量 (px)，避免被 navbar 遮住
  var DEFAULT_EXPANDED = true  // 預設展開

  // ── 初始化 ───────────────────────────────────────────────
  function init() {
    var entry = document.querySelector(CONTAINER)
    if (!entry) return

    var headings = entry.querySelectorAll(HEADING_SELECTOR)
    if (headings.length < MIN_HEADINGS) return

    // 為每個標題加上 id（如果沒有的話）
    var tocItems = []
    for (var i = 0; i < headings.length; i++) {
      var h = headings[i]
      if (!h.id) {
        h.id = 'heading-' + i
      }
      tocItems.push({
        id: h.id,
        text: h.textContent.trim(),
        level: parseInt(h.tagName.charAt(1), 10),
        el: h
      })
    }

    // 建立 TOC DOM
    var toc = buildTOC(tocItems)

    // 插入到 #post-entry 之前
    entry.parentNode.insertBefore(toc, entry)

    // 啟動捲動監聽
    setupScrollSpy(tocItems)
  }

  // ── 建構 TOC DOM ────────────────────────────────────────

  function buildTOC(items) {
    // 最外層容器
    var nav = document.createElement('nav')
    nav.className = 'post__toc'
    nav.setAttribute('aria-label', '文章目錄')

    // 標題按鈕（可收合）
    var toggle = document.createElement('button')
    toggle.className = 'post__toc-toggle'
    toggle.setAttribute('aria-expanded', DEFAULT_EXPANDED ? 'true' : 'false')
    toggle.setAttribute('aria-controls', 'toc-list')
    toggle.innerHTML =
      '<span class="post__toc-title">目錄</span>' +
      '<svg class="post__toc-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '<path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>'
    nav.appendChild(toggle)

    // 目錄列表容器
    var listWrap = document.createElement('div')
    listWrap.id = 'toc-list'
    listWrap.className = 'post__toc-body'
    listWrap.setAttribute('role', 'region')
    listWrap.setAttribute('aria-label', '目錄內容')
    if (!DEFAULT_EXPANDED) {
      listWrap.classList.add('collapsed')
    }

    // 建構巢狀列表
    var ol = document.createElement('ol')
    ol.className = 'post__toc-list'

    var minLevel = Infinity
    for (var i = 0; i < items.length; i++) {
      if (items[i].level < minLevel) minLevel = items[i].level
    }

    for (var j = 0; j < items.length; j++) {
      var item = items[j]
      var li = document.createElement('li')
      li.className = 'post__toc-item post__toc-item--l' + (item.level - minLevel + 1)

      var a = document.createElement('a')
      a.href = '#' + item.id
      a.className = 'post__toc-link'
      a.setAttribute('data-toc-id', item.id)
      a.textContent = item.text
      li.appendChild(a)
      ol.appendChild(li)

      // 平滑捲動
      a.addEventListener('click', createScrollHandler(item.id))
    }

    listWrap.appendChild(ol)
    nav.appendChild(listWrap)

    // 收合/展開事件
    toggle.addEventListener('click', function () {
      var expanded = toggle.getAttribute('aria-expanded') === 'true'
      toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true')
      listWrap.classList.toggle('collapsed', expanded)
    })

    return nav
  }

  // ── 平滑捲動 ────────────────────────────────────────────

  function createScrollHandler(targetId) {
    return function (e) {
      e.preventDefault()
      var target = document.getElementById(targetId)
      if (!target) return

      var top = target.getBoundingClientRect().top + window.pageYOffset - SCROLL_OFFSET
      window.scrollTo({ top: top, behavior: 'smooth' })

      // 更新 URL hash（不跳動）
      if (history.replaceState) {
        history.replaceState(null, null, '#' + targetId)
      }
    }
  }

  // ── 捲動監聽：高亮目前位置 ──────────────────────────────

  function setupScrollSpy(items) {
    var links = document.querySelectorAll('.post__toc-link')
    var ticking = false

    function onScroll() {
      if (ticking) return
      ticking = true

      requestAnimationFrame(function () {
        var scrollPos = window.pageYOffset + SCROLL_OFFSET + 20
        var activeId = null

        for (var i = items.length - 1; i >= 0; i--) {
          if (items[i].el.offsetTop <= scrollPos) {
            activeId = items[i].id
            break
          }
        }

        for (var j = 0; j < links.length; j++) {
          var link = links[j]
          if (link.getAttribute('data-toc-id') === activeId) {
            link.classList.add('active')
          } else {
            link.classList.remove('active')
          }
        }
        ticking = false
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll() // 初始執行一次
  }

  // ── 啟動 ────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
