// ---------------- FIREBASE IMPORTS ----------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";

// AUTH IMPORTS
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

// FIRESTORE IMPORTS
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection,
  getDocs,
  arrayUnion,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// ---------------- CONFIG ----------------
const firebaseConfig = {
  apiKey: "AIzaSyCIZTSCVi-fgEZOzIJ0QihiwQjR9Qw3UBg",
  authDomain: "linkify-85e13.firebaseapp.com",
  projectId: "linkify-85e13",
  storageBucket: "linkify-85e13.appspot.com",
  messagingSenderId: "1097205354539",
  appId: "1:1097205354539:web",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ---------------- GLOBAL STATE ----------------
let currentRoomRef = null;
let currentUserId = null;
let currentUsername = null;
let roomBeingEdited = null;
let roomBeingDeleted = null;

// ---------------- CUSTOM ALERTS ----------------
function showAlert(message, type = "info", duration = 3000) {
  const container = document.getElementById("custom-alert-container");
  if (!container) return console.error("Missing #custom-alert-container in HTML");

  const alert = document.createElement("div");
  alert.className = `custom-alert ${type}`;
  alert.textContent = message;

  alert.addEventListener("click", () => {
    alert.style.animation = "fadeOut 0.3s forwards";
    setTimeout(() => alert.remove(), 300);
  });

  container.appendChild(alert);

  setTimeout(() => {
    alert.style.animation = "fadeOut 0.3s forwards";
    setTimeout(() => alert.remove(), 300);
  }, duration);
}

// ---------------- DOM ELEMENTS ----------------
const signupModal = document.getElementById("signup-modal");
const signinModal = document.getElementById("signin-modal");
const createRoomModal = document.getElementById("create-room-modal");
const joinRoomModal = document.getElementById("join-room-modal");
const roomLinksModal = document.getElementById("room-links-modal");
const editRoomModal = document.getElementById("edit-room-modal");
const deleteRoomModal = document.getElementById("delete-room-modal");

const editRoomInput = document.getElementById("edit-room-name-input");
const saveEditRoomBtn = document.getElementById("save-edit-room");
const closeEditRoomBtn = document.getElementById("close-edit-room");
const deleteRoomMsg = document.getElementById("delete-room-msg");
const confirmDeleteRoomBtn = document.getElementById("confirm-delete-room");
const closeDeleteRoomBtn = document.getElementById("close-delete-room");

// Auth
const openSignupBtn = document.getElementById("open-signup-modal");
const signupUsernameInput = document.getElementById("signup-username-input");
const signupEmailInput = document.getElementById("signup-email-input");
const signupPasswordInput = document.getElementById("signup-password-input");
const signupBtn = document.getElementById("signup-btn");
const closeSignupBtn = document.getElementById("close-signup");

const openSigninBtn = document.getElementById("open-signin-modal");
const signinEmailInput = document.getElementById("signin-email-input");
const signinPasswordInput = document.getElementById("signin-password-input");
const signinBtn = document.getElementById("signin-btn");
const closeSigninBtn = document.getElementById("close-signin");

const signOutBtn = document.getElementById("signout-btn");
const signedOutElements = document.querySelectorAll(".signed-out-only");
const signedInElements = document.querySelectorAll(".signed-in-only");

// Rooms
const openCreateRoomBtn = document.getElementById("open-create-room-modal");
const openJoinRoomBtn = document.getElementById("open-join-room-modal");

const createRoomInput = document.getElementById("create-room-name-input");
const createRoomActionBtn = document.getElementById("create-room-action-btn");
const closeCreateRoomBtn = document.getElementById("close-create-room");

const joinRoomInput = document.getElementById("join-room-code-input");
const joinRoomActionBtn = document.getElementById("join-room-action-btn");
const closeJoinRoomBtn = document.getElementById("close-join-room");

const linkListView = document.getElementById("link-list-view");
const modalLinksList = document.getElementById("modal-links-list");
const modalRoomTitle = document.getElementById("modal-room-title");
const linkTitleInput = document.getElementById("link-title");
const linkUrlInput = document.getElementById("link-url");
const addLinkBtn = document.getElementById("add-link");
const showAddLinkBtn = document.getElementById("show-add-link");
const addLinkForm = document.getElementById("add-link-form");
const cancelAddLinkBtn = document.getElementById("cancel-add-link");
const userRoomsList = document.getElementById("user-rooms");
const closeRoomLinksBtn = document.getElementById("close-room-links");

// ---------------- UTILITIES ----------------
function isValidRoomName(name) {
  return name && !name.includes("/");
}
function openModal(modal) {
  modal.classList.remove("hidden");
}
function closeModal(modal) {
  modal.classList.add("hidden");
  hideAddLinkForm();
  resetAddLink();
}
function resetAddLink() {
  linkTitleInput.value = "";
  linkUrlInput.value = "";
  addLinkBtn.dataset.index = "";
  addLinkBtn.textContent = "Save";
}

// ---------------- MODALS ----------------
openSignupBtn.onclick = () => openModal(signupModal);
closeSignupBtn.onclick = () => closeModal(signupModal);
openSigninBtn.onclick = () => openModal(signinModal);
closeSigninBtn.onclick = () => closeModal(signinModal);
openCreateRoomBtn.onclick = () => openModal(createRoomModal);
closeCreateRoomBtn.onclick = () => closeModal(createRoomModal);
openJoinRoomBtn.onclick = () => openModal(joinRoomModal);
closeJoinRoomBtn.onclick = () => closeModal(joinRoomModal);
closeRoomLinksBtn.onclick = () => closeModal(roomLinksModal);
closeEditRoomBtn.onclick = () => closeModal(editRoomModal);
closeDeleteRoomBtn.onclick = () => closeModal(deleteRoomModal);

[
  signupModal,
  signinModal,
  createRoomModal,
  joinRoomModal,
  roomLinksModal,
  editRoomModal,
  deleteRoomModal,
].forEach((modal) => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal(modal);
  });
});

