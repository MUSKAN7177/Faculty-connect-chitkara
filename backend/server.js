const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
require('dotenv').config(); 

const app = express();
app.use(cors());
app.use(express.json());

// 📧 1. Nodemailer Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || "muskan7177.ca23@chitkara.edu.in",
        pass: process.env.EMAIL_PASS || "ntwnciimormgudgg" 
    }
});

transporter.verify((error) => {
    if (error) console.log("❌ Nodemailer Error:", error);
    else console.log("✅ NODEMAILER IS READY!");
});

// 🛠️ 2. DATABASE CONNECTION
const dbURI = process.env.MONGO_URI || "mongodb+srv://muskanahuja:muskan78140@cluster0.auuqv3k.mongodb.net/BCA_Project?retryWrites=true&w=majority";
mongoose.connect(dbURI)
    .then(() => console.log("✅ MongoDB Atlas Connected"))
    .catch(err => console.log("❌ DB Connection Error:", err));

// 📝 3. SCHEMAS

const GatepassSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    studentName: String,
    reason: String,
    outTime: String,
    status: { type: String, default: "Pending" },
    date: { type: Date, default: Date.now }
});

const MedicalLeaveSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    studentName: String,
    illness: String,
    duration: String,
    documentLink: String,
    status: { type: String, default: "Pending" }
});

const TeacherSchema = new mongoose.Schema({
    name: String, 
    universityId: String, 
    email: String, 
    password: String, 
    department: String,
    semester: [String],
    status: { type: String, default: "Available" },
    notifications: { type: Array, default: [] }, 
    ownTimetable: { type: Array, default: [] }
});

const StudentSchema = new mongoose.Schema({
    name: String, 
    rollNo: String, 
    email: String, 
    password: String, 
    department: String,
    semester: String,
    section: { type: String, default: "A" }, // <-- Added for Section filtering
    attendance: { type: Number, default: 0 },
    marks: {
        st1: { type: Number, default: 0 },
        st2: { type: Number, default: 0 },
        assignment: { type: Number, default: 0 } // <-- Added for consistency
    }
});

const Teacher = mongoose.model("Teacher", TeacherSchema);
const Student = mongoose.model("Student", StudentSchema);
const Gatepass = mongoose.model("Gatepass", GatepassSchema);
const MedicalLeave = mongoose.model("MedicalLeave", MedicalLeaveSchema);

// 🚀 4. NEW UPDATED ROUTES

// Update Teacher Live Status (Used by checkAutoStatus in app.js)
app.post("/update-status", async (req, res) => {
    const { teacherId, status } = req.body;
    try {
        await Teacher.findByIdAndUpdate(teacherId, { status });
        res.json({ success: true, msg: "Status Updated" });
    } catch (err) { res.status(500).json({ success: false }); }
});

// Update Student Records (Single Update from Teacher Dashboard)
app.post("/update-student/:id", async (req, res) => {
    const { attendance, category, marksValue } = req.body;
    try {
        const updateData = { attendance };
        updateData[`marks.${category}`] = marksValue;
        
        await Student.findByIdAndUpdate(req.params.id, { $set: updateData });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

// 🚀 5. EXISTING ROUTES (Minor Tweaks for Filtering)

app.get("/students", async (req, res) => {
    const { dept, semester, section } = req.query;
    let filter = {};
    if(dept) filter.department = dept;
    if(semester) filter.semester = semester;
    if(section) filter.section = section;
    
    res.json(await Student.find(filter));
});

// Auth Routes (Signup & Login)
app.post("/signup", async (req, res) => {
    try {
        const { role, ...details } = req.body;
        const Model = (role.toLowerCase() === "student") ? Student : Teacher;
        const newUser = new Model(details);
        await newUser.save();
        res.json({ success: true, msg: "Registration Successful!" });
    } catch (err) { res.status(500).json({ success: false, msg: err.message }); }
});

app.post("/login", async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const Model = (role.toLowerCase() === "student") ? Student : Teacher;
        const user = await Model.findOne({ email, password });
        if (user) {
            const userData = user.toObject();
            delete userData.password;
            res.json({ success: true, user: userData });
        } else { res.json({ success: false, msg: "Invalid Credentials!" }); }
    } catch (err) { res.status(500).json({ success: false, msg: "Server Error" }); }
});

// Fetch All Requests for Teachers
app.get("/teacher-gatepasses/:dept", async (req, res) => res.json(await Gatepass.find({ department: req.params.dept, status: "Pending" })));
app.get("/teacher-medical/:dept", async (req, res) => res.json(await MedicalLeave.find({ department: req.params.dept, status: "Pending" })));
app.get("/teachers", async (req, res) => res.json(await Teacher.find()));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));