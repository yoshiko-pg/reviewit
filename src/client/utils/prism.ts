import { Prism } from 'prism-react-renderer';

// Make Prism available globally for loading additional languages
if (typeof global !== 'undefined') {
  global.Prism = Prism;
} else if (typeof window !== 'undefined') {
  window.Prism = Prism;
}

export default Prism;
