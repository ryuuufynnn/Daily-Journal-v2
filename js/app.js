// Small global bindings so non-module scripts can safely reference these identifiers
window.currentUserId = window.currentUserId || null;
window.currentUserEmail = window.currentUserEmail || null;
var currentUserId = window.currentUserId;
var currentUserEmail = window.currentUserEmail;

// --- CLOUDINARY CONFIGURATION (REQUIRED) ---
const CLOUDINARY_CLOUD_NAME = 'dlevrwpn5';
const CLOUDINARY_UPLOAD_PRESET = 'unasigned_journal';
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// Expose Cloudinary config to window
window.CLOUDINARY_CLOUD_NAME = CLOUDINARY_CLOUD_NAME;
window.CLOUDINARY_UPLOAD_PRESET = CLOUDINARY_UPLOAD_PRESET;
window.CLOUDINARY_URL = CLOUDINARY_URL;

// --- GLOBAL VARIABLES ---
const firebaseConfig = {
    apiKey: "AIzaSyAv4Dn0-HfdJGmEMguCYVXci2pupouBnPM",
    authDomain: "myjournal-9782a.firebaseapp.com",
    databaseURL: "https://myjournal-9782a-default-rtdb.firebaseio.com",
    projectId: "myjournal-9782a",
    storageBucket: "myjournal-9782a.appspot.com",
    messagingSenderId: "912645688403",
    appId: "1:912645688403:web:1fd5ef3332687353e6caa6",
    measurementId: "G-6SGJYYCB7E"
};

// Initialize Firebase (using compat SDK)
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Expose to window for other scripts
window.auth = auth;
window.db = db;
window.firebase = firebase;

let currentView = 'timeline';
window.isAuthReady = false;

function getUserJournalCollection(userId) {
    return db.collection("journals");
}

// Return local date in YYYY-MM-DD (uses local timezone, not UTC)
function getLocalDateISO() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Return local datetime suitable for <input type="datetime-local"> (YYYY-MM-DDTHH:MM)
function getLocalDateTimeLocal() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function getFriendlyAuthError(errorCode) {
    switch (errorCode) {
        case 'auth/invalid-email': return 'Invalid email.';
        case 'auth/user-disabled': return 'This account is banned.';
        case 'auth/user-not-found': return 'User not found';
        case 'auth/wrong-password':
        case 'auth/invalid-credential': return 'Incorrect Email or Password.';
        case 'auth/email-already-in-use': return 'Email already in use.';
        case 'auth/weak-password': return 'Weaak Password: Password is too short.';
        default: return `Unknown Error (Code: ${errorCode}). Check the console for details.`;
    }
}

async function initializeAuth() {
    // Set up auth state listener FIRST
    auth.onAuthStateChanged((user) => {
        const loaderEl = document.getElementById('loading-screen');
        if (loaderEl) loaderEl.style.display = 'none';
        window.isAuthReady = true;
        console.log('Auth state changed. User:', user ? user.email : 'null');

        if (user) {
            sessionStorage.setItem('wasAuthenticated', 'true');
            window.currentUserId = user.uid;
            window.currentUserEmail = user.email || 'User';
            currentUserId = user.uid;
            currentUserEmail = user.email || 'User';
            
            const authContainerEl = document.getElementById('auth-container');
            const appContainerEl = document.getElementById('app-container');
            
            if (authContainerEl) {
                authContainerEl.classList.add('hidden');
                authContainerEl.style.display = 'none';
            }
            if (appContainerEl) {
                appContainerEl.classList.remove('hidden');
                appContainerEl.style.display = 'flex';
            }
            
            const sidebarGreetingEl = document.getElementById('sidebar-greeting');
            if (sidebarGreetingEl) sidebarGreetingEl.textContent = `Hello, ${window.currentUserEmail}!`;
            
            console.log('User authenticated. Navigating to timeline...');
            navigateTo('timeline');
        } else {
            sessionStorage.removeItem('wasAuthenticated');
            window.currentUserId = null;
            window.currentUserEmail = null;
            currentUserId = null;
            currentUserEmail = null;
            
            const appContainerEl2 = document.getElementById('app-container');
            const authContainerEl2 = document.getElementById('auth-container');
            
            if (appContainerEl2) {
                appContainerEl2.classList.add('hidden');
                appContainerEl2.style.display = 'none';
            }
            if (authContainerEl2) {
                authContainerEl2.classList.remove('hidden');
                authContainerEl2.style.display = 'flex';
            }
            renderAuthForm('login');
        }
    });

    // Then, check if we need to auto-logout on refresh
    const wasAuthenticated = sessionStorage.getItem('wasAuthenticated');
    if (wasAuthenticated === 'true') {
        console.log('Auto-logout on page refresh');
        try {
            await auth.signOut();
        } catch (e) {
            console.log('Auto-logout attempt:', e);
        }
    }

    // Fallback to show login after 4s if Firebase auth state hasn't fired
    setTimeout(() => {
        if (!window.isAuthReady) {
            console.log('Auth timeout - showing login form');
            window.isAuthReady = true;
            const loader = document.getElementById('loading-screen');
            const authContainer = document.getElementById('auth-container');
            if (loader) loader.style.display = 'none';
            if (authContainer) {
                authContainer.classList.remove('hidden');
                authContainer.style.display = 'flex';
            }
            renderAuthForm('login');
        }
    }, 4000);
}

