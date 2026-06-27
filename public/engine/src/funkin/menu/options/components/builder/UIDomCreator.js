class UIDomCreator {
    constructor(parent) { this.parent = parent; this.scene = parent.scene; }

    createDOM(defaultTitle) {
        const p = this.parent;
        const tabsHTML = p.tabs.renderer.getTabsHTML();
        const imgPath = (window.Path && window.Path.menuOptions ? window.Path.menuOptions : "") + "under-construction.png";

        const miHTML = `
            <style>
                #opt-wrap, #opt-wrap * { -webkit-tap-highlight-color: transparent !important; user-select: none; }
                #tab-cont::-webkit-scrollbar { display: none; }
                #cont-area::-webkit-scrollbar { width: 12px; }
                #cont-area::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 6px; }
                #cont-area::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.4); border-radius: 6px; border: 2px solid rgba(0,0,0,0.3); }
                .d-list::-webkit-scrollbar { width: 8px; }
                .d-list::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
                .d-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 4px; }
                .d-item:hover { background: rgba(255,255,255,0.1) !important; }
                .opt-row { transition: 0.1s ease-in-out; }
                .k-box { transition: 0.1s; outline: 1px solid rgba(255,255,255,0.2); }
                .k-box:hover { background: rgba(255,255,255,0.1) !important; }
                .k-active { outline: 2px solid #44afff !important; background: rgba(68,175,255,0.2) !important; }
                .c-slider { -webkit-appearance: none; width: 100%; height: 8px; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; transition: 0.2s; }
                .c-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 24px; background: #fff; border-radius: 2px; transition: transform 0.1s; }
                .c-slider::-webkit-slider-thumb:hover { transform: scale(1.1); }
                
                .desc-scroll::-webkit-scrollbar { width: 8px; }
                .desc-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); border-radius: 4px; }
                .desc-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 4px; border: 1px solid rgba(0,0,0,0.2); }
            </style>
            <div id="opt-wrap" style="width: 96vw; height: 90vh; background: rgba(0,0,0,0.75); backdrop-filter: blur(10px); border-radius: 8px; padding: 20px; display: flex; flex-direction: column; color: white; box-shadow: 0 10px 40px rgba(0,0,0,0.8);">
                <div style="display: flex; align-items: center; margin-bottom: 20px; gap: 5px; height: 50px; position: relative; z-index: 50;">
                    <div id="btn-left" style="cursor: pointer; opacity: 0.3; pointer-events: none; transition: opacity 0.2s, transform 0.15s; transform: scale(1); z-index: 20; display: flex; align-items: center; padding: 0 5px;">
                        <canvas id="canvas-arrow-left" width="49" height="90" style="pointer-events:none;"></canvas>
                    </div>
                    <div id="tab-cont" style="display: flex; align-items: center; flex: 1; height: 150px; margin-top: -50px; margin-bottom: -50px; overflow-x: hidden; overflow-y: hidden; scroll-behavior: smooth; z-index: 10; pointer-events: none;">
                        ${tabsHTML}
                    </div>
                    <div id="btn-right" style="cursor: pointer; opacity: 1; pointer-events: auto; transition: opacity 0.2s, transform 0.15s; transform: scale(1); z-index: 20; display: flex; align-items: center; padding: 0 5px;">
                        <canvas id="canvas-arrow-right" width="49" height="90" style="pointer-events:none;"></canvas>
                    </div>
                </div>
                <div style="display: flex; flex: 1; overflow: hidden; gap: 20px;">
                    <div id="cont-area" style="flex: 0.65; background: rgba(255,255,255,0.05); border-radius: 6px; padding: 25px; overflow-y: auto; overflow-x: hidden; position: relative;">
                        <div id="opts-container"><p style="color:#bbb;">Loading...</p></div>
                    </div>
                    <div style="flex: 0.35; background: rgba(0,0,0,0.5); border-radius: 6px; padding: 20px; border: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; gap: 15px;">
                        
                        <div style="flex: 1; background: rgba(0,0,0,0.3); border-radius: 6px; border: 1px dashed rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 10px;">
                            <img src="${imgPath}" style="max-width:100%; max-height:100%; object-fit: contain; opacity:0.8; pointer-events:none;" />
                        </div>
                        
                        <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                            <div style="display: flex; justify-content: center; border-bottom: 2px solid rgba(255,255,255,0.2); padding-bottom: 15px; margin-bottom: 15px; min-height: 40px; flex-shrink: 0;">
                                <canvas id="canvas-desc-title" style="pointer-events:none;"></canvas>
                            </div>
                            
                            <div class="desc-scroll" style="flex: 1; overflow-y: auto; padding-right: 10px;">
                                <p id="desc-text" style="font-family: 'VCR OSD Mono', 'vcr', sans-serif; font-size: 22px; color: #eee; text-align: left; margin: 0; line-height: 1.5; white-space: pre-wrap;">Selecciona una opción...</p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>`;
        p.domMenu.createFromHTML(miHTML); p.domMenu.setScrollFactor(0);
        
        setTimeout(() => {
            const str = (window.ClientGlobals?.language === 'es') ? 'DESCRIPCION' : 'DESCRIPTION';
            window.AlphabetRenderer.render(this.scene, p.domMenu.node.querySelector('#canvas-desc-title'), str, 0.55);
            
            p.sections.forEach(sec => {
                // Obtener texto dando preferencia al inglés del objeto "label"
                let tabText = "";
                if (sec.label) {
                    tabText = sec.label.en || sec.label.es || sec.id || sec.option || "UNKNOWN";
                } else {
                    tabText = sec.id || sec.option || "UNKNOWN";
                }
                
                // Buscar el elemento canvas usando el id nuevo o la propiedad vieja como fallback alternativo
                const targetId = sec.id || sec.option || "unknown";
                const canvasElement = p.domMenu.node.querySelector(`[id="canvas-tab-${targetId}"]`) || p.domMenu.node.querySelector(`[id="canvas-tab-${sec.option}"]`);
                
                if (canvasElement) {
                    window.AlphabetRenderer.render(this.scene, canvasElement, tabText.toUpperCase(), 0.55);
                }
            });
        }, 50);
        
        p.builder.renderer.loadSectionData(defaultTitle);
    }
}
window.UIDomCreator = UIDomCreator;