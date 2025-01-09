// Importy modulů
import { ProgramManager } from './programManager.js';
import { Simulator } from './simulator.js';
import { UI } from './ui.js';

// Hlavní třída aplikace
class App {
    constructor() {
        this.programManager = new ProgramManager();
        this.simulator = new Simulator('canvas');
        this.ui = new UI();
        
        this.setupEventListeners();
        this.loadExampleProgram();
    }

    setupEventListeners() {
        // Načtení souborů
        document.getElementById('btnOpen').onclick = () => document.getElementById('fileInput').click();
        document.getElementById('fileInput').onchange = (e) => this.programManager.loadFiles(e.target.files);
        document.getElementById('btnSave').onclick = () => this.programManager.saveCurrentProgram();

        // Ovládání simulace
        document.getElementById('btnPrev').onclick = () => this.simulator.prevPoint();
        document.getElementById('btnNext').onclick = () => this.simulator.nextPoint();
        document.getElementById('btnCenter').onclick = () => this.simulator.centerView();

        // Editor
        document.getElementById('editor').oninput = () => {
            const code = document.getElementById('editor').value;
            this.simulator.simulate(code);
        };

        // Události programů
        this.programManager.onProgramSelect = (code) => {
            document.getElementById('editor').value = code;
            this.simulator.simulate(code);
        };

        // Události simulace
        this.simulator.onPointChange = (point) => {
            this.ui.updateInfo(point);
        };
    }

    loadExampleProgram() {
        const example = `N10 G0 X0 Z0
N20 G1 X10 Z0 F100
N30 G1 X10 Z-20
N40 G1 X20 Z-20
N50 G1 X20 Z-40
N60 G0 X50 Z50`;
        
        document.getElementById('editor').value = example;
        this.simulator.simulate(example);
    }
}

// Spuštění aplikace
window.onload = () => new App();
