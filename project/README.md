# EcoPower 
## O que dá para fazer

- Ligar/desligar aparelhos clicando neles ou usando a tecla `E` quando o boneco está perto.
- Ver o consumo total (W) e o acumulado (Wh), com um aviso quando é demasiado alto.
- Mover o boneco com setas OU WASD, com colisões básicas para não atravessar tudo.
- Ativar um modo “Desafio” de 2 minutos onde temos de manter o consumo abaixo de um limite.
- Usar a câmara:
  - Handpose: levantar a mão (na parte de cima da imagem) desliga todos os dispositivos. A imagem está espelhada (modo selfie).
  - Classificador (MobileNet): tiro uma captura e ele tenta reconhecer um objeto. Eu limitei a 4 objetos e mostro uma estimativa de consumo: telemóvel (~8 W), fones (~2 W), rato (~1 W) e TV (~120 W). Se não for um destes, diz “não suportado”.

## Controlo rápido

- Mover: setas ou WASD
- Interagir: `E` (perto do aparelho)
- Desafio: abrir `menu.html` e escolher “Desafio — 2 minutos”
- Handpose: “Ativar Handpose” e levantar a mão → desliga tudo
- Classificador: “Ativar Classificador” → “Classificar (captura)”

## Notas sobre a câmara e privacidade

- Tudo é processado no próprio browser, não envio imagens para lado nenhum.
- Podes parar os modelos quando quiseres; ao esconder a aba, a câmara também é parada.


## O que aprendi/fiz

- Desenhar e atualizar um Canvas com animações leves (respirar/andar, halos, pulsos).
- Lidar com colisões simples e áreas válidas de movimento.
- Integrar ml5.js: Handpose (gestos) e MobileNet (classificação), incluindo espelhar a imagem no preview e no que é classificado.
- Trabalhar com estados (dispositivos, energia, desafio) e ligar tudo ao DOM.

## Coisas que eu ainda queria melhorar

- Tornar o Canvas mais responsivo a diferentes ecrãs/DPIs.
- Melhorar a UI/UX quando a câmara não está disponível (mensagens mais claras).
- Adicionar um mini‑gráfico do consumo ao longo do tempo.
- Dar mais feedback visual quando o gesto acontece.

## Novidade — Animação de confetis ao ganhar o Desafio

- Adicionei uma pequena animação de confetis que é disparada quando o jogador ganha o modo **Desafio**. A animação usa a biblioteca `canvas-confetti` e foi integrada de forma opcional — só corre se a biblioteca estiver carregada.

Como usar a animação de confetis

- Opção rápida (recomendada): incluir o build via CDN (sem instalação). No `index.html` já está incluído o seguinte script antes de `js/ui.js`:

  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>

- Opção com npm (local): se preferires instalar localmente (útil offline / sem depender do CDN), instala o pacote e copia o build para a pasta `project/js/vendor`:

  npm install canvas-confetti

  # em PowerShell (na raiz do repo)
  mkdir -Force .\project\js\vendor
  Copy-Item -Path .\node_modules\canvas-confetti\dist\confetti.browser.min.js -Destination .\project\js\vendor\ -Force

  Depois adiciona a tag script local no `index.html` antes de `js/ui.js`:

  <script src="js/vendor/confetti.browser.min.js"></script>

Observações

- A chamada à função `confetti()` é envolvida em `try/catch` e só é executada quando a função existe (ou seja, se carregares o script CDNlocal). Se não carregares a biblioteca
nada falha — só não há confetis.
