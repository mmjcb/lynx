import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = { /* your config */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const createModal = document.getElementById("create-modal");
const joinModal = document.getElementById("join-modal");
const roomLinksModal = document.getElementById("room-links-modal");
const modalLinksList = document.getElementById("modal-links-list");
const modalRoomTitle = document.getElementById("modal-room-title");
const linkTitleInput = document.getElementById("link-title");
const linkUrlInput = document.getElementById("link-url");
const addLinkBtn = document.getElementById("add-link");
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
function openModal(modal){ modal.classList.remove("hidden"); }
function closeModal(modal){ modal.classList.add("hidden"); }

openCreateBtn.onclick = () => openModal(createModal);
openJoinBtn.onclick = () => openModal(joinModal);
closeCreateBtn.onclick = () => closeModal(createModal);
closeJoinBtn.onclick = () => closeModal(joinModal);
closeRoomLinksBtn.onclick = () => closeModal(roomLinksModal);

[createModal, joinModal, roomLinksModal].forEach(modal => {
  modal.addEventListener("click", e => { if(e.target===modal) closeModal(modal); });
});

// ---------------- Load Rooms ----------------
async function loadUserRooms(){
  const roomsCol = collection(db, "rooms");
  const snapshot = await getDocs(roomsCol);
  userRoomsList.innerHTML = "";

  snapshot.forEach(docSnap => {
    const roomName = docSnap.id;
    const card = document.createElement("div");
    card.classList.add("room-card");
    card.innerHTML = `
      <h3>${roomName}</h3>
      <div class="room-actions">
        <button class="edit-room">Edit</button>
        <button class="delete-room">Delete</button>
      </div>
    `;

    // Open room modal
    card.querySelector("h3").onclick = () => openRoomModal(roomName);

    // Edit room
    card.querySelector(".edit-room").onclick = async e => {
      e.stopPropagation();
      const newName = prompt("New room name:", roomName);
      if(!newName || newName === roomName) return;
      const roomRef = doc(db,"rooms",roomName);
      const roomSnap = await getDoc(roomRef);
      await setDoc(doc(db,"rooms",newName), roomSnap.data());
      await deleteDoc(roomRef);
      loadUserRooms();
    };

    // Delete room
    card.querySelector(".delete-room").onclick = async e => {
      e.stopPropagation();
      if(confirm(`Delete room "${roomName}"?`)){
        await deleteDoc(doc(db,"rooms",roomName));
        loadUserRooms();
      }
    };

    userRoomsList.appendChild(card);
  });
}

// ---------------- Room Modal & Links ----------------
function openRoomModal(roomName){
  modalRoomTitle.textContent = roomName;
  currentRoomRef = doc(db,"rooms",roomName);
  openModal(roomLinksModal);
  loadLinks();
}

function loadLinks(){
  if(!currentRoomRef) return;

  onSnapshot(currentRoomRef, docSnap => {
    if(!docSnap.exists()) return;
    const data = docSnap.data();
    modalLinksList.innerHTML = "";
    linkTitleInput.value = "";
    linkUrlInput.value = "";
    addLinkBtn.textContent = "Add Link";
    delete addLinkBtn.dataset.index;

    (data.links || []).forEach((link, index) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${link.title} - <a href="${link.url}" target="_blank">${link.url}</a></span>
        <button class="edit-link">Edit</button>
        <button class="delete-link">Delete</button>
      `;

      // Edit link
      li.querySelector(".edit-link").onclick = () => {
        linkTitleInput.value = link.title;
        linkUrlInput.value = link.url;
        addLinkBtn.dataset.index = index;
        addLinkBtn.textContent = "Update Link";
      };

      // Delete link
      li.querySelector(".delete-link").onclick = async () => {
        const updatedLinks = data.links.filter((_,i) => i !== index);
        await updateDoc(currentRoomRef, { links: updatedLinks });
      };

      modalLinksList.appendChild(li);
    });
  });
}

// ---------------- Add/Update Link ----------------
addLinkBtn.onclick = async () => {
  const title = linkTitleInput.value.trim();
  const url = linkUrlInput.value.trim();
  if(!title || !url) return alert("Fill both fields");

  const roomSnap = await getDoc(currentRoomRef);
  const roomData = roomSnap.data() || { links: [] };

  if(addLinkBtn.dataset.index){
    roomData.links[parseInt(addLinkBtn.dataset.index)] = { title, url };
    delete addLinkBtn.dataset.index;
    addLinkBtn.textContent = "Add Link";
  } else {
    roomData.links.push({ title, url });
  }

  await updateDoc(currentRoomRef, { links: roomData.links });
  linkTitleInput.value = "";
  linkUrlInput.value = "";
};

// ---------------- Create Room ----------------
createRoomBtn.onclick = async () => {
  const roomName = createRoomInput.value.trim();
  if(!roomName) return alert("Enter room name");
  const roomRef = doc(db,"rooms",roomName);
  const roomSnap = await getDoc(roomRef);
  if(!roomSnap.exists()) await setDoc(roomRef, { links: [] });
  createRoomInput.value = "";
  closeModal(createModal);
  loadUserRooms();
};

// ---------------- Join Room ----------------
joinRoomBtn.onclick = async () => {
  const roomName = joinRoomInput.value.trim();
  if(!roomName) return alert("Enter room code");
  const roomRef = doc(db,"rooms",roomName);
  const roomSnap = await getDoc(roomRef);
  if(!roomSnap.exists()) return alert("Room not found");
  joinRoomInput.value = "";
  closeModal(joinModal);
  openRoomModal(roomName);
};

// ---------------- Initial Load ----------------
loadUserRooms();
