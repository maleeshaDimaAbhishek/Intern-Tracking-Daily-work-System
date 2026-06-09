import logo from "../assets/logo.png";
import "./Footer.css";

function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="footer-logo">
                <img src={logo} alt="SLT Mobitel" className="footer-logo-img" />
            </div>
            <div className="footer-content">
                <p className="footer-text">
                    © {year} SLT Mobitel. Employee Management System. All rights reserved.
                </p>

            </div>
        </footer>
    );
}

export default Footer;