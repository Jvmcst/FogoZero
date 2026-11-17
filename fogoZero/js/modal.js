/* =========================================================
   CONTROLE CENTRAL DE MODAIS (Confirmação, Alertas e Detalhes)
   ========================================================= */

// Função migrada de reportar.js para controlar a modal de confirmação
function alteraModal(classe) {
    const modalConfirmacao = document.getElementById('modal');
    if (!modalConfirmacao) return;

    modalConfirmacao.setAttribute('class', classe);
    atualizarBloqueioFundo();

    if (classe === 'off') {
        const descricao = document.getElementById('descricao');
        if (descricao) descricao.value = '';

        const intensidade = document.querySelector('.controle-intensidade');
        if (intensidade) {
            intensidade.value = 1;
            intensidade.dispatchEvent(new Event('input'));
        }

        if (typeof limparImagens === 'function') {
            limparImagens();
        }

        const form = document.querySelector('main form');
        if (form) form.reset();
    }
}

// Impede rolagem/interação no fundo enquanto qualquer modal estiver aberta
function atualizarBloqueioFundo() {
    const algumaAberta = document.querySelector('#modal.on, #modal-alertas.on, #modal-detalhe-alerta.on');
    document.body.style.overflow = algumaAberta ? 'hidden' : '';
}

function abrirModalAlertas() {
    const modalAlertas = document.getElementById('modal-alertas');
    if (!modalAlertas) return;

    modalAlertas.setAttribute('class', 'on');
    atualizarBloqueioFundo();
    renderizarListaAlertas();
}

function fecharModalAlertas() {
    const modalAlertas = document.getElementById('modal-alertas');
    if (!modalAlertas) return;

    modalAlertas.setAttribute('class', 'off');
    atualizarBloqueioFundo();
}

function fecharModalDetalhe() {
    const modalDetalhe = document.getElementById('modal-detalhe-alerta');
    if (!modalDetalhe) return;

    modalDetalhe.setAttribute('class', 'off');
    atualizarBloqueioFundo();
}

// Obtém a lista combinada de js/registrosQueimadas.json e localStorage
async function obterAlertasAtivos() {
    let dadosJson = [];
    try {
        const resposta = await fetch('js/registrosQueimadas.json');
        if (resposta.ok) {
            dadosJson = await resposta.json();
        }
    } catch (erro) {
        console.error('Erro ao carregar registrosQueimadas.json no menu de alertas:', erro);
    }

    const focosSalvos = JSON.parse(localStorage.getItem('focosPersonalizados')) || [];
    const idsRemovidos = JSON.parse(localStorage.getItem('focosRemovidos')) || [];

    return [...dadosJson, ...focosSalvos].filter(
        (item) => !idsRemovidos.includes(item.id)
    );
}

// Remove um alerta da listagem (e do mapa, se estiver na tela do mapa)
function removerAlerta(id) {
    const idsRemovidos = JSON.parse(localStorage.getItem('focosRemovidos')) || [];
    if (!idsRemovidos.includes(id)) {
        idsRemovidos.push(id);
        localStorage.setItem('focosRemovidos', JSON.stringify(idsRemovidos));
    }

    const focosSalvos = JSON.parse(localStorage.getItem('focosPersonalizados')) || [];
    const focosRestantes = focosSalvos.filter((item) => item.id !== id);
    localStorage.setItem('focosPersonalizados', JSON.stringify(focosRestantes));

    renderizarListaAlertas();

    if (typeof window.recarregarMapaFocos === 'function') {
        window.recarregarMapaFocos();
    }
}

// Renderiza a lista mostrando inicialmente apenas o endereço (local)
async function renderizarListaAlertas() {
    const container = document.getElementById('lista-alertas-container');
    if (!container) return;

    const alertas = await obterAlertasAtivos();
    container.innerHTML = '';

    if (alertas.length === 0) {
        const vazio = document.createElement('p');
        vazio.className = 'lista-vazia-msg';
        vazio.textContent = 'Lista vazia';
        container.appendChild(vazio);
        return;
    }

    alertas.forEach((alerta) => {
        const card = document.createElement('div');
        card.className = 'item-alerta-card';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');

        const enderecoSpan = document.createElement('span');
        enderecoSpan.className = 'item-alerta-endereco';
        enderecoSpan.textContent = alerta.local;

        const btnRemover = document.createElement('button');
        btnRemover.type = 'button';
        btnRemover.className = 'btn-remover-alerta';
        btnRemover.textContent = 'Remover';
        btnRemover.title = 'Remover alerta da lista';

        btnRemover.addEventListener('click', (evento) => {
            evento.stopPropagation();
            removerAlerta(alerta.id);
        });

        card.addEventListener('click', () => {
            abrirDetalhesAlerta(alerta);
        });

        card.addEventListener('keydown', (evento) => {
            if (evento.key === 'Enter' || evento.key === ' ') {
                evento.preventDefault();
                abrirDetalhesAlerta(alerta);
            }
        });

        card.appendChild(enderecoSpan);
        card.appendChild(btnRemover);
        container.appendChild(card);
    });
}

