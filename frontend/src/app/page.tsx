/**
 * Página de inicio de desarrollo
 */

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-primary to-primary/90 flex flex-col items-center justify-center p-4">
      <div className="text-center text-white space-y-8 max-w-2xl">
        <div>
          <h1 className="text-5xl font-bold mb-2">🏗️ ObraFirmada</h1>
          <p className="text-xl opacity-90">Plataforma de Firma de Documentos Laborales</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-8 space-y-4">
          <h2 className="text-2xl font-bold">Bienvenido al Desarrollo</h2>
          <p className="text-opacity-90">Sistema seguro de enrolamiento biométrico y firma de documentos para trabajadores en construcción.</p>
        </div>

        <div className="flex gap-4 justify-center flex-wrap">
          <a
            href="/enrollment"
            className="bg-secondary text-white px-8 py-3 rounded-lg font-bold hover:bg-orange-600 transition"
          >
            ➡️ Ir a Enrolamiento
          </a>
          <a
            href="http://localhost:3001/api"
            target="_blank"
            className="bg-white text-primary px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition"
          >
            📚 API Backend
          </a>
        </div>

        <div className="text-sm opacity-75 space-y-2">
          <p>🚀 Backend: http://localhost:3001</p>
          <p>🎨 Frontend: http://localhost:3000</p>
          <p>🗄️ Base de Datos: MySQL 8.0</p>
        </div>
      </div>
    </main>
  );
}
