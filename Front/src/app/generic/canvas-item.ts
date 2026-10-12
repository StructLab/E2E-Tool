import * as THREE from 'three';
import { CreateObject, DeleteObject, MoveObject, ValidateEngineering } from '../api/end_points';
import { NotificationService } from '../services/notification.service';
import { loadSVG } from '../assets/assetsServices/svg-loader';
import { getAxleCounterSvgString, getBaliseGroupSvgString, getBufferStop, getETCSmarkerSvgString, getTimingPointSvgString } from '../assets/assetsServices/svgs';

const PHYSICAL_ASSET_DISPLAY_FACTOR = 14;

export class CanvasItem {
  group: THREE.Group;

  constructor(group: THREE.Group, private notificationService: NotificationService, id?: string, create: boolean = false, src: string = "") {
    this.group = group;

    // store reference to this instance inside mesh
    this.group.userData["canvasItem"] = this;
    this.group.userData["draggable"] = true;
    this.group.userData["id"] = id ?? crypto.randomUUID();
    this.group.userData["type"] = src.includes("Switch") ? "Switch" : src.includes("AxleCounter") ? "AxleCounter" : src.includes("ETCSmarker") ? "ETCSmarker" : src.includes("BaliseGroup") ? "BaliseGroup" : "Unknown";

    if (create) {
      this.Create();
    }
  }

  Container() {
    return this;
  }

  async Create() {

    var result = await CreateObject(
      this.group.userData["id"],
      this.group.userData["type"],
      this.group.position.x,
      this.group.position.y
    ) as any;


    if (result.rotation !== undefined) {
      this.group.rotation.z = Rotation(result.rotation);
    }
  }
  Delete() {
    DeleteObject(this.group.userData["id"]);
  }
  async Move() {
    var result = await MoveObject(this.group.userData["id"], this.group.position.x, this.group.position.y) as any;
    
    
    var validation = await ValidateEngineering(this.group.userData["id"],this.notificationService);
    
    this.notificationService.notify({

      type: validation == true ? 'success' : `error`,
      text: validation == true ? 'Engineering validation: success' : `Engineering validation: error`,
      id: this.group.userData["id"],
      operation: "object moved"
    });

    this.notificationService.notify({
      type: "success",
      text: ``,
      content: [],
      operation: "timingPoint"
    });
    if (result.rotation !== undefined) {
      this.group.rotation.z = Rotation(result.rotation);
    }
  }
  UpdateDataBase() {

    console.log('Updating database with new position for item:', this.group.userData["id"], 'New position:', this.group.position);
  }
}

export function Rotation(rotation: number) {
  return THREE.MathUtils.degToRad(-(rotation - 90)) //-90 because the svgs are horizontaly aligned.
}

/**
 * Load a texture and create a plane mesh for Three.js
 * @param scene - The Three.js scene to add the mesh to
 * @param src - URL/path of the image (SVG, PNG, etc.)
 * @param baseHeight - Desired height of the plane (width auto-scales)
 * @param position - Position to place the mesh
 * @param notificationService - Optional service reference for CanvasItem
 * @param onMeshCreated - Optional callback after mesh is created
 */

type AssetStyle = {
  widthMeters: number;
  heightMeters: number;
  color: number;
  yOffsetFactor?: number;
};

function getAssetStyle(src: string): AssetStyle | null {

  if (src.includes("BaliseGroup")) {
    return {
      // One Eurobalise physical footprint approximation
      widthMeters: 0.45,
      heightMeters: 0.32,
      color: 0xfacc15,
      yOffsetFactor: 0
    };
  }

  if (src.includes("AxleCounter")) {
    return {
      // Placeholder physical footprint for rail-mounted axle counter sensor
      widthMeters: 0.23,
      heightMeters: 0.06,
      color: 0x9acd32,
      yOffsetFactor: 1
    };
  }

  if (src.includes("ETCSmarker")) {
    return {
      // ETCS marker board physical size
      widthMeters: 0.70,
      heightMeters: 0.70,
      color: 0x7c3aed,
      yOffsetFactor: 1.1
    };
  }

  if (src.includes("TimingPoint")) {
    return {
      // Placeholder until exact physical/planning definition is known
      widthMeters: 0.70,
      heightMeters: 0.70,
      color: 0xb794f4,
      yOffsetFactor: 1.1
    };
  }

  if (src.includes("BufferStop")) {
    return {
      // Placeholder physical footprint. This depends heavily on buffer-stop type.
      widthMeters: 0.60,
      heightMeters: 0.73,
      color: 0xef4444,
      yOffsetFactor: 0
    };
  }

  return null;
}

function applyPhysicalSize(
  group: THREE.Group,
  widthMeters: number,
  heightMeters: number
): void {
  // Start from original SVG size
  group.scale.set(1, 1, 1);
  group.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  box.getSize(size);

  if (size.x === 0 || size.y === 0) {
    console.warn('Cannot scale SVG because original size is zero');
    return;
  }

  const targetWidth = widthMeters * PHYSICAL_ASSET_DISPLAY_FACTOR;
  const targetHeight = heightMeters * PHYSICAL_ASSET_DISPLAY_FACTOR;

  const scaleX = targetWidth / size.x;
  const scaleY = targetHeight / size.y;

  group.scale.set(scaleX, scaleY, 1);
  group.updateMatrixWorld(true);
}

