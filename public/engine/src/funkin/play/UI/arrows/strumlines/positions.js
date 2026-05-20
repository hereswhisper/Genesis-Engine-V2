// src/funkin/play/UI/arrows/strumlines/positions.js

class ClassicalPosition {
    constructor(scene) {
        this.scene = scene;

        this.STRUMLINE_X_OFFSET = 100;
        this.STRUMLINE_Y_OFFSET = 100;
        this.DOWNSCROLL_MARGIN = this.STRUMLINE_Y_OFFSET + 30;

        const logicalWidth = window.wide ? window.wide.getCurrentWidth() : this.scene.scale.width;
        const logicalHeight = this.scene.scale.height;
        const baseSize = { x: 1280, y: 720 };

        this.cutoutSize = {
            x: Math.max(0, Math.ceil(logicalWidth - baseSize.x)),
            y: Math.max(0, Math.ceil(logicalHeight - baseSize.y))
        };
    }

    getPos(index, isPlayer, baseSpacing, baseScale, globalDownscroll, offsets = [0, 0], middleScroll = 'none', isMobile = false, hideOpStrums = false, hideOpNotes = false) {
        const width = window.wide ? window.wide.getCurrentWidth() : this.scene.scale.width;
        const height = this.scene.scale.height;

        const baseWidth = 1280;
        const baseHeight = 720;

        const amplification = (width / height) / (baseWidth / baseHeight);

        let mode = middleScroll;
        if (isMobile) mode = 'mobile';

        let scale = baseScale;
        let strumAlpha = 1.0;
        let noteAlpha = 1.0;
        let actualDownscroll = globalDownscroll;

        if (mode === 'mobile') {
            if (isPlayer) {
                actualDownscroll = true;
                scale = baseScale * 1.15;
            } else {
                scale = baseScale * 0.4 * amplification;
                strumAlpha = 0.3;
                noteAlpha = 0.3;
                actualDownscroll = false;
            }
        } else if (mode === 'mini') {
            if (!isPlayer) {
                scale = baseScale * 0.4;
                strumAlpha = 0.5;
                noteAlpha = 0.5;
            }
        } else if (mode === 'split') {
            if (!isPlayer) {
                strumAlpha = 0.5;
                noteAlpha = 0.5;
            }
        }

        if (!isPlayer) {
            if (hideOpStrums) {
                strumAlpha = 0;
                noteAlpha = 0;
            } else if (hideOpNotes) {
                noteAlpha = 0;
            }
        }

        const spacing = 160 * scale;
        const strumHeight = 160 * scale;

        // Eje X
        let x = 0;
        if (isPlayer) {
            if (mode === 'mobile') {
                let mobSpacing = spacing + 50;
                let centerGap = 140 * amplification;

                if (index === 0) x = (width / 2) - centerGap - mobSpacing;
                else if (index === 1) x = (width / 2) - centerGap;
                else if (index === 2) x = (width / 2) + centerGap;
                else if (index === 3) x = (width / 2) + centerGap + mobSpacing;

            } else if (mode === 'split' || mode === 'mini') {
                let startX = (width / 2) - (spacing * 1.5);
                x = startX + (index * spacing);
            } else {
                let startX = (width / 2) + this.STRUMLINE_X_OFFSET + (this.cutoutSize.x / 2.5);
                x = startX + (index * spacing);
            }
        } else {
            if (mode === 'split') {
                if (index === 0 || index === 1) {
                    x = this.STRUMLINE_X_OFFSET + (this.cutoutSize.x / 2.5) + (index * spacing);
                } else {
                    let rightStartX = width - this.STRUMLINE_X_OFFSET - (this.cutoutSize.x / 2.5) - (spacing * 2);
                    x = rightStartX + ((index - 2) * spacing);
                }
            } else if (mode === 'mini' || mode === 'mobile') {
                let startX = this.STRUMLINE_X_OFFSET - 30;
                x = startX + (index * spacing);
            } else {
                let startX = this.STRUMLINE_X_OFFSET + (this.cutoutSize.x / 2.5);
                x = startX + (index * spacing);
            }
        }

        // Eje Y
        let y = 0;
        let playerYBase = actualDownscroll
            ? (height - this.DOWNSCROLL_MARGIN - offsets[1] - (this.cutoutSize.y / 2))
            : (this.STRUMLINE_Y_OFFSET + offsets[1] + (this.cutoutSize.y / 2));

        if (isPlayer && mode === 'mobile') {
            y = (height - strumHeight) * 0.95;
        } else if (!isPlayer && mode === 'mini' && !window.isMobile) {
            const miniOffset = actualDownscroll ? -30 : 30;
            y = playerYBase + miniOffset;
        } else if (!isPlayer && (mode === 'mini' || mode === 'mobile')) {
            const safeTopMargin = (this.STRUMLINE_Y_OFFSET * 0.8) + (this.cutoutSize.y / 2);
            y = safeTopMargin;
            if (actualDownscroll) y = height - safeTopMargin - strumHeight;
        } else {
            y = playerYBase;
        }

        return { x, y, scale, strumAlpha, noteAlpha, downscroll: actualDownscroll };
    }
}

window.ClassicalPosition = ClassicalPosition;
