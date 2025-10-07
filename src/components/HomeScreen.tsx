import { Button } from "@/components/ui/button";

interface HomeScreenProps {
  onStartScan: () => void;
}

const HomeScreen = ({ onStartScan }: HomeScreenProps) => {
  return (
    <div className="flex flex-col min-h-screen text-center">
      <div className="flex-grow flex flex-col items-center justify-center px-4">
        <header className="mb-8">
          <h1 className="text-5xl font-bold text-white">Welfare</h1>
          <h2 className="text-4xl font-bold text-emerald-400">Footprint</h2>
        </header>
        <main className="w-full max-w-md">
          <p className="mb-8 text-lg text-gray-400">
            Instant AI-powered welfare analysis.
          </p>
          <Button 
            onClick={onStartScan}
            className="w-full max-w-xs bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-bold py-3 px-6 rounded-lg shadow-lg shadow-emerald-500/20"
          >
            Start Scan
          </Button>
        </main>
      </div>
      <footer className="w-full py-4 px-4">
        <p className="text-xs text-gray-500 whitespace-pre-line">
          {`Prototype – For Internal Use Only
Thanks for helping us test the Welfare Footprint App.

Future versions will use the Welfare Footprint Framework™;
this one uses general animal welfare knowledge to trial the technology.
Please keep it confidential — do not share or discuss outside this group.`}
        </p>
      </footer>
    </div>
  );
};

export default HomeScreen;
