export async function importedImage(_file) {
    const img = new Image();
    img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAqsSxrQAAAABJRU5ErkJggg==';
    await img.decode();
    return img;
}
