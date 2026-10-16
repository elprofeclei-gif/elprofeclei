// Scratch (no se entrega): renderiza de verdad el armazón y la página de perfil con
// react-dom/server para comprobar que el árbol monta y qué marcado inicial produce.
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext';
import { Navbar } from '../src/components/Navbar';
import { ProfilePage } from '../src/pages/ProfilePage';
import { etiquetaRol } from '../src/services/users.service';
import { formatFecha } from '../src/utils/format';

const render = (ruta: string) =>
  renderToString(
    <MemoryRouter initialEntries={[ruta]}>
      <AuthProvider>
        <Navbar />
        <main>
          <ProfilePage />
        </main>
      </AuthProvider>
    </MemoryRouter>,
  );

const cuenta = (html: string, fragmento: string) => html.split(fragmento).length - 1;

const enPerfil = render('/perfil');
const enInicio = render('/');

console.log('--- marcado en /perfil (extracto del armazón) ---');
console.log(enPerfil.slice(0, 700));
console.log('\n--- comprobaciones ---');
console.log('header (landmark banner):', enPerfil.includes('<header'));
console.log(
  'nav aria-label="Navegación principal":',
  enPerfil.includes('aria-label="Navegación principal"'),
);
console.log('hamburguesa aria-expanded="false":', enPerfil.includes('aria-expanded="false"'));
console.log('hamburguesa aria-label:', enPerfil.includes('aria-label="Abrir menú de navegación"'));
console.log('hamburguesa oculta en md (clase md:hidden):', enPerfil.includes('md:hidden'));
console.log(
  'cajón no montado cuando está cerrado (role="dialog"):',
  cuenta(enPerfil, 'role="dialog"'),
);
console.log('botón de tema aria-pressed:', enPerfil.includes('aria-pressed="false"'));
console.log('botón de perfil aria-haspopup="menu":', enPerfil.includes('aria-haspopup="menu"'));
console.log('menú de perfil cerrado (role="menu"):', cuenta(enPerfil, 'role="menu"'));
console.log('perfil: estado de carga role="status":', enPerfil.includes('role="status"'));
console.log('perfil: texto para lectores de pantalla:', enPerfil.includes('Cargando tu perfil'));
console.log(
  'inicio: Marketplace con aria-current="page":',
  enInicio.includes('aria-current="page"'),
);
console.log(
  'inicio: enlaces de escritorio son md:flex:',
  enInicio.includes('hidden items-center gap-6 md:flex'),
);
console.log('\n--- funciones puras (ejecutadas) ---');
console.log(
  'etiquetaRol:',
  ['ADMIN', 'INSTRUCTOR', 'STUDENT', 'OTRO'].map((r) => `${r}=${etiquetaRol(r)}`).join(' | '),
);
console.log('formatFecha("2026-10-16T18:36:32.000Z"):', formatFecha('2026-10-16T18:36:32.000Z'));
