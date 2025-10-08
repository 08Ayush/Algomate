import Header from "./Header";
import Footer from "./Footer";
import LeftSidebar from "./LeftSidebar";
import FloatingTalkButton from "@/components/communication/FloatingTalkButton";
import { PropsWithChildren } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function AppLayout({ children }: PropsWithChildren) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col gradient-bg">
      <Header />
      <div className="flex flex-1">
        {isAuthenticated && <LeftSidebar />}
        <main className={`flex-1 transition-all duration-300 ${
          isAuthenticated ? 'lg:ml-16' : ''
        }`}>
          <div className={`container mx-auto py-8 px-4 lg:px-8 ${
            isAuthenticated ? 'lg:pl-8' : ''
          }`}>
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
      <Footer />
      <FloatingTalkButton />
    </div>
  );
}
