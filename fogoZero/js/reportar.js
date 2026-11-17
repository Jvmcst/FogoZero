/* =========================================================
   1. MAPA INTERATIVO DO VALE DO AÇO NA TELA DE REPORTAR
   ========================================================= */
const limitesValeDoAcoReportar = L.latLngBounds(
    [-19.68, -42.78], // Sudoeste
    [-19.35, -42.40]  // Nordeste
);

const mapaReportar = L.map('mapa-reportar', {
    center: [-19.51, -42.61],
    zoom: 12,
    minZoom: 11,
    maxZoom: 18,
    maxBounds: limitesValeDoAcoReportar,
    maxBoundsViscosity: 1.0
});

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
}).addTo(mapaReportar);

// Garante que o Leaflet recalcule o tamanho em diferentes resoluções
setTimeout(() => mapaReportar.invalidateSize(), 150);
window.addEventListener('resize', () => mapaReportar.invalidateSize());

let marcadorFoco = null;
let coordenadaSelecionada = null;
const inputLocalFoco = document.getElementById('local-foco');

async function definirPontoNoMapa(lat, lng) {
    coordenadaSelecionada = {
        lat: Number(lat.toFixed(5)),
        lng: Number(lng.toFixed(5))
    };

    if (marcadorFoco) {
        marcadorFoco.setLatLng([lat, lng]);
    } else {
        marcadorFoco = L.marker([lat, lng], { draggable: true }).addTo(mapaReportar);
        marcadorFoco.on('dragend', (evento) => {
            const pos = evento.target.getLatLng();
            definirPontoNoMapa(pos.lat, pos.lng);
        });
    }

    const textoFallback = `Foco no Vale do Aço (${coordenadaSelecionada.lat}, ${coordenadaSelecionada.lng})`;
    if (inputLocalFoco) {
        inputLocalFoco.value = textoFallback;
    }

    // Tenta obter o nome do bairro/cidade pelo OpenStreetMap (com fallback automático)
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
        const resposta = await fetch(url);
        if (resposta.ok) {
            const dados = await resposta.json();
            const end = dados.address || {};
            const bairro = end.suburb || end.neighbourhood || end.road || '';
            const cidade = end.city || end.town || end.municipality || 'Vale do Aço';

            if (inputLocalFoco && (bairro || cidade)) {
                inputLocalFoco.value = bairro ? `${bairro} - ${cidade}` : cidade;
            }
        }
    } catch (_) {
        // Mantém o textoFallback caso esteja sem internet
    }
}

mapaReportar.on('click', (evento) => {
    definirPontoNoMapa(evento.latlng.lat, evento.latlng.lng);
});

// Botão de geolocalização atual
const btnGeoloc = document.getElementById('btnGeoloc');
if (btnGeoloc) {
    btnGeoloc.addEventListener('click', () => {
        if (!navigator.geolocation) {
            alert('Seu navegador não suporta geolocalização.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (posicao) => {
                const { latitude, longitude } = posicao.coords;
                const ponto = L.latLng(latitude, longitude);

                if (!limitesValeDoAcoReportar.contains(ponto)) {
                    alert('Sua localização atual está fora da área monitorada do Vale do Aço. Clique diretamente no mapa para marcar o foco.');
                    return;
                }

                mapaReportar.flyTo([latitude, longitude], 15);
                definirPontoNoMapa(latitude, longitude);
            },
            () => {
                alert('Não foi possível obter sua localização. Verifique a permissão de GPS ou clique diretamente no mapa.');
            }
        );
    });
}

/* =========================================================
   2. SLIDER DE INTENSIDADE EM TEMPO REAL
   ========================================================= */
const sliderIntensidade = document.getElementById('controleIntensidade');
const nivelAtualTexto = document.getElementById('nivelAtualTexto');
const spansEscala = document.querySelectorAll('#escalaIntensidade span');

const rotulosIntensidade = {
    1: 'Nível 1 (Baixo)',
    2: 'Nível 2 (Moderado)',
    3: 'Nível 3 (Médio)',
    4: 'Nível 4 (Alto)',
    5: 'Nível 5 (Crítico)'
};

