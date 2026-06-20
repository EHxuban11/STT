import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import AppCloud from "@/components/AppCloud";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Stats from "@/components/Stats";
import Privacy from "@/components/Privacy";
import FAQ from "@/components/FAQ";
import Download from "@/components/Download";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main id="top" className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      <AppCloud />
      <Features />
      <HowItWorks />
      <Stats />
      <Privacy />
      <FAQ />
      <Download />
      <Footer />
    </main>
  );
}
