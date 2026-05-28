// ticker.js - Reusable ticker component for NERX Power Consultants LLC
(function() {
    // Function to initialize the ticker
    function initTicker() {
        // Check if ticker already exists
        if (document.querySelector('.ticker-overlay')) {
            return; // Ticker already initialized
        }
        
        // Create ticker HTML structure
        const tickerHTML = `
            <div class="ticker-overlay">
                <div class="ticker-content">
                    <span class="ticker-item"><strong>NERX Power Consultants LLC</strong> offers professional engineering services</span>
                    <span class="ticker-item"><strong>Training:</strong> Calendar-scheduled and on-demand courses - all live with expert instructors</span>
                </div>
            </div>
        `;

        // Create ticker styles
        const tickerStyles = `
            <style>
                /* Ticker Overlay */
                .ticker-overlay {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    background: linear-gradient(to right, #2c3e50, #3498db);
                    color: white;
                    padding: 10px 0;
                    font-size: 14px;
                    z-index: 1000;
                    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
                    overflow: hidden;
                    white-space: nowrap;
                }
                
                .ticker-content {
                    display: inline-block;
                    padding-left: 100%;
                    animation: ticker 30s linear infinite;
                    white-space: nowrap;
                }
                
                @keyframes ticker {
                    0% {
                        transform: translateX(0);
                    }
                    100% {
                        transform: translateX(-100%);
                    }
                }
                
                .ticker-item {
                    display: inline-block;
                    padding: 0 30px;
                    font-weight: 500;
                }
                
                .ticker-item strong {
                    color: #f1c40f;
                    font-weight: 700;
                }
            </style>
        `;

        // Append ticker styles to head
        document.head.insertAdjacentHTML('beforeend', tickerStyles);
        
        // Append ticker HTML to body
        document.body.insertAdjacentHTML('beforeend', tickerHTML);
        
        // Add debug info
        console.log('Ticker initialized successfully');
        
        // Force the ticker to be visible
        const tickerOverlay = document.querySelector('.ticker-overlay');
        if (tickerOverlay) {
            // Make sure the ticker is visible
            tickerOverlay.style.display = 'block';
            tickerOverlay.style.visibility = 'visible';
            tickerOverlay.style.opacity = '1';
            
            // Add text directly to make sure it's visible
            const tickerContent = tickerOverlay.querySelector('.ticker-content');
            if (tickerContent) {
                // Make sure the content is visible
                tickerContent.style.display = 'inline-block';
                tickerContent.style.visibility = 'visible';
                tickerContent.style.opacity = '1';
                
                console.log('Ticker content found:', tickerContent.innerHTML);
            } else {
                console.error('Ticker content element not found');
            }
        } else {
            console.error('Ticker overlay element not found');
        }
    }

    // Initialize ticker when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTicker);
    } else {
        // DOM is already ready, call initTicker directly
        initTicker();
    }
})();