// Abre a modal sobreposta com todas as informações do registro clicado
function abrirDetalhesAlerta(alerta) {
    const modalDetalhe = document.getElementById('modal-detalhe-alerta');
    const corpoDetalhe = document.getElementById('detalhe-alerta-conteudo');
    const btnVerMapa = document.getElementById('btn-detalhe-ver-mapa');
    if (!modalDetalhe || !corpoDetalhe) return;

    const coresNivel = ['', '#d99b00', '#e67700', '#e8590c', '#c92a2a', '#862e9c'];
    const nivelNum = Math.min(5, Math.max(1, Number(alerta.nivel) || 1));
    const corBadge = coresNivel[nivelNum];

    corpoDetalhe.innerHTML = '';

    const adicionarCampo = (rotulo, valor, isBadge = false) => {
        const linha = document.createElement('div');
        linha.className = 'detalhe-linha';

        const spanRotulo = document.createElement('span');
        spanRotulo.className = 'detalhe-rotulo';
        spanRotulo.textContent = rotulo;

        const spanValor = document.createElement('span');
        if (isBadge) {
            spanValor.className = 'badge-intensidade';
            spanValor.style.backgroundColor = corBadge;
        } else {
            spanValor.className = 'detalhe-valor';
        }
        spanValor.textContent = valor;

        linha.appendChild(spanRotulo);
        linha.appendChild(spanValor);
        corpoDetalhe.appendChild(linha);
    };

    adicionarCampo('Endereço', alerta.local || 'Não informado');
    adicionarCampo('Nível de Intensidade', alerta.intensidade || `Nível ${nivelNum}`, true);
    adicionarCampo('Status', alerta.status || 'Em análise');
    adicionarCampo('Data e Hora', alerta.data || 'Não informada');
    adicionarCampo('Descrição', alerta.descricao || 'Sem descrição adicional.');

    // Campo de imagem
    const linhaImg = document.createElement('div');
    linhaImg.className = 'detalhe-linha';
    const rotuloImg = document.createElement('span');
    rotuloImg.className = 'detalhe-rotulo';
    rotuloImg.textContent = 'Registro Visual';
    linhaImg.appendChild(rotuloImg);

    if (alerta.imagem && alerta.imagem.trim() !== '') {
        const img = document.createElement('img');
        img.src = alerta.imagem;
        img.alt = `Imagem do foco em ${alerta.local}`;
        img.className = 'detalhe-alerta-img';
        linhaImg.appendChild(img);
    } else {
        const semImg = document.createElement('span');
        semImg.className = 'detalhe-valor';
        semImg.textContent = 'Nenhuma imagem anexada.';
        linhaImg.appendChild(semImg);
    }
    corpoDetalhe.appendChild(linhaImg);

    // Exibe botão "Ver no mapa" se estiver na tela mapa.html e houver coordenadas
    if (btnVerMapa) {
        if (typeof window.focarNoMapa === 'function' && typeof alerta.lat === 'number' && typeof alerta.lng === 'number') {
            btnVerMapa.style.display = 'flex';
            btnVerMapa.onclick = () => {
                fecharModalDetalhe();
                fecharModalAlertas();
                window.focarNoMapa(alerta.lat, alerta.lng);
            };
        } else {
            btnVerMapa.style.display = 'none';
        }
    }

    modalDetalhe.setAttribute('class', 'on');
    atualizarBloqueioFundo();
}

// Conecta o link "Alertas" do cabeçalho em qualquer página
document.addEventListener('DOMContentLoaded', () => {
    const linksAlertas = document.querySelectorAll('.nav-alertas');
    linksAlertas.forEach((link) => {
        link.addEventListener('click', (evento) => {
            evento.preventDefault();
            abrirModalAlertas();
        });
    });
});