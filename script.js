
// ---------------- Firebase imports ----------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  enableIndexedDbPersistence,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getStorage,
  ref as sref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ---------------- Firebase config (PUT YOUR CONFIG HERE) ----------------
const firebaseConfig = {
  apiKey: "AIzaSyCKGeAifnGzUXUcYPyq66QZsFw0H2KzYCQ",
  authDomain: "student-management-183.firebaseapp.com",
  projectId: "student-management-183",
  storageBucket: "student-management-183.firebasestorage.app",
  messagingSenderId: "278398940942",
  appId: "1:278398940942:web:592dace5f70ac04112c95f",
  measurementId: "G-CDCQVZ4FFN"
};
// -------------------------------------------------------------------------

// init firebase
const app = initializeApp(firebaseConfig);
try { getAnalytics(app); } catch(e){ /* analytics optional */ }
const db = getFirestore(app);
const storage = getStorage(app);

// enable indexedDB persistence for offline
enableIndexedDbPersistence(db).catch((err) => {
  console.log('Persistence not enabled:', err && err.code);
});

// ---------------- Helpers ----------------
const $ = id => document.getElementById(id);
const uid = ()=> 'id' + Date.now() + Math.floor(Math.random()*9999);

// UI elements used below (same ids as your HTML)
const TEACHER_PASSWORD = '9676';
const ADMIN_PASSWORD = '3632';

// ---------- Firestore helpers ----------
async function uploadImageToStorage(file){
  if(!file) return '';
  const path = student_images/${Date.now()}_${file.name};
  const storageRef = sref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return url;
}

async function saveStudentToFirestore(student){
  // doc id chosen as student.pin to keep same record across devices
  if(!student.pin) throw new Error('pin required');
  const docRef = doc(db, 'students', student.pin);
  // setDoc with entire object (overwrites unless merge option used)
  await setDoc(docRef, student, { merge: true });
}

async function deleteStudentFromFirestore(pin){
  await deleteDoc(doc(db, 'students', pin));
}

async function saveTeacherToFirestore(teacher){
  // create doc with generated id under teachers collection
  // use teacher.email as doc id if unique, else generate id
  const id = teacher.email ? teacher.email.replace(/\./g,'_') : uid();
  const docRef = doc(db, 'teachers', id);
  await setDoc(docRef, teacher, { merge: true });
}

async function deleteTeacherFromFirestore(id){
  await deleteDoc(doc(db, 'teachers', id));
}

// ---------- Real-time listeners ----------
let unsubscribeStudents = null;
let currentStudentsCache = []; // local mirror for rendering
function startStudentsListener(){
  if(unsubscribeStudents) return;
  const q = query(collection(db,'students'), orderBy('createdAt','desc'));
  unsubscribeStudents = onSnapshot(q, snap => {
    const arr = [];
    snap.forEach(d => arr.push(d.data()));
    currentStudentsCache = arr;
    renderStudentsByYear(currentFilterYear || 1); // re-render current view
  }, err => console.error('students snap err', err));
}

let unsubscribeTeachers = null;
function startTeachersListener(){
  if(unsubscribeTeachers) return;
  const q = query(collection(db,'teachers'));
  unsubscribeTeachers = onSnapshot(q, snap => {
    const arr = [];
    snap.forEach(d => arr.push(d.data()));
    currentTeachersCache = arr;
    renderTeachers();
  }, err => console.error('teachers snap err', err));
}

// ---------------- UI + App logic (similar to your old app) ----------------
let session = { role:null, user:null };
let currentFilterYear = 1;
let currentTeachersCache = [];