async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const messageEl = document.getElementById('auth-message');

    if (!email || !password) {
        messageEl.textContent = 'Email and password are required.';
        messageEl.className = 'text-red-400 mt-4 text-center';
        return;
    }

    messageEl.textContent = 'Logging in...';
    messageEl.className = 'text-indigo-400 mt-4 text-center';

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log('Login successful:', userCredential.user.email);
        messageEl.textContent = 'Successful login!';
        messageEl.className = 'text-green-400 mt-4 text-center';
        // The onAuthStateChanged listener will handle the rest
    } catch (error) {
        const friendlyMessage = getFriendlyAuthError(error.code);
        messageEl.textContent = `${friendlyMessage}`;
        messageEl.className = 'text-red-400 mt-4 text-center';
        console.error("Login error:", error);
    }
}

async function handleLogout() {
    try {
        await auth.signOut();
        document.getElementById('app-container').classList.add('hidden');
        document.getElementById('auth-container').classList.remove('hidden');
        renderAuthForm('login');
    } catch (error) {
        console.error("Logout failed:", error);
    }
}

async function handleSignup() {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const messageEl = document.getElementById('auth-message');

    localStorage.setItem('loggedInUserEmail', email);

    messageEl.textContent = 'Registering...';
    messageEl.className = 'text-indigo-400 mt-4 text-center';

    try {
        await auth.createUserWithEmailAndPassword(email, password);
        messageEl.textContent = 'Successful sign up! Logged in automatically.';
    } catch (error) {
        const friendlyMessage = getFriendlyAuthError(error.code);
        messageEl.textContent = `${friendlyMessage}`;
        messageEl.className = 'text-red-400 mt-4 text-center';
        console.error("Sign up error:", error);
    }
}

async function handleGoogleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    const messageEl = document.getElementById('auth-message');

    messageEl.textContent = 'Redirecting to Google...';
    messageEl.className = 'text-indigo-400 mt-4 text-center';

    try {
        await auth.signInWithPopup(provider);
        messageEl.textContent = 'Successful Google login!';
    } catch (error) {
        const friendlyMessage = getFriendlyAuthError(error.code);
        messageEl.textContent = `Google Login Failed: ${friendlyMessage}`;
        messageEl.className = 'text-red-400 mt-4 text-center';
        console.error("Google login error:", error);
    }
}

