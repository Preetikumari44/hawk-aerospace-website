/**
 * Auto-localization Babel plugin.
 *
 * Rewrites every `import { Text, TextInput } from 'react-native'` (and
 * 'react-native-web') in application source into an import from the
 * auto-translating wrapper module `src/i18n/localText`. Other named imports
 * (View, StyleSheet, ...) stay untouched.
 *
 * This makes translation deterministic on BOTH native and web — no runtime
 * monkey-patching, no module-interop dependence. Every current and future
 * file that uses <Text>/<TextInput> is covered automatically.
 *
 * Files inside `src/i18n` are skipped so the wrapper can import the real
 * Text/TextInput from 'react-native'.
 */
const path = require('path');
const t = require('@babel/types');

module.exports = function localizedTextBabelPlugin() {
  return {
    name: 'localized-text',
    visitor: {
      Program(programPath, state) {
        const rawFilename = state.file.opts.filename || state.filename;
        if (!rawFilename) {
          return;
        }
        const filename = path.resolve(rawFilename).replace(/\\/g, '/');
        // Never rewrite third-party library code or the i18n wrapper itself.
        if (filename.indexOf('/node_modules/') !== -1) {
          return;
        }
        if (filename.indexOf('/src/i18n/') !== -1) {
          return;
        }

        const cwd = process.cwd().replace(/\\/g, '/');
        const localTextPath = path.join(cwd, 'src', 'i18n', 'localText');

        let needText = false;
        let needTextInput = false;

        programPath.traverse({
          ImportDeclaration(importPath) {
            const source = importPath.node.source && importPath.node.source.value;
            if (source !== 'react-native' && source !== 'react-native-web') {
              return;
            }
            const specifiers = importPath.node.specifiers;
            if (!specifiers || specifiers.length === 0) {
              return;
            }

            let text = false;
            let textInput = false;
            const keep = [];

            for (const spec of specifiers) {
              if (
                spec.type === 'ImportSpecifier' &&
                spec.importKind !== 'type' &&
                spec.imported.type === 'Identifier'
              ) {
                const imported = spec.imported.name;
                const local = spec.local.name;
                if (imported === 'Text' && local === 'Text') {
                  text = true;
                  continue;
                }
                if (imported === 'TextInput' && local === 'TextInput') {
                  textInput = true;
                  continue;
                }
              }
              keep.push(spec);
            }

            if (!text && !textInput) {
              return;
            }
            if (text) {
              needText = true;
            }
            if (textInput) {
              needTextInput = true;
            }

            importPath.node.specifiers = keep;
            if (keep.length === 0) {
              importPath.remove();
            }
          },
        });

        if (!needText && !needTextInput) {
          return;
        }

        const dir = path.dirname(filename).replace(/\\/g, '/');
        let rel = path.relative(dir, localTextPath).replace(/\\/g, '/');
        if (rel.charAt(0) !== '.') {
          rel = './' + rel;
        }

        const names = [];
        if (needText) {
          names.push('Text');
        }
        if (needTextInput) {
          names.push('TextInput');
        }

        const declaration = t.importDeclaration(
          names.map((name) => t.importSpecifier(t.identifier(name), t.identifier(name))),
          t.stringLiteral(rel),
        );
        programPath.node.body.unshift(declaration);
      },
    },
  };
};