document.addEventListener('DOMContentLoaded', ()=>{
  // menu bindings (same ids)
  $('menuStudent').addEventListener('click', ()=>{ showSection('studentView'); renderStudentsByYear(1); });
  $('menuTeacher').addEventListener('click', ()=>{ showSection('teacherView'); renderTeachers(); });
  $('menuRegister').addEventListener('click', prepareRegister);
  $('menuTeacherReg').addEventListener('click', openTeacherReg);
  $('menuTeacherLogin').addEventListener('click', ()=>show($('teacherLoginModal')));
  $('menuAdminLogin').addEventListener('click', ()=>show($('adminLoginModal')));
  $('signInBtn').addEventListener('click', ()=>show($('signinModal')));
  $('signOutBtn').addEventListener('click', signOut);

  $('y1').addEventListener('click', ()=>renderStudentsByYear(1));
  $('y2').addEventListener('click', ()=>renderStudentsByYear(2));
  $('y3').addEventListener('click', ()=>renderStudentsByYear(3));
  $('yAll').addEventListener('click', ()=>renderStudentsByYear('all'));

  $('studentSigninBtn').addEventListener('click', studentSignin);
  $('closeSignin').addEventListener('click', ()=>hideAllModals());
  $('teacherLoginBtn').addEventListener('click', teacherSignin);
  $('closeTeacherLogin').addEventListener('click', ()=>hideAllModals());
  $('adminLoginBtn').addEventListener('click', adminSignin);
  $('closeAdminLogin').addEventListener('click', ()=>hideAllModals());

  $('registerCancelBtn').addEventListener('click', ()=>hideAllModals());
  $('regYear').addEventListener('change', buildYearMarksArea);
  $('registerSaveBtn').addEventListener('click', saveStudentFromForm);

  $('teacherCancelBtn').addEventListener('click', ()=>hideAllModals());
  $('teacherSaveBtn').addEventListener('click', saveTeacherFromForm);

  // sidebar toggle
  $('hambBtn').addEventListener('click', ()=> {
    const sb = $('sidebar');
    sb.style.display = (getComputedStyle(sb).display === 'none') ? 'block' : 'none';
  });

  // start realtime listeners
  startStudentsListener();
  startTeachersListener();

  // initial UI
  updateSessionUI();
  showSection('studentView');
  buildYearMarksArea();
});

// UI helpers
function showSection(id){
  document.querySelectorAll('main > section').forEach(s=>s.style.display='none');
  $(id).style.display='block';
  currentFilterYear = (id === 'studentView') ? 1 : currentFilterYear;
  window.scrollTo(0,0);
}
function show(el){ if(el) el.classList.add('show'); }
function hideAllModals(){ document.querySelectorAll('.overlay').forEach(o=>o.classList.remove('show')); document.getElementById('dynamicContainer').innerHTML=''; }

function updateSessionUI(){
  $('sessionInfo').innerText = session.role ? ${session.role.toUpperCase()} logged: ${session.user.name} : 'Not logged in';
}

// ---------------- Authentication-like local flow (keeps using PIN/password as before) ----------------
async function studentSignin(){
  const pin = $('signinPin').value.trim(), pwd = $('signinPassword').value;
  if(!pin || !pwd){ alert('Provide pin & password'); return; }
  // try read student doc from Firestore
  const sDoc = await getDoc(doc(db,'students',pin));
  if(!sDoc.exists()){ alert('Student not found'); return; }
  const s = sDoc.data();
  if((s.password || '') !== pwd){ alert('Wrong password'); return; }
  session = { role:'student', user: s };
  updateSessionUI(); hideAllModals(); renderStudentsByYear(Number(s.year||1));
}

async function teacherSignin(){
  const email = $('teacherLoginEmail').value.trim(), pwd = $('teacherLoginPassword').value;
  if(pwd !== TEACHER_PASSWORD){ alert('Wrong teacher password (ask admin)'); return; }
  // find teacher by email
  const tDoc = await getDoc(doc(db,'teachers', email.replace(/\./g,'_')));
  if(!tDoc.exists()){ alert('Teacher not found'); return; }
  session = { role:'teacher', user: tDoc.data() };
  updateSessionUI(); hideAllModals(); renderTeachers();
}

