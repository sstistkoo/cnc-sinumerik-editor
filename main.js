// Globální proměnné
let canvas;
let ctx;
let points = [];
let currentPathIndex = -1;
let isDragging = false;
let lastX = 0;
let lastY = 0;
let scale = 1;
let offsetX = 0;
let offsetY = 0;

// Inicializace po načtení dokumentu
document.addEventListener('DOMContentLoaded', function() {
    // Počkáme na načtení DOM
    setTimeout(() => {
        initializeCanvas();
        setupEventListeners();
        initResizeHandlers();
        loadPrograms();
    }, 100);
});

// Inicializace canvasu
function initializeCanvas() {
    canvas = document.getElementById('canvas');
    if (!canvas) {
        console.error('Canvas element nenalezen!');
        return;
    }

    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Canvas context nenalezen!');
        return;
    }

    // Nastavení velikosti canvasu
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Vykreslení prázdné mřížky
    drawGrid();
}

// Funkce pro změnu velikosti canvasu
function resizeCanvas() {
    if (!canvas) return;
    
    const container = canvas.parentElement;
    if (!container) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // Překreslit při změně velikosti
    drawSimulation();
}

// Nastavení event listenerů
function setupEventListeners() {
    const btnOpen = document.getElementById('btnOpen');
    const btnSave = document.getElementById('btnSave');
    const btnSimulate = document.getElementById('btnSimulate');
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const fileInput = document.getElementById('fileInput');
    
    if (btnOpen) btnOpen.addEventListener('click', () => fileInput.click());
    if (fileInput) fileInput.addEventListener('change', openFile);
    if (btnSave) btnSave.addEventListener('click', saveFile);
    if (btnSimulate) btnSimulate.addEventListener('click', simulateProgram);
    if (btnPrev) btnPrev.addEventListener('click', showPreviousPoint);
    if (btnNext) btnNext.addEventListener('click', showNextPoint);
    
    setupCanvasEventListeners();
}

// Event listenery pro canvas
function setupCanvasEventListeners() {
    if (!canvas) return;

    canvas.addEventListener('mousedown', startDrag);
    canvas.addEventListener('mousemove', drag);
    canvas.addEventListener('mouseup', endDrag);
    canvas.addEventListener('wheel', handleZoom);
    canvas.addEventListener('mousemove', showPointInfo);
}

// Funkce pro vykreslení simulace
function drawSimulation() {
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Aplikace transformací
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Vykreslení mřížky
    drawGrid();

    if (!points || points.length === 0) {
        ctx.restore();
        return;
    }

    // Nastavení stylu pro kreslení dráhy
    ctx.strokeStyle = '#0066cc';
    ctx.lineWidth = 2 / scale;
    ctx.beginPath();

    // Transformace souřadnic a vykreslení bodů
    for (let i = 0; i < points.length; i++) {
        const transformedPoint = transformCoordinates(points[i].x, points[i].z);
        
        if (i === 0) {
            ctx.moveTo(transformedPoint.x, transformedPoint.y);
        } else {
            ctx.lineTo(transformedPoint.x, transformedPoint.y);
            // Pokud je to G0 (rychloposuv), přerušíme čáru
            if (points[i].movement === 'G0') {
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(transformedPoint.x, transformedPoint.y);
            }
        }

        // Zvýraznění aktivního bodu
        if (i === currentPathIndex) {
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(transformedPoint.x, transformedPoint.y, 5 / scale, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.stroke();

    ctx.restore();
}

// Funkce pro vykreslení mřížky
function drawGrid() {
    if (!ctx || !canvas) return;

    const gridSize = 50; // Velikost jednoho čtverce mřížky
    const gridColor = '#e0e0e0';
    
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1 / scale;

    // Vertikální čáry
    for (let x = 0; x < canvas.width / scale; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height / scale);
        ctx.stroke();
    }

    // Horizontální čáry
    for (let y = 0; y < canvas.height / scale; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width / scale, y);
        ctx.stroke();
    }

    // Vykreslení os
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2 / scale;
    
    // Osa X
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / (2 * scale));
    ctx.lineTo(canvas.width / scale, canvas.height / (2 * scale));
    ctx.stroke();
    
    // Osa Z
    ctx.beginPath();
    ctx.moveTo(canvas.width / (2 * scale), 0);
    ctx.lineTo(canvas.width / (2 * scale), canvas.height / scale);
    ctx.stroke();
}

