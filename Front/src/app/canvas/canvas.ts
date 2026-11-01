import {
  Component,
  ElementRef,
  ViewChild,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';

import * as THREE from 'three';
import { CanvasSceneService } from './canvasServices/canvas-scene.service';
import { SwitchesDawingService } from './canvasServices/switches-drawing.service';
import { RailwayGeometryService,type GeometryEndInfo } from './canvasServices/railway-geometry.service';
import { Subscription } from 'rxjs';
import { EventService } from '../event.service';
import { Guide } from "../guide/guide";
import { NotificationService } from '../services/notification.service';
import { AfterViewInit } from '@angular/core';
//import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreateLine, MoveObject, ValidateEngineering } from '../api/end_points';
import { CanvasSelectionService } from './canvasServices/canvas-selection';
import { PolylineDrawingService } from './canvasServices/polyline-drawing.service';
import { CanvasAssetService } from './canvasServices/canvas-asset.service';
import { IconScaleService } from './canvasServices/icon-scale.service';

@Component({
  selector: 'app-canvas',
  standalone: true,
  templateUrl: './canvas.html',
  styleUrls: ['./canvas.css'],
  imports: [CommonModule, FormsModule],
})
export class Canvas implements OnDestroy, AfterViewInit {
  @ViewChild('canvasEl', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('container', { static: true }) container!: ElementRef<HTMLDivElement>;
  @ViewChild('scrollWrapper', { static: true }) scrollWrapper!: ElementRef<HTMLDivElement>;
  public allSteps = [
    'Step 1: To get started, click on the "Import" button to load your track data into the canvas.',
    'Step 2: Start planning your track layout by clicking on the Plan button.',
    'Step 3: Move an axle counter by dragging (left mouse down) it to the desired location and notice the engineering validation.',
    'Step 4: Add timing points to your track layout by clicking on the "Add Timing Point" then left click on an ETCSmarker button.',
    'Step 5: Add segment profiles to your track layout by clicking on the "Add Segment Profile" then left click on a segment.',
    'Step 6: Generate Telegram content by clicking on a BaliseGroup.',
    'Step 7: Export the content of the plan to EAR ontology defined RDF.',
  ];
  public mySteps = this.allSteps.slice(0, 1); // Start with the first step
  private sub!: Subscription;
  private initialized = false;
  public isDrawingLine = false;

  public isDrawingCircle = false;
  private circleCenterPoint: THREE.Vector3 | null = null;
  private previewCircle: THREE.Line | null = null;

  public isDrawingCurve = false;
  private curveStartPoint: THREE.Vector3 | null = null;
  private curveControlPoint: THREE.Vector3 | null = null;
  private previewCurve: THREE.Line | null = null;

  public isDrawingArc = false;
  private arcStartPoint: THREE.Vector3 | null = null;

  public isArcRadiusBoxVisible = false;
  public arcRadiusInput = '';

  public isDrawingClothoid = false;
  private clothoidStartPoint: THREE.Vector3 | null = null;
  private clothoidDirectionPoint: THREE.Vector3 | null = null;
  private clothoidStartAngle = 0;
  private previewClothoid: THREE.Line | null = null;

  public isClothoidBoxVisible = false;

  public clothoidLengthInput = '80';
  public clothoidRadiusInput = '300';
  public clothoidDirectionInput: 'CW' | 'CCW' = 'CCW';

  public transitionCurveTypeInput:
    | 'clothoid'
    | 'cubicParabola'
    | 'bloss'
    | 'cosine'
    | 'sine'
    | 'biquadraticParabola'
    | 'wienerBogen' = 'clothoid';

  private isDraggingClothoidBox = false;

  private clothoidBoxDragOffset = {
    x: 0,
    y: 0
  };

  public clothoidBoxScreen = {
    left: 0,
    top: 0
  };

  public arcRadiusBoxScreen = {
    left: 0,
    top: 0
  };

  public isDrawingPolyline = false;

  private polylinePoints: THREE.Vector3[] = [];
  private activePolyline: THREE.Line | null = null;
  private previewPolylineSegment: THREE.Line | null = null;

  // Polyline dynamic length/angle input box
  public isPolylineInputBoxVisible = false;

  public polylineLengthInput = '';
  public polylineAngleInput = '';

  public livePolylineLength = '0';
  public livePolylineAngle = '0';

  public polylineSegmentMode: 'line' | 'transition' | 'finish' = 'line';

  private isAddingPolylineTransition = false;
  private polylineTransitionStartPoint: THREE.Vector3 | null = null;
  private polylineTransitionStartAngle = 0;

  public polylineHudScreen = {
    left: 0,
    top: 0
  };



  public transitionPopupVisible = false;

  public transitionPopupScreen = {
    left: 0,
    top: 0
  };

  private pendingTransitionArcA: THREE.Line | null = null;
  private pendingTransitionArcB: THREE.Line | null = null;

  private pendingTransitionArcAEndKind: 'start' | 'end' | null = null;
  private pendingTransitionArcBEndKind: 'start' | 'end' | null = null;

  private readonly ARC_ENDPOINT_CLICK_TOLERANCE_PX = 35;
  private readonly NEARBY_ARC_ENDPOINT_TOLERANCE_PX = 100;

  private selectedCurve: THREE.Line | null = null;
  private curveHandleGroup: THREE.Group | null = null;

  private isDraggingCurveHandle = false;
  private activeCurveHandleKind: 'start' | 'control' | 'end' | null = null;

  private dragStartMousePoint = new THREE.Vector3();
  private dragStartAssetPosition = new THREE.Vector3();

  private curveDragStartPoint: THREE.Vector3 | null = null;
  private curveDragControlPoint: THREE.Vector3 | null = null;
  private curveDragEndPoint: THREE.Vector3 | null = null;

  private arcDragStartPoint: THREE.Vector3 | null = null;
  private arcDragEndPoint: THREE.Vector3 | null = null;
  private arcDragCenterPoint: THREE.Vector3 | null = null;

  private lineDragStartPoint: THREE.Vector3 | null = null;
  private lineDragEndPoint: THREE.Vector3 | null = null;

  private lineStartPoint: THREE.Vector3 | null = null;
  private previewLine: THREE.Line | null = null;

  private currentSnapPoint: THREE.Vector3 | null = null;

  public isSnapLabelVisible = false;
  public snapLabelText = 'Endpoint';

  public snapLabelScreen = {
    left: 0,
    top: 0
  };

  private snapMarker: THREE.Mesh | null = null;
  private readonly SNAP_DISTANCE_PX = 14;

  public lineLengthInput = '';
  private previousLineAngleDeg: number | null = null;

  private lineDirectionPoint: THREE.Vector3 | null = null;

  public lineAngleInput = '';

  public liveLineLength = '0.00';
  public liveLineAngle = '0.00';

  public lineHudScreen = {
    left: 0,
    top: 0
  };

  private readonly GRID_BLOCK_METERS = 10;
  private readonly GRID_BLOCK_WORLD_UNITS = 1;
  private readonly WORLD_UNITS_PER_METER = this.GRID_BLOCK_WORLD_UNITS / this.GRID_BLOCK_METERS;

  public isLineLengthBoxVisible = false;
  private isLineDirectionLocked = false;

  private selectedAsset: THREE.Object3D | null = null;
  private selectedAssets: THREE.Object3D[] = [];

  public isBoxSelecting = false;

  public selectionBoxScreen = {
    left: 0,
    top: 0,
    width: 0,
    height: 0
  };

  private selectionStartClient = new THREE.Vector2();
  private isDraggingAsset = false;
  private selectionBox: THREE.Line | null = null;
  private resizeHandles: THREE.Mesh[] = [];

  private rotateHandle: THREE.Mesh | null = null;
  private isRotatingAsset = false;
  private rotationCenter = new THREE.Vector3();
  private rotationStartAngle = 0;
  private rotationStartZ = 0;

  private isPanningCanvas = false;
  private lastPanMousePosition = new THREE.Vector2();

  private isResizingAsset = false;
  private activeResizeHandle: THREE.Object3D | null = null;
  private resizeStartDistance = 1;
  private resizeStartScale = new THREE.Vector3();
  private resizeCenter = new THREE.Vector3();

  private isDraggingScrollbar = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  private highlightedObjects: THREE.Object3D[] = [];
  private selectedImportedElement: THREE.Object3D | null = null;

  public switchPopupVisible = false;

  public switchPopupScreen = {
    left: 0,
    top: 0
  };

  private pendingSwitchMainLine: THREE.Line | null = null;
  private pendingSwitchBranchLine: THREE.Line | null = null;
  private pendingSwitchPoint: THREE.Vector3 | null = null;

  private findDrawnLineNearPoint(
  point: THREE.Vector3,
  tolerance = 1.5
): {
  line: THREE.Line;
  pointOnLine: THREE.Vector3;
} | null {

  let bestMatch: {
    line: THREE.Line;
    pointOnLine: THREE.Vector3;
  } | null = null;

  let bestDistance = Infinity;

  this.canvasSceneService.scene.traverse((object) => {
    if (!(object instanceof THREE.Line)) {
      return;
    }

    if (object.userData['type'] !== 'DrawnLine') {
      return;
    }

    const start =
      object.userData['startPoint'] as THREE.Vector3 | undefined;

    const end =
      object.userData['endPoint'] as THREE.Vector3 | undefined;

    if (!start || !end) {
      return;
    }

    const segment = end.clone().sub(start);

    const lengthSquared = segment.lengthSq();

    if (lengthSquared === 0) {
      return;
    }

    const t = THREE.MathUtils.clamp(
      point.clone().sub(start).dot(segment) / lengthSquared,
      0,
      1
    );

    const projectedPoint = start
      .clone()
      .add(segment.multiplyScalar(t));

    const distance = projectedPoint.distanceTo(point);

    if (
      distance <= tolerance &&
      distance < bestDistance
    ) {
      bestDistance = distance;

      bestMatch = {
        line: object,
        pointOnLine: projectedPoint
      };
    }
  });

  return bestMatch;
}

  private worldUnitsToMeters(worldUnits: number): number {
    return worldUnits / this.WORLD_UNITS_PER_METER;
  }

  constructor(
  private canvasSceneService: CanvasSceneService,
  private switchesDrawingService: SwitchesDawingService,
  private railwayGeometryService: RailwayGeometryService,
  private canvasSelectionService: CanvasSelectionService,
  private polylineDrawingService: PolylineDrawingService,
  private canvasAssetService: CanvasAssetService,
  private eventService: EventService,
  private notificationService: NotificationService,
  private cdr: ChangeDetectorRef,
  private iconScaleService: IconScaleService,
) {
    // Subscribe to the event immediately
    this.sub = this.eventService.triggerCanvas$.subscribe(async () => {
      console.log('Canvas triggered!');

      if (!this.initialized) {
        this.initializeCanvas();
        this.initialized = true;
       
      }

      await this.canvasSceneService.loadRailwayData();

    });
  }

  // Current icon size displayed in the slider
public iconScalePercent = 100;

  // Called whenever the slider changes
  onIconScaleChange(): void {
    if (!this.initialized) {
      return;
    }

    const scale = this.iconScalePercent / 100;

    this.iconScaleService.setScale(
      scale,
      this.canvasSceneService.scene
    );
  }

  // Restore default icon size
  resetIconScale(): void {
    this.iconScalePercent = 100;

    if (!this.initialized) {
      return;
    }

    this.iconScaleService.resetScale(
      this.canvasSceneService.scene
    );
  }

  initializeCanvas() {
    const width = this.container.nativeElement.clientWidth;
    const height = this.container.nativeElement.clientHeight;

    // Initialize the scene service
    this.canvasSceneService.init(width, height, this.canvasRef);

    // Start rendering
    this.canvasSceneService.render(this.container.nativeElement);

    const canvas = this.canvasRef.nativeElement;

    canvas.addEventListener('dragover', (event) => {
      event.preventDefault();

      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
      }
    });

    canvas.addEventListener('drop', (event) => {
      event.preventDefault();

      const svgSrc = event.dataTransfer?.getData('text/plain');


      if (!svgSrc) return;

      const dropPoint = this.getWorldPoint(event as unknown as PointerEvent);
      this.addSvgToCanvas(svgSrc, dropPoint);


    });

    canvas.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;

      if (
        !this.isDrawingLine &&
        !this.isDrawingCircle &&
        !this.isDrawingCurve &&
        !this.isDrawingArc &&
        !this.isDrawingClothoid &&
        !this.isDrawingPolyline
      ) {
        const transitionPopupShown = this.checkForArcTransitionPopup(event);

        if (transitionPopupShown) {
          event.preventDefault();
          return;
        }
      }

      // Curve handle drag check
      const curveHandle = this.getCurveHandleUnderMouse(event);

      if (curveHandle) {
        this.isDraggingCurveHandle = true;
        this.activeCurveHandleKind = curveHandle.userData['handleKind'];

        this.selectedCurve = curveHandle.userData['curve'] as THREE.Line;

        canvas.style.cursor = 'grabbing';



        event.preventDefault();
        return;
      }

      // 0. First check rotate handle
      const rotateHandle = this.getRotateHandleUnderMouse(event);

      if (rotateHandle && this.selectedAsset) {
        this.isRotatingAsset = true;

        const box = new THREE.Box3().setFromObject(this.selectedAsset);
        box.getCenter(this.rotationCenter);

        const point = this.getWorldPoint(event);

        this.rotationStartAngle = Math.atan2(
          point.y - this.rotationCenter.y,
          point.x - this.rotationCenter.x
        );

        this.rotationStartZ = this.selectedAsset.rotation.z;

        canvas.setPointerCapture(event.pointerId);
        canvas.style.cursor = 'grabbing';

        console.log('ROTATION STARTED');

        event.preventDefault();
        return;
      }

      // 1. First check resize handles
      const resizeHandle = this.getResizeHandleUnderMouse(event);

      if (resizeHandle && this.selectedAsset) {
        this.isResizingAsset = true;
        this.activeResizeHandle = resizeHandle;

        const box = new THREE.Box3().setFromObject(this.selectedAsset);
        box.getCenter(this.resizeCenter);

        const point = this.getWorldPoint(event);

        this.resizeStartDistance = point.distanceTo(this.resizeCenter);
        this.resizeStartScale.copy(this.selectedAsset.scale);

        canvas.setPointerCapture(event.pointerId);
        canvas.style.cursor = 'nwse-resize';

        console.log('RESIZE STARTED');

        event.preventDefault();
        return;
      }


      // Circle drawing logic
      if (this.isDrawingCircle) {
        const point = this.getWorldPoint(event);

        if (!this.circleCenterPoint) {
          this.circleCenterPoint = point;
          console.log('CIRCLE CENTER SET');
          event.preventDefault();
          return;
        }

        const finalCircle = this.railwayGeometryService.createCircle(this.circleCenterPoint, point);
        this.canvasSceneService.scene.add(finalCircle);

        if (this.previewCircle) {
          this.canvasSceneService.scene.remove(this.previewCircle);
          this.previewCircle.geometry.dispose();

          const material = this.previewCircle.material;

          if (Array.isArray(material)) {
            material.forEach((m) => m.dispose());
          } else {
            material.dispose();
          }

          this.previewCircle = null;
        }

        this.circleCenterPoint = null;
        this.isDrawingCircle = false;

        this.eventService.updateCanvasStatus({
          mode: 'Select'
        });

        console.log('CIRCLE CREATED');
        event.preventDefault();
        return;
      }

      if (this.isDrawingArc) {
        const point = this.getWorldPoint(event);

        // First click: set arc start point and show small radius box
        if (!this.arcStartPoint) {
          this.arcStartPoint = point.clone();

          const screenPoint = this.worldToCanvasScreenPoint(this.arcStartPoint);

          this.arcRadiusBoxScreen.left = screenPoint.left + 12;
          this.arcRadiusBoxScreen.top = screenPoint.top - 10;

          this.arcRadiusInput = '';
          this.isArcRadiusBoxVisible = true;

          this.cdr.detectChanges();

          console.log('ARC START POINT SET');
          event.preventDefault();
          return;
        }

        // Second click: use radius from small box and create arc
        const signedRadius = Number(this.arcRadiusInput.replace(',', '.'));

        if (!Number.isFinite(signedRadius) || signedRadius === 0) {
          this.notificationService.notify({
            type: 'error',
            text: 'Please enter a valid arc radius first. Example: 50 or -50',
            operation: 'arc'
          });

          event.preventDefault();
          return;
        }

        const direction: 'CW' | 'CCW' = signedRadius < 0 ? 'CW' : 'CCW';

        const finalArc = this.railwayGeometryService.createRailwayArc(
          this.arcStartPoint,
          point,
          Math.abs(signedRadius),
          direction
        );

        if (!finalArc) {
          this.arcStartPoint = null;
          this.arcRadiusInput = '';
          this.isArcRadiusBoxVisible = false;

          event.preventDefault();
          return;
        }

        this.canvasSceneService.scene.add(finalArc);

        this.arcStartPoint = null;
        this.arcRadiusInput = '';
        this.isArcRadiusBoxVisible = false;
        this.isDrawingArc = false;

        this.eventService.updateCanvasStatus({
          mode: 'Select'
        });

        this.cdr.detectChanges();

        console.log('RAILWAY ARC CREATED:', {
          radius: Math.abs(signedRadius),
          direction
        });

        event.preventDefault();
        return;
      }

      // Clothoid drawing logic
      if (this.isDrawingClothoid) {
        const snapPoint = this.getEndpointSnapPoint(event);
        const point = snapPoint ? snapPoint.clone() : this.getWorldPoint(event);
        point.z = 0;

        // First click = start point
        if (!this.clothoidStartPoint) {
          this.clothoidStartPoint = point.clone();

          console.log('CLOTHOID START POINT SET');

          event.preventDefault();
          return;
        }

        // Second click = direction point
        const directionPoint = point.clone();

        const delta = new THREE.Vector3().subVectors(
          directionPoint,
          this.clothoidStartPoint
        );

        const directionLength = delta.length();

        if (directionLength < 0.001) {
          this.notificationService.notify({
            type: 'error',
            text: 'Please click a second point away from the clothoid start point.',
            operation: 'clothoid'
          });

          event.preventDefault();
          return;
        }

        this.clothoidDirectionPoint = directionPoint;
        this.clothoidStartAngle = Math.atan2(delta.y, delta.x);

        this.clothoidBoxScreen = {
          left: event.clientX,
          top: event.clientY
        };

        this.isClothoidBoxVisible = true;

        this.updateClothoidPreview();

        this.cdr.detectChanges();

        console.log('CLOTHOID PARAMETER BOX OPENED:', {
          startPoint: this.clothoidStartPoint,
          directionPoint: this.clothoidDirectionPoint,
          startAngle: this.clothoidStartAngle
        });

        event.preventDefault();
        return;
      }

      // Polyline drawing logic
      if (this.isDrawingPolyline) {
        const snapPoint = this.getEndpointSnapPoint(event);
        const point = snapPoint ? snapPoint.clone() : this.getWorldPoint(event);
        point.z = 0;

        this.polylinePoints.push(point.clone());

        if (this.previewPolylineSegment) {
          this.canvasSceneService.scene.remove(this.previewPolylineSegment);
          this.canvasSelectionService.disposeObject(this.previewPolylineSegment);
          this.previewPolylineSegment = null;
        }
        this.updateActivePolyline();

        console.log('POLYLINE POINT ADDED:', {
          point,
          count: this.polylinePoints.length
        });

        event.preventDefault();
        return;
      }

      // Curve drawing logic
      if (this.isDrawingCurve) {
        const point = this.getWorldPoint(event);

        if (!this.curveStartPoint) {
          this.curveStartPoint = point;
          console.log('CURVE START SET');
          event.preventDefault();
          return;
        }

        if (!this.curveControlPoint) {
          this.curveControlPoint = point;
          console.log('CURVE CONTROL POINT SET');
          event.preventDefault();
          return;
        }

        const finalCurve = this.railwayGeometryService.createCurve(
          this.curveStartPoint,
          this.curveControlPoint,
          point
        );

        this.canvasSceneService.scene.add(finalCurve);

        if (this.previewCurve) {
          this.canvasSceneService.scene.remove(this.previewCurve);
          this.previewCurve.geometry.dispose();

          const material = this.previewCurve.material;

          if (Array.isArray(material)) {
            material.forEach((m) => m.dispose());
          } else {
            material.dispose();
          }

          this.previewCurve = null;
        }

        this.curveStartPoint = null;
        this.curveControlPoint = null;
        this.isDrawingCurve = false;

        this.eventService.updateCanvasStatus({
          mode: 'Select'
        });

        console.log('CURVE CREATED');
        event.preventDefault();
        return;
      }

      // 2. Then check asset selection / dragging
      if (
        !this.isDrawingLine &&
        !this.isDrawingCircle &&
        !this.isDrawingCurve &&
        !this.isDrawingArc &&
        !this.isDrawingClothoid
        && !this.isDrawingPolyline
      ) {
        const asset = this.getAssetUnderMouse(event);

        if (asset) {

          
          // Independent ID label selection
          if (
            asset instanceof THREE.Sprite &&
            asset.userData['isAssetLabel'] === true
          ) {
            this.clearSelectionBox();
            this.clearCurveHandles();

            this.selectedCurve = null;

            this.selectedAsset = asset;
            this.selectedAssets = [];

            // Begin dragging only the label
            this.isDraggingAsset = true;

            this.dragStartMousePoint =
              this.getWorldPoint(event).clone();

            this.dragStartAssetPosition =
              asset.position.clone();

            // Do not create the usual asset selection box
            canvas.setPointerCapture(event.pointerId);
            canvas.style.cursor = 'grabbing';

            console.log(
              'LABEL SELECTED:',
              asset.userData['displayId']
            );

            event.preventDefault();
            return;
          }

          // Ctrl-click or Shift-click = add/remove item from multi-selection
          const assetType = asset.userData?.['type'];

          const isImportedElement =
            assetType === 'BackendTrack' ||
            assetType === 'Switch';

          if (isImportedElement) {
            this.canvasSelectionService.highlightSelectedImportedElement(asset);

            this.selectedAsset = null;
            this.selectedAssets = [];

            this.clearSelectionBox();
            this.clearCurveHandles();
            this.selectedCurve = null;

            this.isDraggingAsset = false;

            this.eventService.updateCanvasStatus({
              mode: 'Select'
            });

            event.preventDefault();
            return;
          }

          this.dragStartMousePoint = this.getWorldPoint(event).clone();
          this.dragStartMousePoint.z = 0;
          this.dragStartAssetPosition.copy(asset.position);
          if (event.ctrlKey || event.shiftKey) {
            const alreadySelected = this.selectedAssets.includes(asset);

            if (alreadySelected) {
              this.selectedAssets = this.selectedAssets.filter((item) => item !== asset);
              console.log('ASSET REMOVED FROM MULTI-SELECTION', asset);
            } else {
              this.selectedAssets.push(asset);
              console.log('ASSET ADDED TO MULTI-SELECTION', asset);
            }

            this.selectedAsset = asset;
            this.showSelectionBox(asset);

            this.selectedCurve = null;
            this.clearCurveHandles();

            event.preventDefault();
            return;
          }

          // Normal click = single selection
          this.selectedAssets = [asset];
          this.selectedAsset = asset;

          // If selected object is a curve, show only curve handles.
          // Do NOT show blue selection rectangle and do NOT start normal dragging.
          if (asset.userData['type'] === 'DrawnCurve') {
            this.selectedCurve = asset as THREE.Line;
            this.showCurveHandles(this.selectedCurve);

            // Curves use 3 edit handles, not the blue resize rectangle
            this.clearSelectionBox();

            // Allow dragging the whole curve body
            this.isDraggingAsset = true;

            this.curveDragStartPoint = asset.userData['startPoint'].clone();
            this.curveDragControlPoint = asset.userData['controlPoint'].clone();
            this.curveDragEndPoint = asset.userData['endPoint'].clone();

            canvas.setPointerCapture(event.pointerId);
            canvas.style.cursor = 'grabbing';

            console.log('CURVE SELECTED FOR MOVING/EDITING');
            event.preventDefault();
            return;
          }

          if (asset.userData['type'] === 'DrawnArc') {
            this.selectedAsset = asset;
            this.selectedAssets = [asset];

            this.selectedCurve = null;
            this.clearCurveHandles();
            this.clearSelectionBox();

            this.isDraggingAsset = true;

            this.arcDragStartPoint = asset.userData['startPoint'].clone();
            this.arcDragEndPoint = asset.userData['endPoint'].clone();
            this.arcDragCenterPoint = asset.userData['centerPoint'].clone();

            canvas.setPointerCapture(event.pointerId);
            canvas.style.cursor = 'grabbing';

            console.log('ARC SELECTED FOR MOVING');

            event.preventDefault();
            return;
          }

          // Normal non-curve object selection + drag
          this.selectedCurve = null;
          this.clearCurveHandles();

          this.isDraggingAsset = true;
          this.showSelectionBox(asset);

          canvas.setPointerCapture(event.pointerId);

          console.log('ASSET SELECTED FOR DRAG', asset);
          event.preventDefault();
          return;
        }

        // Empty canvas click clears selection
        this.selectedAsset = null;
        this.canvasSelectionService.clearSelectedImportedElementHighlight();
        this.selectedAssets = [];
        this.clearSelectionBox();

        this.selectedCurve = null;
        this.clearCurveHandles();

        this.eventService.updateCanvasStatus({
          mode: 'Select'
        });
        this.isDraggingAsset = false;
        this.isResizingAsset = false;
        this.isRotatingAsset = false;
        this.activeResizeHandle = null;
        this.isPanningCanvas = true;
        this.lastPanMousePosition.set(event.clientX, event.clientY);

        canvas.setPointerCapture(event.pointerId);
        canvas.style.cursor = 'grabbing';

        console.log('CANVAS PAN START');

        event.preventDefault();
        return;
      }

      // 3. If not drawing line, stop here
      if (!this.isDrawingLine) return;

      // 4. AutoCAD-style line drawing logic
      const rawLinePoint = this.getWorldPoint(event);

      const snapPoint = this.getEndpointSnapPoint(event);

      let linePoint =
        snapPoint
          ? snapPoint.clone()
          : rawLinePoint.clone();

      if (!this.lineStartPoint) {
        const lineMatch =
          this.findDrawnLineNearPoint(rawLinePoint);

        if (lineMatch) {
          linePoint = lineMatch.pointOnLine.clone();

          console.log(
            'NEW LINE STARTED ON EXISTING LINE',
            lineMatch.line
          );
        }
      }

      console.log('LINE CLICK POINT:', linePoint);

      // First click = start point
      if (!this.lineStartPoint) {
        this.lineStartPoint = linePoint.clone();
        this.lineDirectionPoint = linePoint.clone();

        this.isLineLengthBoxVisible = true;
        this.lineLengthInput = '';
        this.lineAngleInput = '';

        const screen = this.worldToCanvasScreenPoint(linePoint);
        this.lineHudScreen.left = screen.left + 12;
        this.lineHudScreen.top = screen.top - 10;

        this.cdr.detectChanges();

        console.log('LINE START POINT SET');
        event.preventDefault();
        return;
      }

      // Second click = create line to clicked point
      this.finalizeLineFromPoint(linePoint);

      console.log('LINE SEGMENT CREATED - READY FOR NEXT SEGMENT');
      event.preventDefault();
      return;
    });

    canvas.addEventListener('pointermove', (event) => {

     if (this.isPanningCanvas) {

        // If left mouse button is no longer pressed, stop panning
        if ((event.buttons & 1) === 0) {
          this.isPanningCanvas = false;
          canvas.style.cursor = 'crosshair';

          console.log('CANVAS PAN END');
          return;
        }

        const dx = event.clientX - this.lastPanMousePosition.x;
        const dy = event.clientY - this.lastPanMousePosition.y;

        const camera = this.canvasSceneService.camera;

        camera.position.x -= dx / camera.zoom;
        camera.position.y += dy / camera.zoom;

        camera.updateProjectionMatrix();

        this.lastPanMousePosition.set(
          event.clientX,
          event.clientY
        );

        console.log('CANVAS PANNING');

        event.preventDefault();
        return;
      }
      if (this.isDrawingPolyline && this.polylinePoints.length > 0) {
        const snapPoint = this.getEndpointSnapPoint(event);
        const point = snapPoint ? snapPoint.clone() : this.getWorldPoint(event);
        point.z = 0;

        if (snapPoint) {
          this.showSnapMarker(snapPoint, 'Endpoint');
        } else {
          this.hideSnapMarker();
        }

        const lastPoint = this.polylinePoints[this.polylinePoints.length - 1];

        const { lengthMeters, angleDeg } =
          this.polylineDrawingService.calculateSegmentInfo(
            lastPoint,
            point,
            this.WORLD_UNITS_PER_METER
          );

        this.livePolylineLength = lengthMeters.toFixed(2);
        this.livePolylineAngle = angleDeg.toFixed(1);

        this.polylineLengthInput = this.livePolylineLength;
        this.polylineAngleInput = this.livePolylineAngle;

        this.polylineHudScreen = {
          left: event.clientX + 14,
          top: event.clientY + 14
        };

        this.isPolylineInputBoxVisible = true;

        this.updatePolylinePreviewSegment(point);

        this.cdr.detectChanges();

        event.preventDefault();
        return;
      }

      if (this.isDrawingClothoid) {
        const snapPoint = this.getEndpointSnapPoint(event);

        if (snapPoint) {
          this.showSnapMarker(snapPoint, 'Endpoint');
        } else {
          this.hideSnapMarker();
        }
      }

      const worldPointForStatus = this.getWorldPoint(event);

      this.eventService.updateCanvasStatus({
        x: worldPointForStatus.x,
        y: worldPointForStatus.y,
        z: 0,
        grid: 1000
      });

      if (this.isDrawingCircle && this.circleCenterPoint) {
        this.updatePreviewCircle(this.circleCenterPoint, worldPointForStatus);
      }

      if (
        this.isDraggingCurveHandle &&
        this.selectedCurve &&
        this.activeCurveHandleKind
      ) {
        const point = this.getWorldPoint(event);
        point.z = 0;

        if (this.activeCurveHandleKind === 'start') {
          this.selectedCurve.userData['startPoint'] = point.clone();
        }

        if (this.activeCurveHandleKind === 'control') {
          this.selectedCurve.userData['controlPoint'] = point.clone();
        }

        if (this.activeCurveHandleKind === 'end') {
          this.selectedCurve.userData['endPoint'] = point.clone();
        }

        this.updateSelectedCurveGeometry();
        this.updateCurveHandlePositions();

        event.preventDefault();
        return;
      }

      if (
        this.isDraggingAsset &&
        this.selectedAsset &&
        this.selectedAsset.userData['type'] === 'DrawnCurve' &&
        this.curveDragStartPoint &&
        this.curveDragControlPoint &&
        this.curveDragEndPoint
      ) {
        const currentMousePoint = this.getWorldPoint(event);

        const delta = currentMousePoint
          .clone()
          .sub(this.dragStartMousePoint);

        delta.z = 0;

        const newStartPoint = this.curveDragStartPoint.clone().add(delta);
        const newControlPoint = this.curveDragControlPoint.clone().add(delta);
        const newEndPoint = this.curveDragEndPoint.clone().add(delta);

        this.selectedAsset.userData['startPoint'] = newStartPoint.clone();
        this.selectedAsset.userData['controlPoint'] = newControlPoint.clone();
        this.selectedAsset.userData['endPoint'] = newEndPoint.clone();

        this.selectedCurve = this.selectedAsset as THREE.Line;

        this.updateSelectedCurveGeometry();
        this.updateCurveHandlePositions();

        event.preventDefault();
        return;
      }

      if (this.isDrawingCurve && this.curveStartPoint && this.curveControlPoint) {
        this.updatePreviewCurve(
          this.curveStartPoint,
          this.curveControlPoint,
          worldPointForStatus
        );
      }

      if (this.isDrawingLine && this.lineStartPoint) {
        const snapPoint = this.getEndpointSnapPoint(event);

        const effectivePoint = snapPoint
          ? snapPoint.clone()
          : worldPointForStatus.clone();

        if (snapPoint) {
          this.showSnapMarker(snapPoint, 'Endpoint');
        } else {
          this.hideSnapMarker();
        }

        this.lineDirectionPoint = effectivePoint.clone();

        this.updatePreviewLine(this.lineStartPoint, effectivePoint);
        this.updateLineDynamicInfo(this.lineStartPoint, effectivePoint);

        this.cdr.detectChanges();
      }


      // 0. Rotate selected asset if rotation mode is active
      if (this.isRotatingAsset && this.selectedAsset) {
        const point = this.getWorldPoint(event);

        const currentAngle = Math.atan2(
          point.y - this.rotationCenter.y,
          point.x - this.rotationCenter.x
        );

        const angleDelta = currentAngle - this.rotationStartAngle;

        this.selectedAsset.rotation.z = this.rotationStartZ + angleDelta;

        this.showSelectionBox(this.selectedAsset);

        console.log('ROTATING ASSET', this.selectedAsset.rotation.z);

        event.preventDefault();
        return;
      }

      // 1. Resize selected asset if resize mode is active
      if (this.isResizingAsset && this.selectedAsset && this.activeResizeHandle) {
        const point = this.getWorldPoint(event);
        this.resizeSelectedAsset(point);
        event.preventDefault();
        return;
      }

      // 2. Resize line end if Shift + dragging line
      if (this.isDraggingAsset && this.selectedAsset instanceof THREE.Line && event.shiftKey) {
        const point = this.getWorldPoint(event);
        this.canvasSelectionService.resizeLineEnd(this.selectedAsset, point);
        event.preventDefault();
        return;
      }

      if (
        this.isDraggingAsset &&
        this.selectedAsset &&
        this.selectedAsset.userData['type'] === 'DrawnArc' &&
        this.arcDragStartPoint &&
        this.arcDragEndPoint &&
        this.arcDragCenterPoint
      ) {
        const currentMousePoint = this.getWorldPoint(event);

        const delta = currentMousePoint
          .clone()
          .sub(this.dragStartMousePoint);

        delta.z = 0;

        const newStartPoint = this.arcDragStartPoint.clone().add(delta);
        const newEndPoint = this.arcDragEndPoint.clone().add(delta);
        const newCenterPoint = this.arcDragCenterPoint.clone().add(delta);

        this.selectedAsset.userData['startPoint'] = newStartPoint.clone();
        this.selectedAsset.userData['endPoint'] = newEndPoint.clone();
        this.selectedAsset.userData['centerPoint'] = newCenterPoint.clone();

        this.updateSelectedArcGeometry();

        event.preventDefault();
        return;
      }

      // 3. Move asset if asset drag mode is active
      if (this.isDraggingAsset && this.selectedAsset) {

        
        // Independently drag ID labels
        if (
          this.selectedAsset instanceof THREE.Sprite &&
          this.selectedAsset.userData['isAssetLabel'] === true
        ) {
          const label = this.selectedAsset;
          const currentPoint = this.getWorldPoint(event);

          const worldDelta = currentPoint
            .clone()
            .sub(this.dragStartMousePoint);

          worldDelta.z = 0;

          // Convert world-space movement into the icon's local space
          if (label.parent) {
            label.parent.updateMatrixWorld(true);

            const parentWorldRotation =
              new THREE.Quaternion();

            const parentWorldScale =
              new THREE.Vector3();

            const parentWorldPosition =
              new THREE.Vector3();

            label.parent.matrixWorld.decompose(
              parentWorldPosition,
              parentWorldRotation,
              parentWorldScale
            );

            const localDelta = worldDelta
              .clone()
              .applyQuaternion(parentWorldRotation.invert());

            localDelta.set(
              localDelta.x / (parentWorldScale.x || 1),
              localDelta.y / (parentWorldScale.y || 1),
              0
            );

            label.position.copy(
              this.dragStartAssetPosition
                .clone()
                .add(localDelta)
            );
          }

          event.preventDefault();
          return;
        }


        const currentMousePoint = this.getWorldPoint(event);

        const delta = currentMousePoint
          .clone()
          .sub(this.dragStartMousePoint);

        delta.z = 0;

        const newPosition = this.dragStartAssetPosition
          .clone()
          .add(delta);

        this.selectedAsset.position.copy(newPosition);

        this.showSelectionBox(this.selectedAsset);

        // Only call backend move when this object actually has an id
        if (this.selectedAsset.userData["id"]) {
          MoveObject(
            this.selectedAsset.userData["id"],
            newPosition.x,
            newPosition.y
          );
          
          ValidateEngineering(this.selectedAsset.userData["id"],this.notificationService)
  
          
        }

        event.preventDefault();
        return;
      }
    });

    canvas.addEventListener('pointerup', (event) => {

      if (this.isDraggingCurveHandle) {
        this.isDraggingCurveHandle = false;
        this.activeCurveHandleKind = null;

        canvas.style.cursor = 'default';

        console.log('CURVE HANDLE DRAG ENDED');

        event.preventDefault();
        return;
      }

      // 0. Stop asset rotation
      if (this.isRotatingAsset) {
        this.isRotatingAsset = false;

        if (this.selectedAsset) {
          this.showSelectionBox(this.selectedAsset);
        }

        if (canvas.hasPointerCapture(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }

        canvas.style.cursor = 'crosshair';

        console.log('ROTATION FINISHED');

        event.preventDefault();
        return;
      }

      // 1. Stop canvas pan
      // 2. Stop asset resize
      if (this.isResizingAsset) {
        this.isResizingAsset = false;
        this.activeResizeHandle = null;

        if (this.selectedAsset) {
          this.showSelectionBox(this.selectedAsset);
        }

        if (canvas.hasPointerCapture(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }

        console.log('RESIZE FINISHED');

        event.preventDefault();
        return;
      }

      // 3. Stop asset drag
      if (this.isDraggingAsset) {
        console.log('ASSET DROPPED AT NEW POSITION', this.selectedAsset?.position);

        this.isDraggingAsset = false;

        this.curveDragStartPoint = null;
        this.curveDragControlPoint = null;
        this.curveDragEndPoint = null;

        this.arcDragStartPoint = null;
        this.arcDragEndPoint = null;
        this.arcDragCenterPoint = null;

        this.lineDragStartPoint = null;
        this.lineDragEndPoint = null;

        // Curves should keep their edit handles, not blue resize box
        if (this.selectedAsset?.userData['type'] === 'DrawnCurve') {
          this.selectedCurve = this.selectedAsset as THREE.Line;
          this.updateCurveHandlePositions();
        } else if (this.selectedAsset) {

          const isLabel =
            this.selectedAsset instanceof THREE.Sprite &&
            this.selectedAsset.userData['isAssetLabel'] === true;

          if (isLabel) {
            this.clearSelectionBox();
          } else {
            this.showSelectionBox(this.selectedAsset);
          }
        }

        if (canvas.hasPointerCapture(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }

     
        canvas.style.cursor = 'crosshair';

        event.preventDefault();
        return;
      }
    });

    canvas.addEventListener('pointercancel', () => {
      this.stopCanvasPanning();
    });

    canvas.addEventListener('lostpointercapture', () => {
      this.stopCanvasPanning();
    });

    //notifications
    this.notificationService.notifications$.subscribe((x) => {

     
      switch (x.operation) {
        case 'start':
          this.mySteps = this.allSteps.slice(0, 1);
          break;
        case 'plan':
          this.mySteps = this.allSteps.slice(1, 2);
          break;
        case 'move':
          this.mySteps = this.allSteps.slice(2, 3);
          break;
        case 'timingPoint':
          this.mySteps = this.allSteps.slice(3, 4);
          break;
        case 'segmentProfile':
          this.mySteps = this.allSteps.slice(4, 5);
          break;
        case 'telegram':
          this.mySteps = this.allSteps.slice(5, 6);
          break;
        case 'export':
          this.mySteps = this.allSteps.slice(6, 7);
          break;
        default:
          break;
      }

    });

    window.addEventListener('keydown', (event) => {

      // Rotate selected ID label by 90° when R is pressed
      if (
        this.selectedAsset instanceof THREE.Sprite &&
        this.selectedAsset.userData['isAssetLabel'] === true &&
        event.key.toLowerCase() === 'r' &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        !(event.target instanceof HTMLInputElement)
      ) {
        this.rotateSelectedLabel(90);
        event.preventDefault();
        return;
      }

      if (this.isDrawingPolyline) {
        if (event.key === 'Enter') {
          this.finishPolyline();
          event.preventDefault();
          return;
        }

        if (event.key === 'Escape') {
          this.cancelPolyline();
          event.preventDefault();
          return;
        }
      }


      if (event.key === 'Enter' && this.isDrawingLine && this.lineStartPoint) {
        this.confirmDynamicLine();
        event.preventDefault();
        return;
      }

      if ((event.key === 't' || event.key === 'T')) {
        this.createTangentBetweenSelectedArcs();
        event.preventDefault();
        return;
      }

      if (event.key === 'Escape') {
        this.cancelLineDrawing();
        event.preventDefault();
        return;
      }
    });
  }

  startLineDrawing(): void {
    this.setDrawingMode('Line');

    this.lineStartPoint = null;
    this.lineDirectionPoint = null;
    this.previousLineAngleDeg = null;

    this.lineLengthInput = '';
    this.lineAngleInput = '';

    this.liveLineLength = '0.00';
    this.liveLineAngle = '0.00';

    this.isLineLengthBoxVisible = false;
    this.isLineDirectionLocked = false;

    console.log('LINE DRAWING MODE ON');
  }

  startCircleDrawing(): void {
    this.setDrawingMode('Circle');

    this.circleCenterPoint = null;

    console.log('CIRCLE DRAWING MODE ON');
  }

  startCurveDrawing(): void {
    this.setDrawingMode('Curve');

    this.curveStartPoint = null;
    this.curveControlPoint = null;

    console.log('CURVE DRAWING MODE ON');
  }

  startArcDrawing(): void {
    this.setDrawingMode('Arc');

    this.arcStartPoint = null;

    console.log('ARC DRAWING MODE ON');
  }

  startClothoidDrawing(): void {
    this.setDrawingMode('Clothoid');

    this.clothoidStartPoint = null;

    this.disposePreviewObject(this.previewClothoid);
    this.previewClothoid = null;

    console.log('CLOTHOID DRAWING MODE ON');
  }

  startPolylineDrawing(): void {
    this.setDrawingMode('Polyline');

    this.polylinePoints = [];

    this.isAddingPolylineTransition = false;
    this.polylineTransitionStartPoint = null;
    this.polylineTransitionStartAngle = 0;

    this.isPolylineInputBoxVisible = false;
    this.polylineLengthInput = '';
    this.polylineAngleInput = '';

    this.livePolylineLength = '0';
    this.livePolylineAngle = '0';

    this.polylineSegmentMode = 'line';

    this.clearPolylinePreviews();

    console.log('POLYLINE DRAWING MODE ON');
  }

  private finishPolyline(): void {
    if (this.polylinePoints.length < 2) {
      this.cancelPolyline();
      return;
    }

   this.clearPolylinePreviews();

    // Create separate permanent line segments
    for (let i = 0; i < this.polylinePoints.length - 1; i++) {
      const startPoint = this.polylinePoints[i].clone();
      const endPoint = this.polylinePoints[i + 1].clone();

      if (startPoint.distanceTo(endPoint) < 0.001) {
        continue;
      }

      const segmentLine =
        this.railwayGeometryService.createPolylineSegmentLine(
          startPoint,
          endPoint,
          i
        );

      segmentLine.userData['type'] = 'DrawnLine';
      segmentLine.userData['draggable'] = true;
      segmentLine.userData['createdFromPolyline'] = true;
      segmentLine.userData['polylineSegmentIndex'] = i;

      this.canvasSceneService.scene.add(segmentLine);
    }

    this.polylinePoints = [];
    this.isDrawingPolyline = false;

    this.isPolylineInputBoxVisible = false;
    this.polylineLengthInput = '';
    this.polylineAngleInput = '';
    this.livePolylineLength = '0';
    this.livePolylineAngle = '0';
    this.polylineSegmentMode = 'line';

    this.eventService.updateCanvasStatus({
      mode: 'Select'
    });

    this.cdr.detectChanges();

    console.log('POLYLINE FINISHED AS SEPARATE LINE SEGMENTS');
}



  private clearPolylinePreviews(): void {
    if (this.activePolyline) {
      this.canvasSceneService.scene.remove(this.activePolyline);
      this.canvasSelectionService.disposeObject(this.activePolyline);
      this.activePolyline = null;
    }

    if (this.previewPolylineSegment) {
      this.canvasSceneService.scene.remove(this.previewPolylineSegment);
      this.canvasSelectionService.disposeObject(this.previewPolylineSegment);
      this.previewPolylineSegment = null;
    }
  }

  private updateActivePolyline(): void {
    if (this.polylinePoints.length < 2) {
      return;
    }

    // Remove the previous active polyline
    if (this.activePolyline) {
      this.canvasSceneService.scene.remove(this.activePolyline);
      this.canvasSelectionService.disposeObject(this.activePolyline);
      this.activePolyline = null;
    }

    // Create the updated polyline
    this.activePolyline =
      this.railwayGeometryService.createActivePolyline(
        this.polylinePoints
      );

    this.canvasSceneService.scene.add(this.activePolyline);
  }

  private cancelPolyline(): void {
    this.clearPolylinePreviews();

    this.polylinePoints = [];
    this.isDrawingPolyline = false;

    this.isPolylineInputBoxVisible = false;
    this.polylineLengthInput = '';
    this.polylineAngleInput = '';
    this.livePolylineLength = '0';
    this.livePolylineAngle = '0';

    this.eventService.updateCanvasStatus({
      mode: 'Select'
    });

    this.cdr.detectChanges();

    console.log('POLYLINE CANCELLED');
  }

  private updatePolylinePreviewSegment(
    currentPoint: THREE.Vector3
  ): void {
    if (!this.isDrawingPolyline || this.polylinePoints.length === 0) {
      return;
    }

    const lastPoint =
      this.polylinePoints[this.polylinePoints.length - 1];

    // Remove previous preview
    if (this.previewPolylineSegment) {
      this.canvasSceneService.scene.remove(this.previewPolylineSegment);
      this.canvasSelectionService.disposeObject(this.previewPolylineSegment);
      this.previewPolylineSegment = null;
    }

    // Generate updated preview geometry
    this.previewPolylineSegment =
      this.railwayGeometryService.createPolylinePreviewSegment(
        lastPoint,
        currentPoint
      );

    this.canvasSceneService.scene.add(this.previewPolylineSegment);
  }

  private metersToWorldUnits(meters: number): number {
    return meters * this.WORLD_UNITS_PER_METER;
  }

  onPolylineSegmentModeChange(): void {
    if (this.polylineSegmentMode === 'finish') {
      this.finishPolyline();
      return;
    }

    if (this.polylineSegmentMode === 'transition') {
      if (this.polylinePoints.length < 2) {
        this.notificationService.notify({
          type: 'error',
          text: 'Create at least one line segment before adding a transition curve.',
          operation: 'polyline'
        });

        this.polylineSegmentMode = 'line';
        return;
      }

      const lastPoint = this.polylinePoints[this.polylinePoints.length - 1];
      const previousPoint = this.polylinePoints[this.polylinePoints.length - 2];

      const delta = new THREE.Vector3().subVectors(lastPoint, previousPoint);

      if (delta.length() < 0.001) {
        this.notificationService.notify({
          type: 'error',
          text: 'Cannot determine transition direction from the previous segment.',
          operation: 'polyline'
        });

        this.polylineSegmentMode = 'line';
        return;
      }

      this.isAddingPolylineTransition = true;
      this.polylineTransitionStartPoint = lastPoint.clone();
      this.polylineTransitionStartAngle = Math.atan2(delta.y, delta.x);

      this.isPolylineInputBoxVisible = false;

      this.clothoidStartPoint = this.polylineTransitionStartPoint.clone();
      this.clothoidDirectionPoint = null;
      this.clothoidStartAngle = this.polylineTransitionStartAngle;

      this.clothoidBoxScreen = {
        left: this.polylineHudScreen.left,
        top: this.polylineHudScreen.top + 80
      };

      this.isClothoidBoxVisible = true;

      this.updateClothoidPreview();

      this.cdr.detectChanges();

      console.log('POLYLINE TRANSITION PARAMETER BOX OPENED:', {
        startPoint: this.polylineTransitionStartPoint,
        startAngle: this.polylineTransitionStartAngle
      });

      return;
    }

    this.isAddingPolylineTransition = false;
    console.log('Polyline line segment mode selected');
  }

  private createLine(startPoint: THREE.Vector3, endPoint: THREE.Vector3): THREE.Line {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(startPoint.x, startPoint.y, 0.2),
      new THREE.Vector3(endPoint.x, endPoint.y, 0.2)
    ]);

    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      depthTest: false
    });

    const line = new THREE.Line(geometry, material);

    line.renderOrder = 50;
    line.userData['draggable'] = true;
    line.userData['type'] = 'DrawnLine';
    line.userData['startPoint'] = startPoint.clone();
    line.userData['endPoint'] = endPoint.clone();

    CreateLine("111",startPoint.x,startPoint.y,endPoint.x,endPoint.y);

    return line;
  }

  private updatePreviewCircle(
      center: THREE.Vector3,
      radiusPoint: THREE.Vector3
    ): void {

      this.disposePreviewObject(this.previewCircle);

      this.previewCircle = this.railwayGeometryService.createCircle(
        center,
        radiusPoint
      );

      this.previewCircle.userData['draggable'] = false;
      this.previewCircle.userData['type'] = 'PreviewCircle';

      this.canvasSceneService.scene.add(this.previewCircle);
    }

  private updateSelectedCurveGeometry(): void {
    if (!this.selectedCurve) {
      return;
    }

    this.railwayGeometryService.updateCurveGeometry(
      this.selectedCurve
    );
  }

  private updateCurveHandlePositions(): void {
    if (!this.selectedCurve || !this.curveHandleGroup) {
      return;
    }

    this.canvasSelectionService.updateCurveHandlePositions(
      this.selectedCurve,
      this.curveHandleGroup
    );
  }

  private updatePreviewCurve(
    startPoint: THREE.Vector3,
    controlPoint: THREE.Vector3,
    endPoint: THREE.Vector3
  ): void {

    this.disposePreviewObject(this.previewCurve);

    this.previewCurve = this.railwayGeometryService.createCurve(
      startPoint,
      controlPoint,
      endPoint
    );

    this.previewCurve.userData['draggable'] = false;
    this.previewCurve.userData['type'] = 'PreviewCurve';

    this.canvasSceneService.scene.add(this.previewCurve);
  }

  private showCurveHandles(curve: THREE.Line): void {

    // Remove any existing curve handles
    this.clearCurveHandles();

    // Create and display the new handles
    this.curveHandleGroup =
      this.canvasSelectionService.showCurveHandles(
        curve,
        this.canvasSceneService.scene
      );

  }

  private stopCanvasPanning(): void {
    this.isPanningCanvas = false;

    if (this.canvasRef?.nativeElement) {
      this.canvasRef.nativeElement.style.cursor = 'crosshair';
    }

    console.log('CANVAS PAN END');
  }

  private clearCurveHandles(): void {
    if (!this.curveHandleGroup) {
      return;
    }

    this.canvasSelectionService.clearCurveHandles(
      this.curveHandleGroup,
      this.canvasSceneService.scene
    );

    this.curveHandleGroup = null;
  }

  confirmClothoid(): void {
    if (!this.clothoidStartPoint) {
      return;
    }

    const lengthMeters = Number(this.clothoidLengthInput);
    const radiusMeters = Number(this.clothoidRadiusInput);

    if (!Number.isFinite(lengthMeters) || lengthMeters <= 0) {
      this.notificationService.notify({
        type: 'error',
        text: 'Please enter a valid clothoid length.',
        operation: 'clothoid'
      });
      return;
    }

    if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
      this.notificationService.notify({
        type: 'error',
        text: 'Please enter a valid clothoid radius.',
        operation: 'clothoid'
      });
      return;
    }

    const length = this.metersToWorldUnits(lengthMeters);
    const endRadius = this.metersToWorldUnits(radiusMeters);

    const points = this.railwayGeometryService.generateTransitionCurvePoints(
      this.clothoidStartPoint,
      this.clothoidStartAngle,
      length,
      endRadius,
      this.clothoidDirectionInput,
      this.transitionCurveTypeInput,
      120
    );

    if (points.length < 2) {
      this.notificationService.notify({
        type: 'error',
        text: 'Could not create clothoid.',
        operation: 'clothoid'
      });
      return;
    }

    if (this.isAddingPolylineTransition) {
      if (points.length < 2) {
        return;
      }

      // Avoid duplicating the first point because it is already the last polyline point
      const pointsToAppend = points.slice(1).map(p => p.clone());

      this.polylinePoints.push(...pointsToAppend);

      this.updateActivePolyline();

      this.isClothoidBoxVisible = false;
      this.isAddingPolylineTransition = false;
      this.polylineTransitionStartPoint = null;
      this.clothoidStartPoint = null;
      this.clothoidDirectionPoint = null;

      this.polylineSegmentMode = 'line';
      this.isDrawingPolyline = true;
      this.isPolylineInputBoxVisible = false;

      if (this.previewClothoid) {
        this.canvasSceneService.scene.remove(this.previewClothoid);
        this.previewClothoid.geometry.dispose();

        const material = this.previewClothoid.material;
        if (Array.isArray(material)) {
          material.forEach(m => m.dispose());
        } else {
          material.dispose();
        }

        this.previewClothoid = null;
      }

      this.eventService.updateCanvasStatus({
        mode: 'Polyline'
      });

      this.cdr.detectChanges();

      console.log('TRANSITION CURVE APPENDED TO POLYLINE:', {
        type: this.transitionCurveTypeInput,
        appendedPoints: pointsToAppend.length
      });

      return;
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      depthTest: false
    });

    const clothoidLine = new THREE.Line(geometry, material);

    clothoidLine.userData = {
      draggable: true,
      type: 'DrawnTransitionCurve',
      transitionCurveType: this.transitionCurveTypeInput,
      isTransitionCurve: true,
      isClothoid: this.transitionCurveTypeInput === 'clothoid',
      startPoint: this.clothoidStartPoint.clone(),
      directionPoint: this.clothoidDirectionPoint?.clone() ?? null,
      startAngle: this.clothoidStartAngle,
      lengthMeters,
      radiusMeters,
      length,
      endRadius,
      direction: this.clothoidDirectionInput
    };

    this.canvasSceneService.scene.add(clothoidLine);

    if (this.previewClothoid) {
      this.canvasSceneService.scene.remove(this.previewClothoid);
      this.previewClothoid.geometry.dispose();

      const previewMaterial = this.previewClothoid.material;

      if (Array.isArray(previewMaterial)) {
        previewMaterial.forEach(m => m.dispose());
      } else {
        previewMaterial.dispose();
      }

      this.previewClothoid = null;
    }

    this.isClothoidBoxVisible = false;
    this.clothoidStartPoint = null;
    this.clothoidDirectionPoint = null;
    this.isDrawingClothoid = false;

    this.eventService.updateCanvasStatus({
      mode: 'Select'
    });

    console.log('CLOTHOID CREATED:', {
      lengthMeters,
      radiusMeters,
      direction: this.clothoidDirectionInput
    });
  }

  startDraggingClothoidBox(event: MouseEvent): void {
    this.isDraggingClothoidBox = true;

    this.clothoidBoxDragOffset = {
      x: event.clientX - this.clothoidBoxScreen.left,
      y: event.clientY - this.clothoidBoxScreen.top
    };

    event.preventDefault();
    event.stopPropagation();
  }

  onDraggingClothoidBox(event: MouseEvent): void {
    if (!this.isDraggingClothoidBox) {
      return;
    }

    this.clothoidBoxScreen = {
      left: event.clientX - this.clothoidBoxDragOffset.x,
      top: event.clientY - this.clothoidBoxDragOffset.y
    };

    event.preventDefault();
    event.stopPropagation();
  }

  stopDraggingClothoidBox(event: MouseEvent): void {
    if (!this.isDraggingClothoidBox) {
      return;
    }

    this.isDraggingClothoidBox = false;

    event.preventDefault();
    event.stopPropagation();
  }

  cancelClothoid(): void {
    this.isClothoidBoxVisible = false;
    this.clothoidStartPoint = null;
    this.clothoidDirectionPoint = null;
    this.isDrawingClothoid = false;

    this.disposePreviewObject(this.previewClothoid);
    this.previewClothoid = null;

    this.eventService.updateCanvasStatus({
      mode: 'Select'
    });

    console.log('CLOTHOID CANCELLED');
  }

  updateClothoidPreview(): void {
    if (!this.clothoidStartPoint) {
      return;
    }

    const lengthMeters = Number(this.clothoidLengthInput);
    const radiusMeters = Number(this.clothoidRadiusInput);

    if (
      !Number.isFinite(lengthMeters) ||
      lengthMeters <= 0 ||
      !Number.isFinite(radiusMeters) ||
      radiusMeters <= 0
    ) {
      return;
    }

    // Remove old preview
    this.disposePreviewObject(this.previewClothoid);
    this.previewClothoid = null;

    const length = this.metersToWorldUnits(lengthMeters);
    const endRadius = this.metersToWorldUnits(radiusMeters);

    const points = this.railwayGeometryService.generateTransitionCurvePoints(
      this.clothoidStartPoint,
      this.clothoidStartAngle,
      length,
      endRadius,
      this.clothoidDirectionInput,
      this.transitionCurveTypeInput,
      120
    );

    if (points.length < 2) {
      return;
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
      color: 0xff00ff,
      transparent: true,
      opacity: 0.45
    });

    this.previewClothoid = new THREE.Line(geometry, material);

    this.previewClothoid.userData = {
      type: 'ClothoidPreview',
      isPreview: true
    };

    this.canvasSceneService.scene.add(this.previewClothoid);
  }

  confirmPolylineSegmentByInput(): void {
    if (!this.isDrawingPolyline || this.polylinePoints.length === 0) {
      return;
    }

    const lengthMeters = Number(this.polylineLengthInput);
    const angleDeg = Number(this.polylineAngleInput);

    if (!Number.isFinite(lengthMeters) || lengthMeters <= 0) {
      this.notificationService.notify({
        type: 'error',
        text: 'Please enter a valid polyline segment length.',
        operation: 'polyline'
      });
      return;
    }

    if (!Number.isFinite(angleDeg)) {
      this.notificationService.notify({
        type: 'error',
        text: 'Please enter a valid polyline segment angle.',
        operation: 'polyline'
      });
      return;
    }

    const lastPoint = this.polylinePoints[this.polylinePoints.length - 1];

    const nextPoint = this.polylineDrawingService.calculateNextPoint(
      lastPoint,
      lengthMeters,
      angleDeg,
      this.WORLD_UNITS_PER_METER
    );

    this.polylinePoints.push(nextPoint);

    if (this.previewPolylineSegment) {
      this.canvasSceneService.scene.remove(this.previewPolylineSegment);
      this.canvasSelectionService.disposeObject(this.previewPolylineSegment);
      this.previewPolylineSegment = null;
    }

    this.updateActivePolyline();

    this.polylineLengthInput = '';
    this.polylineAngleInput = '';

    this.isPolylineInputBoxVisible = false;

    this.cdr.detectChanges();

    console.log('POLYLINE SEGMENT CREATED BY INPUT:', {
      lengthMeters,
      angleDeg,
      nextPoint
    });
  }

  private setDrawingMode(
    mode: 'Line' | 'Circle' | 'Curve' | 'Arc' | 'Clothoid' | 'Polyline'
  ): void {
    this.isDrawingLine = mode === 'Line';
    this.isDrawingCircle = mode === 'Circle';
    this.isDrawingCurve = mode === 'Curve';
    this.isDrawingArc = mode === 'Arc';
    this.isDrawingClothoid = mode === 'Clothoid';
    this.isDrawingPolyline = mode === 'Polyline';

    this.eventService.updateCanvasStatus({ mode });
  }

  private updateArcGeometry(arc: THREE.Line): void {
    if (arc.userData['type'] !== 'DrawnArc') {
      return;
    }

    const startPoint = arc.userData['startPoint'] as THREE.Vector3;
    const endPoint = arc.userData['endPoint'] as THREE.Vector3;
    const centerPoint = arc.userData['centerPoint'] as THREE.Vector3;
    const direction = arc.userData['direction'] as 'CW' | 'CCW';

    const arcData = this.railwayGeometryService.buildArcFromCenter(
      startPoint,
      endPoint,
      centerPoint,
      direction
    );

    const geometry = new THREE.BufferGeometry().setFromPoints(arcData.points);

    arc.geometry.dispose();
    arc.geometry = geometry;
  }

  private updateSelectedArcGeometry(): void {
    if (!this.selectedAsset || !(this.selectedAsset instanceof THREE.Line)) {
      return;
    }

    this.updateArcGeometry(this.selectedAsset);
  }

  
  private createTangentBetweenSelectedArcs(): void {
    const selectedArcs = this.selectedAssets.filter(
      (obj): obj is THREE.Line =>
        obj instanceof THREE.Line && obj.userData['type'] === 'DrawnArc'
    );

    if (selectedArcs.length !== 2) {
      this.notificationService.notify({
        type: 'error',
        text: 'Please select exactly 2 arcs. Click first arc, then Ctrl-click second arc.',
        operation: 'arc'
      });
      return;
    }

    const arc1 = selectedArcs[0];
    const arc2 = selectedArcs[1];

    const arc1End = (arc1.userData['endPoint'] as THREE.Vector3).clone();
    const arc2Start = (arc2.userData['startPoint'] as THREE.Vector3).clone();

    const tangent1 = this.railwayGeometryService.getArcTangentAtPoint(arc1, arc1End, 'end');
    const tangent2 = this.railwayGeometryService.getArcTangentAtPoint(arc2, arc2Start, 'start');

    if (!tangent1 || !tangent2) {
      this.notificationService.notify({
        type: 'error',
        text: 'Could not calculate tangent direction for selected arcs.',
        operation: 'arc'
      });
      return;
    }

    const connectorDirection = arc2Start
      .clone()
      .sub(arc1End);

    connectorDirection.z = 0;

    if (connectorDirection.length() === 0) {
      this.notificationService.notify({
        type: 'error',
        text: 'Arc endpoints are at the same position.',
        operation: 'arc'
      });
      return;
    }

    connectorDirection.normalize();

    const angleToArc1 = this.railwayGeometryService.getSmallestAngleBetweenVectorsDeg(
      connectorDirection,
      tangent1
    );

    const angleToArc2 = this.railwayGeometryService.getSmallestAngleBetweenVectorsDeg(
      connectorDirection,
      tangent2
    );

    const toleranceDeg = 12;

    if (angleToArc1 > toleranceDeg || angleToArc2 > toleranceDeg) {
      this.notificationService.notify({
        type: 'error',
        text: `Arcs are not tangent-compatible. Angle mismatch: ${angleToArc1.toFixed(1)}° and ${angleToArc2.toFixed(1)}°. Move/rotate the arcs closer to tangent alignment.`,
        operation: 'arc'
      });

      console.warn('TANGENT CHECK FAILED:', {
        angleToArc1,
        angleToArc2,
        toleranceDeg
      });

      return;
    }

    const tangentLine = this.createLine(arc1End, arc2Start);
    tangentLine.userData['type'] = 'DrawnTangent';
    tangentLine.userData['draggable'] = true;

    this.canvasSceneService.scene.add(tangentLine);

    this.notificationService.notify({
      type: 'success',
      text: 'Tangent connector created between arc endpoints.',
      operation: 'arc'
    });

    console.log('TANGENT CONNECTOR CREATED:', {
      arc1End,
      arc2Start,
      angleToArc1,
      angleToArc2
    });
  }

  private updatePreviewLine(startPoint: THREE.Vector3, endPoint: THREE.Vector3): void {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(startPoint.x, startPoint.y, 0.25),
      new THREE.Vector3(endPoint.x, endPoint.y, 0.25)
    ]);

    if (!this.previewLine) {
      const material = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        depthTest: false
      });

      this.previewLine = new THREE.Line(geometry, material);
      this.previewLine.renderOrder = 100;
      this.previewLine.userData['draggable'] = false;
      this.previewLine.userData['type'] = 'PreviewLine';

      this.canvasSceneService.scene.add(this.previewLine);
      return;
    }

    this.previewLine.geometry.dispose();
    this.previewLine.geometry = geometry;
  }

  private worldToCanvasScreenPoint(worldPoint: THREE.Vector3): { left: number; top: number } {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    const projected = worldPoint.clone().project(this.canvasSceneService.camera);

    const left = ((projected.x + 1) / 2) * rect.width;
    const top = ((-projected.y + 1) / 2) * rect.height;

    return { left, top };
  }

  private getCanvasScreenPoint(worldPoint: THREE.Vector3): THREE.Vector2 {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    const projected = worldPoint.clone().project(this.canvasSceneService.camera);

    const x = ((projected.x + 1) / 2) * rect.width;
    const y = ((-projected.y + 1) / 2) * rect.height;

    return new THREE.Vector2(x, y);
  }

  private findClickedArcEndpoint(
    event: PointerEvent
  ): {
    arc: THREE.Line;
    point: THREE.Vector3;
    endKind: 'start' | 'end';
  } | null {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    const mouseScreen = new THREE.Vector2(
      event.clientX - rect.left,
      event.clientY - rect.top
    );

    let closestResult: {
      arc: THREE.Line;
      point: THREE.Vector3;
      endKind: 'start' | 'end';
    } | null = null;

    let closestDistancePx = Infinity;

    this.canvasSceneService.scene.traverse((object) => {
      if (!(object instanceof THREE.Line)) {
        return;
      }

      if (object.userData['type'] !== 'DrawnArc') {
        return;
      }

      const startPoint = object.userData['startPoint'] as THREE.Vector3;
      const endPoint = object.userData['endPoint'] as THREE.Vector3;

      if (!startPoint || !endPoint) {
        return;
      }

      const startScreen = this.getCanvasScreenPoint(startPoint);
      const endScreen = this.getCanvasScreenPoint(endPoint);

      const startDistancePx = startScreen.distanceTo(mouseScreen);
      const endDistancePx = endScreen.distanceTo(mouseScreen);

      if (
        startDistancePx <= this.ARC_ENDPOINT_CLICK_TOLERANCE_PX &&
        startDistancePx < closestDistancePx
      ) {
        closestDistancePx = startDistancePx;
        closestResult = {
          arc: object,
          point: startPoint.clone(),
          endKind: 'start'
        };
      }

      if (
        endDistancePx <= this.ARC_ENDPOINT_CLICK_TOLERANCE_PX &&
        endDistancePx < closestDistancePx
      ) {
        closestDistancePx = endDistancePx;
        closestResult = {
          arc: object,
          point: endPoint.clone(),
          endKind: 'end'
        };
      }
    });

    return closestResult;
  }

  private findNearbyArcEndpoint(
    selectedArc: THREE.Line,
    selectedPoint: THREE.Vector3
  ): {
    arc: THREE.Line;
    point: THREE.Vector3;
    endKind: 'start' | 'end';
  } | null {
    const selectedScreen = this.getCanvasScreenPoint(selectedPoint);

    let closestResult: {
      arc: THREE.Line;
      point: THREE.Vector3;
      endKind: 'start' | 'end';
    } | null = null;

    let closestDistancePx = Infinity;

    this.canvasSceneService.scene.traverse((object) => {
      if (!(object instanceof THREE.Line)) {
        return;
      }

      if (object.userData['type'] !== 'DrawnArc') {
        return;
      }

      if (object === selectedArc) {
        return;
      }

      const startPoint = object.userData['startPoint'] as THREE.Vector3;
      const endPoint = object.userData['endPoint'] as THREE.Vector3;

      if (!startPoint || !endPoint) {
        return;
      }

      const startScreen = this.getCanvasScreenPoint(startPoint);
      const endScreen = this.getCanvasScreenPoint(endPoint);

      const startDistancePx = selectedScreen.distanceTo(startScreen);
      const endDistancePx = selectedScreen.distanceTo(endScreen);

      if (
        startDistancePx <= this.NEARBY_ARC_ENDPOINT_TOLERANCE_PX &&
        startDistancePx < closestDistancePx
      ) {
        closestDistancePx = startDistancePx;
        closestResult = {
          arc: object,
          point: startPoint.clone(),
          endKind: 'start'
        };
      }

      if (
        endDistancePx <= this.NEARBY_ARC_ENDPOINT_TOLERANCE_PX &&
        endDistancePx < closestDistancePx
      ) {
        closestDistancePx = endDistancePx;
        closestResult = {
          arc: object,
          point: endPoint.clone(),
          endKind: 'end'
        };
      }
    });

    return closestResult;
  }



  private checkForArcTransitionPopup(event: PointerEvent): boolean {
    const clickedArcEndpoint = this.findClickedArcEndpoint(event);

    console.log('CLICKED ARC ENDPOINT:', clickedArcEndpoint);

    if (!clickedArcEndpoint) {
      this.hideTransitionPopup();
      return false;
    }

    const nearbyArcEndpoint = this.findNearbyArcEndpoint(
      clickedArcEndpoint.arc,
      clickedArcEndpoint.point
    );

    if (!nearbyArcEndpoint) {
      this.hideTransitionPopup();
      return false;
    }

    this.pendingTransitionArcA = clickedArcEndpoint.arc;
    this.pendingTransitionArcB = nearbyArcEndpoint.arc;

    this.pendingTransitionArcAEndKind = clickedArcEndpoint.endKind;
    this.pendingTransitionArcBEndKind = nearbyArcEndpoint.endKind;

    this.transitionPopupScreen.left = event.clientX + 12;
    this.transitionPopupScreen.top = event.clientY + 12;

    this.transitionPopupVisible = true;

    this.cdr.detectChanges();

    console.log('TRANSITION POPUP AVAILABLE:', {
      arcA: clickedArcEndpoint,
      arcB: nearbyArcEndpoint
    });

    return true;
  }

  private resetArcTransitionState(): void {
    this.transitionPopupVisible = false;

    this.pendingTransitionArcA = null;
    this.pendingTransitionArcB = null;

    this.pendingTransitionArcAEndKind = null;
    this.pendingTransitionArcBEndKind = null;

    this.cdr.detectChanges();

    console.log('ARC TRANSITION STATE RESET');
  }

  public hideTransitionPopup(): void {
    this.resetArcTransitionState();
  }

  public onAddTransitionClick(): void {
    if (!this.pendingTransitionArcA || !this.pendingTransitionArcB) {
      return;
    }

    if (
      !this.pendingTransitionArcAEndKind ||
      !this.pendingTransitionArcBEndKind
    ) {
      this.notificationService.notify({
        type: 'error',
        text: 'Could not identify selected arc endpoints.',
        operation: 'arc'
      });

      this.hideTransitionPopup();
      return;
    }

    const arcInfoA = this.railwayGeometryService.getArcEndInfo(
      this.pendingTransitionArcA,
      this.pendingTransitionArcAEndKind
    );

    const arcInfoB = this.railwayGeometryService.getArcEndInfo(
      this.pendingTransitionArcB,
      this.pendingTransitionArcBEndKind
    );

    console.log('ARC TRANSITION INFO:', {
      arcInfoA,
      arcInfoB
    });

    if (!arcInfoA || !arcInfoB) {
      this.notificationService.notify({
        type: 'error',
        text: 'Could not calculate arc transition information.',
        operation: 'arc'
      });

      this.hideTransitionPopup();
      return;
    }

    const endpointDistance = arcInfoA.point.distanceTo(arcInfoB.point);

    if (endpointDistance < 0.001) {
      this.notificationService.notify({
        type: 'error',
        text: 'Selected arc endpoints are too close to create a transition.',
        operation: 'arc'
      });

      this.hideTransitionPopup();
      return;
    }

    const transitionLength = endpointDistance;
    const transitionLengthMeters = this.worldUnitsToMeters(transitionLength);

    const transitionDirection = arcInfoA.direction;

    const fittedTransition = this.railwayGeometryService.fitTransitionPointsBetweenArcEnds(
      arcInfoA,
      arcInfoB,
      this.transitionCurveTypeInput,
      Number(this.clothoidLengthInput),
      this.WORLD_UNITS_PER_METER
    );

    if (!fittedTransition || fittedTransition.points.length < 2) {
      this.notificationService.notify({
        type: 'error',
        text: 'Could not fit transition curve between selected arc endpoints.',
        operation: 'arc'
      });

      this.hideTransitionPopup();
      return;
    }

    const transitionPoints = fittedTransition.points;

    if (transitionPoints.length >= 2) {
      transitionPoints[transitionPoints.length - 1] = arcInfoB.point.clone();
    }

    const transitionEndDirection =
     this.railwayGeometryService.getEndDirectionFromPoints(transitionPoints);

    const arcBTargetDirection = new THREE.Vector3(
      Math.cos(arcInfoB.tangentAngle),
      Math.sin(arcInfoB.tangentAngle),
      0
    );

    if (transitionEndDirection) {
      const endTangentMismatchDeg = this.railwayGeometryService.getSmallestAngleBetweenVectorsDeg(
        transitionEndDirection,
        arcBTargetDirection
      );

      console.log('TRANSITION END TANGENT CHECK:', {
        endTangentMismatchDeg,
        transitionEndDirection,
        arcBTargetDirection
      });

      if (endTangentMismatchDeg > 20) {
        this.notificationService.notify({
          type: 'error',
          text: `Transition reaches the second arc, but tangent mismatch is ${endTangentMismatchDeg.toFixed(1)}°. Try another curve type or move arcs closer.`,
          operation: 'arc'
        });
      }
    }

    if (transitionPoints.length < 2) {
      this.notificationService.notify({
        type: 'error',
        text: 'Could not generate transition curve between arcs.',
        operation: 'arc'
      });

      this.hideTransitionPopup();
      return;
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(transitionPoints);

    const material = new THREE.LineBasicMaterial({
      color: 0xff00ff,
      depthTest: false
    });

    const transitionCurve = new THREE.Line(geometry, material);
    transitionCurve.renderOrder = 60;

    transitionCurve.userData = {
      draggable: true,
      type: 'DrawnTransitionCurve',
      transitionCurveType: this.transitionCurveTypeInput,
      isTransitionCurve: true,

      startPoint: transitionPoints[0].clone(),
      endPoint: transitionPoints[transitionPoints.length - 1].clone(),

      startCurvature: arcInfoA.curvature,
      endCurvature: arcInfoB.curvature,

      startTangentAngle: arcInfoA.tangentAngle,
      lengthMeters: fittedTransition.lengthMeters,
      length: fittedTransition.length,
      direction: fittedTransition.direction,
      endTangentMismatchDeg: fittedTransition.endTangentMismatchDeg,

      fromArcEndKind: arcInfoA.endKind,
      toArcEndKind: arcInfoB.endKind
    };

    this.canvasSceneService.scene.add(transitionCurve);

    this.notificationService.notify({
      type: 'success',
      text: `${this.transitionCurveTypeInput} transition curve created between arcs.`,
      operation: 'arc'
    });

    console.log('CURVATURE TRANSITION CREATED BETWEEN ARCS:', {
      curveType: this.transitionCurveTypeInput,
      startCurvature: arcInfoA.curvature,
      endCurvature: arcInfoB.curvature,
      lengthMeters: transitionLengthMeters,
      startPoint: transitionPoints[0],
      endPoint: transitionPoints[transitionPoints.length - 1]
    });

    this.resetArcTransitionState();
  }

  private getAllSnapEndpoints(): THREE.Vector3[] {
    const endpoints: THREE.Vector3[] = [];

    this.canvasSceneService.scene.traverse((object) => {
      if (!(object instanceof THREE.Line)) return;

      const type = object.userData['type'];

      // Normal line / curve / arc endpoints
      if (
        type === 'DrawnLine' ||
        type === 'DrawnCurve' ||
        type === 'DrawnArc' ||
        type === 'DrawnTransitionCurve'
      ) {
        if (object.userData['startPoint']) {
          endpoints.push(object.userData['startPoint'].clone());
        }

        if (object.userData['endPoint']) {
          endpoints.push(object.userData['endPoint'].clone());
        }
      }

      // Polyline endpoints
      if (type === 'Polyline' || object.userData['isPolyline']) {
        const points = object.userData['points'] as THREE.Vector3[] | undefined;

        if (points && points.length >= 2) {
          endpoints.push(points[0].clone());
          endpoints.push(points[points.length - 1].clone());
        }
      }
    });

    return endpoints;
  }



  private getEndpointSnapPoint(event: PointerEvent): THREE.Vector3 | null {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    const mouseScreen = new THREE.Vector2(
      event.clientX - rect.left,
      event.clientY - rect.top
    );

    const endpoints = this.getAllSnapEndpoints();

    let closestPoint: THREE.Vector3 | null = null;
    let closestDistance = Infinity;

    for (const endpoint of endpoints) {
      const endpointScreen = this.getCanvasScreenPoint(endpoint);
      const distancePx = endpointScreen.distanceTo(mouseScreen);

      if (distancePx < closestDistance) {
        closestDistance = distancePx;
        closestPoint = endpoint;
      }
    }

    if (closestPoint && closestDistance <= this.SNAP_DISTANCE_PX) {
      return closestPoint.clone();
    }

    return null;
  }

  private showSnapMarker(point: THREE.Vector3, label: string): void {
    this.currentSnapPoint = point.clone();

    if (!this.snapMarker) {
      const geometry = new THREE.BoxGeometry(0.12, 0.12, 0.12);
      const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        depthTest: false
      });

      this.snapMarker = new THREE.Mesh(geometry, material);
      this.snapMarker.renderOrder = 999;
      this.canvasSceneService.scene.add(this.snapMarker);
    }

    this.snapMarker.position.set(point.x, point.y, 0.6);

    const screen = this.worldToCanvasScreenPoint(point);

    this.snapLabelScreen.left = screen.left + 12;
    this.snapLabelScreen.top = screen.top + 8;

    this.snapLabelText = label;
    this.isSnapLabelVisible = true;

    this.cdr.detectChanges();
  }

  private hideSnapMarker(): void {
    this.currentSnapPoint = null;
    this.isSnapLabelVisible = false;

    this.disposePreviewObject(this.snapMarker);
    this.snapMarker = null;
  }


  private updateLineDynamicInfo(start: THREE.Vector3, end: THREE.Vector3): void {
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    const lengthWorld = Math.sqrt(dx * dx + dy * dy);
    const lengthMeters = this.worldUnitsToMeters(lengthWorld);

    const absoluteAngleDeg = this.railwayGeometryService.getAbsoluteAngleDeg(start, end);

    let displayAngleDeg = absoluteAngleDeg;

    // First line: angle is relative to canvas horizontal axis.
    // Next lines: angle is relative to previous line direction.
    if (this.previousLineAngleDeg !== null) {
      displayAngleDeg = this.railwayGeometryService.normalizeRelativeAngle(
        absoluteAngleDeg - this.previousLineAngleDeg
      );
    }

    this.liveLineLength = lengthMeters.toFixed(2);
    this.liveLineAngle = displayAngleDeg.toFixed(2);

    const screen = this.worldToCanvasScreenPoint(end);

    this.lineHudScreen.left = screen.left + 12;
    this.lineHudScreen.top = screen.top - 10;
  }

  private removePreviewLine(): void {
    this.disposePreviewObject(this.previewLine);
    this.previewLine = null;
  }

 private finalizeLineFromPoint(
  endPoint: THREE.Vector3
): void {

  if (!this.lineStartPoint) {
    return;
  }

  const startPoint =
    this.lineStartPoint.clone();

  const createdLineAngleDeg =
    this.railwayGeometryService.getAbsoluteAngleDeg(
      startPoint,
      endPoint
    );

  const finalLine =
    this.createLine(
      startPoint,
      endPoint
    );

  this.canvasSceneService.scene.add(
    finalLine
  );

  this.previousLineAngleDeg =
    createdLineAngleDeg;

  this.removePreviewLine();
  this.hideSnapMarker();

  /*
   * The line is COMPLETE after the second click.
   */
  this.isDrawingLine = false;

  this.lineStartPoint = null;
  this.lineDirectionPoint = null;

  this.lineLengthInput = '';
  this.lineAngleInput = '';

  this.liveLineLength = '0.00';
  this.liveLineAngle = '0.00';

  this.isLineLengthBoxVisible = false;
  this.isLineDirectionLocked = false;

  this.eventService.updateCanvasStatus({
    mode: 'Select'
  });

  /*
   * Now that the new line exists, check both of its
   * junctions for a 3-direction turnout.
   */
  const startDirectionCount =
    this.switchesDrawingService.countTrackDirectionsAtPoint(
      this.canvasSceneService.scene,
      startPoint
    );

  const endDirectionCount =
    this.switchesDrawingService.countTrackDirectionsAtPoint(
      this.canvasSceneService.scene,
      endPoint
    );

  console.log('LINE CREATED:', {
    startPoint,
    endPoint,
    startDirectionCount,
    endDirectionCount
  });

  let switchPoint: THREE.Vector3 | null =
    null;

  /*
   * Normally a branch starts from an existing line,
   * therefore check the start first.
   */
  if (startDirectionCount === 3) {
    switchPoint = startPoint.clone();
  }
  else if (endDirectionCount === 3) {
    switchPoint = endPoint.clone();
  }

  if (switchPoint) {

    const existingMainLine =
      this.findDrawnLineNearPoint(
        switchPoint,
        0.5
      );

    if (
      existingMainLine &&
      existingMainLine.line !== finalLine
    ) {

      this.pendingSwitchMainLine =
        existingMainLine.line;

      this.pendingSwitchBranchLine =
        finalLine;

      this.pendingSwitchPoint =
        switchPoint.clone();

      const screen =
        this.worldToCanvasScreenPoint(
          switchPoint
        );

      this.switchPopupScreen = {
        left: screen.left + 12,
        top: screen.top + 12
      };

      this.switchPopupVisible = true;

      console.log(
        'SWITCH PLACEMENT AVAILABLE:',
        {
          point: switchPoint,
          directionCount:
            startDirectionCount === 3
              ? startDirectionCount
              : endDirectionCount
        }
      );
    }
  }

  this.cdr.detectChanges();
}