function adminSignin(){
  const pwd = $('adminPassword').value;
  if(pwd !== ADMIN_PASSWORD){ alert('Wrong admin password'); return; }
  session = { role:'admin', user:{name:'ADMIN'} };
  updateSessionUI(); hideAllModals(); showSection('studentView');
}

// ---------------- Student CRUD flow (uses Firestore) ----------------
function buildYearMarksArea(){
  const y = Number($('regYear').value || 1);
  const area = $('yearMarksArea'); area.innerHTML = '';
  if(y === 1){
    area.innerHTML = '<div class="muted">Year 1: No semester marks requested.</div>';
  } else if(y === 2){
    area.innerHTML = `<label class="small">1st year total (max 1000)</label>
      <input id="m1_total" type="number" min="0" max="1000" placeholder="Marks out of 1000"/>
      <div class="muted">Percentage: <span id="m1_pct">0%</span></div>`;
    setTimeout(()=>{ const m1 = $('m1_total'); if(m1) m1.addEventListener('input', ()=>{ const val = Number(m1.value||0); $('m1_pct').innerText = ((Math.min(1000,val)/1000)*100).toFixed(2) + '%'; }); },10);
  } else if(y === 3){
    area.innerHTML = `<label class="small">Enter marks — 1st year (max 1000), 3rd sem (max 900), 4th sem (max 900)</label>
      <div class="row" style="margin-bottom:8px">
        <input id="m1" type="number" min="0" max="1000" placeholder="1st year (out of 1000)"/>
        <input id="m3" type="number" min="0" max="900" placeholder="3rd sem (out of 900)"/>
        <input id="m4" type="number" min="0" max="900" placeholder="4th sem (out of 900)"/>
      </div>
      <div class="muted">Total: <span id="m_total">0</span> / 2800 — Percentage: <span id="m_pct">0%</span></div>`;
    setTimeout(()=>{ ['m1','m3','m4'].forEach(id=>{ const el = $(id); if(el) el.addEventListener('input', update3Total); }); },10);
  }
}

function update3Total(){
  const a = Number($('m1') ? $('m1').value : 0);
  const b = Number($('m3') ? $('m3').value : 0);
  const c = Number($('m4') ? $('m4').value : 0);
  const cappedA = Math.min(1000, a);
  const cappedB = Math.min(900, b);
  const cappedC = Math.min(900, c);
  const total = cappedA + cappedB + cappedC;
  const pct = ((total / 2800) * 100);
  if($('m_total')) $('m_total').innerText = total;
  if($('m_pct')) $('m_pct').innerText = pct.toFixed(2) + '%';
}

async function saveStudentFromForm(){
  const pin = $('regPin').value.trim(), name = $('regName').value.trim();
  if(!pin || !name){ alert('Pin and name required'); return; }

  // photo upload
  const pf = $('regPhoto').files[0];
  let photoUrl = '';
  if(pf) {
    $('registerSaveBtn').innerText = 'Uploading...';
    photoUrl = await uploadImageToStorage(pf);
    $('registerSaveBtn').innerText = 'Save Student';
  }

  const student = {
    pin,
    name,
    photo: photoUrl || '',
    email: $('regEmail').value.trim(),
    phone: $('regPhone').value.trim(),
    gender: $('regGender').value,
    mother: $('regMother').value.trim(),
    father: $('regFather').value.trim(),
    village: $('regVillage').value.trim(),
    year: $('regYear').value,
    caste: $('regCaste').value.trim(),
    scholarship: $('regScholarship').value,
    age: $('regAge').value,
    joinedYear: $('regJoinedYear').value,
    marks10: $('reg10th').value,
    school: $('regSchool').value,
    target: $('regTarget').value,
    password: $('regPassword').value || '',
    createdAt: Date.now()
  };

  // marks logic
  if(student.year === '1'){ student.semMarks = []; student.percentage = 0; }
  else if(student.year === '2'){ const m1 = Number($('m1_total') ? $('m1_total').value : 0); const capped = Math.min(1000, m1); student.semMarks = [{sem:'1st_year_total', mark: capped}]; student.percentage = ((capped/1000)*100).toFixed(2); }
  else if(student.year === '3'){ const a = Number($('m1') ? $('m1').value : 0), b = Number($('m3') ? $('m3').value : 0), c = Number($('m4') ? $('m4').value : 0); const cappedA = Math.min(1000,a), cappedB = Math.min(900,b), cappedC = Math.min(900,c); const total = cappedA + cappedB + cappedC; student.semMarks = [{sem:'1st_year',mark:cappedA},{sem:'3rd_sem',mark:cappedB},{sem:'4th_sem',mark:cappedC}]; student.percentage = ((total/2800)*100).toFixed(2); }

  // save to firestore (doc id = pin)
  try {
    await saveStudentToFirestore(student);
    alert('Student saved to cloud.');
    hideAllModals();
  } catch(err){
    console.error(err);
    alert('Save failed: ' + err.message);
  }
}

