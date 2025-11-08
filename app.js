import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";

// AUTH IMPORTS
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged,
    signOut 
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

// FIRESTORE IMPORTS
import { 
    getFirestore, doc, setDoc, getDoc, updateDoc, 
    deleteDoc, onSnapshot, collection, getDocs, 
    arrayUnion, query, where 
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// Firebase config - REPLACE WITH YOUR ACTUAL CONFIG IF NECESSARY
const firebaseConfig = {
    apiKey: "AIzaSyCIZTSCVi-fgEZOzIJ0QihiwQjR9Qw3UBg",
    authDomain: "linkify-85e13.firebaseapp.com",
    projectId: "linkify-85e13",
    storageBucket: "linkify-85e13.appspot.com",
    messagingSenderId: "1097205354539",
    appId: "1:1097205354539:web"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); 

let currentRoomRef = null;
let currentUserId = null; 
let currentUsername = null; 


// 🚀 DOM Elements Mapping 🚀
const signupModal = document.getElementById("signup-modal");
const signinModal = document.getElementById("signin-modal");
const createRoomModal = document.getElementById("create-room-modal");
const joinRoomModal = document.getElementById("join-room-modal");
const roomLinksModal = document.getElementById("room-links-modal");

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


// --- Utility Functions ---

function isValidRoomName(name) {
    return name && !name.includes('/');
}

function openModal(modal){ modal.classList.remove("hidden"); }
function closeModal(modal){ modal.classList.add("hidden"); hideAddLinkForm(); resetAddLink(); }

// --- Modal Event Listeners ---
openSignupBtn.onclick = () => openModal(signupModal);
closeSignupBtn.onclick = () => closeModal(signupModal);

openSigninBtn.onclick = () => openModal(signinModal);
closeSigninBtn.onclick = () => closeModal(signinModal);

openCreateRoomBtn.onclick = () => openModal(createRoomModal);
closeCreateRoomBtn.onclick = () => closeModal(createRoomModal);

openJoinRoomBtn.onclick = () => openModal(joinRoomModal);
closeJoinRoomBtn.onclick = () => closeModal(joinRoomModal);

closeRoomLinksBtn.onclick = () => closeModal(roomLinksModal);

[signupModal, signinModal, createRoomModal, joinRoomModal, roomLinksModal].forEach(modal=>{
    modal.addEventListener("click", e=>{ if(e.target===modal) closeModal(modal); });
});

document.onclick=()=>{ document.querySelectorAll(".dropdown-menu.show").forEach(menu=>menu.classList.remove("show")); };


// --- Visibility Toggler ---
function updateUIVisibility(isLoggedIn) {
    signedOutElements.forEach(el => el.classList.toggle('hidden', isLoggedIn));
    signedInElements.forEach(el => el.classList.toggle('hidden', !isLoggedIn));
}

// --- Room Card Rendering (Cleaned up and secured) ---
async function loadUserRooms(){
    if (!currentUserId) {
        userRoomsList.innerHTML = `<div style="text-align: center; padding: 2rem; opacity: 0.7;">Please sign in to view your rooms.</div>`;
        return;
    }

    try {
        const roomsCol = collection(db,"rooms");
        const q = query(roomsCol, where("ownerId", "==", currentUserId));
        const snapshot = await getDocs(q); 
        
        userRoomsList.innerHTML="";
        if (snapshot.empty) {
            userRoomsList.innerHTML = `<div style="text-align: center; padding: 2rem; opacity: 0.7;">You have no rooms. Create one!</div>`;
            return;
        }

        snapshot.forEach(docSnap => {
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
            const linksToShow = 3; 

            links.slice(0, linksToShow).forEach(link=>{
                const span=document.createElement("span");
                span.innerHTML=`<a href="${link.url}" target="_blank">${link.title}</a>`;
                span.querySelector("a").onclick=e=>e.stopPropagation();
                linksListDiv.appendChild(span);
            });
            
            if (links.length > linksToShow) {
                const more = document.createElement("span");
                more.textContent = `... +${(links.length - linksToShow)} more`;
                more.style.opacity = 0.7;
                more.style.fontSize = '0.9rem';
                linksListDiv.appendChild(more);
            }

            const options=card.querySelector(".room-options");
            const dropdown=card.querySelector(".dropdown-menu");
            options.onclick=e=>{ e.stopPropagation(); dropdown.classList.toggle("show"); };
            card.onclick=()=>openRoomModal(roomName);

            // Edit room
            card.querySelector(".edit-room").onclick=async e=>{
                e.stopPropagation();
                const newName = prompt("New room name:",roomName);
                
                if(!newName || newName===roomName) return;
                if(!isValidRoomName(newName)) return alert("Room name cannot contain the '/' character.");

                const roomRef = doc(db,"rooms",roomName);
                const roomSnap = await getDoc(roomRef);
                
                if (roomSnap.data().ownerId !== currentUserId) return alert("You do not own this room.");

                await setDoc(doc(db,"rooms",newName), roomSnap.data());
                await deleteDoc(roomRef);
                loadUserRooms();
            };

            // Delete room
            card.querySelector(".delete-room").onclick=async e=>{
                e.stopPropagation();
                
                const roomSnap = await getDoc(doc(db,"rooms",roomName));
                if (roomSnap.data().ownerId !== currentUserId) return alert("You do not own this room.");

                if(confirm(`Delete room "${roomName}"?`)){
                    await deleteDoc(doc(db,"rooms",roomName));
                    loadUserRooms();
                }
            };

            userRoomsList.appendChild(card);
        });

    } catch (error) {
        console.error("Failed to load user rooms. Permission denied:", error);
        userRoomsList.innerHTML = `<div style="text-align: center; padding: 2rem; color: red;">Error loading rooms. Please check Firebase permissions.</div>`;
    }
}

// --- Link Management ---
function openRoomModal(roomName){
    if (!currentUserId) return alert("Please sign in."); 
    
    modalRoomTitle.textContent=roomName;
    currentRoomRef=doc(db,"rooms",roomName);
    openModal(roomLinksModal);
    hideAddLinkForm();
    loadLinks();
}

function resetAddLink(){ linkTitleInput.value=""; linkUrlInput.value=""; addLinkBtn.dataset.index=""; addLinkBtn.textContent="Save"; }
function showAddLinkForm(){ 
    linkListView.classList.add("hidden"); 
    addLinkForm.classList.remove("hidden"); 
}
function hideAddLinkForm(){ 
    addLinkForm.classList.add("hidden"); 
    linkListView.classList.remove("hidden");
    resetAddLink();
}

showAddLinkBtn.onclick=showAddLinkForm;
cancelAddLinkBtn.onclick=hideAddLinkForm;

function loadLinks(){
    if(!currentRoomRef) return;
    onSnapshot(currentRoomRef, docSnap=>{
        if(!docSnap.exists()) return;
        const data = docSnap.data();
        modalLinksList.innerHTML="";
        
        (data.links||[]).forEach((link,index)=>{
            const li=document.createElement("li");
            li.innerHTML=`
                <span><a href="${link.url}" target="_blank">${link.title}</a></span>
                <div class="link-options">
                    <button class="edit-link">Edit</button>
                    <button class="delete-link">Delete</button>
                </div>
            `;
            li.querySelector(".edit-link").onclick=e=>{
                e.stopPropagation();
                linkTitleInput.value=link.title;
                linkUrlInput.value=link.url;
                addLinkBtn.dataset.index=index; 
                addLinkBtn.textContent="Update";
                showAddLinkForm();
            };
            li.querySelector(".delete-link").onclick=async e=>{
                e.stopPropagation();
                const updatedLinks = data.links.filter((_,i)=>i!==index);
                await updateDoc(currentRoomRef,{links: updatedLinks});
            };
            li.querySelector("a").onclick=e=>e.stopPropagation();
            modalLinksList.appendChild(li);
        });
    });
}

addLinkBtn.onclick = async () => {
const title = linkTitleInput.value.trim();
const url = linkUrlInput.value.trim();

  if (!url || !title) return alert("Please fill both fields.");
  if (!currentUserId) return alert("Please sign in first.");

  try {
    const roomRef = doc(db, "rooms", currentRoomId); // or however you store the active room
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) return alert("Room not found.");

    const roomData = roomSnap.data();
    const oldLinks = Array.isArray(roomData.links) ? roomData.links : [];

    const newLinks = [...oldLinks, { title, url }];

    await updateDoc(roomRef, { links: newLinks });

    alert("Link added successfully!");
    await loadRoomLinks(currentRoomId);
    newLinkInput.value = "";
    newLabelInput.value = "";
    hideAddLinkForm();
  } catch (error) {
    console.error("Error adding link:", error);
    alert("Error adding link: " + error.message);
  }
}


