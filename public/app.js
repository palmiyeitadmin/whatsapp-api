// CF-Infobip Broadcaster Frontend JavaScript

// Global variables
let currentUser = null;
let isAuthenticated = false;

// DOM elements
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const authContainer = document.getElementById('auth-container');
const googleSigninBtn = document.getElementById('google-signin-btn');

// Contacts management
const contactsList = document.getElementById('contacts-list');
const contactsSearch = document.getElementById('contacts-search');
const selectAllContactsBtn = document.getElementById('select-all-contacts');
const deselectAllContactsBtn = document.getElementById('deselect-all-contacts');
const importContactsBtn = document.getElementById('import-contacts-btn');
const addContactBtn = document.getElementById('add-contact-btn');
const addContactModal = document.getElementById('add-contact-modal');
const saveContactBtn = document.getElementById('save-contact-btn');
const cancelContactBtn = document.getElementById('cancel-contact-btn');
const contactNameInput = document.getElementById('contact-name');
const contactPhoneInput = document.getElementById('contact-phone');
const contactEmailInput = document.getElementById('contact-email');
const contactFormError = document.getElementById('contact-form-error');

// Message composition
const messageContent = document.getElementById('message-content');
const messageCount = document.getElementById('message-count');
const messagePreview = document.getElementById('message-preview');
const selectedCount = document.getElementById('selected-count');
const selectedContactsDiv = document.getElementById('selected-contacts');
const sendMessageBtnMain = document.getElementById('send-message-btn-main');
const clearMessageBtn = document.getElementById('clear-message-btn');
const sendStatus = document.getElementById('send-status');

// Global state
let allContacts = [];
let selectedContacts = new Set();
let currentPage = 1;
let totalPages = 1;
let totalContacts = 0;
let searchTimeout;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    googleSigninBtn?.addEventListener('click', initiateGoogleAuth);
    
    // Dashboard buttons
    document.getElementById('manage-contacts-btn')?.addEventListener('click', () => {
        showNotification('Contacts management coming soon!', 'info');
    });
    
    document.getElementById('create-campaign-btn')?.addEventListener('click', () => {
        showNotification('Campaign creation coming soon!', 'info');
    });
    
    document.getElementById('manage-campaigns-btn')?.addEventListener('click', () => {
        showNotification('Campaign management coming soon!', 'info');
    });
    
    document.getElementById('view-logs-btn')?.addEventListener('click', () => {
        showNotification('Message logs coming soon!', 'info');
    });

    document.getElementById('send-message-btn')?.addEventListener('click', () => {
        // Scroll to message composition area
        document.getElementById('message-content')?.focus();
        showNotification('Please compose your message below', 'info');
    });

    // Contacts management
    importContactsBtn?.addEventListener('click', importContacts);
    selectAllContactsBtn?.addEventListener('click', selectAllContacts);
    deselectAllContactsBtn?.addEventListener('click', deselectAllContacts);
    contactsSearch?.addEventListener('input', handleSearch);
    
    // Add Contact Modal
    addContactBtn?.addEventListener('click', showAddContactModal);
    cancelContactBtn?.addEventListener('click', hideAddContactModal);
    saveContactBtn?.addEventListener('click', saveContact);
    
    // Message composition
    messageContent?.addEventListener('input', handleMessageInput);
    clearMessageBtn?.addEventListener('click', clearMessage);
    sendMessageBtnMain?.addEventListener('click', sendMessage);

    // Format toolbar - Apply WhatsApp formatting
    const formatButtons = document.querySelectorAll('.format-toolbar button');
    formatButtons[0]?.addEventListener('click', () => applyFormatting('*', '*')); // Bold
    formatButtons[1]?.addEventListener('click', () => applyFormatting('_', '_')); // Italic
    formatButtons[2]?.addEventListener('click', () => applyFormatting('~', '~')); // Strikethrough
    formatButtons[3]?.addEventListener('click', () => showNotification('Emoji picker coming soon!', 'info')); // Emoji
}