// delete student handler (used in UI when teacher/admin deletes)
async function deleteStudentHandler(pin){
  if(!confirm('Delete this student?')) return;
  try {
    await deleteStudentFromFirestore(pin);
    alert('Deleted from cloud');
  } catch(err){ console.error(err); alert('Delete failed'); }
}

// ---------- Render functions use currentStudentsCache (keeps in sync) ----------
function renderStudentsByYear(y){
  currentFilterYear = y;
  const grid = $('studentsGrid'); grid.innerHTML = '';
  let arr = currentStudentsCache || [];
  if(y !== 'all') arr = arr.filter(s => Number(s.year) === Number(y));
  if(arr.length === 0){ grid.innerHTML = '<div style="padding:12px;background:#fff;border-radius:8px">No students</div>'; showSection('studentView'); return; }
  arr.forEach(s=>{
    const div = document.createElement('div'); div.className = 'student-card';
    const imgHtml = s.photo ? <img src="${s.photo}" alt=""> : <div style="height:220px;background:#f4f7fb;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#667">No Photo</div>;
    div.innerHTML = `${imgHtml}<div style="padding:6px 0"><strong style="font-size:16px">${s.name}</strong><div class="meta">#${s.pin} • ${s.school||''}</div></div>
      <div style="display:flex;gap:8px;margin-top:auto"><button class="btn" style="flex:1" data-id="${s.pin}">View</button></div>`;
    div.querySelector('button').addEventListener('click', ()=> openStudentProfile(s.pin));
    grid.appendChild(div);
  });
  showSection('studentView');
}

