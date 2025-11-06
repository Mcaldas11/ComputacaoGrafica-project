<!-- Language: [Português](#portugues) | [English](#english) -->

<a id="portugues"></a>

# EcoPower — Desafio de Energia Digital (PT)

Bem‑vindo ao EcoPower! É um mini‑jogo educativo sobre consumo energético: controlas um personagem numa casa, ligas/desligas aparelhos e tentas manter o consumo sob controlo. Existe um modo “Desafio” de 2 minutos e, quando ganhas, a interface celebra com confetis.

## Como Jogar
1. Faz download do projeto ou clona o repositório.
2. Abre o ficheiro `project/index.html` no teu navegador (Chrome, Firefox ou Edge).
3. No menu inicial escolhe um modo:
   - Desafio — 2 minutos: manter o consumo abaixo do limite até o tempo acabar.
   - Mundo livre: experimentar à vontade.
4. Controlos:
   - Mover: setas ou WASD.
   - Interagir: clicar nos aparelhos ou carregar em `E` quando estiver perto.
5. No Desafio:
   - Alguns aparelhos ligam aleatoriamente para aumentar a pressão.
   - Se o consumo ultrapassar o limite, perdes; se o tempo esgotar e estiveres abaixo do limite, ganhas (com confetis).

## Objetivo
Gerir o consumo total de energia de forma eficiente. No modo Desafio, o objetivo é manter o consumo abaixo de um limite (ex.: 1500 W) durante 2 minutos, enquanto dispositivos se ligam aleatoriamente.

## Funcionalidades
- Casa desenhada em Canvas com vários dispositivos ligáveis.
- Personagem com animações simples e colisões.
- Medidor em tempo real (W) e energia acumulada (Wh), com aviso de consumo elevado.
- Modo Desafio com temporizador, limite de potência, resultado em modal e botão “Reiniciar”.
- Integração opcional com ml5.js:
  - Handpose: gesto (levantar mão) para desligar dispositivos.
  - Classifier: estimativa de 4 objetos (telemóvel, fones, rato, TV) com consumo aproximado.
- Confetis ao ganhar (canvas‑confetti via CDN) — seguro: só corre se a função existir.

## Tecnologias Utilizadas
- HTML, CSS e JavaScript (Canvas API)
- ml5.js (Handpose e MobileNet)
- canvas‑confetti (browser build via CDN)

## Créditos
- Projeto desenvolvido por Miguel Caldas e Mariana Ferreira.


# EcoPower — Digital Energy Challenge (EN)

Welcome to EcoPower! It’s a small educational game about energy consumption: you control a character in a house, toggle appliances on/off, and try to keep the total usage under control. There’s a 2‑minute Challenge mode and, when you win, the UI celebrates with confetti.

## How to Play
1. Download or clone the repository.
2. Open `project/index.html` in your browser (Chrome, Firefox, or Edge).
3. In the main menu choose a mode:
   - Challenge — 2 minutes: keep the total power below the limit until time runs out.
   - Sandbox: experiment freely.
4. Controls:
   - Move: arrow keys or WASD.
   - Interact: click on appliances or press `E` when near one.
5. In Challenge mode:
   - Some appliances power on randomly to increase pressure.
   - If you exceed the limit you lose; if time ends below the limit you win (with confetti).

## Objective
Manage total energy consumption efficiently. In Challenge mode, keep usage under a limit (e.g., 1500 W) for 2 minutes while devices toggle randomly.

## Features
- Canvas‑based house with multiple interactive appliances.
- Character with simple animations and collisions.
- Live power meter (W) and accumulated energy (Wh), with high‑usage warning.
- Challenge mode with timer, power threshold, result modal, and “Restart” button.
- Optional ml5.js integration:
  - Handpose: gesture (raise hand) to switch devices off.
  - Classifier: classifies 4 objects (phone, headphones, mouse, TV) with rough consumption.
- Confetti on win (canvas‑confetti via CDN) — guarded, runs only if available.

## Technologies Used
- HTML, CSS, and JavaScript (Canvas API)
- ml5.js (Handpose and MobileNet)
- canvas‑confetti (browser build via CDN)

## Credits
- Project by Miguel Caldas and Mariana Ferreira.

— [Voltar a Português](#portugues)
