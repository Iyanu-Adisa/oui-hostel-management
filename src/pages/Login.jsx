import { useState } from "react";
import { FiUser, FiLock } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import ouiLogo from "../assets/oui-logo.png";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import toast from "react-hot-toast";

function Login() {
  const [matricNumber, setMatricNumber] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    // This allows students to use matric (U/22...) and admins to use their prefix (admin)
    const cleanMatric = matricNumber.trim().toLowerCase().replace(/\//g, "");
    const firebaseEmail = `${cleanMatric}@oui.edu.ng`;

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        firebaseEmail,
        password.trim(),
      );
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const role = userDoc.data().role;
        toast.success("Welcome back!");

        if (role === "admin") navigate("/admin");
        else if (role === "bursar") navigate("/bursar");
        else navigate("/student");
      } else {
        toast.error("Profile not found. Please register.");
      }
    } catch (error) {
      toast.error("Invalid Credentials. Please check your ID and Password.");
    }
  };

  return (
    <div className="login-page">
      <div className="image-section">
        <div className="image-overlay"></div>
      </div>
      <div className="form-section">
        <div className="login-card">
          <div className="form-header">
            <img src={ouiLogo} alt="OUI Logo" className="school-logo" />
            <h2>OUI Hostel Portal</h2>
            <p>Welcome Back. Please log in to your account.</p>
          </div>
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label>University ID / Matric Number</label>
              <div className="input-wrapper">
                <FiUser className="input-icon" />
                <input
                  type="text"
                  placeholder="e.g. U/22/CS/0205 or admin"
                  value={matricNumber}
                  onChange={(e) => setMatricNumber(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="input-group">
              <label>Password</label>
              <div className="input-wrapper">
                <FiLock className="input-icon" />
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="login-btn">
              LOGIN
            </button>
          </form>
          <p className="auth-footer">
            Don't have a student account?{" "}
            <Link to="/register">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
