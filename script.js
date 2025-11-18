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
    updateDoc
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
// IMAGE UPLOAD FUNCTION
// ------------------------------------------------------
async function uploadImage(file) {
    const filePath = "student_images/" + Date.now() + "_" + file.name;
    const storageRef = ref(storage, filePath);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
}

// ------------------------------------------------------
// UTILITY FUNCTIONS
// ------------------------------------------------------
const uid = () => 'id' + Date.now() + Math.floor(Math.random()*9999);
const mask = v => v ? 'xxxxx' : '-';

// ------------------------------------------------------
// FIREBASE HELPERS
// ------------------------------------------------------
async function getAllStudents() {
    const snapshot = await getDocs(collection(db, "students"));
    const students = [];
    snapshot.forEach(doc => { students.push({id: doc.id, ...doc.data()}); });
    return students;
}

async function getAllTeachers() {
    const snapshot = await getDocs(collection(db, "teachers"));
    const teachers = [];
    snapshot.forEach(doc => { teachers.push({id: doc.id, ...doc.data()}); });
    return teachers;
}

async function saveStudentToFirebase(student) {
    if(student.id){
        await updateDoc(doc(db, "students", student.id), student);
    } else {
        const docRef = await addDoc(collection(db, "students"), student);
        student.id = docRef.id;
    }
    await renderStudentsByYear(student.year || 'all');
}

async function saveTeacherToFirebase(teacher) {
    if(teacher.id){
        await updateDoc(doc(db, "teachers", teacher.id), teacher);
    } else {
        const docRef = await addDoc(collection(db, "teachers"), teacher);
        teacher.id = docRef.id;
    }
    await renderTeachers();
}

