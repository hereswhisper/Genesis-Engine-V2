// public/engine/src/funkin/play/characters/logic.js
class CharacterLogic {
  constructor(scene) {
    this.scene = scene;
    this.characters = []; 

    const pd = scene.playData;
    const charsMeta = pd.get("characters") || {};

    const players = charsMeta.players || ["bf"];
    players.forEach((charId) => {
      this.characters.push(new window.CharacterRenderer(scene, charId, "players"));
    });

    const opponents = charsMeta.opponents || ["dad"];
    opponents.forEach((charId) => {
      this.characters.push(new window.CharacterRenderer(scene, charId, "opponents"));
    });

    const spectators = charsMeta.spectator || ["gf"];
    spectators.forEach((charId) => {
      this.characters.push(new window.CharacterRenderer(scene, charId, "spectator"));
    });

    this.beatListener = (curBeat) => this.onBeatHit(curBeat);
    if (window.Conductor) {
      window.Conductor.events.on("beatHit", this.beatListener, this);
    }

    this.onNoteHitListener = this.onNoteHit.bind(this);
    this.onNoteMissListener = this.onNoteMiss.bind(this);
    this.onGhostMissListener = this.onNoteMiss.bind(this);

    this.scene.events.on("noteHit", this.onNoteHitListener);
    this.scene.events.on("noteMiss", this.onNoteMissListener);
    this.scene.events.on("ghostMiss", this.onGhostMissListener);

    this.updateListener = (time, delta) => this.update(time, delta);
    this.scene.events.on("update", this.updateListener);

    this.scene.events.once("shutdown", this.shutdown, this);
  }

  onNoteHit(data) {
    const dir = data.direction || (data.note ? data.note.direction : null);
    if (!dir) return;

    let isOpponentSide = false;
    let sustainLength = 0; // Para notas largas
    
    if (data.note && data.note.noteData) {
      isOpponentSide = data.note.noteData.p === "op"; 
      sustainLength = data.note.noteData.l || 0;
    } else if (data.isOpponent !== undefined) {
      isOpponentSide = data.isOpponent;
    } else if (data.noteData) {
      sustainLength = data.noteData.l || 0;
    }

    const targetRole = isOpponentSide ? "opponents" : "players";

    this.characters.forEach(char => {
      if (char.role === targetRole) {
        // Le mandamos el sustainLength al Renderer para congelarlo en el último frame
        char.playSingAnim(dir, false, sustainLength);
      }
    });
  }

  onNoteMiss(data) {
    const dir = data.direction || (data.note ? data.note.direction : null);
    if (!dir) return;

    let isOpponentSide = false;
    if (data.note && data.note.noteData) {
      isOpponentSide = data.note.noteData.p === "op"; 
    } else if (data.isOpponent !== undefined) {
      isOpponentSide = data.isOpponent;
    }

    const targetRole = isOpponentSide ? "opponents" : "players";

    this.characters.forEach(char => {
      if (char.role === targetRole) {
        // Un fallo (miss) rompe la nota larga, así que el sustainLength es 0
        char.playSingAnim(dir, true, 0); 
      }
    });
  }

  onBeatHit(curBeat) {
    this.characters.forEach(char => {
      char.dance();
    });
  }

  update(time, delta) {
    this.characters.forEach(char => char.update(time, delta));
  }

  shutdown() {
    if (window.Conductor) {
      window.Conductor.events.off("beatHit", this.beatListener, this);
    }
    this.scene.events.off("noteHit", this.onNoteHitListener);
    this.scene.events.off("noteMiss", this.onNoteMissListener);
    this.scene.events.off("ghostMiss", this.onGhostMissListener);
    this.scene.events.off("update", this.updateListener);
    
    this.characters.forEach(char => char.destroy());
    this.characters = [];
  }
}

window.CharacterLogic = CharacterLogic;