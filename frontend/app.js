const API_BASE = "https://chitkara-faculty-app-2026.onrender.com";

async function handleSignup(event) {
    event.preventDefault();
    const role = localStorage.getItem("role");
    
    const formData = {
        role,
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
        department: document.getElementById("department").value,
        [role === "student" ? "rollNo" : "universityId"]: document.getElementById("idField").value
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
    } catch (error) { alert("🚨 Server is not running!"); }
}

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    
    // 🚩 IMPORTANT: LocalStorage se role nikalna (Jo role.html se set hua tha)
    const role = localStorage.getItem("userRole") || "student"; 

    try {
        const response = await fetch("https://chitkara-faculty-app-2026.onrender.com/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, role })
        });

        const data = await response.json();
        console.log("Login Response:", data); // Browser console mein check karne ke liye

        if (data.success) {
            // User data save karein
            localStorage.setItem("user", JSON.stringify(data.user));

            // 🔍 Redirection Logic (Check spellings carefully!)
            if (role === "student") {
                console.log("Redirecting to Student Dashboard...");
                window.location.href = "student-dashboard.html"; 
            } else {
                console.log("Redirecting to Teacher Dashboard...");
                window.location.href = "teacher-dashboard.html";
            }
        } else {
            alert("Invalid Credentials! Please try again.");
        }
    } catch (err) {
        console.error("Login Error:", err);
        alert("Server is down. Please try again later.");
    }
}