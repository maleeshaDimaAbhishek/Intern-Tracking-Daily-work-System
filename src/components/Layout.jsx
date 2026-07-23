import Navbar from "./NavBar";
import Footer from "./Footer";        // ← ADD import

function Layout({ children }) {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-main">
        {children}
      </main>
      <Footer />
    </div>
  );
}

export default Layout;
