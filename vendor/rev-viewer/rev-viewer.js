export class Viewer {
    constructor(container) {
        this.container = container;
    }

    async load(file) {
        const info = document.createElement('div');
        info.textContent = `Preview for "${file.name}" is not supported in this demo.`;
        this.container.appendChild(info);
    }

    dispose() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
