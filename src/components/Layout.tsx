import Navbar from "./Navbar";
import BackgroundServices from "./BackgroundServices";
import DoctorAIChat from "./DoctorAIChat";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-medical-black relative overflow-hidden">
      <BackgroundServices />
      {/* Background accents */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 rounded-full bg-medical-blue/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 rounded-full bg-medical-cyan/10 blur-3xl pointer-events-none" />
      
      <Navbar />
      <main className="flex-1 relative z-10 w-full pt-0">
        {children}
      </main>
      <DoctorAIChat />
    </div>
  );
}
