import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SpinWheelLauncher from "@/components/wheel/SpinWheelLauncher";
import "../globals.css";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      {children}
      <Footer />
      <SpinWheelLauncher />
    </>
  );
}
