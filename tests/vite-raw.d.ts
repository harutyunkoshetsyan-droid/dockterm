/** Allow `import foo from '*.svg?raw'` to typecheck under tsconfig.node.json
 *  (vite/client normally provides this, but the node tsconfig only has @types/node). */
declare module '*?raw' {
  const content: string
  export default content
}
