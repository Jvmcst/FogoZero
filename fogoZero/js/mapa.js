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

// Paleta de cores por nível de intensidade (1 a 5)
const cores = ['', '#fcc419', '#ff922b', '#f76707', '#e03131', '#a61e4d'];

// Camada dedicada para os círculos de incêndio (facilita atualizar quando houver adição/remoção)
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

      const marcador = L.circleMarker([f.lat, f.lng], {
        radius: 6 + nivel * 3,
        color: cor,
        fillColor: cor,
        fillOpacity: 0.65,
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

// Lê os dados de js/usuarios.json e preenche o formulário lateral "Minha conta"
async function carregarDadosUsuario() {
  try {
    const resposta = await fetch('js/usuarios.json');
    if (!resposta.ok) {
      throw new Error(`Erro HTTP ${resposta.status} ao buscar usuarios.json`);
    }

    const dados = await resposta.json();
    const usuario = dados.usuarioAtivo;
    if (!usuario) return;

    const campoNome = document.getElementById('conta-nome');
    const campoEmail = document.getElementById('conta-email');
    const campoTelefone = document.getElementById('conta-telefone');
    const campoCidade = document.getElementById('conta-cidade');

    if (campoNome) campoNome.value = usuario.nome || '';
    if (campoEmail) campoEmail.value = usuario.email || '';
    if (campoTelefone) campoTelefone.value = usuario.telefone || '';
    if (campoCidade) campoCidade.value = usuario.cidade || '';
  } catch (erro) {
    console.error('Erro ao carregar dados do usuário:', erro);
  }
}

// Funções globais para integração com o menu de Alertas (Bloco 3)
window.recarregarMapaFocos = carregarFocosNoMapa;
window.focarNoMapa = function (lat, lng) {
  if (typeof lat === 'number' && typeof lng === 'number') {
    mapa.flyTo([lat, lng], 15);
  }
};

// Executa o carregamento inicial ao abrir a página
carregarFocosNoMapa();
carregarDadosUsuario();