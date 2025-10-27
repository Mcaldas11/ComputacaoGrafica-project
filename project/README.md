# Consumo de Energia — Demo

Este projecto é uma pequena demo interactiva para promover o uso consciente de energia em casa. O utilizador pode ligar/desligar dispositivos numa representação simples de uma casa, ver o consumo em tempo real e experimentar integrações básicas de ML (ml5.js) como reconhecimento de gestos (Handpose) e classificação de imagem (MobileNet).

## Funcionalidades

- Canvas interactivo com uma casa estilizada e vários dispositivos (luzes, frigorífico, TV, aquecedor).
- Cliques no Canvas para ligar/desligar cada dispositivo.
- Medidor de consumo em tempo real (W) e acumulado (Wh).
- Efeitos visuais simples (“energia a fluir”) quando um dispositivo está ligado.
- Animação CSS na introdução: "Poupa energia, poupa o planeta".
- Integração ml5.js:
  - Handpose: levantar a mão (gesto simples) -> desliga as luzes (cooldown de ~2s).
  - ImageClassifier (MobileNet): classifica uma imagem da webcam e sugere consumo médio do aparelho identificado.

## Ficheiros principais

- `index.html` — interface, canvas e vídeo para a webcam.
- `style.css` — estilo e animação.
- `app.js` — lógica do canvas, medidor de energia, interacção e integração com ml5.js.

## Como usar (rápido)

1. Abrir o ficheiro `project/index.html` num browser moderno (Chrome, Edge, Firefox).
2. Permitir o acesso à webcam quando solicitado (necessário para Handpose / Classifier).
3. Interagir:
   - Clicar nos rectângulos do Canvas para ligar/desligar dispositivos.
   - Pressionar "Ativar Handpose" para carregar o modelo Handpose. Levantar a mão na frente da câmara deve desligar as luzes (se detectado).
   - Pressionar "Ativar Classificador" para carregar o MobileNet. Depois pressione "Classificar (snapshot)" para classificar o frame actual e receber uma sugestão de consumo.

Observação: por segurança/privacidade, a webcam é usada apenas localmente no browser — não há upload de imagens para servidores.

## Controles adicionais (novo)

- Movimentação do boneco: use as setas do teclado (ArrowUp, ArrowDown, ArrowLeft, ArrowRight) para mover o boneco pelos espaços da casa representados no canvas.
- Alternar luzes com a tecla `E`: pressione `E` quando o boneco estiver perto de uma luz para alternar o seu estado (liga/desliga). A distância de activação é de cerca de ~80px do centro do boneco.

- Alternar dispositivos com a tecla `E`: pressione `E` quando o boneco estiver perto de um dispositivo (luz, frigorífico, TV, aquecedor, etc.) para alternar o seu estado (liga/desliga). A distância de activação é de cerca de ~80px do centro do boneco.

Nota: os espaços válidos para mover o boneco correspondem às áreas desenhadas (Sala, Quarto e Cozinha/Despensa). Se o boneco estiver fora do alcance da luz, a tecla `E` não terá efeito.

## Melhorias implementadas

- Indicador visual: quando o boneco está perto de uma luz (cerca de 80px) aparece um halo na própria luz e um anel ao redor do boneco — isto dá feedback visual de que a tecla `E` (ou um clique) irá atuar nessa luz.
- Colisão com dispositivos: o boneco agora evita sobrepor os dispositivos desenhados (frigorífico, TV, etc.). Se tentar mover para cima de um dispositivo, o movimento é bloqueado ou desliza ao longo do eixo disponível.
- Aparência/Animação: o boneco tem agora um efeito de passo simples (bob) quando está em movimento e uma sombra para parecer mais integrado ao cenário.

Nota: a luz da cozinha (`Luz Cozinha`) foi adicionada como dispositivo para que possa ser ligada/desligada com a tecla `E` quando o boneco estiver perto.
