// Tour 3D da seção "Sobre": cada foto tem um mapa de profundidade (mais claro = mais perto)
// Troque textos ou fotos aqui
const CENAS_TOUR = [
  { foto: "img/tour/rua.jpg",         prof: "img/tour/rua-prof.png",         titulo: "Chegando na PDC Garage", desc: "Fácil de encontrar, com espaço para receber o seu carro." },
  { foto: "img/tour/fachada.jpg",     prof: "img/tour/fachada-prof.png",     titulo: "Centro Automotivo",      desc: "Suspensão, freios, revisão, ar-condicionado, troca de óleo e injeção eletrônica." },
  { foto: "img/tour/patio.jpg",       prof: "img/tour/patio-prof.png",       titulo: "Área de serviço",        desc: "Pátio amplo, elevadores e equipamentos para cada tipo de serviço." },
  { foto: "img/tour/alinhamento.jpg", prof: "img/tour/alinhamento-prof.png", titulo: "Alinhamento e peças",    desc: "Rampa de alinhamento e estoque de peças de primeira linha." },
  { foto: "img/tour/recepcao.jpg",    prof: "img/tour/recepcao-prof.png",    titulo: "Recepção",               desc: "Ambiente organizado para você acompanhar o serviço com tranquilidade." }
];
const FORCA_3D = 0.035;    // intensidade do efeito 3D
const TROCA_AUTOMATICA = 7000; // ms entre fotos (0 = desliga)

