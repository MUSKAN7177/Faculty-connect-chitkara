const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
require('dotenv').config(); 

const app = express();
app.use(cors());
app.use(express.json());

// 📧 1. Nodemailer Configuration (Updated for Stability)
const transporter = nodemailer.createTransport({
    service: 'gmail', // Direct service use karne se stability badhti hai
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

// 📝 3. SCHEMAS (Updated with Gatepass & Medical Leave)

// Gatepass Schema
const GatepassSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    studentName: String,
    reason: String,
    outTime: String,
    status: { type: String, default: "Pending" }, // Pending, Approved, Rejected
    date: { type: Date, default: Date.now }
});

// Medical Leave Schema
const MedicalLeaveSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    studentName: String,
    illness: String,
    duration: String,
    documentLink: String, // Medical certificate link
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
const Gatepass = mongoose.model("Gatepass", GatepassSchema);
const MedicalLeave = mongoose.model("MedicalLeave", MedicalLeaveSchema);

// 🚀 4. NEW ROUTES (Gatepass & Medical Leave)

// Request Gatepass
app.post("/request-gatepass", async (req, res) => {
    try {
        const newGatepass = new Gatepass(req.body);
        await newGatepass.save();
        res.json({ success: true, msg: "Gatepass Request Sent!" });
    } catch (err) { res.status(500).json({ success: false }); }
});

// Approve/Reject Gatepass (With Email)
app.post("/update-gatepass", async (req, res) => {
    const { passId, status } = req.body;
    try {
        const pass = await Gatepass.findByIdAndUpdate(passId, { status }, { new: true }).populate('studentId');
        
        if (pass && pass.studentId.email) {
            const mailOptions = {
                from: "muskan7177.ca23@chitkara.edu.in",
                to: pass.studentId.email,
                subject: `Gatepass Status: ${status}`,
                text: `Hi ${pass.studentName},\n\nYour Gatepass request for "${pass.reason}" has been ${status}.\n\nRegards,\nChitkara University Admin`
            };
            transporter.sendMail(mailOptions);
        }
        res.json({ success: true, msg: `Gatepass ${status}` });
    } catch (err) { res.status(500).json({ success: false }); }
});

// Request Medical Leave
app.post("/request-medical", async (req, res) => {
    try {
        const newLeave = new MedicalLeave(req.body);
        await newLeave.save();
        res.json({ success: true, msg: "Medical Leave Request Submitted!" });
    } catch (err) { res.status(500).json({ success: false }); }
});

// 🚀 5. EXISTING AUTH & ACADEMIC ROUTES (Optimized)

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
        } else {
            res.json({ success: false, msg: "Invalid Credentials!" });
        }
    } catch (err) { res.status(500).json({ success: false, msg: "Server Error" }); }
});

// 📊 ACADEMIC ROUTES (With Email Alert)
app.post("/update-academics", async (req, res) => {
    try {
        const { studentId, attendance, marks } = req.body;
        const student = await Student.findByIdAndUpdate(studentId, { attendance, marks }, { new: true });

        if (student && Number(attendance) < 75) {
            const mailOptions = {
                from: "muskan7177.ca23@chitkara.edu.in",
                to: student.email,
                subject: "⚠️ Low Attendance Alert",
                text: `Hi ${student.name}, your attendance is ${attendance}%. Please maintain 75%.`
            };
            transporter.sendMail(mailOptions);
        }
        res.json({ success: true, msg: "Records updated!" });
    } catch (err) { res.status(500).json({ success: false }); }
});

// 📚 FETCH ROUTES
app.get("/gatepasses", async (req, res) => res.json(await Gatepass.find().sort({ date: -1 })));
app.get("/medical-leaves", async (req, res) => res.json(await MedicalLeave.find()));
app.get("/students", async (req, res) => res.json(await Student.find()));
app.get("/teachers", async (req, res) => res.json(await Teacher.find()));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));