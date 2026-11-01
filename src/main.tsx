import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {registerServiceWorker} from './pwa/registerServiceWorker';

// Mode atelier : une fois le build installé, l'application démarre hors ligne.
registerServiceWorker();

createRoot(document.getElementById('root')!).render(<App />);
