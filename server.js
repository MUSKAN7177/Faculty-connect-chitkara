const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
require('dotenv').config(); 

const app = express();
app.use(cors());
app.use(express.json());

// 📧 1. NODEMAILER CONFIGURATION
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || "muskan7177.ca23@chitkara.edu.in",
        pass: process.env.EMAIL_PASS || "ntwnciimormgudgg" 
    }
});

// 🛠️ 2. DATABASE CONNECTION
const dbURI = process.env.MONGO_URI || "mongodb+srv://muskanahuja:muskan78140@cluster0.auuqv3k.mongodb.net/BCA_Project?retryWrites=true&w=majority";
mongoose.connect(dbURI)
    .then(() => console.log("✅ MongoDB Atlas Connected"))
    .catch(err => console.log("❌ DB Connection Error:", err));

// 📝 3. SCHEMAS (Updated with New Features)
const ResourceSchema = new mongoose.Schema({
    teacherId: String,
    teacherName: String,
    title: String,
    subject: String,
    link: String,
    type: { type: String, enum: ['Note', 'Timetable', 'Announcement'], default: 'Note' },
    date: { type: Date, default: Date.now }
});

const TeacherSchema = new mongoose.Schema({
    name: String, 
    universityId: String, 
    email: String, 
    password: String, 
    department: String,
    status: { type: String, default: "Available" }, // Real-time Status
    cabin: { type: String, default: "Not Set" },
    lastUpdated: { type: Date, default: Date.now }
});

const StudentSchema = new mongoose.Schema({
    name: String, 
    rollNo: String, 
    email: String, 
    password: String, 
    department: String,
    semester: String,
    section: { type: String, default: "A" },
    attendance: { type: Number, default: 0 },
    marks: {
        st1: { type: Number, default: 0 },
        st2: { type: Number, default: 0 },
        assignment: { type: Number, default: 0 }
    }
});

const AppointmentSchema = new mongoose.Schema({
    studentId: String,
    studentName: String,
    teacherId: String,
    teacherName: String,
    reason: String,
    time: String,
    status: { type: String, default: "Pending" }
});

const Teacher = mongoose.model("Teacher", TeacherSchema);
const Student = mongoose.model("Student", StudentSchema);
const Appointment = mongoose.model("Appointment", AppointmentSchema);
const Resource = mongoose.model("Resource", ResourceSchema);

// 🚀 4. FINAL ROUTES

// --- 📈 FEATURE: Update Attendance & Marks + 75% Alert ---
app.post("/update-student-data", async (req, res) => {
    const { studentId, attendance, st1, st2, assignment, teacherName } = req.body;
    try {
        const updateData = {
            attendance: Number(attendance),
            'marks.st1': Number(st1),
            'marks.st2': Number(st2),
            'marks.assignment': Number(assignment)
        };
        
        const student = await Student.findByIdAndUpdate(studentId, updateData, { new: true });
        
        // AUTOMATIC 75% ATTENDANCE EMAIL ALERT
        if (Number(attendance) < 75) {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: student.email,
                subject: `⚠️ Low Attendance Warning - Faculty Connect`,
                text: `Dear ${student.name},\n\nYour attendance in the current semester is ${attendance}%, which is below the required 75%. Please meet Prof. ${teacherName} as soon as possible to avoid detention.`
            };
            await transporter.sendMail(mailOptions);
        }
        res.json({ success: true, student });
    } catch (e) { res.status(500).json({ success: false }); }
});

// --- 🤖 FEATURE: Faculty Status Sync (IoT Ready) ---
app.post("/update-faculty-status", async (req, res) => {
    const { teacherId, status } = req.body;
    try {
        await Teacher.findByIdAndUpdate(teacherId, { status, lastUpdated: Date.now() });
        res.json({ success: true, status });
    } catch (e) { res.status(500).json({ success: false }); }
});

// --- 📁 FEATURE: Resource & Timetable Upload ---
app.post("/upload-resource", async (req, res) => {
    try {
        const newResource = new Resource(req.body);
        await newResource.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get("/get-resources", async (req, res) => {
    try {
        const resources = await Resource.find().sort({ date: -1 });
        res.json(resources);
    } catch (e) { res.json([]); }
});

// --- 📅 APPOINTMENTS & CONFLICT DETECTION ---
app.post("/book-appointment", async (req, res) => {
    const { teacherId, time } = req.body;
    // Basic Conflict Check
    const existing = await Appointment.findOne({ teacherId, time, status: "Approved" });
    if (existing) {
        return res.json({ success: false, message: "This slot is already booked!" });
    }
    const apt = new Appointment(req.body);
    await apt.save();
    res.json({ success: true });
});

app.post("/update-appointment", async (req, res) => {
    const { aptId, status, studentEmail, teacherName } = req.body;
    try {
        await Appointment.findByIdAndUpdate(aptId, { status });
        
        // Notify Student via Email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: studentEmail,
            subject: `Appointment ${status} - Faculty Connect`,
            text: `Your appointment request with Prof. ${teacherName} has been ${status}. Please check your dashboard for details.`
        };
        await transporter.sendMail(mailOptions);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// --- 🔑 AUTH & UTILITY ROUTES ---
app.post("/login", async (req, res) => {
    const { email, password, role } = req.body;
    const Model = (role === "student") ? Student : Teacher;
    const user = await Model.findOne({ email, password });
    if (user) res.json({ success: true, user });
    else res.json({ success: false });
});

app.post("/signup", async (req, res) => {
    const Model = (req.body.role === "student") ? Student : Teacher;
    const newUser = new Model(req.body);
    await newUser.save();
    res.json({ success: true });
});

app.get("/teachers", async (req, res) => res.json(await Teacher.find()));

app.get("/students-by-class", async (req, res) => {
    const { semester, section } = req.query;
    res.json(await Student.find({ semester, section }));
});

// --- PORT SETUP ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Professional ERP Backend Running on Port ${PORT}`));