/* 紫铃 v1 · Original local mascot. No dependencies, network APIs, or Live2D. */
(() => {
  'use strict';

  if (customElements.get('ziling-mascot')) return;
  const scriptUrl = document.currentScript?.src || document.baseURI;
  const assetBase = new URL('.', scriptUrl).href;
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const random = (min, max) => min + Math.random() * (max - min);
  const lines = {
    hello: ['你好呀，我是紫铃。今天也一起慢慢来吧。', '你来啦！左下角的位置，我坐好啦。'],
    pet: ['耳朵有一点点痒……再摸一下也可以。', '收到一份摸摸头，心情变好啦。', '喵？原来是你呀。'],
    talk: [
      '今天有遇到什么有趣的事吗？',
      '累了就歇一会儿，我会在这里等你。',
      '偷偷告诉你：我最喜欢晴天和发呆。',
      '这里的风景不错，要一起多待一会儿吗？',
    ],
    idle: [
      '我在这里，陪你慢慢看。',
      '看屏幕久了，记得看看远处呀。',
      '今天也想收集一点小小的好心情。',
      '不用着急，按照自己的节奏来就好。',
    ],
  };

  const template = document.createElement('template');
  template.innerHTML = `
    <style>
      :host {
        --ziling-width: 240px;
        --ziling-mobile-width: 144px;
        position: fixed;
        left: max(var(--ziling-left, 20px), env(safe-area-inset-left, 0px));
        bottom: max(var(--ziling-bottom, 16px), env(safe-area-inset-bottom, 0px));
        width: min(var(--ziling-width), calc(100vw - 32px), calc(66.6667svh - 80px));
        z-index: var(--ziling-z, 60);
        display: block;
        isolation: isolate;
        pointer-events: none;
        color: #4c3656;
        font: 14px/1.65 system-ui, "Microsoft YaHei", sans-serif;
        text-align: left;
        -webkit-tap-highlight-color: transparent;
      }
      *, *::before, *::after { box-sizing: border-box; }
      [hidden] { display: none !important; }
      button {
        margin: 0;
        padding: 0;
        border: 0;
        border-radius: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        box-shadow: none;
        cursor: pointer;
        touch-action: manipulation;
        pointer-events: auto;
      }
      button:focus-visible { outline: 2px solid #8d62a8; outline-offset: 5px; }
      .puppet { position: relative; width: 100%; }
      .sway { transform-origin: 50% 97%; animation: sway 6.4s ease-in-out infinite; }
      .breath { transform-origin: 50% 95%; animation: breathe 4.2s ease-in-out infinite; }
      .reaction { transform-origin: 50% 92%; }
      .art { position: relative; width: 100%; aspect-ratio: 2 / 3; user-select: none; }
      .art:has(.touch-target:focus-visible) { outline: 2px solid #8d62a8; outline-offset: 5px; border-radius: 14px; }
      .base { display: block; width: 100%; height: 100%; object-fit: contain; pointer-events: none; }
      .eyes { position: absolute; inset: 0; display: block; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
      .touch-target {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        clip-path: polygon(17% 0, 37% 4%, 51% 2%, 64% 4%, 83% 0, 86% 16%, 96% 25%, 100% 58%, 87% 68%, 76% 75%, 66% 75%, 66% 98%, 61% 100%, 37% 100%, 34% 98%, 35% 75%, 22% 73%, 12% 67%, 0 64%, 0 40%, 8% 25%, 16% 16%);
      }
      .touch-target:focus-visible { outline: none; }
      .eye-open { transform-box: fill-box; transform-origin: center; transition: transform 65ms ease-in, opacity 65ms ease-in; }
      .eye-closed { opacity: 0; transition: opacity 65ms ease-in; }
      .eyes[data-expression="blink"] .eye-open { transform: scaleY(0.04); opacity: 0; }
      .eyes[data-expression="happy"] .eye-open { opacity: 0; }
      .eyes[data-expression="blink"] .eye-closed,
      .eyes[data-expression="happy"] .eye-closed { opacity: 1; }
      .extra-blush { opacity: 0; transition: opacity 160ms ease-out; }
      .eyes[data-expression="happy"] .extra-blush { opacity: 0.48; }
      .bubble {
        position: absolute;
        left: 4px;
        bottom: calc(100% + 16px);
        width: min(246px, calc(100vw - 40px));
        padding: 12px 16px;
        border-radius: 14px;
        background: #fffcf9;
        color: #4c3656;
        box-shadow: 0 6px 24px #3920441a;
        pointer-events: none;
      }
      .bubble::after { content: ""; position: absolute; left: 32px; bottom: -7px; width: 15px; height: 15px; background: #fffcf9; transform: rotate(45deg); }
      .bubble-name { display: block; margin-bottom: 3px; color: #79508c; font-size: 11px; font-weight: 650; }
      .bubble-text { position: relative; display: block; overflow-wrap: anywhere; }
      .minimize {
        position: absolute; top: -8px; right: 0;
        display: grid; place-items: center; width: 30px; height: 30px;
        border-radius: 50%; background: #fffcf9; color: #72547f;
        box-shadow: 0 3px 12px #39204414;
        opacity: 0; transition: opacity 150ms ease-out;
      }
      :host(:hover) .minimize, :host(:focus-within) .minimize { opacity: 1; }
      .minimize:hover, .restore:hover { background: #ede1f2; }
      .restore {
        display: flex; align-items: center; gap: 7px;
        width: max-content; padding: 9px 13px; border-radius: 24px;
        background: #fffcf9; color: #72547f; box-shadow: 0 4px 18px #3920441c;
      }
      .restore svg { width: 21px; height: 21px; }
      .minimize svg { width: 16px; height: 16px; }
      .load-state { padding: 12px; border-radius: 12px; background: #fffcf9; pointer-events: auto; }
      .hearts { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
      .heart { opacity: 0; fill: #c088b2; }
      .hearts.active .heart { animation: float-heart 1100ms cubic-bezier(.16,1,.3,1) both; }
      .hearts.active .heart:nth-child(2) { animation-delay: 90ms; }
      .hearts.active .heart:nth-child(3) { animation-delay: 170ms; }
      :host([data-still]) .sway, :host([data-still]) .breath,
      :host([data-suspended]) .sway, :host([data-suspended]) .breath { animation-play-state: paused; }
      :host([data-still]) .sway, :host([data-still]) .breath { animation: none; }
      :host([data-still]) .hearts.active .heart { animation: none; }
      @keyframes sway { 0%, 100% { transform: rotate(-0.65deg); } 50% { transform: rotate(0.65deg); } }
      @keyframes breathe { 0%, 100% { transform: translateY(0) scaleY(1); } 50% { transform: translateY(-1.5px) scaleY(1.008); } }
      @keyframes float-heart { 0% { opacity: 0; transform: translateY(0) scale(.7); } 18% { opacity: .9; } 100% { opacity: 0; transform: translateY(-120px) scale(1.1); } }
      @media (max-width: 640px) {
        :host { width: min(var(--ziling-mobile-width), calc(100vw - 24px), calc(66.6667svh - 80px)); left: max(var(--ziling-mobile-left, 10px), env(safe-area-inset-left, 0px)); bottom: max(var(--ziling-mobile-bottom, 10px), env(safe-area-inset-bottom, 0px)); font-size: 13px; }
        .minimize { opacity: 1; width: 28px; height: 28px; }
        .bubble { width: min(220px, calc(100vw - 30px)); padding: 10px 13px; }
      }
      @media (prefers-reduced-motion: reduce) {
        .sway, .breath, .hearts.active .heart { animation: none; }
        .eye-open, .eye-closed, .extra-blush { transition: none; }
      }
      @media (forced-colors: active) { button:focus-visible, .art:has(.touch-target:focus-visible) { outline-color: Highlight; } }
    </style>
    <div class="bubble" role="status" aria-live="polite" aria-atomic="true" hidden>
      <span class="bubble-name"></span><span class="bubble-text"></span>
    </div>
    <div class="puppet">
      <div class="sway"><div class="breath"><div class="reaction">
        <div class="art" part="art">
          <img class="base" width="1024" height="1536" alt="" draggable="false" decoding="async">
          <svg class="eyes" viewBox="0 0 1024 1536" aria-hidden="true" data-expression="neutral">
            <defs>
              <linearGradient id="iris" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#523552"/><stop offset=".48" stop-color="#8e66b3"/>
                <stop offset="1" stop-color="#d4b5ed"/>
              </linearGradient>
              <linearGradient id="eye-white" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#e9dce9"/><stop offset=".38" stop-color="#fff8f2"/>
              </linearGradient>
              <clipPath id="left-eye"><path d="M358 374 Q401 345 450 375 Q457 411 435 434 Q405 449 376 431 Q358 412 358 374Z"/></clipPath>
              <clipPath id="right-eye"><path d="M574 375 Q623 345 666 374 Q666 412 648 431 Q619 449 589 434 Q567 411 574 375Z"/></clipPath>
            </defs>
            <g class="eye-open">
              <path d="M358 374 Q401 345 450 375 Q457 411 435 434 Q405 449 376 431 Q358 412 358 374Z" fill="url(#eye-white)"/>
              <g clip-path="url(#left-eye)"><g class="iris">
                <ellipse cx="409" cy="398" rx="32" ry="46" fill="url(#iris)" stroke="#64446e" stroke-width="2.5"/>
                <ellipse cx="409" cy="391" rx="13" ry="24" fill="#49334e"/>
                <path d="M387 418 Q408 435 431 418" fill="none" stroke="#e6c8f7" stroke-width="5" stroke-linecap="round"/>
                <ellipse cx="397" cy="380" rx="10" ry="12" fill="#fffaf6"/>
                <ellipse cx="421" cy="407" rx="5" ry="6" fill="#fffaf6" opacity=".92"/>
                <path d="M407 420v9m-4-4h8" stroke="#fff5d3" stroke-width="2" stroke-linecap="round"/>
              </g></g>
              <path d="M353 368 Q400 344 452 374" fill="none" stroke="#64445f" stroke-width="8" stroke-linecap="round"/>
              <path d="M358 374l-12-11m19 9-9-15" fill="none" stroke="#64445f" stroke-width="5" stroke-linecap="round"/>
              <path d="M376 431 Q403 448 435 434" fill="none" stroke="#ae7590" stroke-width="2.5" stroke-linecap="round"/>
            </g>
            <g class="eye-open">
              <path d="M574 375 Q623 345 666 374 Q666 412 648 431 Q619 449 589 434 Q567 411 574 375Z" fill="url(#eye-white)"/>
              <g clip-path="url(#right-eye)"><g class="iris">
                <ellipse cx="615" cy="398" rx="32" ry="46" fill="url(#iris)" stroke="#64446e" stroke-width="2.5"/>
                <ellipse cx="615" cy="391" rx="13" ry="24" fill="#49334e"/>
                <path d="M593 418 Q614 435 637 418" fill="none" stroke="#e6c8f7" stroke-width="5" stroke-linecap="round"/>
                <ellipse cx="603" cy="380" rx="10" ry="12" fill="#fffaf6"/>
                <ellipse cx="627" cy="407" rx="5" ry="6" fill="#fffaf6" opacity=".92"/>
                <path d="M613 420v9m-4-4h8" stroke="#fff5d3" stroke-width="2" stroke-linecap="round"/>
              </g></g>
              <path d="M572 374 Q624 344 671 368" fill="none" stroke="#64445f" stroke-width="8" stroke-linecap="round"/>
              <path d="M666 374l12-11m-19 9 9-15" fill="none" stroke="#64445f" stroke-width="5" stroke-linecap="round"/>
              <path d="M589 434 Q621 448 648 431" fill="none" stroke="#ae7590" stroke-width="2.5" stroke-linecap="round"/>
            </g>
            <g class="eye-closed" fill="none" stroke="#77506a" stroke-width="6" stroke-linecap="round">
              <path d="M365 399 Q404 375 446 399M578 399 Q620 375 659 399"/>
            </g>
            <g class="extra-blush" fill="#eaa0ad"><ellipse cx="384" cy="472" rx="27" ry="10"/><ellipse cx="640" cy="472" rx="27" ry="10"/></g>
          </svg>
          <button class="touch-target" type="button" part="interaction"></button>
          <svg class="hearts" viewBox="0 0 1024 1536" aria-hidden="true">
            <path class="heart" d="M244 352C218 326 181 356 244 402C307 356 270 326 244 352Z"/>
            <path class="heart" d="M760 308C736 284 702 312 760 355C818 312 784 284 760 308Z"/>
            <path class="heart" d="M698 210C679 191 650 214 698 249C746 214 717 191 698 210Z"/>
          </svg>
        </div>
      </div></div></div>
      <button class="minimize" type="button" title="收起角色">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12"/></svg>
      </button>
    </div>
    <button class="restore" type="button" hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11 3 3l7 4h4l7-4-1 8v5c0 6-16 6-16 0Z"/><path d="M8 13v1m8-1v1m-6 3 2 1 2-1"/></svg>
      <span></span>
    </button>
    <div class="load-state" role="status" hidden>角色图片未找到，请检查 asset-base 指向的资源目录。</div>
  `;

  class ZilingMascot extends HTMLElement {
    static get observedAttributes() {
      return ['name', 'size', 'mobile-size', 'motion', 'gaze', 'idle-talk', 'asset-base'];
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' }).append(template.content.cloneNode(true));
      this._timers = new Map();
      this._gaze = { x: 0, y: 0, tx: 0, ty: 0 };
      this._frame = 0;
      this._collapsed = false;
      this._expression = 'neutral';
      this._lastLine = '';
      this._loaded = false;
      this._reduced = matchMedia('(prefers-reduced-motion: reduce)');
      this._finePointer = matchMedia('(hover: hover) and (pointer: fine)');
      this._iris = [...this.shadowRoot.querySelectorAll('.iris')];
      this._eyes = this.shadowRoot.querySelector('.eyes');
    }

    connectedCallback() {
      this._events = new AbortController();
      const options = { signal: this._events.signal };
      this._syncAttributes();
      const image = this.shadowRoot.querySelector('.base');
      image.addEventListener(
        'load',
        () => {
          this._loaded = true;
          this.shadowRoot.querySelector('.load-state').hidden = true;
          this._renderVisibility();
          this.dispatchEvent(new CustomEvent('ziling:ready', { bubbles: true, composed: true }));
        },
        options,
      );
      image.addEventListener(
        'error',
        () => {
          this._loaded = false;
          this.shadowRoot.querySelector('.puppet').hidden = true;
          this.shadowRoot.querySelector('.load-state').hidden = false;
        },
        options,
      );
      this._setImage();
      try {
        this._collapsed = localStorage.getItem(this._storageKey()) === 'true';
      } catch {
        /* Private/file mode still works. */
      }
      this._renderVisibility();
      this.shadowRoot.querySelector('.touch-target').addEventListener(
        'click',
        (event) => {
          const rect = this.shadowRoot.querySelector('.art').getBoundingClientRect();
          this.interact(
            event.detail === 0 || (event.clientY - rect.top) / rect.height < 0.4 ? 'pet' : 'talk',
          );
        },
        options,
      );
      this.shadowRoot
        .querySelector('.minimize')
        .addEventListener('click', () => this.collapse(), options);
      this.shadowRoot
        .querySelector('.restore')
        .addEventListener('click', () => this.expand(), options);
      document.addEventListener(
        'pointermove',
        (event) => {
          if (event.pointerType !== 'mouse' || !this._canTrack()) return;
          const rect = this._rect || (this._rect = this.getBoundingClientRect());
          const faceX = rect.left + rect.width * 0.5;
          const faceY = rect.top + rect.height * 0.26;
          this._gaze.tx = clamp((event.clientX - faceX) / 22, -11, 11);
          this._gaze.ty = clamp((event.clientY - faceY) / 26, -8, 8);
          this._requestGaze();
        },
        { ...options, passive: true },
      );
      document.documentElement.addEventListener('pointerleave', () => this._centerGaze(), options);
      window.addEventListener('blur', () => this._centerGaze(), options);
      window.addEventListener(
        'resize',
        () => {
          this._rect = null;
        },
        { ...options, passive: true },
      );
      document.addEventListener('visibilitychange', () => this._refreshActivity(), options);
      this._reduced.addEventListener('change', () => this._refreshActivity(), options);
      this._finePointer.addEventListener('change', () => this._refreshActivity(), options);
      this._resizeObserver = new ResizeObserver(() => {
        this._rect = null;
      });
      this._resizeObserver.observe(this);
      this._refreshActivity();
      if (!this._collapsed && this.getAttribute('greeting') !== 'off') {
        this._later('greeting', () => this.say(this._line('hello')), 1100);
      }
    }

    disconnectedCallback() {
      this._events?.abort();
      this._resizeObserver?.disconnect();
      for (const timer of this._timers.values()) clearTimeout(timer);
      this._timers.clear();
      cancelAnimationFrame(this._frame);
      this._frame = 0;
      this._reaction?.cancel();
    }

    attributeChangedCallback(name) {
      this._syncAttributes();
      if (this.isConnected) {
        if (name === 'asset-base') this._setImage();
        this._rect = null;
        this._refreshActivity();
      }
    }

    get collapsed() {
      return this._collapsed;
    }
    get characterName() {
      return this.getAttribute('name')?.trim() || '紫铃';
    }
    get still() {
      return this.getAttribute('motion') === 'off' || this._reduced.matches;
    }

    _storageKey() {
      return this.getAttribute('storage-key') || 'ziling:collapsed:v1';
    }

    _syncAttributes() {
      const size = Number.parseFloat(this.getAttribute('size'));
      const mobileSize = Number.parseFloat(this.getAttribute('mobile-size'));
      this.style.setProperty(
        '--ziling-width',
        `${Number.isFinite(size) ? clamp(size, 100, 480) : 240}px`,
      );
      this.style.setProperty(
        '--ziling-mobile-width',
        `${Number.isFinite(mobileSize) ? clamp(mobileSize, 90, 260) : 144}px`,
      );
      this.shadowRoot
        .querySelector('.touch-target')
        .setAttribute('aria-label', `和${this.characterName}互动`);
      this.shadowRoot
        .querySelector('.minimize')
        .setAttribute('aria-label', `收起${this.characterName}`);
      this.shadowRoot
        .querySelector('.restore')
        .setAttribute('aria-label', `唤回${this.characterName}`);
      this.shadowRoot.querySelector('.restore span').textContent = this.characterName;
      this.shadowRoot.querySelector('.bubble-name').textContent = this.characterName;
      this.toggleAttribute('data-still', this.still);
    }

    _setImage() {
      try {
        const base = new URL(this.getAttribute('asset-base') || assetBase, document.baseURI);
        if (!base.pathname.endsWith('/')) base.pathname += '/';
        this.shadowRoot.querySelector('.base').src = new URL('character-base.png', base).href;
      } catch {
        this.shadowRoot.querySelector('.load-state').hidden = false;
      }
    }

    _later(key, callback, delay) {
      this._clear(key);
      this._timers.set(
        key,
        setTimeout(() => {
          this._timers.delete(key);
          if (this.isConnected) callback();
        }, delay),
      );
    }

    _clear(key) {
      clearTimeout(this._timers.get(key));
      this._timers.delete(key);
    }

    _line(group) {
      const choices = lines[group].filter((line) => line !== this._lastLine);
      this._lastLine = choices[Math.floor(Math.random() * choices.length)] || lines[group][0];
      return this._lastLine;
    }

    _setExpression(expression) {
      this._expression = expression;
      this._eyes.dataset.expression = expression;
    }

    _canTrack() {
      return (
        !this._collapsed &&
        !document.hidden &&
        !this.still &&
        this.getAttribute('gaze') !== 'off' &&
        this._finePointer.matches
      );
    }

    _requestGaze() {
      if (this._frame) return;
      const step = () => {
        this._frame = 0;
        const gaze = this._gaze;
        gaze.x += (gaze.tx - gaze.x) * 0.16;
        gaze.y += (gaze.ty - gaze.y) * 0.16;
        for (const iris of this._iris)
          iris.setAttribute('transform', `translate(${gaze.x.toFixed(2)} ${gaze.y.toFixed(2)})`);
        if (Math.abs(gaze.tx - gaze.x) + Math.abs(gaze.ty - gaze.y) > 0.04)
          this._frame = requestAnimationFrame(step);
      };
      this._frame = requestAnimationFrame(step);
    }

    _centerGaze(immediate = false) {
      this._gaze.tx = 0;
      this._gaze.ty = 0;
      if (immediate) {
        cancelAnimationFrame(this._frame);
        this._frame = 0;
        this._gaze.x = this._gaze.y = 0;
        for (const iris of this._iris) iris.setAttribute('transform', 'translate(0 0)');
      } else this._requestGaze();
    }

    _refreshActivity() {
      const inactive = document.hidden || this._collapsed;
      this.toggleAttribute('data-still', this.still);
      this.toggleAttribute('data-suspended', inactive);
      this._clear('blink');
      this._clear('idle');
      if (inactive || this.still) {
        this._clear('reopen');
        this._clear('happy');
        this._setExpression('neutral');
        this._centerGaze(true);
        this._reaction?.cancel();
      } else {
        this._scheduleBlink();
      }
      if (!this._canTrack()) this._centerGaze(true);
      if (!inactive && this.getAttribute('idle-talk') !== 'off') this._scheduleIdle();
      if (inactive) {
        this._clear('greeting');
        this._clear('bubble');
        this.shadowRoot.querySelector('.bubble').hidden = true;
      }
    }

    _scheduleBlink() {
      this._later(
        'blink',
        () => {
          this.blink();
          this._scheduleBlink();
        },
        random(2800, 6200),
      );
    }

    _scheduleIdle() {
      this._later(
        'idle',
        () => {
          if (this._expression === 'neutral' && this.shadowRoot.querySelector('.bubble').hidden)
            this.say(this._line('idle'));
          this._scheduleIdle();
        },
        random(36000, 64000),
      );
    }

    /** A brief manual blink also works when automatic motion is disabled. */
    blink() {
      if (this._collapsed || document.hidden || this._expression === 'happy') return;
      this._setExpression('blink');
      this._later('reopen', () => this._setExpression('neutral'), 145);
      this._emit('blink');
    }

    /** Text is inserted as textContent, never HTML. */
    say(text, duration = 4800) {
      if (this._collapsed || document.hidden) return;
      const bubble = this.shadowRoot.querySelector('.bubble');
      this.shadowRoot.querySelector('.bubble-text').textContent = String(text).slice(0, 180);
      bubble.hidden = false;
      this._later(
        'bubble',
        () => {
          bubble.hidden = true;
        },
        Math.max(1200, Number(duration) || 4800),
      );
      this._emit('say');
    }

    interact(kind = 'pet') {
      if (this._collapsed) this.expand();
      if (kind === 'talk') {
        this.say(this._line('talk'));
      } else {
        this._clear('reopen');
        this._setExpression('happy');
        this.say(this._line('pet'));
        this._later('happy', () => this._setExpression('neutral'), 1500);
        const hearts = this.shadowRoot.querySelector('.hearts');
        hearts.classList.remove('active');
        void hearts.getBoundingClientRect();
        hearts.classList.add('active');
        this._later('hearts', () => hearts.classList.remove('active'), 1350);
        if (!this.still) {
          this._reaction?.cancel();
          this._reaction = this.shadowRoot
            .querySelector('.reaction')
            .animate(
              [
                { transform: 'translateY(0) rotate(0)' },
                { transform: 'translateY(-9px) rotate(-1.4deg)', offset: 0.3 },
                { transform: 'translateY(1px) rotate(0.5deg)', offset: 0.7 },
                { transform: 'translateY(0) rotate(0)' },
              ],
              { duration: 620, easing: 'cubic-bezier(.16,1,.3,1)' },
            );
        }
      }
      this._emit(kind);
    }

    collapse() {
      this._collapsed = true;
      this._saveVisibility();
      this._renderVisibility();
      this._refreshActivity();
      this.shadowRoot.querySelector('.restore').focus({ preventScroll: true });
      this._emit('collapse');
    }

    expand() {
      this._collapsed = false;
      this._saveVisibility();
      this._renderVisibility();
      this._refreshActivity();
      this.say('我回来啦，继续陪着你。');
      this.shadowRoot.querySelector('.touch-target').focus({ preventScroll: true });
      this._emit('expand');
    }

    _renderVisibility() {
      this.shadowRoot.querySelector('.puppet').hidden = this._collapsed;
      this.shadowRoot.querySelector('.restore').hidden = !this._collapsed;
      if (this._collapsed) this.shadowRoot.querySelector('.bubble').hidden = true;
    }

    _saveVisibility() {
      try {
        localStorage.setItem(this._storageKey(), String(this._collapsed));
      } catch {
        /* Storage is optional. */
      }
    }

    _emit(action) {
      this.dispatchEvent(
        new CustomEvent('ziling:interact', {
          bubbles: true,
          composed: true,
          detail: { action, expression: this._expression, collapsed: this._collapsed },
        }),
      );
    }
  }

  customElements.define('ziling-mascot', ZilingMascot);
})();
