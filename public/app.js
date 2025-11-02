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
let totalPages = 1;
let totalContacts = 0;
let currentSearch = '';
let isLoadingMore = false;
let searchTimeout;
let currentLanguage = 'tr'; // Default to Turkish

// Translation object
const translations = {
    tr: {
        'welcome-title': 'CF-Infobip Broadcaster\'a Hoş Geldiniz',
        'welcome-subtitle': 'Başlamak için Google hesabınızla giriş yapın',
        'signin-google': 'Google ile Giriş Yap',
        'total-contacts': 'Toplam Kişi',
        'import-contacts': 'Kişileri İçe Aktar',
        'manage': 'Yönet',
        'total-campaigns': 'Toplam Kampanya',
        'create': 'Oluştur',
        'messages-sent': 'Gönderilen Mesajlar',
        'send-message': 'Mesaj Gönder',
        'view-logs': 'Logları Görüntüle',
        'contacts-title': 'Kişiler',
        'select-all': 'Tümünü Seç',
        'deselect-all': 'Seçimi Kaldır',
        'search-contacts': 'Kişi ara...',
        'loading-contacts': 'Kişiler yükleniyor...',
        'load-more': 'Daha Fazla Kişi Yükle',
        'add-new-contact': 'Yeni Kişi Ekle',
        'compose-message': 'Mesaj Oluştur',
        'messaging-provider': 'Mesajlaşma Sağlayıcısı',
        'selected': 'Seçilen',
        'contacts': 'kişi',
        'message-content': 'Mesaj İçeriği',
        'characters': 'karakter',
        'preview': 'Önizleme',
        'clear': 'Temizle',
        'send-message-btn': 'Mesaj Gönder',
        'message-preview-placeholder': 'Mesaj önizlemesi burada görünecek...',
        'add-new-contact-title': 'Yeni Kişi Ekle',
        'contact-name': 'Ad',
        'contact-email': 'E-posta',
        'preferred-provider': 'Tercih Edilen Sağlayıcı',
        'whatsapp-phone': 'WhatsApp Telefon Numarası',
        'country-code-hint': 'Ülke kodunu ekleyin (örn: +90)',
        'telegram-chat-id': 'Telegram Sohbet ID',
        'telegram-id-hint': 'Sohbet ID\'nizi @userinfobot\'dan alın',
        'telegram-username': 'Telegram Kullanıcı Adı',
        'cancel': 'İptal',
        'add-contact': 'Kişi Ekle',
        'no-contacts-found': 'Kişi bulunamadı',
        'import-from-google': 'Google\'dan İçe Aktar',
        'retry': 'Tekrar Dene',
        'failed-to-load-contacts': 'Kişiler yüklenemedi',
        'adding-contact': 'Kişi ekleniyor...',
        'contact-added-successfully': 'Kişi başarıyla eklendi!',
        'failed-to-add-contact': 'Kişi eklenemedi',
        'please-select-at-least-one-contact': 'Lütfen en az bir kişi seçin',
        'please-enter-a-message': 'Lütfen bir mesaj girin',
        'message-too-long': 'Mesaj çok uzun',
        'sending-messages': 'Mesajlar gönderiliyor...',
        'all-messages-sent-successfully': 'Tüm mesajlar başarıyla gönderildi!',
        'sent': 'gönderildi',
        'failed': 'gönderilemedi',
        'failed-to-send-messages': 'Mesajlar gönderilemedi',
        'logged-out-successfully': 'Başarıyla çıkış yapıldı',
        'error-logging-out': 'Çıkış yapılırken hata',
        'contacts-management-coming-soon': 'Kişi yönetimi yakında!',
        'campaign-creation-coming-soon': 'Kampanya oluşturma yakında!',
        'campaign-management-coming-soon': 'Kampanya yönetimi yakında!',
        'message-logs-coming-soon': 'Mesaj logları yakında!',
        'showing-count': '{showing} / {total} kişi gösteriliyor',
        'new-contacts-imported': 'yeni kişi içe aktarıldı',
        'contacts-updated': 'kişi güncellendi',
        'loading': 'Yükleniyor...',
        // Additional hardcoded strings that need translation
        'unknown': 'Bilinmeyen',
        'no-contacts-selected': 'Hiç kişi seçilmedi',
        'importing-contacts-google': 'Google\'dan kişiler içe aktarılıyor...',
        'import-failed': 'İçe aktarım başarısız oldu',
        'please-sign-out-sign-in': 'Lütfen kişi erişim izni vermek için çıkış yapıp tekrar Google ile giriş yapın',
        'sign-out': 'Çıkış Yap',
        'failed-to-load-more-contacts': 'Daha fazla kişi yüklenemedi',
        'welcome-user': 'Hoş Geldiniz,',
        'logout': 'Çıkış Yap',
        'message-preview-telegram': 'Mesaj önizlemesi burada görünecek...',
        'message-preview-whatsapp': 'Mesaj önizlemesi burada görünecek...',
        'characters-limit': '{length} / {limit} karakter',
        'messages-sent-count': 'Mesajlar gönderildi: {sent}/{total}',
        'sent-failed-count': '{sent} gönderildi, {failed} başarısız',
        'all-messages-sent': 'Tüm mesajlar başarıyla gönderildi!',
        'authentication-required': 'Kimlik doğrulaması gerekiyor',
        'imported-updated-count': '{imported} yeni kişi içe aktarıldı, {updated} kişi güncellendi',
        'import-failed-with-status': 'İçe aktarım başarısız oldu (durum {status})',
        'message-too-long-limit': 'Mesaj çok uzun (maksimum {limit} karakter)',
        'failed-to-send-messages-error': 'Mesajlar gönderilemedi: {error}',
        'refresh-token-issue': 'Lütfen kişi erişim izni vermek için çıkış yapıp tekrar Google ile giriş yapın',
        'contact-creation-failed': 'Kişi eklenemedi: {error}',
        // Placeholder translations
        'message-content-placeholder': 'Mesajınızı buraya yazın...',
        'name-placeholder': 'Mehmet Yılmaz',
        'email-placeholder': 'mehmet@example.com',
        'phone-placeholder': '+905551234567',
        'telegram-id-placeholder': '123456789',
        'telegram-username-placeholder': '@kullaniciadi'
    },
    en: {
        'welcome-title': 'Welcome to CF-Infobip Broadcaster',
        'welcome-subtitle': 'Sign in with your Google account to get started',
        'signin-google': 'Sign in with Google',
        'total-contacts': 'Total Contacts',
        'import-contacts': 'Import Contacts',
        'manage': 'Manage',
        'total-campaigns': 'Total Campaigns',
        'create': 'Create',
        'messages-sent': 'Messages Sent',
        'send-message': 'Send Message',
        'view-logs': 'View Logs',
        'contacts-title': 'Contacts',
        'select-all': 'Select All',
        'deselect-all': 'Deselect All',
        'search-contacts': 'Search contacts...',
        'loading-contacts': 'Loading contacts...',
        'load-more': 'Load More Contacts',
        'add-new-contact': 'Add New Contact',
        'compose-message': 'Compose Message',
        'messaging-provider': 'Messaging Provider',
        'selected': 'Selected',
        'contacts': 'contacts',
        'message-content': 'Message Content',
        'characters': 'characters',
        'preview': 'Preview',
        'clear': 'Clear',
        'send-message-btn': 'Send Message',
        'message-preview-placeholder': 'Message preview will appear here...',
        'add-new-contact-title': 'Add New Contact',
        'contact-name': 'Name',
        'contact-email': 'Email',
        'preferred-provider': 'Preferred Provider',
        'whatsapp-phone': 'WhatsApp Phone Number',
        'country-code-hint': 'Include country code (e.g., +90)',
        'telegram-chat-id': 'Telegram Chat ID',
        'telegram-id-hint': 'Get your chat ID from @userinfobot',
        'telegram-username': 'Telegram Username',
        'cancel': 'Cancel',
        'add-contact': 'Add Contact',
        'no-contacts-found': 'No contacts found',
        'import-from-google': 'Import from Google',
        'retry': 'Retry',
        'failed-to-load-contacts': 'Failed to load contacts',
        'adding-contact': 'Adding contact...',
        'contact-added-successfully': 'Contact added successfully!',
        'failed-to-add-contact': 'Failed to add contact',
        'please-select-at-least-one-contact': 'Please select at least one contact',
        'please-enter-a-message': 'Please enter a message',
        'message-too-long': 'Message is too long',
        'sending-messages': 'Sending messages...',
        'all-messages-sent-successfully': 'All messages sent successfully!',
        'sent': 'sent',
        'failed': 'failed',
        'failed-to-send-messages': 'Failed to send messages',
        'logged-out-successfully': 'Logged out successfully',
        'error-logging-out': 'Error logging out',
        'contacts-management-coming-soon': 'Contacts management coming soon!',
        'campaign-creation-coming-soon': 'Campaign creation coming soon!',
        'campaign-management-coming-soon': 'Campaign management coming soon!',
        'message-logs-coming-soon': 'Message logs coming soon!',
        // Additional hardcoded strings that need translation
        'unknown': 'Unknown',
        'no-contacts-selected': 'No contacts selected',
        'importing-contacts-google': 'Importing contacts from Google...',
        'import-failed': 'Import failed',
        'please-sign-out-sign-in': 'Please sign out and sign in again with Google to grant contacts access permission',
        'sign-out': 'Sign Out',
        'failed-to-load-more-contacts': 'Failed to load more contacts',
        'welcome-user': 'Welcome,',
        'logout': 'Logout',
        'message-preview-telegram': 'Message preview will appear here...',
        'message-preview-whatsapp': 'Message preview will appear here...',
        'characters-limit': '{length} / {limit} characters',
        'messages-sent-count': 'Messages sent: {sent}/{total}',
        'sent-failed-count': '{sent} sent, {failed} failed',
        'all-messages-sent': 'All messages sent successfully!',
        'authentication-required': 'Authentication required',
        'imported-updated-count': 'Imported {imported} new contacts, updated {updated}',
        'import-failed-with-status': 'Import failed (status {status})',
        'message-too-long-limit': 'Message is too long (max {limit} characters)',
        'failed-to-send-messages-error': 'Failed to send messages: {error}',
        'refresh-token-issue': 'Please sign out and sign in again with Google to grant contacts access permission',
        'contact-creation-failed': 'Failed to add contact: {error}',
        // Placeholder translations
        'message-content-placeholder': 'Type your message here...',
        'name-placeholder': 'John Doe',
        'email-placeholder': 'john@example.com',
        'phone-placeholder': '+15551234567',
        'telegram-id-placeholder': '123456789',
        'telegram-username-placeholder': '@username'
    }
};

