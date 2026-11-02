/* EXE DRAGON EGG HOARD · presenter v1.0.0-rc.1 · form&soul.exe */
/* EXE BLIND BOX · presenter "eggHoard" (Dragon Egg Hoard) · v0.8.0-dev
   ONE file used by the visual lab, the review pages and the dev engine (0.7.x-dev). Not used by the Christmas skin.
   draw(ctx, s) is a pure function of (s, config): no per-run state, only immutable caches (images, alpha measurements,
   pre-blurred light sprites) and scratch canvases that are cleared on every use. Calling it twice with the same input
   gives the same pixels; nothing accumulates between openings.
   Configuration = layered parameters (see SCHEMA). With an empty config the output is the "Base aprobada". */
(function () {
  'use strict';
  const VERSION = '1.0.0-rc.1', CONFIG_VERSION = 1;
  const W = 1000, H = 1100, CX = 500;
  const G = 800, EW = 310;
  const ES = EW / 536, SEAM_PIECE = 401, EH = 748 * ES, EGG_TOP = G - EH, SEAM_Y = G - (748 - SEAM_PIECE) * ES;
  const TOK = { jade: '#1f4a3f', jadeDeep: '#163a31', ivory: '#f4efe2', brass: '#a8874f', brassDeep: '#7c6232', ink: '#1d2a26', muted: '#56665f' };
  const RAR = { common: { label: 'COMMON', col: '#5e7894' }, rare: { label: 'RARE', col: '#2b78b8' }, epic: { label: 'EPIC', col: '#7a47cf' }, legendary: { label: 'LEGENDARY', col: '#a96f0c' }, mythic: { label: 'MYTHIC', col: '#cf3d7e' } };
  const RARITIES = ['common', 'rare', 'epic', 'legendary', 'mythic'];
  const PROFILES = ['compact', 'tall', 'wide', 'floating', 'based'];
  const X = { PEEK0: 0.12, PEEK1: 0.42, OUT0: 0.52, OUT1: 0.85, GROW1: 1.2, DESC0: 1.5 };

  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const eo = t => 1 - Math.pow(1 - clamp(t), 3);
  const ei = t => Math.pow(clamp(t), 2);
  const eio = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const esin = t => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t));
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const bell = (t, a, m, b) => t <= a || t >= b ? 0 : t < m ? eo((t - a) / (m - a)) : 1 - eio((t - m) / (b - m));
  const hexRgb = h => { h = String(h || '#ffffff').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255); };
  const EASE = { in: ei, inout: eio, out: eo, sine: esin };

  // =====================================================================================
  // SCHEMA · every parameter the lab exposes. def = value of the "Base aprobada" (global layer).
  // lvl: 'b' basic / 'a' advanced. fams: light families where the control has an effect ('*' = all).
  // =====================================================================================
  const F_ALL = '*', F_NEW = ['jewel', 'forest', 'ceremony'];
  const SCHEMA = [
    // ---- Apertura del huevo
    { k: 'open.style', sec: 'open', lvl: 'b', type: 'select', label: 'Estilo de apertura', def: 'base', opts: [['base', 'A · Actual refinada'], ['collect', 'B · Figura coleccionable'], ['magic', 'C · Eclosión mágica']] },
    { k: 'open.anticip', sec: 'open', lvl: 'b', type: 'range', label: 'Duración de anticipación (s)', min: 0.2, max: 2, step: 0.01, def: 0.45 },
    { k: 'open.pause', sec: 'open', lvl: 'b', type: 'range', label: 'Pausa quieta antes de abrir (s)', min: 0, max: 0.6, step: 0.01, def: 0 },
    { k: 'open.wobble', sec: 'open', lvl: 'b', type: 'range', label: 'Balanceo (grados)', min: 0, max: 8, step: 0.1, def: 2.0 },
    { k: 'open.wobbleSpeed', sec: 'open', lvl: 'a', type: 'range', label: 'Velocidad del balanceo', min: 0.4, max: 2, step: 0.05, def: 1 },
    { k: 'open.tremor', sec: 'open', lvl: 'a', type: 'range', label: 'Temblor fino (px)', min: 0, max: 4, step: 0.1, def: 0 },
    { k: 'open.knock', sec: 'open', lvl: 'a', type: 'range', label: 'Golpes del huevo (altura px)', min: 0, max: 14, step: 0.5, def: 0 },
    { k: 'seam.mode', sec: 'seam', lvl: 'b', type: 'select', label: 'Luz en la costura', def: 'rarity', opts: [['rarity', 'Según rareza (base)'], ['glow', 'Se enciende entera'], ['run', 'Recorre la costura'], ['off', 'Sin luz']] },
    { k: 'seam.int', sec: 'seam', lvl: 'b', type: 'range', label: 'Intensidad de la costura', min: 0, max: 2, step: 0.05, def: 1 },
    { k: 'seam.width', sec: 'seam', lvl: 'a', type: 'range', label: 'Grosor de la luz de costura', min: 0.4, max: 2.5, step: 0.05, def: 1 },
    { k: 'seam.runLen', sec: 'seam', lvl: 'a', type: 'range', label: 'Largo del recorrido (fracción)', min: 0.08, max: 0.6, step: 0.01, def: 0.24 },
    { k: 'lid.liftDur', sec: 'lid', lvl: 'b', type: 'range', label: 'Tapa: duración de la subida (s)', min: 0.15, max: 1.2, step: 0.01, def: 0.45 },
    { k: 'lid.height', sec: 'lid', lvl: 'b', type: 'range', label: 'Tapa: altura (px)', min: 40, max: 320, step: 1, def: 175 },
    { k: 'lid.side', sec: 'lid', lvl: 'a', type: 'range', label: 'Tapa: desplazamiento al subir (px)', min: -200, max: 60, step: 1, def: -70 },
    { k: 'lid.tilt', sec: 'lid', lvl: 'b', type: 'range', label: 'Tapa: giro al subir (rad)', min: -1, max: 0.3, step: 0.01, def: -0.35 },
    { k: 'lid.arc', sec: 'lid', lvl: 'a', type: 'range', label: 'Tapa: arco de la trayectoria (px)', min: 0, max: 200, step: 1, def: 60 },
    { k: 'lid.landT', sec: 'lid', lvl: 'a', type: 'range', label: 'Tapa: llega al suelo (s tras abrir)', min: 0.7, max: 2.6, step: 0.01, def: 1.55 },
    { k: 'lid.rest', sec: 'lid', lvl: 'a', type: 'range', label: 'Tapa: ángulo en reposo (rad)', min: -1.6, max: -0.6, step: 0.01, def: -1.36 },
    { k: 'lid.bob', sec: 'lid', lvl: 'a', type: 'range', label: 'Tapa: balanceo al caer (rad)', min: 0, max: 0.2, step: 0.005, def: 0.05 },
    { k: 'split.start', sec: 'lid', lvl: 'a', type: 'range', label: 'Mitad inferior: empieza a separarse (s)', min: 0.6, max: 2.2, step: 0.01, def: 0.95 },
    { k: 'split.end', sec: 'lid', lvl: 'a', type: 'range', label: 'Mitad inferior: termina (s)', min: 0.9, max: 2.8, step: 0.01, def: 1.55 },
    { k: 'split.gap', sec: 'lid', lvl: 'b', type: 'range', label: 'Separación de las mitades (px)', min: 0, max: 120, step: 1, def: 20 },
    { k: 'shell.hold', sec: 'shell', lvl: 'b', type: 'range', label: 'Cáscaras visibles tras aterrizar (s)', min: 0, max: 3, step: 0.05, def: 0.5 },
    { k: 'shell.exit', sec: 'shell', lvl: 'b', type: 'select', label: 'Retirada de las cáscaras', def: 'side', opts: [['side', 'Hacia los lados + fundido'], ['sink', 'Hundirse + fundido'], ['fade', 'Solo fundido'], ['keep', 'Se quedan en la contemplación']] },
    { k: 'shell.exitDur', sec: 'shell', lvl: 'b', type: 'range', label: 'Duración de la retirada (s)', min: 0.1, max: 1.5, step: 0.01, def: 0.45 },
    { k: 'shell.drift', sec: 'shell', lvl: 'a', type: 'range', label: 'Recorrido de la retirada (px)', min: 0, max: 120, step: 1, def: 26 },
    { k: 'shell.shadow', sec: 'shell', lvl: 'a', type: 'range', label: 'Sombra de las cáscaras', min: 0, max: 2, step: 0.05, def: 1 },
    // ---- Personaje
    { k: 'appear.style', sec: 'fig', lvl: 'b', type: 'select', label: 'Forma de aparecer', def: 'hop', opts: [['hop', 'Salida con pequeño salto (base)'], ['leap', 'Gran salto en arco'], ['magic', 'Elevación mágica y descenso suave'], ['solemn', 'Aparición solemne, aterrizaje firme']] },
    { k: 'fig.scale', sec: 'fig', lvl: 'b', type: 'range', label: 'Escala (uniforme)', min: 0.6, max: 1.4, step: 0.01, def: 1 },
    { k: 'fig.dx', sec: 'fig', lvl: 'a', type: 'range', label: 'Posición horizontal (px)', min: -120, max: 120, step: 1, def: 0 },
    { k: 'fig.dy', sec: 'fig', lvl: 'a', type: 'range', label: 'Posición vertical (px)', min: -80, max: 60, step: 1, def: 0 },
    { k: 'fig.exitHeight', sec: 'fig', lvl: 'b', type: 'range', label: 'Altura de salida sobre el borde (px)', min: 0, max: 220, step: 1, def: 22 },
    { k: 'fig.exitSpeed', sec: 'fig', lvl: 'a', type: 'range', label: 'Velocidad de salida', min: 0.5, max: 1.6, step: 0.01, def: 1 },
    { k: 'land.desc', sec: 'fig', lvl: 'b', type: 'range', label: 'Duración del descenso (s)', min: 0.15, max: 1.6, step: 0.01, def: 0.42 },
    { k: 'land.ease', sec: 'fig', lvl: 'a', type: 'select', label: 'Aceleración del descenso', def: 'in', opts: [['in', 'Cae acelerando'], ['inout', 'Suave al empezar y al llegar'], ['out', 'Frena al llegar'], ['sine', 'Senoidal']] },
    { k: 'land.overshoot', sec: 'fig', lvl: 'a', type: 'range', label: 'Sobrepaso del suelo (px)', min: 0, max: 14, step: 0.5, def: 0 },
    { k: 'bounce.amp', sec: 'fig', lvl: 'b', type: 'range', label: 'Rebote: amplitud (px)', min: 0, max: 30, step: 0.1, def: 10 },
    { k: 'bounce.freq', sec: 'fig', lvl: 'a', type: 'range', label: 'Rebote: rapidez', min: 4, max: 24, step: 0.1, def: 11 },
    { k: 'bounce.damp', sec: 'fig', lvl: 'a', type: 'range', label: 'Rebote: amortiguación', min: 2, max: 20, step: 0.1, def: 7 },
    { k: 'bounce.mode', sec: 'fig', lvl: 'a', type: 'select', label: 'Rebote: tipo', def: 'bounce', opts: [['bounce', 'Rebota sobre el suelo'], ['osc', 'Oscila arriba y abajo']] },
    { k: 'land.settle', sec: 'fig', lvl: 'a', type: 'range', label: 'Tiempo hasta quedar quieto (s)', min: 0.1, max: 1.4, step: 0.01, def: 0.36 },
    { k: 'fig.tilt', sec: 'fig', lvl: 'a', type: 'range', label: 'Inclinación sutil al bajar (grados)', min: -6, max: 6, step: 0.1, def: 0 },
    { k: 'fig.float', sec: 'fig', lvl: 'b', type: 'range', label: 'Flotación en contemplación (px)', min: 0, max: 10, step: 0.1, def: 0 },
    { k: 'fig.floatHz', sec: 'fig', lvl: 'a', type: 'range', label: 'Flotación: ritmo (ciclos/s)', min: 0.15, max: 1.2, step: 0.01, def: 0.5 },
    { k: 'timing.hold', sec: 'fig', lvl: 'b', type: 'range', label: 'Contemplación (s · 0 = la del widget)', min: 0, max: 10, step: 0.1, def: 0 },
    { k: 'timing.outro', sec: 'fig', lvl: 'a', type: 'range', label: 'Transición de salida (s)', min: 0.25, max: 1.5, step: 0.01, def: 0.5 },
    { k: 'cshadow.size', sec: 'fig', lvl: 'b', type: 'range', label: 'Sombra de contacto: tamaño', min: 0.3, max: 1.1, step: 0.01, def: 0.62 },
    { k: 'cshadow.op', sec: 'fig', lvl: 'b', type: 'range', label: 'Sombra de contacto: opacidad', min: 0, max: 0.8, step: 0.01, def: 0.34 },
    { k: 'cshadow.soft', sec: 'fig', lvl: 'a', type: 'range', label: 'Sombra de contacto: suavidad', min: 0.2, max: 0.95, step: 0.01, def: 0.6 },
    { k: 'cshadow.heightK', sec: 'fig', lvl: 'a', type: 'range', label: 'Sombra: cuánto cambia con la altura', min: 0, max: 2.5, step: 0.05, def: 1 },
    // ---- Luz y rareza
    { k: 'light.family', sec: 'light', lvl: 'b', type: 'select', label: 'Familia de iluminación', def: 'base', opts: [['base', 'Base aprobada'], ['jewel', 'A · Joyería'], ['forest', 'B · Magia de bosque'], ['ceremony', 'C · Revelación ceremonial']] },
    { k: 'light.int', sec: 'light', lvl: 'b', type: 'range', label: 'Intensidad general de la luz', min: 0, max: 2, step: 0.05, def: 1, fams: F_ALL },
    { k: 'light.col', sec: 'light', lvl: 'b', type: 'color', label: 'Color de la luz', def: '#ffe2b6', fams: F_ALL },
    { k: 'light.halo', sec: 'light', lvl: 'a', type: 'color', label: 'Color del halo de costura', def: '#ffa03c', fams: F_ALL },
    { k: 'fx.delay', sec: 'light', lvl: 'a', type: 'range', label: 'Momento de los efectos (retraso s)', min: -0.3, max: 0.8, step: 0.01, def: 0, fams: F_ALL },
    { k: 'light.settle', sec: 'light', lvl: 'a', type: 'range', label: 'Tiempo hasta que la luz queda en reposo (s)', min: 0.2, max: 3, step: 0.05, def: 0.8, fams: F_ALL },
    { k: 'interior.int', sec: 'light', lvl: 'b', type: 'range', label: 'Luz interior del huevo', min: 0, max: 2, step: 0.05, def: 0.45, fams: F_ALL },
    { k: 'rim.exit', sec: 'light', lvl: 'a', type: 'range', label: 'Contorno de luz al salir', min: 0, max: 0.8, step: 0.01, def: 0.16, fams: F_ALL },
    { k: 'rim.rest', sec: 'light', lvl: 'a', type: 'range', label: 'Contorno de luz en reposo', min: 0, max: 0.4, step: 0.01, def: 0.05, fams: F_ALL },
    { k: 'halo.int', sec: 'halo', lvl: 'b', type: 'range', label: 'Halo difuso: intensidad', min: 0, max: 1.5, step: 0.01, def: 0, fams: F_NEW },
    { k: 'halo.size', sec: 'halo', lvl: 'b', type: 'range', label: 'Halo difuso: tamaño', min: 0.3, max: 2.2, step: 0.01, def: 1, fams: F_NEW },
    { k: 'halo.falloff', sec: 'halo', lvl: 'a', type: 'range', label: 'Halo difuso: caída (borde)', min: 0.3, max: 3, step: 0.05, def: 1.2, fams: F_NEW },
    { k: 'halo.expand', sec: 'halo', lvl: 'a', type: 'range', label: 'Halo: expansión al abrir', min: 0, max: 2.5, step: 0.05, def: 0, fams: F_NEW },
    { k: 'halo.rest', sec: 'halo', lvl: 'a', type: 'range', label: 'Halo: nivel en reposo', min: 0, max: 0.6, step: 0.01, def: 0, fams: F_NEW },
    { k: 'halo.col', sec: 'halo', lvl: 'a', type: 'color', label: 'Halo: color', def: '#fff1d8', fams: F_NEW },
    { k: 'rays.n', sec: 'rays', lvl: 'b', type: 'range', label: 'Haces: cantidad', min: 0, max: 24, step: 1, def: 7, fams: F_ALL },
    { k: 'rays.len', sec: 'rays', lvl: 'b', type: 'range', label: 'Haces: longitud (px)', min: 80, max: 600, step: 5, def: 300, fams: F_ALL },
    { k: 'rays.w', sec: 'rays', lvl: 'b', type: 'range', label: 'Haces: anchura', min: 0.01, max: 0.25, step: 0.005, def: 0.07, fams: F_ALL },
    { k: 'rays.soft', sec: 'rays', lvl: 'a', type: 'range', label: 'Haces: suavidad (desenfoque px)', min: 0, max: 30, step: 1, def: 7, fams: F_ALL },
    { k: 'rays.spread', sec: 'rays', lvl: 'a', type: 'range', label: 'Haces: abanico total (grados)', min: 20, max: 360, step: 5, def: 110, fams: F_ALL },
    { k: 'rays.spin', sec: 'rays', lvl: 'a', type: 'range', label: 'Haces: movimiento (giro)', min: 0, max: 0.3, step: 0.005, def: 0.05, fams: F_ALL },
    { k: 'rays.dist', sec: 'rays', lvl: 'a', type: 'select', label: 'Haces: distribución', def: 'even', opts: [['even', 'Regular'], ['random', 'Irregular (semilla)']], fams: F_NEW },
    { k: 'rays.dur', sec: 'rays', lvl: 'a', type: 'range', label: 'Haces: duración (s)', min: 0.3, max: 3, step: 0.05, def: 1.05, fams: F_ALL },
    { k: 'glint.n', sec: 'glint', lvl: 'b', type: 'range', label: 'Destellos: cantidad', min: 0, max: 14, step: 1, def: 3, fams: F_ALL },
    { k: 'glint.size', sec: 'glint', lvl: 'b', type: 'range', label: 'Destellos: tamaño (px)', min: 3, max: 26, step: 0.5, def: 11, fams: F_ALL },
    { k: 'glint.shape', sec: 'glint', lvl: 'a', type: 'select', label: 'Destellos: forma', def: 'star4', opts: [['star4', 'Estrella de 4 puntas'], ['cross', 'Cruz fina'], ['dot', 'Punto de luz']], fams: F_NEW },
    { k: 'glint.place', sec: 'glint', lvl: 'a', type: 'select', label: 'Destellos: ubicación', def: 'edge', opts: [['edge', 'Contorno superior (cuernos, alas)'], ['accents', 'Puntos marcados del personaje'], ['around', 'Alrededor, sin tocar la figura']], fams: F_NEW },
    { k: 'glint.dur', sec: 'glint', lvl: 'a', type: 'range', label: 'Destellos: duración de cada uno (s)', min: 0.1, max: 1.5, step: 0.01, def: 0.5, fams: F_ALL },
    { k: 'glint.rhythm', sec: 'glint', lvl: 'a', type: 'range', label: 'Destellos: intervalo entre ellos (s)', min: 0, max: 0.6, step: 0.01, def: 0.12, fams: F_NEW },
    { k: 'glint.t0', sec: 'glint', lvl: 'a', type: 'range', label: 'Destellos: momento (s tras abrir)', min: 0, max: 4, step: 0.05, def: 0.95, fams: F_ALL },
    { k: 'part.n', sec: 'part', lvl: 'b', type: 'range', label: 'Partículas: densidad', min: 0, max: 60, step: 1, def: 6, fams: F_ALL },
    { k: 'part.dir', sec: 'part', lvl: 'a', type: 'range', label: 'Partículas: dirección (grados, -90 = arriba)', min: -180, max: 0, step: 1, def: -90, fams: F_NEW },
    { k: 'part.speed', sec: 'part', lvl: 'b', type: 'range', label: 'Partículas: velocidad (px/s)', min: 10, max: 500, step: 5, def: 160, fams: F_ALL },
    { k: 'part.spread', sec: 'part', lvl: 'a', type: 'range', label: 'Partículas: dispersión (grados)', min: 0, max: 180, step: 1, def: 40, fams: F_NEW },
    { k: 'part.life', sec: 'part', lvl: 'a', type: 'range', label: 'Partículas: vida (s)', min: 0.2, max: 3, step: 0.05, def: 0.62, fams: F_ALL },
    { k: 'part.size', sec: 'part', lvl: 'a', type: 'range', label: 'Partículas: tamaño (px)', min: 1, max: 8, step: 0.1, def: 3.5, fams: F_ALL },
    { k: 'part.wander', sec: 'part', lvl: 'a', type: 'range', label: 'Partículas: deriva orgánica', min: 0, max: 40, step: 1, def: 0, fams: F_NEW },
    { k: 'trail.n', sec: 'trail', lvl: 'b', type: 'range', label: 'Estelas: cantidad', min: 0, max: 8, step: 1, def: 2, fams: F_NEW },
    { k: 'trail.len', sec: 'trail', lvl: 'b', type: 'range', label: 'Estelas: longitud', min: 0.05, max: 0.8, step: 0.01, def: 0.25, fams: F_ALL },
    { k: 'trail.reach', sec: 'trail', lvl: 'a', type: 'range', label: 'Estelas: recorrido (px)', min: 60, max: 420, step: 5, def: 225, fams: F_ALL },
    { k: 'trail.curve', sec: 'trail', lvl: 'a', type: 'range', label: 'Estelas: curvatura', min: -1, max: 1, step: 0.05, def: 0.2, fams: F_NEW },
    { k: 'trail.dur', sec: 'trail', lvl: 'a', type: 'range', label: 'Estelas: duración / desvanecimiento (s)', min: 0.2, max: 2, step: 0.01, def: 0.55, fams: F_ALL },
    { k: 'accent.int', sec: 'accent', lvl: 'b', type: 'range', label: 'Acento: intensidad', min: 0, max: 1.5, step: 0.01, def: 0.9, fams: F_ALL },
    { k: 'accent.ext', sec: 'accent', lvl: 'b', type: 'range', label: 'Acento: extensión', min: 0.3, max: 2.2, step: 0.01, def: 1, fams: F_ALL },
    { k: 'accent.dur', sec: 'accent', lvl: 'a', type: 'range', label: 'Acento: duración (s)', min: 0.15, max: 2, step: 0.01, def: 0.53, fams: F_ALL },
    { k: 'accent.t0', sec: 'accent', lvl: 'a', type: 'range', label: 'Acento: momento (s tras abrir)', min: 0, max: 4, step: 0.01, def: 0.62, fams: F_ALL },
    { k: 'accent.shape', sec: 'accent', lvl: 'a', type: 'select', label: 'Acento: forma', def: 'none', opts: [['none', 'Sin acento'], ['burst', 'Estallido de rayos abiertos'], ['flare', 'Destello en cruz'], ['bloom', 'Florecimiento suave']], fams: F_NEW },
    { k: 'accent.col', sec: 'accent', lvl: 'a', type: 'color', label: 'Acento: color', def: '#ffd680', fams: F_NEW },
    { k: 'iri.int', sec: 'shiny', lvl: 'b', type: 'range', label: 'Iridiscencia shiny: intensidad', min: 0, max: 1.2, step: 0.01, def: 0.6, fams: F_ALL },
    { k: 'iri.speed', sec: 'shiny', lvl: 'a', type: 'range', label: 'Iridiscencia: duración del barrido (s)', min: 0.3, max: 2, step: 0.01, def: 0.75, fams: F_ALL },
    { k: 'iri.t0', sec: 'shiny', lvl: 'a', type: 'range', label: 'Iridiscencia: momento (s tras abrir)', min: 0, max: 4, step: 0.01, def: 1.15, fams: F_ALL },
    { k: 'iri.sparkles', sec: 'shiny', lvl: 'a', type: 'range', label: 'Shiny: destellos de cristal', min: 0, max: 6, step: 1, def: 2, fams: F_ALL },
    { k: 'fx.seed', sec: 'light', lvl: 'a', type: 'range', label: 'Semilla aleatoria (0 = distinta en cada apertura)', min: 0, max: 99, step: 1, def: 1, fams: F_NEW },
    // ---- Composición, placa y barra
    { k: 'layout.sceneY', sec: 'comp', lvl: 'b', type: 'range', label: 'Huevo y personaje: altura (px)', min: -120, max: 60, step: 1, def: 0 },
    { k: 'plaque.y', sec: 'comp', lvl: 'b', type: 'range', label: 'Placa: posición vertical', min: 700, max: 900, step: 1, def: 822 },
    { k: 'plaque.w', sec: 'comp', lvl: 'b', type: 'range', label: 'Placa: anchura', min: 520, max: 960, step: 2, def: 760 },
    { k: 'plaque.h', sec: 'comp', lvl: 'a', type: 'range', label: 'Placa: altura', min: 130, max: 240, step: 1, def: 170 },
    { k: 'plaque.pad', sec: 'comp', lvl: 'a', type: 'range', label: 'Placa: margen interior', min: 10, max: 60, step: 1, def: 28 },
    { k: 'plaque.nameSize', sec: 'comp', lvl: 'b', type: 'range', label: 'Nombre: tamaño', min: 36, max: 72, step: 1, def: 52 },
    { k: 'plaque.nameMin', sec: 'comp', lvl: 'a', type: 'range', label: 'Nombre: tamaño mínimo antes de truncar', min: 28, max: 60, step: 1, def: 40 },
    { k: 'plaque.rarSize', sec: 'comp', lvl: 'a', type: 'range', label: 'Rareza: tamaño', min: 20, max: 40, step: 1, def: 28 },
    { k: 'plaque.rowSize', sec: 'comp', lvl: 'b', type: 'range', label: 'Usuario y progreso: tamaño', min: 22, max: 40, step: 1, def: 30 },
    { k: 'plaque.tagSize', sec: 'comp', lvl: 'a', type: 'range', label: 'Etiquetas (NEW / brasas / SHINY): tamaño', min: 18, max: 34, step: 1, def: 26 },
    { k: 'plaque.top', sec: 'comp', lvl: 'a', type: 'range', label: 'Primera línea: distancia al borde', min: 40, max: 90, step: 1, def: 64 },
    { k: 'plaque.gap1', sec: 'comp', lvl: 'a', type: 'range', label: 'Interlineado 1→2', min: 30, max: 70, step: 1, def: 48 },
    { k: 'plaque.gap2', sec: 'comp', lvl: 'a', type: 'range', label: 'Interlineado 2→3', min: 28, max: 64, step: 1, def: 40 },
    { k: 'plaque.bg', sec: 'comp', lvl: 'a', type: 'color', label: 'Placa: color de fondo', def: '#f7f3e8' },
    { k: 'plaque.border', sec: 'comp', lvl: 'a', type: 'color', label: 'Placa: color del borde', def: '#a8874f' },
    { k: 'plaque.shadow', sec: 'comp', lvl: 'a', type: 'range', label: 'Placa: sombra', min: 0, max: 0.6, step: 0.01, def: 0.2 },
    { k: 'plaque.inLead', sec: 'comp', lvl: 'b', type: 'range', label: 'Placa: entra antes de asentarse (s)', min: -0.6, max: 0.8, step: 0.01, def: 0.14 },
    { k: 'plaque.inDur', sec: 'comp', lvl: 'a', type: 'range', label: 'Placa: duración de la entrada (s)', min: 0.1, max: 1.2, step: 0.01, def: 0.38 },
    { k: 'plaque.rise', sec: 'comp', lvl: 'a', type: 'range', label: 'Placa: recorrido al entrar (px)', min: 0, max: 60, step: 1, def: 14 },
    { k: 'plaque.art', sec: 'comp', lvl: 'b', type: 'select', label: 'Placa: tipo', def: 'code', opts: [['code', 'Dibujada por código (actual)'], ['A', 'Arte · 3 fotogramas de Gemini'], ['B', 'Arte · 1 imagen + animación por código']] },
    { k: 'bar.art', sec: 'comp', lvl: 'b', type: 'select', label: 'Barra: tipo', def: 'code', opts: [['code', 'Dibujada por código (actual)'], ['art', 'Arte de Gemini (anima con la placa B)']] },
    { k: 'bar.y', sec: 'comp', lvl: 'b', type: 'range', label: 'Barra del canal: posición vertical', min: 960, max: 1012, step: 1, def: 1006 },
    { k: 'queue.pos', sec: 'comp', lvl: 'b', type: 'select', label: 'Indicador de cola', def: 'right', opts: [['right', 'A la derecha de la barra'], ['above', 'Encima de la barra, a la derecha'], ['left', 'A la izquierda de la barra']] },
    // ---- Celebraciones
    { k: 'x.idle', sec: 'extra', lvl: 'b', type: 'select', label: 'Huevo vivo en reposo', def: 'off', opts: [['off', 'No'], ['on', 'Sí']] },
    { k: 'x.fly', sec: 'extra', lvl: 'b', type: 'select', label: 'El dragón vuela a la colección', def: 'off', opts: [['off', 'No'], ['on', 'Copia pequeña'], ['whole', 'Vuela entero'], ['capture', 'Captura de luz (estilo Pokémon)']] },
    { k: 'x.luck', sec: 'extra', lvl: 'b', type: 'select', label: 'Medidor de suerte', def: 'off', opts: [['off', 'No'], ['on', 'Huevo de cristal junto a la barra'], ['plaque', 'Gemas en la placa, junto al nombre']] },
    { k: 'x.luckBadge', sec: 'extra', lvl: 'b', type: 'select', label: 'Aviso de suerte (trébol + globo cómic)', def: 'off', opts: [['off', 'No'], ['ur', 'Trébol + «UR LUCK!»'], ['your', 'Trébol + «YOUR LUCK!»'], ['luck', 'Trébol + «LUCK!»'], ['clover', 'Solo el trébol']] },
    { k: 'x.slot', sec: 'extra', lvl: 'b', type: 'select', label: 'Rareza que gira y placa que se voltea', def: 'off', opts: [['off', 'No'], ['on', 'Sí']] },
    { k: 'x.embers', sec: 'extra', lvl: 'b', type: 'select', label: 'Brasas al frasco en los repetidos', def: 'off', opts: [['off', 'No'], ['on', 'Sí']] },
    { k: 'x.wall', sec: 'extra', lvl: 'b', type: 'select', label: 'Muro de hallazgos (en reposo)', def: 'off', opts: [['off', 'No'], ['on', 'Sí']] },
    { k: 'x.pedestal', sec: 'extra', lvl: 'b', type: 'select', label: 'Pedestal de exposición', def: 'off', opts: [['off', 'No'], ['on', 'Sí']] },
    { k: 'luck.style', sec: 'luck', lvl: 'b', type: 'select', label: 'Aviso: estilo', def: 'A', opts: [['A', 'A · Cartela de joyería'], ['B', 'B · Cinta de cuento'], ['C', 'C · Sello arcano'], ['comic', 'Cómic (referencia)']] },
    { k: 'luck.textNext', sec: 'luck', lvl: 'b', type: 'select', label: 'Texto · próximo garantizado', def: 'NEXT: RARE+', opts: [['NEXT: RARE+', 'NEXT: RARE+'], ['NEXT EGG: RARE+', 'NEXT EGG: RARE+']] },
    { k: 'luck.textHit', sec: 'luck', lvl: 'b', type: 'select', label: 'Texto · garantía cumplida', def: 'RARE+ GUARANTEED', opts: [['RARE+ GUARANTEED', 'RARE+ GUARANTEED'], ['LUCKY!', 'LUCKY!']] },
    { k: 'luck.anchor', sec: 'luck', lvl: 'b', type: 'select', label: 'Aviso: anclaje', def: 'plaqueTL', opts: [['plaqueTR', 'Borde superior de la placa, derecha'], ['plaqueTC', 'Borde superior de la placa, centro'], ['plaqueTL', 'Borde superior de la placa, izquierda'], ['gems', 'Sobre las gemas']] },
    { k: 'luck.dx', sec: 'luck', lvl: 'a', type: 'range', label: 'Aviso: desplazamiento horizontal', min: -200, max: 200, step: 1, def: 0 },
    { k: 'luck.gap', sec: 'luck', lvl: 'b', type: 'range', label: 'Aviso: separación de la placa (px, negativo = solapa)', min: -90, max: 60, step: 1, def: -68 },
    { k: 'luck.size', sec: 'luck', lvl: 'b', type: 'range', label: 'Aviso: alto (tamaño uniforme)', min: 36, max: 140, step: 1, def: 58 },
    { k: 'luck.font', sec: 'luck', lvl: 'b', type: 'range', label: 'Aviso: tamaño de letra (lienzo de 1000 px; ×0,4 = tamaño real a 400×440)', min: 14, max: 40, step: 1, def: 29 },
    { k: 'luck.track', sec: 'luck', lvl: 'a', type: 'range', label: 'Aviso: espaciado entre letras (× tamaño)', min: 0, max: 0.2, step: 0.005, def: 0.06 },
    { k: 'luck.band', sec: 'luck', lvl: 'a', type: 'range', label: 'Placa: banda superior para la cartela (px)', min: 0, max: 40, step: 1, def: 18 },
    { k: 'luck.in', sec: 'luck', lvl: 'a', type: 'range', label: 'Aviso: entrada (s)', min: 0.1, max: 1.2, step: 0.01, def: 0.4 },
    { k: 'luck.hold', sec: 'luck', lvl: 'a', type: 'range', label: 'Aviso: permanencia (s)', min: 0.5, max: 8, step: 0.1, def: 6 },
    { k: 'luck.out', sec: 'luck', lvl: 'a', type: 'range', label: 'Aviso: salida (s)', min: 0.1, max: 1.2, step: 0.01, def: 0.35 },
    { k: 'luck.sheen', sec: 'luck', lvl: 'a', type: 'range', label: 'Reflejo en el latón (garantía cumplida): intensidad', min: 0, max: 1, step: 0.01, def: 0.6 },
    { k: 'luck.pulse', sec: 'luck', lvl: 'a', type: 'range', label: 'Luminiscencia del jade (próximo garantizado): intensidad', min: 0, max: 1, step: 0.01, def: 0.6 },
    { k: 'luck.sparkN', sec: 'luck', lvl: 'a', type: 'range', label: 'Destellos (garantía cumplida): cantidad', min: 0, max: 8, step: 1, def: 1 },
    { k: 'luck.sparkSize', sec: 'luck', lvl: 'a', type: 'range', label: 'Destellos: tamaño', min: 2, max: 16, step: 0.5, def: 6 },
    { k: 'luck.strip', sec: 'luck', lvl: 'b', type: 'select', label: 'Gemas: posición', def: 'row3', opts: [['row3', 'Franja propia (fila del set)'], ['row2', 'Junto al nombre (v14)']] },
    { k: 'luck.label', sec: 'luck', lvl: 'b', type: 'select', label: 'Gemas: etiqueta', def: 'count', opts: [['count', '«RARE+ IN N»'], ['state', 'Solo «NEXT: RARE+» al llegar al umbral']] },
    { k: 'luck.gemSize', sec: 'luck', lvl: 'a', type: 'range', label: 'Gemas: tamaño', min: 12, max: 32, step: 1, def: 20 },
    { k: 'luck.gemGap', sec: 'luck', lvl: 'a', type: 'range', label: 'Gemas: separación', min: 0, max: 10, step: 0.5, def: 3 },
    { k: 'celeb.style', sec: 'celeb', lvl: 'b', type: 'select', label: 'Dirección de las celebraciones', def: 'A', opts: [['A', 'A · Estandarte de latón y escamas'], ['B', 'B · Sello del tesoro y huevo dorado']] },
    { k: 'celeb.dur', sec: 'celeb', lvl: 'a', type: 'range', label: 'Duración de la celebración (s)', min: 2, max: 6, step: 0.1, def: 3.3 },
    { k: 'celeb.fx', sec: 'celeb', lvl: 'a', type: 'range', label: 'Celebración: cantidad de detalle', min: 0, max: 2, step: 0.05, def: 1 },
  ];
  // character-layer only
  SCHEMA.push({ k: 'char.profile', sec: 'fig', lvl: 'b', type: 'select', label: 'Perfil de movimiento de este personaje', def: '', opts: [['', '(el del catálogo)'], ['compact', 'Compacta'], ['tall', 'Alargada'], ['wide', 'Ancha'], ['floating', 'Flotante'], ['based', 'Con base']], only: 'character' });
  const SK = {}; SCHEMA.forEach(p => { SK[p.k] = p; });
  const SECTIONS = [
    ['open', 'Apertura · anticipación'], ['seam', 'Apertura · luz de la costura'], ['lid', 'Apertura · tapa y mitades'], ['shell', 'Cáscaras y su retirada'],
    ['fig', 'Personaje · aparición, aterrizaje y sombra'], ['light', 'Luz · familia y reposo'], ['halo', 'Luz · halo difuso'], ['rays', 'Luz · haces'], ['glint', 'Luz · destellos'],
    ['part', 'Luz · partículas'], ['trail', 'Luz · estelas'], ['accent', 'Luz · acento de apertura'], ['shiny', 'Capa shiny'], ['comp', 'Composición, placa y barra'], ['extra', 'Extras de interacción'], ['luck', 'Racha hacia Rare+ (gemas y aviso)'], ['celeb', 'Celebraciones']];

  // defaults by rarity / profile (part of the Base aprobada)
  const DEF_RAR = {
    common: { 'open.anticip': 0.45, 'open.wobble': 2.0, 'light.col': '#ffe2b6', 'light.halo': '#ffa03c', 'interior.int': 0.45, 'rim.exit': 0.16, 'rim.rest': 0.05 },
    rare: { 'open.anticip': 0.52, 'open.wobble': 2.4, 'light.col': '#d6e8ff', 'light.halo': '#3c8cff', 'interior.int': 0.55, 'rim.exit': 0.22, 'rim.rest': 0.07 },
    epic: { 'open.anticip': 0.62, 'open.wobble': 2.8, 'light.col': '#ecd6ff', 'light.halo': '#965aff', 'interior.int': 0.8, 'rim.exit': 0.3, 'rim.rest': 0.09 },
    legendary: { 'open.anticip': 0.78, 'open.wobble': 3.8, 'open.knock': 5, 'light.col': '#ffd680', 'light.halo': '#ffa014', 'interior.int': 0.75, 'rim.exit': 0.38, 'rim.rest': 0.12, 'accent.int': 0.9, 'accent.ext': 1, 'accent.dur': 0.53, 'accent.t0': 0.62 },
    mythic: { 'open.anticip': 0.95, 'open.wobble': 3.0, 'light.col': '#fff6ec', 'light.halo': '#e696dc', 'interior.int': 1.0, 'rim.exit': 0.48, 'rim.rest': 0.16, 'accent.int': 0.9, 'accent.ext': 1, 'accent.dur': 0.9, 'accent.t0': 0.55 },
  };
  const DEF_PROF = {
    compact: { 'land.desc': 0.42, 'land.ease': 'in', 'land.settle': 0.36, 'bounce.amp': 10, 'bounce.freq': 11, 'bounce.damp': 7, 'bounce.mode': 'bounce' },
    tall: { 'land.desc': 0.66, 'land.ease': 'inout', 'land.settle': 0.62, 'bounce.amp': 3.2, 'bounce.freq': 9, 'bounce.damp': 4.5, 'bounce.mode': 'osc' },
    wide: { 'land.desc': 0.4, 'land.ease': 'in', 'land.settle': 0.34, 'bounce.amp': 6, 'bounce.freq': 12, 'bounce.damp': 8, 'bounce.mode': 'bounce' },
    floating: { 'land.desc': 0.72, 'land.ease': 'inout', 'land.settle': 0.66, 'bounce.amp': 3, 'bounce.freq': 8, 'bounce.damp': 4, 'bounce.mode': 'osc', 'fig.float': 3.5 },
    based: { 'land.desc': 0.34, 'land.ease': 'in', 'land.settle': 0.26, 'bounce.amp': 3, 'bounce.freq': 15, 'bounce.damp': 11, 'bounce.mode': 'bounce' },
  };
  // light families: their own defaults per rarity (same reference behaviour per rarity, different rendering language)
  const FAM = {
    base: { g: {}, r: {} },
    jewel: { // precise reflections, small sharp glints, contained light
      g: { 'halo.size': 0.75, 'halo.falloff': 1.8, 'halo.col': '#fff6e6', 'glint.shape': 'star4', 'glint.place': 'edge', 'rays.dist': 'even', 'rays.soft': 2, 'rays.w': 0.018, 'part.size': 1.8, 'part.wander': 0, 'trail.curve': 0, 'light.settle': 0.6, 'interior.int': 0.3, 'accent.shape': 'flare', 'part.speed': 120, 'part.life': 0.55, 'part.spread': 30 },
      r: {
        common: { 'halo.int': 0.18, 'glint.n': 2, 'glint.size': 7, 'glint.t0': 0.95, 'glint.dur': 0.35, 'part.n': 5, 'trail.n': 0, 'rays.n': 0, 'accent.int': 0 },
        rare: { 'halo.int': 0.22, 'glint.n': 3, 'glint.size': 8, 'glint.t0': 0.9, 'glint.dur': 0.35, 'part.n': 6, 'trail.n': 2, 'trail.len': 0.18, 'trail.reach': 200, 'trail.dur': 0.45, 'rays.n': 0, 'accent.int': 0 },
        epic: { 'halo.int': 0.28, 'glint.n': 4, 'glint.size': 9, 'glint.t0': 0.9, 'part.n': 8, 'trail.n': 0, 'rays.n': 10, 'rays.len': 230, 'rays.spread': 120, 'rays.spin': 0.02, 'rays.dur': 0.9, 'accent.int': 0 },
        legendary: { 'halo.int': 0.32, 'halo.col': '#ffe1a0', 'glint.n': 6, 'glint.size': 11, 'glint.t0': 0.9, 'part.n': 10, 'trail.n': 0, 'rays.n': 12, 'rays.len': 260, 'rays.spread': 360, 'rays.dur': 0.8, 'accent.shape': 'flare', 'accent.col': '#ffcf6a', 'accent.int': 0.9, 'accent.ext': 0.9, 'accent.t0': 0.7, 'accent.dur': 0.45 },
        mythic: { 'halo.int': 0.36, 'halo.col': '#f6eefe', 'halo.expand': 0.6, 'glint.n': 8, 'glint.size': 12, 'glint.t0': 0.95, 'glint.rhythm': 0.1, 'part.n': 12, 'trail.n': 0, 'rays.n': 16, 'rays.len': 300, 'rays.spread': 360, 'rays.dur': 1.1, 'accent.shape': 'flare', 'accent.col': '#f4e6ff', 'accent.int': 1, 'accent.ext': 1.15, 'accent.t0': 0.75, 'accent.dur': 0.6 },
      },
    },
    forest: { // motes, organic trails, interior light
      g: { 'halo.size': 1.1, 'halo.falloff': 1.0, 'halo.col': '#ffe6b8', 'part.size': 3.2, 'part.wander': 18, 'part.dir': -90, 'part.spread': 70, 'part.speed': 70, 'part.life': 1.6, 'trail.curve': 0.55, 'glint.n': 0, 'rays.n': 0, 'accent.shape': 'bloom', 'interior.int': 0.7, 'light.settle': 1.2 },
      r: {
        common: { 'halo.int': 0.2, 'part.n': 9, 'trail.n': 0, 'accent.int': 0 },
        rare: { 'halo.int': 0.24, 'part.n': 10, 'trail.n': 2, 'trail.len': 0.35, 'trail.reach': 220, 'trail.dur': 0.9, 'accent.int': 0 },
        epic: { 'halo.int': 0.3, 'part.n': 14, 'trail.n': 4, 'trail.len': 0.4, 'trail.reach': 260, 'trail.dur': 1.1, 'trail.curve': 0.8, 'accent.int': 0 },
        legendary: { 'halo.int': 0.34, 'halo.col': '#ffe0a0', 'part.n': 20, 'part.size': 3.6, 'trail.n': 5, 'trail.len': 0.35, 'trail.reach': 280, 'trail.dur': 1.0, 'accent.shape': 'bloom', 'accent.col': '#ffc85a', 'accent.int': 0.7, 'accent.ext': 1.0, 'accent.t0': 0.7, 'accent.dur': 0.8 },
        mythic: { 'halo.int': 0.3, 'halo.col': '#fbeefa', 'halo.expand': 0.6, 'part.n': 26, 'trail.n': 6, 'trail.len': 0.45, 'trail.reach': 300, 'trail.dur': 1.3, 'trail.curve': 0.9, 'accent.shape': 'bloom', 'accent.col': '#f6e8ff', 'accent.int': 0.8, 'accent.ext': 1.3, 'accent.t0': 0.6, 'accent.dur': 1.1 },
      },
    },
    ceremony: { // soft beams, luminous expansion, final accent
      g: { 'halo.size': 1.3, 'halo.falloff': 1.1, 'halo.col': '#fff3dc', 'rays.dist': 'even', 'rays.soft': 18, 'rays.w': 0.11, 'rays.spin': 0.06, 'part.n': 0, 'trail.n': 0, 'glint.shape': 'star4', 'glint.place': 'around', 'accent.shape': 'flare', 'interior.int': 0.55, 'light.settle': 1.4 },
      r: {
        common: { 'halo.int': 0.22, 'rays.n': 3, 'rays.len': 220, 'rays.spread': 70, 'rays.dur': 0.9, 'glint.n': 0, 'part.n': 5, 'part.size': 2.6, 'accent.int': 0 },
        rare: { 'halo.int': 0.26, 'rays.n': 5, 'rays.len': 260, 'rays.spread': 90, 'rays.dur': 1.0, 'trail.n': 2, 'trail.len': 0.25, 'trail.reach': 230, 'trail.dur': 0.6, 'glint.n': 0, 'accent.int': 0 },
        epic: { 'halo.int': 0.32, 'rays.n': 7, 'rays.len': 330, 'rays.spread': 120, 'rays.dur': 1.2, 'glint.n': 1, 'glint.t0': 1.7, 'glint.size': 14, 'accent.int': 0 },
        legendary: { 'halo.int': 0.38, 'halo.col': '#ffe2a6', 'rays.n': 10, 'rays.len': 380, 'rays.spread': 200, 'rays.dur': 1.3, 'glint.n': 1, 'glint.t0': 1.9, 'glint.size': 16, 'accent.shape': 'burst', 'accent.col': '#ffcc66', 'accent.int': 0.85, 'accent.ext': 1.1, 'accent.t0': 0.62, 'accent.dur': 0.55 },
        mythic: { 'halo.int': 0.34, 'halo.col': '#fff4fb', 'halo.expand': 0.9, 'rays.n': 12, 'rays.len': 420, 'rays.spread': 360, 'rays.dur': 1.5, 'glint.n': 1, 'glint.t0': 2.0, 'glint.size': 18, 'accent.shape': 'bloom', 'accent.col': '#fdf0ff', 'accent.int': 0.9, 'accent.ext': 1.4, 'accent.t0': 0.55, 'accent.dur': 1.0 },
      },
    },
  };
  // base family: which generic controls act on which rarity (the approved effects)
  const BASE_REL = { 'rays.': ['epic'], 'glint.': ['mythic'], 'part.': ['common'], 'trail.': ['rare'], 'accent.': ['legendary', 'mythic'] };

  // =====================================================================================
  // resolution: schema default → rarity default → profile default → family (global, rarity) → user layers
  // user layers: global → rarity[r] → profile[p] → character[id] → shiny (only when shiny)
  // =====================================================================================
  function emptyConfig(name) { return { format: 'exe-blindbox-presenter', presenter: 'eggHoard', configVersion: CONFIG_VERSION, name: name || 'Base aprobada', notes: '', layers: { global: {}, rarity: {}, profile: {}, character: {}, shiny: {} } }; }
  function layersOf(cfg) { const L = (cfg && cfg.layers) || {}; return { global: L.global || {}, rarity: L.rarity || {}, profile: L.profile || {}, character: L.character || {}, shiny: L.shiny || {} }; }
  function profileOf(cfg, ctx) { const L = layersOf(cfg); const c = L.character[ctx.id] || {}; return c['char.profile'] || ctx.profile || 'compact'; }
  function resolveWithSource(cfg, ctx) { // ctx = {rarity, profile, id, shiny}
    const L = layersOf(cfg), r = RARITIES.includes(ctx.rarity) ? ctx.rarity : 'common', p = profileOf(cfg, ctx);
    const out = {}, src = {};
    const put = (o, tag) => { if (!o) return; for (const k in o) if (o[k] !== undefined && o[k] !== null && o[k] !== '') { out[k] = o[k]; src[k] = tag; } };
    SCHEMA.forEach(q => { out[q.k] = q.def; src[q.k] = 'base'; });
    put(DEF_RAR[r], 'base'); put(DEF_PROF[p], 'base');
    // the family is chosen first from user layers (family itself can be an exception)
    const famPick = [L.global, L.rarity[r], L.profile[p], L.character[ctx.id], ctx.shiny ? L.shiny : null].reduce((f, o) => (o && o['light.family']) || f, 'base');
    const fam = FAM[famPick] || FAM.base; put(fam.g, 'family'); put(fam.r[r], 'family');
    put(L.global, 'global'); put(L.rarity[r], 'rarity'); put(L.profile[p], 'profile'); put(L.character[ctx.id], 'character'); if (ctx.shiny) put(L.shiny, 'shiny');
    out['light.family'] = famPick; out._profile = p; out._rarity = r;
    return { P: out, src };
  }
  function resolve(cfg, ctx) { return resolveWithSource(cfg, ctx).P; }
  function relevant(key, fam, rarity) {
    const q = SK[key]; if (!q) return false; if (!q.fams || q.fams === F_ALL) {
      if (fam === 'base') { for (const pre in BASE_REL) if (key.startsWith(pre)) return BASE_REL[pre].includes(rarity); }
      return true;
    }
    if (fam === 'base') return false; return q.fams.includes(fam);
  }

  // =====================================================================================
  // assets
  // =====================================================================================
  const R = { ready: false };
  const cache = new Map();
  function load(src) { return new Promise(r => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => r(i); i.onerror = () => r(null); i.src = src; }); }
  function alphaInfo(im) {
    if (cache.has(im)) return cache.get(im);
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, im.width, im.height).data; let area = 0, maxY = 0, minY = im.height, minX = im.width, maxX = 0; const top = new Int32Array(im.width).fill(-1);
    let mx = 0; for (let y = 0; y < im.height; y++) for (let xx = 0; xx < im.width; xx++) if (d[(y * im.width + xx) * 4 + 3] > 128) { area++; mx += xx; if (y > maxY) maxY = y; if (y < minY) minY = y; if (xx < minX) minX = xx; if (xx > maxX) maxX = xx; if (top[xx] < 0) top[xx] = y; }
    let sx = 0, sn = 0; const y0 = maxY - (maxY - minY) * 0.12;
    for (let y = Math.floor(y0); y <= maxY; y++) for (let xx = 0; xx < im.width; xx++) if (d[(y * im.width + xx) * 4 + 3] > 128) { sx += xx; sn++; }
    const info = { area, maxY, minY, minX, maxX, top, supportX: sn ? sx / sn : im.width / 2, massX: area ? mx / area : im.width / 2 };
    cache.set(im, info); return info;
  }
  async function init(base, files, uiList) {
    const names = ['egg_closed', 'egg_back', 'egg_lid_plain', 'egg_front_plain', 'egg_lid_lip', 'egg_front_lip'];
    for (const n of names) R[n] = await load(files && files[n + '.png'] ? files[n + '.png'] : base + n + '.png');
    R.front_i = alphaInfo(R.egg_front_plain); R.lid_i = alphaInfo(R.egg_lid_plain);
    const t = R.front_i.top; R.seam = []; let mn = 1e9, mx = -1e9;
    for (let i = 4; i < t.length - 4; i += 2) if (t[i] >= 0) { R.seam.push([CX - EW / 2 + i * ES, EGG_TOP + t[i] * ES]); }
    for (let i = 20; i < t.length - 20; i++) if (t[i] >= 0) { mn = Math.min(mn, t[i]); mx = Math.max(mx, t[i]); }
    R.rimMin = EGG_TOP + mn * ES; R.rimMax = EGG_TOP + mx * ES;
    try { await Promise.all([document.fonts.load('600 40px Fraunces'), document.fonts.load('500 20px Inter'), document.fonts.load('600 20px Inter'), document.fonts.load('700 20px Inter')]); } catch (e) {}
    R.ui = { plaque: [] }; // optional generated interface art (test)
    const want = n => !uiList || uiList.includes(n); // a product theme lists the interface art it ships; the lab loads everything
    for (const n of ['ui_plaque_f1', 'ui_plaque_f2', 'ui_plaque_f3'].filter(want)) { const f = files && files[n + '.png'] ? files[n + '.png'] : base + n + '.png'; const im = await load(f); if (im) R.ui.plaque.push(im); }
    for (const n of ['ui_bar_frame', 'ui_bar_fill', 'ui_pedestal', 'ui_ember_jar', 'ui_luck_egg', 'ui_luck_mask', 'ui_clover_solo', 'ui_pop_your_luck', 'ui_pop_ur_luck', 'ui_pop_luck', 'ui_gem_off', 'ui_gem_on', 'ui_pop_one_more', 'ui_pop_lucky', 'ui_pop_next_rare', 'ui_luck_a_tab', 'ui_luck_b_ribbon', 'ui_luck_c_seal', 'ui_luck_c_cartouche'].filter(want)) { const f = files && files[n + '.png'] ? files[n + '.png'] : base + n + '.png'; R.ui[n] = await load(f); }
    R.ready = true;
  }
  // size: equal silhouette area (balanced), capped; calibration (catalog) and fig.scale multiply uniformly
  const REF_AREA_H = 440, PEBBLE_REF = { area: 300994, h: 711 };
  function anchored(inf, anchor) { // 'visual' = halfway between the silhouette's box centre and its mass centre (for long, lying or lopsided figures)
    return anchor === 'visual' ? Object.assign({}, inf, { supportX: ((inf.minX + inf.maxX) / 2 + inf.massX) / 2 }) : inf; }
  function sizeOf(im, mul, anchor) {
    const inf = anchored(alphaInfo(im), anchor);
    const K = (REF_AREA_H / PEBBLE_REF.h) * Math.sqrt(PEBBLE_REF.area);
    let s = K / Math.sqrt(inf.area); s = Math.min(s, 520 / (inf.maxY - inf.minY), 540 / im.width);
    if (mul !== undefined && mul !== 1) s *= mul;
    const k0 = Math.min(0.62, (EW * 0.84) / (im.width * s));
    return { s, k0, inf };
  }
  function times(P, rm, hold) { // timeline relative to the start of the opening
    if (rm) return { pop: 0.3, settle: 0.9, plaqueIn: 0.8, land: 0.9, desc0: 0.3, end: 0.9 + hold + P['timing.outro'] };
    const pop = P['open.anticip'] + P['open.pause'], A = appearTimes(P);
    const land = pop + A.desc0 + P['land.desc'], settle = land + P['land.settle'];
    return { pop, land, settle, desc0: pop + A.desc0, plaqueIn: settle - P['plaque.inLead'], end: settle + hold + P['timing.outro'] };
  }
  function creatureDelay(P) { // the creature waits until the lid of the chosen opening is out of the way (0 for the approved combination)
    const clear = { base: 0, collect: 0.4, magic: 0.6 }[P['open.style']] || 0, own = { hop: 0.12, solemn: 0.4, magic: 0.2, leap: 0.08 }[P['appear.style']] || 0.12;
    if (P['open.style'] === 'base') return P['appear.style'] === 'leap' ? 0.35 : 0; // approved opening keeps its exact timing
    return Math.max(0, clear - own);
  }
  function appearTimes(P) { // when the creature starts its descent (relative to the pop) per appearance style
    const sp = P['fig.exitSpeed'], d = creatureDelay(P);
    if (P['appear.style'] === 'magic') return { desc0: 2.35 / sp + d };
    if (P['appear.style'] === 'solemn') return { desc0: 1.85 / sp + d };
    if (P['appear.style'] === 'leap') return { desc0: 0.78 / sp + d };
    return { desc0: X.DESC0 / sp + d };
  }
  function holdOf(P, s) { return P['timing.hold'] > 0 ? P['timing.hold'] : (s && s.hold) || 4; }
  // public timeline helper (engine + lab)
  function timelineFor(s) { const P = paramsFor(s); const h = holdOf(P, s); const T = times(P, !!s.rm, h); return Object.assign({ hold: h }, T); }
  function paramsFor(s) { return resolve(s.cfg, { rarity: s.rarity, profile: s.profile, id: s.id, shiny: !!s.shiny }); }

  // ---------- helpers
  function shadow(ctx, cx, y, w, h, a, soft) {
    if (a <= 0.002 || w < 2) return;
    ctx.save(); ctx.translate(cx, y); ctx.scale(1, h / w);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w / 2); g.addColorStop(0, `rgba(20,26,22,${a})`); g.addColorStop(soft === undefined ? 0.6 : soft, `rgba(20,26,22,${a * 0.45})`); g.addColorStop(1, 'rgba(20,26,22,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, w / 2, 0, 7); ctx.fill(); ctx.restore();
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function star4(ctx, x, y, r, a, col) { if (a <= 0.01) return; ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = col || '#fff7e6'; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x + r * .16, y - r * .16, x + r, y); ctx.quadraticCurveTo(x + r * .16, y + r * .16, x, y + r); ctx.quadraticCurveTo(x - r * .16, y + r * .16, x - r, y); ctx.quadraticCurveTo(x - r * .16, y - r * .16, x, y - r); ctx.fill(); ctx.restore(); }
  function piece(ctx, im, x, y, px, py, rot, alpha = 1) { if (!im || alpha <= 0.003) return; ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.drawImage(im, -px * ES, -py * ES, im.width * ES, im.height * ES); ctx.restore(); }
  const off = document.createElement('canvas'); off.width = W; off.height = H; const oc = off.getContext('2d');
  const SPR = new Map();
  function sprite(key, w, h, blur, paint) {
    if (SPR.has(key)) return SPR.get(key);
    if (SPR.size > 400) SPR.clear();
    const a = document.createElement('canvas'); a.width = Math.max(1, Math.ceil(w)); a.height = Math.max(1, Math.ceil(h)); paint(a.getContext('2d'));
    if (!blur) { SPR.set(key, a); return a; }
    const b = document.createElement('canvas'); b.width = a.width; b.height = a.height; const bc = b.getContext('2d'); bc.filter = `blur(${blur}px)`; bc.drawImage(a, 0, 0);
    SPR.set(key, b); return b;
  }
  const IDS = new WeakMap(); let nid = 0; function imgId(im) { if (!IDS.has(im)) IDS.set(im, 'i' + (++nid)); return IDS.get(im); }
  function seamBox() { if (!R.seamBox) { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; R.seam.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }); R.seamBox = { x: Math.floor(x0) - 50, y: Math.floor(y0) - 50, w: Math.ceil(x1 - x0) + 100, h: Math.ceil(y1 - y0) + 100 }; } return R.seamBox; }
  function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function rng(seed) { let a = (seed >>> 0) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function seamPath(ctx, dx) { ctx.beginPath(); R.seam.forEach(([x, y], i) => i ? ctx.lineTo(x + dx, y + 6 * ES) : ctx.moveTo(x + dx, y + 6 * ES)); }
  function seamGlow(ctx, a, h, width, dx = 0) { // coloured halo (normal blend, reads on ivory) + bright core
    if (a <= 0.005) return;
    ctx.save(); ctx.lineJoin = 'round';
    const bx = seamBox(), sp = sprite('seam|' + h + '|' + width, bx.w, bx.h, 6, c => { c.translate(-bx.x, -bx.y); c.lineJoin = 'round'; seamPath(c, 0); c.strokeStyle = `rgba(${h},0.55)`; c.lineWidth = width * 5; c.stroke(); });
    ctx.save(); ctx.globalAlpha *= Math.min(1, a); ctx.drawImage(sp, bx.x + dx, bx.y); ctx.restore();
    seamPath(ctx, dx); ctx.strokeStyle = `rgba(${h},${a * 0.8})`; ctx.lineWidth = width * 1.8; ctx.stroke();
    seamPath(ctx, dx); ctx.strokeStyle = `rgba(255,252,240,${a})`; ctx.lineWidth = width * 0.8; ctx.stroke(); ctx.restore();
  }
  function seamRun(ctx, p, a, h, runLen, wmul) { // a bright segment travelling along the zigzag (0..1)
    if (a <= 0.005) return; const n = R.seam.length, c = Math.floor(p * n), L = Math.max(1, Math.floor(n * runLen));
    const bx = seamBox(); if (!R.runC) { R.runC = document.createElement('canvas'); R.runC.width = bx.w; R.runC.height = bx.h; } const rc = R.runC.getContext('2d');
    rc.setTransform(1, 0, 0, 1, 0, 0); rc.clearRect(0, 0, bx.w, bx.h); rc.translate(-bx.x, -bx.y); rc.lineCap = 'round';
    for (let i = Math.max(1, c - L); i <= Math.min(n - 1, c); i++) { const k = 1 - (c - i) / L; rc.strokeStyle = `rgba(${h},${a * k * 0.8})`; rc.lineWidth = (10 + 6 * k) * wmul; rc.beginPath(); rc.moveTo(R.seam[i - 1][0], R.seam[i - 1][1] + 6 * ES); rc.lineTo(R.seam[i][0], R.seam[i][1] + 6 * ES); rc.stroke(); }
    ctx.save(); ctx.filter = 'blur(5px)'; ctx.drawImage(R.runC, bx.x, bx.y); ctx.filter = 'none'; ctx.lineCap = 'round';
    for (let i = Math.max(1, c - L); i <= Math.min(n - 1, c); i++) { const k = 1 - (c - i) / L;
      ctx.strokeStyle = `rgba(255,252,244,${a * k})`; ctx.lineWidth = (2 + 2 * k) * wmul;
      ctx.beginPath(); ctx.moveTo(R.seam[i - 1][0], R.seam[i - 1][1] + 6 * ES); ctx.lineTo(R.seam[i][0], R.seam[i][1] + 6 * ES); ctx.stroke(); }
    ctx.restore();
  }
  function interiorEmission(ctx, ox, a, rgb, tall) { // light coming OUT of the open shell
    if (a <= 0.005) return;
    const h = 230 * (tall || 1), P = 40, sw = Math.ceil(EW * 0.8) + 2 * P, sh = Math.ceil(h + 10) + 2 * P;
    const sp = sprite('em|' + rgb + '|' + h, sw, sh, 12, c => { c.translate(sw / 2, P + h);
      const g = c.createLinearGradient(0, 6, 0, -h); g.addColorStop(0, `rgba(${rgb},0.55)`); g.addColorStop(0.45, `rgba(${rgb},0.18)`); g.addColorStop(1, `rgba(${rgb},0)`);
      c.fillStyle = g; c.beginPath(); c.moveTo(-EW * 0.40, 4); c.lineTo(-EW * 0.30, -h); c.lineTo(EW * 0.30, -h); c.lineTo(EW * 0.40, 4); c.closePath(); c.fill(); });
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha *= Math.min(1, a); ctx.drawImage(sp, ox - sw / 2, SEAM_Y - P - h); if (a > 1) { ctx.globalAlpha = Math.min(1, a - 1); ctx.drawImage(sp, ox - sw / 2, SEAM_Y - P - h); } ctx.restore();
  }
  function lowerHalf(ctx, ox, rot, glowA, rgb, alpha = 1) {
    if (alpha <= 0.003) return;
    const LX = Math.max(0, Math.floor(ox - EW * 0.75)), LY = Math.max(0, Math.floor(G - 748 * ES - 20)), LW = Math.min(W - LX, Math.ceil(EW * 1.5)), LH = Math.min(H - LY, Math.ceil(748 * ES + 40));
    oc.clearRect(LX, LY, LW, LH); oc.save(); oc.translate(ox, G); if (rot) oc.rotate(rot); oc.drawImage(R.egg_back, -268 * ES, -748 * ES, 536 * ES, 748 * ES); oc.restore();
    if (glowA > 0.003) { oc.save(); oc.globalCompositeOperation = 'source-atop'; const g = oc.createRadialGradient(ox, SEAM_Y - 6, 4, ox, SEAM_Y - 6, EW * 0.5); g.addColorStop(0, `rgba(${rgb},${Math.min(1, glowA)})`); g.addColorStop(1, `rgba(${rgb},0)`); oc.fillStyle = g; oc.fillRect(ox - EW, SEAM_Y - 120, EW * 2, 170); oc.restore(); }
    ctx.save(); ctx.globalAlpha *= alpha; if (LW > 0 && LH > 0) ctx.drawImage(off, LX, LY, LW, LH, LX, LY, LW, LH); ctx.restore();
  }
  function frontShell(ctx, ox, rot, lip, alpha = 1) { piece(ctx, R.egg_front_plain, ox, G, 268, 748, rot, alpha); piece(ctx, R.egg_front_lip, ox, G, 268, 748, rot, lip * alpha); }
  function lidPiece(ctx, x, y, r, lip, alpha = 1) { piece(ctx, R.egg_lid_plain, x, y, 268, SEAM_PIECE, r, alpha); piece(ctx, R.egg_lid_lip, x, y, 268, SEAM_PIECE, r, lip * alpha); }
  function figureDraw(ctx, im, sz, cx, bottom, k, rimA, rimCol, clip, alpha, shinyFx, tilt) {
    const inf = sz.inf, s = sz.s * k, x = cx - inf.supportX * s, y = bottom - inf.maxY * s, w = im.width * s, h = im.height * s;
    ctx.save(); ctx.globalAlpha *= alpha; if (clip) clip(ctx);
    if (tilt) { ctx.translate(cx, bottom); ctx.rotate(tilt); ctx.translate(-cx, -bottom); }
    if (rimA > 0.003) {
      const P = 24, sp = sprite(imgId(im) + '|rim|' + rimCol, im.width + 2 * P, im.height + 2 * P, 14, c => { c.drawImage(im, P, P); c.globalCompositeOperation = 'source-in'; c.fillStyle = rimCol; c.fillRect(0, 0, c.canvas.width, c.canvas.height); });
      ctx.save(); ctx.globalAlpha *= Math.min(1, rimA * 1.6); ctx.globalCompositeOperation = 'screen'; ctx.drawImage(sp, x - P * s, y - P * s, (im.width + 2 * P) * s, (im.height + 2 * P) * s); ctx.restore();
    }
    ctx.drawImage(im, x, y, w, h);
    if (shinyFx && shinyFx.a > 0.005) { // iridescent sweep clipped to the figure (shiny accent)
      const SX = Math.max(0, Math.floor(x)), SY = Math.max(0, Math.floor(y)), SW = Math.min(W - SX, Math.ceil(w) + 2), SH = Math.min(H - SY, Math.ceil(h) + 2);
      if (tilt) { oc.clearRect(0, 0, W, H); } else oc.clearRect(SX, SY, SW, SH);
      oc.globalCompositeOperation = 'source-over'; oc.drawImage(im, x, y, w, h); oc.globalCompositeOperation = 'source-atop';
      const p = shinyFx.p, gx = x - w * 0.6 + (w * 2.2) * p, g = oc.createLinearGradient(gx - 140, y, gx + 140, y + h * 0.5);
      [['rgba(255,170,210,0)', 0], ['rgba(255,170,210,.9)', .25], ['rgba(170,235,255,.95)', .5], ['rgba(200,255,190,.9)', .72], ['rgba(200,255,190,0)', 1]].forEach(([c, o]) => g.addColorStop(o, c));
      oc.fillStyle = g; oc.fillRect(SX, SY, SW, SH); oc.globalCompositeOperation = 'source-over';
      ctx.save(); ctx.globalAlpha *= Math.min(1, shinyFx.a); ctx.globalCompositeOperation = 'screen'; if (SW > 0 && SH > 0) ctx.drawImage(off, SX, SY, SW, SH, SX, SY, SW, SH); ctx.restore();
    }
    ctx.restore();
    return { x, y, w, h };
  }

  // =====================================================================================
  // light · BASE family (the approved effects; generic controls scale them, defaults = approved values)
  // =====================================================================================
  function baseBehind(ctx, P, r, rel, fig, rm) {
    if (rm) return; const c = hexRgb(P['light.col']), I = P['light.int']; rel -= P['fx.delay'];
    if (r === 'epic' && rel >= 0 && rel < P['rays.dur'] + 0.05 && P['rays.n'] > 0) { // soft fan of light from inside the shell
      const d = P['rays.dur'], a = bell(rel, 0, d === 1.05 ? 0.14 : 0.14 * d / 1.05, d) * 0.8 * I, n = P['rays.n'], ox = CX, oy = SEAM_Y + 10, rot = P['rays.spin'] * Math.sin(rel * 2.2);
      const FW = 760 + Math.max(0, P['rays.len'] - 300) * 2, FH = 420 + Math.max(0, P['rays.len'] - 300), FO = FW / 2, FY = FH - 25, step = (P['rays.spread'] * Math.PI / 180) / Math.max(1, (n - 1) * 1.0) * (n > 1 ? 1 : 0);
      const sp = sprite(['fan', c, n, P['rays.len'], P['rays.w'], P['rays.soft'], P['rays.spread']].join('|'), FW, FH, P['rays.soft'], cc => { for (let i = 0; i < n; i++) { const ang = -Math.PI / 2 + (n > 1 ? (i - (n - 1) / 2) * (P['rays.spread'] === 110 && n === 7 ? 0.32 : step) : 0), L = P['rays.len'] + 40 * Math.sin(i * 1.7) * (P['rays.len'] / 300), wd = P['rays.w'];
        const g = cc.createLinearGradient(FO, FY, FO + Math.cos(ang) * L, FY + Math.sin(ang) * L); g.addColorStop(0, `rgba(${c},0.55)`); g.addColorStop(1, `rgba(${c},0)`);
        cc.fillStyle = g; cc.beginPath(); cc.moveTo(FO, FY); cc.lineTo(FO + Math.cos(ang - wd) * L, FY + Math.sin(ang - wd) * L); cc.lineTo(FO + Math.cos(ang + wd) * L, FY + Math.sin(ang + wd) * L); cc.closePath(); cc.fill(); } });
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha *= Math.min(1, a); ctx.translate(ox, oy); ctx.rotate(rot); ctx.drawImage(sp, -FO, -FY); ctx.restore();
    }
    if (r === 'legendary' && fig) { // short golden burst behind the creature, open spikes (no ring)
      const t0 = P['accent.t0'], t1 = t0 + P['accent.dur'], E = P['accent.ext'];
      if (rel > t0 && rel < t1 + 0.05 && P['accent.int'] > 0) {
        const u = seg(rel, t0, t1), a = (1 - eio(u)) * P['accent.int'] * I, cx = fig.x + fig.w / 2, cy = fig.y + fig.h * 0.48;
        ctx.save(); ctx.globalCompositeOperation = 'screen';
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, (170 + 90 * eo(u)) * E); g.addColorStop(0, `rgba(${c},${Math.min(1, 0.45 * a)})`); g.addColorStop(1, `rgba(${c},0)`); ctx.fillStyle = g; ctx.fillRect(cx - 300 * E, cy - 300 * E, 600 * E, 600 * E);
        for (let i = 0; i < 12; i++) { const ang = i * Math.PI / 6 + 0.13, r0 = (90 + 60 * eo(u)) * E, r1 = r0 + (70 + 70 * eo(u) * (i % 2 ? 0.6 : 1)) * E;
          ctx.strokeStyle = `rgba(${c},${Math.min(1, a)})`; ctx.lineWidth = i % 2 ? 3 : 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0); ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1); ctx.stroke(); }
        ctx.restore();
      }
    }
    if (r === 'mythic' && fig) { // nacre expansion that fades to present the figure (filled, soft edge)
      const t0 = P['accent.t0'], t1 = t0 + P['accent.dur'], E = P['accent.ext'];
      if (rel > t0 && rel < t1 + 0.05 && P['accent.int'] > 0) {
        const u = seg(rel, t0, t1), a = Math.sin(Math.PI * Math.min(1, u * 1.6)) * (1 - u) * P['accent.int'] * I, cx = fig.x + fig.w / 2, cy = fig.y + fig.h * 0.5, rad = (110 + 250 * eo(u)) * E;
        ctx.save(); ctx.globalCompositeOperation = 'screen';
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, `rgba(255,246,232,${Math.min(1, 0.65 * a)})`); g.addColorStop(0.4, `rgba(255,226,238,${Math.min(1, 0.32 * a)})`); g.addColorStop(0.7, `rgba(226,236,255,${Math.min(1, 0.12 * a)})`); g.addColorStop(1, 'rgba(255,240,250,0)');
        ctx.fillStyle = g; ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); ctx.restore();
      }
    }
  }
  function baseFront(ctx, P, r, rel, fig, rm) {
    if (rm) return; const c = hexRgb(P['light.col']), I = P['light.int']; rel -= P['fx.delay'];
    const life = P['part.life'], sp0 = P['part.speed'] / 160, ps = P['part.size'] / 3.5;
    if (r === 'common' && rel >= 0 && rel < life + 0.2) { // a few motes rising from the rim
      for (let i = 0; i < P['part.n']; i++) { const u = seg(rel, 0.02 * i, life + 0.03 * i); if (u <= 0 || u >= 1) continue;
        const x0 = CX + (rnd(i) - 0.5) * EW * 0.7, x = x0 + (rnd(i + 9) - 0.5) * 40 * u, y = SEAM_Y - 8 - (110 + 90 * rnd(i + 3)) * sp0 * eo(u);
        ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(${c},${Math.min(1, (1 - u) * 0.9 * I)})`; ctx.beginPath(); ctx.arc(x, y, (2.5 + 2 * rnd(i + 5)) * ps, 0, 7); ctx.fill(); ctx.restore(); }
    }
    const tdur = P['trail.dur'];
    if (r === 'rare' && rel >= 0 && rel < tdur + 0.05) { // two short streaks following the separating pieces
      const u = seg(rel, 0, tdur), a = (1 - u) * 0.85 * I, reach = P['trail.reach'] / 225, tl = P['trail.len'];
      ctx.save(); ctx.lineCap = 'round';
      const trails = [[R.seam[0], [R.seam[0][0] - 150 * reach, SEAM_Y - 170 * reach]], [R.seam[R.seam.length - 1], [R.seam[R.seam.length - 1][0] + 150 * reach, SEAM_Y - 170 * reach]]];
      const halo = hexRgb(P['light.halo']);
      for (const [[x0, y0], [x1, y1]] of trails) { const hx = lerp(x0, x1, eo(u)), hy = lerp(y0, y1, eo(u)), tx = lerp(x0, x1, eo(Math.max(0, u - tl))), ty = lerp(y0, y1, eo(Math.max(0, u - tl)));
        for (const pass of [0, 1]) { const col = pass ? '255,252,244' : halo; const g = ctx.createLinearGradient(tx, ty, hx, hy); g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${Math.min(1, a * (pass ? 1 : 0.75))})`);
          ctx.strokeStyle = g; ctx.lineWidth = pass ? 4 : 12; ctx.filter = pass ? 'none' : 'blur(4px)'; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo((tx + hx) / 2, Math.min(ty, hy) - 30, hx, hy); ctx.stroke(); } }
      ctx.restore();
    }
  }
  function baseAnticipation(ctx, P, r, t, pop) { // light only along the real seam, tied to the pop
    const rel = t - pop, I = P['seam.int'], h = hexRgb(P['light.halo']), wm = P['seam.width'], mode = P['seam.mode'];
    if (mode === 'off' || I <= 0) return;
    const A = P['open.anticip'];
    if (mode === 'glow') { seamGlow(ctx, eo(seg(rel, -A * 0.75, -0.02)) * 0.9 * I, h, 2.6 * wm); return; }
    if (mode === 'run') { seamRun(ctx, seg(rel, -A * 0.85, -0.02), bell(rel, -A * 0.9, -A * 0.6, 0.04) * I, h, P['seam.runLen'], wm); return; }
    if (r === 'common') seamGlow(ctx, bell(rel, -0.18, -0.04, 0.08) * 0.95 * I, h, 2.2 * wm);
    if (r === 'rare') { seamRun(ctx, seg(rel, -0.44, -0.02), bell(rel, -0.46, -0.32, 0.04) * I, h, P['seam.runLen'], wm); }
    if (r === 'epic') seamGlow(ctx, eo(seg(rel, -0.5, -0.02)) * 0.9 * I, h, 2.4 * wm);
    if (r === 'legendary') seamGlow(ctx, eo(seg(rel, -0.45, -0.02)) * I, h, 3 * wm);
    if (r === 'mythic') seamGlow(ctx, ei(seg(rel, -0.6, -0.02)) * I, h, 3 * wm);
  }

  // =====================================================================================
  // light · NEW families (jewel / forest / ceremony): shared blocks with family-specific rendering
  // =====================================================================================
  function haloSprite(col, falloff, R0) {
    const S = Math.ceil(R0 * 2);
    return sprite(['halo', col, falloff.toFixed(2), R0].join('|'), S, S, 0, c => {
      const g = c.createRadialGradient(R0, R0, 0, R0, R0, R0);
      for (let i = 0; i <= 8; i++) { const u = i / 8; g.addColorStop(u, `rgba(${col},${Math.pow(1 - u, falloff * 1.6) * (u < 1 ? 1 : 0)})`); }
      c.fillStyle = g; c.fillRect(0, 0, S, S); });
  }
  function figCenter(fig) { return { x: fig.x + fig.w / 2, y: fig.y + fig.h * 0.52, r: Math.max(fig.w, fig.h) * 0.5 }; }
  function lightEnv(P, e, settleRel) { // rises at the pop, peaks, falls to the rest level by the time the light settles
    const up = eo(seg(e, 0, 0.25)), down = 1 - eio(seg(e, Math.max(0.4, settleRel), Math.max(0.4, settleRel) + P['light.settle']));
    return up * (P['halo.rest'] + (1 - P['halo.rest']) * down);
  }
  function famHalo(ctx, P, fam, e, fig, settleRel) {
    const I = P['halo.int'] * P['light.int']; if (I <= 0 || !fig || e < 0) return;
    const c = figCenter(fig), col = hexRgb(P['halo.col']);
    let rad = c.r * 1.25 * P['halo.size']; const ex = P['halo.expand'];
    if (ex > 0) rad *= 1 + ex * eo(seg(e, 0.1, 1.2)) * (1 - 0.5 * seg(e, 1.2, 2.2));
    rad = Math.min(rad, 560);
    const a = lightEnv(P, e, settleRel) * I * (fam === 'ceremony' ? 1.1 : 1);
    if (a <= 0.004) return;
    const R0 = 256, sp = haloSprite(col, P['halo.falloff'], R0);
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha *= Math.min(1, a); ctx.drawImage(sp, c.x - rad, c.y - rad, rad * 2, rad * 2); ctx.restore();
  }
  function famRays(ctx, P, fam, e, fig, seed) {
    const n = Math.round(P['rays.n']); if (n <= 0 || e < 0 || !fig) return;
    const d = P['rays.dur'], a = bell(e, 0, Math.min(0.35, d * 0.3), d) * P['light.int'] * (fam === 'jewel' ? 0.85 : 0.75); if (a <= 0.004) return;
    const c = figCenter(fig), col = hexRgb(P['light.col']), L = P['rays.len'], wdt = P['rays.w'], spread = P['rays.spread'] * Math.PI / 180;
    const key = ['rays', fam, col, n, L, wdt, P['rays.soft'], P['rays.spread'], P['rays.dist'], seed].join('|'), S = Math.ceil(L * 2 + 80), O = S / 2;
    const sp = sprite(key, S, S, P['rays.soft'], cc => { const rg = rng(seed * 7 + 3);
      for (let i = 0; i < n; i++) {
        let ang = -Math.PI / 2 + (spread >= 6.2 ? (i / n) * Math.PI * 2 : (n > 1 ? (i / (n - 1) - 0.5) * spread : 0));
        let len = L * (fam === 'jewel' ? (i % 2 ? 0.62 : 1) : 0.85 + 0.15 * Math.sin(i * 2.3));
        if (P['rays.dist'] === 'random') { ang += (rg() - 0.5) * spread / n; len *= 0.7 + 0.3 * rg(); }
        const g = cc.createLinearGradient(O, O, O + Math.cos(ang) * len, O + Math.sin(ang) * len);
        g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.12, `rgba(${col},${fam === 'jewel' ? 0.95 : 0.55})`); g.addColorStop(1, `rgba(${col},0)`);
        cc.fillStyle = g; cc.beginPath();
        if (fam === 'jewel') { // needle: thin, crisp, pointed at both ends
          const wd = wdt * 0.6; cc.moveTo(O + Math.cos(ang) * len * 0.08, O + Math.sin(ang) * len * 0.08); cc.lineTo(O + Math.cos(ang - wd) * len * 0.35, O + Math.sin(ang - wd) * len * 0.35); cc.lineTo(O + Math.cos(ang) * len, O + Math.sin(ang) * len); cc.lineTo(O + Math.cos(ang + wd) * len * 0.35, O + Math.sin(ang + wd) * len * 0.35);
        } else { // soft beam: rounded wide end, never a hard triangle (blur does the rest)
          const wd = wdt; cc.moveTo(O + Math.cos(ang - wd * 0.3) * len * 0.1, O + Math.sin(ang - wd * 0.3) * len * 0.1); cc.quadraticCurveTo(O + Math.cos(ang - wd) * len * 0.7, O + Math.sin(ang - wd) * len * 0.7, O + Math.cos(ang - wd * 0.6) * len, O + Math.sin(ang - wd * 0.6) * len);
          cc.quadraticCurveTo(O + Math.cos(ang) * len * 1.05, O + Math.sin(ang) * len * 1.05, O + Math.cos(ang + wd * 0.6) * len, O + Math.sin(ang + wd * 0.6) * len); cc.quadraticCurveTo(O + Math.cos(ang + wd) * len * 0.7, O + Math.sin(ang + wd) * len * 0.7, O + Math.cos(ang + wd * 0.3) * len * 0.1, O + Math.sin(ang + wd * 0.3) * len * 0.1);
        }
        cc.closePath(); cc.fill();
      } });
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha *= Math.min(1, a); ctx.translate(c.x, c.y); ctx.rotate(P['rays.spin'] * e * 2); ctx.drawImage(sp, -O, -O); ctx.restore();
  }
  function glintSpots(im, sz, fig, P, n, seed) { // positions on the silhouette, away from the face
    const inf = alphaInfo(im), s = fig.w / im.width, pts = [], place = P['glint.place'], rg = rng(seed * 13 + 5);
    if (place === 'accents' && fig.glints && fig.glints.length) { for (let i = 0; i < n; i++) { const g = fig.glints[i % fig.glints.length]; pts.push([fig.x + g[0] * fig.w + (i >= fig.glints.length ? (rg() - .5) * 20 : 0), fig.y + g[1] * fig.h]); } return pts; }
    if (place === 'around') { for (let i = 0; i < n; i++) { const ang = -Math.PI * (0.15 + 0.7 * ((i + 0.5) / n)) + (rg() - .5) * 0.3, rr0 = Math.max(fig.w, fig.h) * (0.5 + 0.12 * rg()); pts.push([fig.x + fig.w / 2 + Math.cos(ang) * rr0, fig.y + fig.h * 0.5 + Math.sin(ang) * rr0 * 0.8]); } return pts; }
    // edge: top contour points, excluding the central face column below the top of the head
    const cand = []; const x0 = inf.minX, x1 = inf.maxX, faceL = x0 + (x1 - x0) * 0.32, faceR = x0 + (x1 - x0) * 0.68;
    for (let x = x0; x <= x1; x += 6) { const ty = inf.top[x]; if (ty < 0) continue; const relY = (ty - inf.minY) / (inf.maxY - inf.minY); if (x > faceL && x < faceR && relY > 0.12) continue; cand.push([x, ty, relY]); }
    cand.sort((a, b) => a[2] - b[2]); const pick = cand.slice(0, Math.max(n * 4, 8));
    for (let i = 0; i < n && pick.length; i++) { const p = pick[Math.floor(rg() * pick.length)]; pts.push([fig.x + p[0] * s, fig.y + p[1] * s + 3]); }
    return pts;
  }
  function glintShape(ctx, x, y, r, a, col, shape) {
    if (a <= 0.01) return;
    if (shape === 'cross') { ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1, r * 0.12); ctx.beginPath(); ctx.moveTo(x - r * 1.3, y); ctx.lineTo(x + r * 1.3, y); ctx.moveTo(x, y - r * 1.3); ctx.lineTo(x, y + r * 1.3); ctx.stroke(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r * 0.18, 0, 7); ctx.fill(); ctx.restore(); return; }
    if (shape === 'dot') { ctx.save(); ctx.globalAlpha *= a; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(0.35, col.replace('rgb(', 'rgba(').replace(')', ',0.5)')); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore(); return; }
    star4(ctx, x, y, r, a, col);
  }
  function famGlints(ctx, P, fam, e, fig, im, sz, seed) {
    const n = Math.round(P['glint.n']); if (n <= 0 || !fig || !im) return;
    const t0 = P['glint.t0'], dur = P['glint.dur'], step = P['glint.rhythm']; if (e < t0 || e > t0 + dur + step * n + 0.05) return;
    const pts = glintSpots(im, sz, fig, P, n, seed), col = fam === 'jewel' ? 'rgb(255,251,240)' : 'rgb(255,246,226)';
    pts.forEach(([x, y], i) => { const s0 = t0 + i * step, a = bell(e, s0, s0 + dur * 0.35, s0 + dur) * P['light.int']; ctx.save(); ctx.globalCompositeOperation = 'screen'; glintShape(ctx, x, y, P['glint.size'] * (0.75 + 0.25 * ((i * 37) % 7) / 6), a, col, P['glint.shape']); ctx.restore(); });
  }
  function famParticles(ctx, P, fam, e, seed) {
    const n = Math.round(P['part.n']); if (n <= 0 || e < 0) return;
    const life = P['part.life'], emit = fam === 'forest' ? 0.5 : 0.25; if (e > emit + life + 0.05) return;
    const rg = rng(seed * 31 + 11), col = hexRgb(P['light.col']), dir = P['part.dir'] * Math.PI / 180, spread = P['part.spread'] * Math.PI / 180, sp = P['part.speed'], wand = P['part.wander'];
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < n; i++) {
      const tb = rg() * emit, ang = dir + (rg() - 0.5) * spread, v = sp * (0.6 + 0.4 * rg()), x0 = CX + (rg() - 0.5) * EW * 0.62, ph = rg() * 6.28, sz = P['part.size'] * (0.6 + 0.6 * rg()), age = e - tb;
      if (age < 0 || age > life) continue; const u = age / life;
      const dist = v * age * (1 - 0.35 * u), x = x0 + Math.cos(ang) * dist + Math.sin(ph + age * 3.1) * wand * u, y = SEAM_Y - 6 + Math.sin(ang) * dist;
      const a = Math.min(1, bell(u, 0, 0.15, 1) * P['light.int'] * (fam === 'jewel' ? 1 : 0.85));
      if (fam === 'jewel') { glintShape(ctx, x, y, sz * 1.6, a, 'rgb(255,250,236)', 'star4'); }
      else { const g = ctx.createRadialGradient(x, y, 0, x, y, sz * 2.2); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(0.45, `rgba(${col},${a * 0.45})`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.fillRect(x - sz * 2.2, y - sz * 2.2, sz * 4.4, sz * 4.4); }
    }
    ctx.restore();
  }
  function famTrails(ctx, P, fam, e, seed) {
    const n = Math.round(P['trail.n']); if (n <= 0 || e < 0) return; const dur = P['trail.dur']; if (e > dur + 0.05) return;
    const rg = rng(seed * 17 + 2), col = hexRgb(fam === 'forest' ? P['light.col'] : P['light.halo']), u = seg(e, 0, dur), a = (1 - u) * 0.85 * P['light.int'], reach = P['trail.reach'], len = P['trail.len'], cv = P['trail.curve'];
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1, k = Math.floor(i / 2), sx = side < 0 ? R.seam[0][0] + 10 * k : R.seam[R.seam.length - 1][0] - 10 * k, sy = SEAM_Y;
      const ang = -Math.PI / 2 + side * (0.75 - 0.18 * k + (rg() - 0.5) * 0.15), ex = sx + Math.cos(ang) * reach, ey = sy + Math.sin(ang) * reach;
      const mx = (sx + ex) / 2 - side * cv * reach * 0.45, my = (sy + ey) / 2 - Math.abs(cv) * reach * 0.15;
      const at = v => { const q = 1 - v; return [q * q * sx + 2 * q * v * mx + v * v * ex, q * q * sy + 2 * q * v * my + v * v * ey]; };
      const h1 = eo(u), h0 = Math.max(0, h1 - len), N = 14;
      for (const pass of [0, 1]) { ctx.beginPath(); for (let j = 0; j <= N; j++) { const p = at(lerp(h0, h1, j / N)); j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
        const p0 = at(h0), p1 = at(h1), g = ctx.createLinearGradient(p0[0], p0[1], p1[0], p1[1]), cc = pass ? '255,252,244' : col; g.addColorStop(0, `rgba(${cc},0)`); g.addColorStop(1, `rgba(${cc},${Math.min(1, a * (pass ? 1 : 0.7))})`);
        ctx.strokeStyle = g; ctx.lineWidth = pass ? (fam === 'jewel' ? 2 : 3) : (fam === 'forest' ? 10 : 8); ctx.filter = pass ? 'none' : 'blur(4px)'; ctx.stroke(); }
      ctx.filter = 'none';
    }
    ctx.restore();
  }
  function famAccent(ctx, P, fam, e, fig) {
    const shape = P['accent.shape'], I = P['accent.int'] * P['light.int']; if (shape === 'none' || I <= 0 || !fig) return;
    const t0 = P['accent.t0'], d = P['accent.dur']; if (e < t0 || e > t0 + d + 0.05) return;
    const u = seg(e, t0, t0 + d), c = figCenter(fig), col = hexRgb(P['accent.col']), E = P['accent.ext'];
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    if (shape === 'burst') { const a = (1 - eio(u)) * I;
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, (160 + 90 * eo(u)) * E); g.addColorStop(0, `rgba(${col},${Math.min(1, 0.4 * a)})`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.fillRect(c.x - 300 * E, c.y - 300 * E, 600 * E, 600 * E);
      for (let i = 0; i < 12; i++) { const ang = i * Math.PI / 6 + 0.13, r0 = (c.r * 0.75 + 50 * eo(u)) * E, r1 = r0 + (60 + 70 * eo(u) * (i % 2 ? 0.6 : 1)) * E; ctx.strokeStyle = `rgba(${col},${Math.min(1, a)})`; ctx.lineWidth = i % 2 ? 3 : 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(c.x + Math.cos(ang) * r0, c.y + Math.sin(ang) * r0); ctx.lineTo(c.x + Math.cos(ang) * r1, c.y + Math.sin(ang) * r1); ctx.stroke(); }
    } else if (shape === 'flare') { const a = bell(u, 0, 0.18, 1) * I, L = c.r * 1.5 * E * (0.7 + 0.3 * eo(u)), y = c.y - c.r * 0.15;
      for (const [w2, al] of [[10, 0.35], [3, 1]]) { for (const rot of [0, Math.PI / 2]) { ctx.save(); ctx.translate(c.x, y); ctx.rotate(rot + 0.08); const g = ctx.createLinearGradient(-L, 0, L, 0); g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.5, `rgba(${col},${Math.min(1, a * al)})`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, rot ? L * 0.6 : L, w2 * E, 0, 0, 7); ctx.fill(); ctx.restore(); } }
      const g = ctx.createRadialGradient(c.x, y, 0, c.x, y, 60 * E); g.addColorStop(0, `rgba(255,255,255,${Math.min(1, a * 0.5)})`); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(c.x - 60 * E, y - 60 * E, 120 * E, 120 * E);
    } else if (shape === 'bloom') { const a = Math.sin(Math.PI * Math.min(1, u * 1.6)) * (1 - u) * I, rad = (c.r * 0.6 + c.r * 1.3 * eo(u)) * E;
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, rad); g.addColorStop(0, `rgba(${col},${Math.min(1, 0.6 * a)})`); g.addColorStop(0.45, `rgba(${col},${Math.min(1, 0.28 * a)})`); g.addColorStop(0.75, `rgba(226,236,255,${Math.min(1, 0.1 * a)})`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g; ctx.fillRect(c.x - rad, c.y - rad, rad * 2, rad * 2);
    }
    ctx.restore();
  }
  function famAnticipation(ctx, P, fam, r, t, pop) {
    const rel = t - pop, I = P['seam.int'], h = hexRgb(P['light.halo']), wm = P['seam.width'], A = P['open.anticip'];
    let mode = P['seam.mode']; if (mode === 'off' || I <= 0) return;
    if (mode === 'rarity') mode = r === 'rare' || fam === 'jewel' ? 'run' : 'glow';
    const tier = RARITIES.indexOf(r);
    if (mode === 'run') { seamRun(ctx, seg(rel, -A * 0.85, -0.02), bell(rel, -A * 0.9, -A * 0.55, 0.04) * I, h, P['seam.runLen'] * (fam === 'jewel' ? 0.6 : 1), wm * (fam === 'jewel' ? 0.6 : 1)); if (fam === 'jewel' && tier >= 3) seamGlow(ctx, eo(seg(rel, -0.25, -0.02)) * 0.8 * I, h, 1.6 * wm); return; }
    const flick = fam === 'forest' ? 0.85 + 0.15 * Math.sin(t * 23) * Math.sin(t * 7.3) : 1;
    seamGlow(ctx, eo(seg(rel, -A * (0.4 + 0.12 * tier), -0.02)) * (0.6 + 0.1 * tier) * I * flick, h, (2 + 0.3 * tier) * wm);
  }

  // =====================================================================================
  // opening styles · anticipation, lid path, halves
  // =====================================================================================
  function anticipationPose(P, style, r, t, pop) { // egg rotation + lift + tremor while closed
    const wob = P['open.wobble'] * Math.PI / 180, sp = P['open.wobbleSpeed'], A = Math.max(0.05, P['open.anticip']), knock = P['open.knock'];
    let rot = 0, hop = 0, dx = 0, dy = 0;
    if (style === 'base') {
      const tp = Math.min(t, A), pp = A; // the pause (if any) is still
      if (r === 'mythic') { const u = tp / (pp - 0.3); if (u < 1) { const env = Math.sin(Math.PI * clamp(u)); rot = wob * Math.sin(2 * Math.PI * 6 * sp * tp) * env * env; } }
      else if (r === 'legendary') { const env = Math.sin(Math.PI * clamp(tp / pp)); rot = wob * Math.sin(2 * Math.PI * 5 * sp * tp) * env; }
      else { const env = Math.sin(Math.PI * clamp(tp / pp)); rot = wob * Math.sin(2 * Math.PI * 6.5 * sp * tp) * env * env; }
      if (knock > 0 && t < A) hop = knock * (bell(t, A * 0.35, A * 0.42, A * 0.5) + bell(t, A * 0.68, A * 0.75, A * 0.83));
    } else if (style === 'collect') { // contained: two precise settles, almost no rotation
      const u = clamp(t / A); rot = wob * 0.25 * Math.sin(2 * Math.PI * 3 * sp * t) * Math.sin(Math.PI * u);
      hop = (2.5 + knock * 0.4) * (bell(u, 0.18, 0.24, 0.34) + bell(u, 0.55, 0.61, 0.72));
    } else { // magic: the egg breathes with the inner light, a slow sway
      const u = clamp(t / A); rot = wob * 0.55 * Math.sin(2 * Math.PI * 1.6 * sp * t) * Math.sin(Math.PI * u); hop = 4 * eo(u) * (1 - seg(u, 0.85, 1)) + knock * 0.3 * bell(u, 0.6, 0.7, 0.85);
    }
    const tr = P['open.tremor']; if (tr > 0 && t < A) { const env = seg(t, A * 0.45, A); dx = tr * env * Math.sin(t * 91); dy = tr * 0.5 * env * Math.sin(t * 73 + 1); }
    return { rot, hop, dx, dy };
  }
  function lidPath(P, style, rel, lidRestX, lidRestY, lrot) {
    const sp = P['lid.speed'] || 1, ld = P['lid.liftDur'], landT = P['lid.landT'], x1 = CX + P['lid.side'], y1 = SEAM_Y - P['lid.height'], r1 = P['lid.tilt'];
    let lx, ly, lr;
    if (style === 'collect') { // straight lift, brief hold, then a precise slide to the side and down
      const u1 = seg(rel, 0, ld), u2 = seg(rel, ld + 0.06, landT);
      const xa = CX + P['lid.side'] * 0.15, ya = SEAM_Y - P['lid.height'];
      if (rel < ld + 0.06) { lx = lerp(CX, xa, eio(u1)); ly = lerp(SEAM_Y, ya, eio(u1)); lr = lerp(0, r1 * 0.25, eio(u1)); }
      else { lx = lerp(xa, lidRestX, eo(u2)); ly = lerp(ya, lidRestY, eio(u2)) - P['lid.arc'] * 0.4 * Math.sin(Math.PI * u2); lr = lerp(r1 * 0.25, lrot, eio(u2)); }
    } else if (style === 'magic') { // floats up slowly, drifts aside and settles gently
      const u1 = seg(rel, 0, ld * 1.6), u2 = seg(rel, ld * 1.6, landT + 0.3);
      if (rel < ld * 1.6) { lx = lerp(CX, x1, esin(u1)); ly = lerp(SEAM_Y, y1 - 30, eo(u1)); lr = lerp(0, r1 * 0.6, esin(u1)); }
      else { lx = lerp(x1, lidRestX, esin(u2)); ly = lerp(y1 - 30, lidRestY, eio(u2)) - P['lid.arc'] * 0.5 * Math.sin(Math.PI * u2); lr = lerp(r1 * 0.6, lrot, eio(u2)); }
    } else {
      const u1 = seg(rel, 0, ld), u2 = seg(rel, ld, landT);
      if (rel < ld) { lx = lerp(CX, x1, eo(u1)); ly = lerp(SEAM_Y, y1, eo(u1)); lr = lerp(0, r1, eo(u1)); }
      else { lx = lerp(x1, lidRestX, eio(u2)); ly = lerp(y1, lidRestY, ei(u2)) - P['lid.arc'] * Math.sin(Math.PI * u2); lr = lerp(r1, lrot, eio(u2)); }
    }
    const end = style === 'magic' ? landT + 0.3 : landT, b = seg(rel, end, end + 0.35); if (b > 0) lr = lrot + P['lid.bob'] * (style === 'collect' ? 0.4 : 1) * Math.sin(b * Math.PI * 2) * (1 - b);
    return { lx, ly, lr, landed: rel >= end };
  }

  // creature path (bottom y "B" and scale k) per appearance style; the clip under the rim stays the same for all
  function creaturePath(P, style, rel, sz, L, sy) {
    const k0 = sz.k0, h0 = (sz.inf.maxY - sz.inf.minY) * sz.s * k0, sp = P['fig.exitSpeed'];
    const figH0 = (sz.inf.maxY - sz.inf.minY) * sz.s; // tall figures emerge a little less so their top never leaves the canvas (24 px margin, scene offset included)
    const Bs = R.rimMax + h0 + 6, Bpeek = R.rimMax + h0 * 0.45, Bout = Math.max(R.rimMin - 14, figH0 + 24 - (sy || 0)), Bhigh = Bout - P['fig.exitHeight'];
    const dly = creatureDelay(P), r = (rel - dly) * sp; let B, k = k0;
    const desc0 = appearTimes(P).desc0;
    const figH = (sz.inf.maxY - sz.inf.minY) * sz.s, room = Math.max(0, Bout - figH - 24 + (sy || 0)); // never above the top of the canvas (sy = the scene's vertical offset)
    if (style === 'magic') { // slow rise out of the shell, keeps rising while it grows, hovers with a gentle bob, soft descent
      const top = Bout - Math.min(130, room);
      if (r < 0.2) B = Bs;
      else if (r < 1.1) B = lerp(Bs, Bout, eio(seg(r, 0.2, 1.1)));
      else if (rel < desc0) { const g = seg(r, 1.1, 1.9); B = lerp(Bout, top, esin(g)) + 7 * Math.sin((r - 1.1) * 4.2) * seg(r, 1.5, 1.9); k = lerp(k0, 1, esin(g)); }
      else { k = 1; const u = seg(rel, desc0, desc0 + L.desc); B = lerp(top + 7 * Math.sin((desc0 * sp - dly * sp - 1.1) * 4.2), G, (EASE[L.ease] || eio)(u)); }
    } else if (style === 'solemn') { // slow straight rise, grows as it reaches a high pose, holds still a beat, then comes down
      const top = Bout - Math.min(70, room);
      if (r < 0.4) B = Bs;
      else if (r < 1.0) B = lerp(Bs, Bout, eio(seg(r, 0.4, 1.0)));
      else if (rel < desc0) { const g = seg(r, 1.0, 1.5); B = lerp(Bout, top, eio(g)); k = lerp(k0, 1, eio(g)); }
      else { k = 1; const u = seg(rel, desc0, desc0 + L.desc); B = lerp(top, G, (EASE[L.ease] || ei)(u)); }
    } else if (style === 'leap') { // pops out fast and jumps high in an arc before landing
      const top = Bout - Math.min(170, room);
      if (r < 0.08) B = Bs;
      else if (r < 0.4) B = lerp(Bs, Bout, eo(seg(r, 0.08, 0.4)));
      else if (rel < desc0) { const g = seg(r, 0.4, 0.78); B = lerp(Bout, top, eo(g)); k = lerp(k0, 1, eo(g)); }
      else { k = 1; const u = seg(rel, desc0, desc0 + L.desc); B = lerp(top, G, ei(u)); }
    } else {
      if (r < X.PEEK0) B = Bs;
      else if (r < X.PEEK1) B = lerp(Bs, Bpeek, eo(seg(r, X.PEEK0, X.PEEK1)));
      else if (r < X.OUT0) B = Bpeek + 3 * Math.sin(Math.PI * seg(r, X.PEEK1, X.OUT0));
      else if (r < X.OUT1) B = lerp(Bpeek, Bout, eio(seg(r, X.OUT0, X.OUT1)));
      else if (rel < desc0) { const g = seg(r, X.OUT1, X.GROW1); B = lerp(Bout, Bhigh, eo(g)); k = lerp(k0, 1, eo(g)); }
      else { k = 1; const u = seg(rel, desc0, desc0 + L.desc); const e = L.ease === 'inout' ? eio(u) : L.ease === 'in' ? ei(u) : (EASE[L.ease] || ei)(u); B = lerp(Bhigh, G, e); }
    }
    const tau = rel - desc0 - L.desc; if (tau > 0) B = G - L.off(tau);
    const outT = style === 'magic' ? 1.1 : style === 'solemn' ? 1.0 : style === 'leap' ? 0.4 : X.OUT1;
    return { B, k, inside: r < outT };
  }
  function landOf(P) {
    const amp = P['bounce.amp'], fr = P['bounce.freq'], dp = P['bounce.damp'], ov = P['land.overshoot'], osc = P['bounce.mode'] === 'osc';
    return { desc: P['land.desc'], ease: P['land.ease'], settle: P['land.settle'],
      off: osc ? (tau => amp * Math.exp(-dp * tau) * Math.sin(fr * tau) - ov * Math.exp(-dp * 1.4 * tau) * (tau < 0.3 ? 1 : 0))
        : (tau => amp * Math.exp(-dp * tau) * Math.abs(Math.sin(fr * tau)) - (ov > 0 ? ov * Math.exp(-14 * tau) * Math.sin(Math.min(Math.PI, tau * 18)) : 0)) };
  }

  // =====================================================================================
  // text blocks
  // =====================================================================================
  function fitSize(ctx, txt, weight, fam, max, min, maxW) { let z = max; ctx.font = `${weight} ${z}px ${fam}`; while (z > min && ctx.measureText(txt).width > maxW) { z -= 1; ctx.font = `${weight} ${z}px ${fam}`; } return fitText(ctx, txt, `${weight} ${z}px ${fam}`, maxW); }
  function fitText(ctx, txt, font, maxW) { ctx.font = font; if (ctx.measureText(txt).width <= maxW) return txt; let s = txt; while (s.length > 2 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1); return s + '…'; }
  const UIM = { plaque: { w: 897, h: 325, inner: [68, 58, 828, 267], gems: [[32, 164], [866, 164]] }, bar: { w: 1015, h: 68, groove: [58, 15, 964, 31] }, luck: { w: 386, h: 452, glass: [83, 76, 247, 362] }, pedestal: { w: 729, h: 405, disc: [165, 71, 561, 231] }, luckArt: {"a": {"w": 983,"h": 222,"inner": [13,13,968,194],"cap": 166,"pad": 90},"b": {"w": 942,"h": 154,"inner": [81,12,856,149],"cap": 119,"pad": 127},"c": {"seal": {"w": 824,"h": 833},"cart": {"w": 892,"h": 323,"cap": 200,"padL": 83,"padR": 68,"concave": 50,"inner": [75,56,832,266]},"cartH": 0.62}} };
  function artMode(P) { return P['plaque.art'] !== 'code' && R.ui && R.ui.plaque.length === 3; }
  function drawSliced(ctx, im, x, y, w, h) { // 3-slice: fixed ends, tiled middle (keeps the engraving undistorted)
    const s = h / im.height, capL = 150, capR = 150, midW = (im.width - capL - capR); const dl = capL * s, dr = capR * s;
    ctx.drawImage(im, 0, 0, capL, im.height, x, y, dl, h); ctx.drawImage(im, im.width - capR, 0, capR, im.height, x + w - dr, y, dr, h);
    ctx.drawImage(im, capL, 0, midW, im.height, x + dl - 0.5, y, w - dl - dr + 1, h); } // middle stretched (~1.3×): no seams
  function plaqueArt(ctx, P, x, y, w, h, clock) {
    const pl = R.ui.plaque, s = h / UIM.plaque.h;
    if (P['plaque.art'] === 'A') { const seq = [0, 1, 2, 1], per = 1.3, ph = (clock / per) % seq.length, i = Math.floor(ph), f = ph - i, k = clamp((f - 0.6) / 0.4);
      drawSliced(ctx, pl[seq[i]], x, y, w, h); if (k > 0) { ctx.save(); ctx.globalAlpha *= esin(k); drawSliced(ctx, pl[seq[(i + 1) % seq.length]], x, y, w, h); ctx.restore(); } return; }
    drawSliced(ctx, pl[0], x, y, w, h);
    // B · light sweep across the brass frame only (even-odd clip: plaque minus ivory panel), every 4.5 s
    const I = UIM.plaque.inner, ix = x + I[0] * s, iy = y + I[1] * s, iw = w - (I[0] + (UIM.plaque.w - I[2])) * s, ih = (I[3] - I[1]) * s, u = (clock % 4.5) / 1.4;
    if (u < 1) { ctx.save(); ctx.beginPath(); rr(ctx, x + 4, y + 4, w - 8, h - 8, 24 * s); rr(ctx, ix, iy, iw, ih, 14 * s); ctx.clip('evenodd');
      const gx = x - 120 + (w + 240) * esin(u), g = ctx.createLinearGradient(gx - 70, y, gx + 70, y + h * 0.4); g.addColorStop(0, 'rgba(255,244,214,0)'); g.addColorStop(0.5, 'rgba(255,244,214,0.55)'); g.addColorStop(1, 'rgba(255,244,214,0)');
      ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore(); }
    // gems breathe
    UIM.plaque.gems.forEach(([gx0, gy0], k) => { const gx = gx0 < UIM.plaque.w / 2 ? x + gx0 * s : x + w - (UIM.plaque.w - gx0) * s, gy = y + gy0 * s, a = 0.22 + 0.22 * Math.sin(clock * 2.1 + k * Math.PI);
      ctx.save(); ctx.globalCompositeOperation = 'screen'; const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 26 * s * 1.6); g.addColorStop(0, `rgba(170,255,200,${a})`); g.addColorStop(1, 'rgba(170,255,200,0)'); ctx.fillStyle = g; ctx.fillRect(gx - 50, gy - 50, 100, 100); ctx.restore(); });
  }
  function plaque(ctx, d, a, dy, P, info, clock) {
    if (a <= 0.003) return;
    const art = artMode(P);
    const band = d._lk && P['luck.style'] !== 'comic' && art ? P['luck.band'] : 0, PW = P['plaque.w'], PH = art ? 230 + Math.round(band * 0.4) + (band ? 5 : 0) : P['plaque.h'], rar = RAR[d.rarity] || RAR.common, x = CX - PW / 2, y = art ? P['plaque.y'] - 52 : P['plaque.y'], inner = art ? PW - 2 * 70 : PW - 2 * P['plaque.pad'];
    const rs = P['plaque.rarSize'], ws = P['plaque.rowSize'], ts = P['plaque.tagSize'];
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(0, dy);
    if (art) { ctx.save(); ctx.shadowColor = `rgba(16,24,20,${P['plaque.shadow']})`; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4; plaqueArt(ctx, P, x, y, PW, PH, clock || 0); ctx.restore(); }
    else {
    ctx.shadowColor = `rgba(16,24,20,${P['plaque.shadow']})`; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
    const bg = hexRgb(P['plaque.bg']), bgD = bg.split(',').map((v, i) => Math.round(+v * [0.955, 0.943, 0.906][i]));
    rr(ctx, x, y, PW, PH, 20); const g = ctx.createLinearGradient(0, y, 0, y + PH); g.addColorStop(0, `rgba(${bg},0.97)`); g.addColorStop(1, P['plaque.bg'] === '#f7f3e8' ? 'rgba(236,229,210,0.97)' : `rgba(${bgD.join(',')},0.97)`); ctx.fillStyle = g; ctx.fill();
    ctx.shadowColor = 'transparent'; rr(ctx, x + 6, y + 6, PW - 12, PH - 12, 15); ctx.strokeStyle = `rgba(${hexRgb(P['plaque.border'])},0.8)`; ctx.lineWidth = 1.5; ctx.stroke(); }
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.font = `600 ${rs}px Inter`; ctx.letterSpacing = '3px'; const rarW = ctx.measureText(rar.label).width; ctx.letterSpacing = '0px';
    let ns = P['plaque.nameSize']; ctx.font = `600 ${ns}px Fraunces`; const nameMax = inner - (24 + rarW + 18);
    while (ctx.measureText(d.name).width > nameMax && ns > P['plaque.nameMin']) { ns -= 2; ctx.font = `600 ${ns}px Fraunces`; }
    const name = fitText(ctx, d.name, `600 ${ns}px Fraunces`, nameMax); const nameW = ctx.measureText(name).width;
    let rx = CX - (24 + rarW + 18 + nameW) / 2; const r1 = (art ? y + 92 : y + P['plaque.top']) + band; // reserved top band for the inset cartouche: the text rows move into the plaque, never towards the dragon
    ctx.fillStyle = rar.col; ctx.save(); ctx.translate(rx + 8, r1 - 11); ctx.rotate(Math.PI / 4); ctx.fillRect(-7.5, -7.5, 15, 15); ctx.restore(); rx += 24;
    ctx.font = `600 ${rs}px Inter`; ctx.letterSpacing = '3px'; ctx.fillText(rar.label, rx, r1 - 2); ctx.letterSpacing = '0px'; rx += rarW + 18;
    ctx.fillStyle = TOK.jadeDeep; ctx.font = `600 ${ns}px Fraunces`; ctx.fillText(name, rx, r1 + 4);
    const tags = [d.isNew ? ['NEW', 'fill'] : ['+' + (d.crumbs || 0) + ' embers', 'line']]; if (d.shiny) tags.push(['SHINY', 'iri']);
    ctx.font = `700 ${ts}px Inter`; ctx.letterSpacing = '2px'; const tw = tags.map(([t]) => ctx.measureText(t).width + 24); ctx.letterSpacing = '0px';
    const tagsW = tw.reduce((a, b) => a + b + 12, -12);
    const LK = d._lk, inRow2 = LK && P['luck.strip'] === 'row2', GG = P['luck.gemGap'], GS = LK ? Math.min(P['luck.gemSize'], (inner * 0.42 - (LK.n - 1) * GG) / LK.n) : 0, gemsW = inRow2 ? LK.n * GS + (LK.n - 1) * GG + 16 : 0;
    const viewer = fitText(ctx, '@' + d.viewer, `500 ${ws}px Inter`, inner - tagsW - 22 - gemsW); ctx.font = `500 ${ws}px Inter`; const vW = ctx.measureText(viewer).width;
    let x2 = CX - (vW + 22 + gemsW + tagsW) / 2; const r2 = r1 + (art ? (band ? 43 : 44) : P['plaque.gap1']); // name descenders (y, g, p) clear the tag chips
    ctx.fillStyle = TOK.muted; ctx.fillText(viewer, x2, r2); x2 += vW + 22;
    if (inRow2) { luckGems(ctx, LK, x2 - 8, r2 - Math.round(ts * 0.42), GS, GG); x2 += gemsW; }
    const th = Math.round(ts * 1.385);
    tags.forEach(([t, kind], i) => { ctx.font = `700 ${ts}px Inter`; ctx.letterSpacing = '2px'; rr(ctx, x2, r2 - Math.round(ts * 1.04), tw[i], th, 8);
      if (kind === 'fill') { ctx.fillStyle = TOK.jade; ctx.fill(); ctx.fillStyle = TOK.ivory; }
      else if (kind === 'iri') { const gg = ctx.createLinearGradient(x2, 0, x2 + tw[i], 0); gg.addColorStop(0, '#f6c6dc'); gg.addColorStop(0.5, '#c4ecf7'); gg.addColorStop(1, '#d4f5cc'); ctx.fillStyle = gg; ctx.fill(); ctx.fillStyle = TOK.ink; }
      else { ctx.strokeStyle = TOK.brass; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = TOK.brassDeep; }
      ctx.fillText(t, x2 + 12, r2 - 1); ctx.letterSpacing = '0px'; x2 += tw[i] + 12; });
    if (inRow2) LK.anchor = [x2 - gemsW - 22 + LK.n * (GS + GG) - 8, r2 - ts];
    if (LK) { LK.top = y; LK.box = [x, y, PW, PH]; }
    const r3 = r2 + (art ? (band ? 36 : 38) : P['plaque.gap2']);
    let setTxt;
    if (LK && !inRow2) { // own strip on the set row: [set] [gems] [label] — the name row keeps all its room
      const lab = luckLabel(LK, P), full = `${d.setName}  ${d.setHave}/${d.setOf}`;
      ctx.font = `600 ${ws}px Inter`; ctx.letterSpacing = '1px'; const labW = lab ? ctx.measureText(lab).width : 0; ctx.letterSpacing = '0px';
      ctx.font = `500 ${ws}px Inter`; const fullW = ctx.measureText(full).width, room = inner - fullW - 24 - (lab ? 12 + labW : 0) - 8; // gems give way before any text does
      const gs3 = Math.max(10, Math.min(GS, (room - (LK.n - 1) * GG) / LK.n)), GSr = gs3, rowW = LK.n * GSr + (LK.n - 1) * GG;
      setTxt = fitText(ctx, full, `500 ${ws}px Inter`, inner - rowW - (lab ? 12 + labW : 0) - 24 - 6); ctx.font = `500 ${ws}px Inter`; const sW = ctx.measureText(setTxt).width;
      const tot = sW + 24 + rowW + (lab ? 12 + labW : 0); let x3 = CX - tot / 2; ctx.textAlign = 'left'; ctx.fillStyle = TOK.ink; ctx.fillText(setTxt, x3, r3); x3 += sW + 24;
      luckGems(ctx, LK, x3, r3 - Math.round(ws * 0.36), GSr, GG); LK.anchor = [x3 + rowW - GSr / 2, r3 - ws]; x3 += rowW + 12;
      if (lab) { ctx.font = `600 ${ws}px Inter`; ctx.letterSpacing = '1px'; ctx.fillStyle = lab.startsWith('NEXT') ? TOK.brassDeep : TOK.muted; ctx.fillText(lab, x3, r3); ctx.letterSpacing = '0px'; }
    } else { ctx.textAlign = 'center'; ctx.fillStyle = TOK.ink; setTxt = fitText(ctx, `${d.setName}  ${d.setHave}/${d.setOf}`, `500 ${ws}px Inter`, inner); ctx.font = `500 ${ws}px Inter`; ctx.fillText(setTxt, CX, r3); }
    if (LK) { if (P['luck.style'] === 'comic') luckPops(ctx, LK, P); else luckNotice(ctx, LK, P); if (info && LK.notice) info.luckNotice = { x: LK.notice.x, y: LK.notice.y + dy, w: LK.notice.w, h: LK.notice.h }; }
    ctx.restore();
    if (info) { info.plaque = { x, y: y + dy, w: PW, h: PH }; info.text = { nameTrunc: name !== d.name, nameSize: ns, viewerTrunc: viewer !== '@' + d.viewer, setTrunc: setTxt !== `${d.setName}  ${d.setHave}/${d.setOf}`, row3Bottom: r3 + ws * 0.25 + dy, row1Top: r1 - ns * 0.8 + dy, row2Width: vW + 22 + tagsW, inner }; }
  }
  // luck on the plaque: one gem per Common in a row for THIS viewer (engine pity); lights at the reveal, flashes and empties when the streak breaks
  function luckGems(ctx, L, x0, cy, gs, gg) { const on = R.ui && R.ui.ui_gem_on, off = R.ui && R.ui.ui_gem_off;
    const lit = L.u < 0 ? L.k0 : L.hit ? L.k0 : L.k1, pop = seg(L.u, 0, 0.35), fl = L.hit ? bell(L.u, 0, 0.12, 0.7) : 0, gone = L.hit ? seg(L.u, 0.45, 0.9) : 0;
    for (let i = 0; i < L.n; i++) { const x = x0 + i * (gs + gg) + gs / 2; let isOn = i < lit, sc = 1, a = 1;
      if (!L.hit && i === L.k1 - 1 && L.k1 > L.k0) { sc = 1 + 0.45 * Math.sin(Math.PI * pop) ; isOn = L.u >= 0; }
      if (L.hit && isOn) { a = 1 - gone; }
      const z = gs * sc; if (off) ctx.drawImage(off, x - gs / 2, cy - gs / 2, gs, gs); else { ctx.fillStyle = 'rgba(80,70,50,0.35)'; ctx.beginPath(); ctx.arc(x, cy, gs / 2 - 1, 0, 7); ctx.fill(); }
      if (isOn && a > 0.01) { ctx.save(); ctx.globalAlpha *= a; if (on) ctx.drawImage(on, x - z / 2, cy - z / 2, z, z); else { ctx.fillStyle = '#f2b63c'; ctx.beginPath(); ctx.arc(x, cy, z / 2 - 1, 0, 7); ctx.fill(); } ctx.restore(); }
      if ((!L.hit && i === L.k1 - 1 && L.k1 > L.k0 && pop > 0 && pop < 1) || (fl > 0.01 && i < L.k0)) glowDot(ctx, x, cy, 22, (fl || Math.sin(Math.PI * pop)) * 0.9, '255,214,120'); }
  }
  function luckLabel(L, P) { // derived from the real counter and threshold (n = engine pity − 1); hidden when the notice already says it
    if (L.hit && L.k0 >= L.n) return ''; // the notice says it
    const k = L.u < 0 ? L.k0 : L.hit ? (L.u < 0.45 ? L.k0 : 0) : L.k1, left = L.n + 1 - k;
    if (P['luck.label'] === 'state') return k >= L.n && !L.hit ? 'NEXT: RARE+' : '';
    if (k >= L.n) return ''; return 'RARE+ IN ' + left; }
  function luckState(L) { return L.hit && L.k0 >= L.n ? 'hit' : !L.hit && L.k1 >= L.n && L.k1 > L.k0 ? 'next' : null; }
  // the notice: a Gemini support (textless) + engine lettering. Same family for both states; they differ in motion only.
  function luckNotice(ctx, L, P) { const st = luckState(L); if (!st || !R.ui) return; if (st === 'next' && P['luck.label'] === 'state') return;
    const style = P['luck.style'], txt = st === 'next' ? P['luck.textNext'] : P['luck.textHit'];
    const u = L.u - 0.25, tin = P['luck.in'], hold = P['luck.hold'], tout = P['luck.out']; if (u < 0 || u > tin + hold + tout) return;
    const ain = eio(u / tin), aout = 1 - eio(clamp((u - tin - hold) / tout)), A = Math.min(ain, aout); if (A <= 0.01) return;
    const H = P['luck.size'], fs = P['luck.font'];
    ctx.save(); ctx.font = `700 ${fs}px Inter`; ctx.letterSpacing = (fs * P['luck.track']).toFixed(1) + 'px'; const tw = ctx.measureText(txt).width; ctx.letterSpacing = '0px'; ctx.restore();
    const g = luckGeom(style, H, tw); if (!g) return;
    // one anchor for both messages: the left end is fixed on the plaque frame, the width grows to the right (3-slice, the frame is never stretched)
    const [bx, by, bw] = L.box, an = P['luck.anchor']; let left = an === 'plaqueTL' ? bx + 70 : an === 'plaqueTC' ? bx + bw / 2 - g.w / 2 : an === 'gems' && L.anchor ? L.anchor[0] - g.w / 2 : bx + bw - 70 - g.w;
    left = clamp(left + P['luck.dx'], 6, W - g.w - 6); const cx = left + g.w / 2, bottom = by - P['luck.gap'];
    L.notice = { x: left, y: bottom - g.h, w: g.w, h: g.h }; // for layout checks (never over the figure)
    // entry: emerges from the frame edge (eased, no overshoot); text never moves or scales
    const rise = 0; // fades in on its place: no vertical travel, so it never touches the name row (or the dragon) while entering or leaving
    ctx.save(); ctx.globalAlpha *= A; ctx.translate(cx, bottom + rise);
    luckDrawSupport(ctx, style, g, st, u, tin);
    // every light effect is clipped to the cartouche itself: nothing spills onto the dragon
    ctx.save(); rr(ctx, -g.w / 2 + 2, -g.h + 2, g.w - 4, g.h - 4, g.h * 0.32); ctx.clip(); ctx.globalCompositeOperation = 'screen';
    if (st === 'next') { // two soft pulses of jade luminescence from inside, then stable
      const pk = P['luck.pulse'], p1 = bell(u, tin, tin + 0.35, tin + 0.9), p2 = bell(u, tin + 0.9, tin + 1.25, tin + 1.8), lum = pk * Math.max(p1, p2 * 0.85);
      if (lum > 0.01) { const gr = ctx.createRadialGradient(0, -g.h * 0.5, 0, 0, -g.h * 0.5, g.w * 0.55); gr.addColorStop(0, `rgba(140,235,180,${0.55 * lum})`); gr.addColorStop(1, 'rgba(140,235,180,0)'); ctx.fillStyle = gr; ctx.fillRect(-g.w / 2, -g.h, g.w, g.h); }
    } else { // one contained warm flash inside, then a brief reflection running along the brass
      const fl = bell(u, tin * 0.7, tin + 0.1, tin + 0.75); if (fl > 0.01) { const gr = ctx.createRadialGradient(0, -g.h * 0.5, 0, 0, -g.h * 0.5, g.w * 0.6); gr.addColorStop(0, `rgba(255,222,150,${0.45 * fl})`); gr.addColorStop(1, 'rgba(255,222,150,0)'); ctx.fillStyle = gr; ctx.fillRect(-g.w / 2, -g.h, g.w, g.h); }
      const sw = seg(u, tin + 0.35, tin + 1.15); if (sw > 0 && sw < 1 && P['luck.sheen'] > 0) { const gx = -g.w / 2 - 40 + (g.w + 80) * eio(sw), gr = ctx.createLinearGradient(gx - 26, 0, gx + 26, 0); gr.addColorStop(0, 'rgba(255,240,205,0)'); gr.addColorStop(0.5, `rgba(255,240,205,${0.55 * P['luck.sheen']})`); gr.addColorStop(1, 'rgba(255,240,205,0)'); ctx.fillStyle = gr; ctx.fillRect(-g.w / 2, -g.h, g.w, g.h); }
      const n = Math.round(P['luck.sparkN']), ac = bell(u, tin, tin + 0.2, tin + 0.8); for (let i = 0; i < n; i++) star4(ctx, -g.w / 2 + g.w * (i + 1) / (n + 1), -g.h + g.h * 0.16, P['luck.sparkSize'] * ac, ac, '#fff1d0');
    }
    ctx.restore();
    // lettering: always steady and legible
    const tc = g.textAt; ctx.font = `700 ${fs}px Inter`; ctx.letterSpacing = (fs * P['luck.track']).toFixed(1) + 'px'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = style === 'A' ? '#f4efe2' : style === 'B' ? '#1f4a3f' : '#24453b'; if (style === 'A') { ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 2; ctx.shadowOffsetY = 1; }
    ctx.fillText(txt, tc[0], tc[1] + 1); ctx.restore();
  }
  function luckGeom(style, H, tw) { const U = R.ui, M = UIM.luckArt || {};
    if (style === 'A' && U.ui_luck_a_tab) { const m = M.a, s = H / m.h, cap = m.cap * s, w = Math.max(m.w * s, tw + 2 * (m.pad * s)); return { w, h: H, s, textAt: [0, -H + (m.inner[1] + m.inner[3]) / 2 * s], accent: [0, -H * 0.5] }; }
    if (style === 'B' && U.ui_luck_b_ribbon) { const m = M.b, s = H / m.h, w = Math.max(m.w * s, tw + 2 * (m.pad * s)); return { w, h: H, s, textAt: [0, -H + (m.inner[1] + m.inner[3]) / 2 * s], accent: [0, -H * 0.5] }; }
    if (style === 'C' && U.ui_luck_c_seal && U.ui_luck_c_cartouche) { const m = M.c, sh = H, ss = sh / m.seal.h, ch = H * m.cartH, cs = ch / m.cart.h, cw = Math.max(m.cart.w * cs, tw + m.cart.padL * cs + m.cart.padR * cs), sw = m.seal.w * ss, ov = m.cart.concave * cs + sw * 0.1, w = sw + cw - ov;
      return { w, h: H, s: ss, sw, cw, ch, cs, ov, textAt: [-w / 2 + sw - ov + m.cart.padL * cs + (cw - m.cart.padL * cs - m.cart.padR * cs) / 2, -H / 2], accent: [-w / 2 + sw / 2, -H / 2] }; }
    return null; }
  function luckDrawSupport(ctx, style, g, st, u, tin) { const U = R.ui, M = UIM.luckArt;
    const sliced = (im, m, x, y, w, h) => { const s = h / im.height, cl = m.cap, cr = m.cap; ctx.drawImage(im, 0, 0, cl, im.height, x, y, cl * s, h); ctx.drawImage(im, im.width - cr, 0, cr, im.height, x + w - cr * s, y, cr * s, h); ctx.drawImage(im, cl, 0, im.width - cl - cr, im.height, x + cl * s - 0.5, y, w - (cl + cr) * s + 1, h); };
    if (style === 'A') sliced(U.ui_luck_a_tab, M.a, -g.w / 2, -g.h, g.w, g.h);
    else if (style === 'B') sliced(U.ui_luck_b_ribbon, M.b, -g.w / 2, -g.h, g.w, g.h);
    else if (style === 'C') { const x0 = -g.w / 2; sliced(U.ui_luck_c_cartouche, M.c.cart, x0 + g.sw - g.ov, -g.h / 2 - g.ch / 2, g.cw, g.ch);
      // the seal lights up progressively (engraving), then the gem gets a small accent
      ctx.drawImage(U.ui_luck_c_seal, x0, -g.h, g.sw, g.h); const lu = seg(u, tin * 0.3, tin + 0.5); if (lu > 0 && lu < 1) glowDot(ctx, x0 + g.sw / 2, -g.h / 2, g.sw * 0.45 * lu, 0.35 * Math.sin(Math.PI * lu), '255,226,150'); }
  }
  function luckPops(ctx, L, P) { if (!R.ui) return; const [ax, ay] = L.anchor || [0, 0];
    const show = (im, h, u0, len, dx, dy) => { if (!im) return; const u = L.u - u0; if (u < 0 || u > len) return; const out = clamp((u - (len - 0.25)) / 0.25), sc = spring(u / 0.45) * (1 - ei(out)); if (sc <= 0.02) return; const w = im.width * h / im.height;
      ctx.save(); ctx.globalAlpha *= 1 - out * 0.6; ctx.translate(ax + dx, ay + dy); ctx.rotate(-0.08 * (1 - Math.min(1, u / 0.5)) + 0.02 * Math.sin(u * 7)); ctx.scale(sc, sc); ctx.drawImage(im, 0, -h, w, h); ctx.restore(); };
    const up = (L.top || ay) - ay + 22; // tail sits on the plaque's top edge, right above the last gem; the bubble rises over free space
    if (!L.hit && L.k1 >= L.n && L.k1 > L.k0) show(R.ui.ui_pop_next_rare || R.ui.ui_pop_one_more, 150, 0.3, 2.2, -30, up + 10); // the row is full: the next egg is guaranteed
    if (L.hit && L.k0 >= L.n) { // the guarantee paid off: golden flash around the plaque + big LUCKY! burst
      const g = bell(L.u, 0, 0.15, 1.2); if (g > 0.01 && L.box) { const [bx, by, bw, bh] = L.box; ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha *= g; rr(ctx, bx - 4, by - 4, bw + 8, bh + 8, 28); ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(255,214,120,0.95)'; ctx.shadowColor = 'rgba(255,200,90,1)'; ctx.shadowBlur = 36; ctx.stroke(); ctx.restore(); }
      show(R.ui.ui_pop_lucky, 168, 0.05, 2.3, -70, up + 6); }
  }
  function hint(ctx, a, txt, P) {
    if (txt === '') return; txt = txt || 'Type !hatch to open an egg';
    if (a <= 0.003) return; ctx.save(); ctx.globalAlpha *= a; ctx.font = '500 30px Inter'; const tw = ctx.measureText(txt).width + 60, y = P['plaque.y'] + 50;
    ctx.shadowColor = 'rgba(16,24,20,0.18)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4; rr(ctx, CX - tw / 2, y, tw, 58, 29); ctx.fillStyle = 'rgba(244,239,226,0.95)'; ctx.fill(); ctx.shadowColor = 'transparent';
    rr(ctx, CX - tw / 2 + 5, y + 5, tw - 10, 48, 24); ctx.strokeStyle = 'rgba(168,135,79,0.7)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = TOK.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, CX, y + 30); ctx.restore();
  }
  function bar(ctx, have, of, P, info, clock) {
    const bw = 640, x = CX - bw / 2, y = P['bar.y'];
    ctx.save(); ctx.shadowColor = 'rgba(16,24,20,0.20)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
    rr(ctx, x - 18, y, bw + 36, 88, 18); ctx.fillStyle = 'rgba(244,239,226,0.95)'; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.fillStyle = TOK.jadeDeep; ctx.font = '700 28px Inter'; ctx.letterSpacing = '3px'; ctx.fillText('CHANNEL HOARD', x + 2, y + 35); ctx.letterSpacing = '0px';
    ctx.textAlign = 'right'; ctx.font = '500 28px Inter'; ctx.fillStyle = TOK.muted; ctx.fillText('found', x + bw - 2, y + 35);
    const fw0 = ctx.measureText('found').width; ctx.font = '600 32px Inter'; ctx.fillStyle = TOK.ink; ctx.fillText(`${have} / ${of}`, x + bw - 2 - fw0 - 10, y + 36);
    if (P['bar.art'] === 'art' && R.ui && R.ui.ui_bar_frame && R.ui.ui_bar_fill) { // generated rail + scale texture fill
      const fr = R.ui.ui_bar_frame, M = UIM.bar, rw = bw + 30, s = rw / M.w, rx = CX - rw / 2, ry = y + 43, rh = M.h * s;
      ctx.drawImage(fr, rx, ry, rw, rh);
      const gx = rx + M.groove[0] * s, gy = ry + M.groove[1] * s, gw = (M.groove[2] - M.groove[0]) * s, gh = (M.groove[3] - M.groove[1] + 1) * s, fw = have > 0 ? Math.max(gh, gw * Math.min(have, of) / of) : 0;
      if (fw > 0) { ctx.save(); rr(ctx, gx, gy, fw, gh, gh / 2); ctx.clip(); const tex = R.ui.ui_bar_fill, ts = (gh * 2.2) / tex.height, tw = tex.width * ts, off = ((clock || 0) * 6) % tw;
        for (let xx = gx - off; xx < gx + fw; xx += tw) ctx.drawImage(tex, xx, gy - gh * 0.6, tw, tex.height * ts);
        if (P['plaque.art'] === 'B') { const u = ((clock || 0) % 3) / 1.2; if (u < 1) { const sx = gx + fw * u, g = ctx.createLinearGradient(sx - 40, 0, sx + 40, 0); g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(0.5, 'rgba(255,240,200,0.6)'); g.addColorStop(1, 'rgba(255,240,200,0)'); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fillRect(gx, gy, fw, gh); } }
        ctx.restore(); }
      ctx.restore(); if (info) info.bar = { x: x - 18, y, w: bw + 36, h: 88 }; return;
    }
    const ty = y + 50, th = 24; rr(ctx, x, ty, bw, th, th / 2); ctx.fillStyle = '#e3dac4'; ctx.fill(); ctx.strokeStyle = TOK.brass; ctx.lineWidth = 2; ctx.stroke();
    const fwid = have > 0 ? Math.max(th, bw * Math.min(have, of) / of) : 0;
    if (fwid > 0) { ctx.save(); rr(ctx, x + 3, ty + 3, fwid - 6, th - 6, (th - 6) / 2); ctx.clip();
      const g = ctx.createLinearGradient(0, ty, 0, ty + th); g.addColorStop(0, '#3f7a69'); g.addColorStop(1, '#1f4a3f'); ctx.fillStyle = g; ctx.fillRect(x, ty, bw, th);
      ctx.strokeStyle = 'rgba(244,239,226,0.22)'; ctx.lineWidth = 1.5; for (let sx = x; sx < x + fwid + 20; sx += 14) for (let sy = ty - 6; sy < ty + th + 8; sy += 9) { ctx.beginPath(); ctx.arc(sx + ((sy / 9) % 2 ? 7 : 0), sy, 7, 0, Math.PI); ctx.stroke(); }
      ctx.restore(); }
    ctx.fillStyle = 'rgba(124,98,50,0.55)'; for (let i = 1; i < of; i++) { const nx = x + bw * i / of; ctx.fillRect(nx - 0.75, ty + th - 6, 1.5, 4); }
    ctx.restore();
    if (info) info.bar = { x: x - 18, y, w: bw + 36, h: 88 };
  }
  function queuePill(ctx, n, P, info) {
    if (!n) return; const txt = '+' + n + ' in line'; ctx.save(); ctx.font = '600 22px Inter'; const tw = ctx.measureText(txt).width + 28, th = 36;
    const pos = P['queue.pos'], by = P['bar.y'];
    let cx = W / 2 + 420, cy = by + 44; if (pos === 'above' || (P['x.embers'] === 'on' && pos !== 'left')) { cx = W / 2 + 338 - tw / 2; cy = by - 26; } else if (pos === 'left') { cx = W / 2 - 420; cy = by + 44; }
    rr(ctx, cx - tw / 2, cy - th / 2, tw, th, th / 2); ctx.fillStyle = 'rgba(31,74,63,0.92)'; ctx.fill(); ctx.strokeStyle = 'rgba(168,135,79,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#f4efe2'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, cx, cy + 1); ctx.restore();
    if (info) info.queue = { x: cx - tw / 2, y: cy - th / 2, w: tw, h: th };
  }

  // =====================================================================================
  // extras (presentation only: they show data the engine already has; no rule changes)
  // =====================================================================================
  function pedestal(ctx, alpha) { if (alpha <= 0.01) return; ctx.save(); ctx.globalAlpha *= alpha;
    if (R.ui && R.ui.ui_pedestal) { const im = R.ui.ui_pedestal, M = UIM.pedestal, w = 420, sc = w / M.w, cyD = (M.disc[1] + M.disc[3]) / 2; ctx.drawImage(im, CX - w / 2, G + 4 - cyD * sc, w, M.h * sc); ctx.restore(); return; }
    const w = 360, top = G + 2, ry = 22, side = 16; // code placeholder (jade base, brass rim, ivory cushion)
    let g = ctx.createLinearGradient(0, top, 0, top + side + ry); g.addColorStop(0, '#2c6656'); g.addColorStop(1, '#173b31'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(CX, top + side, w / 2, ry, 0, 0, Math.PI); ctx.lineTo(CX - w / 2, top); ctx.ellipse(CX, top, w / 2, ry, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
    g = ctx.createLinearGradient(CX - w / 2, 0, CX + w / 2, 0); g.addColorStop(0, '#8a6a32'); g.addColorStop(0.5, '#e6c681'); g.addColorStop(1, '#8a6a32'); ctx.strokeStyle = g; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(CX, top, w / 2, ry, 0, 0, 7); ctx.stroke();
    g = ctx.createRadialGradient(CX, top - 4, 10, CX, top, w / 2); g.addColorStop(0, '#f6efdc'); g.addColorStop(1, '#d9ccad'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(CX, top, w / 2 - 8, ry - 5, 0, 0, 7); ctx.fill();
    [-0.75, -0.25, 0.25, 0.75].forEach(k => { ctx.fillStyle = '#6fbf93'; ctx.beginPath(); ctx.arc(CX + k * w / 2 * 0.98, top + side * 0.6 + ry * Math.sqrt(1 - k * k) * 0.9, 4, 0, 7); ctx.fill(); });
    ctx.restore(); }
  function idleEgg(ctx, s, clock) { // breathing egg, a periodic nudge with a seam glint, and the silhouette of a missing dragon peeking out
    const cyc = clock % 7, nud = bell(cyc, 4.6, 4.8, 5.2), rot = 0.03 * Math.sin(cyc * 28) * nud, br = 1 + 0.008 * Math.sin(clock * 1.7);
    const tp = clock % 11, peek = bell(tp, 7.5, 8.4, 9.8);
    if (s.tease && peek > 0.01) { const im = s.tease, inf = alphaInfo(im), h = 300, sc = h / (inf.maxY - inf.minY), w = im.width * sc;
      const k = 'tease|' + imgId(im), sp = sprite(k, im.width, im.height, 0, c => { c.drawImage(im, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = '#0d1a16'; c.fillRect(0, 0, im.width, im.height); });
      ctx.save(); ctx.globalAlpha *= 0.8 * peek; ctx.drawImage(sp, CX - inf.supportX * sc + 130, G - 200 - (inf.maxY) * sc + 170 * eo(peek) , w, im.height * sc); ctx.restore(); }
    ctx.save(); ctx.translate(CX, G); ctx.rotate(rot); ctx.scale(br, br); ctx.translate(-CX, -G); piece(ctx, R.egg_closed, CX, G, 268, 748, 0); ctx.restore();
    const gl = bell(cyc, 4.7, 4.9, 5.5); if (gl > 0.01) seamRun(ctx, seg(cyc, 4.7, 5.4), gl, '255,190,90', 0.22, 0.8);
  }
  function barGeom(P) { const bw = 640, x = CX - bw / 2, y = P['bar.y'], art = P['bar.art'] === 'art' && R.ui && R.ui.ui_bar_frame;
    if (art) { const M = UIM.bar, rw = bw + 30, sc = rw / M.w, rx = CX - rw / 2, ry = y + 43; return { gx: rx + M.groove[0] * sc, gy: ry + M.groove[1] * sc, gw: (M.groove[2] - M.groove[0]) * sc, gh: (M.groove[3] - M.groove[1] + 1) * sc }; }
    return { gx: x, gy: y + 50, gw: bw, gh: 24 }; }
  function luckGauge(ctx, P, s, t, tl) { // streak towards the guaranteed rare (engine pity): fills with every common, bursts when the streak breaks
    if (s.luck == null) return;
    let v = clamp(s.luck), burst = 0; const cx = 70, cy = P['bar.y'] + 42;
    if (t != null && tl) { const h0 = tl.plaqueIn + 1.1;
      if (s.luckHit) { burst = bell(t, h0 - 0.05, h0 + 0.15, h0 + 1.0); v = lerp(v, 0, eio(seg(t, h0 + 0.35, h0 + 1.2))); }
      else if (s.luckAfter != null) v = lerp(v, clamp(s.luckAfter), eio(seg(t, h0, h0 + 0.6))); }
    const ck = s.clock != null ? s.clock : (t || 0);
    ctx.save();
    if (R.ui && R.ui.ui_luck_egg && R.ui.ui_luck_mask) { const im = R.ui.ui_luck_egg, M = UIM.luck, ih = 100, sc = ih / M.h, iw = M.w * sc, x0 = cx - iw / 2, y0 = cy - ih / 2;
      const gy0 = M.glass[1], gy1 = M.glass[3], lvl = gy1 - (gy1 - gy0) * v;
      if (v > 0.003) { const fc = sprite('luckfill|' + Math.round(lvl), M.w, M.h, 0, c => { c.drawImage(R.ui.ui_luck_mask, 0, 0); c.globalCompositeOperation = 'source-in'; const g = c.createLinearGradient(0, lvl, 0, gy1); g.addColorStop(0, '#ffe7a0'); g.addColorStop(0.25, '#f2c25a'); g.addColorStop(1, '#c4841c'); c.fillStyle = g; c.fillRect(0, lvl, M.w, M.h); c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(255,250,225,0.9)'; c.fillRect(0, lvl, M.w, 5); });
        ctx.drawImage(im, x0, y0, iw, ih); ctx.save(); ctx.globalAlpha *= 0.9; ctx.drawImage(fc, x0, y0, iw, ih); ctx.restore(); }
      else ctx.drawImage(im, x0, y0, iw, ih); }
    else { const w = 56, h = 74; ctx.beginPath(); ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, 7); ctx.fillStyle = 'rgba(244,239,226,0.95)'; ctx.fill(); ctx.save(); ctx.clip(); const fy = cy + h / 2 - h * v, g = ctx.createLinearGradient(0, fy, 0, cy + h / 2); g.addColorStop(0, '#ffe28a'); g.addColorStop(1, '#c98a1c'); ctx.fillStyle = g; ctx.fillRect(cx - w, fy, w * 2, h); ctx.restore(); ctx.lineWidth = 3; ctx.strokeStyle = TOK.brass; ctx.beginPath(); ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, 7); ctx.stroke(); }
    const near = v > 0.85 && !s.rm ? 0.25 + 0.25 * Math.sin(ck * 6) : 0, ga = Math.max(burst, near);
    if (ga > 0.01) glowDot(ctx, cx, cy, 80 + 30 * burst, ga, '255,214,120');
    if (burst > 0.01) for (let i = 0; i < 6; i++) { const ang = i / 6 * Math.PI * 2 + 0.3, d = 30 + 40 * eo(seg(t, tl.plaqueIn + 1.05, tl.plaqueIn + 1.7)); star4(ctx, cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, 7, burst, '#fff1cc'); }
    ctx.restore();
    // what the egg is: a translucent game-style tooltip that pops up from time to time (the engine decides when: s.luckTip),
    // only while nothing else is in that corner (before the plaque arrives)
    const bm = P['x.luckBadge']; if (bm && bm !== 'off' && t != null && tl && s.luckTip !== false && !s.rm && R.ui && R.ui.ui_clover_solo) { const t0 = 0.25, t1 = Math.min(tl.plaqueIn - 0.25, 3.0); if (t1 - t0 > 1.2) luckBadge(ctx, cx, cy, t - t0, t1 - t0, ck, bm); }
  }
  // Gemini art: a glowing clover pops up beside the crystal egg, then a comic bubble bounces out of it; both leave on their own
  const spring = (u) => u <= 0 ? 0 : u >= 1 ? 1 : 1 - Math.exp(-6 * u) * Math.cos(10 * u);
  function luckBadge(ctx, ex, ey, u, len, ck, mode) {
    if (u < 0 || u > len) return; const out = clamp((u - (len - 0.3)) / 0.3), A = 1 - ei(out);
    const cl = R.ui.ui_clover_solo, ch = 76, cw = cl.width * ch / cl.height, ccx = ex + 46, ccy = ey - 92 + 3 * Math.sin(ck * 3.1);
    const sc = spring(u / 0.55) * (1 - 0.6 * ei(out)); if (sc > 0.02) {
      glowDot(ctx, ccx, ccy, 60, (0.35 + 0.15 * Math.sin(ck * 5)) * A * Math.min(1, u / 0.3), '255,220,130');
      ctx.save(); ctx.globalAlpha *= A; ctx.translate(ccx, ccy); ctx.rotate(0.12 * (1 - Math.min(1, u / 0.6)) * Math.sin(u * 14)); ctx.scale(sc, sc); ctx.drawImage(cl, -cw / 2, -ch / 2, cw, ch); ctx.restore();
      const gl = seg(u, 0.35, 0.9); if (gl > 0 && gl < 1) star4(ctx, ccx - cw * 0.28 + cw * 0.56 * gl, ccy - ch * 0.3 + ch * 0.2 * gl, 9 * Math.sin(Math.PI * gl), A, '#fff6d8'); }
    const im = mode === 'your' ? R.ui.ui_pop_your_luck : mode === 'luck' ? R.ui.ui_pop_luck : mode === 'ur' ? R.ui.ui_pop_ur_luck : null; if (!im) return;
    const pu = u - 0.5; if (pu <= 0) return; const ph = mode === 'your' ? 112 : mode === 'luck' ? 88 : 80, pw = im.width * ph / im.height;
    const ps = spring(pu / 0.45) * (1 - ei(out)), ax = ccx + cw * 0.18, ay = ccy - ch * 0.32; // tail anchor: bottom-left of the bubble sits on the clover
    if (ps <= 0.02) return; ctx.save(); ctx.globalAlpha *= A; ctx.translate(ax, ay); ctx.rotate(-0.10 * (1 - Math.min(1, pu / 0.5)) + 0.02 * Math.sin(ck * 4)); ctx.scale(ps, ps); ctx.drawImage(im, 0, -ph, pw, ph); ctx.restore();
  }
  function luckTip(ctx, ex, ey, u, len, ck) {
    if (u < 0 || u > len) return; const a = Math.min(eo(u / 0.3), 1 - ei(clamp((u - (len - 0.35)) / 0.35))); if (a <= 0.01) return;
    const w = 340, h = 104, x = 16, y = ey - 52 - h - 14 + 8 * (1 - eo(u / 0.35)), r = 14, tw = 0.5 + 0.5 * Math.sin(ck * 5.2);
    ctx.save(); ctx.globalAlpha *= a;
    ctx.save(); ctx.shadowColor = `rgba(255,214,120,${0.35 + 0.35 * tw})`; ctx.shadowBlur = 14 + 10 * tw; rr(ctx, x, y, w, h, r); ctx.fillStyle = 'rgba(14,38,32,0.74)'; ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.moveTo(ex - 9, y + h); ctx.lineTo(ex, y + h + 11); ctx.lineTo(ex + 9, y + h); ctx.closePath(); ctx.fillStyle = 'rgba(14,38,32,0.74)'; ctx.fill();
    rr(ctx, x + 0.75, y + 0.75, w - 1.5, h - 1.5, r); ctx.lineWidth = 1.5; ctx.strokeStyle = `rgba(232,200,130,${0.55 + 0.4 * tw})`; ctx.stroke();
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.font = '800 30px Inter'; ctx.letterSpacing = '5px'; ctx.fillStyle = '#ffe7a0'; ctx.shadowColor = 'rgba(255,200,90,0.7)'; ctx.shadowBlur = 8 * tw; ctx.fillText('LUCK', x + 18, y + 38); ctx.letterSpacing = '0px'; ctx.shadowBlur = 0;
    ctx.font = '600 22px Inter'; ctx.fillStyle = 'rgba(244,239,226,0.95)'; ctx.fillText('Grows with every Common', x + 18, y + 68); ctx.fillText('Full = Rare or better', x + 18, y + 94);
    const sw = seg(u, 0.35, 1.2); if (sw > 0 && sw < 1) { ctx.save(); rr(ctx, x, y, w, h, r); ctx.clip(); const gx = x - 60 + (w + 120) * sw, g = ctx.createLinearGradient(gx - 50, 0, gx + 50, 0); g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(0.5, 'rgba(255,240,200,0.18)'); g.addColorStop(1, 'rgba(255,240,200,0)'); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore(); }
    ctx.restore(); }
  function emberJar(ctx, P, s, t, tl) { const cx = 934, cy = P['bar.y'] + 40, n = s.embers || 0; ctx.save();
    if (R.ui && R.ui.ui_ember_jar) { const im = R.ui.ui_ember_jar, ih = 92, iw = im.width * ih / im.height; ctx.drawImage(im, cx - iw / 2, cy + 2 - ih / 2, iw, ih); }
    else { rr(ctx, cx - 26, cy - 28, 52, 62, 12); ctx.fillStyle = 'rgba(255,240,220,0.18)'; ctx.fill(); ctx.strokeStyle = TOK.brass; ctx.lineWidth = 3; ctx.stroke(); rr(ctx, cx - 22, cy + 4, 44, 26, 8); const g = ctx.createLinearGradient(0, cy, 0, cy + 30); g.addColorStop(0, '#ffb24a'); g.addColorStop(1, '#c8461c'); ctx.fillStyle = g; ctx.fill(); ctx.fillStyle = TOK.brass; ctx.fillRect(cx - 28, cy - 34, 56, 9); }
    ctx.font = '700 22px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = '#f4efe2'; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4; ctx.fillText(String(n), cx, cy - 52); ctx.restore(); }
  function emberFlight(ctx, P, s, t, tl) { if (s.isNew || t == null) return; const t0 = tl.plaqueIn + 0.45; const sx = CX + 150, sy = P['plaque.y'] + 100, ex = 934, ey = P['bar.y'] + 40;
    for (let i = 0; i < 7; i++) { const u = seg(t, t0 + i * 0.06, t0 + 0.75 + i * 0.06); if (u <= 0 || u >= 1) continue; const x = lerp(sx, ex, eio(u)) + Math.sin(u * 7 + i) * 12, y = lerp(sy, ey, eio(u)) - 120 * Math.sin(Math.PI * u);
      ctx.save(); ctx.globalCompositeOperation = 'screen'; const g = ctx.createRadialGradient(x, y, 0, x, y, 12); g.addColorStop(0, 'rgba(255,190,90,1)'); g.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = g; ctx.fillRect(x - 12, y - 12, 24, 24); ctx.restore(); } }
  function flyToBar(ctx, P, s, t, tl, f) { if (t == null || !f) return 0; const t1 = tl.settle + 1.3, t0 = t1 - 0.75; const bg = barGeom(P), have = s.chHave, ex = bg.gx + bg.gw * Math.min(have, s.chOf) / s.chOf - 6, ey = bg.gy + bg.gh / 2;
    const u = seg(t, t0, t1); if (u > 0 && u < 1) { const im = s.shiny && s.shinyImg ? s.shinyImg : s.img, sx = f.x + f.w / 2, sy = f.y + f.h * 0.45, x = lerp(sx, ex, eio(u)), y = lerp(sy, ey, eio(u)) - 160 * Math.sin(Math.PI * u), sc = lerp(0.35, 0.08, eio(u)) * (f.w / im.width);
      ctx.save(); ctx.globalAlpha *= 1 - 0.3 * u; ctx.drawImage(im, x - im.width * sc / 2, y - im.height * sc / 2, im.width * sc, im.height * sc); ctx.restore();
      for (let i = 1; i <= 4; i++) { const uu = Math.max(0, u - i * 0.05), xx = lerp(sx, ex, eio(uu)), yy = lerp(sy, ey, eio(uu)) - 160 * Math.sin(Math.PI * uu); star4(ctx, xx, yy, 6 - i, 0.6 - i * 0.12, '#fff1cc'); } }
    arrival(ctx, t, t1, ex, ey);
    return t1; }
  function arrival(ctx, t, t1, ex, ey, quiet, noPlus) {
    const a = bell(t, t1 - 0.02, t1 + 0.1, t1 + 0.8); if (a > 0.01) { const gr = Math.max(24, Math.min(60, H - 18 - ey)); ctx.save(); ctx.globalCompositeOperation = 'screen'; const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, gr); g.addColorStop(0, `rgba(255,230,160,${a})`); g.addColorStop(1, 'rgba(255,230,160,0)'); ctx.fillStyle = g; ctx.fillRect(ex - gr, ey - gr, 2 * gr, 2 * gr); ctx.restore(); // the arrival glow stays inside the bottom margin
      if (!quiet) for (let i = 0; i < 5; i++) { const ang = -Math.PI / 2 + (i - 2) * 0.5, d = 60 * eo(seg(t, t1, t1 + 0.6)); coin(ctx, ex + Math.cos(ang) * d, ey + Math.sin(ang) * d, 8, t * 9 + i, a); }
      if (!noPlus) { ctx.save(); ctx.globalAlpha *= a; ctx.font = '800 34px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffe9a8'; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 6; ctx.fillText('+1', ex, ey - 30 - 30 * eo(seg(t, t1, t1 + 0.8))); ctx.restore(); } } }
  const LIGHT_OF = r => ({ common: '#ffe6b0', rare: '#9fd4ff', epic: '#d6b4ff', legendary: '#ffd27a', mythic: '#ffc4dd' })[r] || '#ffe6b0';
  function slotXY(P, s) { const bg = barGeom(P); return [bg.gx + bg.gw * Math.min(s.chHave, s.chOf) / s.chOf - 6, bg.gy + bg.gh / 2]; }
  function glowDot(ctx, x, y, r, a, col) { if (a <= 0.01 || r <= 0.5) return; ctx.save(); ctx.globalCompositeOperation = 'screen'; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,255,245,${a})`); g.addColorStop(0.35, `rgba(${col},${a * 0.85})`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.restore(); }
  function lightSprite(im) { return sprite('white|' + imgId(im), im.width, im.height, 0, c => { c.drawImage(im, 0, 0); c.globalCompositeOperation = 'source-in'; const g = c.createLinearGradient(0, 0, 0, im.height); g.addColorStop(0, '#fffdf2'); g.addColorStop(1, '#ffe2a0'); c.fillStyle = g; c.fillRect(0, 0, im.width, im.height); }); }
  // the WHOLE dragon goes into the collection at the end of the presentation (t0..t1); box = where it was standing (canvas coords)
  function flyBig(ctx, P, s, t, mode, t0, t1, box, im, col, grows) {
    if (t < t0 || !box) return; const [ex, ey] = slotXY(P, s), cx0 = box.x + box.w / 2, cy0 = box.y + box.h / 2;
    const at = (u) => { const mx = (cx0 + ex) / 2 + (ex > cx0 ? 80 : -80), my = Math.min(cy0, ey) - 300; const v = 1 - u; return [v * v * cx0 + 2 * v * u * mx + u * u * ex, v * v * cy0 + 2 * v * u * my + u * u * ey]; };
    const img = (x, y, sc, rot, a, src) => { if (a <= 0.01 || sc <= 0.005) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.drawImage(src || im, -box.w * sc / 2, -box.h * sc / 2, box.w * sc, box.h * sc); ctx.restore(); };
    if (mode === 'whole') { // crouch, jump, fly in an arc while shrinking, with ghost copies and a sparkle trail
      const tc = t0 + 0.22;
      if (t < tc) { const c = bell(t, t0, t0 + 0.12, tc); ctx.save(); ctx.translate(cx0, box.y + box.h); ctx.scale(1 + 0.07 * c, 1 - 0.12 * c); ctx.translate(-cx0, -(box.y + box.h)); img(cx0, cy0, 1, 0, 1); ctx.restore(); return; }
      const u = seg(t, tc, t1), dir = ex > cx0 ? 1 : -1, sc = u => lerp(1, 0.05, ei(u)), rot = u => dir * 0.45 * Math.sin(Math.PI * Math.min(1, u * 1.3));
      if (u < 1) { for (let i = 4; i >= 1; i--) { const uu = Math.max(0, u - i * 0.045); const [x, y] = at(ei(uu)); img(x, y, sc(uu), rot(uu), 0.16 * (5 - i) / 4 * (u > 0.02 ? 1 : 0), lightSprite(im)); }
        for (let i = 0; i < 10; i++) { const uu = Math.max(0, u - i * 0.03); const [x, y] = at(ei(uu)); star4(ctx, x + Math.sin(i * 2.1) * 14, y + Math.cos(i * 1.7) * 14, 9 - i * 0.7, 0.8 - i * 0.07, '#fff1cc'); }
        const [x, y] = at(ei(u)); img(x, y, sc(u), rot(u), 1); img(x, y, sc(u), rot(u), 0.6 * ei(u), lightSprite(im)); }
      if (u > 0.85) glowDot(ctx, ex, ey, 40, bell(u, 0.85, 1, 1.01), col);
      arrival(ctx, t, t1, ex, ey, false, !grows); return; }
    // capture (contained): brief turn to light, collapse into a small orb, a thin streak to the bar, one accent on arrival
    const tA = t0 + 0.4, tB = tA + 0.22, uA = seg(t, t0, tA), uB = seg(t, tA, tB), uC = seg(t, tB, t1);
    if (t < tB) { const sc = 1 - ei(uB);
      img(cx0, cy0, sc, 0, 1 - uB * 0.6); img(cx0, cy0, sc, 0, eo(uA), lightSprite(im));
      glowDot(ctx, cx0, cy0, Math.max(box.w, box.h) * 0.45, 0.22 * eo(uA) * (1 - uB), col);
      for (let i = 0; i < 4; i++) { const ang = i / 4 * Math.PI * 2 + 0.6 + uA, rr0 = Math.max(box.w, box.h) * 0.48 * (1 - eio(uA * 0.6 + uB * 0.4)); star4(ctx, cx0 + Math.cos(ang) * rr0, cy0 + Math.sin(ang) * rr0 * 0.8, 6, 0.7 * bell(uA, 0, 0.5, 1.02), '#fff4d8'); }
      glowDot(ctx, cx0, cy0, 14 + 12 * uB, uB, col); return; }
    if (uC < 1) { for (let i = 9; i >= 1; i--) { const uu = Math.max(0, uC - i * 0.022); const [x, y] = at(eio(uu)); glowDot(ctx, x, y, 12 - i * 0.9, 0.55 * (1 - i / 10), col); }
      const [x, y] = at(eio(uC)); glowDot(ctx, x, y, 24, 1, col); }
    arrival(ctx, t, t1, ex, ey, true, !grows);
  }
  function wall(ctx, s) { const L = (s.wall || []).slice(0, 3); if (!L.length) return; const x = 24, y = 24, w = 560, rh = 40, h = 52 + rh * L.length;
    ctx.save(); rr(ctx, x, y, w, h, 14); ctx.fillStyle = 'rgba(22,58,49,0.88)'; ctx.fill(); ctx.strokeStyle = 'rgba(201,164,94,0.8)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = '700 20px Inter'; ctx.letterSpacing = '3px'; ctx.fillStyle = '#e9d6a6'; ctx.textBaseline = 'middle'; ctx.fillText('RECENT TREASURES', x + 18, y + 26); ctx.letterSpacing = '0px';
    L.forEach((e, i) => { const yy = y + 52 + rh * i + rh / 2 - 4, rar = RAR[e.rarity] || RAR.common; ctx.fillStyle = rar.col; ctx.beginPath(); ctx.arc(x + 26, yy, 7, 0, 7); ctx.fill(); ctx.font = '600 24px Inter'; ctx.fillStyle = '#f4efe2'; ctx.fillText(fitText(ctx, e.viewer, '600 24px Inter', 200), x + 42, yy); ctx.font = '600 24px Fraunces'; ctx.fillStyle = '#e9d6a6'; ctx.fillText(fitText(ctx, (e.shiny ? '✦ ' : '') + e.name, '600 24px Fraunces', 290), x + 250, yy); });
    ctx.restore(); }

  // =====================================================================================
  // main draw
  // s = { t (seconds since the opening started, or null = idle), img, shinyImg, id, name, rarity, profile, calib, shiny, isNew, crumbs, viewer,
  //       setName, setHave, setOf, chHave, chHaveBefore, chOf, hold, rm, glints, hint, queue, seed, cfg, debug }
  // =====================================================================================
  function draw(ctx, s) {
    ctx.clearRect(0, 0, W, H);
    if (!R.ready) return;
    const info = s.debug ? { warnings: [] } : null;
    if (s.t != null && !s.img) s = Object.assign({}, s, { img: missingArt(), shinyImg: null }); // never crash on a missing asset
    const idle = s.t == null;
    if (idle) { const P0 = resolve(s.cfg, { rarity: 'common', profile: 'compact', id: '' }); const sy = P0['layout.sceneY'] + (artMode(P0) ? -52 : 0);
      const ck = s.clock || 0;
      ctx.save(); if (sy) ctx.translate(0, sy); if (P0['x.pedestal'] === 'on') pedestal(ctx, 1); shadow(ctx, CX, G - 2, EW, 36, 0.30); if (P0['x.idle'] === 'on') idleEgg(ctx, s, ck); else piece(ctx, R.egg_closed, CX, G, 268, 748, 0); ctx.restore();
      if (P0['x.wall'] === 'on') wall(ctx, s);
      hint(ctx, 1, s.hint, P0); bar(ctx, s.chHave, s.chOf, P0, info, ck); if (P0['x.luck'] === 'on') luckGauge(ctx, P0, s, null, null); if (P0['x.embers'] === 'on') emberJar(ctx, P0, s, null, null); queuePill(ctx, s.queue, P0, info); return info; }
    const t = s.t, r = s.rarity in RAR ? s.rarity : 'common', rm = !!s.rm;
    const P = resolve(s.cfg, { rarity: r, profile: s.profile || legacyProfile(s.land), id: s.id, shiny: !!s.shiny });
    const style = P['open.style'], appear = P['appear.style'], fam = P['light.family'];
    const hold = holdOf(P, s), tl = times(P, rm, hold), dur = tl.end, OUT = P['timing.outro'];
    const seed = P['fx.seed'] > 0 ? Math.round(P['fx.seed']) : (s.seed || 1);
    const mul = (s.calib || 1) * P['fig.scale'];
    const im = s.shiny && s.shinyImg ? s.shinyImg : s.img; const sz = sizeOf(s.img, mul, s.anchor); let szI = sz; if (im !== s.img) { const ii = anchored(alphaInfo(im), s.anchor); szI = { inf: ii, k0: sz.k0, s: sz.s * ((sz.inf.maxY - sz.inf.minY) / (ii.maxY - ii.minY)) }; }
    const outro = 1 - seg(t, dur - OUT, dur - OUT * 0.3), back = seg(t, dur - OUT * 0.6, dur);
    const flyM = P['x.fly'], grows = s.chHave > s.chHaveBefore, flyBigM = !rm && (flyM === 'whole' || flyM === 'capture'), xFly = !rm && flyM !== 'off' && (grows || flyBigM); // the capture always closes the reveal; the bar only grows (+1) when the channel finds it for the first time
    const flyT1 = flyBigM ? dur - OUT + 0.05 : tl.settle + 1.3, flyT0 = flyBigM ? flyT1 - (flyM === 'whole' ? 1.0 : 1.0) : flyT1 - 0.75, flyArr = flyT1;
    const flyGone = flyBigM && t >= flyT0;
    const chShown = t < (xFly && grows ? flyArr : tl.settle) ? s.chHaveBefore : s.chHave;
    const xHud = (tt) => { if (P['x.luck'] === 'on') luckGauge(ctx, P, s, tt, tl); if (P['x.embers'] === 'on') emberJar(ctx, P, Object.assign({}, s, { embers: (s.embers || 0) - (!s.isNew && tt < tl.plaqueIn + 1.25 ? (s.crumbs || 0) : 0) }), tt, tl); };
    let figF = null;
    const iriT0 = tl.pop + P['iri.t0'];
    const shinyFx = s.shiny ? { p: seg(t, iriT0, iriT0 + P['iri.speed']), a: rm ? 0.25 * bell(t, tl.pop, tl.pop + 0.3, tl.settle + 0.6) : bell(t, iriT0 - 0.05, iriT0 + 0.25, iriT0 + 0.8) * P['iri.int'] } : null;
    const rimCol = r === 'mythic' ? '#fff4e2' : r === 'legendary' ? '#ffe2a8' : '#ffe6c0';
    const rimRest = P['rim.rest'], rimExit = P['rim.exit'];
    const LCOL = hexRgb(P['light.col']);
    const sceneY = P['layout.sceneY'] + (artMode(P) ? -52 : 0), figDX = P['fig.dx'], figDY = P['fig.dy'];
    const qn = s.queue || 0;

    if (rm) { // reduce motion: no wobble, no bounce; crossfade egg -> figure at its final place, same information
      const u = seg(t, tl.pop, tl.pop + 0.5);
      ctx.save(); if (sceneY) ctx.translate(0, sceneY);
      if (P['x.pedestal'] === 'on') pedestal(ctx, outro); shadow(ctx, CX, G - 2, EW, 36, 0.30 * (1 - u)); piece(ctx, R.egg_closed, CX, G, 268, 748, 0, 1 - eo(u));
      ctx.restore(); hint(ctx, 1 - seg(t, 0, tl.pop), s.hint, P); ctx.save(); if (sceneY) ctx.translate(0, sceneY);
      const ga = bell(t, tl.pop, tl.pop + 0.3, tl.settle + 0.8) * 0.5 * P['light.int']; if (ga > 0) { ctx.save(); ctx.globalCompositeOperation = 'screen'; const g = ctx.createRadialGradient(CX, G - 220, 0, CX, G - 220, 300); g.addColorStop(0, `rgba(${LCOL},${Math.min(1, ga)})`); g.addColorStop(1, `rgba(${LCOL},0)`); ctx.fillStyle = g; ctx.fillRect(CX - 300, G - 520, 600, 600); ctx.restore(); }
      const figW = im.width * szI.s; shadow(ctx, CX + figDX, G - 1, figW * P['cshadow.size'], 26, (P['cshadow.op'] - 0.02) * eo(u) * outro, P['cshadow.soft']);
      const f = figureDraw(ctx, im, szI, CX + figDX, G + figDY, 1, rimRest, rimCol, null, eo(u) * outro, shinyFx);
      ctx.restore();
      plaque(ctx, s, eo(seg(t, tl.plaqueIn, tl.plaqueIn + 0.35)) * outro, 0, P, info, s.clock != null ? s.clock : t);
      if (back > 0) { ctx.save(); if (sceneY) ctx.translate(0, sceneY); piece(ctx, R.egg_closed, CX, G, 268, 748, 0, eo(back)); ctx.restore(); hint(ctx, eo(seg(t, dur - 0.12, dur)), s.hint, P); }
      bar(ctx, chShown, s.chOf, P, info, s.clock != null ? s.clock : (s.t || 0)); xHud(t); queuePill(ctx, qn, P, info);
      if (info) { info.fig = { x: f.x, y: f.y + sceneY, w: f.w, h: f.h }; info.tl = tl; info.P = P; checkLayout(info); }
      return info;
    }

    const pop = tl.pop, rel = t - pop, L = landOf(P);
    ctx.save(); if (sceneY) ctx.translate(0, sceneY);
    // A · closed + anticipation
    if (t < pop) {
      const pose = anticipationPose(P, style, r, t, pop);
      if (P['x.pedestal'] === 'on') pedestal(ctx, 1);
      shadow(ctx, CX, G - 2, EW * (1 - pose.hop / 120), 36, 0.30);
      piece(ctx, R.egg_closed, CX + pose.dx, G - pose.hop + pose.dy, 268, 748, pose.rot);
      if (fam === 'base') baseAnticipation(ctx, P, r, t, pop); else famAnticipation(ctx, P, fam, r, t, pop);
      if (style === 'magic') { const u = seg(t, 0, pop); const a = ei(u) * 0.5 * P['light.int']; if (a > 0.01) { const g = ctx.createRadialGradient(CX, SEAM_Y, 0, CX, SEAM_Y, EW * 0.7); g.addColorStop(0, `rgba(${LCOL},${a})`); g.addColorStop(1, `rgba(${LCOL},0)`); ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fillRect(CX - EW, SEAM_Y - EW * 0.7, EW * 2, EW * 1.4); ctx.restore(); } }
      ctx.restore();
      hint(ctx, 1 - seg(t, 0, Math.min(0.3, pop)), s.hint, P);
      bar(ctx, chShown, s.chOf, P, info, s.clock != null ? s.clock : (s.t || 0)); xHud(t); queuePill(ctx, qn, P, info);
      if (info) { info.tl = tl; info.P = P; info.phase = 'anticipation'; }
      return info;
    }
    // geometry for the open phases
    const figHalfL = sz.inf.supportX * sz.s, figHalfR = (s.img.width - sz.inf.supportX) * sz.s;
    const lowX = Math.min(W - EW / 2 - 14, CX + figDX + figHalfR + P['split.gap'] + EW * 0.35);
    const lrot = P['lid.rest']; let lmaxY = -1e9, lminX = 1e9, lmaxX = -1e9; { const li = R.lid_i, c = Math.cos(lrot), sn = Math.sin(lrot); for (let x = 0; x < li.top.length; x += 3) { const ty = li.top[x]; if (ty < 0) continue; for (const py of [ty, 447]) { const X0 = (x - 268) * ES, Y0 = (py - SEAM_PIECE) * ES; const rx = X0 * c - Y0 * sn, ry = X0 * sn + Y0 * c; lmaxY = Math.max(lmaxY, ry); lminX = Math.min(lminX, rx); lmaxX = Math.max(lmaxX, rx); } } }
    let lidRestX = Math.max(CX + figDX - figHalfL - 30 - lmaxX, 12 - lminX); const lidRestY = G - lmaxY - 1;
    let { lx, ly, lr, landed } = lidPath(P, style, rel, lidRestX, lidRestY, lrot);
    // shells withdraw after landing
    const exitMode = P['shell.exit'], ws0 = tl.settle + P['shell.hold'];
    const wd = exitMode === 'keep' ? 0 : seg(t, ws0, ws0 + P['shell.exitDur']), shellA = exitMode === 'keep' ? 1 : 1 - eio(wd);
    const drift = exitMode === 'side' ? P['shell.drift'] : 0, sink = exitMode === 'sink' ? P['shell.drift'] * 0.8 * eio(wd) : 0;
    const lowXo = Math.min(lowX + drift * eo(wd), W - EW * 0.5), lidXo = Math.max(lidRestX - drift * eo(wd), lidRestX - drift);
    const sStart = P['split.start'], sEnd = P['split.end'];
    if (landed) lx = lidXo;
    const su = seg(rel, sStart, sEnd); const hx = rel < sEnd ? lerp(CX, lowX, eio(su)) : lowXo, hr = 0.03 * Math.sin(Math.PI * su);
    const LIP = eo(seg(rel, 0, 0.10));
    // creature path
    const cp = creaturePath(P, appear, rel, sz, L, sceneY + figDY); let B = cp.B + figDY; const k = cp.k, inside = cp.inside;
    // contemplation float (after settling, never during the landing)
    const fl = P['fig.float']; if (fl > 0 && t > tl.settle) B -= fl * Math.sin(2 * Math.PI * P['fig.floatHz'] * (t - tl.settle)) * seg(t, tl.settle, tl.settle + 0.6);
    const tiltDeg = P['fig.tilt']; const tilt = tiltDeg ? (tiltDeg * Math.PI / 180) * bell(rel, tl.desc0 - pop - 0.3, tl.desc0 - pop + P['land.desc'] * 0.5, tl.settle - pop) : 0;
    // light, tied to the pop
    const emA = P['interior.int'] * P['light.int'] * eo(seg(rel, 0, 0.18)) * (1 - seg(rel, 0.9, 1.5));
    const glowBase = { common: 0.35, rare: 0.4, epic: 0.6, legendary: 0.55, mythic: 0.65 }[r] * (P['interior.int'] / DEF_RAR[r]['interior.int']) * P['light.int'];
    const glowA = glowBase * eo(seg(rel, 0, 0.15)) * (1 - seg(rel, 1.0, 1.6));
    const descEnd = appearTimes(P).desc0 + P['land.desc'];
    const rimA = (rel < descEnd ? rimExit * eo(seg(rel, X.PEEK0, 0.5)) : lerp(rimExit, rimRest, seg(t, tl.settle - 0.2, tl.settle + P['light.settle']))) * outro;
    const tall = r === 'mythic' ? 1.35 : 1;
    const fe = rel - P['fx.delay'], settleRel = tl.settle - pop;

    if (P['x.pedestal'] === 'on') pedestal(ctx, 1);
    ctx.save(); ctx.globalAlpha = outro;
    const ssh = P['shell.shadow'];
    shadow(ctx, lidRestX + (lminX + lmaxX) / 2 + (lx - lidRestX), G - 1, (lmaxX - lminX) * 0.85, 18, 0.22 * seg(rel, 1.15, P['lid.landT']) * shellA * ssh);
    shadow(ctx, hx, G - 2, EW * (1 - 0.15 * su), 36, 0.30 * shellA * ssh);
    const hgt = Math.max(0, G + figDY - B), figW = s.img.width * sz.s * k, hk = P['cshadow.heightK'];
    shadow(ctx, CX + figDX, G - 1 + figDY, figW * P['cshadow.size'] * (1 + hgt * hk / 700), 26 * (1 + hgt * hk / 500), inside ? 0 : P['cshadow.op'] * clamp(1 - hgt * hk / 420, 0.15, 1) * seg(rel, X.OUT1, X.OUT1 + 0.2) * (flyBigM ? 1 - seg(t, flyT0 + 0.15, flyT0 + 0.5) : 1), P['cshadow.soft']);
    const figBox = { x: CX + figDX - sz.inf.supportX * sz.s * k, y: B - sz.inf.maxY * sz.s * k, w: s.img.width * sz.s * k, h: s.img.height * sz.s * k, glints: s.glints };
    const behind = () => { if (fam === 'base') baseBehind(ctx, P, r, rel, figBox, rm); else { famHalo(ctx, P, fam, fe, figBox, settleRel); famRays(ctx, P, fam, fe, figBox, seed); famAccent(ctx, P, fam, fe, figBox); } };
    if (inside) {
      lowerHalf(ctx, hx, hr, glowA, LCOL, 1);
      interiorEmission(ctx, CX, emA, LCOL, tall);
      behind();
      lidPiece(ctx, lx, ly, lr, LIP, 1);
      if (!s.noFig) figureDraw(ctx, im, szI, CX + figDX, B, k, rimA, rimCol, c => {
        c.beginPath(); c.moveTo(0, -200); c.lineTo(W, -200); let last = R.rimMax;
        for (let Xc = W; Xc >= 0; Xc -= 2) { const px = Math.round((Xc - (hx - EW / 2)) / ES), tt = R.front_i.top; const y = px >= 0 && px < tt.length && tt[px] >= 0 ? EGG_TOP + tt[px] * ES : null; c.lineTo(Xc, y == null ? last : y); if (y != null) last = y; }
        c.closePath(); c.clip(); }, 1, shinyFx, tilt);
      frontShell(ctx, hx, hr, LIP, 1);
    } else {
      const sdy = sink;
      if (sdy) { ctx.save(); ctx.translate(0, sdy); }
      lowerHalf(ctx, hx, hr, glowA, LCOL, shellA); frontShell(ctx, hx, hr, LIP, shellA);
      interiorEmission(ctx, hx, emA * shellA, LCOL, tall);
      lidPiece(ctx, lx, ly, lr, LIP, shellA);
      if (sdy) ctx.restore();
      behind();
      const f = s.noFig || flyGone ? figBox : figureDraw(ctx, im, szI, CX + figDX, B, k, rimA, rimCol, null, 1, shinyFx, tilt);
      if (fam === 'base') {
        if (r === 'mythic' && s.glints && s.glints.length && P['glint.n'] > 0) { const t0 = P['glint.t0'] + P['fx.delay'], gd = P['glint.dur'], ga = seg(rel, t0, t0 + 0.25) * (1 - seg(rel, t0 + 0.95, t0 + 0.95 + gd)); s.glints.slice(0, Math.round(P['glint.n'])).forEach(([u, v], i) => star4(ctx, f.x + u * f.w, f.y + v * f.h - 3, [11, 8, 8][i % 3] * P['glint.size'] / 11, ga * 0.85 * P['light.int'])); }
      } else famGlints(ctx, P, fam, fe, f, im, szI, seed);
      if (s.shiny && shinyFx && !flyGone) { const sa = shinyFx.a; const n = Math.round(P['iri.sparkles']); const spots = [[0.82, 0.22, 9, '#e8fbff'], [0.16, 0.48, 6, '#ffe8f4'], [0.7, 0.62, 5, '#f0fff0'], [0.3, 0.18, 6, '#e8fbff'], [0.9, 0.5, 5, '#ffe8f4'], [0.12, 0.75, 5, '#f0fff0']];
        for (let i = 0; i < n; i++) { const [u, v, rr0, c] = spots[i]; star4(ctx, f.x + f.w * u, f.y + f.h * v, rr0, i === 1 ? sa * 0.8 : sa, c); } }
      if (info) info.fig = { x: f.x, y: f.y + sceneY, w: f.w, h: f.h };
      figF = { x: f.x, y: f.y + sceneY, w: f.w, h: f.h };
    }
    if (fam === 'base') baseFront(ctx, P, r, rel, figBox, rm);
    else { famParticles(ctx, P, fam, fe, seed); famTrails(ctx, P, fam, fe, seed); }
    ctx.restore();
    ctx.restore(); // sceneY
    const pin = tl.plaqueIn, pdur = P['plaque.inDur'];
    if (P['x.luck'] === 'plaque' && s.luck != null) { const n = s.luckN || 9, lt = pin + (P['x.slot'] === 'on' ? 1.15 : pdur + 0.3);
      s = Object.assign({}, s, { _lk: { n, k0: Math.round(clamp(s.luck) * n), k1: Math.round(clamp(s.luckAfter != null ? s.luckAfter : s.luck) * n), hit: !!s.luckHit, u: t - lt } }); }
    if (P['x.slot'] === 'on') { // card flip + rarity reel that slows down and lands on the real rarity
      const fu = seg(t, pin, pin + 0.55), sx = fu >= 1 ? 1 : Math.max(0.02, Math.abs(Math.cos(Math.PI * (1 - eo(fu)) * 1.5))) * (fu < 1 / 3 ? 1 : 1);
      const ri = RARITIES.indexOf(r), ru = seg(t, pin, pin + 1.1), steps = Math.floor(10 * Math.sqrt(ru)), rr0 = ru >= 1 ? r : RARITIES[(ri + 1 + steps) % 5];
      const d = ru >= 1 ? s : Object.assign({}, s, { rarity: rr0 });
      ctx.save(); ctx.translate(CX, 0); ctx.scale(sx, 1); ctx.translate(-CX, 0); plaque(ctx, d, Math.min(1, fu * 4) * outro, 0, P, info, s.clock != null ? s.clock : t); ctx.restore();
      const la = bell(t, pin + 1.05, pin + 1.15, pin + 1.7); if (la > 0.01 && info && info.plaque) { const pq = info.plaque, col = hexRgb((RAR[r] || RAR.common).col); ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha *= la * outro; rr(ctx, pq.x - 6, pq.y - 6, pq.w + 12, pq.h + 12, 26); ctx.lineWidth = 8; ctx.strokeStyle = `rgba(${col},0.9)`; ctx.shadowColor = `rgba(${col},1)`; ctx.shadowBlur = 24; ctx.stroke(); ctx.restore(); }
    } else plaque(ctx, s, eo(seg(t, pin, pin + pdur)) * outro, P['plaque.rise'] * (1 - eo(seg(t, pin, pin + pdur))), P, info, s.clock != null ? s.clock : t);
    if (P['x.embers'] === 'on') emberFlight(ctx, P, s, t, tl);
    if (back > 0) { ctx.save(); if (sceneY) ctx.translate(0, sceneY); shadow(ctx, CX, G - 2, EW, 36, 0.30 * eo(back)); piece(ctx, R.egg_closed, CX, G, 268, 748, 0, eo(back)); ctx.restore(); hint(ctx, eo(seg(t, dur - 0.12, dur)), s.hint, P); }
    bar(ctx, chShown, s.chOf, P, info, s.clock != null ? s.clock : (s.t || 0)); xHud(t);
    if (xFly && figF && !flyBigM) flyToBar(ctx, P, s, t, tl, figF);
    if (flyBigM && figF && !s.noFig) flyBig(ctx, P, s, t, flyM, flyT0, flyT1, figF, im, hexRgb(LIGHT_OF(r)), grows);
    queuePill(ctx, qn, P, info);
    if (info) { Object.assign(info, { B, k, inside, rel, tl, hx, lx, ly, shellA, P, phase: rel < 0 ? 'anticipation' : inside ? 'opening' : t < tl.settle ? 'landing' : t < dur - OUT ? 'contemplation' : 'outro' }); if (shellA > 0.02 && !inside) info.shells = { lowX: hx, lidX: lx, a: shellA }; checkLayout(info); }
    return info;
  }
  let MISS = null; function missingArt() { if (MISS) return MISS; const c = document.createElement('canvas'); c.width = 400; c.height = 440; const x = c.getContext('2d'); x.fillStyle = '#8a8f96'; x.beginPath(); x.ellipse(200, 280, 150, 155, 0, 0, 7); x.fill(); x.beginPath(); x.arc(200, 120, 85, 0, 7); x.fill(); MISS = c; return c; }
  function legacyProfile(land) { return land === 'float' ? 'tall' : land === 'firm' ? 'based' : 'compact'; }
  function overlap(a, b, pad = 0) { return a && b && a.x < b.x + b.w - pad && b.x < a.x + a.w - pad && a.y < b.y + b.h - pad && b.y < a.y + a.h - pad; }
  function checkLayout(info) { // composition warnings shown by the lab (only meaningful in contemplation)
    const w = info.warnings, p = info.plaque, b = info.bar, q = info.queue, f = info.fig, tx = info.text;
    if (p && (p.x < 0 || p.x + p.w > W)) w.push('La placa se sale del lienzo por los lados.');
    if (p && b && p.y + p.h > b.y + 2) w.push('La placa se superpone con la barra del canal.');
    if (q && p && overlap(q, p)) w.push('El indicador de cola tapa la placa.');
    if (q && b && overlap(q, { x: b.x + 8, y: b.y + 8, w: b.w - 16, h: b.h - 16 })) w.push('El indicador de cola tapa la barra.');
    if (q && (q.x < 0 || q.x + q.w > W)) w.push('El indicador de cola se sale del lienzo.');
    if (f && p && f.y + f.h * 0.92 > p.y + 6 && info.phase === 'contemplation') w.push('El personaje queda tapado por la placa (pies o base).');
    if (f && f.y < 0) w.push('El personaje se corta por arriba.');
    if (f && (f.x < 0 || f.x + f.w > W)) w.push('El personaje se corta por un lado.');
    if (tx && tx.nameTrunc) w.push('El nombre no entra: se trunca con «…».');
    if (tx && tx.viewerTrunc) w.push('El usuario no entra: se trunca con «…».');
    if (tx && tx.setTrunc) w.push('El progreso del set no entra: se trunca.');
    if (tx && p && tx.row3Bottom > p.y + p.h - 4) w.push('La tercera línea toca el borde inferior de la placa.');
    if (tx && p && tx.row1Top < p.y + 4) w.push('La primera línea toca el borde superior de la placa.');
  }

  // =====================================================================================
  // celebrations (set / personal collection / channel collection) and egg rain · two directions
  // =====================================================================================
  const CELEB_TXT = { set: 'SET COMPLETE', master: 'MASTER HOARDER', channel: 'THE HOARD IS COMPLETE' };
  function scalePattern(ctx, x, y, w, h, col) { ctx.save(); rr(ctx, x, y, w, h, 14); ctx.clip(); ctx.strokeStyle = col; ctx.lineWidth = 1.5; for (let sy = y - 10; sy < y + h + 14; sy += 13) for (let sx = x - 16; sx < x + w + 16; sx += 18) { ctx.beginPath(); ctx.arc(sx + ((Math.round((sy - y) / 13)) % 2 ? 9 : 0), sy, 9, 0, Math.PI); ctx.stroke(); } ctx.restore(); }
  function eggIcon(ctx, x, y, s, a, gold) {
    if (a <= 0.01) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y);
    const g = ctx.createLinearGradient(0, -s, 0, s); if (gold) { g.addColorStop(0, '#ffe7a6'); g.addColorStop(1, '#b8862c'); } else { g.addColorStop(0, '#f7f1e2'); g.addColorStop(1, '#d8ccb0'); }
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.74, s, 0, 0, 7); ctx.fill();
    ctx.fillStyle = gold ? 'rgba(255,255,255,0.35)' : TOK.jade; ctx.beginPath(); ctx.ellipse(0, -s * 0.55, s * 0.6, s * 0.45, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = gold ? '#8a6420' : TOK.brass; ctx.lineWidth = Math.max(1.5, s * 0.08); ctx.beginPath(); for (let i = 0; i <= 8; i++) { const xx = -s * 0.7 + i * s * 0.175, yy = -s * 0.1 + (i % 2 ? -s * 0.12 : s * 0.12); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke();
    ctx.restore();
  }
  function coin(ctx, x, y, r, rot, a) { if (a <= 0.01) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(Math.max(0.15, Math.abs(Math.cos(rot))), 1); const g = ctx.createLinearGradient(-r, -r, r, r); g.addColorStop(0, '#ffe9a8'); g.addColorStop(0.5, '#e0b04c'); g.addColorStop(1, '#a8782a'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.strokeStyle = '#8a6420'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, 7); ctx.stroke(); ctx.restore(); }
  function celebDuration(cfg, queued) { const P = resolve(cfg, { rarity: 'common', profile: 'compact', id: '' }); return queued ? Math.min(P['celeb.dur'], 2.6) : P['celeb.dur']; }
  function drawCeleb(ctx, c, opts) {
    opts = opts || {}; const P = resolve(opts.cfg, { rarity: 'common', profile: 'compact', id: '' }), style = P['celeb.style'], rm = !!opts.rm, D = c.dur || P['celeb.dur'], t = c.t, fx = P['celeb.fx'];
    const a = clamp(t / 0.25) * (1 - clamp((t - (D - 0.45)) / 0.45)); if (a <= 0) return;
    const big = (CELEB_TXT[c.kind] || 'COMPLETE'), sub = c.top || '', tier = c.kind === 'channel' ? 2 : c.kind === 'master' ? 1 : 0;
    const rng0 = rng(7 + tier);
    ctx.save(); ctx.globalAlpha = a;
    if (style === 'A') { // brass standard with scale pattern; eggs rise at the sides, coins fall softly
      const w = 760, h = 190, x = CX - w / 2, ent = rm ? 1 : eo(clamp(t / 0.55)), y = 48 + (1 - ent) * -40; // top band: never over the creature
      ctx.save(); ctx.shadowColor = 'rgba(10,20,16,0.35)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; rr(ctx, x, y, w, h, 24); const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#24574a'); g.addColorStop(1, '#163a31'); ctx.fillStyle = g; ctx.fill(); ctx.restore();
      scalePattern(ctx, x + 8, y + 8, w - 16, h - 16, 'rgba(244,239,226,0.07)');
      rr(ctx, x + 6, y + 6, w - 12, h - 12, 19); ctx.strokeStyle = '#c9a45e'; ctx.lineWidth = 3; ctx.stroke(); rr(ctx, x + 13, y + 13, w - 26, h - 26, 14); ctx.strokeStyle = 'rgba(201,164,94,0.45)'; ctx.lineWidth = 1.2; ctx.stroke();
      // brass tabs (banner hangers)
      for (const sx of [x + 90, x + w - 90]) { ctx.fillStyle = '#b8924c'; rr(ctx, sx - 18, y - 22, 36, 30, 6); ctx.fill(); ctx.fillStyle = '#e2c27c'; ctx.fillRect(sx - 12, y - 16, 24, 4); }
      eggIcon(ctx, CX, y + 4, 26 + 6 * tier, 1, tier > 0);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#e9d6a6'; ctx.letterSpacing = '2px'; ctx.fillText(fitSize(ctx, sub.toUpperCase(), 600, 'Inter', 28, 22, w - 90), CX, y + 66); ctx.letterSpacing = '0px';
      ctx.fillStyle = '#f4efe2'; const bt = fitSize(ctx, big, 600, 'Fraunces', 64, 44, w - 70); ctx.fillText(bt, CX, y + 126);
      if (!rm) { // eggs rising at both sides, coins drifting down
        const ne = Math.round((4 + 2 * tier) * fx);
        for (let i = 0; i < ne; i++) { const side = i % 2 ? 1 : -1, t0 = 0.15 + i * 0.18, u = seg(t, t0, t0 + 1.8); if (u <= 0 || u >= 1) continue; const ex = CX + side * (w / 2 + 40 + 30 * rng0()), ey = 560 - 420 * eo(u); eggIcon(ctx, ex + Math.sin(u * 6 + i) * 8, ey, 14 + 4 * rng0(), bell(u, 0, 0.2, 1), tier > 0 && i % 2 === 0); }
        const nc = Math.round((6 + 6 * tier) * fx);
        for (let i = 0; i < nc; i++) { const t0 = 0.3 + i * 0.12, u = seg(t, t0, t0 + 1.2); if (u <= 0 || u >= 1) continue; const cx0 = x + 40 + rng0() * (w - 80); const sx = (i % 2 ? 1 : -1) * (300 + 120 * rng0()); coin(ctx, CX + sx + Math.sin(u * 5 + i) * 10, y + h + 10 + 520 * ei(u), 9 + 3 * rng0(), u * 9 + i, 1 - seg(u, 0.7, 1)); }
        const ng = Math.round((3 + 3 * tier) * fx); for (let i = 0; i < ng; i++) { const t0 = 0.35 + i * 0.27, e = bell(t, t0, t0 + 0.2, t0 + 0.7); const ang = i * 2.4 + 0.5; star4(ctx, CX + Math.cos(ang) * w * 0.52, y + h / 2 + Math.sin(ang) * h * 0.75, 7, e, '#fff2d0'); }
      }
    } else { // B · treasure seal: ivory medallion with a golden egg cracking open, coin arcs fan out behind
      const ent = rm ? 1 : eo(clamp(t / 0.6)), cy = 152, R0 = 138 + 4 * tier; // top band: never over the creature
      if (!rm) { // fan of coin arcs behind the seal
        const nc = Math.round((10 + 6 * tier) * fx);
        for (let i = 0; i < nc; i++) { const ang = Math.PI * (1.05 + 0.9 * (i / Math.max(1, nc - 1))), u = seg(t, 0.15 + (i % 5) * 0.04, 1.1), rr0 = (R0 + 40 + 120 * eo(u)); coin(ctx, CX + Math.cos(ang) * rr0, cy + Math.sin(ang) * rr0 * 0.8, 10, t * 4 + i, bell(u, 0, 0.25, 1) * 0.95 + (u >= 1 ? 0 : 0)); }
      }
      ctx.save(); ctx.translate(CX, cy); ctx.scale(0.85 + 0.15 * ent, 0.85 + 0.15 * ent);
      ctx.shadowColor = 'rgba(10,20,16,0.35)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 8; ctx.beginPath(); for (let i = 0; i < 32; i++) { const ang = i / 32 * Math.PI * 2, rr0 = R0 * (i % 2 ? 0.94 : 1); i ? ctx.lineTo(Math.cos(ang) * rr0, Math.sin(ang) * rr0) : ctx.moveTo(rr0, 0); } ctx.closePath();
      const g = ctx.createRadialGradient(0, -30, 10, 0, 0, R0); g.addColorStop(0, '#fbf7ec'); g.addColorStop(1, '#e6dcc2'); ctx.fillStyle = g; ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#a8874f'; ctx.lineWidth = 3; ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, R0 * 0.84, 0, 7); ctx.strokeStyle = 'rgba(31,74,63,0.7)'; ctx.lineWidth = 2; ctx.stroke();
      // golden egg cracking at the top of the seal
      const crack = rm ? 1 : seg(t, 0.5, 0.9); eggIcon(ctx, 0, -R0 * 0.45 - 6 * crack, 26 + 3 * tier, 1, true);
      if (!rm && crack > 0) { const e2 = bell(t, 0.55, 0.8, 1.6); star4(ctx, 0, -R0 * 0.45 - 34, 12, e2, '#fff4d8'); }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = TOK.jadeDeep; const words = big.split(' '); const mid = Math.ceil(words.length / 2);
      ctx.fillText(fitSize(ctx, words.slice(0, mid).join(' '), 600, 'Fraunces', 42, 26, R0 * 1.42), 0, R0 * 0.02); ctx.fillText(fitSize(ctx, words.slice(mid).join(' '), 600, 'Fraunces', 42, 26, R0 * 1.3), 0, R0 * 0.02 + 42);
      { ctx.letterSpacing = '2px'; const st = fitSize(ctx, sub.toUpperCase(), 600, 'Inter', 24, 18, 560); const rw = Math.min(600, ctx.measureText(st).width + 70), ry = R0 * 0.86; // brass ribbon under the seal
        ctx.fillStyle = '#b8924c'; ctx.beginPath(); ctx.moveTo(-rw / 2 - 18, ry - 4); ctx.lineTo(-rw / 2, ry + 21); ctx.lineTo(-rw / 2 - 18, ry + 46); ctx.lineTo(rw / 2 + 18, ry + 46); ctx.lineTo(rw / 2, ry + 21); ctx.lineTo(rw / 2 + 18, ry - 4); ctx.closePath(); ctx.fill();
        rr(ctx, -rw / 2, ry - 6, rw, 54, 6); const rg2 = ctx.createLinearGradient(0, ry - 6, 0, ry + 48); rg2.addColorStop(0, '#e9cd88'); rg2.addColorStop(1, '#c39a52'); ctx.fillStyle = rg2; ctx.fill(); ctx.fillStyle = TOK.jadeDeep; ctx.fillText(st, 0, ry + 22); ctx.letterSpacing = '0px'; } ctx.letterSpacing = '0px';
      ctx.restore();
    }
    ctx.restore();
  }
  // egg rain: real egg art drifting down both sides, never over the centre column
  let RAIN_GLOW = null;
  function rainGlow() { if (RAIN_GLOW) return RAIN_GLOW; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), rg = g.createRadialGradient(64, 64, 0, 64, 64, 64); rg.addColorStop(0, 'rgba(255,214,140,0.9)'); rg.addColorStop(0.35, 'rgba(255,190,110,0.35)'); rg.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = rg; g.fillRect(0, 0, 128, 128); return (RAIN_GLOW = c); }
  function cometEggs(ctx, el, fade, fx) { // "luminous drift": real egg art in three depths (far = small, dim, slow; near = big, bright, faster), soft sway and warm glow
    const im = R.egg_closed, GL = rainGlow(), N = Math.round(22 * fx), hr = im.height / im.width, rn = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
    for (let i = 0; i < N; i++) { const d = rn(i * 7.3), z = d < 0.45 ? 0 : d < 0.82 ? 1 : 2, h = [22, 38, 62][z], sp = [70, 115, 175][z] * (0.85 + rn(i) * 0.3), per = 1000 + h * 2, y = -60 + (el * sp + rn(i * 5) * per) % per;
      const side = i % 2 ? 1 : -1, x = CX + side * (250 + rn(i * 3) * 220) + Math.sin(el * (0.6 + rn(i * 2) * 0.7) + i) * (18 + z * 10), a = fade * [0.45, 0.75, 1][z] * seg(y, -60, 40) * (1 - seg(y, 700, 860)); if (a <= 0.01) continue;
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = a * 0.85 * [0.6, 0.9, 1.1][z]; const gs = h * 2.4; ctx.drawImage(GL, x - gs / 2, y - gs / 2, gs, gs); ctx.restore();
      const w = h / hr; ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(Math.sin(el * 0.9 + i) * 0.35); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); } }
  function drawRain(ctx, st, opts) { // st = { left, total, t, cmd, rm }
    opts = opts || {}; const P = resolve(opts.cfg, { rarity: 'common', profile: 'compact', id: '' }), style = P['celeb.style'], rm = !!st.rm;
    const txt = `EGG RAIN · type ${st.cmd || '!hatch'} · ${Math.max(0, Math.ceil(st.left))}s`, y = 64, el = st.t || 0, fade = clamp(el / 0.6) * clamp(st.left / 0.8);
    ctx.save(); ctx.globalAlpha = fade;
    if (!rm) { // eggs (A) or coins (B) drifting down along both sides, never over the centre
      if (style === 'A' && R.egg_closed) cometEggs(ctx, el, fade, P['celeb.fx']); else {
      const n = Math.round(10 * P['celeb.fx']); for (let i = 0; i < n; i++) { const side = i % 2 ? 1 : -1, sp = 120 + (i * 37) % 60, ph = (el * sp + i * 113) % 900, x = CX + side * (330 + (i * 53) % 120), yy = -40 + ph; if (yy > 790) continue; ctx.globalAlpha = fade * (1 - seg(yy, 640, 790));
        if (style === 'A') eggIcon(ctx, x + Math.sin(el * 1.3 + i) * 10, yy, 16, 0.85, i % 3 === 0); else coin(ctx, x + Math.sin(el * 1.7 + i) * 8, yy, 11, el * 3 + i, 0.9); }
      }
      ctx.globalAlpha = fade;
    }
    ctx.font = '600 30px Inter'; const tw = ctx.measureText(txt).width + 64, h = 60;
    ctx.shadowColor = 'rgba(10,20,16,0.3)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5;
    if (style === 'A') { rr(ctx, CX - tw / 2, y - h / 2, tw, h, h / 2); ctx.fillStyle = '#1f4a3f'; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.strokeStyle = '#c9a45e'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.fillStyle = '#f4efe2'; }
    else { rr(ctx, CX - tw / 2, y - h / 2, tw, h, 12); const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2); g.addColorStop(0, '#e9c97c'); g.addColorStop(1, '#b8924c'); ctx.fillStyle = g; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.strokeStyle = '#7c6232'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = TOK.jadeDeep; }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, CX, y + 1);
    const prog = clamp(st.left / (st.total || 60)); ctx.fillStyle = style === 'A' ? '#c9a45e' : TOK.jade; rr(ctx, CX - tw / 2 + 20, y + h / 2 - 7, (tw - 40) * prog, 3, 1.5); ctx.fill();
    ctx.restore();
  }

  window.BlindBoxPresenters = window.BlindBoxPresenters || {};
  window.BlindBoxPresenters.eggHoard = { VERSION, CONFIG_VERSION, init, draw, drawCeleb, drawRain, celebDuration, timelineFor, paramsFor, resolve, resolveWithSource, relevant, emptyConfig, legacyProfile,
    SCHEMA, SECTIONS, RARITIES, PROFILES, FAM, DEF_RAR, DEF_PROF, W, H, G, sizeOf, alphaInfo,
    // backwards-compatible helpers used by the 0.7.0-dev engine
    timeline: (rarity, rm, land) => { const P = resolve(null, { rarity, profile: legacyProfile(land) }); return times(P, rm, 4); },
    duration: (rarity, rm, land, hold) => { const P = resolve(null, { rarity, profile: legacyProfile(land) }); return times(P, rm, hold).end; } };
})();
