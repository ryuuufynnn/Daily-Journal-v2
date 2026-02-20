// Profile helpers: preview, upload to Cloudinary, and save to Firestore
async function uploadProfileImageToCloudinary(file) {
    if (!file) return null;
    if (file.size > 5 * 1024 * 1024) throw new Error('File too large. Max 5MB allowed.');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', window.CLOUDINARY_UPLOAD_PRESET);
    formData.append('public_id', `profile-${crypto.randomUUID()}`);

    const resp = await fetch(window.CLOUDINARY_URL, { method: 'POST', body: formData });
    if (!resp.ok) {
        const err = await resp.json().catch(() => null);
        throw new Error(err?.error?.message || 'Cloudinary upload failed');
    }
    const data = await resp.json();
    return { url: data.secure_url, public_id: data.public_id };
}

function previewProfileImage(file) {
    const img = document.getElementById('profile-pic-img');
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => img.src = reader.result;
    reader.readAsDataURL(file);
}

async function loadProfileForUI() {
    const dateEl = document.getElementById('date-joined');
    const bioEl = document.getElementById('profile-bio');
    const imgEl = document.getElementById('profile-pic-img');

    if (dateEl) dateEl.textContent = 'Unknown';
    if (bioEl) bioEl.value = '';
    if (imgEl && !imgEl.src) imgEl.src = 'https://placehold.co/160x160/3c3c6f/a78bfa?text=Avatar';

    // Wait for auth to be available
    if (!window.auth || !window.auth.currentUser) {
        // Try local storage fallback
        const saved = localStorage.getItem('local_profile');
        if (saved) {
            try {
                const p = JSON.parse(saved);
                if (p.bio && bioEl) bioEl.value = p.bio;
                if (p.date_joined && dateEl) dateEl.textContent = new Date(p.date_joined).toLocaleString();
                if (p.profile_image_url && imgEl) imgEl.src = p.profile_image_url;
            } catch(e){}
        }
        return;
    }

    try {
        const userDocRef = window.db.collection('users').doc(window.currentUserId);
        const snap = await userDocRef.get();
        if (snap && snap.exists) {
            const data = snap.data();
            if (data.bio && bioEl) bioEl.value = data.bio;
            if (data.profile_image_url && imgEl) imgEl.src = data.profile_image_url;
            if (data.date_joined && dateEl) {
                try { dateEl.textContent = new Date(data.date_joined).toLocaleString(); } catch(e){}
            }
        }

        if ((!snap || !snap.exists || !snap.data()?.date_joined) && window.auth.currentUser.metadata?.creationTime) {
            const d = new Date(window.auth.currentUser.metadata.creationTime);
            if (dateEl) dateEl.textContent = d.toLocaleString();
        }
    } catch (e) {
        console.warn('Could not load profile from Firestore:', e);
    }

    try {
        if (imgEl && imgEl.src) updateSidebarAvatar(imgEl.src);
    } catch(e) {}

    try { setProfileEditing(false); } catch(e) {}
}

function initProfileUI() {
    const fileInput = document.getElementById('profile-pic-file');
    const saveBtn = document.getElementById('save-profile-btn');
    const messageEl = document.getElementById('profile-message');

    if (!saveBtn) return;
    if (saveBtn.dataset._inited === 'true') return;
    saveBtn.dataset._inited = 'true';

    if (fileInput) {
        fileInput.onchange = (ev) => {
            const f = ev.target.files && ev.target.files[0];
            if (f) previewProfileImage(f);
        };
    }

    saveBtn.onclick = async (e) => {
        const isEditing = saveBtn.dataset.editing === 'true';
        if (!isEditing) {
            setProfileEditing(true);
            try { e.stopPropagation(); } catch(e){}
            saveBtn.dataset._lastToggle = Date.now();
            return;
        }

        if (messageEl) {
            messageEl.textContent = 'Saving...';
            messageEl.className = 'text-indigo-400 mt-2';
        }
        const bio = document.getElementById('profile-bio') ? document.getElementById('profile-bio').value : '';
        const file = fileInput && fileInput.files ? fileInput.files[0] : null;

        try {
            let profileImageUrl = null;
            if (file) {
                const uploaded = await uploadProfileImageToCloudinary(file);
                profileImageUrl = uploaded.url;
            }

            if (window.auth && window.auth.currentUser && window.currentUserId) {
                const userDocRef = window.db.collection('users').doc(window.currentUserId);
                const existing = await userDocRef.get().catch(() => null);
                const payload = {
                    bio: bio || '',
                    updated_at: new Date().toISOString(),
                };
                if (profileImageUrl) payload.profile_image_url = profileImageUrl;

                if (existing && existing.exists && existing.data() && existing.data().date_joined) {
                    payload.date_joined = existing.data().date_joined;
                } else if (window.auth.currentUser.metadata?.creationTime) {
                    payload.date_joined = new Date(window.auth.currentUser.metadata.creationTime).toISOString();
                }

                await userDocRef.set(payload, { merge: true });
                if (messageEl) {
                    messageEl.textContent = 'Profile saved.';
                    messageEl.className = 'text-green-400 mt-2';
                }
                if (profileImageUrl) updateSidebarAvatar(profileImageUrl);
                await loadProfileForUI();
                setProfileEditing(false);
            } else {
                const dateJoined = localStorage.getItem('local_profile_date_joined') || new Date().toISOString();
                const local = { bio, date_joined: dateJoined };
                if (profileImageUrl) local.profile_image_url = profileImageUrl;
                localStorage.setItem('local_profile', JSON.stringify(local));
                if (messageEl) {
                    messageEl.textContent = 'Saved locally. Log in to sync to cloud.';
                    messageEl.className = 'text-green-400 mt-2';
                }
                setProfileEditing(false);
            }
        } catch (err) {
            console.error('Save profile error:', err);
            if (messageEl) {
                messageEl.textContent = `Error: ${err.message || err}`;
                messageEl.className = 'text-red-400 mt-2';
            }
        }
    };
}