// Get translation function
function t(key) {
    return translations[currentLanguage][key] || key;
}

// Update all text elements with current language
function updateLanguage() {
    // Update all elements with data-tr attributes
    document.querySelectorAll('[data-tr]').forEach(element => {
        const key = element.getAttribute('data-tr');
        if (key && translations[currentLanguage][key]) {
            element.textContent = translations[currentLanguage][key];
        }
    });
    
    // Update placeholders
    document.querySelectorAll('[data-tr-placeholder]').forEach(element => {
        const key = element.getAttribute('data-tr-placeholder');
        if (key && translations[currentLanguage][key]) {
            element.placeholder = translations[currentLanguage][key];
        }
    });
    
    // Update dynamic content
    updateDynamicContent();
}

// Update dynamic content that changes based on state
function updateDynamicContent() {
    // Update contact count info
    const countInfo = document.getElementById('contacts-count-info');
    if (countInfo && allContacts.length > 0) {
        countInfo.textContent = t('showing-count').replace('{count}', allContacts.length).replace('{total}', totalContacts);
    }
    
    // Update selected contacts display
    const selectedCountElement = document.getElementById('selected-count');
    if (selectedCountElement) {
        selectedCountElement.nextSibling.textContent = ` ${t('contacts')}`;
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Load saved language preference
    const savedLanguage = localStorage.getItem('preferred-language');
    if (savedLanguage && ['tr', 'en'].includes(savedLanguage)) {
        currentLanguage = savedLanguage;
        // Update language selector
        const languageSelector = document.getElementById('language-selector');
        if (languageSelector) {
            languageSelector.value = currentLanguage;
        }
    }
    
    checkAuthStatus();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    googleSigninBtn?.addEventListener('click', initiateGoogleAuth);
    
    // Dashboard buttons
    document.getElementById('manage-contacts-btn')?.addEventListener('click', () => {
        showNotification(t('contacts-management-coming-soon'), 'info');
    });
    
    document.getElementById('create-campaign-btn')?.addEventListener('click', () => {
        showNotification(t('campaign-creation-coming-soon'), 'info');
    });
    
    document.getElementById('manage-campaigns-btn')?.addEventListener('click', () => {
        showNotification(t('campaign-management-coming-soon'), 'info');
    });
    
    document.getElementById('view-logs-btn')?.addEventListener('click', () => {
        showNotification(t('message-logs-coming-soon'), 'info');
    });
    
    // Contacts management
    importContactsBtn?.addEventListener('click', importContacts);
    selectAllContactsBtn?.addEventListener('click', selectAllContacts);
    deselectAllContactsBtn?.addEventListener('click', deselectAllContacts);
    contactsSearch?.addEventListener('input', handleSearch);
    
    // Load more contacts
    const loadMoreBtn = document.getElementById('load-more-contacts');
    loadMoreBtn?.addEventListener('click', loadMoreContacts);
    
    // Add contact modal
    const addContactBtn = document.getElementById('add-contact-btn');
    const closeAddContactModalBtn = document.getElementById('close-add-contact-modal');
    const cancelAddContactBtn = document.getElementById('cancel-add-contact');
    const addContactForm = document.getElementById('add-contact-form');
    
    addContactBtn?.addEventListener('click', showAddContactModal);
    closeAddContactModalBtn?.addEventListener('click', hideAddContactModal);
    cancelAddContactBtn?.addEventListener('click', hideAddContactModal);
    addContactForm?.addEventListener('submit', saveContact);
    
    // Provider change in add contact form
    const contactProviderRadios = document.querySelectorAll('input[name="contact-provider"]');
    contactProviderRadios.forEach(radio => {
        radio.addEventListener('change', handleContactProviderChange);
    });
    
    // Language selector
    const languageSelector = document.getElementById('language-selector');
    languageSelector?.addEventListener('change', handleLanguageChange);
    
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
    updateLanguage(); // Apply language settings
    loadContacts();
}

// Handle language change
function handleLanguageChange(e) {
    currentLanguage = e.target.value;
    updateLanguage();
    // Save language preference to localStorage
    localStorage.setItem('preferred-language', currentLanguage);
}

// Contacts management functions
async function loadContacts(search = '', page = 1, append = false) {
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: '20',
            search: search
        });
        
        const response = await authenticatedFetch(`/api/contacts/list?${params}`);
        const data = await response.json();
        
        if (data.success) {
            if (append) {
                // Append new contacts to existing list
                allContacts = [...allContacts, ...data.data];
            } else {
                // Replace entire list (for new searches or initial load)
                allContacts = data.data;
                selectedContacts.clear(); // Clear selections when loading new list
            }
            
            currentPage = data.pagination.page;
            totalPages = data.pagination.totalPages;
            totalContacts = data.pagination.total;
            
            renderContactsList(allContacts);
            updateLoadMoreButton();
        } else {
            throw new Error(data.error || 'Failed to load contacts');
        }
    } catch (error) {
        console.error('Error loading contacts:', error);
        contactsList.innerHTML = `
            <div class="text-center text-red-500 py-8">
                <p>${t('failed-to-load-contacts')}</p>
                <button onclick="loadContacts()" class="mt-2 text-blue-600 hover:text-blue-800">${t('retry')}</button>
            </div>
        `;
    }
}

