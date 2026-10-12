import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';

let svgIndex = 1;
export function loadSVG(svgString: string, scene: THREE.Scene): THREE.Group {
  const loader = new SVGLoader();
  const data = loader.parse(svgString);

  // 🔥 Create ONE container object
  const svgGroup = new THREE.Group();

  data.paths.forEach(path => {

    const style = (path.userData as any)?.style;

    const fillColor = style?.fill ?? '#ffffff';
    const strokeColor = style?.stroke ?? '#000000';
    const opacity = style?.fillOpacity ?? 0.2;
    const shapes = path.toShapes(true);

    // -------------------
    // FILL
    // -------------------
    shapes.forEach(shape => {
      const geometry = new THREE.ShapeGeometry(shape);

      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(fillColor),
        transparent: opacity < 1,
        opacity: opacity,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geometry, material);

      svgGroup.add(mesh); // 👈 add to group instead of scene
    });

    // -------------------
    // STROKE
    // -------------------
    const points = path.subPaths.flatMap(sp => sp.getPoints());

    if (points.length > 0) {
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);

      const lineMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(strokeColor)
      });

      const line = new THREE.Line(lineGeo, lineMat);

      svgGroup.add(line); // 👈 add to group
    }
  });

  // add ONLY ONE object to scene
  scene.add(svgGroup);


  return svgGroup
}