// Simulátor CNC programu
export class Simulator {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.points = [];
        this.currentPoint = 0;
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.onPointChange = null;

        this.setupCanvas();
    }

    setupCanvas() {
        // Nastavení velikosti
        const resize = () => {
            this.canvas.width = this.canvas.clientWidth;
            this.canvas.height = this.canvas.clientHeight;
            this.draw();
        };
        resize();
        window.addEventListener('resize', resize);

        // Ovládání myší
        let isDragging = false;
        let lastX = 0;
        let lastY = 0;

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const oldScale = this.scale;
            this.scale *= e.deltaY > 0 ? 0.9 : 1.1;
            this.scale = Math.min(Math.max(this.scale, 0.1), 10);
            
            const factor = this.scale / oldScale - 1;
            this.offsetX -= (mouseX - this.canvas.width/2 - this.offsetX) * factor;
            this.offsetY -= (mouseY - this.canvas.height/2 - this.offsetY) * factor;
            
            this.draw();
        });

        this.canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            const rect = this.canvas.getBoundingClientRect();
            lastX = e.clientX - rect.left;
            lastY = e.clientY - rect.top;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.offsetX += x - lastX;
            this.offsetY += y - lastY;
            
            lastX = x;
            lastY = y;
            
            this.draw();
        });

        this.canvas.addEventListener('mouseup', () => isDragging = false);
        this.canvas.addEventListener('mouseleave', () => isDragging = false);
    }

    simulate(code) {
        // Reset
        this.points = [];
        this.currentPoint = 0;

        // Počáteční bod
        let x = 0, z = 0;
        this.points.push({
            x, y: -z,
            command: 'START',
            line: 0,
            code: '',
            feedRate: 0
        });

        // Parsování programu
        const lines = code.split('\n');
        let lastCommand = '';
        let feedRate = 0;

        lines.forEach((line, index) => {
            if (!line.trim()) return;

            const parts = line.trim().toUpperCase().split(/\s+/);
            let newX = x;
            let newZ = z;
            let command = lastCommand;

            parts.forEach(part => {
                if (part.startsWith('G')) {
                    command = part;
                    lastCommand = command;
                } else if (part.startsWith('X')) {
                    newX = parseFloat(part.substring(1));
                } else if (part.startsWith('Z')) {
                    newZ = parseFloat(part.substring(1));
                } else if (part.startsWith('F')) {
                    feedRate = parseFloat(part.substring(1));
                }
            });

            if (newX !== x || newZ !== z) {
                this.points.push({
                    x: newX,
                    y: -newZ,
                    command,
                    line: index,
                    code: line.trim(),
                    feedRate
                });
                x = newX;
                z = newZ;
            }
        });

        this.centerView();
        this.updatePoint();
    }

    draw() {
        const ctx = this.ctx;
        const canvas = this.canvas;

        // Vyčištění
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Transformace
        ctx.save();
        ctx.translate(canvas.width/2 + this.offsetX, canvas.height/2 + this.offsetY);
        ctx.scale(this.scale, this.scale);

        // Osy
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1/this.scale;
        ctx.beginPath();
        ctx.moveTo(-canvas.width/2, 0);
        ctx.lineTo(canvas.width/2, 0);
        ctx.moveTo(0, -canvas.height/2);
        ctx.lineTo(0, canvas.height/2);
        ctx.stroke();

        // Dráha
        for (let i = 1; i < this.points.length; i++) {
            const start = this.points[i-1];
            const end = this.points[i];

            if (end.command === 'G0') {
                ctx.strokeStyle = '#999';
                ctx.setLineDash([5/this.scale, 5/this.scale]);
            } else {
                ctx.strokeStyle = '#007bff';
                ctx.setLineDash([]);
            }

            ctx.lineWidth = 2/this.scale;
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
        }

        // Body
        ctx.setLineDash([]);
        this.points.forEach((point, index) => {
            if (index === this.currentPoint) {
                ctx.fillStyle = '#dc3545';
            } else if (index === 0) {
                ctx.fillStyle = '#28a745';
            } else {
                ctx.fillStyle = '#007bff';
            }

            ctx.beginPath();
            ctx.arc(point.x, point.y, 3/this.scale, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }

    centerView() {
        if (this.points.length < 2) return;

        // Výpočet hranic
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        this.points.forEach(point => {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        });

        // Přidání okrajů
        const padding = 20;
        minX -= padding;
        maxX += padding;
        minY -= padding;
        maxY += padding;

        // Výpočet měřítka
        const scaleX = this.canvas.width / (maxX - minX);
        const scaleY = this.canvas.height / (maxY - minY);
        this.scale = Math.min(scaleX, scaleY);

        // Vycentrování
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        this.offsetX = -centerX * this.scale;
        this.offsetY = -centerY * this.scale;

        this.draw();
    }

    prevPoint() {
        if (this.currentPoint > 0) {
            this.currentPoint--;
            this.updatePoint();
        }
    }

    nextPoint() {
        if (this.currentPoint < this.points.length - 1) {
            this.currentPoint++;
            this.updatePoint();
        }
    }

    updatePoint() {
        this.draw();
        
        if (this.onPointChange && this.currentPoint < this.points.length) {
            const point = this.points[this.currentPoint];
            const prevPoint = this.currentPoint > 0 ? this.points[this.currentPoint - 1] : null;
            
            // Výpočet délky a času
            let length = 0;
            let time = 0;
            
            if (prevPoint) {
                const dx = point.x - prevPoint.x;
                const dy = point.y - prevPoint.y;
                length = Math.sqrt(dx * dx + dy * dy);
                
                if (point.feedRate && length) {
                    time = (length / point.feedRate) * 60;
                }
            }

            this.onPointChange({
                number: this.currentPoint,
                command: point.command || 'START',
                x: point.x.toFixed(3),
                z: (-point.y).toFixed(3),
                deltaX: prevPoint ? (point.x - prevPoint.x).toFixed(3) : '0.000',
                deltaZ: prevPoint ? ((-point.y) - (-prevPoint.y)).toFixed(3) : '0.000',
                feedRate: point.feedRate || 0,
                length: length.toFixed(3),
                time: time.toFixed(2),
                line: point.line + 1,
                code: point.code
            });
        }
    }
}