function renderContactsList(contacts) {
    if (contacts.length === 0 && currentPage === 1) {
        // Show empty state only on first page
        contactsList.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <p>${t('no-contacts-found')}</p>
                <button onclick="importContacts()" class="mt-2 text-blue-600 hover:text-blue-800">${t('import-from-google')}</button>
            </div>
        `;
        return;
    }
    
    // If appending, we need to add to existing HTML
    if (currentPage > 1 && contactsList.children.length > 0) {
        const newContactsHTML = contacts.slice(-20).map(contact => `
            <div class="flex items-center p-2 hover:bg-gray-50 rounded">
                <input type="checkbox"
                       id="contact-${contact.id}"
                       value="${contact.id}"
                       class="mr-3 contact-checkbox"
                       ${selectedContacts.has(contact.id) ? 'checked' : ''}
                       onchange="toggleContactSelection(${contact.id})">
                <label for="contact-${contact.id}" class="flex-1 cursor-pointer">
                    <div class="font-medium text-gray-900">${contact.name || t('unknown')}</div>
                    <div class="text-sm text-gray-500">${contact.phone_number}</div>
                    ${contact.email ? `<div class="text-xs text-gray-400">${contact.email}</div>` : ''}
                </label>
            </div>
        `).join('');
        
        contactsList.insertAdjacentHTML('beforeend', newContactsHTML);
    } else {
        // Replace entire list
        contactsList.innerHTML = contacts.map(contact => `
            <div class="flex items-center p-2 hover:bg-gray-50 rounded">
                <input type="checkbox"
                       id="contact-${contact.id}"
                       value="${contact.id}"
                       class="mr-3 contact-checkbox"
                       ${selectedContacts.has(contact.id) ? 'checked' : ''}
                       onchange="toggleContactSelection(${contact.id})">
                <label for="contact-${contact.id}" class="flex-1 cursor-pointer">
                    <div class="font-medium text-gray-900">${contact.name || t('unknown')}</div>
                    <div class="text-sm text-gray-500">${contact.phone_number}</div>
                    ${contact.email ? `<div class="text-xs text-gray-400">${contact.email}</div>` : ''}
                </label>
            </div>
        `).join('');
    }
}

// Update Load More button visibility and text
function updateLoadMoreButton() {
    const loadMoreContainer = document.getElementById('load-more-container');
    const loadMoreBtn = document.getElementById('load-more-contacts');
    const countInfo = document.getElementById('contacts-count-info');
    
    if (loadMoreContainer && loadMoreBtn && countInfo) {
        if (currentPage < totalPages) {
            loadMoreContainer.classList.remove('hidden');
            loadMoreBtn.disabled = isLoadingMore;
            loadMoreBtn.textContent = isLoadingMore ? t('loading') : t('load-more');
            
            const showingCount = allContacts.length;
            countInfo.textContent = `${t('showing-count').replace('{showing}', showingCount).replace('{total}', totalContacts)}`;
        } else {
            loadMoreContainer.classList.add('hidden');
        }
    }
}

// Load more contacts function
async function loadMoreContacts() {
    if (isLoadingMore || currentPage >= totalPages) return;
    
    isLoadingMore = true;
    updateLoadMoreButton();
    
    try {
        await loadContacts(currentSearch, currentPage + 1, true);
    } catch (error) {
        console.error('Error loading more contacts:', error);
        showNotification(t('failed-to-load-more-contacts'), 'error');
    } finally {
        isLoadingMore = false;
        updateLoadMoreButton();
    }
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
        selectedContactsDiv.innerHTML = `<p class="text-gray-500 text-sm">${t('no-contacts-selected')}</p>`;
        return;
    }
    
    const selectedContactsData = allContacts.filter(contact => selectedContacts.has(contact.id));
    selectedContactsDiv.innerHTML = selectedContactsData.map(contact => `
        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            ${contact.name || t('unknown')}
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
        showNotification(t('importing-contacts-google'), 'info');
        
        const response = await authenticatedFetch('/api/contacts/import', {
            method: 'POST'
        });

        const rawBody = await response.text();
        let data;

        try {
            data = rawBody ? JSON.parse(rawBody) : null;
        } catch (parseError) {
            console.error('Failed to parse import response:', parseError, rawBody);
        }

        if (!response.ok || !data?.success) {
            const message =
                data?.details ||
                data?.error ||
                rawBody ||
                t('import-failed-with-status').replace('{status}', response.status);
            throw new Error(message);
        }

        showNotification(t('imported-updated-count').replace('{imported}', data.imported).replace('{updated}', data.updated), 'success');
        loadContacts(currentSearch, 1, false); // Reload the contacts list
        loadDashboardData(); // Update the count
    } catch (error) {
        console.error('Import error:', error);
        
        // Check if it's a refresh token issue
        if (error.message.includes('refresh token') || error.message.includes('re-authenticate')) {
            showNotification(t('refresh-token-issue'), 'error');
            // Add a button to sign out
            const logoutBtn = document.createElement('button');
            logoutBtn.textContent = t('sign-out');
            logoutBtn.className = 'mt-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded';
            logoutBtn.onclick = logout;
            
            // Add button to notification
            setTimeout(() => {
                const notification = document.querySelector('.notification');
                if (notification) {
                    notification.appendChild(logoutBtn);
                }
            }, 100);
        } else {
            showNotification(t('import-failed') + ': ' + error.message, 'error');
        }
    }
}