public confirmSwitchPlacement(): void {

  if (
    !this.pendingSwitchMainLine ||
    !this.pendingSwitchBranchLine ||
    !this.pendingSwitchPoint
  ) {
    return;
  }

  const switchGroup = this.switchesDrawingService.createSwitch(
    this.canvasSceneService.scene,
    this.pendingSwitchMainLine,
    this.pendingSwitchBranchLine,
    this.pendingSwitchPoint.clone()
  );

  if (!switchGroup) {
    return;
  }

  this.switchPopupVisible = false;

  this.pendingSwitchMainLine = null;
  this.pendingSwitchBranchLine = null;
  this.pendingSwitchPoint = null;

  console.log('DRAWN SWITCH CREATED', switchGroup);
}


public cancelSwitchPlacement(): void {
  this.switchPopupVisible = false;

  this.pendingSwitchMainLine = null;
  this.pendingSwitchBranchLine = null;
  this.pendingSwitchPoint = null;
}

  public confirmDynamicLine(): void {
    if (!this.lineStartPoint) return;

    const lengthMeters = Number(this.lineLengthInput.replace(',', '.'));

    if (!Number.isFinite(lengthMeters) || lengthMeters <= 0) {
      this.notificationService.notify({
        type: 'error',
        text: 'Please enter a valid line length.',
        operation: 'line'
      });

      return;
    }

    let inputAngleDeg = Number(this.lineAngleInput.replace(',', '.'));

    // If angle box is empty, use the current live relative angle
    if (!Number.isFinite(inputAngleDeg)) {
      inputAngleDeg = Number(this.liveLineAngle);
    }

    // First line: angle is absolute from horizontal.
    // Next lines: input angle is relative to previous line.
    const baseAngleDeg = this.previousLineAngleDeg ?? 0;
    const finalAbsoluteAngleDeg = baseAngleDeg + inputAngleDeg;

    const angleRad = finalAbsoluteAngleDeg * Math.PI / 180;
    const lengthWorld = this.metersToWorldUnits(lengthMeters);

    const endPoint = new THREE.Vector3(
      this.lineStartPoint.x + Math.cos(angleRad) * lengthWorld,
      this.lineStartPoint.y + Math.sin(angleRad) * lengthWorld,
      0
    );

    this.finalizeLineFromPoint(endPoint);
  }

  private cancelLineDrawing(): void {
    this.isDrawingLine = false;

    this.lineStartPoint = null;
    this.lineDirectionPoint = null;
    this.previousLineAngleDeg = null;
    this.lineLengthInput = '';
    this.lineAngleInput = '';

    this.liveLineLength = '0.00';
    this.liveLineAngle = '0.00';

    this.isLineLengthBoxVisible = false;
    this.isLineDirectionLocked = false;

    this.removePreviewLine();
    this.hideSnapMarker();

    this.eventService.updateCanvasStatus({
      mode: 'Select'
    });

    this.cdr.detectChanges();

    console.log('LINE DRAWING MODE OFF');
  }

  /*public confirmLineLength(): void {
    if (!this.lineStartPoint || !this.lineDirectionPoint) {
      return;
    }
  
    const lengthMeters = Number(this.lineLengthInput.replace(',', '.'));
  
    if (!Number.isFinite(lengthMeters) || lengthMeters <= 0) {
      console.warn('Invalid line length:', this.lineLengthInput);
      return;
    }
  
    const direction = this.lineDirectionPoint
      .clone()
      .sub(this.lineStartPoint);
  
    direction.z = 0;
  
    if (direction.length() === 0) {
      return;
    }
  
    direction.normalize();
  
    const lengthWorldUnits = this.metersToWorldUnits(lengthMeters);
  
    const endPoint = this.lineStartPoint
      .clone()
      .add(direction.multiplyScalar(lengthWorldUnits));
  
    if (this.previewLine) {
      this.canvasSceneService.scene.remove(this.previewLine);
      this.previewLine.geometry.dispose();
  
      const material = this.previewLine.material;
  
      if (Array.isArray(material)) {
        material.forEach((m) => m.dispose());
      } else {
        material.dispose();
      }
  
      this.previewLine = null;
    }
  
    const line = this.createLine(this.lineStartPoint, endPoint);
    this.canvasSceneService.scene.add(line);
  
  this.isDrawingLine = false;
  this.isLineLengthBoxVisible = false;
  this.isLineDirectionLocked = false;
  this.lineStartPoint = null;
  this.lineDirectionPoint = null;
  this.lineLengthInput = '';
  
  this.eventService.updateCanvasStatus({
    mode: 'Select'
  });
  
  this.cdr.detectChanges();
  
  console.log(`LINE CREATED: ${lengthMeters} m`);
  }*/

  private getWorldPoint(event: PointerEvent): THREE.Vector3 {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, this.canvasSceneService.camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const point = new THREE.Vector3();

    raycaster.ray.intersectPlane(plane, point);

    return point;
  }

  private highlightLayerObjects(
      layerName: string,
      clearExisting: boolean = true
    ): void {

      if (clearExisting) {
        this.clearLayerHighlights();
      }

    const matchingObjects: THREE.Object3D[] = [];

    this.canvasSceneService.scene.traverse((object) => {
      if (this.canvasSelectionService.isObjectInLayer(object, layerName)) {
        matchingObjects.push(object);
      }
    });

    if (matchingObjects.length === 0) {
      this.notificationService.notify({
        type: 'error',
        text: `No ${layerName} found in the current canvas.`,
        operation: 'plan'
      });

      console.log(`No ${layerName} found in canvas`);
      return;
    }

    matchingObjects.forEach((object) => {
      this.canvasSelectionService.applyLayerHighlight(
        object,
        this.highlightedObjects
      );
    });

    this.notificationService.notify({
      type: 'success',
      text: `${matchingObjects.length} ${layerName} object(s) highlighted.`,
      operation: 'layer'
    });

    console.log(`${matchingObjects.length} ${layerName} object(s) highlighted`);
  }

  
  private clearLayerHighlights(): void {
    this.canvasSelectionService.clearLayerHighlights(
      this.highlightedObjects
    );

    this.highlightedObjects = [];
  }
  private getCanvasCenterWorldPoint(): THREE.Vector3 {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    const fakeEvent = {
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2
    } as PointerEvent;

    return this.getWorldPoint(fakeEvent);
  }

  
