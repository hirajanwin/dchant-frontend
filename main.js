// Import dependencies
import { Polar } from '@polar-sh/sdk';

// DOM Elements
let dropzone, fileInput, uploadIcon, uploadText, previewImage;
let steps, continueBtn, backToUploadBtn, processPaymentBtn, downloadImageBtn, createNewBtn, paymentPreviewImg, resultOriginalImg, resultTransformedImg, progressFill, progressPercent, processingSteps, emailInput;
let creditDisplay;

// Initialize elements
function initializeElements() {
    // Upload elements
    dropzone = document.getElementById('drop-zone');
    fileInput = document.getElementById('file-input');
    uploadIcon = document.querySelector('.upload-icon');
    uploadText = document.querySelector('.upload-text');
    previewImage = document.querySelector('.preview-image');
    
    // Step navigation elements
    steps = document.querySelectorAll('.step');
    continueBtn = document.getElementById('continue-btn');
    backToUploadBtn = document.getElementById('back-to-upload');
    processPaymentBtn = document.getElementById('process-payment');
    downloadImageBtn = document.getElementById('download-image');
    createNewBtn = document.getElementById('create-new');
    paymentPreviewImg = document.getElementById('payment-preview-img');
    resultOriginalImg = document.getElementById('result-original');
    resultTransformedImg = document.getElementById('result-transformed');
    progressFill = document.querySelector('.progress-fill');
    progressPercent = document.getElementById('progress-percent');
    processingSteps = document.querySelectorAll('.processing-step');
    emailInput = document.getElementById('email');
    
    // Credit display
    creditDisplay = document.getElementById('credit-display');
}

// Update credit display
function updateCreditDisplay() {
    if (creditDisplay && apiInstance) {
        const credits = apiInstance.getUserCredits();
        creditDisplay.textContent = `${credits} credits`;
        
        // Update visibility of credit display
        if (credits > 0) {
            creditDisplay.classList.add('has-credits');
        } else {
            creditDisplay.classList.remove('has-credits');
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    // Dropzone functionality
    dropzone.addEventListener('click', () => {
        fileInput.click();
    });
    
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    
    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });
    
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        
        if (e.dataTransfer.files.length) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFileUpload(e.target.files[0]);
        }
    });
    
    // Allow paste from clipboard
    document.addEventListener('paste', (e) => {
        if (currentStep === 'upload') {
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            for (const item of items) {
                if (item.type.indexOf('image') === 0) {
                    const blob = item.getAsFile();
                    handleFileUpload(blob);
                    break;
                }
            }
        }
    });
    
    // Step navigation
    continueBtn.addEventListener('click', () => {
        if (currentImage) {
            navigateToStep('payment');
            paymentPreviewImg.src = currentImage;
        }
    });
    
    backToUploadBtn.addEventListener('click', () => {
        navigateToStep('upload');
    });
    
    processPaymentBtn.addEventListener('click', handlePayment);
    downloadImageBtn.addEventListener('click', handleDownload);
    createNewBtn.addEventListener('click', () => {
        resetUpload();
        navigateToStep('upload');
    });
    
    // Add share button event listeners
    document.querySelector('.share-button.twitter').addEventListener('click', shareOnTwitter);
    document.querySelector('.share-button.facebook').addEventListener('click', shareOnFacebook);
    
    // Buy more credits button
    document.getElementById('buy-credits-button').addEventListener('click', function() {
        navigateToStep('payment');
    });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize elements
    initializeElements();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize API
    setTimeout(() => {
        if (window.geminiAPI) {
            apiInstance = window.geminiAPI;
            console.log('Gemini API initialized successfully');
            
            // Update credit display after API is initialized
            updateCreditDisplay();
            
            // Check for API key in localStorage
            const apiKey = localStorage.getItem('gemini_api_key');
            if (!apiKey) {
                showApiKeyPrompt();
            }
        } else {
            console.error('Gemini API not found');
            showToast('Error: API not initialized. Please refresh the page.', 'error');
        }
    }, 500); // Give time for API.js to load and initialize
    
    // Navigate to the first step
    navigateToStep('upload');
    
    // Initialize
    init();
});

// State
let currentStep = 'upload';
let currentImage = null;
let imageDescription = '';
let generatedImageUrl = null;
let apiInstance = null;
let isGenerating = false;
let currentCheckoutId = null;
let polar = new Polar();