const coresTextoNivel = {
    1: '#2e9e4c',
    2: '#c9a200',
    3: '#e0812e',
    4: '#d13b3b',
    5: '#9a1f1f'
};

function atualizarInterfaceIntensidade(valor) {
    const nivel = Math.min(5, Math.max(1, Number(valor) || 4));
    if (nivelAtualTexto) {
        nivelAtualTexto.textContent = rotulosIntensidade[nivel];
        nivelAtualTexto.style.color = coresTextoNivel[nivel];
    }

    spansEscala.forEach((span, index) => {
        if (index === nivel - 1) {
            span.classList.add('ativo');
        } else {
            span.classList.remove('ativo');
        }
    });
}

if (sliderIntensidade) {
    sliderIntensidade.addEventListener('input', (evento) => {
        atualizarInterfaceIntensidade(evento.target.value);
    });
    atualizarInterfaceIntensidade(sliderIntensidade.value);
}

/* =========================================================
   3. UPLOAD E PREVIEW DE IMAGENS
   ========================================================= */
const zonaArraste = document.getElementById('zonaArraste');
const inputArquivos = document.getElementById('inputArquivos');
const gradePreviews = document.getElementById('gradePreviews');
const btnCancelar = document.querySelector('.btn-cancelar');

const TAMANHO_MAXIMO = 10 * 1024 * 1024; // 10MB
const LIMITE_IMAGENS = 2;

let urlsAtivas = [];
let imagemPrincipalBase64 = '';

if (zonaArraste && inputArquivos) {
    zonaArraste.addEventListener('click', () => {
        inputArquivos.click();
    });

    inputArquivos.addEventListener('change', (evento) => {
        processarArquivos(evento.target.files);
        inputArquivos.value = '';
    });

    zonaArraste.addEventListener('dragover', (evento) => {
        evento.preventDefault();
        zonaArraste.classList.add('arrastando');
    });

    zonaArraste.addEventListener('dragleave', () => {
        zonaArraste.classList.remove('arrastando');
    });

    zonaArraste.addEventListener('drop', (evento) => {
        evento.preventDefault();
        zonaArraste.classList.remove('arrastando');
        processarArquivos(evento.dataTransfer.files);
    });
}

function processarArquivos(arquivos) {
    const listaArquivos = Array.from(arquivos);

    for (const arquivo of listaArquivos) {
        if (gradePreviews.children.length >= LIMITE_IMAGENS) {
            alert(`Você pode adicionar no máximo ${LIMITE_IMAGENS} imagens por reporte.`);
            break;
        }

        if (arquivo.type !== 'image/jpeg' && arquivo.type !== 'image/png') {
            alert(`O arquivo "${arquivo.name}" não é válido. Envie apenas JPG ou PNG.`);
            continue;
        }

        if (arquivo.size > TAMANHO_MAXIMO) {
            alert(`A imagem "${arquivo.name}" ultrapassa o limite de 10MB.`);
            continue;
        }

        // Converte a primeira imagem para Base64 para salvar no localStorage
        if (!imagemPrincipalBase64) {
            const leitor = new FileReader();
            leitor.onload = (e) => {
                imagemPrincipalBase64 = e.target.result;
            };
            leitor.readAsDataURL(arquivo);
        }

        const urlTemporaria = URL.createObjectURL(arquivo);
        urlsAtivas.push(urlTemporaria);

        const item = document.createElement('div');
        item.className = 'item-preview';

        const img = document.createElement('img');
        img.src = urlTemporaria;
        img.alt = arquivo.name;

        const btnRemover = document.createElement('button');
        btnRemover.type = 'button';
        btnRemover.className = 'btn-remover-img';
        btnRemover.innerHTML = '&times;';
        btnRemover.title = 'Remover imagem';

        btnRemover.addEventListener('click', () => {
            URL.revokeObjectURL(urlTemporaria);
            urlsAtivas = urlsAtivas.filter((url) => url !== urlTemporaria);
            item.remove();
            if (gradePreviews.children.length === 0) {
                imagemPrincipalBase64 = '';
            }
            atualizarEstadoZona();
        });

        item.appendChild(img);
        item.appendChild(btnRemover);
        gradePreviews.appendChild(item);
        atualizarEstadoZona();
    }
}

