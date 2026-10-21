const NUMERO_WHATSAPP = "5585989083665";
const MENSAGEM_WHATSAPP = "Olá! Gostaria de agendar um serviço na PDC Garage.";

const USUARIO_INSTAGRAM = "pdcgarageofc";

// Links do Instagram
document.querySelectorAll(".js-instagram").forEach((link) => {
  link.href = `https://www.instagram.com/${USUARIO_INSTAGRAM}/`;
  link.target = "_blank";
  link.rel = "noopener";
});
document.querySelectorAll(".js-instagram-usuario").forEach((texto) => {
  texto.textContent = `@${USUARIO_INSTAGRAM}`;
});

// Links do WhatsApp
const linkWhatsapp = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(MENSAGEM_WHATSAPP)}`;
document.querySelectorAll(".js-whatsapp").forEach((botao) => {
  botao.href = linkWhatsapp;
  botao.target = "_blank";
  botao.rel = "noopener";
});

// Cabeçalho muda ao rolar a página
const cabecalho = document.getElementById("cabecalho");
const atualizarCabecalho = () => cabecalho.classList.toggle("rolado", window.scrollY > 40);
window.addEventListener("scroll", atualizarCabecalho, { passive: true });
atualizarCabecalho();

// Menu mobile
const botaoMenu = document.getElementById("botaoMenu");
const menu = document.getElementById("menu");

const alternarMenu = (abrir) => {
  menu.classList.toggle("aberto", abrir);
  botaoMenu.classList.toggle("ativo", abrir);
  botaoMenu.setAttribute("aria-expanded", abrir);
};

botaoMenu.addEventListener("click", () => alternarMenu(!menu.classList.contains("aberto")));
menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => alternarMenu(false)));

// Animação de entrada dos elementos ao rolar
const elementosAnimados = document.querySelectorAll(".cartao, .diferencial, .secao__topo, .sobre__midia, .sobre__texto, .contato__info, .contato__mapa");
elementosAnimados.forEach((elemento) => elemento.classList.add("revelar"));

const observador = new IntersectionObserver((entradas) => {
  entradas.forEach((entrada) => {
    if (entrada.isIntersecting) {
      entrada.target.classList.add("visivel");
      observador.unobserve(entrada.target);
    }
  });
}, { threshold: 0.15 });

elementosAnimados.forEach((elemento) => observador.observe(elemento));

document.getElementById("ano").textContent = new Date().getFullYear();

elementosAnimados.forEach((elemento) => observador.observe(elemento));

document.getElementById("ano").textContent = new Date().getFullYear();
