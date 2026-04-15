import { Leaf, Target, Users, Globe } from "lucide-react";

export default function AboutPage() {
  return (
    <div>
      <section className="py-20 bg-gradient-hero text-primary-foreground">
        <div className="container text-center">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">About cleancookIQ</h1>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto text-lg">
            Built to orchestrate Kenya's transition from polluting cooking fuels to clean alternatives at national scale.
          </p>
        </div>
      </section>

      <section className="py-16 container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-display font-bold mb-4">The Problem</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Over 90% of Kenyan institutions — schools, hospitals, prisons, and factories — still rely on polluting fuels like firewood and charcoal for cooking. The transition to clean cooking is stuck because demand is fragmented, supply is uncoordinated, and financing doesn't know where to go.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              There is no single trusted platform that brings all stakeholders together with verified data and clear pathways. Until now.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Target, label: "Mission", desc: "Transition every Kenyan institution to clean cooking" },
              { icon: Users, label: "Stakeholders", desc: "Institutions, providers, funders, government" },
              { icon: Leaf, label: "Impact", desc: "CO₂ reduction, health improvement, cost savings" },
              { icon: Globe, label: "Scale", desc: "47 counties, thousands of institutions" },
            ].map((item) => (
              <div key={item.label} className="bg-card border border-border rounded-xl p-5 shadow-card">
                <item.icon className="h-6 w-6 text-primary mb-3" />
                <h3 className="font-display font-semibold text-sm mb-1">{item.label}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