(() => {
  const tour = document.getElementById("tour");
  const tela = document.getElementById("tourTela");
  const gl = tela.getContext("webgl", { antialias: false, premultipliedAlpha: false });
  if (!gl) return; // sem WebGL: fica a foto estática

  const movimentoReduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- WebGL ----------
  const sombreadorVertice = `attribute vec2 p; varying vec2 v; void main(){ v = p*0.5+0.5; v.y = 1.0-v.y; gl_Position = vec4(p,0.,1.); }`;
  const sombreadorPixel = `precision mediump float;
varying vec2 v;
uniform sampler2D foto, prof, foto2, prof2;
uniform vec2 mouse, escala, escala2;
uniform float zoom, zoom2, mistura, forca;
vec4 amostra(sampler2D f, sampler2D d, vec2 esc, float z){
  vec2 uv = (v-0.5)*esc/z + 0.5;
  // paralaxe iterativa: o que está mais perto se mexe mais
  vec2 o = uv;
  for(int i=0;i<4;i++){ float dd = texture2D(d,o).r; o = uv + mouse*(dd-0.45)*forca; }
  return texture2D(f, clamp(o, 0.001, 0.999));
}
void main(){
  gl_FragColor = mix(amostra(foto, prof, escala, zoom), amostra(foto2, prof2, escala2, zoom2), mistura);
}`;
  const compilar = (tipo, codigo) => { const s = gl.createShader(tipo); gl.shaderSource(s, codigo); gl.compileShader(s); return s; };
  const programa = gl.createProgram();
  gl.attachShader(programa, compilar(gl.VERTEX_SHADER, sombreadorVertice));
  gl.attachShader(programa, compilar(gl.FRAGMENT_SHADER, sombreadorPixel));
  gl.linkProgram(programa);
  gl.useProgram(programa);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const atributo = gl.getAttribLocation(programa, "p");
  gl.enableVertexAttribArray(atributo);
  gl.vertexAttribPointer(atributo, 2, gl.FLOAT, false, 0, 0);
  const U = (nome) => gl.getUniformLocation(programa, nome);

  const criarTextura = (imagem) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imagem);
    return t;
  };
  const carregar = (src) => new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = src; });

  // ---------- Estado ----------
  let atual = 0, anterior = 0, mistura = 1, inicioTroca = 0, inicioCena = performance.now();
  let ultimoToque = 0, temporizador = null, visivel = false, rodando = false, pronto = false;
  const alvo = { x: 0, y: 0 }, mouse = { x: 0, y: 0 };

  const ajustarTela = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    tela.width = tela.clientWidth * dpr;
    tela.height = tela.clientHeight * dpr;
    gl.viewport(0, 0, tela.width, tela.height);
  };
  // faz a foto cobrir o quadro inteiro (como object-fit: cover)
  const escalaPara = (cena) => {
    const rt = tela.width / tela.height, rf = cena.largura / cena.altura;
    return rt > rf ? [1, rf / rt] : [rt / rf, 1];
  };

  // ---------- Interface ----------
  const nav = document.getElementById("tourNav");
  const info = document.getElementById("tourInfo");
  CENAS_TOUR.forEach((cena, i) => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "tour__mini";
    botao.setAttribute("aria-label", cena.titulo);
    botao.innerHTML = `<img src="${cena.foto}" alt="" loading="lazy">`;
    botao.addEventListener("click", () => irPara(i, true));
    nav.appendChild(botao);
  });

  const mostrarTextos = (i) => {
    info.classList.add("trocando");
    setTimeout(() => {
      document.getElementById("tourPasso").textContent = String(i + 1).padStart(2, "0") + " / " + String(CENAS_TOUR.length).padStart(2, "0");
      document.getElementById("tourTitulo").textContent = CENAS_TOUR[i].titulo;
      document.getElementById("tourDesc").textContent = CENAS_TOUR[i].desc;
      info.classList.remove("trocando");
    }, 250);
    [...nav.children].forEach((botao, k) => botao.classList.toggle("ativo", k === i));
  };

  const irPara = (i, manual) => {
    i = (i + CENAS_TOUR.length) % CENAS_TOUR.length;
    if (i === atual) return;
    anterior = atual;
    atual = i;
    mistura = 0;
    inicioTroca = inicioCena = performance.now();
    mostrarTextos(i);
    if (manual) reiniciarTroca();
    iniciarAnimacao();
  };

  const reiniciarTroca = () => {
    clearInterval(temporizador);
    if (TROCA_AUTOMATICA && visivel && !movimentoReduzido) temporizador = setInterval(() => irPara(atual + 1), TROCA_AUTOMATICA);
  };

  document.getElementById("tourAnterior").addEventListener("click", () => irPara(atual - 1, true));
  document.getElementById("tourProxima").addEventListener("click", () => irPara(atual + 1, true));

  // ---------- Movimento: mouse, toque e giroscópio ----------
  tour.addEventListener("pointermove", (e) => {
    const r = tour.getBoundingClientRect();
    alvo.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    alvo.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    ultimoToque = performance.now();
  });
  tour.addEventListener("pointerleave", () => { ultimoToque = 0; });

  let toqueX = null;
  tour.addEventListener("touchstart", (e) => { toqueX = e.touches[0].clientX; }, { passive: true });
  tour.addEventListener("touchend", (e) => {
    if (toqueX === null) return;
    const dx = e.changedTouches[0].clientX - toqueX;
    if (Math.abs(dx) > 50) irPara(atual + (dx < 0 ? 1 : -1), true);
    toqueX = null;
  });

  const aoInclinar = (e) => {
    if (e.gamma == null || !visivel) return;
    alvo.x = Math.max(-1, Math.min(1, e.gamma / 25));
    alvo.y = Math.max(-1, Math.min(1, (e.beta - 45) / 25));
    ultimoToque = performance.now();
  };
  const botaoGiro = document.getElementById("tourGiro");
  if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === "function") {
    // iPhone pede permissão para usar o giroscópio
    botaoGiro.style.display = "block";
    botaoGiro.addEventListener("click", () => {
      DeviceOrientationEvent.requestPermission()
        .then((resposta) => { if (resposta === "granted") window.addEventListener("deviceorientation", aoInclinar); })
        .finally(() => { botaoGiro.style.display = "none"; });
    });
  } else if (window.DeviceOrientationEvent) {
    window.addEventListener("deviceorientation", aoInclinar);
  }

  // ---------- Animação: só roda quando o tour está na tela ----------
  const iniciarAnimacao = () => {
    if (pronto && visivel && !rodando) { rodando = true; requestAnimationFrame(desenhar); }
  };

  const desenhar = (t) => {
    if (!visivel) { rodando = false; return; }
    // sem interação: balanço suave automático
    if (t - ultimoToque > 2500 && !movimentoReduzido) { alvo.x = Math.sin(t / 2300) * 0.75; alvo.y = Math.cos(t / 3100) * 0.35; }
    mouse.x += (alvo.x - mouse.x) * 0.06;
    mouse.y += (alvo.y - mouse.y) * 0.06;
    if (mistura < 1) mistura = Math.min(1, (t - inicioTroca) / 900);
    const suave = mistura * mistura * (3 - 2 * mistura);

    const a = CENAS_TOUR[anterior], b = CENAS_TOUR[atual];
    const zoomAtual = 1.07 + (movimentoReduzido ? 0 : Math.min((t - inicioCena) / 9000, 1) * 0.05); // aproximação lenta
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, a.texFoto);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, a.texProf);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, b.texFoto);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, b.texProf);
    gl.uniform2f(U("mouse"), mouse.x, mouse.y);
    gl.uniform2fv(U("escala"), escalaPara(a));
    gl.uniform2fv(U("escala2"), escalaPara(b));
    gl.uniform1f(U("zoom"), 1.12);
    gl.uniform1f(U("zoom2"), zoomAtual);
    gl.uniform1f(U("mistura"), suave);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(desenhar);
  };

  new IntersectionObserver((entradas) => {
    visivel = entradas[0].isIntersecting;
    reiniciarTroca();
    iniciarAnimacao();
  }, { threshold: 0.1 }).observe(tour);

  new ResizeObserver(() => { if (pronto) ajustarTela(); }).observe(tela);

  // ---------- Carregamento ----------
  Promise.all(CENAS_TOUR.map((cena) =>
    Promise.all([carregar(cena.foto), carregar(cena.prof)]).then(([foto, prof]) => {
      cena.texFoto = criarTextura(foto);
      cena.texProf = criarTextura(prof);
      cena.largura = foto.naturalWidth;
      cena.altura = foto.naturalHeight;
    })
  )).then(() => {
    gl.uniform1i(U("foto"), 0); gl.uniform1i(U("prof"), 1); gl.uniform1i(U("foto2"), 2); gl.uniform1i(U("prof2"), 3);
    gl.uniform1f(U("forca"), FORCA_3D);
    ajustarTela();
    pronto = true;
    tour.classList.add("ativo");
    mostrarTextos(0);
    reiniciarTroca();
    iniciarAnimacao();
  }).catch(() => { /* se alguma imagem falhar, fica a foto estática */ });
})();