// Check authentication status
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        
        if (data.authenticated && data.user) {
            currentUser = data.user;
            isAuthenticated = true;
            showDashboard();
            loadDashboardData();
        } else {
            showLoginSection();
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        showLoginSection();
    }
}

// Show login section
function showLoginSection() {
    loginSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
    updateAuthContainer(false);
}

// Show dashboard
function showDashboard() {
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    updateAuthContainer(true);
    loadContacts();
}

// Contacts management functions
async function loadContacts(search = '', page = 1, append = false) {
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: '10',
            search: search
        });

        const response = await authenticatedFetch(`/api/contacts/list?${params}`);
        const data = await response.json();

        if (data.success) {
            if (append) {
                allContacts = [...allContacts, ...data.data];
            } else {
                allContacts = data.data;
            }
            currentPage = data.pagination.page;
            totalPages = data.pagination.totalPages;
            totalContacts = data.pagination.total;
            renderContactsList(allContacts, data.pagination);
        } else {
            throw new Error(data.error || 'Failed to load contacts');
        }
    } catch (error) {
        console.error('Error loading contacts:', error);
        contactsList.innerHTML = `
            <div class="text-center text-red-500 py-8">
                <p>Failed to load contacts</p>
                <button onclick="loadContacts()" class="mt-2 text-blue-600 hover:text-blue-800">Retry</button>
            </div>
        `;
    }
}

