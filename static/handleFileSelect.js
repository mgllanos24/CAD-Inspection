export function createHandleFileSelect({
    resetUI,
    showThreeJsViewer,
    showRevViewer,
    loadStepModel,
    loadSldprtModel,
    loaderElement,
    conversionLoaderElement,
    fileInput,
    convertBtn,
    alertFn = alert,
    setCurrentFileName,
}) {
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

    return function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) {
            loaderElement.classList.add('hidden');
            conversionLoaderElement.classList.add('hidden');
            fileInput.value = '';
            return;
        }

        resetUI();

        if (file.size > MAX_FILE_SIZE) {
            alertFn('File is too large. Maximum allowed size is 50 MB.');
            loaderElement.classList.add('hidden');
            conversionLoaderElement.classList.add('hidden');
            return;
        }

        loaderElement.classList.remove('hidden');

        setCurrentFileName(file.name);
        const extension = file.name.split('.').pop().toLowerCase();

        if (extension === 'stp' || extension === 'step') {
            showThreeJsViewer();
            const reader = new FileReader();
            reader.onerror = () => {
                loaderElement.classList.add('hidden');
                alertFn('Failed to read file.');
                fileInput.value = '';
            };
            reader.onload = (e) => {
                const fileContent = e.target.result;
                loadStepModel(file.name, fileContent);
            };
            reader.readAsArrayBuffer(file);
        } else if (extension === 'sldprt') {
            showRevViewer();
            convertBtn.classList.remove('hidden');
            loadSldprtModel(file);
        } else {
            alertFn('Unsupported file format.');
            loaderElement.classList.add('hidden');
            conversionLoaderElement.classList.add('hidden');
            fileInput.value = '';
        }
    };
}
