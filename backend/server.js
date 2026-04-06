const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require('dotenv').config(); // Agar .env use kar rahe ho

const app = express();
app.use(cors());
app.use(express.json());

// 🔗 Health Check Route (For Render)
app.get("/", (req, res) => {
    res.send("Backend is Running Successfully!");
});

// 🔗 Database Connection
// Yahan apna database name 'BCA_Project' (ya jo bhi ho) add karein
const dbURI = "mongodb+srv://muskanahuja:muskan78140@cluster0.auuqv3k.mongodb.net/BCA_Project?retryWrites=true&w=majority";

mongoose.connect(dbURI)
    .then(() => console.log("✅ MongoDB Atlas Connected"))
    .catch(err => console.log("❌ DB Connection Error:", err));

// 📝 SCHEMAS
const TeacherSchema = new mongoose.Schema({
    name: String, 
    universityId: String, 
    email: String, 
    password: String, 
    department: String,
    status: { type: String, default: "Available" },
    notifications: { type: Array, default: [] },
    timetable: { type: Array, default: [] }
});

const StudentSchema = new mongoose.Schema({
    name: String, 
    rollNo: String, 
    email: String, 
    password: String, 
    department: String
});

const Teacher = mongoose.model("Teacher", TeacherSchema);
const Student = mongoose.model("Student", StudentSchema);

// 🚀 AUTH ROUTES
app.post("/signup", async (req, res) => {
    try {
        const { role, ...details } = req.body;
        const Model = (role === "student") ? Student : Teacher;
        const newUser = new Model(details);
        await newUser.save();
        res.json({ success: true, msg: "Registration Successful!" });
    } catch (err) { 
        res.status(500).json({ success: false, msg: "Error: " + err.message }); 
    }
});

app.post("/login", async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const Model = (role === "student") ? Student : Teacher;
        const user = await Model.findOne({ email, password });
        if (user) res.json({ success: true, msg: "Welcome!", user });
        else res.json({ success: false, msg: "Invalid Credentials!" });
    } catch (err) {
        res.status(500).json({ success: false, msg: "Server Error" });
    }
});

// 🏫 FACULTY FEATURES ROUTES
app.get("/teachers", async (req, res) => {
    try {
        const teachers = await Teacher.find({}, { password: 0 });
        res.json(teachers);
    } catch (err) { 
        res.status(500).json({ msg: "Error fetching teachers" }); 
    }
});

app.post("/send-request", async (req, res) => {
    try {
        const { teacherId, studentName, studentId } = req.body;
        const teacher = await Teacher.findById(teacherId);
        if (!teacher) return res.status(404).json({ success: false, msg: "Teacher not found" });

        await Teacher.findByIdAndUpdate(teacherId, { 
            $push: { 
                notifications: { 
                    studentName, 
                    studentId, 
                    status: "pending", 
                    id: Date.now() 
                } 
            } 
        });
        res.json({ success: true, msg: "Request Sent!" });
    } catch (err) { 
        res.status(500).json({ success: false, msg: "Server Error" }); 
    }
});

// Use dynamic port for Render
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});