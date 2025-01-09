// Třída pro správu simulace a zvýraznění řádků
class SimulationManager {
    constructor() {
        this.points = [];
        this.currentPointIndex = -1;
        this.codeLines = [];
        this.activeLineNumber = -1;
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
}

// Exportovat třídu pro použití v hlavním souboru
export const simulationManager = new SimulationManager();
