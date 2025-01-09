// Třída pro správu simulace a zvýraznění řádků
class SimulationManager {
    constructor() {
        this.points = [];
        this.currentPointIndex = -1;
        this.codeLines = [];
        this.activeLineNumber = -1;
        this.touchStartDistance = 0;
        this.currentScale = 1;
        this.isZooming = false;
    }

    // Nastaví body pro simulaci
    setPoints(points) {
        this.points = points;
        this.currentPointIndex = -1;
        this.updateDisplay();
    }

    // Aktualizuje zobrazení kódu a zvýraznění
    updateDisplay() {
        const currentPoint = this.points[this.currentPointIndex];
        if (currentPoint) {
            this.activeLineNumber = currentPoint.lineNumber;
            this.updateCodeContext(currentPoint.lineNumber);
            this.highlightEditorLine(currentPoint.lineNumber);
        }
    }

    // Aktualizuje kontext kódu (6 řádků)
    updateCodeContext(centerLineNumber) {
        const codeContext = document.querySelector('.code-context');
        if (!codeContext) return;

        // Vyčistit předchozí obsah
        codeContext.innerHTML = '';

        // Získat okolní řádky
        const startLine = Math.max(0, centerLineNumber - 2);
        const endLine = startLine + 5;

        for (let i = startLine; i <= endLine; i++) {
            const line = document.createElement('div');
            line.className = 'code-line';
            
            // Zvýraznit druhý řádek
            if (i === startLine + 1) {
                line.classList.add('highlighted');
            }

            // Zvýraznit řádek s bodem
            if (this.hasPointAtLine(i)) {
                line.classList.add('has-point');
            }

            line.textContent = this.codeLines[i] || '';
            codeContext.appendChild(line);
        }
    }

    // Kontroluje, zda je na daném řádku bod
    hasPointAtLine(lineNumber) {
        return this.points.some(point => point.lineNumber === lineNumber);
    }

    // Zvýrazní řádek v editoru
    highlightEditorLine(lineNumber) {
        const editor = document.getElementById('codeEditor');
        if (!editor) return;

        // Odstranit předchozí zvýraznění
        editor.querySelectorAll('.line-highlight').forEach(el => el.classList.remove('line-highlight'));

        // Přidat nové zvýraznění
        const lines = editor.value.split('\n');
        if (lineNumber >= 0 && lineNumber < lines.length) {
            const start = lines.slice(0, lineNumber).join('\n').length + (lineNumber > 0 ? 1 : 0);
            const end = start + lines[lineNumber].length;
            
            if (typeof editor.setSelectionRange === 'function') {
                editor.setSelectionRange(start, end);
            }
        }
    }

    // Nastaví obsah editoru
    setCodeContent(code) {
        this.codeLines = code.split('\n');
    }

    // Přejde na další bod
    nextPoint() {
        if (this.currentPointIndex < this.points.length - 1) {
            this.currentPointIndex++;
            this.updateDisplay();
        }
    }

    // Přejde na předchozí bod
    previousPoint() {
        if (this.currentPointIndex > 0) {
            this.currentPointIndex--;
            this.updateDisplay();
        }
    }

    // Přidání touch event listenerů
    addTouchListeners(canvas) {
        canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), false);
        canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), false);
        canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), false);
    }

    // Funkce pro touch gesta
    handleTouchStart(event) {
        if (event.touches.length === 2) {
            this.isZooming = true;
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            this.touchStartDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
        }
    }

    handleTouchMove(event) {
        if (this.isZooming && event.touches.length === 2) {
            event.preventDefault(); // Zabrání scrollování během zoomu
            
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            const currentDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );

            const scale = currentDistance / this.touchStartDistance;
            const newScale = this.currentScale * scale;

            // Omezení minimálního a maximálního zoomu
            if (newScale >= 0.5 && newScale <= 5) {
                this.currentScale = newScale;
                this.redrawCanvas();
            }
        }
    }

    handleTouchEnd(event) {
        if (event.touches.length < 2) {
            this.isZooming = false;
        }
    }

    // Upravení existující funkce pro zoom kolečkem
    addWheelListener(canvas) {
        canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
            const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = this.currentScale * scaleFactor;
            
            // Omezení minimálního a maximálního zoomu
            if (newZoom >= 0.5 && newZoom <= 5) {
                this.currentScale = newZoom;
                this.redrawCanvas();
            }
        });
    }

    // Funkce pro překreslení canvasu
    redrawCanvas() {
        // Překreslení canvasu zde
    }
}

// Exportovat třídu pro použití v hlavním souboru
export const simulationManager = new SimulationManager();
