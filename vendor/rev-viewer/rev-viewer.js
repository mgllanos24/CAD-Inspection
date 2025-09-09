import { importedImage } from './tools.js';

export class Viewer {
  constructor(container) {
    this.container = container;
    this.imageElement = null;
  }

  async load(file) {
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await importedImage(objectUrl);
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100%';
      this.container.appendChild(img);
      this.imageElement = img;
    } catch (err) {
      const msg = document.createElement('div');
      msg.textContent = `Unable to display ${file.name}.`;
      this.container.appendChild(msg);
    }
  }

  dispose() {
    if (this.imageElement) {
      this.container.removeChild(this.imageElement);
      URL.revokeObjectURL(this.imageElement.src);
      this.imageElement = null;
    }
  }
}
