const API_BASE = "https://chitkara-faculty-app-2026.onrender.com";

// --- SIGNUP LOGIC ---
async function handleSignup(event) {
    event.preventDefault();
    
    // Role fetch karna (lowercase safety ke saath)
    const role = localStorage.getItem("userRole") ? localStorage.getItem("userRole").toLowerCase() : null; 
    
    if (!role) {
        alert("Please select a role first!");
        window.location.href = "role.html";
        return;
    }

    // Form data taiyar karna
    const formData = {
        role: role,
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
        department: document.getElementById("department").value,
        // Backend matching: student ke liye rollNo, teacher ke liye universityId
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
            alert("Registration Successful!");
            window.location.href = "login.html";
        } else {
            alert("Registration Failed: " + data.msg);
        }
    } catch (error) { 
        alert("🚨 Server connection failed!"); 
    }
}

// --- LOGIN LOGIC ---
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    
    // Role selection fetch karna
    let role = localStorage.getItem("userRole");
    if(!role) {
        alert("Please select your role (Student/Teacher) on the role page first.");
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
            // User data aur role dono save karein taaki dashboard error na de
            localStorage.setItem("user", JSON.stringify(data.user));
            localStorage.setItem("userRole", role); 

            // Correct dashboard par bhejna
            if (role === "student") {
                window.location.href = "student-dashboard.html"; 
            } else {
                window.location.href = "teacher-dashboard.html";
            }
        } else {
            alert(data.msg || "Invalid Credentials!");
        }
    } catch (err) {
        console.error("Login Error:", err);
        alert("🚨 Server error. Check if backend is live!");
    }
}