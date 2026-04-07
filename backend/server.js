const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require('dotenv').config(); 
const sendEmail = require('./utils/sendEmail'); 
const Tesseract = require('tesseract.js'); 

const app = express();
app.use(cors());
app.use(express.json());

// 🔗 Health Check Route
app.get("/", (req, res) => {
    res.send("Backend is Running Successfully!");
});

// 🔗 Database Connection (Render par process.env.MONGO_URI use karein)
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
        if (user) {
            res.json({ success: true, msg: "Welcome!", user });
        } else {
            res.json({ success: false, msg: "Invalid Credentials!" });
        }
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
        const { teacherId, studentName, studentId, message } = req.body;
        const teacher = await Teacher.findById(teacherId);
        
        if (!teacher) return res.status(404).json({ success: false, msg: "Teacher not found" });

        await Teacher.findByIdAndUpdate(teacherId, { 
            $push: { 
                notifications: { 
                    studentName, 
                    studentId, 
                    message, 
                    status: "pending", 
                    id: Date.now() 
                } 
            } 
        });

        await sendEmail({
            email: teacher.email, 
            subject: `Faculty Connect: New Request from ${studentName}`,
            message: `Hello Professor,\n\nYou have a new connection request on Faculty Connect.\n\nStudent Name: ${studentName}\nMessage: ${message || "I would like to connect regarding academic queries."}\n\nPlease log in to your dashboard to respond.`
        });

        res.json({ success: true, msg: "Request Sent & Email Delivered!" });

    } catch (err) { 
        console.error(err);
        res.status(500).json({ success: false, msg: "Server Error" }); 
    }
});

app.post("/update-status", async (req, res) => {
    try {
        const { teacherId, studentId, notificationId, newStatus } = req.body;
        const student = await Student.findById(studentId);
        const teacher = await Teacher.findById(teacherId);

        if (!student || !teacher) return res.status(404).json({ success: false, msg: "User details not found" });

        await Teacher.updateOne(
            { _id: teacherId, "notifications.id": Number(notificationId) },
            { $set: { "notifications.$.status": newStatus } }
        );

        await sendEmail({
            email: student.email,
            subject: `Meeting Request ${newStatus}: Faculty Connect`,
            message: `Hello ${student.name},\n\nYour meeting request with Prof. ${teacher.name} has been ${newStatus.toLowerCase()}.\n\nPlease check your dashboard for further details.`
        });

        res.json({ success: true, msg: `Status updated to ${newStatus} and email sent!` });
    } catch (err) {
        res.status(500).json({ success: false, msg: "Server Error" });
    }
});

app.post("/scan-timetable", async (req, res) => {
    try {
        const { teacherId, imageUrl } = req.body;
        const result = await Tesseract.recognize(imageUrl, 'eng');
        const extractedText = result.data.text;
        const timetableArray = extractedText.split('\n').filter(line => line.trim() !== "");

        await Teacher.findByIdAndUpdate(teacherId, { timetable: timetableArray });
        res.json({ success: true, msg: "Timetable Scanned!", data: timetableArray });
    } catch (err) {
        res.status(500).json({ success: false, msg: "OCR Scanning Failed" });
    }
}); // <--- Ye bracket aapke code mein missing tha!

// 🚀 SERVER START
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});