import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-gray-900 mb-4">
              Welcome to <span className="text-blue-600">NexusCore</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              The Ultimate Node.js & React Boilerplate
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-2">Modular Architecture</h3>
                <p className="text-gray-600">
                  Plugin-based module system with auto-discovery
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-2">Event-Driven</h3>
                <p className="text-gray-600">
                  Decoupled modules via EventBus pattern
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-2">Production Ready</h3>
                <p className="text-gray-600">
                  Caching, logging, error handling out of the box
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App;
