import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

const About = () => {
  const navigate = useNavigate();
  
  const content = `## About the Welfare Footprint App

The **Welfare Footprint App** is an experimental tool designed to help users visualize the likely animal welfare impacts behind the foods they consume — especially those containing animal-derived ingredients.

It uses **AI-powered analysis** to interpret photos of food products, meals, or menus, identifying which animals were likely involved in the production process and describing the typical welfare conditions those animals may have experienced. This includes possible pain points such as confinement, painful procedures, or deprivation — as well as production system cues (e.g. conventional, free-range, or pasture-raised) when such information is available.

### Not an Official WFF Implementation (Yet)

While the App is inspired by the **Welfare Footprint Framework (WFF)** — a scientific methodology that quantifies animal experiences in terms of **Cumulative Pain and Cumulative Pleasure** — the current version **does not yet use WFF's validated data or metrics**. The app's analyses are **AI-guided approximations**, curated by the Welfare Footprint Institute to simulate how such evaluations might look in practice.

The ultimate goal is to integrate validated WFF datasets into the app, creating a robust, science-based bridge between rigorous animal welfare research and everyday consumer choices.

### Key Features

- **Image-based scanning**: Upload or photograph any food item or dish.
- **AI interpretation**: The app detects animal ingredients and analyzes likely welfare outcomes.
- **Ethical Lens**: Users can choose among five ethical priorities — from reducing the worst pain to fully avoiding animal use — which shape how the results are presented.
- **Multi-language support**: Available in 9 languages to serve a diverse, global audience.
- **Privacy-conscious**: User data is automatically cleaned and never stored without consent.

### Why This Matters

This app is part of a broader mission to make animal suffering — often invisible — more understandable and actionable. It serves as a **testing ground** for how AI, design, and ethical theory can be combined to communicate welfare information in emotionally resonant and scientifically responsible ways.

We welcome feedback from users, researchers, and developers to continue improving its accuracy, clarity, and usability.`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 p-4">
      <div className="container mx-auto max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6 text-white/70 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <div className="glass-card rounded-2xl p-8 space-y-8">
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-4xl font-bold text-white mb-6 text-center">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-2xl font-semibold text-accent mb-4 mt-8">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xl font-semibold text-white mb-3 mt-6">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="text-lg leading-relaxed text-foreground/90 mb-4">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-2 text-foreground/90 mb-4">{children}</ul>
                ),
                li: ({ children }) => (
                  <li className="text-lg leading-relaxed">{children}</li>
                ),
                strong: ({ children }) => (
                  <strong className="text-accent font-semibold">{children}</strong>
                ),
                a: ({ href, children }) => (
                  <a 
                    href={href} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent/80 transition-colors underline"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
