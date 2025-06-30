import { Prism } from 'prism-react-renderer';

// Make Prism available globally for loading additional languages
if (typeof global !== 'undefined') {
  (global as any).Prism = Prism;
} else if (typeof window !== 'undefined') {
  (window as any).Prism = Prism;
}

export default Prism;
