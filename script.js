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
    doc,
    updateDoc,
    deleteDoc
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
// HELPER FUNCTIONS
// ------------------------------------------------------
const $ = id => document.getElementById(id);
const uid = ()=> 'id' + Date.now() + Math.floor(Math.random()*9999);
const mask = (v)=> v ? 'xxxxx' : '-';

async function uploadImage(file) {
    const filePath = "student_images/" + Date.now() + "_" + file.name;
    const storageRef = ref(storage, filePath);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
}

// ------------------------------------------------------
// FIREBASE DATA FUNCTIONS
// ------------------------------------------------------
async function getStudents() {
    const snapshot = await getDocs(collection(db, "students"));
    const students = [];
    snapshot.forEach(doc => students.push({ id: doc.id, ...doc.data() }));
    return students;
}

async function saveStudent(student) {
    if(student.id) {
        const docRef = doc(db, "students", student.id);
        await updateDoc(docRef, student);
    } else {
        const docRef = await addDoc(collection(db, "students"), student);
        student.id = docRef.id;
    }
    return student;
}

async function deleteStudent(id) {
    await deleteDoc(doc(db, "students", id));
}

async function getTeachers() {
    const snapshot = await getDocs(collection(db, "teachers"));
    const teachers = [];
    snapshot.forEach(doc => teachers.push({ id: doc.id, ...doc.data() }));
    return teachers;
}

async function saveTeacher(teacher) {
    if(teacher.id) {
        const docRef = doc(db, "teachers", teacher.id);
        await updateDoc(docRef, teacher);
    } else {
        const docRef = await addDoc(collection(db, "teachers"), teacher);
        teacher.id = docRef.id;
    }
    return teacher;
}

async function deleteTeacher(id) {
    await deleteDoc(doc(db, "teachers", id));
}

// ------------------------------------------------------
// SESSION & CREDENTIALS
// ------------------------------------------------------
const TEACHER_PASSWORD = '9676';
const ADMIN_PASSWORD = '3632';
let session = JSON.parse(localStorage.getItem('lastUser') || 'null') || {role:null,user:null};

// ------------------------------------------------------
// UI FUNCTIONS
// ------------------------------------------------------
function showSection(id){
    document.querySelectorAll('main > section').forEach(s=>s.style.display='none');
    $(id).style.display='block';
    window.scrollTo(0,0);
}
function show(el){ if(el) el.classList.add('show'); }
function hideAllModals(){ document.querySelectorAll('.overlay').forEach(o=>o.classList.remove('show')); $('dynamicContainer').innerHTML=''; }
function updateSessionUI(){ $('sessionInfo').innerText = session.role ? `${session.role.toUpperCase()} logged: ${session.user.name}` : 'Not logged in'; }

// ------------------------------------------------------
// MENU & EVENT BINDINGS
// ------------------------------------------------------
document.addEventListener('DOMContentLoaded', ()=>{
    // menu bindings
    $('menuStudent').addEventListener('click', ()=>renderStudentsByYear(1));
    $('menuTeacher').addEventListener('click', ()=>renderTeachers());
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

    const hamb = $('hambBtn');
    hamb.addEventListener('click', ()=> {
        const sb = $('sidebar');
        sb.style.display = (sb.style.display === 'none' || getComputedStyle(sb).display === 'none') ? 'block' : 'none';
    });

    updateSessionUI();
    renderStudentsByYear(1);
    buildYearMarksArea();
});

// ------------------------------------------------------
// STUDENT LOGIN / SIGNOUT
// ------------------------------------------------------
async function studentSignin(){
    const pin = $('signinPin').value.trim(), pwd = $('signinPassword').value;
    const students = await getStudents();
    const stu = students.find(s => s.pin === pin && s.password === pwd);
    if(!stu){ alert('Student not found or wrong password'); return; }
    session = { role:'student', user:stu }; localStorage.setItem('lastUser', JSON.stringify(session));
    updateSessionUI(); hideAllModals(); renderStudentsByYear(Number(stu.year||1));
}