function handleSearch(event) {
    clearTimeout(searchTimeout);
    const searchTerm = event.target.value;
    currentSearch = searchTerm;
    
    searchTimeout = setTimeout(() => {
        loadContacts(searchTerm, 1, false);
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
    messageCount.textContent = t('characters-limit').replace('{length}', length).replace('{limit}', limit);

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
            previewElement.innerHTML = `<p class="whitespace-pre-wrap text-white">${renderTelegramPreview(content)}</p>`;
        } else {
            previewElement.innerHTML = `<p class="whitespace-pre-wrap text-gray-800">${escapeHtml(content)}</p>`;
        }
    } else {
        if (selectedProvider === 'telegram') {
            previewElement.innerHTML = `<p class="text-gray-300 italic">${t('message-preview-telegram')}</p>`;
        } else {
            previewElement.innerHTML = `<p class="text-gray-400 italic">${t('message-preview-whatsapp')}</p>`;
        }
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
        showNotification(t('please-select-at-least-one-contact'), 'error');
        return;
    }
    
    const message = messageContent.value.trim();
    if (!message) {
        showNotification(t('please-enter-a-message'), 'error');
        return;
    }
    
    const limit = PROVIDER_LIMITS[selectedProvider];
    if (message.length > limit) {
        showNotification(t('message-too-long-limit').replace('{limit}', limit), 'error');
        return;
    }
    
    try {
        sendStatus.textContent = t('sending-messages');
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
            showNotification(t('messages-sent-count').replace('{sent}', sent).replace('{total}', total), sent === total ? 'success' : 'warning');
            
            if (failed > 0) {
                sendStatus.textContent = t('sent-failed-count').replace('{sent}', sent).replace('{failed}', failed);
                sendStatus.classList.add('text-yellow-600');
            } else {
                sendStatus.textContent = t('all-messages-sent');
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
        showNotification(t('failed-to-send-messages-error').replace('{error}', error.message), 'error');
        sendStatus.textContent = t('failed-to-send-messages');
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
            <span class="text-gray-700">${t('welcome-user')} ${currentUser.name || currentUser.email}</span>
            <button id="logout-btn" class="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded">
                ${t('logout')}
            </button>
        `;
        document.getElementById('logout-btn').addEventListener('click', logout);
    } else {
        authContainer.innerHTML = '';
    }
}

// Modal functions for adding contacts
function showAddContactModal() {
    const modal = document.getElementById('add-contact-modal');
    modal.classList.remove('hidden');
    // Reset form
    document.getElementById('add-contact-form').reset();
    // Show WhatsApp fields by default
    handleContactProviderChange({ target: { value: 'whatsapp' } });
}

function hideAddContactModal() {
    const modal = document.getElementById('add-contact-modal');
    modal.classList.add('hidden');
}

function handleContactProviderChange(e) {
    const provider = e.target.value;
    const whatsappFields = document.getElementById('whatsapp-fields');
    const telegramFields = document.getElementById('telegram-fields');
    
    if (provider === 'whatsapp') {
        whatsappFields.classList.remove('hidden');
        telegramFields.classList.add('hidden');
    } else {
        whatsappFields.classList.add('hidden');
        telegramFields.classList.remove('hidden');
    }
}

async function saveContact(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const provider = formData.get('contact-provider');
    
    let contactData = {
        name: formData.get('contact-name'),
        email: formData.get('contact-email'),
        preferred_provider: provider
    };
    
    if (provider === 'whatsapp') {
        contactData.phone_number = formData.get('contact-phone');
    } else {
        contactData.telegram_id = formData.get('contact-telegram-id');
        contactData.telegram_username = formData.get('contact-telegram-username');
    }
    
    try {
        showNotification(t('adding-contact'), 'info');
        
        const response = await authenticatedFetch('/api/contacts/create', {
            method: 'POST',
            body: JSON.stringify(contactData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(t('contact-added-successfully'), 'success');
            hideAddContactModal();
            // Reload contacts list
            loadContacts(currentSearch, 1, false);
            loadDashboardData(); // Update contact count
        } else {
            throw new Error(data.error || t('failed-to-add-contact'));
        }
    } catch (error) {
        console.error('Save contact error:', error);
        showContactFormError(error.message);
    }
}

function showContactFormError(message) {
    // Remove any existing error messages
    const existingError = document.querySelector('.contact-form-error');
    if (existingError) {
        existingError.remove();
    }
    
    // Add error message above the form
    const errorDiv = document.createElement('div');
    errorDiv.className = 'contact-form-error bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4';
    errorDiv.textContent = message;
    
    const modal = document.getElementById('add-contact-modal');
    const form = document.getElementById('add-contact-form');
    form.parentNode.insertBefore(errorDiv, form);
    
    // Remove error after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
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
            showNotification(t('logged-out-successfully'), 'success');
        } else {
            showNotification(t('error-logging-out'), 'error');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showNotification(t('error-logging-out'), 'error');
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
        throw new Error(t('authentication-required'));
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