// --- AUTHENTICATION LOGIC (Improved) ---

// 1. SIGN UP
signupBtn.onclick = async () => {
const username = signupUsernameInput.value.trim();
const email = signupEmailInput.value.trim();
const password = signupPasswordInput.value.trim();

if (!username || !email || !password) return alert("Please fill all sign-up fields.");
if (password.length < 6) return alert("Password must be at least 6 characters.");

try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;

    // Create Firestore user document
    await setDoc(doc(db, "users", userId), { 
        username: username, 
        email: email, 
        rooms: [] 
    });

    // Immediately set current user variables to avoid race condition
    currentUserId = userId;
    currentUsername = username;

    // Update UI and load rooms
    updateUIVisibility(true);
    await loadUserRooms();

    // Close modal and reset inputs
    closeModal(signupModal);
    signupUsernameInput.value = "";
    signupEmailInput.value = "";
    signupPasswordInput.value = "";

    console.log("Sign-up successful: user profile created and loaded.");
} catch (error) {
    alert("Sign Up Error: " + error.message);
    console.error("Sign-up failed:", error);
}

};

// 2. SIGN IN
signinBtn.onclick = async () => {
const email = signinEmailInput.value.trim();
const password = signinPasswordInput.value.trim();

if (!email || !password) return alert("Enter Login ID (Email) and password.");

try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;

    // Fetch user profile from Firestore
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) throw new Error("User profile not found.");

    currentUserId = userId;
    currentUsername = userDocSnap.data().username;

    // Update UI and load rooms
    updateUIVisibility(true);
    await loadUserRooms();

    // Close modal and reset inputs
    closeModal(signinModal);
    signinEmailInput.value = "";
    signinPasswordInput.value = "";

    console.log("Sign-in successful: user profile loaded.");
} catch (error) {
    alert("Sign In Error: " + error.message);
    console.error("Sign-in failed:", error);
}

};

