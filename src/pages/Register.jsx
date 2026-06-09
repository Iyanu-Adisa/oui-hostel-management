import { useState } from "react";
import {
  FiUser,
  FiLock,
  FiBookOpen,
  FiPhone,
  FiLayers,
  FiUsers,
} from "react-icons/fi";
import { useNavigate, Link } from "react-router-dom";
import ouiLogo from "../assets/oui-logo.png";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { auth, db } from "../firebase";
import toast from "react-hot-toast";

function Register() {
  const [fullName, setFullName] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    const cleanMatric = matricNumber.trim().toLowerCase().replace(/\//g, "");
    const firebaseEmail = `${cleanMatric}@oui.edu.ng`;

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        firebaseEmail,
        password.trim(),
      );
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        fullName,
        matricNumber: matricNumber.toUpperCase(),
        department,
        level,
        gender,
        phoneNumber: phone,
        email: firebaseEmail,
        role: "student",
        createdAt: new Date(),
      });

      toast.success(
        "Registration Successful! Please log in using your Matric Number.",
      );
      navigate("/");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
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
            <h2>Student Registration</h2>
            <p>Create your Oduduwa University accommodation profile.</p>
          </div>

          <form onSubmit={handleRegister}>
            <div className="input-group">
              <label>Full Name</label>
              <div className="input-wrapper">
                <FiUser className="input-icon" />
                <input
                  type="text"
                  placeholder="e.g. Akintayo Samson"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label>Matriculation Number</label>
              <div className="input-wrapper">
                <FiBookOpen className="input-icon" />
                <input
                  type="text"
                  placeholder="e.g. U/22/CS/0307"
                  value={matricNumber}
                  onChange={(e) => setMatricNumber(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label>Department</label>
                <div className="input-wrapper">
                  <FiBookOpen className="input-icon" />
                  <select
                    className="custom-select"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    required
                  >
                    <option value="">Select Dept.</option>
                    <option value="Accounting">Accounting</option>
                    <option value="Architecture">Architecture</option>
                    <option value="Banking & Finance">Banking & Finance</option>
                    <option value="Biochemistry">Biochemistry</option>
                    <option value="Biological Science">
                      Biological Science
                    </option>
                    <option value="Business Administration">
                      Business Administration
                    </option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Computer Engineering">
                      Computer Engineering
                    </option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Economics">Economics</option>
                    <option value="Electronic/Electrical Engineering">
                      Electronic/Electrical Engineering
                    </option>
                    <option value="Estate Management">Estate Management</option>
                    <option value="Industrial Chemistry">
                      Industrial Chemistry
                    </option>
                    <option value="International Relations">
                      International Relations
                    </option>
                    <option value="Law">Law</option>
                    <option value="Mass Communication/Media Technology">
                      Mass Comm. / Media Tech.
                    </option>
                    <option value="Mathematics and Statistics">
                      Mathematics and Statistics
                    </option>
                    <option value="Mechanical Engineering">
                      Mechanical Engineering
                    </option>
                    <option value="Microbiology">Microbiology</option>
                    <option value="Nursing Science">Nursing Science</option>
                    <option value="Physics">Physics</option>
                    <option value="Political Science">Political Science</option>
                    <option value="Public Administration">
                      Public Administration
                    </option>
                    <option value="Quantity Surveying">
                      Quantity Surveying
                    </option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label>Level</label>
                <div className="input-wrapper">
                  <FiLayers className="input-icon" />
                  <select
                    className="custom-select"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    required
                  >
                    <option value="">Select Level</option>
                    <option value="100">100 Level</option>
                    <option value="200">200 Level</option>
                    <option value="300">300 Level</option>
                    <option value="400">400 Level</option>
                    <option value="500">500 Level</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label>Gender</label>
                <div className="input-wrapper">
                  <FiUsers className="input-icon" />
                  <select
                    className="custom-select"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label>Phone Number</label>
                <div className="input-wrapper">
                  <FiPhone className="input-icon" />
                  <input
                    type="tel"
                    placeholder="08012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="input-group password-group">
              <label>Password (Use Matric Number for now)</label>
              <div className="input-wrapper">
                <FiLock className="input-icon" />
                <input
                  type="password"
                  placeholder="Use U/22/CS/..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "CREATING PROFILE..." : "COMPLETE REGISTRATION"}
            </button>
          </form>
          <p className="auth-footer">
            Already have an account? <Link to="/">Log in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
