const API_BASE = "https://chitkara-faculty-app-2026.onrender.com";

// --- AUTH: SIGNUP LOGIC ---
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

// --- AUTH: LOGIN LOGIC ---
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

// --- STUDENT: LOAD ERP DATA (Attendance & Marks) ---
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
            const marksBody = document.getElementById("marksBody");
            if(marksBody) {
                marksBody.innerHTML = `
                    <tr><td>ST1</td><td>${m.st1 || 0}</td></tr>
                    <tr><td>ST2</td><td>${m.st2 || 0}</td></tr>
                    <tr><td>Assignments</td><td>${m.assignment || 0}</td></tr>
                `;
            }
        }
    } catch (e) { console.error("ERP Data Load Error", e); }
}

// --- STUDENT: SMART TIMETABLE ---
async function loadAutoTimetable() {
    const user = JSON.parse(localStorage.getItem("user"));
    const container = document.getElementById("detailedTimetable");
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const today = days[new Date().getDay()];

    try {
        const res = await fetch(`${API_BASE}/timetable?dept=${user.department}&sem=${user.semester}`);
        const data = await res.json();
        const todayClasses = data.filter(c => c.day === today);

        if(todayClasses.length === 0) {
            container.innerHTML = "<p class='no-data'>No classes today. Enjoy your day!</p>";
            return;
        }

        container.innerHTML = todayClasses.map(slot => {
            const now = new Date();
            const curTime = now.getHours() + ":" + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
            const isLive = (curTime >= slot.startTime && curTime <= slot.endTime);
            return `
                <div class="time-slot-card ${isLive ? 'live-border' : ''}">
                    <div class="time-meta"><b>${slot.startTime} - ${slot.endTime}</b></div>
                    <div class="slot-info">
                        <h4>${slot.subject}</h4>
                        <small>Room: ${slot.room} | Faculty: ${slot.teacherName}</small>
                    </div>
                    ${isLive ? '<span class="pulse-icon">LIVE NOW</span>' : ''}
                </div>
            `;
        }).join('');
    } catch(e) { container.innerHTML = "Error loading timetable."; }
}

// --- TEACHER: LOAD FILTERED STUDENTS ---
async function loadTeacherData() {
    const user = JSON.parse(localStorage.getItem("user"));
    const sem = document.getElementById("semFilter").value;
    const sec = document.getElementById("secFilter").value;
    const cat = document.getElementById("marksCategory").value;

    try {
        const res = await fetch(`${API_BASE}/students?dept=${user.department}`);
        const students = await res.json();
        const filtered = students.filter(s => s.semester == sem && s.section == sec);

        document.getElementById("studentBody").innerHTML = filtered.map(s => `
            <tr>
                <td><strong>${s.name}</strong></td>
                <td>${s.rollNo || 'N/A'}</td>
                <td><input type="number" id="att-${s._id}" value="${s.attendance || 0}" class="small-input"></td>
                <td><input type="number" id="marks-${s._id}" value="${s.marks?.[cat] || 0}" class="small-input"></td>
                <td><button class="btn-save-record" onclick="saveData('${s._id}')">Update</button></td>
            </tr>
        `).join('') || "<tr><td colspan='5'>No students found in this section.</td></tr>";
    } catch (e) { console.error(e); }
}

// --- TEACHER: SAVE STUDENT DATA ---
async function saveData(studentId) {
    const category = document.getElementById("marksCategory").value;
    const attendance = document.getElementById(`att-${studentId}`).value;
    const marksValue = document.getElementById(`marks-${studentId}`).value;

    try {
        const res = await fetch(`${API_BASE}/update-student/${studentId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ attendance, category, marksValue })
        });
        if(res.ok) alert("✅ Student record updated!");
    } catch (e) { alert("Error updating record"); }
}

// --- TEACHER: UPDATE LIVE STATUS ---
async function updateLiveStatus() {
    const user = JSON.parse(localStorage.getItem("user"));
    const status = document.getElementById("statusSelect").value;
    try {
        await fetch(`${API_BASE}/update-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teacherId: user._id, status: status })
        });
        alert("Status updated successfully!");
    } catch(e) { console.error(e); }
}

// --- COMMON: LOGOUT ---
function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}