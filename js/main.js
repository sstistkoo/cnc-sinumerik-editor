// Globální proměnné pro simulaci
let points = [];
let currentPoint = 0;
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let lastX = 0;
let lastY = 0;
let hoveredPoint = -1;
let isPlaying = false;
let playInterval = null;
let currentProgram = null;

// Event listenery pro canvas
function setupCanvasEvents(canvas) {
    // Zoom kolečkem myši
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const oldScale = scale;
        scale *= e.deltaY > 0 ? 0.9 : 1.1;
        scale = Math.min(Math.max(scale, 0.1), 10);

        const factor = scale / oldScale - 1;
        offsetX -= (mouseX - canvas.width/2 - offsetX) * factor;
        offsetY -= (mouseY - canvas.height/2 - offsetY) * factor;

        drawSimulation();
    });

    // Posuv tažením myši
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Kontrola, zda jsme klikli na bod
        const clickedPoint = findPointNearMouse(mouseX, mouseY);
        if (clickedPoint !== -1) {
            currentPoint = clickedPoint;
            drawSimulation();
            updatePointInfo(points[currentPoint]);
            return;
        }

        isDragging = true;
        lastX = mouseX;
        lastY = mouseY;
    });

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (isDragging) {
            offsetX += mouseX - lastX;
            offsetY += mouseY - lastY;
            lastX = mouseX;
            lastY = mouseY;
            drawSimulation();
        } else {
            // Kontrola, zda jsme nad bodem
            const point = findPointNearMouse(mouseX, mouseY);
            if (point !== hoveredPoint) {
                hoveredPoint = point;
                drawSimulation();
            }
        }
    });

    canvas.addEventListener('mouseup', () => isDragging = false);
    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
        hoveredPoint = -1;
        drawSimulation();
    });
}

// Funkce pro nalezení bodu blízko myši
function findPointNearMouse(mouseX, mouseY) {
    const canvas = document.getElementById('simulationCanvas');
    if (!canvas) return -1;

    // Převod souřadnic myši do souřadnic simulace
    const simX = (mouseX - canvas.width/2 - offsetX) / scale;
    const simY = (mouseY - canvas.height/2 - offsetY) / scale;

    // Hledání nejbližšího bodu
    const threshold = 5 / scale; // Poloměr pro detekci bodu
    for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const dx = point.x - simX;
        const dy = point.y - simY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < threshold) {
            return i;
        }
    }
    return -1;
}

// Inicializace aplikace
function init() {
    const canvas = document.getElementById('simulationCanvas');
    if (canvas) {
        // Nastavení pevné velikosti canvasu
        canvas.width = 400;
        canvas.height = 400;
        setupCanvasEvents(canvas);
    }

    // Načtení příkladových programů
    loadPrograms();

    // Event listenery pro tlačítka
    document.getElementById('btnPrev')?.addEventListener('click', () => movePoint(-1));
    document.getElementById('btnNext')?.addEventListener('click', () => movePoint(1));
    document.getElementById('btnCenter')?.addEventListener('click', centerSimulation);
    document.getElementById('btnPlay')?.addEventListener('click', togglePlay);
    document.getElementById('btnOpen')?.addEventListener('click', () => document.getElementById('fileInput')?.click());
    document.getElementById('btnSave')?.addEventListener('click', saveProgram);

    // Event listener pro načtení souborů
    document.getElementById('fileInput')?.addEventListener('change', handleFileSelect);

    // Event listener pro editor
    const editor = document.getElementById('codeEditor');
    if (editor) {
        editor.addEventListener('input', () => {
            const cleanCode = getCleanCode();
            simulateProgram(cleanCode);
        });
    }
}

// Inicializace po načtení stránky
document.addEventListener('DOMContentLoaded', init);