// ---------------- VISIBILITY ----------------
function updateUIVisibility(isLoggedIn) {
  signedOutElements.forEach((el) => el.classList.toggle("hidden", isLoggedIn));
  signedInElements.forEach((el) => el.classList.toggle("hidden", !isLoggedIn));
}

// ---------------- ROOMS ----------------
async function loadUserRooms() {
  if (!currentUserId) {
    userRoomsList.innerHTML = `<div style="text-align:center;padding:2rem;opacity:0.7;">Please sign in to view your rooms.</div>`;
    return;
  }

  try {
    const roomsCol = collection(db, "rooms");
    const q = query(roomsCol, where("ownerId", "==", currentUserId));
    const snapshot = await getDocs(q);
    userRoomsList.innerHTML = "";

    if (snapshot.empty) {
      userRoomsList.innerHTML = `<div style="text-align:center;padding:2rem;opacity:0.7;">You have no rooms. Create one!</div>`;
      return;
    }

    snapshot.forEach((docSnap) => {
      const roomData = docSnap.data();
      const roomId = docSnap.id;
      const roomName = roomData.name || roomId;
      const links = roomData.links || [];

      const card = document.createElement("div");
      card.classList.add("room-card");
      card.innerHTML = `
        <div class="room-card-header">
          <h3>${roomName}</h3>
          <div class="room-options">⋮
            <div class="dropdown-menu">
              <button class="edit-room">Edit</button>
              <button class="delete-room">Delete</button>
            </div>
          </div>
        </div>
        <div class="links-list"></div>
      `;

      const linksListDiv = card.querySelector(".links-list");
      const linksToShow = 4;

      links.slice(0, linksToShow).forEach((link) => {
        const span = document.createElement("span");
        span.innerHTML = `<a href="${link.url}" target="_blank">${link.title}</a>`;
        span.querySelector("a").onclick = (e) => e.stopPropagation();
        linksListDiv.appendChild(span);
      });

      if (links.length > linksToShow) {
        const more = document.createElement("span");
        more.textContent = `... +${links.length - linksToShow} more`;
        more.style.opacity = 0.7;
        more.style.fontSize = "0.9rem";
        linksListDiv.appendChild(more);
      }

      const options = card.querySelector(".room-options");
      const dropdown = card.querySelector(".dropdown-menu");
      options.onclick = (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("show");
      };

      card.onclick = () => openRoomModal(roomName);

      card.querySelector(".edit-room").onclick = (e) => {
        e.stopPropagation();
        roomBeingEdited = roomName;
        editRoomInput.value = roomName;
        openModal(editRoomModal);
      };

      card.querySelector(".delete-room").onclick = (e) => {
        e.stopPropagation();
        roomBeingDeleted = roomName;
        deleteRoomMsg.textContent = `Are you sure you want to delete room "${roomName}"?`;
        openModal(deleteRoomModal);
      };

      userRoomsList.appendChild(card);
    });
  } catch (error) {
    console.error("Failed to load user rooms:", error);
    userRoomsList.innerHTML = `<div style="text-align:center;padding:2rem;color:red;">Error loading rooms.</div>`;
  }
}

