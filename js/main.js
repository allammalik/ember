(function () {
  'use strict';

  var ACCENT = 0xff6b35;

  var canvas = document.getElementById('scene');
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 10);

  /* ---------- environment: dark room with bright streaks for glass highlights ---------- */
  function makeEnvTexture() {
    var c = document.createElement('canvas');
    c.width = 1024; c.height = 512;
    var g = c.getContext('2d');
    g.fillStyle = '#060403';
    g.fillRect(0, 0, 1024, 512);

    function streak(x, y, w, h, alpha) {
      var grad = g.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.5, 'rgba(255,244,230,' + alpha + ')');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(x, y, w, h);
    }
    streak(120, 60, 90, 380, 0.95);
    streak(420, 30, 40, 440, 0.7);
    streak(700, 90, 130, 320, 0.85);
    streak(900, 140, 26, 240, 0.5);
    // warm firelight bounce from below
    var gg = g.createLinearGradient(0, 380, 0, 512);
    gg.addColorStop(0, 'rgba(255,107,53,0)');
    gg.addColorStop(1, 'rgba(255,140,60,0.5)');
    g.fillStyle = gg;
    g.fillRect(0, 380, 1024, 132);

    var tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  var pmrem = new THREE.PMREMGenerator(renderer);
  var envTex = makeEnvTexture();
  scene.environment = pmrem.fromEquirectangular(envTex).texture;
  envTex.dispose();
  pmrem.dispose();

  /* ---------- lights ---------- */
  scene.add(new THREE.AmbientLight(0xffffff, 0.12));
  var key = new THREE.DirectionalLight(0xfff2e2, 0.5);
  key.position.set(-4, 6, 6);
  scene.add(key);
  var rim = new THREE.PointLight(0xff6b35, 2.6, 30);
  rim.position.set(0, -2.5, -3);
  scene.add(rim);
  var edge = new THREE.PointLight(0xffb35c, 1.0, 25);
  edge.position.set(5, 1.5, -2);
  scene.add(edge);

  /* ---------- bottle ---------- */
  var rollGroup = new THREE.Group();   // rolls about the long (world X) axis
  var layGroup = new THREE.Group();    // lays the bottle horizontal
  var bottle = new THREE.Group();      // built along +Y
  layGroup.add(bottle);
  rollGroup.add(layGroup);
  scene.add(rollGroup);
  layGroup.rotation.z = -Math.PI / 2;  // +Y -> +X (neck points right)

  var profile = [
    [0.00, 0.00], [0.50, 0.00], [0.82, 0.02], [0.95, 0.12], [1.00, 0.32],
    [1.00, 4.35],
    [0.97, 4.62], [0.83, 4.92], [0.60, 5.16], [0.40, 5.32], [0.33, 5.46],
    [0.33, 5.95],
    [0.36, 6.00], [0.36, 6.90], [0.33, 6.95],
    [0.00, 6.95]
  ].map(function (p) { return new THREE.Vector2(p[0], p[1]); });

  var glassGeo = new THREE.LatheGeometry(profile, 96);
  glassGeo.translate(0, -3.475, 0);
  var glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x2b1206,
    metalness: 0.0,
    roughness: 0.06,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 2.4,
    reflectivity: 0.9
  });
  bottle.add(new THREE.Mesh(glassGeo, glassMat));

  /* label wrapped on the body; artwork transposed so type reads along the axis */
  function makeLabelTexture() {
    var off = document.createElement('canvas');
    off.width = 2048; off.height = 1024;
    var g = off.getContext('2d');
    g.clearRect(0, 0, 2048, 1024);
    var cream = '#f6ede3';
    g.textAlign = 'center';
    g.fillStyle = cream;

    g.font = '500 44px Oswald, sans-serif';
    g.fillText('C O L D - S M O K E D   H E R B A L   A P E R I T I V O', 1024, 300);

    g.font = '300px Anton, Impact, sans-serif';
    g.fillText('EMBER', 1024, 620);

    g.strokeStyle = cream;
    g.lineWidth = 5;
    g.beginPath(); g.moveTo(640, 680); g.lineTo(1408, 680); g.stroke();

    g.font = '500 46px Oswald, sans-serif';
    g.fillText('BATCH 07  -  18% ABV', 1024, 780);

    g.lineWidth = 4;
    g.beginPath(); g.arc(1024, 880, 40, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(956, 880); g.lineTo(1092, 880); g.stroke();

    var c = document.createElement('canvas');
    c.width = 2048; c.height = 2048;
    var ctx = c.getContext('2d');
    // cylinder uv: x wraps around, y runs along the axis -> transpose the
    // artwork so the type reads along the bottle's length
    ctx.setTransform(0, -1, 1, 0, 512, 2048);
    ctx.drawImage(off, 0, 0);

    var tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 8;
    return tex;
  }

  var labelMat = new THREE.MeshPhysicalMaterial({
    map: makeLabelTexture(),
    transparent: true,
    roughness: 0.3,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    envMapIntensity: 1.1,
    side: THREE.FrontSide
  });
  var labelGeo = new THREE.CylinderGeometry(1.015, 1.015, 2.1, 96, 1, true);
  var label = new THREE.Mesh(labelGeo, labelMat);
  label.position.y = -1.175;   // centred on the body
  label.rotation.y = Math.PI;  // face the camera at rest
  bottle.add(label);

  /* ---------- floating embers ---------- */
  var rocks = [];
  var rockMat = new THREE.MeshBasicMaterial({ color: ACCENT });
  var rockDefs = [
    { x: -4.3, y: 0.2, z: 0.6, r: 0.34, p: 1.6 },
    { x: -2.0, y: 1.6, z: -0.6, r: 0.26, p: 2.2 },
    { x: 4.6, y: 0.0, z: 0.2, r: 0.20, p: 1.9 },
    { x: -0.2, y: -1.7, z: 0.8, r: 0.26, p: 2.6 },
    { x: -0.1, y: -2.5, z: 0.4, r: 0.32, p: 2.1 },
    { x: 2.6, y: 2.2, z: -1.0, r: 0.22, p: 1.4 },
    { x: -5.2, y: -1.4, z: -0.8, r: 0.24, p: 1.7 }
  ];
  rockDefs.forEach(function (d, i) {
    var geo = new THREE.DodecahedronGeometry(d.r, 0);
    var m = new THREE.Mesh(geo, rockMat);
    m.position.set(d.x, d.y, d.z);
    m.rotation.set(i * 0.7, i * 1.3, i * 0.4);
    m.scale.set(1, 0.75 + (i % 3) * 0.18, 0.85 + (i % 2) * 0.25);
    m.userData = { baseY: d.y, par: d.p, spin: 0.0015 + (i % 3) * 0.0012 };
    rocks.push(m);
    scene.add(m);
  });

  /* ---------- scroll-driven roll ---------- */
  var target = 0, current = 0;
  function readScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    target = max > 0 ? window.scrollY / max : 0;
  }
  window.addEventListener('scroll', readScroll, { passive: true });
  readScroll();

  var mouseX = 0, mouseY = 0, camX = 0, camY = 0;
  window.addEventListener('mousemove', function (e) {
    mouseX = (e.clientX / window.innerWidth - 0.5);
    mouseY = (e.clientY / window.innerHeight - 0.5);
  });

  var clock = new THREE.Clock();

  function tick() {
    requestAnimationFrame(tick);
    var t = clock.getElapsedTime();

    current += (target - current) * 0.07;
    camX += (mouseX * 0.5 - camX) * 0.05;
    camY += (-mouseY * 0.35 - camY) * 0.05;
    camera.position.x = camX;
    camera.position.y = camY;
    camera.lookAt(0, 0, 0);

    rollGroup.rotation.x = current * Math.PI * 5 + Math.sin(t * 0.4) * 0.03;
    rollGroup.position.y = Math.sin(current * Math.PI * 2) * 0.25;
    layGroup.rotation.y = Math.sin(current * Math.PI * 3) * 0.12;

    rocks.forEach(function (m, i) {
      m.position.y = m.userData.baseY + current * m.userData.par * 1.4 + Math.sin(t * 0.6 + i) * 0.08;
      m.rotation.x += m.userData.spin;
      m.rotation.y += m.userData.spin * 1.4;
    });

    renderer.render(scene, camera);
  }
  tick();

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ---------- reveal on scroll ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) en.target.classList.add('in');
    });
  }, { threshold: 0.25 });
  document.querySelectorAll('.rv').forEach(function (el) { io.observe(el); });

  /* ---------- bag / checkout ---------- */
  var PRODUCTS = {
    ember: { name: 'Ember 700ml', price: 42, meta: 'Cold-smoked aperitivo · 18% ABV' }
  };
  var bag = {};

  var drawer = document.getElementById('drawer');
  var scrim = document.getElementById('scrim');
  var drawerBody = document.getElementById('drawerBody');
  var cartCount = document.getElementById('cartCount');
  var cartTotal = document.getElementById('cartTotal');
  var toast = document.getElementById('toast');
  var toastTimer = null;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('on'); }, 2200);
  }

  function bagEntries() {
    return Object.keys(bag).map(function (id) { return { id: id, qty: bag[id] }; });
  }

  function renderBag() {
    var entries = bagEntries();
    var count = entries.reduce(function (n, e) { return n + e.qty; }, 0);
    var total = entries.reduce(function (n, e) { return n + e.qty * PRODUCTS[e.id].price; }, 0);
    cartCount.textContent = count;
    cartTotal.textContent = '€' + total;

    if (!entries.length) {
      drawerBody.innerHTML = '<p class="drawer-empty">Nothing in here yet. The fire is lit, though.</p>';
      return;
    }
    drawerBody.innerHTML = entries.map(function (e) {
      var p = PRODUCTS[e.id];
      return '<div class="line">' +
        '<div><div class="line-name">' + p.name + '</div>' +
        '<div class="line-meta">' + p.meta + '</div></div>' +
        '<div class="line-right"><span class="line-price">€' + (p.price * e.qty) + '</span>' +
        '<div class="qty">' +
        '<button type="button" data-dec="' + e.id + '" aria-label="Decrease">&minus;</button>' +
        '<span>' + e.qty + '</span>' +
        '<button type="button" data-inc="' + e.id + '" aria-label="Increase">+</button>' +
        '</div></div></div>';
    }).join('');
  }

  function openDrawer() { drawer.classList.add('open'); scrim.classList.add('on'); drawer.setAttribute('aria-hidden', 'false'); }
  function closeDrawer() { drawer.classList.remove('open'); scrim.classList.remove('on'); drawer.setAttribute('aria-hidden', 'true'); }

  document.getElementById('cartBtn').addEventListener('click', openDrawer);
  document.getElementById('drawerClose').addEventListener('click', closeDrawer);
  scrim.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });

  drawerBody.addEventListener('click', function (e) {
    var inc = e.target.getAttribute && e.target.getAttribute('data-inc');
    var dec = e.target.getAttribute && e.target.getAttribute('data-dec');
    if (inc) { bag[inc] += 1; renderBag(); }
    if (dec) { bag[dec] -= 1; if (bag[dec] <= 0) delete bag[dec]; renderBag(); }
  });

  document.querySelectorAll('[data-add]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-add');
      bag[id] = (bag[id] || 0) + 1;
      renderBag();
      showToast('Added to bag');
    });
  });

  document.getElementById('checkoutBtn').addEventListener('click', function () {
    if (!bagEntries().length) { showToast('Your bag is empty'); return; }
    bag = {};
    renderBag();
    drawerBody.innerHTML = '<p class="drawer-empty">Order placed. It ships wrapped in waxed paper — thank you.</p>';
    showToast('Order placed');
  });

  renderBag();

  /* ---------- newsletter ---------- */
  var signup = document.getElementById('signup');
  var signupMsg = document.getElementById('signupMsg');
  signup.addEventListener('submit', function (e) {
    e.preventDefault();
    var val = document.getElementById('email').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) {
      signupMsg.textContent = 'That address does not look right.';
      return;
    }
    signupMsg.textContent = 'You are on the list. First letter arrives with the next batch.';
    signup.reset();
  });
})();
