const API_BASE = "https://chitkara-faculty-app-2026.onrender.com";

async function handleSignup(event) {
    event.preventDefault();
    // 🚩 Key ko 'userRole' rakha hai taaki login se match kare
    const role = localStorage.getItem("userRole"); 
    
    if (!role) {
        alert("Please select a role first!");
        window.location.href = "role.html";
        return;
    }

    const formData = {
        role: role.toLowerCase(), // Backend hamesha lowercase mangta hai
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
        department: document.getElementById("department").value,
        // Backend key matching (rollNo for student, universityId for teacher)
        [role.toLowerCase() === "student" ? "rollNo" : "universityId"]: document.getElementById("idField").value
    };

    try {
        const res = await fetch(`${API_BASE}/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        });
        const data = await res.json();
        alert(data.msg);
        if(data.success) window.location.href = "login.html";
    } catch (error) { 
        alert("🚨 Server connection failed!"); 
    }
}

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    
    // 🚩 Yahan bhi 'userRole' hi use karein
    let role = localStorage.getItem("userRole");
    if(!role) role = "student"; 
    
    role = role.toLowerCase(); // Safety check

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, role })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem("user", JSON.stringify(data.user));

            // Dashboard redirection
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