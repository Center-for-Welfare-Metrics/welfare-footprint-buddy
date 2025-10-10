import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const About = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

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
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">
              {t('about.title')}
            </h1>
          </div>

          <div className="space-y-6 text-white/90">
            <p className="text-lg leading-relaxed">
              {t('about.intro')}
            </p>

            <p className="text-lg leading-relaxed">
              {t('about.projectDescription')}
            </p>

            <div className="border-t border-white/20 pt-6">
              <h2 className="text-2xl font-semibold text-emerald-400 mb-4">
                {t('about.disclaimerTitle')}
              </h2>
              
              <div className="space-y-4 text-white/80">
                <p className="leading-relaxed">
                  {t('about.disclaimerText1')}
                </p>
                
                <p className="leading-relaxed">
                  {t('about.disclaimerText2')}
                </p>
                
                <p className="leading-relaxed">
                  {t('about.disclaimerText3')}
                </p>
              </div>
            </div>

            <div className="border-t border-white/20 pt-6 text-center">
              <p className="text-lg font-semibold text-white mb-2">
                {t('about.developedBy')}
              </p>
              <p className="text-emerald-400 font-medium mb-1">
                {t('about.organizations')}
              </p>
              <a 
                href="https://www.welfarefootprint.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/70 hover:text-emerald-400 transition-colors"
              >
                {t('about.website')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
