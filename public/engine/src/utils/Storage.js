class StoragePatch {
  static isNeu() {
    return (
      typeof window.NL_MODE !== "undefined" && window.NL_MODE !== "browser"
    );
  }

  static async init() {
    if (!this.isNeu()) return;

    try {
      // Obtenemos todas las llaves guardadas en Neutralino de sesiones anteriores
      let keys = await Neutralino.storage.getKeys();
      for (let key of keys) {
        let val = await Neutralino.storage.getData(key);
        // Inyectamos a localStorage sin disparar nuestro propio parche
        Object.getPrototypeOf(window.localStorage).setItem.call(
          window.localStorage,
          key,
          val,
        );
      }
      console.log("Storage: Datos de Neutralino sincronizados con éxito.");
    } catch (e) {
      console.log(
        "Storage: No hay datos previos en Neutralino o es la primera vez.",
      );
    }

    // Parcheamos las escrituras para que guarden en Neutralino en segundo plano
    const ogSet = window.localStorage.setItem;
    window.localStorage.setItem = function (key, value) {
      ogSet.apply(this, arguments);
      Neutralino.storage
        .setData(key, String(value))
        .catch((err) => console.error("NeuStorage Error:", err));
    };

    const ogRemove = window.localStorage.removeItem;
    window.localStorage.removeItem = function (key) {
      ogRemove.apply(this, arguments);
      Neutralino.storage
        .removeData(key)
        .catch((err) => console.error("NeuStorage Error:", err));
    };

    const ogClear = window.localStorage.clear;
    window.localStorage.clear = function () {
      ogClear.apply(this, arguments);
      Neutralino.storage
        .getKeys()
        .then((keys) => {
          keys.forEach((k) => Neutralino.storage.removeData(k));
        })
        .catch((err) => console.error("NeuStorage Error:", err));
    };
  }
}

window.StoragePatch = StoragePatch;