// ---------------- EDIT ROOM ----------------
saveEditRoomBtn.onclick = async () => {
  const newName = editRoomInput.value.trim();
  if (!newName) return showAlert("Room name cannot be empty.", "warning");
  if (!isValidRoomName(newName))
    return showAlert("Room name cannot contain '/'", "warning");
  if (!roomBeingEdited) return;

  try {
    const oldRef = doc(db, "rooms", roomBeingEdited);
    const oldSnap = await getDoc(oldRef);
    if (!oldSnap.exists()) return showAlert("Room not found.", "error");
    if (oldSnap.data().ownerId !== currentUserId)
      return showAlert("You do not own this room.", "error");

    const oldData = oldSnap.data();
    oldData.name = newName;

    const newRef = doc(db, "rooms", newName);
    await setDoc(newRef, oldData);
    await deleteDoc(oldRef);

    if (currentRoomRef && roomBeingEdited === modalRoomTitle.textContent) {
      currentRoomRef = newRef;
      modalRoomTitle.textContent = newName;
    }

    closeModal(editRoomModal);
    roomBeingEdited = null;
    await loadUserRooms();
    showAlert("Room renamed successfully.", "success");
  } catch (error) {
    console.error("Error editing room:", error);
    showAlert("Error editing room: " + error.message, "error");
  }
};

// ---------------- DELETE ROOM ----------------
confirmDeleteRoomBtn.onclick = async () => {
  if (!roomBeingDeleted) return;
  const roomRef = doc(db, "rooms", roomBeingDeleted);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) return showAlert("Room not found.", "error");
  if (roomSnap.data().ownerId !== currentUserId)
    return showAlert("You do not own this room.", "error");

  await deleteDoc(roomRef);
  closeModal(deleteRoomModal);
  roomBeingDeleted = null;
  await loadUserRooms();
  showAlert("Room deleted successfully.", "success");
};

// ---------------- LINKS ----------------
function openRoomModal(roomName) {
  if (!currentUserId) return showAlert("Please sign in.", "warning");
  modalRoomTitle.textContent = roomName;
  currentRoomRef = doc(db, "rooms", roomName);
  openModal(roomLinksModal);
  hideAddLinkForm();
  loadLinks();
}

function showAddLinkForm() {
  linkListView.classList.add("hidden");
  addLinkForm.classList.remove("hidden");
}

function hideAddLinkForm() {
  addLinkForm.classList.add("hidden");
  linkListView.classList.remove("hidden");
  resetAddLink();
}

showAddLinkBtn.onclick = showAddLinkForm;
cancelAddLinkBtn.onclick = hideAddLinkForm;