// Pomocná funkce pro transformaci souřadnic
function transformCoordinates(x, z) {
    if (!canvas) return { x: 0, y: 0 };

    const centerX = canvas.width / (2 * scale);
    const centerY = canvas.height / (2 * scale);
    
    // Převod souřadnic z CNC do canvas souřadnic
    // CNC osa X -> canvas osa X (zprava doleva)
    // CNC osa Z -> canvas osa Y (zdola nahoru)
    return {
        x: centerX - (x / 10), // Dělíme 10 pro lepší měřítko
        y: centerY + (z / 10)  // Přičítáme pro obrácení osy Z
    };
}

// Funkce pro zpracování programu
function parseProgram(program) {
    const lines = program.split('\n');
    const newPoints = [];
    let currentX = 0;
    let currentZ = 0;
    let isAbsolute = true;
    let currentSpindleSpeed = '';
    let lineNumber = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith(';')) continue;
        
        const nMatch = line.match(/^N(\d+)/);
        if (nMatch) lineNumber = nMatch[1];
        
        if (line.includes('G90') || line.includes('ABS')) isAbsolute = true;
        if (line.includes('G91') || line.includes('INC')) isAbsolute = false;
        
        const spindleMatch = line.match(/[MS]=(\d+(\.\d+)?)/);
        if (spindleMatch) currentSpindleSpeed = spindleMatch[1];
        
        const xMatch = line.match(/X=?([^G\s]+)/);
        const zMatch = line.match(/Z=?([^G\s]+)/);
        const hasG0 = line.includes('G0');
        const hasG1 = line.includes('G1');
        
        if (xMatch || zMatch || hasG0 || hasG1) {
            let x = currentX;
            let z = currentZ;
            let addPoint = false;
            
            if (xMatch) {
                const newX = evaluateExpression(xMatch[1]);
                if (!isNaN(newX)) {
                    x = isAbsolute ? newX : currentX + newX;
                    addPoint = true;
                }
            }
            
            if (zMatch) {
                const newZ = evaluateExpression(zMatch[1]);
                if (!isNaN(newZ)) {
                    z = isAbsolute ? newZ : currentZ + newZ;
                    addPoint = true;
                }
            }
            
            if (addPoint || hasG0 || hasG1) {
                newPoints.push({
                    x: x,
                    z: z,
                    lineNumber: lineNumber,
                    spindleSpeed: currentSpindleSpeed,
                    originalLine: line,
                    lineIndex: i,
                    isAbsolute: isAbsolute,
                    movement: hasG0 ? 'G0' : (hasG1 ? 'G1' : '')
                });
                
                currentX = x;
                currentZ = z;
            }
        }
    }
    
    return newPoints;
}

// Funkce pro vyhodnocení výrazu
function evaluateExpression(expr) {
    try {
        if (/[a-zA-Z]/.test(expr) || expr.includes(',')) return NaN;
        expr = expr.replace('=', '');
        return Function('"use strict";return (' + expr + ')')();
    } catch (e) {
        console.error('Chyba při vyhodnocení výrazu:', expr, e);
        return NaN;
    }
}

// Funkce pro aktualizaci informací o bodu
function updatePointInfo(point) {
    if (!point) return;

    // Pomocná funkce pro bezpečné nastavení textu elementu
    function setElementText(id, text) {
        const element = document.getElementById(id);
        if (element) element.textContent = text;
    }

    // Aktualizace základních informací
    setElementText('currentPointNumber', point.number || '-');
    setElementText('pointLine', point.lineNumber || '-');
    setElementText('coordinateMode', point.isAbsolute ? 'G90 (ABS)' : 'G91 (INC)');
    setElementText('pointSpeed', point.spindleSpeed || '-');
    setElementText('pointFeed', point.feed || '-');
    
    // Aktualizace souřadnic
    setElementText('pointX', point.x ? point.x.toFixed(3) : '-');
    setElementText('pointZ', point.z ? point.z.toFixed(3) : '-');

    // Zvýraznění řádku v editoru
    if (point.lineNumber) {
        highlightProgramLine(point.lineNumber);
    }
}

// Funkce pro zvýraznění řádku v editoru
function highlightProgramLine(lineNumber) {
    const codeEditor = document.getElementById('codeEditor');
    if (!codeEditor) return;

    const lines = codeEditor.value.split('\n');
    let lineIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('N' + lineNumber) || 
            line.startsWith('N0' + lineNumber) ||
            line.includes('N' + lineNumber + ' ') ||
            line.includes('N0' + lineNumber + ' ')) {
            lineIndex = i;
            break;
        }
    }
    
    if (lineIndex !== -1) {
        const lineHeight = 21;
        const scrollPosition = lineHeight * lineIndex;
        codeEditor.scrollTop = scrollPosition - (codeEditor.clientHeight / 2);
        
        const start = lines.slice(0, lineIndex).join('\n').length + (lineIndex > 0 ? 1 : 0);
        const end = start + lines[lineIndex].length;
        
        codeEditor.setSelectionRange(start, end);
        codeEditor.focus();
    }
}

