/* Final local-only app implementing requested changes */
(function(){
  const $ = id => document.getElementById(id);

  // credentials (from you)
  const TEACHER_PASSWORD = '9676';
  const ADMIN_PASSWORD = '3632';

  // storage init
  if(!localStorage.getItem('students')) localStorage.setItem('students', JSON.stringify([]));
  if(!localStorage.getItem('teachers')) localStorage.setItem('teachers', JSON.stringify([]));
  let session = JSON.parse(localStorage.getItem('lastUser') || 'null') || {role:null,user:null};

  // utility
  const uid = ()=> 'id' + Date.now() + Math.floor(Math.random()*9999);
  const mask = (v)=> v ? 'xxxxx' : '-';

  // mount events
  document.addEventListener('DOMContentLoaded', ()=>{
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

    // login handlers
    $('studentSigninBtn').addEventListener('click', studentSignin);
    $('closeSignin').addEventListener('click', ()=>hideAllModals());
    $('teacherLoginBtn').addEventListener('click', teacherSignin);
    $('closeTeacherLogin').addEventListener('click', ()=>hideAllModals());
    $('adminLoginBtn').addEventListener('click', adminSignin);
    $('closeAdminLogin').addEventListener('click', ()=>hideAllModals());

    // register handlers
    $('registerCancelBtn').addEventListener('click', ()=>hideAllModals());
    $('regYear').addEventListener('change', buildYearMarksArea);
    $('registerSaveBtn').addEventListener('click', saveStudentFromForm);

    // teacher register
    $('teacherCancelBtn').addEventListener('click', ()=>hideAllModals());
    $('teacherSaveBtn').addEventListener('click', saveTeacherFromForm);

    // simple sidebar toggle for small screens
    const hamb = $('hambBtn');
    hamb.addEventListener('click', ()=> {
      const sb = $('sidebar');
      if(sb.style.display === 'none' || getComputedStyle(sb).display === 'none'){
        sb.style.display = 'block';
      } else {
        sb.style.display = 'none';
      }
    });

    // initial render
    updateSessionUI();
    showSection('studentView');
    renderStudentsByYear(1);
    buildYearMarksArea();
  });

  // storage helpers
  function getStudents(){ return JSON.parse(localStorage.getItem('students')||'[]'); }
  function saveStudents(list){ localStorage.setItem('students', JSON.stringify(list)); }
  function getTeachers(){ return JSON.parse(localStorage.getItem('teachers')||'[]'); }
  function saveTeachers(list){ localStorage.setItem('teachers', JSON.stringify(list)); }

  // UI helpers
  function showSection(id){
    document.querySelectorAll('main > section').forEach(s=>s.style.display='none');
    $(id).style.display='block';
    window.scrollTo(0,0);
  }
  function show(el){ if(el) el.classList.add('show'); }
  function hideAllModals(){ document.querySelectorAll('.overlay').forEach(o=>o.classList.remove('show')); document.getElementById('dynamicContainer').innerHTML=''; }

  function updateSessionUI(){
    $('sessionInfo').innerText = session.role ? `${session.role.toUpperCase()} logged: ${session.user.name}` : 'Not logged in';
  }

  // LOGIN: student
  function studentSignin(){
    const pin = $('signinPin').value.trim(), pwd = $('signinPassword').value;
    const stu = getStudents().find(s => s.pin === pin && s.password === pwd);
    if(!stu){ alert('Student not found or wrong password'); return; }
    session = { role:'student', user:stu }; localStorage.setItem('lastUser', JSON.stringify(session));
    updateSessionUI(); hideAllModals(); renderStudentsByYear(Number(stu.year||1));
  }

  // teacher signin (password must match TEACHER_PASSWORD and email registered)
  function teacherSignin(){
    const email = $('teacherLoginEmail').value.trim(), pwd = $('teacherLoginPassword').value;
    if(pwd !== TEACHER_PASSWORD){ alert('Wrong teacher password (ask admin)'); return; }
    const t = getTeachers().find(x=>x.email === email);
    if(!t){ alert('Teacher not found'); return; }
    session = { role:'teacher', user:t }; localStorage.setItem('lastUser', JSON.stringify(session));
    updateSessionUI(); hideAllModals(); renderTeachers();
  }

  // admin signin
  function adminSignin(){
    const pwd = $('adminPassword').value;
    if(pwd !== ADMIN_PASSWORD){ alert('Wrong admin password'); return; }
    session = { role:'admin', user:{name:'ADMIN'} }; localStorage.setItem('lastUser', JSON.stringify(session));
    updateSessionUI(); hideAllModals(); showSection('studentView'); renderStudentsByYear(1);
  }

  function signOut(){ session = {role:null,user:null}; localStorage.removeItem('lastUser'); updateSessionUI(); showSection('studentView'); renderStudentsByYear(1); }

  // Register helpers (student)
  function prepareRegister(){
    // clear
    $('regPin').value=''; $('regName').value=''; $('regEmail').value=''; $('regPhone').value=''; $('regGender').value='Male';
    $('regMother').value=''; $('regFather').value=''; $('regVillage').value=''; $('regYear').value='1';
    $('regCaste').value=''; $('regScholarship').value='Yes'; $('regAge').value=''; $('regJoinedYear').value=''; $('reg10th').value=''; $('regSchool').value=''; $('regTarget').value=''; $('regPassword').value='';
    $('regPhoto').value = '';
    buildYearMarksArea();
    show($('registerModal'));
  }

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
      // per your request: maxima - 1st year 1000, 3rd sem 900, 4th sem 900 -> total max = 2800
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

    // photo
    const pf = $('regPhoto').files[0];
    let photoData = '';
    if(pf) photoData = await fileToDataURL(pf);

    const student = {
      id: uid(),
      photo: photoData,
      pin,
      name,
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
    if(student.year === '1'){
      student.semMarks = []; student.percentage = 0;
    } else if(student.year === '2'){
      const m1 = Number($('m1_total') ? $('m1_total').value : 0);
      const capped = Math.min(1000, m1);
      student.semMarks = [{sem:'1st_year_total', mark: capped}];
      student.percentage = ((capped/1000)*100).toFixed(2);
    } else if(student.year === '3'){
      const a = Number($('m1') ? $('m1').value : 0);
      const b = Number($('m3') ? $('m3').value : 0);
      const c = Number($('m4') ? $('m4').value : 0);
      const cappedA = Math.min(1000,a), cappedB = Math.min(900,b), cappedC = Math.min(900,c);
      const total = cappedA + cappedB + cappedC;
      student.semMarks = [{sem:'1st_year',mark:cappedA},{sem:'3rd_sem',mark:cappedB},{sem:'4th_sem',mark:cappedC}];
      student.percentage = ((total/2800)*100).toFixed(2);
    }

    // save (prevent duplicate pin or update)
    const arr = getStudents();
    const existingIndex = arr.findIndex(x=>x.pin === pin);
    if(existingIndex >= 0){
      if(!confirm('Pin exists — overwrite existing record?')) return;
      // merge (replace fields)
      const existing = arr[existingIndex];
      student.id = existing.id; // keep same id
      arr[existingIndex] = Object.assign(existing, student);
    } else {
      arr.push(student);
    }
    saveStudents(arr);

    if(student.year === '3') alert('After diploma: search for a job or join BTech.');

    alert('Student saved locally.');
    hideAllModals();
    showSection('studentView');
    renderStudentsByYear(student.year || 'all');
  }

  function fileToDataURL(file){
    return new Promise((res,rej)=>{ const fr = new FileReader(); fr.onload = e=>res(e.target.result); fr.onerror = rej; fr.readAsDataURL(file); });
  }

  // Teacher register/save
  async function saveTeacherFromForm(){
    const name = $('tName').value.trim(), email = $('tEmail').value.trim();
    if(!name || !email){ alert('Name & Email required'); return; }
    const pf = $('tPhoto').files[0];
    let photoData = '';
    if(pf) photoData = await fileToDataURL(pf);
    const teacher = { id: uid(), photo: photoData, name, email, designation: $('tDesignation').value.trim(), subjects: $('tSubjects').value.trim(), experience: $('tExperience').value, joinedYear: $('tJoinYear').value, createdAt: Date.now() };
    const arr = getTeachers(); arr.push(teacher); saveTeachers(arr);
    alert('Teacher saved locally. Teacher password must be given by admin to teacher (not stored).');
    hideAllModals(); renderTeachers();
  }

  // render students
  function renderStudentsByYear(y){
    const grid = $('studentsGrid'); grid.innerHTML = '';
    let arr = getStudents();
    if(y !== 'all') arr = arr.filter(s => Number(s.year) === Number(y));
    if(arr.length === 0){ grid.innerHTML = '<div style="padding:12px;background:#fff;border-radius:8px">No students</div>'; showSection('studentView'); return; }
    arr.forEach(s=>{
      const div = document.createElement('div'); div.className = 'student-card';
      const imgHtml = s.photo ? `<img src="${s.photo}" alt="">` : `<div style="height:220px;background:#f4f7fb;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#667">No Photo</div>`;
      div.innerHTML = `${imgHtml}<div style="padding:6px 0"><strong style="font-size:16px">${s.name}</strong><div class="meta">#${s.pin} • ${s.school||''}</div></div>
        <div style="display:flex;gap:8px;margin-top:auto"><button class="btn" style="flex:1" data-id="${s.id}">View</button></div>`;
      div.querySelector('button').addEventListener('click', ()=> openStudentProfile(s.id));
      grid.appendChild(div);
    });
    showSection('studentView');
  }

  // open student profile — one-by-one details and masking rules
  function openStudentProfile(id){
    const s = getStudents().find(x=>x.id === id); if(!s) return alert('Not found');
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
            ${ canEdit ? `<button class="btn" id="editStudentBtn">Edit</button><button class="btn secondary" id="delStudentBtn">Delete</button>` : '' }
            <button class="btn secondary" id="closeProfileBtn">Close</button>
          </div>
        </div>
      </div>
    </div>`;
    container.appendChild(wrap);

    // bindings
    const closeBtn = wrap.querySelector('#closeProfileBtn');
    if(closeBtn) closeBtn.addEventListener('click', ()=> wrap.remove());
    if(canEdit){
      const editBtn = wrap.querySelector('#editStudentBtn');
      const delBtn = wrap.querySelector('#delStudentBtn');
      if(editBtn) editBtn.addEventListener('click', ()=> { wrap.remove(); openEditStudentForm(s.id); });
      if(delBtn) delBtn.addEventListener('click', ()=> {
        if(confirm('Delete this student? This will remove only this record.')) {
          const arr = getStudents().filter(x=>x.id !== s.id);
          saveStudents(arr);
          wrap.remove();
          renderStudentsByYear('all');
          alert('Student deleted');
        }
      });
    }
  }

  // open edit — fill form and save replaces
  async function openEditStudentForm(id){
    const s = getStudents().find(x=>x.id===id); if(!s) return;
    // fill fields
    $('regPin').value = s.pin; $('regName').value = s.name; $('regEmail').value = s.email; $('regPhone').value = s.phone;
    $('regGender').value = s.gender || 'Male'; $('regMother').value = s.mother || ''; $('regFather').value = s.father || '';
    $('regVillage').value = s.village || ''; $('regYear').value = s.year || '1'; $('regCaste').value = s.caste || ''; $('regScholarship').value = s.scholarship || 'Yes';
    $('regAge').value = s.age || ''; $('regJoinedYear').value = s.joinedYear || ''; $('reg10th').value = s.marks10 || ''; $('regSchool').value = s.school || ''; $('regTarget').value = s.target || ''; $('regPassword').value = s.password || '';
    buildYearMarksArea();
    // prefill marks if present
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

    // override save handler temporarily to update this record
    const saveBtn = $('registerSaveBtn');
    const oldHandler = saveBtn.onclick;
    saveBtn.onclick = async function(){
      // process same as saveStudentFromForm but update existing id
      const pin = $('regPin').value.trim(), name = $('regName').value.trim();
      if(!pin || !name){ alert('Pin & name required'); return; }
      const pf = $('regPhoto').files[0];
      let photoData = s.photo;
      if(pf) photoData = await fileToDataURL(pf);

      const updated = {
        id: s.id, photo: photoData, pin, name,
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
      else if(updated.year === '2'){ const m1 = Number($('m1_total') ? $('m1_total').value : 0); const capped = Math.min(1000,m1); updated.semMarks = [{sem:'1st_year_total',mark:capped}]; updated.percentage = ((capped/1000)*100).toFixed(2); }
      else if(updated.year === '3'){ const a = Number($('m1').value||0), b = Number($('m3').value||0), c = Number($('m4').value||0); const cappedA = Math.min(1000,a), cappedB = Math.min(900,b), cappedC = Math.min(900,c); const total = cappedA+cappedB+cappedC; updated.semMarks = [{sem:'1st_year',mark:cappedA},{sem:'3rd_sem',mark:cappedB},{sem:'4th_sem',mark:cappedC}]; updated.percentage = ((total/2800)*100).toFixed(2); }

      const arr = getStudents(); const idx = arr.findIndex(x=>x.id===s.id);
      if(idx>=0) arr[idx] = Object.assign(arr[idx], updated);
      saveStudents(arr);
      alert('Student updated');
      hideAllModals();
      saveBtn.onclick = oldHandler;
      renderStudentsByYear('all');
    };
  }

  // Teachers list & profile
  function renderTeachers(){
    const grid = $('teacherCards'); grid.innerHTML = '';
    const arr = getTeachers();
    if(arr.length === 0){ grid.innerHTML = '<div style="padding:12px;background:#fff;border-radius:8px">No teachers</div>'; showSection('teacherView'); return; }
    arr.forEach(t=>{
      const div = document.createElement('div'); div.className = 'student-card';
      const image = t.photo ? `<img src="${t.photo}" style="height:180px;object-fit:cover;border-radius:8px">` : `<div style="height:180px;background:#f4f7fb;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#667">No Photo</div>`;
      div.innerHTML = `${image}<div style="padding:6px 0"><strong style="font-size:16px">${t.name}</strong><div class="meta">${t.designation} • ${t.subjects||''}</div></div>
        <div style="display:flex;gap:8px"><button class="btn" style="flex:1" data-id="${t.id}">View</button></div>`;
      div.querySelector('button').addEventListener('click', ()=>openTeacherProfile(t.id));
      grid.appendChild(div);
    });
    showSection('teacherView');
  }

  function openTeacherProfile(id){
    const t = getTeachers().find(x=>x.id===id); if(!t) return alert('Not found');
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
            <div style="margin-top:12px">${canEdit ? `<button class="btn" id="editTeacherBtn">Edit</button> <button class="btn secondary" id="delTeacherBtn">Delete</button>` : ''} <button class="btn secondary" id="closeTBtn">Close</button></div>
          </div>
        </div>
      </div>
    </div>`;
    container.appendChild(wrap);
    wrap.querySelector('#closeTBtn').addEventListener('click', ()=> wrap.remove());
    if(canEdit){
      wrap.querySelector('#editTeacherBtn').addEventListener('click', ()=> { wrap.remove(); openEditTeacherForm(t.id); });
      wrap.querySelector('#delTeacherBtn').addEventListener('click', ()=> {
        if(confirm('Delete this teacher?')){ const arr = getTeachers().filter(x=>x.id !== t.id); saveTeachers(arr); wrap.remove(); renderTeachers(); alert('Deleted'); }
      });
    }
  }

  function openEditTeacherForm(id){
    const t = getTeachers().find(x=>x.id === id); if(!t) return;
    openTeacherReg();
    $('tName').value = t.name; $('tEmail').value = t.email; $('tDesignation').value = t.designation; $('tSubjects').value = t.subjects; $('tExperience').value = t.experience; $('tJoinYear').value = t.joinedYear;
    const saveBtn = $('teacherSaveBtn'); const old = saveBtn.onclick;
    saveBtn.onclick = async function(){
      const arr = getTeachers(); const idx = arr.findIndex(x=>x.id===t.id);
      if(idx>=0){
        arr[idx].name = $('tName').value.trim(); arr[idx].email = $('tEmail').value.trim(); arr[idx].designation = $('tDesignation').value.trim(); arr[idx].subjects = $('tSubjects').value.trim(); arr[idx].experience = $('tExperience').value; arr[idx].joinedYear = $('tJoinYear').value;
        const f = $('tPhoto').files[0]; if(f) arr[idx].photo = await fileToDataURL(f);
        saveTeachers(arr); alert('Teacher updated'); hideAllModals(); renderTeachers();
      }
      saveBtn.onclick = old;
    };
  }

  function openTeacherReg(){ $('tPhoto').value=''; $('tName').value=''; $('tEmail').value=''; $('tDesignation').value=''; $('tSubjects').value=''; $('tExperience').value=''; $('tJoinYear').value=''; show($('teacherRegModal')); }

  // helpers
  function fileToDataURL(file){ return new Promise((res,rej)=>{ const fr = new FileReader(); fr.onload = e=>res(e.target.result); fr.onerror = rej; fr.readAsDataURL(file); }); }

  // expose debug
  window._dump = ()=>{ console.log('students', getStudents()); console.log('teachers', getTeachers()); console.log('session', session); };

})(); // IIFE