function atualizarEstadoZona() {
    if (!zonaArraste) return;
    if (gradePreviews.children.length >= LIMITE_IMAGENS) {
        zonaArraste.style.opacity = '0.5';
        zonaArraste.style.pointerEvents = 'none';
    } else {
        zonaArraste.style.opacity = '1';
        zonaArraste.style.pointerEvents = 'auto';
    }
}

function limparImagens() {
    urlsAtivas.forEach((url) => URL.revokeObjectURL(url));
    urlsAtivas = [];
    imagemPrincipalBase64 = '';
    if (gradePreviews) gradePreviews.innerHTML = '';
    if (inputArquivos) inputArquivos.value = '';
    atualizarEstadoZona();
}

if (btnCancelar) {
    btnCancelar.addEventListener('click', () => {
        limparImagens();
    });
}

/* =========================================================
   4. SUBMISSÃO E SALVAMENTO DO NOVO ALERTA NO LOCALSTORAGE
   ========================================================= */
function formatarDataAtual() {
    const agora = new Date();
    const dia = String(agora.getDate()).padStart(2, '0');
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const ano = agora.getFullYear();
    const hora = String(agora.getHours()).padStart(2, '0');
    const min = String(agora.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} - ${hora}:${min}`;
}

const btnSubmeter = document.getElementById('btnSubmeter');
if (btnSubmeter) {
    btnSubmeter.addEventListener('click', () => {
        if (!coordenadaSelecionada) {
            alert('Por favor, clique no mapa para marcar a localização do foco de incêndio.');
            return;
        }

        const campoDescricao = document.getElementById('descricao');
        const textoDescricao = campoDescricao ? campoDescricao.value.trim() : '';
        if (!textoDescricao) {
            alert('Por favor, preencha uma breve descrição da ocorrência.');
            if (campoDescricao) campoDescricao.focus();
            return;
        }

        const nivel = sliderIntensidade ? Number(sliderIntensidade.value) : 4;
        const localTexto = (inputLocalFoco && inputLocalFoco.value.trim())
            ? inputLocalFoco.value.trim()
            : `Foco no Vale do Aço (${coordenadaSelecionada.lat}, ${coordenadaSelecionada.lng})`;

        const novoFoco = {
            id: Date.now(),
            local: localTexto,
            lat: coordenadaSelecionada.lat,
            lng: coordenadaSelecionada.lng,
            nivel: nivel,
            intensidade: rotulosIntensidade[nivel] || `Nível ${nivel}`,
            descricao: textoDescricao,
            data: formatarDataAtual(),
            status: 'Em análise',
            imagem: imagemPrincipalBase64
        };

        const focosSalvos = JSON.parse(localStorage.getItem('focosPersonalizados')) || [];
        focosSalvos.push(novoFoco);

        try {
            localStorage.setItem('focosPersonalizados', JSON.stringify(focosSalvos));
        } catch (erro) {
            // Caso a imagem seja muito pesada para o limite do localStorage, salva o registro sem a foto
            novoFoco.imagem = '';
            focosSalvos[focosSalvos.length - 1] = novoFoco;
            localStorage.setItem('focosPersonalizados', JSON.stringify(focosSalvos));
        }

        // Reseta o marcador para permitir um próximo reporte limpo
        if (marcadorFoco) {
            mapaReportar.removeLayer(marcadorFoco);
            marcadorFoco = null;
        }
        coordenadaSelecionada = null;
        if (inputLocalFoco) inputLocalFoco.value = '';

        if (typeof alteraModal === 'function') {
            alteraModal('on');
        }
    });
}

/* =========================================================
   5. CARREGAR PERFIL DO USUÁRIO (js/usuarios.json)
   ========================================================= */
async function carregarUsuarioReportar() {
    try {
        const resposta = await fetch('js/usuarios.json');
        if (!resposta.ok) return;

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
        console.error('Erro ao carregar dados do usuário em reportar:', erro);
    }
}

carregarUsuarioReportar();