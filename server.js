const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 🔗 Database Connection
mongoose.connect("mongodb+srv://muskan: muskan78140@cluster0.xxxxx.mongodb .net/facultyDB?retryWrites=true&w= majority"))
    .then(() => console.log("✅ MongoDB Altas"))
    .catch(err => console.log("❌ DB Connection Error:", err));

// 📝 SCHEMAS
const TeacherSchema = new mongoose.Schema({
    name: String, universityId: String, email: String, password: String, department: String,
    status: { type: String, default: "Available" },
    notifications:{type:Array,default:[]},
    timetable: { type: Array, default: [] }
});

const StudentSchema = new mongoose.Schema({
    name: String, rollNo: String, email: String, password: String, department: String
});

const Teacher = mongoose.model("Teacher", TeacherSchema);
const Student = mongoose.model("Student", StudentSchema);

// 🚀 AUTH ROUTES
app.post("/signup", async (req, res) => {
    try {
        const { role, ...details } = req.body;
        const Model = role === "student" ? Student : Teacher;
        const newUser = new Model(details);
        await newUser.save();
        res.json({ success: true, msg: "Registration Successful!" });
    } catch (err) { res.json({ success: false, msg: "Error: " + err.message }); }
});

app.post("/login", async (req, res) => {
    const { email, password, role } = req.body;
    const Model = role === "student" ? Student : Teacher;
    const user = await Model.findOne({ email, password });
    if (user) res.json({ success: true, msg: "Welcome!", user });
    else res.json({ success: false, msg: "Invalid Credentials!" });
});

// 🏫 FACULTY FEATURES ROUTES
// 1. Get all teachers for student search
app.get("/teachers", async (req, res) => {
    try {
        const teachers = await Teacher.find({}, { password: 0 });
        res.json(teachers);
    } catch (err) { res.status(500).json({ msg: "Error fetching teachers" }); }
});
app.post("/send-request", async (req, res) => {
    const { teacherId, studentName, studentId } = req.body;
    await Teacher.findByIdAndUpdate(teacherId, { 
        $push: { notifications: { studentName, studentId, status: "pending", id: Date.now() } } 
    });
    res.json({ success: true, msg: "Request Sent!" });
});
// server.js mein yahan update karein
app.post("/send-request", async (req, res) => {
    try {
        const { teacherId, studentName } = req.body;
        // console.log("Request for:", teacherId); // Debugging ke liye
        
        const teacher = await Teacher.findById(teacherId);
        if (!teacher) return res.status(404).json({ success: false, msg: "Teacher not found" });

        // Update notification
        await Teacher.findByIdAndUpdate(teacherId, { 
            $push: { notifications: { studentName, status: "pending", id: Date.now() } } 
        });
        
        res.json({ success: true, msg: "Request Sent!" });
    } catch (err) { 
        console.error(err);
        res.status(500).json({ success: false, msg: "Server Error" }); 
    }
});

app.listen(5000, () => console.log("🚀 Server running on http://127.0.0.1:5000"));