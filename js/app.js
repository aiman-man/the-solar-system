/* ============================================================
   THE SOLAR SYSTEM — a scroll journey · Real-texture build
   Planets use real 2K surface maps (CC BY 4.0, Solar System Scope)
   loaded via Image→Canvas (works on file://). Kept: fresnel
   atmosphere, twinkling stars, Milky Way, asteroid belt, shooting
   stars, damped scroll camera, HUD, per-planet accent, count-up
   stats, hamburger menu, keyboard nav.
   ============================================================ */
(function () {
  'use strict';

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var canvas = document.getElementById('scene');
  var renderer, glOk = true;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
  } catch (e) {
    glOk = false;
    renderer = { setPixelRatio: function () {}, setSize: function () {}, capabilities: { getMaxAnisotropy: function () { return 1; } } };
    var fb = document.getElementById('glFallback'); if (fb) fb.hidden = false;
  }
  var pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04060f);
  var camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 3000);
  camera.position.set(0, 46, 98);

  var sunLight = new THREE.PointLight(0xfff2d8, 4.0, 0, 0);
  scene.add(sunLight);
  scene.add(new THREE.AmbientLight(0x3a4666, 0.6));

  var ATMO_VERT = `
varying vec3 vNormalW; varying vec3 vWorldPos;
void main(){
  vNormalW = normalize(mat3(modelMatrix)*normal);
  vec4 wp = modelMatrix*vec4(position,1.0); vWorldPos = wp.xyz;
  gl_Position = projectionMatrix*viewMatrix*wp;
}`;
  var ATMO_FRAG = `
precision highp float; varying vec3 vNormalW; varying vec3 vWorldPos;
uniform vec3 uColor; uniform vec3 uCamPos;
void main(){
  vec3 vd = normalize(uCamPos - vWorldPos);
  float f = pow(max(0.0, 1.0 - abs(dot(normalize(vNormalW), vd))), 3.0);
  gl_FragColor = vec4(uColor*f, 1.0);
}`;
  var animatedMats = [];
  function atmoMat(colorHex, intensity) {
    var m = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(colorHex).multiplyScalar(intensity || 1) }, uCamPos: { value: new THREE.Vector3() } },
      vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG,
      side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    });
    animatedMats.push(m); return m;
  }

  var STAR_VERT = `
attribute float aPhase; attribute vec3 aColor;
varying vec3 vColor; varying float vTw; uniform float uTime;
void main(){
  vColor = aColor; vTw = 0.62 + 0.38*sin(uTime*1.6 + aPhase*6.2831);
  vec4 mv = modelViewMatrix*vec4(position,1.0);
  gl_PointSize = (1.4 + 1.3*sin(aPhase*3.1)) * (300.0 / -mv.z);
  gl_Position = projectionMatrix*mv;
}`;
  var STAR_FRAG = `
varying vec3 vColor; varying float vTw;
void main(){ float a = smoothstep(0.5,0.05,length(gl_PointCoord-0.5)); gl_FragColor = vec4(vColor, a*vTw); }`;

  function glowTex(inner, outer) {
    var c = document.createElement('canvas'); c.width = 256; c.height = 256;
    var x = c.getContext('2d');
    var g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, inner); g.addColorStop(0.4, outer); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }

  (function stars() {
    var N = 16000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), ph = new Float32Array(N);
    var pal = [[1, 1, 1], [0.66, 0.78, 1], [1, 0.9, 0.69], [1, 0.72, 0.75]];
    var tilt = 0.38, cosT = Math.cos(tilt), sinT = Math.sin(tilt);
    for (var i = 0; i < N; i++) {
      var r = 350 + Math.random() * 700, th = Math.random() * Math.PI * 2, band = Math.random() < 0.45;
      var x, y, z;
      if (band) {
        var rr = r * (0.7 + Math.random() * 0.3);
        x = Math.cos(th) * rr; z = Math.sin(th) * rr; y = (Math.random() - 0.5) * 70;
        var y2 = y * cosT - z * sinT, z2 = y * sinT + z * cosT; y = y2; z = z2;
      } else {
        var ph2 = Math.acos(2 * Math.random() - 1);
        x = r * Math.sin(ph2) * Math.cos(th); y = r * Math.cos(ph2); z = r * Math.sin(ph2) * Math.sin(th);
      }
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      var cc = pal[Math.floor(Math.random() * pal.length)];
      col[i * 3] = cc[0]; col[i * 3 + 1] = cc[1]; col[i * 3 + 2] = cc[2];
      ph[i] = Math.random();
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
    var mat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 } }, vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, transparent: true, depthWrite: false });
    animatedMats.push(mat);
    scene.add(new THREE.Points(geo, mat));
  })();
  (function nebulae() {
    var cols = [['rgba(90,50,180,0.5)', 'rgba(40,20,100,0)'], ['rgba(20,120,170,0.45)', 'rgba(10,60,100,0)'], ['rgba(170,60,120,0.4)', 'rgba(80,20,60,0)']];
    for (var i = 0; i < 3; i++) {
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(cols[i][0], cols[i][1]), transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
      sp.position.set((Math.random() - 0.5) * 700, (Math.random() - 0.5) * 360, -300 - Math.random() * 200);
      var s = 400 + Math.random() * 250; sp.scale.set(s, s, 1);
      scene.add(sp);
    }
  })();

  /* ---------------- texture loading (Image→Canvas, works on file://) ---------------- */
  var TEX = {}, planetMats = [], sunMat = null, cloudMat = null, ringTex = null, texturesReady = false, ringMats = [];
  var texKeys = ['mercury', 'venus', 'earth', 'earth_clouds', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'sun', 'moon', 'ring'];
  var texCount = texKeys.length, texLoaded = 0;
  var loaderFill = document.getElementById('loaderFill'), loaderPct = document.getElementById('loaderPct');
  function loadTex(key, srgb) {
    var src = (window.TEXDATA && window.TEXDATA[key]) ? window.TEXDATA[key] : 'assets/' + key + '.jpg';
    var img = new Image();
    img.onload = function () {
      var c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      var ctx2 = c.getContext('2d'); ctx2.drawImage(img, 0, 0);
      if (key === 'earth_clouds') {
        var id = ctx2.getImageData(0, 0, c.width, c.height), d = id.data;
        for (var i = 0; i < d.length; i += 4) { var v = d[i + 1]; v = v < 110 ? 0 : Math.min(255, (v - 110) * 3); d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = v; }
        ctx2.putImageData(id, 0, 0);
      }
      var t = new THREE.CanvasTexture(c);
      if (srgb) t.encoding = THREE.sRGBEncoding;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      TEX[key] = t; texLoaded++;
      var pct = Math.round(texLoaded / texCount * 100);
      if (loaderFill) loaderFill.style.width = pct + '%';
      if (loaderPct) loaderPct.textContent = pct + '%';
      if (texLoaded === texCount) applyTextures();
    };
    img.onerror = function () { texLoaded++; if (texLoaded === texCount) applyTextures(); };
    img.src = src;
  }
  ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'sun', 'moon'].forEach(function (k) { loadTex(k, true); });
  loadTex('earth_clouds', false);
  loadTex('ring', false);

  function applyTextures() {
    texturesReady = true;
    ringTex = TEX.ring;
    ringTex.rotation = Math.PI / 2; ringTex.center.set(0.5, 0.5);
    ringTex.wrapS = ringTex.wrapT = THREE.ClampToEdgeWrapping;
    planetMats.forEach(function (m) { if (m._texKey && TEX[m._texKey]) { m.map = TEX[m._texKey]; m.needsUpdate = true; } });
    if (sunMat && TEX.sun) { sunMat.map = TEX.sun; sunMat.needsUpdate = true; }
    if (cloudMat && TEX.earthClouds) { cloudMat.map = TEX.earthClouds; cloudMat.needsUpdate = true; if (cloudMeshes[0]) cloudMeshes[0].visible = true; }
    ringMats.forEach(function (rm) { rm.map = ringTex; rm.needsUpdate = true; });
  }

  var SUN_R = 6;
  sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  var sunMesh = new THREE.Mesh(new THREE.SphereGeometry(SUN_R, 64, 64), sunMat);
  sunMesh.userData = { goto: 0 };
  scene.add(sunMesh);
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(SUN_R * 1.25, 48, 48), atmoMat(0xffaa33, 1.4)));
  var glowA = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,240,200,0.9)', 'rgba(255,150,40,0.35)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  glowA.scale.set(24, 24, 1); scene.add(glowA);
  var glowB = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,180,80,0.5)', 'rgba(255,100,20,0.12)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  glowB.scale.set(48, 48, 1); scene.add(glowB);

  function addRings(parent, radius, inner, outer, opacity) {
    var rm = new THREE.MeshBasicMaterial({ color: 0xe8d8b0, transparent: true, opacity: opacity, side: THREE.DoubleSide, depthWrite: false });
    ringMats.push(rm);
    var rings = new THREE.Mesh(new THREE.RingGeometry(radius * inner, radius * outer, 128), rm);
    rings.rotation.x = Math.PI / 2;
    parent.add(rings); return rings;
  }

  var ACCENTS = ['#ffd27f', '#d4c8b0', '#f0d080', '#4cc9f0', '#e07a3f', '#e0b080', '#e8d5a3', '#9fe8f0', '#6a94ff'];
  var LIGHT_TIMES = ['3.2 min', '6.0 min', '8.3 min', '12.6 min', '43 min', '1 h 19 min', '2 h 40 min', '4 h 10 min'];
  var PLANETS = [
    { name: 'Mercury', tagline: 'The Swift Messenger', radius: 0.5, orbit: 13, period: 14, rotPeriod: 40, tilt: 0.03, tex: 'mercury',
      heroDesc: 'The smallest planet and closest to the Sun — a cratered, airless world where a single solar day lasts twice as long as its year.',
      detailDesc: 'Mercury\'s surface resembles the Moon, scarred by billions of years of impacts. With almost no atmosphere to trap heat, temperatures swing from 430°C in daylight to -180°C at night — the widest range of any planet.',
      stats: { Diameter: '4,879 km', 'Solar day': '176 Earth days', Year: '88 days' },
      facts: { 'Distance from Sun': '57.9 million km', 'Avg. temperature': '-173 to 427 °C', Moons: '0', 'Axial tilt': '0.03°', 'Mass': '0.055 × Earth', 'Notable': 'Second densest planet' } },
    { name: 'Venus', tagline: 'The Morning Star', radius: 0.95, orbit: 17.5, period: 22, rotPeriod: 70, tilt: 177.4, retrograde: true, tex: 'venus', atmo: 0xe8c87a, atmoI: 1.1,
      heroDesc: 'The hottest planet, wrapped in thick clouds of sulfuric acid. It spins backwards — on Venus, the Sun rises in the west.',
      detailDesc: 'A runaway greenhouse effect heats Venus to 462°C — hotter than Mercury despite being twice as far from the Sun. Its crushing atmosphere is 92 times the pressure of Earth\'s, enough to crush a submarine.',
      stats: { Diameter: '12,104 km', Day: '243 Earth days', Year: '225 days' },
      facts: { 'Distance from Sun': '108.2 million km', 'Surface temp': '462 °C', Moons: '0', 'Axial tilt': '177.4°', 'Atmosphere': '96% CO₂', 'Notable': 'Spins retrograde' } },
    { name: 'Earth', tagline: 'The Blue Planet', radius: 1.0, orbit: 23, period: 30, rotPeriod: 10, tilt: 23.4, tex: 'earth', atmo: 0x4fc3f7, atmoI: 1.0, clouds: true,
      heroDesc: 'Our home — the only known world with life. Liquid water covers 71% of its surface beneath a protective oxygen atmosphere.',
      detailDesc: 'Earth is the only planet not named after a god. Its single large Moon stabilises the axial tilt, creating gentle seasons, and drives the tides that may have helped life emerge from the oceans.',
      stats: { Diameter: '12,742 km', Day: '24 hours', Year: '365.25 days' },
      facts: { 'Distance from Sun': '149.6 million km', 'Avg. temperature': '15 °C', Moons: '1', 'Axial tilt': '23.4°', 'Ocean cover': '71%', 'Notable': 'Only known life' },
      moons: [{ r: 0.27, orbit: 2.1, speed: 1.0, tex: 'moon' }] },
    { name: 'Mars', tagline: 'The Red World', radius: 0.68, orbit: 29, period: 46, rotPeriod: 10.5, tilt: 25.2, tex: 'mars', atmo: 0xe07a3f, atmoI: 0.5,
      heroDesc: 'A cold desert world coloured red by iron oxide dust. Home to the tallest volcano and the deepest canyon in the Solar System.',
      detailDesc: 'Olympus Mons rises 22 km — nearly three times Everest. Valles Marineris stretches 4,000 km across the surface. Ancient riverbeds suggest Mars once had liquid water and a thicker atmosphere.',
      stats: { Diameter: '6,779 km', Day: '24.6 hours', Year: '687 days' },
      facts: { 'Distance from Sun': '227.9 million km', 'Avg. temperature': '-63 °C', Moons: '2', 'Axial tilt': '25.2°', 'Tallest volcano': 'Olympus Mons', 'Notable': 'Most explored planet' },
      moons: [{ r: 0.07, orbit: 1.25, speed: 2.4, color: 0x8a7f72 }, { r: 0.05, orbit: 1.7, speed: 1.5, color: 0x9a8f82 }] },
    { name: 'Jupiter', tagline: 'The Gas Giant King', radius: 3.4, orbit: 41, period: 80, rotPeriod: 5, tilt: 3.1, tex: 'jupiter', atmo: 0xd8a878, atmoI: 0.6, faintRing: true,
      heroDesc: 'The largest planet — more massive than all other planets combined. Its Great Red Spot is a storm wider than Earth, swirling for centuries.',
      detailDesc: 'Jupiter has no solid surface — it is a ball of hydrogen and helium. Its magnetic field is 20,000 times stronger than Earth\'s, and its four largest moons (the Galileans) are worlds in their own right.',
      stats: { Diameter: '139,820 km', Day: '9.9 hours', Year: '11.9 years' },
      facts: { 'Distance from Sun': '778.5 million km', 'Avg. temperature': '-108 °C', Moons: '95 (as of 2024)', 'Axial tilt': '3.1°', 'Great Red Spot': 'Storm > 350 yr', 'Notable': 'Largest planet' },
      moons: [{ r: 0.16, orbit: 4.4, speed: 1.9, color: 0xe8c464 }, { r: 0.14, orbit: 5.4, speed: 1.5, color: 0xc8c0b0 }, { r: 0.20, orbit: 6.4, speed: 1.1, color: 0x9a8f80 }, { r: 0.18, orbit: 7.6, speed: 0.8, color: 0x6a5f52 }] },
    { name: 'Saturn', tagline: 'The Jewel of the System', radius: 2.8, orbit: 53, period: 120, rotPeriod: 5.8, tilt: 26.7, tex: 'saturn', atmo: 0xe8d5a3, atmoI: 0.7, rings: true,
      heroDesc: 'Famous for its spectacular rings of ice and rock. It is so low in density it would float — if you could find an ocean big enough.',
      detailDesc: 'Saturn\'s rings span 280,000 km yet are only about 10 metres thick in places. They are made of billions of ice particles, from dust grains to house-sized boulders — likely the shattered remains of a moon.',
      stats: { Diameter: '116,460 km', Day: '10.7 hours', Year: '29.4 years' },
      facts: { 'Distance from Sun': '1.43 billion km', 'Avg. temperature': '-139 °C', Moons: '146 (as of 2024)', 'Axial tilt': '26.7°', 'Ring span': '280,000 km', 'Notable': 'Least dense planet' },
      moons: [{ r: 0.22, orbit: 4.8, speed: 1.0, color: 0xd8a050 }] },
    { name: 'Uranus', tagline: 'The Sideways World', radius: 1.85, orbit: 65, period: 170, rotPeriod: 8, tilt: 97.8, retrograde: true, tex: 'uranus', atmo: 0x9fe8f0, atmoI: 0.8, faintRing: true,
      heroDesc: 'An ice giant that rotates on its side — likely knocked over by an ancient collision. Methane in its atmosphere gives it a pale blue-green glow.',
      detailDesc: 'Uranus rolls around the Sun like a ball, so each pole experiences 42 years of continuous sunlight followed by 42 years of darkness. It was the first planet discovered with a telescope, in 1781.',
      stats: { Diameter: '50,724 km', Day: '17.2 hours', Year: '84 years' },
      facts: { 'Distance from Sun': '2.87 billion km', 'Avg. temperature': '-197 °C', Moons: '28 (as of 2024)', 'Axial tilt': '97.8°', 'Discovered': '1781 · Herschel', 'Notable': 'Rotates on its side' } },
    { name: 'Neptune', tagline: 'The Windy Frontier', radius: 1.8, orbit: 75, period: 220, rotPeriod: 7.5, tilt: 28.3, tex: 'neptune', atmo: 0x4f7ef0, atmoI: 0.9, faintRing: true,
      heroDesc: 'The most distant planet — and the windiest. Supersonic storms tear across its deep blue atmosphere at over 2,000 km/h.',
      detailDesc: 'Neptune was found by mathematics before it was seen: astronomers predicted its position from irregularities in Uranus\'s orbit. Its largest moon, Triton, orbits backwards and may be a captured dwarf planet from the Kuiper Belt.',
      stats: { Diameter: '49,244 km', Day: '16.1 hours', Year: '164.8 years' },
      facts: { 'Distance from Sun': '4.50 billion km', 'Avg. temperature': '-201 °C', Moons: '16 (as of 2024)', 'Axial tilt': '28.3°', 'Wind speed': '> 2,000 km/h', 'Notable': 'Farthest planet' } }
  ];

  var planets = [], moonPivots = [], cloudMeshes = [], orbitLines = [], clickables = [sunMesh];
  PLANETS.forEach(function (def, pi) {
    var pivot = new THREE.Group(); scene.add(pivot);
    var offset = new THREE.Group(); offset.position.x = def.orbit; pivot.add(offset);
    var tilt = new THREE.Group(); tilt.rotation.z = THREE.MathUtils.degToRad(def.tilt); offset.add(tilt);
    var pm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0, metalness: 0.0 });
    pm._texKey = def.tex; planetMats.push(pm);
    if (def.tex === 'earth') pm.roughness = 0.8;
    var mesh = new THREE.Mesh(new THREE.SphereGeometry(def.radius, 64, 64), pm);
    mesh.userData = { goto: 1 + pi * 2 };
    tilt.add(mesh); clickables.push(mesh);
    if (def.atmo) tilt.add(new THREE.Mesh(new THREE.SphereGeometry(def.radius * 1.18, 48, 48), atmoMat(def.atmo, def.atmoI || 1)));
    if (def.clouds) {
      cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, roughness: 1.0 });
      var clouds = new THREE.Mesh(new THREE.SphereGeometry(def.radius * 1.025, 48, 48), cloudMat);
      clouds.visible = false;
      tilt.add(clouds); cloudMeshes.push(clouds);
    }
    if (def.rings) addRings(tilt, def.radius, 1.4, 2.5, 0.95);
    if (def.faintRing) addRings(tilt, def.radius, 1.35, 1.9, 0.16);
    if (def.moons) def.moons.forEach(function (m) {
      var mp = new THREE.Group(); offset.add(mp);
      var mmat;
      if (m.tex) { mmat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0 }); mmat._texKey = m.tex; planetMats.push(mmat); }
      else mmat = new THREE.MeshStandardMaterial({ color: m.color, roughness: 1.0 });
      var moon = new THREE.Mesh(new THREE.SphereGeometry(m.r, 24, 24), mmat);
      moon.position.x = m.orbit; mp.add(moon);
      moonPivots.push({ pivot: mp, speed: m.speed });
    });
    var pts = [];
    for (var a = 0; a <= 128; a++) { var ang = a / 128 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(ang) * def.orbit, 0, Math.sin(ang) * def.orbit)); }
    var line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x8aa6ff, transparent: true, opacity: 0.14 }));
    scene.add(line); orbitLines.push({ line: line, pIdx: pi });
    planets.push({ def: def, pivot: pivot, offset: offset, tilt: tilt, mesh: mesh,
      orbitSpeed: (Math.PI * 2) / def.period, rotSpeed: (Math.PI * 2) / def.rotPeriod * (def.retrograde ? -1 : 1) });
  });

  var beltPivot = new THREE.Group(); scene.add(beltPivot);
  (function asteroids() {
    if (!glOk || !THREE.InstancedMesh) return;
    var count = 1200, dummy = new THREE.Object3D();
    var im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.07, 0), new THREE.MeshStandardMaterial({ color: 0x8a8078, roughness: 1.0 }), count);
    for (var i = 0; i < count; i++) {
      var ang = Math.random() * Math.PI * 2, r = 33 + Math.random() * 5.5;
      dummy.position.set(Math.cos(ang) * r, (Math.random() - 0.5) * 2.4, Math.sin(ang) * r);
      dummy.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      var s = 0.5 + Math.random() * 1.6; dummy.scale.set(s, s * (0.6 + Math.random() * 0.8), s);
      dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
    }
    im.instanceMatrix.needsUpdate = true; beltPivot.add(im);
  })();

  var shoot = { mesh: null, life: 0, vel: new THREE.Vector3(), head: new THREE.Vector3(), next: 4 };
  function spawnShootingStar() {
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    var line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0 }));
    scene.add(line);
    shoot.head.set(camera.position.x + (Math.random() - 0.5) * 120, camera.position.y + 30 + Math.random() * 40, camera.position.z - 60 - Math.random() * 40);
    shoot.vel.set((Math.random() - 0.3) * 160, -30 - Math.random() * 40, (Math.random() - 0.5) * 60);
    shoot.life = 1; shoot.mesh = line;
  }

  var SECTIONS = [{ type: 'overview' }];
  for (var i = 0; i < PLANETS.length; i++) { SECTIONS.push({ type: 'hero', p: i }); SECTIONS.push({ type: 'detail', p: i }); }
  var N = SECTIONS.length;
  var slidesEl = document.getElementById('slides');
  var slideEls = [];
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
  function parseStat(str) { var m = str.match(/^([\d.,]+)\s*(.*)$/); if (!m) return null; return { num: parseFloat(m[1].replace(/,/g, '')), dec: (m[1].split('.')[1] || '').length, suffix: m[2] || '' }; }
  function fmt(v, dec, suffix) { return (dec > 0 ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US')) + (suffix ? ' ' + suffix : ''); }
  function armCountUp(container) {
    container.querySelectorAll('.stat-pill .v, .overview-stat .v').forEach(function (e2) {
      var p = parseStat(e2.textContent.trim());
      if (!p) return;
      e2._cu = p; e2.textContent = fmt(0, p.dec, p.suffix);
    });
  }
  function triggerCountUp(e2) {
    if (e2._done || !e2._cu) return; e2._done = true;
    var p = e2._cu, t0 = performance.now(), dur = 1100;
    (function step(now) {
      var q = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - q, 3);
      e2.textContent = fmt(p.num * e, p.dec, p.suffix);
      if (q < 1) requestAnimationFrame(step);
    })(t0);
  }

  (function overview() {
    var s = el('div', 'slide overview'), inner = el('div', 'slide-inner');
    inner.innerHTML =
      '<div class="eyebrow">A SCROLL JOURNEY · 4.6 BILLION YEARS IN THE MAKING</div>' +
      '<h1 class="overview-title">THE <span class="thin">Solar</span><br/>SYSTEM</h1>' +
      '<p class="overview-sub">One star · Eight planets · Countless worlds — scroll to travel from the Sun to the edge</p>' +
      '<div class="overview-stats">' +
      '<div class="overview-stat"><div class="v">1</div><div class="k">Star</div></div>' +
      '<div class="overview-stat"><div class="v">8</div><div class="k">Planets</div></div>' +
      '<div class="overview-stat"><div class="v">200+</div><div class="k">Moons</div></div>' +
      '<div class="overview-stat"><div class="v">4.6B</div><div class="k">Years old</div></div></div>';
    Array.prototype.forEach.call(inner.children, function (c, ci) { c.style.setProperty('--d', (ci * 90) + 'ms'); });
    armCountUp(inner); s.appendChild(inner); slidesEl.appendChild(s); slideEls.push(s);
  })();

  PLANETS.forEach(function (def, idx) {
    var num = ('0' + (idx + 1)).slice(-2);
    var sh = el('div', 'slide hero'), ih = el('div', 'slide-inner'), statsHtml = '';
    Object.keys(def.stats).forEach(function (k) { statsHtml += '<div class="stat-pill"><div class="v">' + def.stats[k] + '</div><div class="k">' + k + '</div></div>'; });
    ih.innerHTML =
      '<div class="eyebrow"><span class="num">' + num + '</span>PLANET · ' + def.name.toUpperCase() + '</div>' +
      '<h2 class="slide-title">' + def.name + '<br/><span class="italic">' + def.tagline + '</span></h2>' +
      '<p class="slide-desc">' + def.heroDesc + '</p>' +
      '<div class="stats-row">' + statsHtml + '</div>' +
      '<div class="btn-row"><button class="btn-primary" data-goto="' + (1 + idx * 2 + 1) + '" aria-label="Explore ' + def.name + ' surface">Explore Surface <span class="arrow">→</span></button>' +
      (idx < PLANETS.length - 1 ? '<button class="btn-ghost" data-goto="' + (1 + (idx + 1) * 2) + '">Next Planet</button>' : '') + '</div>';
    Array.prototype.forEach.call(ih.children, function (c, ci) { c.style.setProperty('--d', (ci * 90) + 'ms'); });
    armCountUp(ih); sh.appendChild(ih); slidesEl.appendChild(sh); slideEls.push(sh);

    var sd = el('div', 'slide detail' + (idx % 2 === 1 ? ' detail-right' : '')), id2 = el('div', 'slide-inner'), factsHtml = '';
    Object.keys(def.facts).forEach(function (k) { factsHtml += '<div class="fact"><div class="k">' + k + '</div><div class="v">' + def.facts[k] + '</div></div>'; });
    var closing = (idx === PLANETS.length - 1)
      ? '<div class="closing" style="margin-top:26px"><p class="detail-note">You have reached the edge of the known planetary realm. Beyond Neptune lies the Kuiper Belt — and the rest of the galaxy awaits.</p>' +
        '<div class="btn-row" style="justify-content:center;margin-top:18px"><button class="btn-primary" data-goto="0">Back to the Sun <span class="arrow">↑</span></button></div></div>'
      : '';
    id2.innerHTML =
      '<div class="eyebrow">SURFACE & DATA</div>' +
      '<h2 class="slide-title" style="font-size:clamp(2rem,5vw,3.4rem)">' + def.name + ' up close</h2>' +
      '<p class="slide-desc">' + def.detailDesc + '</p>' +
      '<div class="facts-grid">' + factsHtml + '</div>' + closing;
    Array.prototype.forEach.call(id2.children, function (c, ci) { c.style.setProperty('--d', (ci * 90) + 'ms'); });
    sd.appendChild(id2); slidesEl.appendChild(sd); slideEls.push(sd);
  });

  var navLinks = document.getElementById('navLinks'), mobileNav = document.getElementById('mobileNav');
  var navItems = [{ label: 'Overview', goto: 0 }];
  PLANETS.forEach(function (d, i) { navItems.push({ label: d.name, goto: 1 + i * 2 }); });
  navItems.forEach(function (it) {
    var a = el('a', null, it.label); a.setAttribute('data-goto', it.goto); navLinks.appendChild(a);
    var ma = el('a', null, it.label); ma.setAttribute('data-goto', it.goto); mobileNav.appendChild(ma);
  });
  var dotsEl = document.getElementById('sectionDots');
  navItems.forEach(function (it) {
    var d = el('div', 'dot'); d.setAttribute('data-goto', it.goto); d.setAttribute('role', 'tab');
    d.appendChild(el('span', 'dot-label', it.label)); dotsEl.appendChild(d);
  });
  var dotEls = Array.prototype.slice.call(dotsEl.children);
  var navLinkEls = Array.prototype.slice.call(navLinks.children);
  var menuBtn = document.getElementById('menuBtn'), mobileMenu = document.getElementById('mobileMenu');
  menuBtn.addEventListener('click', function () {
    var open = mobileMenu.classList.toggle('open');
    menuBtn.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    mobileMenu.hidden = !open;
  });

  var targetScroll = 0, smoothScroll = 0, vh = window.innerHeight, progress = 0;
  var mouseX = 0, mouseY = 0;
  var p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3();
  var tmp = new THREE.Vector3(), fwd = new THREE.Vector3(), right = new THREE.Vector3();
  var UP = new THREE.Vector3(0, 1, 0);
  var progressFill = document.getElementById('progressFill'), scrollHint = document.getElementById('scrollHint');
  var hudBody = document.getElementById('hudBody'), hudDist = document.getElementById('hudDist'), hudLight = document.getElementById('hudLight');
  var curAccent = [255, 210, 127];

  function camForSection(s, outPos, outTarget, time) {
    if (s.type === 'overview') { outPos.set(0, 46, 98); outTarget.set(0, 0, 0); return; }
    var pl = planets[s.p]; pl.offset.getWorldPosition(tmp);
    var r = pl.def.radius, dist, dirx, diry, dirz;
    if (s.type === 'hero') { dist = r * 5.5; dirx = -0.95; diry = 0.32; dirz = 1.05; }
    else { dist = r * 2.2; var ang = time * 0.05 + s.p * 1.7; dirx = Math.cos(ang) * 0.7; diry = 0.55; dirz = Math.sin(ang) * 0.7 + 0.4; }
    var len = Math.sqrt(dirx * dirx + diry * diry + dirz * dirz);
    outPos.copy(tmp).add(new THREE.Vector3(dirx / len * dist, diry / len * dist, dirz / len * dist));
    outTarget.copy(tmp);
    if (s.type === 'hero') {
      fwd.copy(tmp).sub(outPos).normalize(); right.crossVectors(fwd, UP).normalize();
      outPos.addScaledVector(right, r * 1.3); outTarget.addScaledVector(right, r * 1.3);
    }
  }
  function gotoSection(idx) { window.scrollTo({ top: idx * vh, behavior: 'smooth' }); }
  function onScroll() { targetScroll = window.pageYOffset || document.documentElement.scrollTop; }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('mousemove', function (e) { mouseX = (e.clientX / window.innerWidth - 0.5) * 2; mouseY = (e.clientY / window.innerHeight - 0.5) * 2; });
  document.addEventListener('click', function (e) {
    var tgt = e.target.closest('[data-goto]');
    if (!tgt) return;
    if (mobileMenu.classList.contains('open')) { mobileMenu.classList.remove('open'); menuBtn.classList.remove('open'); mobileMenu.hidden = true; }
    gotoSection(parseInt(tgt.getAttribute('data-goto'), 10));
  });

  if (glOk) {
    var raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
    renderer.domElement.addEventListener('pointermove', function (e) {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1; pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      renderer.domElement.style.cursor = raycaster.intersectObjects(clickables, false).length ? 'pointer' : 'default';
    });
    renderer.domElement.addEventListener('click', function (e) {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1; pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      var hits = raycaster.intersectObjects(clickables, false);
      if (hits.length) gotoSection(hits[0].object.userData.goto);
    });
  }

  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); window.scrollBy({ top: vh * 0.9, behavior: 'smooth' }); }
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); window.scrollBy({ top: -vh * 0.9, behavior: 'smooth' }); }
    else if (e.key === 'Home') { e.preventDefault(); gotoSection(0); }
    else if (e.key === 'End') { e.preventDefault(); gotoSection(N - 1); }
  });

  window.addEventListener('resize', function () {
    vh = window.innerHeight; camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  var loader = document.getElementById('loader');
  var clock = new THREE.Clock();
  var firstFrame = true, avgFrame = 0.016, qualityReduced = false;
  function animate() {
    requestAnimationFrame(animate);
    var delta = Math.min(clock.getDelta(), 0.05), time = clock.elapsedTime;

    avgFrame = avgFrame * 0.95 + delta * 0.05;
    if (!qualityReduced && avgFrame > 0.034 && pixelRatio > 1) {
      qualityReduced = true; pixelRatio = 1; renderer.setPixelRatio(1); renderer.setSize(window.innerWidth, window.innerHeight);
    }

    for (var mi = 0; mi < animatedMats.length; mi++) {
      var u = animatedMats[mi].uniforms;
      if (u.uTime) u.uTime.value = time;
      if (u.uCamPos) u.uCamPos.value.copy(camera.position);
    }

    sunMesh.rotation.y += 0.04 * delta;
    var pulse = 1 + Math.sin(time * 1.2) * 0.045;
    glowA.scale.set(24 * pulse, 24 * pulse, 1); glowB.scale.set(48 * pulse, 48 * pulse, 1);

    planets.forEach(function (p) { p.pivot.rotation.y += p.orbitSpeed * delta; p.mesh.rotation.y += p.rotSpeed * delta; });
    cloudMeshes.forEach(function (c) { c.rotation.y += 0.08 * delta; });
    moonPivots.forEach(function (m) { m.pivot.rotation.y += (Math.PI * 2 / (6 / m.speed)) * delta; });
    beltPivot.rotation.y += 0.012 * delta;

    if (!REDUCED) {
      if (!shoot.mesh) { shoot.next -= delta; if (shoot.next <= 0) { spawnShootingStar(); shoot.next = 5 + Math.random() * 8; } }
      else {
        shoot.head.addScaledVector(shoot.vel, delta); shoot.life -= delta * 1.3;
        var pos = shoot.mesh.geometry.attributes.position.array;
        pos[0] = shoot.head.x; pos[1] = shoot.head.y; pos[2] = shoot.head.z;
        pos[3] = shoot.head.x - shoot.vel.x * 0.22; pos[4] = shoot.head.y - shoot.vel.y * 0.22; pos[5] = shoot.head.z - shoot.vel.z * 0.22;
        shoot.mesh.geometry.attributes.position.needsUpdate = true;
        shoot.mesh.material.opacity = Math.max(0, shoot.life) * 0.85;
        if (shoot.life <= 0) { scene.remove(shoot.mesh); shoot.mesh.geometry.dispose(); shoot.mesh.material.dispose(); shoot.mesh = null; }
      }
    }

    smoothScroll += (targetScroll - smoothScroll) * (REDUCED ? 1 : 0.085);
    var maxScroll = Math.max(1, document.body.scrollHeight - vh);
    progress = Math.max(0, Math.min(1, smoothScroll / maxScroll));
    var f = progress * (N - 1), si = Math.min(Math.floor(f), N - 2), t = f - si, e = t * t * (3 - 2 * t);
    camForSection(SECTIONS[si], p1, t1, time); camForSection(SECTIONS[si + 1], p2, t2, time);
    camera.position.lerpVectors(p1, p2, e);
    camera.position.x += mouseX * 1.6; camera.position.y += mouseY * 0.9;
    tmp.lerpVectors(t1, t2, e); camera.lookAt(tmp);
    if (!REDUCED) {
      var vel = targetScroll - smoothScroll;
      camera.rotateZ(Math.max(-0.04, Math.min(0.04, vel * 0.000015)));
      var tFov = 52 + Math.max(0, Math.min(5, Math.abs(vel) * 0.00008));
      if (Math.abs(camera.fov - tFov) > 0.05) { camera.fov += (tFov - camera.fov) * 0.1; camera.updateProjectionMatrix(); }
    }

    var viewCenter = smoothScroll + vh * 0.5;
    slideEls.forEach(function (s, i) {
      var d = Math.abs(viewCenter - (i + 0.5) * vh) / vh;
      var vis = Math.max(0, Math.min(1, 1 - d * 1.5));
      var inner = s.firstElementChild;
      inner.style.opacity = vis.toFixed(3);
      inner.style.transform = 'translateY(' + ((1 - vis) * 34).toFixed(1) + 'px)';
      var wasIn = s.classList.contains('in');
      s.classList.toggle('in', vis > 0.35);
      if (!wasIn && vis > 0.35) { inner.querySelectorAll('.stat-pill .v, .overview-stat .v').forEach(triggerCountUp); }
    });

    progressFill.style.width = (progress * 100).toFixed(2) + '%';
    scrollHint.classList.toggle('hide', smoothScroll > vh * 0.4);
    var activeIdx = 0;
    if (f >= 1) activeIdx = Math.min(1 + Math.floor((f - 1) / 2), PLANETS.length);
    navLinkEls.forEach(function (a, ai) { a.classList.toggle('active', ai === activeIdx); });
    dotEls.forEach(function (d, di) { d.classList.toggle('active', di === activeIdx); });

    var tCol = new THREE.Color(ACCENTS[activeIdx]);
    curAccent[0] += (tCol.r * 255 - curAccent[0]) * 0.06;
    curAccent[1] += (tCol.g * 255 - curAccent[1]) * 0.06;
    curAccent[2] += (tCol.b * 255 - curAccent[2]) * 0.06;
    document.documentElement.style.setProperty('--accent', 'rgb(' + Math.round(curAccent[0]) + ',' + Math.round(curAccent[1]) + ',' + Math.round(curAccent[2]) + ')');

    if (activeIdx === 0) { hudBody.textContent = 'Solar System'; hudDist.textContent = 'Overview · all 8 planets'; hudLight.textContent = ''; }
    else { var pl = PLANETS[activeIdx - 1]; hudBody.textContent = pl.name; hudDist.textContent = 'From Sun: ' + pl.facts['Distance from Sun']; hudLight.textContent = 'Light travel: ' + LIGHT_TIMES[activeIdx - 1]; }

    var inDetail = f >= 1 && ((f - 1) % 2) > 1;
    var baseFade = f < 1 ? 1 : (inDetail ? 0.25 : 0.7);
    orbitLines.forEach(function (o) { o.line.material.opacity = (o.pIdx === activeIdx - 1 ? 0.6 : 0.12) * baseFade; });

    if (glOk) renderer.render(scene, camera);

    if (firstFrame && texturesReady) {
      firstFrame = false;
      if (loaderFill) loaderFill.style.width = '100%';
      if (loaderPct) loaderPct.textContent = '100%';
      setTimeout(function () { loader.classList.add('hide'); }, 500);
    }
  }
  onScroll(); smoothScroll = targetScroll;
  animate();
})();
