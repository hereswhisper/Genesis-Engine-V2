// src/utils/ClientGlobals.js

class ClientGlobals {
  static init() {
    const ua = navigator.userAgent;

    // Detección inicial basada en el User Agent (Navegador)
    window.isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    window.isDesktop = !window.isMobile;
    window.isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    window.isAndroid = /Android/.test(ua);

    // NUEVO: Detección global de React Native WebView
    window.isReactNative = !!window.ReactNativeWebView;

    // NUEVO: Ajuste dinámico si se detecta hardware de escritorio (Ratón/Teclado)
    this.detectPeripherals();
  }

  static detectPeripherals() {
    // Función que deshabilita el modo móvil si hay interacción de escritorio
    const disableMobileMode = () => {
      if (window.isMobile) {
        window.isMobile = false;
        window.isDesktop = true;
        console.log(
          "[ClientGlobals] Hardware de escritorio detectado (Teclado/Ratón). isMobile establecido a false.",
        );

        // Removemos los listeners una vez hecha la corrección para ahorrar memoria
        window.removeEventListener("mousemove", disableMobileMode);
        window.removeEventListener("keydown", disableMobileMode);
      }
    };

    // Escuchamos el movimiento del ratón o cualquier pulsación de tecla
    // El { once: true } asegura que el navegador elimine el evento tras la primera ejecución
    window.addEventListener("mousemove", disableMobileMode, { once: true });
    window.addEventListener("keydown", disableMobileMode, { once: true });
  }
}

ClientGlobals.init();