async function openStudentProfile(pin){
  const sDoc = await getDoc(doc(db,'students',pin));
  if(!sDoc.exists()) return alert('Not found');
  const s = sDoc.data();
  const isOwner = (session.role === 'student' && session.user && session.user.pin === s.pin);
  const canEdit = (session.role === 'teacher' || session.role === 'admin');

  const phoneDisplay = (session.role === 'student' && !isOwner) ? mask(s.phone) : (s.phone || '-');
  const emailDisplay = (session.role === 'student' && !isOwner) ? mask(s.email) : (s.email || '-');

  const container = $('dynamicContainer'); container.innerHTML = '';
  const wrap = document.createElement('div'); wrap.className = 'overlay show';
  wrap.innerHTML = `<div class="modal">
    <div style="display:flex;gap:14px;align-items:flex-start">
      <div><img class="big-photo" src="${s.photo||''}" onerror="this.style.display='none'"></div>
      <div style="flex:1">
        <h2 style="margin:0">${s.name} <div style="font-size:13px;color:#667">#${s.pin}</div></h2>
        <div style="margin-top:12px">
          <div class="details-line"><strong>Phone</strong><div class="val" id="phoneVal">${phoneDisplay}</div></div>
          <div class="details-line"><strong>Email</strong><div class="val" id="emailVal">${emailDisplay}</div></div>
          <div class="details-line"><strong>Gender</strong><div class="val">${s.gender||'-'}</div></div>
          <div class="details-line"><strong>Mother</strong><div class="val">${s.mother||'-'}</div></div>
          <div class="details-line"><strong>Father</strong><div class="val">${s.father||'-'}</div></div>
          <div class="details-line"><strong>Native Village</strong><div class="val">${s.village||'-'}</div></div>
          <div class="details-line"><strong>Year</strong><div class="val">${s.year||'-'}</div></div>
          <div class="details-line"><strong>Percentage</strong><div class="val">${s.percentage||0}%</div></div>
          <div class="details-line"><strong>Caste</strong><div class="val">${s.caste||'-'}</div></div>
          <div class="details-line"><strong>Scholarship</strong><div class="val">${s.scholarship||'-'}</div></div>
          <div class="details-line"><strong>Age</strong><div class="val">${s.age||'-'}</div></div>
          <div class="details-line"><strong>Joined Year</strong><div class="val">${s.joinedYear||'-'}</div></div>
          <div class="details-line"><strong>10th Marks</strong><div class="val">${s.marks10||'-'}</div></div>
          <div class="details-line"><strong>School</strong><div class="val">${s.school||'-'}</div></div>
          <div class="details-line"><strong>Target Marks</strong><div class="val">${s.target||'-'}</div></div>
        </div>

        <div style="margin-top:12px;display:flex;gap:10px">
          ${ canEdit ? <button class="btn" id="editStudentBtn">Edit</button><button class="btn secondary" id="delStudentBtn">Delete</button> : '' }
          <button class="btn secondary" id="closeProfileBtn">Close</button>
        </div>
      </div>
    </div>
  </div>`;
  container.appendChild(wrap);

  wrap.querySelector('#closeProfileBtn').addEventListener('click', ()=> wrap.remove());
  if(canEdit){
    wrap.querySelector('#editStudentBtn').addEventListener('click', ()=> { wrap.remove(); openEditStudentForm(pin); });
    wrap.querySelector('#delStudentBtn').addEventListener('click', ()=> deleteStudentHandler(pin));
  }
}