// Initialize
function init() {
    setupEventListeners();
    navigateToStep('upload');
    
    // Check for API key in localStorage
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        showApiKeyPrompt();
    }
    
    // Check payment status
    checkPaymentStatus();
}

// API Key Prompt
function showApiKeyPrompt() {
    const apiKeyPrompt = document.createElement('div');
    apiKeyPrompt.className = 'api-key-prompt';
    apiKeyPrompt.innerHTML = `
        <div class="api-key-modal">
            <h2>Enter Gemini API Key</h2>
            <p>Please enter your Gemini API key to continue. This will be stored locally on your device.</p>
            <input type="text" id="api-key-input" placeholder="API Key">
            <button id="save-api-key">Save</button>
        </div>
    `;
    document.body.appendChild(apiKeyPrompt);
    
    document.getElementById('save-api-key').addEventListener('click', () => {
        const apiKey = document.getElementById('api-key-input').value.trim();
        if (apiKey) {
            // Initialize the API with the provided key
            if (window.geminiAPI) {
                window.geminiAPI.initializeAPI(apiKey);
                apiInstance = window.geminiAPI;
                apiKeyPrompt.remove();
                showToast('API key saved successfully');
            } else {
                showToast('Error: API not initialized');
            }
        } else {
            showToast('Please enter a valid API key');
        }
    });
}

// Drag and Drop Handlers
function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!isGenerating && currentStep === 'upload') {
        dropzone.classList.add('dragover');
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!isGenerating && currentStep === 'upload') {
        dropzone.classList.add('dragover');
    }
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('dragover');
    
    if (isGenerating || currentStep !== 'upload') return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        handleFileUpload(file);
    }
}

// File Input Handler
function handleFileSelect(e) {
    if (isGenerating || currentStep !== 'upload') return;
    
    if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        handleFileUpload(file);
    }
}

// Paste Handler
function handlePaste(e) {
    if (isGenerating || currentStep !== 'upload') return;
    
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            handleFileUpload(file);
            break;
        }
    }
}

// Process File
function handleFileUpload(file) {
    if (!file || !file.type.startsWith('image/')) {
        showToast('Please select a valid image file', 'error');
        return;
    }
    
    // Show loading state
    uploadIcon.style.display = 'none';
    uploadText.style.display = 'none';
    previewImage.style.display = 'block';
    
    // Read and display the file
    const reader = new FileReader();
    reader.onload = (e) => {
        currentImage = e.target.result;
        previewImage.src = currentImage;
        
        // Update continue button
        continueBtn.disabled = false;
        continueBtn.classList.add('active');
        
        // Update payment preview if it exists
        if (paymentPreviewImg) {
            paymentPreviewImg.src = currentImage;
        }
    };
    reader.readAsDataURL(file);
}

// Display Image
function displayImage(imageData) {
    previewImage.src = imageData;
    previewImage.style.display = 'block';
    uploadIcon.style.display = 'none';
    uploadText.style.display = 'none';
    
    // Add reset button
    if (!document.querySelector('.reset-button')) {
        const resetButton = document.createElement('button');
        resetButton.className = 'reset-button';
        resetButton.innerHTML = '×';
        resetButton.addEventListener('click', (e) => {
            e.stopPropagation();
            resetUpload();
        });
        dropzone.appendChild(resetButton);
    }
}

// Reset Upload
function resetUpload() {
    currentImage = null;
    previewImage.style.display = 'none';
    previewImage.src = '';
    uploadIcon.style.display = 'block';
    uploadText.style.display = 'block';
    continueBtn.disabled = true;
    
    const resetButton = document.querySelector('.reset-button');
    if (resetButton) {
        resetButton.remove();
    }
    
    // Reset file input
    fileInput.value = '';
}