// 3. SIGN OUT
signOutBtn.onclick = async () => {
try {
await signOut(auth);
currentUserId = null;
currentUsername = null;
updateUIVisibility(false);
userRoomsList.innerHTML = `<div style="text-align: center; padding: 2rem; opacity: 0.7;">Please sign in to view your rooms.</div>`;
console.log("User signed out successfully.");
} catch (error) {
console.error("Sign-out failed:", error);
}
};

// 4. HANDLE AUTH STATE CHANGES (Optional, for page reloads)
onAuthStateChanged(auth, async (user) => {
if (!user) {
currentUserId = null;
currentUsername = null;
updateUIVisibility(false);
userRoomsList.innerHTML = `<div style="text-align: center; padding: 2rem; opacity: 0.7;">Please sign in to view your rooms.</div>`;
return;
}

try {
    const userDocSnap = await getDoc(doc(db, "users", user.uid));
    if (!userDocSnap.exists()) throw new Error("User profile not found.");

    currentUserId = user.uid;
    currentUsername = userDocSnap.data().username;

    updateUIVisibility(true);
    await loadUserRooms();
    console.log("Auth state restored: user profile loaded.");
} catch (error) {
    console.error("Failed to fetch user profile on auth state change:", error);
    userRoomsList.innerHTML = `<div style="text-align: center; padding: 2rem; color: red;">Could not load user profile. Check permissions.</div>`;
}
});


// --- Room Creation/Joining Logic ---

// 1. Create Room (MODIFIED WITH WAIT LOGIC)
createRoomActionBtn.onclick = async () => {
  const roomName = createRoomInput.value.trim();
  if (!roomName) return alert("Please enter a room name.");
  if (!currentUserId || !currentUsername) return alert("Please sign in first.");

  try {
    // Create a new room doc with owner info
    const newRoomRef = doc(db, "rooms", roomName);
    await setDoc(newRoomRef, {
    name: roomName,
    ownerId: currentUserId,
    ownerName: currentUsername,
    createdAt: new Date(),
    participants: { [currentUserId]: true }
    });

    alert(`Room "${roomName}" created successfully!`);
    await loadUserRooms();
    createRoomInput.value = "";
    closeModal(createRoomModal);
  } catch (error) {
    console.error("Error creating room:", error);
    alert("Error creating room: " + error.message);
  }
};


// 2. Join Room
joinRoomActionBtn.onclick=async ()=>{
    if (!currentUserId) return alert("You must be logged in to join a room.");

    const roomName=joinRoomInput.value.trim();
    if(!roomName) return alert("Enter room code");
    if(!isValidRoomName(roomName)) return alert("Room code cannot contain the '/' character.");

    const roomRef=doc(db,"rooms",roomName);
    const roomSnap=await getDoc(roomRef);
    
    if(!roomSnap.exists()) return alert("Room not found");
    
    if (roomSnap.data().ownerId !== currentUserId) {
        return alert("You do not have access to this room. Only the creator can view it.");
    }
    
    joinRoomInput.value="";
    closeModal(joinRoomModal);
    openRoomModal(roomName);
};