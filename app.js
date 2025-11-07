import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// ---------------- Firebase Config ----------------
const firebaseConfig = {
  apiKey: "AIzaSyCIZTSCVi-fgEZOzIJ0QihiwQjR9Qw3UBg",
  authDomain: "linkify-85e13.firebaseapp.com",
  projectId: "linkify-85e13",
  storageBucket: "linkify-85e13.appspot.com",
  messagingSenderId: "1097205354539",
  appId: "1:1097205354539:web:e4a9e62fe088cd33981a6e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------------- DOM Elements ----------------
const createModal = document.getElementById("create-modal");
const joinModal = document.getElementById("join-modal");
const roomLinksModal = document.getElementById("room-links-modal");

const modalLinksList = document.getElementById("modal-links-list");
const modalRoomTitle = document.getElementById("modal-room-title");

const linkTitleInput = document.getElementById("link-title");
const linkUrlInput = document.getElementById("link-url");
const addLinkBtn = document.getElementById("add-link");
const showAddLinkBtn = document.getElementById("show-add-link");
const addLinkForm = document.getElementById("add-link-form");
const cancelAddLinkBtn = document.getElementById("cancel-add-link");

const userRoomsList = document.getElementById("user-rooms");

const openCreateBtn = document.getElementById("open-create-modal");
const openJoinBtn = document.getElementById("open-join-modal");
const closeCreateBtn = document.getElementById("close-create");
const closeJoinBtn = document.getElementById("close-join");
const closeRoomLinksBtn = document.getElementById("close-room-links");

const createRoomInput = document.getElementById("create-room-name");
const createRoomBtn = document.getElementById("create-room-btn");
const joinRoomInput = document.getElementById("join-room-code");
const joinRoomBtn = document.getElementById("join-room-btn");

let currentRoomRef = null;

// ---------------- Modal Functions ----------------
function openModal(modal) { modal.classList.remove("hidden"); }
function closeModal(modal) { 
  modal.classList.add("hidden"); 
  hideAddLinkForm();
  resetAddLink();
}

// Open/Close modals
openCreateBtn.onclick = () => openModal(createModal);
openJoinBtn.onclick = () => openModal(joinModal);
closeCreateBtn.onclick = () => closeModal(createModal);
closeJoinBtn.onclick = () => closeModal(joinModal);
closeRoomLinksBtn.onclick = () => closeModal(roomLinksModal);

// Close modal when clicking outside
[createModal, joinModal, roomLinksModal].forEach(modal => {
  modal.addEventListener("click", e => {
    if (e.target === modal) closeModal(modal);
  });
});

// ---------------- Rooms ----------------
async function loadUserRooms() {
  const roomsCol = collection(db, "rooms");
  const snapshot = await getDocs(roomsCol);
  userRoomsList.innerHTML = "";

  snapshot.forEach(docSnap => {
    const roomName = docSnap.id;
    const roomData = docSnap.data();

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
    (roomData.links || []).forEach(link => {
      const span = document.createElement("span");
      span.innerHTML = `<a href="${link.url}" target="_blank">${link.title}</a>`;
      span.querySelector("a").onclick = e => e.stopPropagation();
      linksListDiv.appendChild(span);
    });

    const options = card.querySelector(".room-options");
    const dropdown = card.querySelector(".dropdown-menu");
    options.onclick = e => {
      e.stopPropagation();
      dropdown.classList.toggle("show");
    };

    card.onclick = () => openRoomModal(roomName);

    // Edit room
    card.querySelector(".edit-room").onclick = async e => {
      e.stopPropagation();
      const newName = prompt("New room name:", roomName);
      if (!newName || newName === roomName) return;
      const roomRef = doc(db, "rooms", roomName);
      const roomSnap = await getDoc(roomRef);
      await setDoc(doc(db, "rooms", newName), roomSnap.data());
      await deleteDoc(roomRef);
      loadUserRooms();
    };

    // Delete room
    card.querySelector(".delete-room").onclick = async e => {
      e.stopPropagation();
      if (confirm(`Delete room "${roomName}"?`)) {
        await deleteDoc(doc(db, "rooms", roomName));
        loadUserRooms();
      }
    };

    userRoomsList.appendChild(card);
  });
}

// Close dropdowns when clicking outside
document.onclick = () => {
  document.querySelectorAll(".dropdown-menu.show").forEach(menu => menu.classList.remove("show"));
};

// ---------------- Room Modal ----------------
function openRoomModal(roomName) {
  modalRoomTitle.textContent = roomName;
  currentRoomRef = doc(db, "rooms", roomName);
  openModal(roomLinksModal);
  hideAddLinkForm();
  loadLinks();
}

// ---------------- Links ----------------
function resetAddLink() {
  linkTitleInput.value = "";
  linkUrlInput.value = "";
  addLinkBtn.dataset.index = "";
  addLinkBtn.textContent = "Save";
}

function showAddLinkForm() {
  addLinkForm.classList.remove("hidden");
  showAddLinkBtn.classList.add("hidden");
  closeRoomLinksBtn.classList.add("hidden");
}

function hideAddLinkForm() {
  addLinkForm.classList.add("hidden");
  showAddLinkBtn.classList.remove("hidden");
  closeRoomLinksBtn.classList.remove("hidden");
  resetAddLink();
}

showAddLinkBtn.onclick = showAddLinkForm;
cancelAddLinkBtn.onclick = hideAddLinkForm;

function loadLinks() {
  if (!currentRoomRef) return;
  onSnapshot(currentRoomRef, docSnap => {
    if (!docSnap.exists()) return;
    const data = docSnap.data();
    modalLinksList.innerHTML = "";
    hideAddLinkForm();
    resetAddLink();

    (data.links || []).forEach((link, index) => {
      const li = document.createElement("li");
      li.innerHTML = `<span><a href="${link.url}" target="_blank">${link.title}</a></span>
                      <div class="link-options">
                        <button class="edit-link">Edit</button>
                        <button class="delete-link">Delete</button>
                      </div>`;

      li.querySelector(".edit-link").onclick = e => {
        e.stopPropagation();
        linkTitleInput.value = link.title;
        linkUrlInput.value = link.url;
        addLinkBtn.dataset.index = index;
        addLinkBtn.textContent = "Update";
        showAddLinkForm();
      };

      li.querySelector(".delete-link").onclick = async e => {
        e.stopPropagation();
        const updatedLinks = data.links.filter((_, i) => i !== index);
        await updateDoc(currentRoomRef, { links: updatedLinks });
      };

      li.querySelector("a").onclick = e => e.stopPropagation();
      modalLinksList.appendChild(li);
    });
  });
}

// ---------------- Add / Update Link ----------------
addLinkBtn.onclick = async () => {
  const title = linkTitleInput.value.trim();
  const url = linkUrlInput.value.trim();
  if (!title || !url) return alert("Fill both fields");

  const roomSnap = await getDoc(currentRoomRef);
  const roomData = roomSnap.data() || { links: [] };

  const index = Number(addLinkBtn.dataset.index);
  if (!isNaN(index)) {
    roomData.links[index] = { title, url };
  } else {
    roomData.links.push({ title, url });
  }

  await updateDoc(currentRoomRef, { links: roomData.links });
  hideAddLinkForm();
};

// ---------------- Create / Join Room ----------------
createRoomBtn.onclick = async () => {
  const roomName = createRoomInput.value.trim();
  if (!roomName) return alert("Enter room name");
  const roomRef = doc(db, "rooms", roomName);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) await setDoc(roomRef, { links: [] });
  createRoomInput.value = "";
  closeModal(createModal);
  loadUserRooms();
};

joinRoomBtn.onclick = async () => {
  const roomName = joinRoomInput.value.trim();
  if (!roomName) return alert("Enter room code");
  const roomRef = doc(db, "rooms", roomName);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) return alert("Room not found");
  joinRoomInput.value = "";
  closeModal(joinModal);
  openRoomModal(roomName);
};

// ---------------- Initial Load ----------------
loadUserRooms();
