// UI komponenta
export class UI {
    updateInfo(point) {
        const info = document.getElementById('info');
        if (!info) return;

        info.innerHTML = `
            <div class="info-row">
                <span class="info-label">Bod:</span>
                <span class="info-value">${point.number}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Příkaz:</span>
                <span class="info-value">${point.command}</span>
            </div>
            <div class="info-row">
                <span class="info-label">X:</span>
                <span class="info-value">${point.x} mm</span>
            </div>
            <div class="info-row">
                <span class="info-label">Z:</span>
                <span class="info-value">${point.z} mm</span>
            </div>
            <div class="info-row">
                <span class="info-label">ΔX:</span>
                <span class="info-value">${point.deltaX} mm</span>
            </div>
            <div class="info-row">
                <span class="info-label">ΔZ:</span>
                <span class="info-value">${point.deltaZ} mm</span>
            </div>
            <div class="info-row">
                <span class="info-label">Posuv:</span>
                <span class="info-value">${point.feedRate ? point.feedRate + ' mm/min' : '-'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Délka:</span>
                <span class="info-value">${point.length} mm</span>
            </div>
            <div class="info-row">
                <span class="info-label">Čas:</span>
                <span class="info-value">${point.time > 0 ? point.time + ' s' : '-'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Řádek:</span>
                <span class="info-value">${point.line}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Kód:</span>
                <span class="info-value">${point.code}</span>
            </div>
        `;
    }
}
