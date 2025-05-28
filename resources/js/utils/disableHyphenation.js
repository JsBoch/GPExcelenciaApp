import { Font } from '@react-pdf/renderer';

// Desactiva la hipenación global
Font.registerHyphenationCallback((word) => [word]);
