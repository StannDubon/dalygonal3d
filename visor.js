/* Visor STL compartido por el catálogo y el panel de administración.
   Requiere three.js (THREE global). Lee STL binario y ASCII sin cargadores extra. */
(function () {
  'use strict';

  function parseSTL(buf) {
    const dv = new DataView(buf);
    let pos;
    const n = buf.byteLength >= 84 ? dv.getUint32(80, true) : 0;
    if (buf.byteLength >= 84 && 84 + n * 50 === buf.byteLength) {
      pos = new Float32Array(n * 9);
      for (let i = 0; i < n; i++) {
        const o = 84 + i * 50 + 12;
        for (let k = 0; k < 9; k++) pos[i * 9 + k] = dv.getFloat32(o + k * 4, true);
      }
    } else {
      const txt = new TextDecoder().decode(buf);
      const re = /vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g;
      const a = []; let m;
      while ((m = re.exec(txt))) a.push(+m[1], +m[2], +m[3]);
      if (!a.length) throw new Error('El archivo no parece un STL válido.');
      pos = new Float32Array(a);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.rotateX(-Math.PI / 2);               // STL usa Z hacia arriba
    g.computeBoundingBox();
    const b = g.boundingBox, c = new THREE.Vector3();
    b.getCenter(c);
    g.translate(-c.x, -b.min.y, -c.z);     // apoyado sobre la cama, centrado
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }

  function buildScene(geom, color, rot, hero) {
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, hero ? 0.5 : 0.9));
    const d = new THREE.DirectionalLight(0xffffff, hero ? 0.55 : 0.8); d.position.set(1, 2, 1.4); scene.add(d);
    const d2 = new THREE.DirectionalLight(0xffffff, 0.3); d2.position.set(-1.5, 0.5, -1); scene.add(d2);
    const mat = new THREE.MeshStandardMaterial({ color: color || '#ef8f86', roughness: hero ? 0.4 : 0.55, metalness: 0.05, flatShading: !!hero });
    if (hero) {   // luces de color de la marca para el modelo de portada
      const p1 = new THREE.PointLight(0xff1f6b, 0.45); p1.position.set(-3, 1, 2); scene.add(p1);
      const p2 = new THREE.PointLight(0xffd23f, 0.35); p2.position.set(3, 2, -1); scene.add(p2);
    }
    const mesh = new THREE.Mesh(geom, mat);
    const r = geom.boundingSphere.radius;
    if (!hero) {
      const grid = new THREE.GridHelper(r * 3, 12, 0x9aa3b2, 0xd0d4db);
      grid.material.transparent = true; grid.material.opacity = 0.5; scene.add(grid);
    }
    if (hero) scene.children.filter(o => o.isPointLight).forEach(p => { p.position.multiplyScalar(r); p.distance = 0; });
    const bb = geom.boundingBox, mid = new THREE.Vector3(0, (bb.max.y - bb.min.y) / 2, 0);
    const pivot = new THREE.Group(); mesh.position.set(0, -mid.y, 0); pivot.add(mesh); scene.add(pivot);
    const s = { scene, mesh, pivot, r, mid, target: mid.clone() };
    applyRotation(s, rot && rot.x, rot && rot.y);
    return s;
  }

  /* Gira la pieza (grados) en X e Y y la vuelve a apoyar sobre la cama.
     Usa las 8 esquinas de la caja: rápido aunque el STL sea enorme. */
  function applyRotation(s, x, y) {
    const D = Math.PI / 180, bb = s.mesh.geometry.boundingBox;
    s.pivot.rotation.set((+x || 0) * D, (+y || 0) * D, 0, 'YXZ');
    s.pivot.position.set(0, 0, 0); s.pivot.updateMatrixWorld(true);
    let lo = Infinity, hi = -Infinity; const v = new THREE.Vector3();
    for (let i = 0; i < 8; i++) {
      v.set(i & 1 ? bb.max.x : bb.min.x, (i & 2 ? bb.max.y : bb.min.y), i & 4 ? bb.max.z : bb.min.z).applyMatrix4(s.mesh.matrixWorld);
      lo = Math.min(lo, v.y); hi = Math.max(hi, v.y);
    }
    s.pivot.position.y = -lo; s.baseY = -lo; s.target.set(0, (hi - lo) / 2, 0);
  }

  function placeCamera(cam, s, theta, phi, dist) {
    cam.position.set(
      s.target.x + dist * Math.sin(phi) * Math.sin(theta),
      s.target.y + dist * Math.cos(phi),
      s.target.z + dist * Math.sin(phi) * Math.cos(theta));
    cam.lookAt(s.target);
  }

  /* Visor interactivo: arrastrar para girar, rueda o pellizco para acercar. */
  function create(container, opts) {
    opts = opts || {};
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !!opts.snapshot });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;cursor:grab;touch-action:' + (opts.hero ? 'pan-y' : 'none');
    container.appendChild(renderer.domElement);
    const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 10000);
    const hero = !!opts.hero, still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let s = null, theta = 0.7, phi = 1.1, dist = 100, auto = true, raf = 0, alive = true, intro = 0;
    const far = () => s.r * (hero ? 3.3 : 3.6);
    const pts = new Map(); let pinch = 0;

    function size() {
      const w = container.clientWidth || 300, h = container.clientHeight || 300;
      renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(size); ro.observe(container); size();

    function loop() {
      if (!alive) return;
      if (s) {
        if (intro) {   // entrada: la pieza sube girando y aparece
          const k = Math.min(1, (performance.now() - intro) / 1600), e = 1 - Math.pow(1 - k, 3);
          s.pivot.position.y = s.baseY - (1 - e) * s.r * 0.9; s.pivot.scale.setScalar(0.55 + 0.45 * e); theta += (1 - e) * 0.06;
          if (k >= 1) { intro = 0; s.pivot.position.y = s.baseY; s.pivot.scale.setScalar(1); }
        }
        if (hero || (auto && !still)) theta += hero ? 0.005 : 0.006;   // la portada gira siempre
        placeCamera(cam, s, theta, phi, dist); renderer.render(s.scene, cam);
      }
      raf = requestAnimationFrame(loop);
    }
    loop();

    const el = renderer.domElement;
    el.addEventListener('pointerdown', e => { if (!hero) auto = false; el.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); el.style.cursor = 'grabbing'; });
    el.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      const p = pts.get(e.pointerId), dx = e.clientX - p[0], dy = e.clientY - p[1];
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 1) { theta -= dx * 0.008; if (!hero) phi = Math.min(3.0, Math.max(0.15, phi - dy * 0.008)); }
      else if (pts.size === 2 && s) {
        const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinch) dist = Math.min(s.r * 8, Math.max(s.r * 0.8, dist * pinch / d));
        pinch = d;
      }
    });
    const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = 0; el.style.cursor = 'grab'; };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    if (!hero) el.addEventListener('wheel', e => { if (!s) return; e.preventDefault(); auto = false; dist = Math.min(s.r * 8, Math.max(s.r * 0.8, dist * (1 + Math.sign(e.deltaY) * 0.1))); }, { passive: false });

    return {
      show(geom, color, rot) {
        if (s) { s.mesh.material.dispose(); }
        s = buildScene(geom, color, rot, hero); dist = far(); theta = hero ? -0.4 : 0.7; phi = hero ? 1.45 : 1.1; auto = true;
        if (hero && !still) { intro = performance.now(); s.pivot.scale.setScalar(0.55); }
      },
      setRotation(x, y) { if (s) { applyRotation(s, x, y); if (!hero) auto = false; } },
      setColor(c) { if (s) s.mesh.material.color.set(c); },
      reset() { if (s) { dist = far(); theta = 0.7; phi = hero ? 1.45 : 1.1; auto = true; } },
      dispose() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); if (s) s.mesh.material.dispose(); renderer.dispose(); try { renderer.forceContextLoss(); } catch (_) {} el.remove(); }
    };
  }

  /* Miniatura PNG con un solo renderizador compartido (evita agotar contextos WebGL). */
  let tr = null;
  function thumbnail(geom, color, w, h, rot) {
    w = w || 640; h = h || 480;
    if (!tr) tr = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    tr.setPixelRatio(1); tr.setSize(w, h, false);
    const s = buildScene(geom, color, rot);
    const cam = new THREE.PerspectiveCamera(35, w / h, 0.1, 10000);
    placeCamera(cam, s, 0.7, 1.1, s.r * 3.2);
    tr.render(s.scene, cam);
    const url = tr.domElement.toDataURL('image/png');
    s.mesh.material.dispose();
    return url;
  }

  /* Descarga un STL; si viene comprimido (.stl.gz) lo descomprime en el navegador. */
  async function fetchSTL(url) {
    const r = await fetch(url); if (!r.ok) throw new Error('No se encontró el archivo');
    let buf = await r.arrayBuffer(); const u = new Uint8Array(buf, 0, 2);
    if (u[0] === 0x1f && u[1] === 0x8b) {
      if (!('DecompressionStream' in window)) throw new Error('Actualiza tu navegador para ver este modelo.');
      buf = await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    }
    return buf;
  }
  async function gzip(buf) {
    if (!('CompressionStream' in window)) return null;
    return new Response(new Blob([buf]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
  }

  window.Visor = { parseSTL, create, thumbnail, fetchSTL, gzip };
})();