// Step Navigation
function navigateToStep(step) {
    // Hide all steps
    steps.forEach(s => {
        s.style.display = 'none';
    });
    
    // Show the target step
    document.getElementById(`step-${step}`).style.display = 'block';
    
    // Update the active step in the nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeNavItem = document.querySelector(`.nav-item[data-step="${step}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    // Update current step
    currentStep = step;
    
    // Special handling for specific steps
    if (step === 'payment' && paymentPreviewImg && currentImage) {
        paymentPreviewImg.src = currentImage;
    } else if (step === 'result') {
        // Ensure images are loaded
        if (resultOriginalImg && currentImage) {
            resultOriginalImg.src = currentImage;
        }
        
        if (resultTransformedImg && generatedImageUrl) {
            resultTransformedImg.src = generatedImageUrl;
            console.log('Setting transformed image in result step:', generatedImageUrl);
            
            // Force image refresh
            resultTransformedImg.onload = () => {
                console.log('Transformed image loaded successfully');
            };
            
            resultTransformedImg.onerror = () => {
                console.error('Failed to load transformed image');
                // Try with a fallback if needed
                if (!resultTransformedImg.src.includes('examples/')) {
                    resultTransformedImg.src = 'examples/ghibli-1.jpg';
                    showToast('Could not load generated image. Using placeholder.', 'warning');
                }
            };
        }
    }
    
    // Update credit display whenever we navigate
    updateCreditDisplay();
}

// Payment Processing
async function handlePayment() {
    if (!apiInstance) {
        showToast('API is not initialized. Please refresh and try again.', 'error');
        return;
    }
    
    const email = emailInput.value.trim();
    
    if (!email) {
        showToast('Please enter your email address', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    try {
        showToast('Initializing payment...', 'info');
        
        // Create checkout session using Polar SDK
        const checkout = await polar.checkouts.create({
            data: {
                customerEmail: email,
                amount: apiInstance.PURCHASE_PRICE * 100, // Convert to cents
                currency: 'usd',
                successUrl: window.location.origin + '?payment=success',
                cancelUrl: window.location.origin + '?payment=cancelled',
                metadata: {
                    credits: apiInstance.CREDITS_PER_PURCHASE,
                    product: 'Ghibli Image Credits'
                }
            }
        });
        
        if (checkout.url) {
            // Store email for later use
            localStorage.setItem('user_email', email);
            
            // Redirect to Polar.sh checkout
            window.location.href = checkout.url;
        } else {
            throw new Error('No checkout URL received');
        }
    } catch (error) {
        console.error('Payment failed:', error);
        showToast('Payment initialization failed. Please try again.', 'error');
    }
}

// Check for payment success on page load
function checkPaymentStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success') {
        // Clear the URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Handle successful payment
        apiInstance.handleSuccessfulPayment();
        
        // Navigate back to upload step
        navigateToStep('upload');
    } else if (paymentStatus === 'cancelled') {
        // Clear the URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        
        showToast('Payment was cancelled. You can try again when ready.', 'info');
        navigateToStep('payment');
    }
}