// ------------------------------------------------------
// DOM & UI CODE
// ------------------------------------------------------
(function(){
  const $ = id => document.getElementById(id);
  const TEACHER_PASSWORD = '9676';
  const ADMIN_PASSWORD = '3632';
  let session = {role:null,user:null};

  document.addEventListener('DOMContentLoaded', async ()=>{
    // menu bindings
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

    const hamb = $('hambBtn');
    hamb.addEventListener('click', ()=> {
      const sb = $('sidebar');
      sb.style.display = (sb.style.display==='none'||getComputedStyle(sb).display==='none') ? 'block':'none';
    });

    updateSessionUI();
    showSection('studentView');
    await renderStudentsByYear(1);
    buildYearMarksArea();
  });

  // UI helpers
  function showSection(id){ document.querySelectorAll('main > section').forEach(s=>s.style.display='none'); $(id).style.display='block'; window.scrollTo(0,0); }
  function show(el){ if(el) el.classList.add('show'); }
  function hideAllModals(){ document.querySelectorAll('.overlay').forEach(o=>o.classList.remove('show')); document.getElementById('dynamicContainer').innerHTML=''; }
  function updateSessionUI(){ $('sessionInfo').innerText = session.role ? `${session.role.toUpperCase()} logged: ${session.user.name}` : 'Not logged in'; }

  // LOGIN functions (student, teacher, admin)
  async function studentSignin(){
    const pin = $('signinPin').value.trim(), pwd = $('signinPassword').value;
    const students = await getAllStudents();
    const stu = students.find(s => s.pin === pin && s.password === pwd);
    if(!stu){ alert('Student not found or wrong password'); return; }
    session = { role:'student', user:stu }; updateSessionUI(); hideAllModals(); renderStudentsByYear(Number(stu.year||1));
  }

  async function teacherSignin(){
    const email = $('teacherLoginEmail').value.trim(), pwd = $('teacherLoginPassword').value;
    if(pwd !== TEACHER_PASSWORD){ alert('Wrong teacher password (ask admin)'); return; }
    const teachers = await getAllTeachers();
    const t = teachers.find(x=>x.email === email);
    if(!t){ alert('Teacher not found'); return; }
    session = { role:'teacher', user:t }; updateSessionUI(); hideAllModals(); renderTeachers();
  }

  function adminSignin(){
    const pwd = $('adminPassword').value;
    if(pwd !== ADMIN_PASSWORD){ alert('Wrong admin password'); return; }
    session = { role:'admin', user:{name:'ADMIN'} }; updateSessionUI(); hideAllModals(); showSection('studentView'); renderStudentsByYear(1);
  }

  function signOut(){ session = {role:null,user:null}; updateSessionUI(); showSection('studentView'); renderStudentsByYear(1); }

  // REGISTER & SAVE STUDENT
  async function prepareRegister(){
    $('regPin').value=''; $('regName').value=''; $('regEmail').value=''; $('regPhone').value=''; $('regGender').value='Male';
    $('regMother').value=''; $('regFather').value=''; $('regVillage').value=''; $('regYear').value='1';
    $('regCaste').value=''; $('regScholarship').value='Yes'; $('regAge').value=''; $('regJoinedYear').value='';
    $('reg10th').value=''; $('regSchool').value=''; $('regTarget').value=''; $('regPassword').value=''; $('regPhoto').value='';
    buildYearMarksArea();
    show($('registerModal'));
  }

  async function saveStudentFromForm(){
    const pin = $('regPin').value.trim(), name = $('regName').value.trim();
    if(!pin || !name){ alert('Pin & name required'); return; }
    const pf = $('regPhoto').files[0];
    let photoData = pf ? await uploadImage(pf) : '';
    const student = {
      id: uid(), photo: photoData, pin, name, email:$('regEmail').value.trim(), phone:$('regPhone').value.trim(), gender:$('regGender').value,
      mother:$('regMother').value.trim(), father:$('regFather').value.trim(), village:$('regVillage').value.trim(),
      year:$('regYear').value, caste:$('regCaste').value.trim(), scholarship:$('regScholarship').value,
      age:$('regAge').value, joinedYear:$('regJoinedYear').value, marks10:$('reg10th').value, school:$('regSchool').value,
      target:$('regTarget').value, password:$('regPassword').value || '', createdAt: Date.now()
    };
    await saveStudentToFirebase(student);
    alert('Student registered successfully!'); hideAllModals();
  }

  // REGISTER & SAVE TEACHER
  async function saveTeacherFromForm(){
    const name = $('tName').value.trim(), email = $('tEmail').value.trim();
    if(!name || !email){ alert('Name & Email required'); return; }
    const pf = $('tPhoto').files[0];
    let photoData = pf ? await uploadImage(pf) : '';
    const teacher = { id: uid(), photo: photoData, name, email, designation:$('tDesignation').value.trim(), subjects:$('tSubjects').value.trim(), experience:$('tExperience').value, joinedYear:$('tJoinYear').value, createdAt: Date.now() };
    await saveTeacherToFirebase(teacher);
    alert('Teacher registered successfully!'); hideAllModals();
  }

  // RENDER STUDENTS
  async function renderStudentsByYear(y){
    const grid = $('studentsGrid'); grid.innerHTML='';
    let arr = await getAllStudents();
    if(y!=='all') arr = arr.filter(s=>Number(s.year)===Number(y));
    if(arr.length===0){ grid.innerHTML='<div style="padding:12px;background:#fff;border-radius:8px">No students</div>'; showSection('studentView'); return; }
    arr.forEach(s=>{
      const div=document.createElement('div'); div.className='student-card';
      const imgHtml = s.photo ? `<img src="${s.photo}" alt="">` : `<div style="height:220px;background:#f4f7fb;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#667">No Photo</div>`;
      div.innerHTML = `${imgHtml}<div style="padding:6px 0"><strong style="font-size:16px">${s.name}</strong><div class="meta">#${s.pin} • ${s.school||''}</div></div><div style="display:flex;gap:8px;margin-top:auto"><button class="btn" style="flex:1" data-id="${s.id}">View</button></div>`;
      div.querySelector('button').addEventListener('click', ()=>openStudentProfile(s.id));
      grid.appendChild(div);
    });
    showSection('studentView');
  }

  // RENDER TEACHERS
  async function renderTeachers(){
    const grid=$('teacherCards'); grid.innerHTML='';
    const arr = await getAllTeachers();
    if(arr.length===0){ grid.innerHTML='<div style="padding:12px;background:#fff;border-radius:8px">No teachers</div>'; showSection('teacherView'); return; }
    arr.forEach(t=>{
      const div=document.createElement('div'); div.className='student-card';
      const image = t.photo ? `<img src="${t.photo}" style="height:180px;object-fit:cover;border-radius:8px">` : `<div style="height:180px;background:#f4f7fb;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#667">No Photo</div>`;
      div.innerHTML = `${image}<div style="padding:6px 0"><strong style="font-size:16px">${t.name}</strong><div class="meta">${t.designation} • ${t.subjects||''}</div></div><div style="display:flex;gap:8px"><button class="btn" style="flex:1" data-id="${t.id}">View</button></div>`;
      div.querySelector('button').addEventListener('click', ()=>openTeacherProfile(t.id));
      grid.appendChild(div);
    });
    showSection('teacherView');
  }

  // expose debug
  window._dump = async ()=>{ console.log('students', await getAllStudents()); console.log('teachers', await getAllTeachers()); console.log('session', session); };
})();
