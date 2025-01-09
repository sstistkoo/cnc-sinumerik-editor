// Správce programů
export class ProgramManager {
    constructor() {
        this.mainPrograms = new Map();
        this.subPrograms = new Map();
        this.onProgramSelect = null;
    }

    loadFiles(files) {
        // Vyčištění seznamů
        this.mainPrograms.clear();
        this.subPrograms.clear();
        document.getElementById('mainPrograms').innerHTML = '';
        document.getElementById('subPrograms').innerHTML = '';

        // Načtení souborů
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                if (file.name.toUpperCase().endsWith('.MPF')) {
                    this.addProgram(file.name, content, this.mainPrograms, 'mainPrograms');
                } else if (file.name.toUpperCase().endsWith('.SPF')) {
                    this.addProgram(file.name, content, this.subPrograms, 'subPrograms');
                }
            };
            reader.readAsText(file);
        });
    }

    addProgram(name, content, collection, elementId) {
        // Přidání do kolekce
        collection.set(name, content);

        // Vytvoření elementu
        const div = document.createElement('div');
        div.className = 'program-item';
        div.textContent = name;
        div.onclick = () => {
            // Odstranění aktivní třídy
            document.querySelectorAll('.program-item').forEach(item => {
                item.classList.remove('active');
            });
            // Přidání aktivní třídy
            div.classList.add('active');
            // Načtení programu
            if (this.onProgramSelect) {
                this.onProgramSelect(content);
            }
        };

        // Přidání do seznamu
        document.getElementById(elementId).appendChild(div);

        // Automatické načtení prvního programu
        if (collection.size === 1 && elementId === 'mainPrograms') {
            div.click();
        }
    }

    saveCurrentProgram() {
        const editor = document.getElementById('editor');
        if (!editor) return;

        const content = editor.value;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'program.mpf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