private rotateSelectedLabel(degrees: number): void {
  if (
    !(this.selectedAsset instanceof THREE.Sprite) ||
    this.selectedAsset.userData['isAssetLabel'] !== true
  ) {
    return;
  }

  const label = this.selectedAsset;
  const material = label.material as THREE.SpriteMaterial;

  material.rotation += THREE.MathUtils.degToRad(degrees);

  label.userData['labelRotation'] = material.rotation;
  material.needsUpdate = true;
}


  private getAssetUnderMouse(event: PointerEvent): THREE.Object3D | null {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, this.canvasSceneService.camera);

    raycaster.params.Line = {
      threshold: 0.5
    };

    const intersects = raycaster.intersectObjects(
      this.canvasSceneService.scene.children,
      true
    );

    
    // Give ID labels priority over their parent railway symbols.
    // This allows clicking AX001, BG001, etc. independently.

    const labelHit = intersects.find(
      hit =>
        hit.object instanceof THREE.Sprite &&
        hit.object.userData['isAssetLabel'] === true
    );

    if (labelHit) {
      return labelHit.object;
    }


    for (const hit of intersects) {
      let obj: THREE.Object3D | null = hit.object;

      while (obj) {

        if (
          obj.userData['type'] === 'ResizeHandle' ||
          obj.userData['type'] === 'RotateHandle' ||
          obj.userData['type'] === 'RotateHandleLine' ||
          obj.userData['type'] === 'SelectionBox' ||
          obj.userData['type'] === 'CurveHandle' ||
          obj.userData['type'] === 'CurveHandleGroup' ||
          obj.userData['type'] === 'PreviewLine' ||
          obj.userData['type'] === 'PreviewCircle' ||
          obj.userData['type'] === 'PreviewCurve'
        ) {
          return null;
        }
        const type = obj.userData?.['type'];

        const isSelectableImportedElement =
          type === 'BackendTrack' ||
          type === 'Switch';

        if (
          obj.userData['draggable'] ||
          isSelectableImportedElement
        ) {

          // Dropped railway symbols are Groups.
          // Always select the whole Group instead of one child Mesh.
          let selectableRoot: THREE.Object3D = obj;

          let parent = obj.parent;

          while (parent && parent !== this.canvasSceneService.scene) {

            if (
              parent.userData?.['type'] === 'DroppedAsset' ||
              parent.userData?.['canvasItem']
            ) {
              selectableRoot = parent;
            }

            parent = parent.parent;
          }

          return selectableRoot;
        }

        obj = obj.parent;
      }
    }

    return null;
  }

  private getCurveHandleUnderMouse(event: PointerEvent): THREE.Mesh | null {
    if (!this.curveHandleGroup) {
      return null;
    }

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();

    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, this.canvasSceneService.camera);

    const intersects = raycaster.intersectObjects(
      this.curveHandleGroup.children,
      true
    );

    if (intersects.length === 0) {
      return null;
    }

    return intersects[0].object as THREE.Mesh;
  }

  
  onCanvasScroll(event: Event): void {
    /*const scrollElement = event.target as HTMLDivElement;

    const scrollX = scrollElement.scrollLeft;
    const scrollY = scrollElement.scrollTop;

    this.canvasSceneService.moveCameraByScroll(scrollX, scrollY);*/
  }

  onScrollPointerDown(event: PointerEvent): void {
    if (event.button !== 1) {
      return;
    }

    console.log('pointer down');

    this.isDraggingScrollbar = true;

    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;

    this.scrollWrapper.nativeElement.setPointerCapture(event.pointerId);
    this.scrollWrapper.nativeElement.style.cursor = 'grabbing';

    event.preventDefault();
  }

  onScrollPointerMove(event: PointerEvent): void {
    if (!this.isDraggingScrollbar) return;

    console.log('pointer move');

    const scrollElement = this.scrollWrapper.nativeElement;

    const deltaX = event.clientX - this.lastMouseX;
    const deltaY = event.clientY - this.lastMouseY;

    scrollElement.scrollLeft -= deltaX;
    scrollElement.scrollTop -= deltaY;

    console.log('scrollLeft:', scrollElement.scrollLeft, 'scrollTop:', scrollElement.scrollTop);

    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;

    event.preventDefault();
  }

  onScrollPointerUp(): void {
    console.log('pointer up');

    this.isDraggingScrollbar = false;

    if (this.scrollWrapper) {
      this.scrollWrapper.nativeElement.style.cursor = 'grab';
    }
  }
  
  private addSvgToCanvas(
    svgSrc: string,
    point: THREE.Vector3
  ): void {

    this.canvasAssetService.addSvgToCanvas(
      this.canvasSceneService.scene,
      svgSrc,
      point,
      (mesh: THREE.Group) => {
        this.selectedAsset = mesh;
      }
    );

  }

  private resizeSelectedAsset(currentPoint: THREE.Vector3): void {
    if (!this.selectedAsset) return;

    this.canvasSelectionService.resizeSelectedAsset(
      this.selectedAsset,
      currentPoint,
      this.resizeCenter,
      this.resizeStartDistance,
      this.resizeStartScale
    );

    this.showSelectionBox(this.selectedAsset);
  }

  private showSelectionBox(asset: THREE.Object3D): void {
    // Remove previous rectangle and handles
    this.clearSelectionBox();

    // Create new selection visuals
    const result = this.canvasSelectionService.showSelectionBox(
      asset,
      this.canvasSceneService.scene
    );

    // Store references for further interactions
    this.selectionBox = result.selectionBox;
    this.resizeHandles = result.resizeHandles;
    this.rotateHandle = result.rotateHandle;
  }

  private clearSelectionBox(): void {
  this.canvasSelectionService.clearSelectionBox(
    this.canvasSceneService.scene,
    this.selectionBox,
    this.resizeHandles,
    this.rotateHandle
  );

  this.selectionBox = null;
  this.resizeHandles = [];
  this.rotateHandle = null;
}

  private getResizeHandleUnderMouse(
    event: PointerEvent
  ): THREE.Object3D | null {
    return this.canvasSelectionService.getResizeHandleUnderMouse(
      event,
      this.canvasRef.nativeElement,
      this.canvasSceneService.camera,
      this.resizeHandles
    );
  }

  private getRotateHandleUnderMouse(
    event: PointerEvent
  ): THREE.Object3D | null {
    return this.canvasSelectionService.getRotateHandleUnderMouse(
      event,
      this.canvasRef.nativeElement,
      this.canvasSceneService.camera,
      this.rotateHandle
    );
  }

  
  private deleteSelectedAsset(): void {

    const assetsToDelete =
      this.selectedAssets.length > 0
        ? [...this.selectedAssets]
        : this.selectedAsset
          ? [this.selectedAsset]
          : [];

    if (assetsToDelete.length === 0) {
      console.log('No selected asset to delete');
      return;
    }

    // Clear selection visuals
    this.clearSelectionBox();
    this.clearCurveHandles();

    // Reset curve state
    this.selectedCurve = null;
    this.isDraggingCurveHandle = false;
    this.activeCurveHandleKind = null;

    // Delete assets through the service
    this.canvasAssetService.deleteAssets(
      assetsToDelete,
      this.canvasSceneService.scene
    );

    // Reset asset selection
    this.selectedAsset = null;
    this.selectedAssets = [];

    // Reset interaction state
    this.isDraggingAsset = false;
    this.isResizingAsset = false;
    this.isRotatingAsset = false;
    this.activeResizeHandle = null;

  }

  
