document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const videoInput = document.getElementById('videoFile');
    const fileInfo = document.getElementById('fileInfo');
    const fileNameDisplay = document.getElementById('fileName');
    const removeFileBtn = document.getElementById('removeFile');
    const generateBtn = document.getElementById('generateBtn');
    const btnLoader = document.getElementById('btnLoader');
    const statusSection = document.getElementById('statusSection');
    const statusText = document.getElementById('statusText');
    const progressBar = document.getElementById('progressBar');

    let currentFile = null;

    // Handle Drag & Drop Events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    });

    // Handle Click Event on Drop Zone
    dropZone.addEventListener('click', () => {
        videoInput.click();
    });

    // Handle File Input Change
    videoInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('video/')) {
                currentFile = file;
                updateUIForFile(file);
            } else {
                alert('කරුණාකර Video file එකක් පමණක් ඇතුලත් කරන්න. (Please upload a video file)');
            }
        }
    }

    function updateUIForFile(file) {
        dropZone.style.display = 'none';
        fileInfo.style.display = 'flex';
        fileNameDisplay.textContent = file.name;
        generateBtn.disabled = false;
    }

    // Remove File
    removeFileBtn.addEventListener('click', () => {
        currentFile = null;
        videoInput.value = '';
        dropZone.style.display = 'block';
        fileInfo.style.display = 'none';
        generateBtn.disabled = true;
    });

    // Generate SRT Form Submit
    generateBtn.addEventListener('click', async () => {
        if (!currentFile) return;

        // UI Updates for Loading
        generateBtn.disabled = true;
        generateBtn.querySelector('span').style.display = 'none';
        btnLoader.style.display = 'block';
        
        statusSection.style.display = 'block';
        statusText.textContent = 'Uploading and processing your video... (This might take a few minutes)';

        const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') ? 'http://localhost:6039' : 'https://kaveesha.top';

        const formData = new FormData();
        formData.append('video', currentFile);

        try {
            const response = await fetch(`${API_BASE_URL}/api/generate-srt`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate SRT');
            }

            // Handle JSON response and create file download
            const data = await response.json();
            const srtText = data.srt;
            
            const blob = new Blob([srtText], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            // Original filename with .srt extension
            const srtFileName = currentFile.name.replace(/\.[^/.]+$/, "") + ".srt";
            a.download = srtFileName;
            
            document.body.appendChild(a);
            a.click();
            
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            statusText.textContent = '✅ SRT Downloaded Successfully!';
            statusText.style.color = 'var(--success)';
            progressBar.style.animation = 'none';
            progressBar.style.width = '100%';

        } catch (error) {
            console.error('Error:', error);
            statusText.textContent = '❌ Error: ' + error.message;
            statusText.style.color = 'var(--danger)';
            progressBar.style.background = 'var(--danger)';
        } finally {
            // Reset button state
            btnLoader.style.display = 'none';
            generateBtn.querySelector('span').style.display = 'block';
            generateBtn.disabled = false;
        }
    });
});
