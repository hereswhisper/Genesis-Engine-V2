class OptionsStorage {
    static save(id, type, value) {
        try {
            let saveValue = value;
            
            if (type === 'check') saveValue = value ? "true" : "false"; // Guardado booleano
            else if (type === 'slider') saveValue = value.toString();   // Guardado numérico a string
            else if (type === 'drop') saveValue = value.toString();     // Guardado del ID del Dropdown
            else if (type === 'keybind') saveValue = JSON.stringify(value); // Arreglo de teclas
            
            // Se usa un prefijo para que no haga conflicto con otras variables locales del juego
            localStorage.setItem(`${id}`, saveValue);
        } catch (e) {
            console.warn("No se pudo guardar la opción en localStorage:", id, e);
        }
    }

    static load(id, type, defaultValue) {
        try {
            const val = localStorage.getItem(`${id}`);
            if (val === null) return defaultValue;

            if (type === 'check') return val === "true";
            if (type === 'slider') return parseFloat(val);
            if (type === 'drop') return val;
            if (type === 'keybind') return JSON.parse(val);
            
            return val;
        } catch (e) {
            console.warn("No se pudo cargar la opción desde localStorage:", id, e);
            return defaultValue;
        }
    }
}
window.OptionsStorage = OptionsStorage;