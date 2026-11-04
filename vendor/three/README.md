# vendor/three — Three.js empaqueté (hors ligne)

`threekit-r169.js` est généré, ne pas le modifier ni le lire à la main.
Il expose `window.THREEKIT` : `THREE`, `GLTFLoader`, `RoomEnvironment`, `Sky`,
`WebGLPathTracer`, `ProceduralEquirectTexture` (rendu photo de l'onglet Design).

Source : `three-entry.js`. Pour le régénérer (hors du dépôt, dans un dossier jetable) :

```bash
npm i three@0.169.0 three-mesh-bvh@0.7.8 three-gpu-pathtracer@0.0.23 esbuild@0.23.1 --legacy-peer-deps
npx esbuild three-entry.js --bundle --minify --format=iife --legal-comments=eof --outfile=threekit-r169.js
```

Versions figées : three-gpu-pathtracer 0.0.24 et suivantes exigent three ≥ 0.187.
Licences MIT conservées en fin de fichier.