private duplicateSelectedAsset(): void {

  if (!this.selectedAsset) {
    console.log('No selected asset to duplicate');
    return;
  }

  const duplicate = this.canvasAssetService.duplicateAsset(
    this.selectedAsset,
    this.canvasSceneService.scene
  );

  // Select the newly duplicated asset
  this.selectedAsset = duplicate;

  // Update the selection box
  this.clearSelectionBox();
  this.showSelectionBox(duplicate);

}
  
 
private mirrorSelectedAsset(
  axis: 'horizontal' | 'vertical'
): void {

  if (!this.selectedAsset) {
    console.log('No selected asset to mirror');
    return;
  }

  const mirroredAsset = this.canvasAssetService.mirrorAsset(
    this.selectedAsset,
    this.canvasSceneService.scene,
    axis
  );

  // Update selected asset
  this.selectedAsset = mirroredAsset;

  // Refresh the selection box
  this.showSelectionBox(mirroredAsset);
}

  private drawRinfSections(
    sections: Array<{
      sectionUri: string;
      sectionLabel: string | null;
      coordinates: Array<{
        longitude: number;
        latitude: number;
      }>;
    }>
  ): void {
    const drawableSections = sections.filter(
      section =>
        Array.isArray(section.coordinates) &&
        section.coordinates.length >= 2
    );

    if (drawableSections.length === 0) {
      console.warn(
        'No drawable RINF sections received.'
      );
      return;
    }

    const existingRoute =
      this.canvasSceneService.scene.getObjectByName(
        'rinf-enriched-route'
      );

    if (existingRoute) {
      existingRoute.removeFromParent();
    }

    const allCoordinates =
      drawableSections.flatMap(
        section => section.coordinates
      );

    const originLongitude =
      allCoordinates[0].longitude;

    const originLatitude =
      allCoordinates[0].latitude;

    const earthRadiusMeters =
      6_371_000;

    const originLatitudeRadians =
      THREE.MathUtils.degToRad(
        originLatitude
      );

    const routeGroup =
      new THREE.Group();

    routeGroup.name =
      'rinf-enriched-route';

    for (const section of drawableSections) {
      const points =
        section.coordinates.map(
          coordinate => {
            const longitudeDifferenceRadians =
              THREE.MathUtils.degToRad(
                coordinate.longitude -
                originLongitude
              );

            const latitudeDifferenceRadians =
              THREE.MathUtils.degToRad(
                coordinate.latitude -
                originLatitude
              );

            const x =
              earthRadiusMeters *
              longitudeDifferenceRadians *
              Math.cos(
                originLatitudeRadians
              );

            const y =
              earthRadiusMeters *
              latitudeDifferenceRadians;

            return new THREE.Vector3(
              x,
              y,
              0.3
            );
          }
        );

      const geometry =
        new THREE.BufferGeometry()
          .setFromPoints(points);

      const material =
        new THREE.LineBasicMaterial({
          color: 0xffffff,
          depthTest: false
        });

      const line =
        new THREE.Line(
          geometry,
          material
        );

      line.name =
        section.sectionLabel ??
        section.sectionUri;

      line.userData = {
        type: 'Track',
        layer: 'Tracks',
        source: 'RINF-OSM',
        sectionUri:
          section.sectionUri,
        sectionLabel:
          section.sectionLabel,
        draggable: false
      };

      line.renderOrder = 40;

      routeGroup.add(line);
    }

    const bounds =
      new THREE.Box3()
        .setFromObject(routeGroup);

    const center =
      bounds.getCenter(
        new THREE.Vector3()
      );

    routeGroup.position.sub(center);

    this.canvasSceneService.scene.add(
      routeGroup
    );

    this.canvasSceneService.fitCameraToScene();

    console.log(
      `${drawableSections.length} RINF sections drawn on canvas.`
    );
  }

  private disposePreviewObject(
    object: THREE.Line | THREE.Mesh | null
  ): void {
    if (!object) {
      return;
    }

    this.canvasSceneService.scene.remove(object);
    object.geometry.dispose();

    const material = object.material;

    if (Array.isArray(material)) {
      material.forEach((m) => m.dispose());
    } else {
      material.dispose();
    }
  }

  ngAfterViewInit() {
    if (!this.initialized) {
      this.initializeCanvas();
      this.initialized = true;

      // Load sample railway track layout directly when canvas opens
      setTimeout(() => {
        this.canvasSceneService.loadRailwayData();
      }, 100);
    }

    this.eventService.triggerLineMode$.subscribe(() => {
      console.log('LINE MODE RECEIVED IN CANVAS');
      this.startLineDrawing();
    });

    this.eventService.triggerPolylineMode$.subscribe(() => {
      this.startPolylineDrawing();
    });

    this.eventService.triggerCircleMode$.subscribe(() => {
      this.startCircleDrawing();
    });

    this.eventService.triggerCurveMode$.subscribe(() => {
      this.startCurveDrawing();
    });

    this.eventService.selectedAsset$.subscribe((asset) => {
      console.log('ASSET RECEIVED IN CANVAS:', asset);
      this.addSvgToCanvas(asset.file, this.getCanvasCenterWorldPoint());
    });

    this.eventService.deleteSelected$.subscribe(() => {
      console.log('DELETE SELECTED RECEIVED IN CANVAS');
      this.deleteSelectedAsset();
    });

    this.eventService.duplicateSelected$.subscribe(() => {
      console.count('DUPLICATE EVENT RECEIVED');
      this.duplicateSelectedAsset();
    });

    this.eventService.mirrorSelected$.subscribe((axis) => {
      console.log('MIRROR SELECTED RECEIVED IN CANVAS:', axis);
      this.mirrorSelectedAsset(axis);
    });

    this.eventService.centerView$.subscribe(() => {
      console.log('CENTER VIEW RECEIVED IN CANVAS');
      this.canvasSceneService.fitCameraToScene();
    });

   this.eventService.layerHighlight$.subscribe((layerNames) => {

      console.log(
        'LAYER HIGHLIGHTS RECEIVED IN CANVAS:',
        layerNames
      );

      // Clear previous highlights once
      this.clearLayerHighlights();

      // Highlight all currently selected layers
      layerNames.forEach((layerName) => {
        this.highlightLayerObjects(layerName, false);
      });

    });
    this.eventService.triggerArcMode$.subscribe(() => {
      this.startArcDrawing();
    });

    this.eventService.triggerClothoidMode$.subscribe(() => {
      this.startClothoidDrawing();
    });

    this.eventService.rinfSections$
      .subscribe((sections) => {
        console.log(
          'RINF SECTIONS RECEIVED IN CANVAS:',
          sections
        );

        this.drawRinfSections(sections);
      });

  }
  ngOnDestroy() {
    this.sub.unsubscribe(); // clean up
  }
}