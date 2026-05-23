// src/funkin/play/stage/bg.js

class StageBackground {
    static apply(scene, folder, bgValue, elementsArray) {
        if (typeof bgValue !== 'string') return;

        if (bgValue.startsWith('#')) {
            // 1. ES UN COLOR: Aplicar al fondo de la cámara
            scene.cameras.main.setBackgroundColor(bgValue);

            // Si el referee usa sub-cámaras internas (ej. game), lo forzamos:
            if (scene.referee && scene.referee.cameras && scene.referee.cameras.cameras) {
                if (scene.referee.cameras.cameras.game) {
                    scene.referee.cameras.cameras.game.setBackgroundColor(bgValue);
                }
            }
        } else {
            // 2. ES UNA IMAGEN: Tratamos el string como namePath
            const itemData = {
                type: 'image',
                namePath: bgValue,
                position: [0, 0],
                layer: -99999,   // Profundidad extrema (detrás de todo)
                scrollFactor: 0  // Valor temporal, lo forzaremos manualmente abajo
            };

            const bgObj = window.StageImages.build(scene, folder, itemData);

            if (bgObj) {
                // Aplicamos las props base (posición, capa)
                window.StageProps.apply(bgObj, itemData);

                // Forzamos el Parallax (scroll factor) a 0, 0 para que sea estático al movimiento de cámara
                bgObj.setScrollFactor(0, 0);

                // Aseguramos que el origen es 0, 0 en pantalla
                bgObj.setOrigin(0, 0);

                // Agregamos a las cámaras del juego al igual que cualquier prop
                if (scene.referee && scene.referee.cameras) {
                    scene.referee.cameras.add(bgObj, 'game');
                } else {
                    scene.add.existing(bgObj);
                }

                // Agregamos al array de elementos para el ciclo update/beat
                if (elementsArray) {
                    elementsArray.push(bgObj);
                }
            }
        }
    }
}

window.StageBackground = StageBackground;
