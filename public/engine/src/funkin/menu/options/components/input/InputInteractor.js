class InputInteractor {
    constructor(parent) { this.parent = parent; this.scene = parent.scene; }

    interactWithCurrentOption() {
        const p = this.parent;
        if (p.currentOptions.length === 0) return;
        const item = p.currentOptions[p.selectedOptionIndex];
        
        if (item.options.input === 'check') {
            item.options.values[0] = !item.options.values[0];
            window.OptionsStorage.save(item.id, 'check', item.options.values[0]); // GUARDADO
            
            const cvs = p.domMenu.node.querySelector(`[id="c-chk-${item.id}"]`);
            if (item.options.values[0]) { this.scene.sound.play("confirmMenu"); p.animations.checkbox.playAnimation(item.id, cvs); }
            else { this.scene.sound.play("cancelMenu"); p.animations.checkbox.playUnselect(item.id, cvs); }
        } else if (item.options.input === 'action') {
            p.domMenu.node.querySelector(`[id="${item.id}"]`).click(); 
        } else if (item.options.input === 'slider') {
            p.isInteracting = true; p.interactingType = 'slider'; p.builder.highlight.updateOptionHighlight(true);
        } else if (item.options.input === 'drop') {
            p.isInteracting = true; p.interactingType = 'drop';
            const dropCont = p.domMenu.node.querySelector(`[id="d-${item.id}"]`);
            const list = dropCont.querySelector('.d-list');
            p.domMenu.node.querySelectorAll('.d-list').forEach(l => { l.style.display = 'none'; if(l.closest('.opt-row')) l.closest('.opt-row').style.zIndex = '1'; });
            list.style.display = 'block';
            if (dropCont.closest('.opt-row')) dropCont.closest('.opt-row').style.zIndex = '9999';
            p.activeDropdownList = list; p.activeDropdownItems = item.options.values; p.dropdownMax = p.activeDropdownItems.length;
            this.updateDropdownHighlight(); p.builder.highlight.updateOptionHighlight(true);
        } else if (item.options.input === 'keybind') {
            p.input.keybinder.startBinding(item.options.action, 0);
        }
    }

    changeSlider(dir) {
        const p = this.parent;
        const item = p.currentOptions[p.selectedOptionIndex];
        const input = p.domMenu.node.querySelector(`[id="${item.id}"]`);
        let val = parseFloat(input.value) + (dir * (item.options.step || 1));
        val = Math.max(item.options.min || 0, Math.min(item.options.max || 100, val));
        
        if (parseFloat(input.value) !== val) {
             this.scene.sound.play("scrollMenu"); 
             input.value = val;
             item.options.values[0] = val;
             p.domMenu.node.querySelector(`[id="t-sld-${item.id}"]`).innerText = val;
             
             window.OptionsStorage.save(item.id, 'slider', val); // GUARDADO
        }
    }

    updateDropdownHighlight() {
        const p = this.parent;
        if (!p.activeDropdownList) return;
        p.activeDropdownList.querySelectorAll('.d-item').forEach((item, idx) => {
            if (idx === p.dropdownIndex) {
                item.style.background = 'rgba(255,255,255,0.15)'; item.style.outline = '1px solid #44afff';
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else { item.style.background = 'transparent'; item.style.outline = 'none'; }
        });
    }

    selectDropdownOption() {
        const p = this.parent;
        const item = p.currentOptions[p.selectedOptionIndex];
        const val = p.activeDropdownItems[p.dropdownIndex];
        
        item.selectedValue = val.id;
        window.OptionsStorage.save(item.id, 'drop', val.id); // GUARDADO
        
        const lang = window.ClientGlobals?.language || 'en';
        window.AlphabetRenderer.render(this.scene, p.domMenu.node.querySelector(`[id="c-d-cur-${item.id}"]`), (val.label[lang] || val.id).toUpperCase(), 0.45);
        this.closeDropdown();
    }

    closeDropdown() {
        if (this.parent.activeDropdownList) {
            this.parent.activeDropdownList.style.display = 'none';
            if (this.parent.activeDropdownList.closest('.opt-row')) this.parent.activeDropdownList.closest('.opt-row').style.zIndex = '1'; 
        }
    }
}
window.InputInteractor = InputInteractor;