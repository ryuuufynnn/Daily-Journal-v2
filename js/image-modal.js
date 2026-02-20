// Delegated click handler for 'View' buttons
document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('.overlay-view');
    if (btn) {
        const src = btn.dataset.viewSrc;
        const caption = btn.dataset.viewCaption;
        openImageModal(src, caption);
        return;
    }
    if (e.target.closest('.modal-close') || e.target.id === 'image-modal') {
        closeImageModal();
    }
});

function openImageModal(src, caption) {
    const modal = document.getElementById('image-modal');
    const img = document.getElementById('image-modal-img');
    const cap = document.getElementById('image-modal-caption');
    img.src = src || 'https://placehold.co/1200x800/3c3c6f/a78bfa?text=No+Image';
    cap.textContent = caption || '';
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeImageModal() {
    const modal = document.getElementById('image-modal');
    const img = document.getElementById('image-modal-img');
    img.src = '';
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

// close modal on Escape
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeImageModal(); });

// Expose functions globally
window.openImageModal = openImageModal;
window.closeImageModal = closeImageModal;
