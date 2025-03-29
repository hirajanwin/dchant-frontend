document.addEventListener('DOMContentLoaded', () => {
    // Initialize credits display
    updateCreditDisplay();
    
    // Image upload handling
    const imageUpload = document.getElementById('image-upload');
    const previewContainer = document.getElementById('preview-container');
    const previewImage = document.getElementById('preview-image');
    const resultContainer = document.getElementById('result-container');
    const resultImage = document.getElementById('result-image');
    const generateButton = document.getElementById('generate-button');
    const downloadButton = document.getElementById('download-button');
    const description = document.getElementById('description');
    
    imageUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Show preview
            previewImage.src = URL.createObjectURL(file);
            previewContainer.classList.remove('hidden');
            resultContainer.classList.add('hidden');
            
            // Clear previous description
            description.value = '';
        }
    });
    
    generateButton.addEventListener('click', async () => {
        const file = imageUpload.files[0];
        if (!file) {
            showToast('Please upload an image first', 'error');
            return;
        }
        
        if (!description.value.trim()) {
            showToast('Please enter a description', 'error');
            return;
        }
        
        const generatedImageUrl = await window.geminiAPI.generateGhibliImage(file, description.value);
        if (generatedImageUrl) {
            resultImage.src = generatedImageUrl;
            resultContainer.classList.remove('hidden');
        }
    });
    
    downloadButton.addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = resultImage.src;
        link.download = 'ghibli-style-image.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});