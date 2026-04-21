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
    
    // Update UI and Database
    if(document.getElementById("statusSelect")) {
        document.getElementById("statusSelect").value = currentStatus;
    }
    syncStatusToDB(statusText);
}

async function syncStatusToDB(statusText) {
    const user = JSON.parse(localStorage.getItem("user"));
    if(!user || user.role !== 'teacher') return;
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

// Load Students based on Profile Selection (Sem & Sec)
async function loadTeacherData() {
    const user = JSON.parse(localStorage.getItem("user"));
    const sem = localStorage.getItem("activeSem");
    const sec = localStorage.getItem("activeSec");
    const cat = document.getElementById("marksCategory").value;

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

// Triple Approval Hub (Apt, Gatepass, ML)
async function loadAllApprovals() {
    const user = JSON.parse(localStorage.getItem("user"));
    const container = document.getElementById("requestList");
    if(!container) return;

    try {
        const [aptRes, gpRes, mlRes] = await Promise.all([
            fetch(`${API_BASE}/teacher-appointments/${user._id}`),
            fetch(`${API_BASE}/teacher-gatepasses/${user.department}`),
            fetch(`${API_BASE}/teacher-medical/${user.department}`)
        ]);

        const apts = await aptRes.json();
        const gps = await gpRes.json();
        const mls = await mlRes.json();

        container.innerHTML = ""; // Clear loader

        apts.forEach(a => { if(a.status === 'Pending') container.innerHTML += renderCard(a, 'Appointment', 'updateApt'); });
        gps.forEach(g => { if(g.status === 'Pending') container.innerHTML += renderCard(g, 'Gatepass', 'updateGP'); });
        mls.forEach(m => { if(m.status === 'Pending') container.innerHTML += renderCard(m, 'Medical Leave', 'updateML'); });

    } catch (e) { container.innerHTML = "Error loading approvals."; }
}

function renderCard(data, type, actionFunc) {
    return `
        <div class="request-card" style="border-left: 5px solid var(--chitkara-red); margin-bottom:10px; padding:15px; background:white; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <span style="font-size:10px; background:#eee; padding:2px 5px; border-radius:3px;">${type}</span><br>
                <strong>${data.studentName}</strong><br>
                <small>${data.reason || data.illness} | ${data.time || 'Duration: '+data.duration}</small>
            </div>
            <div>
                <button onclick="${actionFunc}('${data._id}', 'Approved')" class="btn-approve">Approve</button>
                <button onclick="${actionFunc}('${data._id}', 'Declined')" class="btn-decline">Decline</button>
            </div>
        </div>
    `;
}

// ==========================================
// 4. STUDENT: DASHBOARD & REQUESTS
// ==========================================
async function loadERPData() {
    const user = JSON.parse(localStorage.getItem("user"));
    try {
        const res = await fetch(`${API_BASE}/students`);
        const all = await res.json();
        const me = all.find(s => s._id === user._id);
        if(me) {
            document.getElementById("myAttVal").innerText = (me.attendance || 0) + "%";
            document.getElementById("barVisual").style.width = (me.attendance || 0) + "%";
            const m = me.marks || {};
            document.getElementById("marksBody").innerHTML = `
                <tr><td>ST1</td><td>${m.st1 || 0}</td></tr>
                <tr><td>ST2</td><td>${m.st2 || 0}</td></tr>
                <tr><td>Assignments</td><td>${m.assignment || 0}</td></tr>
            `;
        }
    } catch (e) { console.error(e); }
}

// Appointment Booking
async function handleAptRequest(e) {
    e.preventDefault();
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
    if(res.ok) { alert("✅ Appointment Request Sent!"); loadMyAppointments(); }
}

// ==========================================
// 5. UTILS & TIMERS
// ==========================================
function logout() { localStorage.clear(); window.location.href="role.html"; }

// Start auto-check if teacher
if(localStorage.getItem("userRole") === 'teacher') {
    setInterval(checkAutoStatus, 60000); 
}