async function uploadJournal() {
    const fileInput = document.getElementById('upload-file');
    const caption = document.getElementById('upload-caption').value;
    const datetimeInput = document.getElementById('upload-datetime');
    const entryDate = datetimeInput && datetimeInput.value ? datetimeInput.value : getLocalDateTimeLocal();
    const userEmail = window.currentUserEmail || 'Unknown User';
    const messageElement = document.getElementById('upload-message');

    if (!fileInput.files.length) {
        messageElement.textContent = 'Please select an image to upload.';
        messageElement.className = 'text-red-400 mt-4';
        return;
    }

    const file = fileInput.files[0];

    if (!window.currentUserId) {
        messageElement.textContent = 'You must log in first.';
        messageElement.className = 'text-red-400 mt-4';
        return;
    }

    messageElement.textContent = 'Uploading... Please wait.';
    messageElement.className = 'text-indigo-400 mt-4';

    try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        formData.append("public_id", `journal-entry-${crypto.randomUUID()}`);

        const response = await fetch(CLOUDINARY_URL, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errorDetails = await response.json();
            throw new Error(errorDetails.error?.message || 'Upload failed.');
        }

        const data = await response.json();
        const imageUrl = data.secure_url;
        const publicId = data.public_id;
        const entryId = crypto.randomUUID();

        const newEntry = {
            user_id: window.currentUserId,
            user_email: userEmail,
            caption: caption,
            image_url: imageUrl,
            cloudinary_public_id: publicId,
            entry_date: entryDate,
            created_at: new Date().toISOString()
        };

        await db.collection('journals').doc(entryId).set(newEntry);

        messageElement.textContent = 'Successfully uploaded!';
        messageElement.className = 'text-green-400 mt-4';

        document.getElementById('upload-caption').value = '';
        fileInput.value = '';
        setTimeout(() => navigateTo('timeline'), 800);

    } catch (error) {
        console.error('Upload failed:', error);
        messageElement.textContent = `Error: ${error.message}`;
        messageElement.className = 'text-red-400 mt-4';
    }
}

async function deleteJournalEntry(entryId, publicId) {
    if (!window.currentUserId) {
        customAlertModal('Error', 'You must be logged in to delete entries.');
        return;
    }

    const result = await customConfirmModal('Are you sure?', 'This journal entry will be permanently deleted from Firestore. The image asset will remain in your Cloudinary account (Deletion requires a secure backend key).');
    if (!result) return;

    try {
        const entryRef = db.collection('journals').doc(entryId);
        const entrySnap = await entryRef.get();
        if (!entrySnap.exists) {
            customAlertModal('Error', 'Entry not found. It may have already been deleted.');
            return;
        }

        const data = entrySnap.data();
        const ownerId = data.user_id || data.userId || data.uid;
        if (ownerId && ownerId !== window.currentUserId) {
            customAlertModal('Error', 'You do not have permission to delete this entry.');
            console.warn(`Delete prevented: currentUserId=${window.currentUserId} ownerId=${ownerId}`);
            return;
        }

        await entryRef.delete();
        customAlertModal('Success', 'Entry successfully deleted from Firestore!');
    } catch (error) {
        customAlertModal('Error', `Could not delete entry: ${error.message}`);
        console.error("Delete Error:", error);
    }
}

// Real-time listener function for the Timeline
let unsubscribeTimeline = null;

