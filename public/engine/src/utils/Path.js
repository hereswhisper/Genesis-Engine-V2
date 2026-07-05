/**
 * Global engine path management.
 * Centralizes all asset paths. Relies on the index.html base URL to resolve correctly.
 */
class Path {
  // Rutas de Mods
  static mods = "mods/";

  static music = "assets/audio/music/";
  static songs = "assets/audio/songs/";
  static sounds = "assets/audio/sounds/";

  static dataChars = "assets/data/characters/";
  static dataSkins = "assets/data/skins/";
  static dataUI = "assets/data/ui/";
  static dataStages = "assets/data/stages/";
  static dataWeeks = "assets/data/weeks/";

  static fonts = "assets/fonts/";

  static img = "assets/images/";

  static chars = "assets/images/characters/";

  static menu = "assets/images/menu/";
  static menuBG = "assets/images/menu/bg/";
  static menuCredits = "assets/images/menu/credits/";
  static menuIntro = "assets/images/menu/intro/";
  static menuMain = "assets/images/menu/mainmenu/";
  static menuOptions = "assets/images/menu/options/";
  static menuStory = "assets/images/menu/storymode/";

  static UI = "assets/images/ui/";
  static skins = "assets/images/skins/";
  static stages = "assets/images/stages/";

  /**
   * Concatenates a base directory path with a specific file name.
   * @param {string} path - The base directory path defined in the class.
   * @param {string} [file=""] - The specific file name to append.
   * @returns {string} The complete concatenated string path.
   */
  static get(path, file = "") {
    return path + file;
  }

  /**
   * Concatenates a mod path with a specific file name.
   * @param {string} modName - The name of the mod folder.
   * @param {string} [file=""] - The specific file name to append inside the mod folder.
   * @returns {string} The complete concatenated string mod path.
   */
  static getMod(modName, file = "") {
    return this.mods + modName + "/" + file;
  }
}

window.Path = Path;