function setProfileEditing(isEditing) {
    const bioEl = document.getElementById('profile-bio');
    const fileEl = document.getElementById('profile-pic-file');
    const saveBtn = document.getElementById('save-profile-btn');
    if (!saveBtn) return;

    saveBtn.dataset.editing = isEditing ? 'true' : 'false';
    if (isEditing) {
        saveBtn.textContent = 'Save Changes';
        saveBtn.classList.remove('bg-gray-600');
        saveBtn.classList.add('bg-indigo-600');
    } else {
        saveBtn.textContent = 'Edit Bio';
        saveBtn.classList.remove('bg-indigo-600');
        saveBtn.classList.add('bg-gray-700');
    }

    if (bioEl) bioEl.disabled = !isEditing;
    if (fileEl) {
        fileEl.disabled = !isEditing;
        fileEl.style.display = isEditing ? 'inline-block' : 'none';
    }
    if (isEditing && bioEl) bioEl.focus();
}

function updateSidebarAvatar(url) {
    if (!url) return;
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    const header = sidebar.querySelector('div.p-6') || sidebar.firstElementChild;
    if (!header) return;

    let img = document.getElementById('sidebar-avatar');
    if (!img) {
        img = document.createElement('img');
        img.id = 'sidebar-avatar';
        img.alt = 'avatar';
        img.style.width = '40px';
        img.style.height = '40px';
        img.style.borderRadius = '50%';
        img.style.objectFit = 'cover';
        img.style.marginRight = '10px';
        img.style.verticalAlign = 'middle';
        const heading = header.querySelector('h1');
        if (heading) header.insertBefore(img, heading);
    }
    img.src = url;
}

async function saveProfile() {
    const messageEl = document.getElementById('profile-message');
    if (!messageEl) return;
    messageEl.textContent = 'Saving...';
    messageEl.className = 'text-indigo-400 mt-2';

    const bio = document.getElementById('profile-bio') ? document.getElementById('profile-bio').value : '';
    const fileInput = document.getElementById('profile-pic-file');
    const file = fileInput && fileInput.files ? fileInput.files[0] : null;

    try {
        let profileImageUrl = null;
        if (file) {
            const uploaded = await uploadProfileImageToCloudinary(file);
            profileImageUrl = uploaded.url;
        }

        if (window.auth && window.auth.currentUser && window.currentUserId) {
            const userDocRef = window.db.collection('users').doc(window.currentUserId);
            const existing = await userDocRef.get().catch(() => null);
            const payload = {
                bio: bio || '',
                updated_at: new Date().toISOString(),
            };
            if (profileImageUrl) payload.profile_image_url = profileImageUrl;

            if (existing && existing.exists && existing.data() && existing.data().date_joined) {
                payload.date_joined = existing.data().date_joined;
            } else if (window.auth.currentUser.metadata?.creationTime) {
                payload.date_joined = new Date(window.auth.currentUser.metadata.creationTime).toISOString();
            }

            await userDocRef.set(payload, { merge: true });
            messageEl.textContent = 'Profile saved.';
            messageEl.className = 'text-green-400 mt-2';
            if (profileImageUrl) updateSidebarAvatar(profileImageUrl);
            await loadProfileForUI();
        } else {
            const dateJoined = localStorage.getItem('local_profile_date_joined') || new Date().toISOString();
            const local = { bio, date_joined: dateJoined };
            if (profileImageUrl) local.profile_image_url = profileImageUrl;
            localStorage.setItem('local_profile', JSON.stringify(local));
            messageEl.textContent = 'Saved locally. Log in to sync to cloud.';
            messageEl.className = 'text-green-400 mt-2';
        }
    } catch (err) {
        console.error('Save profile error:', err);
        messageEl.textContent = `Error: ${err.message || err}`;
        messageEl.className = 'text-red-400 mt-2';
    }
}

function hookProfileRefresh() {
    setTimeout(() => {
        initProfileUI();
        loadProfileForUI();
    }, 50);
}

// Delegate Save button
document.addEventListener('click', (e) => {
    const target = e.target || e.srcElement;
    if (!target) return;
    const saveBtn = document.getElementById('save-profile-btn');
    if (!saveBtn) return;
    const isEditing = saveBtn.dataset.editing === 'true';
    if (!isEditing) return;

    const lastToggle = Number(saveBtn.dataset._lastToggle || 0);
    if (Date.now() - lastToggle < 300) return;

    if (target.id === 'save-profile-btn') {
        e.preventDefault();
        saveProfile();
        return;
    }
    const btn = target.closest && target.closest ? target.closest('#save-profile-btn') : null;
    if (btn) {
        e.preventDefault();
        saveProfile();
    }
});

// When nav-profile is clicked or hash changes to profile, load profile UI
document.addEventListener('DOMContentLoaded', () => {
    const navProfile = document.getElementById('nav-profile');
    if (navProfile) {
        navProfile.addEventListener('click', () => hookProfileRefresh());
    }
});

window.addEventListener('hashchange', () => {
    if (window.location.hash.slice(1) === 'profile') hookProfileRefresh();
});

// Expose functions globally
window.uploadProfileImageToCloudinary = uploadProfileImageToCloudinary;
window.previewProfileImage = previewProfileImage;
window.loadProfileForUI = loadProfileForUI;
window.initProfileUI = initProfileUI;
window.setProfileEditing = setProfileEditing;
window.updateSidebarAvatar = updateSidebarAvatar;
window.saveProfile = saveProfile;
window.hookProfileRefresh = hookProfileRefresh;