async function teacherSignin(){
    const email = $('teacherLoginEmail').value.trim(), pwd = $('teacherLoginPassword').value;
    if(pwd !== TEACHER_PASSWORD){ alert('Wrong teacher password (ask admin)'); return; }
    const teachers = await getTeachers();
    const t = teachers.find(x=>x.email === email);
    if(!t){ alert('Teacher not found'); return; }
    session = { role:'teacher', user:t }; localStorage.setItem('lastUser', JSON.stringify(session));
    updateSessionUI(); hideAllModals(); renderTeachers();
}

function adminSignin(){
    const pwd = $('adminPassword').value;
    if(pwd !== ADMIN_PASSWORD){ alert('Wrong admin password'); return; }
    session = { role:'admin', user:{name:'ADMIN'} }; localStorage.setItem('lastUser', JSON.stringify(session));
    updateSessionUI(); hideAllModals(); showSection('studentView'); renderStudentsByYear(1);
}

function signOut(){ session = {role:null,user:null}; localStorage.removeItem('lastUser'); updateSessionUI(); renderStudentsByYear(1); }

// ------------------------------------------------------
// STUDENT REGISTER
// ------------------------------------------------------
function prepareRegister(){
    $('regPin').value=''; $('regName').value=''; $('regEmail').value=''; $('regPhone').value=''; $('regGender').value='Male';
    $('regMother').value=''; $('regFather').value=''; $('regVillage').value=''; $('regYear').value='1';
    $('regCaste').value=''; $('regScholarship').value='Yes'; $('regAge').value=''; $('regJoinedYear').value=''; $('reg10th').value=''; $('regSchool').value=''; $('regTarget').value=''; $('regPassword').value='';
    $('regPhoto').value='';
    buildYearMarksArea();
    show($('registerModal'));
}

function buildYearMarksArea(){ 
    const y = Number($('regYear').value || 1);
    const area = $('yearMarksArea'); area.innerHTML = '';
    if(y===1){ area.innerHTML='<div class="muted">Year 1: No semester marks requested.</div>'; }
    else if(y===2){ area.innerHTML='<label class="small">1st year total (max 1000)</label><input id="m1_total" type="number" min="0" max="1000"/><div class="muted">Percentage: <span id="m1_pct">0%</span></div>'; 
        setTimeout(()=>{ $('m1_total').addEventListener('input', ()=>{ $('m1_pct').innerText = ((Number($('m1_total').value||0)/1000)*100).toFixed(2)+'%'; }); },10); }
    else if(y===3){ area.innerHTML='<label class="small">Enter marks — 1st year (max 1000), 3rd sem (max 900), 4th sem (max 900)</label><div class="row"><input id="m1" type="number" min="0" max="1000"/><input id="m3" type="number" min="0" max="900"/><input id="m4" type="number" min="0" max="900"/></div><div class="muted">Total: <span id="m_total">0</span> / 2800 — Percentage: <span id="m_pct">0%</span></div>'; 
        setTimeout(()=>{ ['m1','m3','m4'].forEach(id=>{$(id).addEventListener('input', update3Total);}); },10); }
}

function update3Total(){
    const a = Number($('m1').value||0), b = Number($('m3').value||0), c = Number($('m4').value||0);
    const total = Math.min(a,1000)+Math.min(b,900)+Math.min(c,900);
    if($('m_total')) $('m_total').innerText=total;
    if($('m_pct')) $('m_pct').innerText=((total/2800)*100).toFixed(2)+'%';
}

async function saveStudentFromForm(){
    const pin = $('regPin').value.trim(), name = $('regName').value.trim();
    if(!pin || !name){ alert('Pin and name required'); return; }
    const pf = $('regPhoto').files[0];
    let photoData = pf ? await uploadImage(pf) : '';
    const student = {
        id: uid(), photo: photoData, pin, name,
        email: $('regEmail').value.trim(), phone: $('regPhone').value.trim(), gender: $('regGender').value,
        mother: $('regMother').value.trim(), father: $('regFather').value.trim(), village: $('regVillage').value.trim(),
        year: $('regYear').value, caste: $('regCaste').value.trim(), scholarship: $('regScholarship').value,
        age: $('regAge').value, joinedYear: $('regJoinedYear').value, marks10: $('reg10th').value, school: $('regSchool').value, target: $('regTarget').value,
        password: $('regPassword').value || '', createdAt: Date.now()
    };
    // marks logic
    if(student.year==='1'){ student.semMarks=[]; student.percentage=0; }
    else if(student.year==='2'){ const m1 = Math.min(Number($('m1_total').value||0),1000); student.semMarks=[{sem:'1st_year_total',mark:m1}]; student.percentage=((m1/1000)*100).toFixed(2);}
    else if(student.year==='3'){ const a=Math.min(Number($('m1').value||0),1000), b=Math.min(Number($('m3').value||0),900), c=Math.min(Number($('m4').value||0),900); student.semMarks=[{sem:'1st_year',mark:a},{sem:'3rd_sem',mark:b},{sem:'4th_sem',mark:c}]; student.percentage=((a+b+c)/2800*100).toFixed(2); }
    await saveStudent(student);
    alert('Student saved to Firebase.');
    hideAllModals(); renderStudentsByYear(student.year||'all');
}

