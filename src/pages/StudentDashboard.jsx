import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  FiLogOut,
  FiUser,
  FiHome,
  FiCreditCard,
  FiX,
  FiUploadCloud,
  FiUsers,
  FiTool,
} from "react-icons/fi";
import toast from "react-hot-toast"; // NEW: Importing the toast library!
import { findBestRoomMatch } from "../RoomAllocationEngine";

function StudentDashboard() {
  const [studentData, setStudentData] = useState(null);
  const [roommates, setRoommates] = useState([]);
  const [myTickets, setMyTickets] = useState([]);

  // Modal States
  const [showHostelModal, setShowHostelModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedHostel, setSelectedHostel] = useState(null);

  // Form States
  const [tellerNumber, setTellerNumber] = useState("");
  const [tellerImage, setTellerImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ticket Form States
  const [ticketCategory, setTicketCategory] = useState("Electrical");
  const [ticketDescription, setTicketDescription] = useState("");

  const [quizAnswers, setQuizAnswers] = useState({
    sleep: 3,
    noise: 3,
    clean: 3,
    social: 3,
  });

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() };
          setStudentData(data);

          if (data.roomAssigned) {
            fetchRoommateData(data.roomAssigned, data.chosenHostel);
            fetchMyTickets(data.id);
          }
        }
      } else {
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const fetchRoommateData = async (roomNum, hostel) => {
    try {
      const q = query(
        collection(db, "rooms"),
        where("roomNumber", "==", roomNum),
        where("hostelName", "==", hostel),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setRoommates(snap.docs[0].data().occupants || []);
      }
    } catch (error) {
      console.error("Error fetching roommates:", error);
    }
  };

  const fetchMyTickets = async (studentId) => {
    try {
      const q = query(
        collection(db, "tickets"),
        where("studentId", "==", studentId),
      );
      const snap = await getDocs(q);
      setMyTickets(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching tickets:", error);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    navigate("/");
  };

  const getEligibleHostels = () => {
    if (!studentData) return [];

    const isNursing = (studentData.department || "")
      .toLowerCase()
      .includes("nursing");
    const isMale = (studentData.gender || "").toLowerCase() === "male";

    // Convert the string level (e.g., "300") to an actual number (300) for logic checks
    const studentLevel = parseInt(studentData.level || "0", 10);

    // MALE STUDENT LOGIC
    if (isMale) {
      if (studentLevel === 100 || studentLevel === 200) {
        return [
          {
            id: "maye",
            name: "Maye Hostel",
            capacity: "2-man Room",
            price: 98000,
          },
        ];
      } else if (studentLevel >= 300) {
        return [
          {
            id: "oyetade",
            name: "Oyetade Hostel",
            capacity: "3-man Room",
            price: 98000,
          },
        ];
      } else {
        return []; // Failsafe if level wasn't set correctly
      }
    }
    // FEMALE STUDENT LOGIC
    else {
      // Nursing Females (Any Level)
      if (isNursing) {
        return [
          {
            id: "adetola",
            name: "Adetola Hostel (Premium)",
            capacity: "Premium Suite",
            price: 150000,
          },
          {
            id: "moremi",
            name: "Moremi Hostel",
            capacity: "4-man Room",
            price: 98000,
          },
        ];
      }
      // Non-Nursing Females
      else {
        if (studentLevel === 100 || studentLevel === 200) {
          return [
            {
              id: "ioa",
              name: "IOA Hostel",
              capacity: "Standard Room",
              price: 98000,
            },
          ];
        } else if (studentLevel >= 300) {
          return [
            {
              id: "adeline",
              name: "Adeline Hostel",
              capacity: "2-man Room",
              price: 98000,
            },
          ];
        } else {
          return []; // Failsafe
        }
      }
    }
  };

  const handleHostelSelection = (hostel) => {
    setSelectedHostel(hostel);
    setShowHostelModal(false);
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!tellerImage)
      return toast.error("Please select an image of your teller.");
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("file", tellerImage);
      formData.append("upload_preset", "hostel_tellers");

      const cloudinaryUrl =
        "https://api.cloudinary.com/v1_1/dxuedg7vt/image/upload";
      const response = await fetch(cloudinaryUrl, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!data.secure_url) throw new Error("Failed to upload image.");

      const studentRef = doc(db, "users", studentData.id);
      await updateDoc(studentRef, {
        paymentStatus: "Pending",
        tellerNumber: tellerNumber,
        tellerImageUrl: data.secure_url,
        chosenHostel: selectedHostel.name,
        expectedAmount: selectedHostel.price,
      });

      setStudentData({
        ...studentData,
        paymentStatus: "Pending",
        chosenHostel: selectedHostel.name,
      });
      setShowPaymentModal(false);
      toast.success(`Teller for ${selectedHostel.name} uploaded successfully!`);
    } catch (error) {
      toast.error("Error submitting payment: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuizSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const lifestyleVector = [
        Number(quizAnswers.sleep),
        Number(quizAnswers.noise),
        Number(quizAnswers.clean),
        Number(quizAnswers.social),
      ];

      const roomsRef = collection(db, "rooms");
      const q = query(
        roomsRef,
        where("hostelName", "==", studentData.chosenHostel),
      );
      const roomSnapshot = await getDocs(q);

      const availableRooms = [];
      roomSnapshot.forEach((doc) => {
        availableRooms.push({ id: doc.id, ...doc.data() });
      });

      availableRooms.sort((a, b) =>
        a.roomNumber.localeCompare(b.roomNumber, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );

      const bestRoom = findBestRoomMatch(lifestyleVector, availableRooms);

      const roomRef = doc(db, "rooms", bestRoom.id);
      const newOccupants = [
        ...bestRoom.occupants,
        {
          id: studentData.id,
          name: studentData.fullName,
          department: studentData.department,
          lifestyleVector: lifestyleVector,
        },
      ];

      await updateDoc(roomRef, {
        occupants: newOccupants,
        currentOccupancy: bestRoom.currentOccupancy + 1,
      });

      const studentRef = doc(db, "users", studentData.id);
      await updateDoc(studentRef, {
        lifestyleVector: lifestyleVector,
        roomAssigned: bestRoom.roomNumber,
      });

      setStudentData({
        ...studentData,
        lifestyleVector: lifestyleVector,
        roomAssigned: bestRoom.roomNumber,
      });
      setRoommates(newOccupants);
      setShowQuizModal(false);
      toast.success(
        `Success! The AI has assigned you to ${bestRoom.roomNumber}.`,
      );
    } catch (error) {
      toast.error("AI Allocation Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, "tickets"), {
        studentId: studentData.id,
        studentName: studentData.fullName,
        hostelName: studentData.chosenHostel,
        roomNumber: studentData.roomAssigned,
        category: ticketCategory,
        description: ticketDescription,
        status: "Pending",
        dateSubmitted: new Date().toLocaleDateString(),
      });

      toast.success("Maintenance ticket submitted successfully!");
      setShowTicketModal(false);
      setTicketDescription("");
      fetchMyTickets(studentData.id);
    } catch (error) {
      toast.error("Error submitting ticket: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!studentData) return <div className="loading">Loading Profile...</div>;

  const currentPaymentStatus = studentData.paymentStatus || "Not Paid";

  // Dynamic class assignment for payment status
  const paymentStatusClass =
    currentPaymentStatus === "Approved"
      ? "status-approved"
      : currentPaymentStatus === "Pending"
        ? "status-pending-text"
        : "status-unpaid";

  const eligibleHostels = getEligibleHostels();

  return (
    <div className="dashboard-container">
      <main className="main-content">
        <header className="dashboard-header">
          <div>
            <h1>Student Portal</h1>
            <p>
              Welcome back, <strong>{studentData.fullName}</strong>
            </p>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <FiLogOut /> Logout
          </button>
        </header>

        <div className="stats-grid">
          <div className="stat-card">
            <FiUser className="stat-icon" />
            <h3>Profile Info</h3>
            <p>{studentData.matricNumber}</p>
            <p>{studentData.department}</p>
            <p>
              {studentData.level
                ? `${studentData.level} Level`
                : "Level Not Set"}
            </p>
            <p>{studentData.gender || "Gender Not Set"}</p>
          </div>

          <div className="stat-card">
            <FiHome className="stat-icon" />
            <h3>Hostel Status</h3>
            <p className="status-text-orange">
              {studentData.roomAssigned || "Not Assigned"}
            </p>
            {studentData.chosenHostel && (
              <p className="status-subtitle">
                Target: {studentData.chosenHostel}
              </p>
            )}
          </div>

          <div className="stat-card">
            <FiCreditCard className="stat-icon" />
            <h3>Payment Status</h3>
            <p className={paymentStatusClass}>{currentPaymentStatus}</p>
          </div>
        </div>

        {studentData.roomAssigned && (
          <div className="stat-card full-width-card">
            <div className="flex-between">
              <h3 className="flex-center-gap">
                <FiUsers className="icon-blue" /> My Roommates (
                {studentData.roomAssigned})
              </h3>

              <button
                onClick={() => setShowTicketModal(true)}
                className="danger-btn"
              >
                <FiTool /> Report Issue
              </button>
            </div>

            <div className="flex-wrap-gap">
              {roommates.map((mate, index) => (
                <div
                  key={index}
                  className={`roommate-card ${mate.id === studentData.id ? "active-user" : ""}`}
                >
                  <p className="text-bold">
                    {mate.name} {mate.id === studentData.id ? "(You)" : ""}
                  </p>
                  <p className="text-muted-small">{mate.department}</p>
                </div>
              ))}
              {roommates.length === 1 && (
                <p className="italic-muted">
                  You are the first occupant. Waiting for compatible
                  roommates...
                </p>
              )}
            </div>
          </div>
        )}

        {studentData.roomAssigned && myTickets.length > 0 && (
          <div className="stat-card full-width-card">
            <h3 className="flex-center-gap">
              <FiTool className="icon-blue" /> My Maintenance Tickets
            </h3>
            <div className="mt-15">
              {myTickets.map((ticket) => (
                <div key={ticket.id} className="ticket-item">
                  <div>
                    <h4 className="ticket-title">{ticket.category} Issue</h4>
                    <p className="text-muted-small">{ticket.description}</p>
                    <p className="ticket-date">
                      Submitted: {ticket.dateSubmitted}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`badge badge-${ticket.status.toLowerCase().replace(" ", "-")}`}
                    >
                      {ticket.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-20">
          {currentPaymentStatus === "Not Paid" && (
            <button
              className="apply-btn"
              onClick={() => setShowHostelModal(true)}
            >
              Step 1: Select Hostel & Pay
            </button>
          )}

          {currentPaymentStatus === "Pending" && (
            <div className="status-banner pending">
              Your payment teller is currently being reviewed by the Bursary.
            </div>
          )}

          {currentPaymentStatus === "Approved" &&
            !studentData.lifestyleVector && (
              <button
                className="apply-btn ai-btn"
                onClick={() => setShowQuizModal(true)}
              >
                Step 2: Take Roommate Matching Quiz
              </button>
            )}

          {currentPaymentStatus === "Approved" &&
            studentData.lifestyleVector &&
            !studentData.roomAssigned && (
              <div className="status-banner success-banner">
                Profile Complete! The AI is currently calculating your optimal
                roommate match.
              </div>
            )}
        </div>
      </main>

      {/* MODALS */}
      {showHostelModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h2>Select Your Preferred Hostel</h2>
              <button
                className="close-btn"
                onClick={() => setShowHostelModal(false)}
              >
                <FiX />
              </button>
            </div>
            <div className="modal-grid">
              {eligibleHostels.length === 0 ? (
                <p style={{ color: "red" }}>
                  Please update your Gender to see hostels.
                </p>
              ) : (
                eligibleHostels.map((hostel) => (
                  <div
                    key={hostel.id}
                    onClick={() => handleHostelSelection(hostel)}
                    className="hostel-card"
                  >
                    <div>
                      <h3 className="hostel-name">{hostel.name}</h3>
                      <p className="hostel-capacity">{hostel.capacity}</p>
                    </div>
                    <div className="text-right">
                      <p className="hostel-price">
                        ₦{hostel.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Upload Payment Teller</h2>
              <button
                className="close-btn"
                onClick={() => setShowPaymentModal(false)}
              >
                <FiX />
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit}>
              <div className="input-group">
                <label>Bank Teller Number</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    value={tellerNumber}
                    onChange={(e) => setTellerNumber(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="input-group">
                <label>Upload Teller Image</label>
                <div className="input-wrapper file-upload-wrapper">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setTellerImage(e.target.files[0])}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="login-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Uploading..." : "Submit to Bursary"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showQuizModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "500px" }}>
            <div className="modal-header">
              <h2>Roommate Compatibility Quiz</h2>
              <button
                className="close-btn"
                onClick={() => setShowQuizModal(false)}
              >
                <FiX />
              </button>
            </div>
            <form onSubmit={handleQuizSubmit}>
              <div className="input-group">
                <label>1. Sleep Schedule</label>
                <div className="input-wrapper custom-select-padded">
                  <select
                    className="custom-select"
                    style={{ width: "100%" }}
                    value={quizAnswers.sleep}
                    onChange={(e) =>
                      setQuizAnswers({ ...quizAnswers, sleep: e.target.value })
                    }
                  >
                    <option value="1">
                      1 - Very Early Bird (Asleep by 9 PM)
                    </option>
                    <option value="2">
                      2 - Early Bird (Asleep by 10-11 PM)
                    </option>
                    <option value="3">3 - Moderate (Asleep by Midnight)</option>
                    <option value="4">4 - Night Owl (Asleep by 1-2 AM)</option>
                    <option value="5">
                      5 - Extreme Night Owl (Awake till Dawn)
                    </option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label>2. Study Noise Tolerance</label>
                <div className="input-wrapper custom-select-padded">
                  <select
                    className="custom-select"
                    style={{ width: "100%" }}
                    value={quizAnswers.noise}
                    onChange={(e) =>
                      setQuizAnswers({ ...quizAnswers, noise: e.target.value })
                    }
                  >
                    <option value="1">1 - Absolute Silence Needed</option>
                    <option value="2">2 - Prefer Quiet</option>
                    <option value="3">
                      3 - Don't Mind Low Background Noise
                    </option>
                    <option value="4">
                      4 - Prefer Music/TV while Studying
                    </option>
                    <option value="5">5 - Unbothered by Loud Noise</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label>3. Cleanliness Habits</label>
                <div className="input-wrapper custom-select-padded">
                  <select
                    className="custom-select"
                    style={{ width: "100%" }}
                    value={quizAnswers.clean}
                    onChange={(e) =>
                      setQuizAnswers({ ...quizAnswers, clean: e.target.value })
                    }
                  >
                    <option value="1">1 - Very Messy</option>
                    <option value="2">2 - Somewhat Cluttered</option>
                    <option value="3">3 - Average Cleanliness</option>
                    <option value="4">4 - Very Neat & Organized</option>
                    <option value="5">5 - Absolute Neat Freak</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label>4. Social Preference</label>
                <div className="input-wrapper custom-select-padded">
                  <select
                    className="custom-select"
                    style={{ width: "100%" }}
                    value={quizAnswers.social}
                    onChange={(e) =>
                      setQuizAnswers({ ...quizAnswers, social: e.target.value })
                    }
                  >
                    <option value="1">
                      1 - Extreme Introvert (Keep to myself)
                    </option>
                    <option value="2">2 - Reserved</option>
                    <option value="3">3 - Friendly but need alone time</option>
                    <option value="4">4 - Outgoing</option>
                    <option value="5">
                      5 - Extreme Extrovert (Always have guests)
                    </option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="login-btn ai-btn full-width-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing..." : "Submit"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showTicketModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "500px" }}>
            <div className="modal-header">
              <h2>Report Maintenance Issue</h2>
              <button
                className="close-btn"
                onClick={() => setShowTicketModal(false)}
              >
                <FiX />
              </button>
            </div>
            <p className="modal-subtitle">
              Submit an issue for <strong>{studentData.roomAssigned}</strong>.
              It will be sent directly to the Hostel Administrator.
            </p>
            <form onSubmit={handleTicketSubmit}>
              <div className="input-group">
                <label>Issue Category</label>
                <div className="input-wrapper custom-select-padded">
                  <select
                    className="custom-select"
                    style={{ width: "100%" }}
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                  >
                    <option value="Electrical">
                      Electrical (Fan, Lights, Sockets)
                    </option>
                    <option value="Plumbing">
                      Plumbing (Tap, Toilet, Leaks)
                    </option>
                    <option value="Carpentry">
                      Carpentry (Bed, Door, Wardrobe)
                    </option>
                    <option value="Cleaning">Cleaning & Sanitation</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label>Description</label>
                <div className="input-wrapper" style={{ padding: 0 }}>
                  <textarea
                    className="ticket-textarea"
                    placeholder="Please describe the problem in detail..."
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="danger-btn full-width-btn"
                style={{ justifyContent: "center" }}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Ticket"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;
