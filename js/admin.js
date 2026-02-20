    import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
    import { getFirestore, collection, getDocs, doc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

    const firebaseConfig = {
      apiKey: "AIzaSyAv4Dn0-HfdJGmEMguCYVXci2pupouBnPM",
      authDomain: "myjournal-9782a.firebaseapp.com",
      databaseURL: "https://myjournal-9782a-default-rtdb.firebaseio.com",
      projectId: "myjournal-9782a",
      storageBucket: "myjournal-9782a.appspot.com",
      messagingSenderId: "912645688403",
      appId: "1:912645688403:web:1fd5ef3332687353e6caa6",
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const ADMIN_USER = "admin";
    const ADMIN_PASS = "test123";
    const APP_ID = "1:912645688403:web:1fd5ef3332687353e6caa6";

 // This must match the appId in index.html
    const loginSection = document.getElementById("admin-login");
    const dashboardSection = document.getElementById("admin-dashboard");
    const entriesContainer = document.getElementById("admin-entries");
    const loadingSpinner = document.getElementById("loading-spinner");

    document.getElementById("admin-login-btn").addEventListener("click", () => {
      const user = document.getElementById("admin-username").value;
      const pass = document.getElementById("admin-password").value;
      const msg = document.getElementById("admin-login-msg");

      if (user === ADMIN_USER && pass === ADMIN_PASS) {
        msg.textContent = "Login successful!";
        msg.classList.add("text-green-400");
        setTimeout(() => {
          loginSection.classList.add("hidden");
          dashboardSection.classList.remove("hidden");
          loadAllEntries();
        }, 800);
      } else {
        msg.textContent = "Invalid admin credentials.";
        msg.classList.add("text-red-400");
      }
    });

    document.getElementById("logout-btn").addEventListener("click", () => {
      dashboardSection.classList.add("hidden");
      loginSection.classList.remove("hidden");
      document.getElementById("admin-login-msg").textContent = "";
      document.getElementById("admin-username").value = "";
      document.getElementById("admin-password").value = "";
    });

    async function loadAllEntries() {
  const container = document.getElementById("admin-entries");
  container.innerHTML = "";

  try {
    const snapshot = await getDocs(collection(db, "journals"));

    if (snapshot.empty) {
      container.innerHTML = "<p>No uploads found.</p>";
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log("📄 Firestore entry:", data);
  // Use the same field names as the main app when reading Firestore documents.
  const imgUrl = data.image_url || data.imageUrl || "https://res.cloudinary.com/dlevrwpn5/image/upload/v1760274294/journal-entry-bcf75e84-2908-4d91-846a-05e6dfc2af44.png";
  const caption = data.caption || data.note || "(no caption)";
  const date = data.entry_date || data.date || (data.created_at ? data.created_at.substring(0,10) : "Unknown date");
  const publisher = data.user_email || data.user_id || data.uid || "Unknown publisher";

      // create HTML card
      const card = document.createElement("div");
      card.classList.add("entry-card");
      card.innerHTML = `
        <div class="bg-[#161533] p-4 rounded-2xl shadow-md mb-4">
          <img src="${imgUrl}" alt="User Upload" class="rounded-xl w-full object-cover mb-2" style="max-height: 200px;">
          <p><strong>Publisher:</strong> ${publisher}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p>${caption}</p>
          <button class="delete-btn bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg mt-3 w-full"
            onclick="deleteEntry('${doc.id}')">
            Delete Entry
          </button>
        </div>
      `;
      container.appendChild(card);
    });

  } catch (error) {
    console.error("Error loading entries:", error);
    container.innerHTML = `<p style="color:red;">Error loading entries. Check console.</p>`;
  }
}
    // Format date for display (YYYY-MM-DD to DD/MM/YYYY)
    function formatDate(dateString) {
      if (!dateString) return 'N/A';
      const parts = dateString.split('-');
      if (parts.length !== 3) return dateString;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    // Format datetime for display
    function formatDateTime(isoString) {
      if (!isoString) return 'N/A';
      try {
        const date = new Date(isoString);
        return date.toLocaleString();
      } catch (e) {
        return isoString;
      }
    }

    function showLoading() {
      loadingSpinner.classList.remove('hidden');
    }

    function hideLoading() {
      loadingSpinner.classList.add('hidden');
    }

    // Make deleteEntry function available globally
// Make deleteEntry function available globally and use stable doc() arguments
window.deleteEntry = async function(entryId) {
  if (!confirm("Are you sure you want to delete this entry? This action cannot be undone.")) return;

  showLoading();
  try {
    const entryRef = doc(db, "journals", entryId);
    await deleteDoc(entryRef);
    loadAllEntries();
  } catch (error) {
    console.log("Loading entries...");
    const snapshot = await getDocs(collection(db, "journals"));
    console.log("Fetched:", snapshot.size, "documents");
    console.error("Error deleting entry:", error);
    alert(`Error deleting entry: ${error.message}`);
    hideLoading();
  }
};
