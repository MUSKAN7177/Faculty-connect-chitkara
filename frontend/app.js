const API_BASE = "https://chitkara-faculty-app-2026.onrender.com";

// ==========================================
// 1. AUTHENTICATION (Login/Signup)
// ==========================================
async function handleSignup(event) {
    event.preventDefault();
    const role = localStorage.getItem("userRole") ? localStorage.getItem("userRole").toLowerCase() : null; 
    
    if (!role) {
        alert("Please select a role first!");
        window.location.href = "role.html";
        return;
    }

    const formData = {
        role: role,
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
        department: document.getElementById("department").value,
        semester: document.getElementById("semester") ? document.getElementById("semester").value : "1",
        section: document.getElementById("section") ? document.getElementById("section").value : "A",
        [role === "student" ? "rollNo" : "universityId"]: document.getElementById("idField").value
    };

    try {
        const res = await fetch(`${API_BASE}/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        });
        const data = await res.json();
        if(data.success) {
            alert("✅ Registration Successful! Please Login.");
            window.location.href = "login.html";
        } else { alert("❌ Failed: " + data.msg); }
    } catch (error) { alert("🚨 Server connection failed!"); }
}

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    let role = localStorage.getItem("userRole");
    
    if(!role) {
        alert("Please select your role first.");
        window.location.href = "role.html";
        return;
    }
    role = role.toLowerCase();

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, role })
        });
        const data = await response.json();

        if (data.success) {
            localStorage.setItem("user", JSON.stringify(data.user));
            localStorage.setItem("userRole", role); 
            window.location.href = (role === "student") ? "student-dashboard.html" : "teacher-dashboard.html";
        } else { alert(data.msg || "Invalid Credentials!"); }
    } catch (err) { alert("🚨 Server error. Backend may be sleeping!"); }
}

// ==========================================
// 2. TEACHER: ATTENDANCE & MARKS (ERP Features)
// ==========================================
async function loadTeacherData() {
    const sem = document.getElementById("filterSem")?.value || "6";
    const sec = document.getElementById("filterSec")?.value || "C";

    try {
        const res = await fetch(`${API_BASE}/students-by-class?semester=${sem}&section=${sec}`);
        const students = await res.json();
        
        const tbody = document.getElementById("studentBody");
        if(tbody) {
            tbody.innerHTML = students.map(s => `
                <tr>
                    <td><strong>${s.name}</strong></td>
                    <td>${s.rollNo}</td>
                    <td><input type="number" id="att-${s._id}" value="${s.attendance || 0}" class="erp-input"></td>
                    <td><input type="number" id="st1-${s._id}" value="${s.marks?.st1 || 0}" class="erp-input"></td>
                    <td>
                        <button onclick="saveStudentData('${s._id}')" class="btn btn-primary">Update</button>
                    </td>
                </tr>
            `).join('') || "<tr><td colspan='5'>No students found.</td></tr>";
        }
    } catch (e) { console.error("Error loading students", e); }
}

async function saveStudentData(studentId) {
    const user = JSON.parse(localStorage.getItem("user"));
    const payload = {
        studentId,
        attendance: document.getElementById(`att-${studentId}`).value,
        st1: document.getElementById(`st1-${studentId}`).value,
        st2: 0, // Placeholder
        assignment: 0, // Placeholder
        teacherName: user.name
    };

    try {
        const res = await fetch(`${API_BASE}/update-student-data`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if(data.success) {
            alert("✅ Record Updated & Email Sent if <75%");
        }
    } catch (e) { alert("❌ Update Failed"); }
}

// ==========================================
// 3. RESOURCE UPLOAD (Notes/Timetable)
// ==========================================
async function uploadResource() {
    const user = JSON.parse(localStorage.getItem("user"));
    const payload = {
        teacherId: user._id,
        teacherName: user.name,
        title: document.getElementById("resTitle").value,
        subject: document.getElementById("resSub").value,
        link: document.getElementById("resLink").value,
        type: "Note"
    };

    try {
        const res = await fetch(`${API_BASE}/upload-resource`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if((await res.json()).success) alert("✅ Resource Uploaded!");
    } catch (e) { alert("Upload failed"); }
}

// ==========================================
// 4. STATUS & APPOINTMENTS
// ==========================================
async function updateFacultyStatus(status) {
    const user = JSON.parse(localStorage.getItem("user"));
    try {
        const res = await fetch(`${API_BASE}/update-faculty-status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ teacherId: user._id, status: status })
        });
        if((await res.json()).success) {
            document.getElementById("live-status").innerText = status;
            alert("Status Synced!");
        }
    } catch(e) { alert("Status sync error"); }
}

// UI Tabs Switcher
function showTab(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const target = document.getElementById(tabId);
    if(target) target.classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    if(element) element.classList.add('active');
}

function logout() { localStorage.clear(); window.location.href = "login.html"; }