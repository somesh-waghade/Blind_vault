const CONFIG = {
    // Switch to 'production' before building for the Chrome Web Store
    ENV: 'development', 

    // The backend API URL
    // Development: 'http://localhost:5000/api'
    // Production Example: 'https://blindvault-api.onrender.com/api'
    API_URL: 'http://localhost:5000/api'
};

// Silence standard console logs in production for a cleaner user experience
if (CONFIG.ENV === 'production') {
    console.log = function() {};
    console.info = function() {};
    // console.warn and console.error are kept alive for critical errors
}
