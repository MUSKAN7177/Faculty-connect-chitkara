const API_BASE = "https://chitkara-faculty-app-2026.onrender.com";

// ==========================================
// 1. AUTHENTICATION (SIGNUP & LOGIN)
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
    } catch (err) { alert("🚨 Server error. Check if backend is live!"); }
}

// ==========================================
// 2. AUTOMATION: LIVE STATUS ENGINE
// ==========================================
function checkAutoStatus() {
    const slots = JSON.parse(localStorage.getItem("tSlots") || "[]");
    if (slots.length === 0) return;

    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    
    let currentStatus = "Available"; 
    let currentLoc = "Cabin";

    slots.forEach(slot => {
        if (currentTime >= slot.start && currentTime <= slot.end) {
            currentStatus = "Busy";
            currentLoc = slot.location;
        }
    });

    const statusText = currentStatus === "Busy" ? `🔴 In Class at ${currentLoc}` : "🟢 Available in Cabin";
    
    if(document.getElementById("statusSelect")) {
        document.getElementById("statusSelect").value = currentStatus;
    }
    syncStatusToDB(statusText);
}

async function syncStatusToDB(statusText) {
    const user = JSON.parse(localStorage.getItem("user"));
    if(!user || localStorage.getItem("userRole") !== 'teacher') return;
    try {
        await fetch(`${API_BASE}/update-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teacherId: user._id, status: statusText })
        });
    } catch(e) { console.error("Auto-status sync failed"); }
}

// ==========================================
// 3. TEACHER: MANAGE RECORDS & APPROVALS
// ==========================================
async function loadTeacherData() {
    const user = JSON.parse(localStorage.getItem("user"));
    const sem = localStorage.getItem("activeSem");
    const sec = localStorage.getItem("activeSec");
    const cat = document.getElementById("marksCategory") ? document.getElementById("marksCategory").value : "st1";

    if(!sem || !sec) return;

    try {
        const res = await fetch(`${API_BASE}/students?dept=${user.department}&semester=${sem}&section=${sec}`);
        const students = await res.json();
        
        const tbody = document.getElementById("studentBody");
        if(tbody) {
            tbody.innerHTML = students.map(s => `
                <tr>
                    <td><strong>${s.name}</strong></td>
                    <td>${s.rollNo}</td>
                    <td><input type="number" id="att-${s._id}" value="${s.attendance || 0}" style="width:60px;"></td>
                    <td><input type="number" id="marks-${s._id}" value="${s.marks?.[cat] || 0}" style="width:60px;"></td>
                    <td><button onclick="saveData('${s._id}')" class="btn-save-record">Save</button></td>
                </tr>
            `).join('') || "<tr><td colspan='5'>No students found for this class.</td></tr>";
        }
    } catch (e) { console.error("Error loading student records", e); }
}

// Fixed saveData function
async function saveData(studentId) {
    const attendance = document.getElementById(`att-${studentId}`).value;
    const marksValue = document.getElementById(`marks-${studentId}`).value;
    const category = document.getElementById("marksCategory").value;

    try {
        const res = await fetch(`${API_BASE}/update-student/${studentId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ attendance, category, marksValue })
        });
        if(res.ok) alert("✅ Record Updated!");
    } catch (e) { alert("❌ Update Failed"); }
}

// ==========================================
// 4. STUDENT: DASHBOARD & REQUESTS
// ==========================================
async function loadERPData() {
    const user = JSON.parse(localStorage.getItem("user"));
    if(!user) return;
    try {
        // Updated to use filters for accurate data fetch
        const res = await fetch(`${API_BASE}/students?dept=${user.department}&semester=${user.semester}&section=${user.section}`);
        const all = await res.json();
        const me = all.find(s => s._id === user._id);
        if(me) {
            if(document.getElementById("myAttVal")) document.getElementById("myAttVal").innerText = (me.attendance || 0) + "%";
            if(document.getElementById("barVisual")) document.getElementById("barVisual").style.width = (me.attendance || 0) + "%";
            const m = me.marks || {};
            const marksBody = document.getElementById("marksBody");
            if(marksBody) {
                marksBody.innerHTML = `
                    <tr><td>ST1</td><td>${m.st1 || 0}</td></tr>
                    <tr><td>ST2</td><td>${m.st2 || 0}</td></tr>
                    <tr><td>Assignments</td><td>${m.assignment || 0}</td></tr>
                `;
            }
        }
    } catch (e) { console.error(e); }
}

// Added missing Profile Loader for Student/Teacher
function loadProfileCard() {
    const user = JSON.parse(localStorage.getItem("user"));
    const container = document.getElementById("profileIDCard") || document.getElementById("tProfileIDCard");
    if(!container || !user) return;

    container.innerHTML = `
        <div class="card" style="text-align: center; border-top: 5px solid var(--chitkara-navy); padding: 20px;">
            <i class="fas fa-user-circle" style="font-size: 60px; color: var(--chitkara-navy); margin-bottom: 15px;"></i>
            <h2>${user.name}</h2>
            <p><strong>ID/Roll No:</strong> ${user.rollNo || user.universityId}</p>
            <p><strong>Department:</strong> ${user.department}</p>
            <p><strong>Semester:</strong> ${user.semester || 'N/A'}</p>
            <p><strong>Email:</strong> ${user.email}</p>
        </div>
    `;
}

// Appointment Booking
async function handleAptRequest(e) {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem("user"));
    const data = {
        studentId: user._id,
        studentName: user.name,
        teacherId: document.getElementById("facSelect").value,
        reason: document.getElementById("aptReason").value,
        time: document.getElementById("aptTime").value
    };
    const res = await fetch(`${API_BASE}/book-appointment`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    if(res.ok) { 
        alert("✅ Appointment Request Sent!"); 
        if(typeof loadMyAppointments === "function") loadMyAppointments(); 
    }
}

// ==========================================
// 5. UTILS & TIMERS
// ==========================================
function logout() { localStorage.clear(); window.location.href = "login.html"; }

// Start auto-check if teacher
if(localStorage.getItem("userRole") === 'teacher') {
    setInterval(checkAutoStatus, 60000); 
}