function applyAssetColor(group: THREE.Group, color: number, src: string): void {
  const isMarkerBoard =
    src.includes("ETCSmarker") ||
    src.includes("MarkerBoard");

  const CANVAS_BACKGROUND = 0x0f1720;

  group.traverse((child) => {
    const object = child as THREE.Object3D & {
      material?: THREE.Material | THREE.Material[];
    };

    if (!object.material) return;

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    materials.forEach((material) => {
      const mat = material as THREE.Material & {
        color?: THREE.Color;
        transparent?: boolean;
        opacity?: number;
        visible?: boolean;
      };

      if (!mat.color) return;

      const currentColor = mat.color;

      const isWhiteOrVeryLight =
        currentColor.r > 0.85 &&
        currentColor.g > 0.85 &&
        currentColor.b > 0.85;

      const isBlackOrDark =
        currentColor.r < 0.15 &&
        currentColor.g < 0.15 &&
        currentColor.b < 0.15;

      // Special case for marker board:
      // board becomes white, arrow becomes canvas-background color
      if (isMarkerBoard) {
        if (isBlackOrDark) {
          mat.color.setHex(0xffffff);
          mat.transparent = false;
          mat.opacity = 1;
          mat.visible = true;
          mat.needsUpdate = true;
          return;
        }

        if (isWhiteOrVeryLight) {
          mat.color.setHex(CANVAS_BACKGROUND);
          mat.transparent = false;
          mat.opacity = 1;
          mat.visible = true;
          mat.needsUpdate = true;
          return;
        }

        // fallback: make other marker parts white
        mat.color.setHex(0xffffff);
        mat.transparent = false;
        mat.opacity = 1;
        mat.visible = true;
        mat.needsUpdate = true;
        return;
      }

      // Other icons:
      // hide white backgrounds
      if (isWhiteOrVeryLight) {
        mat.transparent = true;
        mat.opacity = 0;
        mat.visible = false;
        mat.needsUpdate = true;
        return;
      }

      // make all actual symbol parts white
      mat.color.setHex(0xffffff);
      mat.transparent = false;
      mat.opacity = 1;
      mat.visible = true;
      mat.needsUpdate = true;
    });
  });
}

export function addIcon(
  scene: THREE.Scene,
  src: string,
  baseHeight: number,
  position: THREE.Vector3,
  rotation: number,
  notificationService?: any,
  onMeshCreated?: (mesh: THREE.Group) => void,
  createInBackEnd?: boolean,
  id?: string,
): void {

  let svgGroup = new THREE.Group();

  if (src.includes("BaliseGroup")) {
    svgGroup = loadSVG(getBaliseGroupSvgString(), scene);
  } else if (src.includes("AxleCounter")) {
    svgGroup = loadSVG(getAxleCounterSvgString(), scene);
  } else if (src.includes("ETCSmarker")) {
    svgGroup = loadSVG(getETCSmarkerSvgString(), scene);
  } else if (src.includes("TimingPoint")) {
    svgGroup = loadSVG(getTimingPointSvgString(), scene);
  } else if (src.includes("BufferStop")) {
    svgGroup = loadSVG(getBufferStop(), scene);
  } else {
    console.log('Unsupported SVG type for src:', src);
    return;
  }

  const style = getAssetStyle(src);

  if (!style) {
    console.log('No style found for src:', src);
    return;
  }

  svgGroup.position.copy(position);

  applyPhysicalSize(
    svgGroup,
    style.widthMeters,
    style.heightMeters
  );

  applyAssetColor(svgGroup, style.color, src);

  if (style.yOffsetFactor && style.yOffsetFactor !== 0) {
    const box = new THREE.Box3().setFromObject(svgGroup);
    const size = new THREE.Vector3();
    box.getSize(size);

    svgGroup.position.y += size.y * style.yOffsetFactor;
  }



  svgGroup.rotation.z = Rotation(rotation);

  // Store original physical/base scale
  svgGroup.userData['baseScale'] = svgGroup.scale.clone();
  new CanvasItem(svgGroup, notificationService, id, createInBackEnd, src);
  if (onMeshCreated) {
    onMeshCreated(svgGroup);
  }

  // textureLoader.load(src, (texture) => {
  //   const image = texture.image as HTMLImageElement; // TS type assertion
  //   const aspect = image.width / image.height;

  //   const width = baseHeight * aspect;

  //   const geometry = new THREE.PlaneGeometry(width, baseHeight);
  //   const material = new THREE.MeshBasicMaterial({
  //     map: texture,
  //     transparent: true,
  //     side: THREE.DoubleSide
  //   });

  //   const mesh = new THREE.Mesh(geometry, material);

  //   // Optional: wrap in CanvasItem if service provided
  //   if (notificationService) {

  //     new CanvasItem(mesh, notificationService, id, createInBackEnd,src);
  //   }

  //   mesh.position.copy(position);

  //   if (src.includes("AxleCounter")) {
  //     const height = geometry.parameters.height;

  //     // shift visualization only
  //     geometry.translate(0, height, 0);
  //   }
  //   if (src.includes("ETCSmarker")) {
  //     const height = geometry.parameters.height;

  //     // shift visualization only
  //     geometry.translate(0, height * 1.1, 0);
  //     // geometry.scale(1.5, 1.5, 1.5)
  //   }

  //   mesh.rotateZ(Rotation(rotation));
  //   scene.add(mesh);

  //   if (onMeshCreated) {
  //     onMeshCreated(mesh);
  //   }
  // });
}

export interface BaseItem {
  type: string;
  x: number;
  y: number;
  rotation: number;
  operation: string;
  id: string;
}

export interface SwitchItem extends BaseItem {
  type: "Switch";
  name: string
  points: { x: number; y: number }[];
}

export interface SvgItem extends BaseItem {
  type: string; // e.g. Signal, AxleCounter, etc.
}

export type DrawingItem = SwitchItem | SvgItem;