function renderContactsList(contacts, pagination) {
    if (contacts.length === 0) {
        contactsList.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <p>No contacts found</p>
                <button onclick="importContacts()" class="mt-2 text-blue-600 hover:text-blue-800">Import from Google</button>
            </div>
        `;
        return;
    }

    const contactsHTML = `<ul class="space-y-3">` + contacts.map(contact => `
        <li class="flex items-start space-x-3 p-2 rounded-md hover:bg-background-main">
            <input type="checkbox"
                   id="contact-${contact.id}"
                   value="${contact.id}"
                   class="form-checkbox h-5 w-5 text-primary rounded mt-1 border-border-color bg-surface focus:ring-accent contact-checkbox"
                   ${selectedContacts.has(contact.id) ? 'checked' : ''}
                   onchange="toggleContactSelection(${contact.id})">
            <label for="contact-${contact.id}" class="flex-1 cursor-pointer">
                <p class="font-medium">${contact.name || 'Unknown'}</p>
                <p class="text-sm text-text-secondary">${contact.phone_number}</p>
                ${contact.email ? `<p class="text-xs text-text-secondary">${contact.email}</p>` : ''}
            </label>
        </li>
    `).join('') + `</ul>`;

    // Add Load More button if there are more pages
    const loadMoreHTML = pagination && pagination.page < pagination.totalPages ? `
        <div class="mt-4 text-center">
            <button onclick="loadMoreContacts()" class="w-full py-2 px-4 bg-primary text-white font-medium rounded-lg hover:opacity-90">
                Load More (${contacts.length} of ${pagination.total})
            </button>
        </div>
    ` : pagination ? `
        <div class="mt-4 text-center text-sm text-text-secondary">
            Showing all ${pagination.total} contacts
        </div>
    ` : '';

    contactsList.innerHTML = contactsHTML + loadMoreHTML;
}

function loadMoreContacts() {
    const nextPage = currentPage + 1;
    const searchValue = contactsSearch?.value || '';
    loadContacts(searchValue, nextPage, true);
}

function toggleContactSelection(contactId) {
    if (selectedContacts.has(contactId)) {
        selectedContacts.delete(contactId);
    } else {
        selectedContacts.add(contactId);
    }
    updateSelectedContactsDisplay();
}

function selectAllContacts() {
    allContacts.forEach(contact => {
        selectedContacts.add(contact.id);
    });
    updateSelectedContactsDisplay();
    // Update all checkboxes on the current page
    document.querySelectorAll('.contact-checkbox').forEach(checkbox => {
        checkbox.checked = true;
    });
}

function deselectAllContacts() {
    selectedContacts.clear();
    updateSelectedContactsDisplay();
    // Update all checkboxes on the current page
    document.querySelectorAll('.contact-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
}

function updateSelectedContactsDisplay() {
    if (selectedCount) {
        selectedCount.textContent = selectedContacts.size;
    }

    // Optional: Update selected contacts list if div exists
    if (selectedContactsDiv) {
        if (selectedContacts.size === 0) {
            selectedContactsDiv.innerHTML = '<p class="text-gray-500 text-sm">No contacts selected</p>';
            return;
        }

        const selectedContactsData = allContacts.filter(contact => selectedContacts.has(contact.id));
        selectedContactsDiv.innerHTML = selectedContactsData.map(contact => `
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                ${contact.name || 'Unknown'}
                <button onclick="removeSelectedContact(${contact.id})" class="ml-1 text-blue-600 hover:text-blue-800">×</button>
            </span>
        `).join('');
    }
}

function removeSelectedContact(contactId) {
    selectedContacts.delete(contactId);
    updateSelectedContactsDisplay();
    
    // Update checkbox
    const checkbox = document.getElementById(`contact-${contactId}`);
    if (checkbox) {
        checkbox.checked = false;
    }
}

async function importContacts() {
    try {
        showNotification('Importing contacts from Google...', 'info');

        const response = await authenticatedFetch('/api/contacts-v2/import', {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            showNotification(`Imported ${data.imported} new contacts, updated ${data.updated}`, 'success');
            loadContacts(); // Reload the contacts list
            loadDashboardData(); // Update the count
        } else {
            // Show detailed error message
            const errorMsg = data.details || data.error || 'Import failed';
            console.error('Import error details:', data);
            throw new Error(errorMsg);
        }
    } catch (error) {
        console.error('Import error:', error);
        showNotification(`Import failed: ${error.message}`, 'error');
    }
}

function handleSearch(event) {
    clearTimeout(searchTimeout);
    const searchTerm = event.target.value;
    
    searchTimeout = setTimeout(() => {
        loadContacts(searchTerm, 1);
    }, 300);
}

// Message composition functions
function handleMessageInput() {
    const content = messageContent.value;
    const length = content.length;

    // Update character count
    messageCount.textContent = `${length} / 4096 characters`;

    // Update character count color
    if (length > 4096) {
        messageCount.classList.add('text-red-500');
        messageCount.classList.remove('text-gray-500');
    } else {
        messageCount.classList.remove('text-red-500');
        messageCount.classList.add('text-gray-500');
    }

    // Update preview with WhatsApp formatting
    if (content.trim()) {
        // WhatsApp-style message bubble
        messagePreview.innerHTML = `
            <div class="relative inline-block max-w-full">
                <!-- Message bubble -->
                <div class="rounded-lg px-3 py-2 shadow-sm" style="background-color: #dcf8c6;">
                    <p class="text-sm text-gray-800 whitespace-pre-wrap break-words">${formatWhatsAppText(content)}</p>
                    <!-- Message tail -->
                    <div class="absolute -right-2 bottom-0 w-0 h-0"
                         style="border-left: 10px solid #dcf8c6;
                                border-top: 10px solid transparent;
                                border-bottom: 0px solid transparent;"></div>
                    <!-- Message info (time + checkmarks) -->
                    <div class="flex items-center justify-end space-x-1 mt-1">
                        <span class="text-xs text-gray-600">12:34</span>
                        <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                            <path d="M13.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-1-1a1 1 0 011.414-1.414l.293.293 7.293-7.293a1 1 0 011.414 0z"/>
                        </svg>
                    </div>
                </div>
            </div>
        `;
    } else {
        messagePreview.innerHTML = `
            <div class="text-center text-gray-500 text-sm italic opacity-60">
                Type a message to see preview...
            </div>
        `;
    }

    // Update send button state
    updateSendButtonState();
}

// Apply formatting to selected text or at cursor position
function applyFormatting(startChar, endChar) {
    const textarea = messageContent;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    if (selectedText) {
        // Wrap selected text with formatting characters
        const before = text.substring(0, start);
        const after = text.substring(end);
        const formatted = `${startChar}${selectedText}${endChar}`;

        textarea.value = before + formatted + after;

        // Set cursor position after formatted text
        const newPosition = start + formatted.length;
        textarea.setSelectionRange(newPosition, newPosition);
    } else {
        // Insert formatting characters at cursor
        const before = text.substring(0, start);
        const after = text.substring(start);
        const formatted = `${startChar}text${endChar}`;

        textarea.value = before + formatted + after;

        // Select "text" placeholder
        textarea.setSelectionRange(start + startChar.length, start + startChar.length + 4);
    }

    textarea.focus();
    handleMessageInput();
}

// Convert WhatsApp formatting to HTML
function formatWhatsAppText(text) {
    // Escape HTML first
    let formatted = escapeHtml(text);

    // Bold: *text*
    formatted = formatted.replace(/\*([^\*]+)\*/g, '<strong>$1</strong>');

    // Italic: _text_
    formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Strikethrough: ~text~
    formatted = formatted.replace(/~([^~]+)~/g, '<del>$1</del>');

    // Monospace: `text`
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-gray-200 px-1 rounded">$1</code>');

    return formatted;
}

function updateSendButtonState() {
    const hasMessage = messageContent.value.trim().length > 0;
    const hasRecipients = selectedContacts.size > 0;
    const isValidLength = messageContent.value.length <= 4096;
    
    sendMessageBtnMain.disabled = !(hasMessage && hasRecipients && isValidLength);
}

function clearMessage() {
    messageContent.value = '';
    handleMessageInput();
}

async function sendMessage() {
    if (selectedContacts.size === 0) {
        showNotification('Please select at least one contact', 'error');
        return;
    }
    
    const message = messageContent.value.trim();
    if (!message) {
        showNotification('Please enter a message', 'error');
        return;
    }
    
    if (message.length > 4096) {
        showNotification('Message is too long (max 4096 characters)', 'error');
        return;
    }
    
    try {
        sendStatus.textContent = 'Sending messages...';
        sendMessageBtnMain.disabled = true;
        
        const recipients = Array.from(selectedContacts).map(id => ({ id }));
        
        const response = await authenticatedFetch('/api/message/send', {
            method: 'POST',
            body: JSON.stringify({
                message,
                recipients
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const { sent, failed, total } = data.summary;
            showNotification(`Messages sent: ${sent}/${total}`, sent === total ? 'success' : 'warning');
            
            if (failed > 0) {
                sendStatus.textContent = `${sent} sent, ${failed} failed`;
                sendStatus.classList.add('text-yellow-600');
            } else {
                sendStatus.textContent = 'All messages sent successfully!';
                sendStatus.classList.add('text-green-600');
            }
            
            // Clear the form
            clearMessage();
            deselectAllContacts();
            
            // Update dashboard data
            loadDashboardData();
        } else {
            throw new Error(data.error || 'Failed to send messages');
        }
    } catch (error) {
        console.error('Send error:', error);
        showNotification(`Failed to send messages: ${error.message}`, 'error');
        sendStatus.textContent = 'Failed to send messages';
        sendStatus.classList.add('text-red-600');
    } finally {
        sendMessageBtnMain.disabled = false;
        
        // Clear status after 5 seconds
        setTimeout(() => {
            sendStatus.textContent = '';
            sendStatus.classList.remove('text-green-600', 'text-yellow-600', 'text-red-600');
        }, 5000);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Update auth container
function updateAuthContainer(authenticated) {
    if (authenticated && currentUser) {
        authContainer.innerHTML = `
            <span class="text-sm text-text-secondary">Welcome, ${currentUser.name || currentUser.email}</span>
            <button id="logout-btn" class="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors">
                Logout
            </button>
        `;
        document.getElementById('logout-btn').addEventListener('click', logout);
    } else {
        authContainer.innerHTML = '';
    }
}

// Initiate Google OAuth
function initiateGoogleAuth() {
    // Redirect to Google OAuth endpoint
    window.location.href = '/auth/google';
}

// Logout function
async function logout() {
    try {
        const response = await fetch('/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            currentUser = null;
            isAuthenticated = false;
            showLoginSection();
            showNotification('Logged out successfully', 'success');
        } else {
            showNotification('Error logging out', 'error');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error logging out', 'error');
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Load contacts count
        const contactsResponse = await fetch('/api/contacts/count');
        if (contactsResponse.ok) {
            const contactsData = await contactsResponse.json();
            document.getElementById('total-contacts').textContent = contactsData.count || 0;
        }
        
        // Load campaigns count
        const campaignsResponse = await fetch('/api/campaigns/count');
        if (campaignsResponse.ok) {
            const campaignsData = await campaignsResponse.json();
            document.getElementById('total-campaigns').textContent = campaignsData.count || 0;
        }
        
        // Load messages count
        const messagesResponse = await fetch('/api/messages/count');
        if (messagesResponse.ok) {
            const messagesData = await messagesResponse.json();
            document.getElementById('total-messages').textContent = messagesData.count || 0;
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Utility function to make authenticated API calls
async function authenticatedFetch(url, options = {}) {
    const defaultOptions = {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    const response = await fetch(url, mergedOptions);
    
    if (response.status === 401) {
        // Redirect to login if unauthorized
        showLoginSection();
        throw new Error('Authentication required');
    }
    
    return response;
}

// Modal functions
function showModal(title, content) {
    // Remove existing modals
    const existingModal = document.querySelector('.modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        </div>
    `;
    
    // Add to DOM
    document.body.appendChild(modal);
    
    // Show modal
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    // Setup close handlers
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', () => {
        closeModal(modal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
}

function closeModal(modal) {
    modal.classList.remove('show');
    setTimeout(() => {
        modal.remove();
    }, 300);
}

// Format date utility
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Functions for Add Contact Modal
function showAddContactModal() {
    // Reset form
    contactNameInput.value = '';
    contactPhoneInput.value = '';
    contactEmailInput.value = '';
    contactFormError.textContent = '';
    contactFormError.classList.add('hidden');
    
    // Show modal
    addContactModal.classList.remove('hidden');
    
    // Focus on name field
    setTimeout(() => {
        contactNameInput.focus();
    }, 100);
}

function hideAddContactModal() {
    addContactModal.classList.add('hidden');
}

async function saveContact() {
    try {
        // Reset error message
        contactFormError.textContent = '';
        contactFormError.classList.add('hidden');
        
        // Validate form
        const name = contactNameInput.value.trim();
        const phone = contactPhoneInput.value.trim();
        const email = contactEmailInput.value.trim();
        
        if (!phone) {
            showContactFormError('Phone number is required');
            return;
        }
        
        // Basic phone validation - ensure it has some digits
        if (!/\d/.test(phone)) {
            showContactFormError('Invalid phone number format');
            return;
        }
        
        // Disable save button and show loading state
        saveContactBtn.disabled = true;
        saveContactBtn.textContent = 'Adding...';
        
        // Send request to API
        const response = await authenticatedFetch('/api/contacts/create', {
            method: 'POST',
            body: JSON.stringify({
                name,
                phone_number: phone,
                email
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Close modal
            hideAddContactModal();
            
            // Show success message
            showNotification('Contact added successfully', 'success');
            
            // Reload contacts list
            loadContacts();
            
            // Update dashboard data
            loadDashboardData();
        } else {
            // Handle different error types
            if (response.status === 409) {
                // Contact already exists
                showContactFormError('A contact with this phone number already exists');
            } else {
                // Generic error
                throw new Error(data.error || 'Failed to add contact');
            }
        }
    } catch (error) {
        console.error('Error adding contact:', error);
        showContactFormError(error.message || 'Failed to add contact. Please try again.');
    } finally {
        // Restore save button
        saveContactBtn.disabled = false;
        saveContactBtn.textContent = 'Add Contact';
    }
}

function showContactFormError(message) {
    contactFormError.textContent = message;
    contactFormError.classList.remove('hidden');
}

// Export functions for use in other scripts
window.app = {
    authenticatedFetch,
    showModal,
    closeModal,
    showNotification,
    formatDate,
    currentUser,
    isAuthenticated,
    showAddContactModal,
    hideAddContactModal,
    saveContact
};