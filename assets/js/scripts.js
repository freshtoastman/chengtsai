(function init() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
    return;
  }

  // ── Navbar scroll effect ──────────────────────────────────
  var nav = document.getElementById('main-nav');
  var backToTop = document.getElementById('back-to-top');
  var hero = document.getElementById('hero');

  function setNavState(isScrolled) {
    if (nav) nav.classList.toggle('scrolled', isScrolled);
  }

  if (hero && 'IntersectionObserver' in window) {
    // Switch when hero leaves viewport
    var heroObserver = new IntersectionObserver(function (entries) {
      setNavState(!entries[0].isIntersecting);
    }, { threshold: 0 });
    heroObserver.observe(hero);
  } else {
    // Fallback: threshold-based (for pages without hero)
    window.addEventListener('scroll', function () {
      setNavState(window.scrollY > 80);
    }, { passive: true });
    setNavState(window.scrollY > 80);
  }

  // Back-to-top visibility (always threshold-based)
  window.addEventListener('scroll', function () {
    if (backToTop) backToTop.classList.toggle('visible', window.scrollY > 300);
  }, { passive: true });

  // ── Mobile menu toggle ────────────────────────────────────
  var menuToggle = document.getElementById('menu-toggle');
  var mobileMenu = document.getElementById('mobile-menu');
  var menuIcon   = document.getElementById('menu-icon');
  var closeIcon  = document.getElementById('close-icon');

  if (menuToggle) {
    menuToggle.addEventListener('click', function () {
      var isOpen = !mobileMenu.classList.contains('hidden');
      if (isOpen) {
        mobileMenu.classList.add('hidden');
        menuIcon.classList.remove('hidden');
        closeIcon.classList.add('hidden');
      } else {
        mobileMenu.classList.remove('hidden');
        menuIcon.classList.add('hidden');
        closeIcon.classList.remove('hidden');
      }
    });
  }

  // Close mobile menu when a link is clicked
  var mobileLinks = document.querySelectorAll('.mobile-nav-link');
  mobileLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      if (mobileMenu) mobileMenu.classList.add('hidden');
      if (menuIcon)   menuIcon.classList.remove('hidden');
      if (closeIcon)  closeIcon.classList.add('hidden');
    });
  });

  // ── Smooth scroll for anchor links ───────────────────────
  document.querySelectorAll('a[href*="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      var hashIndex = href.indexOf('#');
      if (hashIndex === -1) return;
      var hash = href.slice(hashIndex + 1);
      if (!hash) return;
      var target = document.getElementById(hash);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // ── Contact form submission ───────────────────────────────
  var contactForm   = document.getElementById('contact-form');
  var formSuccess   = document.getElementById('form-success');
  var submitBtn     = document.getElementById('form-submit-btn');
  var btnLabel      = document.getElementById('btn-label');
  var btnSendIcon   = document.getElementById('btn-send-icon');
  var btnLoaderIcon = document.getElementById('btn-loader-icon');

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();

      // Show loading state
      if (submitBtn)     submitBtn.disabled = true;
      if (btnLabel)      btnLabel.textContent = '傳送中...';
      if (btnSendIcon)   btnSendIcon.classList.add('hidden');
      if (btnLoaderIcon) btnLoaderIcon.classList.remove('hidden');

      // Simulate submission (replace with real endpoint as needed)
      // To use Formspree: set contactForm.action = 'https://formspree.io/f/YOUR_ID'
      // and remove the setTimeout below, using fetch() instead.
      setTimeout(function () {
        contactForm.classList.add('hidden');
        if (formSuccess) {
          formSuccess.classList.remove('hidden');
          formSuccess.classList.add('flex');
        }
      }, 1500);
    });
  }

}());
