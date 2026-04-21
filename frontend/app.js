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
        } else {
            alert("❌ Registration Failed: " + data.msg);
        }
    } catch (error) { 
        alert("🚨 Server connection failed!"); 
    }
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

            if (role === "student") {
                window.location.href = "student-dashboard.html"; 
            } else {
                window.location.href = "teacher-dashboard.html";
            }
        } else {
            alert(data.msg || "Invalid Credentials!");
        }
    } catch (err) {
        alert("🚨 Server error. Check if backend is live!");
    }
}

// --- NEW FEATURE: REQUEST GATEPASS ---
async function requestGatepass(event) {
    event.preventDefault();
    const user = JSON.parse(localStorage.getItem("user"));
    
    const formData = {
        studentId: user._id,
        studentName: user.name,
        reason: document.getElementById("gpReason").value,
        outTime: document.getElementById("gpTime").value,
        status: "Pending"
    };

    try {
        const res = await fetch(`${API_BASE}/request-gatepass`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        });
        const data = await res.json();
        if(data.success) {
            alert("✅ Gatepass Request Sent to Faculty!");
            location.reload();
        }
    } catch (error) { alert("Error sending request"); }
}

// --- NEW FEATURE: REQUEST MEDICAL LEAVE ---
async function requestMedicalLeave(event) {
    event.preventDefault();
    const user = JSON.parse(localStorage.getItem("user"));

    const formData = {
        studentId: user._id,
        studentName: user.name,
        illness: document.getElementById("illness").value,
        duration: document.getElementById("duration").value,
        documentLink: document.getElementById("docLink").value, // Medical Cert link
        status: "Pending"
    };

    try {
        const res = await fetch(`${API_BASE}/request-medical`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        });
        const data = await res.json();
        if(data.success) {
            alert("✅ Medical Leave Submitted for Review!");
            location.reload();
        }
    } catch (error) { alert("Error submitting leave"); }
}

// Logout Utility
function handleLogout() {
    localStorage.clear();
    window.location.href = "login.html";
}