async function openEditStudentForm(pin){
  const sDoc = await getDoc(doc(db,'students',pin));
  if(!sDoc.exists()) return alert('Not found');
  const s = sDoc.data();
  // fill form
  $('regPin').value = s.pin; $('regName').value = s.name; $('regEmail').value = s.email; $('regPhone').value = s.phone;
  $('regGender').value = s.gender || 'Male'; $('regMother').value = s.mother || ''; $('regFather').value = s.father || '';
  $('regVillage').value = s.village || ''; $('regYear').value = s.year || '1'; $('regCaste').value = s.caste || ''; $('regScholarship').value = s.scholarship || 'Yes';
  $('regAge').value = s.age || ''; $('regJoinedYear').value = s.joinedYear || ''; $('reg10th').value = s.marks10 || ''; $('regSchool').value = s.school || ''; $('regTarget').value = s.target || ''; $('regPassword').value = s.password || '';
  buildYearMarksArea();
  setTimeout(()=> {
    if(s.year === '2' && $('m1_total')) $('m1_total').value = s.semMarks && s.semMarks[0] ? s.semMarks[0].mark : '';
    if(s.year === '3'){
      if($('m1')) $('m1').value = s.semMarks && s.semMarks[0] ? s.semMarks[0].mark : '';
      if($('m3')) $('m3').value = s.semMarks && s.semMarks[1] ? s.semMarks[1].mark : '';
      if($('m4')) $('m4').value = s.semMarks && s.semMarks[2] ? s.semMarks[2].mark : '';
      update3Total();
    }
  },50);
  show($('registerModal'));

  // temporary override save to update existing record
  const saveBtn = $('registerSaveBtn');
  const old = saveBtn.onclick;
  saveBtn.onclick = async function(){
    const pf = $('regPhoto').files[0];
    let photoUrl = s.photo || '';
    if(pf){ $('registerSaveBtn').innerText='Uploading...'; photoUrl = await uploadImageToStorage(pf); $('registerSaveBtn').innerText='Save Student'; }

    const updated = {
      pin: $('regPin').value.trim(),
      name: $('regName').value.trim(),
      photo: photoUrl,
      email: $('regEmail').value.trim(),
      phone: $('regPhone').value.trim(),
      gender: $('regGender').value,
      mother: $('regMother').value.trim(),
      father: $('regFather').value.trim(),
      village: $('regVillage').value.trim(),
      year: $('regYear').value,
      caste: $('regCaste').value.trim(),
      scholarship: $('regScholarship').value,
      age: $('regAge').value,
      joinedYear: $('regJoinedYear').value,
      marks10: $('reg10th').value,
      school: $('regSchool').value,
      target: $('regTarget').value,
      password: $('regPassword').value || s.password,
      createdAt: s.createdAt || Date.now()
    };

    if(updated.year === '1'){ updated.semMarks = []; updated.percentage = 0; }
    else if(updated.year === '2'){ const m1 = Number($('m1_total')?$('m1_total').value:0); const capped = Math.min(1000,m1); updated.semMarks = [{sem:'1st_year_total', mark:capped}]; updated.percentage = ((capped/1000)*100).toFixed(2); }
    else if(updated.year === '3'){ const a = Number($('m1')?$('m1').value:0), b = Number($('m3')?$('m3').value:0), c = Number($('m4')?$('m4').value:0); const cappedA=Math.min(1000,a), cappedB=Math.min(900,b), cappedC=Math.min(900,c); const total = cappedA + cappedB + cappedC; updated.semMarks=[{sem:'1st_year',mark:cappedA},{sem:'3rd_sem',mark:cappedB},{sem:'4th_sem',mark:cappedC}]; updated.percentage = ((total/2800)*100).toFixed(2); }

    try {
      await saveStudentToFirestore(updated);
      alert('Student updated in cloud');
      hideAllModals();
    } catch(err){ console.error(err); alert('Update failed'); }
    saveBtn.onclick = old;
  };
}

// ---------------- Teachers render & CRUD ----------------
function renderTeachers(){
  const grid = $('teacherCards'); grid.innerHTML = '';
  const arr = currentTeachersCache || [];
  if(arr.length === 0){ grid.innerHTML = '<div style="padding:12px;background:#fff;border-radius:8px">No teachers</div>'; showSection('teacherView'); return; }
  arr.forEach(t=>{
    const div = document.createElement('div'); div.className = 'student-card';
    const image = t.photo ? <img src="${t.photo}" style="height:180px;object-fit:cover;border-radius:8px"> : <div style="height:180px;background:#f4f7fb;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#667">No Photo</div>;
    div.innerHTML = `${image}<div style="padding:6px 0"><strong style="font-size:16px">${t.name}</strong><div class="meta">${t.designation} • ${t.subjects||''}</div></div>
      <div style="display:flex;gap:8px"><button class="btn" style="flex:1" data-id="${t.email || t.id}">View</button></div>`;
    div.querySelector('button').addEventListener('click', ()=>openTeacherProfile(t.email ? t.email.replace(/\./g,'_') : t.id));
    grid.appendChild(div);
  });
  showSection('teacherView');
}

