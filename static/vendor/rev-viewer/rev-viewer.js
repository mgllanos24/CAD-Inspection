import { importedImage } from './tools.js';

// Minimal placeholder implementation mimicking the real library's
// CAD mode. The actual `rev-viewer` library exposes a `CADMode` class
// which is responsible for rendering CAD data. For offline demo
// purposes, this stub simply displays a placeholder image so that the
// rest of the application can interact with a `CADMode`-like API.
export class CADMode {
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
