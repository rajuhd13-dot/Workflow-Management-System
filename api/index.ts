// api/index.ts
// Vercel runs this file as a serverless function.
// It imports the pre-compiled server bundle (built by vercel-build script via esbuild).
import handler from "./server-bundle.mjs";
export default handler;