function fetchJournalEntries() {
    const timelineContainer = document.getElementById('timeline-content');

    if (unsubscribeTimeline) {
        unsubscribeTimeline();
        unsubscribeTimeline = null;
    }

    timelineContainer.innerHTML = `<div class="p-8 text-center text-gray-400 col-span-full">
        <div class="loader mx-auto" aria-hidden="true"></div>
        <p class="mt-4">Updating your journal...</p>
    </div>`;

    timelineContainer.className = 'grid grid-cols-1 gap-6';

    if (!window.currentUserId) {
        timelineContainer.innerHTML = `<div class="p-8 text-center text-red-400 col-span-full">User is not logged in.</div>`;
        return;
    }

    try {
        const q = db.collection('journals').where('user_id', '==', window.currentUserId);

        unsubscribeTimeline = q.onSnapshot((snapshot) => {
            const entries = [];
            snapshot.forEach((doc) => {
                entries.push({ id: doc.id, ...doc.data() });
            });

            entries.sort((a, b) => {
                const dateA = a.entry_date || a.created_at;
                const dateB = b.entry_date || b.created_at;
                if (dateA < dateB) return 1;
                if (dateA > dateB) return -1;
                return 0;
            });

            if (entries.length === 0) {
                timelineContainer.innerHTML = `
                    <div class="col-span-full text-center p-10 journal-card rounded-xl max-w-lg mx-auto">
                        <i data-lucide="book-open-text" class="w-12 h-12 text-gray-500 mx-auto"></i>
                        <h3 class="mt-4 text-xl font-semibold text-gray-100">No Entries Here</h3>
                        <p class="mt-2 text-gray-400">Start by uploading your first entry to the cloud.</p>
                        <button onclick="navigateTo('upload')" class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition">
                            Upload Now
                        </button>
                    </div>
                `;
                lucide.createIcons();
                return;
            }

            timelineContainer.innerHTML = entries.map(entry => {
                const deleteBtn = (entry.user_id && entry.user_id === window.currentUserId) ?
                    `<button onclick="deleteJournalEntry('${entry.id}', '${entry.cloudinary_public_id || ''}')" class="px-3 py-1 border border-red-600 text-red-400 rounded-lg hover:bg-red-900 transition flex items-center">
                        <i data-lucide="trash-2" class="w-4 h-4 mr-1"></i> Delete
                    </button>` : '';
                return `
                    <div class="journal-card rounded-xl overflow-hidden group hover:shadow-xl transition duration-300 mx-auto">
                        <div class="image-wrap" style="height:12rem;">
                            <img src="${entry.image_url || 'https://placehold.co/600x400/3c3c6f/a78bfa?text=No+Image'}"
                                class="w-full h-full object-cover transition duration-500"
                                onerror="this.onerror=null; this.src='https://placehold.co/600x400/3c3c6f/a78bfa?text=Image+Load+Error';"
                                alt="Journal Photo">
                            <div class="img-overlay">
                                <button class="overlay-view" data-view-src="${entry.image_url || ''}" data-view-caption="${(entry.caption||'').replace(/"/g, '&quot;')}" aria-label="View image">View</button>
                            </div>
                        </div>
                        <div class="p-4">
                            <p class="text-xs font-semibold text-indigo-400 mb-2 truncate">
                                Uploader: ${entry.user_email || window.currentUserEmail || 'You (Anonymous)'}
                            </p>
                            <p class="text-gray-400 text-sm font-medium mb-2">${(function(){
                                try {
                                    const d = entry.entry_date ? new Date(entry.entry_date) : new Date(entry.created_at);
                                    return d.toLocaleString();
                                } catch(e) { return entry.entry_date || entry.created_at || 'Unknown'; }
                            })()}</p>
                            <p class="text-gray-300 text-base mb-4">${entry.caption}</p>
                            <div class="flex justify-between items-center text-sm">
                                <p class="text-xs text-gray-500 truncate mr-2">Public ID: ${entry.cloudinary_public_id ? entry.cloudinary_public_id.split('/').pop() : 'N/A'}</p>
                                ${deleteBtn}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            timelineContainer.className = 'grid gap-6';
            lucide.createIcons();

        }, (error) => {
            timelineContainer.innerHTML = `<div class="p-8 text-center text-red-400 col-span-full">Error loading entries: ${error.message}</div>`;
            console.error("Firestore Error in onSnapshot:", error);
        });
    } catch (error) {
        timelineContainer.innerHTML = `<div class="p-8 text-center text-red-400 col-span-full">Error setting up listener: ${error.message}</div>`;
        console.error("Setup Listener Error:", error);
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");
    const menuIcon = document.getElementById("menu-icon");
    const closeIcon = document.getElementById("close-icon");

    const isOpen = sidebar.classList.toggle("open");
    overlay.classList.toggle("hidden", !isOpen);

    if (isOpen) {
        menuIcon.classList.add("hidden");
        closeIcon.classList.remove("hidden");
    } else {
        menuIcon.classList.remove("hidden");
        closeIcon.classList.add("hidden");
    }
}

function navigateTo(view) {
    currentView = view;

    if (view !== 'timeline' && unsubscribeTimeline) {
        unsubscribeTimeline();
        unsubscribeTimeline = null;
    }

    window.location.hash = view;
    renderAppView();

    if (window.innerWidth < 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar.classList.contains('open')) {
            toggleSidebar();
        }
    }
}

function renderAppView() {
    if (!window.currentUserId && !auth.currentUser) {
        document.getElementById('app-container').classList.add('hidden');
        document.getElementById('auth-container').classList.remove('hidden');
        renderAuthForm('login');
        return;
    }

    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('auth-container').classList.add('hidden');

    const mainContentArea = document.getElementById('main-content-area');
    mainContentArea.innerHTML = '';

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeNav = document.getElementById(`nav-${currentView}`);
    if (activeNav) activeNav.classList.add('active');

    let title = '';
    let content = '';

    switch (currentView) {
        case 'timeline':
            title = 'Uploaded Journal';
            content = `
                <div class="flex justify-between items-center mb-10">
                    <div>
                        <h1 class="text-4xl font-extrabold text-white mb-1">Uploaded Journal</h1>
                        <p class="text-gray-400">Saved securely with Cloudinary & Firestore.</p>
                    </div>
                    <button onclick="navigateTo('upload')" class="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:bg-indigo-700 transition flex items-center text-sm">
                        <i data-lucide="plus-circle" class="w-4 h-4 mr-2"></i> New Memory
                    </button>
                </div>
                <div id="timeline-content" class="grid grid-cols-1 gap-6"></div>
            `;

            setTimeout(() => {
                mainContentArea.innerHTML = content;
                lucide.createIcons();
                fetchJournalEntries();
            }, 1);
            break;

        case 'upload':
            title = 'Journal Entry';
            content = `
                <div class="flex flex-col items-center justify-center min-h-[70vh]">
                    <h1 class="text-3xl font-bold mb-6 text-gray-100 text-center">${title}</h1>
                    <div class="journal-card p-8 rounded-xl max-w-lg mx-auto border-t-4 border-indigo-600">
                        <h3 class="text-2xl font-semibold mb-6 text-white text-center">Save your Memory here!</h3>
                        <div class="space-y-4">
                            <div>
                                <label for="upload-caption" class="block text-sm font-medium text-gray-300 mb-1">Caption / Journal Entry:</label>
                                <textarea id="upload-caption" rows="4" class="w-full p-3 border border-gray-600 bg-gray-800 text-gray-100 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" placeholder="Unsa ang naa sa imong hunahuna karon?"></textarea>
                            </div>
                            <div>
                                <label for="upload-datetime" class="block text-sm font-medium text-gray-300 mb-1">Entry Date & time (PST):</label>
                                <input type="datetime-local" id="upload-datetime" readonly class="w-full p-3 border border-gray-600 bg-gray-800 text-gray-400 rounded-lg">
                            </div>
                            <div>
                                <label for="upload-email" class="block text-sm font-medium text-gray-300 mb-1">Email:</label>
                                <input type="text" id="upload-email" readonly class="w-full p-3 border border-gray-600 bg-gray-800 text-gray-400 rounded-lg">
                            </div>
                            <div>
                                <label for="upload-file" class="block text-sm font-medium text-gray-300 mb-1">Image (File):</label>
                                <input type="file" id="upload-file" accept="image/*" class="w-full text-gray-100 p-2 border border-gray-700 rounded-lg bg-gray-800">
                            </div>
                            <div id="upload-message" class="text-center"></div>
                            <button onclick="uploadJournal()" class="w-full p-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition">
                                <i data-lucide="upload-cloud" class="w-5 h-5 inline-block mr-2"></i> Upload
                            </button>
                        </div>
                    </div>
                </div>
            `;

            setTimeout(() => {
                const dtEl = document.getElementById('upload-datetime');
                if (dtEl) dtEl.value = getLocalDateTimeLocal();
                document.getElementById('upload-email').value = window.currentUserEmail || 'Unknown User';
            }, 150);
            break;

        case 'profile':
            title = 'Account Information';
            content = `
                <div class="flex flex-col items-center justify-center min-h-[70vh]">
                    <h1 class="text-3xl font-bold mb-6 text-gray-100 text-center">${title}</h1>
                    <div class="journal-card p-8 rounded-xl max-w-lg w-full">
                        <h3 class="text-xl font-semibold mb-6 text-white text-center">Account Details</h3>
                        <div class="space-y-4 text-gray-300 text-center">
                            <p><strong>Email:</strong> ${auth.currentUser?.email || 'N/A'}</p>
                            <p><strong>Date Joined:</strong> <span id="date-joined" class="font-mono text-sm bg-gray-800 p-2 rounded-lg inline-block w-full mt-1">Loading...</span></p>
                            <div class="mt-2"></div>
                            <div class="mt-3 text-left">
                                <label class="block text-sm font-medium text-gray-300 mb-2">Profile Picture</label>
                                <div class="flex items-center space-x-4">
                                    <div class="w-20 h-20 bg-gray-800 rounded-full overflow-hidden border border-gray-700" id="profile-pic-preview">
                                        <img id="profile-pic-img" src="https://i.pinimg.com/474x/65/1c/6d/651c6da502353948bdc929f02da2b8e0.jpg?nii=t" alt="Profile" class="w-full h-full object-cover">
                                    </div>
                                    <div class="flex-1">
                                        <input type="file" id="profile-pic-file" accept="image/*" class="text-sm text-gray-300">
                                        <p class="text-xs text-gray-500 mt-2">Accepted: JPG, PNG. Max 5MB.</p>
                                    </div>
                                </div>
                            </div>
                            <div class="mt-4 text-left">
                                <label for="profile-bio" class="block text-sm font-medium text-gray-300 mb-2">Bio mo o bio ko HAHAHA</label>
                                <textarea id="profile-bio" rows="4" class="w-full p-3 border border-gray-600 bg-gray-800 text-gray-100 rounded-lg" placeholder="Qoutes, motivation etc..."></textarea>
                            </div>
                            <div id="profile-message" class="text-center mt-2"></div>
                            <div class="flex space-x-3 mt-4">
                                <button id="save-profile-btn" class="flex-1 p-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition">Save Changes</button>
                                <button onclick="handleLogout()" class="w-40 p-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition flex items-center justify-center">
                                    <i data-lucide="log-out" class="w-4 h-4 inline-block mr-2"></i> Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            break;

        case 'contact':
            title = '© 2026 Lau Daily. All rights reserved.';
            content = `
                <div class="flex flex-col items-center justify-center min-h-[70vh]">
                    <h1 class="text-3xl font-bold mb-6 text-gray-100 text-center">${title}</h1>
                    <div class="journal-card p-8 rounded-xl max-w-lg mx-auto">
                        <h3 class="text-2xl font-semibold mb-6 text-white text-center">Developer Information</h3>
                        <div class="space-y-4 text-gray-300">
                            <div class="p-4 bg-gray-700 rounded-lg">
                                <p class="font-bold text-indigo-300">Created: </p> <p>October 15, 2025</p>
                                <p class="font-bold text-indigo-300">Username:</p>
                                <p>ryu.dev ౨ৎ</p>
                                <p class="font-bold text-indigo-300">Age:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Course:</p>
                                <p>18&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;BSCpE — Computer Engineering <br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;BSCS — Computer Science
                                </p>
                            </div>
                            <div class="p-4 bg-gray-700 rounded-lg">
                                <p class="font-bold text-indigo-300">Email:</p>
                                <p>bscpe.laurence.helloworld@gmail.com</p>
                                <p>comp.sci.lau@programmer.net</p>
                                <p class="font-bold text-indigo-300 mb-0">Tech Stack:</p>
                                <p class="mt-0">Frontend: HTML, Tailwind CSS, JavaScript <br>Media Storage: Cloudinary <br> PWA Config: manifest.json <br> Backend: Firebase <br></p>
                                
                            </div>
                            <div class="p-4 bg-gray-700 rounded-lg">
                                <div class="p-4 bg-gray-700 rounded-lg text-center">
                                    <p class="font-bold text-indigo-300 mb-0.5"><br>Chat ka na lang.</p>
                                    <a href="https://t.me/yuhimofanny" target="_blank" class="hover:underline">Telegram || <a href="https://github.com/ryuuufynnn" target="_blank" class="hover:underline">GitHub <br></a>
                                    <p>&nbsp;&nbsp;&nbsp;&nbsp;</p>
                                    <div class="flex justify-center space-x-6 text-gray-300">
                                        <a href="https://www.facebook.com/laudgaf" target="_blank" class="hover:text-blue-500 transition transform hover:scale-110">
                                            <i data-lucide="facebook" class="w-6 h-6"></i>
                                        </a>
                                        <a href="https://www.instagram.com/hello_world_ryuuu/" target="_blank" class="hover:text-pink-500 transition transform hover:scale-110">
                                            <i data-lucide="instagram" class="w-6 h-6"></i>
                                        </a>
                                        <a href="https://tiktok.com/@ryuhahaily" target="_blank" class="hover:text-white transition transform hover:scale-110">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" class="w-6 h-6 fill-current">
                                                <path d="M232,64a64.07,64.07,0,0,1-64-64h-40V184a40,40,0,1,1-40-40V104a80,80,0,1,0,80,80V96a103.66,103.66,0,0,0,64,22Z"/>
                                            </svg>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            lucide.createIcons();
            break;

        default:
            title = 'Daily Journal';
            content = `<p class="text-center text-gray-500 p-10">Select an option from the left navigation bar.</p>`;
            break;
    }

    document.getElementById('mobile-header-title').textContent = title;

    if (currentView !== 'timeline') {
        mainContentArea.innerHTML = content;
        lucide.createIcons();
    }
}

function renderAuthForm(mode) {
    const formContainer = document.getElementById('auth-form-container');
    const authMessageEl = document.getElementById('auth-message');
    if (authMessageEl) authMessageEl.textContent = '';

    if (mode === 'login') {
        formContainer.innerHTML = `
            <h2 class="text-2xl font-bold mb-6 text-gray-100">Log in to Daily Journal</h2>
            <div class="field mb-4">
                <input id="login-email" type="email" placeholder="Email" required>
                <label for="login-email">Email</label>
            </div>
            <div class="field mb-4">
                <input id="login-password" type="password" placeholder="Password" required>
                <label for="login-password">Password</label>
                <button type="button" class="password-toggle" data-target="login-password" aria-label="Toggle password visibility">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M2.24 12.53C3.73 7.31 7.61 4 12 4s8.27 3.31 9.76 8.53a1 1 0 010 .94C20.27 19.69 16.39 23 12 23s-8.27-3.31-9.76-8.53a1 1 0 010-.94z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </button>
            </div>
            <button id="login-submit" class="w-full p-3 bg-indigo-600 text-white font-semibold rounded-lg">Login</button>
            <div class="mt-4 text-center text-gray-400">
                Don't have an account? <a href="#" id="signup-link" class="text-indigo-400 hover:underline">Sign up</a>
            </div>
        `;
    } else {
        formContainer.innerHTML = `
            <h2 class="text-2xl font-bold mb-6 text-gray-100">Create a Daily Journal Account</h2>
            <div class="field mb-4">
                <input id="signup-email" type="email" placeholder="Email" required>
                <label for="signup-email">Email</label>
            </div>
            <div class="field mb-4">
                <input id="signup-password" type="password" placeholder="Password (at least 6 characters)" required>
                <label for="signup-password">Password</label>
                <button type="button" class="password-toggle" data-target="signup-password" aria-label="Toggle password visibility">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M2.24 12.53C3.73 7.31 7.61 4 12 4s8.27 3.31 9.76 8.53a1 1 0 010 .94C20.27 19.69 16.39 23 12 23s-8.27-3.31-9.76-8.53a1 1 0 010-.94z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </button>
            </div>
            <button id="signup-submit" class="w-full p-3 bg-green-600 text-white font-semibold rounded-lg">Sign Up</button>
            <div class="mt-4 text-center text-gray-400">
                Already have an account? <a href="#" id="login-link" class="text-indigo-400 hover:underline">Log in</a>
            </div>
        `;
    }

    formContainer.innerHTML += `
        <div class="flex items-center my-6">
            <div class="flex-grow border-t border-gray-700"></div>
            <span class="flex-shrink mx-4 text-gray-500">OR</span>
            <div class="flex-grow border-t border-gray-700"></div>
        </div>
        <button id="google-login-btn" class="w-full p-3 border border-gray-600 text-gray-300 hover:bg-gray-700 flex items-center justify-center rounded-lg">
            <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.2c-5.5 0-9.8 4.3-9.8 9.8 0 4.1 2.3 7.6 5.6 9.4l-.4-1.9c-2.4-1.4-4-4.1-4-7.5 0-4.8 3.9-8.7 8.7-8.7 2.6 0 5 1.1 6.7 2.7l-1.9 1.9c-1-1-2.3-1.6-3.8-1.6-3.2 0-5.8 2.6-5.8 5.8s2.6 5.8 5.8 5.8c2.8 0 4.4-1.2 5.1-1.9L16.2 14c.2-.2.3-.6.3-1s-.1-.8-.3-1l.7-.7c1.3-1.3 2.1-3.2 2.1-5.1C21.8 6.5 17.5 2.2 12 2.2z"/>
            </svg> Log in with Google
        </button>
    `;
    lucide.createIcons();
    initAuthUI();
}

function initAuthUI() {
    // Setup password toggle buttons
    document.querySelectorAll('.password-toggle').forEach(btn => {
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        if (!input) return;
        btn.onclick = () => {
            const isPwd = input.type === 'password';
            input.type = isPwd ? 'text' : 'password';
            if (isPwd) {
                btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-4.39 0-8.27-3.31-9.76-8.53a1 1 0 0 1 0-.94c.57-1.42 1.36-2.64 2.31-3.64"/><path d="M1 1l22 22"/></svg>`;
            } else {
                btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M2.24 12.53C3.73 7.31 7.61 4 12 4s8.27 3.31 9.76 8.53a1 1 0 010 .94C20.27 19.69 16.39 23 12 23s-8.27-3.31-9.76-8.53a1 1 0 010-.94z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
            }
        };
    });

    // Setup input focus/blur styling
    document.querySelectorAll('.field input').forEach(inp => {
        inp.addEventListener('focus', () => inp.classList.add('has-focus'));
        inp.addEventListener('blur', () => inp.classList.remove('has-focus'));
    });

    // Setup login submit button
    const loginSubmitBtn = document.getElementById('login-submit');
    if (loginSubmitBtn) {
        loginSubmitBtn.addEventListener('click', handleLogin);
    }

    // Setup signup submit button
    const signupSubmitBtn = document.getElementById('signup-submit');
    if (signupSubmitBtn) {
        signupSubmitBtn.addEventListener('click', handleSignup);
    }

    // Setup Google login button
    const googleBtn = document.getElementById('google-login-btn');
    if (googleBtn) {
        googleBtn.addEventListener('click', handleGoogleLogin);
    }

    // Setup auth form links
    const signupLink = document.getElementById('signup-link');
    if (signupLink) {
        signupLink.addEventListener('click', (e) => {
            e.preventDefault();
            renderAuthForm('signup');
        });
    }

    const loginLink = document.getElementById('login-link');
    if (loginLink) {
        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            renderAuthForm('login');
        });
    }
}

