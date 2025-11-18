// ------------------------------------------------------
// IMPORTS
// ------------------------------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ------------------------------------------------------
// FIREBASE CONFIG
// ------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCKGeAifnGzUXUcYPyq66QZsFw0H2KzYCQ",
  authDomain: "student-management-183.firebaseapp.com",
  projectId: "student-management-183",
  storageBucket: "student-management-183.firebasestorage.app",
  messagingSenderId: "278398940942",
  appId: "1:278398940942:web:592dace5f70ac04112c95f",
  measurementId: "G-CDCQVZ4FFN"
};

// ------------------------------------------------------
// INITIALIZE FIREBASE
// ------------------------------------------------------
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ------------------------------------------------------
// GLOBALS
// ------------------------------------------------------
let session = { role: null, user: null };
const TEACHER_PASSWORD = "9676";
const ADMIN_PASSWORD = "3632";
const $ = id => document.getElementById(id);

// ------------------------------------------------------
// UTILITY FUNCTIONS
// ------------------------------------------------------
const uid = () => 'id' + Date.now() + Math.floor(Math.random() * 9999);
const mask = v => v ? 'xxxxx' : '-';
const fileToDataURL = file => new Promise((res, rej) => {
  const fr = new FileReader();
  fr.onload = e => res(e.target.result);
  fr.onerror = rej;
  fr.readAsDataURL(file);
});
async function uploadImage(file) {
  const filePath = "student_images/" + Date.now() + "_" + file.name;
  const storageRef = ref(storage, filePath);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

// ------------------------------------------------------
// STUDENT FUNCTIONS
// ------------------------------------------------------
async function addStudent(name, age, file, studentData) {
  let imageUrl = "";
  if (file) imageUrl = await uploadImage(file);

  await addDoc(collection(db, "students"), {
    ...studentData,
    photo: imageUrl || studentData.photo || "",
    createdAt: Date.now()
  });
}

async function getAllStudents() {
  const querySnapshot = await getDocs(collection(db, "students"));
  const students = [];
  querySnapshot.forEach(doc => students.push({ id: doc.id, ...doc.data() }));
  return students;
}

async function deleteStudent(id) {
  await deleteDoc(doc(db, "students", id));
}

async function updateStudent(id, newData, file) {
  let imageUrl = newData.photo || "";
  if (file) imageUrl = await uploadImage(file);
  await updateDoc(doc(db, "students", id), { ...newData, photo: imageUrl });
}

// ------------------------------------------------------
// TEACHER FUNCTIONS
// ------------------------------------------------------
async function addTeacher(teacherData, file) {
  let imageUrl = "";
  if (file) imageUrl = await uploadImage(file);
  await addDoc(collection(db, "teachers"), { ...teacherData, photo: imageUrl || "", createdAt: Date.now() });
}

async function getAllTeachers() {
  const querySnapshot = await getDocs(collection(db, "teachers"));
  const teachers = [];
  querySnapshot.forEach(doc => teachers.push({ id: doc.id, ...doc.data() }));
  return teachers;
}

async function updateTeacher(id, newData, file) {
  let imageUrl = newData.photo || "";
  if (file) imageUrl = await uploadImage(file);
  await updateDoc(doc(db, "teachers", id), { ...newData, photo: imageUrl });
}

async function deleteTeacher(id) {
  await deleteDoc(doc(db, "teachers", id));
}

// ------------------------------------------------------
// SESSION FUNCTIONS
// ------------------------------------------------------
function updateSessionUI() {
  $('sessionInfo').innerText = session.role ? `${session.role.toUpperCase()} logged: ${session.user.name}` : 'Not logged in';
}

function signOut() {
  session = { role: null, user: null };
  updateSessionUI();
  showSection('studentView');
  renderStudentsByYear(1);
}

// ------------------------------------------------------
// UI HELPERS
// ------------------------------------------------------
function showSection(id) {
  document.querySelectorAll('main > section').forEach(s => s.style.display = 'none');
  $(id).style.display = 'block';
  window.scrollTo(0, 0);
}

function show(el) { if (el) el.classList.add('show'); }
function hideAllModals() { document.querySelectorAll('.overlay').forEach(o => o.classList.remove('show')); $('dynamicContainer').innerHTML = ''; }

// ------------------------------------------------------
// RENDER FUNCTIONS
// ------------------------------------------------------
async function renderStudentsByYear(year) {
  const grid = $('studentsGrid');
  grid.innerHTML = '';
  let students = await getAllStudents();
  if (year !== 'all') students = students.filter(s => Number(s.year) === Number(year));
  if (students.length === 0) { grid.innerHTML = '<div style="padding:12px;background:#fff;border-radius:8px">No students</div>'; return; }
  students.forEach(s => {
    const div = document.createElement('div');
    div.className = 'student-card';
    const imgHtml = s.photo ? `<img src="${s.photo}" alt="">` : `<div style="height:220px;background:#f4f7fb;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#667">No Photo</div>`;
    div.innerHTML = `${imgHtml}<div style="padding:6px 0"><strong style="font-size:16px">${s.name}</strong><div class="meta">#${s.pin} • ${s.school||''}</div></div>
      <div style="display:flex;gap:8px;margin-top:auto"><button class="btn" style="flex:1" data-id="${s.id}">View</button></div>`;
    div.querySelector('button').addEventListener('click', () => openStudentProfile(s.id));
    grid.appendChild(div);
  });
  showSection('studentView');
}

async function renderTeachers() {
  const grid = $('teacherCards');
  grid.innerHTML = '';
  const teachers = await getAllTeachers();
  if (teachers.length === 0) { grid.innerHTML = '<div style="padding:12px;background:#fff;border-radius:8px">No teachers</div>'; return; }
  teachers.forEach(t => {
    const div = document.createElement('div');
    div.className = 'student-card';
    const image = t.photo ? `<img src="${t.photo}" style="height:180px;object-fit:cover;border-radius:8px">` : `<div style="height:180px;background:#f4f7fb;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#667">No Photo</div>`;
    div.innerHTML = `${image}<div style="padding:6px 0"><strong style="font-size:16px">${t.name}</strong><div class="meta">${t.designation} • ${t.subjects||''}</div></div>
      <div style="display:flex;gap:8px"><button class="btn" style="flex:1" data-id="${t.id}">View</button></div>`;
    div.querySelector('button').addEventListener('click', () => openTeacherProfile(t.id));
    grid.appendChild(div);
  });
  showSection('teacherView');
}

// ------------------------------------------------------
// STUDENT/TEACHER PROFILE MODALS
// ------------------------------------------------------
// Implement openStudentProfile and openTeacherProfile with Firebase fetch
// For brevity, these will load data from Firestore via getAllStudents/getAllTeachers

// ------------------------------------------------------
// MENU & MODAL BINDINGS
// ------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  $('menuStudent').addEventListener('click', async () => { await renderStudentsByYear(1); showSection('studentView'); });
  $('menuTeacher').addEventListener('click', async () => { await renderTeachers(); showSection('teacherView'); });
  $('menuRegister').addEventListener('click', prepareRegister);
  $('menuTeacherReg').addEventListener('click', openTeacherReg);
  $('menuTeacherLogin').addEventListener('click', () => show($('teacherLoginModal')));
  $('menuAdminLogin').addEventListener('click', () => show($('adminLoginModal')));
  $('signInBtn').addEventListener('click', () => show($('signinModal')));
  $('signOutBtn').addEventListener('click', signOut);

  $('y1').addEventListener('click', async () => await renderStudentsByYear(1));
  $('y2').addEventListener('click', async () => await renderStudentsByYear(2));
  $('y3').addEventListener('click', async () => await renderStudentsByYear(3));
  $('yAll').addEventListener('click', async () => await renderStudentsByYear('all'));

  $('studentSigninBtn').addEventListener('click', studentSignin);
  $('teacherLoginBtn').addEventListener('click', teacherSignin);
  $('adminLoginBtn').addEventListener('click', adminSignin);

  $('closeSignin').addEventListener('click', hideAllModals);
  $('closeTeacherLogin').addEventListener('click', hideAllModals);
  $('closeAdminLogin').addEventListener('click', hideAllModals);

  $('registerSaveBtn').addEventListener('click', saveStudentFromForm);
  $('teacherSaveBtn').addEventListener('click', saveTeacherFromForm);

  updateSessionUI();
  renderStudentsByYear(1);
});
