// Limites geográficos aproximados do Vale do Aço (Ipatinga, Coronel Fabriciano, Timóteo e Santana do Paraíso)
const limitesValeDoAco = L.latLngBounds(
    [-19.68, -42.78], // Sudoeste
    [-19.35, -42.40]  // Nordeste
);

// Inicialização do mapa travado na região do Vale do Aço
const mapa = L.map('mapa', {
  center: [-19.51, -42.61],
  zoom: 12,
  minZoom: 11,
  maxZoom: 18,
  maxBounds: limitesValeDoAco,
  maxBoundsViscosity: 1.0
});

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap'
}).addTo(mapa);

// Paleta de cores e raio geográfico real (em metros) por nível de intensidade (1 a 5)
const cores = ['', '#fcc419', '#ff922b', '#f76707', '#e03131', '#a61e4d'];
const raiosEmMetros = [0, 180, 280, 400, 550, 750];

// Camada dedicada para os círculos de incêndio
const camadaFocos = L.layerGroup().addTo(mapa);

// Lê os registros de js/registrosQueimadas.json, mescla com localStorage e desenha no mapa
async function carregarFocosNoMapa() {
  try {
    const resposta = await fetch('js/registrosQueimadas.json');
    if (!resposta.ok) {
      throw new Error(`Erro HTTP ${resposta.status} ao buscar registrosQueimadas.json`);
    }

    const dadosJson = await resposta.json();
    const focosSalvos = JSON.parse(localStorage.getItem('focosPersonalizados')) || [];
    const idsRemovidos = JSON.parse(localStorage.getItem('focosRemovidos')) || [];

    const todosFocos = [...dadosJson, ...focosSalvos].filter(
        (foco) => !idsRemovidos.includes(foco.id)
    );

    camadaFocos.clearLayers();

    todosFocos.forEach((f) => {
      if (typeof f.lat !== 'number' || typeof f.lng !== 'number') return;

      const nivel = Math.min(5, Math.max(1, Number(f.nivel) || 1));
      const cor = cores[nivel];

      // L.circle usa raio em metros reais, mantendo a proporção exata com ruas e bairros em qualquer zoom
      const marcador = L.circle([f.lat, f.lng], {
        radius: raiosEmMetros[nivel],
        color: cor,
        fillColor: cor,
        fillOpacity: 0.45,
        weight: 2
      });

      marcador.bindPopup(`
                <div style="min-width: 190px; line-height: 1.4;">
                    <strong>${f.local}</strong><br>
                    <span style="color: ${cor}; font-weight: bold;">${f.intensidade || `Nível ${nivel}`}</span><br>
                    <small><b>Status:</b> ${f.status || 'Em análise'}</small><br>
                    <small><b>Data:</b> ${f.data || 'Recente'}</small>
                    <p style="margin: 6px 0 0; font-size: 0.9em;">${f.descricao || ''}</p>
                </div>
            `);

      marcador.addTo(camadaFocos);
    });
  } catch (erro) {
    console.error('Erro ao carregar focos no mapa:', erro);
  }
}

async function carregarDadosUsuario() {
  const campoNome = document.getElementById('conta-nome');
  const campoEmail = document.getElementById('conta-email');
  const campoTelefone = document.getElementById('conta-telefone');
  const campoCidade = document.getElementById('conta-cidade');

  // Encerra a sessão ativa ao clicar em "Sair da Conta"
  const btnSair = document.querySelector('.painel-rodape a[href="login.html"]');
  if (btnSair) {
    btnSair.addEventListener('click', () => {
      localStorage.removeItem('usuarioLogado');
    });
  }

  // Ativa o botão "Salvar Dados" do painel lateral Minha Conta
  const formConta = document.querySelector('.painel-conta form');
  if (formConta) {
    formConta.addEventListener('submit', (evento) => {
      evento.preventDefault();
      const usuarioAtualizado = {
        nome: campoNome ? campoNome.value.trim() : '',
        email: campoEmail ? campoEmail.value.trim() : '',
        telefone: campoTelefone ? campoTelefone.value.trim() : '',
        cidade: campoCidade ? campoCidade.value.trim() : ''
      };
      localStorage.setItem('usuarioLogado', JSON.stringify(usuarioAtualizado));
      localStorage.setItem('usuarioCadastrado', JSON.stringify(usuarioAtualizado));

      const toggleConta = document.getElementById('toggle-conta');
      if (toggleConta) toggleConta.checked = false;
    });
  }

  // 1. Se houver usuário logado no localStorage, preenche com ele
  const usuarioLocal = JSON.parse(localStorage.getItem('usuarioLogado'));
  if (usuarioLocal && (usuarioLocal.nome || usuarioLocal.email)) {
    if (campoNome) campoNome.value = usuarioLocal.nome || '';
    if (campoEmail) campoEmail.value = usuarioLocal.email || '';
    if (campoTelefone) campoTelefone.value = usuarioLocal.telefone || '';
    if (campoCidade) campoCidade.value = usuarioLocal.cidade || '';
    return;
  }

  // 2. Fallback: usa o usuário padrão de js/usuarios.json
  try {
    const resposta = await fetch('js/usuarios.json');
    if (!resposta.ok) return;

    const dados = await resposta.json();
    const usuario = dados.usuarioAtivo;
    if (!usuario) return;

    if (campoNome) campoNome.value = usuario.nome || '';
    if (campoEmail) campoEmail.value = usuario.email || '';
    if (campoTelefone) campoTelefone.value = usuario.telefone || '';
    if (campoCidade) campoCidade.value = usuario.cidade || '';
  } catch (erro) {
    console.error('Erro ao carregar dados do usuário:', erro);
  }
}

carregarDadosUsuario();

// Funções globais para integração com o menu de Alertas
window.recarregarMapaFocos = carregarFocosNoMapa;
window.focarNoMapa = function (lat, lng) {
  if (typeof lat === 'number' && typeof lng === 'number') {
    mapa.flyTo([lat, lng], 15);
  }
};

// Executa o carregamento inicial ao abrir a página
carregarFocosNoMapa();
carregarDadosUsuario();