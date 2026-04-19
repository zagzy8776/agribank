import { Nav } from "@/components/agribank/Nav";
import { Hero } from "@/components/agribank/Hero";
import { Accounts } from "@/components/agribank/Accounts";
import { Tools } from "@/components/agribank/Tools";
import { CardShowcase } from "@/components/agribank/CardShowcase";
import { Trust } from "@/components/agribank/Trust";
import { Pricing } from "@/components/agribank/Pricing";
import { CTA } from "@/components/agribank/CTA";
import { Footer } from "@/components/agribank/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main>
        <Hero />
        <Accounts />
        <Tools />
        <CardShowcase />
        <Trust />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
