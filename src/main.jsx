import React from 'react';
import ReactDOM from 'react-dom/client';
import CNCPathVisualization from './components/CNCPathVisualization';

// Funkce pro získání aktuálního kódu z editoru
function getCurrentCode() {
    const editor = document.getElementById('codeEditor');
    return editor ? editor.value : '';
}

// Vytvoření React komponenty a její aktualizace při změně kódu
const root = ReactDOM.createRoot(document.getElementById('react-root'));

function renderVisualization() {
    root.render(
        <React.StrictMode>
            <CNCPathVisualization programCode={getCurrentCode()} />
        </React.StrictMode>
    );
}

// Přidání event listeneru pro aktualizaci při změně kódu
document.getElementById('codeEditor').addEventListener('input', renderVisualization);
document.getElementById('btnSimulate').addEventListener('click', renderVisualization);

// Počáteční vykreslení
renderVisualization();
