import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

const About = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAboutContent = async () => {
      try {
        const response = await fetch("/science_and_ai_prompts/about.md");
        const text = await response.text();
        setContent(text);
      } catch (error) {
        console.error("Failed to load about content:", error);
        setContent("# About\n\nFailed to load content. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    loadAboutContent();
  }, []);

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
          {isLoading ? (
            <div className="text-center text-white/70">Loading...</div>
          ) : (
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-4xl font-bold text-white mb-6 text-center">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-2xl font-semibold text-emerald-400 mb-4 mt-8">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-xl font-semibold text-white mb-3 mt-6">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-lg leading-relaxed text-white/90 mb-4">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside space-y-2 text-white/90 mb-4">{children}</ul>
                  ),
                  li: ({ children }) => (
                    <li className="text-lg leading-relaxed">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="text-emerald-400 font-semibold">{children}</strong>
                  ),
                  a: ({ href, children }) => (
                    <a 
                      href={href} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 transition-colors underline"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default About;
