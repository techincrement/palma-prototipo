/* Interações das páginas internas: listagem (filtros, ordenação, busca),
   produto (galeria, voltagem, quantidade, frete, avise-me), minha conta e checkout. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const params = new URLSearchParams(location.search);
  const brl = (v) => "R$ " + v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  /* ---------- Listagem ---------- */
  const plp = $("[data-plp]");
  if (plp) {
    const grid = $("[data-grid]");
    const items = $$(".product-grid__item", grid);
    const empty = $("[data-empty]");
    const pag = $("[data-pagination]");
    const count = $("[data-plp-count]");
    const heading = $("[data-plp-heading]");
    const cats = window.PALMA_CATS || {};
    const state = { cat: new Set(), marca: new Set(), volt: new Set(), oferta: false, frete: false, min: null, max: null, q: "", sort: "relevancia" };

    // Estado inicial vindo da URL
    const c = params.get("c"), s = params.get("s"), marca = params.get("marca"), q = params.get("q");
    if (c && cats[c]) {
      state.cat.add(c);
      $("[data-plp-kicker]").textContent = cats[c].nome;
      $("[data-plp-title]").textContent = cats[c].titulo;
      $("[data-plp-text]").textContent = cats[c].texto;
      heading.textContent = cats[c].nome;
      const crumb = $(".breadcrumb [aria-current]");
      if (crumb) crumb.textContent = cats[c].nome;
      document.title = cats[c].nome + " | Palma Máquinas e Ferramentas";
    }
    if (s) state.sub = s;
    if (marca) state.marca.add(marca);
    if (params.get("ofertas")) { state.oferta = true; heading.textContent = "Ofertas da semana"; $("[data-plp-kicker]").textContent = "Ofertas"; $("[data-plp-title]").textContent = "Ofertas da semana"; $("[data-plp-text]").textContent = "Preços válidos enquanto durarem os estoques. Aproveite o desconto no Pix."; }
    if (q) { state.q = q.toLowerCase(); heading.textContent = "Resultados para “" + q + "”"; $("[data-plp-kicker]").textContent = "Busca"; $("[data-plp-title]").textContent = "Resultados para “" + q + "”"; $("[data-plp-text]").textContent = "Produtos encontrados no catálogo para o termo buscado."; }

    // Marca os checkboxes conforme o estado (nos dois blocos de filtros: lateral e drawer)
    function syncChecks() {
      $$("[data-filters] input[type=checkbox]").forEach((i) => {
        if (i.name === "cat") i.checked = state.cat.has(i.value);
        if (i.name === "marca") i.checked = state.marca.has(i.value);
        if (i.name === "volt") i.checked = state.volt.has(i.value);
        if (i.name === "oferta") i.checked = state.oferta;
        if (i.name === "frete") i.checked = state.frete;
      });
    }

    function matches(el) {
      const d = el.dataset;
      if (state.cat.size && !state.cat.has(d.cat)) return false;
      if (state.sub && d.sub !== state.sub) return false;
      if (state.marca.size && !state.marca.has(d.marca)) return false;
      if (state.volt.size && !d.volt.toLowerCase().split("|").some((v) => state.volt.has(v))) return false;
      if (state.oferta && d.oferta !== "1") return false;
      if (state.frete && d.frete !== "1") return false;
      const preco = parseFloat(d.preco);
      if (state.min != null && preco < state.min) return false;
      if (state.max != null && preco > state.max) return false;
      if (state.q && !d.nome.includes(state.q)) return false;
      return true;
    }

    function apply() {
      let visible = items.filter(matches);
      const sorters = {
        menor: (a, b) => a.dataset.preco - b.dataset.preco,
        maior: (a, b) => b.dataset.preco - a.dataset.preco,
        desconto: (a, b) => b.dataset.oferta - a.dataset.oferta,
        nome: (a, b) => a.dataset.nome.localeCompare(b.dataset.nome),
      };
      if (sorters[state.sort]) visible = visible.slice().sort(sorters[state.sort]);
      items.forEach((el) => (el.style.display = "none"));
      visible.forEach((el) => { el.style.display = ""; grid.appendChild(el); });
      const none = visible.length === 0;
      if (none && state.q && !state.cat.size && !state.marca.size) {
        location.replace("busca-sem-resultado.html?q=" + encodeURIComponent(state.q));
        return;
      }
      grid.style.display = none ? "none" : "";
      empty.style.display = none ? "" : "none";
      if (pag) pag.style.display = none ? "none" : "";
      count.textContent = none ? "Nenhum produto encontrado" : "Exibindo " + visible.length + " de " + items.length + " produtos";
    }

    $$("[data-filters]").forEach((f) => {
      f.addEventListener("change", (e) => {
        const i = e.target;
        if (i.type === "checkbox") {
          const set = state[i.name];
          if (set instanceof Set) { i.checked ? set.add(i.value) : set.delete(i.value); }
          else state[i.name] = i.checked;
          state.sub = null;
          syncChecks(); apply();
        }
      });
      f.addEventListener("input", (e) => {
        if (e.target.id === "preco-min") { state.min = e.target.value ? +e.target.value : null; apply(); }
        if (e.target.id === "preco-max") { state.max = e.target.value ? +e.target.value : null; apply(); }
      });
    });
    $$("[data-clear-filters]").forEach((b) => b.addEventListener("click", (e) => {
      e.preventDefault();
      state.cat.clear(); state.marca.clear(); state.volt.clear(); state.oferta = false; state.frete = false; state.min = state.max = null; state.sub = null;
      $$("#preco-min, #preco-max").forEach((i) => (i.value = ""));
      const act = $("[data-active-filters]"); if (act) act.remove();
      syncChecks(); apply();
    }));
    const sortSel = $("[data-sort]");
    if (sortSel) sortSel.addEventListener("change", () => { state.sort = sortSel.value; apply(); });
    $$("[data-sort-options] input").forEach((r) => r.addEventListener("change", () => { state.sort = r.value; if (sortSel) sortSel.value = r.value; apply(); }));

    if (!$("[data-active-filters]")) { syncChecks(); apply(); }
  }

  /* ---------- Produto ---------- */
  $$("[data-tabs]").forEach((tabs) => {
    const btns = $$("[role=tab]", tabs);
    const panels = $$("[role=tabpanel]", tabs);
    const select = (tab) => {
      btns.forEach((t) => { const on = t === tab; t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1; });
      panels.forEach((p) => { p.hidden = p.id !== tab.getAttribute("aria-controls"); });
    };
    btns.forEach((t, i) => {
      t.addEventListener("click", () => select(t));
      t.addEventListener("keydown", (e) => {
        const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        const n = btns[(i + d + btns.length) % btns.length];
        n.focus(); select(n);
      });
    });
  });
  $$("[data-thumb]").forEach((t) => t.addEventListener("click", () => {
    $$("[data-thumb]").forEach((x) => x.classList.remove("is-active"));
    t.classList.add("is-active");
    const stage = $("[data-stage]"); const img = $("img", t);
    if (stage && img) stage.src = img.src;
  }));
  $$("[data-chip]").forEach((c) => c.addEventListener("click", () => {
    const group = c.parentElement;
    $$("[data-chip]", group).forEach((x) => x.setAttribute("aria-pressed", "false"));
    c.setAttribute("aria-pressed", "true");
    const v = $("[data-chip-value]"); if (v) v.textContent = "· " + c.textContent.trim();
    const add = $("[data-pdp-add]"); if (add) add.dataset.voltSelected = c.textContent.trim();
  }));
  $$("[data-qty]").forEach((q) => {
    const input = $("input", q);
    const set = (n) => { input.value = Math.max(1, Math.min(99, n)); $("[data-minus]", q).disabled = +input.value <= 1; };
    $("[data-minus]", q).addEventListener("click", () => set(+input.value - 1));
    $("[data-plus]", q).addEventListener("click", () => set(+input.value + 1));
    input.addEventListener("change", () => set(parseInt(input.value, 10) || 1));
    set(+input.value);
  });
  const ship = $("[data-shipping]");
  if (ship) ship.addEventListener("submit", (e) => {
    e.preventDefault();
    const cep = $("input", ship).value.replace(/\D/g, "");
    if (cep.length < 8) { $("input", ship).focus(); return; }
    $("[data-shipping-result]").hidden = false;
  });
  $$("[data-avise-form]").forEach((f) => f.addEventListener("submit", (e) => {
    e.preventDefault();
    if (window.PALMA && window.PALMA.toast) window.PALMA.toast("Pronto! Avisaremos quando o produto voltar.");
    f.reset();
  }));
  const aviseBtn = $("[data-avise-confirm]");
  if (aviseBtn) aviseBtn.addEventListener("click", () => {
    if (window.PALMA && window.PALMA.closePanel) window.PALMA.closePanel();
    if (window.PALMA && window.PALMA.toast) window.PALMA.toast("Pronto! Avisaremos quando o produto voltar.");
  });

  /* ---------- Checkout: formas de pagamento ---------- */
  $$("[data-pay-method]").forEach((m) => m.addEventListener("click", () => {
    $$("[data-pay-method]").forEach((x) => { x.classList.remove("is-active"); const r = $("input", x); if (r) r.checked = false; });
    m.classList.add("is-active"); const r = $("input", m); if (r) r.checked = true;
    $$("[data-pay-panel]").forEach((p) => (p.hidden = p.dataset.payPanel !== m.dataset.payMethod));
  }));
  $$("[data-delivery-option]").forEach((o) => o.addEventListener("click", () => {
    $$("[data-delivery-option]").forEach((x) => { x.classList.remove("is-active"); const r = $("input", x); if (r) r.checked = false; });
    o.classList.add("is-active"); const r = $("input", o); if (r) r.checked = true;
  }));
  $$("[data-copy]").forEach((b) => b.addEventListener("click", () => {
    const code = $(b.dataset.copy);
    if (code && navigator.clipboard) navigator.clipboard.writeText(code.textContent.trim());
    if (window.PALMA && window.PALMA.toast) window.PALMA.toast("Código copiado.");
  }));

  /* ---------- Formulários de demonstração: não navegam ---------- */
  $$("form[data-demo]").forEach((f) => f.addEventListener("submit", (e) => {
    e.preventDefault();
    if (window.PALMA && window.PALMA.toast) window.PALMA.toast(f.dataset.demo || "Salvo com sucesso.");
  }));
})();
