/* Interações do protótipo: drawers, modais, toast, carrosséis, mega menu,
   carrinho (estado em memória), quantidade, favoritos, newsletter. */
(function () {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const brl = (v) => "R$ " + v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  /* ---------- Overlay, drawers e modais ---------- */
  const overlay = $("[data-overlay]");
  let openEl = null;

  function lock(on) {
    document.body.classList.toggle("is-locked", on);
  }

  function openPanel(id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (openEl && openEl !== el) closePanel();
    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");
    if (el.classList.contains("drawer") && overlay) overlay.classList.add("is-open");
    openEl = el;
    lock(true);
    const focusable = el.querySelector("button, [href], input");
    if (focusable) focusable.focus({ preventScroll: true });
  }

  function closePanel() {
    if (!openEl) return;
    openEl.classList.remove("is-open");
    openEl.setAttribute("aria-hidden", "true");
    if (overlay) overlay.classList.remove("is-open");
    openEl = null;
    lock(false);
  }

  document.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-open]");
    if (opener) {
      e.preventDefault();
      openPanel(opener.dataset.open);
      return;
    }
    if (e.target.closest("[data-close]") || e.target === overlay) {
      closePanel();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePanel();
  });

  /* ---------- Toast ---------- */
  const toastEl = $("[data-toast-el]");
  let toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    $("[data-toast-text]", toastEl).textContent = msg;
    toastEl.classList.add("is-open");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-open"), 3200);
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-toast]");
    if (t) toast(t.dataset.toast);
  });

  /* ---------- Carrinho (estado simples em memória) ---------- */
  const cart = {
    list: $("[data-cart-list]"),
    empty: $("[data-cart-empty]"),
    footer: $("[data-cart-footer]"),
    freeShippingAt: 1389.5,
    refresh() {
      if (!this.list) return;
      const items = $$("[data-cart-item]", this.list);
      let units = 0;
      let subtotal = 0;
      items.forEach((it) => {
        const qty = parseInt($("input", it).value, 10) || 1;
        const price = parseFloat($("[data-price]", it).dataset.price);
        $("[data-price]", it).textContent = brl(price * qty);
        units += qty;
        subtotal += price * qty;
      });
      $$("[data-cart-count]").forEach((el) => (el.textContent = items.length));
      const label = $("[data-cart-items-label]");
      if (label) label.textContent = items.length + (items.length === 1 ? " item" : " itens");
      const u = $("[data-cart-units]");
      if (u) u.textContent = units;
      const s = $("[data-cart-subtotal]");
      if (s) s.textContent = brl(subtotal);
      const t = $("[data-cart-total]");
      if (t) t.textContent = brl(subtotal);
      const prog = $("[data-shipping-progress]");
      if (prog) {
        const missing = this.freeShippingAt - subtotal;
        const bar = $(".progress__bar span", prog);
        const text = $("[data-shipping-text]", prog);
        if (missing <= 0) {
          text.textContent = "Você ganhou frete grátis neste pedido";
          bar.style.width = "100%";
        } else {
          text.textContent = "Faltam " + brl(missing) + " para o frete grátis";
          bar.style.width = Math.min(100, (subtotal / this.freeShippingAt) * 100).toFixed(0) + "%";
        }
        prog.hidden = items.length === 0;
      }
      const isEmpty = items.length === 0;
      if (this.empty) this.empty.hidden = !isEmpty;
      if (this.footer) this.footer.hidden = isEmpty;
    },
  };

  document.addEventListener("click", (e) => {
    const qtyBtn = e.target.closest("[data-qty]");
    if (qtyBtn) {
      const input = $("input", qtyBtn.closest(".qty"));
      const next = Math.max(1, (parseInt(input.value, 10) || 1) + parseInt(qtyBtn.dataset.qty, 10));
      input.value = next;
      cart.refresh();
      return;
    }
    const rm = e.target.closest("[data-remove]");
    if (rm) {
      const item = rm.closest("[data-cart-item]");
      item.style.transition = "opacity .2s, transform .2s";
      item.style.opacity = "0";
      item.style.transform = "translateX(16px)";
      setTimeout(() => {
        item.remove();
        cart.refresh();
        toast("Produto removido do carrinho");
      }, 200);
      return;
    }
    const add = e.target.closest("[data-add-to-cart]");
    if (add) {
      const card = add.closest(".product-card");
      const hasVoltage = (add.dataset.volt || "").split("|").filter(Boolean).length > 1;
      if (hasVoltage && document.getElementById("modal-voltagem")) {
        openPanel("modal-voltagem");
        $("[data-confirm-voltagem]").dataset.product = add.dataset.addToCart;
        return;
      }
      addProductFromCard(card);
    }
    const confirm = e.target.closest("[data-confirm-voltagem]");
    if (confirm) {
      const card = $('[data-add-to-cart="' + confirm.dataset.product + '"]');
      closePanel();
      addProductFromCard(card ? card.closest(".product-card") : null);
    }
  });

  function addProductFromCard(card) {
    if (card && cart.list) {
      const name = $(".product-card__name", card).textContent.trim();
      const img = $("img", card).getAttribute("src");
      const price = parseFloat(
        $(".price__current", card).textContent.replace(/[^\d,]/g, "").replace(",", ".")
      );
      const el = document.createElement("div");
      el.className = "cart-item";
      el.setAttribute("data-cart-item", "");
      el.innerHTML =
        '<div class="cart-item__media"><img src="' + img + '" alt=""></div>' +
        '<div class="cart-item__body"><p class="cart-item__name">' + name + "</p>" +
        '<span class="cart-item__meta">Adicionado agora</span>' +
        '<div class="cart-item__row"><div class="qty"><button type="button" data-qty="-1" aria-label="Diminuir"><svg class="icon"><use href="#i-minus"></use></svg></button><input type="text" value="1" inputmode="numeric" aria-label="Quantidade"><button type="button" data-qty="1" aria-label="Aumentar"><svg class="icon"><use href="#i-plus"></use></svg></button></div>' +
        '<div style="display:flex;align-items:center;gap:8px"><span class="cart-item__price" data-price="' + price + '">' + brl(price) + '</span><button class="cart-item__remove" type="button" data-remove aria-label="Remover"><svg class="icon"><use href="#i-trash"></use></svg></button></div></div></div>';
      cart.list.prepend(el);
      cart.refresh();
    }
    toast("Produto adicionado ao carrinho");
    setTimeout(() => openPanel("minicart"), 350);
  }

  cart.refresh();

  /* ---------- Favoritos ---------- */
  document.addEventListener("click", (e) => {
    const w = e.target.closest(".product-card__wishlist");
    if (!w) return;
    const on = w.getAttribute("aria-pressed") !== "true";
    w.setAttribute("aria-pressed", on);
    const use = $("use", w);
    if (use) use.setAttribute("href", on ? "#i-heart-filled" : "#i-heart");
    toast(on ? "Adicionado aos favoritos" : "Removido dos favoritos");
  });

  /* ---------- Carrossel de prateleira ---------- */
  $$("[data-carousel]").forEach((root) => {
    const track = $("[data-track]", root);
    const prev = $("[data-prev]", root);
    const next = $("[data-next]", root);
    let index = 0;

    function perView() {
      const first = track.children[0];
      if (!first) return 1;
      const gap = parseFloat(getComputedStyle(track).gap) || 0;
      return Math.max(1, Math.round((track.parentElement.clientWidth + gap) / (first.offsetWidth + gap)));
    }

    function update() {
      const pv = perView();
      const max = Math.max(0, track.children.length - pv);
      index = Math.min(index, max);
      const first = track.children[0];
      const gap = parseFloat(getComputedStyle(track).gap) || 0;
      track.style.transform = "translateX(-" + index * (first.offsetWidth + gap) + "px)";
      if (prev) prev.disabled = index === 0;
      if (next) next.disabled = index >= max;
    }

    prev && prev.addEventListener("click", () => { index = Math.max(0, index - perView()); update(); });
    next && next.addEventListener("click", () => { index += perView(); update(); });
    window.addEventListener("resize", update);

    let startX = 0;
    track.addEventListener("touchstart", (e) => (startX = e.touches[0].clientX), { passive: true });
    track.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) { index += dx < 0 ? 1 : -1; if (index < 0) index = 0; update(); }
    });
    update();
  });

  /* ---------- Hero ---------- */
  $$("[data-hero]").forEach((root) => {
    const track = $("[data-track]", root);
    const dots = $$(".hero__dot", root);
    const total = track.children.length;
    let i = 0;
    let timer;

    function go(n) {
      i = (n + total) % total;
      track.style.transform = "translateX(-" + i * 100 + "%)";
      dots.forEach((d, k) => d.classList.toggle("is-active", k === i));
      root.toggleAttribute("data-light", track.children[i].classList.contains("hero__slide--light"));
    }
    function auto() {
      clearInterval(timer);
      timer = setInterval(() => go(i + 1), 6000);
    }
    dots.forEach((d, k) => d.addEventListener("click", () => { go(k); auto(); }));
    root.addEventListener("mouseenter", () => clearInterval(timer));
    root.addEventListener("mouseleave", auto);
    auto();
  });

  /* ---------- Mega menu "Todas as categorias" ---------- */
  $$(".megamenu--all").forEach((menu) => {
    const cats = $$(".megamenu__cat", menu);
    const panels = $$(".megamenu__panel", menu);
    cats.forEach((c) => {
      c.addEventListener("mouseenter", () => {
        cats.forEach((x) => x.classList.toggle("is-active", x === c));
        panels.forEach((p) => p.classList.toggle("is-active", p.dataset.panel === c.dataset.panel));
      });
    });
    const item = menu.closest(".nav__item");
    const trigger = $(".nav__all", item);
    trigger.addEventListener("click", () => item.classList.toggle("is-open"));
    document.addEventListener("click", (e) => {
      if (!item.contains(e.target)) item.classList.remove("is-open");
    });
  });

  /* ---------- Dropdowns de categoria: alinhar à direita quando vazarem a tela ---------- */
  $$(".nav__item:not(.nav__item--all)").forEach((item) => {
    const menu = $(".megamenu", item);
    if (!menu) return;
    const fit = () => {
      item.classList.remove("nav__item--right");
      const r = menu.getBoundingClientRect();
      if (r.right > window.innerWidth - 16) item.classList.add("nav__item--right");
    };
    item.addEventListener("mouseenter", fit);
    item.addEventListener("focusin", fit);
  });

  /* ---------- Menu mobile: subcategorias ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-toggle-sub]");
    if (!t) return;
    const sub = t.nextElementSibling;
    const open = sub.classList.toggle("is-open");
    const use = $("use", t);
    if (use) use.setAttribute("href", open ? "#i-chevron-up" : "#i-chevron-down");
  });

  /* ---------- Newsletter ---------- */
  $$("[data-newsletter]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      toast("Cadastro realizado. Seu cupom de 5% chega por e-mail.");
      form.reset();
    });
  });

  /* ---------- Footer: accordions abertos no desktop ---------- */
  function syncFooter() {
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    $$(".footer__col").forEach((d) => { if (d.tagName === "DETAILS") d.open = desktop || d.open; });
  }
  syncFooter();
  window.addEventListener("resize", syncFooter);
  /* API mínima para os scripts das páginas internas */
  window.PALMA = { toast, openPanel, closePanel };
})();