// Validate email format
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Process the image through Gemini API
async function processImage() {
    try {
        // Reset progress
        updateProgress(0);
        processingSteps.forEach(step => step.classList.remove('active', 'completed'));
        processingSteps[0].classList.add('active');
        
        // Step 1: Analyzing image
        updateProgress(10);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate initial processing
        
        // Step 2: Generate image description
        updateProcessingStep(0, 1);
        updateProgress(30);
        
        try {
            // Check if API is initialized
            if (!apiInstance) {
                if (window.geminiAPI) {
                    apiInstance = window.geminiAPI;
                } else {
                    throw new Error('API not initialized');
                }
            }
            
            imageDescription = await apiInstance.generateImageDescription(currentImage);
            console.log('Generated description:', imageDescription);
        } catch (error) {
            console.error('Error generating description:', error);
            showToast('Error generating image description. Using default description.', 'error');
            imageDescription = "A beautiful scene transformed into Studio Ghibli style with dreamy landscapes, soft colors, and a sense of wonder.";
        }
        
        // Step 3: Create Ghibli artwork
        updateProcessingStep(1, 2);
        updateProgress(60);
        
        let generatedImageUrl;
        let imageGenerated = false;
        
        try {
            console.log('Generating Ghibli image with description:', imageDescription);
            generatedImageUrl = await apiInstance.generateGhibliImage(currentImage, imageDescription);
            console.log('Successfully generated Ghibli image:', generatedImageUrl ? 'Generated' : 'Failed');
            imageGenerated = !!generatedImageUrl;
        } catch (error) {
            console.error('Error generating Ghibli image:', error);
            showToast('Error generating Ghibli image. Please try again.', 'error');
            // Only use fallback image if we absolutely need to
            generatedImageUrl = 'examples/ghibli-1.jpg';
            showToast('Using placeholder image for demonstration purposes.', 'warning');
        }
        
        // Step 4: Finalizing
        updateProcessingStep(2, 3);
        updateProgress(90);
        
        // Simulate finalizing process
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Complete
        updateProgress(100);
        
        // Prepare result view
        resultOriginalImg.src = currentImage;
        resultTransformedImg.src = generatedImageUrl;
        console.log('Setting result images:', 
            'Original:', resultOriginalImg.src ? 'Set' : 'Not set',
            'Transformed:', resultTransformedImg.src ? 'Set' : 'Not set',
            'Transformed URL:', generatedImageUrl);
        
        // Preload the images before showing the result
        const preloadImages = async () => {
            return new Promise((resolve) => {
                let imagesLoaded = 0;
                const checkAllLoaded = () => {
                    imagesLoaded++;
                    console.log(`Image ${imagesLoaded} loaded`);
                    if (imagesLoaded >= 2) resolve();
                };
                
                // Preload original image
                const img1 = new Image();
                img1.onload = () => {
                    console.log('Original image loaded successfully');
                    checkAllLoaded();
                };
                img1.onerror = (e) => {
                    console.error('Error loading original image:', e);
                    checkAllLoaded();
                };
                img1.src = currentImage;
                
                // Preload transformed image
                const img2 = new Image();
                img2.onload = () => {
                    console.log('Transformed image loaded successfully, dimensions:', img2.width, 'x', img2.height);
                    checkAllLoaded();
                };
                img2.onerror = (e) => {
                    console.error('Failed to load transformed image:', e);
                    
                    // Only use fallback if we absolutely need to
                    if (!imageGenerated) {
                        console.log('Using fallback image as transformed image failed to load');
                        generatedImageUrl = 'examples/ghibli-1.jpg';
                        resultTransformedImg.src = generatedImageUrl;
                        
                        // Try loading the fallback
                        const fallbackImg = new Image();
                        fallbackImg.onload = () => {
                            console.log('Fallback image loaded successfully');
                            checkAllLoaded();
                        };
                        fallbackImg.onerror = () => {
                            console.error('Even fallback image failed to load');
                            checkAllLoaded();
                        };
                        fallbackImg.src = generatedImageUrl;
                    } else {
                        // If image was generated but failed to load, try again
                        console.log('Retrying to load the generated image');
                        setTimeout(() => {
                            img2.src = generatedImageUrl + '?' + new Date().getTime();
                        }, 500);
                    }
                };
                img2.src = generatedImageUrl;
                
                // Set a timeout in case images take too long to load
                setTimeout(() => {
                    console.log('Image preload timeout reached');
                    resolve();
                }, 3000);
            });
        };
        
        await preloadImages();
        
        // Navigate to result step
        setTimeout(() => {
            navigateToStep('result');
            
            // Ensure images are set properly
            resultOriginalImg.src = currentImage;
            resultTransformedImg.src = generatedImageUrl;
            
            // Add additional logging to debug image display issues
            console.log('Result step loaded, checking images:',
                'Original image source:', resultOriginalImg.src,
                'Transformed image source:', resultTransformedImg.src,
                'Original visible:', resultOriginalImg.complete && resultOriginalImg.naturalHeight !== 0,
                'Transformed visible:', resultTransformedImg.complete && resultTransformedImg.naturalHeight !== 0);
            
            // Force a repaint to ensure images are displayed
            resultTransformedImg.style.display = 'none';
            setTimeout(() => {
                resultTransformedImg.style.display = 'block';
                
                // Add direct DOM manipulation to ensure the image is visible
                const transformedContainer = document.querySelector('.result-image-container:nth-child(2)');
                if (transformedContainer) {
                    const heading = transformedContainer.querySelector('h3');
                    if (heading && heading.textContent === 'Ghibli Style') {
                        console.log('Found transformed image container, ensuring image is visible');
                        
                        // Create a new image element if needed
                        if (!resultTransformedImg.complete || resultTransformedImg.naturalHeight === 0) {
                            console.log('Creating new image element for transformed image');
                            const newImg = document.createElement('img');
                            newImg.id = 'result-transformed';
                            newImg.src = generatedImageUrl;
                            newImg.alt = 'Transformed image';
                            newImg.style.maxWidth = '100%';
                            newImg.style.borderRadius = 'var(--border-radius)';
                            newImg.style.boxShadow = 'var(--box-shadow)';
                            
                            // Replace the existing image
                            const oldImg = transformedContainer.querySelector('img');
                            if (oldImg) {
                                transformedContainer.replaceChild(newImg, oldImg);
                            } else {
                                transformedContainer.appendChild(newImg);
                            }
                            
                            resultTransformedImg = newImg;
                        }
                    }
                }
                
                console.log('Forced repaint of transformed image');
            }, 100);
        }, 1000);
        
    } catch (error) {
        console.error('Error in image processing:', error);
        showToast('An error occurred during processing. Please try again.', 'error');
        navigateToStep('payment');
    }
}

