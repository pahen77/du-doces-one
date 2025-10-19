// Basic helpers
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const BRL = (cents = 0) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const LS = {
  get: (k, def) => {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : def;
    } catch {
      return def;
    }
  },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v))
};
const state = {
  products: [],
  cart: LS.get("du_cart", []),
  user: LS.get("du_user", null),
  token: LS.get("du_token", null)
};
const API_BASE = window.CONFIG.API_BASE;
const USE_API = window.CONFIG.USE_API;

// Topbar listeners
function initTopbar() {
  $("#btnMenu").onclick = () => $("#sideMenu").classList.add("open");
  $("#btnCart").onclick = () => $("#cartDrawer").classList.add("open");
  $$("#sideMenu [data-close]").forEach(el => el.onclick = () => $("#sideMenu").classList.remove("open"));
  $$("#cartDrawer [data-close]").forEach(el => el.onclick = () => $("#cartDrawer").classList.remove("open"));
  $("#toggleTheme").onclick = () => {
    document.body.classList.toggle("dark");
    LS.set("theme", document.body.classList.contains("dark") ? "dark" : "light");
  };
  if (LS.get("theme", "dark") === "dark") {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }
  $("#fabAI").onclick = () => {
    if (window.CONFIG.CHATVOLT_KEY) {
      alert("ChatVolt configurado! O widget será exibido automaticamente.");
    } else {
      alert("IA não configurada. Defina sua CHATVOLT_KEY em config.js.");
    }
  };
  $("#search").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = state.products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.brand || "").toLowerCase().includes(q)
    );
    renderProducts(filtered);
  });
}

// Cart helpers
function updateCartUI() {
  const total = state.cart.reduce((acc, item) => acc + item.price_cents * item.qty, 0);
  $("#cartBadge").textContent = state.cart.reduce((acc, i) => acc + i.qty, 0);
  $("#cartTotal").textContent = BRL(total);
  const list = $("#cartList");
  list.innerHTML = state.cart.map(item => `
    <div class="row" style="justify-content:space-between;border-bottom:1px solid #26262f;padding:8px 0;">
      <div><strong>${item.name}</strong><div class="small">${BRL(item.price_cents)} × ${item.qty}</div></div>
      <div class="row">
        <button class="btn" data-dec="${item.product_id}">−</button>
        <button class="btn" data-inc="${item.product_id}">+</button>
        <button class="btn" data-del="${item.product_id}">✕</button>
      </div>
    </div>
  `).join("");
  list.onclick = (e) => {
    const dec = e.target.getAttribute("data-dec");
    const inc = e.target.getAttribute("data-inc");
    const del = e.target.getAttribute("data-del");
    if (dec) changeQty(Number(dec), -1);
    if (inc) changeQty(Number(inc), 1);
    if (del) removeItem(Number(del));
  };
  LS.set("du_cart", state.cart);
}

function addToCart(prod) {
  const idx = state.cart.findIndex(i => i.product_id === prod.id);
  if (idx >= 0) {
    state.cart[idx].qty++;
  } else {
    state.cart.push({ product_id: prod.id, name: prod.name, price_cents: prod.price_cents, qty: 1 });
  }
  updateCartUI();
}

function changeQty(productId, delta) {
  const idx = state.cart.findIndex(i => i.product_id === productId);
  if (idx < 0) return;
  state.cart[idx].qty += delta;
  if (state.cart[idx].qty <= 0) {
    state.cart.splice(idx, 1);
  }
  updateCartUI();
}

function removeItem(productId) {
  const idx = state.cart.findIndex(i => i.product_id === productId);
  if (idx >= 0) {
    state.cart.splice(idx, 1);
    updateCartUI();
  }
}

// Carousel functionality
let currentSlide = 0;
let carouselInterval;

