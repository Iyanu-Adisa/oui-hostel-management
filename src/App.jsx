import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast"; // 1. Import the Toaster

// Import our pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentDashboard from "./pages/StudentDashboard";
import BursarDashboard from "./pages/BursarDashboard";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  return (
    <Router>
      <div className="app-container">
        {/* 2. Place the Toaster here, above the Routes! */}
        <Toaster position="top-center" />

        {/* The Routes act as our Traffic Controller */}
        <Routes>
          {/* Default route is the Login page */}
          <Route path="/" element={<Login />} />

          {/* Register route */}
          <Route path="/register" element={<Register />} />

          {/* Dashboard Routes */}
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/bursar" element={<BursarDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