// Funkce pro navigaci v programu
function navigateProgram(direction) {
    if (!points || points.length === 0) return;
    
    if (currentPathIndex === -1) {
        currentPathIndex = 0;
    } else {
        currentPathIndex = direction === 'prev' 
            ? Math.max(0, currentPathIndex - 1)
            : Math.min(points.length - 1, currentPathIndex + 1);
    }
    
    selectedPoint = points[currentPathIndex];
    updatePointInfo(selectedPoint);
    drawSimulation();
}

// Funkce pro simulaci programu
function simulateProgram() {
    const content = document.getElementById('codeEditor').value;
    points = parseProgram(content); // Přiřazení bodů do globální proměnné
    currentPathIndex = -1;
    console.log('Simulované body:', points); // Pro debugování
    drawSimulation();
}

// Funkce pro otevření souboru
function openFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        document.getElementById('codeEditor').value = content;
        updateLineNumbers();
        points = parseProgram(content); // Přiřazení bodů do globální proměnné
        currentPathIndex = -1;
        drawSimulation();
        console.log('Načtené body:', points); // Pro debugování
    };
    reader.readAsText(file);
}

// Funkce pro uložení souboru
function saveFile() {
    const content = document.getElementById('codeEditor').value;
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'program.mpf';
    a.click();
    URL.revokeObjectURL(a.href);
}

// Funkce pro aktualizaci čísel řádků
function updateLineNumbers() {
    const codeEditor = document.getElementById('codeEditor');
    const lineNumbers = document.getElementById('lineNumbers');
    const lines = codeEditor.value.split('\n');
    lineNumbers.innerHTML = lines.map((_, i) => i + 1).join('\n');
}

// Funkce pro resize panelů
function initResizeHandlers() {
    const container = document.querySelector('.container');
    const programsPanel = document.querySelector('.editor-panel.programs');
    const codePanel = document.querySelector('.editor-panel.code');
    
    [programsPanel, codePanel].forEach(panel => {
        if (!panel) return;
        
        panel.addEventListener('mousedown', function(e) {
            if (e.offsetX > (this.offsetWidth - 10)) {
                this.style.cursor = 'col-resize';
                const startX = e.clientX;
                const startWidth = this.offsetWidth;
                
                function resize(e) {
                    if (e.buttons !== 1) {
                        stopResize();
                        return;
                    }
                    
                    const width = startWidth + e.clientX - startX;
                    const minWidth = 200;
                    const maxWidth = container.offsetWidth - 600;
                    
                    this.style.flexBasis = Math.min(Math.max(width, minWidth), maxWidth) + 'px';
                }
                
                function stopResize() {
                    document.removeEventListener('mousemove', resize);
                    document.removeEventListener('mouseup', stopResize);
                    this.style.cursor = '';
                }
                
                document.addEventListener('mousemove', resize.bind(this));
                document.addEventListener('mouseup', stopResize.bind(this));
            }
        });
    });
}

// Funkce pro navigaci na předchozí bod
function showPreviousPoint() {
    if (!points || points.length === 0) return;
    
    currentPathIndex = Math.max(0, currentPathIndex - 1);
    selectedPoint = points[currentPathIndex];
    updatePointInfo(selectedPoint);
    drawSimulation();
}

// Funkce pro navigaci na další bod
function showNextPoint() {
    if (!points || points.length === 0) return;
    
    currentPathIndex = Math.min(points.length - 1, currentPathIndex + 1);
    selectedPoint = points[currentPathIndex];
    updatePointInfo(selectedPoint);
    drawSimulation();
}

// Funkce pro zahájení tažení
function startDrag(e) {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
}

// Funkce pro tažení
function drag(e) {
    if (!isDragging) return;
    
    offsetX += e.clientX - lastX;
    offsetY += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    
    drawSimulation();
}

// Funkce pro ukončení tažení
function endDrag() {
    isDragging = false;
}

// Funkce pro zpracování kolečka myši
function handleZoom(e) {
    e.preventDefault();
    
    const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = scale * zoomDelta;
    
    if (newScale >= 0.1 && newScale <= 10) {
        scale = newScale;
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        offsetX = mouseX - (mouseX - offsetX) * zoomDelta;
        offsetY = mouseY - (mouseY - offsetY) * zoomDelta;
        
        drawSimulation();
    }
}

