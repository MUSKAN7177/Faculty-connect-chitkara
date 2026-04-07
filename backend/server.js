const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require('dotenv').config(); 
const sendEmail = require('./utils/sendEmail'); 
const Tesseract = require('tesseract.js'); 

const app = express();
app.use(cors());
app.use(express.json());

// 🔗 Health Check
app.get("/", (req, res) => res.send("Backend is Running Successfully!"));

// 🔗 Database Connection
const dbURI = process.env.MONGO_URI || "mongodb+srv://muskanahuja:muskan78140@cluster0.auuqv3k.mongodb.net/BCA_Project?retryWrites=true&w=majority";

mongoose.connect(dbURI)
    .then(() => console.log("✅ MongoDB Atlas Connected"))
    .catch(err => console.log("❌ DB Connection Error:", err));

// 📝 UPDATED SCHEMAS (Phase 2)
const TeacherSchema = new mongoose.Schema({
    name: String, 
    universityId: String, 
    email: String, 
    password: String, 
    department: String,
    subjects: [String], // Teacher jo subjects padhate hain
    status: { type: String, default: "Available" },
    notifications: { type: Array, default: [] },
    timetable: { type: Array, default: [] }
});

const StudentSchema = new mongoose.Schema({
    name: String, 
    rollNo: String, 
    email: String, 
    password: String, 
    department: String,
    // Academic Data
    attendance: { type: Number, default: 0 },
    marks: {
        st1: { type: Number, default: 0 },
        st2: { type: Number, default: 0 },
        internal: { type: Number, default: 0 },
        external: { type: Number, default: 0 }
    }
});

const NotesSchema = new mongoose.Schema({
    subject: String,
    teacherName: String,
    link: String,
    date: { type: Date, default: Date.now }
});

const Teacher = mongoose.model("Teacher", TeacherSchema);
const Student = mongoose.model("Student", StudentSchema);
const Notes = mongoose.model("Notes", NotesSchema);

// 🚀 AUTH ROUTES
app.post("/signup", async (req, res) => {
    try {
        const { role, ...details } = req.body;
        const Model = (role === "student") ? Student : Teacher;
        const newUser = new Model(details);
        await newUser.save();
        res.json({ success: true, msg: "Registration Successful!" });
    } catch (err) { res.status(500).json({ success: false, msg: err.message }); }
});

app.post("/login", async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const Model = (role === "student") ? Student : Teacher;
        const user = await Model.findOne({ email, password });
        if (user) res.json({ success: true, user });
        else res.json({ success: false, msg: "Invalid Credentials!" });
    } catch (err) { res.status(500).json({ success: false, msg: "Server Error" }); }
});

// 📊 ACADEMIC ROUTES (Attendance & Marks)
// Get all students for Teacher Dashboard
app.get("/students", async (req, res) => {
    try {
        const students = await Student.find({}, { password: 0 });
        res.json(students);
    } catch (err) { res.status(500).json({ msg: "Error fetching students" }); }
});

// Update Attendance & Marks
app.post("/update-academics", async (req, res) => {
    try {
        const { studentId, attendance, marks } = req.body;
        await Student.findByIdAndUpdate(studentId, { attendance, marks });
        res.json({ success: true, msg: "Academic records updated!" });
    } catch (err) { res.status(500).json({ success: false, msg: "Update failed" }); }
});

// 📚 NOTES ROUTES
app.post("/upload-note", async (req, res) => {
    try {
        const newNote = new Notes(req.body);
        await newNote.save();
        res.json({ success: true, msg: "Note Link Shared!" });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.get("/notes", async (req, res) => {
    const notes = await Notes.find().sort({ date: -1 });
    res.json(notes);
});

// 🏫 FACULTY FEATURES (Requests & Status)
app.get("/teachers", async (req, res) => {
    const teachers = await Teacher.find({}, { password: 0 });
    res.json(teachers);
});

app.post("/send-request", async (req, res) => {
    try {
        const { teacherId, studentName, studentId, message } = req.body;
        const teacher = await Teacher.findById(teacherId);
        
        await Teacher.findByIdAndUpdate(teacherId, { 
            $push: { notifications: { studentName, studentId, message, status: "pending", id: Date.now() } } 
        });

        await sendEmail({
            email: teacher.email, 
            subject: `New Request from ${studentName}`,
            message: `Hello Professor, ${studentName} wants to connect. Message: ${message}`
        });
        res.json({ success: true, msg: "Request Sent!" });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post("/update-status", async (req, res) => {
    try {
        const { teacherId, studentId, notificationId, newStatus } = req.body;
        const student = await Student.findById(studentId);
        const teacher = await Teacher.findById(teacherId);

        await Teacher.updateOne(
            { _id: teacherId, "notifications.id": Number(notificationId) },
            { $set: { "notifications.$.status": newStatus } }
        );

        await sendEmail({
            email: student.email,
            subject: `Request ${newStatus}`,
            message: `Hi ${student.name}, Prof. ${teacher.name} has ${newStatus.toLowerCase()} your request.`
        });
        res.json({ success: true, msg: "Status Updated!" });
    } catch (err) { res.status(500).json({ success: false }); }
});

// 🚀 SERVER
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on port ${PORT}`));