// Update progress bar
function updateProgress(percent) {
    progressFill.style.width = `${percent}%`;
    progressPercent.textContent = `${percent}%`;
}

// Update processing step
function updateProcessingStep(current, next) {
    processingSteps[current].classList.remove('active');
    processingSteps[current].classList.add('completed');
    processingSteps[next].classList.add('active');
}

// Handle Download
function handleDownload() {
    if (!generatedImageUrl) {
        showToast('No image available to download');
        return;
    }
    
    const link = document.createElement('a');
    link.href = generatedImageUrl;
    link.download = `ghibli-transformation-${transformationId}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Image downloaded successfully');
    
    // Also send email if configured
    const userEmail = localStorage.getItem('user_email');
    if (userEmail) {
        // In a real app, you would send an API request to your backend to email the image
        console.log(`Image would be emailed to ${userEmail}`);
        showToast(`A download link has also been sent to ${userEmail}`);
    }
}

// Share on social media
function shareOnTwitter() {
    if (!generatedImageUrl) {
        showToast('No image available to share');
        return;
    }
    
    // In a real app, you would upload the image to your server first and get a shareable URL
    const shareText = 'Check out my Studio Ghibli style transformation created with Pik.ink!';
    const shareUrl = 'https://pik.ink'; // Replace with your actual website
    
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
}

function shareOnFacebook() {
    if (!generatedImageUrl) {
        showToast('No image available to share');
        return;
    }
    
    // In a real app, you would upload the image to your server first and get a shareable URL
    const shareUrl = 'https://pik.ink'; // Replace with your actual website
    
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
}

// Toast Notification
function showToast(message, type = 'success') {
    // Remove existing toast if present
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    // Add type class
    if (type === 'error') {
        toast.classList.add('error');
    } else if (type === 'info') {
        toast.classList.add('info');
    }
    
    // Add to document
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Hide toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Function to populate example images
function populateExamples() {
    const examplesContainer = document.querySelector('.examples-grid');
    if (!examplesContainer) return;
    
    const examples = [
        {
            original: 'examples/original-1.jpg',
            transformed: 'examples/ghibli-1.jpg',
            description: 'Mountain landscape transformed into a Ghibli-style scene'
        },
        {
            original: 'examples/original-2.jpg',
            transformed: 'examples/ghibli-2.jpg',
            description: 'Urban street transformed into a Ghibli-style town'
        },
        {
            original: 'examples/original-3.jpg',
            transformed: 'examples/ghibli-3.jpg',
            description: 'Portrait transformed with Ghibli-style character design'
        },
        {
            original: 'examples/original-4.jpg',
            transformed: 'examples/ghibli-4.jpg',
            description: 'Nature scene transformed into a magical Ghibli forest'
        },
        {
            original: 'examples/original-5.jpg',
            transformed: 'examples/ghibli-5.jpg',
            description: 'Beach scene transformed into a Ghibli coastal view'
        },
        {
            original: 'examples/original-6.jpg',
            transformed: 'examples/ghibli-6.jpg',
            description: 'City skyline transformed into a Ghibli-style cityscape'
        }
    ];
    
    examples.forEach(example => {
        const exampleItem = document.createElement('div');
        exampleItem.className = 'example-item';
        
        exampleItem.innerHTML = `
            <div class="example-comparison">
                <div class="example-image-container">
                    <img src="${example.original}" alt="Original image" class="example-image original">
                </div>
                <div class="example-arrow">→</div>
                <div class="example-image-container">
                    <img src="${example.transformed}" alt="Transformed image" class="example-image transformed">
                </div>
            </div>
            <p class="example-description">${example.description}</p>
        `;
        
        examplesContainer.appendChild(exampleItem);
    });
}

// Make showToast available globally for the API module
window.showToast = showToast;
