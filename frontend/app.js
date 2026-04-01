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
    const role = localStorage.getItem("role");
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, role })
        });
        const data = await res.json();
        if(data.success) {
            alert("✅ Login Successful!");
            localStorage.setItem("user", JSON.stringify(data.user));
            window.location.href = role === "student" ? "student-dashboard.html" : "teacher-dashboard.html";
        } else { alert("❌ " + data.msg); }
    } catch (error) { alert("🚨 Connection Error!"); }
}