function loadLinks() {
  if (!currentRoomRef) return;
  onSnapshot(currentRoomRef, (docSnap) => {
    if (!docSnap.exists()) return;
    const data = docSnap.data();
    modalLinksList.innerHTML = "";

    (data.links || []).forEach((link, index) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span><a href="${link.url}" target="_blank">${link.title}</a></span>
        <div class="link-options">
          <button class="edit-link">Edit</button>
          <button class="delete-link">Delete</button>
        </div>
      `;
      li.querySelector(".edit-link").onclick = (e) => {
        e.stopPropagation();
        linkTitleInput.value = link.title;
        linkUrlInput.value = link.url;
        addLinkBtn.dataset.index = index;
        addLinkBtn.textContent = "Update";
        showAddLinkForm();
      };
      li.querySelector(".delete-link").onclick = async (e) => {
        e.stopPropagation();
        const updatedLinks = data.links.filter((_, i) => i !== index);
        await updateDoc(currentRoomRef, { links: updatedLinks });
        showAlert("Link deleted.", "success");
      };
      li.querySelector("a").onclick = (e) => e.stopPropagation();
      modalLinksList.appendChild(li);
    });
  });
}

addLinkBtn.onclick = async () => {
  const title = linkTitleInput.value.trim();
  const url = linkUrlInput.value.trim();
  if (!title || !url) return showAlert("Please fill both fields.", "warning");
  if (!currentUserId) return showAlert("Please sign in first.", "warning");
  if (!currentRoomRef) return showAlert("No active room selected.", "warning");

  try {
    const roomSnap = await getDoc(currentRoomRef);
    if (!roomSnap.exists()) return showAlert("Room not found.", "error");
    const roomData = roomSnap.data();
    const oldLinks = Array.isArray(roomData.links) ? roomData.links : [];
    const editIndex = addLinkBtn.dataset.index;
    let updatedLinks;

    if (editIndex !== "") {
      updatedLinks = oldLinks.map((link, i) =>
        i == editIndex ? { title, url } : link
      );
      addLinkBtn.dataset.index = "";
      showAlert("Link updated.", "success");
    } else {
      updatedLinks = [...oldLinks, { title, url }];
      showAlert("Link added.", "success");
    }

    await updateDoc(currentRoomRef, { links: updatedLinks });
    hideAddLinkForm();
  } catch (error) {
    console.error("Error adding/updating link:", error);
    showAlert("Error: " + error.message, "error");
  }
};

// ---------------- AUTH ----------------
signupBtn.onclick = async () => {
  const username = signupUsernameInput.value.trim();
  const email = signupEmailInput.value.trim();
  const password = signupPasswordInput.value.trim();
  if (!username || !email || !password)
    return showAlert("Fill all fields.", "warning");
  if (password.length < 6)
    return showAlert("Password must be at least 6 characters.", "warning");

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const userId = userCredential.user.uid;
    await setDoc(doc(db, "users", userId), { username, email, rooms: [] });
    currentUserId = userId;
    currentUsername = username;
    updateUIVisibility(true);
    await loadUserRooms();
    closeModal(signupModal);
    signupUsernameInput.value = "";
    signupEmailInput.value = "";
    signupPasswordInput.value = "";
    showAlert("Account created successfully!", "success");
  } catch (error) {
    showAlert("Sign Up Error: " + error.message, "error");
  }
};

signinBtn.onclick = async () => {
  const email = signinEmailInput.value.trim();
  const password = signinPasswordInput.value.trim();
  if (!email || !password)
    return showAlert("Fill email & password.", "warning");
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const userId = userCredential.user.uid;
    const userDocSnap = await getDoc(doc(db, "users", userId));
    if (!userDocSnap.exists()) throw new Error("User profile not found.");
    currentUserId = userId;
    currentUsername = userDocSnap.data().username;
    updateUIVisibility(true);
    await loadUserRooms();
    closeModal(signinModal);
    signinEmailInput.value = "";
    signinPasswordInput.value = "";
    showAlert("Signed in successfully!", "success");
  } catch (error) {
    showAlert("Sign In Error: " + error.message, "error");
  }
};

signOutBtn.onclick = async () => {
  try {
    await signOut(auth);
    currentUserId = null;
    currentUsername = null;
    updateUIVisibility(false);
    userRoomsList.innerHTML = `<div style="text-align:center;padding:2rem;opacity:0.7;">Please sign in to view your rooms.</div>`;
    showAlert("Signed out successfully.", "info");
  } catch (error) {
    console.error("Sign-out failed:", error);
  }
};

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUserId = null;
    currentUsername = null;
    updateUIVisibility(false);
    return;
  }
  try {
    const userDocSnap = await getDoc(doc(db, "users", user.uid));
    if (!userDocSnap.exists()) throw new Error("User profile not found.");
    currentUserId = user.uid;
    currentUsername = userDocSnap.data().username;
    updateUIVisibility(true);
    await loadUserRooms();
  } catch (error) {
    console.error("Auth state fetch failed:", error);
  }
});

// ---------------- CREATE & JOIN ROOMS ----------------
createRoomActionBtn.onclick = async () => {
  const roomName = createRoomInput.value.trim();
  if (!roomName) return showAlert("Enter a room name.", "warning");
  if (!currentUserId || !currentUsername)
    return showAlert("Sign in first.", "warning");
  try {
    const newRoomRef = doc(db, "rooms", roomName);
    await setDoc(newRoomRef, {
      name: roomName,
      ownerId: currentUserId,
      ownerName: currentUsername,
      createdAt: new Date(),
      participants: { [currentUserId]: true },
    });
    createRoomInput.value = "";
    closeModal(createRoomModal);
    await loadUserRooms();
    showAlert("Room created successfully!", "success");
  } catch (error) {
    showAlert("Error creating room: " + error.message, "error");
  }
};

joinRoomActionBtn.onclick = async () => {
  if (!currentUserId) return showAlert("Sign in to join.", "warning");
  const roomName = joinRoomInput.value.trim();
  if (!roomName) return showAlert("Enter room code.", "warning");
  if (!isValidRoomName(roomName))
    return showAlert("Invalid room code.", "warning");
  const roomRef = doc(db, "rooms", roomName);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) return showAlert("Room not found.", "error");
  if (roomSnap.data().ownerId !== currentUserId)
    return showAlert("Only the creator can view this room.", "warning");
  joinRoomInput.value = "";
  closeModal(joinRoomModal);
  openRoomModal(roomName);
};