// Funkce pro zobrazení informací o bodu
function showPointInfo(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const point = getPointAt(x, y);
    if (point) {
        updatePointInfo(point);
    } else {
        const pointInfo = document.querySelector('.point-info');
        if (pointInfo) pointInfo.innerHTML = '';
    }
}

// Funkce pro získání bodu na pozici
function getPointAt(x, y) {
    if (!points || points.length === 0) return null;
    
    const threshold = 5 / scale;
    const closestPoint = null;
    let closestDistance = Infinity;
    
    for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const transformedPoint = transformCoordinates(point.x, point.z);
        const distance = Math.sqrt(Math.pow(x - transformedPoint.x, 2) + Math.pow(y - transformedPoint.y, 2));
        
        if (distance < threshold && distance < closestDistance) {
            closestPoint = point;
            closestDistance = distance;
        }
    }
    
    return closestPoint;
}

// Funkce pro zpracování obsahu podprogramu
function parseSubProgramInfo(content) {
    const lines = content.split('\n');
    const info = {
        toolNumber: '',
        correctionNumber: '',
        note: ''
    };

    // Hledání informací v prvních řádcích
    for (let i = 0; i < Math.min(lines.length, 2); i++) {
        const line = lines[i].trim();
        
        // Hledání nástroje (T) a korekce (D)
        const toolMatch = line.match(/T(\d+)/);
        if (toolMatch) info.toolNumber = toolMatch[1];
        
        const correctionMatch = line.match(/D(\d+)/);
        if (correctionMatch) info.correctionNumber = correctionMatch[1];
        
        // Hledání poznámky (text za středníkem)
        const noteMatch = line.match(/;(.+)/);
        if (noteMatch && !info.note) info.note = noteMatch[1].trim();
    }

    return info;
}

// Funkce pro zobrazení podprogramu v seznamu
function displaySubProgram(name, content) {
    const subProgramsList = document.getElementById('subProgramsList');
    const template = document.getElementById('subProgramTemplate');
    
    if (!subProgramsList || !template) return;

    const info = parseSubProgramInfo(content);
    const clone = template.content.cloneNode(true);
    
    // Nastavení obsahu
    clone.querySelector('.program-name').textContent = name;
    clone.querySelector('.tool-number').textContent = info.toolNumber || '-';
    clone.querySelector('.correction-number').textContent = info.correctionNumber || '-';
    clone.querySelector('.note-text').textContent = info.note || '-';
    
    // Přidání event listeneru pro kliknutí
    const programItem = clone.querySelector('.program-item');
    programItem.addEventListener('click', () => loadProgramContent(name, content));
    
    subProgramsList.appendChild(clone);
}

// Upravená funkce pro načtení programů
function loadPrograms() {
    const mainProgramsList = document.getElementById('mainProgramsList');
    const subProgramsList = document.getElementById('subProgramsList');
    
    if (!mainProgramsList || !subProgramsList) return;
    
    // Vyčištění seznamů
    mainProgramsList.innerHTML = '';
    subProgramsList.innerHTML = '';
    
    // Načtení programů ze složky
    // Zde by měla být implementace načítání souborů
    // Pro ukázku použijeme example programy
    const EXAMPLE_PROGRAMS = {
        main: {
            'EXAMPLE1.MPF': `N10 G0 X0 Z0
N20 G1 X10 Z0 F100
N30 G1 X10 Z-20
N40 G1 X20 Z-20
N50 G1 X20 Z-40
N60 G0 X50 Z50`,
            'EXAMPLE2.MPF': `N10 G0 X0 Z0
N20 G1 X30 Z0 F100
N30 G1 X30 Z-30
N40 G0 X50 Z50`
        },
        sub: {
            'SUB1.SPF': `T1 D1 ; Hrubovací nůž vnější
N10 G0 X0 Z0 ; Hrubování vnějšího průměru
N20 G1 X15 Z0 F100
N30 G1 X15 Z-15
N40 G0 X0 Z0`,
            'SUB2.SPF': `T2 D1 ; Dokončovací nůž vnější
N10 G0 X0 Z0 ; Dokončování vnějšího průměru
N20 G1 X20 Z0 F80
N30 G1 X20 Z-25
N40 G0 X0 Z0`
        }
    };
    
    for (const [name, content] of Object.entries(EXAMPLE_PROGRAMS.main)) {
        const div = document.createElement('div');
        div.textContent = name;
        div.addEventListener('click', () => loadProgramContent(name, content));
        mainProgramsList.appendChild(div);
    }
    
    for (const [name, content] of Object.entries(EXAMPLE_PROGRAMS.sub)) {
        displaySubProgram(name, content);
    }
}
