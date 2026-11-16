/*Parte do modal do botao submeter*/
function alteraModal(classe) {
    document.getElementById("modal").setAttribute("class", classe);

    // Limpa os dados do formulário
    if (classe === 'off') {
        // Limpa o campo de descrição
        const descricao = document.getElementById('descricao');
        if (descricao) descricao.value = '';

        // Reseta o slider de intensidade 
        const intensidade = document.querySelector('.controle-intensidade');
        if (intensidade) {
            intensidade.value = 1;
            intensidade.dispatchEvent(new Event('input')); // Atualiza o texto do nível, se houver
        }

        // Limpa as imagens selecionadas 
        if (typeof limparImagens === 'function') {
            limparImagens();
        }

        // Se houver uma tag <form>, reseta todos os outros inputs
        const form = document.querySelector('form');
        if (form) form.reset();
    }
}

/*Parte de receber imagens no reportar alerta*/ 
const zonaArraste = document.getElementById('zonaArraste');
const inputArquivos = document.getElementById('inputArquivos');
const gradePreviews = document.getElementById('gradePreviews');
const btnCancelar = document.querySelector('.btn-cancelar');

const TAMANHO_MAXIMO = 10 * 1024 * 1024; // 10MB
const LIMITE_IMAGENS = 2; 

// Guarda as URLs criadas na memória para limpar tudo depois sem vazar memória
let urlsAtivas = [];

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

function processarArquivos(arquivos) {
    const listaArquivos = Array.from(arquivos);

    for (const arquivo of listaArquivos) {
        // Verifica se já atingiu o limite máximo de imagens na tela
        if (gradePreviews.children.length >= LIMITE_IMAGENS) {
            alert(`Você pode adicionar no máximo ${LIMITE_IMAGENS} imagens por reporte.`);
            break;
        }

        // Valida formato JPG ou PNG
        if (arquivo.type !== 'image/jpeg' && arquivo.type !== 'image/png') {
            alert(`O arquivo "${arquivo.name}" não é válido. Envie apenas JPG ou PNG.`);
            continue;
        }

        // Valida limite de 10MB
        if (arquivo.size > TAMANHO_MAXIMO) {
            alert(`A imagem "${arquivo.name}" ultrapassa o limite de 10MB.`);
            continue;
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
            atualizarEstadoZona();
        });

        item.appendChild(img);
        item.appendChild(btnRemover);
        gradePreviews.appendChild(item);
        atualizarEstadoZona();
    }
}

// Esconde ou bloqueia visualmente a zona de arraste quando atingir o limite de fotos
function atualizarEstadoZona() {
    if (gradePreviews.children.length >= LIMITE_IMAGENS) {
        zonaArraste.style.opacity = '0.5';
        zonaArraste.style.pointerEvents = 'none';
    } else {
        zonaArraste.style.opacity = '1';
        zonaArraste.style.pointerEvents = 'auto';
    }
}

// Função reutilizável para limpar todas as imagens (útil no Cancelar ou após Enviar)
function limparImagens() {
    urlsAtivas.forEach((url) => URL.revokeObjectURL(url));
    urlsAtivas = [];
    gradePreviews.innerHTML = '';
    inputArquivos.value = '';
    atualizarEstadoZona();
}

// Limpa as fotos automaticamente ao clicar no botão Cancelar
if (btnCancelar) {
    btnCancelar.addEventListener('click', () => {
        limparImagens();
    });
}

