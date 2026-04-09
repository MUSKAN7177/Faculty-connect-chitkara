const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
require('dotenv').config(); 

const app = express();
app.use(cors());
app.use(express.json());

// 📧 Nodemailer Transporter Setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS 
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
        // Case-insensitive role check
        const Model = (role.toLowerCase() === "student") ? Student : Teacher;
        const newUser = new Model(details);
        await newUser.save();
        res.json({ success: true, msg: "Registration Successful!" });
    } catch (err) { res.status(500).json({ success: false, msg: err.message }); }
});

app.post("/login", async (req, res) => {
    try {
        const { email, password, role } = req.body;
        // Fix: Case-insensitive role comparison
        const lowerRole = role.toLowerCase();
        const Model = (lowerRole === "student") ? Student : Teacher;
        
        const user = await Model.findOne({ email, password });
        if (user) {
            // Send back user data without password for security
            const userData = user.toObject();
            delete userData.password;
            res.json({ success: true, user: userData });
        } else {
            res.json({ success: false, msg: "Invalid Credentials!" });
        }
    } catch (err) { res.status(500).json({ success: false, msg: "Server Error" }); }
});

// 📊 ACADEMIC & FILTERING ROUTES
app.get("/teachers/filter", async (req, res) => {
    const { dept, sem } = req.query;
    try {
        const teachers = await Teacher.find({ 
            department: dept, 
            semester: { $in: [sem] } 
        }, { password: 0 });
        res.json(teachers);
    } catch (err) { res.status(500).json([]); }
});

app.post("/update-academics", async (req, res) => {
    try {
        const { studentId, attendance, marks } = req.body;
        const student = await Student.findById(studentId);
        
        await Student.findByIdAndUpdate(studentId, { attendance, marks });

        if (Number(attendance) < 75) {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: student.email,
                subject: "⚠️ Low Attendance Alert: Faculty Connect",
                text: `Hi ${student.name}, your attendance is ${attendance}%. It must be above 75%.`
            };
            await transporter.sendMail(mailOptions);
        }
        res.json({ success: true, msg: "Records updated!" });
    } catch (err) { res.status(500).json({ success: false }); }
});

// 📚 NOTES & TEACHER TIMETABLE
app.post("/notes", async (req, res) => {
    try {
        const newNote = new Notes(req.body);
        // Fix: Changed newUser.save() to newNote.save()
        await newNote.save();
        res.json({ success: true, msg: "Shared Successfully!" });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post("/teacher/timetable", async (req, res) => {
    try {
        const { teacherId, schedule } = req.body;
        await Teacher.findByIdAndUpdate(teacherId, { ownTimetable: schedule });
        res.json({ success: true, msg: "Schedule Updated!" });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.get("/notes", async (req, res) => {
    try {
        const notes = await Notes.find().sort({ date: -1 });
        res.json(notes);
    } catch (err) { res.status(500).json([]); }
});

// 🏫 FACULTY STATUS & APPOINTMENTS
app.post("/update-status", async (req, res) => {
    const { teacherId, studentId, notificationId, newStatus } = req.body;
    try {
        await Teacher.updateOne(
            { _id: teacherId, "notifications.id": Number(notificationId) },
            { $set: { "notifications.$.status": newStatus } }
        );

        const student = await Student.findById(studentId);
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: student.email,
            subject: `Appointment Update: ${newStatus}`,
            text: `Hello ${student.name}, your appointment request has been ${newStatus}.`
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: "Email Sent!" });
    } catch (err) {
        res.status(500).json({ success: false });
    }
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

// 🚀 SERVER
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on port ${PORT}`));