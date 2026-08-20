(() => {
  const MODEL_CACHE = new Map();
  const VIEWER_FLAG = '__blReal3DViewerReadyV1';

  async function loadModel(url) {
    if (!MODEL_CACHE.has(url)) {
      MODEL_CACHE.set(url, fetch(url).then(r => {
        if (!r.ok) throw new Error('Modell konnte nicht geladen werden: ' + r.status);
        return r.json();
      }));
    }
    return MODEL_CACHE.get(url);
  }

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const msg = gl.getShaderInfoLog(shader) || 'Shader compile error';
      gl.deleteShader(shader);
      throw new Error(msg);
    }
    return shader;
  }

  function createProgram(gl) {
    const vs = compile(gl, gl.VERTEX_SHADER, `
      attribute vec3 aPosition;
      attribute vec3 aNormal;
      uniform mat4 uMvp;
      uniform mat4 uModel;
      varying float vLight;
      varying vec3 vNormal;
      void main() {
        vec3 n = normalize(mat3(uModel) * aNormal);
        vec3 lightDir = normalize(vec3(0.45, 0.75, 0.55));
        float diff = max(dot(n, lightDir), 0.0);
        float rim = pow(1.0 - max(dot(n, normalize(vec3(0.0, 0.0, 1.0))), 0.0), 2.0) * 0.12;
        vLight = 0.36 + diff * 0.68 + rim;
        vNormal = n;
        gl_Position = uMvp * vec4(aPosition, 1.0);
      }
    `);
    const fs = compile(gl, gl.FRAGMENT_SHADER, `
      precision mediump float;
      uniform vec3 uColor;
      varying float vLight;
      varying vec3 vNormal;
      void main() {
        vec3 c = uColor * vLight;
        c += vec3(0.03, 0.035, 0.045);
        gl_FragColor = vec4(c, 1.0);
      }
    `);
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      const msg = gl.getProgramInfoLog(p) || 'Program link error';
      gl.deleteProgram(p);
      throw new Error(msg);
    }
    return p;
  }

  function mat4Identity() {
    return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
  }
  function mat4Multiply(a, b) {
    const out = new Array(16);
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        out[c*4+r] = a[0*4+r]*b[c*4+0] + a[1*4+r]*b[c*4+1] + a[2*4+r]*b[c*4+2] + a[3*4+r]*b[c*4+3];
      }
    }
    return out;
  }
  function mat4Perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    return [
      f/aspect,0,0,0,
      0,f,0,0,
      0,0,(far+near)*nf,-1,
      0,0,(2*far*near)*nf,0
    ];
  }
  function mat4Translate(x, y, z) {
    return [1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1];
  }
  function mat4Scale(s) {
    return [s,0,0,0, 0,s,0,0, 0,0,s,0, 0,0,0,1];
  }
  function mat4RotX(a) {
    const c = Math.cos(a), s = Math.sin(a);
    return [1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1];
  }
  function mat4RotY(a) {
    const c = Math.cos(a), s = Math.sin(a);
    return [c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1];
  }
  function mat4RotZ(a) {
    const c = Math.cos(a), s = Math.sin(a);
    return [c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1];
  }

  function fitCanvas(canvas, gl) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    return { w, h };
  }

  async function initCanvas(canvas) {
    if (canvas[VIEWER_FLAG]) return;
    canvas[VIEWER_FLAG] = true;
    const url = canvas.getAttribute('data-model') || '/assets/models/mt42_real_u3d.json';
    const gl = canvas.getContext('webgl', { antialias: true, alpha: true, preserveDrawingBuffer: true });
    if (!gl) {
      canvas.insertAdjacentHTML('afterend', '<div style="position:absolute;inset:0;display:grid;place-items:center;color:white;font-weight:700">WebGL wird von diesem Browser nicht unterstützt.</div>');
      return;
    }
    let model;
    try { model = await loadModel(url); }
    catch (err) {
      console.error(err);
      canvas.insertAdjacentHTML('afterend', '<div style="position:absolute;inset:0;display:grid;place-items:center;color:white;font-weight:700">3D-Modell konnte nicht geladen werden.</div>');
      return;
    }

    const program = createProgram(gl);
    const posLoc = gl.getAttribLocation(program, 'aPosition');
    const normLoc = gl.getAttribLocation(program, 'aNormal');
    const mvpLoc = gl.getUniformLocation(program, 'uMvp');
    const modelLoc = gl.getUniformLocation(program, 'uModel');
    const colorLoc = gl.getUniformLocation(program, 'uColor');

    const pos = new Float32Array(model.positions.flat());
    const normals = new Float32Array(model.normals.flat());
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
    const normBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

    const useUint32 = model.positions.length > 65535;
    if (useUint32) gl.getExtension('OES_element_index_uint');
    const indexType = useUint32 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    const groups = model.groups.map(g => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b);
      const arr = useUint32 ? new Uint32Array(g.indices) : new Uint16Array(g.indices);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, arr, gl.STATIC_DRAW);
      return { buffer: b, count: arr.length, color: g.color || [0.7,0.7,0.7], name: g.name || '' };
    });

    const size = model.bbox && model.bbox.size ? Math.max(model.bbox.size[0], model.bbox.size[1], model.bbox.size[2]) : 42;
    let rotX = -0.48;
    let rotY = 0.68;
    let zoom = 1.0;
    let dragging = false;
    let lastX = 0, lastY = 0;

    function render() {
      const { w, h } = fitCanvas(canvas, gl);
      const aspect = w / Math.max(1, h);
      gl.enable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(program);

      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
      gl.enableVertexAttribArray(normLoc);
      gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, 0, 0);

      const persp = mat4Perspective(Math.PI / 4, aspect, 0.1, 1000);
      const dist = size * 2.6 * zoom;
      const view = mat4Translate(0, 0, -dist);
      const scale = mat4Scale(1.0);
      // A small Z rotation aligns the square button more like the PDF CAD view.
      const modelMat = mat4Multiply(mat4Multiply(mat4RotY(rotY), mat4RotX(rotX)), mat4RotZ(0.02));
      const mvp = mat4Multiply(persp, mat4Multiply(view, mat4Multiply(modelMat, scale)));
      gl.uniformMatrix4fv(mvpLoc, false, new Float32Array(mvp));
      gl.uniformMatrix4fv(modelLoc, false, new Float32Array(modelMat));
      for (const g of groups) {
        gl.uniform3fv(colorLoc, new Float32Array(g.color));
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.buffer);
        gl.drawElements(gl.TRIANGLES, g.count, indexType, 0);
      }
      requestAnimationFrame(render);
    }

    canvas.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture?.(e.pointerId); });
    canvas.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      rotY += dx * 0.008;
      rotX += dy * 0.008;
      rotX = Math.max(-1.4, Math.min(1.4, rotX));
    });
    canvas.addEventListener('pointerup', e => { dragging = false; canvas.releasePointerCapture?.(e.pointerId); });
    canvas.addEventListener('pointercancel', () => { dragging = false; });
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      zoom *= Math.exp(e.deltaY * 0.001);
      zoom = Math.max(0.45, Math.min(2.2, zoom));
    }, { passive: false });

    const ro = new ResizeObserver(() => fitCanvas(canvas, gl));
    ro.observe(canvas);
    render();
  }

  function scan(root = document) {
    root.querySelectorAll?.('canvas.bl-ma42-viewer-canvas').forEach(c => initCanvas(c));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scan());
  } else {
    scan();
  }
  new MutationObserver(mutations => {
    for (const m of mutations) {
      for (const n of m.addedNodes) {
        if (n.nodeType === 1) scan(n);
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
