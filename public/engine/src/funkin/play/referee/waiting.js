// src/funkin/play/referee/waiting.js

class PlayRefereeWaiting {
    constructor(scene) {
        this.scene = scene;
        if (window.MultiLogic) {
            this.logic = new window.MultiLogic(scene);
        }
    }

    update(time, delta) {
        if (this.logic && this.logic.update) {
            this.logic.update(time, delta);
        }
    }

    shutdown() {
        if (this.logic && this.logic.shutdown) {
            this.logic.shutdown();
        }
    }
}
window.PlayRefereeWaiting = PlayRefereeWaiting;
