// dispositivos na aplicação
const devices = [
  {
    id: "light_liv",
    label: "Luz Sala",
    type: "light",
    power: 60,
    x: 140,
    y: 120,
    w: 48,
    h: 48,
    on: false,
  },
  {
    id: "light_bed",
    label: "Luz Quarto",
    type: "light",
    power: 60,
    x: 640,
    y: 120,
    w: 48,
    h: 48,
    on: false,
  },
  {
    id: "light_kitchen",
    label: "Luz Cozinha",
    type: "light",
    power: 60,
    x: 320,
    y: 360,
    w: 48,
    h: 48,
    on: false,
  },
  {
    id: "fridge",
    label: "Frigorífico",
    type: "fridge",
    power: 120,
    x: 140,
    y: 360,
    w: 60,
    h: 70,
    on: false,
  },
  {
    id: "tv",
    label: "TV",
    type: "tv",
    power: 100,
    x: 420,
    y: 360,
    w: 80,
    h: 56,
    on: false,
  },
  {
    id: "heater",
    label: "Aquecedor",
    type: "heater",
    power: 1500,
    x: 640,
    y: 360,
    w: 64,
    h: 36,
    on: false,
  },
];

// carregar imagens das lâmpadas
const lampOnImg = new Image();
const lampOffImg = new Image();
let lampOnLoaded = false;
let lampOffLoaded = false;
lampOnImg.onload = () => (lampOnLoaded = true);
lampOffImg.onload = () => (lampOffLoaded = true);
lampOnImg.src = "img/lamp_on.png";
lampOffImg.src = "img/lamp_off.png";

// carregar imagens da tv
const tvOnImg = new Image();
const tvOffImg = new Image();
let tvOnLoaded = false;
let tvOffLoaded = false;
tvOnImg.onload = () => (tvOnLoaded = true);
tvOffImg.onload = () => (tvOffLoaded = true);
tvOnImg.src = "img/tv_on.png";
tvOffImg.src = "img/tv_off.png";

// carregar imagens do frigorifico
const fridgeOnImg = new Image();
const fridgeOffImg = new Image();
let fridgeOnLoaded = false;
let fridgeOffLoaded = false;
fridgeOnImg.onload = () => (fridgeOnLoaded = true);
fridgeOffImg.onload = () => (fridgeOffLoaded = true);
fridgeOnImg.src = "img/fridge_on.png";
fridgeOffImg.src = "img/fridge_off.png";

// carregar imagens do aquecedor
const heaterOnImg = new Image();
const heaterOffImg = new Image();
let heaterOnLoaded = false;
let heaterOffLoaded = false;
heaterOnImg.onload = () => (heaterOnLoaded = true);
heaterOffImg.onload = () => (heaterOffLoaded = true);
heaterOnImg.src = "img/heater_on.png";
heaterOffImg.src = "img/heater_off.png";
