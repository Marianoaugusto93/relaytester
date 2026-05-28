// header.js - Reusable header component for NERX Power Consultants LLC toolkits
(function() {
    // Function to initialize the header
    function initHeader() {
        // Check if header already exists
        if (document.querySelector('.header-container')) {
            return; // Header already initialized
        }
        
        // Extract toolkit name from document title
        let toolkitName = document.title;
        
        // Clean up toolkit name - remove author info and other common suffixes
        toolkitName = toolkitName
            .replace(/\s*by\s+Doug\s+Millner.*$/i, '')
            .replace(/\s*-\s*Company.*$/i, '')
            .replace(/\s*\(.*\)$/i, '')
            .replace(/\s*–.*$/i, '')
            .replace(/\s*v\d+\.?\d*$/i, '')
            .replace(/\s+FINAL.*$/i, '')
            .trim();
        
        // Create header HTML structure
        const headerHTML = `
            <div class="header-container">
                <div class="header-left">
                    <h1>
                        Doug Millner –
                        <a href="mailto:douglas.millner@nerxpower.com">douglas.millner@nerxpower.com</a> –
                        NERX Power Consultants LLC –
                        <a href="http://www.nerxpower.com" target="_blank">www.nerxpower.com</a> –
                        <a href="https://www.linkedin.com/in/doug-millner-p-e-26607a184/" target="_blank">LinkedIn Blog</a>
                    </h1>
                </div>
                <div class="toolkit-title">${toolkitName}</div>
                <div class="header-right">
                    <a href="../toolkits.html" id="backToMenu">Back to Main Menu</a>
                </div>
            </div>
        `;

        // Create header styles
        const headerStyles = `
            <style>
                /* Header container as fixed overlay */
                .header-container {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: linear-gradient(to right, #2c3e50, #3498db);
                    padding: 8px 16px;
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    z-index: 1000;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                    gap: 12px;
                }
                
                .header-left {
                    flex: 0 1 auto;
                    min-width: 0;
                }
                
                .header-container h1 {
                    font-size: 12px;
                    margin: 0;
                    color: #fff;
                    font-weight: 500;
                    letter-spacing: 0.2px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .header-container h1 a {
                    color: #ecf0f1;
                    text-decoration: none;
                    transition: color 0.3s ease;
                }
                
                .header-container h1 a:hover {
                    color: #f1c40f;
                    text-decoration: underline;
                }
                
                /* Toolkit title styling */
                .header-container .toolkit-title {
                    flex: 1 1 auto;
                    font-size: 16px;
                    font-weight: bold;
                    color: #f1c40f;
                    text-align: center;
                    padding: 0 10px;
                    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    min-width: 0;
                }
                
                /* Header right section for the menu button */
                .header-right {
                    flex: 0 0 auto;
                    display: flex;
                    align-items: center;
                }
                
                /* Back to Menu button in header container */
                #backToMenu {
                    padding: 6px 14px;
                    font-size: 13px;
                    cursor: pointer;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    text-decoration: none;
                    font-weight: bold;
                    background-color: #e74c3c;
                    transition: all 0.3s ease;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                    white-space: nowrap;
                }
                
                #backToMenu:hover {
                    background-color: #c0392b;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                }
                
                /* Add padding to body to prevent content from being hidden behind the fixed header */
                body {
                    padding-top: 50px !important;
                }
                
                /* Media query for smaller screens */
                @media (max-width: 900px) {
                    .header-container {
                        flex-wrap: wrap;
                        padding: 8px 12px;
                        gap: 6px;
                    }
                    
                    .header-left {
                        order: 1;
                        flex: 1 1 100%;
                    }
                    
                    .header-container h1 {
                        font-size: 11px;
                        white-space: normal;
                    }
                    
                    .header-container .toolkit-title {
                        order: 2;
                        flex: 1 1 auto;
                        font-size: 14px;
                        white-space: normal;
                        text-align: left;
                    }
                    
                    .header-right {
                        order: 3;
                        flex: 0 0 auto;
                    }
                    
                    body {
                        padding-top: 80px !important;
                    }
                }
                
                @media (max-width: 500px) {
                    .header-container .toolkit-title {
                        flex: 1 1 100%;
                        text-align: center;
                    }
                    
                    .header-right {
                        flex: 1 1 100%;
                        justify-content: center;
                    }
                    
                    body {
                        padding-top: 110px !important;
                    }
                }
            </style>
        `;

        // Find the appropriate insertion point
        // Try to find the first element after the body opening tag
        const firstElement = document.body.firstElementChild;
        
        // Create a container for the header
        const headerContainer = document.createElement('div');
        headerContainer.innerHTML = headerHTML;
        
        // Insert the header at the beginning of the body
        if (firstElement) {
            document.body.insertBefore(headerContainer, firstElement);
        } else {
            document.body.appendChild(headerContainer);
        }
        
        // Append header styles to head
        document.head.insertAdjacentHTML('beforeend', headerStyles);
        
        // Remove duplicate information from the page
        removeDuplicateInfo();
        
        console.log('Header initialized successfully');
    }
    
    // Function to remove duplicate information from the page
    function removeDuplicateInfo() {
        // Common patterns for elements that might contain duplicate info
        const patterns = [
            // Look for elements containing Doug Millner and contact info
            { selector: '.header-container, .header-top, .title-block', contains: ['Doug Millner', 'douglas.millner@nerxpower.com', 'NERX Power Consultants'] },
            // Look for specific header elements that might be duplicates
            { selector: 'header, .header', contains: ['Doug Millner', 'douglas.millner@nerxpower.com', 'NERX Power'] },
            // Look for specific div elements that might be duplicates
            { selector: 'div.header, div.title, div.author-info', contains: ['Doug Millner', 'douglas.millner', 'NERX Power'] },
            // Look for paragraphs with contact info
            { selector: 'p, div', contains: ['douglas.millner@nerxpower.com', 'www.nerxpower.com', 'linkedin.com/in/doug-millner'] },
            // Look for title and author info blocks
            { selector: 'h1, h2, h3, div, p', contains: ['Force & Magnetic Fields', 'Force and Magnetic Fields', 'by Doug Millner', 'Company:', 'Email:', 'Webpage:', 'LinkedIn:'] },
            // Look for any elements with company, email, webpage info
            { selector: '*', contains: ['Company: NERX Power', 'Email: douglas.millner', 'Webpage: www.nerxpower.com', 'LinkedIn: Doug Millner'] },
            // Specifically target the CT Saturation toolkit header
            { selector: 'header', contains: ['CT Saturation and Volt-Sec Toolkit', 'CT Saturation', 'Interactive simulation'] },
            // Target the subtitle in CT Saturation toolkit
            { selector: '.subtitle', contains: ['Interactive simulation of current transformer saturation effects'] },
            // Target the Differential Protection header
            { selector: 'h1', contains: ['Differential Protection: Simulation & Plot', 'Differential Protection'] },
            // Target the subtitle in Differential Protection toolkit
            { selector: '.subtitle', contains: ['This simulation demonstrates how differential protection works'] }
        ];
        
        // Process each pattern
        patterns.forEach(pattern => {
            // Find elements matching the selector
            const elements = document.querySelectorAll(pattern.selector);
            
            // Check each element
            elements.forEach(element => {
                // Skip if it's our own header
                if (element.closest('.header-container')) {
                    return;
                }
                
                // Check if element contains any of the specified text patterns
                const text = element.textContent || '';
                const containsPattern = pattern.contains.some(term => text.includes(term));
                
                if (containsPattern) {
                    // Check if this is a standalone element with primarily duplicate info
                    // We don't want to remove elements that just happen to mention the name
                    // but contain a lot of other important content
                    const textLength = text.trim().length;
                    const duplicateTermsLength = pattern.contains.reduce((sum, term) => {
                        return sum + (text.includes(term) ? term.length : 0);
                    }, 0);
                    
                    // If more than 40% of the text is duplicate info, hide the element
                    if (duplicateTermsLength / textLength > 0.4) {
                        console.log('Hiding duplicate element:', element);
                        element.style.display = 'none';
                    }
                }
            });
        });
    }

    // Initialize header when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHeader);
    } else {
        // DOM is already ready, call initHeader directly
        initHeader();
    }
})();