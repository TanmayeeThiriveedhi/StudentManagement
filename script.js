// ------------------------------------------------------
// IMPORTS
// ------------------------------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import {
    getDatabase,
    ref,
    set,
    push,
    get,
    child,
    remove,
    update
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
    getStorage,
    ref as storageRef,
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
    storageBucket: "student-management-183.appspot.com",
    messagingSenderId: "278398940942",
    appId: "1:278398940942:web:592dace5f70ac04112c95f",
    measurementId: "G-CDCQVZ4FFN"
};

// ------------------------------------------------------
// INITIALIZE FIREBASE
// ------------------------------------------------------
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const db = getDatabase(app);
const storage = getStorage(app);

// ------------------------------------------------------
// IMAGE UPLOAD FUNCTION
// ------------------------------------------------------
async function uploadImage(file) {
    const path = "student_images/" + Date.now() + "_" + file.name;
    const sRef = storageRef(storage, path);
    await uploadBytes(sRef, file);
    return await getDownloadURL(sRef);
}

// ------------------------------------------------------
// UID HELPER
// ------------------------------------------------------
const uid = () => 'id' + Date.now() + Math.floor(Math.random() * 9999);

// ------------------------------------------------------
// FIREBASE STUDENT CRUD
// ------------------------------------------------------
async function getStudents() {
    const snapshot = await get(ref(db, 'students'));
    return snapshot.exists() ? Object.values(snapshot.val()) : [];
}

async function saveStudent(student) {
    let studentRef;
    if(student.id) {
        studentRef = ref(db, 'students/' + student.id);
    } else {
        studentRef = push(ref(db, 'students'));
        student.id = studentRef.key;
    }
    await set(studentRef, student);
}

async function deleteStudent(id) {
    await remove(ref(db, 'students/' + id));
    console.log("Student deleted from Firebase!");
}

// ------------------------------------------------------
// FIREBASE TEACHER CRUD
// ------------------------------------------------------
async function getTeachers() {
    const snapshot = await get(ref(db, 'teachers'));
    return snapshot.exists() ? Object.values(snapshot.val()) : [];
}

async function saveTeacher(teacher) {
    let teacherRef;
    if(teacher.id) {
        teacherRef = ref(db, 'teachers/' + teacher.id);
    } else {
        teacherRef = push(ref(db, 'teachers'));
        teacher.id = teacherRef.key;
    }
    await set(teacherRef, teacher);
}

async function deleteTeacher(id) {
    await remove(ref(db, 'teachers/' + id));
    console.log("Teacher deleted from Firebase!");
}

// ------------------------------------------------------
// FILE TO DATA URL HELPER
// ------------------------------------------------------
function fileToDataURL(file) {
    return new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = e => res(e.target.result);
        fr.onerror = rej;
        fr.readAsDataURL(file);
    });
}

// ------------------------------------------------------
// EXPORT FUNCTIONS (for buttons)
// ------------------------------------------------------
window.uploadImage = uploadImage;
window.getStudents = getStudents;
window.saveStudent = saveStudent;
window.deleteStudent = deleteStudent;
window.getTeachers = getTeachers;
window.saveTeacher = saveTeacher;
window.deleteTeacher = deleteTeacher;
