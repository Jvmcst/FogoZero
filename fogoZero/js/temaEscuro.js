const btnTema = document.getElementById('btn-tema');
const body = document.body;

function atualizarBotaoTema(escuro) {
    if (!btnTema) return;
    btnTema.textContent = escuro ? '☀ Claro' : '☾ Escuro';
}

const temaSalvo = localStorage.getItem('tema');

if (temaSalvo === 'escuro') {
    body.classList.add('modo-escuro');
    atualizarBotaoTema(true);
} else {
    atualizarBotaoTema(false);
}

if (btnTema) {
    btnTema.addEventListener('click', () => {
        const cortema = body.classList.toggle('modo-escuro');
        localStorage.setItem('tema', cortema ? 'escuro' : 'claro');
        atualizarBotaoTema(cortema);
    });
}