// Funkce pro vykreslení simulace
function drawSimulation() {
    const canvas = document.getElementById('simulationCanvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Vyčištění canvasu
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Aplikace transformace
    ctx.save();
    ctx.translate(canvas.width/2 + offsetX, canvas.height/2 + offsetY);
    ctx.scale(scale, scale);

    // Vykreslení os
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1/scale;
    ctx.beginPath();
    ctx.moveTo(-canvas.width/2, 0);
    ctx.lineTo(canvas.width/2, 0);
    ctx.moveTo(0, -canvas.height/2);
    ctx.lineTo(0, canvas.height/2);
    ctx.stroke();

    // Vykreslení dráhy
    for (let i = 1; i < points.length; i++) {
        const start = points[i-1];
        const end = points[i];

        if (end.command === 'G0') {
            ctx.strokeStyle = '#999';
            ctx.setLineDash([5/scale, 5/scale]);
        } else {
            ctx.strokeStyle = '#007bff';
            ctx.setLineDash([]);
        }

        ctx.lineWidth = 2/scale;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
    }

    // Vykreslení bodů
    ctx.setLineDash([]);
    points.forEach((point, index) => {
        // Vykreslit bod pouze pokud má příkaz pohybu (G0/G1)
        if (point.command && (point.command.startsWith('G0') || point.command.startsWith('G1'))) {
            // Styl bodu podle stavu
            if (index === currentPoint) {
                // Vykreslení zvýrazňujícího kruhu
                ctx.beginPath();
                ctx.arc(point.x, point.y, 15/scale, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(220, 53, 69, 0.2)';  // Červená s průhledností
                ctx.fill();
                
                // Vykreslení pulzujícího kruhu
                const pulseSize = 20/scale + (Math.sin(Date.now() / 200) + 1) * 5/scale;
                ctx.beginPath();
                ctx.arc(point.x, point.y, pulseSize, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(220, 53, 69, 0.5)';
                ctx.lineWidth = 2/scale;
                ctx.stroke();
                
                // Vykreslení samotného bodu
                ctx.fillStyle = '#dc3545';
                ctx.strokeStyle = '#dc3545';
            } else if (index === hoveredPoint) {
                ctx.fillStyle = '#ffc107';
                ctx.strokeStyle = '#ffc107';
            } else {
                ctx.fillStyle = '#007bff';
                ctx.strokeStyle = '#007bff';
            }

            // Vykreslení bodu
            ctx.beginPath();
            ctx.arc(point.x, point.y, 3/scale, 0, Math.PI * 2);
            ctx.fill();

            // Vykreslení čísla bodu
            ctx.font = `${12/scale}px Arial`;
            if (index === currentPoint) {
                ctx.font = `bold ${14/scale}px Arial`;  // Větší a tučné číslo pro aktivní bod
            }
            ctx.fillText(index.toString(), point.x + 5/scale, point.y - 5/scale);

            // Pokud je bod pod myší, zobraz tooltip
            if (index === hoveredPoint) {
                ctx.fillStyle = '#000';
                ctx.fillRect(point.x + 15/scale, point.y - 25/scale, 80/scale, 20/scale);
                ctx.fillStyle = '#fff';
                ctx.fillText(`X${point.x.toFixed(3)} Z${(-point.y).toFixed(3)}`, point.x + 20/scale, point.y - 10/scale);
            }

            // Zobrazení souřadnic pro aktivní bod
            if (index === currentPoint) {
                ctx.fillStyle = '#dc3545';
                ctx.font = `bold ${12/scale}px Arial`;
                ctx.fillText(`X${point.x.toFixed(3)} Z${(-point.y).toFixed(3)}`, point.x + 20/scale, point.y + 20/scale);
            }
        }
    });

    ctx.restore();

    // Požádáme o další snímek pro animaci pulzování
    requestAnimationFrame(drawSimulation);
}

// Funkce pro aktualizaci informací o bodu
function updatePointInfo(point) {
    if (!point) {
        document.getElementById('currentPointNumber').textContent = '-';
        document.getElementById('pointLine').textContent = '-';
        document.getElementById('pointCommand').textContent = '-';
        document.getElementById('pointSpeed').textContent = '-';
        document.getElementById('pointFeed').textContent = '-';
        document.getElementById('pointX').textContent = '-';
        document.getElementById('pointZ').textContent = '-';
        document.getElementById('contextCode').textContent = '';
        return;
    }

    // Bod a řádek
    document.getElementById('currentPointNumber').textContent = points.indexOf(point);
    document.getElementById('pointLine').textContent = point.line + 1;
    
    // Příkaz
    document.getElementById('pointCommand').textContent = point.command || '-';
    
    // Otáčky a posuv
    document.getElementById('pointSpeed').textContent = point.speed || '-';
    document.getElementById('pointFeed').textContent = point.feed || '-';
    
    // Souřadnice (absolutní hodnoty)
    document.getElementById('pointX').textContent = (point.x !== undefined) ? Math.abs(point.x).toFixed(3) : '-';
    document.getElementById('pointZ').textContent = (point.y !== undefined) ? Math.abs(point.y).toFixed(3) : '-';

    // Zobrazení kontextu kódu
    let contextLines = [];
    const program = getCleanCode().split('\n');
    const lineIndex = point.line;
    
    // Získání okolních řádků
    const start = Math.max(0, lineIndex - 2);
    const end = Math.min(program.length, lineIndex + 3);
    
    for (let i = start; i < end; i++) {
        const line = program[i].trim();
        if (i === lineIndex) {
            contextLines.push('> ' + line);
        } else {
            contextLines.push('  ' + line);
        }
    }
    
    document.getElementById('contextCode').textContent = contextLines.join('\n');
}

// Funkce pro aktualizaci čísel řádků a zvýraznění
function updateLineNumbers() {
    const editor = document.getElementById('codeEditor');
    const lineNumbers = document.getElementById('lineNumbers');
    if (!editor || !lineNumbers) return;

    const lines = editor.value.split('\n');
    const numbers = lines.map((_, i) => {
        const isCurrentLine = currentPoint < points.length && points[currentPoint].line === i;
        return `<div class="${isCurrentLine ? 'active-line' : ''}">${(i + 1).toString().padStart(4, ' ')}</div>`;
    }).join('');
    lineNumbers.innerHTML = numbers;

    // Zvýraznění řádku v editoru
    const currentLine = currentPoint < points.length ? points[currentPoint].line : -1;
    const start = editor.value.split('\n').slice(0, currentLine).join('\n').length + (currentLine > 0 ? 1 : 0);
    const end = start + lines[currentLine]?.length || 0;

    // Odstranění předchozího zvýraznění
    editor.style.cssText = '';

    if (currentLine >= 0) {
        // Vytvoření zvýraznění pomocí textových dekorací
        const textLength = editor.value.length;
        const before = editor.value.substring(0, start);
        const highlight = editor.value.substring(start, end);
        const after = editor.value.substring(end);

        editor.value = before + highlight + after;

        // Přidání zvýraznění pomocí CSS
        const lineHeight = parseInt(window.getComputedStyle(editor).lineHeight);
        const topOffset = currentLine * lineHeight;
        
        // Přidání modré barvy pozadí pro aktivní řádek
        editor.style.cssText = `
            background-image: linear-gradient(transparent ${topOffset}px, rgba(0, 123, 255, 0.1) ${topOffset}px, rgba(0, 123, 255, 0.1) ${topOffset + lineHeight}px, transparent ${topOffset + lineHeight}px);
        `;
    }
}

// Funkce pro přehrávání simulace
function togglePlay() {
    const playButton = document.getElementById('btnPlay');
    
    if (isPlaying) {
        // Zastavení přehrávání
        isPlaying = false;
        playButton.textContent = '▶';
        if (playInterval) {
            clearInterval(playInterval);
            playInterval = null;
        }
    } else {
        // Spuštění přehrávání
        isPlaying = true;
        playButton.textContent = '⏸';
        
        // Pokud jsme na konci, začneme od začátku
        if (currentPoint >= points.length - 1) {
            currentPoint = 0;
        }
        
        playInterval = setInterval(() => {
            if (currentPoint < points.length - 1) {
                currentPoint++;
                updatePointInfo(points[currentPoint]);
                drawSimulation();
                updateLineNumbers();
                
                // Automatické scrollování v editoru
                const editor = document.getElementById('codeEditor');
                const lineHeight = parseInt(window.getComputedStyle(editor).lineHeight);
                const currentLine = points[currentPoint].line;
                const scrollPosition = currentLine * lineHeight;
                editor.scrollTop = scrollPosition - editor.clientHeight / 2;
            } else {
                // Zastavení na konci
                togglePlay();
            }
        }, 500); // Interval 500ms (půl sekundy)
    }
}

// Funkce pro změnu aktivního bodu
function movePoint(delta) {
    const newPoint = currentPoint + delta;
    if (newPoint >= 0 && newPoint < points.length) {
        currentPoint = newPoint;
        drawSimulation();
        updatePointInfo(points[currentPoint]);
    }
}

// Funkce pro vycentrování simulace
function centerSimulation() {
    // Výpočet hranic bodů
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    maxY = -Infinity;

    points.forEach(point => {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
    });

    const canvas = document.getElementById('simulationCanvas');
    if (!canvas) return;

    // Přidání okrajů
    const padding = 20;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;

    // Výpočet měřítka
    const scaleX = canvas.width / (maxX - minX);
    const scaleY = canvas.height / (maxY - minY);
    scale = Math.min(scaleX, scaleY);

    // Výpočet offsetu pro vycentrování
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    offsetX = -centerX * scale;
    offsetY = -centerY * scale;

    drawSimulation();
}

// Funkce pro uložení programu
function saveProgram() {
    const editor = document.getElementById('codeEditor');
    if (!editor) return;

    const cleanCode = getCleanCode();
    const blob = new Blob([cleanCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentProgram || 'program.mpf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Funkce pro načtení programů
function loadPrograms() {
    const mainList = document.getElementById('mainProgramsList');
    const subList = document.getElementById('subProgramsList');
    
    if (!mainList || !subList) return;

    // Zobrazení hlavních programů
    mainList.innerHTML = EXAMPLE_PROGRAMS.main.map(prog => `
        <div class="program-item" onclick="loadProgramContent('${prog.name}', \`${prog.content}\`)">
            ${prog.name}
        </div>
    `).join('');

    // Zobrazení podprogramů s detaily
    subList.innerHTML = EXAMPLE_PROGRAMS.sub.map(prog => {
        const info = parseSubProgramInfo(prog.content);
        return `
            <div class="program-item" onclick="loadProgramContent('${prog.name}', \`${prog.content}\`)">
                <div class="program-name">${prog.name}</div>
                <div class="program-details">
                    ${info.toolNumber ? `<div class="tool-info">T${info.toolNumber} ${info.correctionNumber ? `D${info.correctionNumber}` : ''} ${info.note ? `; ${info.note}` : ''}</div>` : ''}
                    ${info.secondNote ? `<div class="note-info">${info.secondNote}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Načtení prvého programu
    if (EXAMPLE_PROGRAMS.main.length > 0) {
        loadProgramContent(EXAMPLE_PROGRAMS.main[0].name, EXAMPLE_PROGRAMS.main[0].content);
    }
}

// Funkce pro získání informací o podprogramu
function parseSubProgramInfo(content) {
    const lines = content.split('\n');
    const info = {
        toolNumber: '',
        correctionNumber: '',
        note: '',
        secondNote: ''
    };

    // Nejdřív najdeme poznámku na druhém řádku
    if (lines.length > 1) {
        const secondLine = lines[1].trim();
        if (secondLine.startsWith(';')) {
            info.secondNote = secondLine.substring(1).trim();
        }
    }

    // Pak projdeme zbytek programu a hledáme nástroj a korekci
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
        const line = lines[i].trim();
        
        // Hledání nástroje (T)
        const toolMatch = line.match(/T(\d+)/);
        if (toolMatch && !info.toolNumber) {
            info.toolNumber = toolMatch[1];
        }
        
        // Hledání korekce (D) a poznámky za ní
        const correctionMatch = line.match(/D(\d+)\s*;(.+)/);
        if (correctionMatch) {
            info.correctionNumber = correctionMatch[1];
            if (correctionMatch[2]) {
                info.note = correctionMatch[2].trim();
            }
        }
        
        // Pokud máme nástroj i korekci, můžeme skončit
        if (info.toolNumber && info.correctionNumber) {
            break;
        }
    }

    return info;
}

// Funkce pro načtení obsahu programu
function loadProgramContent(name, content) {
    const editor = document.getElementById('codeEditor');
    if (editor) {
        // Přidání čísel řádků na začátek každého řádku
        const lines = content.split('\n');
        const numberedLines = lines.map((line, index) => {
            const lineNumber = (index + 1).toString().padStart(3, ' ');
            return `${lineNumber}  ${line}`; 
        });
        editor.value = numberedLines.join('\n');
        
        // Aktualizace simulace s původním obsahem (bez čísel řádků)
        currentProgram = name;
        simulateProgram(getCleanCode());
        centerSimulation();
    }
}

// Funkce pro získání čistého kódu bez čísel řádků
function getCleanCode() {
    const editor = document.getElementById('codeEditor');
    if (!editor) return '';
    
    const lines = editor.value.split('\n');
    return lines.map(line => line.substring(6)).join('\n'); 
}

// Funkce pro výpočet času programu
function calculateProgramTime(points) {
    let totalTime = 0;
    let lastPoint = null;
    const RAPID_SPEED = 150000; // mm/min pro G0
    const TIME_COEFFICIENT = 0.1; // koeficient pro přiblížení reálnému času

    for (let point of points) {
        if (lastPoint) {
            // Výpočet vzdálenosti mezi body
            const dx = point.x - lastPoint.x;
            const dy = point.y - lastPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Výpočet času podle typu pohybu
            if (point.command === 'G0') {
                // Rychloposuv
                totalTime += (distance / RAPID_SPEED) * 60; // čas v sekundách
            } else if (point.command === 'G1' && point.feed) {
                // Pracovní posuv - feed je v mm/ot, předpokládáme 1000 ot/min
                const feedRate = point.feed * 1000; // převod na mm/min
                totalTime += (distance / feedRate) * 60; // čas v sekundách
            }
        }
        lastPoint = point;
    }

    // Aplikace koeficientu a převod na minuty a sekundy
    totalTime *= TIME_COEFFICIENT;
    const minutes = Math.floor(totalTime / 60);
    const seconds = Math.floor(totalTime % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')} min`;
}

// Funkce pro simulaci programu
function simulateProgram(program) {
    const cleanCode = getCleanCode();
    
    // Resetování bodů
    points = [];
    currentPoint = 0;

    // Parsování programu
    const lines = cleanCode.split('\n');
    let currentX = null;
    let currentZ = null;
    let lastCommand = '';
    let feedRate = 0;
    let speed = 0;
    let isAbsolute = true;
    let firstPoint = true;
    let parameters = {};

    lines.forEach((line, index) => {
        if (!line.trim()) return;

        // Zpracování parametrů
        if (line.includes('R')) {
            const match = line.match(/R\d+=\d+/);
            if (match) {
                const [param, value] = match[0].split('=');
                parameters[param] = parseFloat(value);
                return;
            }
        }

        // Zpracování otáček
        if (line.includes('S=')) {
            const speedMatch = line.match(/S=([^M\s]+)/);
            if (speedMatch) {
                const speedExpr = speedMatch[1];
                if (speedExpr.includes('R')) {
                    const paramMatch = speedExpr.match(/R\d+/)[0];
                    const value = parameters[paramMatch] || 0;
                    const rest = speedExpr.replace(paramMatch, value);
                    speed = eval(rest);
                } else {
                    speed = parseFloat(speedExpr);
                }
            }
        } else if (line.match(/S\d+/)) {
            const speedMatch = line.match(/S(\d+)/);
            if (speedMatch) {
                speed = parseFloat(speedMatch[1]);
            }
        }

        const parts = line.trim().toUpperCase().split(/\s+/);
        let newX = currentX;
        let newZ = currentZ;
        let command = lastCommand;
        let hasCoordinates = false;

        parts.forEach(part => {
            if (part === 'G90') {
                isAbsolute = true;
                command = part;
            } else if (part === 'G91') {
                isAbsolute = false;
                command = part;
            } else if (part.startsWith('G')) {
                command = part;
                lastCommand = command;
            } else if (part.startsWith('X')) {
                let xPart = part.substring(1);
                // Pokud obsahuje '=', vezmi část za '='
                if (xPart.includes('=')) {
                    xPart = xPart.split('=')[1];
                }
                // Vyhodnoť matematický výraz
                try {
                    const value = eval(xPart);
                    if (currentX === null) {
                        newX = value;
                    } else {
                        newX = isAbsolute ? value : currentX + value;
                    }
                    hasCoordinates = true;
                } catch (e) {
                    console.error('Chyba při vyhodnocení X souřadnice:', e);
                }
            } else if (part.startsWith('Z')) {
                let zPart = part.substring(1);
                // Pokud obsahuje '=', vezmi část za '='
                if (zPart.includes('=')) {
                    zPart = zPart.split('=')[1];
                }
                // Vyhodnoť matematický výraz
                try {
                    const value = eval(zPart);
                    if (currentZ === null) {
                        newZ = value;
                    } else {
                        newZ = isAbsolute ? value : currentZ + value;
                    }
                    hasCoordinates = true;
                } catch (e) {
                    console.error('Chyba při vyhodnocení Z souřadnice:', e);
                }
            } else if (part.startsWith('F')) {
                feedRate = parseFloat(part.substring(1));
            }
        });

        if ((hasCoordinates && firstPoint) || 
            (newX !== currentX && newX !== null) || 
            (newZ !== currentZ && newZ !== null) || 
            command === 'G90' || 
            command === 'G91') {
            
            points.push({
                x: newX,
                y: -newZ,
                command: command,
                line: index,
                code: line.trim(),
                feed: feedRate,
                speed: speed,
                isAbsolute: isAbsolute
            });
            
            currentX = newX;
            currentZ = newZ;
            firstPoint = false;
        }
    });

    // Vykreslení simulace
    drawSimulation();
    updatePointInfo(points[currentPoint]);
    document.getElementById('totalTime').textContent = calculateProgramTime(points);
}

// Funkce pro načtení souboru
function handleFileSelect(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Vymazání seznamů
    const mainList = document.getElementById('mainProgramsList');
    const subList = document.getElementById('subProgramsList');
    if (mainList) mainList.innerHTML = '';
    if (subList) subList.innerHTML = '';

    let firstFile = null;
    let firstContent = null;
    
    // Počítadla programů
    let mpfCount = 0;
    let spfCount = 0;

    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            const name = file.name.toUpperCase();

            if (!firstFile) {
                firstFile = name;
                firstContent = content;
            }

            // Rozdělení podle typu souboru
            if (name.endsWith('.MPF')) {
                mpfCount++;
                if (mainList) {
                    const div = document.createElement('div');
                    div.className = 'program-item';
                    div.textContent = name;
                    div.onclick = () => loadProgramContent(name, content);
                    mainList.appendChild(div);
                }
            } else if (name.endsWith('.SPF')) {
                spfCount++;
                if (subList) {
                    const info = parseSubProgramInfo(content);
                    const div = document.createElement('div');
                    div.className = 'program-item';
                    div.innerHTML = `
                        <div class="program-name">${name}</div>
                        <div class="program-details">
                            ${info.toolNumber ? `<div class="tool-info">T${info.toolNumber} ${info.correctionNumber ? `D${info.correctionNumber}` : ''} ${info.note ? `; ${info.note}` : ''}</div>` : ''}
                            ${info.secondNote ? `<div class="note-info">${info.secondNote}</div>` : ''}
                        </div>
                    `;
                    div.onclick = () => loadProgramContent(name, content);
                    subList.appendChild(div);
                }
            }

            // Aktualizace počítadel
            document.getElementById('fileCount').textContent = `Načteno: ${mpfCount} MPF a ${spfCount} SPF`;

            // Načtení prvého souboru do editoru
            if (firstFile && firstContent) {
                loadProgramContent(firstFile, firstContent);
            }
        };
        reader.readAsText(file);
    });
}

// Ukázkové programy
const EXAMPLE_PROGRAMS = {
    main: [
        {
            name: 'EXAMPLE1.MPF',
            content: `N10 G0 X0 Z0
N20 G1 X10 Z0 F100
N30 G1 X10 Z-20
N40 G1 X20 Z-20
N50 G1 X20 Z-40
N60 G0 X50 Z50`
        },
        {
            name: 'EXAMPLE2.MPF',
            content: `N10 G0 X0 Z0
N20 G1 X30 Z0 F100
N30 G1 X30 Z-30
N40 G0 X50 Z50`
        }
    ],
    sub: [
        {
            name: 'SUB1.SPF',
            content: `MSG("1.OP.MZ-3RW20119.4001-BA 375 L56")
; NABOJ + DESKA + VNITRNI PRUMER HOTOVE
N01 M43
N02 STOPRE 
N03 M80
N04 G54 G95 
N05 M4 S=180 ;180
N07 STOPRE 
N08 T3
    D1 ; RADIUS NOZE=8, SVISLE,VLEVO`
        },
        {
            name: 'SUB2.SPF',
            content: `MSG("2.OP.MZ-3RW20119.4001-BA 375 L56")
; VNEJSI PRUMER HOTOVY
N01 M43
N02 STOPRE 
N03 M80
N04 G54 G95 
N05 M4 S=180
N07 STOPRE 
N08 T5
    D1 ; RADIUS NOZE=6.3, VODOROVNE,VPRAVO`
        }
    ]
};
