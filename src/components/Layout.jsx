import Navbar from "./NavBar";
import Footer from "./Footer";        // ← ADD import

function Layout({ children }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",        // ← pushes footer to bottom
    }}>
      <Navbar />
      <main style={{
        padding: "2rem",
        position: "relative",
        zIndex: 1,
        flex: 1,                      // ← takes remaining space
      }}>
        {children}
      </main>
      <Footer />                      {/* ← ADD footer */}
    </div>
  );
}

export default Layout;