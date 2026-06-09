import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  FiLogOut,
  FiTool,
  FiGrid,
  FiCheckCircle,
  FiClock,
  FiUser,
  FiPhone,
  FiBookOpen,
  FiX,
} from "react-icons/fi";
import toast from "react-hot-toast";

function AdminDashboard() {
  const [adminData, setAdminData] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [view, setView] = useState("tickets"); // Toggle: 'tickets', 'occupancy'
  const [isLoading, setIsLoading] = useState(true);

  const [selectedRoomDetails, setSelectedRoomDetails] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() };
          setAdminData(data);

          const targetHostel = data.assignedHostel || "Maye Hostel";
          fetchHostelData(targetHostel);
        }
      } else {
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const fetchHostelData = async (targetHostel) => {
    setIsLoading(true);
    try {
      const qTickets = query(
        collection(db, "tickets"),
        where("hostelName", "==", targetHostel),
      );
      const ticketSnap = await getDocs(qTickets);
      setTickets(ticketSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

      const qRooms = query(
        collection(db, "rooms"),
        where("hostelName", "==", targetHostel),
      );
      const roomSnap = await getDocs(qRooms);
      setRooms(roomSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

      const usersSnap = await getDocs(collection(db, "users"));
      const assignedStudents = usersSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter(
          (user) => user.chosenHostel === targetHostel && user.roomAssigned,
        );

      setStudents(assignedStudents);
    } catch (error) {
      console.error("Error fetching hostel data:", error);
      toast.error("Failed to fetch hostel data.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId, newStatus) => {
    try {
      await updateDoc(doc(db, "tickets", ticketId), {
        status: newStatus,
      });
      setTickets(
        tickets.map((t) =>
          t.id === ticketId ? { ...t, status: newStatus } : t,
        ),
      );
      toast.success(`Ticket marked as ${newStatus}!`);
    } catch (error) {
      toast.error("Error updating ticket: " + error.message);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    navigate("/");
  };

  const sortedRooms = [...rooms].sort((a, b) => {
    const roomA = a.roomNumber || "";
    const roomB = b.roomNumber || "";
    return roomA.localeCompare(roomB, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });

  if (!adminData) return <div className="loading">Loading Admin Portal...</div>;

  const targetHostel = adminData.assignedHostel || "Maye Hostel";

  return (
    <div className="dashboard-container">
      <main className="main-content">
        <header className="dashboard-header">
          <div>
            <h1>Hostel Master Portal</h1>
            <p>
              Welcome, <strong>{adminData.fullName}</strong>
            </p>
            <span className="admin-hostel-badge">
              Assigned to: {targetHostel}
            </span>
          </div>

          <div className="bursar-nav-buttons">
            <button
              onClick={() => setView("tickets")}
              className={`nav-btn flex-center-gap ${view === "tickets" ? "active" : ""}`}
            >
              <FiTool /> Maintenance Desk
            </button>
            <button
              onClick={() => setView("occupancy")}
              className={`nav-btn flex-center-gap ${view === "occupancy" ? "active" : ""}`}
            >
              <FiGrid /> Room Inventory
            </button>
            <button onClick={handleLogout} className="logout-btn">
              <FiLogOut /> Logout
            </button>
          </div>
        </header>

        {view === "tickets" && (
          <section>
            <h2>{targetHostel} - Maintenance Tickets</h2>
            <p className="text-muted-small mb-20">
              Review and manage facility issues reported by students in your
              building.
            </p>

            {isLoading ? (
              <p>Loading tickets...</p>
            ) : tickets.length === 0 ? (
              <div className="stat-card empty-state-card">
                <FiCheckCircle className="empty-state-icon" />
                <h3>All Clear!</h3>
                <p className="text-muted-small">
                  No maintenance issues reported in {targetHostel}.
                </p>
              </div>
            ) : (
              <div className="modal-grid">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className={`stat-card ticket-card border-${ticket.status.toLowerCase().replace(" ", "-")}`}
                  >
                    <div
                      className="flex-between"
                      style={{ alignItems: "flex-start" }}
                    >
                      <div>
                        <h3 className="ticket-title">{ticket.roomNumber}</h3>
                        <p className="text-muted-small mb-5">
                          <strong>Student:</strong> {ticket.studentName}
                        </p>
                        <p className="text-muted-small mb-5">
                          <strong>Category:</strong> {ticket.category}
                        </p>
                        <p className="ticket-date mb-15">
                          <strong>Date:</strong> {ticket.dateSubmitted}
                        </p>
                      </div>
                      <div>
                        <span
                          className={`status-badge-${ticket.status.toLowerCase().replace(" ", "-")}`}
                        >
                          {ticket.status}
                        </span>
                      </div>
                    </div>

                    <div className="complaint-box">
                      <p className="text-bold">Complaint:</p>
                      <p className="mt-5" style={{ color: "#333" }}>
                        {ticket.description}
                      </p>
                    </div>

                    <div className="action-buttons-row">
                      {ticket.status === "Pending" && (
                        <button
                          onClick={() =>
                            updateTicketStatus(ticket.id, "In Progress")
                          }
                          className="btn-in-progress"
                        >
                          <FiClock /> Mark In Progress
                        </button>
                      )}
                      {ticket.status !== "Resolved" && (
                        <button
                          onClick={() =>
                            updateTicketStatus(ticket.id, "Resolved")
                          }
                          className="btn-resolved"
                        >
                          <FiCheckCircle /> Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {view === "occupancy" && (
          <section>
            <h2>{targetHostel} - Room Inventory</h2>
            <p className="text-muted-small mb-20">
              Live overview of all rooms.{" "}
              <strong>Click on any room to view occupant details.</strong>
            </p>

            {sortedRooms.length === 0 ? (
              <p>No rooms initialized for this hostel.</p>
            ) : (
              <div className="stats-grid">
                {sortedRooms.map((room) => {
                  const occupantsList = room.occupants || [];
                  return (
                    <div
                      key={room.id}
                      className="stat-card room-inventory-card"
                      onClick={() => setSelectedRoomDetails(room)}
                    >
                      <div className="flex-between mb-10">
                        <h4 style={{ margin: 0 }} className="icon-blue">
                          {room.roomNumber}
                        </h4>
                        <span
                          className={`occupancy-badge ${room.currentOccupancy >= room.maxCapacity ? "full-bg" : "available-bg"}`}
                        >
                          {room.currentOccupancy} / {room.maxCapacity} Beds
                        </span>
                      </div>

                      <div className="mt-10">
                        {occupantsList.length === 0 ? (
                          <p
                            className="italic-muted"
                            style={{ fontSize: "13px", margin: 0 }}
                          >
                            Empty Room
                          </p>
                        ) : (
                          <p
                            style={{
                              fontSize: "13px",
                              color: "#34495e",
                              margin: 0,
                              fontWeight: "bold",
                            }}
                          >
                            {occupantsList.length} Student(s) Inside &rarr;
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* --- ROOM DETAILS MODAL --- */}
        {selectedRoomDetails && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: "650px" }}>
              <div className="modal-header">
                <h2>{selectedRoomDetails.roomNumber} - Occupants</h2>
                <button
                  className="close-btn"
                  onClick={() => setSelectedRoomDetails(null)}
                >
                  <FiX />
                </button>
              </div>

              <div className="mt-20">
                {selectedRoomDetails.occupants.length === 0 ? (
                  <div className="empty-room-box">
                    <p>This room is currently empty.</p>
                  </div>
                ) : (
                  <div className="modal-grid">
                    {selectedRoomDetails.occupants.map((occ) => {
                      const fullStudentData =
                        students.find((s) => s.id === occ.id) || {};

                      return (
                        <div key={occ.id} className="student-details-card">
                          <h3
                            className="mb-10 text-dark"
                            style={{ color: "#2c3e50" }}
                          >
                            {occ.name}
                          </h3>
                          <div className="student-details-grid">
                            <p className="flex-center-gap text-muted-small">
                              <FiUser className="icon-blue" />{" "}
                              <strong>Matric:</strong>{" "}
                              {fullStudentData.matricNumber || "N/A"}
                            </p>
                            <p className="flex-center-gap text-muted-small">
                              <FiBookOpen style={{ color: "#f39c12" }} />{" "}
                              <strong>Level:</strong>{" "}
                              {fullStudentData.level || "Not specified"}
                            </p>
                            <p className="flex-center-gap text-muted-small">
                              <FiGrid style={{ color: "#8e44ad" }} />{" "}
                              <strong>Dept:</strong>{" "}
                              {fullStudentData.department || occ.department}
                            </p>
                            <p className="flex-center-gap text-muted-small">
                              <FiPhone style={{ color: "#27ae60" }} />{" "}
                              <strong>Phone:</strong>{" "}
                              {fullStudentData.phoneNumber || "N/A"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
