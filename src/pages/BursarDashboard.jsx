import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  writeBatch,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  FiLogOut,
  FiCheckCircle,
  FiGrid,
  FiDatabase,
  FiAlertTriangle,
  FiX,
} from "react-icons/fi";
import toast from "react-hot-toast";

function BursarDashboard() {
  const [bursarData, setBursarData] = useState(null);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState("payments");

  // --- NEW MODAL STATES ---
  const [showInitConfirm, setShowInitConfirm] = useState(false);
  const [selectedBlueprint, setSelectedBlueprint] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const navigate = useNavigate();

  const hostelBlueprints = [
    {
      name: "Maye Hostel",
      blocks: ["A", "B", "C", "D", "E", "F", "G"],
      roomsPerBlock: 24,
      capacity: 2,
    },
    {
      name: "Oyetade Hostel",
      // Compound 1 (A-E) and Compound 2 (A-F) merged into 11 distinct blocks
      blocks: [
        "C1-A",
        "C1-B",
        "C1-C",
        "C1-D",
        "C1-E",
        "C2-A",
        "C2-B",
        "C2-C",
        "C2-D",
        "C2-E",
        "C2-F",
      ],
      roomsPerBlock: 8, // Changed to 8 rooms per block
      capacity: 3, // 3-man room
    },
    {
      name: "Moremi Hostel",
      blocks: ["A", "B", "C", "D", "E"],
      roomsPerBlock: 20,
      capacity: 4,
    },
    {
      name: "Adeline Hostel",
      blocks: ["A", "B", "C", "D"],
      roomsPerBlock: 15,
      capacity: 2,
    },
    {
      name: "IOA Hostel",
      blocks: ["A", "B", "C", "D"],
      roomsPerBlock: 15,
      capacity: 2,
    },
    {
      name: "Adetola Hostel (Premium)",
      blocks: ["A", "B"],
      roomsPerBlock: 10,
      capacity: 1,
    },
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setBursarData({ id: docSnap.id, ...docSnap.data() });
        }
        fetchPendingPayments();
        fetchRooms();
      } else {
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const fetchPendingPayments = async () => {
    setIsLoading(true);
    try {
      const q = query(
        collection(db, "users"),
        where("paymentStatus", "==", "Pending"),
      );
      const querySnapshot = await getDocs(q);
      setPendingPayments(
        querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Failed to load pending payments.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "rooms"));
      setRooms(
        querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
  };

  // --- REFACTORED: Open modal instead of window.confirm ---
  const handleOpenInitModal = (blueprint) => {
    setSelectedBlueprint(blueprint);
    setShowInitConfirm(true);
  };

  const confirmInitialize = async () => {
    if (!selectedBlueprint) return;

    setShowInitConfirm(false);
    setIsLoading(true);
    const batch = writeBatch(db);
    const totalRooms =
      selectedBlueprint.blocks.length * selectedBlueprint.roomsPerBlock;

    try {
      let globalRoomCounter = 1;

      for (const block of selectedBlueprint.blocks) {
        for (let r = 1; r <= selectedBlueprint.roomsPerBlock; r++) {
          const roomRef = doc(collection(db, "rooms"));
          batch.set(roomRef, {
            hostelName: selectedBlueprint.name,
            block: block,
            roomNumber: `Block ${block} - Room ${globalRoomCounter}`,
            maxCapacity: Number(selectedBlueprint.capacity),
            currentOccupancy: 0,
            occupants: [],
          });
          globalRoomCounter++;
        }
      }
      await batch.commit();
      toast.success(
        `Successfully generated ${totalRooms} rooms for ${selectedBlueprint.name}`,
      );
      fetchRooms();
    } catch (error) {
      toast.error("Error generating rooms: " + error.message);
    } finally {
      setIsLoading(false);
      setSelectedBlueprint(null);
    }
  };

  // --- REFACTORED: Open modal instead of window.confirm ---
  const confirmResetAcademicYear = async () => {
    setShowResetConfirm(false);
    setIsLoading(true);

    try {
      const roomsSnapshot = await getDocs(collection(db, "rooms"));
      const roomDeletePromises = roomsSnapshot.docs.map((roomDoc) =>
        deleteDoc(doc(db, "rooms", roomDoc.id)),
      );
      await Promise.all(roomDeletePromises);

      const usersSnapshot = await getDocs(collection(db, "users"));
      const userUpdatePromises = usersSnapshot.docs.map((userDoc) => {
        const userData = userDoc.data();
        if (userDoc.id === bursarData.id) return Promise.resolve();

        return updateDoc(doc(db, "users", userDoc.id), {
          paymentStatus: "Not Paid",
          tellerNumber: "",
          tellerImageUrl: "",
          chosenHostel: "",
          expectedAmount: "",
          lifestyleVector: null,
          roomAssigned: "",
        });
      });
      await Promise.all(userUpdatePromises);

      toast.success(
        "System Reset Complete! Welcome to the new Academic Session.",
      );
      setRooms([]);
      fetchPendingPayments();
    } catch (error) {
      toast.error("Error during reset: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    navigate("/");
  };

  const handleApprove = async (studentId) => {
    try {
      await updateDoc(doc(db, "users", studentId), {
        paymentStatus: "Approved",
      });
      setPendingPayments(pendingPayments.filter((p) => p.id !== studentId));
      toast.success("Payment Approved successfully!");
    } catch (error) {
      toast.error("Error: " + error.message);
    }
  };

  const handleReject = async (studentId) => {
    try {
      await updateDoc(doc(db, "users", studentId), {
        paymentStatus: "Not Paid",
        tellerNumber: "",
        tellerImageUrl: "",
        chosenHostel: "",
        expectedAmount: "",
      });
      setPendingPayments(pendingPayments.filter((p) => p.id !== studentId));
      toast.success("Payment Rejected.");
    } catch (error) {
      toast.error("Error: " + error.message);
    }
  };

  const sortedRooms = [...rooms].sort((a, b) =>
    a.roomNumber.localeCompare(b.roomNumber, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );

  const groupedRooms = sortedRooms.reduce((acc, room) => {
    if (!acc[room.hostelName]) acc[room.hostelName] = [];
    acc[room.hostelName].push(room);
    return acc;
  }, {});

  if (!bursarData)
    return <div className="loading">Loading Bursar Portal...</div>;

  return (
    <div className="dashboard-container">
      <main className="main-content">
        <header className="dashboard-header">
          <div>
            <h1>Bursary Portal</h1>
            <p>
              Welcome, <strong>{bursarData.fullName}</strong>
            </p>
          </div>
          <div className="bursar-nav-buttons">
            <button
              onClick={() => setView("payments")}
              className={`nav-btn ${view === "payments" ? "active" : ""}`}
            >
              Verifications
            </button>
            <button
              onClick={() => setView("inventory")}
              className={`nav-btn ${view === "inventory" ? "active" : ""}`}
            >
              Inventory Management
            </button>
            <button onClick={handleLogout} className="logout-btn">
              <FiLogOut /> Logout
            </button>
          </div>
        </header>

        {view === "payments" ? (
          <section>
            <h2>Pending Teller Verifications</h2>
            <p className="text-muted-small mt-5 mb-20">
              {pendingPayments.length} student(s) waiting for clearance.
            </p>

            {isLoading ? (
              <p>Loading pending payments...</p>
            ) : pendingPayments.length === 0 ? (
              <div className="stat-card empty-state-card">
                <FiCheckCircle className="empty-state-icon" />
                <h3>All Caught Up!</h3>
              </div>
            ) : (
              <div className="payments-grid">
                {pendingPayments.map((student) => (
                  <div key={student.id} className="stat-card payment-card">
                    <h3 className="payment-card-title">{student.fullName}</h3>

                    <div className="payment-details-grid">
                      <p>
                        <strong>Matric:</strong>
                        <br />
                        {student.matricNumber}
                      </p>
                      <p>
                        <strong>Gender:</strong>
                        <br />
                        {student.gender || "Not Set"}
                      </p>
                      <p>
                        <strong>Target Hostel:</strong>
                        <br />
                        {student.chosenHostel || "N/A"}
                      </p>
                      <p>
                        <strong>Expected Amount:</strong>
                        <br />
                        <span className="amount-highlight">
                          ₦
                          {student.expectedAmount
                            ? student.expectedAmount.toLocaleString()
                            : "0"}
                        </span>
                      </p>
                      <p className="full-span">
                        <strong>Teller No:</strong> {student.tellerNumber}
                      </p>
                    </div>

                    <div className="teller-image-container">
                      {student.tellerImageUrl ? (
                        <a
                          href={student.tellerImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={student.tellerImageUrl}
                            alt="Bank Teller"
                            className="teller-image"
                          />
                        </a>
                      ) : (
                        <p className="text-muted-small">No Image Uploaded</p>
                      )}
                    </div>

                    <div className="action-buttons-row">
                      <button
                        onClick={() => handleApprove(student.id)}
                        className="btn-approve"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(student.id)}
                        className="btn-reject"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section>
            <h2>University Architecture Initialization</h2>
            <div className="stat-card setup-card">
              <h3 className="flex-center-gap mb-10">
                <FiDatabase /> Master Database Setup
              </h3>
              <p className="text-muted-small mb-15">
                Generate realistic room data based on the physical blocks of
                Oduduwa University.
              </p>

              <div className="setup-buttons-row">
                {hostelBlueprints.map((blueprint, index) => (
                  <button
                    key={index}
                    onClick={() => handleOpenInitModal(blueprint)}
                    className="apply-btn setup-btn"
                  >
                    Setup {blueprint.name} (
                    {blueprint.blocks.length * blueprint.roomsPerBlock} Rooms)
                  </button>
                ))}
              </div>
            </div>

            {Object.keys(groupedRooms).length === 0 ? (
              <p className="empty-rooms-text">
                No rooms have been initialized for this session yet.
              </p>
            ) : (
              Object.entries(groupedRooms).map(([hostelName, hostelRooms]) => (
                <div key={hostelName} className="mb-50">
                  <div className="hostel-section-header">
                    <h3 className="hostel-section-title">{hostelName}</h3>
                    <span className="hostel-section-count">
                      {hostelRooms.length} Rooms Total
                    </span>
                  </div>

                  <div className="stats-grid">
                    {hostelRooms.map((room) => (
                      <div key={room.id} className="stat-card">
                        <div className="flex-between">
                          <FiGrid className="icon-blue" />
                          <span
                            className={`occupancy-badge ${room.currentOccupancy >= room.maxCapacity ? "full" : "available"}`}
                          >
                            {room.currentOccupancy >= room.maxCapacity
                              ? "FULL"
                              : "AVAILABLE"}
                          </span>
                        </div>
                        <h4 className="mt-10">{room.roomNumber}</h4>
                        <p className="text-muted-small">{room.hostelName}</p>
                        <div className="mt-10">
                          <div className="flex-between text-muted-small">
                            <span>Occupancy</span>
                            <span>
                              {room.currentOccupancy} / {room.maxCapacity}
                            </span>
                          </div>
                          <div className="progress-bar-bg">
                            <div
                              className="progress-bar-fill"
                              style={{
                                width: `${(room.currentOccupancy / room.maxCapacity) * 100}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}

            <div className="danger-zone-card">
              <h3 className="danger-zone-title">
                <FiAlertTriangle /> Danger Zone
              </h3>
              <p className="danger-zone-text">
                Resetting the academic year will permanently delete all
                generated rooms, evict all students, and clear all payment
                tellers. Only do this at the start of a new session (or for
                testing).
              </p>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="apply-btn danger-btn mt-10"
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : "Reset Academic Year"}
              </button>
            </div>
          </section>
        )}
      </main>

      {/* --- CUSTOM INITIALIZE MODAL --- */}
      {showInitConfirm && selectedBlueprint && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{ maxWidth: "400px", textAlign: "center" }}
          >
            <div className="modal-header" style={{ justifyContent: "center" }}>
              <h2>Confirm Setup</h2>
            </div>
            <p
              style={{ color: "#34495e", margin: "20px 0", lineHeight: "1.5" }}
            >
              Initialize all{" "}
              <strong>
                {selectedBlueprint.blocks.length *
                  selectedBlueprint.roomsPerBlock}{" "}
                rooms
              </strong>{" "}
              for <strong>{selectedBlueprint.name}</strong> based on the
              physical block architecture?
            </p>
            <div style={{ display: "flex", gap: "15px", marginTop: "20px" }}>
              <button
                onClick={() => setShowInitConfirm(false)}
                className="apply-btn"
                style={{ flex: 1, background: "#7f8c8d" }}
              >
                Cancel
              </button>
              <button
                onClick={confirmInitialize}
                className="apply-btn"
                style={{ flex: 1, background: "#27ae60" }}
              >
                Yes, Initialize
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CUSTOM DANGER ZONE MODAL --- */}
      {showResetConfirm && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{ maxWidth: "450px", borderTop: "5px solid #e74c3c" }}
          >
            <div className="modal-header">
              <h2
                style={{
                  color: "#e74c3c",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <FiAlertTriangle /> WARNING: System Reset
              </h2>
              <button
                className="close-btn"
                onClick={() => setShowResetConfirm(false)}
              >
                <FiX />
              </button>
            </div>
            <p
              style={{ color: "#34495e", margin: "20px 0", lineHeight: "1.6" }}
            >
              Are you <strong>absolutely sure</strong> you want to reset the
              entire system? <br />
              <br />
              This will <strong>delete ALL rooms</strong> and clear{" "}
              <strong>ALL student hostel statuses</strong>. This action cannot
              be undone.
            </p>
            <div style={{ display: "flex", gap: "15px", marginTop: "20px" }}>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="apply-btn"
                style={{ flex: 1, background: "#7f8c8d" }}
              >
                Cancel
              </button>
              <button
                onClick={confirmResetAcademicYear}
                className="apply-btn danger-btn"
                style={{ flex: 1, justifyContent: "center" }}
              >
                Yes, Reset System
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BursarDashboard;
