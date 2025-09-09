import { importedImage } from './tools.js';

export class Viewer {
    constructor(container) {
        this.container = container;
        this.image = null;
    }

    async load(file) {
        this.dispose();
        this.image = await importedImage(file);
        this.container.appendChild(this.image);
    }

    dispose() {
        if (this.image) {
            this.image.remove();
            this.image = null;
        }
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
