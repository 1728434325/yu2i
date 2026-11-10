/* yu2i.site — vanilla JS: theme, motion, scroll cues. Nothing load-bearing. */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  root.classList.add('js');
  if (reduce) root.classList.add('reduced');

  /* ---------- theme ---------- */
  var toggle = document.querySelector('.theme-toggle');
  function paint(mode) {
    var dark = mode === 'dark';
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    if (toggle) {
      toggle.setAttribute('aria-label', dark ? '切换到浅色' : '切换到深色');
      toggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
    }
  }
  paint(root.getAttribute('data-theme') || 'light');

  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('y2-theme', next); } catch (e) {}
      paint(next);
    });
  }

  /* ---------- topbar edge ---------- */
  var bar = document.querySelector('.topbar');
  if (bar) {
    var onBar = function () { bar.classList.toggle('is-scrolled', window.scrollY > 12); };
    onBar();
    window.addEventListener('scroll', onBar, { passive: true });
  }

  /* ---------- scroll progress on every page ---------- */
  var progress = document.querySelector('.scroll-progress') || document.createElement('div');
  if (!progress.parentNode) {
    progress.className = 'scroll-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.appendChild(progress);
  }
  var ticking = false;
  function drawProgress() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var pct = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    progress.style.width = (pct * 100).toFixed(2) + '%';
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(drawProgress); }
  }, { passive: true });
  window.addEventListener('resize', drawProgress, { passive: true });
  drawProgress();

  /* ---------- stagger delays for on-load animations ---------- */
  var seen = {};
  Array.prototype.forEach.call(
    document.querySelectorAll('[data-hero][data-anim-group], .line-mask[data-anim-group]'),
    function (el) {
      var g = el.getAttribute('data-anim-group');
      seen[g] = (seen[g] || 0) + 1;
      el.style.setProperty('--d', (Math.min(seen[g] - 1, 6) * 90) + 'ms');
    }
  );

  /* ---------- gentle cursor parallax on the portrait ---------- */
  var fig = document.querySelector('.hero-figure');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fig && fine && !reduce) {
    var raf = null, tx = 0, ty = 0;
    fig.addEventListener('pointermove', function (e) {
      var b = fig.getBoundingClientRect();
      tx = ((e.clientX - b.left) / b.width - 0.5) * -6;
      ty = ((e.clientY - b.top) / b.height - 0.5) * -6;
      if (!raf) {
        raf = window.requestAnimationFrame(function () {
          fig.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0)';
          raf = null;
        });
      }
    });
    fig.addEventListener('pointerleave', function () {
      fig.style.transform = 'translate3d(0,0,0)';
    });
  }
  /* ---------- copy article link ---------- */
  var shareBtn = document.querySelector("[data-share]");
  if (shareBtn) {
    shareBtn.addEventListener("click", function () {
      var url = location.origin + location.pathname;
      function done(ok) {
        shareBtn.textContent = ok ? "链接已复制" : "请手动复制地址栏";
        setTimeout(function () { shareBtn.textContent = "复制链接"; }, 1800);
      }
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = url;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.top = "-1000px";
        document.body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = document.execCommand("copy"); } catch (e) {}
        document.body.removeChild(ta);
        done(ok);
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(function () { done(true); }, fallback);
      } else {
        fallback();
      }
    });
  }


  /* ---------- in-article contents ---------- */
  var prose = document.querySelector(".article .prose");
  if (prose) {
    var heads = prose.querySelectorAll("h2");
    if (heads.length >= 3) {
      var toc = document.createElement("nav");
      toc.className = "toc";
      toc.setAttribute("aria-label", "本文目录");
      var label = document.createElement("p");
      label.className = "toc__label";
      label.textContent = "目录";
      var list = document.createElement("ol"), links = [];
      Array.prototype.forEach.call(heads, function (h, i) {
        if (!h.id) h.id = "sec-" + (i + 1);
        var a = document.createElement("a");
        a.href = "#" + h.id;
        a.textContent = h.textContent.replace(/\s+/g, " ").trim();
        var li = document.createElement("li");
        li.appendChild(a);
        list.appendChild(li);
        links.push(a);
      });
      toc.appendChild(label);
      toc.appendChild(list);
      prose.parentNode.insertBefore(toc, prose);
      var current = -1, cue = false;
      var markSection = function () {
        var idx = 0;
        for (var i = 0; i < heads.length; i++) if (heads[i].getBoundingClientRect().top <= 150) idx = i;
        if (idx === current) return;
        if (current > -1) links[current].classList.remove("is-active");
        links[idx].classList.add("is-active");
        current = idx;
      };
      window.addEventListener("scroll", function () {
        if (cue) return;
        cue = true;
        window.requestAnimationFrame(function () { markSection(); cue = false; });
      }, { passive: true });
      markSection();
    }
  }
  /* ---------- reading time: measured from the body, not hand-typed ---------- */
  var rtSlot = prose && document.querySelector(".article__meta [data-readtime]");
  if (rtSlot) {
    var rtText = prose.textContent || "";
    var rtCjk = (rtText.match(/[\u4e00-\u9fff]/g) || []).length;
    var rtWords = (rtText.match(/[A-Za-z]+/g) || []).length;
    var rtMin = Math.max(1, Math.round(rtCjk / 300 + rtWords / 180));
    rtSlot.textContent = "\u7ea6 " + rtMin + " \u5206\u949f";
  }

})();