let resolveModalPromise = null;

function createModal(title, message, isConfirm = false) {
    const existingModal = document.getElementById('custom-modal');
    if (existingModal) existingModal.remove();

    const modalHtml = `
        <div id="custom-modal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div class="bg-[var(--bg-sidebar)] p-6 rounded-xl shadow-2xl w-full max-w-sm border border-gray-700">
                <h3 class="text-xl font-bold mb-4 ${isConfirm ? 'text-red-400' : 'text-indigo-400'}">${title}</h3>
                <p class="text-gray-300 mb-6">${message}</p>
                <div class="flex ${isConfirm ? 'justify-between' : 'justify-center'} space-x-4">
                    ${isConfirm ? `
                        <button id="modal-cancel" class="px-4 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700 transition w-1/2">Cancel</button>
                        <button id="modal-ok" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition w-1/2">Yes, Delete</button>
                    ` : `
                        <button id="modal-ok" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition w-full">OK</button>
                    `}
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('custom-modal');
    const okButton = document.getElementById('modal-ok');
    const cancelButton = document.getElementById('modal-cancel');

    return new Promise(resolve => {
        resolveModalPromise = resolve;

        okButton.onclick = () => {
            modal.remove();
            resolve(true);
        };

        if (cancelButton) {
            cancelButton.onclick = () => {
                modal.remove();
                resolve(false);
            };
        }
    });
}

function customAlertModal(title, message) { return createModal(title, message, false); }
function customConfirmModal(title, message) { return createModal(title, message, true); }

// Expose all functions globally
window.deleteJournalEntry = deleteJournalEntry;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.handleGoogleLogin = handleGoogleLogin;
window.handleLogout = handleLogout;
window.renderAuthForm = renderAuthForm;
window.navigateTo = navigateTo;
window.uploadJournal = uploadJournal;
window.toggleSidebar = toggleSidebar;
window.customAlertModal = customAlertModal;
window.customConfirmModal = customConfirmModal;
window.fetchJournalEntries = fetchJournalEntries;
window.getLocalDateTimeLocal = getLocalDateTimeLocal;

// Signal that app.js has loaded
window.appJsLoaded = true;
console.log('app.js loaded successfully');

// Re-render auth form if we're on the login page
document.addEventListener('DOMContentLoaded', () => {
    const authContainer = document.getElementById('auth-container');
    if (authContainer) {
        renderAuthForm('login');
    }
});

window.addEventListener('hashchange', () => {
    const path = window.location.hash.slice(1);
    if (currentUserId) {
        currentView = path || 'timeline';
        renderAppView();
    }
});

// Initialize on page load
window.addEventListener('load', () => {
    initializeAuth();
});

// Register service worker
/*if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js');
}*/