function initCarousel() {
  const slides = [
    { text: "🍭 Promoções Especiais!", subtext: "Até 50% OFF" },
    { text: "🥤 Bebidas Geladas", subtext: "Coca-Cola, Tang e muito mais!" },
    { text: "🍫 Chocolates Premium", subtext: "Nestlé, Lacta, Arcor" },
    { text: "🍿 Salgadinhos OZ", subtext: "Os melhores preços!" }
  ];
  
  $("#app").innerHTML = `
    <section class="container">
      <!-- Banner Carousel -->
      <div class="carousel-container">
        <div class="carousel" id="carousel">
          ${slides.map((slide, i) => `
            <div class="carousel-slide">
              <div style="text-align: center;">
                <div style="font-size: 28px; margin-bottom: 8px;">${slide.text}</div>
                <div style="font-size: 16px; opacity: 0.9;">${slide.subtext}</div>
              </div>
            </div>
          `).join("")}
        </div>
        <button class="carousel-arrow prev" id="carouselPrev">‹</button>
        <button class="carousel-arrow next" id="carouselNext">›</button>
        <div class="carousel-dots" id="carouselDots">
          ${slides.map((_, i) => `
            <button class="carousel-dot ${i === 0 ? 'active' : ''}" data-slide="${i}"></button>
          `).join("")}
        </div>
      </div>
      
      <!-- Category Filters -->
      <div class="category-filters">
        <button class="category-btn active" data-category="">Todas</button>
        <button class="category-btn" data-category="Bebidas">🥤 Bebidas</button>
        <button class="category-btn" data-category="Salgadinhos">🍿 Salgadinhos</button>
        <button class="category-btn" data-category="Chocolates">🍫 Chocolates</button>
        <button class="category-btn" data-category="Utilidades">🔧 Utilidades</button>
      </div>
      
      <!-- Brand Filters -->
      <div class="brand-filters">
        <button class="brand-btn" data-brand="">Todas</button>
        <button class="brand-btn" data-brand="Coca-Cola">Coca-Cola</button>
        <button class="brand-btn" data-brand="Tang">Tang</button>
        <button class="brand-btn" data-brand="Arcor">Arcor</button>
        <button class="brand-btn" data-brand="Santa Helena">Santa Helena</button>
        <button class="brand-btn" data-brand="OZ">OZ</button>
        <button class="brand-btn" data-brand="Nestlé">Nestlé</button>
        <button class="brand-btn" data-brand="Lacta">Lacta</button>
      </div>
      
      <!-- Products Grid -->
      <div class="grid" id="productGrid"></div>
      <div class="space"></div>
      <div class="footer-line"></div>
      <p class="small">© Du Doces Distribuidora — Contato: WhatsApp</p>
    </section>
  `;
  
  // Carousel event listeners
  $("#carouselPrev").onclick = () => changeSlide(-1);
  $("#carouselNext").onclick = () => changeSlide(1);
  
  // Dot navigation
  $$("#carouselDots .carousel-dot").forEach(dot => {
    dot.onclick = () => {
      currentSlide = parseInt(dot.getAttribute("data-slide"));
      updateCarousel();
    };
  });
  
  // Start autoplay
  startCarousel();
  
  // Pause on hover
  $(".carousel-container").addEventListener("mouseenter", stopCarousel);
  $(".carousel-container").addEventListener("mouseleave", startCarousel);
  
  // Category and brand filters
  $$(".category-btn").forEach(btn => {
    btn.onclick = () => {
      $$(".category-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      filterProducts();
    };
  });
  
  $$(".brand-btn").forEach(btn => {
    btn.onclick = () => {
      $$(".brand-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      filterProducts();
    };
  });
  
  renderProducts(state.products);
}

function changeSlide(direction) {
  const slides = $$(".carousel-slide");
  currentSlide += direction;
  
  if (currentSlide >= slides.length) currentSlide = 0;
  if (currentSlide < 0) currentSlide = slides.length - 1;
  
  updateCarousel();
}

function updateCarousel() {
  const carousel = $("#carousel");
  const dots = $$(".carousel-dot");
  
  carousel.style.transform = `translateX(-${currentSlide * 100}%)`;
  
  dots.forEach((dot, i) => {
    dot.classList.toggle("active", i === currentSlide);
  });
}

function startCarousel() {
  stopCarousel();
  carouselInterval = setInterval(() => changeSlide(1), 5000);
}

function stopCarousel() {
  if (carouselInterval) {
    clearInterval(carouselInterval);
    carouselInterval = null;
  }
}

function filterProducts() {
  const activeCategory = $(".category-btn.active").getAttribute("data-category");
  const activeBrand = $(".brand-btn.active").getAttribute("data-brand");
  
  let filtered = state.products;
  
  if (activeCategory) {
    filtered = filtered.filter(p => p.category === activeCategory);
  }
  
  if (activeBrand) {
    filtered = filtered.filter(p => p.brand === activeBrand);
  }
  
  renderProducts(filtered);
}

function renderProducts(list) {
  const grid = $("#productGrid");
  if (!grid) return;
  
  grid.innerHTML = list.map(p => `
    <article class="card">
      <div class="img">
        ${p.image ? `<img src="${p.image}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;">` : "🧃"}
      </div>
      <div class="body">
        <div class="small">${p.brand || ""} ${p.promo ? '<span class="badge">Promo</span>' : ''}</div>
        <h4 style="margin:6px 0">${p.name}</h4>
        <div class="row" style="justify-content:space-between;align-items:center;">
          <div class="price">${BRL(p.price_cents)}</div>
          <button class="btn primary" data-add="${p.id}">Adicionar</button>
        </div>
      </div>
    </article>
  `).join("");
  
  grid.onclick = (e) => {
    const id = e.target.getAttribute("data-add");
    if (id) {
      const product = state.products.find(pr => pr.id === Number(id));
      if (product) addToCart(product);
    }
  };
}

// Views
function renderHome(list = state.products) {
  initCarousel();
}

function renderLogin() {
  $("#app").innerHTML = `
    <section class="container">
      <h2>Entrar</h2>
      <form id="formLogin" class="card" style="padding:16px">
        <input name="email" type="email" required placeholder="E-mail" style="width:100%;margin:6px 0;padding:10px;border-radius:10px;border:1px solid #333;background:#121217;color:#fff;">
        <input name="password" type="password" required placeholder="Senha" style="width:100%;margin:6px 0;padding:10px;border-radius:10px;border:1px solid #333;background:#121217;color:#fff;">
        <button class="btn primary full" type="submit">Entrar</button>
      </form>
      <div class="space"></div>
      <h3>Ou criar conta</h3>
      <form id="formSignup" class="card" style="padding:16px">
        <input name="name" required placeholder="Nome completo" style="width:100%;margin:6px 0;padding:10px;border-radius:10px;border:1px solid #333;background:#121217;color:#fff;">
        <input name="email" type="email" required placeholder="E-mail" style="width:100%;margin:6px 0;padding:10px;border-radius:10px;border:1px solid #333;background:#121217;color:#fff;">
        <input name="password" type="password" required placeholder="Senha" style="width:100%;margin:6px 0;padding:10px;border-radius:10px;border:1px solid #333;background:#121217;color:#fff;">
        <button class="btn full" type="submit">Cadastrar</button>
      </form>
    </section>
  `;
  $("#formLogin").onsubmit = async (ev) => {
    ev.preventDefault();
    const data = new FormData(ev.target);
    const payload = { email: data.get("email"), password: data.get("password") };
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao entrar");
      state.user = json.user;
      state.token = json.token;
      LS.set("du_user", state.user);
      LS.set("du_token", state.token);
      location.hash = "/conta";
    } catch (err) {
      alert(err.message);
    }
  };
  $("#formSignup").onsubmit = async (ev) => {
    ev.preventDefault();
    const data = new FormData(ev.target);
    const payload = { name: data.get("name"), email: data.get("email"), password: data.get("password") };
    try {
      const res = await fetch(`${API_BASE}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao cadastrar");
      state.user = json.user;
      state.token = json.token;
      LS.set("du_user", state.user);
      LS.set("du_token", state.token);
      location.hash = "/conta";
    } catch (err) {
      alert(err.message);
    }
  };
}

function renderConta() {
  if (!state.user) {
    location.hash = "/login";
    return;
  }
  $("#app").innerHTML = `
    <section class="container">
      <h2>Olá, ${state.user.name}</h2>
      <p class="small">E-mail: ${state.user.email}</p>
      <div class="space"></div>
      <h3>Meus pedidos</h3>
      <div id="orders" class="card" style="padding:16px">Carregando...</div>
      <div class="space"></div>
      <button class="btn" id="logout">Sair</button>
    </section>
  `;
  $("#logout").onclick = () => {
    state.user = null;
    state.token = null;
    LS.set("du_user", null);
    LS.set("du_token", null);
    location.hash = "/";
  };
  loadOrders();
}

function renderCheckout() {
  if (state.cart.length === 0) {
    alert("Carrinho vazio.");
    location.hash = "/";
    return;
  }
  if (!state.user) {
    location.hash = "/login";
    return;
  }
  const total = state.cart.reduce((acc, i) => acc + i.price_cents * i.qty, 0);
  $("#app").innerHTML = `
    <section class="container">
      <h2>Checkout</h2>
      <div class="card" style="padding:16px">
        <h4>Endereço de entrega</h4>
        <input id="addr" placeholder="Rua, número, bairro, cidade" style="width:100%;margin:6px 0;padding:10px;border-radius:10px;border:1px solid #333;background:#121217;color:#fff;">
        <h4>Resumo</h4>
        <ul class="small">
          ${state.cart.map(i => `<li>${i.qty}× ${i.name} — ${BRL(i.price_cents * i.qty)}</li>`).join("")}
        </ul>
        <p><strong>Total: ${BRL(total)}</strong></p>
        <button class="btn primary" id="payPix">Gerar PIX</button>
        <div id="pixBox" class="space"></div>
      </div>
    </section>
  `;
  $("#payPix").onclick = doPayPix;
}

function renderText(title, content) {
  $("#app").innerHTML = `
    <section class="container">
      <h2>${title}</h2>
      <div class="card" style="padding:16px;line-height:1.6">${content}</div>
    </section>
  `;
}

// API calls
async function loadProducts() {
  try {
    if (USE_API && API_BASE) {
      const res = await fetch(`${API_BASE}/api/products`);
      if (!res.ok) throw new Error("API indisponível");
      const list = await res.json();
      state.products = list;
      return;
    }
    throw new Error("Sem API configurada");
  } catch {
    // fallback to embedded JSON
    const json = $("#productsData").textContent;
    state.products = JSON.parse(json);
  }
}
async function loadOrders() {
  if (!state.user) {
    $("#orders").innerHTML = "<em>Nenhum pedido.</em>";
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/orders/${state.user.id}`, {
      headers: { Authorization: `Bearer ${state.token}` }
    });
    const list = await res.json();
    if (!res.ok) throw new Error(list.error || "Erro ao carregar pedidos");
    $("#orders").innerHTML = (list && list.length ? list.map(o => `
      <div style="border-bottom:1px solid #26262f;padding:8px 0;">
        <div>#${o.id} — ${new Date(o.created_at).toLocaleString("pt-BR")} — <strong>${o.status.toUpperCase()}</strong></div>
        <div class="small">Total ${BRL(o.total_cents)}</div>
      </div>
    `).join("") : "<em>Nenhum pedido.</em>");
  } catch (err) {
    $("#orders").innerHTML = "<em>Erro ao carregar pedidos.</em>";
  }
}

async function doPayPix() {
  const address = $("#addr").value.trim();
  const items = state.cart.map(i => ({
    product_id: i.product_id,
    name: i.name,
    price_cents: i.price_cents,
    qty: i.qty
  }));
  try {
    // Create order
    const resOrder = await fetch(`${API_BASE}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.token}` },
      body: JSON.stringify({ items, address })
    });
    const order = await resOrder.json();
    if (!resOrder.ok) throw new Error(order.error || "Erro ao criar pedido");
    // Request PIX
    const resPay = await fetch(`${API_BASE}/api/payments/pix`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.token}` },
      body: JSON.stringify({ orderId: order.orderId })
    });
    const pay = await resPay.json();
    if (!resPay.ok) throw new Error(pay.error || "Erro ao gerar pagamento");
    // Show QR code
    $("#pixBox").innerHTML = `
      <div class="space"></div>
      <h4>Escaneie o QR Code</h4>
      <img src="${pay.qrImageData}" alt="PIX QR" style="max-width:240px;border:1px solid #26262f;border-radius:12px">
      <p class="small">Aguardando pagamento...</p>
    `;
    // Poll for status
    const poll = setInterval(async () => {
      try {
        const sRes = await fetch(`${API_BASE}/api/payments/status/${pay.paymentId}`, {
          headers: { Authorization: `Bearer ${state.token}` }
        });
        const s = await sRes.json();
        if (s.status === "paid") {
          clearInterval(poll);
          alert("Pagamento confirmado! Obrigado pela compra.");
          state.cart = [];
          updateCartUI();
          location.hash = "/conta";
        }
      } catch {}
    }, 4000);
  } catch (err) {
    alert(err.message);
  }
}

// Routing
const routes = {
  "/": () => renderHome(),
  "": () => renderHome(),
  "/login": () => renderLogin(),
  "/conta": () => renderConta(),
  "/checkout": () => renderCheckout(),
  "/sobre": () => renderText("Sobre Nós", "Du Doces Distribuidora — qualidade, agilidade e as melhores marcas."),
  "/contato": () => renderText("Contato", "Fale conosco pelo WhatsApp."),
  "/politica": () => renderText("Política de Privacidade", "Texto LGPD resumido."),
  "/termos": () => renderText("Termos de Uso", "Condições gerais de uso.")
};
function router() {
  const hash = location.hash.slice(1) || "/";
  const fn = routes[hash];
  if (fn) {
    fn();
  } else {
    routes["/"]();
  }
}

// Boot
(async function () {
  initTopbar();
  await loadProducts();
  renderHome();
  updateCartUI();
  window.addEventListener("hashchange", router);
})();