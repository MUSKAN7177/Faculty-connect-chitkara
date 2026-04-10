const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
require('dotenv').config(); 

const app = express();
app.use(cors());
app.use(express.json());

// 📧 Nodemailer Setup
// Note: Make sure process.env.EMAIL_PASS has your 16-character App Password
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS 
    }
});

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
    semester: [String],
    status: { type: String, default: "Available" },
    notifications: { type: Array, default: [] }, // Array of appointment objects
    ownTimetable: { type: Array, default: [] }
});

const StudentSchema = new mongoose.Schema({
    name: String, 
    rollNo: String, 
    email: String, 
    password: String, 
    department: String,
    semester: String,
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
    category: { type: String, default: 'note' }, 
    date: { type: Date, default: Date.now }
});

const Teacher = mongoose.model("Teacher", TeacherSchema);
const Student = mongoose.model("Student", StudentSchema);
const Notes = mongoose.model("Notes", NotesSchema);

// 🚀 AUTH ROUTES
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
        const lowerRole = role.toLowerCase();
        const Model = (lowerRole === "student") ? Student : Teacher;
        
        const user = await Model.findOne({ email, password });
        if (user) {
            const userData = user.toObject();
            delete userData.password;
            res.json({ success: true, user: userData });
        } else {
            res.json({ success: false, msg: "Invalid Credentials!" });
        }
    } catch (err) { res.status(500).json({ success: false, msg: "Server Error" }); }
});

app.post("/change-password", async (req, res) => {
    try {
        const { userId, role, newPassword } = req.body;
        const Model = (role.toLowerCase() === "student") ? Student : Teacher;
        const user = await Model.findByIdAndUpdate(userId, { password: newPassword });
        if (user) {
            res.json({ success: true, msg: "Password Updated Successfully!" });
        } else {
            res.json({ success: false, msg: "User not found!" });
        }
    } catch (err) { res.status(500).json({ success: false, msg: "Server Error" }); }
});

// 📊 ACADEMIC ROUTES (Attendance & Email Alerts)
app.post("/update-academics", async (req, res) => {
    try {
        const { studentId, attendance, marks } = req.body;
        const student = await Student.findById(studentId);
        
        await Student.findByIdAndUpdate(studentId, { attendance, marks });

        // Trigger email if attendance is low
        if (student && Number(attendance) < 75) {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: student.email,
                subject: "⚠️ Low Attendance Alert: Faculty Connect",
                text: `Hi ${student.name},\n\nYour current attendance is ${attendance}%. As per university rules, it must be above 75%. Please meet your HOD.\n\nRegards,\nFaculty Connect Team`
            };
            await transporter.sendMail(mailOptions);
        }
        res.json({ success: true, msg: "Records updated and processed!" });
    } catch (err) { 
        console.error("Academics Error:", err);
        res.status(500).json({ success: false }); 
    }
});

// 📩 APPOINTMENT & STATUS ROUTES
app.post("/send-request", async (req, res) => {
    try {
        const { teacherId, studentName, studentId, message } = req.body;
        await Teacher.findByIdAndUpdate(teacherId, { 
            $push: { notifications: { studentName, studentId, message, status: "pending", id: Date.now() } } 
        });
        res.json({ success: true, msg: "Request Sent to Faculty!" });
    } catch (err) { res.status(500).json({ success: false }); }
});

// NEW: Update Appointment Status & Send Confirmation Email
app.post("/update-status", async (req, res) => {
    const { teacherId, studentId, notificationId, newStatus } = req.body;
    try {
        // 1. Update the notification status inside Teacher document
        await Teacher.updateOne(
            { _id: teacherId, "notifications.id": Number(notificationId) },
            { $set: { "notifications.$.status": newStatus } }
        );

        // 2. Fetch student details to send email
        const student = await Student.findById(studentId);
        
        if (student && student.email) {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: student.email,
                subject: `Faculty Connect: Appointment ${newStatus}`,
                text: `Hello ${student.name},\n\nYour meeting request has been ${newStatus} by the faculty.\n\nPlease check your student dashboard for details.\n\nRegards,\nFaculty Connect Team`
            };
            await transporter.sendMail(mailOptions);
            res.json({ success: true, message: "Status updated and student notified via email!" });
        } else {
            res.json({ success: true, message: "Status updated locally (Email not found)." });
        }
    } catch (err) {
        console.error("Status Update Error:", err);
        res.status(500).json({ success: false, msg: "Server Error" });
    }
});

app.post("/teacher/update-live-status", async (req, res) => {
    try {
        await Teacher.findByIdAndUpdate(req.body.teacherId, { status: req.body.status });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 📚 DATA FETCH ROUTES
app.get("/students", async (req, res) => {
    try { res.json(await Student.find()); } catch(e) { res.json([]); }
});

app.get("/teachers", async (req, res) => {
    try { res.json(await Teacher.find()); } catch(e) { res.json([]); }
});

app.post("/notes", async (req, res) => {
    try {
        const newNote = new Notes(req.body);
        await newNote.save();
        res.json({ success: true, msg: "Shared Successfully!" });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.get("/notes", async (req, res) => {
    try { res.json(await Notes.find().sort({ date: -1 })); } catch (err) { res.status(500).json([]); }
});

// 🚀 SERVER START
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));