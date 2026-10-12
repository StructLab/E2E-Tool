import {
  Component,
  ElementRef,
  ViewChild,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';

import * as THREE from 'three';
import { CanvasSceneService } from './canvasServices/canvas-scene.service';
import { Subscription } from 'rxjs';
import { EventService } from '../event.service';
import { Guide } from "../guide/guide";
import { NotificationService } from '../services/notification.service';
import { AfterViewInit } from '@angular/core';
//import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { addIcon } from '../generic/canvas-item';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreateLine, CreateSwitch, MoveObject, ValidateEngineering } from '../api/end_points';

type GeometryEndInfo = {
  object: THREE.Line;
  point: THREE.Vector3;
  endKind: 'start' | 'end';
  tangentAngle: number;
  curvature: number;
  direction: 'CW' | 'CCW';
};

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
    private eventService: EventService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
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

  initializeCanvas() {
    const width = this.container.nativeElement.clientWidth;
    const height = this.container.nativeElement.clientHeight;

    // Initialize the scene service
    this.canvasSceneService.init(width, height, this.canvasRef);

    // Start rendering
    this.canvasSceneService.render(this.container.nativeElement);

    //const testClothoid = this.createTestClothoid();
    //this.canvasSceneService.scene.add(testClothoid);

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

        const finalCircle = this.createCircle(this.circleCenterPoint, point);
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

        const finalArc = this.createRailwayArc(
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
          this.previewPolylineSegment.geometry.dispose();

          const material = this.previewPolylineSegment.material;
          if (Array.isArray(material)) {
            material.forEach(m => m.dispose());
          } else {
            material.dispose();
          }

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

        const finalCurve = this.createCurve(
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
          // Ctrl-click or Shift-click = add/remove item from multi-selection
          const assetType = asset.userData?.['type'];

          const isImportedElement =
            assetType === 'BackendTrack' ||
            assetType === 'Switch';

          if (isImportedElement) {
            this.highlightSelectedImportedElement(asset);

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
        this.clearSelectedImportedElementHighlight();
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
        const delta = new THREE.Vector3().subVectors(point, lastPoint);

        const lengthWorld = delta.length();
        const lengthMeters = this.worldUnitsToMeters(lengthWorld);

        let angleDeg = THREE.MathUtils.radToDeg(Math.atan2(delta.y, delta.x));

        if (angleDeg < 0) {
          angleDeg += 360;
        }

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
        this.resizeLineEnd(this.selectedAsset, point);
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
      // 3. Move asset if asset drag mode is active
      if (this.isDraggingAsset && this.selectedAsset) {

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
          this.showSelectionBox(this.selectedAsset);
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
    this.isDrawingLine = true;

    this.isDrawingCircle = false;
    this.isDrawingCurve = false;
    this.isDrawingArc = false;
    this.isDrawingClothoid = false;
    this.isDrawingPolyline = false;

    this.lineStartPoint = null;
    this.lineDirectionPoint = null;
    this.previousLineAngleDeg = null;

    this.lineLengthInput = '';
    this.lineAngleInput = '';

    this.liveLineLength = '0.00';
    this.liveLineAngle = '0.00';

    this.isLineLengthBoxVisible = false;
    this.isLineDirectionLocked = false;

    this.eventService.updateCanvasStatus({
      mode: 'Line'
    });

    console.log('LINE DRAWING MODE ON');
  }

  startCircleDrawing(): void {
    this.isDrawingCircle = true;
    this.isDrawingLine = false;
    this.isDrawingCurve = false;
    this.isDrawingClothoid = false;
    this.isDrawingPolyline = false;

    this.circleCenterPoint = null;

    this.eventService.updateCanvasStatus({
      mode: 'Circle'
    });

    console.log('CIRCLE DRAWING MODE ON');
  }

  startCurveDrawing(): void {
    this.isDrawingCurve = true;

    this.isDrawingArc = false;
    this.isDrawingLine = false;
    this.isDrawingCircle = false;
    this.isDrawingClothoid = false;
    this.isDrawingPolyline = false;

    this.curveStartPoint = null;
    this.curveControlPoint = null;

    this.eventService.updateCanvasStatus({
      mode: 'Curve'
    });

    console.log('CURVE DRAWING MODE ON');
  }

  startArcDrawing(): void {
    this.isDrawingArc = true;

    this.isDrawingCurve = false;
    this.isDrawingLine = false;
    this.isDrawingCircle = false;
    this.isDrawingClothoid = false;
    this.isDrawingPolyline = false;

    this.arcStartPoint = null;

    this.eventService.updateCanvasStatus({
      mode: 'Arc'
    });

    console.log('ARC DRAWING MODE ON');
  }

  startClothoidDrawing(): void {
    this.isDrawingClothoid = true;

    this.isDrawingLine = false;
    this.isDrawingCircle = false;
    this.isDrawingCurve = false;
    this.isDrawingArc = false;
    this.isDrawingPolyline = false;

    this.clothoidStartPoint = null;

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
      mode: 'Clothoid'
    });

    console.log('CLOTHOID DRAWING MODE ON');
  }

  startPolylineDrawing(): void {
    this.isDrawingPolyline = true;

    this.isDrawingLine = false;
    this.isDrawingCircle = false;
    this.isDrawingCurve = false;
    this.isDrawingArc = false;
    this.isDrawingClothoid = false;

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

    if (this.activePolyline) {
      this.canvasSceneService.scene.remove(this.activePolyline);
      this.activePolyline.geometry.dispose();

      const material = this.activePolyline.material;
      if (Array.isArray(material)) {
        material.forEach(m => m.dispose());
      } else {
        material.dispose();
      }

      this.activePolyline = null;
    }

    if (this.previewPolylineSegment) {
      this.canvasSceneService.scene.remove(this.previewPolylineSegment);
      this.previewPolylineSegment.geometry.dispose();

      const material = this.previewPolylineSegment.material;
      if (Array.isArray(material)) {
        material.forEach(m => m.dispose());
      } else {
        material.dispose();
      }

      this.previewPolylineSegment = null;
    }

    this.eventService.updateCanvasStatus({
      mode: 'Polyline'
    });

    console.log('POLYLINE DRAWING MODE ON');
  }

  private finishPolyline(): void {
    if (this.polylinePoints.length < 2) {
      this.cancelPolyline();
      return;
    }

    // Remove preview/full active polyline
    if (this.activePolyline) {
      this.canvasSceneService.scene.remove(this.activePolyline);
      this.activePolyline.geometry.dispose();

      const material = this.activePolyline.material;
      if (Array.isArray(material)) {
        material.forEach(m => m.dispose());
      } else {
        material.dispose();
      }

      this.activePolyline = null;
    }

    // Remove live preview segment
    if (this.previewPolylineSegment) {
      this.canvasSceneService.scene.remove(this.previewPolylineSegment);
      this.previewPolylineSegment.geometry.dispose();

      const material = this.previewPolylineSegment.material;
      if (Array.isArray(material)) {
        material.forEach(m => m.dispose());
      } else {
        material.dispose();
      }

      this.previewPolylineSegment = null;
    }

    // Create separate line objects for each polyline segment
    for (let i = 0; i < this.polylinePoints.length - 1; i++) {
      const startPoint = this.polylinePoints[i].clone();
      const endPoint = this.polylinePoints[i + 1].clone();

      if (startPoint.distanceTo(endPoint) < 0.001) {
        continue;
      }

      const segmentLine = this.createPolylineSegmentLine(startPoint, endPoint, i);

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

  private updateActivePolyline(): void {
    if (this.polylinePoints.length < 2) {
      return;
    }

    if (this.activePolyline) {
      this.canvasSceneService.scene.remove(this.activePolyline);
      this.activePolyline.geometry.dispose();

      const material = this.activePolyline.material;
      if (Array.isArray(material)) {
        material.forEach(m => m.dispose());
      } else {
        material.dispose();
      }

      this.activePolyline = null;
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(this.polylinePoints);

    const material = new THREE.LineBasicMaterial({
      color: 0x00ffff
    });

    this.activePolyline = new THREE.Line(geometry, material);

    this.activePolyline.userData = {
      type: 'PolylinePreview',
      isPolyline: true,
      isPreview: true,
      points: this.polylinePoints.map(p => p.clone())
    };

    this.canvasSceneService.scene.add(this.activePolyline);
  }

  private cancelPolyline(): void {
    if (this.activePolyline) {
      this.canvasSceneService.scene.remove(this.activePolyline);
      this.activePolyline.geometry.dispose();

      const material = this.activePolyline.material;
      if (Array.isArray(material)) {
        material.forEach(m => m.dispose());
      } else {
        material.dispose();
      }

      this.activePolyline = null;
    }

    if (this.previewPolylineSegment) {
      this.canvasSceneService.scene.remove(this.previewPolylineSegment);
      this.previewPolylineSegment.geometry.dispose();

      const material = this.previewPolylineSegment.material;
      if (Array.isArray(material)) {
        material.forEach(m => m.dispose());
      } else {
        material.dispose();
      }

      this.previewPolylineSegment = null;
    }

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

  private updatePolylinePreviewSegment(currentPoint: THREE.Vector3): void {
    if (!this.isDrawingPolyline || this.polylinePoints.length === 0) {
      return;
    }

    const lastPoint = this.polylinePoints[this.polylinePoints.length - 1];

    if (this.previewPolylineSegment) {
      this.canvasSceneService.scene.remove(this.previewPolylineSegment);
      this.previewPolylineSegment.geometry.dispose();

      const material = this.previewPolylineSegment.material;
      if (Array.isArray(material)) {
        material.forEach(m => m.dispose());
      } else {
        material.dispose();
      }

      this.previewPolylineSegment = null;
    }

    const geometry = new THREE.BufferGeometry().setFromPoints([
      lastPoint,
      currentPoint
    ]);

    const material = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.45
    });

    this.previewPolylineSegment = new THREE.Line(geometry, material);

    this.previewPolylineSegment.userData = {
      type: 'PolylinePreviewSegment',
      isPreview: true
    };

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

  private createPolylineSegmentLine(
    startPoint: THREE.Vector3,
    endPoint: THREE.Vector3,
    segmentIndex: number
  ): THREE.Line {
    const start = startPoint.clone();
    const end = endPoint.clone();

    const direction = new THREE.Vector3().subVectors(end, start);
    direction.z = 0;

    if (direction.length() > 0.001) {
      direction.normalize();

      // Tiny visual overlap to hide small gaps between separate line objects
      const overlap = 0.04;

      start.add(direction.clone().multiplyScalar(-overlap));
      end.add(direction.clone().multiplyScalar(overlap));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(start.x, start.y, 0.2),
      new THREE.Vector3(end.x, end.y, 0.2)
    ]);

    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      depthTest: false
    });

    const line = new THREE.Line(geometry, material);

    line.renderOrder = 50;

    line.userData['draggable'] = true;
    line.userData['type'] = 'DrawnLine';

    // Important: keep the real mathematical endpoints, not the overlapped display points
    line.userData['startPoint'] = startPoint.clone();
    line.userData['endPoint'] = endPoint.clone();

    line.userData['createdFromPolyline'] = true;
    line.userData['polylineSegmentIndex'] = segmentIndex;

    return line;
  }

  private createCircle(center: THREE.Vector3, radiusPoint: THREE.Vector3): THREE.Line {
    const radius = center.distanceTo(radiusPoint);

    const curve = new THREE.EllipseCurve(
      center.x,
      center.y,
      radius,
      radius,
      0,
      Math.PI * 2,
      false,
      0
    );

    const points = curve.getPoints(96).map(
      point => new THREE.Vector3(point.x, point.y, 0)
    );

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
      color: 0xffffff
    });

    const circle = new THREE.LineLoop(geometry, material);

    circle.userData['draggable'] = true;
    circle.userData['type'] = 'DrawnCircle';
    circle.userData['centerPoint'] = center.clone();
    circle.userData['radius'] = radius;

    return circle;
  }

  private updatePreviewCircle(center: THREE.Vector3, radiusPoint: THREE.Vector3): void {
    if (this.previewCircle) {
      this.canvasSceneService.scene.remove(this.previewCircle);
      this.previewCircle.geometry.dispose();

      const material = this.previewCircle.material;

      if (Array.isArray(material)) {
        material.forEach(m => m.dispose());
      } else {
        material.dispose();
      }

      this.previewCircle = null;
    }

    this.previewCircle = this.createCircle(center, radiusPoint);
    this.previewCircle.userData['draggable'] = false;
    this.previewCircle.userData['type'] = 'PreviewCircle';

    this.canvasSceneService.scene.add(this.previewCircle);
  }

  private createCurve(
    startPoint: THREE.Vector3,
    controlPoint: THREE.Vector3,
    endPoint: THREE.Vector3
  ): THREE.Line {
    const curve = new THREE.QuadraticBezierCurve3(
      startPoint,
      controlPoint,
      endPoint
    );

    const points = curve.getPoints(64);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
      color: 0xffffff
    });

    const line = new THREE.Line(geometry, material);

    line.userData['draggable'] = true;
    line.userData['type'] = 'DrawnCurve';
    line.userData['startPoint'] = startPoint.clone();
    line.userData['controlPoint'] = controlPoint.clone();
    line.userData['endPoint'] = endPoint.clone();

    return line;
  }

  private updateSelectedCurveGeometry(): void {
    if (!this.selectedCurve) {
      return;
    }

    const startPoint = this.selectedCurve.userData['startPoint'] as THREE.Vector3;
    const controlPoint = this.selectedCurve.userData['controlPoint'] as THREE.Vector3;
    const endPoint = this.selectedCurve.userData['endPoint'] as THREE.Vector3;

    const curve = new THREE.QuadraticBezierCurve3(
      startPoint,
      controlPoint,
      endPoint
    );

    const points = curve.getPoints(64);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    this.selectedCurve.geometry.dispose();
    this.selectedCurve.geometry = geometry;
  }

  private updateCurveHandlePositions(): void {
    if (!this.selectedCurve || !this.curveHandleGroup) {
      return;
    }

    const startPoint = this.selectedCurve.userData['startPoint'] as THREE.Vector3;
    const controlPoint = this.selectedCurve.userData['controlPoint'] as THREE.Vector3;
    const endPoint = this.selectedCurve.userData['endPoint'] as THREE.Vector3;

    this.curveHandleGroup.children.forEach((child) => {
      const handle = child as THREE.Mesh;
      const kind = handle.userData['handleKind'];

      if (kind === 'start') {
        handle.position.copy(startPoint);
      }

      if (kind === 'control') {
        handle.position.copy(controlPoint);
      }

      if (kind === 'end') {
        handle.position.copy(endPoint);
      }

      handle.position.z = 2;
    });
  }

  private updatePreviewCurve(
    startPoint: THREE.Vector3,
    controlPoint: THREE.Vector3,
    endPoint: THREE.Vector3
  ): void {
    if (this.previewCurve) {
      this.canvasSceneService.scene.remove(this.previewCurve);
      this.previewCurve.geometry.dispose();

      const material = this.previewCurve.material;

      if (Array.isArray(material)) {
        material.forEach(m => m.dispose());
      } else {
        material.dispose();
      }

      this.previewCurve = null;
    }

    this.previewCurve = this.createCurve(startPoint, controlPoint, endPoint);
    this.previewCurve.userData['draggable'] = false;
    this.previewCurve.userData['type'] = 'PreviewCurve';

    this.canvasSceneService.scene.add(this.previewCurve);
  }

  private createCurveHandle(
    position: THREE.Vector3,
    kind: 'start' | 'control' | 'end',
    curve: THREE.Line
  ): THREE.Mesh {
    const geometry = new THREE.CircleGeometry(0.8, 32);

    const color =
      kind === 'control'
        ? 0x22c55e
        : 0x38bdf8;

    const material = new THREE.MeshBasicMaterial({
      color,
      depthTest: false,
      depthWrite: false
    });

    const handle = new THREE.Mesh(geometry, material);

    handle.position.copy(position);
    handle.position.z = 2;

    handle.userData['type'] = 'CurveHandle';
    handle.userData['handleKind'] = kind;
    handle.userData['curve'] = curve;

    return handle;
  }

  private showCurveHandles(curve: THREE.Line): void {
    this.clearCurveHandles();

    const startPoint = curve.userData['startPoint'] as THREE.Vector3;
    const controlPoint = curve.userData['controlPoint'] as THREE.Vector3;
    const endPoint = curve.userData['endPoint'] as THREE.Vector3;

    if (!startPoint || !controlPoint || !endPoint) {
      return;
    }

    this.curveHandleGroup = new THREE.Group();
    this.curveHandleGroup.userData['type'] = 'CurveHandleGroup';

    const startHandle = this.createCurveHandle(startPoint, 'start', curve);
    const controlHandle = this.createCurveHandle(controlPoint, 'control', curve);
    const endHandle = this.createCurveHandle(endPoint, 'end', curve);

    this.curveHandleGroup.add(startHandle);
    this.curveHandleGroup.add(controlHandle);
    this.curveHandleGroup.add(endHandle);

    this.canvasSceneService.scene.add(this.curveHandleGroup);
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

    this.curveHandleGroup.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();

        const material = child.material;

        if (Array.isArray(material)) {
          material.forEach((m) => m.dispose());
        } else {
          material.dispose();
        }
      }
    });

    this.canvasSceneService.scene.remove(this.curveHandleGroup);
    this.curveHandleGroup = null;
  }

  private createRailwayArc(
    startPoint: THREE.Vector3,
    endPoint: THREE.Vector3,
    radius: number,
    direction: 'CW' | 'CCW'
  ): THREE.Line | null {
    const radiusAbs = Math.abs(radius);

    const start = new THREE.Vector3(startPoint.x, startPoint.y, 0);
    const end = new THREE.Vector3(endPoint.x, endPoint.y, 0);

    const chord = new THREE.Vector3().subVectors(end, start);
    const chordLength = chord.length();

    if (chordLength === 0) {
      console.warn('Arc start and end point cannot be the same');
      return null;
    }

    if (radiusAbs < chordLength / 2) {
      console.warn('Radius is too small for this start/end distance');
      alert('Radius is too small. Radius must be at least half the distance between start and end.');
      return null;
    }

    const midpoint = new THREE.Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5);

    const halfChord = chordLength / 2;

    const centerOffsetDistance = Math.sqrt(
      radiusAbs * radiusAbs - halfChord * halfChord
    );

    const chordDirection = chord.clone().normalize();

    const perpendicular = new THREE.Vector3(
      -chordDirection.y,
      chordDirection.x,
      0
    );

    const centerCandidateA = midpoint
      .clone()
      .add(perpendicular.clone().multiplyScalar(centerOffsetDistance));

    const centerCandidateB = midpoint
      .clone()
      .add(perpendicular.clone().multiplyScalar(-centerOffsetDistance));

    const candidateA = this.buildArcFromCenter(
      start,
      end,
      centerCandidateA,
      direction
    );

    const candidateB = this.buildArcFromCenter(
      start,
      end,
      centerCandidateB,
      direction
    );

    // Choose the smaller arc, not the huge arc around the other side
    const chosen =
      Math.abs(candidateA.sweepAngle) <= Math.abs(candidateB.sweepAngle)
        ? candidateA
        : candidateB;

    const geometry = new THREE.BufferGeometry().setFromPoints(chosen.points);

    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      depthTest: false
    });

    const arc = new THREE.Line(geometry, material);

    arc.renderOrder = 50;
    arc.userData['draggable'] = true;
    arc.userData['type'] = 'DrawnArc';

    arc.userData['startPoint'] = start.clone();
    arc.userData['endPoint'] = end.clone();
    arc.userData['radius'] = radiusAbs;
    arc.userData['direction'] = direction;
    arc.userData['centerPoint'] = chosen.center.clone();

    return arc;
  }

  private generateClothoidPoints(
    startPoint: THREE.Vector3,
    startAngle: number,
    length: number,
    endRadius: number,
    direction: 'CW' | 'CCW',
    segments: number = 80
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];

    if (length <= 0 || endRadius <= 0 || segments < 2) {
      console.warn('Invalid clothoid parameters', {
        startPoint,
        startAngle,
        length,
        endRadius,
        direction,
        segments
      });

      return points;
    }

    const sign = direction === 'CCW' ? 1 : -1;

    let x = startPoint.x;
    let y = startPoint.y;
    let theta = startAngle;

    const ds = length / segments;

    for (let i = 0; i <= segments; i++) {
      points.push(new THREE.Vector3(x, y, startPoint.z));

      const s = i * ds;

      // Clothoid curvature increases linearly from 0 to 1 / endRadius
      const curvature = s / (endRadius * length);

      theta += sign * curvature * ds;

      x += Math.cos(theta) * ds;
      y += Math.sin(theta) * ds;
    }

    return points;
  }

  private getTransitionCurvatureFactor(
    u: number,
    curveType:
      | 'clothoid'
      | 'cubicParabola'
      | 'bloss'
      | 'cosine'
      | 'sine'
      | 'biquadraticParabola'
      | 'wienerBogen'
  ): number {
    const clampedU = Math.max(0, Math.min(1, u));

    switch (curveType) {
      case 'clothoid':
        return clampedU;

      case 'cubicParabola':
        // In the generalized curvature model, cubic parabola behaves as
        // a simple transition approximation.
        return clampedU;

      case 'bloss':
        return 3 * clampedU * clampedU - 2 * clampedU * clampedU * clampedU;

      case 'cosine':
        return (1 - Math.cos(Math.PI * clampedU)) / 2;

      case 'sine':
        return clampedU - Math.sin(2 * Math.PI * clampedU) / (2 * Math.PI);

      case 'biquadraticParabola':
        // Temporary fallback until we implement exact version.
        return clampedU;

      case 'wienerBogen':
        // Temporary fallback until we implement exact version.
        return clampedU;

      default:
        return clampedU;
    }
  }

  private generateTransitionBetweenCurvatures(
    startPoint: THREE.Vector3,
    startAngle: number,
    length: number,
    startCurvature: number,
    endCurvature: number,
    direction: 'CW' | 'CCW',
    curveType:
      | 'clothoid'
      | 'cubicParabola'
      | 'bloss'
      | 'cosine'
      | 'sine'
      | 'biquadraticParabola'
      | 'wienerBogen',
    segments: number = 120
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];

    if (length <= 0 || segments < 2) {
      console.warn('Invalid generalized transition parameters', {
        startPoint,
        startAngle,
        length,
        startCurvature,
        endCurvature,
        direction,
        curveType,
        segments
      });

      return points;
    }

    const sign = direction === 'CCW' ? 1 : -1;

    let x = startPoint.x;
    let y = startPoint.y;
    let theta = startAngle;

    const ds = length / segments;

    for (let i = 0; i <= segments; i++) {
      points.push(new THREE.Vector3(x, y, startPoint.z));

      const s = i * ds;
      const u = s / length;

      const factor = this.getTransitionCurvatureFactor(u, curveType);

      const curvature =
        startCurvature + (endCurvature - startCurvature) * factor;

      theta += sign * curvature * ds;

      x += Math.cos(theta) * ds;
      y += Math.sin(theta) * ds;
    }

    return points;
  }

  private generateTransitionCurvePoints(
    startPoint: THREE.Vector3,
    startAngle: number,
    length: number,
    endRadius: number,
    direction: 'CW' | 'CCW',
    curveType:
      | 'clothoid'
      | 'cubicParabola'
      | 'bloss'
      | 'cosine'
      | 'sine'
      | 'biquadraticParabola'
      | 'wienerBogen',
    segments: number = 120
  ): THREE.Vector3[] {
    const startCurvature = 0;
    const endCurvature = 1 / endRadius;

    return this.generateTransitionBetweenCurvatures(
      startPoint,
      startAngle,
      length,
      startCurvature,
      endCurvature,
      direction,
      curveType,
      segments
    );
  }

  private fitTransitionPointsBetweenArcEnds(
    arcInfoA: GeometryEndInfo,
    arcInfoB: GeometryEndInfo,
    curveType:
      | 'clothoid'
      | 'cubicParabola'
      | 'bloss'
      | 'cosine'
      | 'sine'
      | 'biquadraticParabola'
      | 'wienerBogen'
  ): {
    points: THREE.Vector3[];
    length: number;
    lengthMeters: number;
    direction: 'CW' | 'CCW';
    endTangentMismatchDeg: number;
  } | null {
    const chordLength = arcInfoA.point.distanceTo(arcInfoB.point);

    if (chordLength < 0.001) {
      return null;
    }

    const requestedLengthMeters = Number(this.clothoidLengthInput);
    const requestedLength = Number.isFinite(requestedLengthMeters) && requestedLengthMeters > 0
      ? this.metersToWorldUnits(requestedLengthMeters)
      : chordLength;

    const baseLength = Math.max(chordLength, requestedLength);

    const targetEndDirection = new THREE.Vector3(
      Math.cos(arcInfoB.tangentAngle),
      Math.sin(arcInfoB.tangentAngle),
      0
    ).normalize();

    const directionsToTry: ('CW' | 'CCW')[] = [
      arcInfoA.direction,
      arcInfoA.direction === 'CW' ? 'CCW' : 'CW'
    ];

    let bestResult: {
      points: THREE.Vector3[];
      length: number;
      lengthMeters: number;
      direction: 'CW' | 'CCW';
      endTangentMismatchDeg: number;
      score: number;
    } | null = null;

    for (const direction of directionsToTry) {
      for (let scale = 1; scale <= 4; scale += 0.05) {
        const length = baseLength * scale;

        const rawPoints = this.generateTransitionBetweenCurvatures(
          arcInfoA.point,
          arcInfoA.tangentAngle,
          length,
          arcInfoA.curvature,
          arcInfoB.curvature,
          direction,
          curveType,
          120
        );

        if (rawPoints.length < 2) {
          continue;
        }

        const fittedPoints = this.smoothlyMoveTransitionEnd(
          rawPoints,
          arcInfoB.point
        );

        this.forceEndTangentDirection(
          fittedPoints,
          arcInfoB.point,
          targetEndDirection
        );

        const endDirection = this.getEndDirectionFromPoints(fittedPoints);

        if (!endDirection) {
          continue;
        }

        const endTangentMismatchDeg = this.getSmallestAngleBetweenVectorsDeg(
          endDirection,
          targetEndDirection
        );

        const endGap = fittedPoints[fittedPoints.length - 1].distanceTo(arcInfoB.point);

        const score =
          endTangentMismatchDeg +
          endGap * 1000 +
          scale * 0.05;

        if (!bestResult || score < bestResult.score) {
          bestResult = {
            points: fittedPoints,
            length,
            lengthMeters: this.worldUnitsToMeters(length),
            direction,
            endTangentMismatchDeg,
            score
          };
        }
      }
    }

    if (!bestResult) {
      return null;
    }

    return {
      points: bestResult.points,
      length: bestResult.length,
      lengthMeters: bestResult.lengthMeters,
      direction: bestResult.direction,
      endTangentMismatchDeg: bestResult.endTangentMismatchDeg
    };
  }

  private smoothlyMoveTransitionEnd(
    points: THREE.Vector3[],
    targetEndPoint: THREE.Vector3
  ): THREE.Vector3[] {
    if (points.length < 2) {
      return points.map(p => p.clone());
    }

    const rawEndPoint = points[points.length - 1];
    const correction = targetEndPoint.clone().sub(rawEndPoint);

    return points.map((point, index) => {
      const u = index / (points.length - 1);

      // Smooth correction: start unchanged, end fully moved.
      const smoothFactor = u * u * (3 - 2 * u);

      return point
        .clone()
        .add(correction.clone().multiplyScalar(smoothFactor));
    });
  }

  private forceEndTangentDirection(
    points: THREE.Vector3[],
    targetEndPoint: THREE.Vector3,
    targetEndDirection: THREE.Vector3
  ): void {
    if (points.length < 3) {
      return;
    }

    const lastIndex = points.length - 1;
    points[lastIndex] = targetEndPoint.clone();

    const averageStep =
      points[lastIndex].distanceTo(points[lastIndex - 2]) / 2 || 0.1;

    const influenceCount = Math.min(8, points.length - 2);

    for (let offset = 1; offset <= influenceCount; offset++) {
      const index = lastIndex - offset;

      const desiredPoint = targetEndPoint
        .clone()
        .sub(
          targetEndDirection
            .clone()
            .multiplyScalar(averageStep * offset)
        );

      if (offset === 1) {
        points[index] = desiredPoint;
      } else {
        const blend = Math.pow(1 - offset / (influenceCount + 1), 2);
        points[index] = points[index].clone().lerp(desiredPoint, blend);
      }
    }
  }



  private generateCubicParabolaPoints(
    startPoint: THREE.Vector3,
    startAngle: number,
    length: number,
    endRadius: number,
    direction: 'CW' | 'CCW',
    segments: number = 120
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];

    if (length <= 0 || endRadius <= 0 || segments < 2) {
      console.warn('Invalid cubic parabola parameters', {
        startPoint,
        startAngle,
        length,
        endRadius,
        direction,
        segments
      });

      return points;
    }

    const sign = direction === 'CCW' ? 1 : -1;

    const cosA = Math.cos(startAngle);
    const sinA = Math.sin(startAngle);

    for (let i = 0; i <= segments; i++) {
      const xLocal = (length * i) / segments;

      /**
       * Cubic parabola transition approximation:
       *
       * y = x³ / (6 R L)
       *
       * where:
       * x = distance along tangent
       * R = final circular radius
       * L = transition length
       */
      const yLocal = sign * (Math.pow(xLocal, 3) / (6 * endRadius * length));

      /**
       * Rotate local point by startAngle,
       * then translate to startPoint.
       */
      const xWorld = startPoint.x + xLocal * cosA - yLocal * sinA;
      const yWorld = startPoint.y + xLocal * sinA + yLocal * cosA;

      points.push(new THREE.Vector3(xWorld, yWorld, startPoint.z));
    }

    return points;
  }

  private generateBlossPoints(
    startPoint: THREE.Vector3,
    startAngle: number,
    length: number,
    endRadius: number,
    direction: 'CW' | 'CCW',
    segments: number = 120
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];

    if (length <= 0 || endRadius <= 0 || segments < 2) {
      console.warn('Invalid Bloss parameters', {
        startPoint,
        startAngle,
        length,
        endRadius,
        direction,
        segments
      });

      return points;
    }

    const sign = direction === 'CCW' ? 1 : -1;

    let x = startPoint.x;
    let y = startPoint.y;
    let theta = startAngle;

    const ds = length / segments;

    for (let i = 0; i <= segments; i++) {
      points.push(new THREE.Vector3(x, y, startPoint.z));

      const s = i * ds;
      const u = s / length;

      /**
       * Bloss transition curvature function:
       *
       * k(u) = (3u² - 2u³) / R
       *
       * This starts and ends more smoothly than a linear clothoid.
       */
      const curvatureFactor = 3 * u * u - 2 * u * u * u;
      const curvature = curvatureFactor / endRadius;

      theta += sign * curvature * ds;

      x += Math.cos(theta) * ds;
      y += Math.sin(theta) * ds;
    }

    return points;
  }

  private generateCosinePoints(
    startPoint: THREE.Vector3,
    startAngle: number,
    length: number,
    endRadius: number,
    direction: 'CW' | 'CCW',
    segments: number = 120
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];

    if (length <= 0 || endRadius <= 0 || segments < 2) {
      console.warn('Invalid cosine transition parameters', {
        startPoint,
        startAngle,
        length,
        endRadius,
        direction,
        segments
      });

      return points;
    }

    const sign = direction === 'CCW' ? 1 : -1;

    let x = startPoint.x;
    let y = startPoint.y;
    let theta = startAngle;

    const ds = length / segments;

    for (let i = 0; i <= segments; i++) {
      points.push(new THREE.Vector3(x, y, startPoint.z));

      const s = i * ds;
      const u = s / length;

      /**
       * Cosine transition curvature:
       *
       * k(u) = [1 - cos(pi * u)] / (2R)
       *
       * Starts gently, increases smoothly, and reaches 1/R.
       */
      const curvatureFactor = (1 - Math.cos(Math.PI * u)) / 2;
      const curvature = curvatureFactor / endRadius;

      theta += sign * curvature * ds;

      x += Math.cos(theta) * ds;
      y += Math.sin(theta) * ds;
    }

    return points;
  }

  private generateSinePoints(
    startPoint: THREE.Vector3,
    startAngle: number,
    length: number,
    endRadius: number,
    direction: 'CW' | 'CCW',
    segments: number = 120
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];

    if (length <= 0 || endRadius <= 0 || segments < 2) {
      console.warn('Invalid sine transition parameters', {
        startPoint,
        startAngle,
        length,
        endRadius,
        direction,
        segments
      });

      return points;
    }

    const sign = direction === 'CCW' ? 1 : -1;

    let x = startPoint.x;
    let y = startPoint.y;
    let theta = startAngle;

    const ds = length / segments;

    for (let i = 0; i <= segments; i++) {
      points.push(new THREE.Vector3(x, y, startPoint.z));

      const s = i * ds;
      const u = s / length;

      /**
       * Sine transition curvature:
       *
       * k(u) = [u - sin(2πu) / (2π)] / R
       *
       * Smooth at the start and end.
       */
      const curvatureFactor =
        u - Math.sin(2 * Math.PI * u) / (2 * Math.PI);

      const curvature = curvatureFactor / endRadius;

      theta += sign * curvature * ds;

      x += Math.cos(theta) * ds;
      y += Math.sin(theta) * ds;
    }

    return points;
  }

  private createTestClothoid(): THREE.Line {
    const startPoint = new THREE.Vector3(0, 0, 0);

    // 0 means the clothoid starts toward the right side of the canvas
    const startAngle = 0;

    // Temporary test values
    const length = 20;
    const endRadius = 12;
    const direction: 'CW' | 'CCW' = 'CCW';

    const points = this.generateClothoidPoints(
      startPoint,
      startAngle,
      length,
      endRadius,
      direction,
      100
    );

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
      color: 0xff00ff,
      linewidth: 2
    });

    const clothoidLine = new THREE.Line(geometry, material);

    clothoidLine.userData = {
      type: 'clothoid',
      isClothoid: true,
      length,
      endRadius,
      direction
    };

    return clothoidLine;
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

    const points = this.generateTransitionCurvePoints(
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

    const length = this.metersToWorldUnits(lengthMeters);
    const endRadius = this.metersToWorldUnits(radiusMeters);

    const points = this.generateTransitionCurvePoints(
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

    const lengthWorld = this.metersToWorldUnits(lengthMeters);
    const angleRad = THREE.MathUtils.degToRad(angleDeg);

    const nextPoint = new THREE.Vector3(
      lastPoint.x + Math.cos(angleRad) * lengthWorld,
      lastPoint.y + Math.sin(angleRad) * lengthWorld,
      0
    );

    this.polylinePoints.push(nextPoint);

    if (this.previewPolylineSegment) {
      this.canvasSceneService.scene.remove(this.previewPolylineSegment);
      this.previewPolylineSegment.geometry.dispose();

      const material = this.previewPolylineSegment.material;
      if (Array.isArray(material)) {
        material.forEach(m => m.dispose());
      } else {
        material.dispose();
      }

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

  private buildArcFromCenter(
    start: THREE.Vector3,
    end: THREE.Vector3,
    center: THREE.Vector3,
    direction: 'CW' | 'CCW'
  ): {
    center: THREE.Vector3;
    points: THREE.Vector3[];
    sweepAngle: number;
  } {
    const startAngle = Math.atan2(
      start.y - center.y,
      start.x - center.x
    );

    const endAngle = Math.atan2(
      end.y - center.y,
      end.x - center.x
    );

    let sweepAngle = endAngle - startAngle;

    if (direction === 'CCW') {
      while (sweepAngle <= 0) {
        sweepAngle += Math.PI * 2;
      }
    }

    if (direction === 'CW') {
      while (sweepAngle >= 0) {
        sweepAngle -= Math.PI * 2;
      }
    }

    const radius = center.distanceTo(start);
    const segmentCount = 64;
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= segmentCount; i++) {
      const t = i / segmentCount;
      const angle = startAngle + sweepAngle * t;

      points.push(
        new THREE.Vector3(
          center.x + Math.cos(angle) * radius,
          center.y + Math.sin(angle) * radius,
          0.2
        )
      );
    }

    return {
      center,
      points,
      sweepAngle
    };
  }

  private updateArcGeometry(arc: THREE.Line): void {
    if (arc.userData['type'] !== 'DrawnArc') {
      return;
    }

    const startPoint = arc.userData['startPoint'] as THREE.Vector3;
    const endPoint = arc.userData['endPoint'] as THREE.Vector3;
    const centerPoint = arc.userData['centerPoint'] as THREE.Vector3;
    const direction = arc.userData['direction'] as 'CW' | 'CCW';

    const arcData = this.buildArcFromCenter(
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

  private updateArcEndpoint(
    arc: THREE.Line,
    endKind: 'start' | 'end',
    newPoint: THREE.Vector3
  ): void {
    if (endKind === 'start') {
      arc.userData['startPoint'] = newPoint.clone();
    }

    if (endKind === 'end') {
      arc.userData['endPoint'] = newPoint.clone();
    }

    this.updateArcGeometry(arc);
  }

  private computeCircleTangentCandidates(
    center1: THREE.Vector3,
    radius1: number,
    center2: THREE.Vector3,
    radius2: number
  ): {
    p1: THREE.Vector3;
    p2: THREE.Vector3;
    type: 'external' | 'internal';
  }[] {
    const candidates: {
      p1: THREE.Vector3;
      p2: THREE.Vector3;
      type: 'external' | 'internal';
    }[] = [];

    const dx = center2.x - center1.x;
    const dy = center2.y - center1.y;

    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared === 0) {
      return candidates;
    }

    /*
      sign =  1 gives external tangents
      sign = -1 gives internal tangents
    */
    const tangentModes = [
      { sign: 1, type: 'external' as const },
      { sign: -1, type: 'internal' as const }
    ];

    for (const mode of tangentModes) {
      const radiusDifference = radius1 - mode.sign * radius2;

      const hSquared = distanceSquared - radiusDifference * radiusDifference;

      if (hSquared < 0) {
        continue;
      }

      const h = Math.sqrt(Math.max(0, hSquared));

      for (const side of [-1, 1]) {
        const nx =
          (dx * radiusDifference - side * dy * h) / distanceSquared;

        const ny =
          (dy * radiusDifference + side * dx * h) / distanceSquared;

        const p1 = new THREE.Vector3(
          center1.x + radius1 * nx,
          center1.y + radius1 * ny,
          0
        );

        const p2 = new THREE.Vector3(
          center2.x + mode.sign * radius2 * nx,
          center2.y + mode.sign * radius2 * ny,
          0
        );

        candidates.push({
          p1,
          p2,
          type: mode.type
        });
      }
    }

    return candidates;
  }

  private findBestTangentBetweenArcs(
    arcA: THREE.Line,
    arcB: THREE.Line
  ): {
    p1: THREE.Vector3;
    p2: THREE.Vector3;
    type: 'external' | 'internal';
  } | null {
    const centerA = arcA.userData['centerPoint'] as THREE.Vector3;
    const centerB = arcB.userData['centerPoint'] as THREE.Vector3;

    const radiusA = arcA.userData['radius'] as number;
    const radiusB = arcB.userData['radius'] as number;

    if (
      !centerA ||
      !centerB ||
      !radiusA ||
      !radiusB ||
      !this.pendingTransitionArcAEndKind ||
      !this.pendingTransitionArcBEndKind
    ) {
      return null;
    }

    const selectedPointA =
      this.pendingTransitionArcAEndKind === 'start'
        ? arcA.userData['startPoint'] as THREE.Vector3
        : arcA.userData['endPoint'] as THREE.Vector3;

    const selectedPointB =
      this.pendingTransitionArcBEndKind === 'start'
        ? arcB.userData['startPoint'] as THREE.Vector3
        : arcB.userData['endPoint'] as THREE.Vector3;

    if (!selectedPointA || !selectedPointB) {
      return null;
    }

    const candidates = this.computeCircleTangentCandidates(
      centerA,
      radiusA,
      centerB,
      radiusB
    );

    if (candidates.length === 0) {
      return null;
    }

    let bestCandidate: {
      p1: THREE.Vector3;
      p2: THREE.Vector3;
      type: 'external' | 'internal';
    } | null = null;

    let bestScore = Infinity;

    for (const candidate of candidates) {
      const score =
        candidate.p1.distanceTo(selectedPointA) +
        candidate.p2.distanceTo(selectedPointB);

      if (score < bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    return bestCandidate;
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

    const tangent1 = this.getArcTangentAtPoint(arc1, arc1End, 'end');
    const tangent2 = this.getArcTangentAtPoint(arc2, arc2Start, 'start');

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

    const angleToArc1 = this.getSmallestAngleBetweenVectorsDeg(
      connectorDirection,
      tangent1
    );

    const angleToArc2 = this.getSmallestAngleBetweenVectorsDeg(
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

  private getArcEndInfo(
    arc: THREE.Line,
    endKind: 'start' | 'end'
  ): GeometryEndInfo | null {
    if (arc.userData['type'] !== 'DrawnArc') {
      return null;
    }

    const point =
      endKind === 'start'
        ? arc.userData['startPoint'] as THREE.Vector3
        : arc.userData['endPoint'] as THREE.Vector3;

    const radius = arc.userData['radius'] as number;
    const direction = arc.userData['direction'] as 'CW' | 'CCW';

    if (!point || !radius || !direction) {
      return null;
    }

    const tangent = this.getArcTangentAtPoint(arc, point, endKind);

    if (!tangent) {
      return null;
    }

    const tangentAngle = Math.atan2(tangent.y, tangent.x);

    return {
      object: arc,
      point: point.clone(),
      endKind,
      tangentAngle,
      curvature: 1 / radius,
      direction
    };
  }

  private getArcTangentAtPoint(
    arc: THREE.Line,
    point: THREE.Vector3,
    pointKind: 'start' | 'end'
  ): THREE.Vector3 | null {
    const center = arc.userData['centerPoint'] as THREE.Vector3;
    const direction = arc.userData['direction'] as 'CW' | 'CCW';

    if (!center || !direction) {
      return null;
    }

    const radiusVector = point
      .clone()
      .sub(center);

    radiusVector.z = 0;

    if (radiusVector.length() === 0) {
      return null;
    }

    radiusVector.normalize();

    let tangent: THREE.Vector3;

    if (direction === 'CCW') {
      tangent = new THREE.Vector3(
        -radiusVector.y,
        radiusVector.x,
        0
      );
    } else {
      tangent = new THREE.Vector3(
        radiusVector.y,
        -radiusVector.x,
        0
      );
    }

    // At the start of the second arc, the incoming tangent direction is opposite
    // of the arc's forward tangent.
    if (pointKind === 'start') {
      tangent.multiplyScalar(-1);
    }

    tangent.normalize();

    return tangent;
  }
  private getSmallestAngleBetweenVectorsDeg(
    a: THREE.Vector3,
    b: THREE.Vector3
  ): number {
    const aNorm = a.clone().normalize();
    const bNorm = b.clone().normalize();

    const dot = THREE.MathUtils.clamp(aNorm.dot(bNorm), -1, 1);

    const angleRad = Math.acos(dot);
    const angleDeg = angleRad * 180 / Math.PI;

    return Math.min(angleDeg, 180 - angleDeg);
  }

  private getEndDirectionFromPoints(points: THREE.Vector3[]): THREE.Vector3 | null {
    if (points.length < 2) {
      return null;
    }

    const lastPoint = points[points.length - 1];
    const previousPoint = points[points.length - 2];

    const direction = new THREE.Vector3().subVectors(lastPoint, previousPoint);
    direction.z = 0;

    if (direction.length() < 0.001) {
      return null;
    }

    direction.normalize();
    return direction;
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

    const arcInfoA = this.getArcEndInfo(
      this.pendingTransitionArcA,
      this.pendingTransitionArcAEndKind
    );

    const arcInfoB = this.getArcEndInfo(
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

    const fittedTransition = this.fitTransitionPointsBetweenArcEnds(
      arcInfoA,
      arcInfoB,
      this.transitionCurveTypeInput
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

    const transitionEndDirection = this.getEndDirectionFromPoints(transitionPoints);

    const arcBTargetDirection = new THREE.Vector3(
      Math.cos(arcInfoB.tangentAngle),
      Math.sin(arcInfoB.tangentAngle),
      0
    );

    if (transitionEndDirection) {
      const endTangentMismatchDeg = this.getSmallestAngleBetweenVectorsDeg(
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

    if (this.snapMarker) {
      this.canvasSceneService.scene.remove(this.snapMarker);
      this.snapMarker.geometry.dispose();

      const material = this.snapMarker.material;

      if (Array.isArray(material)) {
        material.forEach((m) => m.dispose());
      } else {
        material.dispose();
      }

      this.snapMarker = null;
    }

    this.cdr.detectChanges();
  }


  private updateLineDynamicInfo(start: THREE.Vector3, end: THREE.Vector3): void {
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    const lengthWorld = Math.sqrt(dx * dx + dy * dy);
    const lengthMeters = this.worldUnitsToMeters(lengthWorld);

    const absoluteAngleDeg = this.getAbsoluteAngleDeg(start, end);

    let displayAngleDeg = absoluteAngleDeg;

    // First line: angle is relative to canvas horizontal axis.
    // Next lines: angle is relative to previous line direction.
    if (this.previousLineAngleDeg !== null) {
      displayAngleDeg = this.normalizeRelativeAngle(
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
    if (!this.previewLine) return;

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

 private finalizeLineFromPoint(
  endPoint: THREE.Vector3
): void {

  if (!this.lineStartPoint) {
    return;
  }

  const startPoint =
    this.lineStartPoint.clone();

  const createdLineAngleDeg =
    this.getAbsoluteAngleDeg(
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
    this.countTrackDirectionsAtPoint(
      startPoint
    );

  const endDirectionCount =
    this.countTrackDirectionsAtPoint(
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

  private countTrackDirectionsAtPoint(
  junctionPoint: THREE.Vector3,
  tolerance = 0.5
): number {

  let directionCount = 0;

  this.canvasSceneService.scene.traverse((object) => {

    if (!(object instanceof THREE.Line)) {
      return;
    }

    if (object.userData['type'] !== 'DrawnLine') {
      return;
    }

    const startPoint =
      object.userData['startPoint'] as THREE.Vector3 | undefined;

    const endPoint =
      object.userData['endPoint'] as THREE.Vector3 | undefined;

    if (!startPoint || !endPoint) {
      return;
    }

    const segment =
      endPoint.clone().sub(startPoint);

    const segmentLengthSquared =
      segment.lengthSq();

    if (segmentLengthSquared === 0) {
      return;
    }

    // Find where the junction lies on this line
    const t = THREE.MathUtils.clamp(
      junctionPoint
        .clone()
        .sub(startPoint)
        .dot(segment) /
        segmentLengthSquared,
      0,
      1
    );

    const pointOnLine =
      startPoint
        .clone()
        .add(
          segment.clone().multiplyScalar(t)
        );

    if (
      pointOnLine.distanceTo(junctionPoint) >
      tolerance
    ) {
      return;
    }

    /*
     * At the start/end of a line:
     * only one direction leaves the junction.
     *
     * In the middle of a line:
     * there are two directions.
     */
    const endpointTolerance = 0.01;

    if (
      junctionPoint.distanceTo(startPoint) <=
      endpointTolerance
    ) {
      directionCount += 1;
    }
    else if (
      junctionPoint.distanceTo(endPoint) <=
      endpointTolerance
    ) {
      directionCount += 1;
    }
    else {
      directionCount += 2;
    }
  });

  return directionCount;
}

public confirmSwitchPlacement(): void {
  if (
    !this.pendingSwitchMainLine ||
    !this.pendingSwitchBranchLine ||
    !this.pendingSwitchPoint
  ) {
    return;
  }

  const switchPoint =
    this.pendingSwitchPoint.clone();

  const mainStart =
    this.pendingSwitchMainLine.userData['startPoint'] as THREE.Vector3;

  const mainEnd =
    this.pendingSwitchMainLine.userData['endPoint'] as THREE.Vector3;

  const branchStart =
    this.pendingSwitchBranchLine.userData['startPoint'] as THREE.Vector3;

  const branchEnd =
    this.pendingSwitchBranchLine.userData['endPoint'] as THREE.Vector3;

  if (
    !mainStart ||
    !mainEnd ||
    !branchStart ||
    !branchEnd
  ) {
    return;
  }

  /*
   * Determine the direction of the main track
   * away from the switch point.
   */
  const mainDirection =
    mainEnd
      .clone()
      .sub(mainStart)
      .normalize();

  /*
   * Branch line was created starting from the switch,
   * so this gives its outgoing direction.
   */
  const branchDirection =
    branchEnd
      .clone()
      .sub(branchStart)
      .normalize();

  const symbolLength = 12;

  const mainSymbolEnd =
    switchPoint
      .clone()
      .add(
        mainDirection
          .clone()
          .multiplyScalar(symbolLength)
      );

  const branchSymbolEnd =
    switchPoint
      .clone()
      .add(
        branchDirection
          .clone()
          .multiplyScalar(symbolLength)
      );

  const shadedLength = 4;

  const mainShadeEnd =
    switchPoint
      .clone()
      .add(
        mainDirection
          .clone()
          .multiplyScalar(shadedLength)
      );

  const branchShadeEnd =
    switchPoint
      .clone()
      .add(
        branchDirection
          .clone()
          .multiplyScalar(shadedLength)
      );

  const material =
    new THREE.LineBasicMaterial({
      color: 0xffffff,
      depthTest: false
    });

  const switchGroup =
    new THREE.Group();

  switchGroup.userData = {
    type: 'Switch',
    layerType: 'Switch',
    layer: 'Switches',
    source: 'DrawnSwitch',
    draggable: true,
    id: crypto.randomUUID()
  };

  const shadeShape = new THREE.Shape();

shadeShape.moveTo(
  switchPoint.x,
  switchPoint.y
);

shadeShape.lineTo(
  mainShadeEnd.x,
  mainShadeEnd.y
);

shadeShape.lineTo(
  branchShadeEnd.x,
  branchShadeEnd.y
);

shadeShape.closePath();

const shadeGeometry =
  new THREE.ShapeGeometry(
    shadeShape
  );

const shadeMaterial =
  new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    depthTest: false
  });

const shadeMesh =
  new THREE.Mesh(
    shadeGeometry,
    shadeMaterial
  );

shadeMesh.position.z = 0.8;
shadeMesh.renderOrder = 450;

switchGroup.add(shadeMesh);

  /*
   * Main direction of switch
   */
  const mainGeometry =
    new THREE.BufferGeometry()
      .setFromPoints([
        new THREE.Vector3(
          switchPoint.x,
          switchPoint.y,
          1
        ),
        new THREE.Vector3(
          mainSymbolEnd.x,
          mainSymbolEnd.y,
          1
        )
      ]);

  const mainLine =
    new THREE.Line(
      mainGeometry,
      material.clone()
    );

  /*
   * Diverging direction of switch
   */
  const branchGeometry =
    new THREE.BufferGeometry()
      .setFromPoints([
        new THREE.Vector3(
          switchPoint.x,
          switchPoint.y,
          1
        ),
        new THREE.Vector3(
          branchSymbolEnd.x,
          branchSymbolEnd.y,
          1
        )
      ]);

  const branchLine =
    new THREE.Line(
      branchGeometry,
      material.clone()
    );

  mainLine.renderOrder = 500;
  branchLine.renderOrder = 500;

  switchGroup.add(mainLine);
  switchGroup.add(branchLine);

  this.canvasSceneService.scene.add(
    switchGroup
  );

  this.switchPopupVisible = false;

  this.pendingSwitchMainLine = null;
  this.pendingSwitchBranchLine = null;
  this.pendingSwitchPoint = null;


  CreateSwitch("aa",switchPoint.x,switchPoint.y);
  
  console.log(
    'DRAWN SWITCH CREATED',
    switchGroup
  );
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

  private getAbsoluteAngleDeg(start: THREE.Vector3, end: THREE.Vector3): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    let angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;

    if (angleDeg < 0) {
      angleDeg += 360;
    }

    return angleDeg;
  }

  private normalizeRelativeAngle(angleDeg: number): number {
    let normalized = angleDeg;

    while (normalized > 180) {
      normalized -= 360;
    }

    while (normalized <= -180) {
      normalized += 360;
    }

    return normalized;
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
      if (this.isObjectInLayer(object, layerName)) {
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
      this.applyLayerHighlight(object);
    });

    this.notificationService.notify({
      type: 'success',
      text: `${matchingObjects.length} ${layerName} object(s) highlighted.`,
      operation: 'layer'
    });

    console.log(`${matchingObjects.length} ${layerName} object(s) highlighted`);
  }

  private highlightSelectedImportedElement(
    object: THREE.Object3D
  ): void {
    this.clearSelectedImportedElementHighlight();

    object.traverse((child) => {
      const renderable = child as THREE.Line | THREE.Mesh;

      const material =
        renderable.material as
        | THREE.Material
        | THREE.Material[]
        | undefined;

      if (!material) {
        return;
      }

      const materials = Array.isArray(material)
        ? material
        : [material];

      materials.forEach((mat: any) => {
        if (!mat.color) {
          return;
        }

        mat.userData = mat.userData || {};

        if (!mat.userData['selectionOriginalColor']) {
          mat.userData['selectionOriginalColor'] =
            mat.color.clone();
        }

        mat.color.setHex(0xffff00);
        mat.needsUpdate = true;
      });
    });

    this.selectedImportedElement = object;

    console.log('IMPORTED ELEMENT SELECTED:', {
      type: object.userData?.['type'],
      id:
        object.userData?.['id'] ??
        object.userData?.['name']
    });
  }

  private clearSelectedImportedElementHighlight(): void {
    if (!this.selectedImportedElement) {
      return;
    }

    this.selectedImportedElement.traverse((child) => {
      const renderable = child as THREE.Line | THREE.Mesh;

      const material =
        renderable.material as
        | THREE.Material
        | THREE.Material[]
        | undefined;

      if (!material) {
        return;
      }

      const materials = Array.isArray(material)
        ? material
        : [material];

      materials.forEach((mat: any) => {
        const originalColor =
          mat.userData?.['selectionOriginalColor'];

        if (!mat.color || !originalColor) {
          return;
        }

        mat.color.copy(originalColor);
        mat.needsUpdate = true;

        delete mat.userData['selectionOriginalColor'];
      });
    });

    this.selectedImportedElement = null;
  }

  private isObjectInLayer(object: THREE.Object3D, layerName: string): boolean {
    const type =
      object.userData?.['layerType'] ??
      object.userData?.['type'];

    if (!type) return false;

    switch (layerName) {
      case 'Tracks':
      return (
        type === 'Track' ||
        type === 'Tracks' ||
        type === 'BackendTrack' ||
        type === 'DrawnLine' ||
        type === 'DrawnCurve' ||
        type === 'DrawnArc' ||
        type === 'DrawnTransitionCurve' ||
        type === 'DrawnClothoid'
      );

      case 'Switches':
        return type === 'Switch';

      case 'Signals':
        return type === 'Signal' || type === 'ETCSmarker';

      case 'Balises':
        return type === 'BaliseGroup';

      /*
      case 'Timing Points':
        return type === 'TimingPoint';
  
      case 'Segment Profiles':
        return type === 'SegmentProfile';
      */
      default:
        return false;
    }
  }

  private applyLayerHighlight(object: THREE.Object3D): void {
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;

      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;

      if (!material) return;

      const materials = Array.isArray(material) ? material : [material];

      materials.forEach((mat: any) => {
        if (!mat.color) return;

        mat.userData = mat.userData || {};

        if (!mat.userData['originalColor']) {
          mat.userData['originalColor'] = mat.color.clone();
        }

        mat.color.setHex(0x00aaff);
        mat.needsUpdate = true;
      });
    });

    this.highlightedObjects.push(object);
  }

  private clearLayerHighlights(): void {
    this.highlightedObjects.forEach((object) => {
      object.traverse((child) => {
        const mesh = child as THREE.Mesh;

        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;

        if (!material) return;

        const materials = Array.isArray(material) ? material : [material];

        materials.forEach((mat: any) => {
          if (!mat.color) return;

          if (mat.userData?.['originalColor']) {
            mat.color.copy(mat.userData['originalColor']);
            mat.needsUpdate = true;
          }
        });
      });
    });

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

  private getAssetScale(svgSrc: string): number {
    if (svgSrc.includes('AxleCounter')) return 0.35;
    if (svgSrc.includes('BaliseGroup')) return 0.45;
    if (svgSrc.includes('ETCSmarker')) return 0.35;
    if (svgSrc.includes('TimingPoint')) return 0.3;
    if (svgSrc.includes('BufferStop')) return 0.4;

    return 0.4;
  }

  private resizeLineEnd(line: THREE.Line, newEndPoint: THREE.Vector3): void {
    const startPoint = line.userData['startPoint'] as THREE.Vector3;

    const geometry = new THREE.BufferGeometry().setFromPoints([
      startPoint,
      newEndPoint
    ]);

    line.geometry.dispose();
    line.geometry = geometry;

    line.userData['endPoint'] = newEndPoint.clone();
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
  private addSvgToCanvas(svgSrc: string, point: THREE.Vector3): void {
  addIcon(
    this.canvasSceneService.scene,
    svgSrc,
    2,
    point,
    0,
    this.notificationService,
    (mesh: THREE.Group) => {

      // CanvasItem already assigned the real asset type
      // e.g. BaliseGroup, ETCSmarker, AxleCounter
      const layerType = mesh.userData['type'];

      // Keep real type separately for Layers
      mesh.userData['layerType'] = layerType;

      // KEEP existing interaction behaviour
      mesh.userData['draggable'] = true;
      mesh.userData['type'] = 'DroppedAsset';

      // Store original physical/base scale
      mesh.userData['baseScale'] = mesh.scale.clone();

      this.selectedAsset = mesh;

      console.log(
        'ASSET ADDED:',
        mesh.userData['type'],
        'LAYER TYPE:',
        mesh.userData['layerType']
      );
    },
    true
  );
}

  private resizeSelectedAsset(currentPoint: THREE.Vector3): void {
    if (!this.selectedAsset) return;

    const currentDistance = currentPoint.distanceTo(this.resizeCenter);

    if (this.resizeStartDistance === 0) return;

    const rawScaleFactor = currentDistance / this.resizeStartDistance;

    const minResizeFactor = 0.05;
    const maxResizeFactor = 10;

    const scaleFactor = THREE.MathUtils.clamp(
      rawScaleFactor,
      minResizeFactor,
      maxResizeFactor
    );

    let newScaleX = this.resizeStartScale.x * scaleFactor;
    let newScaleY = this.resizeStartScale.y * scaleFactor;
    let newScaleZ = this.resizeStartScale.z * scaleFactor;

    // Do not shrink below original physical/base scale
    const baseScale = this.selectedAsset.userData['baseScale'] as THREE.Vector3 | undefined;

    if (baseScale) {
      const signX = Math.sign(newScaleX) || 1;
      const signY = Math.sign(newScaleY) || 1;
      const signZ = Math.sign(newScaleZ) || 1;

      newScaleX = signX * Math.max(Math.abs(newScaleX), Math.abs(baseScale.x));
      newScaleY = signY * Math.max(Math.abs(newScaleY), Math.abs(baseScale.y));
      newScaleZ = signZ * Math.max(Math.abs(newScaleZ), Math.abs(baseScale.z));
    }

    this.selectedAsset.scale.set(newScaleX, newScaleY, newScaleZ);

    this.selectedAsset.updateMatrixWorld(true);
    this.showSelectionBox(this.selectedAsset);
  }

  private showSelectionBox(asset: THREE.Object3D): void {
    this.clearSelectionBox();

    const scene = this.canvasSceneService.scene;
    const originalRotationZ = asset.rotation.z;

    // Use the asset origin as the rotation pivot
    const pivot = asset.position.clone();

    // Temporarily remove rotation to calculate the unrotated bounding box
    asset.rotation.z = 0;
    asset.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(asset);

    // Restore rotation
    asset.rotation.z = originalRotationZ;
    asset.updateMatrixWorld(true);

    if (box.isEmpty()) return;

    const padding = 2;

    const minX = box.min.x - padding;
    const maxX = box.max.x + padding;
    const minY = box.min.y - padding;
    const maxY = box.max.y + padding;

    // Unrotated world corners
    const unrotatedCorners = [
      new THREE.Vector3(minX, minY, 0),
      new THREE.Vector3(maxX, minY, 0),
      new THREE.Vector3(maxX, maxY, 0),
      new THREE.Vector3(minX, maxY, 0),
    ];

    // Rotate corners around the same pivot as the asset
    const rotatedCorners = unrotatedCorners.map((corner) => {
      return corner
        .clone()
        .sub(pivot)
        .applyAxisAngle(new THREE.Vector3(0, 0, 1), originalRotationZ)
        .add(pivot);
    });

    const selectionPoints = [
      rotatedCorners[0],
      rotatedCorners[1],
      rotatedCorners[2],
      rotatedCorners[3],
      rotatedCorners[0],
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(selectionPoints);

    const material = new THREE.LineDashedMaterial({
      color: 0x00aaff,
      linewidth: 2,
      dashSize: 1,
      gapSize: 0.6,
      depthTest: false,
    });

    const selectionLine = new THREE.Line(geometry, material);
    selectionLine.renderOrder = 999;
    selectionLine.computeLineDistances();

    scene.add(selectionLine);
    this.selectionBox = selectionLine;

    // Resize handles
    this.resizeHandles = [];

    rotatedCorners.forEach((corner) => {
      const handleGeometry = new THREE.BoxGeometry(1.2, 1.2, 0.1);
      const handleMaterial = new THREE.MeshBasicMaterial({
        color: 0x00aaff,
        depthTest: false,
      });

      const handle = new THREE.Mesh(handleGeometry, handleMaterial);
      handle.position.copy(corner);
      handle.renderOrder = 1000;
      handle.userData['isResizeHandle'] = true;

      scene.add(handle);
      this.resizeHandles.push(handle);
    });

    // Green rotate handle above the top edge
    const topLeft = rotatedCorners[3];
    const topRight = rotatedCorners[2];

    const topMid = new THREE.Vector3()
      .addVectors(topLeft, topRight)
      .multiplyScalar(0.5);

    const topDirection = new THREE.Vector3()
      .subVectors(topRight, topLeft)
      .normalize();

    const outwardDirection = new THREE.Vector3(
      -topDirection.y,
      topDirection.x,
      0
    ).normalize();

    const rotateDistance = 5;

    const rotatePosition = topMid
      .clone()
      .add(outwardDirection.multiplyScalar(rotateDistance));

    const rotateGeometry = new THREE.CircleGeometry(1.1, 32);
    const rotateMaterial = new THREE.MeshBasicMaterial({
      color: 0x8ccf22,
      depthTest: false,
    });

    this.rotateHandle = new THREE.Mesh(rotateGeometry, rotateMaterial);
    this.rotateHandle.position.copy(rotatePosition);
    this.rotateHandle.renderOrder = 1000;
    this.rotateHandle.userData['isRotateHandle'] = true;

    scene.add(this.rotateHandle);
  }

  private createResizeHandles(min: THREE.Vector3, max: THREE.Vector3): void {
    const handleSize = 0.35;

    const handleMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8
    });

    const handleGeometry = new THREE.PlaneGeometry(handleSize, handleSize);

    const positions = [
      { name: 'top-left', x: min.x, y: max.y },
      { name: 'top-right', x: max.x, y: max.y },
      { name: 'bottom-right', x: max.x, y: min.y },
      { name: 'bottom-left', x: min.x, y: min.y }
    ];

    positions.forEach((pos) => {
      const handle = new THREE.Mesh(handleGeometry, handleMaterial.clone());

      handle.position.set(pos.x, pos.y, 0.3);
      handle.userData['type'] = 'ResizeHandle';
      handle.userData['handle'] = pos.name;

      this.resizeHandles.push(handle);
      this.canvasSceneService.scene.add(handle);
    });
  }

  private createRotateHandle(min: THREE.Vector3, max: THREE.Vector3): void {
    const centerX = (min.x + max.x) / 2;
    const rotateY = max.y + 2;

    const geometry = new THREE.CircleGeometry(1.5, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x9acd32
    });

    this.rotateHandle = new THREE.Mesh(geometry, material);

    this.rotateHandle.position.set(centerX, rotateY, 0.3);
    this.rotateHandle.userData['type'] = 'RotateHandle';

    this.canvasSceneService.scene.add(this.rotateHandle);

    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(centerX, max.y, 0.25),
      new THREE.Vector3(centerX, rotateY, 0.25)
    ]);

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x38bdf8
    });

    const rotateLine = new THREE.Line(lineGeometry, lineMaterial);
    rotateLine.userData['type'] = 'RotateHandleLine';

    this.resizeHandles.push(rotateLine as unknown as THREE.Mesh);
    this.canvasSceneService.scene.add(rotateLine);
  }

  private clearSelectionBox(): void {
    if (this.selectionBox) {
      this.canvasSceneService.scene.remove(this.selectionBox);
      this.selectionBox.geometry.dispose();

      const material = this.selectionBox.material;
      if (Array.isArray(material)) {
        material.forEach((m) => m.dispose());
      } else {
        material.dispose();
      }

      this.selectionBox = null;
    }

    this.resizeHandles.forEach((handle) => {
      this.canvasSceneService.scene.remove(handle);

      if (handle.geometry) {
        handle.geometry.dispose();
      }

      const material = handle.material;
      if (Array.isArray(material)) {
        material.forEach((m) => m.dispose());
      } else if (material) {
        material.dispose();
      }
    });

    this.resizeHandles = [];

    if (this.rotateHandle) {
      this.canvasSceneService.scene.remove(this.rotateHandle);
      this.rotateHandle.geometry.dispose();

      const material = this.rotateHandle.material;
      if (Array.isArray(material)) {
        material.forEach((m) => m.dispose());
      } else {
        material.dispose();
      }

      this.rotateHandle = null;
    }
  }

  private getResizeHandleUnderMouse(event: PointerEvent): THREE.Object3D | null {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.canvasSceneService.camera);

    const intersects = raycaster.intersectObjects(this.resizeHandles, true);

    if (intersects.length === 0) {
      return null;
    }

    return intersects[0].object;
  }

  private getRotateHandleUnderMouse(event: PointerEvent): THREE.Object3D | null {
    if (!this.rotateHandle) return null;

    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, this.canvasSceneService.camera);

    const intersects = raycaster.intersectObject(this.rotateHandle, true);

    return intersects.length > 0 ? this.rotateHandle : null;
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

    this.clearSelectionBox();
    this.clearCurveHandles();
    this.selectedCurve = null;
    this.isDraggingCurveHandle = false;
    this.activeCurveHandleKind = null;

    assetsToDelete.forEach((asset) => {
      const objectToDelete = this.getDeletableRoot(asset);

      const canvasItem = objectToDelete.userData?.['canvasItem'];

      if (canvasItem && typeof canvasItem.Delete === 'function') {
        canvasItem.Delete();
      }

      if (objectToDelete.parent) {
        objectToDelete.parent.remove(objectToDelete);
      } else {
        this.canvasSceneService.scene.remove(objectToDelete);
      }

      this.disposeObject(objectToDelete);
    });

    this.selectedAsset = null;
    this.selectedAssets = [];
    this.isDraggingAsset = false;
    this.isResizingAsset = false;
    this.isRotatingAsset = false;
    this.activeResizeHandle = null;

    console.log('SELECTED ASSETS DELETED:', assetsToDelete.length);
  }

  private duplicateSelectedAsset(): void {
    if (!this.selectedAsset) {
      console.log('No selected asset to duplicate');
      return;
    }

    const objectToDuplicate = this.getDeletableRoot(this.selectedAsset);

    const duplicate = this.cloneObjectForCanvas(objectToDuplicate);

    // Move duplicate slightly so user can see it
    duplicate.position.x += 5;
    duplicate.position.y -= 5;

    // Give duplicated object a new identity
    duplicate.userData = {
      ...duplicate.userData,
      id: crypto.randomUUID(),
      draggable: true,
    };

    // Important: do NOT keep old backend/canvasItem reference
    this.removeCanvasItemReferences(duplicate);

    this.canvasSceneService.scene.add(duplicate);

    // Select duplicate immediately
    this.selectedAsset = duplicate;
    this.clearSelectionBox();
    this.showSelectionBox(duplicate);

    console.log('SELECTED ASSET DUPLICATED');
  }

  private cloneObjectForCanvas(object: THREE.Object3D): THREE.Object3D {
    const originalUserData = new Map<THREE.Object3D, any>();

    // 1. Temporarily remove circular userData before cloning
    object.traverse((child) => {
      originalUserData.set(child, child.userData);

      child.userData = {
        draggable: child.userData?.['draggable'] ?? false,
        type: child.userData?.['type'],
        isResizeHandle: child.userData?.['isResizeHandle'],
        isRotateHandle: child.userData?.['isRotateHandle'],
      };
    });

    // 2. Now clone safely
    const clone = object.clone(true);

    // 3. Restore original userData on original object
    object.traverse((child) => {
      const savedUserData = originalUserData.get(child);
      child.userData = savedUserData ?? {};
    });

    // 4. Clean duplicate userData and clone geometry/materials
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;

      if (mesh.geometry) {
        mesh.geometry = mesh.geometry.clone();
      }

      const material = mesh.material;

      if (Array.isArray(material)) {
        mesh.material = material.map((m) => m.clone());
      } else if (material) {
        mesh.material = material.clone();
      }

      child.userData = {
        ...child.userData,
        id: crypto.randomUUID(),
        draggable: true,
      };

      delete child.userData['canvasItem'];
      delete child.userData['notificationService'];
    });

    return clone;
  }

  private removeCanvasItemReferences(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (!child.userData) return;

      delete child.userData['canvasItem'];
      delete child.userData['notificationService'];

      child.userData['id'] = crypto.randomUUID();
      child.userData['draggable'] = true;
    });
  }

  private getDeletableRoot(object: THREE.Object3D): THREE.Object3D {
    let current: THREE.Object3D | null = object;

    while (current) {
      if (current.userData?.['canvasItem']) {
        return current;
      }

      if (current.parent === this.canvasSceneService.scene) {
        return current;
      }

      current = current.parent;
    }

    return object;
  }

  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;

      if (mesh.geometry) {
        mesh.geometry.dispose();
      }

      const material = mesh.material;

      if (Array.isArray(material)) {
        material.forEach((m) => m.dispose());
      } else if (material) {
        material.dispose();
      }
    });
  }

  private mirrorSelectedAsset(axis: 'horizontal' | 'vertical'): void {
    if (!this.selectedAsset) {
      console.log('No selected asset to mirror');
      return;
    }

    const objectToMirror = this.getDeletableRoot(this.selectedAsset);

    // Keep object visually in the same place after flipping
    const beforeBox = new THREE.Box3().setFromObject(objectToMirror);
    const beforeCenter = new THREE.Vector3();
    beforeBox.getCenter(beforeCenter);

    if (axis === 'horizontal') {
      objectToMirror.scale.y *= -1;
    }

    if (axis === 'vertical') {
      objectToMirror.scale.x *= -1;
    }

    objectToMirror.updateMatrixWorld(true);

    const afterBox = new THREE.Box3().setFromObject(objectToMirror);
    const afterCenter = new THREE.Vector3();
    afterBox.getCenter(afterCenter);

    // Shift object back so the center stays fixed
    const correction = beforeCenter.clone().sub(afterCenter);
    objectToMirror.position.add(correction);

    objectToMirror.updateMatrixWorld(true);

    this.selectedAsset = objectToMirror;
    this.showSelectionBox(objectToMirror);

    console.log(`SELECTED ASSET MIRRORED: ${axis}`);
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

  private distanceMeters(
    a: { latitude: number; longitude: number },
    b: { latitude: number; longitude: number }
  ): number {
    const earthRadius = 6371000;

    const lat1 = THREE.MathUtils.degToRad(a.latitude);
    const lat2 = THREE.MathUtils.degToRad(b.latitude);

    const deltaLat =
      THREE.MathUtils.degToRad(b.latitude - a.latitude);

    const deltaLon =
      THREE.MathUtils.degToRad(b.longitude - a.longitude);

    const value =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) ** 2;

    return (
      2 *
      earthRadius *
      Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
    );
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