async function openTeacherProfile(id){
  const tDoc = await getDoc(doc(db,'teachers',id));
  if(!tDoc.exists()) return alert('Not found');
  const t = tDoc.data();
  const canEdit = (session.role === 'teacher' || session.role === 'admin');
  const container = $('dynamicContainer'); container.innerHTML = '';
  const wrap = document.createElement('div'); wrap.className = 'overlay show';
  wrap.innerHTML = `<div class="modal">
    <div style="display:flex;gap:14px;align-items:flex-start">
      <div><img class="big-photo" src="${t.photo||''}" onerror="this.style.display='none'"></div>
      <div style="flex:1">
        <h2 style="margin:0">${t.name}</h2>
        <div style="margin-top:10px">
          <div class="details-line"><strong>Email</strong><div class="val">${t.email}</div></div>
          <div class="details-line"><strong>Designation</strong><div class="val">${t.designation||'-'}</div></div>
          <div class="details-line"><strong>Subjects</strong><div class="val">${t.subjects||'-'}</div></div>
          <div class="details-line"><strong>Experience</strong><div class="val">${t.experience||'-'}</div></div>
          <div style="margin-top:12px">${ canEdit ? <button class="btn" id="editTeacherBtn">Edit</button> <button class="btn secondary" id="delTeacherBtn">Delete</button> : ''} <button class="btn secondary" id="closeTBtn">Close</button></div>
        </div>
      </div>
    </div>
  </div>`;
  container.appendChild(wrap);
  wrap.querySelector('#closeTBtn').addEventListener('click', ()=> wrap.remove());
  if(canEdit){
    wrap.querySelector('#editTeacherBtn').addEventListener('click', ()=> { wrap.remove(); openEditTeacherForm(id); });
    wrap.querySelector('#delTeacherBtn').addEventListener('click', async ()=> { if(confirm('Delete this teacher?')){ await deleteTeacherFromFirestore(id); alert('Deleted'); wrap.remove(); }});
  }
}

async function saveTeacherFromForm(){
  const name = $('tName').value.trim(), email = $('tEmail').value.trim();
  if(!name || !email){ alert('Name & Email required'); return; }
  const pf = $('tPhoto').files[0];
  let photo = '';
  if(pf) photo = await uploadImageToStorage(pf);
  const teacher = { id: email.replace(/\./g,'_'), photo, name, email, designation: $('tDesignation').value.trim(), subjects: $('tSubjects').value.trim(), experience: $('tExperience').value, joinedYear: $('tJoinYear').value, createdAt: Date.now() };
  try {
    await saveTeacherToFirestore(teacher);
    alert('Teacher saved to cloud');
    hideAllModals();
  } catch(err){ console.error(err); alert('Save failed'); }
}

async function openEditTeacherForm(id){
  const tDoc = await getDoc(doc(db,'teachers',id));
  if(!tDoc.exists()) return;
  const t = tDoc.data();
  openTeacherReg();
  $('tName').value = t.name; $('tEmail').value = t.email; $('tDesignation').value = t.designation; $('tSubjects').value = t.subjects; $('tExperience').value = t.experience; $('tJoinYear').value = t.joinedYear;
  const saveBtn = $('teacherSaveBtn'); const old = saveBtn.onclick;
  saveBtn.onclick = async function(){
    const arr = await getDocs(collection(db,'teachers')); // not used
    const f = $('tPhoto').files[0];
    let photo = t.photo || '';
    if(f) photo = await uploadImageToStorage(f);
    const updated = { id, photo, name: $('tName').value.trim(), email: $('tEmail').value.trim(), designation: $('tDesignation').value.trim(), subjects: $('tSubjects').value.trim(), experience: $('tExperience').value, joinedYear: $('tJoinYear').value, updatedAt: Date.now() };
    try { await saveTeacherToFirestore(updated); alert('Teacher updated'); hideAllModals(); } catch(e){ console.error(e); alert('Update failed'); }
    saveBtn.onclick = old;
  };
}

// mask helper
function mask(v){ return v ? 'xxxxx' : '-'; }

// expose debug
window._dump = async ()=>{ console.log('students cache', currentStudentsCache); const s = await getDocs(collection(db,'students')); s.forEach(d=>console.log(d.id,d.data())); console.log('teachers cache', currentTeachersCache); };

// end of file
