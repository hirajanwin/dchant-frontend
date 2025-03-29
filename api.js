const API_URL = 'https://dchant-backend.designer.workers.dev';

// Function to show toast messages
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    
    // Add color based on type
    toast.style.backgroundColor = type === 'error' ? '#ff4444' : 
                                 type === 'success' ? '#4CAF50' : 
                                 '#333';
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Function to update credit display
function updateCreditDisplay() {
    const credits = localStorage.getItem('user_credits') || 0;
    document.getElementById('credits-display').textContent = `Credits: ${credits}`;
    
    // Enable/disable generate button based on credits
    const generateButton = document.getElementById('generate-button');
    if (generateButton) {
        generateButton.disabled = credits < 20;
    }
}

// Function to convert image to base64
async function imageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

// Function to generate Ghibli-style image
async function generateGhibliImage(file, description) {
    try {
        // Check credits
        const credits = parseInt(localStorage.getItem('user_credits') || '0');
        if (credits < 20) {
            showToast('Not enough credits. Please purchase more.', 'error');
            return null;
        }
        
        // Show loading overlay
        document.getElementById('loading-overlay').classList.remove('hidden');
        
        // Convert image to base64
        const base64Image = await imageToBase64(file);
        
        // Send request to backend
        const response = await fetch(`${API_URL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: base64Image,
                description: description,
                email: localStorage.getItem('user_email')
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate image');
        }
        
        const data = await response.json();
        
        // Update credits
        localStorage.setItem('user_credits', data.remainingCredits);
        updateCreditDisplay();
        
        // Show success message
        showToast('Image generated successfully!', 'success');
        
        return data.generatedImage;
    } catch (error) {
        console.error('Generation failed:', error);
        showToast('Failed to generate image. Please try again.', 'error');
        return null;
    } finally {
        // Hide loading overlay
        document.getElementById('loading-overlay').classList.add('hidden');
    }
}

// Payment processing
async function initializePayment() {
    try {
        showToast('Initializing payment...', 'info');
        
        // Get checkout URL from backend
        const response = await fetch(`${API_URL}/api/checkout`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Failed to initialize payment');
        }
        
        const { checkoutUrl } = await response.json();
        
        // Redirect to Polar.sh checkout
        window.location.href = checkoutUrl;
    } catch (error) {
        console.error('Payment initialization failed:', error);
        showToast('Payment initialization failed. Please try again.', 'error');
    }
}

// Handle successful payment
async function handleSuccessfulPayment(email) {
    try {
        // Store email for future use
        localStorage.setItem('user_email', email);
        
        // Get user credits
        const response = await fetch(`${API_URL}/api/users/${email}/credits`);
        
        if (!response.ok) {
            throw new Error('Failed to get user credits');
        }
        
        const { userId, credits } = await response.json();
        
        // Store user info
        localStorage.setItem('user_id', userId);
        localStorage.setItem('user_credits', credits);
        
        showToast('Payment successful! Credits added to your account.', 'success');
        updateCreditDisplay();
    } catch (error) {
        console.error('Failed to handle payment:', error);
        showToast('Error loading credits. Please refresh the page.', 'error');
    }
}

// Initialize the API and expose it to the window object
function initializeAPI() {
    window.geminiAPI = {
        generateGhibliImage,
        initializePayment,
        handleSuccessfulPayment,
        CREDIT_COST_PER_IMAGE: 20,
        CREDITS_PER_PURCHASE: 80,
        PURCHASE_PRICE: 8
    };
}

// Export the initialization function
window.initializeGeminiAPI = initializeAPI;