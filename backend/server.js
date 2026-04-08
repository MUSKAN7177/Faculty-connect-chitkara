const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer"); // 👈 Added Nodemailer
require('dotenv').config(); 

const app = express();
app.use(cors());
app.use(express.json());

// 📧 Nodemailer Transporter Setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // 16-digit App Password
    }
});

// 🔗 Health Check
app.get("/", (req, res) => res.send("Backend is Running Successfully!"));

// 🔗 Database Connection
const dbURI = process.env.MONGO_URI || "mongodb+srv://muskanahuja:muskan78140@cluster0.auuqv3k.mongodb.net/BCA_Project?retryWrites=true&w=majority";

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
    subjects: [String],
    status: { type: String, default: "Available" },
    notifications: { type: Array, default: [] }
});

const StudentSchema = new mongoose.Schema({
    name: String, 
    rollNo: String, 
    email: String, 
    password: String, 
    department: String,
    attendance: { type: Number, default: 0 },
    marks: {
        st1: { type: Number, default: 0 },
        st2: { type: Number, default: 0 }
    }
});

const NotesSchema = new mongoose.Schema({
    subject: String,
    teacherName: String,
    link: String,
    category: { type: String, default: 'note' }, // 'note' or 'timetable'
    date: { type: Date, default: Date.now } // 👈 Fixed comma here
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

// 📊 ACADEMIC ROUTES
app.get("/students", async (req, res) => {
    try {
        const students = await Student.find({}, { password: 0 });
        res.json(students);
    } catch (err) { res.status(500).json({ msg: "Error fetching students" }); }
});

app.post("/update-academics", async (req, res) => {
    try {
        const { studentId, attendance, marks } = req.body;
        await Student.findByIdAndUpdate(studentId, { attendance, marks });
        res.json({ success: true, msg: "Records updated!" });
    } catch (err) { res.status(500).json({ success: false }); }
});

// 📚 NOTES & TIMETABLE ROUTES
app.post("/notes", async (req, res) => { // Unified route for Teacher Dashboard
    try {
        const newNote = new Notes(req.body);
        await newNote.save();
        res.json({ success: true, msg: "Shared Successfully!" });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.get("/notes", async (req, res) => {
    try {
        const notes = await Notes.find().sort({ date: -1 });
        res.json(notes);
    } catch (err) { res.status(500).json([]); }
});

// 🏫 FACULTY & APPOINTMENTS
app.get("/teachers", async (req, res) => {
    const teachers = await Teacher.find({}, { password: 0 });
    res.json(teachers);
});

app.post("/send-request", async (req, res) => {
    try {
        const { teacherId, studentName, studentId, message } = req.body;
        await Teacher.findByIdAndUpdate(teacherId, { 
            $push: { notifications: { studentName, studentId, message, status: "pending", id: Date.now() } } 
        });
        res.json({ success: true, msg: "Request Sent!" });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post("/update-status", async (req, res) => {
    const { teacherId, studentId, notificationId, newStatus } = req.body;
    try {
        // 1. Update Teacher Notification
        await Teacher.updateOne(
            { _id: teacherId, "notifications.id": Number(notificationId) },
            { $set: { "notifications.$.status": newStatus } }
        );

        // 2. Fetch Student Email
        const student = await Student.findById(studentId);
        
        // 3. Send Email using Transporter
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: student.email,
            subject: `Appointment Update: ${newStatus}`,
            text: `Hello ${student.name}, your appointment request has been ${newStatus}. Check your portal for details.`
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: "Status updated and email sent!" });
    } catch (err) {
        console.error("Email Error:", err);
        res.status(500).json({ success: false, error: "Status updated, but email failed." });
    }
});

// 🚀 SERVER
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on port ${PORT}`));