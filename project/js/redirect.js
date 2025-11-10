(function () {
  try {
    if (!window.location.hash || window.location.hash === "") {
      // Usar replace para que o menu seja a primeira página (o botão voltar não regressa ao index)
      window.location.replace('menu.html');
    }
  } catch (e) {
    // Se ocorrer algum erro, registar no console mas não bloquear a página
    console.error('Falha ao verificar redirecionamento', e);
  }
})();