// ------------------------------------------------------
// TEACHER REGISTER
// ------------------------------------------------------
async function saveTeacherFromForm(){
    const name = $('tName').value.trim(), email = $('tEmail').value.trim();
    if(!name || !email){ alert('Name & Email required'); return; }
    const pf = $('tPhoto').files[0]; 
    let photoData = pf ? await uploadImage(pf) : '';
    const teacher = {
        id: uid(), name, email, designation:$('tDesignation').value.trim(),
        subjects:$('tSubjects').value.trim(), experience:$('tExperience').value, joinedYear:$('tJoinYear').value,
        photo: photoData, createdAt: Date.now()
    };
    await saveTeacher(teacher);
    alert('Teacher saved to Firebase. Teacher password must be given by admin to teacher.');
    hideAllModals(); renderTeachers();
}

// ------------------------------------------------------
// RENDER FUNCTIONS
// ------------------------------------------------------
async function renderStudentsByYear(y){
    const grid = $('studentsGrid'); grid.innerHTML=''; 
    let arr = await getStudents();
    if(y!=='all') arr = arr.filter(s=>Number(s.year)===Number(y));
    if(arr.length===0){ grid.innerHTML='<div style="padding:12px;background:#fff;border-radius:8px">No students</div>'; return; }
    arr.forEach(s=>{
        const div = document.createElement('div'); div.className='student-card';
        const imgHtml = s.photo ? `<img src="${s.photo}" alt="">` : `<div style="height:220px;background:#f4f7fb;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#667">No Photo</div>`;
        div.innerHTML = `${imgHtml}<div style="padding:6px 0"><strong style="font-size:16px">${s.name}</strong><div class="meta">#${s.pin} • ${s.school||''}</div></div><div style="display:flex;gap:8px;margin-top:auto"><button class="btn" style="flex:1" data-id="${s.id}">View</button></div>`;
        div.querySelector('button').addEventListener('click', ()=> openStudentProfile(s.id));
        grid.appendChild(div);
    });
    showSection('studentView');
}

async function renderTeachers(){
    const grid = $('teacherCards'); grid.innerHTML='';
    const arr = await getTeachers();
    if(arr.length===0){ grid.innerHTML='<div style="padding:12px;background:#fff;border-radius:8px">No teachers</div>'; return; }
    arr.forEach(t=>{
        const div = document.createElement('div'); div.className='student-card';
        const image = t.photo ? `<img src="${t.photo}" style="height:180px;object-fit:cover;border-radius:8px">` : `<div style="height:180px;background:#f4f7fb;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#667">No Photo</div>`;
        div.innerHTML = `${image}<div style="padding:6px 0"><strong style="font-size:16px">${t.name}</strong><div class="meta">${t.designation} • ${t.subjects||''}</div></div><div style="display:flex;gap:8px"><button class="btn" style="flex:1" data-id="${t.id}">View</button></div>`;
        div.querySelector('button').addEventListener('click', ()=>openTeacherProfile(t.id));
        grid.appendChild(div);
    });
    showSection('teacherView');
}

// ------------------------------------------------------
// EXPORT TO GLOBAL (if needed for old bindings)
// ------------------------------------------------------
window.renderStudentsByYear = renderStudentsByYear;
window.renderTeachers = renderTeachers;
window.saveStudentFromForm = saveStudentFromForm;
window.saveTeacherFromForm = saveTeacherFromForm;
window.deleteStudent = deleteStudent;
window.deleteTeacher = deleteTeacher;
