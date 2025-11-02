// CF-Infobip Broadcaster Frontend JavaScript

// Global variables
let currentUser = null;
let isAuthenticated = false;

// Provider management
let selectedProvider = 'whatsapp'; // Default provider

// Character limits per provider
const PROVIDER_LIMITS = {
    whatsapp: 4096,
    telegram: 4096
};

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

// Message composition
const messageContent = document.getElementById('message-content');
const messageCount = document.getElementById('message-count');
const selectedCount = document.getElementById('selected-count');
const selectedContactsDiv = document.getElementById('selected-contacts');
const sendMessageBtnMain = document.getElementById('send-message-btn-main');
const clearMessageBtn = document.getElementById('clear-message-btn');
const sendStatus = document.getElementById('send-status');

// Provider elements
const providerRadios = document.querySelectorAll('input[name="provider"]');
const previewProviderLabel = document.getElementById('preview-provider-label');
const whatsappPreview = document.getElementById('whatsapp-preview');
const telegramPreview = document.getElementById('telegram-preview');
const messagePreviewWhatsApp = document.getElementById('message-preview-whatsapp');
const messagePreviewTelegram = document.getElementById('message-preview-telegram');

// Global state
let allContacts = [];
let selectedContacts = new Set();
let currentPage = 1;
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
    
    // Contacts management
    importContactsBtn?.addEventListener('click', importContacts);
    selectAllContactsBtn?.addEventListener('click', selectAllContacts);
    deselectAllContactsBtn?.addEventListener('click', deselectAllContacts);
    contactsSearch?.addEventListener('input', handleSearch);
    
    // Provider change handlers
    providerRadios.forEach(radio => {
        radio.addEventListener('change', handleProviderChange);
    });
    
    // Message composition
    messageContent?.addEventListener('input', handleMessageInput);
    clearMessageBtn?.addEventListener('click', clearMessage);
    sendMessageBtnMain?.addEventListener('click', sendMessage);
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
async function loadContacts(search = '', page = 1) {
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: '50',
            search: search
        });
        
        const response = await authenticatedFetch(`/api/contacts/list?${params}`);
        const data = await response.json();
        
        if (data.success) {
            allContacts = data.data;
            currentPage = data.pagination.page;
            renderContactsList(allContacts);
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

function renderContactsList(contacts) {
    if (contacts.length === 0) {
        contactsList.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <p>No contacts found</p>
                <button onclick="importContacts()" class="mt-2 text-blue-600 hover:text-blue-800">Import from Google</button>
            </div>
        `;
        return;
    }
    
    contactsList.innerHTML = contacts.map(contact => `
        <div class="flex items-center p-2 hover:bg-gray-50 rounded">
            <input type="checkbox"
                   id="contact-${contact.id}"
                   value="${contact.id}"
                   class="mr-3 contact-checkbox"
                   ${selectedContacts.has(contact.id) ? 'checked' : ''}
                   onchange="toggleContactSelection(${contact.id})">
            <label for="contact-${contact.id}" class="flex-1 cursor-pointer">
                <div class="font-medium text-gray-900">${contact.name || 'Unknown'}</div>
                <div class="text-sm text-gray-500">${contact.phone_number}</div>
                ${contact.email ? `<div class="text-xs text-gray-400">${contact.email}</div>` : ''}
            </label>
        </div>
    `).join('');
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
    renderContactsList(allContacts);
}

function deselectAllContacts() {
    selectedContacts.clear();
    updateSelectedContactsDisplay();
    renderContactsList(allContacts);
}

function updateSelectedContactsDisplay() {
    selectedCount.textContent = selectedContacts.size;
    
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
        
        const response = await authenticatedFetch('/api/contacts/import', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Imported ${data.imported} new contacts, updated ${data.updated}`, 'success');
            loadContacts(); // Reload the contacts list
            loadDashboardData(); // Update the count
        } else {
            throw new Error(data.error || 'Import failed');
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

// Provider management functions
function handleProviderChange(e) {
    selectedProvider = e.target.value;

    // Update preview label
    const providerName = selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1);
    previewProviderLabel.textContent = `(${providerName})`;

    // Toggle preview visibility
    if (selectedProvider === 'whatsapp') {
        whatsappPreview.classList.remove('hidden');
        telegramPreview.classList.add('hidden');
    } else {
        whatsappPreview.classList.add('hidden');
        telegramPreview.classList.remove('hidden');
    }

    // Re-render message preview for new provider
    handleMessageInput();
}

// Message composition functions
function handleMessageInput() {
    const content = messageContent.value;
    const length = content.length;
    const limit = PROVIDER_LIMITS[selectedProvider];

    // Update character count
    messageCount.textContent = `${length} / ${limit} characters`;

    // Update character count color
    if (length > limit) {
        messageCount.classList.add('text-red-500');
        messageCount.classList.remove('text-gray-500');
    } else {
        messageCount.classList.remove('text-red-500');
        messageCount.classList.add('text-gray-500');
    }

    // Update preview based on provider
    const previewElement = selectedProvider === 'whatsapp'
        ? messagePreviewWhatsApp
        : messagePreviewTelegram;

    if (content.trim()) {
        // Telegram supports HTML formatting, WhatsApp plain text
        if (selectedProvider === 'telegram') {
            previewElement.innerHTML = `<p class="whitespace-pre-wrap">${renderTelegramPreview(content)}</p>`;
        } else {
            previewElement.innerHTML = `<p class="whitespace-pre-wrap">${escapeHtml(content)}</p>`;
        }
    } else {
        previewElement.innerHTML = '<p class="text-gray-500">Message preview will appear here...</p>';
    }

    // Update send button state
    updateSendButtonState();
}

function renderTelegramPreview(text) {
    // Simple HTML rendering for Telegram (supports <b>, <i>, <code>, etc.)
    // For now, just escape HTML but preserve line breaks
    return escapeHtml(text);
}

function updateSendButtonState() {
    const hasMessage = messageContent.value.trim().length > 0;
    const hasRecipients = selectedContacts.size > 0;
    const limit = PROVIDER_LIMITS[selectedProvider];
    const isValidLength = messageContent.value.length <= limit;

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
    
    const limit = PROVIDER_LIMITS[selectedProvider];
    if (message.length > limit) {
        showNotification(`Message is too long (max ${limit} characters)`, 'error');
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
                recipients,
                provider: selectedProvider // ADD THIS LINE
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
            <span class="text-gray-700">Welcome, ${currentUser.name || currentUser.email}</span>
            <button id="logout-btn" class="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded">
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
    window.location.href = '/functions/auth/google';
}

// Logout function
async function logout() {
    try {
        const response = await fetch('/functions/auth/logout', {
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

// Export functions for use in other scripts
window.app = {
    authenticatedFetch,
    showModal,
    closeModal,
    showNotification,
    formatDate,
    currentUser,
    isAuthenticated
};